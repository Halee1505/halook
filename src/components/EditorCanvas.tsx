import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  LayoutRectangle,
  StyleSheet,
  type LayoutChangeEvent,
  View,
} from "react-native";

import {
  Canvas,
  Fill,
  Group,
  Image as SkiaImage,
  ImageShader,
  Shader,
  Skia,
  type SkImage,
  useCanvasRef,
  useImage,
} from "@shopify/react-native-skia";
import { EncodingType, readAsStringAsync } from "expo-file-system/legacy";

import { applyPresetIntensity, applyColorMixIntensity, buildShaderUniforms } from "@/src/engine/presetMath";
import { clampCropRect, isFullscreenCrop } from "@/src/engine/cropMath";
import type { EditorAdjustments, CropRect } from "@/src/models/editor";
import type { ColorMixAdjustments } from "@/src/models/presets";
import { presetRuntimeEffect } from "../engine/presetEngineSkia";

type CanvasRef = ReturnType<typeof useCanvasRef>;

type Props = {
  imageUri?: string | null;
  adjustments: EditorAdjustments;
  colorMix: ColorMixAdjustments;
  canvasRef: CanvasRef;
  cropAspectRatio?: number | null;
  intensity?: number;
  showOriginal?: boolean;
  cropRectNormalized?: CropRect;
  onImageRectChange?: (
    rect: LayoutRectangle & { pageX: number; pageY: number }
  ) => void;
};

type Size = { width: number; height: number };

const fitWithinBounds = (container: Size, aspectRatio: number): Size => {
  const { width, height } = container;
  if (width <= 0 || height <= 0 || aspectRatio <= 0) {
    return { width: 0, height: 0 };
  }

  const containerAspect = width / height;
  if (containerAspect > aspectRatio) {
    const fittedHeight = height;
    const fittedWidth = fittedHeight * aspectRatio;
    return { width: fittedWidth, height: fittedHeight };
  }

  const fittedWidth = width;
  const fittedHeight = fittedWidth / aspectRatio;
  return { width: fittedWidth, height: fittedHeight };
};

/**
 * Load images from file:// using Skia.Data.fromURI (async), fallback to base64 if needed.
 * Non-file URIs still rely on useImage for caching and performance.
 */
