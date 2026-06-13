import React, { useCallback } from "react"
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { Ionicons } from "@expo/vector-icons"
import { useNavigation, useFocusEffect } from "@react-navigation/native"
import { useAuth } from "../context/AuthContext"
import { useTheme } from "../context/ThemeContext"
import { useMyRecipes } from "../context/MyRecipesContext"
import { spacing, radius } from "../lib/theme"

export default function MyRecipesScreen() {
  const { user } = useAuth()
  const navigation = useNavigation<any>()
  const { colors } = useTheme()
  const { toTryRecipes, triedRecipes, loading, fetchAll } = useMyRecipes()
  const s = makeStyles(colors)

  useFocusEffect(useCallback(() => {
    if (!user) { navigation.navigate("Login"); return }
    fetchAll()
  }, [user, fetchAll]))

  if (!user) return null
  if (loading) return <View style={s.center}><ActivityIndicator size="large" color={colors.primary} /></View>

  const toTryCount = toTryRecipes.length
  const triedCount = triedRecipes.length

  return (
    <SafeAreaView style={s.container} edges={["top"]}>
      <View style={s.homeContent}>
        <TouchableOpacity
          style={[s.bigBtn, { backgroundColor: colors.primary }]}
          onPress={() => navigation.navigate("MyRecipesFolders", { listType: "toTry" })}
          activeOpacity={0.85}
        >
          <Ionicons name="bookmark-outline" size={26} color="#fff" />
          <Text style={s.bigBtnText}>To Try</Text>
          <Text style={s.bigBtnCount}>({toTryCount})</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[s.bigBtn, s.bigBtnOrange]}
          onPress={() => navigation.navigate("MyRecipesFolders", { listType: "tried" })}
          activeOpacity={0.85}
        >
          <Ionicons name="checkmark-circle-outline" size={26} color={colors.primary} />
          <Text style={[s.bigBtnText, { color: colors.primary }]}>Tried</Text>
          <Text style={[s.bigBtnCount, { color: colors.primary + "99" }]}>({triedCount})</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  )
}

const makeStyles = (colors: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  homeContent: { flex: 1, padding: spacing.md, paddingTop: 48, gap: 16 },
  bigBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 12, borderRadius: radius.lg, paddingVertical: 18 },
  bigBtnOrange: { backgroundColor: "transparent", borderWidth: 1.5, borderColor: colors.primary },
  bigBtnText: { fontSize: 17, fontWeight: "800", color: "#fff" },
  bigBtnCount: { fontSize: 13, color: "rgba(255,255,255,0.65)", fontWeight: "500" },
})
