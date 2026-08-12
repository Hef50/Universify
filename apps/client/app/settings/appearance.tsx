import React from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { useSettings } from '@/contexts/SettingsContext';
import { useAppTheme } from '@/hooks/useAppTheme';
import { AppPalette } from '@/constants/theme';

export default function AppearanceScreen() {
  const { settings, updateSettings } = useSettings();
  const { colors, fontScale } = useAppTheme();
  const styles = React.useMemo(() => createStyles(colors, fontScale), [colors, fontScale]);

  const themes = [
    { id: 'light', name: 'Light', icon: '☀️' },
    { id: 'dark', name: 'Dark', icon: '🌙' },
    { id: 'system', name: 'System', icon: '⚙️' },
  ];

  const fontSizes = [
    { id: 'small', name: 'Small' },
    { id: 'medium', name: 'Medium' },
    { id: 'large', name: 'Large' },
  ];

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backButton}>‹ Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Appearance</Text>
      </View>

      <ScrollView style={styles.content}>
        {/* Theme */}
        <Text style={styles.sectionTitle}>Theme</Text>
        <View style={styles.optionGroup}>
          {themes.map((theme) => (
            <TouchableOpacity
              key={theme.id}
              style={[
                styles.option,
                settings.theme === theme.id && styles.optionActive,
              ]}
              onPress={() => updateSettings({ theme: theme.id as any })}
            >
              <View style={styles.optionLeft}>
                <Text style={styles.optionIcon}>{theme.icon}</Text>
                <Text style={styles.optionText}>{theme.name}</Text>
              </View>
              {settings.theme === theme.id && (
                <Text style={styles.checkmark}>✓</Text>
              )}
            </TouchableOpacity>
          ))}
        </View>

        {/* Font Size */}
        <Text style={styles.sectionTitle}>Font Size</Text>
        <View style={styles.optionGroup}>
          {fontSizes.map((size) => (
            <TouchableOpacity
              key={size.id}
              style={[
                styles.option,
                settings.fontSize === size.id && styles.optionActive,
              ]}
              onPress={() => updateSettings({ fontSize: size.id as any })}
            >
              <Text style={styles.optionText}>{size.name}</Text>
              {settings.fontSize === size.id && (
                <Text style={styles.checkmark}>✓</Text>
              )}
            </TouchableOpacity>
          ))}
        </View>

        {/* Accessibility */}
        <Text style={styles.sectionTitle}>Accessibility</Text>
        <TouchableOpacity
          style={styles.switchOption}
          onPress={() =>
            updateSettings({
              accessibility: {
                ...settings.accessibility,
                highContrast: !settings.accessibility.highContrast,
              },
            })
          }
        >
          <View>
            <Text style={styles.switchLabel}>High Contrast</Text>
            <Text style={styles.switchDescription}>
              Increase contrast for better visibility
            </Text>
          </View>
          <View
            style={[
              styles.toggle,
              settings.accessibility.highContrast && styles.toggleActive,
            ]}
          >
            <View
              style={[
                styles.toggleThumb,
                settings.accessibility.highContrast && styles.toggleThumbActive,
              ]}
            />
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.switchOption}
          onPress={() =>
            updateSettings({
              accessibility: {
                ...settings.accessibility,
                reduceMotion: !settings.accessibility.reduceMotion,
              },
            })
          }
        >
          <View>
            <Text style={styles.switchLabel}>Reduce Motion</Text>
            <Text style={styles.switchDescription}>
              Minimize animations and transitions
            </Text>
          </View>
          <View
            style={[
              styles.toggle,
              settings.accessibility.reduceMotion && styles.toggleActive,
            ]}
          >
            <View
              style={[
                styles.toggleThumb,
                settings.accessibility.reduceMotion && styles.toggleThumbActive,
              ]}
            />
          </View>
        </TouchableOpacity>

        {/* Color Scheme Preview */}
        <Text style={styles.sectionTitle}>Color Scheme</Text>
        <View style={styles.colorPreview}>
          <View style={[styles.colorBlock, { backgroundColor: colors.primary }]}>
            <Text style={styles.colorLabel}>Primary</Text>
          </View>
          <View style={[styles.colorBlock, { backgroundColor: '#8B7FFF' }]}>
            <Text style={styles.colorLabel}>Secondary</Text>
          </View>
          <View style={[styles.colorBlock, { backgroundColor: '#FF6BA8' }]}>
            <Text style={styles.colorLabel}>Accent</Text>
          </View>
        </View>
        <Text style={styles.comingSoon}>
          Custom color schemes coming soon
        </Text>
      </ScrollView>
    </View>
  );
}

const createStyles = (colors: AppPalette, fontScale: number) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 16,
      backgroundColor: colors.surface,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    backButton: {
      fontSize: 24 * fontScale,
      color: colors.primary,
      marginRight: 12,
    },
    title: {
      fontSize: 20 * fontScale,
      fontWeight: 'bold',
      color: colors.textPrimary,
    },
    content: {
      flex: 1,
      padding: 16,
    },
    sectionTitle: {
      fontSize: 16 * fontScale,
      fontWeight: '600',
      color: colors.textPrimary,
      marginTop: 16,
      marginBottom: 12,
    },
    optionGroup: {
      backgroundColor: colors.surface,
      borderRadius: 8,
      overflow: 'hidden',
      marginBottom: 8,
    },
    option: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: 16,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    optionActive: {
      backgroundColor: colors.dangerSoft,
    },
    optionLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    optionIcon: {
      fontSize: 20,
    },
    optionText: {
      fontSize: 16 * fontScale,
      color: colors.textPrimary,
    },
    checkmark: {
      fontSize: 18 * fontScale,
      color: colors.primary,
      fontWeight: 'bold',
    },
    switchOption: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: 16,
      backgroundColor: colors.surface,
      borderRadius: 8,
      marginBottom: 8,
    },
    switchLabel: {
      fontSize: 16 * fontScale,
      fontWeight: '500',
      color: colors.textPrimary,
      marginBottom: 4,
    },
    switchDescription: {
      fontSize: 13 * fontScale,
      color: colors.textSecondary,
    },
    toggle: {
      width: 50,
      height: 30,
      borderRadius: 15,
      backgroundColor: colors.border,
      padding: 2,
    },
    toggleActive: {
      backgroundColor: colors.primary,
    },
    toggleThumb: {
      width: 26,
      height: 26,
      borderRadius: 13,
      backgroundColor: colors.onPrimary,
    },
    toggleThumbActive: {
      transform: [{ translateX: 20 }],
    },
    colorPreview: {
      flexDirection: 'row',
      gap: 12,
    },
    colorBlock: {
      flex: 1,
      height: 80,
      borderRadius: 8,
      justifyContent: 'center',
      alignItems: 'center',
    },
    colorLabel: {
      fontSize: 12 * fontScale,
      fontWeight: '600',
      color: colors.onPrimary,
    },
    comingSoon: {
      fontSize: 13 * fontScale,
      color: colors.textTertiary,
      fontStyle: 'italic',
      marginTop: 8,
      textAlign: 'center',
    },
  });