const useSkiaImage = (uri?: string | null): SkImage | null => {
  const isFileUri = !!uri && uri.startsWith("file://");

  const skiaImage = useImage(!isFileUri ? uri ?? undefined : undefined, (err) =>
    console.warn("Skia useImage error", err)
  );

  const [fileImage, setFileImage] = useState<SkImage | null>(null);

  useEffect(() => {
    let cancelled = false;
    setFileImage(null);

    if (!isFileUri || !uri) {
      return;
    }

    (async () => {
      try {
        const dataFromUri = await Skia.Data.fromURI(uri);
        const img = Skia.Image.MakeImageFromEncoded(dataFromUri);
        if (img && !cancelled) {
          setFileImage(img);
          return;
        }
      } catch (err) {
        console.warn("Skia Data.fromURI failed", err);
      }

      try {
        const base64 = await readAsStringAsync(uri, {
          encoding: EncodingType.Base64,
        });
        const dataFromBase64 = Skia.Data.fromBase64(base64);
        const img = Skia.Image.MakeImageFromEncoded(dataFromBase64);
        if (img && !cancelled) {
          setFileImage(img);
        }
      } catch (err) {
        console.warn("Skia base64 fallback failed", err);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [uri, isFileUri]);

  return isFileUri ? fileImage : (skiaImage as SkImage | null);
};

export const EditorCanvas = ({
  imageUri,
  adjustments,
  colorMix,
  canvasRef,
  cropAspectRatio,
  intensity = 1,
  showOriginal = false,
  cropRectNormalized,
  onImageRectChange,
}: Props) => {
  const image = useSkiaImage(imageUri ?? null);

  const [containerSize, setContainerSize] = useState<Size>({
    width: 0,
    height: 0,
  });

  const innerRef = useRef<View>(null);
  const reportLayout = useCallback(() => {
    if (!onImageRectChange || !innerRef.current) {
      return;
    }
    innerRef.current.measure((x, y, width, height, pageX, pageY) => {
      if (!width || !height) {
        return;
      }
      onImageRectChange({
        x,
        y,
        width,
        height,
        pageX,
        pageY,
      });
    });
  }, [onImageRectChange]);

  const handleLayout = useCallback((e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setContainerSize((prev) => {
      if (prev.width === width && prev.height === height) {
        return prev;
      }
      return { width, height };
    });
    reportLayout();
  }, [reportLayout]);

  const uniforms = useMemo(() => {
    const appliedAdjustments = applyPresetIntensity(adjustments, intensity);
    const appliedColorMix = applyColorMixIntensity(colorMix, intensity);
    const computedUniforms = buildShaderUniforms(
      appliedAdjustments,
      appliedColorMix
    );
    return computedUniforms;
  }, [adjustments, colorMix, intensity]);

  const imageAspect = image ? image.width() / image.height() : 3 / 4;
  const effectiveCrop = useMemo(() => {
    if (!cropRectNormalized) {
      return clampCropRect({ x: 0, y: 0, w: 1, h: 1 });
    }
    return clampCropRect(cropRectNormalized);
  }, [cropRectNormalized]);
  const croppedAspect = useMemo(() => {
    if (!image) {
      return imageAspect;
    }
    return imageAspect * (effectiveCrop.w / effectiveCrop.h);
  }, [effectiveCrop.h, effectiveCrop.w, image, imageAspect]);
  const targetAspect = isFullscreenCrop(effectiveCrop)
    ? cropAspectRatio ?? imageAspect
    : cropAspectRatio ?? croppedAspect;
  const fittedSize = useMemo(
    () => fitWithinBounds(containerSize, targetAspect),
    [containerSize, targetAspect]
  );

  const hasEffect = !!presetRuntimeEffect;
  const shouldRenderAdjusted = hasEffect && !showOriginal;
  const canRender =
    !!image &&
    fittedSize.width > 0 &&
    fittedSize.height > 0 &&
    (hasEffect || showOriginal);

  const clipRect = useMemo(() => {
    if (isFullscreenCrop(effectiveCrop)) {
      return null;
    }
    return {
      x: effectiveCrop.x * fittedSize.width,
      y: effectiveCrop.y * fittedSize.height,
      width: effectiveCrop.w * fittedSize.width,
      height: effectiveCrop.h * fittedSize.height,
    };
  }, [effectiveCrop, fittedSize.height, fittedSize.width]);

  useEffect(() => {
    reportLayout();
  }, [reportLayout, fittedSize.height, fittedSize.width]);

  return (
    <View style={styles.outer} onLayout={handleLayout}>
      <View
        ref={innerRef}
        style={[
          styles.canvasWrapper,
          { width: fittedSize.width, height: fittedSize.height },
        ]}
      >
        {canRender && image ? (
          <Canvas ref={canvasRef} style={StyleSheet.absoluteFill}>
            <Group clip={clipRect ?? undefined}>
            {shouldRenderAdjusted ? (
              <Fill>
                <Shader source={presetRuntimeEffect!} uniforms={uniforms}>
                  <ImageShader
                    image={image}
                    fit="cover"
                    rect={{
                      x: 0,
                      y: 0,
                      width: fittedSize.width,
                      height: fittedSize.height,
                    }}
                  />
                  <ImageShader
                    image={image}
                    fit="cover"
                    rect={{
                      x: 0,
                      y: 0,
                      width: fittedSize.width,
                      height: fittedSize.height,
                    }}
                  />
                </Shader>
              </Fill>
            ) : (
              <SkiaImage
                image={image}
                fit="cover"
                x={0}
                y={0}
                width={fittedSize.width}
                height={fittedSize.height}
              />
            )}
            </Group>
          </Canvas>
        ) : (
          <View style={styles.placeholder} />
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  outer: {
    width: "100%",
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  canvasWrapper: {
    borderRadius: 20,
    overflow: "hidden",
    backgroundColor: "#010101",
  },
  placeholder: {
    flex: 1,
    backgroundColor: "#010101",
  },
});
