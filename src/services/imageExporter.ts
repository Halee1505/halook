import type { SkiaView } from '@shopify/react-native-skia';
import { cacheDirectory, EncodingType, writeAsStringAsync } from 'expo-file-system/legacy';
import * as MediaLibrary from 'expo-media-library';

import { ensureLibraryPermissions } from '@/src/services/imageLoader';

const dateStamp = () => new Date().toISOString().replace(/[:.]/g, '-');

export const exportCanvasToCameraRoll = async (canvasRef: React.RefObject<SkiaView>) => {
  const image = canvasRef.current?.makeImageSnapshot();

  if (!image) {
    throw new Error('Canvas is not ready yet');
  }

  // Skia can encode directly to base64 without Buffer conversion
  const base64 = image.encodeToBase64('jpeg', 0.92);
  const fileUri = `${cacheDirectory}Halook-${dateStamp()}.jpg`;

  await writeAsStringAsync(fileUri, base64, { encoding: EncodingType.Base64 });
  await ensureLibraryPermissions();
  await MediaLibrary.saveToLibraryAsync(fileUri);

  return fileUri;
};
