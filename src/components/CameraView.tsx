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
} from "@/src/services/imageLoader";
import { Image } from "expo-image";
import type { Asset } from "expo-media-library";
import * as MediaLibrary from "expo-media-library";

type Props = {
  onCapture: (uri: string) => void;
  onPickLatest?: (uri: string) => void;
};

const palette = Colors.light;

const cameraHeight = Dimensions.get("window").height * 0.6;
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
  const [flash, setFlash] = useState<FlashMode>("off");
  const [isCapturing, setIsCapturing] = useState(false);
  const [isLoadingPick, setIsLoadingPick] = useState(false);
  const [libraryAssets, setLibraryAssets] = useState<Asset[]>([]);
  const [isLibraryVisible, setLibraryVisible] = useState(false);

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
      setCropAspectRatio(null)
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
          style={styles.camera}
          flash={flash}
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
              onPress={openLibrary}
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
            <View style={styles.captureRing} />
            <View style={styles.captureInner}>
              {isCapturing ? (
                <MaterialCommunityIcons
                  name="camera-iris"
                  size={28}
                  color="#fff"
                />
              ) : (
                <Entypo name="camera" size={28} color="#fff" />
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
    width: "90%",
    maxHeight: cameraHeight - 40,
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
  captureRing: {
    position: "absolute",
    width: "100%",
    height: "100%",
    borderRadius: 80,
    borderWidth: 6,
    borderColor: "rgba(255,255,255,0.4)",
  },
  captureInner: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: palette.tint,
    borderWidth: 4,
    borderColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },
  toggleCameraButton: {
    backgroundColor: "rgba(0,0,0,0.45)",
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
