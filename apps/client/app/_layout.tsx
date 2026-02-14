import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { AuthProvider } from '@/contexts/AuthContext';
import { GoogleAuthProvider } from '@/contexts/GoogleAuthContext';
import { GoogleCalendarProvider } from '@/contexts/GoogleCalendarContext';
import { EventsProvider } from '@/contexts/EventsContext';
import { SettingsProvider } from '@/contexts/SettingsContext';
import { SlackProvider } from '@/contexts/SlackContext';

export const unstable_settings = {
  initialRouteName: 'index',
};

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <GoogleAuthProvider>
      <AuthProvider>
        <GoogleCalendarProvider>
          <SettingsProvider>
            <EventsProvider>
              <SlackProvider>
                <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
                  <Stack>
                    <Stack.Screen name="index" options={{ headerShown: false }} />
                    <Stack.Screen name="(auth)/login" options={{ headerShown: false }} />
                    <Stack.Screen name="(auth)/signup" options={{ headerShown: false }} />
                    <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                    <Stack.Screen name="settings" options={{ headerShown: false }} />
                    <Stack.Screen name="event/[id]" options={{ presentation: 'modal', title: 'Event Details' }} />
                    <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
                  </Stack>
                  <StatusBar style="auto" />
                </ThemeProvider>
              </SlackProvider>
            </EventsProvider>
          </SettingsProvider>
        </GoogleCalendarProvider>
      </AuthProvider>
    </GoogleAuthProvider>
  );
}
