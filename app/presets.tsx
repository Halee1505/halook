import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Colors } from '@/constants/theme';
import { PresetList } from '@/src/components/PresetList';
import { useEditorState } from '@/src/hooks/useEditorState';
import type { Preset } from '@/src/models/presets';

const filterChips = ['All', 'Favorites', 'Trending', 'Cinematic', 'B&W'];

export default function PresetLibraryScreen() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState(filterChips[0]);
  const currentPresetId = useEditorState((state) => state.preset?._id);
  const applyPreset = useEditorState((state) => state.applyPreset);

  const handleSelect = (preset: Preset) => {
    applyPreset(preset);
    router.back();
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.background}>
        <View style={styles.blobTopLeft} />
        <View style={styles.blobBottomRight} />
      </View>
      <View style={styles.header}>
        <TouchableOpacity style={styles.roundButton} onPress={() => router.back()}>
          <MaterialIcons name="arrow-back-ios-new" size={18} color="#f8fafc" />
        </TouchableOpacity>
        <Text style={styles.title}>Library</Text>
        <TouchableOpacity style={styles.roundButton} onPress={() => router.push('/settings')}>
          <MaterialIcons name="settings" size={18} color="#f8fafc" />
        </TouchableOpacity>
      </View>
      <View style={styles.searchBar}>
        <MaterialIcons name="search" size={20} color="rgba(248,250,252,0.6)" />
        <TextInput
          placeholder="Search presets, styles..."
          placeholderTextColor="rgba(248,250,252,0.6)"
          style={styles.searchInput}
          value={search}
          onChangeText={setSearch}
        />
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterRow}
      >
        {filterChips.map((chip) => {
          const isActive = chip === activeFilter;
          return (
            <TouchableOpacity
              key={chip}
              style={[styles.filterChip, isActive && styles.filterChipActive]}
              onPress={() => setActiveFilter(chip)}
            >
              <Text style={[styles.filterLabel, isActive && styles.filterLabelActive]}>{chip}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
      <View style={styles.listWrapper}>
        <PresetList selectedId={currentPresetId} onSelect={handleSelect} />
      </View>
      <View style={styles.footer}>
        <TouchableOpacity style={styles.importButton} onPress={() => router.push('/')}>
          <MaterialIcons name="add-a-photo" size={20} color="#022c22" />
          <Text style={styles.importLabel}>Import Photo</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const palette = Colors.light;

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#0c0a09',
  },
  background: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#0c0a09',
  },
  blobTopLeft: {
    position: 'absolute',
    top: -80,
    left: -60,
    width: 320,
    height: 320,
    borderRadius: 160,
    backgroundColor: 'rgba(48,232,119,0.15)',
  },
  blobBottomRight: {
    position: 'absolute',
    bottom: -100,
    right: -100,
    width: 360,
    height: 360,
    borderRadius: 180,
    backgroundColor: 'rgba(15,118,110,0.25)',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 24,
  },
  roundButton: {
    width: 44,
    height: 44,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(15,23,42,0.6)',
  },
  title: {
    color: '#f8fafc',
    fontWeight: '700',
    fontSize: 18,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: 20,
    paddingHorizontal: 16,
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    backgroundColor: 'rgba(15,23,42,0.6)',
    gap: 12,
  },
  searchInput: {
    flex: 1,
    color: '#fff',
    fontWeight: '600',
  },
  filterRow: {
    paddingHorizontal: 20,
    gap: 12,
  },
  filterChip: {
    paddingHorizontal: 18,
    height: 36,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterChipActive: {
    backgroundColor: palette.tint,
    borderColor: 'transparent',
  },
  filterLabel: {
    color: 'rgba(248,250,252,0.7)',
    fontWeight: '600',
    fontSize: 12,
  },
  filterLabelActive: {
    color: '#022c22',
  },
  listWrapper: {
    flex: 1,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  footer: {
    padding: 20,
  },
  importButton: {
    height: 56,
    borderRadius: 22,
    backgroundColor: 'rgba(48,232,119,0.9)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  importLabel: {
    fontWeight: '700',
    color: '#022c22',
    letterSpacing: 0.3,
  },
});
