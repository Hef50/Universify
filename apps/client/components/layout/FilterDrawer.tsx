import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { AnimatedDrawer } from '@/components/ui/AnimatedDrawer';
import { CategoryPill } from '@/components/ui/CategoryPill';
import { Button } from '@/components/ui/Button';
import { EventCategory } from '@/types/event';
import { useFilters } from '@/contexts/FilterContext';
import { useResponsive } from '@/hooks/useResponsive';
import { useAppTheme } from '@/hooks/useAppTheme';
import { AppPalette } from '@/constants/theme';

interface FilterDrawerProps {
  visible: boolean;
  onClose: () => void;
}

const ALL_CATEGORIES: EventCategory[] = [
  'Career',
  'Food',
  'Fun',
  'Afternoon',
  'Events',
  'Academic',
  'Networking',
  'Social',
  'Sports',
  'Arts',
  'Tech',
  'Wellness',
];

const TIME_OF_DAY_OPTIONS: {
  id: 'morning' | 'afternoon' | 'evening' | 'night';
  label: string;
  hint: string;
}[] = [
  { id: 'morning', label: 'Morning', hint: '6am–12pm' },
  { id: 'afternoon', label: 'Afternoon', hint: '12–5pm' },
  { id: 'evening', label: 'Evening', hint: '5–9pm' },
  { id: 'night', label: 'Night', hint: '9pm–6am' },
];

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export const FilterDrawer: React.FC<FilterDrawerProps> = ({ visible, onClose }) => {
  const { colors, fontScale } = useAppTheme();
  const styles = React.useMemo(() => createStyles(colors, fontScale), [colors, fontScale]);
  const { isMobile } = useResponsive();
  const {
    selectedCategories,
    clubEvents,
    socialEvents,
    dateRange,
    location,
    timeOfDay,
    hasAvailability,
    toggleCategory,
    toggleEventType,
    setDateRange,
    clearDateRange,
    setLocation,
    setTimeOfDay,
    setHasAvailability,
    clearAllFilters,
  } = useFilters();

  // Local text state for the date inputs so partial typing doesn't clobber
  // the applied range; committed once both ends are valid dates.
  const [startText, setStartText] = React.useState(dateRange?.start ?? '');
  const [endText, setEndText] = React.useState(dateRange?.end ?? '');

  React.useEffect(() => {
    setStartText(dateRange?.start ?? '');
    setEndText(dateRange?.end ?? '');
  }, [dateRange]);

  const commitDateRange = (start: string, end: string) => {
    if (DATE_PATTERN.test(start) && DATE_PATTERN.test(end)) {
      setDateRange(start, end);
    } else if (!start && !end) {
      clearDateRange();
    }
  };

  return (
    <AnimatedDrawer
      visible={visible}
      onClose={onClose}
      position={isMobile ? 'bottom' : 'left'}
      width={isMobile ? '100%' : 320}
      height={isMobile ? '85%' : '100%'}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Filters</Text>
          <TouchableOpacity onPress={onClose}>
            <Text style={styles.closeIcon}>✕</Text>
          </TouchableOpacity>
        </View>

        {/* Content */}
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Event Types */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Event Types</Text>
            <View style={styles.checkboxGroup}>
              <TouchableOpacity
                style={styles.checkbox}
                onPress={() => toggleEventType('clubEvents')}
              >
                <View style={[styles.checkboxBox, clubEvents && styles.checkboxBoxChecked]}>
                  {clubEvents && <Text style={styles.checkmark}>✓</Text>}
                </View>
                <Text style={styles.checkboxLabel}>Club Events</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.checkbox}
                onPress={() => toggleEventType('socialEvents')}
              >
                <View style={[styles.checkboxBox, socialEvents && styles.checkboxBoxChecked]}>
                  {socialEvents && <Text style={styles.checkmark}>✓</Text>}
                </View>
                <Text style={styles.checkboxLabel}>Social Events</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Categories */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Categories</Text>
            <View style={styles.categoryGrid}>
              {ALL_CATEGORIES.map((category) => (
                <CategoryPill
                  key={category}
                  category={category}
                  active={selectedCategories.includes(category)}
                  onPress={() => toggleCategory(category)}
                  size="medium"
                />
              ))}
            </View>
          </View>

          {/* Date Range */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Date Range</Text>
              {dateRange && (
                <TouchableOpacity onPress={() => clearDateRange()}>
                  <Text style={styles.sectionClear}>Clear</Text>
                </TouchableOpacity>
              )}
            </View>
            <View style={styles.dateRow}>
              <View style={styles.dateField}>
                <Text style={styles.dateLabel}>From</Text>
                <TextInput
                  style={styles.dateInput}
                  value={startText}
                  onChangeText={(text) => {
                    setStartText(text);
                    commitDateRange(text, endText);
                  }}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={colors.textTertiary}
                  maxLength={10}
                  autoCapitalize="none"
                />
              </View>
              <View style={styles.dateField}>
                <Text style={styles.dateLabel}>To</Text>
                <TextInput
                  style={styles.dateInput}
                  value={endText}
                  onChangeText={(text) => {
                    setEndText(text);
                    commitDateRange(startText, text);
                  }}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={colors.textTertiary}
                  maxLength={10}
                  autoCapitalize="none"
                />
              </View>
            </View>
          </View>

          {/* Time of Day */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Time of Day</Text>
            <View style={styles.timeGrid}>
              {TIME_OF_DAY_OPTIONS.map((option) => {
                const active = timeOfDay === option.id;
                return (
                  <TouchableOpacity
                    key={option.id}
                    style={[styles.timeOption, active && styles.timeOptionActive]}
                    onPress={() => setTimeOfDay(active ? undefined : option.id)}
                  >
                    <Text style={[styles.timeOptionLabel, active && styles.timeOptionLabelActive]}>
                      {option.label}
                    </Text>
                    <Text style={[styles.timeOptionHint, active && styles.timeOptionHintActive]}>
                      {option.hint}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Location */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Location</Text>
            <TextInput
              style={styles.locationInput}
              value={location ?? ''}
              onChangeText={(text) => setLocation(text)}
              placeholder="e.g., Wiegand Gym, Gates"
              placeholderTextColor={colors.textTertiary}
            />
          </View>

          {/* Availability */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Availability</Text>
            <TouchableOpacity
              style={styles.checkbox}
              onPress={() => setHasAvailability(!hasAvailability)}
            >
              <View style={[styles.checkboxBox, hasAvailability && styles.checkboxBoxChecked]}>
                {hasAvailability && <Text style={styles.checkmark}>✓</Text>}
              </View>
              <Text style={styles.checkboxLabel}>Only events with open spots</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>

        {/* Footer */}
        <View style={styles.footer}>
          <Button
            title="Clear All"
            onPress={clearAllFilters}
            variant="outline"
            size="medium"
            style={{ flex: 1 }}
          />
          <Button
            title="Done"
            onPress={onClose}
            variant="primary"
            size="medium"
            style={{ flex: 1 }}
          />
        </View>
      </View>
    </AnimatedDrawer>
  );
};

const createStyles = (colors: AppPalette, fontScale: number) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.surface,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: 20,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    title: {
      fontSize: 20 * fontScale,
      fontWeight: 'bold',
      color: colors.textPrimary,
    },
    closeIcon: {
      fontSize: 24,
      color: colors.textSecondary,
    },
    content: {
      flex: 1,
      padding: 20,
    },
    section: {
      marginBottom: 28,
    },
    sectionHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    sectionTitle: {
      fontSize: 16 * fontScale,
      fontWeight: '600',
      color: colors.textPrimary,
      marginBottom: 12,
    },
    sectionClear: {
      fontSize: 13 * fontScale,
      fontWeight: '500',
      color: colors.primary,
    },
    checkboxGroup: {
      gap: 12,
    },
    checkbox: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    checkboxBox: {
      width: 22,
      height: 22,
      borderRadius: 6,
      borderWidth: 2,
      borderColor: colors.border,
      marginRight: 10,
      justifyContent: 'center',
      alignItems: 'center',
    },
    checkboxBoxChecked: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    checkmark: {
      color: colors.onPrimary,
      fontSize: 14,
      fontWeight: 'bold',
    },
    checkboxLabel: {
      fontSize: 15 * fontScale,
      color: colors.textPrimary,
    },
    categoryGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    dateRow: {
      flexDirection: 'row',
      gap: 12,
    },
    dateField: {
      flex: 1,
    },
    dateLabel: {
      fontSize: 13 * fontScale,
      color: colors.textSecondary,
      marginBottom: 6,
    },
    dateInput: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 8,
      paddingHorizontal: 12,
      paddingVertical: 8,
      fontSize: 14 * fontScale,
      color: colors.textPrimary,
    },
    locationInput: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 8,
      paddingHorizontal: 12,
      paddingVertical: 8,
      fontSize: 14 * fontScale,
      color: colors.textPrimary,
    },
    timeGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    timeOption: {
      flexBasis: '47%',
      flexGrow: 1,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 8,
      paddingVertical: 10,
      paddingHorizontal: 12,
    },
    timeOptionActive: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    timeOptionLabel: {
      fontSize: 14 * fontScale,
      fontWeight: '600',
      color: colors.textPrimary,
    },
    timeOptionLabelActive: {
      color: colors.onPrimary,
    },
    timeOptionHint: {
      fontSize: 12 * fontScale,
      color: colors.textTertiary,
      marginTop: 2,
    },
    timeOptionHintActive: {
      color: 'rgba(255, 255, 255, 0.85)',
    },
    footer: {
      flexDirection: 'row',
      padding: 20,
      gap: 12,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
  });
