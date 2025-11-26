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

half3 applyExposure(half3 color, float exposure) {
  return color * pow(2.0, exposure);
}

half3 applyContrast(half3 color, float contrast) {
  return (color - 0.5) * contrast + 0.5;
}

half3 applySaturation(half3 color, float saturation) {
  half grey = dot(color, half3(0.299, 0.587, 0.114));
  return mix(half3(grey, grey, grey), color, saturation);
}

half3 applyHighlights(half3 color, float amount) {
  // Push bright regions toward white or pull back, keeping shadows intact
  half3 highlightMask = smoothstep(0.6, 1.0, color);
  return mix(color, clamp(color + highlightMask * amount, 0.0, 1.0), 0.8);
}

half3 applyShadows(half3 color, float amount) {
  // Lift or crush darker regions
  half3 shadowMask = 1.0 - smoothstep(0.0, 0.6, color);
  return mix(color, clamp(color + shadowMask * amount, 0.0, 1.0), 0.8);
}

half3 applyVibrance(half3 color, float amount) {
  // Boost chroma more on less saturated pixels
  half grey = dot(color, half3(0.299, 0.587, 0.114));
  half3 delta = color - half3(grey, grey, grey);
  return clamp(color + delta * amount, 0.0, 1.0);
}

half4 main(float2 xy) {
  half4 base = inputImage.eval(xy);
  half4 bg   = backgroundImage.eval(xy);

  half4 color = base; // nếu muốn blend với bg thì chỉnh ở đây

  color.rgb = applyExposure(color.rgb, uExposure);
  color.rgb = applyContrast(color.rgb, uContrast);
  color.rgb = applyHighlights(color.rgb, uHighlights);
  color.rgb = applyShadows(color.rgb, uShadows);
  color.rgb = applySaturation(color.rgb, uSaturation);
  color.rgb = applyVibrance(color.rgb, uVibrance);

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
