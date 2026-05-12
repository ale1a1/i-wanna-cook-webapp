import React, { useCallback, useState } from "react"
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, Modal, ScrollView, Alert,
  // Alert kept for the remove-recipe confirmation
} from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { Ionicons } from "@expo/vector-icons"
import { useNavigation, useFocusEffect } from "@react-navigation/native"
import { apiFetch } from "../lib/api"
import { useAuth } from "../context/AuthContext"
import { useTheme } from "../context/ThemeContext"
import { useGlobalError } from "../context/GlobalErrorContext"
import { spacing, radius } from "../lib/theme"

type TriedRecipe = {
  id: string
  title: string
  triedOn: string
  estimatedTime: number
  satisfaction: number
  timeAccuracy: number
  difficulty: string
}

const DIFFICULTIES = ["Very Easy", "Easy", "Moderate", "Difficult", "Very Difficult"]

function Stars({ rating, onPress, colors }: { rating: number; onPress?: (v: number) => void; colors: any }) {
  return (
    <View style={{ flexDirection: "row", gap: 2 }}>
      {[1, 2, 3, 4, 5].map(star => (
        <TouchableOpacity key={star} onPress={() => onPress?.(star)} disabled={!onPress}>
          <Ionicons
            name={star <= rating ? "star" : "star-outline"}
            size={onPress ? 26 : 16}
            color={star <= rating ? colors.primary : colors.muted}
          />
        </TouchableOpacity>
      ))}
    </View>
  )
}

