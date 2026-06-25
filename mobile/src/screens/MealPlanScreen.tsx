import React, { useState, useCallback, useEffect, useRef } from "react"
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Modal, TextInput, BackHandler } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { Ionicons } from "@expo/vector-icons"
import { useNavigation, useFocusEffect } from "@react-navigation/native"
import { useTheme } from "../context/ThemeContext"
import { useAuth } from "../context/AuthContext"
import { useSubscription } from "../context/SubscriptionContext"
import { useGlobalError } from "../context/GlobalErrorContext"
import PaywallModal from "../components/PaywallModal"
import { apiFetch, API_BASE_URL } from "../lib/api"
import { spacing, radius } from "../lib/theme"
import { showAlert } from "../components/CustomAlert"
import DraggableList from "../components/DraggableList"
import IngredientAutocomplete from "../components/IngredientAutocomplete"

let SpeechRecognitionModule: any = null
try {
  const mod = require("expo-speech-recognition")
  SpeechRecognitionModule = mod.ExpoSpeechRecognitionModule
} catch { /* not available in Expo Go */ }

const DIETS = ["none", "vegetarian", "vegan", "ketogenic", "paleo", "gluten free"]
const DIET_LABELS: Record<string, string> = { none: "Any", vegetarian: "Vegetarian", vegan: "Vegan", ketogenic: "Keto", paleo: "Paleo", "gluten free": "Gluten-free" }
const CALORIES = ["1500", "1800", "2000", "2200", "2500", "3000", "3500", "4000", "4500", "5000"]
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

function getChangedDays(original: WeekPlan | null, current: WeekPlan | null): Set<string> {
  if (!original || !current) return new Set()
  const changed = new Set<string>()
  for (const day of Object.keys(current.week)) {
    const origDay = original.week[day]
    const currDay = current.week[day]
    if (!origDay) { changed.add(day); continue }
    if (origDay.meals.length !== currDay.meals.length) { changed.add(day); continue }
    for (let i = 0; i < currDay.meals.length; i++) {
      if (origDay.meals[i]?.id !== currDay.meals[i]?.id) { changed.add(day); break }
    }
  }
  return changed
}

function getChangedMeals(original: WeekPlan | null, current: WeekPlan | null, day: string): Set<number> {
  if (!original || !current) return new Set()
  const origDay = original.week[day]
  const currDay = current.week[day]
  if (!origDay || !currDay) return new Set(currDay?.meals.map((_, i) => i) ?? [])
  const changed = new Set<number>()
  for (let i = 0; i < currDay.meals.length; i++) {
    if (origDay.meals[i]?.id !== currDay.meals[i]?.id) changed.add(i)
  }
  return changed
}

function formatSavedAt(raw: string | undefined | null): string {
  if (!raw) return ""
  const d = new Date(raw)
  if (isNaN(d.getTime())) return raw
  const dd = String(d.getDate()).padStart(2, "0")
  const mm = String(d.getMonth() + 1).padStart(2, "0")
  const yy = String(d.getFullYear()).slice(-2)
  const hh = String(d.getHours()).padStart(2, "0")
  const min = String(d.getMinutes()).padStart(2, "0")
  return `${dd}-${mm}-${yy} ${hh}:${min}`
}

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
type CustomStep = "nutrition" | "diet" | "macros" | "micros" | "meals"

