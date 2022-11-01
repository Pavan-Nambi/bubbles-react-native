import React from 'react';
import {
  StyleProp,
  ViewStyle,
  ScrollViewProps,
  LayoutRectangle,
  Animated,
  Easing,
  View,
  TouchableWithoutFeedback,
  ScrollView,
  StyleSheet,
  Dimensions,
  Platform,
  I18nManager,
} from 'react-native';
import { APPROX_STATUSBAR_HEIGHT } from '../../constants';
import { withTheme } from '../../core/theming';
import { Theme, $Omit } from '../../types';
import Portal from '../Portal/Portal';
import Surface from '../Surface';
import Text from '../Typography/Text';
import MenuItem from './MenuItem';

export type Props = {
  /**
   * Whether the Menu is currently visible.
   */
  visible: boolean;
  /**
   * The anchor to open the menu from. In most cases, it will be a button that opens the menu.
   */
  anchor: React.ReactNode | { x: number; y: number };
  /**
   * Extra margin to add at the top of the menu to account for translucent status bar on Android.
   * If you are using Expo, we assume translucent status bar and set a height for status bar automatically.
   * Pass `0` or a custom value to and customize it.
   * This is automatically handled on iOS.
   */
  statusBarHeight?: number;
  /**
   * Callback called when Menu is dismissed. The `visible` prop needs to be updated when this is called.
   */
  onDismiss?: () => void;
  /**
   * Accessibility label for the overlay. This is read by the screen reader when the user taps outside the menu.
   */
  overlayAccessibilityLabel?: string;
  /**
   * Content of the `Menu`.
   */
  children: React.ReactNode;
  /**
   * Style of menu's inner content.
   */
  contentStyle?: StyleProp<ViewStyle>;
  style?: StyleProp<ViewStyle>;
  /**
   * @optional
   */
  theme: Theme;
  /**
   * Inner ScrollView prop
   */
  keyboardShouldPersistTaps?: ScrollViewProps['keyboardShouldPersistTaps'];
};

type Layout = $Omit<$Omit<LayoutRectangle, 'x'>, 'y'>;

type State = {
  rendered: boolean;
  top: number;
  left: number;
  menuLayout: Layout;
  anchorLayout: Layout;
  opacityAnimation: Animated.Value;
  scaleAnimation: Animated.ValueXY;
};

// Minimum padding between the edge of the screen and the menu
const SCREEN_INDENT = 8;
// From https://material.io/design/motion/speed.html#duration
const ANIMATION_DURATION = 250;
// From the 'Standard easing' section of https://material.io/design/motion/speed.html#easing
const EASING = Easing.bezier(0.4, 0, 0.2, 1);

