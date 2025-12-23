import type { CropRect } from "@/src/models/editor";

export const DEFAULT_CROP_RECT: CropRect = {
  x: 0,
  y: 0,
  w: 1,
  h: 1,
};

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));

export const normalizeRect = (rect: CropRect): CropRect => {
  let { x, y, w, h } = rect;
  if (w < 0) {
    x += w;
    w = Math.abs(w);
  }
  if (h < 0) {
    y += h;
    h = Math.abs(h);
  }
  return { x, y, w, h };
};

export const clampCropRect = (
  rect: CropRect,
  minSize = 0.05
): CropRect => {
  const normalized = normalizeRect(rect);
  let { x, y, w, h } = normalized;
  const minW = Math.min(1, Math.max(minSize, 0));
  const minH = Math.min(1, Math.max(minSize, 0));

  w = Math.max(minW, Math.min(1, w));
  h = Math.max(minH, Math.min(1, h));
  x = clamp01(x);
  y = clamp01(y);

  if (x + w > 1) {
    x = Math.max(0, 1 - w);
  }

  if (y + h > 1) {
    y = Math.max(0, 1 - h);
  }

  return { x, y, w, h };
};

export const isFullscreenCrop = (
  rect: CropRect,
  epsilon = 1e-4
) => {
  const dx = Math.abs(rect.x);
  const dy = Math.abs(rect.y);
  const dw = Math.abs(rect.w - 1);
  const dh = Math.abs(rect.h - 1);
  return dx < epsilon && dy < epsilon && dw < epsilon && dh < epsilon;
};
