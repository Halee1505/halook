import Entypo from "@expo/vector-icons/Entypo";
import Ionicons from "@expo/vector-icons/Ionicons";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import {
  CameraType,
  CameraView as ExpoCameraView,
  FlashMode,
  useCameraPermissions,
} from "expo-camera";
import * as FileSystem from "expo-file-system/legacy";
import * as Haptics from "expo-haptics";
import * as ImageManipulator from "expo-image-manipulator";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Dimensions,
  FlatList,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { Colors } from "@/constants/theme";
import { useEditorState } from "@/src/hooks/useEditorState";
import {
  ensureCameraPermissions,
  loadRecentLibraryImages,
  pickLatestLibraryPhoto,
} from "@/src/services/imageLoader";
import { Image } from "expo-image";
import type { Asset } from "expo-media-library";
import * as MediaLibrary from "expo-media-library";

type Props = {
  onCapture: (uri: string) => void;
  onPickLatest?: (uri: string) => void;
};

const palette = Colors.light;

const cameraHeight = Dimensions.get("window").height;
const cropModes = [
  { id: "original", label: "Original", ratio: null },
  { id: "custom", label: "Custom", ratio: 4 / 5 },
  { id: "square", label: "Square", ratio: 1 },
  { id: "3x2", label: "3 x 2", ratio: 3 / 2 },
  { id: "2x3", label: "2 x 3", ratio: 2 / 3 },
];

const ensureJpeg = async (uri: string) => {
  if (!uri) return uri;
  const lower = uri.toLowerCase();
  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) {
    return uri;
  }

  try {
    const result = await ImageManipulator.manipulateAsync(uri, [], {
      compress: 0.95,
      format: ImageManipulator.SaveFormat.JPEG,
    });
    return result.uri ?? uri;
  } catch (error) {
    console.warn("Unable to transcode image to JPEG", error);
    return uri;
  }
};

