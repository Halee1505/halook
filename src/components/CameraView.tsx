import Entypo from '@expo/vector-icons/Entypo';
import Ionicons from '@expo/vector-icons/Ionicons';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import Slider from '@react-native-community/slider';
import {
  CameraType,
  CameraView as ExpoCameraView,
  FlashMode,
  useCameraPermissions,
} from 'expo-camera';
import * as FileSystem from 'expo-file-system/legacy';
import * as Haptics from 'expo-haptics';
import * as ImageManipulator from 'expo-image-manipulator';
import { Image } from 'expo-image';
import * as MediaLibrary from 'expo-media-library';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Dimensions,
  FlatList,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Colors } from '@/constants/theme';
import { CropRatioSheet } from '@/src/components/CropRatioSheet';
import { CROP_OPTIONS, type CropOption } from '@/src/constants/cropOptions';
import { useEditorState } from '@/src/hooks/useEditorState';
import {
  ensureCameraPermissions,
  loadRecentLibraryImages,
  pickLatestLibraryPhoto,
} from '@/src/services/imageLoader';

type Props = {
  onCapture: (uri: string) => void;
  onPickLatest?: (uri: string) => void;
};

const palette = Colors.light;
const cameraHeight = Dimensions.get('window').height;
const zoomMarkers = new Array(18).fill(0).map((_, index) => index);

const ensureJpeg = async (uri: string) => {
  if (!uri) return uri;
  const lower = uri.toLowerCase();
  if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) {
    return uri;
  }

  try {
    const result = await ImageManipulator.manipulateAsync(uri, [], {
      compress: 0.95,
      format: ImageManipulator.SaveFormat.JPEG,
    });
    return result.uri ?? uri;
  } catch (error) {
    console.warn('Unable to transcode image to JPEG', error);
    return uri;
  }
};

