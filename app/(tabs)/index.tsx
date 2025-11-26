import { useRouter } from "expo-router";
import { ScrollView, StyleSheet } from "react-native";

import { Colors } from "@/constants/theme";
import { CameraView } from "@/src/components/CameraView";
import { useEditorState } from "@/src/hooks/useEditorState";

export default function HomeScreen() {
  const router = useRouter();
  const setImageUri = useEditorState((state) => state.setImageUri);
  const resetAdjustments = useEditorState((state) => state.resetAdjustments);

  const handleCapture = (uri: string ) => {
    setImageUri(uri);
    resetAdjustments();
    router.push("/editor");
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <CameraView onCapture={handleCapture} onPickLatest={handleCapture} />
    </ScrollView>
  );
}

const palette = Colors.light;

const styles = StyleSheet.create({
  container: {
    padding: 24,
    gap: 24,
  },
  hero: {
    gap: 8,
  },
  title: {
    fontSize: 32,
    fontWeight: "800",
    color: palette.text,
  },
  subtitle: {
    color: palette.text,
    opacity: 0.7,
    lineHeight: 20,
  },
  footerCard: {
    backgroundColor: "#fff",
    borderRadius: 28,
    padding: 20,
    gap: 12,
    borderWidth: 1,
    borderColor: palette.border,
  },
  footerTitle: {
    fontWeight: "700",
    color: palette.text,
    fontSize: 18,
  },
  footerText: {
    color: palette.text,
    opacity: 0.75,
    lineHeight: 20,
  },
  secondaryButton: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: palette.tint,
    paddingVertical: 12,
    alignItems: "center",
  },
  secondaryLabel: {
    color: palette.tint,
    fontWeight: "700",
  },
});
