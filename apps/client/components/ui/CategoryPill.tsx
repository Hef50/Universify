import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ViewStyle } from 'react-native';
import { EventCategory } from '@/types/event';
import { useAppTheme } from '@/hooks/useAppTheme';
import { AppPalette } from '@/constants/theme';

interface CategoryPillProps {
  category: EventCategory;
  active?: boolean;
  onPress?: () => void;
  color?: string;
  style?: ViewStyle;
  size?: 'small' | 'medium' | 'large';
}

export const CategoryPill: React.FC<CategoryPillProps> = ({
  category,
  active = false,
  onPress,
  color,
  style,
  size = 'medium',
}) => {
  const { colors, fontScale } = useAppTheme();
  const styles = React.useMemo(() => createStyles(colors, fontScale), [colors, fontScale]);

  const backgroundColor = active
    ? color || colors.primary
    : 'transparent';

  const borderColor = color || colors.primary;

  const textColor = active ? colors.onPrimary : color || colors.primary;

  return (
    <TouchableOpacity
      style={[
        styles.pill,
        styles[`${size}Pill`],
        { backgroundColor, borderColor },
        style,
      ]}
      onPress={onPress}
      activeOpacity={0.7}
      disabled={!onPress}
    >
      <Text
        style={[
          styles.text,
          styles[`${size}Text`],
          { color: textColor },
        ]}
      >
        {category}
      </Text>
    </TouchableOpacity>
  );
};

const createStyles = (colors: AppPalette, fontScale: number) =>
  StyleSheet.create({
    pill: {
      borderRadius: 20,
      borderWidth: 1.5,
      justifyContent: 'center',
      alignItems: 'center',
    },
    smallPill: {
      paddingHorizontal: 12,
      paddingVertical: 4,
    },
    mediumPill: {
      paddingHorizontal: 16,
      paddingVertical: 8,
    },
    largePill: {
      paddingHorizontal: 20,
      paddingVertical: 10,
    },
    text: {
      fontWeight: '600',
    },
    smallText: {
      fontSize: 12 * fontScale,
    },
    mediumText: {
      fontSize: 14 * fontScale,
    },
    largeText: {
      fontSize: 16 * fontScale,
    },
  });
