/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import { Platform } from 'react-native';

const mint = {
  50: '#edf7f1',
  100: '#d8efe2',
  200: '#b6e6cd',
  300: '#8dd5b0',
  400: '#5dc792',
  500: '#36b37e',
  600: '#279567',
  700: '#1b7552',
  800: '#125541',
  900: '#0a372c',
};

export const Colors = {
  light: {
    text: '#18302a',
    background: mint[50],
    tint: mint[500],
    icon: mint[600],
    tabIconDefault: mint[300],
    tabIconSelected: mint[600],
    card: '#ffffff',
    border: '#d7e8dc',
  },
  dark: {
    text: '#f5fff8',
    background: '#0d1712',
    tint: mint[400],
    icon: mint[500],
    tabIconDefault: '#244737',
    tabIconSelected: mint[400],
    card: '#11261a',
    border: '#1f3e32',
  },
};

export const Fonts = Platform.select({
  ios: {
    sans: 'system-ui',
    serif: 'ui-serif',
    rounded: 'ui-rounded',
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});
