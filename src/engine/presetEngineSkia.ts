// presetShader.ts
import { buildShaderUniforms } from "@/src/engine/presetMath";
import type { EditorAdjustments } from "@/src/models/editor";
import { Skia, type SkShader } from "@shopify/react-native-skia";

const presetShaderSource = `
uniform shader inputImage;
uniform shader backgroundImage;

uniform float uExposure;
uniform float uContrast;
uniform float uHighlights;
uniform float uShadows;
uniform float uSaturation;
uniform float uVibrance;
uniform float uTemperature;
uniform float uTint;
uniform float uMixerHue;
uniform float uMixerSaturation;
uniform float uMixerLuminance;
uniform float uGradeShadows;
uniform float uGradeMidtones;
uniform float uGradeHighlights;

// Convert sRGB encoded components to linear light
float3 srgbToLinear(float3 c) {
  float3 linearLo = c / 12.92;
  float3 linearHi = pow((c + 0.055) / 1.055, float3(2.4));
  float3 threshold = step(float3(0.04045), c);
  return mix(linearLo, linearHi, threshold);
}

// Convert linear light components to sRGB display space
float3 linearToSrgb(float3 c) {
  float3 safe = max(c, float3(0.0));
  float3 scaled = 1.055 * pow(safe, float3(1.0 / 2.4)) - 0.055;
  float3 linear = safe * 12.92;
  float3 threshold = step(float3(0.0031308), c);
  return mix(linear, scaled, threshold);
}

float luminance(float3 c) {
  return dot(c, float3(0.2126, 0.7152, 0.0722));
}

// Exposure operates in EV using linear light
float3 applyExposure(float3 color, float exposure) {
  return color * exp2(exposure);
}

// Contrast pivots around linear middle-grey (~18% reflectance)
float3 applyContrast(float3 color, float contrast) {
  const float pivot = 0.18;
  return (color - pivot) * contrast + pivot;
}

// Saturation mixes towards luminance while staying in linear light
float3 applySaturation(float3 color, float saturation) {
  float grey = luminance(color);
  return mix(float3(grey, grey, grey), color, saturation);
}

// Highlights adjustment only affects upper luminance range
float3 applyHighlights(float3 color, float amount) {
  float L = luminance(color);
  float mask = smoothstep(0.55, 1.15, L);
  float gain = exp2(amount);
  return mix(color, color * gain, mask);
}

// Shadows adjustment lifts/lowers dark regions without clamping
float3 applyShadows(float3 color, float amount) {
  float L = luminance(color);
  float mask = 1.0 - smoothstep(0.1, 0.6, L);
  float gain = exp2(amount);
  return mix(color, color * gain, mask);
}

// Vibrance boosts low-sat colors more aggressively
float3 applyVibrance(float3 color, float amount) {
  float grey = luminance(color);
  float3 delta = color - float3(grey, grey, grey);
  float sat = length(delta);
  float influence = 1.0 - smoothstep(0.25, 1.35, sat);
  float boost = 1.0 + amount * influence;
  return float3(grey, grey, grey) + delta * boost;
}

// Simple shoulder tone mapper to roll off specular highlights
float3 applyHighlightRollOff(float3 color) {
  float3 mapped = color / (1.0 + color / 2.0);
  float rollMask = smoothstep(0.8, 1.6, luminance(color));
  return mix(color, mapped, rollMask);
}

float hash12(float2 p) {
  return fract(sin(dot(p, float2(12.9898, 78.233))) * 43758.5453);
}

// Blue-noise-ish dither to reduce banding in dark ramps
float3 addDither(float3 color, float2 xy) {
  float noise = hash12(xy) - 0.5;
  const float amplitude = 1.0 / 255.0;
  return color + noise * amplitude;
}

float hueToRgb(float p, float q, float t) {
  if (t < 0.0) t += 1.0;
  if (t > 1.0) t -= 1.0;
  if (t < 1.0/6.0) return p + (q - p) * 6.0 * t;
  if (t < 1.0/2.0) return q;
  if (t < 2.0/3.0) return p + (q - p) * (2.0/3.0 - t) * 6.0;
  return p;
}

float3 hslToRgb(float3 hsl) {
  float h = fract(hsl.x);
  float s = clamp(hsl.y, 0.0, 1.0);
  float l = clamp(hsl.z, 0.0, 1.0);
  if (s < 0.00001) {
    return float3(l, l, l);
  }
  float q = l < 0.5 ? l * (1.0 + s) : l + s - l * s;
  float p = 2.0 * l - q;
  float r = hueToRgb(p, q, h + 1.0/3.0);
  float g = hueToRgb(p, q, h);
  float b = hueToRgb(p, q, h - 1.0/3.0);
  return float3(r, g, b);
}

float3 rgbToHsl(float3 color) {
  float maxC = max(max(color.r, color.g), color.b);
  float minC = min(min(color.r, color.g), color.b);
  float h = 0.0;
  float s = 0.0;
  float l = 0.5 * (maxC + minC);
  float d = maxC - minC;
  if (d > 0.00001) {
    s = d / (1.0 - abs(2.0 * l - 1.0));
    if (maxC == color.r) {
      h = ((color.g - color.b) / d + (color.g < color.b ? 6.0 : 0.0)) / 6.0;
    } else if (maxC == color.g) {
      h = ((color.b - color.r) / d + 2.0) / 6.0;
    } else {
      h = ((color.r - color.g) / d + 4.0) / 6.0;
    }
  }
  return float3(h, s, l);
}

float3 applyTemperatureTint(float3 color, float temperature, float tint) {
  float temp = clamp(temperature, -2.0, 2.0);
  float tn = clamp(tint, -2.0, 2.0);
  color.r += temp * 0.08;
  color.b -= temp * 0.08;
  color.g += tn * 0.06;
  color.r -= tn * 0.03;
  color.b -= tn * 0.03;
  return color;
}

float3 applyColorGrading(float3 color, float gradeShadows, float gradeMids, float gradeHighlights) {
  float L = luminance(color);
  float shadowMask = 1.0 - smoothstep(0.2, 0.5, L);
  float highlightMask = smoothstep(0.6, 0.9, L);
  float midMask = clamp(1.0 - abs(2.0 * (L - 0.5)), 0.0, 1.0);
  color += float3(gradeShadows) * shadowMask;
  color += float3(gradeMids) * midMask;
  color += float3(gradeHighlights) * highlightMask;
  return color;
}

float3 applyHslMixer(float3 srgb, float hueShift, float satShift, float lumShift) {
  float3 hsl = rgbToHsl(srgb);
  hsl.x = fract(hsl.x + hueShift);
  hsl.y = clamp(hsl.y * (1.0 + satShift), 0.0, 1.0);
  hsl.z = clamp(hsl.z + lumShift, 0.0, 1.0);
  return hslToRgb(hsl);
}

float4 main(float2 xy) {
  float4 base = inputImage.eval(xy);
  float4 bg   = backgroundImage.eval(xy);

  float3 linear = srgbToLinear(base.rgb);

  linear = applyExposure(linear,  uExposure);
  linear = applyContrast(linear,  uContrast);
  linear = applyHighlights(linear, uHighlights);
  linear = applyShadows(linear,   uShadows);
  linear = applySaturation(linear, uSaturation);
  linear = applyVibrance(linear,   uVibrance);
  linear = applyTemperatureTint(linear, uTemperature, uTint);
  linear = applyColorGrading(linear, uGradeShadows, uGradeMidtones, uGradeHighlights);

  linear = applyHighlightRollOff(linear);

  float3 srgb = linearToSrgb(linear);
  srgb = applyHslMixer(srgb, uMixerHue, uMixerSaturation, uMixerLuminance);
  srgb = addDither(srgb, xy);
  srgb = clamp(srgb, 0.0, 1.0);

  return float4(srgb, base.a);
}
`;

