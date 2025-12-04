import React, { useCallback, useEffect, useMemo, useState } from "react";
import type { LayoutChangeEvent } from "react-native";
import { View } from "react-native";

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

  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });

  const handleLayout = useCallback(
    (e: LayoutChangeEvent) => {
      const { width, height } = e.nativeEvent.layout;
      if (width !== canvasSize.width || height !== canvasSize.height) {
        setCanvasSize({ width, height });
      }
    },
    [canvasSize.width, canvasSize.height]
  );

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

  if (!image || !presetRuntimeEffect) {
    return null;
  }

  const imageAspect = image.width() / image.height();
  const targetAspect = cropAspectRatio ?? imageAspect;
  return (
    <View
      style={{
        width: "100%",
        aspectRatio: targetAspect,
        borderRadius: 16,
        overflow:"hidden"
      }}
      onLayout={handleLayout}
    >
      <Canvas ref={canvasRef} style={{ flex: 1 }}>
        {canvasSize.width > 0 && canvasSize.height > 0 && (
          <Fill>
            <Shader source={presetRuntimeEffect} uniforms={uniforms}>
              <ImageShader
                image={image}
                fit="cover"
                rect={{
                  x: 0,
                  y:65,
                  width: canvasSize.width,
                  height: canvasSize.height,
                }}
              />
              {/* second child matches backgroundImage uniform; reuse base image when no overlay */}
              <ImageShader
                image={image}
                fit="cover"
                rect={{
                  x: 0,
                  y:65,
                  width: canvasSize.width,
                  height: canvasSize.height,
                }}
              />
            </Shader>
          </Fill>
        )}
      </Canvas>
    </View>
  );
};
