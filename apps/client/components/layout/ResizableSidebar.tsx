import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  Platform,
  ViewStyle,
  PanResponder,
} from 'react-native';
import { useResponsive } from '@/hooks/useResponsive';

interface ResizableSidebarProps {
  children: React.ReactNode;
  initialWidth?: number;
  minWidth?: number;
  maxWidth?: number;
  position?: 'left' | 'right';
  style?: ViewStyle;
}

export const ResizableSidebar: React.FC<ResizableSidebarProps> = ({
  children,
  initialWidth = 350,
  minWidth = 250,
  maxWidth = 600,
  position = 'right',
  style,
}) => {
  const { isDesktop, isMobile } = useResponsive();
  const [width, setWidth] = useState(initialWidth);

  // Only allow resizing on desktop web
  const isResizable = isDesktop && Platform.OS === 'web';

  const panResponder = React.useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => isResizable,
        onMoveShouldSetPanResponder: () => isResizable,
        onPanResponderMove: (_, gestureState) => {
          if (!isResizable) return;

          const delta = position === 'right' ? -gestureState.dx : gestureState.dx;
          const newWidth = Math.max(minWidth, Math.min(maxWidth, width + delta));
          setWidth(newWidth);
        },
      }),
    [isResizable, width, minWidth, maxWidth, position]
  );

  if (isMobile) {
    // On mobile, sidebar takes full width
    return <View style={[styles.sidebar, styles.sidebarMobile, style]}>{children}</View>;
  }

  return (
    <View style={[styles.container, position === 'left' && styles.containerLeft]}>
      {/* Resize Handle */}
      {isResizable && position === 'right' && (
        <View {...panResponder.panHandlers} style={styles.resizeHandleLeft}>
          <View style={styles.resizeIndicator} />
        </View>
      )}

      {/* Sidebar Content */}
      <View style={[styles.sidebar, { width }, style]}>{children}</View>

      {/* Resize Handle */}
      {isResizable && position === 'left' && (
        <View {...panResponder.panHandlers} style={styles.resizeHandleRight}>
          <View style={styles.resizeIndicator} />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    height: '100%',
  },
  containerLeft: {
    flexDirection: 'row-reverse',
  },
  sidebar: {
    backgroundColor: '#FFFFFF',
    borderLeftWidth: 1,
    borderLeftColor: '#E5E7EB',
    height: '100%',
  },
  sidebarMobile: {
    width: '100%',
    borderLeftWidth: 0,
  },
  resizeHandleLeft: {
    width: 8,
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    cursor: 'col-resize',
  },
  resizeHandleRight: {
    width: 8,
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    cursor: 'col-resize',
  },
  resizeIndicator: {
    width: 3,
    height: 40,
    backgroundColor: '#D1D5DB',
    borderRadius: 2,
  },
});

