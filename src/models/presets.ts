export type PresetScope = 'free' | 'pro' | 'elite';

export interface ToneAdjustments {
  exposure: number;
  contrast: number;
  highlights: number;
  shadows: number;
  whites: number;
  blacks: number;
  saturation: number;
  vibrance: number;
  clarity: number;
  dehaze: number;
}

export const COLOR_CHANNELS = [
  'red',
  'orange',
  'yellow',
  'green',
  'aqua',
  'blue',
  'purple',
  'magenta',
] as const;

export type ColorChannel = (typeof COLOR_CHANNELS)[number];

export interface ColorMixAdjustments {
  hue: Record<ColorChannel, number>;
  saturation: Record<ColorChannel, number>;
  luminance: Record<ColorChannel, number>;
}

export interface ToneCurvePoint {
  input: number;
  output: number;
}

export interface ToneCurveAdjustments {
  master: ToneCurvePoint[];
  red: ToneCurvePoint[];
  green: ToneCurvePoint[];
  blue: ToneCurvePoint[];
}

export interface NoiseReductionSettings {
  luminance: number;
  luminanceDetail: number;
  luminanceContrast: number;
  color: number;
  colorDetail: number;
}

export interface GrainSettings {
  amount: number;
  size: number;
  frequency: number;
}

export interface CalibrationChannel {
  hue: number;
  saturation: number;
}

export interface CalibrationSettings {
  redPrimary: CalibrationChannel;
  greenPrimary: CalibrationChannel;
  bluePrimary: CalibrationChannel;
}

export interface PresetAdjustment {
  tone: ToneAdjustments;
  colorMix: ColorMixAdjustments;
  toneCurves: ToneCurveAdjustments;
  noiseReduction: NoiseReductionSettings;
  grain: GrainSettings;
  calibration: CalibrationSettings;
}

const createToneDefaults = (): ToneAdjustments => ({
  exposure: 0,
  contrast: 0,
  highlights: 0,
  shadows: 0,
  whites: 0,
  blacks: 0,
  saturation: 0,
  vibrance: 0,
  clarity: 0,
  dehaze: 0,
});

const createColorMap = (): Record<ColorChannel, number> =>
  COLOR_CHANNELS.reduce<Record<ColorChannel, number>>((acc, channel) => {
    acc[channel] = 0;
    return acc;
  }, {} as Record<ColorChannel, number>);

export const createEmptyPresetAdjustment = (): PresetAdjustment => ({
  tone: createToneDefaults(),
  colorMix: {
    hue: createColorMap(),
    saturation: createColorMap(),
    luminance: createColorMap(),
  },
  toneCurves: {
    master: [],
    red: [],
    green: [],
    blue: [],
  },
  noiseReduction: {
    luminance: 0,
    luminanceDetail: 50,
    luminanceContrast: 0,
    color: 0,
    colorDetail: 50,
  },
  grain: {
    amount: 0,
    size: 25,
    frequency: 50,
  },
  calibration: {
    redPrimary: { hue: 0, saturation: 0 },
    greenPrimary: { hue: 0, saturation: 0 },
    bluePrimary: { hue: 0, saturation: 0 },
  },
});

export const mergePresetAdjustment = (
  partial?: Partial<PresetAdjustment>
): PresetAdjustment => {
  const base = createEmptyPresetAdjustment();
  if (!partial) {
    return base;
  }

  base.tone = { ...base.tone, ...(partial.tone ?? {}) };

  COLOR_CHANNELS.forEach((channel) => {
    if (partial.colorMix?.hue?.[channel] !== undefined) {
      base.colorMix.hue[channel] = partial.colorMix.hue[channel];
    }
    if (partial.colorMix?.saturation?.[channel] !== undefined) {
      base.colorMix.saturation[channel] = partial.colorMix.saturation[channel];
    }
    if (partial.colorMix?.luminance?.[channel] !== undefined) {
      base.colorMix.luminance[channel] = partial.colorMix.luminance[channel];
    }
  });

  base.toneCurves = {
    master: partial.toneCurves?.master ?? base.toneCurves.master,
    red: partial.toneCurves?.red ?? base.toneCurves.red,
    green: partial.toneCurves?.green ?? base.toneCurves.green,
    blue: partial.toneCurves?.blue ?? base.toneCurves.blue,
  };

  base.noiseReduction = {
    ...base.noiseReduction,
    ...(partial.noiseReduction ?? {}),
  };

  base.grain = {
    ...base.grain,
    ...(partial.grain ?? {}),
  };

  base.calibration = {
    redPrimary: {
      ...base.calibration.redPrimary,
      ...(partial.calibration?.redPrimary ?? {}),
    },
    greenPrimary: {
      ...base.calibration.greenPrimary,
      ...(partial.calibration?.greenPrimary ?? {}),
    },
    bluePrimary: {
      ...base.calibration.bluePrimary,
      ...(partial.calibration?.bluePrimary ?? {}),
    },
  };

  return base;
};

export interface Preset {
  _id: string;
  name: string;
  previewUrl?: string;
  fileUrl?: string;
  scope: PresetScope;
  createdAt: string;
  updatedAt: string;
  adjustments?: PresetAdjustment;
}

export interface GetPresetsResponse {
  data: Preset[];
  error: string | null;
}
