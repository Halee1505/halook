import { useEffect, useMemo } from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  type SharedValue,
} from "react-native-reanimated";
import { Gesture, GestureDetector } from "react-native-gesture-handler";

import type { CropRect } from "@/src/models/editor";

type Anchor =
  | "move"
  | "tl"
  | "tr"
  | "bl"
  | "br"
  | "l"
  | "r"
  | "t"
  | "b";

type Props = {
  imageRectOnScreen: {
    x: number;
    y: number;
    width: number;
    height: number;
    pageX?: number;
    pageY?: number;
  };
  cropRectNormalized: CropRect;
  onChange: (rect: CropRect) => void;
  onChangeEnd?: (rect: CropRect) => void;
  minSizeNormalized?: number;
  enabled?: boolean;
};

const clamp01 = (value: number) => {
  "worklet";
  return Math.min(1, Math.max(0, value));
};

const normalizeRect = (rect: CropRect): CropRect => {
  "worklet";
  let { x, y, w, h } = rect;
  if (w < 0) {
    x += w;
    w = Math.abs(w);
  }
  if (h < 0) {
    y += h;
    h = Math.abs(h);
  }
  return { x, y, w, h };
};

const overlayAccent = "#e6b06e";
const overlayHandleFill = "rgba(8,8,8,0.8)";

const clampCropRect = (
  rect: CropRect,
  minSize = 0.05
): CropRect => {
  "worklet";
  const normalized = normalizeRect(rect);
  let { x, y, w, h } = normalized;
  const minW = Math.min(1, Math.max(minSize, 0));
  const minH = Math.min(1, Math.max(minSize, 0));

  w = Math.max(minW, Math.min(1, w));
  h = Math.max(minH, Math.min(1, h));
  x = clamp01(x);
  y = clamp01(y);

  if (x + w > 1) {
    x = Math.max(0, 1 - w);
  }

  if (y + h > 1) {
    y = Math.max(0, 1 - h);
  }

  return { x, y, w, h };
};

export const CropOverlay = ({
  imageRectOnScreen,
  cropRectNormalized,
  onChange,
  onChangeEnd,
  minSizeNormalized = 0.05,
  enabled = true,
}: Props) => {
  const container = useSharedValue({
    width: imageRectOnScreen.width,
    height: imageRectOnScreen.height,
  });
  const rectValue = useSharedValue<CropRect>(cropRectNormalized);
  const lastEmit = useSharedValue(0);

  useEffect(() => {
    container.value = {
      width: imageRectOnScreen.width,
      height: imageRectOnScreen.height,
    };
  }, [imageRectOnScreen.height, imageRectOnScreen.width, container]);

  useEffect(() => {
    rectValue.value = cropRectNormalized;
  }, [cropRectNormalized, rectValue]);

  const emitChange = (next: CropRect, isEnd = false) => {
    "worklet";
    const now =
      typeof globalThis.performance?.now === "function"
        ? globalThis.performance.now()
        : Date.now();
    if (now - lastEmit.value > 32 || isEnd) {
      lastEmit.value = now;
      runOnJS(onChange)(next);
    }
    if (isEnd && onChangeEnd) {
      runOnJS(onChangeEnd)(next);
    }
  };

  const applyDelta = (dx: number, dy: number, anchor: Anchor) => {
    "worklet";
    const base = rectValue.value;
    let next = { ...base };
    switch (anchor) {
      case "move":
        next = {
          ...base,
          x: base.x + dx,
          y: base.y + dy,
        };
        break;
      case "l":
        next = {
          ...base,
          x: base.x + dx,
          w: base.w - dx,
        };
        break;
      case "r":
        next = {
          ...base,
          w: base.w + dx,
        };
        break;
      case "t":
        next = {
          ...base,
          y: base.y + dy,
          h: base.h - dy,
        };
        break;
      case "b":
        next = {
          ...base,
          h: base.h + dy,
        };
        break;
      case "tl":
        next = {
          x: base.x + dx,
          y: base.y + dy,
          w: base.w - dx,
          h: base.h - dy,
        };
        break;
      case "tr":
        next = {
          x: base.x,
          y: base.y + dy,
          w: base.w + dx,
          h: base.h - dy,
        };
        break;
      case "bl":
        next = {
          x: base.x + dx,
          y: base.y,
          w: base.w - dx,
          h: base.h + dy,
        };
        break;
      case "br":
        next = {
          ...base,
          w: base.w + dx,
          h: base.h + dy,
        };
        break;
      default:
        next = base;
    }
    const clamped = clampCropRect(next, minSizeNormalized);
    rectValue.value = clamped;
    emitChange(clamped, false);
  };

  const makePanGesture = (anchor: Anchor) =>
    Gesture.Pan()
      .enabled(enabled)
      .onChange((event) => {
        const { width, height } = container.value;
        if (!width || !height) {
          return;
        }
        applyDelta(
          event.changeX / width,
          event.changeY / height,
          anchor
        );
      })
      .onEnd(() => {
        emitChange(rectValue.value, true);
      });

  const selectionStyle = useAnimatedStyle(() => {
    const { width, height } = container.value;
    return {
      left: rectValue.value.x * width,
      top: rectValue.value.y * height,
      width: rectValue.value.w * width,
      height: rectValue.value.h * height,
    };
  }, []);

  const maskStyles = useMaskStyles(rectValue, container);

  const handlePositions = useMemo(
    () => [
      { anchor: "tl", style: styles.handleCorner },
      { anchor: "tr", style: [styles.handleCorner, styles.handleCornerRight] },
      { anchor: "bl", style: [styles.handleCorner, styles.handleCornerBottom] },
      {
        anchor: "br",
        style: [
          styles.handleCorner,
          styles.handleCornerRight,
          styles.handleCornerBottom,
        ],
      },
      { anchor: "t", style: [styles.handleEdge] },
      {
        anchor: "b",
        style: [styles.handleEdge, styles.handleEdgeBottom],
      },
      { anchor: "l", style: [styles.handleEdgeVertical] },
      {
        anchor: "r",
        style: [styles.handleEdgeVertical, styles.handleEdgeRight],
      },
    ],
    []
  );

  const absolute = useMemo(
    () => ({
      left: imageRectOnScreen.pageX ?? imageRectOnScreen.x,
      top: imageRectOnScreen.pageY ?? imageRectOnScreen.y,
      width: imageRectOnScreen.width,
      height: imageRectOnScreen.height,
    }),
    [imageRectOnScreen]
  );

  return (
    <View pointerEvents="box-none" style={[styles.absoluteFill, absolute]}>
      <Animated.View pointerEvents="none" style={[styles.mask, maskStyles.top]} />
      <Animated.View pointerEvents="none" style={[styles.mask, maskStyles.bottom]} />
      <Animated.View pointerEvents="none" style={[styles.mask, maskStyles.left]} />
      <Animated.View pointerEvents="none" style={[styles.mask, maskStyles.right]} />
      <GestureDetector gesture={makePanGesture("move")}>
        <Animated.View style={[styles.selection, selectionStyle]}>
          {handlePositions.map(({ anchor, style }) => (
            <GestureDetector key={anchor} gesture={makePanGesture(anchor as Anchor)}>
              <View
                pointerEvents="box-only"
                style={[styles.handleBase, style]}
              />
            </GestureDetector>
          ))}
        </Animated.View>
      </GestureDetector>
    </View>
  );
};

