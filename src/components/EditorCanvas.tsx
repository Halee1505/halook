import React, { useCallback, useEffect, useMemo, useState } from "react";
import { StyleSheet, type LayoutChangeEvent, View } from "react-native";

import {
  Canvas,
  Fill,
  ImageShader,
  Shader,
  Skia,
  type SkImage,
  useCanvasRef,
  useImage,
} from "@shopify/react-native-skia";
import { EncodingType, readAsStringAsync } from "expo-file-system/legacy";

import { applyPresetIntensity, buildShaderUniforms } from "@/src/engine/presetMath";
import type { EditorAdjustments } from "@/src/models/editor";
import { presetRuntimeEffect } from "../engine/presetEngineSkia";

type CanvasRef = ReturnType<typeof useCanvasRef>;

type Props = {
  imageUri?: string | null;
  adjustments: EditorAdjustments;
  canvasRef: CanvasRef;
  cropAspectRatio?: number | null;
  intensity?: number;
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
  canvasRef,
  cropAspectRatio,
  intensity = 1,
}: Props) => {
  const image = useSkiaImage(imageUri ?? null);

  const [containerSize, setContainerSize] = useState<Size>({
    width: 0,
    height: 0,
  });

  const handleLayout = useCallback((e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setContainerSize((prev) => {
      if (prev.width === width && prev.height === height) {
        return prev;
      }
      return { width, height };
    });
  }, []);

  const uniforms = useMemo(
    () => {
      const appliedAdjustments = applyPresetIntensity(adjustments, intensity);
      const computedUniforms = buildShaderUniforms(appliedAdjustments);
      // console.log("[EditorCanvas] applying adjustments", {
      //   adjustments,
      //   intensity,
      //   appliedAdjustments,
      //   uniforms: computedUniforms,
      // });
      return computedUniforms;
    },
    [adjustments, intensity]
  );

  const imageAspect = image ? image.width() / image.height() : 3 / 4;
  const targetAspect = cropAspectRatio ?? imageAspect;
  const fittedSize = useMemo(
    () => fitWithinBounds(containerSize, targetAspect),
    [containerSize, targetAspect]
  );

  const canRender =
    !!image &&
    !!presetRuntimeEffect &&
    fittedSize.width > 0 &&
    fittedSize.height > 0;

  return (
    <View style={styles.outer} onLayout={handleLayout}>
      <View
        style={[
          styles.canvasWrapper,
          { width: fittedSize.width, height: fittedSize.height },
        ]}
      >
        {canRender && image && presetRuntimeEffect ? (
          <Canvas ref={canvasRef} style={StyleSheet.absoluteFill}>
            <Fill>
              <Shader source={presetRuntimeEffect} uniforms={uniforms}>
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
