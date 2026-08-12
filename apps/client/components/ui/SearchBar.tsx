import React, { useState } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  Text,
  StyleSheet,
  Modal,
  ViewStyle,
} from 'react-native';
import { SearchMode } from '@/types/settings';
import { useAppTheme } from '@/hooks/useAppTheme';
import { AppPalette } from '@/constants/theme';

interface SearchBarProps {
  value: string;
  onChangeText: (text: string) => void;
  searchMode: SearchMode;
  onSearchModeChange: (mode: SearchMode) => void;
  placeholder?: string;
  containerStyle?: ViewStyle;
}

export const SearchBar: React.FC<SearchBarProps> = ({
  value,
  onChangeText,
  searchMode,
  onSearchModeChange,
  placeholder = 'Search events...',
  containerStyle,
}) => {
  const { colors, fontScale } = useAppTheme();
  const styles = React.useMemo(() => createStyles(colors, fontScale), [colors, fontScale]);
  const [showModeSelector, setShowModeSelector] = useState(false);

  const searchModeLabels: Record<SearchMode, string> = {
    names: 'Names Only',
    all: 'All Fields',
    semantic: 'Semantic',
  };

  return (
    <View style={[styles.container, containerStyle]}>
      <View style={styles.searchContainer}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          style={styles.input}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.textTertiary}
        />
        {value.length > 0 && (
          <TouchableOpacity
            style={styles.clearButton}
            onPress={() => onChangeText('')}
          >
            <Text style={styles.clearIcon}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      <TouchableOpacity
        style={styles.modeButton}
        onPress={() => setShowModeSelector(!showModeSelector)}
      >
        <Text style={styles.modeButtonText}>
          {searchModeLabels[searchMode]}
        </Text>
        <Text style={styles.dropdownIcon}>▼</Text>
      </TouchableOpacity>

      {showModeSelector && (
        <Modal
          transparent
          visible={showModeSelector}
          onRequestClose={() => setShowModeSelector(false)}
          animationType="fade"
        >
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => setShowModeSelector(false)}
          >
            <View style={styles.modeSelector}>
              {(['names', 'all', 'semantic'] as SearchMode[]).map((mode) => (
                <TouchableOpacity
                  key={mode}
                  style={[
                    styles.modeOption,
                    searchMode === mode && styles.modeOptionActive,
                  ]}
                  onPress={() => {
                    onSearchModeChange(mode);
                    setShowModeSelector(false);
                  }}
                >
                  <Text
                    style={[
                      styles.modeOptionText,
                      searchMode === mode && styles.modeOptionTextActive,
                    ]}
                  >
                    {searchModeLabels[mode]}
                  </Text>
                  {searchMode === mode && (
                    <Text style={styles.checkmark}>✓</Text>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </TouchableOpacity>
        </Modal>
      )}
    </View>
  );
};

const createStyles = (colors: AppPalette, fontScale: number) =>
  StyleSheet.create({
    container: {
      flexDirection: 'row',
      gap: 8,
    },
    searchContainer: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.surface,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: 12,
      height: 44,
    },
    searchIcon: {
      fontSize: 18,
      marginRight: 8,
    },
    input: {
      flex: 1,
      fontSize: 16 * fontScale,
      color: colors.textPrimary,
    },
    clearButton: {
      padding: 4,
    },
    clearIcon: {
      fontSize: 16,
      color: colors.textTertiary,
    },
    modeButton: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.surface,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: 12,
      height: 44,
      gap: 6,
    },
    modeButtonText: {
      fontSize: 14 * fontScale,
      color: colors.textPrimary,
      fontWeight: '500',
    },
    dropdownIcon: {
      fontSize: 10,
      color: colors.textSecondary,
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: colors.overlay,
      justifyContent: 'center',
      alignItems: 'center',
    },
    modeSelector: {
      backgroundColor: colors.surface,
      borderRadius: 12,
      padding: 8,
      minWidth: 200,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.2,
      shadowRadius: 8,
      elevation: 8,
    },
    modeOption: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: 12,
      borderRadius: 8,
    },
    modeOptionActive: {
      backgroundColor: colors.dangerSoft,
    },
    modeOptionText: {
      fontSize: 16 * fontScale,
      color: colors.textPrimary,
    },
    modeOptionTextActive: {
      color: colors.primary,
      fontWeight: '600',
    },
    checkmark: {
      fontSize: 16,
      color: colors.primary,
      fontWeight: 'bold',
    },
  });
