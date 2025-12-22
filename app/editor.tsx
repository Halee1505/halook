import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import Slider, { type SliderProps } from "@react-native-community/slider";
import { useCanvasRef } from "@shopify/react-native-skia";
import { useRouter } from "expo-router";
import { useMemo, useRef, useState } from "react";
import {
  Alert,
  GestureResponderEvent,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Colors } from "@/constants/theme";
import { CropRatioSheet } from "@/src/components/CropRatioSheet";
import { EditorCanvas } from "@/src/components/EditorCanvas";
import { adjustmentRanges } from "@/src/engine/presetMath";
import { useEditorState } from "@/src/hooks/useEditorState";
import { adjustmentKeys, type AdjustmentKey } from "@/src/models/editor";
import { exportCanvasToCameraRoll } from "@/src/services/imageExporter";

const palette = Colors.light;
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
};

type NavId = "presets" | "adjust" | "crop" | "mask";

export default function EditorScreen() {
  const router = useRouter();
  const canvasRef = useCanvasRef();
  const imageUri = useEditorState((state) => state.imageUri);
  const adjustments = useEditorState((state) => state.adjustments);
  const updateAdjustment = useEditorState((state) => state.updateAdjustment);
  const cropAspectRatio = useEditorState((state) => state.cropAspectRatio);
  const presetIntensity = useEditorState((state) => state.presetIntensity);
  const setPresetIntensity = useEditorState(
    (state) => state.setPresetIntensity
  );
  const setCropAspectRatio = useEditorState(
    (state) => state.setCropAspectRatio
  );
  const [activeAdjustment, setActiveAdjustment] =
    useState<AdjustmentKey>("exposure");
  const [activeNav, setActiveNav] = useState<NavId>("adjust");
  const [isCropSheetVisible, setCropSheetVisible] = useState(false);
  const { height: windowHeight } = useWindowDimensions();
  const editorPanelHeight = useMemo(
    () => Math.max(windowHeight * 0.25, 260),
    [windowHeight]
  );

  const activeRange = adjustmentRanges[activeAdjustment];
  const activeValue = adjustments[activeAdjustment];

  const handleSave = async (navigateToShare = false) => {
    if (!imageUri) {
      Alert.alert("Chưa có ảnh", "Hãy chụp ảnh bằng camera Halook.");
      return;
    }

    try {
      const savedUri = await exportCanvasToCameraRoll(canvasRef);
      Alert.alert(
        "Lưu thành công",
        "Ảnh Halook của bạn đã có trong Camera Roll."
      );
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
    setActiveNav(id);
    if (id === "presets") {
      router.push("/presets");
    } else if (id === "crop") {
      setCropSheetVisible(true);
    } else if (id === "mask") {
      Alert.alert("Sắp ra mắt", "Tính năng mask đang được hoàn thiện.");
    }
  };

  const formattedValue = useMemo(() => {
    const value = activeValue;
    return `${value >= 0 ? "+" : ""}${value.toFixed(2)}`;
  }, [activeValue]);

  const handlePresetIntensityChange = (value: number) => {
    setPresetIntensity(parseFloat(value.toFixed(2)));
  };

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
          <MaterialIcons name="arrow-back-ios-new" size={18} color="#f8fafc" />
        </TouchableOpacity>
        <View style={styles.historyButtons}>
          <TouchableOpacity style={styles.historyIcon}>
            <MaterialIcons
              name="undo"
              size={18}
              color="rgba(255,255,255,0.7)"
            />
          </TouchableOpacity>
          <TouchableOpacity style={styles.historyIcon}>
            <MaterialIcons
              name="redo"
              size={18}
              color="rgba(255,255,255,0.7)"
            />
          </TouchableOpacity>
        </View>
        <TouchableOpacity
          style={styles.saveButton}
          onPress={() => handleSave(false)}
        >
          <Text style={styles.saveLabel}>Save</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.canvasWrapper}>
        <EditorCanvas
          canvasRef={canvasRef}
          imageUri={imageUri}
          adjustments={adjustments}
          cropAspectRatio={cropAspectRatio}
          intensity={presetIntensity}
        />
      </View>
      <TouchableOpacity style={styles.compareButton}>
        <MaterialIcons name="visibility" size={16} color="#e2e8f0" />
        <Text style={styles.compareLabel}>Hold to Compare</Text>
      </TouchableOpacity>
      <View style={[styles.bottomSheet, { height: editorPanelHeight }]}>
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
              minimumTrackTintColor={palette.tint}
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
                      color={isActive ? palette.tint : "rgba(255,255,255,0.6)"}
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
          <View style={styles.intensityCard}>
            <View style={styles.intensityHeader}>
              <Text style={styles.intensityLabel}>Preset intensity</Text>
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
                minimumTrackTintColor={palette.tint}
                maximumTrackTintColor="rgba(255,255,255,0.25)"
                thumbTintColor="#fff"
                onValueChange={handlePresetIntensityChange}
                onDoubleTapReset={() => handlePresetIntensityChange(0)}
              />
            </View>
          </View>
        </ScrollView>
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
                color={isActive ? palette.tint : "rgba(255,255,255,0.6)"}
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
      <CropRatioSheet
        visible={isCropSheetVisible}
        onClose={() => setCropSheetVisible(false)}
        onApply={(option) =>
          setCropAspectRatio(option.ratio ?? null, option.id)
        }
      />
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

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#020404",
  },
  background: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#020404",
  },
  blobTopLeft: {
    position: "absolute",
    top: -60,
    left: -60,
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: "rgba(48,232,119,0.16)",
  },
  blobBottomRight: {
    position: "absolute",
    bottom: 100,
    right: -80,
    width: 320,
    height: 320,
    borderRadius: 160,
    backgroundColor: "rgba(15,118,110,0.2)",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  roundButton: {
    width: 44,
    height: 44,
    borderRadius: 999,
    backgroundColor: "rgba(15,23,42,0.6)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    alignItems: "center",
    justifyContent: "center",
  },
  historyButtons: {
    flexDirection: "row",
    gap: 12,
  },
  historyIcon: {
    width: 40,
    height: 40,
    borderRadius: 999,
    backgroundColor: "rgba(15,23,42,0.6)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.05)",
  },
  saveButton: {
    paddingHorizontal: 24,
    height: 40,
    borderRadius: 999,
    backgroundColor: palette.tint,
    alignItems: "center",
    justifyContent: "center",
  },
  saveLabel: {
    color: "#022c22",
    fontWeight: "700",
  },
  canvasWrapper: {
    flex: 1,
    padding: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  compareButton: {
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: "rgba(15,23,42,0.7)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  compareLabel: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 12,
  },
  bottomSheet: {
    marginTop: 12,
    backgroundColor: "rgba(8,16,12,0.9)",
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    padding: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
  },
  sheetContent: {
    gap: 16,
    paddingBottom: 24,
  },
  sheetHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    marginBottom: 4,
  },
  sheetLabel: {
    color: palette.tint,
    textTransform: "uppercase",
    fontSize: 10,
    letterSpacing: 3,
  },
  sheetTitle: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "600",
  },
  valuePill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    backgroundColor: "rgba(15,23,42,0.6)",
  },
  valueText: {
    color: "#f8fafc",
    fontWeight: "700",
    fontVariant: ["tabular-nums"],
  },
  sliderWrapper: {
    paddingVertical: 4,
  },
  slider: {
    width: "100%",
    height: 32,
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
    borderColor: "rgba(255,255,255,0.05)",
    alignItems: "center",
    justifyContent: "center",
  },
  adjustmentIconActive: {
    borderColor: palette.tint,
    backgroundColor: "rgba(48,232,119,0.08)",
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
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.05)",
    backgroundColor: "rgba(255,255,255,0.02)",
    gap: 12,
  },
  intensityHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  intensityLabel: {
    color: "#fff",
    fontWeight: "600",
  },
  navRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 8,
  },
  navItem: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
    gap: 2,
    backgroundColor: "rgba(255,255,255,0.02)",
  },
  navItemActive: {
    backgroundColor: "rgba(48,232,119,0.12)",
  },
  navLabel: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 12,
    fontWeight: "600",
  },
  navLabelActive: {
    color: "#fff",
  },
});