export const CameraView = ({ onCapture, onPickLatest }: Props) => {
  const cameraRef = useRef<ExpoCameraView>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [type, setType] = useState<CameraType>('back');
  const [flash, setFlash] = useState<FlashMode>('off');
  const [isCapturing, setIsCapturing] = useState(false);
  const [isLoadingPick, setIsLoadingPick] = useState(false);
  const [libraryAssets, setLibraryAssets] = useState<MediaLibrary.Asset[]>([]);
  const [isLibraryVisible, setLibraryVisible] = useState(false);
  const [latestThumbUri, setLatestThumbUri] = useState<string | null>(null);
  const [zoom, setZoom] = useState(0.1);
  const [isCropSheetVisible, setCropSheetVisible] = useState(false);

  const cropModeId = useEditorState((state) => state.cropModeId);
  const setCropAspectRatio = useEditorState((state) => state.setCropAspectRatio);

  useEffect(() => {
    if (!permission?.granted) {
      requestPermission();
    }
  }, [permission, requestPermission]);

  const toggleCameraType = () => {
    setType((current) => (current === 'back' ? 'front' : 'back'));
  };

  const toggleFlash = () => {
    setFlash((current) => (current === 'off' ? 'on' : 'off'));
  };

  const currentCrop = useMemo(
    () => CROP_OPTIONS.find((option) => option.id === cropModeId) ?? CROP_OPTIONS[0],
    [cropModeId],
  );
  const overlayAspect = currentCrop.ratio ?? 3 / 4;

  const displayZoom = useMemo(() => `${(1 + zoom * 2).toFixed(1)}x`, [zoom]);

  const showComingSoon = useCallback(() => {
    Alert.alert('Sắp ra mắt', 'Tính năng đang được hoàn thiện.');
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
        console.warn('Unable to load latest library photo', error);
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

        if (photo.uri.startsWith('file://') && fs.copyAsync) {
          const baseDir = fs.documentDirectory ?? fs.cacheDirectory ?? '';
          const ext = photo.uri.split('.').pop() || 'jpg';
          const target = `${baseDir}Halook-Capture-${Date.now()}.${ext}`;

          try {
            await fs.copyAsync({ from: photo.uri, to: target });
            finalUri = target;
          } catch (copyErr) {
            console.warn('Unable to copy captured photo', copyErr);
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

  const handleSelectFromLibrary = async (asset: MediaLibrary.Asset) => {
    try {
      const info = await MediaLibrary.getAssetInfoAsync(asset, {
        shouldDownloadFromNetwork: true,
      });

      const rawUri = info.localUri ?? info.uri;

      if (!rawUri) {
        console.warn('No local URI available for asset', asset.id);
        return;
      }

      const sourceUri = rawUri.startsWith('file://') ? rawUri : `file://${rawUri}`;

      let finalUri = sourceUri;

      const fs = FileSystem as {
        documentDirectory?: string | null;
        cacheDirectory?: string | null;
        copyAsync?: (args: { from: string; to: string }) => Promise<void>;
      };

      if (sourceUri.startsWith('file://') && fs.copyAsync) {
        const baseDir = fs.documentDirectory ?? fs.cacheDirectory ?? '';
        const originalName = asset.filename ?? `asset-${asset.id}`;
        const hasExt = /\.[a-zA-Z0-9]+$/.test(originalName);
        const safeFilename = hasExt ? originalName : `${originalName}.jpg`;
        const target = `${baseDir}Halook-${Date.now()}-${safeFilename}`;

        try {
          await fs.copyAsync({ from: sourceUri, to: target });
          finalUri = target;
        } catch (copyErr) {
          console.warn('Unable to copy asset', copyErr);
        }
      }

      finalUri = await ensureJpeg(finalUri);
      setCropAspectRatio(currentCrop.ratio ?? null, currentCrop.id);
      onPickLatest?.(finalUri);
    } finally {
      closeLibrary();
    }
  };

  const handleCropApply = (option: CropOption) => {
    setCropAspectRatio(option.ratio ?? null, option.id);
  };

  if (!permission?.granted) {
    return (
      <View style={styles.permissionCard}>
        <Text style={styles.permissionText}>
          Cần quyền truy cập camera để tiếp tục. Vui lòng mở cài đặt và cấp quyền cho Halook.
        </Text>
        <TouchableOpacity style={styles.primaryButton} onPress={requestPermission}>
          <Text style={styles.primaryLabel}>Cấp quyền</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <>
      <View style={styles.cameraRoot}>
        <ExpoCameraView ref={cameraRef} facing={type} style={StyleSheet.absoluteFill} flash={flash} zoom={zoom} />
        <View style={styles.gradientLayer} />
        <View style={styles.blobTopRight} />
        <View style={styles.blobBottomLeft} />
        <View style={[styles.focusFrame, { aspectRatio: overlayAspect }]}>
          <View style={[styles.focusCorner, styles.focusCornerTopLeft]} />
          <View style={[styles.focusCorner, styles.focusCornerTopRight]} />
          <View style={[styles.focusCorner, styles.focusCornerBottomLeft]} />
          <View style={[styles.focusCorner, styles.focusCornerBottomRight]} />
        </View>
      </View>
      <SafeAreaView style={styles.overlay} pointerEvents="box-none">
        <View style={styles.topControls}>
          <TouchableOpacity style={styles.iconButton} onPress={toggleFlash}>
            <Ionicons name={flash === 'off' ? 'flash-off-outline' : 'flash-outline'} size={22} color="#f8fafc" />
          </TouchableOpacity>
          <View style={styles.iconCluster}>
            <TouchableOpacity style={styles.iconButton} onPress={showComingSoon}>
              <MaterialIcons name="hdr-auto" size={22} color="#f8fafc" />
            </TouchableOpacity>
          </View>
          <TouchableOpacity style={styles.iconButton} onPress={showComingSoon}>
            <MaterialIcons name="tune" size={22} color="#f8fafc" />
          </TouchableOpacity>
        </View>
        <View style={{ flex: 1 }} />
        <View style={styles.bottomPanel}>
          <View style={styles.aspectRow}>
            <TouchableOpacity style={styles.aspectButton} onPress={() => setCropSheetVisible(true)}>
              <Text style={styles.aspectLabel}>{currentCrop.label}</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.zoomPanel}>
            <Text style={styles.zoomValue}>{displayZoom}</Text>
            <View style={styles.zoomTrackWrapper}>
              <View style={styles.zoomTrack}>
                <View style={[styles.zoomFill, { width: `${Math.max(8, zoom * 100)}%` }]} />
              </View>
              <View style={[styles.zoomThumb, { left: `${zoom * 100}%` }]} />
              <Slider
                style={styles.sliderHitbox}
                minimumValue={0}
                maximumValue={1}
                step={0.01}
                minimumTrackTintColor="transparent"
                maximumTrackTintColor="transparent"
                value={zoom}
                onValueChange={setZoom}
              />
              <View style={styles.zoomTicks}>
                {zoomMarkers.map((marker) => (
                  <View
                    key={`tick-${marker}`}
                    style={[styles.tick, marker % 6 === 0 ? styles.tickMajor : styles.tickMinor]}
                  />
                ))}
              </View>
            </View>
          </View>
          <View style={styles.actionsRow}>
            {onPickLatest ? (
              <TouchableOpacity style={styles.sidePreview} disabled={isLoadingPick} onPress={openLibrary}>
                {latestThumbUri ? (
                  <>
                    <Image source={{ uri: latestThumbUri }} style={styles.sidePreviewImage} />
                    <View style={styles.sidePreviewOverlay} />
                  </>
                ) : null}
                <Ionicons name="images-outline" size={18} color={palette.tint} />
                <Text style={styles.sidePreviewLabel}>{isLoadingPick ? 'Đang tải' : 'Album'}</Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.sidePreviewPlaceholder} />
            )}
            <TouchableOpacity style={styles.shutterOuter} onPress={capturePhoto} disabled={isCapturing}>
              <View style={styles.shutterRing} />
              <View style={[styles.shutterInner, isCapturing && styles.shutterInnerActive]}>
                {isCapturing ? (
                  <MaterialCommunityIcons name="camera-iris" size={34} color="#0f172a" />
                ) : (
                  <Entypo name="camera" size={34} color="#0f172a" />
                )}
              </View>
            </TouchableOpacity>
            <TouchableOpacity style={styles.iconButton} onPress={toggleCameraType}>
              <Ionicons name="camera-reverse-outline" size={22} color="#f8fafc" />
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>

      <CropRatioSheet
        visible={isCropSheetVisible}
        selectedId={cropModeId}
        onClose={() => setCropSheetVisible(false)}
        onApply={handleCropApply}
      />

      <Modal visible={isLibraryVisible} transparent animationType="fade" onRequestClose={closeLibrary}>
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
                  <TouchableOpacity style={styles.libraryItem} onPress={() => handleSelectFromLibrary(item)}>
                    <Image source={{ uri: item.uri }} style={styles.libraryImage} />
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
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.background,
    borderRadius: 24,
    padding: 24,
    gap: 12,
  },
  permissionText: {
    color: palette.text,
    fontSize: 16,
    textAlign: 'center',
  },
  primaryButton: {
    backgroundColor: palette.tint,
    borderRadius: 50,
    paddingVertical: 14,
    paddingHorizontal: 20,
  },
  primaryLabel: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
    textAlign: 'center',
  },
  cameraRoot: {
    flex: 1,
    backgroundColor: '#000',
  },
  gradientLayer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  blobTopRight: {
    position: 'absolute',
    top: 60,
    right: -40,
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: 'rgba(48,232,119,0.2)',
    transform: [{ rotate: '12deg' }],
  },
  blobBottomLeft: {
    position: 'absolute',
    bottom: 120,
    left: -60,
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: 'rgba(13,148,136,0.18)',
  },
  focusFrame: {
    position: 'absolute',
    top: '20%',
    left: '7%',
    right: '7%',
    bottom: '22%',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'space-between',
  },
  focusCorner: {
    position: 'absolute',
    width: 36,
    height: 36,
    borderColor: palette.tint,
    borderWidth: 3,
    borderRadius: 12,
    shadowColor: palette.tint,
    shadowOpacity: 0.4,
    shadowRadius: 14,
  },
  focusCornerTopLeft: {
    top: 10,
    left: 10,
    borderRightWidth: 0,
    borderBottomWidth: 0,
  },
  focusCornerTopRight: {
    top: 10,
    right: 10,
    borderLeftWidth: 0,
    borderBottomWidth: 0,
  },
  focusCornerBottomLeft: {
    bottom: 10,
    left: 10,
    borderRightWidth: 0,
    borderTopWidth: 0,
  },
  focusCornerBottomRight: {
    bottom: 10,
    right: 10,
    borderLeftWidth: 0,
    borderTopWidth: 0,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    paddingHorizontal: 20,
  },
  topControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 12,
  },
  iconButton: {
    width: 48,
    height: 48,
    borderRadius: 999,
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  iconCluster: {
    flexDirection: 'row',
    gap: 12,
  },
  bottomPanel: {
    paddingBottom: 28,
    gap: 20,
  },
  aspectRow: {
    alignItems: 'center',
  },
  aspectButton: {
    minWidth: 72,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    shadowColor: '#000',
    shadowOpacity: 0.4,
    shadowRadius: 12,
  },
  aspectLabel: {
    color: '#f0fdfa',
    fontWeight: '700',
    letterSpacing: 1,
  },
  zoomPanel: {
    gap: 10,
  },
  zoomValue: {
    color: palette.tint,
    fontWeight: '700',
    fontSize: 18,
    textAlign: 'center',
    letterSpacing: 2,
  },
  zoomTrackWrapper: {
    position: 'relative',
    height: 56,
    justifyContent: 'center',
  },
  zoomTrack: {
    height: 12,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.08)',
    overflow: 'hidden',
  },
  zoomFill: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: 'rgba(48,232,119,0.8)',
  },
  zoomThumb: {
    position: 'absolute',
    top: 50,
    width: 20,
    height: 20,
    borderRadius: 999,
    backgroundColor: palette.tint,
    transform: [{ translateX: -10 }],
    borderWidth: 3,
    borderColor: '#fff',
  },
  sliderHitbox: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0,
  },
  zoomTicks: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 4,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
  },
  tick: {
    width: 2,
    backgroundColor: 'rgba(255,255,255,0.4)',
  },
  tickMinor: {
    height: 8,
  },
  tickMajor: {
    height: 16,
    backgroundColor: '#fff',
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sidePreview: {
    width: 68,
    height: 68,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    gap: 4,
  },
  sidePreviewImage: {
    ...StyleSheet.absoluteFillObject,
  },
  sidePreviewOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  sidePreviewLabel: {
    fontSize: 11,
    color: '#f8fafc',
    fontWeight: '600',
  },
  sidePreviewPlaceholder: {
    width: 68,
    height: 68,
  },
  shutterOuter: {
    width: 110,
    height: 110,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shutterRing: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  shutterInner: {
    width: 86,
    height: 86,
    borderRadius: 999,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: palette.tint,
    shadowOpacity: 0.5,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
  },
  shutterInnerActive: {
    backgroundColor: palette.tint,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    padding: 24,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 16,
    maxHeight: cameraHeight * 0.7,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  modalTitle: {
    fontWeight: '700',
    fontSize: 18,
    color: palette.text,
  },
  modalHint: {
    textAlign: 'center',
    paddingVertical: 32,
    color: palette.text,
  },
  libraryItem: {
    flex: 1,
    aspectRatio: 1,
    borderRadius: 14,
    overflow: 'hidden',
  },
  libraryImage: {
    width: '100%',
    height: '100%',
  },
});
