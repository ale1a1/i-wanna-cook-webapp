import React, { createContext, useContext, useState, useCallback, useRef } from "react"
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
  const [errorState, setErrorState] = useState<{
    error: string; screen: string; onRetry?: () => void
  } | null>(null)
  const [retried, setRetried] = useState(false)
  // Written synchronously before retry fires, read synchronously inside showError
  const retriedRef = useRef(false)

  const showError = useCallback((error: string, screen: string, onRetry?: () => void) => {
    // Inherit retried=true if this showError is coming from inside a retry callback
    const isRetry = retriedRef.current
    retriedRef.current = false
    setRetried(isRetry)
    setErrorState({ error, screen, onRetry })
  }, [])

  const clearError = useCallback(() => {
    retriedRef.current = false
    setRetried(false)
    setErrorState(null)
  }, [])

  const handleRetry = () => {
    if (!errorState?.onRetry) { clearError(); return }
    const retry = errorState.onRetry
    retriedRef.current = true   // set synchronously before retry fires
    setErrorState(null)          // hide overlay
    retry()                      // retry calls showError → reads retriedRef.current = true
  }

  return (
    <GlobalErrorContext.Provider value={{ showError, clearError }}>
      {children}
      {errorState && (
        <View style={[styles.overlay, { paddingTop: insets.top, paddingBottom: insets.bottom, backgroundColor: colors.background }]}>
          <ErrorCard
            error={errorState.error}
            screen={errorState.screen}
            onRetry={handleRetry}
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
