import { useMemo } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import Slider from "@react-native-community/slider";

import { Colors } from "@/constants/theme";

type Props = {
  value: number;
  onChange: (value: number) => void;
  step?: number;
};

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

export const PresetIntensityBar = ({
  value,
  onChange,
  step = 0.05,
}: Props) => {
  const display = useMemo(() => Math.round(value * 100), [value]);

  const handleAdjust = (delta: number) => {
    const next = clamp(value + delta, 0, 1);
    onChange(parseFloat(next.toFixed(3)));
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.button} onPress={() => handleAdjust(-step)}>
        <Text style={styles.buttonLabel}>-</Text>
      </TouchableOpacity>

      <View style={styles.sliderArea}>
        <Slider
          value={value}
          minimumValue={0}
          maximumValue={1}
          step={step}
          minimumTrackTintColor={palette.tint}
          maximumTrackTintColor={palette.border}
          thumbTintColor="#fff"
          onValueChange={(next) => onChange(parseFloat(next.toFixed(3)))}
          style={styles.slider}
        />
        <Text style={styles.valueText} selectable={false}>
          {display}%
        </Text>
      </View>

      <TouchableOpacity style={styles.button} onPress={() => handleAdjust(step)}>
        <Text style={styles.buttonLabel}>+</Text>
      </TouchableOpacity>
    </View>
  );
};

const palette = Colors.light;

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  button: {
    width: 48,
    height: 44,
    borderRadius: 12,
    backgroundColor: palette.card,
    borderWidth: 1,
    borderColor: palette.border,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonLabel: {
    fontSize: 18,
    fontWeight: "700",
    color: palette.text,
  },
  sliderArea: {
    flex: 1,
    gap: 8,
  },
  slider: {
    width: "100%",
  },
  valueText: {
    fontWeight: "700",
    color: palette.text,
    letterSpacing: 0.2,
    alignSelf: "flex-end",
  },
});
