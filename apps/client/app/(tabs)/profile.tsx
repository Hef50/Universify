import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Switch,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { useEvents } from '@/contexts/EventsContext';
import { useResponsive } from '@/hooks/useResponsive';
import { useSlack } from '@/contexts/SlackContext';
import { Ionicons } from '@expo/vector-icons';

type ProfileTab = 'activity' | 'account' | 'preferences' | 'appearance';

export default function ProfileScreen() {
  const { currentUser, logout } = useAuth();
  const { events } = useEvents();
  const { isDesktop } = useResponsive();
  const slack = useSlack();
  const [activeTab, setActiveTab] = useState<ProfileTab>('activity');
  const [botUrlInput, setBotUrlInput] = useState(slack.config.botUrl);

  if (!currentUser) {
    return null;
  }

  const myEvents = events.filter((e) =>
    currentUser.createdEvents.includes(e.id)
  );
  const savedEvents = events.filter((e) =>
    currentUser.savedEvents.some((se) => se.eventId === e.id)
  );

  const handleLogout = async () => {
    await logout();
    router.replace('/(auth)/login');
  };

  const StatItem = ({ value, label }: { value: number | string; label: string }) => (
    <View style={styles.statItem}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );

  const renderContent = () => {
    switch (activeTab) {
      case 'account':
        return (
          <View style={styles.settingsSection}>
            <Text style={styles.sectionTitle}>Account Settings</Text>
            <View style={styles.settingRow}>
              <View>
                <Text style={styles.settingLabel}>Email</Text>
                <Text style={styles.settingValue}>{currentUser.email}</Text>
              </View>
              <TouchableOpacity style={styles.editButton}>
                <Text style={styles.editButtonText}>Edit</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.settingRow}>
              <View>
                <Text style={styles.settingLabel}>Password</Text>
                <Text style={styles.settingValue}>••••••••</Text>
              </View>
              <TouchableOpacity style={styles.editButton}>
                <Text style={styles.editButtonText}>Change</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.settingRow}>
              <View>
                <Text style={styles.settingLabel}>University</Text>
                <Text style={styles.settingValue}>{currentUser.university}</Text>
              </View>
            </View>
          </View>
        );
      case 'preferences':
        return (
          <View style={styles.settingsSection}>
            <Text style={styles.sectionTitle}>Preferences</Text>
            <View style={styles.settingRow}>
              <Text style={styles.settingLabel}>Email Notifications</Text>
              <Switch value={true} trackColor={{ false: '#767577', true: '#FF6B6B' }} />
            </View>
            <View style={styles.settingRow}>
              <Text style={styles.settingLabel}>Event Reminders</Text>
              <Switch value={true} trackColor={{ false: '#767577', true: '#FF6B6B' }} />
            </View>
            <View style={styles.settingRow}>
              <Text style={styles.settingLabel}>Public Profile</Text>
              <Switch value={false} trackColor={{ false: '#767577', true: '#FF6B6B' }} />
            </View>

            {/* ─── Slack Integration ─── */}
            <View style={slackStyles.divider} />
            <Text style={styles.sectionTitle}>Slack Integration</Text>
            <Text style={slackStyles.description}>
              Import events from your Slack workspace channels (e.g. #announcements)
            </Text>

            {/* Bot URL */}
            <View style={slackStyles.inputRow}>
              <TextInput
                style={slackStyles.input}
                value={botUrlInput}
                onChangeText={setBotUrlInput}
                placeholder="http://localhost:3001"
                placeholderTextColor="#9CA3AF"
                autoCapitalize="none"
                autoCorrect={false}
              />
              <TouchableOpacity
                style={[slackStyles.button, slack.isConnecting && slackStyles.buttonDisabled]}
                onPress={() => {
                  slack.setBotUrl(botUrlInput.trim());
                  setTimeout(() => slack.connect(), 100);
                }}
                disabled={slack.isConnecting}
              >
                {slack.isConnecting ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={slackStyles.buttonText}>
                    {slack.isConnected ? 'Reconnect' : 'Connect'}
                  </Text>
                )}
              </TouchableOpacity>
            </View>

            {/* Connection status */}
            {slack.isConnected && (
              <View style={slackStyles.statusRow}>
                <View style={slackStyles.statusDot} />
                <Text style={slackStyles.statusText}>Connected to Slack bot</Text>
              </View>
            )}
            {slack.connectionError && (
              <View style={slackStyles.errorRow}>
                <Text style={slackStyles.errorText}>{slack.connectionError}</Text>
              </View>
            )}

            {/* Channel selector */}
            {slack.isConnected && (
              <>
                <Text style={[styles.sectionTitle, { marginTop: 12, fontSize: 15 }]}>Select Channels</Text>
                {slack.isLoadingChannels ? (
                  <ActivityIndicator size="small" color="#611f69" style={{ marginVertical: 12 }} />
                ) : slack.channels.length === 0 ? (
                  <Text style={slackStyles.description}>
                    No channels found. Make sure the bot is added to channels in Slack.
                  </Text>
                ) : (
                  <View style={slackStyles.channelList}>
                    {slack.channels.map((channel) => {
                      const isSelected = slack.config.selectedChannelIds.includes(channel.id);
                      return (
                        <TouchableOpacity
                          key={channel.id}
                          style={[slackStyles.channel, isSelected && slackStyles.channelSelected]}
                          onPress={() => slack.toggleChannel(channel.id)}
                        >
                          <View style={{ flex: 1, marginRight: 12 }}>
                            <Text style={[slackStyles.channelName, isSelected && slackStyles.channelNameSelected]}>
                              #{channel.name}
                            </Text>
                            {channel.purpose ? (
                              <Text style={slackStyles.channelPurpose} numberOfLines={1}>
                                {channel.purpose}
                              </Text>
                            ) : null}
                          </View>
                          <View style={[slackStyles.checkbox, isSelected && slackStyles.checkboxChecked]}>
                            {isSelected && <Text style={slackStyles.checkboxMark}>✓</Text>}
                          </View>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                )}

                {/* Import button */}
                <TouchableOpacity
                  style={[
                    slackStyles.importButton,
                    (slack.isImporting || slack.config.selectedChannelIds.length === 0) &&
                      slackStyles.buttonDisabled,
                  ]}
                  onPress={() => slack.importEvents()}
                  disabled={slack.isImporting || slack.config.selectedChannelIds.length === 0}
                >
                  {slack.isImporting ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={slackStyles.importButtonText}>
                      Import Events from Slack
                    </Text>
                  )}
                </TouchableOpacity>

                {slack.importError && (
                  <View style={slackStyles.errorRow}>
                    <Text style={slackStyles.errorText}>{slack.importError}</Text>
                  </View>
                )}

                {/* Import status */}
                {slack.lastImportTime && (
                  <View style={{ paddingVertical: 8 }}>
                    <Text style={{ fontSize: 13, color: '#6B7280' }}>
                      Last import: {slack.lastImportTime.toLocaleString()} ({slack.importedCount} events)
                    </Text>
                  </View>
                )}

                {/* Auto-import toggle */}
                <View style={styles.settingRow}>
                  <Text style={styles.settingLabel}>Auto-import on app load</Text>
                  <Switch
                    value={slack.config.autoImport}
                    onValueChange={slack.setAutoImport}
                    trackColor={{ false: '#767577', true: '#611f69' }}
                  />
                </View>

                {/* Clear imported events */}
                {slack.slackEvents.length > 0 && (
                  <TouchableOpacity
                    style={slackStyles.clearButton}
                    onPress={slack.clearImportedEvents}
                  >
                    <Text style={slackStyles.clearButtonText}>
                      Clear Imported Events ({slack.slackEvents.length})
                    </Text>
                  </TouchableOpacity>
                )}
              </>
            )}
          </View>
        );
      case 'appearance':
        return (
          <View style={styles.settingsSection}>
            <Text style={styles.sectionTitle}>Appearance</Text>
            <View style={styles.settingRow}>
              <Text style={styles.settingLabel}>Dark Mode</Text>
              <Switch value={false} trackColor={{ false: '#767577', true: '#FF6B6B' }} />
            </View>
            <View style={styles.settingRow}>
              <Text style={styles.settingLabel}>Compact View</Text>
              <Switch value={false} trackColor={{ false: '#767577', true: '#FF6B6B' }} />
            </View>
          </View>
        );
      case 'activity':
      default:
        return (
          <>
            <View style={styles.desktopStatsRow}>
                <StatItem value={myEvents.length} label="Events Created" />
                <View style={styles.statDivider} />
                <StatItem value={savedEvents.length} label="Events Saved" />
                <View style={styles.statDivider} />
                <StatItem value={currentUser.preferences.categoryInterests.length} label="Interests" />
            </View>

            <View style={styles.desktopContentSection}>
              <Text style={styles.sectionTitle}>My Activity</Text>
              <Text style={styles.placeholderText}>Recent activity and saved events will appear here.</Text>
            </View>
          </>
        );
    }
  };

  if (isDesktop) {
    return (
      <View style={styles.desktopContainer}>
        {/* Sidebar - Left Column */}
        <View style={styles.desktopSidebar}>
           <View style={styles.desktopProfileHeader}>
              <View style={styles.desktopAvatar}>
                <Text style={styles.desktopAvatarText}>
                  {currentUser.name.charAt(0).toUpperCase()}
                </Text>
              </View>
              <Text style={styles.desktopName}>{currentUser.name}</Text>
              {/* Removed Edit Profile Button */}
           </View>

           {/* Menu */}
           <View style={styles.desktopMenu}>
              <TouchableOpacity 
                style={[styles.desktopMenuItem, activeTab === 'activity' && styles.desktopMenuItemActive]} 
                onPress={() => setActiveTab('activity')}
              >
                <Ionicons name="time-outline" size={20} color={activeTab === 'activity' ? '#FF6B6B' : '#374151'} style={styles.desktopMenuIcon} />
                <Text style={[styles.desktopMenuText, activeTab === 'activity' && styles.desktopMenuTextActive]}>Activity</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.desktopMenuItem, activeTab === 'account' && styles.desktopMenuItemActive]} 
                onPress={() => setActiveTab('account')}
              >
                <Ionicons name="person-outline" size={20} color={activeTab === 'account' ? '#FF6B6B' : '#374151'} style={styles.desktopMenuIcon} />
                <Text style={[styles.desktopMenuText, activeTab === 'account' && styles.desktopMenuTextActive]}>Account</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.desktopMenuItem, activeTab === 'preferences' && styles.desktopMenuItemActive]} 
                onPress={() => setActiveTab('preferences')}
              >
                <Ionicons name="settings-outline" size={20} color={activeTab === 'preferences' ? '#FF6B6B' : '#374151'} style={styles.desktopMenuIcon} />
                <Text style={[styles.desktopMenuText, activeTab === 'preferences' && styles.desktopMenuTextActive]}>Preferences</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.desktopMenuItem, activeTab === 'appearance' && styles.desktopMenuItemActive]} 
                onPress={() => setActiveTab('appearance')}
              >
                <Ionicons name="color-palette-outline" size={20} color={activeTab === 'appearance' ? '#FF6B6B' : '#374151'} style={styles.desktopMenuIcon} />
                <Text style={[styles.desktopMenuText, activeTab === 'appearance' && styles.desktopMenuTextActive]}>Appearance</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.desktopMenuItem, styles.desktopLogoutItem]} onPress={handleLogout}>
                 <Ionicons name="log-out-outline" size={20} color="#FF6B6B" style={styles.desktopMenuIcon} />
                 <Text style={[styles.desktopMenuText, {color: '#FF6B6B'}]}>Log Out</Text>
              </TouchableOpacity>
           </View>
        </View>

        {/* Main Content - Right Column */}
        <View style={styles.desktopMainContent}>
           <ScrollView showsVerticalScrollIndicator={false}>
             {renderContent()}
           </ScrollView>
        </View>
      </View>
    );
  }

  // Mobile Layout (Original) - Updated Icons
  return (
    <ScrollView style={styles.container}>
      {/* Profile Header */}
      <View style={styles.header}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {currentUser.name.charAt(0).toUpperCase()}
          </Text>
        </View>
        <Text style={styles.name}>{currentUser.name}</Text>
        <Text style={styles.email}>{currentUser.email}</Text>
        <Text style={styles.university}>{currentUser.university}</Text>
      </View>

      {/* Stats */}
      <View style={styles.stats}>
        <StatItem value={myEvents.length} label="Events Created" />
        <View style={styles.statDivider} />
        <StatItem value={savedEvents.length} label="Events Saved" />
        <View style={styles.statDivider} />
        <StatItem value={currentUser.preferences.categoryInterests.length} label="Interests" />
      </View>

      {/* Menu Items */}
      <View style={styles.menu}>
        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => router.push('/settings/account')}
        >
          <Ionicons name="person-outline" size={20} color="#FF6B6B" style={styles.menuIcon} />
          <Text style={styles.menuText}>Account Settings</Text>
          <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => router.push('/settings/preferences')}
        >
          <Ionicons name="settings-outline" size={20} color="#FF6B6B" style={styles.menuIcon} />
          <Text style={styles.menuText}>Preferences</Text>
          <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => router.push('/settings/appearance')}
        >
          <Ionicons name="color-palette-outline" size={20} color="#FF6B6B" style={styles.menuIcon} />
          <Text style={styles.menuText}>Appearance</Text>
          <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutText}>Log Out</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  // Mobile Styles
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    alignItems: 'center',
    padding: 32,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FF6B6B',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatarText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  name: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 4,
  },
  email: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 4,
  },
  university: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  stats: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    padding: 20,
    marginTop: 8,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
  },
  statDivider: {
    width: 1,
    backgroundColor: '#E5E7EB',
  },
  menu: {
    backgroundColor: '#FFFFFF',
    marginTop: 8,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  menuIcon: {
    marginRight: 12,
  },
  menuText: {
    flex: 1,
    fontSize: 16,
    color: '#1F2937',
  },
  logoutButton: {
    margin: 16,
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FF6B6B',
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FF6B6B',
  },

  // Desktop Styles
  desktopContainer: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#FAFAFA',
    width: '100%',
    padding: 32,
    gap: 32,
  },
  desktopSidebar: {
    width: 280,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 24,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignSelf: 'flex-start',
  },
  desktopProfileHeader: {
    alignItems: 'flex-start',
    marginBottom: 32,
  },
  desktopAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FF6B6B',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  desktopAvatarText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  desktopName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 4,
  },
  desktopEditButton: {
    backgroundColor: '#F3F4F6',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    width: '100%',
    alignItems: 'center',
  },
  desktopEditButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  desktopMenu: {
    gap: 8,
  },
  desktopMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
  },
  desktopMenuItemActive: {
    backgroundColor: '#FFF1F1', // Light red/orange background
  },
  desktopMenuIcon: {
    marginRight: 12,
  },
  desktopMenuText: {
    fontSize: 15,
    color: '#374151',
    fontWeight: '500',
  },
  desktopMenuTextActive: {
    color: '#FF6B6B',
    fontWeight: '600',
  },
  desktopLogoutItem: {
    marginTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    paddingTop: 16,
  },
  desktopMainContent: {
    flex: 1,
  },
  desktopStatsRow: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    padding: 24,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 24,
  },
  desktopContentSection: {
    backgroundColor: '#FFFFFF',
    padding: 24,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    minHeight: 400,
  },
  settingsSection: {
    backgroundColor: '#FFFFFF',
    padding: 24,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    minHeight: 400,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 24,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  settingLabel: {
    fontSize: 15,
    color: '#374151',
    fontWeight: '500',
    marginBottom: 4,
  },
  settingValue: {
    fontSize: 14,
    color: '#6B7280',
  },
  editButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#F3F4F6',
    borderRadius: 6,
  },
  editButtonText: {
    fontSize: 13,
    color: '#374151',
    fontWeight: '500',
  },
  placeholderText: {
    color: '#9CA3AF',
    fontStyle: 'italic',
  },
});

