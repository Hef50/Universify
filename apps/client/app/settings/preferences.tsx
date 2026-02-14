import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Switch, TextInput, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { useSettings } from '@/contexts/SettingsContext';
import { useSlack } from '@/contexts/SlackContext';
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
  const slack = useSlack();
  const [botUrlInput, setBotUrlInput] = useState(slack.config.botUrl);

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

        {/* ─── Slack Integration ─── */}
        <View style={styles.slackDivider} />
        <Text style={styles.sectionTitle}>Slack Integration</Text>
        <Text style={styles.sectionDescription}>
          Import events from your Slack workspace channels (e.g. #announcements)
        </Text>

        {/* Bot URL */}
        <View style={styles.slackInputRow}>
          <TextInput
            style={styles.slackInput}
            value={botUrlInput}
            onChangeText={setBotUrlInput}
            placeholder="http://localhost:3001"
            placeholderTextColor="#9CA3AF"
            autoCapitalize="none"
            autoCorrect={false}
          />
          <TouchableOpacity
            style={[styles.slackButton, slack.isConnecting && styles.slackButtonDisabled]}
            onPress={() => {
              slack.setBotUrl(botUrlInput.trim());
              setTimeout(() => slack.connect(), 100);
            }}
            disabled={slack.isConnecting}
          >
            {slack.isConnecting ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.slackButtonText}>
                {slack.isConnected ? 'Reconnect' : 'Connect'}
              </Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Connection status */}
        {slack.isConnected && (
          <View style={styles.slackStatusRow}>
            <View style={styles.slackStatusDot} />
            <Text style={styles.slackStatusText}>Connected to Slack bot</Text>
          </View>
        )}
        {slack.connectionError && (
          <View style={styles.slackErrorRow}>
            <Text style={styles.slackErrorText}>{slack.connectionError}</Text>
          </View>
        )}

        {/* Channel selector */}
        {slack.isConnected && (
          <>
            <Text style={[styles.sectionTitle, { marginTop: 12 }]}>Select Channels</Text>
            {slack.isLoadingChannels ? (
              <ActivityIndicator size="small" color="#611f69" style={{ marginVertical: 12 }} />
            ) : slack.channels.length === 0 ? (
              <Text style={styles.sectionDescription}>
                No channels found. Make sure the bot is added to channels in Slack.
              </Text>
            ) : (
              <View style={styles.slackChannelList}>
                {slack.channels.map((channel) => {
                  const isSelected = slack.config.selectedChannelIds.includes(channel.id);
                  return (
                    <TouchableOpacity
                      key={channel.id}
                      style={[styles.slackChannel, isSelected && styles.slackChannelSelected]}
                      onPress={() => slack.toggleChannel(channel.id)}
                    >
                      <View style={styles.slackChannelInfo}>
                        <Text style={[styles.slackChannelName, isSelected && styles.slackChannelNameSelected]}>
                          #{channel.name}
                        </Text>
                        {channel.purpose ? (
                          <Text style={styles.slackChannelPurpose} numberOfLines={1}>
                            {channel.purpose}
                          </Text>
                        ) : null}
                      </View>
                      <View style={[styles.slackCheckbox, isSelected && styles.slackCheckboxChecked]}>
                        {isSelected && <Text style={styles.slackCheckboxMark}>✓</Text>}
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}

            {/* Import button */}
            <TouchableOpacity
              style={[
                styles.slackImportButton,
                (slack.isImporting || slack.config.selectedChannelIds.length === 0) &&
                  styles.slackButtonDisabled,
              ]}
              onPress={() => slack.importEvents()}
              disabled={slack.isImporting || slack.config.selectedChannelIds.length === 0}
            >
              {slack.isImporting ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.slackImportButtonText}>
                  Import Events from Slack
                </Text>
              )}
            </TouchableOpacity>

            {slack.importError && (
              <View style={styles.slackErrorRow}>
                <Text style={styles.slackErrorText}>{slack.importError}</Text>
              </View>
            )}

            {/* Import status */}
            {slack.lastImportTime && (
              <View style={styles.slackImportStatus}>
                <Text style={styles.slackImportStatusText}>
                  Last import: {slack.lastImportTime.toLocaleString()} ({slack.importedCount} events)
                </Text>
              </View>
            )}

            {/* Auto-import toggle */}
            <View style={[styles.switchRow, { marginTop: 8 }]}>
              <Text style={styles.switchLabel}>Auto-import on app load</Text>
              <Switch
                value={slack.config.autoImport}
                onValueChange={slack.setAutoImport}
                trackColor={{ false: '#D1D5DB', true: '#611f69' }}
              />
            </View>

            {/* Clear imported events */}
            {slack.slackEvents.length > 0 && (
              <TouchableOpacity
                style={styles.slackClearButton}
                onPress={slack.clearImportedEvents}
              >
                <Text style={styles.slackClearButtonText}>
                  Clear Imported Events ({slack.slackEvents.length})
                </Text>
              </TouchableOpacity>
            )}
          </>
        )}
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

  // ─── Slack Integration styles ───
  slackDivider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginTop: 24,
    marginBottom: 8,
  },
  slackInputRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  slackInput: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#1F2937',
  },
  slackButton: {
    backgroundColor: '#611f69',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 90,
  },
  slackButtonDisabled: {
    opacity: 0.5,
  },
  slackButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },
  slackStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
    paddingVertical: 4,
  },
  slackStatusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10B981',
  },
  slackStatusText: {
    fontSize: 13,
    color: '#10B981',
    fontWeight: '500',
  },
  slackErrorRow: {
    backgroundColor: '#FEF2F2',
    borderRadius: 8,
    padding: 12,
    marginVertical: 4,
  },
  slackErrorText: {
    fontSize: 13,
    color: '#DC2626',
  },
  slackChannelList: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 12,
  },
  slackChannel: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  slackChannelSelected: {
    backgroundColor: '#F5F0F6',
  },
  slackChannelInfo: {
    flex: 1,
    marginRight: 12,
  },
  slackChannelName: {
    fontSize: 15,
    fontWeight: '500',
    color: '#1F2937',
  },
  slackChannelNameSelected: {
    color: '#611f69',
    fontWeight: '600',
  },
  slackChannelPurpose: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 2,
  },
  slackCheckbox: {
    width: 22,
    height: 22,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  slackCheckboxChecked: {
    borderColor: '#611f69',
    backgroundColor: '#611f69',
  },
  slackCheckboxMark: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: 'bold',
  },
  slackImportButton: {
    backgroundColor: '#611f69',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 8,
  },
  slackImportButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 15,
  },
  slackImportStatus: {
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  slackImportStatusText: {
    fontSize: 13,
    color: '#6B7280',
  },
  slackClearButton: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#DC2626',
    paddingVertical: 10,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 24,
  },
  slackClearButtonText: {
    color: '#DC2626',
    fontWeight: '500',
    fontSize: 14,
  },
});