const Menu = ({
  visible,
  anchor,
  theme,
  children,
  contentStyle,
  style,
  statusBarHeight = APPROX_STATUSBAR_HEIGHT,
  overlayAccessibilityLabel = 'Close menu',
  onDismiss,
  keyboardShouldPersistTaps,
}: Props) => {
  const windowLayout = Dimensions.get('window');
  const additionalVerticalValue = Platform.select({
    android: statusBarHeight,
    default: 0,
  });
  const positionTransforms = React.useRef([]);
  const anchorRef = React.useRef(null);
  const [anchorMeasurements, setAnchorMeasurements] = React.useState({
    x: 0,
    y: 0,
    width: 0,
    height: 0,
  });
  const [menuMeasurements, setMenuMeasurements] = React.useState({
    x: 0,
    y: 0,
    width: 0,
    height: 0,
  });

  const [scrollableMenuHeightState, setScrollableMenuHeight] =
    React.useState(0);
  const menuRef = React.useRef(null);

  const [rendered, setRendered] = React.useState(visible);

  if (visible && !rendered) {
    setRendered(true);
  }

  React.useEffect(() => {
    console.log(visible, rendered);
    if (!visible && rendered) {
      setRendered(false);
    }
  }, [visible]);

  React.useEffect(() => {
    let left = anchorMeasurements.x;
    let top = anchorMeasurements.y;
    if (left === 0 || top === 0) return;
    if (menuMeasurements.x !== 0 || menuMeasurements.y !== 0) return;
    // Check if menu fits horizontally and if not align it to right.
    if (left <= windowLayout.width - menuMeasurements.width - SCREEN_INDENT) {
      // Check if menu position has enough space from left side
      if (left < SCREEN_INDENT) {
        left = SCREEN_INDENT;
      }
    } else {
      left += anchorMeasurements.width - menuMeasurements.width;

      const right = left + menuMeasurements.width;
      // Check if menu position has enough space from right side
      if (right > windowLayout.width - SCREEN_INDENT) {
        left = windowLayout.width - SCREEN_INDENT - menuMeasurements.width;
      }
    }

    // If the menu is larger than available vertical space,
    // calculate the height of scrollable view
    let scrollableMenuHeight = 0;

    // Check if the menu should be scrollable
    if (
      // Check if the menu overflows from bottom side
      top >=
        windowLayout.height -
          menuMeasurements.height -
          SCREEN_INDENT -
          additionalVerticalValue &&
      // And bottom side of the screen has more space than top side
      top <= windowLayout.height - top
    ) {
      // Scrollable menu should be below the anchor (expands downwards)
      scrollableMenuHeight =
        windowLayout.height - top - SCREEN_INDENT - additionalVerticalValue;
    } else if (
      // Check if the menu overflows from bottom side
      top >=
        windowLayout.height -
          menuMeasurements.height -
          SCREEN_INDENT -
          additionalVerticalValue &&
      // And top side of the screen has more space than bottom side
      top >= windowLayout.height - top &&
      // And menu overflows from top side
      top <=
        menuMeasurements.height -
          anchorMeasurements.height +
          SCREEN_INDENT -
          additionalVerticalValue
    ) {
      // Scrollable menu should be above the anchor (expands upwards)
      scrollableMenuHeight =
        top +
        anchorMeasurements.height -
        SCREEN_INDENT +
        additionalVerticalValue;
    }

    // Scrollable menu max height
    scrollableMenuHeight =
      scrollableMenuHeight > windowLayout.height - 2 * SCREEN_INDENT
        ? windowLayout.height - 2 * SCREEN_INDENT
        : scrollableMenuHeight;

    // Menu is typically positioned below the element that generates it
    // So first check if it fits below the anchor (expands downwards)
    if (
      // Check if menu fits vertically
      top <=
        windowLayout.height -
          menuMeasurements.height -
          SCREEN_INDENT -
          additionalVerticalValue ||
      // Or if the menu overflows from bottom side
      (top >=
        windowLayout.height -
          menuMeasurements.height -
          SCREEN_INDENT -
          additionalVerticalValue &&
        // And bottom side of the screen has more space than top side
        top <= windowLayout.height - top)
    ) {
      // Check if menu position has enough space from top side
      if (top < SCREEN_INDENT) {
        top = SCREEN_INDENT;
      }
    } else {
      top +=
        anchorMeasurements.height -
        (scrollableMenuHeight || menuMeasurements.height);

      const bottom =
        top +
        (scrollableMenuHeight || menuMeasurements.height) +
        additionalVerticalValue;

      // Check if menu position has enough space from bottom side
      if (bottom > windowLayout.height - SCREEN_INDENT) {
        top =
          scrollableMenuHeight === windowLayout.height - 2 * SCREEN_INDENT
            ? -SCREEN_INDENT * 2
            : windowLayout.height -
              menuMeasurements.height -
              SCREEN_INDENT -
              additionalVerticalValue;
      }
    }
    console.log('menu updated');
    setMenuMeasurements((state) => ({
      ...state,
      x: left,
      y: top,
    }));
    setScrollableMenuHeight(scrollableMenuHeight);
  }, [anchorMeasurements, menuMeasurements]);

  const isCoordinate = (anchor: any): anchor is { x: number; y: number } =>
    !React.isValidElement(anchor) &&
    typeof anchor?.x === 'number' &&
    typeof anchor?.y === 'number';

  const positionStyle = {
    top: isCoordinate(anchor)
      ? anchorMeasurements.y
      : menuMeasurements.y + additionalVerticalValue,
    ...(I18nManager.getConstants().isRTL
      ? { right: menuMeasurements.x }
      : { left: menuMeasurements.x }),
  };

  const shadowMenuContainerStyle = {
    borderRadius: theme.roundness,

    ...(scrollableMenuHeightState ? { height: scrollableMenuHeightState } : {}),
  };

  return (
    <View
      onLayout={(e) => {
        setAnchorMeasurements(e.nativeEvent.layout);
      }}
      ref={anchorRef}
      collapsable={false}
    >
      {isCoordinate(anchor) ? null : anchor}
      {rendered ? (
        <Portal>
          <TouchableWithoutFeedback
            accessibilityLabel={overlayAccessibilityLabel}
            accessibilityRole="button"
            onPress={onDismiss}
          >
            <View style={[StyleSheet.absoluteFill]} />
          </TouchableWithoutFeedback>
          <View
            ref={menuRef}
            collapsable={false}
            accessibilityViewIsModal={visible}
            style={[styles.wrapper, positionStyle, style]}
            pointerEvents={visible ? 'box-none' : 'none'}
            onAccessibilityEscape={onDismiss}
            onLayout={(e) => {
              setMenuMeasurements({ ...e.nativeEvent.layout, x: 0, y: 0 });
            }}
          >
            <Animated.View>
              <Surface
                style={
                  [
                    styles.shadowMenuContainer,
                    shadowMenuContainerStyle,

                    contentStyle,
                    { opacity: 1 },
                  ] as StyleProp<ViewStyle>
                }
              >
                {(scrollableMenuHeightState && (
                  <ScrollView
                    keyboardShouldPersistTaps={keyboardShouldPersistTaps}
                  >
                    {children}
                  </ScrollView>
                )) || <React.Fragment>{children}</React.Fragment>}
              </Surface>
            </Animated.View>
          </View>
        </Portal>
      ) : null}
    </View>
  );
};
Menu.Item = MenuItem;

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
  },
  shadowMenuContainer: {
    opacity: 0,
    paddingVertical: 8,
  },
});

export default withTheme(Menu);
