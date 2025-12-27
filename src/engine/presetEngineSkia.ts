// presetEngineSkia.ts
import { buildShaderUniforms } from "@/src/engine/presetMath";
import type { EditorAdjustments } from "@/src/models/editor";
import type { ColorMixAdjustments } from "@/src/models/presets";
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
uniform float uColorMixHue0;
uniform float uColorMixHue1;
uniform float uColorMixHue2;
uniform float uColorMixHue3;
uniform float uColorMixHue4;
uniform float uColorMixHue5;
uniform float uColorMixHue6;
uniform float uColorMixHue7;
uniform float uColorMixSaturation0;
uniform float uColorMixSaturation1;
uniform float uColorMixSaturation2;
uniform float uColorMixSaturation3;
uniform float uColorMixSaturation4;
uniform float uColorMixSaturation5;
uniform float uColorMixSaturation6;
uniform float uColorMixSaturation7;
uniform float uColorMixLuminance0;
uniform float uColorMixLuminance1;
uniform float uColorMixLuminance2;
uniform float uColorMixLuminance3;
uniform float uColorMixLuminance4;
uniform float uColorMixLuminance5;
uniform float uColorMixLuminance6;
uniform float uColorMixLuminance7;

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
  float mask = smoothstep(0.4, 1.0, L);
  float gain = exp2(amount);
  return mix(color, color * gain, mask);
}

// Shadows adjustment lifts/lowers dark regions without clamping
float3 applyShadows(float3 color, float amount) {
  float L = luminance(color);
  float mask = 1.0 - smoothstep(0.0, 0.5, L);
  float gain = exp2(amount);
  return mix(color, color * gain, mask);
}

// Vibrance boosts low-sat colors more aggressively
float3 applyVibrance(float3 color, float amount) {
  float grey = luminance(color);
  float3 delta = color - float3(grey, grey, grey);
  float sat = length(delta);
  float influence = 1.0 - smoothstep(0.0, 1.0, sat);
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
    s = l > 0.5 ? d / (2.0 - maxC - minC) : d / (maxC + minC);
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

float hueDistance(float a, float b) {
  float d = abs(a - b);
  return min(d, 1.0 - d);
}

float channelInfluence(float hue, float center, float width) {
  float dist = hueDistance(hue, center);
  float normalized = dist / max(width, 0.0001);
  return exp(-normalized * normalized * 4.5);
}

const float CHANNEL_WIDTH = 0.18;

float channelCenter(int index) {
  switch (index) {
    case 0: return 0.00;   // Red
    case 1: return 0.083;  // Orange  
    case 2: return 0.167;  // Yellow
    case 3: return 0.333;  // Green
    case 4: return 0.50;   // Aqua/Cyan
    case 5: return 0.667;  // Blue
    case 6: return 0.792;  // Purple
    default: return 0.917; // Magenta
  }
}

float3 applyColorMixPerChannel(float3 srgb) {
  float3 hsl = rgbToHsl(srgb);
  float hueShift = 0.0;
  float satFactor = 1.0;
  float lumOffset = 0.0;
  
  for (int i = 0; i < 8; ++i) {
    float influence = channelInfluence(hsl.x, channelCenter(i), CHANNEL_WIDTH);
    
    float hueValue =
      i == 0 ? uColorMixHue0 :
      i == 1 ? uColorMixHue1 :
      i == 2 ? uColorMixHue2 :
      i == 3 ? uColorMixHue3 :
      i == 4 ? uColorMixHue4 :
      i == 5 ? uColorMixHue5 :
      i == 6 ? uColorMixHue6 :
               uColorMixHue7;
    float satValue =
      i == 0 ? uColorMixSaturation0 :
      i == 1 ? uColorMixSaturation1 :
      i == 2 ? uColorMixSaturation2 :
      i == 3 ? uColorMixSaturation3 :
      i == 4 ? uColorMixSaturation4 :
      i == 5 ? uColorMixSaturation5 :
      i == 6 ? uColorMixSaturation6 :
               uColorMixSaturation7;
    float lumValue =
      i == 0 ? uColorMixLuminance0 :
      i == 1 ? uColorMixLuminance1 :
      i == 2 ? uColorMixLuminance2 :
      i == 3 ? uColorMixLuminance3 :
      i == 4 ? uColorMixLuminance4 :
      i == 5 ? uColorMixLuminance5 :
      i == 6 ? uColorMixLuminance6 :
               uColorMixLuminance7;
    
    hueShift += hueValue * influence;
    satFactor *= (1.0 + satValue * influence);
    lumOffset += lumValue * influence;
  }
  
  // Apply adjustments
  hsl.x = fract(hsl.x + hueShift);
  hsl.y = clamp(hsl.y * satFactor, 0.0, 1.0);
  hsl.z = clamp(hsl.z + lumOffset, 0.0, 1.0);
  
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
  srgb = applyColorMixPerChannel(srgb);
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
  adjustments: EditorAdjustments,
  colorMix: ColorMixAdjustments
) => {
  if (!presetRuntimeEffect || !imageShader) {
    return null;
  }

  // buildShaderUniforms returns a keyed object for the React <Shader /> API
  const uniforms = buildShaderUniforms(adjustments, colorMix);
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
    uniforms.uColorMixHue0,
    uniforms.uColorMixHue1,
    uniforms.uColorMixHue2,
    uniforms.uColorMixHue3,
    uniforms.uColorMixHue4,
    uniforms.uColorMixHue5,
    uniforms.uColorMixHue6,
    uniforms.uColorMixHue7,
    uniforms.uColorMixSaturation0,
    uniforms.uColorMixSaturation1,
    uniforms.uColorMixSaturation2,
    uniforms.uColorMixSaturation3,
    uniforms.uColorMixSaturation4,
    uniforms.uColorMixSaturation5,
    uniforms.uColorMixSaturation6,
    uniforms.uColorMixSaturation7,
    uniforms.uColorMixLuminance0,
    uniforms.uColorMixLuminance1,
    uniforms.uColorMixLuminance2,
    uniforms.uColorMixLuminance3,
    uniforms.uColorMixLuminance4,
    uniforms.uColorMixLuminance5,
    uniforms.uColorMixLuminance6,
    uniforms.uColorMixLuminance7,
  ];

  // Thứ tự children phải khớp với thứ tự `uniform shader` trong SkSL
  const children: SkShader[] = [
    imageShader, // inputImage
    backgroundShader ?? imageShader, // backgroundImage
  ];

  return presetRuntimeEffect.makeShaderWithChildren(uniformArray, children);
};
