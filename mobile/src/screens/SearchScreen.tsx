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
import { useSubscription } from "../context/SubscriptionContext"
import { useAuth } from "../context/AuthContext"
import PaywallModal from "../components/PaywallModal"
import { spacing, radius } from "../lib/theme"

let SpeechRecognitionModule: any = null
try {
  const mod = require("expo-speech-recognition")
  SpeechRecognitionModule = mod.ExpoSpeechRecognitionModule
} catch { /* not available in Expo Go */ }

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

const SORT_OPTIONS = [
  { value: "popularity", label: "Popularity" },
  { value: "healthiness", label: "Healthiness" },
  { value: "time", label: "Prep time" },
  { value: "calories", label: "Calories" },
  { value: "protein", label: "Protein" },
  { value: "carbohydrates", label: "Carbs" },
  { value: "fat", label: "Fat" },
  { value: "price", label: "Price" },
]

// min/max nutrition inputs — passed directly as Spoonacular params
type NutritionFilters = {
  minCalories: string; maxCalories: string
  minProtein: string; maxProtein: string
  minCarbs: string; maxCarbs: string
  minFat: string; maxFat: string
  minSaturatedFat: string; maxSaturatedFat: string
  minFiber: string; maxFiber: string
  minSugar: string; maxSugar: string
  minCholesterol: string; maxCholesterol: string
  minSodium: string; maxSodium: string
  minIron: string; maxIron: string
  minCalcium: string; maxCalcium: string
  minZinc: string; maxZinc: string
  minMagnesium: string; maxMagnesium: string
  minPotassium: string; maxPotassium: string
  minVitaminA: string; maxVitaminA: string
  minVitaminC: string; maxVitaminC: string
  minVitaminD: string; maxVitaminD: string
  minVitaminB12: string; maxVitaminB12: string
  minVitaminB6: string; maxVitaminB6: string
  minAlcohol: string; maxAlcohol: string
  minCaffeine: string; maxCaffeine: string
}

const defaultNutrition: NutritionFilters = {
  minCalories: "", maxCalories: "", minProtein: "", maxProtein: "",
  minCarbs: "", maxCarbs: "", minFat: "", maxFat: "",
  minSaturatedFat: "", maxSaturatedFat: "", minFiber: "", maxFiber: "",
  minSugar: "", maxSugar: "", minCholesterol: "", maxCholesterol: "",
  minSodium: "", maxSodium: "", minIron: "", maxIron: "",
  minCalcium: "", maxCalcium: "", minZinc: "", maxZinc: "",
  minMagnesium: "", maxMagnesium: "", minPotassium: "", maxPotassium: "",
  minVitaminA: "", maxVitaminA: "", minVitaminC: "", maxVitaminC: "",
  minVitaminD: "", maxVitaminD: "", minVitaminB12: "", maxVitaminB12: "",
  minVitaminB6: "", maxVitaminB6: "", minAlcohol: "", maxAlcohol: "",
  minCaffeine: "", maxCaffeine: "",
}

