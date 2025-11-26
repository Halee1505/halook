import { useCanvasRef } from "@shopify/react-native-skia";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import {
  Alert,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from "react-native";

import { Colors } from "@/constants/theme";
import { EditorCanvas } from "@/src/components/EditorCanvas";
import { PresetList } from "@/src/components/PresetList";
import { useEditorState } from "@/src/hooks/useEditorState";
import { exportCanvasToCameraRoll } from "@/src/services/imageExporter";
import { BACKGROUND_OVERLAYS } from "@/src/services/imageLoader";
import { SafeAreaView } from "react-native-safe-area-context";

export default function EditorScreen() {
  const router = useRouter();
  const canvasRef = useCanvasRef();
  const imageUri = useEditorState((state) => state.imageUri);
  const adjustments = useEditorState((state) => state.adjustments);
  const applyPreset = useEditorState((state) => state.applyPreset);
  const currentPresetId = useEditorState((state) => state.preset?._id);

  const handleSave = async (navigateToShare = false) => {
    if (!imageUri) {
      Alert.alert("Chưa có ảnh", "Hãy chụp ảnh bằng camera Halook.");
      return;
    }

    try {
      const savedUri = await exportCanvasToCameraRoll(canvasRef);
      Alert.alert("Đã lưu", "Ảnh đã được lưu vào Camera Roll.");
      if (navigateToShare) {
        router.push({ pathname: "/share", params: { uri: savedUri } });
      }
    } catch (error) {
      Alert.alert(
        "Không thể lưu",
        error instanceof Error ? error.message : "Vui lòng thử lại."
      );
    }
  };
  const cropAspectRatio = useEditorState((s) => s.cropAspectRatio);
  const screenBackground = BACKGROUND_OVERLAYS[2];

  return (
    <SafeAreaView style={styles.container}>
      <Image source={screenBackground} style={styles.background} blurRadius={2} />
      <View style={styles.overlay} pointerEvents="none" />
       <View style={styles.canvasContent}>
       <EditorCanvas
          canvasRef={canvasRef}
          imageUri={imageUri}
          adjustments={adjustments}
          cropAspectRatio={cropAspectRatio}
        />

       </View>
        {!imageUri && (
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => router.push("/camera")}
          >
            <Text style={styles.primaryLabel}>Mở Camera</Text>
          </TouchableOpacity>
        )}

        <PresetList selectedId={currentPresetId} onSelect={applyPreset} />

        {/* <SliderPanel /> */}

        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.primaryButton, { flex: 1 }]}
            onPress={() => handleSave(false)}
          >
            <Text style={styles.primaryLabel}>Lưu ảnh</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.secondaryButton, { flex: 1 }]}
            onPress={() => handleSave(true)}
          >
            <Text style={styles.secondaryLabel}>Save & Share</Text>
          </TouchableOpacity>
        </View>
    </SafeAreaView>
  );
}

const palette = Colors.light;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: palette.background,
  },
  background: {
    ...StyleSheet.absoluteFillObject,
    width: "100%",
    height: "100%",
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(255, 255, 255, 0.104)",
  },
  canvasContent:{
    height: "100%",
    width:"100%",
    flex:1,
    display:"flex",
    justifyContent:"center",
    alignItems: "center",
    padding: 16
  },
  content: {
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
    opacity: 0.7,
  },
  primaryButton: {
    backgroundColor: palette.tint,
    borderRadius: 999,
    paddingVertical: 14,
    alignItems: "center",
  },
  primaryLabel: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 16,
  },
  secondaryButton: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: palette.tint,
    paddingVertical: 14,
    alignItems: "center",
    marginLeft: 12,
  },
  secondaryLabel: {
    color: palette.tint,
    fontWeight: "700",
    fontSize: 16,
  },
  actions: {
    backgroundColor:"#fff",
    padding: 16,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
  },
});
