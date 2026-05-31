import React, { useCallback, useState } from "react"
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image, ActivityIndicator, Modal, ScrollView, Alert } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { Ionicons } from "@expo/vector-icons"
import { useNavigation, useFocusEffect } from "@react-navigation/native"
import { apiFetch } from "../lib/api"
import { useAuth } from "../context/AuthContext"
import { useTheme } from "../context/ThemeContext"
import { useGlobalError } from "../context/GlobalErrorContext"
import { spacing, radius } from "../lib/theme"

type Filter = "all" | "saved" | "tried"

type Recipe = {
  recipeId: string
  title: string
  image: string
  readyInMinutes: number
  servings: number
  // tried fields
  triedOn?: string
  satisfaction?: number
  timeAccuracy?: number
  difficulty?: string
  // flags
  isSaved: boolean
  isTried: boolean
}

const DIFFICULTIES = ["Very Easy", "Easy", "Moderate", "Difficult", "Very Difficult"]

function Stars({ rating, onPress, colors }: { rating: number; onPress?: (v: number) => void; colors: any }) {
  return (
    <View style={{ flexDirection: "row", gap: 2 }}>
      {[1, 2, 3, 4, 5].map(star => (
        <TouchableOpacity key={star} onPress={() => onPress?.(star)} disabled={!onPress}>
          <Ionicons name={star <= rating ? "star" : "star-outline"} size={onPress ? 26 : 15} color={star <= rating ? "#f59e0b" : colors.muted} />
        </TouchableOpacity>
      ))}
    </View>
  )
}

