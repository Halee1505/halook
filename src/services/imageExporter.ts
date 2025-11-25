import { Buffer } from 'buffer';
import type { SkiaView } from '@shopify/react-native-skia';
import { cacheDirectory, EncodingType, writeAsStringAsync } from 'expo-file-system';
import * as MediaLibrary from 'expo-media-library';

import { ensureLibraryPermissions } from '@/src/services/imageLoader';

const dateStamp = () => new Date().toISOString().replace(/[:.]/g, '-');

export const exportCanvasToCameraRoll = async (canvasRef: React.RefObject<SkiaView>) => {
  const image = canvasRef.current?.makeImageSnapshot();

  if (!image) {
    throw new Error('Canvas is not ready yet');
  }

  const bytes = image.encodeToBytes('jpeg', 0.92);
  const base64 = Buffer.from(bytes).toString('base64');
  const fileUri = `${cacheDirectory}Halook-${dateStamp()}.jpg`;

  await writeAsStringAsync(fileUri, base64, { encoding: EncodingType.Base64 });
  await ensureLibraryPermissions();
  await MediaLibrary.saveToLibraryAsync(fileUri);

  return fileUri;
};
