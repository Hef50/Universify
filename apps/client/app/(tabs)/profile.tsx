import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Switch,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { useEvents } from '@/contexts/EventsContext';
import { useSettings } from '@/contexts/SettingsContext';
import { useResponsive } from '@/hooks/useResponsive';
import { useSlack } from '@/contexts/SlackContext';
import { supabase } from '@/lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '@/hooks/useAppTheme';
import { AppPalette } from '@/constants/theme';

type ProfileTab = 'activity' | 'account' | 'preferences' | 'appearance';

export default function ProfileScreen() {
  const { currentUser, logout, updateUser } = useAuth();
  const { settings, updateSettings } = useSettings();
  const { events } = useEvents();
  const { isDesktop } = useResponsive();
  const slack = useSlack();
  const [activeTab, setActiveTab] = useState<ProfileTab>('activity');
  const [botUrlInput, setBotUrlInput] = useState(slack.config.botUrl);
  const [editingAccount, setEditingAccount] = useState(false);
  const [editName, setEditName] = useState(currentUser?.name ?? '');
  const [editUniversity, setEditUniversity] = useState(currentUser?.university ?? '');
  const currentName = currentUser?.name;
  const currentUniversity = currentUser?.university;
  useEffect(() => {
    if (currentName != null) setEditName(currentName);
    if (currentUniversity != null) setEditUniversity(currentUniversity);
  }, [currentName, currentUniversity]);
  const { colors, fontScale } = useAppTheme();
  const styles = React.useMemo(() => createStyles(colors, fontScale), [colors, fontScale]);
  const slackStyles = React.useMemo(() => createSlackStyles(colors, fontScale), [colors, fontScale]);

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
      case 'account': {
        const saveAccountEdit = async () => {
          try {
            await updateUser({ name: editName, university: editUniversity });
            await supabase.auth.updateUser({ data: { full_name: editName } });
            setEditingAccount(false);
          } catch (err) {
            Alert.alert('Error', err instanceof Error ? err.message : 'Failed to save.');
          }
        };
        return (
          <View style={styles.settingsSection}>
            <Text style={styles.sectionTitle}>Account Settings</Text>
            <View style={styles.settingRow}>
              <View style={styles.settingLabelValue}>
                <Text style={styles.settingLabel}>Name</Text>
                {editingAccount ? (
                  <TextInput
                    style={styles.settingInput}
                    value={editName}
                    onChangeText={setEditName}
                    placeholder="Your name"
                    autoCapitalize="words"
                  />
                ) : (
                  <Text style={styles.settingValue}>{currentUser.name}</Text>
                )}
              </View>
              {editingAccount ? (
                <View style={styles.editRow}>
                  <TouchableOpacity style={styles.editButton} onPress={saveAccountEdit}>
                    <Text style={styles.editButtonText}>Save</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.cancelButton} onPress={() => { setEditingAccount(false); setEditName(currentUser.name); setEditUniversity(currentUser.university); }}>
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity style={styles.editButton} onPress={() => setEditingAccount(true)}>
                  <Text style={styles.editButtonText}>Edit</Text>
                </TouchableOpacity>
              )}
            </View>
            <View style={styles.settingRow}>
              <View style={styles.settingLabelValue}>
                <Text style={styles.settingLabel}>Email</Text>
                <Text style={styles.settingValue}>{currentUser.email}</Text>
              </View>
            </View>
            {editingAccount && (
              <View style={styles.settingRow}>
                <View style={styles.settingLabelValue}>
                  <Text style={styles.settingLabel}>University</Text>
                  <TextInput
                    style={styles.settingInput}
                    value={editUniversity}
                    onChangeText={setEditUniversity}
                    placeholder="Your university"
                  />
                </View>
              </View>
            )}
            {!editingAccount && (
              <View style={styles.settingRow}>
                <View style={styles.settingLabelValue}>
                  <Text style={styles.settingLabel}>University</Text>
                  <Text style={styles.settingValue}>{currentUser.university}</Text>
                </View>
              </View>
            )}
            <View style={styles.settingRow}>
              <View style={styles.settingLabelValue}>
                <Text style={styles.settingLabel}>Sign-in</Text>
                <Text style={styles.settingValue}>Managed by Google (CMU account)</Text>
              </View>
            </View>
          </View>
        );
      }
      case 'preferences':
        return (
          <View style={styles.settingsSection}>
            <Text style={styles.sectionTitle}>Preferences</Text>
            <View style={styles.settingRow}>
              <Text style={styles.settingLabel}>Email Notifications</Text>
              <Switch
                value={currentUser.preferences.notificationPreferences.email}
                onValueChange={(value) =>
                  updateUser({
                    preferences: {
                      ...currentUser.preferences,
                      notificationPreferences: {
                        ...currentUser.preferences.notificationPreferences,
                        email: value,
                      },
                    },
                  })
                }
                trackColor={{ false: colors.border, true: colors.primary }}
              />
            </View>
            <View style={styles.settingRow}>
              <Text style={styles.settingLabel}>Event Reminders</Text>
              <Switch
                value={currentUser.preferences.notificationPreferences.eventReminders}
                onValueChange={(value) =>
                  updateUser({
                    preferences: {
                      ...currentUser.preferences,
                      notificationPreferences: {
                        ...currentUser.preferences.notificationPreferences,
                        eventReminders: value,
                      },
                    },
                  })
                }
                trackColor={{ false: colors.border, true: colors.primary }}
              />
            </View>
            <View style={styles.settingRow}>
              <Text style={styles.settingLabel}>Public Profile</Text>
              <Switch
                value={currentUser.preferences.publicProfile ?? false}
                onValueChange={(value) =>
                  updateUser({
                    preferences: {
                      ...currentUser.preferences,
                      publicProfile: value,
                    },
                  })
                }
                trackColor={{ false: colors.border, true: colors.primary }}
              />
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
                placeholderTextColor={colors.textTertiary}
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
                  <ActivityIndicator size="small" color={colors.onPrimary} />
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
                <Text style={[styles.sectionTitle, { marginTop: 12, fontSize: 15 * fontScale }]}>Select Channels</Text>
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
                    <ActivityIndicator size="small" color={colors.onPrimary} />
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
                    <Text style={{ fontSize: 13 * fontScale, color: colors.textSecondary }}>
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
                    trackColor={{ false: colors.border, true: '#611f69' }}
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
              <Switch
                value={settings.theme === 'dark'}
                onValueChange={(value) => updateSettings({ theme: value ? 'dark' : 'light' })}
                trackColor={{ false: colors.border, true: colors.primary }}
              />
            </View>
            <View style={styles.settingRow}>
              <Text style={styles.settingLabel}>Compact View</Text>
              <Switch
                value={settings.compactView ?? false}
                onValueChange={(value) => updateSettings({ compactView: value })}
                trackColor={{ false: colors.border, true: colors.primary }}
              />
            </View>
          </View>
        );
      case 'activity':
      default: {
        const activityEvents = [
          ...myEvents.map((e) => ({ event: e, type: 'created' as const })),
          ...savedEvents.filter((e) => !currentUser.createdEvents.includes(e.id)).map((e) => ({ event: e, type: 'saved' as const })),
        ].sort((a, b) => new Date(b.event.startTime).getTime() - new Date(a.event.startTime).getTime());
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
              {activityEvents.length === 0 ? (
                <Text style={styles.placeholderText}>Recent activity and saved events will appear here.</Text>
              ) : (
                <View style={styles.activityList}>
                  {activityEvents.slice(0, 20).map(({ event, type }) => (
                    <TouchableOpacity
                      key={event.id}
                      style={styles.activityItem}
                      onPress={() => router.push(`/event/${event.id}`)}
                      activeOpacity={0.7}
                    >
                      <View style={styles.activityItemContent}>
                        <Text style={styles.activityItemTitle} numberOfLines={1}>{event.title}</Text>
                        <Text style={styles.activityItemMeta}>
                          {new Date(event.startTime).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                          {' · '}{type === 'created' ? 'Created' : 'Saved'}
                        </Text>
                      </View>
                      <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
          </>
        );
      }
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
                <Ionicons name="time-outline" size={20} color={activeTab === 'activity' ? colors.primary : colors.textPrimary} style={styles.desktopMenuIcon} />
                <Text style={[styles.desktopMenuText, activeTab === 'activity' && styles.desktopMenuTextActive]}>Activity</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.desktopMenuItem, activeTab === 'account' && styles.desktopMenuItemActive]} 
                onPress={() => setActiveTab('account')}
              >
                <Ionicons name="person-outline" size={20} color={activeTab === 'account' ? colors.primary : colors.textPrimary} style={styles.desktopMenuIcon} />
                <Text style={[styles.desktopMenuText, activeTab === 'account' && styles.desktopMenuTextActive]}>Account</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.desktopMenuItem, activeTab === 'preferences' && styles.desktopMenuItemActive]} 
                onPress={() => setActiveTab('preferences')}
              >
                <Ionicons name="settings-outline" size={20} color={activeTab === 'preferences' ? colors.primary : colors.textPrimary} style={styles.desktopMenuIcon} />
                <Text style={[styles.desktopMenuText, activeTab === 'preferences' && styles.desktopMenuTextActive]}>Preferences</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.desktopMenuItem, activeTab === 'appearance' && styles.desktopMenuItemActive]} 
                onPress={() => setActiveTab('appearance')}
              >
                <Ionicons name="color-palette-outline" size={20} color={activeTab === 'appearance' ? colors.primary : colors.textPrimary} style={styles.desktopMenuIcon} />
                <Text style={[styles.desktopMenuText, activeTab === 'appearance' && styles.desktopMenuTextActive]}>Appearance</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.desktopMenuItem, styles.desktopLogoutItem]} onPress={handleLogout}>
                 <Ionicons name="log-out-outline" size={20} color={colors.primary} style={styles.desktopMenuIcon} />
                 <Text style={[styles.desktopMenuText, {color: colors.primary}]}>Log Out</Text>
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
          <Ionicons name="person-outline" size={20} color={colors.primary} style={styles.menuIcon} />
          <Text style={styles.menuText}>Account Settings</Text>
          <Ionicons name="chevron-forward" size={20} color={colors.textTertiary} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => router.push('/settings/preferences')}
        >
          <Ionicons name="settings-outline" size={20} color={colors.primary} style={styles.menuIcon} />
          <Text style={styles.menuText}>Preferences</Text>
          <Ionicons name="chevron-forward" size={20} color={colors.textTertiary} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => router.push('/settings/appearance')}
        >
          <Ionicons name="color-palette-outline" size={20} color={colors.primary} style={styles.menuIcon} />
          <Text style={styles.menuText}>Appearance</Text>
          <Ionicons name="chevron-forward" size={20} color={colors.textTertiary} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutText}>Log Out</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const createStyles = (colors: AppPalette, fontScale: number) =>
  StyleSheet.create({
    // Mobile Styles
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      alignItems: 'center',
      padding: 32,
      backgroundColor: colors.surface,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    avatar: {
      width: 80,
      height: 80,
      borderRadius: 40,
      backgroundColor: colors.primary,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 16,
    },
    avatarText: {
      fontSize: 32 * fontScale,
      fontWeight: 'bold',
      color: colors.onPrimary,
    },
    name: {
      fontSize: 24 * fontScale,
      fontWeight: 'bold',
      color: colors.textPrimary,
      marginBottom: 4,
    },
    email: {
      fontSize: 14 * fontScale,
      color: colors.textSecondary,
      marginBottom: 4,
    },
    university: {
      fontSize: 14 * fontScale,
      color: colors.textTertiary,
    },
    stats: {
      flexDirection: 'row',
      backgroundColor: colors.surface,
      padding: 20,
      marginTop: 8,
    },
    statItem: {
      flex: 1,
      alignItems: 'center',
    },
    statValue: {
      fontSize: 24 * fontScale,
      fontWeight: 'bold',
      color: colors.textPrimary,
      marginBottom: 4,
    },
    statLabel: {
      fontSize: 12 * fontScale,
      color: colors.textSecondary,
    },
    statDivider: {
      width: 1,
      backgroundColor: colors.border,
    },
    menu: {
      backgroundColor: colors.surface,
      marginTop: 8,
    },
    menuItem: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 16,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    menuIcon: {
      marginRight: 12,
    },
    menuText: {
      flex: 1,
      fontSize: 16 * fontScale,
      color: colors.textPrimary,
    },
    logoutButton: {
      margin: 16,
      padding: 16,
      backgroundColor: colors.surface,
      borderRadius: 8,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: colors.primary,
    },
    logoutText: {
      fontSize: 16 * fontScale,
      fontWeight: '600',
      color: colors.primary,
    },

    // Desktop Styles
    desktopContainer: {
      flex: 1,
      flexDirection: 'row',
      backgroundColor: colors.background,
      width: '100%',
      padding: 32,
      gap: 32,
    },
    desktopSidebar: {
      width: 280,
      backgroundColor: colors.surface,
      borderRadius: 12,
      padding: 24,
      borderWidth: 1,
      borderColor: colors.border,
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
      backgroundColor: colors.primary,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 16,
    },
    desktopAvatarText: {
      fontSize: 32 * fontScale,
      fontWeight: 'bold',
      color: colors.onPrimary,
    },
    desktopName: {
      fontSize: 20 * fontScale,
      fontWeight: 'bold',
      color: colors.textPrimary,
      marginBottom: 4,
    },
    desktopEditButton: {
      backgroundColor: colors.surfaceAlt,
      paddingVertical: 8,
      paddingHorizontal: 16,
      borderRadius: 8,
      width: '100%',
      alignItems: 'center',
    },
    desktopEditButtonText: {
      fontSize: 14 * fontScale,
      fontWeight: '600',
      color: colors.textPrimary,
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
      backgroundColor: colors.dangerSoft, // Light red/orange background
    },
    desktopMenuIcon: {
      marginRight: 12,
    },
    desktopMenuText: {
      fontSize: 15 * fontScale,
      color: colors.textPrimary,
      fontWeight: '500',
    },
    desktopMenuTextActive: {
      color: colors.primary,
      fontWeight: '600',
    },
    desktopLogoutItem: {
      marginTop: 16,
      borderTopWidth: 1,
      borderTopColor: colors.surfaceAlt,
      paddingTop: 16,
    },
    desktopMainContent: {
      flex: 1,
    },
    desktopStatsRow: {
      flexDirection: 'row',
      backgroundColor: colors.surface,
      padding: 24,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      marginBottom: 24,
    },
    desktopContentSection: {
      backgroundColor: colors.surface,
      padding: 24,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      minHeight: 400,
    },
    settingsSection: {
      backgroundColor: colors.surface,
      padding: 24,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      minHeight: 400,
    },
    sectionTitle: {
      fontSize: 18 * fontScale,
      fontWeight: '600',
      color: colors.textPrimary,
      marginBottom: 24,
    },
    settingRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 16,
      borderBottomWidth: 1,
      borderBottomColor: colors.surfaceAlt,
    },
    settingLabelValue: {
      flex: 1,
      minWidth: 0,
    },
    settingLabel: {
      fontSize: 15 * fontScale,
      color: colors.textPrimary,
      fontWeight: '500',
      marginBottom: 4,
    },
    settingValue: {
      fontSize: 14 * fontScale,
      color: colors.textSecondary,
    },
    settingInput: {
      fontSize: 14 * fontScale,
      color: colors.textPrimary,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 6,
      paddingHorizontal: 10,
      paddingVertical: 8,
      marginTop: 4,
    },
    editRow: {
      flexDirection: 'row',
      gap: 8,
    },
    editButton: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      backgroundColor: colors.surfaceAlt,
      borderRadius: 6,
    },
    editButtonText: {
      fontSize: 13 * fontScale,
      color: colors.textPrimary,
      fontWeight: '500',
    },
    cancelButton: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 6,
      backgroundColor: colors.border,
    },
    cancelButtonText: {
      fontSize: 13 * fontScale,
      color: colors.textPrimary,
      fontWeight: '500',
    },
    placeholderText: {
      color: colors.textTertiary,
      fontStyle: 'italic',
    },
    activityList: {
      gap: 0,
    },
    activityItem: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 14,
      paddingHorizontal: 0,
      borderBottomWidth: 1,
      borderBottomColor: colors.surfaceAlt,
    },
    activityItemContent: {
      flex: 1,
      minWidth: 0,
    },
    activityItemTitle: {
      fontSize: 15 * fontScale,
      fontWeight: '600',
      color: colors.textPrimary,
      marginBottom: 2,
    },
    activityItemMeta: {
      fontSize: 13 * fontScale,
      color: colors.textSecondary,
    },
  });

