import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import Slider, { type SliderProps } from "@react-native-community/slider";
import { useCanvasRef } from "@shopify/react-native-skia";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Easing,
  GestureResponderEvent,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { CropOverlay } from "@/src/components/CropOverlay";
import { EditorCanvas } from "@/src/components/EditorCanvas";
import { CROP_OPTIONS } from "@/src/constants/cropOptions";
import { DEFAULT_CROP_RECT } from "@/src/engine/cropMath";
import {
  adjustmentRanges,
  buildEditorAdjustmentsFromPreset,
} from "@/src/engine/presetMath";
import { useEditorState } from "@/src/hooks/useEditorState";
import { usePresetList } from "@/src/hooks/usePresets";
import {
  adjustmentKeys,
  type AdjustmentKey,
  type CropRect,
} from "@/src/models/editor";
import type { Preset } from "@/src/models/presets";
import { exportCanvasToCameraRoll } from "@/src/services/imageExporter";

const editorAccent = "#e6b06e";
const editorBg = "#050505";
const editorSurface = "#121212";
const DOUBLE_TAP_RESET_DELAY = 250;

const ADJUSTMENT_UI: Record<
  AdjustmentKey,
  { label: string; subtitle: string; icon: keyof typeof MaterialIcons.glyphMap }
> = {
  exposure: { label: "Exposure", subtitle: "Light balance", icon: "exposure" },
  contrast: {
    label: "Contrast",
    subtitle: "Depth + clarity",
    icon: "contrast",
  },
  highlights: {
    label: "Highlights",
    subtitle: "Bright detail",
    icon: "light-mode",
  },
  shadows: { label: "Shadows", subtitle: "Dark detail", icon: "dark-mode" },
  saturation: {
    label: "Saturation",
    subtitle: "Color richness",
    icon: "water-drop",
  },
  vibrance: {
    label: "Vibrance",
    subtitle: "Subtle color",
    icon: "auto-awesome",
  },
  temperature: {
    label: "Temperature",
    subtitle: "Warm ↔ Cool",
    icon: "wb-sunny",
  },
  tint: {
    label: "Tint",
    subtitle: "Magenta ↔ Green",
    icon: "gradient",
  },
  mixerHue: {
    label: "Hue Mixer",
    subtitle: "Rotate colors",
    icon: "palette",
  },
  mixerSaturation: {
    label: "Mixer Saturation",
    subtitle: "Mix intensity",
    icon: "colorize",
  },
  mixerLuminance: {
    label: "Mixer Lum.",
    subtitle: "Mix brightness",
    icon: "tonality",
  },
  gradingShadows: {
    label: "Grade Shadows",
    subtitle: "Lift/darken lows",
    icon: "texture",
  },
  gradingMidtones: {
    label: "Grade Mids",
    subtitle: "Tone midrange",
    icon: "filter-none",
  },
  gradingHighlights: {
    label: "Grade Highlights",
    subtitle: "Shape highs",
    icon: "flare",
  },
};

type NavId = "presets" | "adjust" | "crop" | "mask";

