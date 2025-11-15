import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { AnimatedDrawer } from '@/components/ui/AnimatedDrawer';
import { CategoryPill } from '@/components/ui/CategoryPill';
import { Button } from '@/components/ui/Button';
import { EventCategory } from '@/types/event';
import { useResponsive } from '@/hooks/useResponsive';

interface FilterDrawerProps {
  visible: boolean;
  onClose: () => void;
  selectedCategories: EventCategory[];
  onCategoryToggle: (category: EventCategory) => void;
  clubEvents: boolean;
  socialEvents: boolean;
  onEventTypeToggle: (type: 'clubEvents' | 'socialEvents') => void;
  onClearFilters: () => void;
  onApply: () => void;
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

export const FilterDrawer: React.FC<FilterDrawerProps> = ({
  visible,
  onClose,
  selectedCategories,
  onCategoryToggle,
  clubEvents,
  socialEvents,
  onEventTypeToggle,
  onClearFilters,
  onApply,
}) => {
  const { isMobile } = useResponsive();

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
                onPress={() => onEventTypeToggle('clubEvents')}
              >
                <View style={[styles.checkboxBox, clubEvents && styles.checkboxBoxChecked]}>
                  {clubEvents && <Text style={styles.checkmark}>✓</Text>}
                </View>
                <Text style={styles.checkboxLabel}>Club Events</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.checkbox}
                onPress={() => onEventTypeToggle('socialEvents')}
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
                  onPress={() => onCategoryToggle(category)}
                  size="medium"
                />
              ))}
            </View>
          </View>

          {/* Date Range - Placeholder */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Date Range</Text>
            <Text style={styles.comingSoon}>Coming soon</Text>
          </View>

          {/* Time of Day - Placeholder */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Time of Day</Text>
            <Text style={styles.comingSoon}>Coming soon</Text>
          </View>

          {/* Location - Placeholder */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Location</Text>
            <Text style={styles.comingSoon}>Coming soon</Text>
          </View>
        </ScrollView>

        {/* Footer */}
        <View style={styles.footer}>
          <Button
            title="Clear All"
            onPress={onClearFilters}
            variant="outline"
            size="medium"
            style={{ flex: 1 }}
          />
          <Button
            title="Apply"
            onPress={() => {
              onApply();
              onClose();
            }}
            variant="primary"
            size="medium"
            style={{ flex: 1 }}
          />
        </View>
      </View>
    </AnimatedDrawer>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  closeIcon: {
    fontSize: 24,
    color: '#6B7280',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  section: {
    marginBottom: 28,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
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
    borderColor: '#D1D5DB',
    marginRight: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxBoxChecked: {
    backgroundColor: '#FF6B6B',
    borderColor: '#FF6B6B',
  },
  checkmark: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  checkboxLabel: {
    fontSize: 15,
    color: '#374151',
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  comingSoon: {
    fontSize: 14,
    color: '#9CA3AF',
    fontStyle: 'italic',
  },
  footer: {
    flexDirection: 'row',
    padding: 20,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
});

