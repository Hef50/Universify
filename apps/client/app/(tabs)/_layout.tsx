import { Tabs, router } from 'expo-router';
import React, { useEffect } from 'react';

import { HapticTab } from '@/components/haptic-tab';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useAppTheme } from '@/hooks/useAppTheme';
import { useAuth } from '@/contexts/AuthContext';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Spacing } from '@/constants/design';
import { useResponsive } from '@/hooks/useResponsive';
import { DesktopNav } from '@/components/layout/DesktopNav';

export default function TabLayout() {
  const { colors } = useAppTheme();
  const { isAuthenticated, isLoading } = useAuth();
  const { isDesktop } = useResponsive();
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace('/(auth)/login');
    }
  }, [isAuthenticated, isLoading]);

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <>
      {isDesktop && <DesktopNav />}
      <Tabs
        screenOptions={{
          tabBarActiveTintColor: colors.primary,
          tabBarInactiveTintColor: colors.textTertiary,
          headerShown: false,
          tabBarButton: HapticTab,
          tabBarStyle: isDesktop
            ? { display: 'none' }
            : {
                backgroundColor: colors.surface,
                borderTopColor: colors.border,
                borderTopWidth: StyleSheet.hairlineWidth,
                height: 64 + insets.bottom,
                paddingTop: Spacing.sm,
                paddingHorizontal: Spacing.sm,
                paddingBottom: Math.max(insets.bottom, Spacing.sm),
              },
          tabBarLabelStyle: {
            fontSize: 11,
            fontWeight: '600',
            letterSpacing: 0.1,
          },
          tabBarItemStyle: { paddingVertical: 0 },
        }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color }) => <IconSymbol size={26} name="house.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="calendar"
        options={{
          title: 'Calendar',
          tabBarIcon: ({ color }) => <IconSymbol size={26} name="calendar" color={color} />,
        }}
      />
      <Tabs.Screen
        name="find"
        options={{
          title: 'Find',
          tabBarIcon: ({ color }) => <IconSymbol size={26} name="magnifyingglass" color={color} />,
        }}
      />
      <Tabs.Screen
        name="create"
        options={{
          title: 'Create',
          tabBarIcon: ({ color }) => <IconSymbol size={26} name="plus.circle.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color }) => <IconSymbol size={26} name="person.fill" color={color} />,
        }}
      />
    </Tabs>
    </>
  );
}
