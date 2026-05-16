import React, { useEffect, useState, useCallback } from "react"
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, Image, FlatList, Modal, Alert } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { Ionicons } from "@expo/vector-icons"
import { useNavigation, useRoute } from "@react-navigation/native"
import * as ImagePicker from "expo-image-picker"
import { apiFetch, API_BASE_URL } from "../lib/api"
import { reportError } from "../lib/reportError"
import { useTheme } from "../context/ThemeContext"
import { useGlobalError } from "../context/GlobalErrorContext"
import { spacing, radius } from "../lib/theme"

type Recipe = { id: number; title: string; image: string; readyInMinutes: number; servings: number; pricePerServing: number; vegan: boolean; vegetarian: boolean; glutenFree: boolean }

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

function buildSearchParams(f: { prepTime: string; budget: string; diet: string; taste: string; healthiness: string; cuisine: string; ingredients: string[] }): URLSearchParams {
  const params = new URLSearchParams()

  switch (f.prepTime) {
    case "under15": params.set("maxReadyTime", "15"); break
    case "under30": params.set("maxReadyTime", "30"); break
    case "under60": params.set("maxReadyTime", "60"); break
    case "over60": params.set("minReadyTime", "60"); break
  }

  const dietMap: Record<string, string> = { vegetarian: "vegetarian", vegan: "vegan", glutenFree: "gluten free", keto: "ketogenic", paleo: "paleo" }
  if (f.diet !== "any" && dietMap[f.diet]) params.set("diet", dietMap[f.diet])

  if (f.cuisine !== "any") params.set("cuisine", f.cuisine)

  switch (f.budget) {
    case "cheap": params.set("maxPricePerServing", "150"); break
    case "moderate": params.set("minPricePerServing", "150"); params.set("maxPricePerServing", "300"); break
    case "expensive": params.set("minPricePerServing", "300"); break
  }

  switch (f.healthiness) {
    case "healthy": params.set("minHealthScore", "60"); break
    case "veryHealthy": params.set("minHealthScore", "80"); break
    case "indulgent": params.set("maxHealthScore", "30"); break
  }

  switch (f.taste) {
    case "sweet": params.set("minSweetness", "60"); break
    case "salty": params.set("minSaltiness", "60"); break
    case "spicy": params.set("minSpiciness", "40"); break
    case "savory": params.set("minSavoriness", "60"); break
  }

  if (f.ingredients.length) params.set("includeIngredients", f.ingredients.join(","))

  return params
}

