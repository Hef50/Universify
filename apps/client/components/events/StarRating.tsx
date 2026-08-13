import React from 'react';
import { View, Pressable, StyleSheet, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '@/hooks/useAppTheme';
import { MAX_STARS } from '@/utils/eventRatings';
import { Spacing, TouchTarget } from '@/constants/design';

interface StarRatingProps {
  /** Current rating, 0 when unrated. */
  value: number;
  /** Omit to render a read-only rating. */
  onChange?: (stars: number) => void;
  size?: number;
  /** Accessible name for the whole control, e.g. the event title. */
  label?: string;
}

/**
 * Five-star rating. Read-only when `onChange` is omitted; interactive stars
 * get full-size tap targets and a small press bounce so a rating feels
 * deliberate rather than accidental.
 */
export const StarRating: React.FC<StarRatingProps> = ({
  value,
  onChange,
  size = 22,
  label,
}) => {
  const { colors, reduceMotion } = useAppTheme();
  const styles = React.useMemo(() => createStyles(), []);
  const scales = React.useRef(
    Array.from({ length: MAX_STARS }, () => new Animated.Value(1))
  ).current;

  const bounce = (index: number) => {
    if (reduceMotion) return;
    const scale = scales[index];
    scale.setValue(0.8);
    Animated.spring(scale, {
      toValue: 1,
      tension: 220,
      friction: 8,
      useNativeDriver: true,
    }).start();
  };

  return (
    <View
      style={styles.row}
      accessibilityRole={onChange ? 'adjustable' : 'image'}
      accessibilityLabel={
        label
          ? `${label}: ${value || 'not'} ${value === 1 ? 'star' : 'stars'}`
          : `${value} of ${MAX_STARS} stars`
      }
    >
      {Array.from({ length: MAX_STARS }, (_, index) => {
        const filled = index < value;
        const star = (
          <Ionicons
            name={filled ? 'star' : 'star-outline'}
            size={size}
            color={filled ? '#F59E0B' : colors.textTertiary}
          />
        );

        if (!onChange) {
          return (
            <View key={index} style={styles.readOnlyStar}>
              {star}
            </View>
          );
        }

        return (
          <Pressable
            key={index}
            onPress={() => {
              bounce(index);
              onChange(index + 1);
            }}
            style={styles.tapTarget}
            hitSlop={4}
            accessibilityRole="button"
            accessibilityLabel={`${index + 1} ${index === 0 ? 'star' : 'stars'}`}
          >
            <Animated.View style={{ transform: [{ scale: scales[index] }] }}>
              {star}
            </Animated.View>
          </Pressable>
        );
      })}
    </View>
  );
};

const createStyles = () =>
  StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    tapTarget: {
      minWidth: TouchTarget - 8,
      height: TouchTarget - 8,
      alignItems: 'center',
      justifyContent: 'center',
    },
    readOnlyStar: {
      paddingRight: Spacing.xxs,
    },
  });
