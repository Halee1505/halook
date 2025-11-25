import { Skia, type SkShader } from "@shopify/react-native-skia";

import { buildShaderUniforms } from "@/src/engine/presetMath";
import type { EditorAdjustments } from "@/src/models/editor";

const presetShaderSource = `
  uniform shader inputImage;
  uniform shader backgroundImage;

  // ví dụ vài uniform chỉnh màu
  uniform float u_exposure;
  uniform float u_contrast;
  uniform float u_saturation;

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

  half4 main(float2 xy) {
    // KHÔNG scale / flip / normalize xy nữa
    half4 base = inputImage.eval(xy);
    half4 bg   = backgroundImage.eval(xy);

    half4 color = base; // hoặc blend với bg nếu bạn muốn

    color.rgb = applyExposure(color.rgb, u_exposure);
    color.rgb = applyContrast(color.rgb, u_contrast);
    color.rgb = applySaturation(color.rgb, u_saturation);

    return color;
  }
`;

export const presetRuntimeEffect = Skia.RuntimeEffect.Make(presetShaderSource);

export const createPresetShader = (
  imageShader: SkShader | null,
  backgroundShader: SkShader | null,
  adjustments: EditorAdjustments
) => {
  if (!presetRuntimeEffect || !imageShader) {
    return null;
  }

  const uniforms = buildShaderUniforms(adjustments);

  const children: Record<string, SkShader> = {
    uImage: imageShader,
  };

  if (backgroundShader) {
    children.uBackground = backgroundShader;
  } else {
    children.uBackground = imageShader;
  }

  return presetRuntimeEffect.makeShaderWithChildren(uniforms, children);
};
