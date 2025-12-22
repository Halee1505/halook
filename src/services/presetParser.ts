import axios from 'axios';

import {
  COLOR_CHANNELS,
  createEmptyPresetAdjustment,
  mergePresetAdjustment,
  type ColorChannel,
  type PresetAdjustment,
} from '@/src/models/presets';
import {
  buildPresetFromEditorAdjustments,
  deriveAdjustmentsFromSeed,
} from '@/src/engine/presetMath';

const COLOR_LABELS: Record<ColorChannel, string> = {
  red: 'Red',
  orange: 'Orange',
  yellow: 'Yellow',
  green: 'Green',
  aqua: 'Aqua',
  blue: 'Blue',
  purple: 'Purple',
  magenta: 'Magenta',
};

const ATTRIBUTE_REGEX = /([a-zA-Z0-9:]+)\s*=\s*"([^"]+)"/g;

const parseNumber = (value?: string, fallback = 0) => {
  if (value === undefined) {
    return fallback;
  }
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
};

const extractAttributes = (payload: string) => {
  const attributes: Record<string, string> = {};
  let match: RegExpExecArray | null;
  while ((match = ATTRIBUTE_REGEX.exec(payload))) {
    attributes[match[1]] = match[2];
  }
  return attributes;
};

const parseCurvePoints = (payload: string, tag: string) => {
  const regex = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\/${tag}>`, 'i');
  const match = payload.match(regex);
  if (!match) {
    return [];
  }

  const points: { input: number; output: number }[] = [];
  const itemRegex = /<rdf:li>([^<]+)<\/rdf:li>/gi;
  let itemMatch: RegExpExecArray | null;
  while ((itemMatch = itemRegex.exec(match[1]))) {
    const [input, output] = itemMatch[1]
      .split(',')
      .map((token) => Number(token.trim()));
    if (Number.isFinite(input) && Number.isFinite(output)) {
      points.push({ input, output });
    }
  }

  return points;
};

export const fetchPresetPayload = async (fileUrl?: string): Promise<string | null> => {
  if (!fileUrl) {
    return null;
  }

  try {
    const response = await axios.get<string>(fileUrl);
    return response.data ?? null;
  } catch {
    return null;
  }
};

const parseJsonPreset = (payload: string): PresetAdjustment | null => {
  try {
    const parsed = JSON.parse(payload);

    if (parsed?.adjustments) {
      return mergePresetAdjustment(parsed.adjustments);
    }

    if (parsed?.tone || parsed?.colorMix || parsed?.toneCurves) {
      return mergePresetAdjustment(parsed as Partial<PresetAdjustment>);
    }
  } catch {
    // ignore non JSON payload
  }
  return null;
};

const parseXmpPreset = (payload: string): PresetAdjustment | null => {
  const attributes = extractAttributes(payload);
  const preset = createEmptyPresetAdjustment();
  let hasData = false;

  const assign = (keys: string[], setter: (value: number) => void) => {
    const rawKey = keys.find((key) => attributes[key] !== undefined);
    if (rawKey === undefined) {
      return;
    }
    setter(parseNumber(attributes[rawKey]));
    hasData = true;
  };

  assign(['crs:Exposure2012', 'Exposure2012'], (value) => {
    preset.tone.exposure = value;
  });
  assign(['crs:Contrast2012', 'Contrast2012'], (value) => {
    preset.tone.contrast = value;
  });
  assign(['crs:Highlights2012', 'Highlights2012'], (value) => {
    preset.tone.highlights = value;
  });
  assign(['crs:Shadows2012', 'Shadows2012'], (value) => {
    preset.tone.shadows = value;
  });
  assign(['crs:Whites2012', 'Whites2012'], (value) => {
    preset.tone.whites = value;
  });
  assign(['crs:Blacks2012', 'Blacks2012'], (value) => {
    preset.tone.blacks = value;
  });
  assign(['crs:Saturation', 'Saturation'], (value) => {
    preset.tone.saturation = value;
  });
  assign(['crs:Vibrance', 'Vibrance'], (value) => {
    preset.tone.vibrance = value;
  });
  assign(['crs:Clarity2012', 'Clarity2012'], (value) => {
    preset.tone.clarity = value;
  });
  assign(['crs:Dehaze', 'Dehaze'], (value) => {
    preset.tone.dehaze = value;
  });

  assign(['crs:GrainAmount'], (value) => {
    preset.grain.amount = value;
  });
  assign(['crs:GrainSize'], (value) => {
    preset.grain.size = value;
  });
  assign(['crs:GrainFrequency'], (value) => {
    preset.grain.frequency = value;
  });

  assign(['crs:ColorNoiseReduction'], (value) => {
    preset.noiseReduction.color = value;
  });
  assign(['crs:ColorNoiseReductionDetail'], (value) => {
    preset.noiseReduction.colorDetail = value;
  });
  assign(['crs:LuminanceSmoothing'], (value) => {
    preset.noiseReduction.luminance = value;
  });
  assign(['crs:LuminanceNoiseReductionDetail'], (value) => {
    preset.noiseReduction.luminanceDetail = value;
  });
  assign(['crs:LuminanceNoiseReductionContrast'], (value) => {
    preset.noiseReduction.luminanceContrast = value;
  });

  assign(['crs:RedHue'], (value) => {
    preset.calibration.redPrimary.hue = value;
  });
  assign(['crs:RedSaturation'], (value) => {
    preset.calibration.redPrimary.saturation = value;
  });
  assign(['crs:GreenHue'], (value) => {
    preset.calibration.greenPrimary.hue = value;
  });
  assign(['crs:GreenSaturation'], (value) => {
    preset.calibration.greenPrimary.saturation = value;
  });
  assign(['crs:BlueHue'], (value) => {
    preset.calibration.bluePrimary.hue = value;
  });
  assign(['crs:BlueSaturation'], (value) => {
    preset.calibration.bluePrimary.saturation = value;
  });

  COLOR_CHANNELS.forEach((channel) => {
    const label = COLOR_LABELS[channel];
    const hueKey = `crs:HueAdjustment${label}`;
    if (attributes[hueKey] !== undefined) {
      preset.colorMix.hue[channel] = parseNumber(attributes[hueKey]);
      hasData = true;
    }

    const saturationKey = `crs:SaturationAdjustment${label}`;
    if (attributes[saturationKey] !== undefined) {
      preset.colorMix.saturation[channel] = parseNumber(attributes[saturationKey]);
      hasData = true;
    }

    const luminanceKey = `crs:LuminanceAdjustment${label}`;
    if (attributes[luminanceKey] !== undefined) {
      preset.colorMix.luminance[channel] = parseNumber(attributes[luminanceKey]);
      hasData = true;
    }
  });

  const toneCurve = parseCurvePoints(payload, 'crs:ToneCurvePV2012');
  if (toneCurve.length) {
    preset.toneCurves.master = toneCurve;
    hasData = true;
  }

  const redCurve = parseCurvePoints(payload, 'crs:ToneCurvePV2012Red');
  if (redCurve.length) {
    preset.toneCurves.red = redCurve;
    hasData = true;
  }

  const greenCurve = parseCurvePoints(payload, 'crs:ToneCurvePV2012Green');
  if (greenCurve.length) {
    preset.toneCurves.green = greenCurve;
    hasData = true;
  }

  const blueCurve = parseCurvePoints(payload, 'crs:ToneCurvePV2012Blue');
  if (blueCurve.length) {
    preset.toneCurves.blue = blueCurve;
    hasData = true;
  }

  return hasData ? preset : null;
};

const buildSeedPreset = (seed: string): PresetAdjustment => {
  const derived = deriveAdjustmentsFromSeed(seed);
  return buildPresetFromEditorAdjustments(derived);
};

export const parsePresetPayload = (payload: string, fallbackSeed = ''): PresetAdjustment => {
  const fromJson = parseJsonPreset(payload);
  if (fromJson) {
    return fromJson;
  }

  const fromXmp = parseXmpPreset(payload);
  if (fromXmp) {
    return fromXmp;
  }

  return buildSeedPreset(fallbackSeed);
};

export const loadPresetAdjustments = async (fileUrl?: string, fallbackSeed = '') => {
  const payload = await fetchPresetPayload(fileUrl);
  if (!payload) {
    return buildSeedPreset(fallbackSeed);
  }

  return parsePresetPayload(payload, fallbackSeed);
};
