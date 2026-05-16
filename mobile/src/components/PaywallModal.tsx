import React from "react"
import { View, Text, StyleSheet, TouchableOpacity, Modal } from "react-native"
import { Ionicons } from "@expo/vector-icons"
import { useTheme } from "../context/ThemeContext"
import { spacing, radius } from "../lib/theme"

const FEATURES = [
  { icon: "calendar-outline", text: "Weekly AI meal planner" },
  { icon: "camera-outline", text: "Unlimited ingredient photo scans" },
  { icon: "search-outline", text: "Unlimited recipe searches" },
  { icon: "nutrition-outline", text: "Nutrition goal filtering" },
  { icon: "wine-outline", text: "Wine pairing suggestions" },
]

type Props = {
  visible: boolean
  onClose: () => void
  featureName?: string
}

export default function PaywallModal({ visible, onClose, featureName }: Props) {
  const { colors } = useTheme()
  const s = makeStyles(colors)

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={s.container}>
        <TouchableOpacity style={s.closeBtn} onPress={onClose}>
          <Ionicons name="close" size={24} color={colors.text} />
        </TouchableOpacity>

        <View style={s.hero}>
          <Text style={s.emoji}>👨‍🍳</Text>
          <Text style={s.title}>Go Premium</Text>
          {featureName && (
            <Text style={s.subtitle}>Unlock <Text style={s.highlight}>{featureName}</Text> and everything else</Text>
          )}
          {!featureName && (
            <Text style={s.subtitle}>Everything you need to cook smarter</Text>
          )}
        </View>

        <View style={s.features}>
          {FEATURES.map(f => (
            <View key={f.text} style={s.featureRow}>
              <View style={s.featureIcon}>
                <Ionicons name={f.icon as any} size={18} color={colors.primary} />
              </View>
              <Text style={s.featureText}>{f.text}</Text>
            </View>
          ))}
        </View>

        <View style={s.footer}>
          <TouchableOpacity style={s.purchaseBtn} onPress={onClose}>
            <Text style={s.purchaseBtnText}>Start Premium — £4.99/month</Text>
          </TouchableOpacity>
          <Text style={s.legal}>Coming soon. Contact us to get early access.</Text>
        </View>
      </View>
    </Modal>
  )
}

const makeStyles = (colors: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  closeBtn: { position: "absolute", top: spacing.lg, right: spacing.md, zIndex: 10, padding: 4 },
  hero: { alignItems: "center", paddingTop: 60, paddingHorizontal: spacing.xl },
  emoji: { fontSize: 56, marginBottom: 12 },
  title: { fontSize: 28, fontWeight: "800", color: colors.text, marginBottom: 8 },
  subtitle: { fontSize: 16, color: colors.mutedForeground, textAlign: "center" },
  highlight: { color: colors.primary, fontWeight: "700" },
  features: { marginTop: 32, paddingHorizontal: spacing.xl, gap: 16 },
  featureRow: { flexDirection: "row", alignItems: "center", gap: 14 },
  featureIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.primary + "22", alignItems: "center", justifyContent: "center" },
  featureText: { fontSize: 15, color: colors.text, fontWeight: "500" },
  footer: { position: "absolute", bottom: 0, left: 0, right: 0, padding: spacing.xl, paddingBottom: 40, gap: 12 },
  purchaseBtn: { backgroundColor: colors.primary, paddingVertical: 16, borderRadius: radius.lg, alignItems: "center" },
  purchaseBtnText: { color: "#fff", fontSize: 17, fontWeight: "700" },
  restoreBtn: { alignItems: "center", paddingVertical: 8 },
  restoreBtnText: { color: colors.mutedForeground, fontSize: 14 },
  legal: { textAlign: "center", fontSize: 11, color: colors.muted },
})
