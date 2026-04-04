import React, { useState, useEffect, useCallback } from 'react';
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
import { useEmail } from '@/contexts/EmailContext';
import { supabase } from '@/lib/supabase';
import { Ionicons } from '@expo/vector-icons';

const BOT_URL = 'http://localhost:3001';

interface OpenRouterUsage {
  label?: string;
  usage?: number;
  usage_daily?: number;
  usage_weekly?: number;
  usage_monthly?: number;
  limit?: number | null;
  limit_remaining?: number | null;
  is_free_tier?: boolean;
  rate_limit?: { requests: number; interval: string };
}

function OpenRouterPanel() {
  const [data, setData] = useState<OpenRouterUsage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${BOT_URL}/api/openrouter/usage`);
      const ct = res.headers.get('content-type') || '';
      if (!ct.includes('application/json')) throw new Error('Bot not running');
      const json = await res.json();
      if (!json.ok) throw new Error(json.error);
      setData(json.key);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, []);

  if (loading) {
    return (
      <View style={orStyles.container}>
        <Text style={orStyles.title}>OpenRouter API Usage</Text>
        <ActivityIndicator size="small" color="#611f69" style={{ marginVertical: 12 }} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={orStyles.container}>
        <Text style={orStyles.title}>OpenRouter API Usage</Text>
        <Text style={orStyles.error}>{error}</Text>
        <TouchableOpacity style={orStyles.refreshBtn} onPress={refresh}>
          <Text style={orStyles.refreshBtnText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!data) return null;

  const usageTotal = (data.usage ?? 0).toFixed(4);
  const usageDaily = (data.usage_daily ?? 0).toFixed(4);
  const usageWeekly = (data.usage_weekly ?? 0).toFixed(4);
  const usageMonthly = (data.usage_monthly ?? 0).toFixed(4);
  const limitDollars = data.limit != null ? `$${data.limit.toFixed(2)}` : 'Unlimited';
  const remaining = data.limit_remaining != null ? `$${data.limit_remaining.toFixed(4)}` : '--';
  const pct = data.limit ? Math.min(100, ((data.usage ?? 0) / data.limit) * 100) : 0;

  return (
    <View style={orStyles.container}>
      <View style={orStyles.headerRow}>
        <Text style={orStyles.title}>OpenRouter API Usage</Text>
        <TouchableOpacity style={orStyles.refreshBtn} onPress={refresh}>
          <Text style={orStyles.refreshBtnText}>Refresh</Text>
        </TouchableOpacity>
      </View>

      <View style={orStyles.row}>
        <Text style={orStyles.label}>API Key</Text>
        <Text style={orStyles.value}>{data.label || 'Default'}</Text>
      </View>

      <View style={orStyles.row}>
        <Text style={orStyles.label}>Total Used</Text>
        <Text style={orStyles.value}>${usageTotal}</Text>
      </View>

      <View style={orStyles.row}>
        <Text style={orStyles.label}>Today</Text>
        <Text style={orStyles.value}>${usageDaily}</Text>
      </View>

      <View style={orStyles.row}>
        <Text style={orStyles.label}>This Week</Text>
        <Text style={orStyles.value}>${usageWeekly}</Text>
      </View>

      <View style={orStyles.row}>
        <Text style={orStyles.label}>This Month</Text>
        <Text style={orStyles.value}>${usageMonthly}</Text>
      </View>

      <View style={orStyles.divider} />

      <View style={orStyles.row}>
        <Text style={orStyles.label}>Credit Limit</Text>
        <Text style={orStyles.value}>{limitDollars}</Text>
      </View>

      <View style={orStyles.row}>
        <Text style={orStyles.label}>Remaining</Text>
        <Text style={[orStyles.value, pct > 80 && { color: '#DC2626' }]}>{remaining}</Text>
      </View>

      {data.limit != null && (
        <View style={orStyles.barOuter}>
          <View style={[orStyles.barInner, { width: `${pct}%`, backgroundColor: pct > 80 ? '#DC2626' : '#611f69' }]} />
        </View>
      )}

      <View style={orStyles.row}>
        <Text style={orStyles.label}>Tier</Text>
        <Text style={orStyles.value}>{data.is_free_tier ? 'Free' : 'Paid'}</Text>
      </View>
    </View>
  );
}

const orStyles = StyleSheet.create({
  container: {
    backgroundColor: '#F5F0FF',
    borderRadius: 10,
    padding: 16,
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#DDD6FE',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    color: '#374151',
  },
  refreshBtn: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    backgroundColor: '#611f69',
    borderRadius: 6,
  },
  refreshBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  label: {
    fontSize: 13,
    color: '#6B7280',
  },
  value: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1F2937',
  },
  barOuter: {
    height: 8,
    backgroundColor: '#E5E7EB',
    borderRadius: 4,
    marginVertical: 8,
    overflow: 'hidden',
  },
  barInner: {
    height: '100%',
    backgroundColor: '#611f69',
    borderRadius: 4,
  },
  divider: {
    height: 1,
    backgroundColor: '#DDD6FE',
    marginVertical: 8,
  },
  error: {
    fontSize: 13,
    color: '#DC2626',
    marginBottom: 8,
  },
});

type ProfileTab = 'activity' | 'account' | 'preferences' | 'appearance';

export default function ProfileScreen() {
  const { currentUser, logout, updateUser } = useAuth();
  const { settings, updateSettings } = useSettings();
  const { events } = useEvents();
  const { isDesktop } = useResponsive();
  const slack = useSlack();
  const email = useEmail();
  const [activeTab, setActiveTab] = useState<ProfileTab>('activity');
  const [botUrlInput, setBotUrlInput] = useState(slack.config.botUrl);
  const [emailBotUrlInput, setEmailBotUrlInput] = useState(email.config.botUrl);
  const [editingAccount, setEditingAccount] = useState(false);
  const [editName, setEditName] = useState(currentUser?.name ?? '');
  const [editUniversity, setEditUniversity] = useState(currentUser?.university ?? '');
  useEffect(() => {
    if (currentUser) {
      setEditName(currentUser.name);
      setEditUniversity(currentUser.university);
    }
  }, [currentUser?.name, currentUser?.university]);

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
                <Text style={styles.settingLabel}>Password</Text>
                <Text style={styles.settingValue}>••••••••</Text>
              </View>
              <TouchableOpacity style={styles.editButton} onPress={() => router.push('/settings/account')}>
                <Text style={styles.editButtonText}>Change</Text>
              </TouchableOpacity>
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
                trackColor={{ false: '#767577', true: '#FF6B6B' }}
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
                trackColor={{ false: '#767577', true: '#FF6B6B' }}
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
                trackColor={{ false: '#767577', true: '#FF6B6B' }}
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

            {/* ─── Email Newsletter Integration ─── */}
            <View style={slackStyles.divider} />
            <Text style={styles.sectionTitle}>Email Newsletter Integration</Text>
            <Text style={slackStyles.description}>
              Import events from newsletters sent to cmunify@gmail.com. Start the email-bot server first.
            </Text>

            {/* Bot URL */}
            <View style={slackStyles.inputRow}>
              <TextInput
                style={slackStyles.input}
                value={emailBotUrlInput}
                onChangeText={setEmailBotUrlInput}
                placeholder="http://localhost:3002"
                placeholderTextColor="#9CA3AF"
                autoCapitalize="none"
                autoCorrect={false}
              />
              <TouchableOpacity
                style={[slackStyles.button, { backgroundColor: '#1a73e8' }, email.isConnecting && slackStyles.buttonDisabled]}
                onPress={() => {
                  email.setBotUrl(emailBotUrlInput.trim());
                  setTimeout(() => email.connect(), 100);
                }}
                disabled={email.isConnecting}
              >
                {email.isConnecting ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={slackStyles.buttonText}>
                    {email.isConnected ? 'Reconnect' : 'Connect'}
                  </Text>
                )}
              </TouchableOpacity>
            </View>

            {/* Connection status */}
            {email.isConnected && (
              <View style={slackStyles.statusRow}>
                <View style={[slackStyles.statusDot, { backgroundColor: '#1a73e8' }]} />
                <Text style={[slackStyles.statusText, { color: '#1a73e8' }]}>Connected to email bot</Text>
              </View>
            )}
            {email.connectionError && (
              <View style={slackStyles.errorRow}>
                <Text style={slackStyles.errorText}>{email.connectionError}</Text>
              </View>
            )}

            {email.isConnected && (
              <>
                {/* Import button */}
                <TouchableOpacity
                  style={[
                    slackStyles.importButton,
                    { backgroundColor: '#1a73e8', marginTop: 12 },
                    email.isImporting && slackStyles.buttonDisabled,
                  ]}
                  onPress={() => email.importEvents()}
                  disabled={email.isImporting}
                >
                  {email.isImporting ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={slackStyles.importButtonText}>Import Events from Email</Text>
                  )}
                </TouchableOpacity>

                {email.importError && (
                  <View style={slackStyles.errorRow}>
                    <Text style={slackStyles.errorText}>{email.importError}</Text>
                  </View>
                )}

                {/* Last import status */}
                {email.lastImportTime && (
                  <View style={{ paddingVertical: 8 }}>
                    <Text style={{ fontSize: 13, color: '#6B7280' }}>
                      Last import: {email.lastImportTime.toLocaleString()} ({email.importedCount} events)
                    </Text>
                  </View>
                )}

                {/* Auto-import toggle */}
                <View style={styles.settingRow}>
                  <Text style={styles.settingLabel}>Auto-import on app load</Text>
                  <Switch
                    value={email.config.autoImport}
                    onValueChange={email.setAutoImport}
                    trackColor={{ false: '#767577', true: '#1a73e8' }}
                  />
                </View>

                {/* Clear imported events */}
                {email.emailEvents.length > 0 && (
                  <TouchableOpacity
                    style={slackStyles.clearButton}
                    onPress={email.clearImportedEvents}
                  >
                    <Text style={slackStyles.clearButtonText}>
                      Clear Email Events ({email.emailEvents.length})
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
                trackColor={{ false: '#767577', true: '#FF6B6B' }}
              />
            </View>
            <View style={styles.settingRow}>
              <Text style={styles.settingLabel}>Compact View</Text>
              <Switch
                value={settings.compactView ?? false}
                onValueChange={(value) => updateSettings({ compactView: value })}
                trackColor={{ false: '#767577', true: '#FF6B6B' }}
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
                      <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              <OpenRouterPanel />
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
  settingLabelValue: {
    flex: 1,
    minWidth: 0,
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
  settingInput: {
    fontSize: 14,
    color: '#1F2937',
    borderWidth: 1,
    borderColor: '#E5E7EB',
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
    backgroundColor: '#F3F4F6',
    borderRadius: 6,
  },
  editButtonText: {
    fontSize: 13,
    color: '#374151',
    fontWeight: '500',
  },
  cancelButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#E5E7EB',
  },
  cancelButtonText: {
    fontSize: 13,
    color: '#374151',
    fontWeight: '500',
  },
  placeholderText: {
    color: '#9CA3AF',
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
    borderBottomColor: '#F3F4F6',
  },
  activityItemContent: {
    flex: 1,
    minWidth: 0,
  },
  activityItemTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 2,
  },
  activityItemMeta: {
    fontSize: 13,
    color: '#6B7280',
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
