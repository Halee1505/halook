// presetMath.ts
import type { AdjustmentKey, EditorAdjustments } from "@/src/models/editor";
import {
  COLOR_CHANNELS,
  createEmptyPresetAdjustment,
  type ColorMixAdjustments,
  type PresetAdjustment,
  type ToneAdjustments,
} from "@/src/models/presets";

export const adjustmentRanges: Record<
  AdjustmentKey,
  { min: number; max: number; step: number }
> = {
  exposure: { min: -2, max: 2, step: 0.1 },
  contrast: { min: 0.5, max: 2, step: 0.05 },
  highlights: { min: -1, max: 1, step: 0.05 },
  shadows: { min: -1, max: 1, step: 0.05 },
  saturation: { min: 0.2, max: 2, step: 0.05 },
  vibrance: { min: -1, max: 1, step: 0.05 },
  temperature: { min: -2, max: 2, step: 0.05 },
  tint: { min: -2, max: 2, step: 0.05 },
  mixerHue: { min: -0.5, max: 0.5, step: 0.01 },
  mixerSaturation: { min: -1, max: 1, step: 0.05 },
  mixerLuminance: { min: -0.5, max: 0.5, step: 0.02 },
  gradingShadows: { min: -0.5, max: 0.5, step: 0.02 },
  gradingMidtones: { min: -0.5, max: 0.5, step: 0.02 },
  gradingHighlights: { min: -0.5, max: 0.5, step: 0.02 },
};

export const defaultAdjustments: EditorAdjustments = {
  exposure: 0,
  contrast: 1,
  highlights: 0,
  shadows: 0,
  saturation: 1,
  vibrance: 0,
  temperature: 0,
  tint: 0,
  mixerHue: 0,
  mixerSaturation: 0,
  mixerLuminance: 0,
  gradingShadows: 0,
  gradingMidtones: 0,
  gradingHighlights: 0,
};

const createColorMixTemplate = (): ColorMixAdjustments => {
  const base = createEmptyPresetAdjustment().colorMix;
  return {
    hue: { ...base.hue },
    saturation: { ...base.saturation },
    luminance: { ...base.luminance },
  };
};

export const defaultColorMix = createColorMixTemplate();

export const createDefaultColorMix = (): ColorMixAdjustments => ({
  hue: { ...defaultColorMix.hue },
  saturation: { ...defaultColorMix.saturation },
  luminance: { ...defaultColorMix.luminance },
});

export const cloneColorMix = (
  mix: ColorMixAdjustments = defaultColorMix
): ColorMixAdjustments => ({
  hue: { ...mix.hue },
  saturation: { ...mix.saturation },
  luminance: { ...mix.luminance },
});

const colorFieldToRangeKey = (
  field: "hue" | "saturation" | "luminance"
): AdjustmentKey => {
  switch (field) {
    case "saturation":
      return "mixerSaturation";
    case "luminance":
      return "mixerLuminance";
    default:
      return "mixerHue";
  }
};

export const clampColorMixValue = (
  field: "hue" | "saturation" | "luminance",
  value: number
) => {
  const rangeKey = colorFieldToRangeKey(field);
  const range = adjustmentRanges[rangeKey];
  const safe = Number.isFinite(value) ? value : 0;
  return Math.min(range.max, Math.max(range.min, safe));
};

// Basic XMP subset used for mapping into EditorAdjustments
export interface XmpBasicSettings {
  Exposure2012?: number; // crs:Exposure2012
  Contrast2012?: number; // crs:Contrast2012
  Highlights2012?: number; // crs:Highlights2012
  Shadows2012?: number; // crs:Shadows2012
  Saturation?: number; // crs:Saturation
  Vibrance?: number; // crs:Vibrance
}

export const clampAdjustment = (key: AdjustmentKey, value: number) => {
  const range = adjustmentRanges[key];
  const safeValue = Number.isFinite(value) ? value : defaultAdjustments[key];
  return Math.min(range.max, Math.max(range.min, safeValue));
};

export const normalizeAdjustments = (
  adjustments?: Partial<EditorAdjustments>
): EditorAdjustments => {
  if (!adjustments) {
    return { ...defaultAdjustments };
  }

  return (Object.keys(defaultAdjustments) as AdjustmentKey[]).reduce(
    (acc, key) => {
      const value = adjustments[key];
      acc[key] = clampAdjustment(key, value ?? defaultAdjustments[key]);
      return acc;
    },
    {} as EditorAdjustments
  );
};

