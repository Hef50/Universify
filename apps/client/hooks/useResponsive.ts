import { useState, useEffect } from 'react';
import { Dimensions, Platform } from 'react-native';

export type DeviceType = 'mobile' | 'tablet' | 'desktop';

export interface ResponsiveInfo {
  deviceType: DeviceType;
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  isWeb: boolean;
  isNative: boolean;
  width: number;
  height: number;
  orientation: 'portrait' | 'landscape';
}

const BREAKPOINTS = {
  mobile: 768,
  tablet: 1024,
};

const getDeviceType = (width: number): DeviceType => {
  if (width < BREAKPOINTS.mobile) return 'mobile';
  if (width < BREAKPOINTS.tablet) return 'tablet';
  return 'desktop';
};

const getOrientation = (width: number, height: number): 'portrait' | 'landscape' => {
  return width > height ? 'landscape' : 'portrait';
};

export const useResponsive = (): ResponsiveInfo => {
  const [dimensions, setDimensions] = useState(() => {
    const { width, height } = Dimensions.get('window');
    return { width, height };
  });

  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', ({ window }) => {
      setDimensions({ width: window.width, height: window.height });
    });

    return () => subscription?.remove();
  }, []);

  const deviceType = getDeviceType(dimensions.width);
  const orientation = getOrientation(dimensions.width, dimensions.height);
  const isWeb = Platform.OS === 'web';
  const isNative = !isWeb;

  return {
    deviceType,
    isMobile: deviceType === 'mobile',
    isTablet: deviceType === 'tablet',
    isDesktop: deviceType === 'desktop',
    isWeb,
    isNative,
    width: dimensions.width,
    height: dimensions.height,
    orientation,
  };
};

export const useBreakpoint = () => {
  const { width } = useResponsive();
  
  return {
    xs: width < 480,
    sm: width >= 480 && width < BREAKPOINTS.mobile,
    md: width >= BREAKPOINTS.mobile && width < BREAKPOINTS.tablet,
    lg: width >= BREAKPOINTS.tablet && width < 1440,
    xl: width >= 1440,
  };
};

