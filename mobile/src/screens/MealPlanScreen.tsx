import React, { useState, useCallback, useEffect } from "react"
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Modal, Alert, TextInput } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { Ionicons } from "@expo/vector-icons"
import { useNavigation } from "@react-navigation/native"
import { useTheme } from "../context/ThemeContext"
import { useAuth } from "../context/AuthContext"
import { useSubscription } from "../context/SubscriptionContext"
import { useGlobalError } from "../context/GlobalErrorContext"
import PaywallModal from "../components/PaywallModal"
import { apiFetch, API_BASE_URL } from "../lib/api"
import { spacing, radius } from "../lib/theme"

let SpeechRecognitionModule: any = null
try {
  const mod = require("expo-speech-recognition")
  SpeechRecognitionModule = mod.ExpoSpeechRecognitionModule
} catch { /* not available in Expo Go */ }

const DIETS = ["none", "vegetarian", "vegan", "ketogenic", "paleo", "gluten free"]
const DIET_LABELS: Record<string, string> = { none: "Any", vegetarian: "Vegetarian", vegan: "Vegan", ketogenic: "Keto", paleo: "Paleo", "gluten free": "Gluten-free" }
const CALORIES = ["1500", "1800", "2000", "2200", "2500", "3000"]
const MEALS_PER_DAY_OPTIONS = [
  { value: "3", label: "3 meals", desc: "Breakfast · Lunch · Dinner" },
  { value: "4", label: "4 meals", desc: "Adds a morning snack" },
  { value: "5", label: "5 meals", desc: "Ideal for muscle gain" },
  { value: "6", label: "6 meals", desc: "High frequency eating" },
]
const CUISINES = ["any", "italian", "mexican", "thai", "indian", "chinese", "french", "japanese", "mediterranean", "american", "greek"]
const INTOLERANCES = ["dairy", "egg", "gluten", "peanut", "seafood", "sesame", "shellfish", "soy", "tree nut", "wheat"]
const AI_PRESETS = ["Kids", "Weight Loss", "Mass Gaining", "Endurance Sport", "High Intensity Sport"]
const MEAL_LABELS = ["Breakfast", "Lunch", "Dinner", "Snack", "Extra", "Extra 2"]
const DAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
const SUGGESTED_FOLDERS = ["Bulking", "Weight Loss", "Maintenance", "Family", "Endurance", "Custom"]

function suggestMeals(goal: string): string {
  const lower = goal.toLowerCase()
  if (/mass|bulk|gain|muscle|high intensity|endurance|sport/.test(lower)) return "5"
  if (/weight loss|cut|lose|deficit/.test(lower)) return "3"
  return "4"
}

type Meal = { id: number; title: string; readyInMinutes: number; servings: number }
type DayPlan = { meals: Meal[]; nutrients: { calories: number; protein: number; fat: number; carbohydrates: number } }
type WeekPlan = { week: Record<string, DayPlan> }
type FiltersJson = Record<string, any>
type Path = null | "ai" | "custom"
type CustomStep = "nutrition" | "diet" | "macros" | "micros"

