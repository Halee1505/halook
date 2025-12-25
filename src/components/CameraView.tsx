import Ionicons from "@expo/vector-icons/Ionicons";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import Slider from "@react-native-community/slider";
import {
  CameraType,
  CameraView as ExpoCameraView,
  FlashMode,
  useCameraPermissions,
} from "expo-camera";
import * as FileSystem from "expo-file-system/legacy";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import * as ImageManipulator from "expo-image-manipulator";
import * as MediaLibrary from "expo-media-library";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Dimensions,
  FlatList,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Colors } from "@/constants/theme";
import { CROP_OPTIONS } from "@/src/constants/cropOptions";
import { useEditorState } from "@/src/hooks/useEditorState";
import {
  ensureCameraPermissions,
  loadRecentLibraryImages,
  pickLatestLibraryPhoto,
} from "@/src/services/imageLoader";

type Props = {
  onCapture: (uri: string) => void;
  onPickLatest?: (uri: string) => void;
};

const palette = Colors.light;
const windowDimensions = Dimensions.get("window");
const cameraHeight = windowDimensions.height;
const cameraWidth = windowDimensions.width;
const zoomMarkers = new Array(18).fill(0).map((_, index) => index);
const cameraAccent = "#d19a66";
const cameraAccentBright = "#e0a66d";
const zoomGaugeTickCount = 9;

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

type ViewfinderBounds = {
  pageX: number;
  pageY: number;
  width: number;
  height: number;
};

type ViewfinderFrame = {
  pageX: number;
  pageY: number;
  width: number;
  height: number;
};

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));

const cropImageToViewfinder = async (
  uri: string,
  dimensions: { width?: number; height?: number },
  area: ViewfinderFrame
) => {
  const { width: imageWidth, height: imageHeight } = dimensions;
  if (!imageWidth || !imageHeight) {
    return uri;
  }

  if (area.width <= 0 || area.height <= 0) {
    return uri;
  }

  const imageAspect = imageWidth / imageHeight;
  const viewAspect = cameraWidth / cameraHeight;
  let scaledImageWidth = cameraWidth;
  let scaledImageHeight = cameraHeight;
  let offsetX = 0;
  let offsetY = 0;

  if (imageAspect > viewAspect) {
    scaledImageHeight = cameraHeight;
    scaledImageWidth = scaledImageHeight * imageAspect;
    offsetX = (scaledImageWidth - cameraWidth) / 2;
  } else if (imageAspect < viewAspect) {
    scaledImageWidth = cameraWidth;
    scaledImageHeight = scaledImageWidth / imageAspect;
    offsetY = (scaledImageHeight - cameraHeight) / 2;
  }

  const normalizedX = (area.pageX + offsetX) / scaledImageWidth;
  const normalizedY = (area.pageY + offsetY) / scaledImageHeight;
  const normalizedW = area.width / scaledImageWidth;
  const normalizedH = area.height / scaledImageHeight;

  const originX = clamp01(normalizedX) * imageWidth;
  const originY = clamp01(normalizedY) * imageHeight;
  const maxRight = clamp01(normalizedX + normalizedW) * imageWidth;
  const maxBottom = clamp01(normalizedY + normalizedH) * imageHeight;
  const cropWidth = Math.max(0, maxRight - originX);
  const cropHeight = Math.max(0, maxBottom - originY);

  if (cropWidth === 0 || cropHeight === 0) {
    return uri;
  }

  try {
    const result = await ImageManipulator.manipulateAsync(
      uri,
      [
        {
          crop: {
            originX,
            originY,
            width: cropWidth,
            height: cropHeight,
          },
        },
      ],
      {
        compress: 0.95,
        format: ImageManipulator.SaveFormat.JPEG,
      }
    );

    return result.uri ?? uri;
  } catch (error) {
    console.warn("Unable to crop image to viewfinder", error);
    return uri;
  }
};

