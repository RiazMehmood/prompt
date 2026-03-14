"""React Native Paper theme configuration."""
import { MD3LightTheme, MD3DarkTheme } from "react-native-paper";

export const lightTheme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: "rgb(0, 95, 175)",
    onPrimary: "rgb(255, 255, 255)",
    primaryContainer: "rgb(212, 227, 255)",
    onPrimaryContainer: "rgb(0, 28, 58)",
    secondary: "rgb(84, 95, 113)",
    onSecondary: "rgb(255, 255, 255)",
    secondaryContainer: "rgb(216, 227, 248)",
    onSecondaryContainer: "rgb(17, 28, 43)",
  },
};

export const darkTheme = {
  ...MD3DarkTheme,
  colors: {
    ...MD3DarkTheme.colors,
    primary: "rgb(165, 200, 255)",
    onPrimary: "rgb(0, 49, 95)",
    primaryContainer: "rgb(0, 71, 134)",
    onPrimaryContainer: "rgb(212, 227, 255)",
    secondary: "rgb(188, 199, 220)",
    onSecondary: "rgb(39, 49, 65)",
    secondaryContainer: "rgb(61, 71, 88)",
    onSecondaryContainer: "rgb(216, 227, 248)",
  },
};
