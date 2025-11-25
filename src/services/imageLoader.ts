import { Camera } from "expo-camera";
import * as MediaLibrary from "expo-media-library";
import type { ImageSourcePropType } from "react-native";

export const BACKGROUND_OVERLAYS: ImageSourcePropType[] = [
  require('../../assets/background/img1.jpg'),
  require('../../assets/background/img2.jpg'),
  require('../../assets/background/img3.jpg'),
  require('../../assets/background/img4.jpg'),
  require('../../assets/background/img5.jpg'),
];

export const ensureCameraPermissions = async () => {
  const { status, granted } = await Camera.requestCameraPermissionsAsync();
  if (!granted && status !== "granted") {
    throw new Error("Camera permission is required");
  }
};

export const ensureLibraryPermissions = async () => {
  const { status, granted } = await MediaLibrary.requestPermissionsAsync();
  if (!granted && status !== "granted") {
    throw new Error("Media Library permission is required");
  }
};

export const loadRecentLibraryImages = async (limit = 12) => {
  await ensureLibraryPermissions();

  const { assets } = await MediaLibrary.getAssetsAsync({
    mediaType: MediaLibrary.MediaType.photo,
    first: limit,
    sortBy: MediaLibrary.SortBy.creationTime,
  });

  return assets;
};

export const pickLatestLibraryPhoto = async () => {
  const assets = await loadRecentLibraryImages(1);
  return assets[0]?.uri ?? null;
};