const slackStyles = StyleSheet.create({
  divider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginTop: 20,
    marginBottom: 8,
  },
  description: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 12,
  },
  inputRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  input: {
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
  button: {
    backgroundColor: '#611f69',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 90,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
    paddingVertical: 4,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10B981',
  },
  statusText: {
    fontSize: 13,
    color: '#10B981',
    fontWeight: '500',
  },
  errorRow: {
    backgroundColor: '#FEF2F2',
    borderRadius: 8,
    padding: 12,
    marginVertical: 4,
  },
  errorText: {
    fontSize: 13,
    color: '#DC2626',
  },
  channelList: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  channel: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  channelSelected: {
    backgroundColor: '#F5F0F6',
  },
  channelName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1F2937',
  },
  channelNameSelected: {
    color: '#611f69',
    fontWeight: '600',
  },
  channelPurpose: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 2,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    borderColor: '#611f69',
    backgroundColor: '#611f69',
  },
  checkboxMark: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: 'bold',
  },
  importButton: {
    backgroundColor: '#611f69',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 8,
  },
  importButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 15,
  },
  clearButton: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#DC2626',
    paddingVertical: 10,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 16,
  },
  clearButtonText: {
    color: '#DC2626',
    fontWeight: '500',
    fontSize: 14,
  },
});
