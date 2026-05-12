import React from "react"
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from "react-native"
import { Ionicons } from "@expo/vector-icons"
import { useTheme } from "../context/ThemeContext"
import { spacing, radius } from "../lib/theme"

type Props = {
  error: string
  screen: string
  onRetry: () => void
  retrying?: boolean
  retried?: boolean
}

function getErrorDisplay(error: string): { title: string; message: string; icon: string } {
  const lower = error.toLowerCase()

  if (lower.includes("402") || lower.includes("quota") || lower.includes("limit") || lower.includes("payment")) {
    return {
      title: "Service Temporarily Unavailable",
      message: "We've hit our recipe search limit for today. Please try again tomorrow.",
      icon: "cloud-offline-outline",
    }
  }
  if (lower.includes("network") || lower.includes("fetch") || lower.includes("connection")) {
    return {
      title: "No Connection",
      message: "Check your internet connection and try again.",
      icon: "wifi-outline",
    }
  }
  if (lower.includes("500") || lower.includes("server")) {
    return {
      title: "Server Error",
      message: "Something went wrong on our end. Please try again in a moment.",
      icon: "server-outline",
    }
  }
  return {
    title: "Something Went Wrong",
    message: "An unexpected error occurred. Please try again.",
    icon: "alert-circle-outline",
  }
}

export default function ErrorCard({ error, screen, onRetry, retrying, retried }: Props) {
  const { colors } = useTheme()
  const s = makeStyles(colors)
  const { title, message, icon } = getErrorDisplay(error)

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

      {retried && (
        <View style={s.reportedRow}>
          <Ionicons name="checkmark-circle" size={15} color={colors.mutedForeground} />
          <Text style={s.reportedText}>Error reported to developer</Text>
        </View>
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
  reportedRow: { flexDirection: "row", alignItems: "center", gap: 5, marginTop: 2 },
  reportedText: { fontSize: 13, color: colors.mutedForeground },
})