export const buildColorMixFromPreset = (
  preset?: PresetAdjustment
): ColorMixAdjustments => {
  const mix = createDefaultColorMix();
  if (!preset?.colorMix) {
    return mix;
  }

  COLOR_CHANNELS.forEach((channel) => {
    // XMP values are -100 to +100
    // Hue: -100 to +100 -> -0.5 to +0.5 (as per adjustmentRanges)
    mix.hue[channel] = clampColorMixValue(
      "hue",
      (preset.colorMix.hue[channel] ?? 0) / 200
    );
    // Saturation: -100 to +100 -> -1 to +1
    mix.saturation[channel] = clampColorMixValue(
      "saturation",
      (preset.colorMix.saturation[channel] ?? 0) / 100
    );
    // Luminance: -100 to +100 -> -0.5 to +0.5
    mix.luminance[channel] = clampColorMixValue(
      "luminance",
      (preset.colorMix.luminance[channel] ?? 0) / 200
    );
  });

  return mix;
};

const toneToEditorAdjustments = (tone: ToneAdjustments): EditorAdjustments => ({
  exposure: tone.exposure,
  contrast: 1 + tone.contrast / 100,
  highlights: tone.highlights / 100,
  shadows: tone.shadows / 100,
  saturation: 1 + tone.saturation / 100,
  vibrance: tone.vibrance / 100,
  temperature: 0,
  tint: 0,
  mixerHue: 0,
  mixerSaturation: 0,
  mixerLuminance: 0,
  gradingShadows: 0,
  gradingMidtones: 0,
  gradingHighlights: 0,
});

const editorToToneAdjustments = (
  adjustments: EditorAdjustments
): ToneAdjustments => ({
  exposure: adjustments.exposure,
  contrast: (adjustments.contrast - 1) * 100,
  highlights: adjustments.highlights * 100,
  shadows: adjustments.shadows * 100,
  whites: 0,
  blacks: 0,
  saturation: (adjustments.saturation - 1) * 100,
  vibrance: adjustments.vibrance * 100,
  clarity: 0,
  dehaze: 0,
});

export const buildEditorAdjustmentsFromPreset = (
  preset?: PresetAdjustment
): EditorAdjustments => {
  if (!preset) {
    return { ...defaultAdjustments };
  }

  return normalizeAdjustments(toneToEditorAdjustments(preset.tone));
};

export const buildPresetFromEditorAdjustments = (
  adjustments: EditorAdjustments
): PresetAdjustment => {
  const preset = createEmptyPresetAdjustment();
  preset.tone = {
    ...preset.tone,
    ...editorToToneAdjustments(adjustments),
  };
  return preset;
};

export const deriveAdjustmentsFromSeed = (seed: string): EditorAdjustments => {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) % 100000;
  }

  const rangeToValue = (key: AdjustmentKey, offset: number) => {
    const { min, max } = adjustmentRanges[key];
    const normalized = (Math.sin(hash + offset) + 1) / 2; // 0..1
    const raw = min + normalized * (max - min);
    return clampAdjustment(key, raw);
  };

  return {
    exposure: rangeToValue("exposure", 0.13),
    contrast: rangeToValue("contrast", 0.35),
    highlights: rangeToValue("highlights", 0.57),
    shadows: rangeToValue("shadows", 0.79),
    saturation: rangeToValue("saturation", 0.91),
    vibrance: rangeToValue("vibrance", 1.11),
    temperature: 0,
    tint: 0,
    mixerHue: 0,
    mixerSaturation: 0,
    mixerLuminance: 0,
    gradingShadows: 0,
    gradingMidtones: 0,
    gradingHighlights: 0,
  };
};

// Map Lightroom/Photoshop XMP sliders to our normalized EditorAdjustments
export const mapXmpToAdjustments = (
  xmp: XmpBasicSettings
): EditorAdjustments => {
  const exposure = clampAdjustment("exposure", xmp.Exposure2012 ?? 0);

  const contrastSlider = xmp.Contrast2012 ?? 0; // -100..100
  const contrastFactor = 1 + contrastSlider / 100; // -> 0..2
  const contrast = clampAdjustment("contrast", contrastFactor);

  const highlights = clampAdjustment(
    "highlights",
    (xmp.Highlights2012 ?? 0) / 100
  );

  const shadows = clampAdjustment("shadows", (xmp.Shadows2012 ?? 0) / 100);

  const saturationSlider = xmp.Saturation ?? 0; // -100..100
  const saturationFactor = 1 + saturationSlider / 100; // -> 0..2
  const saturation = clampAdjustment("saturation", saturationFactor);

  const vibrance = clampAdjustment("vibrance", (xmp.Vibrance ?? 0) / 100);

  return {
    exposure,
    contrast,
    highlights,
    shadows,
    saturation,
    vibrance,
    temperature: 0,
    tint: 0,
    mixerHue: 0,
    mixerSaturation: 0,
    mixerLuminance: 0,
    gradingShadows: 0,
    gradingMidtones: 0,
    gradingHighlights: 0,
  };
};