export default function MyRecipesScreen() {
  const { user } = useAuth()
  const navigation = useNavigation<any>()
  const { colors } = useTheme()
  const { showError } = useGlobalError()
  const s = makeStyles(colors)

  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<Filter>("all")

  // rating modal
  const [ratingModal, setRatingModal] = useState(false)
  const [selected, setSelected] = useState<Recipe | null>(null)
  const [ratingValues, setRatingValues] = useState({ satisfaction: 0, timeAccuracy: 0, difficulty: "Moderate" })

  const fetchAll = useCallback(async () => {
    if (!user) return
    setLoading(true)
    try {
      const [favsRes, triedRes] = await Promise.all([
        apiFetch(`/api/favourites?userId=${user.id}`, { screen: "My Recipes" }),
        apiFetch(`/api/tried-recipes?userId=${user.id}`, { screen: "My Recipes" }),
      ])
      const favsData = await favsRes.json()
      const triedData = await triedRes.json()

      const map = new Map<string, Recipe>()

      for (const f of (favsData.favourites ?? [])) {
        map.set(f.recipe_id, {
          recipeId: f.recipe_id,
          title: f.recipe_title,
          image: f.recipe_image,
          readyInMinutes: f.ready_in_minutes,
          servings: f.servings,
          isSaved: true,
          isTried: false,
        })
      }

      for (const t of (triedData.triedRecipes ?? [])) {
        const existing = map.get(t.recipe_id)
        if (existing) {
          existing.isTried = true
          existing.triedOn = t.tried_on
          existing.satisfaction = t.satisfaction
          existing.timeAccuracy = t.time_accuracy
          existing.difficulty = t.difficulty
        } else {
          map.set(t.recipe_id, {
            recipeId: t.recipe_id,
            title: t.recipe_title,
            // Spoonacular image CDN — works for any recipe ID
            image: `https://spoonacular.com/recipeImages/${t.recipe_id}-312x231.jpg`,
            readyInMinutes: t.estimated_time ?? 0,
            servings: 0,
            isSaved: false,
            isTried: true,
            triedOn: t.tried_on,
            satisfaction: t.satisfaction,
            timeAccuracy: t.time_accuracy,
            difficulty: t.difficulty,
          })
        }
      }

      setRecipes(Array.from(map.values()))
    } catch (e: any) {
      showError(e?.message ?? "Failed to load recipes", "My Recipes", fetchAll)
    } finally { setLoading(false) }
  }, [user])

  useFocusEffect(useCallback(() => {
    if (!user) { navigation.navigate("Login"); return }
    fetchAll()
  }, [user, fetchAll]))

  const filtered = recipes.filter(r => {
    if (filter === "saved") return r.isSaved
    if (filter === "tried") return r.isTried
    return true
  })

  const removeSaved = async (recipeId: string) => {
    setRecipes(prev => prev.map(r => r.recipeId === recipeId ? { ...r, isSaved: false } : r).filter(r => r.isSaved || r.isTried))
    await apiFetch("/api/favourites", { method: "DELETE", body: JSON.stringify({ userId: user!.id, recipeId }) })
  }

  const removeTried = (recipe: Recipe) => {
    Alert.alert("Remove from History", `Remove "${recipe.title}" from your tried history?`, [
      { text: "Cancel", style: "cancel" },
      { text: "Remove", style: "destructive", onPress: async () => {
        setRecipes(prev => prev.map(r => r.recipeId === recipe.recipeId ? { ...r, isTried: false, triedOn: undefined, satisfaction: undefined } : r).filter(r => r.isSaved || r.isTried))
        await apiFetch("/api/tried-recipes", { method: "DELETE", body: JSON.stringify({ userId: user!.id, recipeId: recipe.recipeId }) })
      }},
    ])
  }

  const openRating = (recipe: Recipe) => {
    setSelected(recipe)
    setRatingValues({ satisfaction: recipe.satisfaction ?? 0, timeAccuracy: recipe.timeAccuracy ?? 0, difficulty: recipe.difficulty ?? "Moderate" })
    setRatingModal(true)
  }

  const submitRating = async () => {
    if (!selected) return
    try {
      const res = await apiFetch("/api/tried-recipes", {
        method: "PATCH",
        screen: "My Recipes",
        body: JSON.stringify({ userId: user!.id, recipeId: selected.recipeId, ...ratingValues }),
      })
      if (!res.ok) { setRatingModal(false); showError("Failed to save rating", "My Recipes"); return }
      setRecipes(prev => prev.map(r => r.recipeId === selected.recipeId ? { ...r, ...ratingValues } : r))
      setRatingModal(false)
    } catch (e: any) {
      setRatingModal(false)
      showError(e?.message ?? "Network error", "My Recipes")
    }
  }

  const savedCount = recipes.filter(r => r.isSaved).length
  const triedCount = recipes.filter(r => r.isTried).length

  if (!user) return null
  if (loading) return <View style={s.center}><ActivityIndicator size="large" color={colors.primary} /></View>

  return (
    <SafeAreaView style={s.container} edges={["top"]}>
      <View style={s.header}>
        <Text style={s.headerTitle}>My Recipes</Text>
        <Text style={s.headerCount}>{savedCount} saved · {triedCount} tried</Text>
      </View>

      {/* Filter tabs */}
      <View style={s.tabs}>
        {(["all", "saved", "tried"] as Filter[]).map(f => (
          <TouchableOpacity key={f} style={[s.tab, filter === f && s.tabActive]} onPress={() => setFilter(f)}>
            <Text style={[s.tabText, filter === f && s.tabTextActive]}>
              {f === "all" ? "All" : f === "saved" ? `Saved (${savedCount})` : `Tried (${triedCount})`}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {filtered.length === 0 ? (
        <View style={s.empty}>
          <Ionicons name={filter === "tried" ? "time-outline" : "heart-outline"} size={56} color={colors.muted} />
          <Text style={s.emptyTitle}>{filter === "tried" ? "No tried recipes yet" : filter === "saved" ? "No saved recipes yet" : "No recipes yet"}</Text>
          <Text style={s.emptySubText}>{filter === "tried" ? "Recipes you cook will appear here." : "Save recipes you love to find them easily."}</Text>
          <TouchableOpacity style={s.browseBtn} onPress={() => navigation.navigate("Search")}>
            <Text style={s.browseBtnText}>Browse Recipes</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={r => r.recipeId}
          contentContainerStyle={{ padding: spacing.md, gap: 12 }}
          renderItem={({ item }) => (
            <TouchableOpacity style={s.card} onPress={() => navigation.navigate("RecipeDetail", { id: item.recipeId, title: item.title })} activeOpacity={0.8}>
              <View style={s.cardTop}>
                {item.image ? (
                  <Image source={{ uri: item.image }} style={s.cardImage} resizeMode="cover" />
                ) : (
                  <View style={[s.cardImage, s.cardImagePlaceholder]}>
                    <Ionicons name="restaurant-outline" size={24} color={colors.muted} />
                  </View>
                )}
                <View style={s.cardBody}>
                  <Text style={s.cardTitle} numberOfLines={2}>{item.title}</Text>
                  <View style={s.badges}>
                    {item.isSaved && (
                      <View style={s.badge}>
                        <Ionicons name="heart" size={11} color={colors.primary} />
                        <Text style={s.badgeText}>Saved</Text>
                      </View>
                    )}
                    {item.isTried && (
                      <View style={[s.badge, s.badgeTried]}>
                        <Ionicons name="checkmark-circle" size={11} color="#16a34a" />
                        <Text style={[s.badgeText, s.badgeTriedText]}>Tried</Text>
                      </View>
                    )}
                  </View>
                  <View style={s.metaRow}>
                    {item.readyInMinutes > 0 && <View style={s.metaChip}><Ionicons name="time-outline" size={12} color={colors.mutedForeground} /><Text style={s.metaText}>{item.readyInMinutes} min</Text></View>}
                  {item.servings > 0 && <View style={s.metaChip}><Ionicons name="people-outline" size={12} color={colors.mutedForeground} /><Text style={s.metaText}>{item.servings} servings</Text></View>}
                    {item.triedOn && <View style={s.metaChip}><Ionicons name="calendar-outline" size={12} color={colors.mutedForeground} /><Text style={s.metaText}>{item.triedOn.split("T")[0]}</Text></View>}
                  </View>
                </View>
                {/* Actions */}
                <View style={s.cardActions}>
                  {item.isSaved && (
                    <TouchableOpacity onPress={() => removeSaved(item.recipeId)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                      <Ionicons name="heart" size={20} color={colors.primary} />
                    </TouchableOpacity>
                  )}
                  {item.isTried && (
                    <TouchableOpacity onPress={() => openRating(item)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                      <Ionicons name="star-outline" size={20} color="#f59e0b" />
                    </TouchableOpacity>
                  )}
                </View>
              </View>

              {/* Tried rating summary */}
              {item.isTried && item.satisfaction ? (
                <View style={s.ratingRow}>
                  <Stars rating={item.satisfaction} colors={colors} />
                  {item.difficulty ? <Text style={s.difficultyText}>{item.difficulty}</Text> : null}
                  <TouchableOpacity onPress={() => removeTried(item)}>
                    <Ionicons name="trash-outline" size={15} color={colors.destructive} />
                  </TouchableOpacity>
                </View>
              ) : item.isTried ? (
                <View style={s.ratingRow}>
                  <Text style={s.noRating}>Not rated yet</Text>
                  <TouchableOpacity onPress={() => removeTried(item)}>
                    <Ionicons name="trash-outline" size={15} color={colors.destructive} />
                  </TouchableOpacity>
                </View>
              ) : null}
            </TouchableOpacity>
          )}
        />
      )}

      {/* Rating modal */}
      <Modal visible={ratingModal} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setRatingModal(false)}>
        <SafeAreaView style={s.modal}>
          <View style={s.modalHeader}>
            <Text style={s.modalTitle}>Rate Your Experience</Text>
            <TouchableOpacity onPress={() => setRatingModal(false)}>
              <Ionicons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>
          <ScrollView style={{ padding: spacing.md }}>
            {selected && <Text style={s.modalRecipeName}>{selected.title}</Text>}
            <Text style={s.sectionLabel}>Overall Satisfaction</Text>
            <Stars rating={ratingValues.satisfaction} onPress={v => setRatingValues(p => ({ ...p, satisfaction: v }))} colors={colors} />
            <Text style={[s.sectionLabel, { marginTop: spacing.lg }]}>Time Accuracy</Text>
            <Stars rating={ratingValues.timeAccuracy} onPress={v => setRatingValues(p => ({ ...p, timeAccuracy: v }))} colors={colors} />
            <Text style={[s.sectionLabel, { marginTop: spacing.lg }]}>Difficulty</Text>
            {DIFFICULTIES.map(d => (
              <TouchableOpacity key={d} style={s.difficultyOption} onPress={() => setRatingValues(p => ({ ...p, difficulty: d }))}>
                <View style={[s.radio, ratingValues.difficulty === d && s.radioSelected]} />
                <Text style={s.difficultyOptionText}>{d}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          <View style={s.modalFooter}>
            <TouchableOpacity style={s.cancelBtn} onPress={() => setRatingModal(false)}>
              <Text style={s.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.submitBtn} onPress={submitRating}>
              <Text style={s.submitBtnText}>Save Rating</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  )
}

const makeStyles = (colors: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.background },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: spacing.md, borderBottomWidth: 1.5, borderBottomColor: "rgba(255,255,255,0.4)" },
  headerTitle: { fontSize: 20, fontWeight: "800", color: colors.text },
  headerCount: { fontSize: 13, color: colors.mutedForeground },
  tabs: { flexDirection: "row", paddingHorizontal: spacing.md, paddingTop: 12, paddingBottom: 4, gap: 8 },
  tab: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 99, borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.card },
  tabActive: { borderColor: colors.primary, backgroundColor: colors.primary },
  tabText: { fontSize: 13, fontWeight: "600", color: colors.mutedForeground },
  tabTextActive: { color: "#fff" },
  empty: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, padding: spacing.xl },
  emptyTitle: { fontSize: 18, fontWeight: "600", color: colors.text },
  emptySubText: { fontSize: 14, color: colors.mutedForeground, textAlign: "center" },
  browseBtn: { backgroundColor: colors.primary, paddingHorizontal: 24, paddingVertical: 12, borderRadius: radius.md, marginTop: 8 },
  browseBtnText: { color: "#fff", fontWeight: "700" },
  card: { backgroundColor: colors.card, borderRadius: radius.lg, borderWidth: 1.5, borderColor: colors.border, overflow: "hidden" },
  cardTop: { flexDirection: "row", alignItems: "stretch" },
  cardImage: { width: 80, minHeight: 80 },
  cardImagePlaceholder: { alignItems: "center", justifyContent: "center", backgroundColor: colors.border },
  cardBody: { flex: 1, padding: spacing.sm },
  cardTitle: { fontSize: 14, fontWeight: "700", color: colors.text, marginBottom: 4 },
  badges: { flexDirection: "row", gap: 6, marginBottom: 4 },
  badge: { flexDirection: "row", alignItems: "center", gap: 3, backgroundColor: colors.primary + "18", paddingHorizontal: 7, paddingVertical: 2, borderRadius: 99 },
  badgeText: { fontSize: 10, fontWeight: "700", color: colors.primary },
  badgeTried: { backgroundColor: "#dcfce7" },
  badgeTriedText: { color: "#16a34a" },
  metaRow: { flexDirection: "row", gap: 10, flexWrap: "wrap" },
  metaChip: { flexDirection: "row", alignItems: "center", gap: 3 },
  metaText: { fontSize: 11, color: colors.mutedForeground },
  cardActions: { flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12, padding: spacing.sm },
  ratingRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: spacing.sm, paddingBottom: spacing.sm, paddingTop: 2 },
  difficultyText: { fontSize: 12, color: colors.mutedForeground, flex: 1 },
  noRating: { fontSize: 12, color: colors.mutedForeground, fontStyle: "italic", flex: 1 },
  modal: { flex: 1, backgroundColor: colors.background },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border },
  modalTitle: { fontSize: 18, fontWeight: "700", color: colors.text },
  modalRecipeName: { fontSize: 14, color: colors.mutedForeground, marginBottom: spacing.lg },
  sectionLabel: { fontSize: 15, fontWeight: "600", color: colors.text, marginBottom: spacing.sm },
  difficultyOption: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 8 },
  radio: { width: 18, height: 18, borderRadius: 9, borderWidth: 2, borderColor: colors.muted },
  radioSelected: { borderColor: colors.primary, backgroundColor: colors.primary },
  difficultyOptionText: { fontSize: 15, color: colors.text },
  modalFooter: { flexDirection: "row", gap: 12, padding: spacing.md, borderTopWidth: 1, borderTopColor: colors.border },
  cancelBtn: { flex: 1, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingVertical: 12, alignItems: "center" },
  cancelBtnText: { color: colors.text, fontWeight: "600" },
  submitBtn: { flex: 1, backgroundColor: colors.primary, borderRadius: radius.md, paddingVertical: 12, alignItems: "center" },
  submitBtnText: { color: "#fff", fontWeight: "700" },
})
