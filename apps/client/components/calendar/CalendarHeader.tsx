import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '@/hooks/useAppTheme';
import { AppPalette } from '@/constants/theme';

interface CalendarHeaderProps {
  currentDate: Date;
  onToday: () => void;
  onPrevWeek: () => void;
  onNextWeek: () => void;
}

export const CalendarHeader: React.FC<CalendarHeaderProps> = ({
  currentDate,
  onToday,
  onPrevWeek,
  onNextWeek,
}) => {
  const { colors, fontScale } = useAppTheme();
  const styles = React.useMemo(() => createStyles(colors, fontScale), [colors, fontScale]);

  const monthYear = currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.todayButton} onPress={onToday}>
        <Text style={styles.todayText}>Today</Text>
      </TouchableOpacity>
      <View style={styles.navButtons}>
        <TouchableOpacity style={styles.navButton} onPress={onPrevWeek}>
          <Ionicons name="chevron-back" size={16} color={colors.textPrimary} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.navButton} onPress={onNextWeek}>
          <Ionicons name="chevron-forward" size={16} color={colors.textPrimary} />
        </TouchableOpacity>
      </View>
      <Text style={styles.monthYear}>{monthYear}</Text>
    </View>
  );
};

const createStyles = (colors: AppPalette, fontScale: number) =>
  StyleSheet.create({
    container: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 16,
      marginBottom: 24,
      paddingHorizontal: 0,
    },
    todayButton: {
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 6,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
    },
    todayText: {
      fontSize: 14 * fontScale,
      fontWeight: '500',
      color: colors.textPrimary,
    },
    navButtons: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    navButton: {
      width: 32,
      height: 32,
      borderRadius: 6,
      backgroundColor: 'transparent',
      justifyContent: 'center',
      alignItems: 'center',
    },
    monthYear: {
      fontSize: 20 * fontScale,
      fontWeight: '400',
      color: colors.textPrimary,
    },
  });
