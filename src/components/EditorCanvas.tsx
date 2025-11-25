import type { SkImage } from "@shopify/react-native-skia";
import {
  Canvas,
  Fill,
  ImageShader,
  Shader,
  Skia,
  useCanvasRef,
  useImage,
} from "@shopify/react-native-skia";
import { useEffect, useMemo, useState } from "react";
import type { ImageSourcePropType, LayoutChangeEvent } from "react-native";
import { StyleSheet, Text, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
} from "react-native-reanimated";

import { Colors } from "@/constants/theme";
import { buildShaderUniforms } from "@/src/engine/presetMath";
import type { EditorAdjustments } from "@/src/models/editor";

type CanvasRef = ReturnType<typeof useCanvasRef>;

type Props = {
  imageUri?: string | null;
  backgroundSource?: ImageSourcePropType | null;
  adjustments: EditorAdjustments;
  canvasRef: CanvasRef;
  cropAspectRatio?: number | null;
};

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

const palette = Colors.light;

const resolveBackgroundDataSource = (
  source?: ImageSourcePropType | null
): Parameters<typeof useImage>[0] => {
  if (!source) return undefined;

  if (typeof source === "number") return source;

  if (!Array.isArray(source) && typeof source === "object") {
    const maybeUri = (source as any).uri;
    if (typeof maybeUri === "string") {
      return maybeUri;
    }
  }

  if (Array.isArray(source) && source.length > 0) {
    const first = source[0];
    if (typeof first === "number") return first;
    if (first && typeof first === "object" && "uri" in first) {
      const uri = (first as any).uri;
      if (typeof uri === "string") return uri;
    }
  }

  return undefined;
};

/**
 * Hook wrapper cho useImage:
 * - Nếu uri là file:// -> dùng Skia.Data.fromURI (async) + MakeImageFromEncoded
 * - Nếu là network / require / asset -> dùng useImage như bình thường
 */
const useSkiaImage = (uri?: string | null): SkImage | null => {
  const isFileUri = !!uri && uri.startsWith("file://");

  // Non-file:// vẫn dùng useImage
  const skiaImage = useImage(
    !isFileUri ? uri ?? undefined : undefined,
    (err) => {
      console.warn("Skia useImage error", err);
    }
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
        console.log("Skia loading local URI:", uri);
        // SDK mới: fromURI trả Promise
        const data = await Skia.Data.fromURI(uri);
        const img = Skia.Image.MakeImageFromEncoded(data);

        if (!img) {
          throw new Error("MakeImageFromEncoded returned null");
        }

        if (!cancelled) {
          setFileImage(img);
        }
      } catch (e) {
        console.warn("Failed to load local Skia image from URI", uri, e);
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
  backgroundSource,
  adjustments,
  canvasRef,
  cropAspectRatio,
}: Props) => {
  const image = useSkiaImage(imageUri ?? null);

  const backgroundDataSource = resolveBackgroundDataSource(backgroundSource);
  const background = useImage(backgroundDataSource);

  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });

  const aspectRatio = cropAspectRatio ?? 4 / 5;

  const uniforms = useMemo(
    () => buildShaderUniforms(adjustments),
    [adjustments]
  );

  const scale = useSharedValue(1);
  const startScale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);

  const onCanvasLayout = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setCanvasSize({ width, height });
  };

  const pinch = Gesture.Pinch()
    .onBegin(() => {
      startScale.value = scale.value;
    })
    .onChange((event) => {
      scale.value = clamp(startScale.value * event.scale, 0.8, 4);
    })
    .onEnd(() => {
      scale.value = clamp(scale.value, 0.9, 3);
    });

  const pan = Gesture.Pan().onChange((event) => {
    translateX.value = clamp(translateX.value + event.changeX, -120, 120);
    translateY.value = clamp(translateY.value + event.changeY, -120, 120);
  });

  const composedGesture = Gesture.Simultaneous(pinch, pan);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }));

  if (!image) {
    return (
      <View style={styles.placeholder}>
        <Text style={styles.placeholderText}>
          Hãy chọn ảnh để bắt đầu chỉnh sửa.
        </Text>
      </View>
    );
  }

  return (
    <GestureDetector gesture={composedGesture}>
      <Animated.View
        style={[styles.canvasContainer, { aspectRatio }, animatedStyle]}
        onLayout={onCanvasLayout}
      >
        <Canvas ref={canvasRef} style={{ flex: 1 }}>
          {canvasSize.width > 0 &&
            canvasSize.height > 0 &&
            presetRuntimeEffect && (
              <Fill>
                <Shader source={presetRuntimeEffect} uniforms={uniforms}>
                  <ImageShader image={image} fit="cover" />
                  <ImageShader image={background ?? image} fit="cover" />
                </Shader>
              </Fill>
            )}
        </Canvas>
      </Animated.View>
    </GestureDetector>
  );
};

const styles = StyleSheet.create({
  placeholder: {
    height: 360,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: palette.background,
    borderWidth: 1,
    borderColor: palette.border,
  },
  placeholderText: {
    color: palette.text,
    opacity: 0.7,
  },
  canvasContainer: {
    borderRadius: 32,
    overflow: "hidden",
    width: "100%",
    backgroundColor: "#cfe9da",
  },
});
