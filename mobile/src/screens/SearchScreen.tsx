import React, { useEffect, useState, useCallback } from "react"
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput,
  ActivityIndicator, Image, FlatList, Modal, Pressable
} from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { Ionicons } from "@expo/vector-icons"
import { useNavigation, useRoute } from "@react-navigation/native"
import { apiFetch } from "../lib/api"
import { colors, spacing, radius } from "../lib/theme"

type Recipe = {
  id: number
  title: string
  image: string
  readyInMinutes: number
  servings: number
  pricePerServing: number
  vegan: boolean
  vegetarian: boolean
  glutenFree: boolean
}

const DIETS = ["any", "vegetarian", "vegan", "glutenFree", "keto", "paleo"]
const CUISINES = ["any", "italian", "mexican", "thai", "indian", "chinese", "french", "japanese", "mediterranean", "american", "greek"]
const PREP_TIMES = ["any", "under15", "under30", "under60", "over60"]
const BUDGETS = ["any", "cheap", "moderate", "expensive"]
const HEALTHINESS = ["any", "healthy", "veryHealthy", "indulgent"]
const TASTES = ["any", "sweet", "salty", "spicy", "savory"]

const PREP_LABELS: Record<string, string> = { any: "Any time", under15: "< 15 min", under30: "< 30 min", under60: "< 1 hour", over60: "> 1 hour" }
const BUDGET_LABELS: Record<string, string> = { any: "Any budget", cheap: "Budget-friendly", moderate: "Moderate", expensive: "Premium" }
const HEALTH_LABELS: Record<string, string> = { any: "Any", healthy: "Healthy", veryHealthy: "Very Healthy", indulgent: "Indulgent" }
const TASTE_LABELS: Record<string, string> = { any: "Any taste", sweet: "Sweet", salty: "Salty", spicy: "Spicy", savory: "Savory" }

