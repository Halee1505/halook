import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { Image } from "expo-image";
import { useMemo } from "react";
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { Colors } from "@/constants/theme";
import { usePresetList } from "@/src/hooks/usePresets";
import type { Preset } from "@/src/models/presets";

type Props = {
  selectedId?: string;
  onSelect: (preset: Preset) => void;
};

const scopeBadgeStyles: Record<
  NonNullable<Preset["scope"]>,
  { backgroundColor: string; color: string; label: string }
> = {
  free: { backgroundColor: "rgba(6,78,59,0.8)", color: "#d1fae5", label: "Free" },
  pro: { backgroundColor: "#30e877", color: "#022c22", label: "Pro" },
  elite: { backgroundColor: "rgba(15,118,110,0.9)", color: "#ecfeff", label: "Elite" },
};

export const PresetList = ({ selectedId, onSelect }: Props) => {
  const { presets, loading, error, reload } = usePresetList();

  const content = useMemo(() => {
    if (loading && !presets.length) {
      return (
        <View style={styles.centered}>
          <ActivityIndicator color={palette.tint} />
          <Text style={styles.infoText}>Đang tải preset...</Text>
        </View>
      );
    }

    if (error) {
      return (
        <View style={styles.errorCard}>
          <Text style={styles.infoText}>Không thể tải preset. {error}</Text>
          <TouchableOpacity style={styles.primaryButton} onPress={reload}>
            <Text style={styles.primaryLabel}>Thử lại</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <FlatList
        data={presets}
        keyExtractor={(item) => item._id}
        numColumns={2}
        columnWrapperStyle={{ gap: 16 }}
        contentContainerStyle={{ paddingBottom: 24, gap: 16 }}
        renderItem={({ item }) => {
          const isSelected = item._id === selectedId;
          const scopeStyle = scopeBadgeStyles[item.scope ?? "free"];
          const isLocked = item.scope === "elite";

          return (
            <TouchableOpacity style={{ flex: 1 }} onPress={() => onSelect(item)}>
              <View style={[styles.card, isSelected && styles.cardSelected]}>
                <Image
                  source={
                    item.previewUrl
                      ? { uri: item.previewUrl }
                      : require("../../assets/images/icon.png")
                  }
                  style={styles.cardImage}
                />
                <View style={styles.cardGradient} />
                <View style={[styles.scopeBadge, { backgroundColor: scopeStyle.backgroundColor }]}>
                  <Text style={[styles.scopeLabel, { color: scopeStyle.color }]}>{scopeStyle.label}</Text>
                </View>
                {isLocked && (
                  <View style={styles.lockBadge}>
                    <MaterialIcons name="lock" size={16} color="#d1fae5" />
                  </View>
                )}
                <View style={styles.cardFooter}>
                  <Text style={styles.cardTitle}>{item.name}</Text>
                </View>
              </View>
            </TouchableOpacity>
          );
        }}
      />
    );
  }, [error, loading, onSelect, presets, reload, selectedId]);

  return <View>{content}</View>;
};

const palette = Colors.light;

const styles = StyleSheet.create({
  centered: {
    alignItems: "center",
    paddingVertical: 32,
    gap: 12,
  },
  infoText: {
    color: palette.text,
    fontWeight: "600",
  },
  errorCard: {
    backgroundColor: "rgba(255,255,255,0.9)",
    borderRadius: 24,
    padding: 20,
    gap: 12,
    borderWidth: 1,
    borderColor: palette.border,
  },
  primaryButton: {
    backgroundColor: palette.tint,
    borderRadius: 999,
    paddingVertical: 10,
    paddingHorizontal: 20,
    alignSelf: "flex-start",
  },
  primaryLabel: {
    color: "#fff",
    fontWeight: "700",
  },
  card: {
    position: "relative",
    borderRadius: 30,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    backgroundColor: "rgba(15,23,42,0.4)",
    aspectRatio: 4 / 5,
  },
  cardSelected: {
    borderColor: palette.tint,
    shadowColor: palette.tint,
    shadowOpacity: 0.35,
    shadowRadius: 25,
    shadowOffset: { width: 0, height: 16 },
  },
  cardImage: {
    ...StyleSheet.absoluteFillObject,
  },
  cardGradient: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(2, 6, 23, 0.35)",
  },
  scopeBadge: {
    position: "absolute",
    top: 12,
    right: 12,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  scopeLabel: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1.1,
    textTransform: "uppercase",
  },
  lockBadge: {
    position: "absolute",
    top: "45%",
    left: "45%",
    width: 42,
    height: 42,
    borderRadius: 999,
    backgroundColor: "rgba(6,78,59,0.7)",
    alignItems: "center",
    justifyContent: "center",
  },
  cardFooter: {
    position: "absolute",
    bottom: 14,
    left: 12,
    right: 12,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: "rgba(0,0,0,0.45)",
    alignItems: "center",
  },
  cardTitle: {
    color: "#fff",
    fontWeight: "700",
    textAlign: "center",
  },
});
