import { useRouter } from "expo-router";

import { CameraView } from "@/src/components/CameraView";
import { useEditorState } from "@/src/hooks/useEditorState";

export default function HomeScreen() {
  const router = useRouter();
  const setImageUri = useEditorState((state) => state.setImageUri);
  const resetAdjustments = useEditorState((state) => state.resetAdjustments);

  const handleCapture = (uri: string) => {
    setImageUri(uri);
    resetAdjustments();
    router.push("/editor");
  };

  return <CameraView onCapture={handleCapture} onPickLatest={handleCapture} />;
}
