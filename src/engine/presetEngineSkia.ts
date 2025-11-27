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

half3 srgbToLinear(half3 c) {
  half3 result;
  result.r = (c.r <= 0.04045) ? (c.r / 12.92) : pow((c.r + 0.055) / 1.055, 2.4);
  result.g = (c.g <= 0.04045) ? (c.g / 12.92) : pow((c.g + 0.055) / 1.055, 2.4);
  result.b = (c.b <= 0.04045) ? (c.b / 12.92) : pow((c.b + 0.055) / 1.055, 2.4);
  return result;
}

half3 linearToSrgb(half3 c) {
  half3 result;
  result.r = (c.r <= 0.0031308) ? (c.r * 12.92) : (1.055 * pow(c.r, 1.0 / 2.4) - 0.055);
  result.g = (c.g <= 0.0031308) ? (c.g * 12.92) : (1.055 * pow(c.g, 1.0 / 2.4) - 0.055);
  result.b = (c.b <= 0.0031308) ? (c.b * 12.92) : (1.055 * pow(c.b, 1.0 / 2.4) - 0.055);
  return result;
}

half luminance(half3 c) {
  return dot(c, half3(0.299, 0.587, 0.114));
}

half3 applyExposure(half3 color, float exposure) {
  // exposure theo EV
  return color * pow(2.0, exposure);
}

half3 applyContrast(half3 color, float contrast) {
  // contrast: 1.0 = không đổi
  const half pivot = 0.5;
  return (color - pivot) * contrast + pivot;
}

half3 applySaturation(half3 color, float saturation) {
  half grey = dot(color, half3(0.299, 0.587, 0.114));
  return mix(half3(grey, grey, grey), color, saturation);
}

half3 applyHighlights(half3 color, float amount) {
  // amount: -1..1
  half L = luminance(color);
  half mask = smoothstep(0.6, 1.0, L);  // vùng sáng
  half targetL = clamp(L + mask * amount, 0.0, 1.0);

  if (L <= 0.0) {
    return color;
  }

  half scale = targetL / L;
  return clamp(color * scale, 0.0, 1.0);
}

half3 applyShadows(half3 color, float amount) {
  // amount: -1..1
  half L = luminance(color);
  half mask = 1.0 - smoothstep(0.0, 0.6, L); // vùng tối
  half targetL = clamp(L + mask * amount, 0.0, 1.0);

  if (L <= 0.0) {
    return color;
  }

  half scale = targetL / L;
  return clamp(color * scale, 0.0, 1.0);
}

half3 applyVibrance(half3 color, float amount) {
  // amount: -1..1
  half grey = luminance(color);
  half3 delta = color - half3(grey, grey, grey);
  half sat = length(delta);
  half factor = 1.0 + amount * (1.0 - sat); // ít bão hoà → boost nhiều hơn
  return clamp(half3(grey, grey, grey) + delta * factor, 0.0, 1.0);
}

half4 main(float2 xy) {
  half4 base = inputImage.eval(xy);
  half4 bg   = backgroundImage.eval(xy);

  half4 color = base; // nếu muốn blend với bg thì chỉnh ở đây

  // 1. convert sang linear space
  half3 c = srgbToLinear(color.rgb);

  // 2. Áp preset
  c = applyExposure(c,  uExposure);
  c = applyContrast(c,  uContrast);
  c = applyHighlights(c, uHighlights);
  c = applyShadows(c,   uShadows);
  c = applySaturation(c, uSaturation);
  c = applyVibrance(c,   uVibrance);

  c = clamp(c, 0.0, 1.0);

  // 3. convert lại sRGB để hiển thị
  color.rgb = linearToSrgb(c);
  return color;
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