export const CameraView = ({ onCapture, onPickLatest }: Props) => {
  const cameraRef = useRef<ExpoCameraView>(null);
  const flexSpacerRef = useRef<View | null>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [type, setType] = useState<CameraType>("back");
  const [flash, setFlash] = useState<FlashMode>("off");
  const [isCapturing, setIsCapturing] = useState(false);
  const [isLoadingPick, setIsLoadingPick] = useState(false);
  const [libraryAssets, setLibraryAssets] = useState<MediaLibrary.Asset[]>([]);
  const [isLibraryVisible, setLibraryVisible] = useState(false);
  const [latestThumbUri, setLatestThumbUri] = useState<string | null>(null);
  const [zoom, setZoom] = useState(0.1);
  const [viewfinderBounds, setViewfinderBounds] =
    useState<ViewfinderBounds | null>(null);

  const cropModeId = useEditorState((state) => state.cropModeId);
  const setCropAspectRatio = useEditorState(
    (state) => state.setCropAspectRatio
  );

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

  const currentCrop = useMemo(
    () =>
      CROP_OPTIONS.find((option) => option.id === cropModeId) ??
      CROP_OPTIONS[0],
    [cropModeId]
  );

  const viewfinderFrame = useMemo(() => {
    if (!viewfinderBounds) {
      return null;
    }

    const { width, height, pageX, pageY } = viewfinderBounds;
    if (width === 0 || height === 0) {
      return null;
    }

    let frameWidth = width;
    let frameHeight = height;
    let horizontalInset = 0;
    let verticalInset = 0;
    const ratio = currentCrop.ratio;

    if (typeof ratio === "number" && ratio > 0) {
      const containerAspect = width / height;

      if (containerAspect > ratio) {
        frameHeight = height;
        frameWidth = frameHeight * ratio;
        horizontalInset = (width - frameWidth) / 2;
      } else {
        frameWidth = width;
        frameHeight = frameWidth / ratio;
        verticalInset = Math.max(0, (height - frameHeight) / 2);
      }
    }

    return {
      cropRect: {
        pageX: pageX + horizontalInset,
        pageY: pageY + verticalInset,
        width: frameWidth,
        height: frameHeight,
      },
      margins: {
        horizontal: horizontalInset,
        vertical: verticalInset,
      },
    };
  }, [currentCrop.ratio, viewfinderBounds]);

  const handleFlexLayout = useCallback(() => {
    requestAnimationFrame(() => {
      flexSpacerRef.current?.measureInWindow?.((x, y, width, height) => {
        setViewfinderBounds({ pageX: x, pageY: y, width, height });
      });
    });
  }, []);

  const showComingSoon = useCallback(() => {
    Alert.alert("Sắp ra mắt", "Tính năng đang được hoàn thiện.");
  }, []);

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

        if (
          typeof currentCrop.ratio === "number" &&
          viewfinderFrame?.cropRect
        ) {
          finalUri = await cropImageToViewfinder(
            finalUri,
            { width: photo.width, height: photo.height },
            viewfinderFrame.cropRect
          );
        }

        finalUri = await ensureJpeg(finalUri);

        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        onCapture(finalUri);
      }
    } finally {
      setIsCapturing(false);
    }
  }, [currentCrop, isCapturing, onCapture, viewfinderFrame]);

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

  const handleSelectFromLibrary = async (asset: MediaLibrary.Asset) => {
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
      setCropAspectRatio(currentCrop.ratio ?? null, currentCrop.id);
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
      <View style={styles.cameraRoot}>
        <ExpoCameraView
          ref={cameraRef}
          facing={type}
          style={StyleSheet.absoluteFill}
          flash={flash}
          zoom={zoom}
        />
        <View style={styles.textureLayer} />
        <View style={styles.noiseOverlay} />
        <View style={[styles.gridOverlay, styles.gridOverlayVertical]}>
          {[0, 1].map((line) => (
            <View key={`grid-v-${line}`} style={styles.gridVerticalLine} />
          ))}
        </View>
        <View style={[styles.gridOverlay, styles.gridOverlayHorizontal]}>
          {[0, 1].map((line) => (
            <View key={`grid-h-${line}`} style={styles.gridHorizontalLine} />
          ))}
        </View>
        <View style={styles.focusSquare}>
          <View style={styles.focusDot} />
        </View>
      </View>
      <SafeAreaView style={styles.overlay}>
        <View style={styles.topGradient}>
          <TouchableOpacity
            style={styles.roundIconButton}
            onPress={toggleFlash}
          >
            <MaterialIcons
              name={flash === "off" ? "flash-off" : "flash-on"}
              size={22}
              color="#e8e6e3"
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.roundIconButton}
            onPress={showComingSoon}
          >
            <MaterialIcons name="settings" size={22} color="#e8e6e3" />
          </TouchableOpacity>
        </View>
        <View
          ref={flexSpacerRef}
          style={styles.flexSpacer}
          collapsable={false}
          onLayout={handleFlexLayout}
        >
          {viewfinderFrame && (
            <View
              pointerEvents="none"
              style={[
                styles.viewfinderFrame,
                {
                  marginHorizontal: viewfinderFrame.margins.horizontal,
                  marginVertical: viewfinderFrame.margins.vertical,
                },
              ]}
            />
          )}
        </View>
        <View style={styles.bottomGradient}>
          <View style={styles.zoomPresetWrapper}>
            <ScrollView
              horizontal
              style={styles.zoomPresetRow}
              showsHorizontalScrollIndicator={false}
            >
              {CROP_OPTIONS.map((option) => {
                const isActive = option.id === currentCrop.id;
                return (
                  <TouchableOpacity
                    key={option.id}
                    style={[
                      styles.zoomPresetButton,
                      isActive && styles.zoomPresetButtonActive,
                    ]}
                    onPress={() =>
                      setCropAspectRatio(option.ratio ?? null, option.id)
                    }
                  >
                    <MaterialIcons
                      name={option.icon}
                      size={18}
                      color={isActive ? "#0f0f11" : "rgba(255,255,255,0.7)"}
                    />
                    <Text
                      style={[
                        styles.zoomPresetLabel,
                        isActive && styles.zoomPresetLabelActive,
                      ]}
                    >
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
          <View style={styles.zoomMeterWrapper}>
            <View pointerEvents="none" style={styles.zoomMeterTrack} />
            <View
              pointerEvents="none"
              style={[
                styles.zoomMeterFill,
                { width: `${Math.max(6, zoom * 100)}%` },
              ]}
            />
            <Slider
              style={styles.zoomSlider}
              minimumValue={0}
              maximumValue={1}
              step={0.01}
              minimumTrackTintColor="transparent"
              maximumTrackTintColor="transparent"
              value={zoom}
              onValueChange={setZoom}
            />
          </View>
          <View style={styles.actionRow}>
            {onPickLatest ? (
              <TouchableOpacity
                style={styles.galleryButton}
                disabled={isLoadingPick}
                onPress={openLibrary}
              >
                {latestThumbUri ? (
                  <>
                    <Image
                      source={{ uri: latestThumbUri }}
                      style={styles.galleryThumb}
                    />
                    <View style={styles.galleryOverlay} />
                  </>
                ) : (
                  <Ionicons name="image-outline" size={22} color="#e8e6e3" />
                )}
              </TouchableOpacity>
            ) : (
              <View style={styles.galleryButtonPlaceholder} />
            )}
            <TouchableOpacity
              style={styles.shutterButton}
              onPress={capturePhoto}
              disabled={isCapturing}
            >
              <View style={styles.shutterRing} />
              <View
                style={[
                  styles.shutterInner,
                  isCapturing && styles.shutterInnerActive,
                ]}
              />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.roundIconButton}
              onPress={toggleCameraType}
            >
              <MaterialIcons name="cameraswitch" size={24} color="#e8e6e3" />
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
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
    backgroundColor: "#0f0f11",
    borderRadius: 28,
    padding: 32,
    margin: 24,
    gap: 12,
  },
  permissionText: {
    color: "#f8fafc",
    fontSize: 16,
    textAlign: "center",
    lineHeight: 22,
  },
  primaryButton: {
    backgroundColor: cameraAccent,
    borderRadius: 999,
    paddingVertical: 14,
    paddingHorizontal: 28,
  },
  primaryLabel: {
    color: "#050505",
    fontWeight: "700",
    fontSize: 16,
    textAlign: "center",
  },
  cameraRoot: {
    flex: 1,
    backgroundColor: "#000",
    position: "relative",
    overflow: "hidden",
  },
  textureLayer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.35)",
  },
  noiseOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(255,255,255,0.03)",
    opacity: 0.08,
  },
  gridOverlay: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.12,
  },
  gridOverlayVertical: {
    flexDirection: "row",
    justifyContent: "space-evenly",
    alignItems: "stretch",
  },
  gridOverlayHorizontal: {
    flexDirection: "column",
    justifyContent: "space-evenly",
  },
  gridVerticalLine: {
    width: 1,
    backgroundColor: "#f5f2eb",
    opacity: 0.4,
  },
  gridHorizontalLine: {
    height: 1,
    backgroundColor: "#f5f2eb",
    opacity: 0.4,
  },
  focusSquare: {
    position: "absolute",
    width: 120,
    height: 120,
    borderRadius: 8,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: cameraAccentBright,
    top: "50%",
    left: "50%",
    marginLeft: -60,
    marginTop: -60,
    alignItems: "center",
    justifyContent: "center",
  },
  focusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: cameraAccentBright,
    shadowColor: cameraAccentBright,
    shadowOpacity: 0.6,
    shadowRadius: 8,
  },
  zoomBadge: {
    position: "absolute",
    bottom: 24,
    right: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: "rgba(0,0,0,0.6)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  zoomBadgeText: {
    color: cameraAccentBright,
    fontWeight: "700",
    fontSize: 10,
    letterSpacing: 2,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    height: cameraHeight,
    paddingHorizontal: 12,
  },
  topGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  roundIconButton: {
    width: 48,
    height: 48,
    borderRadius: 999,
    backgroundColor: "rgba(28,28,30,0.55)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    alignItems: "center",
    justifyContent: "center",
  },
  aspectBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 18,
    height: 40,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    backgroundColor: "rgba(28,28,30,0.65)",
  },
  aspectBadgeLabel: {
    color: "#f5f2eb",
    fontWeight: "700",
    letterSpacing: 2,
    fontSize: 12,
  },
  flexSpacer: {
    flex: 1,
  },
  viewfinderFrame: {
    flex: 1,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.35)",
    borderRadius: 16,
    backgroundColor: "transparent",
  },
  bottomGradient: {
    borderRadius: 32,
    padding: 24,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.05)",
    backgroundColor: "rgba(5,5,5,0.92)",
  },
  zoomPresetWrapper: {
    alignItems: "center",
    gap: 10,
  },
  zoomPresetRow: {
    gap: 12,
  },
  zoomPresetButton: {
    width: 60,
    height: 60,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderWidth: 1,
    marginRight: 12,
    borderColor: "rgba(255,255,255,0.12)",
    backgroundColor: "rgba(28,28,30,0.7)",
  },
  zoomPresetButtonActive: {
    backgroundColor: cameraAccent,
    borderColor: cameraAccentBright,
    shadowColor: cameraAccent,
    shadowOpacity: 0.35,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
  },
  zoomPresetLabel: {
    color: "rgba(232,230,227,0.8)",
    fontWeight: "600",
    fontSize: 11,
  },
  zoomPresetLabelActive: {
    color: "#0f0f11",
  },
  zoomGaugeRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "center",
    gap: 4,
  },
  zoomGaugeTick: {
    width: 2,
    height: 8,
    borderRadius: 2,
    backgroundColor: "rgba(255,255,255,0.3)",
  },
  zoomGaugeTickActive: {
    height: 14,
    backgroundColor: cameraAccentBright,
    shadowColor: cameraAccentBright,
    shadowOpacity: 0.7,
    shadowRadius: 6,
  },
  zoomMeterWrapper: {
    height: 56,
    justifyContent: "center",
    marginTop: 4,
  },
  zoomMeterTrack: {
    position: "absolute",
    left: 0,
    right: 0,
    height: 12,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.05)",
  },
  zoomMeterFill: {
    position: "absolute",
    left: 0,
    height: 12,
    borderRadius: 999,
    backgroundColor: "rgba(209,154,102,0.9)",
    shadowColor: cameraAccent,
    shadowOpacity: 0.4,
    shadowRadius: 10,
  },

  zoomSlider: {
    ...StyleSheet.absoluteFillObject,
    opacity: 1,
    top: 8,
  },
  zoomTickRow: {
    position: "absolute",
    left: 8,
    right: 8,
    bottom: 2,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },
  zoomTick: {
    width: 1,
    height: 8,
    backgroundColor: "rgba(255,255,255,0.25)",
  },
  zoomTickMajor: {
    height: 14,
    backgroundColor: cameraAccentBright,
  },
  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  galleryButton: {
    width: 64,
    height: 64,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    backgroundColor: "rgba(28,28,30,0.65)",
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  galleryThumb: {
    ...StyleSheet.absoluteFillObject,
  },
  galleryOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  galleryButtonPlaceholder: {
    width: 64,
    height: 64,
  },
  shutterButton: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  shutterRing: {
    position: "absolute",
    width: "100%",
    height: "100%",
    borderRadius: 52,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.2)",
    backgroundColor: "rgba(255,255,255,0.05)",
  },
  shutterInner: {
    width: 72,
    height: 72,
    borderRadius: 40,
    backgroundColor: "#f8f8f8",
    borderWidth: 1,
    borderColor: "#fff",
    shadowColor: "#000",
    shadowOpacity: 0.5,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
  },
  shutterInnerActive: {
    backgroundColor: cameraAccentBright,
  },
  modeRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 24,
    marginTop: 18,
  },
  modeItem: {
    alignItems: "center",
    gap: 4,
  },
  modeItemActive: {},
  modeLabel: {
    fontSize: 11,
    letterSpacing: 3,
    color: "rgba(255,255,255,0.35)",
    fontWeight: "600",
    textTransform: "uppercase",
  },
  modeLabelActive: {
    color: cameraAccentBright,
  },
  modeDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: cameraAccentBright,
    shadowColor: cameraAccentBright,
    shadowOpacity: 0.8,
    shadowRadius: 6,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.65)",
    justifyContent: "center",
    padding: 24,
  },
  modalContent: {
    backgroundColor: "#0f0f11",
    borderRadius: 28,
    padding: 20,
    maxHeight: cameraHeight * 0.75,
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
    color: "#f5f2eb",
  },
  modalHint: {
    textAlign: "center",
    paddingVertical: 32,
    color: "#f5f2eb",
  },
  libraryItem: {
    flex: 1,
    aspectRatio: 1,
    borderRadius: 16,
    overflow: "hidden",
  },
  libraryImage: {
    width: "100%",
    height: "100%",
  },
});
