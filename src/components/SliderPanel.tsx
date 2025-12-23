import { useEffect, useMemo, useState } from 'react';
import { LayoutChangeEvent, StyleSheet, Text, View } from 'react-native';
import Animated, { runOnJS, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';

import { useEditorState } from '@/src/hooks/useEditorState';
import { adjustmentRanges } from '@/src/engine/presetMath';
import type { AdjustmentKey } from '@/src/models/editor';
import { Colors } from '@/constants/theme';

const sliderConfig: Record<
  AdjustmentKey,
  { label: string; description: string; accent: string; suffix?: string }
> = {
  exposure: { label: 'Exposure', description: 'Light balance', accent: '#ffd166', suffix: 'ev' },
  contrast: { label: 'Contrast', description: 'Depth + clarity', accent: '#06d6a0' },
  highlights: { label: 'Highlights', description: 'Bright detail', accent: '#118ab2' },
  shadows: { label: 'Shadows', description: 'Dark detail', accent: '#073b4c' },
  saturation: { label: 'Saturation', description: 'Color richness', accent: '#ef476f' },
  vibrance: { label: 'Vibrance', description: 'Subtle color', accent: '#ffa69e' },
  temperature: { label: 'Temperature', description: 'Warm ↔ Cool', accent: '#f4a261' },
  tint: { label: 'Tint', description: 'Magenta ↔ Green', accent: '#81b29a' },
  mixerHue: { label: 'Hue Mixer', description: 'Rotate colors', accent: '#9b5de5' },
  mixerSaturation: { label: 'Mixer Saturation', description: 'Mix intensity', accent: '#f15bb5' },
  mixerLuminance: { label: 'Mixer Luminance', description: 'Mix brightness', accent: '#00bbf9' },
  gradingShadows: { label: 'Grade Shadows', description: 'Lift/darken lows', accent: '#3a86ff' },
  gradingMidtones: { label: 'Grade Midtones', description: 'Shape mids', accent: '#7ac74f' },
  gradingHighlights: { label: 'Grade Highlights', description: 'Tone highs', accent: '#ffb703' },
};

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

type SliderProps = {
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
  accent: string;
};

const SliderTrack = ({ value, min, max, onChange, accent }: SliderProps) => {
  const [width, setWidth] = useState(0);
  const progress = useSharedValue(0);
  const start = useSharedValue(0);

  useEffect(() => {
    const ratio = (value - min) / (max - min);
    progress.value = withTiming(clamp(ratio, 0, 1), { duration: 120 });
  }, [max, min, progress, value]);

  const onLayout = (event: LayoutChangeEvent) => {
    setWidth(event.nativeEvent.layout.width);
  };

  const gesture = useMemo(
    () =>
      Gesture.Pan()
        .onBegin(() => {
          start.value = progress.value * width;
        })
        .onChange((event) => {
          if (!width) {
            return;
          }
          const next = clamp(start.value + event.changeX, 0, width);
          const ratio = next / width;
          progress.value = ratio;
          runOnJS(onChange)(min + ratio * (max - min));
        }),
    [max, min, onChange, progress, start, width],
  );

  const fillStyle = useAnimatedStyle(() => ({
    width: width * progress.value,
    backgroundColor: accent,
  }));

  const thumbStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: width * progress.value }],
  }));

  return (
    <GestureDetector gesture={gesture}>
      <View style={styles.sliderContainer}>
        <View style={styles.track} onLayout={onLayout}>
          <Animated.View style={[styles.trackFill, { backgroundColor: accent }, fillStyle]} />
        </View>
        <Animated.View style={[styles.thumb, { borderColor: accent }, thumbStyle]} />
      </View>
    </GestureDetector>
  );
};

export const SliderPanel = () => {
  const adjustments = useEditorState((state) => state.adjustments);
  const updateAdjustment = useEditorState((state) => state.updateAdjustment);

  return (
    <View style={{ gap: 16 }}>
      {(Object.keys(adjustments) as AdjustmentKey[]).map((key) => {
        const config = sliderConfig[key];
        const range = adjustmentRanges[key];
        const value = adjustments[key];
        return (
          <View key={key} style={styles.card}>
            <View style={styles.cardHeader}>
              <View>
                <Text style={styles.cardTitle}>{config.label}</Text>
                <Text style={styles.cardDesc}>{config.description}</Text>
              </View>
              <Text style={styles.cardValue}>
                {value.toFixed(2)}
                {config.suffix ? ` ${config.suffix}` : ''}
              </Text>
            </View>
            <SliderTrack
              value={value}
              min={range.min}
              max={range.max}
              accent={config.accent}
              onChange={(next) => updateAdjustment(key, next)}
            />
          </View>
        );
      })}
    </View>
  );
};

const palette = Colors.light;

const styles = StyleSheet.create({
  card: {
    backgroundColor: palette.card,
    borderRadius: 24,
    padding: 16,
    gap: 8,
    borderWidth: 1,
    borderColor: palette.border,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardTitle: {
    fontWeight: '700',
    color: palette.text,
  },
  cardDesc: {
    color: palette.icon,
    fontSize: 12,
  },
  cardValue: {
    fontWeight: '700',
    color: palette.text,
  },
  sliderContainer: {
    gap: 6,
  },
  track: {
    backgroundColor: '#e3efe7',
    height: 6,
    borderRadius: 999,
    overflow: 'hidden',
    alignItems: 'flex-start',
  },
  trackFill: {
    height: '100%',
    borderRadius: 999,
  },
  thumb: {
    width: 26,
    height: 26,
    borderRadius: 999,
    backgroundColor: '#fff',
    borderWidth: 2,
    marginTop: -16,
  },
});
