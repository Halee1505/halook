import { create } from "zustand";

import {
  buildEditorAdjustmentsFromPreset,
  clampAdjustment,
  defaultAdjustments,
} from "@/src/engine/presetMath";
import { CROP_OPTIONS } from "@/src/constants/cropOptions";
import { clampCropRect, DEFAULT_CROP_RECT } from "@/src/engine/cropMath";
import type { CropRect, EditorStore } from "@/src/models/editor";
import type { Preset, PresetAdjustment } from "@/src/models/presets";

const normalizePreset = (preset?: Preset, adjustments?: PresetAdjustment) => {
  const presetAdjustments = adjustments ?? preset?.adjustments;
  if (presetAdjustments) {
    return buildEditorAdjustmentsFromPreset(presetAdjustments);
  }

  return { ...defaultAdjustments };
};

export const useEditorState = create<EditorStore>((set, get) => ({
  imageUri: null,
  backgroundSource: null,
  preset: undefined,
  adjustments: { ...defaultAdjustments },
  cropAspectRatio: null,
  cropModeId: CROP_OPTIONS[0].id,
  presetIntensity: 1,
  cropRectNormalized: { ...DEFAULT_CROP_RECT },
  setImageUri: (uri) => set({ imageUri: uri }),
  applyPreset: (preset, adjustments) => {
    set({
      preset,
      adjustments: normalizePreset(preset, adjustments),
    });
  },
  updateAdjustment: (key, value) =>
    set({
      adjustments: {
        ...get().adjustments,
        [key]: clampAdjustment(key, value),
      },
    }),
  resetAdjustments: () =>
    set({
      adjustments: { ...defaultAdjustments },
      preset: undefined,
      backgroundSource: null,
      presetIntensity: 1,
    }),
  setBackgroundSource: (source) => set({ backgroundSource: source }),
  setCropAspectRatio: (ratio, modeId) =>
    set((state) => {
      const currentRect = state.cropRectNormalized;
      let nextRect = currentRect;
      if (typeof ratio === "number" && ratio > 0) {
        const currentAspect = currentRect.w / currentRect.h;
        let targetW = currentRect.w;
        let targetH = currentRect.h;
        if (currentAspect > ratio) {
          targetW = currentRect.h * ratio;
        } else {
          targetH = currentRect.w / ratio;
        }
        const centeredX = currentRect.x + (currentRect.w - targetW) / 2;
        const centeredY = currentRect.y + (currentRect.h - targetH) / 2;
        nextRect = clampCropRect({
          x: centeredX,
          y: centeredY,
          w: targetW,
          h: targetH,
        });
      } else if (!ratio) {
        nextRect = { ...DEFAULT_CROP_RECT };
      }

      if (modeId) {
        return {
          cropAspectRatio: ratio,
          cropModeId: modeId,
          cropRectNormalized: nextRect,
        };
      }
      if (typeof ratio === "number") {
        const match = CROP_OPTIONS.find((option) => option.ratio === ratio);
        return {
          cropAspectRatio: ratio,
          cropModeId: match?.id ?? state.cropModeId,
          cropRectNormalized: nextRect,
        };
      }
      return {
        cropAspectRatio: null,
        cropRectNormalized: { ...DEFAULT_CROP_RECT },
      };
    }),
  setPresetIntensity: (value) =>
    set({
      presetIntensity: Math.min(1, Math.max(0, value)),
    }),
  setCropRectNormalized: (rect) =>
    set({
      cropRectNormalized: clampCropRect(rect),
    }),
  resetCrop: () =>
    set({
      cropRectNormalized: { ...DEFAULT_CROP_RECT },
      cropAspectRatio: null,
      cropModeId: CROP_OPTIONS[0].id,
    }),
  updateCropByDelta: (delta, anchor = "move") =>
    set((state) => {
      const current = state.cropRectNormalized;
      const dx = delta.x ?? 0;
      const dy = delta.y ?? 0;
      const dw = delta.w ?? 0;
      const dh = delta.h ?? 0;
      let next: CropRect = { ...current };
      switch (anchor) {
        case "move":
          next = {
            ...current,
            x: current.x + dx,
            y: current.y + dy,
          };
          break;
        case "l":
          next = {
            ...current,
            x: current.x + dx,
            w: current.w - dx,
          };
          break;
        case "r":
          next = {
            ...current,
            w: current.w + dx,
          };
          break;
        case "t":
          next = {
            ...current,
            y: current.y + dy,
            h: current.h - dy,
          };
          break;
        case "b":
          next = {
            ...current,
            h: current.h + dy,
          };
          break;
        case "tl":
          next = {
            x: current.x + dx,
            y: current.y + dy,
            w: current.w - dx,
            h: current.h - dy,
          };
          break;
        case "tr":
          next = {
            x: current.x,
            y: current.y + dy,
            w: current.w + dx,
            h: current.h - dy,
          };
          break;
        case "bl":
          next = {
            x: current.x + dx,
            y: current.y,
            w: current.w - dx,
            h: current.h + dy,
          };
          break;
        case "br":
          next = {
            ...current,
            w: current.w + dx,
            h: current.h + dy,
          };
          break;
        default:
          next = current;
      }
      return {
        cropRectNormalized: clampCropRect(next),
      };
    }),
  setCropState: (rect, aspect, modeId) =>
    set({
      cropRectNormalized: clampCropRect(rect),
      cropAspectRatio: aspect,
      cropModeId: modeId,
    }),
}));

export const useEditorImage = () => useEditorState((state) => state.imageUri);
export const useEditorAdjustments = () =>
  useEditorState((state) => state.adjustments);
export const useEditorPreset = () => useEditorState((state) => state.preset);
export const useEditorBackground = () =>
  useEditorState((state) => state.backgroundSource);
export const useEditorCropAspect = () =>
  useEditorState((state) => state.cropAspectRatio);
export const usePresetIntensity = () =>
  useEditorState((state) => state.presetIntensity);
export const useEditorCropRect = () =>
  useEditorState((state) => state.cropRectNormalized);