export const CameraView = ({ onCapture, onPickLatest }: Props) => {
  const cameraRef = useRef<ExpoCameraView>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [type, setType] = useState<CameraType>("back");
  const [availableLenses, setAvailableLenses] = useState<string[]>([]);
  const [selectedLens, setSelectedLens] = useState<string | undefined>(
    undefined
  );
  const [flash, setFlash] = useState<FlashMode>("off");
  const [isCapturing, setIsCapturing] = useState(false);
  const [isLoadingPick, setIsLoadingPick] = useState(false);
  const [libraryAssets, setLibraryAssets] = useState<Asset[]>([]);
  const [isLibraryVisible, setLibraryVisible] = useState(false);
  const [latestThumbUri, setLatestThumbUri] = useState<string | null>(null);

  const storedCropRatio = useEditorState((state) => state.cropAspectRatio);
  const setCropAspectRatio = useEditorState(
    (state) => state.setCropAspectRatio
  );

  const initialCropId = useMemo(() => {
    const match = cropModes.find((mode) => mode.ratio === storedCropRatio);
    return match?.id ?? "custom";
  }, [storedCropRatio]);

  const [selectedCrop, setSelectedCrop] = useState<string>(initialCropId);

  useEffect(() => {
    if (!permission?.granted) {
      requestPermission();
    }
  }, [permission, requestPermission]);

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

  useEffect(() => {
    // reset lens when switching to front camera
    if (type === "front") {
      setSelectedLens(undefined);
      setAvailableLenses([]);
    }
  }, [type]);

  const handleAvailableLensesChanged = useCallback(
    (event?: { lenses?: string[] }) => {
      const lenses = event?.lenses;
      if (!Array.isArray(lenses) || !lenses.length) {
        return;
      }
      setAvailableLenses(lenses);
      const preferred =
        lenses.find((lens) => lens === "builtInWideAngleCamera") ?? lenses[0];
      setSelectedLens(preferred);
    },
    []
  );

  const handleSelectLens = (lens: string) => {
    setSelectedLens(lens);
  };

  useEffect(() => {
    let mounted = true;
    const hydrateLatest = async () => {
      try {
        const uri = await pickLatestLibraryPhoto();
        if (mounted) {
          setLatestThumbUri(uri);
        }
      } catch (error) {
        console.warn("Unable to load latest library photo", error);
      }
    };

    hydrateLatest();
    return () => {
      mounted = false;
    };
  }, []);

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
        const fs = FileSystem as {
          documentDirectory?: string | null;
          cacheDirectory?: string | null;
          copyAsync?: (args: { from: string; to: string }) => Promise<void>;
        };

        let finalUri = photo.uri;

        if (photo.uri.startsWith("file://") && fs.copyAsync) {
          const baseDir = fs.documentDirectory ?? fs.cacheDirectory ?? "";
          const ext = photo.uri.split(".").pop() || "jpg";
          const target = `${baseDir}Halook-Capture-${Date.now()}.${ext}`;

          try {
            await fs.copyAsync({ from: photo.uri, to: target });
            finalUri = target;
          } catch (copyErr) {
            console.warn("Unable to copy captured photo", copyErr);
          }
        }

        finalUri = await ensureJpeg(finalUri);

        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        onCapture(finalUri);
      }
    } finally {
      setIsCapturing(false);
    }
  }, [isCapturing, onCapture]);

  const openLibrary = useCallback(async () => {
    setLibraryVisible(true);
    setIsLoadingPick(true);
    try {
      const assets = await loadRecentLibraryImages(18);
      setLibraryAssets(assets);
      setLatestThumbUri((prev) => prev ?? assets[0]?.uri ?? null);
    } finally {
      setIsLoadingPick(false);
    }
  }, []);

  const closeLibrary = () => {
    setLibraryVisible(false);
  };

  const handleSelectFromLibrary = async (asset: Asset) => {
    try {
      const info = await MediaLibrary.getAssetInfoAsync(asset, {
        shouldDownloadFromNetwork: true,
      });

      const rawUri = info.localUri ?? info.uri;

      if (!rawUri) {
        console.warn("No local URI available for asset", asset.id);
        return;
      }

      const sourceUri = rawUri.startsWith("file://")
        ? rawUri
        : `file://${rawUri}`;

      let finalUri = sourceUri;

      const fs = FileSystem as {
        documentDirectory?: string | null;
        cacheDirectory?: string | null;
        copyAsync?: (args: { from: string; to: string }) => Promise<void>;
      };

      if (sourceUri.startsWith("file://") && fs.copyAsync) {
        const baseDir = fs.documentDirectory ?? fs.cacheDirectory ?? "";
        const originalName = asset.filename ?? `asset-${asset.id}`;
        const hasExt = /\.[a-zA-Z0-9]+$/.test(originalName);
        const safeFilename = hasExt ? originalName : `${originalName}.jpg`;
        const target = `${baseDir}Halook-${Date.now()}-${safeFilename}`;

        try {
          await fs.copyAsync({ from: sourceUri, to: target });
          finalUri = target;
        } catch (copyErr) {
          console.warn("Unable to copy asset", copyErr);
        }
      }

      finalUri = await ensureJpeg(finalUri);
      setCropAspectRatio(null);
      onPickLatest?.(finalUri);
    } finally {
      closeLibrary();
    }
  };

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
    <>
      <View style={styles.cameraWrapper}>
        <ExpoCameraView
          ref={cameraRef}
          facing={type}
          selectedLens={selectedLens}
          onAvailableLensesChanged={handleAvailableLensesChanged}
          style={styles.camera}
          flash={flash}
          zoom={0.1}
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

      <View style={styles.actionControls}>
        <View pointerEvents="none" style={styles.glassLayer} />
        <View pointerEvents="none" style={styles.glassGlow} />
        {type === "back" && availableLenses.length > 1 ? (
          <View style={styles.lensRow}>
            {availableLenses.map((lens) => {
              const isActive = lens === selectedLens;
              const label =
                lens === "builtInWideAngleCamera"
                  ? "Wide"
                  : lens === "builtInTelephotoCamera"
                  ? "Tele"
                  : lens === "builtInUltraWideCamera"
                  ? "Ultra"
                  : lens;
              return (
                <TouchableOpacity
                  key={lens}
                  style={[styles.lensChip, isActive && styles.lensChipActive]}
                  onPress={() => handleSelectLens(lens)}
                >
                  <Text
                    style={[
                      styles.lensChipText,
                      isActive && styles.lensChipTextActive,
                    ]}
                  >
                    {label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        ) : null}
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

        <View style={styles.actionsRow}>
          {onPickLatest ? (
            <TouchableOpacity
              style={styles.sideAction}
              disabled={isLoadingPick}
              onPress={openLibrary}
            >
              {latestThumbUri ? (
                <>
                  <Image
                    source={{ uri: latestThumbUri }}
                    style={styles.sideActionImage}
                  />
                  <View style={styles.sideActionOverlay} />
                </>
              ) : null}
              <Ionicons name="images-outline" size={16} color={palette.tint} />
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
            <View style={styles.captureInner}>
              {isCapturing ? (
                <MaterialCommunityIcons
                  name="camera-iris"
                  size={36}
                  color="#fff"
                />
              ) : (
                <Entypo name="camera" size={36} color="#fff" />
              )}
            </View>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.toggleCameraButton}
            onPress={toggleCameraType}
          >
            <Ionicons name="camera-reverse-outline" size={22} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      <Modal
        visible={isLibraryVisible}
        transparent
        animationType="fade"
        onRequestClose={closeLibrary}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Ảnh gần đây</Text>
              <TouchableOpacity onPress={closeLibrary}>
                <Ionicons name="close" size={24} color={palette.text} />
              </TouchableOpacity>
            </View>
            {isLoadingPick ? (
              <Text style={styles.modalHint}>Đang tải...</Text>
            ) : (
              <FlatList
                data={libraryAssets}
                keyExtractor={(item) => item.id}
                numColumns={3}
                columnWrapperStyle={{ gap: 8 }}
                contentContainerStyle={{ gap: 8 }}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.libraryItem}
                    onPress={() => handleSelectFromLibrary(item)}
                  >
                    <Image
                      source={{ uri: item.uri }}
                      style={styles.libraryImage}
                    />
                  </TouchableOpacity>
                )}
              />
            )}
          </View>
        </View>
      </Modal>
    </>
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
    width: "90%",
    maxHeight: cameraHeight - 40,
    transform: "translateY(-80px)",
    justifyContent: "center",
    alignItems: "center",
  },
  cropBorder: {
    borderWidth: 2,

    borderColor: "rgba(255,255,255,0.8)",
    borderRadius: 16,
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

  actionControls: {
    position: "absolute",
    bottom: 20,
    left: 14,
    right: 14,
    borderRadius: 28,
    backgroundColor: "rgba(255,255,255,0.12)",
    padding: 18,
    gap: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.28)",
    overflow: "hidden",
    shadowColor: "#000",
    shadowOpacity: 0.32,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 14 },
    elevation: 14,
  },

  glassLayer: {
    position: "absolute",
    top: -110,
    left: -40,
    width: 240,
    height: 240,
    borderRadius: 200,
    backgroundColor: "rgba(255,255,255,0.16)",
  },
  glassGlow: {
    position: "absolute",
    bottom: -80,
    right: -30,
    width: 200,
    height: 200,
    borderRadius: 180,
    backgroundColor: "rgba(255,255,255,0.12)",
  },

  cropOptions: {
    flexDirection: "row",
    gap: 8,
  },
  cropOption: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.14)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.26)",
    alignItems: "center",
  },
  cropOptionSelected: {
    backgroundColor: "rgb(255, 255, 255)",
    borderColor: palette.tint,
  },
  cropOptionText: {
    color: "#f1f4ff",
    fontWeight: "600",
    fontSize: 12,
    letterSpacing: 0.3,
  },
  cropOptionTextSelected: {
    color: palette.tint,
  },
  actionsRow: {
    flexDirection: "row",
    width: "100%",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 12,
  },
  sideAction: {
    width: 60,
    height: 60,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.4)",
    backgroundColor: "rgba(255,255,255,0.14)",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8,
  },
  sideActionImage: {
    position: "absolute",
    width: "100%",
    height: "100%",
  },
  sideActionOverlay: {
    position: "absolute",
    inset: 0,
    backgroundColor: "rgba(12,12,16,0.35)",
  },
  sideActionText: {
    fontSize: 10,
    color: "#eef2ff",
    fontWeight: "600",
  },
  sideActionPlaceholder: {
    width: 70,
    height: 70,
  },
  captureButton: {
    width: 104,
    height: 104,
    borderRadius: 90,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    backgroundColor: "rgba(255,255,255,0.12)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.3)",
    shadowColor: palette.tint,
    shadowOpacity: 0.3,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 10 },
    elevation: 10,
  },
  captureInner: {
    width: 80,
    height: 80,
    borderRadius: 70,
    backgroundColor: palette.tint,
    borderWidth: 4,
    borderColor: "rgba(255,255,255,0.7)",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: palette.tint,
    shadowOpacity: 0.6,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
  },
  toggleCameraButton: {
    backgroundColor: "rgba(255,255,255,0.14)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.3)",
    width: 50,
    height: 50,
    borderRadius: 25,
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
  lensRow: {
    flexDirection: "row",
    gap: 8,
    backgroundColor: "rgba(0,0,0,0.3)",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 18,
    alignItems: "center",
  },
  lensChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.16)",
  },
  lensChipActive: {
    backgroundColor: "rgba(255,255,255,0.32)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.5)",
  },
  lensChipText: {
    color: "#f6f7fb",
    fontWeight: "600",
    fontSize: 12,
  },
  lensChipTextActive: {
    color: palette.tint,
  },
  modalBackdrop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  modalContent: {
    width: "100%",
    borderRadius: 28,
    backgroundColor: "#fff",
    padding: 16,
    maxHeight: "80%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  modalTitle: {
    fontWeight: "700",
    fontSize: 18,
    color: palette.text,
  },
  modalHint: {
    textAlign: "center",
    paddingVertical: 32,
    color: palette.text,
  },
  libraryItem: {
    flex: 1,
    aspectRatio: 1,
    borderRadius: 14,
    overflow: "hidden",
  },
  libraryImage: {
    width: "100%",
    height: "100%",
  },
});
