import * as React from "react";
import {
  Animated,
  TextInput as NativeTextInput,
  LayoutChangeEvent,
  StyleProp,
  TextStyle,
} from "react-native";
import TextInputOutlined from "./TextInputOutlined";
import { withTheme } from "../../core/theming";
import type { RenderProps, TextInputLabelProp, ValidationType } from "./types";
import color from "color";
// import TextInputCard from './TextInputCard';
import { LABEL_PADDING_HORIZONTAL } from "./constants";
import { DATE_MMDDYYYY_MASK, isInputValid } from "./helpers";
import formatWithMask from "./formatWithMask";

const BLUR_ANIMATION_DURATION = 180;
const FOCUS_ANIMATION_DURATION = 150;

export type TextInputProps = React.ComponentPropsWithRef<
  typeof NativeTextInput
> & {
  left?: React.ReactNode;
  right?: React.ReactNode;
  /**
   * If true, user won't be able to interact with the component.
   */
  disabled?: boolean;
  /**
   * Specifies what input will be rendered from one of the choices.
   */
  type?:
    | "text"
    | "email"
    | "password"
    | "number"
    | "date"
    | "textarea"
    | "tel"
    | "phone"
    | "time";
  /**
   * The text or component to use for the floating label.
   */
  label?: TextInputLabelProp;
  /**
   * Placeholder for the input.
   */
  placeholder?: string;
  /**
   * Error message to be displayed if input is not valid.
   */
  error?: string;
  /**
   * Callback that is called when the text input's text changes. Changed text is passed as an argument to the callback handler.
   */
  onChangeText?: Function;
  /**
   * Selection color of the input
   */
  selectionColor?: string;
  /**
   * Inactive underline color of the input.
   */
  underlineColor?: string;
  /**
   * Active underline color of the input.
   */
  activeUnderlineColor?: string;
  /**
   * Inactive outline color of the input.
   */
  outlineColor?: string;
  /**
   * Active outline color of the input.
   */
  activeOutlineColor?: string;
  /**
   * Sets min height with densed layout. For `TextInput` in `flat` mode
   * height is `64dp` or in dense layout - `52dp` with label or `40dp` without label.
   * For `TextInput` in `outlined` mode
   * height is `56dp` or in dense layout - `40dp` regardless of label.
   * When you apply `height` prop in style the `dense` prop affects only `paddingVertical` inside `TextInput`
   */
  dense?: boolean;
  /**
   * Whether the input can have multiple lines.
   */
  multiline?: boolean;
  /**
   * The number of lines to show in the input (Android only).
   */
  numberOfLines?: number;
  /**
   * Callback that is called when the text input is focused.
   */
  onFocus?: (args: any) => void;
  /**
   * Callback that is called when the text input is blurred.
   */
  onBlur?: (args: any) => void;
  /**
   * Set to true to indicate that the input is currently errored. //TODO: better way to expose validation
   */
  isInvalid?: boolean;
  /**
   * If true, runs the validation checks when focus is lost from the input.
   */
  validateOnBlur?: boolean;
  /**
   * The validation object you want to use for this form. You can pass multiple options.
   */
  validation?: ValidationType;
  /**
   *
   * Callback to render a custom input component such as `react-native-text-input-mask`
   * instead of the default `TextInput` component from `react-native`.
   *
   * Example:
   * ```js
   * <TextInput
   *   label="Phone number"
   *   render={props =>
   *     <TextInputMask
   *       {...props}
   *       mask="+[00] [000] [000] [000]"
   *     />
   *   }
   * />
   * ```
   */
  render?: (props: RenderProps) => React.ReactNode;
  /**
   * Value of the text input.
   */
  value?: string;
  /**
   * Pass `fontSize` prop to modify the font size inside `TextInput`.
   * Pass `height` prop to set `TextInput` height. When `height` is passed,
   * `dense` prop will affect only input's `paddingVertical`.
   * Pass `paddingHorizontal` to modify horizontal padding.
   * This can be used to get MD Guidelines v1 TextInput look.
   */
  style?: StyleProp<TextStyle>;
  /**
   * @optional
   */
  theme: PackageX.Theme;
};