export const buildShaderUniforms = (
  adjustments: EditorAdjustments,
  colorMix: ColorMixAdjustments
) => {
  const hueEntries = COLOR_CHANNELS.map((channel) => colorMix.hue[channel]);
  const satEntries = COLOR_CHANNELS.map(
    (channel) => colorMix.saturation[channel]
  );
  const lumEntries = COLOR_CHANNELS.map(
    (channel) => colorMix.luminance[channel]
  );

  return {
    uExposure: adjustments.exposure,
    uContrast: adjustments.contrast,
    uHighlights: adjustments.highlights,
    uShadows: adjustments.shadows,
    uSaturation: adjustments.saturation,
    uVibrance: adjustments.vibrance,
    uTemperature: adjustments.temperature,
    uTint: adjustments.tint,
    uMixerHue: adjustments.mixerHue,
    uMixerSaturation: adjustments.mixerSaturation,
    uMixerLuminance: adjustments.mixerLuminance,
    uGradeShadows: adjustments.gradingShadows,
    uGradeMidtones: adjustments.gradingMidtones,
    uGradeHighlights: adjustments.gradingHighlights,
    uColorMixHue0: hueEntries[0],
    uColorMixHue1: hueEntries[1],
    uColorMixHue2: hueEntries[2],
    uColorMixHue3: hueEntries[3],
    uColorMixHue4: hueEntries[4],
    uColorMixHue5: hueEntries[5],
    uColorMixHue6: hueEntries[6],
    uColorMixHue7: hueEntries[7],
    uColorMixSaturation0: satEntries[0],
    uColorMixSaturation1: satEntries[1],
    uColorMixSaturation2: satEntries[2],
    uColorMixSaturation3: satEntries[3],
    uColorMixSaturation4: satEntries[4],
    uColorMixSaturation5: satEntries[5],
    uColorMixSaturation6: satEntries[6],
    uColorMixSaturation7: satEntries[7],
    uColorMixLuminance0: lumEntries[0],
    uColorMixLuminance1: lumEntries[1],
    uColorMixLuminance2: lumEntries[2],
    uColorMixLuminance3: lumEntries[3],
    uColorMixLuminance4: lumEntries[4],
    uColorMixLuminance5: lumEntries[5],
    uColorMixLuminance6: lumEntries[6],
    uColorMixLuminance7: lumEntries[7],
  };
};

const clampIntensity = (value: number) =>
  Math.min(1, Math.max(0, Number.isFinite(value) ? value : 1));

export const applyPresetIntensity = (
  adjustments: EditorAdjustments,
  intensity: number
): EditorAdjustments => {
  const t = clampIntensity(intensity);
  return (Object.keys(defaultAdjustments) as AdjustmentKey[]).reduce(
    (acc, key) => {
      const base = defaultAdjustments[key];
      const target = adjustments[key];
      const mixed = base + (target - base) * t;
      acc[key] = clampAdjustment(key, mixed);
      return acc;
    },
    {} as EditorAdjustments
  );
};

export const applyColorMixIntensity = (
  mix: ColorMixAdjustments,
  intensity: number
): ColorMixAdjustments => {
  const t = clampIntensity(intensity);
  const next = createDefaultColorMix();
  COLOR_CHANNELS.forEach((channel) => {
    next.hue[channel] =
      defaultColorMix.hue[channel] +
      (mix.hue[channel] - defaultColorMix.hue[channel]) * t;
    next.saturation[channel] =
      defaultColorMix.saturation[channel] +
      (mix.saturation[channel] - defaultColorMix.saturation[channel]) * t;
    next.luminance[channel] =
      defaultColorMix.luminance[channel] +
      (mix.luminance[channel] - defaultColorMix.luminance[channel]) * t;
  });
  return next;
};
