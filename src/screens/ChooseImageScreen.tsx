import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import * as FileSystem from "expo-file-system/legacy";
import { Image } from "expo-image";
import * as ImageManipulator from "expo-image-manipulator";
import * as MediaLibrary from "expo-media-library";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Colors } from "@/constants/theme";
import { useEditorState } from "@/src/hooks/useEditorState";
import { loadRecentLibraryImages } from "@/src/services/imageLoader";

type PhotoSection = {
  title: string;
  items: MediaLibrary.Asset[];
};

const PRIMARY_COLOR = "#e6b06e";
const MAX_RECENT_ASSETS = 96;

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

const normalizeFileUri = (value: string) =>
  value.startsWith("file://") ? value : `file://${value}`;

const prepareAssetForEditor = async (asset: MediaLibrary.Asset) => {
  const info = await MediaLibrary.getAssetInfoAsync(asset, {
    shouldDownloadFromNetwork: true,
  });

  const rawUri = info.localUri ?? info.uri;
  if (!rawUri) {
    throw new Error("Không thể truy cập ảnh đã chọn");
  }

  const sourceUri = normalizeFileUri(rawUri);
  const fs = FileSystem as {
    documentDirectory?: string | null;
    cacheDirectory?: string | null;
    copyAsync?: (args: { from: string; to: string }) => Promise<void>;
  };

  let finalUri = sourceUri;

  if (sourceUri.startsWith("file://") && fs.copyAsync) {
    const baseDir = fs.documentDirectory ?? fs.cacheDirectory ?? "";
    const originalName = asset.filename ?? `asset-${asset.id}`;
    const hasExt = /\.[a-zA-Z0-9]+$/.test(originalName);
    const safeFilename = hasExt ? originalName : `${originalName}.jpg`;
    const target = `${baseDir}Halook-${Date.now()}-${safeFilename}`;

    try {
      await fs.copyAsync({ from: sourceUri, to: target });
      finalUri = target;
    } catch (error) {
      console.warn("Unable to copy asset", error);
    }
  }

  return ensureJpeg(finalUri);
};

const startOfDay = (date: Date) =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate());

const getSectionTitle = (timestamp?: number) => {
  if (!timestamp) {
    return "Library";
  }

  const today = startOfDay(new Date());
  const assetDate = startOfDay(new Date(timestamp));
  const diff = Math.round(
    (today.getTime() - assetDate.getTime()) / (24 * 60 * 60 * 1000)
  );

  if (diff === 0) return "Today";
  if (diff === 1) return "Yesterday";
  return assetDate.toLocaleDateString();
};

const buildSections = (assets: MediaLibrary.Asset[]): PhotoSection[] => {
  const buckets = new Map<string, MediaLibrary.Asset[]>();

  assets.forEach((asset) => {
    const title = getSectionTitle(asset.creationTime);
    if (!buckets.has(title)) {
      buckets.set(title, []);
    }
    buckets.get(title)!.push(asset);
  });

  return Array.from(buckets.entries()).map(([title, items]) => ({
    title,
    items,
  }));
};