export default function TriedRecipesScreen() {
  const { user } = useAuth()
  const navigation = useNavigation<any>()
  const { colors } = useTheme()
  const { showError } = useGlobalError()
  const s = makeStyles(colors)
  const [recipes, setRecipes] = useState<TriedRecipe[]>([])
  const [loading, setLoading] = useState(true)
  const [ratingModal, setRatingModal] = useState(false)
  const [selected, setSelected] = useState<TriedRecipe | null>(null)
  const [ratingValues, setRatingValues] = useState({ satisfaction: 0, timeAccuracy: 0, difficulty: "Moderate" })

  useFocusEffect(useCallback(() => {
    if (!user) { navigation.navigate("Login"); return }
    setLoading(true)
    apiFetch(`/api/tried-recipes?userId=${user.id}`)
      .then(r => r.json())
      .then(data => {
        const mapped = (data.triedRecipes || []).map((r: any) => ({
          id: r.recipe_id,
          title: r.recipe_title,
          triedOn: r.tried_on,
          estimatedTime: r.estimated_time,
          satisfaction: r.satisfaction,
          timeAccuracy: r.time_accuracy,
          difficulty: r.difficulty,
        }))
        setRecipes(mapped)
        setLoading(false)
      })
      .catch((e: any) => {
        setLoading(false)
        showError(e?.message ?? "Failed to load history", "Tried Recipes")
      })
  }, [user]))

  const openRating = (recipe: TriedRecipe) => {
    setSelected(recipe)
    setRatingValues({
      satisfaction: recipe.satisfaction || 0,
      timeAccuracy: recipe.timeAccuracy || 0,
      difficulty: recipe.difficulty || "Moderate",
    })
    setRatingModal(true)
  }

  const submitRating = async () => {
    if (!selected) return
    try {
      const res = await apiFetch("/api/tried-recipes", {
        method: "PATCH",
        screen: "Tried Recipes",
        body: JSON.stringify({
          userId: user!.id,
          recipeId: selected.id,
          satisfaction: ratingValues.satisfaction,
          timeAccuracy: ratingValues.timeAccuracy,
          difficulty: ratingValues.difficulty,
        }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setRatingModal(false)
        showError(data?.error ?? `Server error ${res.status}`, "Tried Recipes", submitRating)
        return
      }
      setRecipes(prev => prev.map(r => r.id === selected.id ? { ...r, ...ratingValues } : r))
      setRatingModal(false)
    } catch (e: any) {
      setRatingModal(false)
      showError(e?.message ?? "Network error", "Tried Recipes", submitRating)
    }
  }

  const removeRecipe = (recipe: TriedRecipe) => {
    Alert.alert("Remove Recipe", `Remove "${recipe.title}" from your history?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove", style: "destructive", onPress: async () => {
          await apiFetch("/api/tried-recipes", {
            method: "DELETE",
            body: JSON.stringify({ userId: user!.id, recipeId: recipe.id }),
          })
          setRecipes(prev => prev.filter(r => r.id !== recipe.id))
        },
      },
    ])
  }

  if (!user) return null

  if (loading) return (
    <View style={s.center}>
      <ActivityIndicator size="large" color={colors.primary} />
    </View>
  )

  return (
    <SafeAreaView style={s.container} edges={["top"]}>
      <View style={s.header}>
        <Ionicons name="clipboard" size={22} color={colors.primary} />
        <Text style={s.headerTitle}>Recipe History</Text>
        {recipes.length > 0 && <Text style={s.headerCount}>{recipes.length} tried</Text>}
        <TouchableOpacity onPress={async () => {
          const res = await apiFetch("/api/test-error", { method: "POST", screen: "Tried Recipes" })
          const data = await res.json().catch(() => ({}))
          showError(data?.error ?? `Error ${res.status}`, "Tried Recipes", async () => {
            const res2 = await apiFetch("/api/test-error", { method: "POST", screen: "Tried Recipes" })
            const data2 = await res2.json().catch(() => ({}))
            showError(data2?.error ?? `Error ${res2.status}`, "Tried Recipes")
          })
        }}>
          <Text style={{ fontSize: 11, color: colors.mutedForeground, borderWidth: 1, borderColor: colors.border, borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 }}>Test Error</Text>
        </TouchableOpacity>
      </View>

      {recipes.length === 0 ? (
        <View style={s.empty}>
          <Ionicons name="time-outline" size={56} color={colors.muted} />
          <Text style={s.emptyTitle}>No tried recipes yet</Text>
          <Text style={s.emptySubText}>Recipes you've cooked will appear here.</Text>
          <TouchableOpacity style={s.browseBtn} onPress={() => navigation.navigate("Search")}>
            <Text style={s.browseBtnText}>Discover Recipes</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={recipes}
          keyExtractor={r => r.id}
          contentContainerStyle={{ padding: spacing.md, gap: 12 }}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={s.card}
              onPress={() => navigation.navigate("RecipeDetail", { id: item.id, title: item.title })}
            >
              <View style={s.cardHeader}>
                <Text style={s.cardTitle} numberOfLines={2}>{item.title}</Text>
                <View style={s.cardActions}>
                  <TouchableOpacity style={s.rateBtn} onPress={() => openRating(item)}>
                    <Text style={s.rateBtnText}>{item.satisfaction ? "Edit Rating" : "Rate"}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => removeRecipe(item)}>
                    <Ionicons name="trash-outline" size={18} color={colors.destructive} />
                  </TouchableOpacity>
                </View>
              </View>

              <View style={s.metaRow}>
                <Ionicons name="calendar-outline" size={13} color={colors.mutedForeground} />
                <Text style={s.metaText}>Tried: {item.triedOn}</Text>
              </View>

              {item.satisfaction ? (
                <View style={s.ratings}>
                  <View style={s.ratingRow}>
                    <Text style={s.ratingLabel}>Satisfaction</Text>
                    <Stars rating={item.satisfaction} colors={colors} />
                  </View>
                  <View style={s.ratingRow}>
                    <Text style={s.ratingLabel}>Time Accuracy</Text>
                    <Stars rating={item.timeAccuracy} colors={colors} />
                  </View>
                  <View style={s.ratingRow}>
                    <Text style={s.ratingLabel}>Difficulty</Text>
                    <Text style={s.difficultyText}>{item.difficulty}</Text>
                  </View>
                </View>
              ) : (
                <Text style={s.noRating}>Not rated yet</Text>
              )}
            </TouchableOpacity>
          )}
        />
      )}

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
              <Text style={s.submitBtnText}>Submit Rating</Text>
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
  header: { flexDirection: "row", alignItems: "center", gap: 8, padding: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border },
  headerTitle: { fontSize: 20, fontWeight: "700", color: colors.text },
  headerCount: { fontSize: 13, color: colors.mutedForeground },
  empty: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, padding: spacing.xl },
  emptyTitle: { fontSize: 18, fontWeight: "600", color: colors.text },
  emptySubText: { fontSize: 14, color: colors.mutedForeground, textAlign: "center" },
  browseBtn: { backgroundColor: colors.primary, paddingHorizontal: 24, paddingVertical: 12, borderRadius: radius.md, marginTop: 8 },
  browseBtnText: { color: "#fff", fontWeight: "700" },
  card: { backgroundColor: colors.card, borderRadius: radius.lg, padding: spacing.md, borderWidth: 1.5, borderColor: colors.border },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: 8 },
  cardTitle: { fontSize: 15, fontWeight: "700", color: colors.text, flex: 1 },
  cardActions: { flexDirection: "row", alignItems: "center", gap: 10 },
  rateBtn: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm, paddingHorizontal: 10, paddingVertical: 4 },
  rateBtnText: { fontSize: 12, color: colors.text, fontWeight: "600" },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 6 },
  metaText: { fontSize: 12, color: colors.mutedForeground },
  ratings: { marginTop: spacing.sm, gap: 6 },
  ratingRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  ratingLabel: { fontSize: 13, fontWeight: "500", color: colors.text },
  difficultyText: { fontSize: 13, color: colors.text },
  noRating: { fontSize: 13, color: colors.mutedForeground, fontStyle: "italic", marginTop: spacing.sm },
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
