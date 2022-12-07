import * as React from "react";
import {
  Animated,
  I18nManager,
  Platform,
  StyleProp,
  StyleSheet,
  TextInput,
  TextInputProps,
  TextStyle,
  View,
  ViewStyle,
} from "react-native";

import color from "color";

import ActivityIndicator from "./ActivityIndicator";
import type { IconSource } from "./Icon";
import IconButton from "./IconButton/IconButton";
import MaterialCommunityIcon from "./MaterialCommunityIcon";

import Surface from "./Surface";
import { Theme } from "../types";
import { withTheme } from "../core/theming";

export type Props = React.ComponentPropsWithRef<typeof TextInput> & {
  /**
   * Accessibility label for the button. This is read by the screen reader when the user taps the button.
   */
  clearAccessibilityLabel?: string;
  /**
   * Accessibility label for the button. This is read by the screen reader when the user taps the button.
   */
  searchAccessibilityLabel?: string;
  /**
   * Hint text shown when the input is empty.
   */
  placeholder?: string;
  /**
   * The value of the text input.
   */
  value: string;
  /**
   * Icon name for the left icon button (see `onIconPress`).
   */
  icon?: IconSource;
  /**
   * Callback that is called when the text input's text changes.
   */
  onChangeText?: (query: string) => void;
  /**
   * Callback to execute if we want the left icon to act as button.
   */
  onIconPress?: () => void;
  /**
   * Set style of the TextInput component inside the searchbar
   */
  inputStyle?: StyleProp<TextStyle>;
  style?: StyleProp<ViewStyle>;
  /**
   * Custom color for icon, default will be derived from theme
   */
  iconColor?: string;
  /**
   * Custom icon for clear button, default will be icon close
   */
  clearIcon?: IconSource;
  /**
   * Custom flag for replacing clear button with activity indicator.
   */
  loading?: Boolean;
  /**
   * TestID used for testing purposes
   */
  testID?: string;
  /**
   * @optional
   */
  theme: Theme;
};

type TextInputHandles = Pick<
  TextInput,
  "setNativeProps" | "isFocused" | "clear" | "blur" | "focus"
>;

/**
 * Searchbar is a simple input box where users can type search queries.
 *
 * <div class="screenshots">
 *   <img class="small" src="screenshots/searchbar.png" />
 * </div>
 *
 * ## Usage
 * ```js
 * import * as React from 'react';
 * import { Searchbar } from 'react-native-paper';
 *
 * const MyComponent = () => {
 *   const [searchQuery, setSearchQuery] = React.useState('');
 *
 *   const onChangeSearch = query => setSearchQuery(query);
 *
 *   return (
 *     <Searchbar
 *       placeholder="Search"
 *       onChangeText={onChangeSearch}
 *       value={searchQuery}
 *     />
 *   );
 * };
 *
 * export default MyComponent;

 * ```
 */
const Searchbar = React.forwardRef<TextInputHandles, Props>(
  (
    {
      clearAccessibilityLabel = "clear",
      clearIcon,
      icon,
      iconColor: customIconColor,
      inputStyle,
      onIconPress,
      placeholder,
      searchAccessibilityLabel = "search",
      style,
      theme,
      value,
      loading = false,
      testID = "search-bar",
      ...rest
    }: Props,
    ref
  ) => {
    const root = React.useRef<TextInput>(null);

    React.useImperativeHandle(ref, () => {
      const input = root.current;

      if (input) {
        return {
          focus: () => input.focus(),
          clear: () => input.clear(),
          setNativeProps: (args: TextInputProps) => input.setNativeProps(args),
          isFocused: () => input.isFocused(),
          blur: () => input.blur(),
        };
      }

      const noop = () => {
        throw new Error("TextInput is not available");
      };

      return {
        focus: noop,
        clear: noop,
        setNativeProps: noop,
        isFocused: noop,
        blur: noop,
      };
    });

    const handleClearPress = () => {
      root.current?.clear();
      rest.onChangeText?.("");
    };

    const { colors, roundness, dark } = theme;
    const textColor = theme.colors.text;
    const iconColor =
      customIconColor ||
      (dark ? textColor : color(textColor).alpha(0.54).rgb().string());
    const rippleColor = color(textColor).alpha(0.32).rgb().string();

    return (
      <Surface pointerEvents="auto" style={[styles.container, style]}>
        <IconButton
          accessibilityRole="button"
          borderless
          rippleColor={rippleColor}
          onPress={onIconPress}
          iconColor={iconColor}
          containerColor="transparent"
          size={24}
          style={styles.iconStyle}
          icon={
            icon ||
            (({ size, color }) => (
              <MaterialCommunityIcon
                name="magnify"
                color={color}
                size={size}
                direction={I18nManager.getConstants().isRTL ? "rtl" : "ltr"}
              />
            ))
          }
          accessibilityLabel={searchAccessibilityLabel}
        />
        <TextInput
          style={[
            styles.input,
            {
              color: textColor,
              ...Platform.select({ web: { outline: "none" } }),
            },
            theme.typescale.XSmall as TextStyle,
            { ...theme.fonts.bold },
            inputStyle,
          ]}
          placeholder={placeholder || ""}
          placeholderTextColor={theme.colors?.placeholder}
          selectionColor={theme.colors.primary.default}
          underlineColorAndroid="transparent"
          returnKeyType="search"
          keyboardAppearance={dark ? "dark" : "light"}
          accessibilityRole="search"
          ref={root}
          value={value}
          testID={testID}
          {...rest}
        />
        {loading ? (
          <ActivityIndicator
            testID="activity-indicator"
            style={styles.loader}
          />
        ) : (
          // Clear icon should be always rendered within Searchbar – it's transparent,
          // without touch events, when there is no value. It's done to avoid issues
          // with the abruptly stopping ripple effect and changing bar width on web,
          // when clearing the value.
          <View
            pointerEvents={value ? "auto" : "none"}
            testID={`${testID}-icon-wrapper`}
          >
            <IconButton
              borderless
              accessibilityLabel={clearAccessibilityLabel}
              iconColor={value ? iconColor : "rgba(255, 255, 255, 0)"}
              rippleColor={rippleColor}
              onPress={handleClearPress}
              containerColor="transparent"
              style={styles.iconStyle}
              icon={
                clearIcon ||
                (({ size, color }) => (
                  <MaterialCommunityIcon
                    name="close"
                    color={color}
                    size={size}
                    direction={I18nManager.getConstants().isRTL ? "rtl" : "ltr"}
                  />
                ))
              }
              accessibilityRole="button"
            />
          </View>
        )}
      </Surface>
    );
  }
);

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    height: 40,
    borderRadius: 12,
    paddingHorizontal: 16,
  },
  input: {
    flex: 1,
    fontSize: 18,
    alignSelf: "stretch",
    textAlign: I18nManager.getConstants().isRTL ? "right" : "left",
    minWidth: 0,
  },

  loader: {
    margin: 10,
  },
  iconStyle: { margin: 0, width: 24, height: 24, marginRight: 8 },
});

export default withTheme(Searchbar);
