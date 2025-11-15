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
          placeholderTextColor="#9CA3AF"
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

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: 8,
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    paddingHorizontal: 12,
    height: 44,
  },
  searchIcon: {
    fontSize: 18,
    marginRight: 8,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#1F2937',
  },
  clearButton: {
    padding: 4,
  },
  clearIcon: {
    fontSize: 16,
    color: '#9CA3AF',
  },
  modeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    paddingHorizontal: 12,
    height: 44,
    gap: 6,
  },
  modeButtonText: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
  },
  dropdownIcon: {
    fontSize: 10,
    color: '#6B7280',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modeSelector: {
    backgroundColor: '#FFFFFF',
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
    backgroundColor: '#FEE2E2',
  },
  modeOptionText: {
    fontSize: 16,
    color: '#374151',
  },
  modeOptionTextActive: {
    color: '#FF6B6B',
    fontWeight: '600',
  },
  checkmark: {
    fontSize: 16,
    color: '#FF6B6B',
    fontWeight: 'bold',
  },
});

