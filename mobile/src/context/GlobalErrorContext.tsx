import React, { createContext, useContext, useState, useCallback } from "react"
import { View, StyleSheet, TouchableOpacity } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import ErrorCard from "../components/ErrorCard"
import { useTheme } from "./ThemeContext"

type GlobalErrorContextType = {
  showError: (error: string, screen: string, onRetry?: () => void) => void
  clearError: () => void
}

const GlobalErrorContext = createContext<GlobalErrorContextType>({
  showError: () => {},
  clearError: () => {},
})

export function GlobalErrorProvider({ children }: { children: React.ReactNode }) {
  const { colors } = useTheme()
  const insets = useSafeAreaInsets()
  const [errorState, setErrorState] = useState<{ error: string; screen: string; onRetry?: () => void } | null>(null)
  const [retried, setRetried] = useState(false)
  const [retrying, setRetrying] = useState(false)

  const showError = useCallback((error: string, screen: string, onRetry?: () => void) => {
    setErrorState({ error, screen, onRetry })
    setRetried(false)
    setRetrying(false)
  }, [])

  const clearError = useCallback(() => {
    setErrorState(null)
    setRetried(false)
    setRetrying(false)
  }, [])

  const handleRetry = async () => {
    if (!errorState?.onRetry) { clearError(); return }
    setRetrying(true)
    setRetried(true)
    clearError()
    errorState.onRetry()
  }

  return (
    <GlobalErrorContext.Provider value={{ showError, clearError }}>
      {children}
      {errorState && (
        <View style={[styles.overlay, { paddingTop: insets.top, paddingBottom: insets.bottom, backgroundColor: colors.background }]}>
          <ErrorCard
            key={errorState.error}
            error={errorState.error}
            screen={errorState.screen}
            onRetry={handleRetry}
            retrying={retrying}
            retried={retried}
          />
          <TouchableOpacity style={styles.dismissBtn} onPress={clearError} />
        </View>
      )}
    </GlobalErrorContext.Provider>
  )
}

export const useGlobalError = () => useContext(GlobalErrorContext)

const styles = StyleSheet.create({
  overlay: {
    position: "absolute",
    top: 0, left: 0, right: 0, bottom: 0,
    zIndex: 9999,
    elevation: 9999,
  },
  dismissBtn: {
    position: "absolute",
    top: 0, left: 0, right: 0, bottom: 0,
    zIndex: -1,
  },
})
