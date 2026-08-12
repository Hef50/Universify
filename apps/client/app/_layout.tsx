import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import 'react-native-reanimated';

import { AuthProvider } from '@/contexts/AuthContext';
import { DevModeProvider } from '@/contexts/DevModeContext';
import { GoogleAuthProvider } from '@/contexts/GoogleAuthContext';
import { GoogleCalendarProvider } from '@/contexts/GoogleCalendarContext';
import { EventsProvider } from '@/contexts/EventsContext';
import { SettingsProvider, useSettings } from '@/contexts/SettingsContext';
import { SlackProvider } from '@/contexts/SlackContext';

export const unstable_settings = {
  initialRouteName: 'index',
};

function ThemedStack() {
  const { currentTheme } = useSettings();
  return (
    <ThemeProvider value={currentTheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="(auth)/login" options={{ headerShown: false }} />
        <Stack.Screen name="(auth)/signup" options={{ headerShown: false }} />
        <Stack.Screen name="(auth)/callback" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="settings" options={{ headerShown: false }} />
        <Stack.Screen name="resources" options={{ headerShown: false }} />
        <Stack.Screen name="my-events" options={{ headerShown: false }} />
        <Stack.Screen name="dev" options={{ headerShown: false }} />
        <Stack.Screen name="event/[id]" options={{ presentation: 'modal', title: 'Event Details' }} />
      </Stack>
      <StatusBar style={currentTheme === 'dark' ? 'light' : 'dark'} />
    </ThemeProvider>
  );
}

export default function RootLayout() {
  return (
    // SafeAreaProvider lets the tab bar and headers respect notches and the
    // home indicator when the PWA is installed to a phone's home screen
    <SafeAreaProvider>
      <DevModeProvider>
        <GoogleAuthProvider>
          <AuthProvider>
            <GoogleCalendarProvider>
              <SettingsProvider>
                <EventsProvider>
                  <SlackProvider>
                    <ThemedStack />
                  </SlackProvider>
                </EventsProvider>
              </SettingsProvider>
            </GoogleCalendarProvider>
          </AuthProvider>
        </GoogleAuthProvider>
      </DevModeProvider>
    </SafeAreaProvider>
  );
}