function buildSearchParams(
  f: { prepTime: string; budget: string; diet: string; taste: string; healthiness: string; cuisine: string; ingredients: string[] },
  nutrition: NutritionFilters,
  sort: string,
  sortDirection: string,
): URLSearchParams {
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

  // nutrition — only set if user entered a value
  Object.entries(nutrition).forEach(([key, val]) => {
    if (val.trim() !== "") params.set(key, val.trim())
  })

  if (sort !== "none") {
    params.set("sort", sort)
    params.set("sortDirection", sortDirection)
  }

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
  const [loadingMore, setLoadingMore] = useState(false)
  const [searched, setSearched] = useState(false)
  const [nextOffset, setNextOffset] = useState<number | null>(null)
  const [totalResults, setTotalResults] = useState(0)
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [ingredientInput, setIngredientInput] = useState("")
  const { isPremium } = useSubscription()
  const { user } = useAuth()
  const [showPaywall, setShowPaywall] = useState(false)

  const defaultFilters = { prepTime: "any", budget: "any", diet: "any", taste: "any", healthiness: "any", cuisine: "any", ingredients: [] as string[] }
  const [filters, setFilters] = useState(defaultFilters)
  const [nutrition, setNutrition] = useState<NutritionFilters>(defaultNutrition)
  const [sort, setSort] = useState("none")
  const [sortDirection, setSortDirection] = useState("desc")
  const [ingredientMode, setIngredientMode] = useState<"all" | "some">("all")
  const [fromScan, setFromScan] = useState(false)
  const [lastSearchKey, setLastSearchKey] = useState<string | null>(null)

  // collapsible sections
  const [openSection, setOpenSection] = useState<string | null>(null)
  const [openPicker, setOpenPicker] = useState<string | null>(null)

  // AI suggestions
  const [aiGoal, setAiGoal] = useState("")
  const [aiLoading, setAiLoading] = useState(false)
  const [aiError, setAiError] = useState("")
  const [aiApplied, setAiApplied] = useState("")
  const [isListening, setIsListening] = useState(false)

  useEffect(() => {
    if (route.params?.scannedIngredients?.length) {
      const mode: "all" | "some" = route.params.searchMode === "some" ? "some" : "all"
      setIngredientMode(mode)
      setFromScan(true)
      const newFilters = { ...defaultFilters, ingredients: route.params.scannedIngredients }
      setFilters(newFilters)
      if (route.params?.openFilters) {
        setFiltersOpen(true)
      } else {
        fetchRecipesWithMode(newFilters, mode)
      }
    }
  }, [route.params?.scannedIngredients])

  const fetchRecipesWithMode = useCallback(async (f: typeof filters, mode: "all" | "some") => {
    setLoading(true); setSearched(true); setNextOffset(null)
    try {
      const { results, nextOffset: next, totalResults: total } = await searchWithFallback(f, mode, 0)
      setRecipes(results)
      setNextOffset(next)
      setTotalResults(total)
    } catch (e: any) {
      showError(e?.message || "Network error — check your connection", "Search", () => fetchRecipesWithMode(f, mode))
      setRecipes([])
    } finally { setLoading(false) }
  }, [])

  const loadMore = useCallback(async () => {
    if (!nextOffset || loadingMore) return
    setLoadingMore(true)
    try {
      const { results, nextOffset: next, totalResults: total } = await searchWithFallback(filters, ingredientMode, nextOffset)
      setRecipes(prev => [...prev, ...results])
      setNextOffset(next)
      setTotalResults(total)
    } catch {}
    finally { setLoadingMore(false) }
  }, [nextOffset, loadingMore, filters, ingredientMode])

  const searchWithFallback = async (f: typeof filters, mode: "all" | "some", offset: number): Promise<{ results: any[]; nextOffset: number | null; totalResults: number }> => {
    const ingredients = f.ingredients

    const doFetch = async (extraParams: Record<string, string>, off: number) => {
      const params = buildSearchParams({ ...f, ingredients: [] }, nutrition, sort, sortDirection)
      params.set("offset", String(off))
      Object.entries(extraParams).forEach(([k, v]) => params.set(k, v))
      const res = await apiFetch(`/api/recipes/search?${params.toString()}`, { screen: "Search" })
      if (!res.ok) { showError(`[${res.status}] Server error`, "Search", () => {}); return null }
      return res.json()
    }

    if (ingredients.length === 0) {
      const data = await doFetch({}, offset)
      if (!data) return { results: [], nextOffset: null, totalResults: 0 }
      return { results: data.results || [], nextOffset: data.nextOffset ?? null, totalResults: data.totalResults ?? 0 }
    }

    const lastWord = (ing: string) => ing.trim().split(/\s+/).at(-1)!
    const attempts: Record<string, string>[] = [
      { includeIngredients: ingredients.join(","), ...(mode === "some" ? { sort: "max-used-ingredients", ignorePantry: "false" } : {}) },
      { query: ingredients.join(" "), sort: "max-used-ingredients", ignorePantry: "false" },
    ]
    const stripped = ingredients.map(lastWord)
    if (stripped.join(" ") !== ingredients.join(" ")) {
      attempts.push({ query: stripped.join(" "), sort: "max-used-ingredients", ignorePantry: "false" })
    }

    for (const extra of attempts) {
      const data = await doFetch(extra, offset)
      if (data && (data.results || []).length > 0) {
        return { results: data.results, nextOffset: data.nextOffset ?? null, totalResults: data.totalResults ?? 0 }
      }
    }

    return { results: [], nextOffset: null, totalResults: 0 }
  }

  const fetchRecipes = useCallback((f = filters) => {
    fetchRecipesWithMode(f, ingredientMode)
  }, [filters, ingredientMode, fetchRecipesWithMode])

  useEffect(() => {
    if (route.params?.surprise) fetchRecipes(defaultFilters)
  }, [route.params?.surprise])

  const hasNutritionFilters = Object.values(nutrition).some(v => v.trim() !== "")
  const hasActiveFilters = filters.prepTime !== "any" || filters.budget !== "any" || filters.diet !== "any" || filters.taste !== "any" || filters.healthiness !== "any" || filters.cuisine !== "any" || filters.ingredients.length > 0 || hasNutritionFilters || sort !== "none"

  const addIngredient = () => {
    if (ingredientInput.trim()) { setFilters(f => ({ ...f, ingredients: [...f.ingredients, ingredientInput.trim()] })); setIngredientInput("") }
  }

  const startSearch = (f = filters) => {
    setFiltersOpen(false)
    const key = JSON.stringify({ f, nutrition, sort, sortDirection, ingredientMode })
    if (key === lastSearchKey) return
    setLastSearchKey(key)
    fetchRecipesWithMode(f, ingredientMode)
  }

  const [analyzingImages, setAnalyzingImages] = useState(false)
  const [scannerOpen, setScannerOpen] = useState(false)
  const [capturedAssets, setCapturedAssets] = useState<ImagePicker.ImagePickerAsset[]>([])

  const openCameraForScan = useCallback(async () => {
    if (capturedAssets.length >= 10) return
    const { status } = await ImagePicker.requestCameraPermissionsAsync()
    if (status !== "granted") { Alert.alert("Permission needed", "Please allow camera access."); return }
    const result = await ImagePicker.launchCameraAsync({ base64: true, quality: 0.6 })
    if (!result.canceled && result.assets.length > 0) setCapturedAssets(prev => [...prev, ...result.assets])
  }, [capturedAssets.length])

  const openLibraryForScan = useCallback(async () => {
    const remaining = 10 - capturedAssets.length
    if (remaining <= 0) return
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (status !== "granted") { Alert.alert("Permission needed", "Please allow photo library access."); return }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsMultipleSelection: true, selectionLimit: remaining, base64: true, quality: 0.6 })
    if (!result.canceled && result.assets.length > 0) setCapturedAssets(prev => [...prev, ...result.assets])
  }, [capturedAssets.length])

  const analyzeAssets = useCallback(async () => {
    if (capturedAssets.length === 0) return
    setScannerOpen(false); setAnalyzingImages(true); setFiltersOpen(false)
    const detected: string[] = []
    try {
      await Promise.all(capturedAssets.map(async (asset) => {
        if (!asset.base64) return
        const res = await fetch(`${API_BASE_URL}/api/recipes/analyze-image`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ base64: asset.base64, mimeType: asset.mimeType ?? "image/jpeg", userId: user?.id, isPremium }) })
        const data = await res.json()
        if (!res.ok) {
          if (data.code === "SCAN_LIMIT") throw new Error(`You've used all ${data.limit} free scans this week. Upgrade to Premium for unlimited scans.`)
          throw new Error(data.error ?? `Error ${res.status}`)
        }
        if (data.all?.length) detected.push(...data.all)
        else if (data.ingredient) detected.push(data.ingredient)
      }))
    } catch (e: any) {
      setAnalyzingImages(false)
      const msg = e?.message ?? "Network error — couldn't reach the server."
      if (!msg.includes("No ingredients detected")) reportError(msg, "Scan Ingredients")
      showError(msg, "Scan Ingredients")
      setCapturedAssets([])
      return
    }
    setAnalyzingImages(false); setCapturedAssets([])
    if (detected.length === 0) { showError("Couldn't identify any ingredients. Try closer photos of individual ingredients.", "Scan Ingredients"); return }
    setFilters(f => {
      const existing = new Set(f.ingredients.map(i => i.toLowerCase()))
      const newOnes = detected.filter(d => !existing.has(d.toLowerCase()))
      return { ...f, ingredients: [...f.ingredients, ...newOnes] }
    })
    setFiltersOpen(true)
  }, [capturedAssets, showError])

  const pickAndAnalyzeImages = useCallback(() => { setCapturedAssets([]); setScannerOpen(true) }, [])

  const applyAiSuggestion = async (goal: string) => {
    if (!isPremium) { setShowPaywall(true); return }
    if (!goal.trim()) return
    setAiLoading(true); setAiError("")
    try {
      const res = await apiFetch("/api/recipes/suggest-filters", { method: "POST", body: JSON.stringify({ goal }) })
      const data = await res.json()
      if (!res.ok) { setAiError(data.error || "AI request failed"); return }
      const p = data.params as Record<string, any>
      // apply nutrition params
      const nutritionKeys = Object.keys(defaultNutrition) as (keyof NutritionFilters)[]
      const newNutrition = { ...defaultNutrition }
      nutritionKeys.forEach(k => { if (p[k] !== undefined) newNutrition[k] = String(p[k]) })
      setNutrition(newNutrition)
      // apply recipe filters
      if (p.diet) setFilters(f => ({ ...f, diet: Object.entries({ vegetarian: "vegetarian", vegan: "vegan", "gluten free": "glutenFree", ketogenic: "keto", paleo: "paleo" }).find(([k]) => p.diet.includes(k))?.[1] ?? f.diet }))
      if (p.maxReadyTime) setFilters(f => { const v = p.maxReadyTime <= 15 ? "under15" : p.maxReadyTime <= 30 ? "under30" : p.maxReadyTime <= 60 ? "under60" : "over60"; return { ...f, prepTime: v } })
      // apply sort
      if (p.sort) { setSort(p.sort); setSortDirection(p.sortDirection ?? "desc") }
      setAiApplied(goal)
      setAiGoal("")
    } catch { setAiError("Something went wrong. Please try again.") }
    finally { setAiLoading(false) }
  }

  const startVoiceInput = useCallback(async () => {
    if (!SpeechRecognitionModule) return
    try {
      setIsListening(true)
      setAiGoal("")
      await SpeechRecognitionModule.start({ lang: "en-US", interimResults: true })
      const cleanup = () => { setIsListening(false) }
      SpeechRecognitionModule.addListener("result", (e: any) => {
        const transcript = e.results?.[0]?.transcript ?? ""
        setAiGoal(transcript.trim().split(/\s+/).slice(0, 30).join(" "))
      })
      SpeechRecognitionModule.addListener("end", cleanup)
      SpeechRecognitionModule.addListener("error", cleanup)
    } catch { setIsListening(false) }
  }, [])

  const stopVoiceInput = useCallback(() => {
    SpeechRecognitionModule?.stop()
    setIsListening(false)
  }, [])

  const FilterPicker = ({ label, values, labelMap, field }: { label: string; values: string[]; labelMap: Record<string, string>; field: keyof typeof filters }) => {
    const current = (filters as any)[field] as string
    const isOpen = openPicker === field
    const isActive = current !== "any"
    return (
      <View>
        <TouchableOpacity style={[s.filterSelectRow, isOpen && s.filterSelectRowOpen]} onPress={() => setOpenPicker(isOpen ? null : field)} activeOpacity={0.7}>
          <Text style={s.filterSelectLabel}>{label}</Text>
          <View style={s.filterSelectRight}>
            <Text style={[s.filterSelectValue, isActive && { color: colors.primary, fontWeight: "700" }]}>{labelMap[current] ?? current}</Text>
            <Ionicons name={isOpen ? "chevron-up" : "chevron-down"} size={16} color={isActive ? colors.primary : colors.muted} />
          </View>
        </TouchableOpacity>
        {isOpen && (
          <View style={s.filterDropdown}>
            {values.map(v => (
              <TouchableOpacity key={v} style={[s.filterDropdownItem, current === v && s.filterDropdownItemActive]} onPress={() => { setFilters(f => ({ ...f, [field]: v })); setOpenPicker(null) }}>
                <Text style={[s.filterDropdownText, current === v && s.filterDropdownTextActive]}>{labelMap[v] ?? v}</Text>
                {current === v && <Ionicons name="checkmark" size={16} color={colors.primary} />}
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>
    )
  }

  const NutritionInput = ({ label, minKey, maxKey, unit, premium }: { label: string; minKey: keyof NutritionFilters; maxKey: keyof NutritionFilters; unit: string; premium?: boolean }) => (
    <View style={s.nutritionRow}>
      <View style={s.nutritionLabelRow}>
        <Text style={s.nutritionLabel}>{label}</Text>
      </View>
      <View style={s.nutritionInputs}>
        <View style={s.nutritionField}>
          <Text style={s.nutritionFieldLabel}>Min</Text>
          <TextInput
            style={s.nutritionInput}
            value={nutrition[minKey]}
            onChangeText={v => {
              if (premium && !isPremium) { setShowPaywall(true); return }
              setNutrition(n => ({ ...n, [minKey]: v.replace(/[^0-9]/g, "") }))
            }}
            placeholder="—"
            placeholderTextColor={colors.muted}
            keyboardType="numeric"
          />
          <Text style={s.nutritionUnit}>{unit}</Text>
        </View>
        <View style={s.nutritionField}>
          <Text style={s.nutritionFieldLabel}>Max</Text>
          <TextInput
            style={s.nutritionInput}
            value={nutrition[maxKey]}
            onChangeText={v => {
              if (premium && !isPremium) { setShowPaywall(true); return }
              setNutrition(n => ({ ...n, [maxKey]: v.replace(/[^0-9]/g, "") }))
            }}
            placeholder="—"
            placeholderTextColor={colors.muted}
            keyboardType="numeric"
          />
          <Text style={s.nutritionUnit}>{unit}</Text>
        </View>
      </View>
    </View>
  )

  const sectionCounts = {
    recipe: [filters.prepTime, filters.budget, filters.diet, filters.cuisine, filters.healthiness, filters.taste].filter(v => v !== "any").length,
    ingredients: filters.ingredients.length,
    macros: (["minCalories","maxCalories","minProtein","maxProtein","minCarbs","maxCarbs","minFat","maxFat","minSaturatedFat","maxSaturatedFat","minFiber","maxFiber","minSugar","maxSugar","minCholesterol","maxCholesterol","minSodium","maxSodium","minAlcohol","maxAlcohol","minCaffeine","maxCaffeine"] as (keyof NutritionFilters)[]).filter(k => nutrition[k].trim() !== "").length,
    micros: (["minVitaminA","maxVitaminA","minVitaminC","maxVitaminC","minVitaminD","maxVitaminD","minVitaminB6","maxVitaminB6","minVitaminB12","maxVitaminB12","minCalcium","maxCalcium","minIron","maxIron","minMagnesium","maxMagnesium","minPotassium","maxPotassium","minZinc","maxZinc"] as (keyof NutritionFilters)[]).filter(k => nutrition[k].trim() !== "").length,
    sort: sort !== "none" ? 1 : 0,
    ai: aiApplied ? 1 : 0,
  }

  const SectionHeader = ({ title, sectionKey, badge }: { title: string; sectionKey: string; badge?: string }) => {
    const count = sectionCounts[sectionKey as keyof typeof sectionCounts] ?? 0
    return (
      <TouchableOpacity style={s.sectionHeader} onPress={() => { setOpenSection(openSection === sectionKey ? null : sectionKey); setOpenPicker(null) }} activeOpacity={0.7}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <Text style={s.sectionTitle}>{title}</Text>
          {count > 0 && <View style={s.sectionCountBadge}><Text style={s.sectionCountText}>{count}</Text></View>}
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          {badge && <View style={s.premiumBadge}><Text style={s.premiumBadgeText}>{badge}</Text></View>}
          <Ionicons name={openSection === sectionKey ? "chevron-up" : "chevron-down"} size={18} color={colors.mutedForeground} />
        </View>
      </TouchableOpacity>
    )
  }

  const filterSummary = (() => {
    const parts: string[] = []
    if (filters.ingredients.length) parts.push(filters.ingredients.join(", "))
    if (filters.diet !== "any") parts.push({ vegetarian: "Vegetarian", vegan: "Vegan", glutenFree: "Gluten-free", keto: "Keto", paleo: "Paleo" }[filters.diet] ?? filters.diet)
    if (filters.cuisine !== "any") parts.push(filters.cuisine.charAt(0).toUpperCase() + filters.cuisine.slice(1))
    if (filters.prepTime !== "any") parts.push(PREP_LABELS[filters.prepTime])
    if (hasNutritionFilters) parts.push("Nutrition filters")
    if (sort !== "none") parts.push(`Sort: ${SORT_OPTIONS.find(o => o.value === sort)?.label}`)
    return parts.join(" · ") || "All recipes"
  })()

  return (
    <>
    <SafeAreaView style={s.container} edges={["top"]}>
      <View style={s.header}>
        <View style={s.headerLeft}>
          <Ionicons name="search-outline" size={22} color={colors.primary} />
          <Text style={s.headerTitle}>Find Recipes</Text>
        </View>
      </View>
      <View style={s.topBar}>
        <TouchableOpacity style={s.filterToggle} onPress={() => setFiltersOpen(true)}>
          <Ionicons name="options-outline" size={20} color={hasActiveFilters ? colors.primary : colors.mutedForeground} />
          <Text style={s.filterToggleText} numberOfLines={1}>{searched && hasActiveFilters ? filterSummary : "Filters"}</Text>
          {hasActiveFilters && <View style={s.filterDot} />}
          {searched && <Text style={s.refineLabel}>Refine</Text>}
        </TouchableOpacity>
      </View>

      <Modal visible={filtersOpen} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={s.modalContainer} edges={["top"]}>
          <View style={s.modalHeader}>
            <TouchableOpacity onPress={() => setFiltersOpen(false)}><Ionicons name="arrow-back" size={24} color={colors.text} /></TouchableOpacity>
            <Text style={s.modalTitle}>Filter Recipes</Text>
            <View style={{ width: 24 }} />
          </View>
          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 40, paddingTop: 12 }} keyboardShouldPersistTaps="handled">

            {/* ── RECIPE ── */}
            <SectionHeader title="Recipe" sectionKey="recipe" />
            {openSection === "recipe" && (
              <View style={s.sectionBody}>
                <FilterPicker label="Prep Time" values={PREP_TIMES} labelMap={PREP_LABELS} field="prepTime" />
                <FilterPicker label="Budget" values={BUDGETS} labelMap={BUDGET_LABELS} field="budget" />
                <FilterPicker label="Diet" values={DIETS} labelMap={{ any: "Any diet", vegetarian: "Vegetarian", vegan: "Vegan", glutenFree: "Gluten-free", keto: "Keto", paleo: "Paleo" }} field="diet" />
                <FilterPicker label="Cuisine" values={CUISINES} labelMap={{ any: "Any cuisine", italian: "Italian", mexican: "Mexican", thai: "Thai", indian: "Indian", chinese: "Chinese", french: "French", japanese: "Japanese", mediterranean: "Mediterranean", american: "American", greek: "Greek" }} field="cuisine" />
                <FilterPicker label="Healthiness" values={HEALTHINESS} labelMap={HEALTH_LABELS} field="healthiness" />
                <FilterPicker label="Taste" values={TASTES} labelMap={TASTE_LABELS} field="taste" />
              </View>
            )}

            {/* ── INGREDIENTS ── */}
            <SectionHeader title="Ingredients" sectionKey="ingredients" />
            {openSection === "ingredients" && (
              <View style={s.sectionBody}>
                <View style={[s.filterRow, { marginTop: 8 }]}>
                  <View style={s.ingredientRow}>
                    <TextInput style={s.ingredientInput} value={ingredientInput} onChangeText={setIngredientInput} placeholder="e.g. chicken, garlic..." placeholderTextColor={colors.muted} onSubmitEditing={addIngredient} returnKeyType="done" />
                    <TouchableOpacity style={[s.addBtn, !ingredientInput.trim() && s.btnDisabled]} onPress={addIngredient} disabled={!ingredientInput.trim()}>
                      <Text style={s.addBtnText}>Add</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={s.cameraBtn} onPress={pickAndAnalyzeImages} disabled={analyzingImages}>
                      {analyzingImages ? <ActivityIndicator size="small" color="#fff" /> : <Ionicons name="camera" size={20} color="#fff" />}
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
                  {filters.ingredients.length > 1 && (
                    <View style={s.modeToggleRow}>
                      <TouchableOpacity style={[s.modeToggleBtn, ingredientMode === "all" && s.modeToggleBtnActive]} onPress={() => setIngredientMode("all")}>
                        <Text style={[s.modeToggleText, ingredientMode === "all" && s.modeToggleTextActive]}>Match all</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={[s.modeToggleBtn, ingredientMode === "some" && s.modeToggleBtnActive]} onPress={() => setIngredientMode("some")}>
                        <Text style={[s.modeToggleText, ingredientMode === "some" && s.modeToggleTextActive]}>Match some</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              </View>
            )}

            {/* ── MACROS ── */}
            <SectionHeader title="Macronutrients" sectionKey="macros" badge="Premium" />
            {openSection === "macros" && (
              <View style={[s.sectionBody, { paddingTop: 12 }]}>
                <NutritionInput label="Calories" minKey="minCalories" maxKey="maxCalories" unit="kcal" />
                <NutritionInput label="Protein" minKey="minProtein" maxKey="maxProtein" unit="g" />
                <NutritionInput label="Carbohydrates" minKey="minCarbs" maxKey="maxCarbs" unit="g" />
                <NutritionInput label="Fat" minKey="minFat" maxKey="maxFat" unit="g" />
                <NutritionInput label="Saturated Fat" minKey="minSaturatedFat" maxKey="maxSaturatedFat" unit="g" />
                <NutritionInput label="Fiber" minKey="minFiber" maxKey="maxFiber" unit="g" />
                <NutritionInput label="Sugar" minKey="minSugar" maxKey="maxSugar" unit="g" />
                <NutritionInput label="Cholesterol" minKey="minCholesterol" maxKey="maxCholesterol" unit="mg" />
                <NutritionInput label="Sodium" minKey="minSodium" maxKey="maxSodium" unit="mg" />
                <NutritionInput label="Alcohol" minKey="minAlcohol" maxKey="maxAlcohol" unit="g" />
                <NutritionInput label="Caffeine" minKey="minCaffeine" maxKey="maxCaffeine" unit="mg" />
              </View>
            )}

            {/* ── MICRONUTRIENTS ── */}
            <SectionHeader title="Micronutrients" sectionKey="micros" badge="Premium" />
            {openSection === "micros" && (
              <View style={[s.sectionBody, { paddingTop: 12 }]}>
                <Text style={s.microSubtitle}>Vitamins</Text>
                <NutritionInput label="Vitamin A" minKey="minVitaminA" maxKey="maxVitaminA" unit="IU" />
                <NutritionInput label="Vitamin C" minKey="minVitaminC" maxKey="maxVitaminC" unit="mg" />
                <NutritionInput label="Vitamin D" minKey="minVitaminD" maxKey="maxVitaminD" unit="µg" />
                <NutritionInput label="Vitamin B6" minKey="minVitaminB6" maxKey="maxVitaminB6" unit="mg" />
                <NutritionInput label="Vitamin B12" minKey="minVitaminB12" maxKey="maxVitaminB12" unit="µg" />
                <Text style={[s.microSubtitle, { marginTop: 8 }]}>Minerals</Text>
                <NutritionInput label="Calcium" minKey="minCalcium" maxKey="maxCalcium" unit="mg" />
                <NutritionInput label="Iron" minKey="minIron" maxKey="maxIron" unit="mg" />
                <NutritionInput label="Magnesium" minKey="minMagnesium" maxKey="maxMagnesium" unit="mg" />
                <NutritionInput label="Potassium" minKey="minPotassium" maxKey="maxPotassium" unit="mg" />
                <NutritionInput label="Zinc" minKey="minZinc" maxKey="maxZinc" unit="mg" />
              </View>
            )}

            {/* ── AI SUGGESTIONS ── */}
            <SectionHeader title="AI Suggestions" sectionKey="ai" badge="Premium" />
            {openSection === "ai" && (
              <View style={[s.sectionBody, { paddingTop: 12 }]}>
                {/* Quick presets */}
                <Text style={s.aiSubtitle}>Quick presets</Text>
                <View style={s.aiChipsRow}>
                  {["Kids", "Weight Loss", "Mass Gaining", "Endurance Sport", "High Intensity Sport"].map(preset => (
                    <TouchableOpacity
                      key={preset}
                      style={[s.aiChip, aiApplied === preset && s.aiChipActive]}
                      onPress={() => applyAiSuggestion(preset)}
                      disabled={aiLoading}
                    >
                      <Text style={[s.aiChipText, aiApplied === preset && s.aiChipTextActive]}>{preset}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Ask AI */}
                <Text style={[s.aiSubtitle, { marginTop: 16 }]}>Ask AI</Text>
                <View style={s.aiInputRow}>
                  <TextInput
                    style={s.aiInput}
                    value={aiGoal}
                    onChangeText={v => { const words = v.trim().split(/\s+/); setAiGoal(words.length > 30 ? words.slice(0, 30).join(" ") : v) }}
                    placeholder="e.g. post-workout high protein low fat..."
                    placeholderTextColor={colors.muted}
                    returnKeyType="go"
                    onSubmitEditing={() => applyAiSuggestion(aiGoal)}
                    editable={!aiLoading}
                  />
                  <TouchableOpacity
                    style={[s.aiMicBtn, isListening && s.aiMicBtnActive]}
                    onPress={isListening ? stopVoiceInput : startVoiceInput}
                    disabled={aiLoading}
                  >
                    <Ionicons name={isListening ? "stop" : "mic"} size={18} color="#fff" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[s.aiGoBtn, (!aiGoal.trim() || aiLoading) && s.btnDisabled]}
                    onPress={() => applyAiSuggestion(aiGoal)}
                    disabled={!aiGoal.trim() || aiLoading}
                  >
                    {aiLoading ? <ActivityIndicator size="small" color="#fff" /> : <Ionicons name="sparkles" size={18} color="#fff" />}
                  </TouchableOpacity>
                </View>

                {aiError ? <Text style={s.aiError}>{aiError}</Text> : null}
                {aiApplied ? (
                  <View style={s.aiAppliedRow}>
                    <Ionicons name="checkmark-circle" size={14} color={colors.green} />
                    <Text style={s.aiAppliedText}>Filters set for "{aiApplied}"</Text>
                    <TouchableOpacity onPress={() => { setAiApplied(""); setNutrition(defaultNutrition); setSort("none") }}>
                      <Text style={s.aiClearText}>Clear</Text>
                    </TouchableOpacity>
                  </View>
                ) : null}
              </View>
            )}

            {/* ── SORT ── */}
            <SectionHeader title="Sort" sectionKey="sort" />
            {openSection === "sort" && (
              <View style={s.sectionBody}>
                {/* Sort by — dropdown row */}
                <TouchableOpacity style={[s.filterSelectRow, openPicker === "sort" && s.filterSelectRowOpen]} onPress={() => setOpenPicker(openPicker === "sort" ? null : "sort")} activeOpacity={0.7}>
                  <Text style={s.filterSelectLabel}>Sort by</Text>
                  <View style={s.filterSelectRight}>
                    <Text style={[s.filterSelectValue, sort !== "none" && { color: colors.primary, fontWeight: "700" }]}>
                      {sort === "none" ? "None" : SORT_OPTIONS.find(o => o.value === sort)?.label}
                    </Text>
                    <Ionicons name={openPicker === "sort" ? "chevron-up" : "chevron-down"} size={16} color={sort !== "none" ? colors.primary : colors.muted} />
                  </View>
                </TouchableOpacity>
                {openPicker === "sort" && (
                  <View style={s.filterDropdown}>
                    <TouchableOpacity style={[s.filterDropdownItem, sort === "none" && s.filterDropdownItemActive]} onPress={() => { setSort("none"); setOpenPicker(null) }}>
                      <Text style={[s.filterDropdownText, sort === "none" && s.filterDropdownTextActive]}>None</Text>
                      {sort === "none" && <Ionicons name="checkmark" size={16} color={colors.primary} />}
                    </TouchableOpacity>
                    {SORT_OPTIONS.map(o => (
                      <TouchableOpacity key={o.value} style={[s.filterDropdownItem, sort === o.value && s.filterDropdownItemActive]} onPress={() => { setSort(o.value); setOpenPicker(null) }}>
                        <Text style={[s.filterDropdownText, sort === o.value && s.filterDropdownTextActive]}>{o.label}</Text>
                        {sort === o.value && <Ionicons name="checkmark" size={16} color={colors.primary} />}
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
                {/* Direction toggle — only shown when sort is active */}
                {sort !== "none" && (
                  <TouchableOpacity style={[s.filterSelectRow, { marginTop: 4 }]} onPress={() => setSortDirection(d => d === "asc" ? "desc" : "asc")} activeOpacity={0.7}>
                    <Text style={s.filterSelectLabel}>Direction</Text>
                    <View style={s.filterSelectRight}>
                      <Text style={[s.filterSelectValue, { color: colors.primary, fontWeight: "700" }]}>
                        {sortDirection === "asc" ? "↑ Ascending" : "↓ Descending"}
                      </Text>
                    </View>
                  </TouchableOpacity>
                )}
              </View>
            )}

          </ScrollView>
          <View style={s.modalFooter}>
            <TouchableOpacity style={[s.resetBtn, !hasActiveFilters && !searched && s.btnDisabled]} onPress={() => { setFilters(defaultFilters); setNutrition(defaultNutrition); setSort("none"); setSortDirection("desc"); setSearched(false); setLastSearchKey(null); setAiApplied(""); setAiGoal("") }} disabled={!hasActiveFilters && !searched}>
              <Ionicons name="refresh" size={16} color={colors.text} style={{ marginRight: 6 }} />
              <Text style={s.resetBtnText}>Reset</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[s.applyBtnLarge, !hasActiveFilters && s.btnDisabled]} onPress={() => startSearch()} disabled={!hasActiveFilters}>
              <Text style={s.applyBtnText}>Search</Text>
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
            <TouchableOpacity style={s.card} onPress={() => {
              const sf: Record<string, any> = {}
              if (filters.diet !== "any") sf.diet = filters.diet
              if (filters.cuisine !== "any") sf.cuisine = filters.cuisine
              if (filters.prepTime !== "any") sf.prepTime = filters.prepTime
              if (filters.budget !== "any") sf.budget = filters.budget
              if (filters.taste !== "any") sf.taste = filters.taste
              if (filters.healthiness !== "any") sf.healthiness = filters.healthiness
              if (filters.ingredients.length) sf.ingredients = filters.ingredients
              Object.entries(nutrition).forEach(([k, v]) => { if (v.trim() !== "") sf[k] = v.trim() })
              if (sort !== "none") { sf.sort = sort; sf.sortDirection = sortDirection }
              navigation.navigate("RecipeDetail", { id: item.id, title: item.title, fromScan, searchFilters: Object.keys(sf).length ? sf : null })
            }}>
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
          ListFooterComponent={nextOffset ? (
            <TouchableOpacity style={s.loadMoreBtn} onPress={loadMore} disabled={loadingMore}>
              {loadingMore ? <ActivityIndicator size="small" color={colors.primary} /> : <Text style={s.loadMoreText}>Load more recipes</Text>}
            </TouchableOpacity>
          ) : null}
        />
      )}

    </SafeAreaView>

    {/* AI Scanner Modal */}
    <Modal visible={scannerOpen} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={s.scannerContainer} edges={["top"]}>
        <View style={s.scannerHeader}>
          <TouchableOpacity onPress={() => setScannerOpen(false)}>
            <Ionicons name="close" size={24} color={colors.text} />
          </TouchableOpacity>
        </View>
        <View style={s.scannerCapture}>
          <Text style={s.scannerCaptureTitle}>{capturedAssets.length === 0 ? "Snap or pick your photos" : `${capturedAssets.length} photo${capturedAssets.length > 1 ? "s" : ""} added`}</Text>
          <Text style={s.scannerCaptureSubtitle}>{capturedAssets.length === 0 ? "Fridge, counter, anything — AI will find the ingredients" : `${10 - capturedAssets.length} more allowed`}</Text>
          <View style={s.scannerBtns}>
            <TouchableOpacity style={s.scannerActionBtn} onPress={openCameraForScan} disabled={capturedAssets.length >= 10}>
              <Ionicons name="camera" size={28} color={colors.primary} />
              <Text style={s.scannerActionBtnText}>Take photo</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.scannerActionBtn} onPress={openLibraryForScan} disabled={capturedAssets.length >= 10}>
              <Ionicons name="images" size={28} color={colors.primary} />
              <Text style={s.scannerActionBtnText}>From library</Text>
            </TouchableOpacity>
          </View>
          {capturedAssets.length > 0 && (
            <View style={s.scannerThumbsRow}>
              {capturedAssets.map((a, i) => (
                <View key={i} style={s.scannerThumb}>
                  <Image source={{ uri: a.uri }} style={s.scannerThumbImg} />
                  <TouchableOpacity style={s.scannerThumbRemove} onPress={() => setCapturedAssets(prev => prev.filter((_, idx) => idx !== i))}>
                    <Ionicons name="close-circle" size={18} color="#fff" />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}
          <View style={s.scannerFooter}>
            {capturedAssets.length > 0 && (
              <TouchableOpacity style={s.scanNowBtn} onPress={analyzeAssets}>
                <Ionicons name="flash" size={18} color="#fff" style={{ marginRight: 8 }} />
                <Text style={s.scanNowBtnText}>Scan now ({capturedAssets.length})</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </SafeAreaView>
    </Modal>

    <Modal visible={analyzingImages} transparent={false} animationType="fade" statusBarTranslucent>
      <View style={s.aiOverlay}>
        <Text style={s.aiEmoji}>🤖</Text>
        <ActivityIndicator size="large" color="#ffffff" style={{ marginTop: 16 }} />
        <Text style={s.aiText}>AI reading pictures…</Text>
      </View>
    </Modal>
    <PaywallModal visible={showPaywall} onClose={() => setShowPaywall(false)} featureName="Nutrition Filters" />
    </>
  )
}

const makeStyles = (colors: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  aiOverlay: { flex: 1, backgroundColor: "#000000", alignItems: "center", justifyContent: "center" },
  aiEmoji: { fontSize: 72 },
  aiText: { marginTop: 20, fontSize: 18, fontWeight: "700", color: "#ffffff" },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "center", padding: spacing.md, borderBottomWidth: 1.5, borderBottomColor: "rgba(255,255,255,0.4)" },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 8 },
  headerTitle: { fontSize: 20, fontWeight: "700", color: colors.text },
  topBar: { flexDirection: "row", alignItems: "center", gap: 12, padding: spacing.md, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: "rgba(255,255,255,0.4)" },
  refinePill: { flex: 1, flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: colors.card, paddingHorizontal: 12, paddingVertical: 10, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border },
  refineSummary: { flex: 1, color: colors.text, fontSize: 14, fontWeight: "500" },
  refineBtn: { color: colors.primary, fontSize: 14, fontWeight: "700" },
  filterToggle: { flexDirection: "row", alignItems: "center", gap: 8, flex: 1, backgroundColor: colors.card, paddingHorizontal: 14, paddingVertical: 12, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border },
  filterToggleText: { flex: 1, color: colors.text, fontSize: 14, fontWeight: "500" },
  filterDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primary },
  refineLabel: { fontSize: 13, fontWeight: "700", color: colors.primary },
  applyBtn: { backgroundColor: colors.primary, paddingHorizontal: 20, paddingVertical: 10, borderRadius: radius.md },
  applyBtnText: { color: "#fff", fontWeight: "700", fontSize: 15 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, padding: spacing.xl },
  emptyText: { fontSize: 18, fontWeight: "600", color: colors.text },
  emptySubText: { fontSize: 14, color: colors.mutedForeground },
  loadMoreBtn: { alignItems: "center", justifyContent: "center", paddingVertical: 16, marginTop: 4, marginBottom: 8, borderRadius: radius.md, borderWidth: 1.5, borderColor: colors.border },
  loadMoreText: { fontSize: 15, fontWeight: "600", color: colors.primary },
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
  modalHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: spacing.md, paddingBottom: 16, borderBottomWidth: 1.5, borderBottomColor: "rgba(255,255,255,0.4)", marginBottom: 8 },
  modalTitle: { fontSize: 18, fontWeight: "700", color: colors.text },
  modalFooter: { flexDirection: "row", gap: 12, padding: spacing.md, borderTopWidth: 1, borderTopColor: "rgba(255,255,255,0.3)" },
  // sections
  sectionHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: spacing.md, paddingVertical: 14, backgroundColor: colors.card, marginBottom: 2, marginTop: 10 },
  sectionTitle: { fontSize: 13, fontWeight: "700", color: colors.mutedForeground, textTransform: "uppercase", letterSpacing: 0.8 },
  sectionCountBadge: { backgroundColor: colors.primary, borderRadius: 99, minWidth: 20, height: 20, alignItems: "center", justifyContent: "center", paddingHorizontal: 6 },
  sectionCountText: { fontSize: 11, fontWeight: "700", color: "#fff" },
  sectionBody: { backgroundColor: colors.background, paddingHorizontal: spacing.md, paddingTop: 4, paddingBottom: 8, marginBottom: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  // filter rows
  filterRow: { marginBottom: spacing.md },
  filterRowLabel: { fontSize: 12, fontWeight: "600", color: colors.mutedForeground, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8 },
  filterSelectRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 12, paddingHorizontal: 4 },
  filterSelectRowOpen: { borderBottomColor: colors.primary },
  filterSelectLabel: { fontSize: 15, color: colors.text, fontWeight: "500" },
  filterSelectRight: { flexDirection: "row", alignItems: "center", gap: 6 },
  filterSelectValue: { fontSize: 14, color: colors.mutedForeground },
  filterDropdown: { backgroundColor: colors.card, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, marginBottom: 4, overflow: "hidden" },
  filterDropdownItem: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  filterDropdownItemActive: { backgroundColor: colors.primary + "11" },
  filterDropdownText: { fontSize: 14, color: colors.text },
  filterDropdownTextActive: { color: colors.primary, fontWeight: "600" },
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
  modeToggleRow: { flexDirection: "row", marginTop: 12, borderRadius: radius.md, borderWidth: 1.5, borderColor: colors.border, overflow: "hidden" },
  modeToggleBtn: { flex: 1, paddingVertical: 8, alignItems: "center", backgroundColor: colors.card },
  modeToggleBtnActive: { backgroundColor: colors.primary },
  modeToggleText: { fontSize: 13, fontWeight: "600", color: colors.mutedForeground },
  modeToggleTextActive: { color: "#fff" },
  // nutrition
  nutritionRow: { marginBottom: 14 },
  nutritionLabelRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 6 },
  nutritionLabel: { fontSize: 13, fontWeight: "600", color: colors.text },
  nutritionInputs: { flexDirection: "row", gap: 12 },
  nutritionField: { flex: 1, flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: 10, paddingVertical: 8 },
  nutritionFieldLabel: { fontSize: 11, color: colors.muted, fontWeight: "600", width: 24 },
  nutritionInput: { flex: 1, color: colors.text, fontSize: 14, padding: 0 },
  nutritionUnit: { fontSize: 11, color: colors.muted },
  microSubtitle: { fontSize: 12, fontWeight: "700", color: colors.mutedForeground, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 10, textAlign: "center" },
  aiSubtitle: { fontSize: 11, fontWeight: "700", color: colors.mutedForeground, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 10 },
  aiChipsRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  aiChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 99, borderWidth: 1.5, borderColor: colors.primary, backgroundColor: "transparent" },
  aiChipActive: { backgroundColor: colors.primary },
  aiChipText: { fontSize: 13, fontWeight: "600", color: colors.primary },
  aiChipTextActive: { color: "#fff" },
  aiInputRow: { flexDirection: "row", gap: 8, alignItems: "center" },
  aiInput: { flex: 1, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: 12, paddingVertical: 10, color: colors.text, fontSize: 14 },
  aiMicBtn: { width: 42, height: 42, borderRadius: radius.md, backgroundColor: colors.mutedForeground, alignItems: "center", justifyContent: "center" },
  aiMicBtnActive: { backgroundColor: colors.destructive },
  aiGoBtn: { width: 42, height: 42, borderRadius: radius.md, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center" },
  aiError: { fontSize: 13, color: colors.destructive, marginTop: 8 },
  aiAppliedRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 10 },
  aiAppliedText: { flex: 1, fontSize: 13, color: colors.green },
  aiClearText: { fontSize: 13, color: colors.destructive, fontWeight: "600" },
  // premium
  premiumBadge: { backgroundColor: "#f59e0b22", paddingHorizontal: 8, paddingVertical: 2, borderRadius: 99 },
  premiumBadgeText: { fontSize: 10, fontWeight: "700", color: "#f59e0b", textTransform: "uppercase" },
  // reset/apply
  resetBtn: { flexDirection: "row", alignItems: "center", borderWidth: 1, borderColor: colors.border, paddingHorizontal: 16, paddingVertical: 12, borderRadius: radius.md },
  resetBtnText: { color: colors.text, fontWeight: "500" },
  applyBtnLarge: { flex: 1, backgroundColor: colors.primary, paddingVertical: 12, borderRadius: radius.md, alignItems: "center" },
  btnDisabled: { opacity: 0.4 },
  // scanner
  scannerContainer: { flex: 1, backgroundColor: colors.background },
  scannerHeader: { padding: spacing.md, alignItems: "flex-end" },
  scannerCapture: { flex: 1, padding: spacing.md, gap: 20 },
  scannerCaptureTitle: { fontSize: 20, fontWeight: "700", color: colors.text, textAlign: "center", marginTop: 8 },
  scannerCaptureSubtitle: { fontSize: 13, color: colors.mutedForeground, textAlign: "center", marginTop: -16 },
  scannerBtns: { flexDirection: "row", gap: 16, justifyContent: "center" },
  scannerActionBtn: { flex: 1, backgroundColor: colors.card, borderWidth: 1.5, borderColor: colors.border, borderRadius: radius.lg, padding: spacing.lg, alignItems: "center", gap: 10 },
  scannerActionBtnText: { fontSize: 14, fontWeight: "600", color: colors.text },
  scannerThumbsRow: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  scannerThumb: { width: 80, height: 80, borderRadius: radius.md, overflow: "hidden" },
  scannerThumbImg: { width: "100%", height: "100%" },
  scannerThumbRemove: { position: "absolute", top: 2, right: 2 },
  scannerFooter: { marginTop: "auto" },
  scanNowBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", backgroundColor: colors.primary, paddingVertical: 16, borderRadius: radius.lg },
  scanNowBtnText: { color: "#fff", fontWeight: "700", fontSize: 16 },
})