export default function SearchScreen() {
  const navigation = useNavigation<any>()
  const route = useRoute<any>()
  const { colors } = useTheme()
  const s = makeStyles(colors)
  const { showError } = useGlobalError()

  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [ingredientInput, setIngredientInput] = useState("")
  const defaultFilters = { prepTime: "any", budget: "any", diet: "any", taste: "any", healthiness: "any", cuisine: "any", ingredients: [] as string[] }
  const [filters, setFilters] = useState(defaultFilters)

  const fetchRecipes = useCallback(async (f = filters) => {
    setLoading(true); setSearched(true)
    try {
      const params = buildSearchParams(f)
      const res = await apiFetch(`/api/recipes/search?${params.toString()}`, { screen: "Search" })
      const data = await res.json()
      if (!res.ok) {
        const msg = `[${res.status}] ${data.error || "Server error"}`
        showError(msg, "Search", () => fetchRecipes(f))
        setRecipes([])
        return
      }
      setRecipes(data.results || [])
    } catch (e: any) {
      const msg = e?.message || "Network error — check your connection"
      showError(msg, "Search", () => fetchRecipes(f))
      setRecipes([])
    }
    finally { setLoading(false) }
  }, [filters])

  useEffect(() => {
    if (route.params?.surprise) fetchRecipes(defaultFilters)
  }, [route.params?.surprise])

  const hasActiveFilters = filters.prepTime !== "any" || filters.budget !== "any" || filters.diet !== "any" || filters.taste !== "any" || filters.healthiness !== "any" || filters.cuisine !== "any" || filters.ingredients.length > 0

  const addIngredient = () => {
    if (ingredientInput.trim()) { setFilters(f => ({ ...f, ingredients: [...f.ingredients, ingredientInput.trim()] })); setIngredientInput("") }
  }

  const [analyzingImages, setAnalyzingImages] = useState(false)
  const [cameraCount, setCameraCount] = useState(0)

  const analyzeAssets = useCallback(async (assets: ImagePicker.ImagePickerAsset[]): Promise<boolean> => {
    setFiltersOpen(false)
    setAnalyzingImages(true)
    const detected: string[] = []

    try {
      await Promise.all(
        assets.map(async (asset) => {
          if (!asset.base64) return
          const res = await fetch(`${API_BASE_URL}/api/recipes/analyze-image`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ base64: asset.base64, mimeType: asset.mimeType ?? "image/jpeg" }),
          })
          const data = await res.json()
          if (data.error) throw new Error(data.error)
          if (data.ingredient) detected.push(data.ingredient)
        })
      )
    } catch (e: any) {
      setAnalyzingImages(false)
      const msg = e?.message ?? "Network error — couldn't reach the server."
      reportError(msg, "Scan Ingredients")
      showError(msg, "Scan Ingredients")
      return false
    }

    setAnalyzingImages(false)

    if (detected.length === 0) {
      showError("Couldn't identify any ingredients in those photos. Try clearer images.", "Scan Ingredients")
      return false
    }

    setFilters(f => {
      const existing = new Set(f.ingredients.map(i => i.toLowerCase()))
      const newOnes = detected.filter(d => !existing.has(d.toLowerCase()))
      return { ...f, ingredients: [...f.ingredients, ...newOnes] }
    })
    setFiltersOpen(true)
    return true
  }, [showError])

  const openCamera = useCallback(async (currentCount: number) => {
    if (currentCount >= 5) {
      showError("You can scan up to 5 ingredient photos at a time.", "Scan Ingredients")
      return
    }
    const { status } = await ImagePicker.requestCameraPermissionsAsync()
    if (status !== "granted") {
      Alert.alert("Permission needed", "Please allow camera access to take ingredient photos.")
      return
    }
    const result = await ImagePicker.launchCameraAsync({ base64: true, quality: 0.6 })
    if (result.canceled || result.assets.length === 0) return

    const newCount = currentCount + 1
    setCameraCount(newCount)
    const success = await analyzeAssets(result.assets)

    if (!success) {
      setCameraCount(0)
      return
    }

    if (newCount < 5) {
      Alert.alert(
        `Photo ${newCount} of 5 scanned`,
        "Take another photo or stop here?",
        [
          { text: "Done", style: "cancel", onPress: () => setCameraCount(0) },
          { text: "Take another", onPress: () => openCamera(newCount) },
        ]
      )
    } else {
      setCameraCount(0)
    }
  }, [analyzeAssets, showError])

  const pickAndAnalyzeImages = useCallback(async () => {
    Alert.alert(
      "Add ingredient photos",
      "How would you like to add photos?",
      [
        {
          text: "Take photo",
          onPress: () => openCamera(cameraCount),
        },
        {
          text: "Choose from library",
          onPress: async () => {
            const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync()
            if (status !== "granted") {
              Alert.alert("Permission needed", "Please allow access to your photos to use this feature.")
              return
            }
            const result = await ImagePicker.launchImageLibraryAsync({
              mediaTypes: ImagePicker.MediaTypeOptions.Images,
              allowsMultipleSelection: true,
              selectionLimit: 5,
              base64: true,
              quality: 0.6,
            })
            if (result.canceled || result.assets.length === 0) return
            await analyzeAssets(result.assets)
          },
        },
        { text: "Cancel", style: "cancel" },
      ]
    )
  }, [cameraCount, openCamera, analyzeAssets])

  const FilterPicker = ({ label, values, labelMap, field }: { label: string; values: string[]; labelMap: Record<string, string>; field: keyof typeof filters }) => (
    <View style={s.filterGroup}>
      <Text style={s.filterLabel}>{label}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
        {values.map(v => (
          <TouchableOpacity key={v} style={[s.pill, filters[field] === v && s.pillActive]} onPress={() => setFilters(f => ({ ...f, [field]: v }))}>
            <Text style={[s.pillText, filters[field] === v && s.pillTextActive]}>{labelMap[v] ?? v.charAt(0).toUpperCase() + v.slice(1)}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  )

  const filterSummary = (() => {
    const parts: string[] = []
    if (filters.ingredients.length) parts.push(filters.ingredients.join(", "))
    if (filters.diet !== "any") parts.push({ vegetarian: "Vegetarian", vegan: "Vegan", glutenFree: "Gluten-free", keto: "Keto", paleo: "Paleo" }[filters.diet] ?? filters.diet)
    if (filters.cuisine !== "any") parts.push(filters.cuisine.charAt(0).toUpperCase() + filters.cuisine.slice(1))
    if (filters.prepTime !== "any") parts.push(PREP_LABELS[filters.prepTime])
    if (filters.budget !== "any") parts.push(BUDGET_LABELS[filters.budget])
    if (filters.healthiness !== "any") parts.push(HEALTH_LABELS[filters.healthiness])
    if (filters.taste !== "any") parts.push(TASTE_LABELS[filters.taste])
    return parts.join(" · ") || "All recipes"
  })()

  return (
    <>
    <SafeAreaView style={s.container} edges={["top"]}>
      <View style={s.topBar}>
        {searched ? (
          <TouchableOpacity style={s.refinePill} onPress={() => setFiltersOpen(true)}>
            <Ionicons name="options-outline" size={16} color={colors.mutedForeground} />
            <Text style={s.refineSummary} numberOfLines={1}>{filterSummary}</Text>
            <Text style={s.refineBtn}>Refine</Text>
          </TouchableOpacity>
        ) : (
          <>
            <TouchableOpacity style={s.filterToggle} onPress={() => setFiltersOpen(true)}>
              <Ionicons name="options-outline" size={20} color={colors.primary} />
              <Text style={s.filterToggleText}>Filters</Text>
              {hasActiveFilters && <View style={s.filterDot} />}
            </TouchableOpacity>
            <TouchableOpacity style={[s.applyBtn, !hasActiveFilters && s.btnDisabled]} onPress={() => fetchRecipes()} disabled={!hasActiveFilters}>
              <Text style={s.applyBtnText}>Search</Text>
            </TouchableOpacity>
          </>
        )}
      </View>

      <Modal visible={filtersOpen} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={s.modalContainer} edges={["top"]}>
          <View style={s.modalHeader}>
            <Text style={s.modalTitle}>Filter Recipes</Text>
            <TouchableOpacity onPress={() => setFiltersOpen(false)}><Ionicons name="close" size={24} color={colors.text} /></TouchableOpacity>
          </View>
          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: spacing.md, paddingBottom: 40 }}>
            <FilterPicker label="Prep Time" values={PREP_TIMES} labelMap={PREP_LABELS} field="prepTime" />
            <FilterPicker label="Budget" values={BUDGETS} labelMap={BUDGET_LABELS} field="budget" />
            <FilterPicker label="Diet" values={DIETS} labelMap={{ any: "Any diet", vegetarian: "Vegetarian", vegan: "Vegan", glutenFree: "Gluten-free", keto: "Keto", paleo: "Paleo" }} field="diet" />
            <FilterPicker label="Cuisine" values={CUISINES} labelMap={{ any: "Any cuisine", italian: "Italian", mexican: "Mexican", thai: "Thai", indian: "Indian", chinese: "Chinese", french: "French", japanese: "Japanese", mediterranean: "Mediterranean", american: "American", greek: "Greek" }} field="cuisine" />
            <FilterPicker label="Healthiness" values={HEALTHINESS} labelMap={HEALTH_LABELS} field="healthiness" />
            <FilterPicker label="Taste" values={TASTES} labelMap={TASTE_LABELS} field="taste" />
            <View style={s.filterGroup}>
              <Text style={s.filterLabel}>Ingredients</Text>
              <View style={s.ingredientRow}>
                <TextInput style={s.ingredientInput} value={ingredientInput} onChangeText={setIngredientInput} placeholder="e.g. chicken, garlic..." placeholderTextColor={colors.muted} onSubmitEditing={addIngredient} returnKeyType="done" />
                <TouchableOpacity style={[s.addBtn, !ingredientInput.trim() && s.btnDisabled]} onPress={addIngredient} disabled={!ingredientInput.trim()}>
                  <Text style={s.addBtnText}>Add</Text>
                </TouchableOpacity>
                <TouchableOpacity style={s.cameraBtn} onPress={pickAndAnalyzeImages} disabled={analyzingImages}>
                  {analyzingImages
                    ? <ActivityIndicator size="small" color="#fff" />
                    : <Ionicons name="camera" size={20} color="#fff" />}
                </TouchableOpacity>
              </View>
              {filters.ingredients.length > 0 && (
                <View style={s.tagsRow}>
                  {filters.ingredients.map(ing => (
                    <TouchableOpacity key={ing} style={s.tag} onPress={() => setFilters(f => ({ ...f, ingredients: f.ingredients.filter(i => i !== ing) }))}>
                      <Text style={s.tagText}>{ing}</Text>
                      <Ionicons name="close" size={12} color={colors.mutedForeground} style={{ marginLeft: 4 }} />
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
          </ScrollView>
          <View style={s.modalFooter}>
            <TouchableOpacity style={[s.resetBtn, !hasActiveFilters && !searched && s.btnDisabled]} onPress={() => { setFilters(defaultFilters); setSearched(false) }} disabled={!hasActiveFilters && !searched}>
              <Ionicons name="refresh" size={16} color={colors.text} style={{ marginRight: 6 }} />
              <Text style={s.resetBtnText}>Reset</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[s.applyBtnLarge, !hasActiveFilters && s.btnDisabled]} onPress={() => { setFiltersOpen(false); fetchRecipes() }} disabled={!hasActiveFilters}>
              <Text style={s.applyBtnText}>Apply Filters</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>

      {loading ? (
        <View style={s.center}><ActivityIndicator size="large" color={colors.primary} /></View>
      ) : !searched ? (
        <View style={s.center}><Ionicons name="search" size={48} color={colors.muted} /><Text style={s.emptyText}>Set filters and tap Search</Text></View>
      ) : recipes.length === 0 ? (
        <View style={s.center}><Ionicons name="restaurant-outline" size={48} color={colors.muted} /><Text style={s.emptyText}>No recipes found</Text><Text style={s.emptySubText}>Try adjusting your filters</Text></View>
      ) : (
        <FlatList
          data={recipes}
          keyExtractor={item => String(item.id)}
          contentContainerStyle={{ padding: spacing.md, gap: 12 }}
          renderItem={({ item }) => (
            <TouchableOpacity style={s.card} onPress={() => navigation.navigate("RecipeDetail", { id: item.id, title: item.title })}>
              <Image source={{ uri: item.image }} style={s.cardImage} resizeMode="cover" />
              <View style={s.cardBody}>
                <Text style={s.cardTitle} numberOfLines={2}>{item.title}</Text>
                <View style={s.cardMeta}>
                  {item.readyInMinutes > 0 && <View style={s.metaChip}><Ionicons name="time-outline" size={13} color={colors.mutedForeground} /><Text style={s.metaText}>{item.readyInMinutes} min</Text></View>}
                  {item.servings > 0 && <View style={s.metaChip}><Ionicons name="people-outline" size={13} color={colors.mutedForeground} /><Text style={s.metaText}>{item.servings} servings</Text></View>}
                  {item.vegan && <View style={s.badge}><Text style={s.badgeText}>Vegan</Text></View>}
                  {item.vegetarian && !item.vegan && <View style={s.badge}><Text style={s.badgeText}>Vegetarian</Text></View>}
                  {item.glutenFree && <View style={s.badge}><Text style={s.badgeText}>GF</Text></View>}
                </View>
              </View>
            </TouchableOpacity>
          )}
        />
      )}

    </SafeAreaView>
    {analyzingImages && (
      <View style={s.aiOverlay}>
        <Text style={s.aiEmoji}>🤖</Text>
        <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 16 }} />
        <Text style={s.aiText}>AI reading pictures…</Text>
      </View>
    )}
    </>
  )
}

const makeStyles = (colors: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  aiOverlay: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: colors.background, alignItems: "center", justifyContent: "center", zIndex: 9999, elevation: 9999 },
  aiEmoji: { fontSize: 72 },
  aiText: { marginTop: 20, fontSize: 18, fontWeight: "700", color: colors.text },
  topBar: { flexDirection: "row", alignItems: "center", gap: 12, padding: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border },
  refinePill: { flex: 1, flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: colors.card, paddingHorizontal: 12, paddingVertical: 10, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border },
  refineSummary: { flex: 1, color: colors.text, fontSize: 14, fontWeight: "500" },
  refineBtn: { color: colors.primary, fontSize: 14, fontWeight: "700" },
  filterToggle: { flexDirection: "row", alignItems: "center", gap: 8, flex: 1, backgroundColor: colors.card, padding: 10, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border },
  filterToggleText: { color: colors.text, fontSize: 15, fontWeight: "500" },
  filterDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primary, marginLeft: "auto" },
  applyBtn: { backgroundColor: colors.primary, paddingHorizontal: 20, paddingVertical: 10, borderRadius: radius.md },
  applyBtnText: { color: "#fff", fontWeight: "700", fontSize: 15 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, padding: spacing.xl },
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
  cameraBtn: { backgroundColor: colors.primary, width: 44, borderRadius: radius.md, alignItems: "center", justifyContent: "center" },
  tagsRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 10 },
  tag: { flexDirection: "row", alignItems: "center", backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 99 },
  tagText: { fontSize: 13, color: colors.text },
  resetBtn: { flexDirection: "row", alignItems: "center", borderWidth: 1, borderColor: colors.border, paddingHorizontal: 16, paddingVertical: 12, borderRadius: radius.md },
  resetBtnText: { color: colors.text, fontWeight: "500" },
  applyBtnLarge: { flex: 1, backgroundColor: colors.primary, paddingVertical: 12, borderRadius: radius.md, alignItems: "center" },
  btnDisabled: { opacity: 0.4 },
})