const useMaskStyles = (
  rectValue: SharedValue<CropRect>,
  container: SharedValue<{ width: number; height: number }>
) => {
  const top = useAnimatedStyle(() => {
    const { width, height } = container.value;
    return {
      left: 0,
      right: 0,
      height: rectValue.value.y * height,
      top: 0,
    };
  });
  const bottom = useAnimatedStyle(() => {
    const { width, height } = container.value;
    const start = (rectValue.value.y + rectValue.value.h) * height;
    return {
      left: 0,
      right: 0,
      top: start,
      height: Math.max(0, height - start),
    };
  });
  const left = useAnimatedStyle(() => {
    const { width, height } = container.value;
    return {
      top: rectValue.value.y * height,
      height: rectValue.value.h * height,
      left: 0,
      width: rectValue.value.x * width,
    };
  });
  const right = useAnimatedStyle(() => {
    const { width, height } = container.value;
    const start = (rectValue.value.x + rectValue.value.w) * width;
    return {
      top: rectValue.value.y * height,
      height: rectValue.value.h * height,
      left: start,
      width: Math.max(0, width - start),
    };
  });
  return { top, bottom, left, right };
};

const styles = StyleSheet.create({
  absoluteFill: {
    position: "absolute",
  },
  mask: {
    position: "absolute",
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  selection: {
    position: "absolute",
    borderWidth: 2,
    borderColor: overlayAccent,
  },
  handleBase: {
    position: "absolute",
  },
  handleCorner: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: overlayAccent,
    backgroundColor: overlayHandleFill,
    top: -10,
    left: -10,
  },
  handleCornerRight: {
    left: undefined,
    right: -12,
  },
  handleCornerBottom: {
    top: undefined,
    bottom: -12,
  },
  handleEdge: {
    height: 16,
    width: 28,
    top: -8,
    left: "50%",
    marginLeft: -14,
    borderRadius: 999,
    borderWidth: 2,
    borderColor: overlayAccent,
    backgroundColor: overlayHandleFill,
  },
  handleEdgeBottom: {
    top: undefined,
    bottom: -8,
  },
  handleEdgeVertical: {
    width: 16,
    height: 28,
    left: -8,
    top: "50%",
    marginTop: -14,
    borderRadius: 999,
    borderWidth: 2,
    borderColor: overlayAccent,
    backgroundColor: overlayHandleFill,
  },
  handleEdgeRight: {
    left: undefined,
    right: -8,
  },
});
