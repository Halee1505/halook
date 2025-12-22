import type { MaterialIconsGlyphs } from '@expo/vector-icons/MaterialIcons';

export type CropOption = {
  id: string;
  label: string;
  ratio: number | null;
  icon: MaterialIconsGlyphs;
  description?: string;
};

export const CROP_OPTIONS: CropOption[] = [
  { id: 'original', label: 'Original', ratio: null, icon: 'crop-original' },
  { id: 'free', label: 'Free', ratio: null, icon: 'crop-free' },
  { id: 'square', label: '1:1', ratio: 1, icon: 'crop-square' },
  { id: 'four-five', label: '4:5', ratio: 4 / 5, icon: 'crop-portrait' },
  { id: 'sixteen-nine', label: '16:9', ratio: 16 / 9, icon: 'crop-16-9' },
  { id: 'nine-sixteen', label: '9:16', ratio: 9 / 16, icon: 'crop-16-9' },
];

export const getCropOptionByRatio = (ratio?: number | null) => {
  if (typeof ratio !== 'number') {
    return CROP_OPTIONS[0];
  }

  return CROP_OPTIONS.find((option) => option.ratio === ratio) ?? CROP_OPTIONS[0];
};