type TextInputHandles = Pick<
  NativeTextInput,
  "focus" | "clear" | "blur" | "isFocused" | "setNativeProps"
>;

/**
 * A component to allow users to input text.
 *
 *
 * ## Usage
 * ```js
 * import * as React from 'react';
 * import { TextInput } from 'react-native-paper';
 *
 * const MyComponent = () => {
 *   const [text, setText] = React.useState("");
 *
 *   return (
 *     <TextInput
 *       label="Email"
 *       value={text}
 *       onChangeText={text => setText(text)}
 *     />
 *   );
 * };
 *
 * export default MyComponent;
 * ```
 *
 * @extends TextInput props https://reactnative.dev/docs/textinput#props
 */

const TextInput = React.forwardRef<TextInputHandles, TextInputProps>(
  (
    {
      dense = false,
      disabled = false,
      error: errorMessage = "Invalid Input",
      multiline = false,
      editable = true,
      render = (props: RenderProps) => <NativeTextInput {...props} />,
      type = "text",
      validateOnBlur = true,
      validation,
      ...rest
    }: TextInputProps,
    ref
  ) => {
    const isControlled = rest.value !== undefined;
    const validInputValue = isControlled ? rest.value : rest.defaultValue;
    const [isInvalid, setIsInvalid] = React.useState<boolean>(false);

    const { current: labeled } = React.useRef<Animated.Value>(
      new Animated.Value(validInputValue ? 0 : 1)
    );
    const { current: error } = React.useRef<Animated.Value>(
      new Animated.Value(rest.isInvalid ?? isInvalid ? 1 : 0)
    );
    const [focused, setFocused] = React.useState<boolean>(false);
    const [placeholder, setPlaceholder] =
      React.useState<string | undefined>("");
    const [uncontrolledValue, setUncontrolledValue] =
      React.useState<string | undefined>(validInputValue);
    // Use value from props instead of local state when input is controlled
    const value = isControlled ? rest.value : uncontrolledValue;

    const [labelLayout, setLabelLayout] = React.useState<{
      measured: boolean;
      width: number;
      height: number;
    }>({
      measured: false,
      width: 0,
      height: 0,
    });
    const [leftLayout, setLeftLayout] = React.useState<{
      height: number | null;
      width: number | null;
    }>({
      width: null,
      height: null,
    });
    const [rightLayout, setRightLayout] = React.useState<{
      height: number | null;
      width: number | null;
    }>({
      width: null,
      height: null,
    });

    const timer = React.useRef<NodeJS.Timeout | undefined>();

    const root = React.useRef<NativeTextInput | undefined | null>();

    const { scale } = rest.theme.animation;

    React.useImperativeHandle(ref, () => ({
      focus: () => root.current?.focus(),
      clear: () => root.current?.clear(),
      setNativeProps: (args: Object) => root.current?.setNativeProps(args),
      isFocused: () => root.current?.isFocused() || false,
      blur: () => root.current?.blur(),
      forceFocus: () => root.current?.focus(),
    }));

    React.useEffect(() => {
      // When the input has an error, we wiggle the label and apply error styles
      if (rest.isInvalid ?? isInvalid) {
        // show error
        Animated.timing(error, {
          toValue: 1,
          duration: FOCUS_ANIMATION_DURATION * scale,
          // To prevent this - https://github.com/callstack/react-native-paper/issues/941
          useNativeDriver: true,
        }).start();
      } else {
        // hide error

        {
          Animated.timing(error, {
            toValue: 0,
            duration: BLUR_ANIMATION_DURATION * scale,
            // To prevent this - https://github.com/callstack/react-native-paper/issues/941
            useNativeDriver: true,
          }).start();
        }
      }
    }, [rest.isInvalid, isInvalid, scale, error]);

    React.useEffect(() => {
      // Show placeholder text only if the input is focused, or there's no label
      // We don't show placeholder if there's a label because the label acts as placeholder
      // When focused, the label moves up, so we can show a placeholder
      if (focused || !rest.label) {
        // Set the placeholder in a delay to offset the label animation
        // If we show it immediately, they'll overlap and look ugly
        timer.current = setTimeout(
          () =>
            setPlaceholder(type === "date" ? "mm-dd-yyyy" : rest.placeholder),
          50
        ) as unknown as NodeJS.Timeout;
      } else {
        // hidePlaceholder
        setPlaceholder("");
      }

      return () => {
        if (timer.current) {
          clearTimeout(timer.current);
        }
      };
    }, [focused, rest.label, rest.placeholder]);

    React.useEffect(() => {
      // The label should be minimized if the text input is focused, or has text
      // In minimized mode, the label moves up and becomes small
      // workaround for animated regression for react native > 0.61
      // https://github.com/callstack/react-native-paper/pull/1440

      if (value || focused) {
        // minimize label
        Animated.timing(labeled, {
          toValue: 0,
          duration: BLUR_ANIMATION_DURATION * scale,
          // To prevent this - https://github.com/callstack/react-native-paper/issues/941
          useNativeDriver: true,
        }).start();
      } else {
        // restore label
        {
          Animated.timing(labeled, {
            toValue: 1,
            duration: FOCUS_ANIMATION_DURATION * scale,
            // To prevent this - https://github.com/callstack/react-native-paper/issues/941
            useNativeDriver: true,
          }).start();
        }
      }
    }, [focused, value, labeled, scale]);

    const onLeftAffixLayoutChange = (event: LayoutChangeEvent) => {
      setLeftLayout({
        height: event.nativeEvent.layout.height,
        width: event.nativeEvent.layout.width,
      });
    };

    const onRightAffixLayoutChange = (event: LayoutChangeEvent) => {
      setRightLayout({
        width: event.nativeEvent.layout.width,
        height: event.nativeEvent.layout.height,
      });
    };

    const handleFocus = (args: any) => {
      if (disabled || !editable) {
        return;
      }

      setFocused(true);
      rest.isInvalid === undefined && setIsInvalid(false); //Don't do anything if isInvalid is being passed by props. That means state is being handled outside the component.

      rest.onFocus?.(args);
    };

    const handleBlur = (args: Object) => {
      if (!editable) {
        return;
      }
      if (validateOnBlur && rest.isInvalid === undefined) {
        //Don't do anything if isInvalid is being passed by props. That means state is being handled outside the component.
        const isValid = isInputValid(value, validation);
        setIsInvalid(!isValid);
      }
      setFocused(false);
      rest.onBlur?.(args);
    };

    const handleChangeText = (value: string) => {
      let filteredValue = value;
      if (!editable || disabled) {
        return;
      }

      if (type === "date") {
        filteredValue = formatWithMask({
          text: value,
          mask: DATE_MMDDYYYY_MASK,
        }).masked;
      }
      if (!isControlled) {
        // Keep track of value in local state when input is not controlled
        setUncontrolledValue(filteredValue);
      }
      rest.onChangeText?.(filteredValue);
    };

    const handleLayoutAnimatedText = (e: LayoutChangeEvent) => {
      setLabelLayout({
        width: e.nativeEvent.layout.width,
        height: e.nativeEvent.layout.height,
        measured: true,
      });
    };
    const forceFocus = () => root.current?.focus();

    const { maxFontSizeMultiplier = 1.5 } = rest;

    return (
      <TextInputOutlined
        outlineColor={color("#000").alpha(0).rgb().string()}
        dense={dense}
        disabled={disabled}
        error={rest.isInvalid ?? isInvalid}
        errorMessage={errorMessage}
        multiline={multiline}
        editable={editable}
        render={render}
        {...rest}
        value={value}
        parentState={{
          labeled,
          error,
          focused,
          placeholder,
          value,
          labelLayout,
          leftLayout,
          rightLayout,
        }}
        innerRef={(ref) => {
          root.current = ref;
        }}
        onFocus={handleFocus}
        forceFocus={forceFocus}
        onBlur={handleBlur}
        onChangeText={handleChangeText}
        onLayoutAnimatedText={handleLayoutAnimatedText}
        onLeftAffixLayoutChange={onLeftAffixLayoutChange}
        onRightAffixLayoutChange={onRightAffixLayoutChange}
        maxFontSizeMultiplier={maxFontSizeMultiplier}
        style={[{ fontWeight: "600", minHeight: 80 }, rest.style]}
      />
    );
  }
);

export default withTheme(TextInput);
