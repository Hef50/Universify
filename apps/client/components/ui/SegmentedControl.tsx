import React, { useRef, useState, useEffect } from 'react';
import { View, Text, Pressable, StyleSheet, Animated } from 'react-native';
import { useAppTheme } from '@/hooks/useAppTheme';
import { AppPalette } from '@/constants/theme';

interface SegmentedControlProps<T extends string> {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}

/**
 * iOS-style segmented control with a spring-animated thumb.
 * Respects the reduced-motion setting (thumb snaps instead of springing).
 */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
}: SegmentedControlProps<T>) {
  const { colors, fontScale, reduceMotion } = useAppTheme();
  const styles = React.useMemo(() => createStyles(colors, fontScale), [colors, fontScale]);

  const [segmentWidth, setSegmentWidth] = useState(0);
  const thumbX = useRef(new Animated.Value(0)).current;
  const index = Math.max(0, options.findIndex((o) => o.value === value));

  useEffect(() => {
    if (segmentWidth === 0) return;
    const target = index * segmentWidth;
    if (reduceMotion) {
      thumbX.setValue(target);
      return;
    }
    Animated.spring(thumbX, {
      toValue: target,
      tension: 220,
      friction: 22,
      useNativeDriver: true,
    }).start();
  }, [index, segmentWidth, reduceMotion, thumbX]);

  return (
    <View
      style={styles.track}
      onLayout={(e) => setSegmentWidth((e.nativeEvent.layout.width - 4) / options.length)}
    >
      {segmentWidth > 0 && (
        <Animated.View
          style={[
            styles.thumb,
            { width: segmentWidth, transform: [{ translateX: thumbX }] },
          ]}
        />
      )}
      {options.map((option) => {
        const active = option.value === value;
        return (
          <Pressable
            key={option.value}
            style={styles.segment}
            onPress={() => onChange(option.value)}
          >
            <Text style={[styles.segmentText, active && styles.segmentTextActive]}>
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const createStyles = (colors: AppPalette, fontScale: number) =>
  StyleSheet.create({
    track: {
      flexDirection: 'row',
      backgroundColor: colors.surfaceAlt,
      borderRadius: 10,
      padding: 2,
      position: 'relative',
    },
    thumb: {
      position: 'absolute',
      top: 2,
      left: 2,
      bottom: 2,
      backgroundColor: colors.surface,
      borderRadius: 8,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.08,
      shadowRadius: 3,
      elevation: 2,
    },
    segment: {
      flex: 1,
      paddingVertical: 7,
      alignItems: 'center',
      zIndex: 1,
    },
    segmentText: {
      fontSize: 13 * fontScale,
      fontWeight: '600',
      color: colors.textSecondary,
    },
    segmentTextActive: {
      color: colors.textPrimary,
    },
  });