export default function EditorScreen() {
  const router = useRouter();
  const canvasRef = useCanvasRef();
  const imageUri = useEditorState((state) => state.imageUri);
  const adjustments = useEditorState((state) => state.adjustments);
  const updateAdjustment = useEditorState((state) => state.updateAdjustment);
  const cropAspectRatio = useEditorState((state) => state.cropAspectRatio);
  const cropModeId = useEditorState((state) => state.cropModeId);
  const presetIntensity = useEditorState((state) => state.presetIntensity);
  const setPresetIntensity = useEditorState(
    (state) => state.setPresetIntensity
  );
  const applyPreset = useEditorState((state) => state.applyPreset);
  const cropRectNormalized = useEditorState(
    (state) => state.cropRectNormalized
  );
  const setCropRectNormalized = useEditorState(
    (state) => state.setCropRectNormalized
  );
  const setCropState = useEditorState((state) => state.setCropState);
  const currentPresetId = useEditorState((state) => state.preset?._id);
  const resetAdjustments = useEditorState((state) => state.resetAdjustments);
  const [activeAdjustment, setActiveAdjustment] =
    useState<AdjustmentKey>("exposure");
  const [activeNav, setActiveNav] = useState<NavId>("adjust");
  const [isComparing, setIsComparing] = useState(false);
  const [cropSession, setCropSession] = useState<{
    rect: typeof cropRectNormalized;
    ratio: number | null;
    modeId: string;
  } | null>(null);
  const [imageRect, setImageRect] = useState<{
    x: number;
    y: number;
    width: number;
    height: number;
    pageX: number;
    pageY: number;
  } | null>(null);
  const imageRectRef = useRef<typeof imageRect>(null);
  const {
    presets,
    loading: presetsLoading,
    error: presetsError,
    reload: reloadPresets,
  } = usePresetList();

  const cropStateRef = useRef({
    rect: { ...cropRectNormalized },
    ratio: cropAspectRatio,
    modeId: cropModeId,
  });

  useEffect(() => {
    if (activeNav === "crop") {
      return;
    }
    cropStateRef.current = {
      rect: { ...cropRectNormalized },
      ratio: cropAspectRatio,
      modeId: cropModeId,
    };
  }, [cropRectNormalized, cropAspectRatio, cropModeId, activeNav]);

  useEffect(() => {
    if (activeNav === "crop") {
      const snapshot = cropStateRef.current;
      setCropSession({
        rect: { ...snapshot.rect },
        ratio: snapshot.ratio,
        modeId: snapshot.modeId,
      });
    } else {
      setCropSession(null);
    }
  }, [activeNav]);

  const activeRange = adjustmentRanges[activeAdjustment];
  const activeValue = adjustments[activeAdjustment];

  const [saveToastVisible, setSaveToastVisible] = useState(false);
  const toastOpacity = useRef(new Animated.Value(0)).current;

  const showSaveToast = useCallback(() => {
    setSaveToastVisible(true);
    Animated.sequence([
      Animated.timing(toastOpacity, {
        toValue: 1,
        duration: 100,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
      Animated.delay(1600),
      Animated.timing(toastOpacity, {
        toValue: 0,
        duration: 100,
        easing: Easing.in(Easing.ease),
        useNativeDriver: true,
      }),
    ]).start(({ finished }) => {
      if (finished) {
        setSaveToastVisible(false);
      }
    });
  }, [toastOpacity]);

  const handleSave = async (navigateToShare = false) => {
    if (!imageUri) {
      Alert.alert("Chưa có ảnh", "Hãy chụp ảnh bằng camera Halook.");
      return;
    }

    try {
      const savedUri = await exportCanvasToCameraRoll({
        imageUri,
        adjustments,
        intensity: presetIntensity,
        cropAspectRatio,
        cropRect: cropRectNormalized,
      });
      showSaveToast();
      if (navigateToShare) {
        router.push({ pathname: "/share", params: { uri: savedUri } });
      }
    } catch (error) {
      Alert.alert(
        "Không thể lưu",
        error instanceof Error ? error.message : "Vui lòng thử lại."
      );
    }
  };

  const handleSliderChange = (value: number) => {
    updateAdjustment(activeAdjustment, parseFloat(value.toFixed(2)));
  };

  const handleNavPress = (id: NavId) => {
    if (id === "mask") {
      Alert.alert("Sắp ra mắt", "Tính năng mask đang được hoàn thiện.");
      return;
    }
    setActiveNav(id);
  };

  const formattedValue = useMemo(() => {
    const value = activeValue;
    return `${value >= 0 ? "+" : ""}${value.toFixed(2)}`;
  }, [activeValue]);

  const handlePresetIntensityChange = (value: number) => {
    setPresetIntensity(parseFloat(value.toFixed(2)));
  };

  const handlePresetSelect = (preset: Preset) => {
    applyPreset(preset);
    setActiveNav("presets");
  };

  const computeCropRectForRatio = useCallback(
    (ratio: number | null, baseRect: CropRect) => {
      if (!ratio) {
        return { ...DEFAULT_CROP_RECT };
      }

      const currentAspect = baseRect.w / baseRect.h;
      let targetW = baseRect.w;
      let targetH = baseRect.h;
      if (currentAspect > ratio) {
        targetW = baseRect.h * ratio;
      } else {
        targetH = baseRect.w / ratio;
      }
      const centeredX = baseRect.x + (baseRect.w - targetW) / 2;
      const centeredY = baseRect.y + (baseRect.h - targetH) / 2;
      return {
        x: centeredX,
        y: centeredY,
        w: targetW,
        h: targetH,
      };
    },
    []
  );

  const handleCropRatioChange = useCallback(
    (ratio: number | null, modeId: string) => {
      const reference = cropSession ?? cropStateRef.current;
      const baseRect = reference?.rect ?? DEFAULT_CROP_RECT;
      const nextRect = computeCropRectForRatio(ratio, baseRect);
      setCropState(nextRect, ratio, modeId);
    },
    [computeCropRectForRatio, cropSession, setCropState]
  );

  const handleCancelCrop = () => {
    if (cropSession) {
      setCropState(cropSession.rect, cropSession.ratio, cropSession.modeId);
    }
    setActiveNav("adjust");
  };

  const handleApplyCrop = () => {
    setCropState(cropRectNormalized, cropAspectRatio, cropModeId);
    setActiveNav("adjust");
  };

  const handleImageRectChange = useCallback((rect: typeof imageRect) => {
    const prev = imageRectRef.current;
    if (
      prev &&
      rect &&
      prev.x === rect.x &&
      prev.y === rect.y &&
      prev.width === rect.width &&
      prev.height === rect.height &&
      prev.pageX === rect.pageX &&
      prev.pageY === rect.pageY
    ) {
      return;
    }
    if (!prev && !rect) {
      return;
    }
    imageRectRef.current = rect;
    setImageRect(rect);
  }, []);

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.background}>
        <View style={styles.blobTopLeft} />
        <View style={styles.blobBottomRight} />
      </View>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.roundButton}
          onPress={() => router.back()}
        >
          <MaterialIcons name="arrow-back-ios-new" size={18} color="#f5f2eb" />
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={styles.headerTitle}>Editor</Text>
          <Text style={styles.headerSubtitle}>Halook Studio</Text>
        </View>
        <TouchableOpacity
          style={styles.saveButton}
          onPress={() => handleSave(false)}
        >
          <Text style={styles.saveLabel}>Save</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.canvasWrapper}>
        <View style={styles.canvasCard}>
          <EditorCanvas
            canvasRef={canvasRef}
            imageUri={imageUri}
            adjustments={adjustments}
            cropAspectRatio={cropAspectRatio}
            intensity={presetIntensity}
            showOriginal={isComparing}
            cropRectNormalized={cropRectNormalized}
            onImageRectChange={handleImageRectChange}
          />
        </View>
        <View pointerEvents="box-none" style={styles.resetButtonWrapper}>
          <TouchableOpacity
            style={styles.resetIconButton}
            onPress={resetAdjustments}
          >
            <MaterialIcons
              name="history"
              size={20}
              color="rgba(255,255,255,0.8)"
            />
          </TouchableOpacity>
        </View>
        <View pointerEvents="box-none" style={styles.compareButtonWrapper}>
          <TouchableOpacity
            style={[
              styles.compareIconButton,
              isComparing && styles.compareIconButtonActive,
            ]}
            onPressIn={() => setIsComparing(true)}
            onPressOut={() => setIsComparing(false)}
            delayLongPress={0}
          >
            <MaterialIcons
              name="splitscreen"
              size={20}
              color={isComparing ? "#0f0f11" : "#f5f2eb"}
            />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.bottomSheet}>
        <View style={styles.sheetHandleWrapper}>
          <View style={styles.sheetHandle} />
        </View>
        {activeNav === "crop" ? (
          <View style={styles.cropPanel}>
            <View style={styles.sheetHeader}>
              <View>
                <Text style={styles.sheetLabel}>Crop frame</Text>
                <Text style={styles.cropHint}>
                  Pinch or drag handles to resize. Drag inside frame to move.
                </Text>
              </View>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.cropRow}
            >
              {CROP_OPTIONS.map((option) => {
                const isActive = option.id === cropModeId;
                return (
                  <TouchableOpacity
                    key={option.id}
                    style={[styles.cropItem, isActive && styles.cropItemActive]}
                    onPress={() =>
                      handleCropRatioChange(option.ratio ?? null, option.id)
                    }
                  >
                    <MaterialIcons
                      name={option.icon}
                      size={24}
                      color={isActive ? editorBg : "rgba(255,255,255,0.7)"}
                    />
                    <Text
                      style={[
                        styles.cropLabel,
                        isActive && styles.cropLabelActive,
                      ]}
                    >
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <View style={styles.cropActions}>
              <TouchableOpacity
                style={styles.cropButtonSecondary}
                onPress={handleCancelCrop}
              >
                <MaterialIcons name="close" size={24} color="#f8fafc" />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.cropButtonPrimary}
                onPress={handleApplyCrop}
              >
                <MaterialIcons name="check" size={24} color={editorAccent} />
              </TouchableOpacity>
            </View>
          </View>
        ) : activeNav === "presets" ? (
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.sheetContent}
          >
            <View style={styles.intensityCard}>
              <View style={styles.intensityHeader}>
                <Text style={styles.sheetLabel}>Presets</Text>
                <Text style={styles.valueText}>
                  {Math.round(presetIntensity * 100)}%
                </Text>
              </View>
              <View style={styles.sliderWrapper}>
                <ResettableSlider
                  style={styles.slider}
                  minimumValue={0}
                  maximumValue={1}
                  value={presetIntensity}
                  step={0.01}
                  minimumTrackTintColor={editorAccent}
                  maximumTrackTintColor="rgba(255,255,255,0.25)"
                  thumbTintColor="#fff"
                  onValueChange={handlePresetIntensityChange}
                  onDoubleTapReset={() => handlePresetIntensityChange(0)}
                />
              </View>
            </View>
            {presetsLoading ? (
              <View style={styles.presetLoading}>
                <ActivityIndicator color={editorAccent} />
                <Text style={styles.presetInfo}>Đang tải preset...</Text>
              </View>
            ) : presetsError ? (
              <View style={styles.presetErrorCard}>
                <Text style={styles.presetInfo}>
                  Không thể tải preset. {presetsError}
                </Text>
                <TouchableOpacity
                  style={styles.retryButton}
                  onPress={reloadPresets}
                >
                  <Text style={styles.retryLabel}>Thử lại</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.presetRow}
              >
                {presets.map((preset) => {
                  const isActive = preset._id === currentPresetId;
                  return (
                    <TouchableOpacity
                      key={preset._id}
                      style={[
                        styles.presetItem,
                        isActive && styles.presetItemActive,
                      ]}
                      onPress={() => handlePresetSelect(preset)}
                    >
                      <View
                        style={[
                          styles.presetThumbWrapper,
                          isActive && styles.presetThumbWrapperActive,
                        ]}
                      >
                        <PresetPreviewThumb
                          preset={preset}
                          imageUri={imageUri}
                          cropAspectRatio={cropAspectRatio}
                          cropRectNormalized={cropRectNormalized}
                        />
                        <View style={[styles.presetThumbOverlay]}></View>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            )}
          </ScrollView>
        ) : (
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.sheetContent}
          >
            <View style={styles.sheetHeader}>
              <View>
                <Text style={styles.sheetLabel}>Adjustment</Text>
                <Text style={styles.sheetTitle}>
                  {ADJUSTMENT_UI[activeAdjustment].label}
                </Text>
              </View>
              <View style={styles.valuePill}>
                <Text style={styles.valueText}>{formattedValue}</Text>
              </View>
            </View>
            <View style={styles.sliderWrapper}>
              <ResettableSlider
                style={styles.slider}
                minimumValue={activeRange.min}
                maximumValue={activeRange.max}
                value={activeValue}
                step={0.01}
                minimumTrackTintColor={editorAccent}
                maximumTrackTintColor="rgba(255,255,255,0.25)"
                thumbTintColor="#f8fafc"
                onValueChange={handleSliderChange}
                onDoubleTapReset={() => handleSliderChange(0)}
              />
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.adjustmentRow}
            >
              {adjustmentKeys.map((key) => {
                const config = ADJUSTMENT_UI[key];
                const isActive = key === activeAdjustment;
                return (
                  <TouchableOpacity
                    key={key}
                    style={styles.adjustmentItem}
                    onPress={() => setActiveAdjustment(key)}
                  >
                    <View
                      style={[
                        styles.adjustmentIcon,
                        isActive && styles.adjustmentIconActive,
                      ]}
                    >
                      <MaterialIcons
                        name={config.icon}
                        size={24}
                        color={
                          isActive ? editorAccent : "rgba(255,255,255,0.6)"
                        }
                      />
                    </View>
                    <Text
                      style={[
                        styles.adjustmentLabel,
                        isActive && styles.adjustmentLabelActive,
                      ]}
                    >
                      {config.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </ScrollView>
        )}
      </View>

      <View style={styles.navRow}>
        {[
          { id: "presets", icon: "filter-vintage", label: "Presets" },
          { id: "adjust", icon: "tune", label: "Adjust" },
          { id: "crop", icon: "crop-rotate", label: "Crop" },
          { id: "mask", icon: "auto-fix-high", label: "Mask" },
        ].map((item) => {
          const isActive = activeNav === item.id;
          return (
            <TouchableOpacity
              key={item.id}
              style={[styles.navItem, isActive && styles.navItemActive]}
              onPress={() => handleNavPress(item.id as NavId)}
            >
              <MaterialIcons
                name={item.icon as keyof typeof MaterialIcons.glyphMap}
                size={24}
                color={isActive ? editorAccent : "rgba(255,255,255,0.6)"}
              />
              <Text
                style={[styles.navLabel, isActive && styles.navLabelActive]}
              >
                {item.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
      {activeNav === "crop" && imageRect && (
        <CropOverlay
          imageRectOnScreen={imageRect}
          cropRectNormalized={cropRectNormalized}
          onChange={setCropRectNormalized}
          onChangeEnd={setCropRectNormalized}
          minSizeNormalized={0.08}
          enabled
        />
      )}
      {saveToastVisible && (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.saveToast,
            {
              opacity: toastOpacity,
              transform: [
                {
                  translateY: toastOpacity.interpolate({
                    inputRange: [0, 1],
                    outputRange: [12, 0],
                  }),
                },
              ],
            },
          ]}
        >
          <View style={styles.saveToastIcon}>
            <MaterialIcons name="check" size={14} color="#0f0f11" />
          </View>
          <Text style={styles.saveToastLabel}>Image Saved</Text>
        </Animated.View>
      )}
    </SafeAreaView>
  );
}

type ResettableSliderProps = SliderProps & {
  onDoubleTapReset?: () => void;
};

const ResettableSlider = ({
  onDoubleTapReset,
  minimumValue = 0,
  maximumValue = 1,
  onValueChange,
  onTouchEnd,
  ...rest
}: ResettableSliderProps) => {
  const lastTapRef = useRef(0);

  const clampValue = (value: number) =>
    Math.min(maximumValue ?? value, Math.max(minimumValue ?? value, value));

  const handleReset = () => {
    if (onDoubleTapReset) {
      onDoubleTapReset();
    } else if (onValueChange) {
      onValueChange(clampValue(0));
    }
  };

  const handleTouchEnd = (event: GestureResponderEvent) => {
    onTouchEnd?.(event);
    const now = Date.now();
    if (now - lastTapRef.current < DOUBLE_TAP_RESET_DELAY) {
      handleReset();
    }
    lastTapRef.current = now;
  };

  return (
    <Slider
      {...rest}
      minimumValue={minimumValue}
      maximumValue={maximumValue}
      onValueChange={onValueChange}
      onTouchEnd={handleTouchEnd}
    />
  );
};

type PresetPreviewThumbProps = {
  imageUri?: string | null;
  preset: Preset;
  cropAspectRatio: number | null;
  cropRectNormalized: CropRect;
};

const PresetPreviewThumb = ({
  imageUri,
  preset,
  cropAspectRatio,
  cropRectNormalized,
}: PresetPreviewThumbProps) => {
  const previewCanvasRef = useCanvasRef();
  const previewAdjustments = useMemo(
    () => buildEditorAdjustmentsFromPreset(preset.adjustments),
    [preset.adjustments]
  );

  if (!imageUri) {
    const fallbackSource = preset.previewUrl
      ? { uri: preset.previewUrl }
      : require("../assets/images/icon.png");
    return <Image source={fallbackSource} style={styles.presetThumb} />;
  }

  return (
    <View style={styles.presetThumb}>
      <EditorCanvas
        canvasRef={previewCanvasRef}
        imageUri={imageUri}
        adjustments={previewAdjustments}
        cropAspectRatio={cropAspectRatio}
        cropRectNormalized={cropRectNormalized ?? DEFAULT_CROP_RECT}
        intensity={1}
        showOriginal={false}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: editorBg,
  },
  background: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: editorBg,
  },
  blobTopLeft: {
    position: "absolute",
    top: -80,
    left: -60,
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: "rgba(230,176,110,0.08)",
  },
  blobBottomRight: {
    position: "absolute",
    bottom: 40,
    right: -120,
    width: 360,
    height: 360,
    borderRadius: 180,
    backgroundColor: "rgba(18,18,18,0.6)",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 18,
    marginBottom: 4,
  },
  roundButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.07)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerInfo: {
    alignItems: "center",
    gap: 2,
  },
  headerTitle: {
    color: "#f5f2eb",
    fontSize: 18,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  headerSubtitle: {
    color: "rgba(255,255,255,0.5)",
    fontSize: 11,
    letterSpacing: 3,
    textTransform: "uppercase",
  },
  saveButton: {
    paddingHorizontal: 24,
    height: 40,
    borderRadius: 999,
    backgroundColor: editorAccent,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: editorAccent,
    shadowOpacity: 0.35,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
  },
  saveLabel: {
    color: "#1a1612",
    fontWeight: "700",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  canvasWrapper: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 8,
    alignItems: "center",
  },
  canvasCard: {
    flex: 1,
    width: "100%",
    position: "relative",
    borderRadius: 28,

    overflow: "hidden",

    shadowOpacity: 0.4,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    justifyContent: "center",
    alignItems: "center",
  },
  resetButtonWrapper: {
    position: "absolute",
    bottom: 0,
    left: 10,
    pointerEvents: "box-none",
  },
  resetIconButton: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(5,5,5,0.85)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    shadowColor: "#000",
    shadowOpacity: 0.4,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  compareButtonWrapper: {
    position: "absolute",
    bottom: 0,
    right: 10,
    pointerEvents: "box-none",
  },
  compareIconButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(5,5,5,0.85)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    shadowColor: "#000",
    shadowOpacity: 0.4,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  compareIconButtonActive: {
    backgroundColor: editorAccent,
    borderColor: editorAccent,
    shadowColor: editorAccent,
  },
  saveToast: {
    position: "absolute",
    bottom: 48,
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 24,
    backgroundColor: "rgba(0, 0, 0, 0.555)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  saveToastIcon: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: editorAccent,
    alignItems: "center",
    justifyContent: "center",
  },
  saveToastLabel: {
    color: "#f5f2eb",
    fontWeight: "700",
  },
  bottomSheet: {
    marginTop: 16,
    backgroundColor: editorSurface,
    borderTopLeftRadius: 34,
    borderTopRightRadius: 34,
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.04)",
    shadowColor: "#000",
    shadowOpacity: 0.5,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: -4 },
    gap: 8,
  },
  sheetHandleWrapper: {
    alignItems: "center",
  },
  sheetHandle: {
    width: 42,
    height: 4,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.2)",
  },
  sheetContent: {
    gap: 6,
    paddingTop: 12,
  },
  sheetHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  sheetLabel: {
    color: editorAccent,
    textTransform: "uppercase",
    fontSize: 12,
    letterSpacing: 4,
    marginBottom: 4,
  },
  sheetTitle: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "600",
  },
  valuePill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    backgroundColor: "rgba(255,255,255,0.05)",
  },
  valueText: {
    color: "#f5f2eb",
    fontWeight: "700",
    fontVariant: ["tabular-nums"],
  },
  sliderWrapper: {},
  slider: {
    width: "100%",
    height: 32,
  },
  cropPanel: {
    gap: 16,
  },
  cropRow: {
    flexDirection: "row",
    gap: 10,
    paddingVertical: 6,
  },
  cropItem: {
    width: 72,
    height: 72,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    backgroundColor: "rgba(255,255,255,0.03)",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  cropItemActive: {
    borderColor: editorAccent,
    backgroundColor: "rgba(230,176,110,0.12)",
  },
  cropLabel: {
    color: "rgba(255,255,255,0.7)",
    fontWeight: "600",
    fontSize: 12,
  },
  cropLabelActive: {
    color: editorAccent,
  },
  cropHint: {
    color: "rgba(255,255,255,0.55)",
    fontSize: 12,
  },
  cropActions: {
    flexDirection: "row",
    gap: 12,
  },
  cropButtonSecondary: {
    flex: 1,
    height: 44,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.05)",
  },
  cropButtonPrimary: {
    flex: 1,
    height: 44,
    borderRadius: 14,
    borderColor: editorAccent,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(230,176,110,0.15)",
  },
  adjustmentRow: {
    flexDirection: "row",
    gap: 12,
    paddingVertical: 4,
  },
  adjustmentItem: {
    flex: 0,
    width: 60,
    alignItems: "center",
    gap: 6,
  },
  adjustmentIcon: {
    width: 56,
    height: 56,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.02)",
  },
  adjustmentIconActive: {
    borderColor: editorAccent,
    backgroundColor: "rgba(230,176,110,0.12)",
  },
  adjustmentLabel: {
    fontSize: 11,
    color: "rgba(255,255,255,0.6)",
    fontWeight: "600",
  },
  adjustmentLabelActive: {
    color: "#fff",
  },
  intensityCard: {
    borderRadius: 24,
    paddingHorizontal: 16,
    width: "100%",
    gap: 6,
  },
  intensityHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  presetRow: {
    gap: 10,
    paddingVertical: 6,
    paddingHorizontal: 2,
  },
  presetItem: {
    width: 72,
    alignItems: "center",
    gap: 6,
  },
  presetItemActive: {
    transform: [{ scale: 1.02 }],
  },
  presetThumbWrapper: {
    width: 64,
    height: 64,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.15)",
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },

  presetThumbWrapperActive: {
    borderColor: editorAccent,
    shadowColor: editorAccent,
    shadowOpacity: 0.25,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
  },
  presetThumb: {
    width: 100,
    height: 100,
    resizeMode: "cover",
    userSelect: "none",
  },
  presetThumbOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(255, 255, 255, 0.01)",
  },
  presetLoading: {
    paddingVertical: 32,
    alignItems: "center",
    gap: 10,
  },
  presetInfo: {
    color: "rgba(255,255,255,0.7)",
    fontWeight: "600",
  },
  presetErrorCard: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    padding: 16,
    gap: 10,
    backgroundColor: "rgba(10,10,12,0.85)",
  },
  retryButton: {
    alignSelf: "flex-start",
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
  },
  retryLabel: {
    color: "#fff",
    fontWeight: "600",
  },
  navRow: {
    flexDirection: "row",
    gap: 10,
    backgroundColor: "rgba(0,0,0,0.45)",
    borderRadius: 20,
    padding: 6,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.05)",
  },
  navItem: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: "center",
    gap: 4,
    backgroundColor: "transparent",
  },
  navItemActive: {
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: editorAccent,
  },
  navLabel: {
    color: "rgba(255,255,255,0.55)",
    fontSize: 12,
    fontWeight: "600",
  },
  navLabelActive: {
    color: "#f5f2eb",
  },
});
