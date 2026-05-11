import React, { createContext, useContext, useEffect, useState } from "react"
import { useColorScheme } from "react-native"
import AsyncStorage from "@react-native-async-storage/async-storage"

export type ThemeMode = "light" | "dark" | "system"

const darkColors = {
  primary: "#f97316",
  background: "#0f1117",
  card: "#1a1d27",
  border: "#2a2d3a",
  text: "#f1f5f9",
  muted: "#64748b",
  mutedForeground: "#94a3b8",
  destructive: "#ef4444",
  green: "#22c55e",
  yellow: "#eab308",
}

const lightColors = {
  primary: "#f97316",
  background: "#ffffff",
  card: "#f8fafc",
  border: "#e2e8f0",
  text: "#0f172a",
  muted: "#94a3b8",
  mutedForeground: "#64748b",
  destructive: "#ef4444",
  green: "#16a34a",
  yellow: "#ca8a04",
}

type ThemeContextType = {
  theme: ThemeMode
  colors: typeof darkColors
  setTheme: (t: ThemeMode) => Promise<void>
}

const ThemeContext = createContext<ThemeContextType>({
  theme: "dark",
  colors: darkColors,
  setTheme: async () => {},
})

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useColorScheme()
  const [theme, setThemeState] = useState<ThemeMode>("dark")

  useEffect(() => {
    AsyncStorage.getItem("theme").then(val => {
      if (val === "light" || val === "dark" || val === "system") setThemeState(val)
    })
  }, [])

  const resolvedDark = theme === "system" ? systemScheme === "dark" : theme === "dark"
  const colors = resolvedDark ? darkColors : lightColors

  const setTheme = async (t: ThemeMode) => {
    setThemeState(t)
    await AsyncStorage.setItem("theme", t)
  }

  return (
    <ThemeContext.Provider value={{ theme, colors, setTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export const useTheme = () => useContext(ThemeContext)
