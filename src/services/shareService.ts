import * as Haptics from 'expo-haptics';
import * as Sharing from 'expo-sharing';

export type ShareTarget = 'instagram' | 'facebook' | 'threads' | 'system';

const targetTitles: Record<ShareTarget, string> = {
  instagram: 'Instagram Stories',
  facebook: 'Facebook Stories',
  threads: 'Threads',
  system: 'Share',
};

export const shareImageToTarget = async (uri: string, target: ShareTarget = 'system') => {
  if (!(await Sharing.isAvailableAsync())) {
    throw new Error('Native share sheet is not available on this device');
  }

  await Haptics.selectionAsync();
  await Sharing.shareAsync(uri, {
    dialogTitle: `Share to ${targetTitles[target]}`,
    mimeType: 'image/jpeg',
    UTI: 'public.jpeg',
  });
};
