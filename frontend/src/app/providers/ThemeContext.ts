import { createContext } from "react";

export type Theme = "dark" | "light";

export interface ThemeContextValue {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

export const defaultThemeContextValue: ThemeContextValue = {
  theme: "dark",
  setTheme: () => {},
  toggleTheme: () => {},
};

/**
 * Singleton React Context for Theme.
 * Separated from ThemeProvider component to ensure Fast Refresh compatibility.
 */
export const ThemeContext = createContext<ThemeContextValue | null>(null);