export default function MealPlanScreen() {
  const { colors } = useTheme()
  const { user } = useAuth()
  const { isPremium, isLoading: subLoading } = useSubscription()
  const { showError } = useGlobalError()
  const navigation = useNavigation<any>()
  const s = makeStyles(colors)

  const [showPaywall, setShowPaywall] = useState(false)
  const [loading, setLoading] = useState(false)
  const [plan, setPlan] = useState<WeekPlan | null>(null)
  const [planId, setPlanId] = useState<string | null>(null)
  const [filtersJson, setFiltersJson] = useState<FiltersJson | null>(null)
  const [isModified, setIsModified] = useState(false)
  const [expandedDay, setExpandedDay] = useState<string | null>(null)
  const [modalOpen, setModalOpen] = useState(false)

  // path selection
  const [path, setPath] = useState<Path>(null)
  const [customStep, setCustomStep] = useState<CustomStep>("nutrition")
  const [openPicker, setOpenPicker] = useState<string | null>(null)

  // shared settings
  const [calories, setCalories] = useState("2000")
  const [diet, setDiet] = useState("none")
  const [exclude, setExclude] = useState("")
  const [cuisine, setCuisine] = useState("any")
  const [intolerances, setIntolerances] = useState<string[]>([])

  // meals-per-day modal
  const [showMealsModal, setShowMealsModal] = useState(false)
  const [mealsPerDay, setMealsPerDay] = useState("3")
  const [pendingParams, setPendingParams] = useState<{ calories: string; diet: string; exclude: string } | null>(null)

  // save plan modal
  const [showSaveModal, setShowSaveModal] = useState(false)
  const [saveName, setSaveName] = useState("")
  const [saveFolder, setSaveFolder] = useState("")
  const [saveFolderCustom, setSaveFolderCustom] = useState("")
  const [saving, setSaving] = useState(false)

  // replace state
  const [replaceDay, setReplaceDay] = useState<string | null>(null)
  const [replaceMealIndex, setReplaceMealIndex] = useState<number | null>(null)
  const [showReplaceSheet, setShowReplaceSheet] = useState(false)
  const [replacingDay, setReplacingDay] = useState(false)
  const [replacingMeal, setReplacingMeal] = useState(false)
  const [replaceCandidates, setReplaceCandidates] = useState<any[]>([])
  const [showCandidates, setShowCandidates] = useState(false)
  const [replaceMessage, setReplaceMessage] = useState("")

  // nutrition state
  const defaultNutrition = {
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
  const [nutrition, setNutrition] = useState(defaultNutrition)

  // AI path
  const [aiPreset, setAiPreset] = useState("")
  const [aiGoal, setAiGoal] = useState("")
  const [aiLoading, setAiLoading] = useState(false)
  const [aiError, setAiError] = useState("")
  const [isListening, setIsListening] = useState(false)

  useEffect(() => {
    if (!subLoading && !isPremium) setShowPaywall(true)
  }, [subLoading, isPremium])

  const startVoiceInput = useCallback(async () => {
    if (!SpeechRecognitionModule) return
    try {
      setIsListening(true); setAiGoal("")
      await SpeechRecognitionModule.start({ lang: "en-US", interimResults: true })
      SpeechRecognitionModule.addListener("result", (e: any) => {
        const t = e.results?.[0]?.transcript ?? ""
        setAiGoal(t.trim().split(/\s+/).slice(0, 30).join(" "))
      })
      const cleanup = () => setIsListening(false)
      SpeechRecognitionModule.addListener("end", cleanup)
      SpeechRecognitionModule.addListener("error", cleanup)
    } catch { setIsListening(false) }
  }, [])

  const stopVoiceInput = useCallback(() => {
    SpeechRecognitionModule?.stop(); setIsListening(false)
  }, [])

  const resolveAiParams = async (goal: string): Promise<{ calories: string; diet: string; exclude: string }> => {
    try {
      const res = await apiFetch("/api/recipes/suggest-filters", { method: "POST", body: JSON.stringify({ goal }) })
      const data = await res.json()
      if (!res.ok || !data.params) return { calories, diet, exclude }
      const p = data.params
      const dietMap: Record<string, string> = { vegetarian: "vegetarian", vegan: "vegan", "gluten free": "gluten free", ketogenic: "ketogenic", paleo: "paleo" }
      const resolvedDiet = p.diet ? (Object.entries(dietMap).find(([k]) => p.diet.includes(k))?.[1] ?? "none") : diet
      const resolvedCalories = p.minCalories ? String(Math.min(3000, Math.max(1500, Math.round(parseInt(p.minCalories) / 100) * 100))) : calories
      return { calories: resolvedCalories, diet: resolvedDiet, exclude }
    } catch { return { calories, diet, exclude } }
  }

  const buildFiltersJson = (params: { calories: string; diet: string; exclude: string }, meals: string): FiltersJson => ({
    calories: params.calories,
    diet: params.diet,
    exclude: params.exclude,
    cuisine,
    intolerances,
    mealsPerDay: meals,
    // macros/micros from nutrition state
    maxProtein: nutrition.maxProtein || undefined,
    maxCarbs: nutrition.maxCarbs || undefined,
    maxFat: nutrition.maxFat || undefined,
    maxSaturatedFat: nutrition.maxSaturatedFat || undefined,
    maxFiber: nutrition.maxFiber || undefined,
    maxSugar: nutrition.maxSugar || undefined,
    maxCholesterol: nutrition.maxCholesterol || undefined,
    maxSodium: nutrition.maxSodium || undefined,
    maxVitaminA: nutrition.maxVitaminA || undefined,
    maxVitaminC: nutrition.maxVitaminC || undefined,
    maxVitaminD: nutrition.maxVitaminD || undefined,
    maxVitaminB6: nutrition.maxVitaminB6 || undefined,
    maxVitaminB12: nutrition.maxVitaminB12 || undefined,
    maxCalcium: nutrition.maxCalcium || undefined,
    maxIron: nutrition.maxIron || undefined,
    maxMagnesium: nutrition.maxMagnesium || undefined,
    maxPotassium: nutrition.maxPotassium || undefined,
    maxZinc: nutrition.maxZinc || undefined,
  })

  const generatePlan = useCallback(async (params: { calories: string; diet: string; exclude: string }, meals: string) => {
    if (!isPremium) { setShowPaywall(true); return }
    setLoading(true)
    setShowMealsModal(false)
    setModalOpen(false)
    const filters = buildFiltersJson(params, meals)
    try {
      const urlParams = new URLSearchParams({ targetCalories: params.calories, timeFrame: "week", mealsPerDay: meals })
      if (params.diet !== "none") urlParams.set("diet", params.diet)
      if (params.exclude.trim()) urlParams.set("exclude", params.exclude.trim())
      const res = await apiFetch(`/api/meal-plan/generate?${urlParams.toString()}`, { screen: "Meal Plan" })
      const data = await res.json()
      if (!res.ok) { showError(data.error ?? "Failed to generate meal plan", "Meal Plan"); return }
      setPlan(data)
      setFiltersJson(filters)
      setIsModified(false)
      setPlanId(null)
      setExpandedDay(null)

      if (user?.id) {
        const weekStart = new Date()
        weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1)
        const saveRes = await fetch(`${API_BASE_URL}/api/meal-plan`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId: user.id, weekStart: weekStart.toISOString().split("T")[0], planData: data, filtersJson: filters }),
        }).catch(() => null)
        if (saveRes?.ok) {
          const saved = await saveRes.json().catch(() => null)
          if (saved?.plan?.id) setPlanId(saved.plan.id)
        }

        // Prompt to name/folder the plan and add to shopping list
        setShowSaveModal(true)
      }
    } catch (e: any) {
      showError(e?.message ?? "Network error", "Meal Plan")
    } finally { setLoading(false) }
  }, [isPremium, user?.id, showError, cuisine, intolerances, nutrition])

  const handleSavePlan = async () => {
    if (!user?.id || !planId) return
    setSaving(true)
    const folder = saveFolder === "Custom" ? saveFolderCustom.trim() : saveFolder
    try {
      await apiFetch("/api/meal-plan", {
        method: "PATCH",
        body: JSON.stringify({ userId: user.id, planId, planData: plan, isModified: false }),
      })
      // Also update name/folder via a second PATCH — simplest given current API shape
      // We piggyback by re-POSTing with the week key — the ON CONFLICT updates name/folder
      const weekStart = new Date()
      weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1)
      await fetch(`${API_BASE_URL}/api/meal-plan`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id, weekStart: weekStart.toISOString().split("T")[0], planData: plan, name: saveName.trim() || null, folder: folder || null, filtersJson }),
      }).catch(() => {})
    } catch { /* non-fatal */ }
    setSaving(false)
    setShowSaveModal(false)

    Alert.alert("Add to Shopping List?", "Add all this week's ingredients to your shopping list?", [
      { text: "Not now", style: "cancel" },
      { text: "Yes, add all", onPress: async () => {
        if (!plan) return
        const allMeals: any[] = Object.values(plan.week).flatMap((day: any) => day.meals ?? [])
        await Promise.all(allMeals.map((meal: any) =>
          apiFetch("/api/shopping-list", { method: "POST", body: JSON.stringify({ userId: user!.id, recipeId: String(meal.id), recipeTitle: meal.title, ingredients: [{ name: meal.title, amount: "see recipe" }] }) }).catch(() => {})
        ))
        Alert.alert("Done!", "All meals added to your shopping list.")
      }},
    ])
  }

  const handleAiGenerate = async () => {
    const goal = aiPreset || aiGoal.trim()
    if (!goal) return
    setAiLoading(true); setAiError("")
    try {
      const resolved = await resolveAiParams(goal)
      const suggested = suggestMeals(goal)
      setMealsPerDay(suggested)
      setPendingParams(resolved)
      setModalOpen(false)
      setShowMealsModal(true)
    } catch { setAiError("Something went wrong. Please try again.") }
    finally { setAiLoading(false) }
  }

  const handleCustomGenerate = () => {
    const params = { calories, diet, exclude }
    setPendingParams(params)
    setMealsPerDay("3")
    setModalOpen(false)
    setShowMealsModal(true)
  }

  // ── Replace full day ──────────────────────────────────────────────────
  const handleReplaceDay = async (day: string) => {
    if (!filtersJson || !plan) return
    setShowReplaceSheet(false)
    setReplacingDay(true)
    try {
      const res = await apiFetch("/api/meal-plan/replace-day", {
        method: "POST",
        body: JSON.stringify({ day, filtersJson, currentWeek: plan.week }),
        screen: "Meal Plan",
      })
      const data = await res.json()
      if (!res.ok) { showError(data.error ?? "Could not replace day", "Meal Plan"); return }
      const newPlan = { week: { ...plan.week, [day]: data.day } }
      setPlan(newPlan)
      // Persist updated plan
      if (user?.id && planId) {
        await apiFetch("/api/meal-plan", {
          method: "PATCH",
          body: JSON.stringify({ userId: user.id, planId, planData: newPlan, isModified: false }),
        }).catch(() => {})
      }
    } catch (e: any) {
      showError(e?.message ?? "Network error", "Meal Plan")
    } finally { setReplacingDay(false) }
  }

  // ── Replace single meal ───────────────────────────────────────────────
  const handleReplaceMeal = async (day: string, mealIndex: number) => {
    if (!filtersJson || !plan) return
    setShowReplaceSheet(false)
    setReplacingMeal(true)
    setReplaceCandidates([])
    setReplaceMessage("")
    try {
      const dayPlan = plan.week[day]
      const res = await apiFetch("/api/meal-plan/replace-meal", {
        method: "POST",
        body: JSON.stringify({ dayPlan, mealIndex, filtersJson }),
        screen: "Meal Plan",
      })
      const data = await res.json()
      if (!res.ok) { showError(data.error ?? "Could not find replacements", "Meal Plan"); return }
      if (!data.candidates?.length) {
        setReplaceMessage(data.message ?? "No alternatives found within your nutrition budget.")
        setShowCandidates(true)
        return
      }
      setReplaceCandidates(data.candidates)
      setShowCandidates(true)
    } catch (e: any) {
      showError(e?.message ?? "Network error", "Meal Plan")
    } finally { setReplacingMeal(false) }
  }

  const confirmReplaceMeal = async (candidate: any, overrideWarning: boolean) => {
    if (!plan || replaceDay === null || replaceMealIndex === null) return
    if (candidate.warning && !overrideWarning) {
      Alert.alert(
        "Nutrition Warning",
        candidate.warning + "\n\nReplace anyway?",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Replace anyway", onPress: () => confirmReplaceMeal(candidate, true) },
        ]
      )
      return
    }
    const dayPlan = plan.week[replaceDay]
    const newMeals = dayPlan.meals.map((m, i) =>
      i === replaceMealIndex ? { id: candidate.id, title: candidate.title, readyInMinutes: candidate.readyInMinutes ?? 0, servings: candidate.servings ?? 1 } : m
    )
    const newPlan = { week: { ...plan.week, [replaceDay]: { ...dayPlan, meals: newMeals } } }
    const modified = !candidate.fits
    setPlan(newPlan)
    if (modified) setIsModified(true)
    setShowCandidates(false)
    setReplaceCandidates([])
    if (user?.id && planId) {
      await apiFetch("/api/meal-plan", {
        method: "PATCH",
        body: JSON.stringify({ userId: user.id, planId, planData: newPlan, isModified: modified }),
      }).catch(() => {})
    }
  }

  const openPath = (p: Path) => {
    setPlan(null)
    setPath(p ?? null)
    setCustomStep("nutrition")
    setAiPreset(""); setAiGoal(""); setAiError("")
    if (p !== null) setModalOpen(true)
  }

  const DropdownRow = ({ label, pickerId, value, displayValue, options, onSelect }: {
    label: string; pickerId: string; value: string; displayValue: string
    options: { value: string; label: string }[]; onSelect: (v: string) => void
  }) => {
    const isOpen = openPicker === pickerId
    const isActive = value !== "none" && value !== "any"
    return (
      <View style={s.dropdownGroup}>
        <TouchableOpacity style={s.dropdownRow} onPress={() => setOpenPicker(isOpen ? null : pickerId)} activeOpacity={0.7}>
          <Text style={s.dropdownLabel}>{label}</Text>
          <View style={s.dropdownRight}>
            <Text style={[s.dropdownValue, isActive && { color: colors.primary, fontWeight: "700" }]}>{displayValue}</Text>
            <Ionicons name={isOpen ? "chevron-up" : "chevron-down"} size={16} color={isActive ? colors.primary : colors.muted} />
          </View>
        </TouchableOpacity>
        {isOpen && (
          <View style={s.dropdownList}>
            {options.map(opt => (
              <TouchableOpacity key={opt.value} style={[s.dropdownItem, value === opt.value && s.dropdownItemActive]} onPress={() => { onSelect(opt.value); setOpenPicker(null) }}>
                <Text style={[s.dropdownItemText, value === opt.value && s.dropdownItemTextActive]}>{opt.label}</Text>
                {value === opt.value && <Ionicons name="checkmark" size={16} color={colors.primary} />}
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>
    )
  }

  const NutritionInput = ({ label, minKey, maxKey, unit }: { label: string; minKey: keyof typeof defaultNutrition; maxKey: keyof typeof defaultNutrition; unit: string }) => (
    <View style={s.nutritionRow}>
      <View style={s.nutritionLabelRow}>
        <Text style={s.nutritionLabel}>{label}</Text>
      </View>
      <View style={s.nutritionInputs}>
        <View style={s.nutritionField}>
          <Text style={s.nutritionFieldLabel}>Min</Text>
          <TextInput style={s.nutritionInput} value={nutrition[minKey]} onChangeText={v => setNutrition(n => ({ ...n, [minKey]: v.replace(/[^0-9]/g, "") }))} placeholder="—" placeholderTextColor={colors.muted} keyboardType="numeric" />
          <Text style={s.nutritionUnit}>{unit}</Text>
        </View>
        <View style={s.nutritionField}>
          <Text style={s.nutritionFieldLabel}>Max</Text>
          <TextInput style={s.nutritionInput} value={nutrition[maxKey]} onChangeText={v => setNutrition(n => ({ ...n, [maxKey]: v.replace(/[^0-9]/g, "") }))} placeholder="—" placeholderTextColor={colors.muted} keyboardType="numeric" />
          <Text style={s.nutritionUnit}>{unit}</Text>
        </View>
      </View>
    </View>
  )

  if (subLoading) {
    return <SafeAreaView style={s.container} edges={["top"]}><View style={s.center}><ActivityIndicator size="large" color={colors.primary} /></View></SafeAreaView>
  }

  return (
    <SafeAreaView style={s.container} edges={["top"]}>
      <View style={s.topBar}>
        <Text style={s.title}>Meal Plan</Text>
        {plan && !loading && (
          <TouchableOpacity style={s.regenBtn} onPress={() => openPath(null)}>
            <Ionicons name="refresh" size={16} color={colors.primary} />
            <Text style={s.regenBtnText}>New plan</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Empty state */}
      {!plan && !loading && (
        <ScrollView contentContainerStyle={s.homeContent}>
          <Text style={s.homeTitle}>Build your week</Text>
          <Text style={s.homeSub}>Choose how you want to plan your meals.</Text>
          <TouchableOpacity style={s.pathCard} onPress={() => openPath("ai")} activeOpacity={0.85}>
            <View style={[s.pathIconBg, { backgroundColor: colors.primary + "22" }]}>
              <Ionicons name="sparkles" size={28} color={colors.primary} />
            </View>
            <View style={s.pathInfo}>
              <Text style={s.pathTitle}>AI Goal</Text>
              <Text style={s.pathDesc}>Tell the AI your goal — bulking, weight loss, endurance — and it builds the plan for you.</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.muted} />
          </TouchableOpacity>
          <TouchableOpacity style={s.pathCard} onPress={() => openPath("custom")} activeOpacity={0.85}>
            <View style={[s.pathIconBg, { backgroundColor: colors.primary + "22" }]}>
              <Ionicons name="options-outline" size={28} color={colors.primary} />
            </View>
            <View style={s.pathInfo}>
              <Text style={s.pathTitle}>Customise</Text>
              <Text style={s.pathDesc}>Set your calories, diet, cuisine, intolerances and nutrients step by step.</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.muted} />
          </TouchableOpacity>
        </ScrollView>
      )}

      {loading && (
        <View style={s.center}>
          <Text style={s.emptyEmoji}>🍽️</Text>
          <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 16 }} />
          <Text style={s.emptySubText}>Building your meal plan…</Text>
        </View>
      )}

      {/* Plan results */}
      {plan && !loading && (
        <ScrollView contentContainerStyle={{ padding: spacing.md, gap: 10 }}>
          {/* Filter drift warning */}
          {isModified && (
            <TouchableOpacity style={s.driftBanner} onPress={() => {
              const summary = filtersJson ? `${filtersJson.calories} kcal · ${filtersJson.diet !== "none" ? filtersJson.diet : "any diet"} · ${filtersJson.mealsPerDay} meals/day` : "Custom filters"
              Alert.alert("Filters Modified", `Original filters: ${summary}\n\nSome meals in this plan no longer match the original criteria.`, [{ text: "OK" }])
            }}>
              <Ionicons name="warning-outline" size={16} color="#b45309" />
              <Text style={s.driftText}>Filters modified — tap to see original criteria</Text>
            </TouchableOpacity>
          )}

          {DAY_NAMES.map(day => {
            const key = day.toLowerCase()
            const dayPlan = plan.week[key]
            if (!dayPlan) return null
            const isExpanded = expandedDay === day
            return (
              <View key={day} style={s.dayCard}>
                <TouchableOpacity style={s.dayHeader} onPress={() => setExpandedDay(isExpanded ? null : day)} activeOpacity={0.8}>
                  <Text style={s.dayName}>{day}</Text>
                  <View style={s.dayNutrients}>
                    <Text style={s.nutrientText}>{Math.round(dayPlan.nutrients.calories)} cal</Text>
                    <Text style={s.nutrientDot}>·</Text>
                    <Text style={s.nutrientText}>{Math.round(dayPlan.nutrients.protein)}g protein</Text>
                  </View>
                  {/* Replace day button */}
                  {filtersJson && (
                    <TouchableOpacity style={s.replaceDayBtn} onPress={() => {
                      setReplaceDay(key)
                      Alert.alert("Replace Day", `Re-generate all meals for ${day} using your original filters?`, [
                        { text: "Cancel", style: "cancel" },
                        { text: "Replace", onPress: () => handleReplaceDay(key) },
                      ])
                    }}>
                      {replacingDay && replaceDay === key
                        ? <ActivityIndicator size="small" color={colors.primary} />
                        : <Ionicons name="refresh-outline" size={16} color={colors.primary} />}
                    </TouchableOpacity>
                  )}
                  <Ionicons name={isExpanded ? "chevron-up" : "chevron-down"} size={16} color={colors.mutedForeground} />
                </TouchableOpacity>

                {isExpanded && (
                  <View style={s.mealsContainer}>
                    {dayPlan.meals.map((meal, i) => (
                      <TouchableOpacity key={meal.id} style={s.mealRow} onPress={() => navigation.navigate("RecipeDetail", { id: meal.id, title: meal.title })}>
                        <View style={s.mealType}>
                          <Text style={s.mealTypeText}>{MEAL_LABELS[i] ?? "Meal"}</Text>
                        </View>
                        <View style={s.mealInfo}>
                          <Text style={s.mealTitle} numberOfLines={2}>{meal.title}</Text>
                          <Text style={s.mealMeta}>{meal.readyInMinutes} min · {meal.servings} servings</Text>
                        </View>
                        {/* Replace meal button */}
                        {filtersJson && (
                          <TouchableOpacity style={s.replaceMealBtn} onPress={() => {
                            setReplaceDay(key)
                            setReplaceMealIndex(i)
                            Alert.alert(
                              "Replace Meal",
                              `Find an alternative for "${meal.title}" that fits your daily nutrition budget?`,
                              [
                                { text: "Cancel", style: "cancel" },
                                { text: "Find alternatives", onPress: () => handleReplaceMeal(key, i) },
                              ]
                            )
                          }}>
                            {replacingMeal && replaceDay === key && replaceMealIndex === i
                              ? <ActivityIndicator size="small" color={colors.mutedForeground} />
                              : <Ionicons name="swap-horizontal-outline" size={18} color={colors.mutedForeground} />}
                          </TouchableOpacity>
                        )}
                        <Ionicons name="chevron-forward" size={16} color={colors.muted} />
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>
            )
          })}
        </ScrollView>
      )}

      {/* ── Modal — AI path ─────────────────────────────────────────── */}
      <Modal visible={modalOpen && path === "ai"} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={s.modalContainer} edges={["top"]}>
          <View style={s.modalHeader}>
            <TouchableOpacity onPress={() => setModalOpen(false)}><Ionicons name="arrow-back" size={24} color={colors.text} /></TouchableOpacity>
            <Text style={s.modalTitle}>AI Goal</Text>
            <View style={{ width: 24 }} />
          </View>
          <ScrollView contentContainerStyle={{ padding: spacing.md, gap: 20 }} keyboardShouldPersistTaps="handled">
            <Text style={s.aiIntro}>Pick a preset or describe your goal. The AI will set the best plan parameters for you.</Text>
            <View style={s.aiChipsRow}>
              {AI_PRESETS.map(p => (
                <TouchableOpacity key={p} style={[s.aiChip, aiPreset === p && s.aiChipActive]} onPress={() => { setAiPreset(aiPreset === p ? "" : p); setAiGoal("") }}>
                  <Text style={[s.aiChipText, aiPreset === p && s.aiChipTextActive]}>{p}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <View>
              <Text style={s.settingLabel}>Or describe your goal</Text>
              <View style={s.aiInputRow}>
                <TextInput style={s.aiInput} value={aiGoal} onChangeText={v => { setAiPreset(""); setAiGoal(v.trim().split(/\s+/).length > 30 ? v.trim().split(/\s+/).slice(0, 30).join(" ") : v) }} placeholder="e.g. lose weight, high protein, low carb..." placeholderTextColor={colors.muted} editable={!aiLoading} />
                <TouchableOpacity style={[s.aiMicBtn, isListening && s.aiMicBtnActive]} onPress={isListening ? stopVoiceInput : startVoiceInput} disabled={aiLoading}>
                  <Ionicons name={isListening ? "stop" : "mic"} size={18} color="#fff" />
                </TouchableOpacity>
              </View>
            </View>
            {aiError ? <Text style={s.errorText}>{aiError}</Text> : null}
          </ScrollView>
          <View style={s.modalFooter}>
            <TouchableOpacity style={[s.generateBtnLarge, (!aiPreset && !aiGoal.trim() || aiLoading) && s.btnDisabled]} onPress={handleAiGenerate} disabled={(!aiPreset && !aiGoal.trim()) || aiLoading}>
              {aiLoading ? <ActivityIndicator color="#fff" /> : (
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                  <Ionicons name="sparkles" size={18} color="#fff" />
                  <Text style={s.generateBtnText}>Next →</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>

      {/* ── Modal — Custom path ──────────────────────────────────────── */}
      <Modal visible={modalOpen && path === "custom"} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={s.modalContainer} edges={["top"]}>
          <View style={s.modalHeader}>
            <TouchableOpacity onPress={() => {
              if (customStep === "nutrition") setModalOpen(false)
              else if (customStep === "diet") setCustomStep("nutrition")
              else if (customStep === "macros") setCustomStep("diet")
              else setCustomStep("macros")
            }}>
              <Ionicons name="arrow-back" size={24} color={colors.text} />
            </TouchableOpacity>
            <Text style={s.modalTitle}>
              {customStep === "nutrition" ? "Nutrition" : customStep === "diet" ? "Diet & Cuisine" : customStep === "macros" ? "Macronutrients" : "Micronutrients"}
            </Text>
            <Text style={s.stepIndicator}>
              {customStep === "nutrition" ? "1/4" : customStep === "diet" ? "2/4" : customStep === "macros" ? "3/4" : "4/4"}
            </Text>
          </View>
          <ScrollView contentContainerStyle={{ paddingVertical: spacing.md, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
            {customStep === "nutrition" && (
              <>
                <DropdownRow label="Daily Calories" pickerId="calories" value={calories} displayValue={`${calories} kcal`} options={CALORIES.map(c => ({ value: c, label: `${c} kcal` }))} onSelect={setCalories} />
                <View style={s.dropdownRow}>
                  <Text style={s.dropdownLabel}>Exclude Ingredients</Text>
                  <TextInput style={s.excludeInput} value={exclude} onChangeText={setExclude} placeholder="e.g. pork, nuts..." placeholderTextColor={colors.muted} />
                </View>
              </>
            )}
            {customStep === "diet" && (
              <>
                <DropdownRow label="Diet" pickerId="diet" value={diet} displayValue={DIET_LABELS[diet]} options={DIETS.map(d => ({ value: d, label: DIET_LABELS[d] }))} onSelect={setDiet} />
                <DropdownRow label="Cuisine" pickerId="cuisine" value={cuisine} displayValue={cuisine === "any" ? "Any cuisine" : cuisine.charAt(0).toUpperCase() + cuisine.slice(1)} options={CUISINES.map(c => ({ value: c, label: c === "any" ? "Any cuisine" : c.charAt(0).toUpperCase() + c.slice(1) }))} onSelect={setCuisine} />
                <View style={s.dropdownGroup}>
                  <TouchableOpacity style={s.dropdownRow} onPress={() => setOpenPicker(openPicker === "intolerances" ? null : "intolerances")} activeOpacity={0.7}>
                    <Text style={s.dropdownLabel}>Intolerances</Text>
                    <View style={s.dropdownRight}>
                      <Text style={[s.dropdownValue, intolerances.length > 0 && { color: colors.primary, fontWeight: "700" }]}>{intolerances.length === 0 ? "None" : `${intolerances.length} selected`}</Text>
                      <Ionicons name={openPicker === "intolerances" ? "chevron-up" : "chevron-down"} size={16} color={intolerances.length > 0 ? colors.primary : colors.muted} />
                    </View>
                  </TouchableOpacity>
                  {openPicker === "intolerances" && (
                    <View style={s.dropdownList}>
                      {INTOLERANCES.map(i => {
                        const active = intolerances.includes(i)
                        return (
                          <TouchableOpacity key={i} style={[s.dropdownItem, active && s.dropdownItemActive]} onPress={() => setIntolerances(prev => prev.includes(i) ? prev.filter(x => x !== i) : [...prev, i])}>
                            <Text style={[s.dropdownItemText, active && s.dropdownItemTextActive]}>{i.charAt(0).toUpperCase() + i.slice(1)}</Text>
                            {active && <Ionicons name="checkmark" size={16} color={colors.primary} />}
                          </TouchableOpacity>
                        )
                      })}
                    </View>
                  )}
                </View>
              </>
            )}
            {customStep === "macros" && (
              <View style={{ paddingHorizontal: spacing.md, paddingTop: 8 }}>
                <NutritionInput label="Protein" minKey="minProtein" maxKey="maxProtein" unit="g" />
                <NutritionInput label="Carbohydrates" minKey="minCarbs" maxKey="maxCarbs" unit="g" />
                <NutritionInput label="Fat" minKey="minFat" maxKey="maxFat" unit="g" />
                <NutritionInput label="Saturated Fat" minKey="minSaturatedFat" maxKey="maxSaturatedFat" unit="g" />
                <NutritionInput label="Fiber" minKey="minFiber" maxKey="maxFiber" unit="g" />
                <NutritionInput label="Sugar" minKey="minSugar" maxKey="maxSugar" unit="g" />
                <NutritionInput label="Cholesterol" minKey="minCholesterol" maxKey="maxCholesterol" unit="mg" />
                <NutritionInput label="Sodium" minKey="minSodium" maxKey="maxSodium" unit="mg" />
              </View>
            )}
            {customStep === "micros" && (
              <View style={{ paddingHorizontal: spacing.md, paddingTop: 8 }}>
                <Text style={[s.settingLabel, { marginBottom: 16 }]}>Vitamins</Text>
                <NutritionInput label="Vitamin A" minKey="minVitaminA" maxKey="maxVitaminA" unit="IU" />
                <NutritionInput label="Vitamin C" minKey="minVitaminC" maxKey="maxVitaminC" unit="mg" />
                <NutritionInput label="Vitamin D" minKey="minVitaminD" maxKey="maxVitaminD" unit="µg" />
                <NutritionInput label="Vitamin B6" minKey="minVitaminB6" maxKey="maxVitaminB6" unit="mg" />
                <NutritionInput label="Vitamin B12" minKey="minVitaminB12" maxKey="maxVitaminB12" unit="µg" />
                <View style={s.sectionDivider} />
                <Text style={[s.settingLabel, { marginBottom: 16 }]}>Minerals</Text>
                <NutritionInput label="Calcium" minKey="minCalcium" maxKey="maxCalcium" unit="mg" />
                <NutritionInput label="Iron" minKey="minIron" maxKey="maxIron" unit="mg" />
                <NutritionInput label="Magnesium" minKey="minMagnesium" maxKey="maxMagnesium" unit="mg" />
                <NutritionInput label="Potassium" minKey="minPotassium" maxKey="maxPotassium" unit="mg" />
                <NutritionInput label="Zinc" minKey="minZinc" maxKey="maxZinc" unit="mg" />
              </View>
            )}
          </ScrollView>
          <View style={s.modalFooter}>
            {customStep === "nutrition" && <TouchableOpacity style={s.generateBtnLarge} onPress={() => setCustomStep("diet")}><Text style={s.generateBtnText}>Next →</Text></TouchableOpacity>}
            {customStep === "diet" && <TouchableOpacity style={s.generateBtnLarge} onPress={() => setCustomStep("macros")}><Text style={s.generateBtnText}>Next →</Text></TouchableOpacity>}
            {customStep === "macros" && <TouchableOpacity style={s.generateBtnLarge} onPress={() => setCustomStep("micros")}><Text style={s.generateBtnText}>Next →</Text></TouchableOpacity>}
            {customStep === "micros" && <TouchableOpacity style={s.generateBtnLarge} onPress={handleCustomGenerate}><Text style={s.generateBtnText}>Next →</Text></TouchableOpacity>}
          </View>
        </SafeAreaView>
      </Modal>

      {/* ── Meals per day modal ──────────────────────────────────────── */}
      <Modal visible={showMealsModal} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={s.modalContainer} edges={["top"]}>
          <View style={s.modalHeader}>
            <TouchableOpacity onPress={() => { setShowMealsModal(false); setModalOpen(true) }}>
              <Ionicons name="arrow-back" size={24} color={colors.text} />
            </TouchableOpacity>
            <Text style={s.modalTitle}>Meals per Day</Text>
            <View style={{ width: 24 }} />
          </View>
          <ScrollView contentContainerStyle={{ padding: spacing.md, gap: 12 }}>
            <Text style={s.aiIntro}>How many meals a day would you like?</Text>
            <View style={{ gap: 10, marginTop: 8 }}>
              {MEALS_PER_DAY_OPTIONS.map(opt => (
                <TouchableOpacity key={opt.value} style={[s.mealsOption, mealsPerDay === opt.value && s.mealsOptionActive]} onPress={() => setMealsPerDay(opt.value)} activeOpacity={0.8}>
                  <View style={{ flex: 1 }}>
                    <Text style={[s.mealsOptionLabel, mealsPerDay === opt.value && s.mealsOptionLabelActive]}>{opt.label}</Text>
                    <Text style={s.mealsOptionDesc}>{opt.desc}</Text>
                  </View>
                  {mealsPerDay === opt.value && <Ionicons name="checkmark-circle" size={22} color={colors.primary} />}
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
          <View style={s.modalFooter}>
            <TouchableOpacity style={s.generateBtnLarge} onPress={() => pendingParams && generatePlan(pendingParams, mealsPerDay)}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <Ionicons name="sparkles" size={18} color="#fff" />
                <Text style={s.generateBtnText}>Generate Plan</Text>
              </View>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>

      {/* ── Save plan modal ──────────────────────────────────────────── */}
      <Modal visible={showSaveModal} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={s.modalContainer} edges={["top"]}>
          <View style={s.modalHeader}>
            <View style={{ width: 24 }} />
            <Text style={s.modalTitle}>Save Plan</Text>
            <TouchableOpacity onPress={() => setShowSaveModal(false)}>
              <Text style={{ color: colors.mutedForeground, fontSize: 15 }}>Skip</Text>
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={{ padding: spacing.md, gap: 20 }} keyboardShouldPersistTaps="handled">
            <Text style={s.aiIntro}>Give this plan a name and optionally assign it to a folder.</Text>
            <View>
              <Text style={s.settingLabel}>Plan name (optional)</Text>
              <TextInput style={s.textField} value={saveName} onChangeText={setSaveName} placeholder="e.g. Bulk Week 1, Cut Phase..." placeholderTextColor={colors.muted} />
            </View>
            <View>
              <Text style={s.settingLabel}>Folder (optional)</Text>
              <View style={s.aiChipsRow}>
                {SUGGESTED_FOLDERS.map(f => (
                  <TouchableOpacity key={f} style={[s.aiChip, saveFolder === f && s.aiChipActive]} onPress={() => setSaveFolder(saveFolder === f ? "" : f)}>
                    <Text style={[s.aiChipText, saveFolder === f && s.aiChipTextActive]}>{f}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              {saveFolder === "Custom" && (
                <TextInput style={[s.textField, { marginTop: 10 }]} value={saveFolderCustom} onChangeText={setSaveFolderCustom} placeholder="Enter folder name..." placeholderTextColor={colors.muted} />
              )}
            </View>
          </ScrollView>
          <View style={s.modalFooter}>
            <TouchableOpacity style={[s.generateBtnLarge, saving && s.btnDisabled]} onPress={handleSavePlan} disabled={saving}>
              {saving ? <ActivityIndicator color="#fff" /> : <Text style={s.generateBtnText}>Save Plan</Text>}
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>

      {/* ── Replace meal candidates modal ───────────────────────────── */}
      <Modal visible={showCandidates} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={s.modalContainer} edges={["top"]}>
          <View style={s.modalHeader}>
            <TouchableOpacity onPress={() => { setShowCandidates(false); setReplaceCandidates([]) }}>
              <Ionicons name="arrow-back" size={24} color={colors.text} />
            </TouchableOpacity>
            <Text style={s.modalTitle}>Choose Replacement</Text>
            <View style={{ width: 24 }} />
          </View>
          <ScrollView contentContainerStyle={{ padding: spacing.md, gap: 10 }}>
            {replaceMessage ? (
              <Text style={s.aiIntro}>{replaceMessage}</Text>
            ) : (
              <>
                <Text style={s.aiIntro}>Select a replacement meal. Green means it fits your daily nutrition budget.</Text>
                {replaceCandidates.map((c, i) => (
                  <TouchableOpacity key={c.id ?? i} style={[s.candidateCard, c.fits ? s.candidateFits : s.candidateWarn]} onPress={() => confirmReplaceMeal(c, false)} activeOpacity={0.8}>
                    <View style={{ flex: 1 }}>
                      <Text style={s.candidateTitle} numberOfLines={2}>{c.title}</Text>
                      {c.warning && <Text style={s.candidateWarning}>{c.warning}</Text>}
                    </View>
                    <Ionicons name={c.fits ? "checkmark-circle" : "warning-outline"} size={20} color={c.fits ? "#16a34a" : "#b45309"} />
                  </TouchableOpacity>
                ))}
              </>
            )}
          </ScrollView>
        </SafeAreaView>
      </Modal>

      <PaywallModal visible={showPaywall} onClose={() => setShowPaywall(false)} featureName="Meal Planner" />
    </SafeAreaView>
  )
}

const makeStyles = (colors: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  topBar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: spacing.md, borderBottomWidth: 1.5, borderBottomColor: "rgba(255,255,255,0.4)" },
  title: { fontSize: 20, fontWeight: "800", color: colors.text },
  regenBtn: { flexDirection: "row", alignItems: "center", gap: 6, borderWidth: 1, borderColor: colors.primary, borderRadius: radius.md, paddingHorizontal: 12, paddingVertical: 7 },
  regenBtnText: { color: colors.primary, fontWeight: "600", fontSize: 13 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, padding: spacing.xl },
  emptyEmoji: { fontSize: 48 },
  emptySubText: { fontSize: 14, color: colors.mutedForeground },
  homeContent: { padding: spacing.md, paddingTop: 32, gap: 16 },
  homeTitle: { fontSize: 22, fontWeight: "800", color: colors.text },
  homeSub: { fontSize: 14, color: colors.mutedForeground, lineHeight: 20, marginTop: -8 },
  pathCard: { flexDirection: "row", alignItems: "center", gap: 16, backgroundColor: colors.card, borderRadius: radius.lg, borderWidth: 1.5, borderColor: colors.border, padding: spacing.md },
  pathIconBg: { width: 52, height: 52, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  pathInfo: { flex: 1 },
  pathTitle: { fontSize: 16, fontWeight: "700", color: colors.text, marginBottom: 4 },
  pathDesc: { fontSize: 13, color: colors.mutedForeground, lineHeight: 18 },
  // drift banner
  driftBanner: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "#fef3c7", borderRadius: radius.md, padding: 12, borderWidth: 1, borderColor: "#f59e0b" },
  driftText: { fontSize: 13, color: "#b45309", fontWeight: "600", flex: 1 },
  // plan
  dayCard: { backgroundColor: colors.card, borderRadius: radius.lg, borderWidth: 1.5, borderColor: colors.border, overflow: "hidden" },
  dayHeader: { flexDirection: "row", alignItems: "center", padding: spacing.md, gap: 8 },
  dayName: { fontSize: 15, fontWeight: "700", color: colors.text, flex: 1 },
  dayNutrients: { flexDirection: "row", alignItems: "center", gap: 4 },
  nutrientText: { fontSize: 12, color: colors.mutedForeground },
  nutrientDot: { color: colors.muted },
  replaceDayBtn: { padding: 4 },
  mealsContainer: { borderTopWidth: 1, borderTopColor: colors.border },
  mealRow: { flexDirection: "row", alignItems: "center", padding: spacing.md, gap: 12, borderBottomWidth: 1, borderBottomColor: colors.border + "80" },
  mealType: { backgroundColor: colors.primary + "22", paddingHorizontal: 8, paddingVertical: 4, borderRadius: radius.sm },
  mealTypeText: { fontSize: 10, fontWeight: "700", color: colors.primary, textTransform: "uppercase" },
  mealInfo: { flex: 1 },
  mealTitle: { fontSize: 14, fontWeight: "600", color: colors.text },
  mealMeta: { fontSize: 12, color: colors.mutedForeground, marginTop: 2 },
  replaceMealBtn: { padding: 4 },
  // modal shared
  modalContainer: { flex: 1, backgroundColor: colors.background },
  modalHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: spacing.md, borderBottomWidth: 1.5, borderBottomColor: "rgba(255,255,255,0.4)" },
  modalTitle: { fontSize: 18, fontWeight: "700", color: colors.text },
  stepIndicator: { fontSize: 13, color: colors.mutedForeground, fontWeight: "600" },
  modalFooter: { padding: spacing.md, borderTopWidth: 1, borderTopColor: colors.border },
  settingLabel: { fontSize: 12, fontWeight: "700", color: colors.mutedForeground, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 12 },
  dropdownGroup: {},
  dropdownRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: spacing.md, paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  dropdownLabel: { fontSize: 15, color: colors.text, fontWeight: "500" },
  dropdownRight: { flexDirection: "row", alignItems: "center", gap: 6 },
  dropdownValue: { fontSize: 14, color: colors.mutedForeground },
  dropdownList: { backgroundColor: colors.card, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  dropdownItem: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: spacing.md, paddingVertical: 13, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  dropdownItemActive: { backgroundColor: colors.primary + "11" },
  dropdownItemText: { fontSize: 14, color: colors.text },
  dropdownItemTextActive: { color: colors.primary, fontWeight: "600" },
  excludeInput: { paddingTop: 8, paddingBottom: 4, color: colors.text, fontSize: 14, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  textField: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: 12, paddingVertical: 11, color: colors.text, fontSize: 14 },
  generateBtnLarge: { backgroundColor: colors.primary, paddingVertical: 14, borderRadius: radius.md, alignItems: "center" },
  generateBtnText: { color: "#fff", fontWeight: "700", fontSize: 16 },
  btnDisabled: { opacity: 0.4 },
  aiIntro: { fontSize: 14, color: colors.mutedForeground, lineHeight: 20 },
  aiChipsRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  aiChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 99, borderWidth: 1.5, borderColor: colors.primary },
  aiChipActive: { backgroundColor: colors.primary },
  aiChipText: { fontSize: 13, fontWeight: "600", color: colors.primary },
  aiChipTextActive: { color: "#fff" },
  aiInputRow: { flexDirection: "row", gap: 8, alignItems: "center" },
  aiInput: { flex: 1, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: 12, paddingVertical: 11, color: colors.text, fontSize: 14 },
  aiMicBtn: { width: 44, height: 44, borderRadius: radius.md, backgroundColor: colors.mutedForeground, alignItems: "center", justifyContent: "center" },
  aiMicBtnActive: { backgroundColor: colors.destructive },
  errorText: { fontSize: 13, color: colors.destructive },
  nutritionRow: { marginBottom: 14 },
  nutritionLabelRow: { flexDirection: "row", alignItems: "center", marginBottom: 6 },
  nutritionLabel: { fontSize: 13, fontWeight: "600", color: colors.text },
  nutritionInputs: { flexDirection: "row", gap: 12 },
  nutritionField: { flex: 1, flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: 10, paddingVertical: 8 },
  nutritionFieldLabel: { fontSize: 11, color: colors.muted, fontWeight: "600", width: 24 },
  nutritionInput: { flex: 1, color: colors.text, fontSize: 14, padding: 0 },
  nutritionUnit: { fontSize: 11, color: colors.muted },
  sectionDivider: { height: StyleSheet.hairlineWidth, backgroundColor: colors.border, marginVertical: 20 },
  mealsOption: { flexDirection: "row", alignItems: "center", backgroundColor: colors.card, borderRadius: radius.lg, borderWidth: 1.5, borderColor: colors.border, padding: spacing.md, gap: 12 },
  mealsOptionActive: { borderColor: colors.primary, backgroundColor: colors.primary + "11" },
  mealsOptionLabel: { fontSize: 15, fontWeight: "700", color: colors.text, marginBottom: 2 },
  mealsOptionLabelActive: { color: colors.primary },
  mealsOptionDesc: { fontSize: 12, color: colors.mutedForeground },
  // candidates
  candidateCard: { flexDirection: "row", alignItems: "center", borderRadius: radius.lg, borderWidth: 1.5, padding: spacing.md, gap: 12 },
  candidateFits: { backgroundColor: "#f0fdf4", borderColor: "#16a34a" },
  candidateWarn: { backgroundColor: "#fffbeb", borderColor: "#f59e0b" },
  candidateTitle: { fontSize: 14, fontWeight: "600", color: colors.text },
  candidateWarning: { fontSize: 12, color: "#b45309", marginTop: 4 },
})
