import { Colors } from "@/constants/theme";
import { EditorCanvas } from "@/src/components/EditorCanvas";
import { PresetList } from "@/src/components/PresetList";
import { useEditorState } from "@/src/hooks/useEditorState";
import { exportCanvasToCameraRoll } from "@/src/services/imageExporter";
import AntDesign from "@expo/vector-icons/AntDesign";
import Feather from "@expo/vector-icons/Feather";
import { useCanvasRef } from "@shopify/react-native-skia";
import { useRouter } from "expo-router";
import { Alert, StyleSheet, TouchableOpacity, View } from "react-native";
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
      Alert.alert(
        "Lưu thành công",
        "Ảnh Halook của bạn đã có trong Camera Roll và sẵn sàng chia sẻ."
      );
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

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.overlay} pointerEvents="none" />
      <View style={styles.canvasContent}>
        <EditorCanvas
          canvasRef={canvasRef}
          imageUri={imageUri}
          adjustments={adjustments}
          cropAspectRatio={cropAspectRatio}
        />
      </View>
      <View style={styles.content}>
        <PresetList selectedId={currentPresetId} onSelect={applyPreset} />
      </View>

      {/* <SliderPanel /> */}

      <View style={styles.actions}>
        <TouchableOpacity style={styles.btn} onPress={() => handleSave(false)}>
          <Feather name="save" size={24} color="black" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.btn} onPress={() => handleSave(true)}>
          <AntDesign name="share-alt" size={24} color="black" />
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
    resizeMode: "cover",
    bottom: 0,
    top: 0,
    left: 0,
    right: 0,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(255, 255, 255, 0.104)",
  },
  canvasContent: {
    height: "100%",
    width: "100%",
    flex: 1,
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
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
  btn: {
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  actions: {
    padding: 16,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    position: "absolute",
    gap: 16,
    top: 32,
    right: 12,
  },
});
