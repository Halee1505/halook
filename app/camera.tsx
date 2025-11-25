import { useRouter } from "expo-router";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { Colors } from "@/constants/theme";
import { CameraView } from "@/src/components/CameraView";
import { useEditorState } from "@/src/hooks/useEditorState";

export default function CameraScreen() {
  const router = useRouter();
  const setImageUri = useEditorState((state) => state.setImageUri);
  const resetAdjustments = useEditorState((state) => state.resetAdjustments);

  const handleCapture = (uri: string) => {
    setImageUri(uri);
    resetAdjustments();
    router.push("/editor");
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={{ gap: 8 }}>
        <Text style={styles.title}>Studio Camera</Text>
        <Text style={styles.subtitle}>
          Chụp nhanh những khoảnh khắc tốt nhất với tông màu Halook.
        </Text>
      </View>

      <CameraView onCapture={handleCapture} onPickLatest={handleCapture} />

      <TouchableOpacity
        style={styles.secondaryButton}
        onPress={() => router.push("/editor")}
      >
        <Text style={styles.secondaryLabel}>Mở Editor</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const palette = Colors.light;

const styles = StyleSheet.create({
  container: {
    padding: 24,
    gap: 24,
  },
  title: {
    fontSize: 32,
    fontWeight: "800",
    color: palette.text,
  },
  subtitle: {
    color: palette.text,
    opacity: 0.8,
  },
  secondaryButton: {
    borderRadius: 999,
    backgroundColor: palette.background,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: palette.border,
  },
  secondaryLabel: {
    color: palette.text,
    textAlign: "center",
    fontWeight: "700",
  },
});
