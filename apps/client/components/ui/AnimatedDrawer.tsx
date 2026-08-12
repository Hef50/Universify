import React, { useEffect } from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  Modal,
  DimensionValue,
  ViewStyle,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useResponsive } from '@/hooks/useResponsive';
import { useAppTheme } from '@/hooks/useAppTheme';
import { AppPalette } from '@/constants/theme';

type DrawerPosition = 'left' | 'right' | 'bottom';

interface AnimatedDrawerProps {
  visible: boolean;
  onClose: () => void;
  position?: DrawerPosition;
  children: React.ReactNode;
  width?: DimensionValue;
  height?: DimensionValue;
  containerStyle?: ViewStyle;
}

export const AnimatedDrawer: React.FC<AnimatedDrawerProps> = ({
  visible,
  onClose,
  position = 'right',
  children,
  width,
  height,
  containerStyle,
}) => {
  const { colors, fontScale, reduceMotion } = useAppTheme();
  const styles = React.useMemo(() => createStyles(colors, fontScale), [colors, fontScale]);
  const { isMobile, width: screenWidth, height: screenHeight } = useResponsive();
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const opacity = useSharedValue(0);

  // Determine drawer dimensions
  const drawerWidth = width || (position === 'bottom' ? '100%' : isMobile ? '85%' : 400);
  const drawerHeight = height || (position === 'bottom' ? '70%' : '100%');

  // Calculate initial positions
  const getInitialPosition = React.useCallback(() => {
    switch (position) {
      case 'left':
        return { x: -screenWidth, y: 0 };
      case 'right':
        return { x: screenWidth, y: 0 };
      case 'bottom':
        return { x: 0, y: screenHeight };
      default:
        return { x: 0, y: 0 };
    }
  }, [position, screenWidth, screenHeight]);

  useEffect(() => {
    const initial = getInitialPosition();

    if (reduceMotion) {
      // Skip animations: snap the drawer/overlay to their target values
      if (visible) {
        translateX.value = withTiming(0, { duration: 0 });
        translateY.value = withTiming(0, { duration: 0 });
        opacity.value = withTiming(1, { duration: 0 });
      } else {
        translateX.value = withTiming(initial.x, { duration: 0 });
        translateY.value = withTiming(initial.y, { duration: 0 });
        opacity.value = withTiming(0, { duration: 0 });
      }
      return;
    }

    if (visible) {
      translateX.value = withSpring(0, {
        damping: 20,
        stiffness: 90,
      });
      translateY.value = withSpring(0, {
        damping: 20,
        stiffness: 90,
      });
      opacity.value = withTiming(1, { duration: 200 });
    } else {
      translateX.value = withSpring(initial.x, {
        damping: 20,
        stiffness: 90,
      });
      translateY.value = withSpring(initial.y, {
        damping: 20,
        stiffness: 90,
      });
      opacity.value = withTiming(0, { duration: 200 });
    }
  }, [visible, position, reduceMotion, getInitialPosition, translateX, translateY, opacity]);

  const drawerAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
    ],
  }));

  const overlayAnimatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  const getDrawerPositionStyle = (): ViewStyle => {
    switch (position) {
      case 'left':
        return { left: 0, top: 0, bottom: 0 };
      case 'right':
        return { right: 0, top: 0, bottom: 0 };
      case 'bottom':
        return { left: 0, right: 0, bottom: 0 };
      default:
        return {};
    }
  };

  if (!visible) return null;

  return (
    <Modal
      transparent
      visible={visible}
      onRequestClose={onClose}
      animationType="none"
    >
      <View style={styles.container}>
        {/* Overlay */}
        <TouchableOpacity
          style={StyleSheet.absoluteFill}
          activeOpacity={1}
          onPress={onClose}
        >
          <Animated.View
            style={[styles.overlay, overlayAnimatedStyle]}
          />
        </TouchableOpacity>

        {/* Drawer */}
        <Animated.View
          style={[
            styles.drawer,
            getDrawerPositionStyle(),
            {
              width: drawerWidth,
              height: drawerHeight,
            },
            drawerAnimatedStyle,
            containerStyle,
          ]}
        >
          {children}
        </Animated.View>
      </View>
    </Modal>
  );
};

const createStyles = (colors: AppPalette, fontScale: number) =>
  StyleSheet.create({
    container: {
      flex: 1,
    },
    overlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: colors.overlay,
    },
    drawer: {
      position: 'absolute',
      backgroundColor: colors.surface,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 8,
      elevation: 8,
    },
  });
