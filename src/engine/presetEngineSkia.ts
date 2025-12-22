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

  linear = applyHighlightRollOff(linear);

  float3 srgb = linearToSrgb(linear);
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
  ];

  // Thứ tự children phải khớp với thứ tự `uniform shader` trong SkSL
  const children: SkShader[] = [
    imageShader,                         // inputImage
    backgroundShader ?? imageShader,     // backgroundImage
  ];

  return presetRuntimeEffect.makeShaderWithChildren(uniformArray, children);
};
