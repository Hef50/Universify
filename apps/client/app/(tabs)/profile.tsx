import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { useEvents } from '@/contexts/EventsContext';

export default function ProfileScreen() {
  const { currentUser, logout } = useAuth();
  const { events } = useEvents();

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
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{myEvents.length}</Text>
          <Text style={styles.statLabel}>Events Created</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{savedEvents.length}</Text>
          <Text style={styles.statLabel}>Events Saved</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statValue}>
            {currentUser.preferences.categoryInterests.length}
          </Text>
          <Text style={styles.statLabel}>Interests</Text>
        </View>
      </View>

      {/* Menu Items */}
      <View style={styles.menu}>
        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => router.push('/settings/account')}
        >
          <Text style={styles.menuIcon}>👤</Text>
          <Text style={styles.menuText}>Account Settings</Text>
          <Text style={styles.menuArrow}>›</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => router.push('/settings/preferences')}
        >
          <Text style={styles.menuIcon}>⚙️</Text>
          <Text style={styles.menuText}>Preferences</Text>
          <Text style={styles.menuArrow}>›</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => router.push('/settings/appearance')}
        >
          <Text style={styles.menuIcon}>🎨</Text>
          <Text style={styles.menuText}>Appearance</Text>
          <Text style={styles.menuArrow}>›</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuItem}>
          <Text style={styles.menuIcon}>🔔</Text>
          <Text style={styles.menuText}>Notifications</Text>
          <Text style={styles.menuArrow}>›</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuItem}>
          <Text style={styles.menuIcon}>🔒</Text>
          <Text style={styles.menuText}>Privacy</Text>
          <Text style={styles.menuArrow}>›</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuItem}>
          <Text style={styles.menuIcon}>ℹ️</Text>
          <Text style={styles.menuText}>About</Text>
          <Text style={styles.menuArrow}>›</Text>
        </TouchableOpacity>
      </View>

      {/* Logout Button */}
      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Text style={styles.logoutText}>Log Out</Text>
      </TouchableOpacity>

      <View style={styles.footer}>
        <Text style={styles.footerText}>Universify v1.0.0</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
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
    fontSize: 20,
    marginRight: 12,
  },
  menuText: {
    flex: 1,
    fontSize: 16,
    color: '#1F2937',
  },
  menuArrow: {
    fontSize: 24,
    color: '#9CA3AF',
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
  footer: {
    padding: 20,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
    color: '#9CA3AF',
  },
});

