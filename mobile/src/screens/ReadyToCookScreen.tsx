import React from "react"
import { View, Text, StyleSheet, TouchableOpacity } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { Ionicons } from "@expo/vector-icons"
import { useNavigation } from "@react-navigation/native"
import { useTheme } from "../context/ThemeContext"
import { spacing, radius } from "../lib/theme"

export default function ReadyToCookScreen() {
  const navigation = useNavigation<any>()
  const { colors } = useTheme()
  const s = makeStyles(colors)

  return (
    <SafeAreaView style={s.container} edges={["top", "bottom"]}>
      <View style={s.inner}>

        <View style={s.header}>
          <Text style={s.title}>What would you like to do?</Text>
          <Text style={s.sub}>Choose how you want to find your next meal.</Text>
        </View>

        <View style={s.cards}>
          <TouchableOpacity
            style={s.card}
            activeOpacity={0.75}
            onPress={() => navigation.navigate("Search")}
          >
            <View style={s.cardIconWrap}>
              <Ionicons name="search-outline" size={36} color={colors.primary} />
            </View>
            <Text style={s.cardTitle}>Browse Recipes</Text>
            <Text style={s.cardDesc}>Search our full library and filter by diet, cuisine, time, budget, and more.</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={s.card}
            activeOpacity={0.75}
            onPress={() => navigation.navigate("Scan")}
          >
            <View style={s.cardIconWrap}>
              <Ionicons name="camera-outline" size={36} color={colors.primary} />
            </View>
            <Text style={s.cardTitle}>Scan Your Fridge</Text>
            <Text style={s.cardDesc}>Take a photo or upload from your library and we'll suggest recipes from what you have.</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.6}>
          <Ionicons name="arrow-back" size={16} color={colors.mutedForeground} />
          <Text style={s.backText}>Go back</Text>
        </TouchableOpacity>

      </View>
    </SafeAreaView>
  )
}

const makeStyles = (colors: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  inner: {
    flex: 1,
    paddingHorizontal: spacing.md,
    justifyContent: "center",
    gap: 32,
  },

  header: { alignItems: "center", gap: 8 },
  title: { fontSize: 26, fontWeight: "800", color: colors.text, textAlign: "center" },
  sub: { fontSize: 15, color: colors.mutedForeground, textAlign: "center", lineHeight: 22 },

  cards: { gap: 20, paddingHorizontal: 24 },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.primary + "77",
    padding: 24,
    alignItems: "center",
    gap: 12,
  },
  cardIconWrap: {
    width: 72, height: 72, borderRadius: 20,
    backgroundColor: colors.primary + "33",
    alignItems: "center", justifyContent: "center",
  },
  cardTitle: { fontSize: 18, fontWeight: "700", color: colors.text },
  cardDesc: { fontSize: 13, color: colors.mutedForeground, textAlign: "center", lineHeight: 19 },

  backBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 8 },
  backText: { fontSize: 14, color: colors.mutedForeground },
})
