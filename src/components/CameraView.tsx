import Entypo from "@expo/vector-icons/Entypo";
import Ionicons from "@expo/vector-icons/Ionicons";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import {
  CameraType,
  CameraView as ExpoCameraView,
  FlashMode,
  useCameraPermissions,
} from "expo-camera";
import * as Haptics from "expo-haptics";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Dimensions,
  LayoutChangeEvent,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Gesture } from "react-native-gesture-handler";
import {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

import { Colors } from "@/constants/theme";
import { useEditorState } from "@/src/hooks/useEditorState";
import {
  ensureCameraPermissions,
  pickLatestLibraryPhoto,
} from "@/src/services/imageLoader";

type Props = {
  onCapture: (uri: string) => void;
  onPickLatest?: (uri: string) => void;
};
const palette = Colors.light;

const cameraHeight = Dimensions.get("window").height * 0.5;
const knobSize = 70;
const cropModes = [
  { id: "original", label: "Original", ratio: null },
  { id: "custom", label: "Custom", ratio: 4 / 5 },
  { id: "square", label: "Square", ratio: 1 },
  { id: "3x2", label: "3 x 2", ratio: 3 / 2 },
  { id: "2x3", label: "2 x 3", ratio: 2 / 3 },
];

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

export const CameraView = ({ onCapture, onPickLatest }: Props) => {
  const cameraRef = useRef<ExpoCameraView>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [type, setType] = useState<CameraType>("back");
  const [flash, setFlash] = useState<FlashMode>("off");
  const [isCapturing, setIsCapturing] = useState(false);
  const [isLoadingPick, setIsLoadingPick] = useState(false);
  const storedCropRatio = useEditorState((state) => state.cropAspectRatio);
  const setCropAspectRatio = useEditorState(
    (state) => state.setCropAspectRatio
  );
  const initialCropId = useMemo(() => {
    const match = cropModes.find((mode) => mode.ratio === storedCropRatio);
    return match?.id ?? "custom";
  }, [storedCropRatio]);
  const [selectedCrop, setSelectedCrop] = useState<string>(initialCropId);
  const [zoom, setZoom] = useState(0);
  const [dialWidth, setDialWidth] = useState(0);
  const dialProgress = useSharedValue(0);
  const dialStart = useSharedValue(0);

  useEffect(() => {
    if (!permission?.granted) {
      requestPermission();
    }
  }, [permission, requestPermission]);

  useEffect(() => {
    dialProgress.value = withTiming(zoom, { duration: 120 });
  }, [zoom, dialProgress]);

  const toggleCameraType = () => {
    setType((current) => (current === "back" ? "front" : "back"));
  };

  const toggleFlash = () => {
    setFlash((current) => (current === "off" ? "on" : "off"));
  };

  const cropConfig = useMemo(
    () => cropModes.find((mode) => mode.id === selectedCrop),
    [selectedCrop]
  );

  useEffect(() => {
    setCropAspectRatio(cropConfig?.ratio ?? null);
  }, [cropConfig?.ratio, setCropAspectRatio]);

  const overlayAspect = cropConfig?.ratio ?? 3 / 4;

  const capturePhoto = useCallback(async () => {
    if (!cameraRef.current || isCapturing) {
      return;
    }

    setIsCapturing(true);
    await ensureCameraPermissions();

    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.9,
        skipProcessing: true,
      });

      if (photo?.uri) {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        onCapture(photo.uri);
      }
    } finally {
      setIsCapturing(false);
    }
  }, [isCapturing, onCapture]);

  const handleZoomChange = useCallback((value: number) => {
    setZoom(clamp(value, 0, 1));
  }, []);

  const onDialLayout = (event: LayoutChangeEvent) => {
    setDialWidth(event.nativeEvent.layout.width);
  };

  const zoomGesture = useMemo(
    () =>
      Gesture.Pan()
        .onBegin(() => {
          const range = Math.max(dialWidth - knobSize, 1);
          dialStart.value = dialProgress.value * range;
        })
        .onChange((event) => {
          const range = Math.max(dialWidth - knobSize, 1);
          const next = clamp(dialStart.value + event.changeX, 0, range);
          const ratio = range === 0 ? 0 : next / range;
          dialProgress.value = ratio;
          runOnJS(handleZoomChange)(ratio);
        }),
    [dialWidth, dialProgress, dialStart, handleZoomChange]
  );

  const knobStyle = useAnimatedStyle(() => {
    const range = Math.max(dialWidth - knobSize, 0);
    return {
      transform: [{ translateX: dialProgress.value * range }],
    };
  });

  const displayedZoom = useMemo(() => (1 + zoom * 4).toFixed(1), [zoom]);

  const handlePickLatest = useCallback(async () => {
    if (!onPickLatest) {
      return;
    }

    setIsLoadingPick(true);
    try {
      const uri = await pickLatestLibraryPhoto();
      if (uri) {
        onPickLatest(uri);
      }
    } finally {
      setIsLoadingPick(false);
    }
  }, [onPickLatest]);

  if (!permission?.granted) {
    return (
      <View style={styles.permissionCard}>
        <Text style={styles.permissionText}>
          Cần quyền truy cập camera để tiếp tục. Vui lòng mở cài đặt và cấp
          quyền cho Halook.
        </Text>
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={requestPermission}
        >
          <Text style={styles.primaryLabel}>Cấp quyền</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View>
      <View style={styles.cameraWrapper}>
        <ExpoCameraView
          ref={cameraRef}
          facing={type}
          style={styles.camera}
          flash={flash}
          zoom={zoom}
        />

        <View style={styles.overlayTopBar}>
          <TouchableOpacity style={styles.flashButton} onPress={toggleFlash}>
            <Ionicons
              name={flash === "off" ? "flash-off-outline" : "flash-outline"}
              size={22}
              color="#fff"
            />
          </TouchableOpacity>
        </View>

        <View style={styles.cameraOverlay}>
          <View style={[styles.cropFrame, { aspectRatio: overlayAspect }]}>
            <View style={styles.cropBorder} />
          </View>
        </View>
      </View>

      <View style={styles.cropPanel}>
        <View style={styles.cropControls}>
          <View style={styles.cropHeader}>
            <Text style={styles.cropLabel}>Crop mode</Text>
            <TouchableOpacity style={styles.saveBadge}>
              <Text style={styles.saveText}>Save</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.cropOptions}>
            {cropModes.map((mode) => {
              const isSelected = selectedCrop === mode.id;
              return (
                <TouchableOpacity
                  key={mode.id}
                  style={[
                    styles.cropOption,
                    isSelected && styles.cropOptionSelected,
                  ]}
                  onPress={() => setSelectedCrop(mode.id)}
                >
                  <Text
                    style={[
                      styles.cropOptionText,
                      isSelected && styles.cropOptionTextSelected,
                    ]}
                  >
                    {mode.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <View style={styles.actionsRow}>
          {onPickLatest ? (
            <TouchableOpacity
              style={styles.sideAction}
              disabled={isLoadingPick}
              onPress={handlePickLatest}
            >
              <Ionicons name="images-outline" size={20} color={palette.tint} />
              <Text style={styles.sideActionText}>
                {isLoadingPick ? "Đang tải" : "Album"}
              </Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.sideActionPlaceholder} />
          )}

          <TouchableOpacity
            style={styles.captureButton}
            onPress={capturePhoto}
            disabled={isCapturing}
          >
            {isCapturing ? (
              <MaterialCommunityIcons
                name="camera-iris"
                size={32}
                color={palette.tabIconSelected}
              />
            ) : (
              <Entypo name="camera" size={32} color={palette.tabIconSelected} />
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.toggleCameraButton}
            onPress={toggleCameraType}
          >
            <Ionicons name="camera-reverse-outline" size={22} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  permissionCard: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: palette.background,
    borderRadius: 24,
    padding: 24,
    gap: 12,
  },
  permissionText: {
    color: palette.text,
    fontSize: 16,
    textAlign: "center",
  },
  cameraWrapper: {
    position: "relative",
    borderRadius: 36,
    overflow: "hidden",
  },
  camera: {
    width: "100%",
    height: cameraHeight,
  },
  overlayTopBar: {
    position: "absolute",
    top: 16,
    left: 16,
    right: 16,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  cameraOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
    pointerEvents: "none",
  },
  cropFrame: {
    width: "80%",
    maxHeight: cameraHeight - 60,
    justifyContent: "center",
    alignItems: "center",
  },
  cropBorder: {
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.8)",
    borderRadius: 28,
    width: "100%",
    height: "100%",
  },
  primaryButton: {
    backgroundColor: palette.tint,
    borderRadius: 50,
    paddingVertical: 14,
    paddingHorizontal: 20,
  },
  primaryLabel: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 16,
    textAlign: "center",
  },

  cropPanel: {
    marginTop: 16,
    borderRadius: 32,
    backgroundColor: "#fff",
    padding: 16,
    gap: 16,
    borderWidth: 1,
    borderColor: palette.border,
  },
  cropControls: {
    gap: 12,
  },
  cropHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  cropLabel: {
    fontWeight: "700",
    color: palette.text,
  },
  saveBadge: {
    backgroundColor: palette.background,
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 16,
  },
  saveText: {
    color: palette.text,
    fontWeight: "600",
  },
  cropOptions: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  cropOption: {
    flex: 1,
    marginHorizontal: 4,
    paddingVertical: 10,
    borderRadius: 16,
    backgroundColor: palette.background,
    alignItems: "center",
  },
  cropOptionSelected: {
    backgroundColor: palette.tint,
  },
  cropOptionText: {
    color: palette.text,
    fontWeight: "600",
    fontSize: 12,
  },
  cropOptionTextSelected: {
    color: "#fff",
  },
  zoomDial: {
    marginTop: 8,
    borderRadius: 24,
    backgroundColor: "#f6f8f6",
    padding: 16,
    alignItems: "center",
    gap: 12,
  },
  zoomTicks: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
  },
  zoomTick: {
    width: 4,
    height: 10,
    borderRadius: 2,
    backgroundColor: palette.border,
  },
  zoomTickActive: {
    height: 16,
    backgroundColor: palette.tint,
  },
  zoomTrack: {
    width: "100%",
    height: knobSize,
    borderRadius: 999,
    position: "relative",
  },
  zoomKnob: {
    width: knobSize,
    height: knobSize,
    borderRadius: knobSize / 2,
    backgroundColor: "#fff",
    borderWidth: 4,
    borderColor: palette.tint,
    alignItems: "center",
    justifyContent: "center",
    position: "absolute",
    top: 0,
    left: 0,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 10,
  },
  zoomKnobText: {
    fontWeight: "700",
    color: palette.text,
  },
  actionsRow: {
    flexDirection: "row",
    width: "100%",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 24,
    marginTop: 16,
  },
  sideAction: {
    width: 70,
    height: 70,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  sideActionText: {
    fontSize: 12,
    color: palette.tint,
    fontWeight: "600",
  },
  sideActionPlaceholder: {
    width: 70,
    height: 70,
  },
  captureButton: {
    width: 80,
    height: 80,
    borderRadius: 80,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    backgroundColor: palette.background,
  },
  toggleCameraButton: {
    backgroundColor: "rgba(0,0,0,0.45)",
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
  },
  flashButton: {
    backgroundColor: "rgba(0,0,0,0.45)",
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  captureRing: {
    position: "absolute",
    width: "100%",
    height: "100%",
    borderRadius: 48,
    borderWidth: 6,
    borderColor: "rgba(255,255,255,0.4)",
  },
  captureInner: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: palette.tint,
    borderWidth: 4,
    borderColor: "#fff",
  },
});
