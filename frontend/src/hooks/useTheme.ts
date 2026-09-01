import { useContext } from "react";
import {
  ThemeContext,
  ThemeContextValue,
  defaultThemeContextValue,
  Theme,
} from "../app/providers/ThemeContext";

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  return context ?? defaultThemeContextValue;
}

export type { Theme, ThemeContextValue };
