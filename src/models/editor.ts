import type { ImageSourcePropType } from 'react-native';

import type { Preset, PresetAdjustment } from '@/src/models/presets';

export const adjustmentKeys = [
  'exposure',
  'contrast',
  'highlights',
  'shadows',
  'saturation',
  'vibrance',
] as const;

export type AdjustmentKey = (typeof adjustmentKeys)[number];

export type EditorAdjustments = Record<AdjustmentKey, number>;

export interface EditorStateShape {
  imageUri: string | null;
  backgroundSource: ImageSourcePropType | null;
  preset?: Preset;
  adjustments: EditorAdjustments;
  cropAspectRatio: number | null;
}

export interface EditorStateActions {
  setImageUri: (uri: string | null) => void;
  applyPreset: (preset?: Preset, adjustments?: PresetAdjustment) => void;
  updateAdjustment: (key: AdjustmentKey, value: number) => void;
  resetAdjustments: () => void;
  setBackgroundSource: (source: ImageSourcePropType | null) => void;
  setCropAspectRatio: (ratio: number | null) => void;
}

export type EditorStore = EditorStateShape & EditorStateActions;