export default function SearchScreen() {
  const navigation = useNavigation<any>()
  const route = useRoute<any>()
  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [ingredientInput, setIngredientInput] = useState("")

  const defaultFilters = {
    prepTime: "any", budget: "any", diet: "any",
    taste: "any", healthiness: "any", cuisine: "any",
    ingredients: [] as string[],
  }

  const [filters, setFilters] = useState(defaultFilters)

  const fetchRecipes = useCallback(async (f = filters) => {
    setLoading(true)
    setSearched(true)
    try {
      const params = new URLSearchParams()
      if (f.prepTime !== "any") params.set("prepTime", f.prepTime)
      if (f.budget !== "any") params.set("budget", f.budget)
      if (f.diet !== "any") params.set("diet", f.diet)
      if (f.taste !== "any") params.set("taste", f.taste)
      if (f.healthiness !== "any") params.set("healthiness", f.healthiness)
      if (f.cuisine !== "any") params.set("cuisine", f.cuisine)
      if (f.ingredients.length) params.set("ingredients", f.ingredients.join(","))
      const res = await apiFetch(`/api/recipes/search?${params.toString()}`)
      const data = await res.json()
      setRecipes(data.results || [])
    } catch {
      setRecipes([])
    } finally {
      setLoading(false)
    }
  }, [filters])

  useEffect(() => {
    if (route.params?.surprise) {
      fetchRecipes({ prepTime: "any", budget: "any", diet: "any", taste: "any", healthiness: "any", cuisine: "any", ingredients: [] })
    }
  }, [route.params?.surprise])

  const hasActiveFilters =
    filters.prepTime !== "any" ||
    filters.budget !== "any" ||
    filters.diet !== "any" ||
    filters.taste !== "any" ||
    filters.healthiness !== "any" ||
    filters.cuisine !== "any" ||
    filters.ingredients.length > 0

  const addIngredient = () => {
    if (ingredientInput.trim()) {
      setFilters(f => ({ ...f, ingredients: [...f.ingredients, ingredientInput.trim()] }))
      setIngredientInput("")
    }
  }

  const removeIngredient = (ing: string) => {
    setFilters(f => ({ ...f, ingredients: f.ingredients.filter(i => i !== ing) }))
  }

  const FilterPicker = ({ label, values, labelMap, field }: { label: string; values: string[]; labelMap: Record<string, string>; field: keyof typeof filters }) => (
    <View style={styles.filterGroup}>
      <Text style={styles.filterLabel}>{label}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
        {values.map(v => (
          <TouchableOpacity
            key={v}
            style={[styles.pill, filters[field] === v && styles.pillActive]}
            onPress={() => setFilters(f => ({ ...f, [field]: v }))}
          >
            <Text style={[styles.pillText, filters[field] === v && styles.pillTextActive]}>
              {labelMap[v] ?? v.charAt(0).toUpperCase() + v.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  )

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      {/* Filter toggle */}
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.filterToggle} onPress={() => setFiltersOpen(true)}>
          <Ionicons name="options-outline" size={20} color={colors.primary} />
          <Text style={styles.filterToggleText}>Filters</Text>
          {hasActiveFilters && <View style={styles.filterDot} />}
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.applyBtn, !hasActiveFilters && styles.btnDisabled]}
          onPress={() => fetchRecipes()}
          disabled={!hasActiveFilters}
        >
          <Text style={styles.applyBtnText}>Search</Text>
        </TouchableOpacity>
      </View>

      {/* Filters modal */}
      <Modal visible={filtersOpen} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Filter Recipes</Text>
            <TouchableOpacity onPress={() => setFiltersOpen(false)}>
              <Ionicons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>
          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: spacing.md, paddingBottom: 40 }}>
            <FilterPicker label="Prep Time" values={PREP_TIMES} labelMap={PREP_LABELS} field="prepTime" />
            <FilterPicker label="Budget" values={BUDGETS} labelMap={BUDGET_LABELS} field="budget" />
            <FilterPicker label="Diet" values={DIETS} labelMap={{any:"Any diet",vegetarian:"Vegetarian",vegan:"Vegan",glutenFree:"Gluten-free",keto:"Keto",paleo:"Paleo"}} field="diet" />
            <FilterPicker label="Cuisine" values={CUISINES} labelMap={{any:"Any cuisine",italian:"Italian",mexican:"Mexican",thai:"Thai",indian:"Indian",chinese:"Chinese",french:"French",japanese:"Japanese",mediterranean:"Mediterranean",american:"American",greek:"Greek"}} field="cuisine" />
            <FilterPicker label="Healthiness" values={HEALTHINESS} labelMap={HEALTH_LABELS} field="healthiness" />
            <FilterPicker label="Taste" values={TASTES} labelMap={TASTE_LABELS} field="taste" />

            {/* Ingredients */}
            <View style={styles.filterGroup}>
              <Text style={styles.filterLabel}>Ingredients</Text>
              <View style={styles.ingredientRow}>
                <TextInput
                  style={styles.ingredientInput}
                  value={ingredientInput}
                  onChangeText={setIngredientInput}
                  placeholder="e.g. chicken, garlic..."
                  placeholderTextColor={colors.muted}
                  onSubmitEditing={addIngredient}
                  returnKeyType="done"
                />
                <TouchableOpacity
                  style={[styles.addBtn, !ingredientInput.trim() && styles.btnDisabled]}
                  onPress={addIngredient}
                  disabled={!ingredientInput.trim()}
                >
                  <Text style={styles.addBtnText}>Add</Text>
                </TouchableOpacity>
              </View>
              {filters.ingredients.length > 0 && (
                <View style={styles.tagsRow}>
                  {filters.ingredients.map(ing => (
                    <TouchableOpacity key={ing} style={styles.tag} onPress={() => removeIngredient(ing)}>
                      <Text style={styles.tagText}>{ing}</Text>
                      <Ionicons name="close" size={12} color={colors.mutedForeground} style={{ marginLeft: 4 }} />
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
          </ScrollView>

          <View style={styles.modalFooter}>
            <TouchableOpacity
              style={[styles.resetBtn, !hasActiveFilters && !searched && styles.btnDisabled]}
              onPress={() => { setFilters(defaultFilters); setSearched(false) }}
              disabled={!hasActiveFilters && !searched}
            >
              <Ionicons name="refresh" size={16} color={colors.text} style={{ marginRight: 6 }} />
              <Text style={styles.resetBtnText}>Reset</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.applyBtnLarge, !hasActiveFilters && styles.btnDisabled]}
              onPress={() => { setFiltersOpen(false); fetchRecipes() }}
              disabled={!hasActiveFilters}
            >
              <Text style={styles.applyBtnText}>Apply Filters</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Results */}
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : !searched ? (
        <View style={styles.center}>
          <Ionicons name="search" size={48} color={colors.muted} />
          <Text style={styles.emptyText}>Set filters and tap Search</Text>
        </View>
      ) : recipes.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="restaurant-outline" size={48} color={colors.muted} />
          <Text style={styles.emptyText}>No recipes found</Text>
          <Text style={styles.emptySubText}>Try adjusting your filters</Text>
        </View>
      ) : (
        <FlatList
          data={recipes}
          keyExtractor={item => String(item.id)}
          contentContainerStyle={{ padding: spacing.md, gap: 12 }}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.card} onPress={() => navigation.navigate("RecipeDetail", { id: item.id, title: item.title })}>
              <Image source={{ uri: item.image }} style={styles.cardImage} resizeMode="cover" />
              <View style={styles.cardBody}>
                <Text style={styles.cardTitle} numberOfLines={2}>{item.title}</Text>
                <View style={styles.cardMeta}>
                  {item.readyInMinutes > 0 && (
                    <View style={styles.metaChip}>
                      <Ionicons name="time-outline" size={13} color={colors.mutedForeground} />
                      <Text style={styles.metaText}>{item.readyInMinutes} min</Text>
                    </View>
                  )}
                  {item.servings > 0 && (
                    <View style={styles.metaChip}>
                      <Ionicons name="people-outline" size={13} color={colors.mutedForeground} />
                      <Text style={styles.metaText}>{item.servings} servings</Text>
                    </View>
                  )}
                  {item.vegan && <View style={styles.badge}><Text style={styles.badgeText}>Vegan</Text></View>}
                  {item.vegetarian && !item.vegan && <View style={styles.badge}><Text style={styles.badgeText}>Vegetarian</Text></View>}
                  {item.glutenFree && <View style={styles.badge}><Text style={styles.badgeText}>GF</Text></View>}
                </View>
              </View>
            </TouchableOpacity>
          )}
        />
      )}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  topBar: { flexDirection: "row", alignItems: "center", gap: 12, padding: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border },
  filterToggle: { flexDirection: "row", alignItems: "center", gap: 8, flex: 1, backgroundColor: colors.card, padding: 10, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border },
  filterToggleText: { color: colors.text, fontSize: 15, fontWeight: "500" },
  filterDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primary, marginLeft: "auto" },
  applyBtn: { backgroundColor: colors.primary, paddingHorizontal: 20, paddingVertical: 10, borderRadius: radius.md },
  applyBtnText: { color: "#fff", fontWeight: "700", fontSize: 15 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  emptyText: { fontSize: 18, fontWeight: "600", color: colors.text },
  emptySubText: { fontSize: 14, color: colors.mutedForeground },
  card: { backgroundColor: colors.card, borderRadius: radius.lg, overflow: "hidden", borderWidth: 1.5, borderColor: colors.border },
  cardImage: { width: "100%", height: 180 },
  cardBody: { padding: spacing.md },
  cardTitle: { fontSize: 16, fontWeight: "700", color: colors.text, marginBottom: 8 },
  cardMeta: { flexDirection: "row", flexWrap: "wrap", gap: 8, alignItems: "center" },
  metaChip: { flexDirection: "row", alignItems: "center", gap: 4 },
  metaText: { fontSize: 13, color: colors.mutedForeground },
  badge: { backgroundColor: colors.primary + "33", paddingHorizontal: 8, paddingVertical: 2, borderRadius: 99 },
  badgeText: { fontSize: 11, color: colors.primary, fontWeight: "600" },
  modalContainer: { flex: 1, backgroundColor: colors.background },
  modalHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border },
  modalTitle: { fontSize: 18, fontWeight: "700", color: colors.text },
  modalFooter: { flexDirection: "row", gap: 12, padding: spacing.md, borderTopWidth: 1, borderTopColor: colors.border },
  filterGroup: { marginBottom: spacing.lg },
  filterLabel: { fontSize: 13, fontWeight: "600", color: colors.mutedForeground, marginBottom: 10, textTransform: "uppercase", letterSpacing: 0.5 },
  pill: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 99, borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.card },
  pillActive: { borderColor: colors.primary, backgroundColor: colors.primary + "22" },
  pillText: { fontSize: 14, color: colors.mutedForeground },
  pillTextActive: { color: colors.primary, fontWeight: "600" },
  ingredientRow: { flexDirection: "row", gap: 8 },
  ingredientInput: { flex: 1, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: 12, paddingVertical: 10, color: colors.text, fontSize: 14 },
  addBtn: { backgroundColor: colors.primary, paddingHorizontal: 16, borderRadius: radius.md, alignItems: "center", justifyContent: "center" },
  addBtnText: { color: "#fff", fontWeight: "700" },
  tagsRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 10 },
  tag: { flexDirection: "row", alignItems: "center", backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 99 },
  tagText: { fontSize: 13, color: colors.text },
  resetBtn: { flexDirection: "row", alignItems: "center", borderWidth: 1, borderColor: colors.border, paddingHorizontal: 16, paddingVertical: 12, borderRadius: radius.md },
  resetBtnText: { color: colors.text, fontWeight: "500" },
  applyBtnLarge: { flex: 1, backgroundColor: colors.primary, paddingVertical: 12, borderRadius: radius.md, alignItems: "center" },
  btnDisabled: { opacity: 0.4 },
})
