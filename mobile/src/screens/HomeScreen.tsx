import React, { useRef, useCallback } from "react"
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { Ionicons } from "@expo/vector-icons"
import { useNavigation, useFocusEffect } from "@react-navigation/native"
import { useTheme } from "../context/ThemeContext"
import { useAuth } from "../context/AuthContext"
import { spacing, radius } from "../lib/theme"

const GAP = 24
const H_PAD = 24 * 2
const TILE_SIZE = (Dimensions.get("window").width - H_PAD - GAP) / 2

const FEATURES = [
  {
    icon: "search-outline" as const,
    title: "Find Recipes",
    desc: "Filter by diet, cuisine, time, budget and more.",
  },
  {
    icon: "camera-outline" as const,
    title: "Scan Fridge",
    desc: "Photo your fridge and get instant recipe suggestions.",
  },
  {
    icon: "bookmark-outline" as const,
    title: "My Recipes",
    desc: "Save to Try or Tried. Rate, tag, and organise into folders.",
  },
  {
    icon: "calendar-outline" as const,
    title: "Meal Planner",
    desc: "Generate a personalised week of meals by goal or custom filters.",
  },
  {
    icon: "cart-outline" as const,
    title: "Shopping List",
    desc: "Add ingredients from any recipe. Tick off as you shop.",
  },
  {
    icon: "person-outline" as const,
    title: "Profile",
    desc: "Manage your account, theme, and subscription.",
  },
]

export default function HomeScreen() {
  const navigation = useNavigation<any>()
  const { colors } = useTheme()
  const { user } = useAuth()
  const s = makeStyles(colors)
  const scrollRef = useRef<ScrollView>(null)

  const { trialActive, daysLeftInTrial: daysLeft } = useAuth()

  useFocusEffect(useCallback(() => {
    scrollRef.current?.scrollTo({ y: 0, animated: false })
  }, []))

  return (
    <SafeAreaView style={s.container} edges={["top"]}>
      <ScrollView ref={scrollRef} contentContainerStyle={s.content}>

        {trialActive && (
          <TouchableOpacity style={s.trialBanner} onPress={() => navigation.navigate("Profile")} activeOpacity={0.8}>
            <Ionicons name="timer-outline" size={16} color="#fff" />
            <Text style={s.trialBannerText}>
              {daysLeft > 0 ? `Free trial — ${daysLeft} day${daysLeft === 1 ? "" : "s"} left` : "Your trial has expired"}
            </Text>
            <Ionicons name="chevron-forward" size={14} color="rgba(255,255,255,0.7)" />
          </TouchableOpacity>
        )}

        {/* Hero */}
        <View style={s.hero}>
          <View style={s.iconCircle}>
            <Ionicons name="restaurant" size={48} color={colors.primary} />
          </View>
          <Text style={s.heroTitle}>I Wanna Cook</Text>
          <Text style={s.heroSub}>From fridge scan to meal plan{"\n"}— everything in one place.</Text>
        </View>

        {/* Feature tiles — 2 columns, fixed pixel width so all tiles are identical */}
        <View style={s.tilesSection}>
          <View style={s.tilesGrid}>
            {FEATURES.map((f) => (
              <View key={f.title} style={s.tile}>
                <Text style={s.tileTitle} numberOfLines={2}>{f.title}</Text>
                <Text style={s.tileDesc}>{f.desc}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* CTA */}
        <View style={s.cta}>
          <Text style={s.ctaTitle}>Ready to cook?</Text>
          <Text style={s.ctaSub}>Tell us what you'd like to do and we'll get you started.</Text>
          <TouchableOpacity style={s.primaryBtn} onPress={() => navigation.navigate("ReadyToCook")}>
            <Ionicons name="arrow-forward" size={18} color="#fff" style={{ marginRight: 8 }} />
            <Text style={s.primaryBtnText}>Let's go</Text>
          </TouchableOpacity>
        </View>

      </ScrollView>
    </SafeAreaView>
  )
}

const makeStyles = (colors: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { paddingBottom: 120 },

  trialBanner: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: colors.primary,
    marginHorizontal: spacing.md, marginTop: spacing.md,
    borderRadius: radius.md, paddingHorizontal: 14, paddingVertical: 10,
  },
  trialBannerText: { flex: 1, color: "#fff", fontWeight: "600", fontSize: 13 },

  hero: {
    alignItems: "center",
    paddingHorizontal: spacing.md,
    paddingTop: spacing.lg,
    paddingBottom: 32,
  },
  iconCircle: {
    width: 96, height: 96, borderRadius: 48,
    backgroundColor: colors.primary + "22",
    alignItems: "center", justifyContent: "center",
    marginBottom: 20,
  },
  heroTitle: { fontSize: 30, fontWeight: "800", color: colors.text, textAlign: "center", marginBottom: 12 },
  heroSub: { fontSize: 16, color: colors.mutedForeground, textAlign: "center", lineHeight: 26 },

  tilesSection: {
    paddingHorizontal: 24,
    paddingTop: 8,
  },
  tilesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: GAP,
  },
  tile: {
    width: TILE_SIZE,
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 0.5,
    borderColor: colors.primary,
    padding: 16,
    gap: 0,
    alignItems: "center",
  },
  tileTitle: { fontSize: 16, fontWeight: "700", color: colors.text, textAlign: "center", marginBottom: 4 },
  tileDesc: { fontSize: 13, color: colors.mutedForeground, lineHeight: 18, textAlign: "center" },

  cta: {
    alignItems: "center",
    paddingHorizontal: spacing.md,
    paddingTop: 40,
    paddingBottom: 20,
  },
  ctaTitle: { fontSize: 24, fontWeight: "800", color: colors.text, textAlign: "center", marginBottom: 8 },
  ctaSub: { fontSize: 14, color: colors.mutedForeground, textAlign: "center", marginBottom: 24, lineHeight: 20 },
  primaryBtn: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: colors.primary,
    paddingHorizontal: 32, paddingVertical: 16, borderRadius: radius.md,
  },
  primaryBtnText: { color: "#fff", fontWeight: "700", fontSize: 16 },
})