export const presetRuntimeEffect = Skia.RuntimeEffect.Make(presetShaderSource);

// Nếu sau này cần offscreen render / export ảnh thì mới dùng hàm này
export const createPresetShader = (
  imageShader: SkShader | null,
  backgroundShader: SkShader | null,
  adjustments: EditorAdjustments
) => {
  if (!presetRuntimeEffect || !imageShader) {
    return null;
  }

  // buildShaderUniforms returns a keyed object for the React <Shader /> API
  const uniforms = buildShaderUniforms(adjustments);
  const uniformArray = [
    uniforms.uExposure,
    uniforms.uContrast,
    uniforms.uHighlights,
    uniforms.uShadows,
    uniforms.uSaturation,
    uniforms.uVibrance,
    uniforms.uTemperature,
    uniforms.uTint,
    uniforms.uMixerHue,
    uniforms.uMixerSaturation,
    uniforms.uMixerLuminance,
    uniforms.uGradeShadows,
    uniforms.uGradeMidtones,
    uniforms.uGradeHighlights,
  ];

  // Thứ tự children phải khớp với thứ tự `uniform shader` trong SkSL
  const children: SkShader[] = [
    imageShader,                         // inputImage
    backgroundShader ?? imageShader,     // backgroundImage
  ];

  return presetRuntimeEffect.makeShaderWithChildren(uniformArray, children);
};