const createSlackStyles = (colors: AppPalette, fontScale: number) =>
  StyleSheet.create({
    divider: {
      height: 1,
      backgroundColor: colors.border,
      marginTop: 20,
      marginBottom: 8,
    },
    description: {
      fontSize: 13 * fontScale,
      color: colors.textSecondary,
      marginBottom: 12,
    },
    inputRow: {
      flexDirection: 'row',
      gap: 8,
      marginBottom: 8,
    },
    input: {
      flex: 1,
      backgroundColor: colors.surface,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: 12,
      paddingVertical: 10,
      fontSize: 14 * fontScale,
      color: colors.textPrimary,
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
      color: colors.onPrimary,
      fontWeight: '600',
      fontSize: 14 * fontScale,
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
      backgroundColor: colors.success,
    },
    statusText: {
      fontSize: 13 * fontScale,
      color: colors.success,
      fontWeight: '500',
    },
    errorRow: {
      backgroundColor: colors.dangerSoft,
      borderRadius: 8,
      padding: 12,
      marginVertical: 4,
    },
    errorText: {
      fontSize: 13 * fontScale,
      color: colors.danger,
    },
    channelList: {
      backgroundColor: colors.surface,
      borderRadius: 8,
      overflow: 'hidden',
      marginBottom: 12,
      borderWidth: 1,
      borderColor: colors.border,
    },
    channel: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.surfaceAlt,
    },
    channelSelected: {
      backgroundColor: '#F5F0F6',
    },
    channelName: {
      fontSize: 14 * fontScale,
      fontWeight: '500',
      color: colors.textPrimary,
    },
    channelNameSelected: {
      color: '#611f69',
      fontWeight: '600',
    },
    channelPurpose: {
      fontSize: 12 * fontScale,
      color: colors.textTertiary,
      marginTop: 2,
    },
    checkbox: {
      width: 22,
      height: 22,
      borderRadius: 4,
      borderWidth: 2,
      borderColor: colors.border,
      justifyContent: 'center',
      alignItems: 'center',
    },
    checkboxChecked: {
      borderColor: '#611f69',
      backgroundColor: '#611f69',
    },
    checkboxMark: {
      color: colors.onPrimary,
      fontSize: 13 * fontScale,
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
      color: colors.onPrimary,
      fontWeight: '600',
      fontSize: 15 * fontScale,
    },
    clearButton: {
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.danger,
      paddingVertical: 10,
      alignItems: 'center',
      marginTop: 8,
      marginBottom: 16,
    },
    clearButtonText: {
      color: colors.danger,
      fontWeight: '500',
      fontSize: 14 * fontScale,
    },
  });
