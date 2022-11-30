/* do not change this file, it is auto generated by storybook. */

import {
  configure,
  addDecorator,
  addParameters,
  addArgsEnhancer,
} from "@storybook/react-native";

import "@storybook/addon-ondevice-notes/register";
import "@storybook/addon-ondevice-controls/register";
import "@storybook/addon-ondevice-backgrounds/register";
import "@storybook/addon-ondevice-actions/register";

import { argsEnhancers } from "@storybook/addon-actions/dist/modern/preset/addArgs";

import { decorators, parameters } from "./preview";

if (decorators) {
  decorators.forEach((decorator) => addDecorator(decorator));
}

if (parameters) {
  addParameters(parameters);
}

// temporary fix for https://github.com/storybookjs/react-native/issues/327 whilst the issue is investigated
try {
  argsEnhancers.forEach((enhancer) => addArgsEnhancer(enhancer));
} catch {}

const getStories = () => {
  return [
    require("../stories/Button.stories.js"),
    require("../stories/Checkbox.stories.js"),
    require("../stories/Chip.stories.js"),
    require("../stories/Divider.stories.js"),
    require("../stories/Form.stories.js"),
    require("../stories/Header.stories.js"),
    require("../stories/Input.stories.js"),
    require("../stories/Radio.stories.js"),
    require("../stories/Select.stories.js"),
    require("../stories/Table.stories.js"),
    require("../stories/Toast.stories.js"),
  ];
};

configure(getStories, module, false);
