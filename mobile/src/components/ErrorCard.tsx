import React, { useState } from "react"
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from "react-native"
import { Ionicons } from "@expo/vector-icons"
import { useTheme } from "../context/ThemeContext"
import { spacing, radius } from "../lib/theme"
import { reportError, getErrorFingerprint, wasReported } from "../lib/reportError"

type Props = {
  error: string
  screen: string
  onRetry: () => void
  retrying?: boolean
}

function getErrorDisplay(error: string): { title: string; message: string; icon: string; isQuota: boolean } {
  const lower = error.toLowerCase()

  if (lower.includes("402") || lower.includes("quota") || lower.includes("limit") || lower.includes("payment")) {
    return {
      title: "Service Temporarily Unavailable",
      message: "We've hit our recipe search limit for today. Please try again tomorrow.",
      icon: "cloud-offline-outline",
      isQuota: true,
    }
  }
  if (lower.includes("network") || lower.includes("fetch") || lower.includes("connection")) {
    return {
      title: "No Connection",
      message: "Check your internet connection and try again.",
      icon: "wifi-outline",
      isQuota: false,
    }
  }
  if (lower.includes("500") || lower.includes("server")) {
    return {
      title: "Server Error",
      message: "Something went wrong on our end. Please try again in a moment.",
      icon: "server-outline",
      isQuota: false,
    }
  }
  return {
    title: "Something Went Wrong",
    message: "An unexpected error occurred. Please try again.",
    icon: "alert-circle-outline",
    isQuota: false,
  }
}

export default function ErrorCard({ error, screen, onRetry, retrying }: Props) {
  const { colors } = useTheme()
  const s = makeStyles(colors)
  const fingerprint = getErrorFingerprint(error, screen)
  const [reported, setReported] = useState(wasReported(fingerprint))
  const [reporting, setReporting] = useState(false)

  const { title, message, icon, isQuota } = getErrorDisplay(error)

  const handleReport = async () => {
    setReporting(true)
    await reportError(error, screen, fingerprint)
    setReported(true)
    setReporting(false)
  }

  return (
    <View style={s.container}>
      <Ionicons name={icon as any} size={52} color={colors.destructive} />
      <Text style={s.title}>{title}</Text>
      <Text style={s.message}>{message}</Text>

      <TouchableOpacity style={s.retryBtn} onPress={onRetry} disabled={retrying}>
        {retrying
          ? <ActivityIndicator size="small" color="#fff" />
          : <><Ionicons name="refresh" size={16} color="#fff" style={{ marginRight: 6 }} /><Text style={s.retryText}>Try Again</Text></>
        }
      </TouchableOpacity>

      {reported ? (
        <View style={s.reportedRow}>
          <Ionicons name="checkmark-circle" size={15} color={colors.green} />
          <Text style={s.reportedText}>Issue reported to developer</Text>
        </View>
      ) : (
        <TouchableOpacity style={s.reportBtn} onPress={handleReport} disabled={reporting}>
          {reporting
            ? <ActivityIndicator size="small" color={colors.mutedForeground} />
            : <><Ionicons name="mail-outline" size={15} color={colors.mutedForeground} style={{ marginRight: 5 }} /><Text style={s.reportText}>Report this issue</Text></>
          }
        </TouchableOpacity>
      )}
    </View>
  )
}

const makeStyles = (colors: any) => StyleSheet.create({
  container: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, padding: spacing.xl },
  title: { fontSize: 18, fontWeight: "700", color: colors.text, textAlign: "center" },
  message: { fontSize: 14, color: colors.mutedForeground, textAlign: "center", lineHeight: 20 },
  retryBtn: { flexDirection: "row", alignItems: "center", backgroundColor: colors.primary, paddingHorizontal: 24, paddingVertical: 11, borderRadius: radius.md, marginTop: 4, minWidth: 130, justifyContent: "center" },
  retryText: { color: "#fff", fontWeight: "700", fontSize: 15 },
  reportBtn: { flexDirection: "row", alignItems: "center", paddingVertical: 6, marginTop: 2 },
  reportText: { fontSize: 13, color: colors.mutedForeground, textDecorationLine: "underline" },
  reportedRow: { flexDirection: "row", alignItems: "center", gap: 5, marginTop: 2 },
  reportedText: { fontSize: 13, color: colors.green },
})
