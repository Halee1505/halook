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
  applyColorMixIntensity,
  buildShaderUniforms,
} from "@/src/engine/presetMath";
import {
  clampCropRect,
  DEFAULT_CROP_RECT,
  isFullscreenCrop,
} from "@/src/engine/cropMath";
import type { CropRect, EditorAdjustments } from "@/src/models/editor";
import type { ColorMixAdjustments } from "@/src/models/presets";
import {
  presetRuntimeEffect,
  createPresetShader,
} from "@/src/engine/presetEngineSkia";

const dateStamp = () => new Date().toISOString().replace(/[:.]/g, "-");

type ExportOptions = {
  imageUri: string;
  adjustments: EditorAdjustments;
  colorMix: ColorMixAdjustments;
  intensity: number;
  cropAspectRatio: number | null;
  cropRect?: CropRect;
};

export const exportCanvasToCameraRoll = async ({
  imageUri,
  adjustments,
  colorMix,
  intensity,
  cropAspectRatio,
  cropRect,
}: ExportOptions) => {
  const sourceImage = await loadSkImage(imageUri);
  const target = cropImage(sourceImage, cropRect);
  const processed = renderWithAdjustments(
    target,
    adjustments,
    colorMix,
    intensity
  );
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

const cropImage = (image: SkImage, rect?: CropRect | null) => {
  const normalized = clampCropRect(rect ?? DEFAULT_CROP_RECT);
  if (isFullscreenCrop(normalized)) {
    return image;
  }
  const width = image.width();
  const height = image.height();
  const subset = makeSubset(image, {
    x: Math.round(normalized.x * width),
    y: Math.round(normalized.y * height),
    width: Math.max(1, Math.round(normalized.w * width)),
    height: Math.max(1, Math.round(normalized.h * height)),
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
  const safeRect = {
    x: Math.max(0, Math.min(image.width() - 1, rect.x)),
    y: Math.max(0, Math.min(image.height() - 1, rect.y)),
    width: Math.max(1, Math.min(image.width() - rect.x, rect.width)),
    height: Math.max(1, Math.min(image.height() - rect.y, rect.height)),
  };
  return subsetFn.call(image, safeRect);
};

const renderWithAdjustments = (
  image: SkImage,
  adjustments: EditorAdjustments,
  colorMix: ColorMixAdjustments,
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
  const appliedColorMix = applyColorMixIntensity(colorMix, intensity);
  const shader = presetRuntimeEffect
    ? createPresetShader(imageShader, imageShader, applied, appliedColorMix)
    : null;
  const paint = Skia.Paint();

  if (shader) {
    paint.setShader(shader);
    canvas.drawPaint(paint);
  } else {
    const rect = Skia.XYWHRect(0, 0, width, height);
    canvas.drawImageRectCubic(image, rect, rect, 0, 0, paint);
  }

  const snapshot = surface.makeImageSnapshot();
  return snapshot;
};
