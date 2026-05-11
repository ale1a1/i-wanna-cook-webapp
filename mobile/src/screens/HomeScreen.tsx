import React from "react"
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { Ionicons } from "@expo/vector-icons"
import { useNavigation } from "@react-navigation/native"
import { useTheme } from "../context/ThemeContext"
import { spacing, radius } from "../lib/theme"

const FEATURES = [
  { icon: "time-outline", title: "Filter by Time", desc: "Find recipes that fit your schedule." },
  { icon: "globe-outline", title: "Explore Cuisines", desc: "Browse 27 world cuisines." },
  { icon: "heart-outline", title: "Track What You Try", desc: "Rate recipes and build your cookbook." },
]

const HOW_IT_WORKS = [
  { icon: "options-outline", title: "Set your filters", desc: "Prep time, budget, diet, cuisine and more." },
  { icon: "restaurant-outline", title: "Browse recipes", desc: "Real recipes with ingredients and steps." },
  { icon: "cart-outline", title: "Build shopping list", desc: "Add ingredients from any recipe." },
  { icon: "star-outline", title: "Track what you make", desc: "Log and rate the recipes you've tried." },
]

export default function HomeScreen() {
  const navigation = useNavigation<any>()
  const { colors } = useTheme()
  const s = makeStyles(colors)

  return (
    <SafeAreaView style={s.container} edges={["top"]}>
      <ScrollView contentContainerStyle={s.content}>
        <View style={s.hero}>
          <View style={s.iconCircle}>
            <Ionicons name="restaurant" size={48} color={colors.primary} />
          </View>
          <Text style={s.heroTitle}>What Should I Cook?</Text>
          <Text style={s.heroSub}>Discover your next favourite meal. Filter by ingredients, diet, cuisine, budget and more.</Text>
          <View style={s.heroButtons}>
            <TouchableOpacity style={s.primaryBtn} onPress={() => navigation.navigate("Search")}>
              <Ionicons name="search" size={18} color="#fff" style={{ marginRight: 8 }} />
              <Text style={s.primaryBtnText}>Find Recipes</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.outlineBtn} onPress={() => navigation.navigate("Search", { surprise: true })}>
              <Ionicons name="shuffle" size={18} color={colors.primary} style={{ marginRight: 8 }} />
              <Text style={s.outlineBtnText}>Surprise Me</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={s.section}>
          <Text style={s.sectionTitle}>Everything you need to decide</Text>
          {FEATURES.map(f => (
            <View key={f.title} style={s.featureRow}>
              <View style={s.featureIcon}><Ionicons name={f.icon as any} size={24} color={colors.primary} /></View>
              <View style={{ flex: 1 }}>
                <Text style={s.featureTitle}>{f.title}</Text>
                <Text style={s.featureDesc}>{f.desc}</Text>
              </View>
            </View>
          ))}
        </View>

        <View style={s.section}>
          <Text style={s.sectionTitle}>How it works</Text>
          {HOW_IT_WORKS.map((step, i) => (
            <View key={step.title} style={s.stepRow}>
              <View style={s.stepBadge}>
                <Ionicons name={step.icon as any} size={20} color={colors.primary} />
                <View style={s.stepNum}><Text style={s.stepNumText}>{i + 1}</Text></View>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.featureTitle}>{step.title}</Text>
                <Text style={s.featureDesc}>{step.desc}</Text>
              </View>
            </View>
          ))}
        </View>

        <View style={s.cta}>
          <Text style={s.ctaTitle}>Ready to cook something great?</Text>
          <Text style={s.ctaSub}>No sign-up needed to start searching.</Text>
          <TouchableOpacity style={s.primaryBtn} onPress={() => navigation.navigate("Search")}>
            <Text style={s.primaryBtnText}>Get Started</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

const makeStyles = (colors: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { paddingBottom: 40 },
  hero: { alignItems: "center", paddingHorizontal: spacing.md, paddingTop: spacing.lg, paddingBottom: 40, backgroundColor: colors.background },
  iconCircle: { width: 96, height: 96, borderRadius: 48, backgroundColor: colors.primary + "22", alignItems: "center", justifyContent: "center", marginBottom: 20 },
  heroTitle: { fontSize: 30, fontWeight: "800", color: colors.text, textAlign: "center", marginBottom: 12 },
  heroSub: { fontSize: 16, color: colors.mutedForeground, textAlign: "center", marginBottom: 28, lineHeight: 24 },
  heroButtons: { flexDirection: "row", gap: 12, flexWrap: "wrap", justifyContent: "center" },
  primaryBtn: { flexDirection: "row", alignItems: "center", backgroundColor: colors.primary, paddingHorizontal: 24, paddingVertical: 14, borderRadius: radius.md },
  primaryBtnText: { color: "#fff", fontWeight: "700", fontSize: 16 },
  outlineBtn: { flexDirection: "row", alignItems: "center", borderWidth: 1.5, borderColor: colors.primary, paddingHorizontal: 24, paddingVertical: 14, borderRadius: radius.md },
  outlineBtnText: { color: colors.primary, fontWeight: "700", fontSize: 16 },
  section: { paddingHorizontal: spacing.md, paddingVertical: spacing.lg, backgroundColor: colors.card, marginTop: 8 },
  sectionTitle: { fontSize: 20, fontWeight: "700", color: colors.text, textAlign: "center", marginBottom: 20 },
  featureRow: { flexDirection: "row", alignItems: "flex-start", gap: 14, marginBottom: 16 },
  featureIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.primary + "22", alignItems: "center", justifyContent: "center" },
  featureTitle: { fontSize: 15, fontWeight: "600", color: colors.text, marginBottom: 2 },
  featureDesc: { fontSize: 13, color: colors.mutedForeground, lineHeight: 18 },
  stepRow: { flexDirection: "row", alignItems: "flex-start", gap: 14, marginBottom: 16 },
  stepBadge: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.primary + "22", alignItems: "center", justifyContent: "center", position: "relative" },
  stepNum: { position: "absolute", top: -4, right: -4, width: 18, height: 18, borderRadius: 9, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center" },
  stepNumText: { color: "#fff", fontSize: 10, fontWeight: "700" },
  cta: { alignItems: "center", paddingHorizontal: spacing.md, paddingVertical: 40 },
  ctaTitle: { fontSize: 22, fontWeight: "700", color: colors.text, textAlign: "center", marginBottom: 8 },
  ctaSub: { fontSize: 14, color: colors.mutedForeground, marginBottom: 20 },
})
