import React, { useCallback, useState } from "react"
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image, ActivityIndicator } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { Ionicons } from "@expo/vector-icons"
import { useNavigation, useFocusEffect } from "@react-navigation/native"
import { apiFetch } from "../lib/api"
import { useAuth } from "../context/AuthContext"
import { useTheme } from "../context/ThemeContext"
import { spacing, radius } from "../lib/theme"

type Favourite = { id: string; recipe_id: string; recipe_title: string; recipe_image: string; ready_in_minutes: number; servings: number }

export default function FavouritesScreen() {
  const { user } = useAuth()
  const navigation = useNavigation<any>()
  const { colors } = useTheme()
  const s = makeStyles(colors)
  const [favs, setFavs] = useState<Favourite[]>([])
  const [loading, setLoading] = useState(true)

  useFocusEffect(useCallback(() => {
    if (!user) { navigation.navigate("Login"); return }
    setLoading(true)
    apiFetch(`/api/favourites?userId=${user.id}`)
      .then(r => r.json())
      .then(data => { setFavs(data.favourites || []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [user]))

  const removeFav = async (recipeId: string) => {
    setFavs(prev => prev.filter(f => f.recipe_id !== recipeId))
    await apiFetch("/api/favourites", { method: "DELETE", body: JSON.stringify({ userId: user!.id, recipeId }) })
  }

  if (!user) return null
  if (loading) return <View style={s.center}><ActivityIndicator size="large" color={colors.primary} /></View>

  return (
    <SafeAreaView style={s.container} edges={["top"]}>
      <View style={s.header}>
        <Ionicons name="heart" size={22} color={colors.primary} />
        <Text style={s.headerTitle}>Favourites</Text>
        {favs.length > 0 && <Text style={s.headerCount}>{favs.length} saved</Text>}
      </View>
      {favs.length === 0 ? (
        <View style={s.empty}>
          <Ionicons name="heart-outline" size={56} color={colors.muted} />
          <Text style={s.emptyTitle}>No favourites yet</Text>
          <Text style={s.emptySubText}>Save recipes you love to find them easily later.</Text>
          <TouchableOpacity style={s.browseBtn} onPress={() => navigation.navigate("Search")}>
            <Text style={s.browseBtnText}>Browse Recipes</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={favs}
          keyExtractor={f => f.id}
          contentContainerStyle={{ padding: spacing.md, gap: 12 }}
          renderItem={({ item }) => (
            <TouchableOpacity style={s.card} onPress={() => navigation.navigate("RecipeDetail", { id: item.recipe_id, title: item.recipe_title })}>
              <Image source={{ uri: item.recipe_image }} style={s.cardImage} resizeMode="cover" />
              <View style={s.cardBody}>
                <Text style={s.cardTitle} numberOfLines={2}>{item.recipe_title}</Text>
                <View style={s.metaRow}>
                  {item.ready_in_minutes > 0 && <View style={s.metaChip}><Ionicons name="time-outline" size={13} color={colors.mutedForeground} /><Text style={s.metaText}>{item.ready_in_minutes} min</Text></View>}
                  {item.servings > 0 && <View style={s.metaChip}><Ionicons name="people-outline" size={13} color={colors.mutedForeground} /><Text style={s.metaText}>{item.servings} servings</Text></View>}
                </View>
              </View>
              <TouchableOpacity style={s.removeBtn} onPress={() => removeFav(item.recipe_id)}>
                <Ionicons name="heart" size={20} color={colors.primary} />
              </TouchableOpacity>
            </TouchableOpacity>
          )}
        />
      )}
    </SafeAreaView>
  )
}

const makeStyles = (colors: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.background },
  header: { flexDirection: "row", alignItems: "center", gap: 8, padding: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border },
  headerTitle: { fontSize: 20, fontWeight: "700", color: colors.text },
  headerCount: { fontSize: 13, color: colors.mutedForeground },
  empty: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, padding: spacing.xl },
  emptyTitle: { fontSize: 18, fontWeight: "600", color: colors.text },
  emptySubText: { fontSize: 14, color: colors.mutedForeground, textAlign: "center" },
  browseBtn: { backgroundColor: colors.primary, paddingHorizontal: 24, paddingVertical: 12, borderRadius: radius.md, marginTop: 8 },
  browseBtnText: { color: "#fff", fontWeight: "700" },
  card: { backgroundColor: colors.card, borderRadius: radius.lg, overflow: "hidden", borderWidth: 1.5, borderColor: colors.border, flexDirection: "row" },
  cardImage: { width: 90, height: 90 },
  cardBody: { flex: 1, padding: spacing.sm, justifyContent: "center" },
  cardTitle: { fontSize: 14, fontWeight: "700", color: colors.text, marginBottom: 6 },
  metaRow: { flexDirection: "row", gap: 10, flexWrap: "wrap" },
  metaChip: { flexDirection: "row", alignItems: "center", gap: 4 },
  metaText: { fontSize: 12, color: colors.mutedForeground },
  removeBtn: { padding: spacing.sm, justifyContent: "center" },
})
