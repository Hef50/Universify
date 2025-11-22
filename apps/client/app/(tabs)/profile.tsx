import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Switch,
} from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { useEvents } from '@/contexts/EventsContext';
import { useResponsive } from '@/hooks/useResponsive';
import { Ionicons } from '@expo/vector-icons';

type ProfileTab = 'activity' | 'account' | 'preferences' | 'appearance';

export default function ProfileScreen() {
  const { currentUser, logout } = useAuth();
  const { events } = useEvents();
  const { isDesktop } = useResponsive();
  const [activeTab, setActiveTab] = useState<ProfileTab>('activity');

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
