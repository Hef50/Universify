import React from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Switch } from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { useSettings } from '@/contexts/SettingsContext';
import { CategoryPill } from '@/components/ui/CategoryPill';
import { EventCategory } from '@/types/event';

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

export default function PreferencesScreen() {
  const { currentUser, updateUser } = useAuth();
  const { settings, updateSettings } = useSettings();

  if (!currentUser) return null;

  const toggleCategoryInterest = (category: EventCategory) => {
    const interests = currentUser.preferences.categoryInterests.includes(category)
      ? currentUser.preferences.categoryInterests.filter((c) => c !== category)
      : [...currentUser.preferences.categoryInterests, category];

    updateUser({
      preferences: {
        ...currentUser.preferences,
        categoryInterests: interests,
      },
    });
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backButton}>‹ Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Preferences</Text>
      </View>

      <ScrollView style={styles.content}>
        {/* Default Home Page */}
        <Text style={styles.sectionTitle}>Default Home Page</Text>
        <View style={styles.optionGroup}>
          <TouchableOpacity
            style={[
              styles.option,
              settings.defaultHomePage === 'calendar' && styles.optionActive,
            ]}
            onPress={() => updateSettings({ defaultHomePage: 'calendar' })}
          >
            <Text style={styles.optionText}>Calendar</Text>
            {settings.defaultHomePage === 'calendar' && (
              <Text style={styles.checkmark}>✓</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.option,
              settings.defaultHomePage === 'recommendations' && styles.optionActive,
            ]}
            onPress={() => updateSettings({ defaultHomePage: 'recommendations' })}
          >
            <Text style={styles.optionText}>Recommendations</Text>
            {settings.defaultHomePage === 'recommendations' && (
              <Text style={styles.checkmark}>✓</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Calendar View Days */}
        <Text style={styles.sectionTitle}>Calendar View (Days)</Text>
        <View style={styles.daysSelector}>
          {[3, 5, 7].map((days) => (
            <TouchableOpacity
              key={days}
              style={[
                styles.dayOption,
                settings.calendarViewDays === days && styles.dayOptionActive,
              ]}
              onPress={() => updateSettings({ calendarViewDays: days })}
            >
              <Text
                style={[
                  styles.dayOptionText,
                  settings.calendarViewDays === days && styles.dayOptionTextActive,
                ]}
              >
                {days}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Category Interests */}
        <Text style={styles.sectionTitle}>Category Interests</Text>
        <Text style={styles.sectionDescription}>
          Select categories you're interested in for personalized recommendations
        </Text>
        <View style={styles.categoryGrid}>
          {ALL_CATEGORIES.map((category) => (
            <CategoryPill
              key={category}
              category={category}
              active={currentUser.preferences.categoryInterests.includes(category)}
              onPress={() => toggleCategoryInterest(category)}
              size="medium"
            />
          ))}
        </View>

        {/* Event Type Preferences */}
        <Text style={styles.sectionTitle}>Event Types</Text>
        <View style={styles.switchRow}>
          <Text style={styles.switchLabel}>Show Club Events</Text>
          <Switch
            value={currentUser.preferences.eventTypePreferences.clubEvents}
            onValueChange={(value) =>
              updateUser({
                preferences: {
                  ...currentUser.preferences,
                  eventTypePreferences: {
                    ...currentUser.preferences.eventTypePreferences,
                    clubEvents: value,
                  },
                },
              })
            }
            trackColor={{ false: '#D1D5DB', true: '#FF6B6B' }}
          />
        </View>

        <View style={styles.switchRow}>
          <Text style={styles.switchLabel}>Show Social Events</Text>
          <Switch
            value={currentUser.preferences.eventTypePreferences.socialEvents}
            onValueChange={(value) =>
              updateUser({
                preferences: {
                  ...currentUser.preferences,
                  eventTypePreferences: {
                    ...currentUser.preferences.eventTypePreferences,
                    socialEvents: value,
                  },
                },
              })
            }
            trackColor={{ false: '#D1D5DB', true: '#FF6B6B' }}
          />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    fontSize: 24,
    color: '#FF6B6B',
    marginRight: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginTop: 16,
    marginBottom: 12,
  },
  sectionDescription: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 12,
  },
  optionGroup: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    overflow: 'hidden',
  },
  option: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  optionActive: {
    backgroundColor: '#FEE2E2',
  },
  optionText: {
    fontSize: 16,
    color: '#1F2937',
  },
  checkmark: {
    fontSize: 18,
    color: '#FF6B6B',
    fontWeight: 'bold',
  },
  daysSelector: {
    flexDirection: 'row',
    gap: 12,
  },
  dayOption: {
    flex: 1,
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    alignItems: 'center',
  },
  dayOptionActive: {
    borderColor: '#FF6B6B',
    backgroundColor: '#FEE2E2',
  },
  dayOptionText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#6B7280',
  },
  dayOptionTextActive: {
    color: '#FF6B6B',
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    marginBottom: 8,
  },
  switchLabel: {
    fontSize: 16,
    color: '#1F2937',
  },
});

