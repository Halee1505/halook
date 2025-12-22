import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useRouter } from 'expo-router';
import { ReactNode, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Colors } from '@/constants/theme';

const palette = Colors.light;

const Toggle = ({ value, onToggle }: { value: boolean; onToggle: () => void }) => (
  <TouchableOpacity
    onPress={onToggle}
    style={[styles.toggleTrack, value && styles.toggleTrackActive]}
    activeOpacity={0.8}
  >
    <View style={[styles.toggleThumb, value && styles.toggleThumbActive]} />
  </TouchableOpacity>
);

type SettingRowProps = {
  icon: keyof typeof MaterialIcons.glyphMap;
  label: string;
  value?: string;
  onPress?: () => void;
  children?: ReactNode;
};

const SettingRow = ({ icon, label, value, onPress, children }: SettingRowProps) => (
  <TouchableOpacity
    disabled={!onPress}
    onPress={onPress}
    style={styles.settingRow}
    activeOpacity={onPress ? 0.8 : 1}
  >
    <View style={styles.settingLabel}>
      <View style={styles.settingIcon}>
        <MaterialIcons name={icon} size={20} color={palette.tint} />
      </View>
      <Text style={styles.settingText}>{label}</Text>
    </View>
    {children ?? <Text style={styles.settingValue}>{value}</Text>}
  </TouchableOpacity>
);

export default function SettingsScreen() {
  const router = useRouter();
  const [notifications, setNotifications] = useState(true);
  const [location, setLocation] = useState(false);

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.background}>
        <View style={styles.blobTopRight} />
        <View style={styles.blobBottomLeft} />
      </View>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Settings</Text>
        <TouchableOpacity style={styles.roundButton} onPress={() => router.back()}>
          <MaterialIcons name="close" size={20} color="#f8fafc" />
        </TouchableOpacity>
      </View>
      <View style={styles.sheet}>
        <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
          <View style={styles.handle} />
          <View style={styles.profileCard}>
            <View style={styles.avatar} />
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text style={styles.profileName}>Sarah Green</Text>
                <View style={styles.badge}>
                  <Text style={styles.badgeLabel}>Free</Text>
                </View>
              </View>
              <Text style={styles.profileEmail}>sarah.g@halook.com</Text>
            </View>
            <TouchableOpacity>
              <MaterialIcons name='edit' size={20} color={palette.tint} />
            </TouchableOpacity>
          </View>

          <View style={styles.upgradeCard}>
            <View style={{ flex: 1 }}>
              <Text style={styles.upgradeTitle}>
                <MaterialIcons name="verified" size={16} color={palette.tint} /> Halook Elite
              </Text>
              <Text style={styles.upgradeSubtitle}>Liquid filters, AI masking & 4K export.</Text>
              <TouchableOpacity style={styles.upgradeButton}>
                <Text style={styles.upgradeButtonLabel}>Upgrade Now</Text>
                <MaterialIcons name="arrow-forward" size={16} color="#022c22" />
              </TouchableOpacity>
            </View>
            <View style={styles.upgradePreview} />
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionLabel}>General</Text>
            <SettingRow icon="notifications" label="Notifications">
              <Toggle value={notifications} onToggle={() => setNotifications((prev) => !prev)} />
            </SettingRow>
            <SettingRow icon="language" label="Language" value="English" />
            <SettingRow icon="palette" label="Theme" value="Mint Dark" />
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Privacy & Security</Text>
            <SettingRow icon="location-on" label="Location Access">
              <Toggle value={location} onToggle={() => setLocation((prev) => !prev)} />
            </SettingRow>
            <SettingRow icon="lock" label="Privacy Center" value="Manage" />
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Support</Text>
            <SettingRow icon="help" label="Help & FAQ" value="Open" />
            <SettingRow icon="info" label="About Halook" value="Read more" />
          </View>

          <TouchableOpacity style={styles.logoutButton}>
            <Text style={styles.logoutLabel}>Log Out</Text>
          </TouchableOpacity>
          <Text style={styles.versionLabel}>Version 2.4.0 (Build 349)</Text>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#0b1a13',
  },
  background: {
    ...StyleSheet.absoluteFillObject,
  },
  blobTopRight: {
    position: 'absolute',
    top: 40,
    right: -40,
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: 'rgba(48,232,119,0.2)',
  },
  blobBottomLeft: {
    position: 'absolute',
    bottom: 60,
    left: -60,
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: 'rgba(15,118,110,0.2)',
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#f0fdf5',
  },
  roundButton: {
    width: 44,
    height: 44,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheet: {
    flex: 1,
    marginTop: 12,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    backgroundColor: 'rgba(16,24,18,0.9)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  handle: {
    alignSelf: 'center',
    width: 48,
    height: 4,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.2)',
    marginBottom: 16,
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    borderRadius: 24,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    backgroundColor: 'rgba(255,255,255,0.04)',
    marginBottom: 16,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(48,232,119,0.4)',
    borderWidth: 2,
    borderColor: 'rgba(48,232,119,0.6)',
  },
  profileName: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 18,
  },
  profileEmail: {
    color: 'rgba(255,255,255,0.6)',
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
    backgroundColor: 'rgba(48,232,119,0.2)',
  },
  badgeLabel: {
    color: palette.tint,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
  },
  upgradeCard: {
    flexDirection: 'row',
    borderRadius: 24,
    padding: 18,
    backgroundColor: 'rgba(6,14,10,0.9)',
    borderWidth: 1,
    borderColor: 'rgba(48,232,119,0.2)',
    gap: 12,
    marginBottom: 24,
  },
  upgradeTitle: {
    color: '#fff',
    fontWeight: '700',
    marginBottom: 4,
  },
  upgradeSubtitle: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
    marginBottom: 12,
  },
  upgradeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    borderRadius: 12,
    backgroundColor: palette.tint,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  upgradeButtonLabel: {
    color: '#022c22',
    fontWeight: '700',
  },
  upgradePreview: {
    width: 80,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  section: {
    marginBottom: 20,
    gap: 12,
  },
  sectionLabel: {
    color: 'rgba(255,255,255,0.5)',
    letterSpacing: 2,
    fontSize: 10,
    textTransform: 'uppercase',
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  settingLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  settingIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingText: {
    color: '#fff',
    fontWeight: '600',
  },
  settingValue: {
    color: 'rgba(255,255,255,0.6)',
    fontWeight: '600',
  },
  toggleTrack: {
    width: 54,
    height: 28,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.12)',
    padding: 2,
  },
  toggleTrackActive: {
    backgroundColor: palette.tint,
  },
  toggleThumb: {
    width: 24,
    height: 24,
    borderRadius: 999,
    backgroundColor: '#fff',
  },
  toggleThumbActive: {
    alignSelf: 'flex-end',
    backgroundColor: '#022c22',
  },
  logoutButton: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(248,113,113,0.3)',
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 12,
  },
  logoutLabel: {
    color: '#fca5a5',
    fontWeight: '700',
  },
  versionLabel: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 12,
  },
});
