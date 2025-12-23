import {
  FilterMode,
  ImageFormat,
  MipmapMode,
  Skia,
  TileMode,
  type SkImage,
} from "@shopify/react-native-skia";
import {
  cacheDirectory,
  EncodingType,
  readAsStringAsync,
  writeAsStringAsync,
} from "expo-file-system/legacy";
import * as MediaLibrary from "expo-media-library";

import { ensureLibraryPermissions } from "@/src/services/imageLoader";
import {
  applyPresetIntensity,
  buildShaderUniforms,
} from "@/src/engine/presetMath";
import type { EditorAdjustments } from "@/src/models/editor";
import { presetRuntimeEffect, createPresetShader } from "@/src/engine/presetEngineSkia";

const dateStamp = () => new Date().toISOString().replace(/[:.]/g, "-");

type ExportOptions = {
  imageUri: string;
  adjustments: EditorAdjustments;
  intensity: number;
  cropAspectRatio: number | null;
};

export const exportCanvasToCameraRoll = async ({
  imageUri,
  adjustments,
  intensity,
  cropAspectRatio,
}: ExportOptions) => {
  const sourceImage = await loadSkImage(imageUri);
  const target = cropImage(sourceImage, cropAspectRatio);
  const processed = renderWithAdjustments(target, adjustments, intensity);
  const base64 = processed.encodeToBase64(ImageFormat.JPEG, 94);
  if (!base64) {
    throw new Error("Failed to encode image");
  }

  const fileUri = `${cacheDirectory}Halook-${dateStamp()}.jpg`;

  await writeAsStringAsync(fileUri, base64, { encoding: EncodingType.Base64 });
  await ensureLibraryPermissions();
  await MediaLibrary.saveToLibraryAsync(fileUri);

  return fileUri;
};

const loadSkImage = async (uri: string): Promise<SkImage> => {
  try {
    const data = await Skia.Data.fromURI(uri);
    const image = data ? Skia.Image.MakeImageFromEncoded(data) : null;
    if (image) {
      return image;
    }
  } catch (error) {
    console.warn("Skia.Data.fromURI failed", error);
  }
  const base64 = await readAsStringAsync(uri, { encoding: EncodingType.Base64 });
  const base64Data = Skia.Data.fromBase64(base64);
  const fallbackImage = Skia.Image.MakeImageFromEncoded(base64Data);
  if (!fallbackImage) {
    throw new Error("Unable to decode image for export");
  }
  return fallbackImage;
};

const cropImage = (image: SkImage, aspectRatio: number | null) => {
  if (!aspectRatio) {
    return image;
  }
  const width = image.width();
  const height = image.height();
  const currentAspect = width / height;
  if (Math.abs(currentAspect - aspectRatio) < 0.0001) {
    return image;
  }

  if (currentAspect > aspectRatio) {
    const targetWidth = Math.max(
      1,
      Math.round(height * aspectRatio)
    );
    const offsetX = Math.max(0, Math.floor((width - targetWidth) / 2));
    const subset = makeSubset(image, {
      x: offsetX,
      y: 0,
      width: targetWidth,
      height,
    });
    return subset ?? image;
  }

  const targetHeight = Math.max(1, Math.round(width / aspectRatio));
  const offsetY = Math.max(0, Math.floor((height - targetHeight) / 2));
  const subset = makeSubset(image, {
    x: 0,
    y: offsetY,
    width,
    height: targetHeight,
  });
  return subset ?? image;
};

const makeSubset = (
  image: SkImage,
  rect: { x: number; y: number; width: number; height: number }
) => {
  const subsetFn = (image as unknown as {
    makeSubset?: (
      rect: { x: number; y: number; width: number; height: number }
    ) => SkImage | null;
  }).makeSubset;
  if (!subsetFn) {
    return null;
  }
  return subsetFn.call(image, rect);
};

const renderWithAdjustments = (
  image: SkImage,
  adjustments: EditorAdjustments,
  intensity: number
) => {
  const width = image.width();
  const height = image.height();
  const surface = Skia.Surface.MakeOffscreen(width, height);
  if (!surface) {
    throw new Error("Failed to create render surface");
  }
  const canvas = surface.getCanvas();
  canvas.clear(Skia.Color("#000000"));

  const matrix = Skia.Matrix();
  const imageShader = image.makeShaderOptions(
    TileMode.Clamp,
    TileMode.Clamp,
    FilterMode.Linear,
    MipmapMode.None,
    matrix
  );
  const applied = applyPresetIntensity(adjustments, intensity);
  const shader = presetRuntimeEffect
    ? createPresetShader(imageShader, imageShader, applied)
    : null;
  const paint = Skia.Paint();

  if (shader) {
    paint.setShader(shader);
    canvas.drawPaint(paint);
  } else {
    canvas.drawImage(image, 0, 0, paint);
  }

  const snapshot = surface.makeImageSnapshot();
  return snapshot;
};