export const ChooseImageScreen = () => {
  const router = useRouter();
  const setImageUri = useEditorState((state) => state.setImageUri);
  const resetAdjustments = useEditorState((state) => state.resetAdjustments);
  const [assets, setAssets] = useState<MediaLibrary.Asset[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const loadAssets = useCallback(async () => {
    try {
      const recent = await loadRecentLibraryImages(MAX_RECENT_ASSETS);
      setAssets(recent);
    } catch (err) {
      console.warn("Unable to load media library", err);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      let isActive = true;
      loadAssets();

      const subscription = MediaLibrary.addListener(() => {
        if (isActive) {
          loadAssets();
        }
      });

      return () => {
        isActive = false;
        subscription.remove();
      };
    }, [loadAssets])
  );

  const sections = useMemo(() => buildSections(assets), [assets]);

  const selectedAsset = useMemo(
    () => assets.find((asset) => asset.id === selectedId) ?? null,
    [assets, selectedId]
  );

  const toggleSelection = (id: string) => {
    setSelectedId((prev) => (prev === id ? null : id));
  };

  const handleContinue = async () => {
    if (!selectedAsset) {
      Alert.alert("Chưa chọn ảnh", "Hãy chọn một ảnh để tiếp tục.");
      return;
    }

    try {
      const preparedUri = await prepareAssetForEditor(selectedAsset);
      setImageUri(preparedUri);
      resetAdjustments();
      router.push("/editor");
    } catch (err) {
      Alert.alert("Lỗi khi mở ảnh", "Vui lòng thử lại ảnh khác.");
      console.warn("Unable to prepare asset", err);
    }
  };

  const summaryLabel = selectedAsset
    ? selectedAsset.filename ?? "1 selected"
    : "Select a single photo";
  const summarySubtitle = selectedAsset
    ? "Ready to edit"
    : assets.length
    ? "Pick an image to start editing"
    : "Không tìm thấy ảnh gần đây";

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.root}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.iconButton}
            onPress={() => router.canGoBack() && router.back()}
          >
            <MaterialIcons name="close" size={24} color="#f4f4f5" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Choose photo</Text>
          <View style={{ width: 44, height: 44 }} />
        </View>
        <ScrollView
          style={styles.galleryScroll}
          contentContainerStyle={styles.galleryContent}
          showsVerticalScrollIndicator={false}
        >
          {sections.length ? (
            sections.map((section) => (
              <View key={section.title} style={styles.section}>
                <Text style={styles.sectionTitle}>{section.title}</Text>
                <View style={styles.photoGrid}>
                  {section.items.map((item) => {
                    const isSelected = item.id === selectedId;
                    return (
                      <TouchableOpacity
                        key={item.id}
                        style={styles.photoTile}
                        activeOpacity={0.9}
                        onPress={() => toggleSelection(item.id)}
                      >
                        <Image
                          source={{ uri: item.uri }}
                          style={styles.photoImage}
                          contentFit="cover"
                        />
                        <View
                          pointerEvents="none"
                          style={[
                            styles.photoOverlay,
                            isSelected && styles.photoOverlaySelected,
                          ]}
                        />
                        <View style={styles.checkContainer}>
                          {isSelected ? (
                            <View style={styles.checkBadge}>
                              <MaterialIcons
                                name="check"
                                size={16}
                                color="#0f172a"
                              />
                            </View>
                          ) : (
                            <MaterialIcons
                              name="radio-button-unchecked"
                              size={20}
                              color="rgba(248,250,252,0.7)"
                            />
                          )}
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            ))
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyTitle}>Không tìm thấy ảnh gần đây.</Text>
              <Text style={styles.emptySubtitle}>
                Hãy kiểm tra quyền truy cập thư viện.
              </Text>
            </View>
          )}
          <View style={{ height: 120 }} />
        </ScrollView>
        <View style={styles.bottomBar}>
          <View>
            <Text style={styles.bottomTitle}>{summaryLabel}</Text>
            <Text style={styles.bottomSubtitle}>{summarySubtitle}</Text>
          </View>
          <TouchableOpacity
            style={[
              styles.continueButton,
              !selectedAsset && styles.continueButtonDisabled,
            ]}
            onPress={handleContinue}
            disabled={!selectedAsset}
          >
            <Text style={styles.continueLabel}>Continue</Text>
            <MaterialIcons name="arrow-forward" size={18} color="#0f172a" />
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
};

const palette = Colors.light;

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#0f172a",
  },
  root: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingBottom: 4,
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  headerTitle: {
    color: PRIMARY_COLOR,
    fontSize: 18,
    fontWeight: "700",
  },
  galleryScroll: {
    flex: 1,
    marginTop: 12,
  },
  galleryContent: {
    paddingBottom: 120,
  },
  loadingState: {
    paddingVertical: 48,
    alignItems: "center",
    gap: 12,
  },
  loadingLabel: {
    color: "#e2e8f0",
    fontSize: 13,
  },
  emptyState: {
    paddingVertical: 48,
    alignItems: "center",
    gap: 8,
  },
  emptyTitle: {
    color: "#f8fafc",
    fontWeight: "600",
  },
  emptySubtitle: {
    color: "#94a3b8",
    fontSize: 13,
  },
  retryButton: {
    marginTop: 8,
    paddingHorizontal: 18,
    height: 40,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: PRIMARY_COLOR,
    alignItems: "center",
    justifyContent: "center",
  },
  retryLabel: {
    color: PRIMARY_COLOR,
    fontWeight: "600",
  },
  section: {
    marginTop: 16,
  },
  sectionTitle: {
    color: "rgba(248,250,252,0.8)",
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 8,
  },
  photoGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginHorizontal: -4,
  },
  photoTile: {
    width: "33.333%",
    padding: 4,
    aspectRatio: 1,
  },
  photoImage: {
    width: "100%",
    height: "100%",
    borderRadius: 12,
  },
  photoOverlay: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 12,
    backgroundColor: "transparent",
  },
  photoOverlaySelected: {
    borderWidth: 2,
    borderColor: PRIMARY_COLOR,
    backgroundColor: "rgba(230,176,110,0.18)",
  },
  checkContainer: {
    position: "absolute",
    top: 8,
    right: 8,
  },
  checkBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: PRIMARY_COLOR,
  },
  bottomBar: {
    position: "absolute",
    left: 16,
    right: 16,
    bottom: 28,
    padding: 16,
    borderRadius: 24,
    backgroundColor: "rgba(13,20,25,0.9)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    shadowColor: "#000",
    shadowOpacity: 0.4,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 6 },
  },
  bottomTitle: {
    color: "#f8fafc",
    fontSize: 14,
    fontWeight: "700",
  },
  bottomSubtitle: {
    color: "#cbd5f5",
    fontSize: 12,
  },
  continueButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: PRIMARY_COLOR,
    borderRadius: 14,
    paddingHorizontal: 18,
    height: 44,
  },
  continueButtonDisabled: {
    opacity: 0.45,
  },
  continueLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: "#0f172a",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
});
