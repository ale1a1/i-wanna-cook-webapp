import React, { createContext, useContext, useState, useCallback, useRef } from "react"
import { Modal, View, Text, TouchableOpacity, StyleSheet } from "react-native"
import { useTheme } from "../context/ThemeContext"
import { radius, spacing } from "../lib/theme"

type AlertButton = {
  text: string
  style?: "default" | "cancel" | "destructive"
  onPress?: () => void
}

type AlertConfig = {
  title: string
  message?: string
  buttons?: AlertButton[]
}

type AlertContextType = {
  showAlert: (config: AlertConfig) => void
}

const AlertContext = createContext<AlertContextType>({ showAlert: () => {} })

// Global imperative reference — works outside of React components (e.g. context files)
let _showAlert: ((config: AlertConfig) => void) | null = null
export function showAlert(config: AlertConfig) {
  _showAlert?.(config)
}

export function CustomAlertProvider({ children }: { children: React.ReactNode }) {
  const { colors } = useTheme()
  const [config, setConfig] = useState<AlertConfig | null>(null)
  const s = makeStyles(colors)

  const show = useCallback((cfg: AlertConfig) => {
    setConfig(cfg)
  }, [])

  // Register globally
  _showAlert = show

  const dismiss = () => setConfig(null)

  const buttons = config?.buttons ?? [{ text: "OK", style: "cancel" as const }]

  return (
    <AlertContext.Provider value={{ showAlert: show }}>
      {children}
      <Modal visible={!!config} transparent animationType="fade" onRequestClose={dismiss}>
        <TouchableOpacity style={s.overlay} activeOpacity={1} onPress={dismiss}>
          <TouchableOpacity activeOpacity={1} onPress={() => {}}>
            <View style={s.box}>
              <TouchableOpacity style={s.closeBtn} onPress={dismiss} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Text style={s.closeBtnText}>✕</Text>
              </TouchableOpacity>
              <Text style={s.title}>{config?.title}</Text>
              {config?.message ? <Text style={s.message}>{config.message}</Text> : null}
              <View style={[s.btnRow, buttons.length > 2 && s.btnCol]}>
                {buttons.map((btn, i) => {
                  const isDestructive = btn.style === "destructive"
                  const isCancel = btn.style === "cancel"
                  return (
                    <TouchableOpacity
                      key={i}
                      style={[
                        s.btn,
                        buttons.length <= 2 && { flex: 1 },
                        buttons.length > 2 && s.btnFull,
                        isDestructive && s.btnDestructive,
                        isCancel && s.btnCancel,
                        !isDestructive && !isCancel && s.btnPrimary,
                      ]}
                      onPress={() => { dismiss(); btn.onPress?.() }}
                      activeOpacity={0.8}
                    >
                      <Text style={[
                        s.btnText,
                        isDestructive && s.btnTextDestructive,
                        isCancel && s.btnTextCancel,
                        !isDestructive && !isCancel && s.btnTextPrimary,
                      ]}>
                        {btn.text}
                      </Text>
                    </TouchableOpacity>
                  )
                })}
              </View>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </AlertContext.Provider>
  )
}

export function useAlert() {
  return useContext(AlertContext)
}

const makeStyles = (colors: any) => StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.lg,
  },
  box: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.lg,
    width: "100%",
    borderWidth: 1.5,
    borderColor: colors.border,
    minWidth: 280,
  },
  closeBtn: {
    position: "absolute",
    top: 12,
    right: 14,
  },
  closeBtnText: {
    color: colors.mutedForeground,
    fontSize: 16,
    fontWeight: "600",
  },
  title: {
    fontSize: 17,
    fontWeight: "700",
    color: colors.text,
    marginBottom: 8,
    marginRight: 24,
  },
  message: {
    fontSize: 14,
    color: colors.mutedForeground,
    lineHeight: 20,
    marginBottom: 4,
  },
  btnRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 20,
  },
  btnCol: {
    flexDirection: "column",
    gap: 8,
  },
  btn: {
    borderRadius: radius.md,
    paddingVertical: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  btnFull: {
    width: "100%",
  },
  btnPrimary: {
    backgroundColor: colors.primary,
  },
  btnDestructive: {
    backgroundColor: colors.destructive,
  },
  btnCancel: {
    backgroundColor: "transparent",
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  btnText: {
    fontSize: 15,
    fontWeight: "700",
  },
  btnTextPrimary: {
    color: "#fff",
  },
  btnTextDestructive: {
    color: "#fff",
  },
  btnTextCancel: {
    color: colors.text,
  },
})
