import { ImageFormat, useCanvasRef } from "@shopify/react-native-skia";
import {
  cacheDirectory,
  EncodingType,
  writeAsStringAsync,
} from "expo-file-system/legacy";
import * as MediaLibrary from "expo-media-library";

import { ensureLibraryPermissions } from "@/src/services/imageLoader";

const dateStamp = () => new Date().toISOString().replace(/[:.]/g, "-");

export type SkiaCanvasRef = ReturnType<typeof useCanvasRef>;

export const exportCanvasToCameraRoll = async (canvasRef: SkiaCanvasRef) => {
  const image = canvasRef.current?.makeImageSnapshot();

  if (!image) {
    throw new Error("Canvas is not ready yet");
  }

  const base64 = image.encodeToBase64(ImageFormat.JPEG, 92);
  if (!base64) {
    throw new Error("Failed to encode image");
  }

  const fileUri = `${cacheDirectory}Halook-${dateStamp()}.jpg`;

  await writeAsStringAsync(fileUri, base64, { encoding: EncodingType.Base64 });
  await ensureLibraryPermissions();
  await MediaLibrary.saveToLibraryAsync(fileUri);

  return fileUri;
};