export default function MealPlanScreen() {
  const { colors } = useTheme()
  const { user } = useAuth()
  const { isPremium, isLoading: subLoading } = useSubscription()
  const { showError } = useGlobalError()
  const navigation = useNavigation<any>()
  const s = makeStyles(colors)

  useFocusEffect(useCallback(() => {
    if (!user) { navigation.navigate("Login") }
  }, [user]))

  if (!user) return null

  const [showPaywall, setShowPaywall] = useState(false)
  const [loading, setLoading] = useState(false)
  const [plan, setPlan] = useState<WeekPlan | null>(null)
  const [planId, setPlanId] = useState<string | null>(null)
  const [savedPlanName, setSavedPlanName] = useState<string | null>(null)
  const [originalPlan, setOriginalPlan] = useState<WeekPlan | null>(null)
  const [filtersJson, setFiltersJson] = useState<FiltersJson | null>(null)
  const [isModified, setIsModified] = useState(false)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [showExitGuard, setShowExitGuard] = useState(false)
  const [showNewPlanExitGuard, setShowNewPlanExitGuard] = useState(false)
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

  // saved plans browser
  const [showPlansModal, setShowPlansModal] = useState(false)
  const [planOpenedFromFolder, setPlanOpenedFromFolder] = useState<string | null | undefined>(undefined)
  const [savedPlans, setSavedPlans] = useState<any[]>([])
  const [plansLoading, setPlansLoading] = useState(false)
  const [openFolder, setOpenFolder] = useState<string | null>(null)
  const [folderOrder, setFolderOrder] = useState<string[]>([])
  const [planOrder, setPlanOrder] = useState<Record<string, string[]>>({})
  const [deleteConfirm, setDeleteConfirm] = useState<{ type: "folder"; folder: string } | { type: "plan"; plan: any } | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [showFolderPicker, setShowFolderPicker] = useState(false)
  const [planActions, setPlanActions] = useState<{ plan: any; mode: "move" | "copy" } | null>(null)

  // plan actions modal (replaces Alert.alert three-dots menu)
  const [planActionsModal, setPlanActionsModal] = useState<{ plan: any; step: "menu" | "rename" | "move" | "copy" } | null>(null)
  const [renameValue, setRenameValue] = useState("")
  const [renaming, setRenaming] = useState(false)

  // folder actions modal
  const [folderActionsModal, setFolderActionsModal] = useState<{ folder: string; step: "menu" | "rename" } | null>(null)
  const [folderRenameValue, setFolderRenameValue] = useState("")
  const [folderRenaming, setFolderRenaming] = useState(false)

  const [showCreateOptions, setShowCreateOptions] = useState(false)

  // replace state
  const [replaceDay, setReplaceDay] = useState<string | null>(null) // used for single-meal replace only
  const [replaceMealIndex, setReplaceMealIndex] = useState<number | null>(null)
  const [showReplaceSheet, setShowReplaceSheet] = useState(false)
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

  useEffect(() => {
    if (plan && savedPlans.length === 0 && user?.id) fetchSavedPlans()
  }, [plan])

  const backStateRef = useRef({ plan: null as any, hasUnsavedChanges: false, planId: null as string | null, showPlansModal: false, showSaveModal: false, showMealsModal: false, modalOpen: false, planOpenedFromFolder: undefined as string | null | undefined, showCreateOptions: false, openFolder: null as string | null })
  backStateRef.current = { plan, hasUnsavedChanges, planId, showPlansModal, showSaveModal, showMealsModal, modalOpen, planOpenedFromFolder, showCreateOptions, openFolder }

  useEffect(() => {
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      const { plan, hasUnsavedChanges, planId, showPlansModal, showSaveModal, showMealsModal, modalOpen, planOpenedFromFolder, showCreateOptions, openFolder } = backStateRef.current
      if (showCreateOptions) { setShowCreateOptions(false); return true }
      if (showPlansModal) {
        if (openFolder !== null) setOpenFolder(null)
        else setShowPlansModal(false)
        return true
      }
      if (!plan) return false
      if (showSaveModal || showMealsModal || modalOpen) return false
      if (plan && !planId) {
        setShowNewPlanExitGuard(true)
      } else if (hasUnsavedChanges && planId) {
        setShowExitGuard(true)
      } else {
        if (planOpenedFromFolder !== undefined) {
          setOpenFolder(planOpenedFromFolder)
          setPlanOpenedFromFolder(undefined)
          setShowPlansModal(true)
          setTimeout(() => {
            setPlan(null); setPlanId(null); setOriginalPlan(null)
            setSavedPlanName(null); setHasUnsavedChanges(false)
            setIsModified(false); setExpandedDay(null)
          }, 350)
        } else {
          setPlan(null); setPlanId(null); setOriginalPlan(null)
          setSavedPlanName(null); setHasUnsavedChanges(false)
          setIsModified(false); setExpandedDay(null)
          setPlanOpenedFromFolder(undefined)
        }
      }
      return true
    })
    return () => sub.remove()
  }, [])

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
      const resolvedCalories = p.minCalories ? String(Math.min(5000, Math.max(1500, Math.round(parseInt(p.minCalories) / 100) * 100))) : calories
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
    setModalOpen(false)
    setShowCreateOptions(false)
    setCustomStep("nutrition")
    const filters = buildFiltersJson(params, meals)
    try {
      const urlParams = new URLSearchParams({ targetCalories: params.calories, timeFrame: "week", mealsPerDay: meals })
      if (params.diet !== "none") urlParams.set("diet", params.diet)
      if (params.exclude.trim()) urlParams.set("exclude", params.exclude.trim())
      const res = await apiFetch(`/api/meal-plan/generate?${urlParams.toString()}`, { screen: "Meal Plan" })
      const data = await res.json()
      if (!res.ok) { showError(data.error ?? "Failed to generate meal plan", "Meal Plan"); return }
      setPlan(data)
      setOriginalPlan(data)
      setFiltersJson(filters)
      setIsModified(false)
      setHasUnsavedChanges(false)
      setPlanId(null)
      setSavedPlanName(null)
      setExpandedDay(null)
    } catch (e: any) {
      showError(e?.message ?? "Network error", "Meal Plan")
    } finally { setLoading(false) }
  }, [isPremium, user?.id, showError, cuisine, intolerances, nutrition])

  const handleSavePlan = async () => {
    if (!user?.id || !plan) return
    const folder = saveFolder === "Custom" ? saveFolderCustom.trim() : saveFolder
    if (!saveName.trim()) {
      showAlert({ title: "Name required", message: "Please enter a name for this plan." })
      return
    }
    if (!folder) {
      showAlert({ title: "Folder required", message: "Please select or enter a folder." })
      return
    }
    setSaving(true)
    try {
      const weekStartStr = new Date().toISOString()

      const res = await apiFetch("/api/meal-plan", {
        method: "POST",
        body: JSON.stringify({
          userId: user.id,
          weekStart: weekStartStr,
          planData: plan,
          name: saveName.trim() || null,
          folder: folder || null,
          filtersJson,
        }),
      })
      if (res.ok) {
        const saved = await res.json().catch(() => null)
        if (saved?.plan?.id) setPlanId(saved.plan.id)
        setSavedPlanName(saveName.trim())
        setOriginalPlan(plan)
        setHasUnsavedChanges(false)
        setSaving(false)
        setShowSaveModal(false)
        showAlert({ title: "Saved!", message: `"${saveName.trim()}" saved to "${folder}".`, buttons: [
          {
            text: "View folder", onPress: () => {
              fetchSavedPlans()
              setOpenFolder(folder)
              setShowPlansModal(true)
            }
          },
          { text: "OK", style: "cancel" },
        ]})
        return
      }
      const errData = await res.json().catch(() => null)
      throw new Error(errData?.error ?? `HTTP ${res.status}`)
    } catch (e: any) {
      console.error("Save plan failed:", e?.message)
      showAlert({ title: "Save failed", message: e?.message ?? "Could not save the plan. Please try again." })
    } finally {
      setSaving(false)
    }
  }

  const handleSaveChanges = async () => {
    if (!user?.id || !plan || !planId) return
    setSaving(true)
    try {
      const res = await apiFetch("/api/meal-plan", {
        method: "PATCH",
        body: JSON.stringify({ userId: user.id, planId, planData: plan, isModified: false }),
      })
      if (res.ok) {
        setOriginalPlan(plan)
        setIsModified(false)
        setHasUnsavedChanges(false)
        showAlert({ title: "Saved!", message: "Your changes have been saved." })
      } else {
        showAlert({ title: "Save failed", message: "Could not save changes. Please try again." })
      }
    } catch {
      showAlert({ title: "Save failed", message: "Could not save changes. Please try again." })
    } finally {
      setSaving(false)
    }
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
      setCustomStep("meals")
    } catch { setAiError("Something went wrong. Please try again.") }
    finally { setAiLoading(false) }
  }

  const handleCustomModalBack = () => {
    if (customStep === "nutrition") { setModalOpen(false); setShowCreateOptions(true) }
    else if (customStep === "diet") setCustomStep("nutrition")
    else if (customStep === "macros") setCustomStep("diet")
    else if (customStep === "micros") setCustomStep("macros")
    else if (customStep === "meals") setCustomStep("micros")
  }

  const handleCustomGenerate = () => {
    const params = { calories, diet, exclude }
    setPendingParams(params)
    setMealsPerDay("3")
    setCustomStep("meals")
  }

  // ── Replace full day ──────────────────────────────────────────────────
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

  const confirmReplaceMeal = (candidate: any) => {
    if (!plan || replaceDay === null || replaceMealIndex === null) return
    const dayPlan = plan.week[replaceDay]
    const newMeals = dayPlan.meals.map((m, i) =>
      i === replaceMealIndex ? { id: candidate.id, title: candidate.title, readyInMinutes: candidate.readyInMinutes ?? 0, servings: candidate.servings ?? 1 } : m
    )
    const newPlan = { week: { ...plan.week, [replaceDay]: { ...dayPlan, meals: newMeals } } }
    setPlan(newPlan)
    setIsModified(true)
    setHasUnsavedChanges(true)
    setShowCandidates(false)
    setReplaceCandidates([])
  }

  const fetchSavedPlans = async () => {
    if (!user?.id) return
    setPlansLoading(true)
    try {
      const res = await apiFetch(`/api/meal-plan?userId=${user.id}&isPremium=${isPremium}`, { screen: "Meal Plan" })
      const data = await res.json()
      const plans: any[] = data.plans ?? []
      setSavedPlans(plans)
      const folders = Array.from(new Set(plans.map((p: any) => p.folder ?? "Uncategorised"))) as string[]
      setFolderOrder(prev => {
        const existing = prev.filter(f => folders.includes(f))
        const newFolders = folders.filter(f => !existing.includes(f))
        return [...existing, ...newFolders]
      })
      setPlanOrder(prev => {
        const next: Record<string, string[]> = {}
        for (const folder of folders) {
          const ids = plans.filter((p: any) => (p.folder ?? "Uncategorised") === folder).map((p: any) => p.id)
          const existing = (prev[folder] ?? []).filter((id: string) => ids.includes(id))
          const newIds = ids.filter((id: string) => !existing.includes(id))
          next[folder] = [...existing, ...newIds]
        }
        return next
      })
    } catch { /* non-fatal */ }
    finally { setPlansLoading(false) }
  }

  const handleDeletePlan = async (plan: any) => {
    if (!user?.id) return
    setDeleting(true)
    try {
      await apiFetch("/api/meal-plan", { method: "DELETE", body: JSON.stringify({ userId: user.id, planId: plan.id }) })
      setSavedPlans(prev => prev.filter((p: any) => p.id !== plan.id))
      setPlanOrder(prev => {
        const folder = plan.folder ?? "Uncategorised"
        return { ...prev, [folder]: (prev[folder] ?? []).filter((id: string) => id !== plan.id) }
      })
      if (plan.id === planId) clearPlan()
    } catch { /* non-fatal */ }
    finally { setDeleting(false); setDeleteConfirm(null) }
  }

  const handleDeleteFolder = async (folder: string) => {
    if (!user?.id) return
    setDeleting(true)
    try {
      const plansInFolder = savedPlans.filter((p: any) => (p.folder ?? "Uncategorised") === folder)
      await Promise.all(plansInFolder.map((p: any) =>
        apiFetch("/api/meal-plan", { method: "DELETE", body: JSON.stringify({ userId: user.id, planId: p.id }) })
      ))
      setSavedPlans(prev => prev.filter((p: any) => (p.folder ?? "Uncategorised") !== folder))
      setFolderOrder(prev => prev.filter(f => f !== folder))
      setPlanOrder(prev => { const next = { ...prev }; delete next[folder]; return next })
    } catch { /* non-fatal */ }
    finally { setDeleting(false); setDeleteConfirm(null) }
  }

  const handleMovePlan = async (plan: any, targetFolder: string) => {
    if (!user?.id) return
    try {
      await apiFetch("/api/meal-plan", {
        method: "PATCH",
        body: JSON.stringify({ userId: user.id, planId: plan.id, planData: plan.plan_data, isModified: plan.is_modified ?? false, folder: targetFolder }),
      })
      setSavedPlans(prev => prev.map((p: any) => p.id === plan.id ? { ...p, folder: targetFolder } : p))
      setFolderOrder(prev => prev.includes(targetFolder) ? prev : [...prev, targetFolder])
      setPlanOrder(prev => {
        const oldFolder = plan.folder ?? "Uncategorised"
        const next = { ...prev }
        next[oldFolder] = (next[oldFolder] ?? []).filter((id: string) => id !== plan.id)
        next[targetFolder] = [...(next[targetFolder] ?? []), plan.id]
        return next
      })
    } catch { /* non-fatal */ }
    finally { setPlanActions(null) }
  }

  const handleCopyPlan = async (plan: any, targetFolder: string) => {
    if (!user?.id) return
    try {
      const res = await apiFetch("/api/meal-plan", {
        method: "POST",
        body: JSON.stringify({
          userId: user.id,
          weekStart: new Date().toISOString(),
          planData: plan.plan_data,
          name: `${plan.name ?? "Plan"} (copy)`,
          folder: targetFolder,
          filtersJson: plan.filters_json,
        }),
      })
      if (res.ok) {
        setFolderOrder(prev => prev.includes(targetFolder) ? prev : [...prev, targetFolder])
        fetchSavedPlans()
      }
    } catch { /* non-fatal */ }
    finally { setPlanActions(null) }
  }

  const handleRenamePlan = async (plan: any, newName: string) => {
    if (!user?.id || !newName.trim()) return
    setRenaming(true)
    try {
      await apiFetch("/api/meal-plan", {
        method: "PATCH",
        body: JSON.stringify({ userId: user.id, planId: plan.id, planData: plan.plan_data, isModified: plan.is_modified ?? false, name: newName.trim() }),
      })
      setSavedPlans(prev => prev.map((p: any) => p.id === plan.id ? { ...p, name: newName.trim() } : p))
      setPlanActionsModal(null)
    } catch { /* non-fatal */ }
    finally { setRenaming(false) }
  }

  const handleRenameFolder = async (oldName: string, newName: string) => {
    if (!user?.id || !newName.trim() || newName.trim() === oldName) return
    setFolderRenaming(true)
    try {
      const plansInFolder = savedPlans.filter((p: any) => (p.folder ?? "Uncategorised") === oldName)
      await Promise.all(plansInFolder.map((p: any) =>
        apiFetch("/api/meal-plan", { method: "PATCH", body: JSON.stringify({ userId: user.id, planId: p.id, planData: p.plan_data, isModified: p.is_modified ?? false, folder: newName.trim() }) })
      ))
      setSavedPlans(prev => prev.map((p: any) => (p.folder ?? "Uncategorised") === oldName ? { ...p, folder: newName.trim() } : p))
      setFolderOrder(prev => prev.map(f => f === oldName ? newName.trim() : f))
      setPlanOrder(prev => {
        const next = { ...prev }
        if (next[oldName]) { next[newName.trim()] = next[oldName]; delete next[oldName] }
        return next
      })
      setFolderActionsModal(null)
    } catch { /* non-fatal */ }
    finally { setFolderRenaming(false) }
  }

  const openSaveModal = () => {
    setSaveName("")
    setSaveFolder("")
    setSaveFolderCustom("")
    setShowSaveModal(true)
    if (savedPlans.length === 0) fetchSavedPlans()
  }

  const openSavedPlans = () => {
    setOpenFolder(null)
    setShowPlansModal(true)
    fetchSavedPlans()
  }

  const loadSavedPlan = (savedPlan: any) => {
    setPlanOpenedFromFolder(openFolder) // null = group list, string = inside a group
    setShowPlansModal(false)
    setPlan(savedPlan.plan_data)
    setOriginalPlan(savedPlan.original_plan_data ?? savedPlan.plan_data)
    setPlanId(savedPlan.id)
    setSavedPlanName(savedPlan.name ?? null)
    setFiltersJson(savedPlan.filters_json ?? null)
    setIsModified(savedPlan.is_modified ?? false)
    setHasUnsavedChanges(false)
    setExpandedDay(null)
  }

  const resetPlanState = () => {
    setPlanOpenedFromFolder(undefined)
    setPlan(null)
    setPlanId(null)
    setOriginalPlan(null)
    setSavedPlanName(null)
    setHasUnsavedChanges(false)
    setIsModified(false)
    setExpandedDay(null)
  }

  const doClearPlan = () => {
    if (planOpenedFromFolder !== undefined) {
      setOpenFolder(planOpenedFromFolder)
      setPlanOpenedFromFolder(undefined)
      setShowPlansModal(true)
      setTimeout(() => {
        setPlan(null)
        setPlanId(null)
        setOriginalPlan(null)
        setSavedPlanName(null)
        setHasUnsavedChanges(false)
        setIsModified(false)
        setExpandedDay(null)
      }, 350)
    } else {
      setPlanOpenedFromFolder(undefined)
      setPlan(null)
      setPlanId(null)
      setOriginalPlan(null)
      setSavedPlanName(null)
      setHasUnsavedChanges(false)
      setIsModified(false)
      setExpandedDay(null)
    }
  }

  const clearPlan = () => {
    if (plan && !planId) {
      setShowNewPlanExitGuard(true)
      return
    }
    if (hasUnsavedChanges && planId) {
      setShowExitGuard(true)
      return
    }
    doClearPlan()
  }

  const openPath = (p: Path) => {
    const doOpen = () => {
      resetPlanState()
      setPath(p ?? null)
      setCustomStep("nutrition")
      // keep showCreateOptions true while modal is open — cleared when modal closes or plan generates
      setAiPreset(""); setAiGoal(""); setAiError("")
      if (p !== null) setModalOpen(true)
    }
    if (plan && hasUnsavedChanges && planId) {
      setShowExitGuard(true)
      return
    }
    if (plan) {
      showAlert({ title: "Generate new plan?", message: "Your current plan will be replaced. Save it first?", buttons: [
        { text: "Cancel", style: "cancel" },
        { text: "Save first", onPress: openSaveModal },
        { text: "Discard", style: "destructive", onPress: doOpen },
      ]})
    } else {
      doOpen()
    }
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
      {(plan && !loading) || showCreateOptions ? (
        <View style={s.topBar}>
          {plan && !loading ? (<>
            {/* Left: back arrow */}
            <TouchableOpacity onPress={clearPlan} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="arrow-back" size={24} color={colors.text} />
            </TouchableOpacity>
            {/* Centre: breadcrumb */}
            <Text style={s.topBarTitle} numberOfLines={1}>
              {planOpenedFromFolder
                ? `Saved Plans · ${planOpenedFromFolder} · ${savedPlanName ?? "Unsaved"}`
                : savedPlanName
                  ? `Saved Plans · ${savedPlanName}`
                  : "New Plan"}
            </Text>
            {/* Right: actions */}
            <View style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
              {!planId && (
                <TouchableOpacity style={s.regenBtn} onPress={openSaveModal}>
                  <Ionicons name="bookmark-outline" size={16} color={colors.primary} />
                  <Text style={s.regenBtnText}>Save</Text>
                </TouchableOpacity>
              )}
              {planId && hasUnsavedChanges && (
                <TouchableOpacity style={[s.regenBtn, { borderColor: "#f59e0b" }]} onPress={handleSaveChanges} disabled={saving}>
                  {saving ? <ActivityIndicator size="small" color="#f59e0b" /> : <>
                    <Ionicons name="cloud-upload-outline" size={16} color="#f59e0b" />
                    <Text style={[s.regenBtnText, { color: "#f59e0b" }]}>Save changes</Text>
                  </>}
                </TouchableOpacity>
              )}
              {planId && (
                <TouchableOpacity
                  onPress={() => {
                    setRenameValue(savedPlanName ?? "")
                    setPlanActionsModal({ plan: { id: planId, name: savedPlanName, plan_data: plan, filters_json: filtersJson, is_modified: isModified }, step: "menu" })
                  }}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons name="ellipsis-vertical" size={20} color={colors.text} />
                </TouchableOpacity>
              )}
            </View>
          </>) : (<>
            <TouchableOpacity onPress={() => setShowCreateOptions(false)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="arrow-back" size={24} color={colors.text} />
            </TouchableOpacity>
            <Text style={s.topBarTitle}>Create Plan</Text>
            <View style={{ width: 24 }} />
          </>)}
        </View>
      ) : null}

      {/* Home */}
      {!plan && !loading && !showCreateOptions && (
        <View style={s.homeContent}>
          <TouchableOpacity style={s.bigBtn} onPress={() => setShowCreateOptions(true)} activeOpacity={0.85}>
            <Ionicons name="add-circle-outline" size={28} color="#fff" />
            <Text style={s.bigBtnText}>Create Plan</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[s.bigBtn, s.bigBtnSecondary]} onPress={openSavedPlans} activeOpacity={0.85}>
            <Ionicons name="folder-open-outline" size={28} color={colors.primary} />
            <Text style={[s.bigBtnText, { color: colors.primary }]}>Browse Saved Plans</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Create Plan options */}
      {!plan && !loading && showCreateOptions && (
        <ScrollView contentContainerStyle={s.homeContent}>
          <Text style={s.homeSub}>Choose how you want to build your plan.</Text>
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
      {plan && !loading && (<>
        <ScrollView contentContainerStyle={{ padding: spacing.md, gap: 10 }}>

          {/* Plan modified banner */}
          {isModified && (
            <TouchableOpacity style={[s.driftBanner, { marginBottom: 36, backgroundColor: "#f0fdf4", borderColor: "#16a34a55" }]} onPress={() => {
              const summary = filtersJson ? `${filtersJson.calories} kcal · ${filtersJson.diet !== "none" ? filtersJson.diet : "any diet"} · ${filtersJson.mealsPerDay} meals/day` : "your original filters"
              showAlert({ title: "Plan modified", message: `Some meals have been swapped. All replacements still match ${summary}.` })
            }}>
              <Ionicons name="checkmark-circle" size={16} color="#16a34a" />
              <Text style={[s.driftText, { color: "#166534" }]}>Plan modified — all changes within original filters</Text>
            </TouchableOpacity>
          )}

          {DAY_NAMES.map(day => {
            const key = day.toLowerCase()
            const dayPlan = plan.week[key]
            if (!dayPlan) return null
            const isExpanded = expandedDay === day
            const changedDays = getChangedDays(originalPlan, plan)
            const isDayChanged = changedDays.has(key)
            const changedMeals = getChangedMeals(originalPlan, plan, key)
            return (
              <View key={day} style={s.dayCard}>
                <TouchableOpacity style={s.dayHeader} onPress={() => setExpandedDay(isExpanded ? null : day)} activeOpacity={0.8}>
                  <Text style={s.dayName}>{day}</Text>
                  {isDayChanged && (
                    <Ionicons name="checkmark-circle" size={14} color="#16a34a" style={{ marginLeft: 4, marginRight: 2 }} />
                  )}
                  <View style={s.dayNutrients}>
                    <Text style={s.nutrientText}>{Math.round(dayPlan.nutrients.calories)} cal</Text>
                    <Text style={s.nutrientDot}>·</Text>
                    <Text style={s.nutrientText}>{Math.round(dayPlan.nutrients.protein)}g protein</Text>
                  </View>
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
                        {changedMeals.has(i) && (
                          <Ionicons name="checkmark-circle" size={14} color="#16a34a" style={{ marginRight: 4 }} />
                        )}
                        {/* Replace meal button */}
                        {filtersJson && (
                          <TouchableOpacity style={s.replaceMealBtn} onPress={() => {
                            setReplaceDay(key)
                            setReplaceMealIndex(i)
                            showAlert({ title: "Replace Meal", message: `Find an alternative for "${meal.title}" that fits your daily nutrition budget?`, buttons: [
                              { text: "Cancel", style: "cancel" },
                              { text: "Find alternatives", onPress: () => handleReplaceMeal(key, i) },
                            ]})
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
      </> )}

      {/* ── Modal — AI path ─────────────────────────────────────────── */}
      <Modal visible={modalOpen && path === "ai"} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => { if (customStep === "meals") setCustomStep("nutrition"); else { setModalOpen(false); setShowCreateOptions(true) } }}>
        <SafeAreaView style={s.modalContainer} edges={["top"]}>
          <View style={s.modalHeader}>
            <TouchableOpacity onPress={() => { if (customStep === "meals") setCustomStep("nutrition"); else { setModalOpen(false); setShowCreateOptions(true) } }}><Ionicons name="arrow-back" size={24} color={colors.text} /></TouchableOpacity>
            <Text style={s.modalTitle}>{customStep === "meals" ? "Meals per Day" : "AI Goal"}</Text>
            <View style={{ width: 24 }} />
          </View>
          {customStep !== "meals" ? (<>
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
          </>) : (<>
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
          </>)}
        </SafeAreaView>
      </Modal>

      {/* ── Modal — Custom path ──────────────────────────────────────── */}
      <Modal visible={modalOpen && path === "custom"} animationType="slide" presentationStyle="pageSheet" onRequestClose={handleCustomModalBack}>
        <SafeAreaView style={s.modalContainer} edges={["top"]}>
          <View style={s.modalHeader}>
            <TouchableOpacity onPress={() => {
              if (customStep === "nutrition") { setModalOpen(false); setShowCreateOptions(true) }
              else if (customStep === "diet") setCustomStep("nutrition")
              else if (customStep === "macros") setCustomStep("diet")
              else if (customStep === "micros") setCustomStep("macros")
              else if (customStep === "meals") setCustomStep("micros")
            }}>
              <Ionicons name="arrow-back" size={24} color={colors.text} />
            </TouchableOpacity>
            <Text style={s.modalTitle}>
              {customStep === "nutrition" ? "Nutrition" : customStep === "diet" ? "Diet & Cuisine" : customStep === "macros" ? "Macronutrients" : customStep === "micros" ? "Micronutrients" : "Meals per Day"}
            </Text>
            <Text style={s.stepIndicator}>
              {customStep === "nutrition" ? "1/5" : customStep === "diet" ? "2/5" : customStep === "macros" ? "3/5" : customStep === "micros" ? "4/5" : "5/5"}
            </Text>
          </View>
          <ScrollView contentContainerStyle={{ paddingVertical: spacing.md, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
            {customStep === "nutrition" && (
              <>
                <DropdownRow label="Daily Calories" pickerId="calories" value={calories} displayValue={`${calories} kcal`} options={CALORIES.map(c => ({ value: c, label: `${c} kcal` }))} onSelect={setCalories} />
                <View style={{ paddingHorizontal: spacing.md, paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border }}>
                  <Text style={[s.dropdownLabel, { marginBottom: 8 }]}>Exclude Ingredients</Text>
                  <IngredientAutocomplete
                    onSelect={(name) => {
                      const parts = exclude.split(",").map(p => p.trim()).filter(Boolean)
                      if (!parts.includes(name)) setExclude([...parts, name].join(", "))
                    }}
                    placeholder="Search ingredient to exclude..."
                  />
                  {exclude.trim() ? (
                    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 10 }}>
                      {exclude.split(",").map(p => p.trim()).filter(Boolean).map(ing => (
                        <TouchableOpacity
                          key={ing}
                          style={{ flexDirection: "row", alignItems: "center", backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: 99, paddingHorizontal: 10, paddingVertical: 5 }}
                          onPress={() => {
                            const parts = exclude.split(",").map(p => p.trim()).filter(p => p !== ing)
                            setExclude(parts.join(", "))
                          }}
                        >
                          <Text style={{ fontSize: 13, color: colors.text }}>{ing}</Text>
                          <Ionicons name="close" size={12} color={colors.muted} style={{ marginLeft: 4 }} />
                        </TouchableOpacity>
                      ))}
                    </View>
                  ) : null}
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
            {customStep === "meals" && (
              <View style={{ padding: spacing.md, gap: 10, marginTop: 8 }}>
                <Text style={s.aiIntro}>How many meals a day would you like?</Text>
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
            )}
          </ScrollView>
          <View style={s.modalFooter}>
            {customStep === "nutrition" && <TouchableOpacity style={s.generateBtnLarge} onPress={() => setCustomStep("diet")}><Text style={s.generateBtnText}>Next →</Text></TouchableOpacity>}
            {customStep === "diet" && <TouchableOpacity style={s.generateBtnLarge} onPress={() => setCustomStep("macros")}><Text style={s.generateBtnText}>Next →</Text></TouchableOpacity>}
            {customStep === "macros" && <TouchableOpacity style={s.generateBtnLarge} onPress={() => setCustomStep("micros")}><Text style={s.generateBtnText}>Next →</Text></TouchableOpacity>}
            {customStep === "micros" && <TouchableOpacity style={s.generateBtnLarge} onPress={handleCustomGenerate}><Text style={s.generateBtnText}>Next →</Text></TouchableOpacity>}
            {customStep === "meals" && <TouchableOpacity style={s.generateBtnLarge} onPress={() => pendingParams && generatePlan(pendingParams, mealsPerDay)}><View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}><Ionicons name="sparkles" size={18} color="#fff" /><Text style={s.generateBtnText}>Generate Plan</Text></View></TouchableOpacity>}
          </View>
        </SafeAreaView>
      </Modal>

      {/* ── Save plan modal ──────────────────────────────────────────── */}
      <Modal visible={showSaveModal} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowSaveModal(false)}>
        <SafeAreaView style={s.modalContainer} edges={["top"]}>
          <View style={s.modalHeader}>
            <TouchableOpacity onPress={() => setShowSaveModal(false)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="arrow-back" size={24} color={colors.text} />
            </TouchableOpacity>
            <Text style={s.modalTitle}>Save Plan</Text>
            <View style={{ width: 24 }} />
          </View>
          <ScrollView contentContainerStyle={{ padding: spacing.md, gap: 20 }} keyboardShouldPersistTaps="handled">
            <Text style={s.aiIntro}>Give this plan a name and assign it to a folder.</Text>
            <View>
              <Text style={s.settingLabel}>Plan name <Text style={{ color: colors.destructive }}>*</Text></Text>
              <TextInput style={s.textField} value={saveName} onChangeText={setSaveName} placeholder="e.g. Bulk Week 1, Cut Phase..." placeholderTextColor={colors.muted} />
            </View>
            <View>
              <Text style={s.settingLabel}>Folder <Text style={{ color: colors.destructive }}>*</Text></Text>
              {/* Existing folders */}
              {folderOrder.length > 0 && (
                <TouchableOpacity
                  style={[s.textField, { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }]}
                  onPress={() => setShowFolderPicker(true)}
                  activeOpacity={0.8}
                >
                  <Text style={{ color: saveFolder && !SUGGESTED_FOLDERS.includes(saveFolder) && saveFolder !== "Custom" ? colors.text : colors.muted, fontSize: 15 }}>
                    {saveFolder && !SUGGESTED_FOLDERS.includes(saveFolder) && saveFolder !== "Custom"
                      ? saveFolder
                      : "Choose an existing folder…"}
                  </Text>
                  <Ionicons name="chevron-down" size={16} color={colors.muted} />
                </TouchableOpacity>
              )}
              {/* New folder chips */}
              <Text style={[s.settingLabel, { fontSize: 12, marginBottom: 6 }]}>Or create new</Text>
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

      {/* ── Existing folder picker (from save modal) ───────────────── */}
      <Modal visible={showFolderPicker} transparent animationType="slide" onRequestClose={() => setShowFolderPicker(false)}>
        <View style={{ flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.45)" }}>
          <View style={[s.modalContainer, { borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingBottom: 32, maxHeight: "70%" }]}>
            <View style={[s.modalHeader, { borderBottomWidth: 1, borderBottomColor: colors.border }]}>
              <View style={{ width: 24 }} />
              <Text style={s.modalTitle}>Choose Folder</Text>
              <TouchableOpacity onPress={() => setShowFolderPicker(false)}>
                <Ionicons name="close" size={22} color={colors.text} />
              </TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={{ padding: spacing.md, gap: 10 }}>
              {folderOrder.map(folder => (
                <TouchableOpacity
                  key={folder}
                  style={[s.folderCard, saveFolder === folder && { borderColor: colors.primary, borderWidth: 2 }]}
                  onPress={() => { setSaveFolder(folder); setShowFolderPicker(false) }}
                  activeOpacity={0.8}
                >
                  <View style={[s.pathIconBg, { backgroundColor: colors.primary + "22", width: 40, height: 40, borderRadius: 10 }]}>
                    <Ionicons name="folder" size={20} color={colors.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.folderName}>{folder}</Text>
                    <Text style={s.folderCount}>
                      {savedPlans.filter((p: any) => (p.folder ?? "Uncategorised") === folder).length} plan{savedPlans.filter((p: any) => (p.folder ?? "Uncategorised") === folder).length !== 1 ? "s" : ""}
                    </Text>
                  </View>
                  {saveFolder === folder && <Ionicons name="checkmark-circle" size={22} color={colors.primary} />}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
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
                <Text style={s.aiIntro}>All options below match your original plan filters. Tap one to swap it in.</Text>
                {replaceCandidates.map((c, i) => (
                  <TouchableOpacity key={c.id ?? i} style={[s.candidateCard, s.candidateFits]} onPress={() => confirmReplaceMeal(c)} activeOpacity={0.8}>
                    <View style={{ flex: 1 }}>
                      <Text style={s.candidateTitle} numberOfLines={2}>{c.title}</Text>
                      <Text style={{ fontSize: 12, color: "#166534", marginTop: 3 }}>Within your original filters</Text>
                    </View>
                    <Ionicons name="checkmark-circle" size={20} color="#16a34a" />
                  </TouchableOpacity>
                ))}
              </>
            )}
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* ── Saved Plans browser ─────────────────────────────────── */}
      {showPlansModal && (
          <SafeAreaView style={[s.modalContainer, { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, zIndex: 10 }]} edges={["top"]}>
            <View style={s.modalHeader}>
              <TouchableOpacity onPress={() => {
                if (openFolder !== null) setOpenFolder(null)
                else setShowPlansModal(false)
              }}>
                <Ionicons name="arrow-back" size={24} color={colors.text} />
              </TouchableOpacity>
              <Text style={s.modalTitle}>{openFolder ? `Group: ${openFolder}` : "Saved Plans Groups"}</Text>
              <View style={{ width: 24 }} />
            </View>

            {plansLoading ? (
              <View style={s.center}><ActivityIndicator size="large" color={colors.primary} /></View>
            ) : savedPlans.length === 0 ? (
              <View style={s.center}>
                <Ionicons name="folder-open-outline" size={52} color={colors.muted} />
                <Text style={{ color: colors.mutedForeground, fontSize: 15, marginTop: 12 }}>No saved plans yet</Text>
                <Text style={{ color: colors.muted, fontSize: 13, marginTop: 6 }}>Generate a plan and tap Save to keep it here.</Text>
              </View>
            ) : openFolder === null ? (
              // Draggable folder list — drag to reorder
              <ScrollView contentContainerStyle={{ padding: spacing.md }}>
                <DraggableList
                  data={folderOrder}
                  keyExtractor={(folder) => folder}
                  itemHeight={90}
                  onReorder={setFolderOrder}
                  renderItem={(folder, _, isDragging) => {
                    const count = savedPlans.filter((p: any) => (p.folder ?? "Uncategorised") === folder).length
                    return (
                      <View style={{ paddingBottom: 18 }}>
                        <TouchableOpacity
                          style={[s.folderCard, isDragging && { elevation: 8, opacity: 0.92 }]}
                          onPress={() => setOpenFolder(folder)}
                          activeOpacity={0.8}
                        >
                          <View style={[s.pathIconBg, { backgroundColor: colors.primary + "22", width: 44, height: 44, borderRadius: 12 }]}>
                            <Ionicons name="folder" size={22} color={colors.primary} />
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={s.folderName}>{folder}</Text>
                            <Text style={s.folderCount}>{count} plan{count !== 1 ? "s" : ""}</Text>
                          </View>
                          <TouchableOpacity
                            onPress={() => { setFolderRenameValue(folder); setFolderActionsModal({ folder, step: "menu" }) }}
                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                            style={{ padding: 4 }}
                          >
                            <Ionicons name="ellipsis-vertical" size={18} color={colors.muted} />
                          </TouchableOpacity>
                        </TouchableOpacity>
                      </View>
                    )
                  }}
                />
              </ScrollView>
            ) : (
              // Draggable plans inside a folder — drag to reorder
              <ScrollView contentContainerStyle={{ padding: spacing.md }}>
                <Text style={[s.settingLabel, { marginBottom: spacing.md }]}>Plans:</Text>
                <DraggableList
                  data={(planOrder[openFolder] ?? []).map((id: string) => savedPlans.find((p: any) => p.id === id)).filter(Boolean) as any[]}
                  keyExtractor={(item: any) => item.id}
                  itemHeight={106}
                  onReorder={(newData: any[]) => setPlanOrder(prev => ({ ...prev, [openFolder!]: newData.map((p: any) => p.id) }))}
                  renderItem={(savedPlan: any, _, isDragging) => {
                    const filters = savedPlan.filters_json
                    const subtitle = filters
                      ? `${filters.calories ?? "?"} kcal · ${filters.mealsPerDay ?? 3} meals/day · ${filters.diet !== "none" && filters.diet ? filters.diet : "any diet"}`
                      : ""
                    return (
                      <View style={{ paddingBottom: 18 }}>
                        <TouchableOpacity
                          style={[s.planCard, isDragging && { elevation: 8, opacity: 0.92 }]}
                          onPress={() => loadSavedPlan(savedPlan)}
                          activeOpacity={0.8}
                        >
                          <View style={{ flex: 1 }}>
                            <Text style={s.planName}>{savedPlan.name ?? "Unnamed plan"}</Text>
                            {!!subtitle && <Text style={s.planSubtitle}>{subtitle}</Text>}
                            <Text style={s.planDate}>{formatSavedAt(savedPlan.created_at)}</Text>
                          </View>
                          {savedPlan.is_modified && (
                            <View style={s.modifiedBadge}>
                              <Text style={s.modifiedBadgeText}>Modified</Text>
                            </View>
                          )}
                          <TouchableOpacity
                            onPress={() => { setRenameValue(savedPlan.name ?? ""); setPlanActionsModal({ plan: savedPlan, step: "menu" }) }}
                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                            style={{ padding: 4, marginRight: 2 }}
                          >
                            <Ionicons name="ellipsis-vertical" size={18} color={colors.muted} />
                          </TouchableOpacity>
                        </TouchableOpacity>
                      </View>
                    )
                  }}
                />
              </ScrollView>
            )}
            {/* Folder actions modal — menu / rename */}
            <Modal visible={!!folderActionsModal} transparent animationType="slide">
              <TouchableOpacity style={{ flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.75)" }} activeOpacity={1} onPress={() => setFolderActionsModal(null)}>
                <TouchableOpacity activeOpacity={1} style={[s.modalContainer, { borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingBottom: 32, maxHeight: "70%", flex: 0 }]}>
                  <View style={[s.modalHeader, { borderBottomWidth: 1, borderBottomColor: colors.border }]}>
                    {folderActionsModal?.step === "rename" ? (
                      <TouchableOpacity onPress={() => setFolderActionsModal(m => m ? { ...m, step: "menu" } : null)}>
                        <Ionicons name="arrow-back" size={22} color={colors.text} />
                      </TouchableOpacity>
                    ) : (
                      <View style={{ width: 22 }} />
                    )}
                    <Text style={s.modalTitle}>
                      {folderActionsModal?.step === "rename" ? "Rename group" : folderActionsModal?.folder ?? "Group"}
                    </Text>
                    <View style={{ width: 22 }} />
                  </View>

                  {folderActionsModal?.step === "menu" && (
                    <View style={{ padding: spacing.md, gap: 10 }}>
                      <TouchableOpacity
                        style={s.actionMenuItem}
                        onPress={() => setFolderActionsModal(m => m ? { ...m, step: "rename" } : null)}
                        activeOpacity={0.8}
                      >
                        <Ionicons name="pencil-outline" size={20} color={colors.text} />
                        <Text style={s.actionMenuLabel}>Rename</Text>
                        <Ionicons name="chevron-forward" size={18} color={colors.muted} />
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[s.actionMenuItem, { borderColor: colors.destructive + "55" }]}
                        onPress={() => { setFolderActionsModal(null); setDeleteConfirm({ type: "folder", folder: folderActionsModal!.folder }) }}
                        activeOpacity={0.8}
                      >
                        <Ionicons name="trash-outline" size={20} color={colors.destructive} />
                        <Text style={[s.actionMenuLabel, { color: colors.destructive }]}>Delete</Text>
                        <Ionicons name="chevron-forward" size={18} color={colors.destructive + "88"} />
                      </TouchableOpacity>
                    </View>
                  )}

                  {folderActionsModal?.step === "rename" && (
                    <View style={{ padding: spacing.md, gap: 16 }}>
                      <TextInput
                        style={s.textField}
                        value={folderRenameValue}
                        onChangeText={setFolderRenameValue}
                        placeholder="Group name..."
                        placeholderTextColor={colors.muted}
                        autoFocus
                      />
                      <TouchableOpacity
                        style={[s.generateBtnLarge, (!folderRenameValue.trim() || folderRenaming) && s.btnDisabled]}
                        onPress={() => folderActionsModal && handleRenameFolder(folderActionsModal.folder, folderRenameValue)}
                        disabled={!folderRenameValue.trim() || folderRenaming}
                      >
                        {folderRenaming ? <ActivityIndicator color="#fff" /> : <Text style={s.generateBtnText}>Save</Text>}
                      </TouchableOpacity>
                    </View>
                  )}
                </TouchableOpacity>
              </TouchableOpacity>
            </Modal>

            {/* Delete confirmation */}
            <Modal visible={!!deleteConfirm} transparent animationType="fade">
              <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "center", alignItems: "center", padding: spacing.lg }}>
                <View style={{
                  backgroundColor: colors.background,
                  borderRadius: 16,
                  borderWidth: 1.5,
                  borderColor: colors.border,
                  padding: spacing.lg,
                  width: "100%",
                  maxWidth: 320,
                  shadowColor: "#000",
                  shadowOpacity: 0.3,
                  shadowRadius: 16,
                  elevation: 12,
                }}>
                  <Text style={{ color: colors.text, fontSize: 17, fontWeight: "700", textAlign: "center", marginBottom: 8 }}>
                    {deleteConfirm?.type === "folder" ? "Delete folder?" : "Delete plan?"}
                  </Text>
                  <Text style={{ color: colors.mutedForeground, textAlign: "center", fontSize: 14, marginBottom: 24, lineHeight: 20 }}>
                    {deleteConfirm?.type === "folder"
                      ? `"${deleteConfirm.folder}" and all its plans will be permanently deleted.`
                      : `"${deleteConfirm?.plan?.name ?? "This plan"}" will be permanently deleted.`}
                  </Text>
                  <View style={{ flexDirection: "row", gap: 10 }}>
                    <TouchableOpacity
                      style={[s.generateBtnLarge, { flex: 1, backgroundColor: "transparent", borderWidth: 1.5, borderColor: colors.border }]}
                      onPress={() => setDeleteConfirm(null)}
                      disabled={deleting}
                    >
                      <Text style={[s.generateBtnText, { color: colors.text }]}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[s.generateBtnLarge, { flex: 1, backgroundColor: colors.destructive }]}
                      onPress={() => {
                        if (!deleteConfirm) return
                        if (deleteConfirm.type === "folder") handleDeleteFolder(deleteConfirm.folder)
                        else handleDeletePlan(deleteConfirm.plan)
                      }}
                      disabled={deleting}
                    >
                      {deleting ? <ActivityIndicator color="#fff" size="small" /> : <Text style={s.generateBtnText}>Delete</Text>}
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            </Modal>
          </SafeAreaView>
      )}

      {/* ── Plan actions modal — menu / rename / move / copy ─────────── */}
      <Modal visible={!!planActionsModal} transparent animationType="slide">
        <TouchableOpacity style={{ flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.75)" }} activeOpacity={1} onPress={() => setPlanActionsModal(null)}>
          <TouchableOpacity activeOpacity={1} style={[s.modalContainer, { borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingBottom: 32, maxHeight: "70%", flex: 0 }]}>
            <View style={[s.modalHeader, { borderBottomWidth: 1, borderBottomColor: colors.border }]}>
              {planActionsModal?.step !== "menu" ? (
                <TouchableOpacity onPress={() => setPlanActionsModal(m => m ? { ...m, step: "menu" } : null)}>
                  <Ionicons name="arrow-back" size={22} color={colors.text} />
                </TouchableOpacity>
              ) : (
                <View style={{ width: 22 }} />
              )}
              <Text style={s.modalTitle}>
                {planActionsModal?.step === "rename" ? "Rename" : planActionsModal?.step === "move" ? "Move to group" : planActionsModal?.step === "copy" ? "Copy to group" : planActionsModal?.plan?.name ?? "Plan"}
              </Text>
              <View style={{ width: 22 }} />
            </View>

            {/* Menu step */}
            {planActionsModal?.step === "menu" && (
              <View style={{ padding: spacing.md, gap: 10 }}>
                <TouchableOpacity style={s.actionMenuItem} onPress={() => setPlanActionsModal(m => m ? { ...m, step: "rename" } : null)} activeOpacity={0.8}>
                  <Ionicons name="pencil-outline" size={20} color={colors.text} />
                  <Text style={s.actionMenuLabel}>Rename</Text>
                  <Ionicons name="chevron-forward" size={18} color={colors.muted} />
                </TouchableOpacity>
                <TouchableOpacity style={s.actionMenuItem} onPress={() => setPlanActionsModal(m => m ? { ...m, step: "copy" } : null)} activeOpacity={0.8}>
                  <Ionicons name="copy-outline" size={20} color={colors.text} />
                  <Text style={s.actionMenuLabel}>Copy to group</Text>
                  <Ionicons name="chevron-forward" size={18} color={colors.muted} />
                </TouchableOpacity>
                <TouchableOpacity style={s.actionMenuItem} onPress={() => setPlanActionsModal(m => m ? { ...m, step: "move" } : null)} activeOpacity={0.8}>
                  <Ionicons name="arrow-redo-outline" size={20} color={colors.text} />
                  <Text style={s.actionMenuLabel}>Move to group</Text>
                  <Ionicons name="chevron-forward" size={18} color={colors.muted} />
                </TouchableOpacity>
                <TouchableOpacity style={[s.actionMenuItem, { borderColor: colors.destructive + "55" }]} onPress={() => { const p = planActionsModal?.plan; setPlanActionsModal(null); setDeleteConfirm({ type: "plan", plan: p }) }} activeOpacity={0.8}>
                  <Ionicons name="trash-outline" size={20} color={colors.destructive} />
                  <Text style={[s.actionMenuLabel, { color: colors.destructive }]}>Delete</Text>
                  <Ionicons name="chevron-forward" size={18} color={colors.destructive + "88"} />
                </TouchableOpacity>
              </View>
            )}

            {/* Rename step */}
            {planActionsModal?.step === "rename" && (
              <View style={{ padding: spacing.md, gap: 16 }}>
                <TextInput style={s.textField} value={renameValue} onChangeText={setRenameValue} placeholder="Plan name..." placeholderTextColor={colors.muted} autoFocus />
                <TouchableOpacity style={[s.generateBtnLarge, (!renameValue.trim() || renaming) && s.btnDisabled]} onPress={() => planActionsModal && handleRenamePlan(planActionsModal.plan, renameValue)} disabled={!renameValue.trim() || renaming}>
                  {renaming ? <ActivityIndicator color="#fff" /> : <Text style={s.generateBtnText}>Save</Text>}
                </TouchableOpacity>
              </View>
            )}

            {/* Move / Copy step */}
            {(planActionsModal?.step === "move" || planActionsModal?.step === "copy") && (
              <ScrollView contentContainerStyle={{ padding: spacing.md, gap: 10 }}>
                {folderOrder
                  .filter(f => planActionsModal.step === "copy" || f !== (planActionsModal.plan?.folder ?? "Uncategorised"))
                  .map(folder => (
                    <TouchableOpacity key={folder} style={s.folderCard} onPress={() => { if (!planActionsModal) return; planActionsModal.step === "move" ? handleMovePlan(planActionsModal.plan, folder) : handleCopyPlan(planActionsModal.plan, folder); setPlanActionsModal(null) }} activeOpacity={0.8}>
                      <View style={[s.pathIconBg, { backgroundColor: colors.primary + "22", width: 40, height: 40, borderRadius: 10 }]}>
                        <Ionicons name="folder" size={20} color={colors.primary} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={s.folderName}>{folder}</Text>
                        <Text style={s.folderCount}>{savedPlans.filter((p: any) => (p.folder ?? "Uncategorised") === folder).length} plan{savedPlans.filter((p: any) => (p.folder ?? "Uncategorised") === folder).length !== 1 ? "s" : ""}</Text>
                      </View>
                      <Ionicons name="chevron-forward" size={18} color={colors.muted} />
                    </TouchableOpacity>
                  ))}
              </ScrollView>
            )}
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* ── Exit guard modal ────────────────────────────────────────── */}
      <Modal visible={showExitGuard} transparent animationType="fade" onRequestClose={() => setShowExitGuard(false)}>
        <TouchableOpacity style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.88)", justifyContent: "center", alignItems: "center", padding: spacing.lg }} activeOpacity={1} onPress={() => setShowExitGuard(false)}>
          <TouchableOpacity activeOpacity={1} onPress={e => e.stopPropagation()} style={{
            backgroundColor: colors.background,
            borderRadius: 16,
            borderWidth: 1.5,
            borderColor: colors.border,
            padding: spacing.lg,
            width: "100%",
            maxWidth: 320,
            shadowColor: "#000",
            shadowOpacity: 0.3,
            shadowRadius: 16,
            elevation: 12,
            gap: 10,
          }}>
            <Text style={{ color: colors.text, fontSize: 17, fontWeight: "700", textAlign: "center", marginBottom: 4 }}>Unsaved changes</Text>
            <Text style={{ color: colors.mutedForeground, textAlign: "center", fontSize: 14, marginBottom: 8, lineHeight: 20 }}>
              {`You made changes to "${savedPlanName ?? "this plan"}". Save before leaving?`}
            </Text>
            <TouchableOpacity
              style={s.generateBtnLarge}
              onPress={async () => { setShowExitGuard(false); await handleSaveChanges() }}
              disabled={saving}
            >
              {saving ? <ActivityIndicator color="#fff" /> : <Text style={s.generateBtnText}>Save changes</Text>}
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.generateBtnLarge, { backgroundColor: "transparent", borderWidth: 1.5, borderColor: colors.destructive }]}
              onPress={() => { setShowExitGuard(false); doClearPlan() }}
            >
              <Text style={[s.generateBtnText, { color: colors.destructive }]}>Discard & leave</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* ── New plan exit guard (unsaved, no planId) ────────────────── */}
      <Modal visible={showNewPlanExitGuard} transparent animationType="fade" onRequestClose={() => setShowNewPlanExitGuard(false)}>
        <TouchableOpacity style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.88)", justifyContent: "center", alignItems: "center", padding: spacing.lg }} activeOpacity={1} onPress={() => setShowNewPlanExitGuard(false)}>
          <TouchableOpacity activeOpacity={1} onPress={e => e.stopPropagation()} style={{
            backgroundColor: colors.background,
            borderRadius: 16,
            borderWidth: 1.5,
            borderColor: colors.border,
            padding: spacing.lg,
            width: "100%",
            maxWidth: 320,
            shadowColor: "#000",
            shadowOpacity: 0.3,
            shadowRadius: 16,
            elevation: 12,
            gap: 10,
          }}>
            <Text style={{ color: colors.text, fontSize: 17, fontWeight: "700", textAlign: "center", marginBottom: 4 }}>Plan not saved</Text>
            <Text style={{ color: colors.mutedForeground, textAlign: "center", fontSize: 14, marginBottom: 8, lineHeight: 20 }}>
              {"You haven't saved this plan yet. Save it before leaving or discard it?"}
            </Text>
            <TouchableOpacity
              style={s.generateBtnLarge}
              onPress={() => { setShowNewPlanExitGuard(false); openSaveModal() }}
            >
              <Text style={s.generateBtnText}>Save plan</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.generateBtnLarge, { backgroundColor: "transparent", borderWidth: 1.5, borderColor: colors.destructive }]}
              onPress={() => { setShowNewPlanExitGuard(false); doClearPlan() }}
            >
              <Text style={[s.generateBtnText, { color: colors.destructive }]}>Discard & leave</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      <PaywallModal visible={showPaywall} onClose={() => setShowPaywall(false)} featureName="Meal Planner" />
    </SafeAreaView>
  )
}

const makeStyles = (colors: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  topBar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: spacing.md, borderBottomWidth: 1.5, borderBottomColor: "rgba(255,255,255,0.4)" },
  topBarCenter: { flexDirection: "row", alignItems: "center", gap: 8, flex: 1, justifyContent: "center" },
  title: { fontSize: 20, fontWeight: "700", color: colors.text },
  topBarTitle: { flex: 1, fontSize: 17, fontWeight: "700", color: colors.text, textAlign: "center", marginHorizontal: 8 },
  regenBtn: { flexDirection: "row", alignItems: "center", gap: 6, borderWidth: 1, borderColor: colors.primary, borderRadius: radius.md, paddingHorizontal: 12, paddingVertical: 7 },
  regenBtnText: { color: colors.primary, fontWeight: "600", fontSize: 13 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, padding: spacing.xl },
  emptyEmoji: { fontSize: 48 },
  emptySubText: { fontSize: 14, color: colors.mutedForeground },
  homeContent: { flex: 1, padding: spacing.md, paddingTop: 48, gap: 16 },
  homeTitle: { fontSize: 26, fontWeight: "800", color: colors.text },
  homeSub: { fontSize: 14, color: colors.mutedForeground, lineHeight: 20, marginTop: -8 },
  homeSection: { gap: 12 },
  homeSectionLabel: { fontSize: 11, fontWeight: "800", color: colors.mutedForeground, textTransform: "uppercase", letterSpacing: 1.2 },
  homeDivider: { height: 1, backgroundColor: colors.border, marginVertical: 4 },
  bigBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 12, backgroundColor: colors.primary, borderRadius: radius.lg, paddingVertical: 18 },
  bigBtnSecondary: { backgroundColor: "transparent", borderWidth: 1.5, borderColor: colors.primary },
  bigBtnText: { fontSize: 17, fontWeight: "800", color: "#fff" },
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
  subtleBtn: { flex: 1, paddingVertical: 9, borderRadius: radius.md, alignItems: "center", borderWidth: 1.5, borderColor: colors.primary, backgroundColor: "transparent" },
  subtleBtnText: { color: colors.primary, fontWeight: "600", fontSize: 13 },
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
  // saved plans browser
  folderCard: { flexDirection: "row", alignItems: "center", gap: 14, backgroundColor: colors.card, borderRadius: radius.lg, borderWidth: 1.5, borderColor: colors.border, padding: spacing.md },
  folderName: { fontSize: 15, fontWeight: "700", color: colors.text },
  folderCount: { fontSize: 12, color: colors.mutedForeground, marginTop: 2 },
  planCard: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: colors.card, borderRadius: radius.lg, borderWidth: 1.5, borderColor: colors.border, padding: spacing.md },
  planName: { fontSize: 14, fontWeight: "700", color: colors.text, marginBottom: 2 },
  planSubtitle: { fontSize: 12, color: colors.mutedForeground },
  planDate: { fontSize: 11, color: colors.muted, marginTop: 2 },
  modifiedBadge: { backgroundColor: "#f0fdf4", borderRadius: 99, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1, borderColor: "#16a34a55" },
  modifiedBadgeText: { fontSize: 10, fontWeight: "700", color: "#166534" },
  // candidates
  candidateCard: { flexDirection: "row", alignItems: "center", borderRadius: radius.lg, borderWidth: 1.5, padding: spacing.md, gap: 12 },
  candidateFits: { backgroundColor: "#f0fdf4", borderColor: "#16a34a" },
  candidateWarn: { backgroundColor: "#fffbeb", borderColor: "#f59e0b" },
  candidateTitle: { fontSize: 14, fontWeight: "600", color: "#1a1a1a" },
  candidateWarning: { fontSize: 12, color: "#92400e", marginTop: 4 },
  actionMenuItem: { flexDirection: "row", alignItems: "center", gap: 14, backgroundColor: colors.card, borderRadius: radius.lg, borderWidth: 1.5, borderColor: colors.border, padding: spacing.md },
  actionMenuLabel: { flex: 1, fontSize: 15, fontWeight: "600", color: colors.text },
})
