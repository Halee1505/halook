# Halook -- agents.md

## 1. Overview

Halook là ứng dụng **Expo (React Native)** cho iOS/Android, tập trung
vào:

- Chụp ảnh bằng camera tích hợp.
- Import ảnh từ thư viện máy.
- Áp preset màu lấy từ API backend.
- Chỉnh sửa ảnh realtime bằng GPU (React Native Skia).
- Lưu ảnh đã chỉnh về máy.
- Chia sẻ ảnh dạng Story lên Instagram, Facebook, Threads.
- Hỗ trợ background overlay từ thư mục `assets/background/`.

## 2. Tech Stack

### Runtime

- Expo Managed Workflow
- TypeScript

### Core Libraries

- expo-camera
- expo-file-system
- expo-media-library
- expo-sharing
- @shopify/react-native-skia
- react-native-reanimated
- react-native-gesture-handler
- axios (optional)
- zustand (optional)

## 3. API Presets

### Endpoint

GET https://halook-dashboard.vercel.app/api/client/presets

### Response

```ts
type PresetScope = "free" | "pro" | "elite";

interface Preset {
  _id: string;
  name: string;
  previewUrl?: string;
  fileUrl?: string;
  scope: PresetScope;
  createdAt: string;
  updatedAt: string;
}

type GetPresetsResponse = {
  data: Preset[];
  error: string | null;
};
```

## 4. Functional Requirements

### Camera

- Capture photo → uri
- Switch front/back
- Flash
- Navigate to Editor

### Editor

- Load ảnh bằng Skia
- Apply preset (exposure, contrast, highlights, shadows, saturation,
  vibrance)
- Sliders sử dụng Reanimated
- Gesture zoom/pan (GH)
- Background overlay từ assets/background/

### Save

- Snapshot canvas → encode JPEG → save vào Camera Roll

### Share

- Share sheet native → Instagram/Facebook/Threads

## 5. Folder Structure

    Halook/
      app/
        camera.tsx
        editor.tsx
        share.tsx
        presets.tsx

      assets/
        background/
          bg1.jpg
          bg2.jpg
          bg3.jpg

      src/
        api/
          presetsApi.ts
        models/
          presets.ts
          editor.ts
        hooks/
          usePresets.ts
          useEditorState.ts
        services/
          presetParser.ts
          imageLoader.ts
          imageExporter.ts
          shareService.ts
        engine/
          presetEngineSkia.ts
          presetMath.ts
        components/
          CameraView.tsx
          PresetList.tsx
          BackgroundList.tsx
          EditorCanvas.tsx
          SliderPanel.tsx
          ShareOptions.tsx

## 6. Rendering Pipeline (Skia)

Input (ImageUri) → Skia decode\
Apply preset shader → Apply background → Canvas\
Snapshot → Export JPEG → Save → Share

## 7. Shader Uniforms

    uExposure
    uContrast
    uSaturation
    uVibrance
    uHighlights
    uShadows
    uImage
    uBackground

## 8. Codex Tasks

Codex cần tạo:

1.  Preset API client + hook
2.  Preset parser (XMP/JSON)
3.  Editor state manager (Zustand/Jotai)
4.  Skia canvas preview
5.  Shader preset engine
6.  Sliders bằng Reanimated
7.  Camera screen (expo-camera)
8.  Save + share service
9.  Background overlay picker

Codex cần tuân thủ: - TypeScript - Expo Managed Workflow - Không dùng
native module ngoài Expo
