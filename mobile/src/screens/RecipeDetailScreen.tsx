import React, { useEffect, useState, useCallback, useRef } from "react"
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Image, ActivityIndicator, Modal, Animated, TextInput
} from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { Ionicons } from "@expo/vector-icons"
import { useNavigation, useRoute } from "@react-navigation/native"
import { apiFetch, API_BASE_URL } from "../lib/api"
import { useAuth } from "../context/AuthContext"
import { useTheme } from "../context/ThemeContext"
import { useGlobalError } from "../context/GlobalErrorContext"
import { useSubscription } from "../context/SubscriptionContext"
import { useActiveRecipeSession, Substitution } from "../context/ActiveRecipeSessionContext"
import PaywallModal from "../components/PaywallModal"
import { spacing, radius } from "../lib/theme"
import { showAlert } from "../components/CustomAlert"

type Tab = "overview" | "ingredients" | "steps" | "wine"
type CheckStep = "ask" | "checking" | "done"

function escapeRegex(str: string) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

function applySubstitutions(text: string, substitutions: Substitution[]): string {
  let result = text
  for (const { original, name, substitute, display } of substitutions) {
    const replacement = display ?? substitute
    // 1. Try full original string (e.g. "8 ounces portabella mushroom sliced")
    const fullReplaced = result.replace(new RegExp(escapeRegex(original), "gi"), replacement)
    if (fullReplaced !== result) { result = fullReplaced; continue }
    // 2. Try ingredient name with word boundary (e.g. "portabella mushroom")
    if (name) {
      const nameReplaced = result.replace(new RegExp(`\\b${escapeRegex(name)}\\b`, "gi"), replacement)
      if (nameReplaced !== result) { result = nameReplaced; continue }
    }
    // 3. Try original as word boundary (handles cases where original IS just the name)
    result = result.replace(new RegExp(`\\b${escapeRegex(original)}\\b`, "gi"), replacement)
  }
  return result
}

export default function RecipeDetailScreen() {
  const navigation = useNavigation<any>()
  const route = useRoute<any>()
  const { id, fromScan, fromSession, mealIndex, searchFilters } = route.params ?? {}
  const isBreakfast = mealIndex === 0
  const { user } = useAuth()
  const { colors } = useTheme()
  const { showError } = useGlobalError()
  const { isPremium } = useSubscription()
  const { saveSession, clearSession, refreshQuickListCount, session: activeSession } = useActiveRecipeSession()
  const s = makeStyles(colors)

  const [recipe, setRecipe] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<Tab>("overview")
  const [favourited, setFavourited] = useState(false)
  const [isTried, setIsTried] = useState(false)
  // save-to-list modal
  const [saveListModal, setSaveListModal] = useState<"toTry" | "tried" | null>(null)
  const [saveFolder, setSaveFolder] = useState("")
  const [saveFolderCustom, setSaveFolderCustom] = useState("")
  const [savingList, setSavingList] = useState(false)
  const [existingToTryFolders, setExistingToTryFolders] = useState<string[]>([])
  const [existingTriedFolders, setExistingTriedFolders] = useState<string[]>([])
  const [showFolderPicker, setShowFolderPicker] = useState(false)
  const [addedIngredients, setAddedIngredients] = useState<Set<string>>(new Set())
  const [addingAll, setAddingAll] = useState(false)
  const [showPaywall, setShowPaywall] = useState(false)
  const [sessionSubstitutions, setSessionSubstitutions] = useState<Substitution[]>([])

  // Wine pairing
  const [winePairing, setWinePairing] = useState<any>(null)
  const [wineLoading, setWineLoading] = useState(false)

  // Ingredient substitutes (premium feature in ingredients tab)
  const [substitutes, setSubstitutes] = useState<Record<string, { substitute: string; display: string } | null>>({})
  const [substituteLoading, setSubstituteLoading] = useState<string | null>(null)

  // Ingredient check flow
  const [checkStep, setCheckStep] = useState<CheckStep | null>(fromScan && !fromSession ? "ask" : null)
  const [checkIndex, setCheckIndex] = useState(0)
  const [suggestedSub, setSuggestedSub] = useState<string | null>(null)
  const [suggestedSubDisplay, setSuggestedSubDisplay] = useState<string | null>(null)
  const [loadingSub, setLoadingSub] = useState(false)
  const [awaitingSub, setAwaitingSub] = useState(false)
  const [pendingSubstitutions, setPendingSubstitutions] = useState<Substitution[]>([])
  const [quickListAdded, setQuickListAdded] = useState<string[]>([])
  const quickListBadgeScale = useRef(new Animated.Value(0)).current
  const addedFlash = useRef(new Animated.Value(1)).current

  const fetchRecipe = async () => {
    setLoading(true)
    try {
      const res = await apiFetch(`/api/recipes/${id}`, { screen: "Recipe Detail" })
      const data = await res.json()
      if (!res.ok) { showError(data?.error ?? `Error ${res.status}`, "Recipe Detail", fetchRecipe); return }
      setRecipe(data)
    } catch (e: any) {
      showError(e?.message ?? "Failed to load recipe", "Recipe Detail", fetchRecipe)
    } finally { setLoading(false) }
  }

  useEffect(() => { fetchRecipe() }, [id])

  useEffect(() => {
    if (fromSession && activeSession?.substitutions?.length) {
      setSessionSubstitutions(activeSession.substitutions)
    }
  }, [fromSession, activeSession])

  useEffect(() => {
    if (!user || !recipe) return
    Promise.all([
      apiFetch(`/api/favourites?userId=${user.id}`).then(r => r.json()),
      apiFetch(`/api/tried-recipes?userId=${user.id}`).then(r => r.json()),
      apiFetch(`/api/folders?userId=${user.id}`).then(r => r.json()).catch(() => ({ folders: [] })),
    ]).then(([favsData, triedData, foldersData]) => {
      const favs = favsData.favourites || []
      setFavourited(favs.map((f: any) => f.recipe_id).includes(String(recipe.id)))

      const tried = triedData.triedRecipes || []
      setIsTried(tried.map((t: any) => t.recipe_id).includes(String(recipe.id)))

      const folders = foldersData.folders || []
      const toTryFolders = folders.filter((f: any) => f.list_type === "toTry").map((f: any) => f.folder_name as string)
      const triedFolders = folders.filter((f: any) => f.list_type === "tried").map((f: any) => f.folder_name as string)

      // merge with any recipe-level folders not yet in the folders table
      const recipesToTryFolders = Array.from(new Set(favs.map((f: any) => f.folder).filter(Boolean))) as string[]
      const recipesTriedFolders = Array.from(new Set(tried.map((t: any) => t.folder).filter(Boolean))) as string[]

      setExistingToTryFolders(Array.from(new Set([...toTryFolders, ...recipesToTryFolders])))
      setExistingTriedFolders(Array.from(new Set([...triedFolders, ...recipesTriedFolders])))
    }).catch(() => {})

    apiFetch(`/api/shopping-list?userId=${user.id}`)
      .then(r => r.json())
      .then(data => {
        const existing = (data.items || [])
          .filter((i: any) => i.recipe_id === String(recipe.id))
          .map((i: any) => i.ingredient_name)
        setAddedIngredients(new Set(existing))
      }).catch(() => {})
  }, [user, recipe?.id])

  const openSaveModal = (mode: "toTry" | "tried") => {
    if (!user) { navigation.navigate("Login"); return }
    setSaveFolder("")
    setSaveFolderCustom("")
    setSaveListModal(mode)
  }

  const confirmSaveToList = async () => {
    if (!user || !recipe || !saveListModal) return
    const folder = saveFolder === "__custom__" ? saveFolderCustom.trim() : saveFolder || null
    setSavingList(true)
    try {
      if (saveListModal === "toTry") {
        await apiFetch("/api/favourites", {
          method: "POST",
          body: JSON.stringify({ userId: user.id, recipeId: recipe.id, recipeTitle: recipe.title, recipeImage: recipe.image, readyInMinutes: recipe.readyInMinutes, servings: recipe.servings, tags: [], folder, searchFilters: searchFilters ?? null }),
        })
        if (isTried) {
          await apiFetch("/api/tried-recipes", { method: "DELETE", body: JSON.stringify({ userId: user.id, recipeId: String(recipe.id) }) })
          setIsTried(false)
          // keep the source folder in tried folders even if now empty
        }
        setFavourited(true)
        if (folder && !existingToTryFolders.includes(folder)) {
          setExistingToTryFolders(prev => [...prev, folder])
          apiFetch("/api/folders", { method: "POST", body: JSON.stringify({ userId: user.id, listType: "toTry", folderName: folder }) }).catch(() => {})
        }
      } else {
        await apiFetch("/api/tried-recipes", {
          method: "POST",
          body: JSON.stringify({ userId: user.id, recipeId: String(recipe.id), recipeTitle: recipe.title, recipeImage: recipe.image, readyInMinutes: recipe.readyInMinutes, folder, searchFilters: searchFilters ?? null }),
        })
        if (favourited) {
          await apiFetch("/api/favourites", { method: "DELETE", body: JSON.stringify({ userId: user.id, recipeId: recipe.id }) })
          setFavourited(false)
        }
        setIsTried(true)
        if (folder && !existingTriedFolders.includes(folder)) {
          setExistingTriedFolders(prev => [...prev, folder])
          apiFetch("/api/folders", { method: "POST", body: JSON.stringify({ userId: user.id, listType: "tried", folderName: folder }) }).catch(() => {})
        }
      }
      setSaveListModal(null)
    } catch { showAlert({ title: "Error", message: "Failed to save. Please try again." }) }
    finally { setSavingList(false) }
  }

  const removeFavourite = async () => {
    if (!user) return
    await apiFetch("/api/favourites", { method: "DELETE", body: JSON.stringify({ userId: user.id, recipeId: recipe.id }) })
    setFavourited(false)
  }

  const removeTried = async () => {
    if (!user) return
    await apiFetch("/api/tried-recipes", { method: "DELETE", body: JSON.stringify({ userId: user.id, recipeId: String(recipe.id) }) })
    setIsTried(false)
  }

  const toggleIngredient = async (name: string, amount: string) => {
    if (!user) { navigation.navigate("Login"); return }
    const isAdded = addedIngredients.has(name)
    if (isAdded) {
      await apiFetch("/api/shopping-list", { method: "DELETE", body: JSON.stringify({ userId: user.id, recipeId: String(recipe.id), ingredientName: name }) })
      setAddedIngredients(prev => { const next = new Set(prev); next.delete(name); return next })
    } else {
      await apiFetch("/api/shopping-list", {
        method: "POST",
        body: JSON.stringify({ userId: user.id, recipeId: String(recipe.id), recipeTitle: recipe.title, ingredients: [{ name, amount }] }),
      })
      setAddedIngredients(prev => new Set([...prev, name]))
    }
  }

  const addAllIngredients = async () => {
    if (!user) { navigation.navigate("Login"); return }
    setAddingAll(true)
    const toAdd = recipe.extendedIngredients.filter((ing: any) => !addedIngredients.has(ing.name))
    await apiFetch("/api/shopping-list", {
      method: "POST",
      body: JSON.stringify({
        userId: user.id,
        recipeId: String(recipe.id),
        recipeTitle: recipe.title,
        ingredients: toAdd.map((ing: any) => ({ name: ing.name, amount: ing.original })),
      }),
    })
    setAddedIngredients(new Set(recipe.extendedIngredients.map((i: any) => i.name)))
    setAddingAll(false)
  }


  const fetchWinePairing = useCallback(async () => {
    if (!recipe) return
    if (!isPremium) { setShowPaywall(true); return }
    setTab("wine")
    if (winePairing) return
    setWineLoading(true)
    try {
      const food = recipe.cuisines?.[0] ?? recipe.title.split(" ")[0]
      const res = await apiFetch(`/api/recipes/wine-pairing?food=${encodeURIComponent(food)}`, { screen: "Wine Pairing" })
      const data = await res.json()
      setWinePairing(res.ok ? data : null)
    } catch {}
    finally { setWineLoading(false) }
  }, [recipe, isPremium, winePairing])

  const fetchSubstitute = useCallback(async (ingredient: string, amount?: string) => {
    if (!isPremium) { setShowPaywall(true); return }
    if (ingredient in substitutes) return
    setSubstituteLoading(ingredient)
    try {
      const res = await fetch(`${API_BASE_URL}/api/recipes/suggest-substitute`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ingredient, amount, recipeTitle: recipe?.title }),
      })
      const data = await res.json()
      setSubstitutes(prev => ({ ...prev, [ingredient]: data.substitute ? { substitute: data.substitute, display: data.display ?? data.substitute } : null }))
    } catch {
      setSubstitutes(prev => ({ ...prev, [ingredient]: null }))
    } finally { setSubstituteLoading(null) }
  }, [isPremium, substitutes, recipe?.title])

  const applyTabSubstitute = useCallback(async (ing: any, sub: { substitute: string; display: string }) => {
    const newSubs = [...sessionSubstitutions, {
      original: ing.original ?? ing.name,
      name: ing.name,
      substitute: sub.substitute,
      display: sub.display,
    }]
    setSessionSubstitutions(newSubs)
    setSubstitutes(prev => { const next = { ...prev }; delete next[ing.name]; return next })
    if (user && recipe) {
      await saveSession({
        recipeId: String(recipe.id),
        recipeTitle: recipe.title,
        recipeData: recipe,
        substitutions: newSubs,
        source: fromScan ? "scan" : "search",
      })
    }
  }, [sessionSubstitutions, user, recipe, fromScan, saveSession])

  const removeSubstitution = useCallback(async (original: string) => {
    const newSubs = sessionSubstitutions.filter(s => s.original !== original)
    setSessionSubstitutions(newSubs)
    if (user && recipe) {
      await saveSession({
        recipeId: String(recipe.id),
        recipeTitle: recipe.title,
        recipeData: recipe,
        substitutions: newSubs,
        source: fromScan ? "scan" : "search",
      })
    }
  }, [sessionSubstitutions, user, recipe, fromScan, saveSession])

  // ── INGREDIENT CHECK FLOW ──────────────────────────────────

  const ingredients = recipe?.extendedIngredients ?? []
  const currentIngredient = ingredients[checkIndex]

  const advanceCheck = (subs: Substitution[]) => {
    setSuggestedSub(null)
    setSuggestedSubDisplay(null)
    setAwaitingSub(false)
    if (checkIndex + 1 >= ingredients.length) {
      finishCheck(subs)
    } else {
      setCheckIndex(i => i + 1)
    }
  }

  const fetchSuggestedSub = useCallback(async (ingredient: string, amount?: string) => {
    setLoadingSub(true)
    setSuggestedSub(null)
    try {
      const res = await fetch(`${API_BASE_URL}/api/recipes/suggest-substitute`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ingredient, amount, recipeTitle: recipe?.title }),
      })
      const data = await res.json()
      if (data.substitute) {
        setSuggestedSub(data.substitute)
        setSuggestedSubDisplay(data.display ?? data.substitute)
      } else {
        setSuggestedSub(null)
        setSuggestedSubDisplay(null)
      }
    } catch { setSuggestedSub(null); setSuggestedSubDisplay(null) }
    finally { setLoadingSub(false) }
  }, [recipe?.title])

  const handleHaveIt = () => {
    advanceCheck(pendingSubstitutions)
  }

  const handleDontHaveIt = () => {
    setAwaitingSub(true)
    fetchSuggestedSub(currentIngredient.name, currentIngredient.original)
  }

  const handleUseSub = () => {
    if (!suggestedSub) return
    const newSubs = [...pendingSubstitutions, {
      original: currentIngredient.original ?? currentIngredient.name,
      name: currentIngredient.name,
      substitute: suggestedSub,
      display: suggestedSubDisplay ?? suggestedSub,
    }]
    setPendingSubstitutions(newSubs)
    advanceCheck(newSubs)
  }

  const handleBuyIt = async () => {
    if (!user) return
    const isFirst = quickListAdded.length === 0
    setQuickListAdded(prev => [...prev, currentIngredient.name])
    if (isFirst) {
      Animated.spring(quickListBadgeScale, { toValue: 1, useNativeDriver: true, bounciness: 14 }).start()
    } else {
      Animated.sequence([
        Animated.timing(quickListBadgeScale, { toValue: 1.2, duration: 100, useNativeDriver: true }),
        Animated.spring(quickListBadgeScale, { toValue: 1, useNativeDriver: true }),
      ]).start()
    }
    Animated.sequence([
      Animated.timing(addedFlash, { toValue: 0.3, duration: 80, useNativeDriver: true }),
      Animated.timing(addedFlash, { toValue: 1, duration: 200, useNativeDriver: true }),
    ]).start()
    await apiFetch("/api/quick-shopping-list", {
      method: "POST",
      body: JSON.stringify({
        userId: user.id,
        recipeId: String(recipe.id),
        recipeTitle: recipe.title,
        ingredients: [{ name: currentIngredient.name, amount: currentIngredient.original }],
      }),
    })
    await refreshQuickListCount()
    advanceCheck(pendingSubstitutions)
  }

  const finishCheck = async (subs: Substitution[]) => {
    setSessionSubstitutions(subs)
    setCheckStep("done")
    if (user && recipe) {
      await saveSession({
        recipeId: String(recipe.id),
        recipeTitle: recipe.title,
        recipeData: recipe,
        substitutions: subs,
        source: fromScan ? "scan" : "search",
      })
    }
  }

  const getEffectiveSteps = useCallback(() => {
    const steps = recipe?.analyzedInstructions?.[0]?.steps ?? []
    if (sessionSubstitutions.length === 0) return steps
    return steps.map((step: any) => ({
      ...step,
      step: applySubstitutions(step.step, sessionSubstitutions),
    }))
  }, [recipe, sessionSubstitutions])

  // ── CHECK FLOW MODAL ──────────────────────────────────────

  const renderCheckModal = () => {
    if (!checkStep || checkStep === null || loading || !recipe) return null

    // Ask bottom sheet
    if (checkStep === "ask") {
      return (
        <Modal visible animationType="slide" transparent onRequestClose={() => setCheckStep(null)}>
          <View style={s.sheetOverlay}>
            <View style={[s.sheet, { backgroundColor: colors.card }]}>
              <TouchableOpacity onPress={() => setCheckStep(null)} style={{ position: "absolute", top: 12, right: 12, padding: 4 }}>
                <Ionicons name="close" size={22} color={colors.mutedForeground} />
              </TouchableOpacity>
              <Text style={[s.sheetTitle, { color: colors.text }]}>Cook it now?</Text>
              <Text style={[s.sheetSub, { color: colors.mutedForeground }]}>
                Check if you have all the ingredients, or open the recipe directly.
              </Text>
              <TouchableOpacity style={[s.sheetBtn, { backgroundColor: colors.primary }]} onPress={() => { setCheckIndex(0); setCheckStep("checking") }} activeOpacity={0.8}>
                <Ionicons name="checkbox-outline" size={20} color="#fff" style={{ marginRight: 8 }} />
                <Text style={s.sheetBtnText}>Check ingredients first</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[s.sheetBtn, { backgroundColor: colors.card, borderWidth: 1.5, borderColor: colors.border }]} onPress={() => setCheckStep(null)} activeOpacity={0.8}>
                <Ionicons name="book-outline" size={20} color={colors.text} style={{ marginRight: 8 }} />
                <Text style={[s.sheetBtnText, { color: colors.text }]}>Open recipe directly</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )
    }

    // One-by-one check
    if (checkStep === "checking" && currentIngredient) {
      return (
        <Modal visible animationType="fade" transparent={false} statusBarTranslucent onRequestClose={() => finishCheck(pendingSubstitutions)}>
          <View style={[s.checkScreen, { backgroundColor: colors.background }]}>
            <View style={s.checkProgress}>
              <Text style={[s.checkProgressText, { color: colors.mutedForeground }]}>
                {checkIndex + 1} of {ingredients.length}
              </Text>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                {quickListAdded.length > 0 && (
                  <Animated.View style={[s.quickListBadge, { transform: [{ scale: quickListBadgeScale }] }]}>
                    <Ionicons name="cart-outline" size={13} color={colors.primary} />
                    <Ionicons name="flash" size={10} color={colors.primary} />
                    <Text style={[s.quickListBadgeText, { color: colors.primary }]}>{quickListAdded.length}</Text>
                  </Animated.View>
                )}
                <TouchableOpacity onPress={() => finishCheck(pendingSubstitutions)}>
                  <Text style={[s.checkSkipText, { color: colors.mutedForeground }]}>Skip all</Text>
                </TouchableOpacity>
              </View>
            </View>

            {!awaitingSub && (
              <>
                <View style={s.checkContent}>
                  <Text style={[s.checkLabel, { color: colors.mutedForeground }]}>Do you have</Text>
                  <Text style={[s.checkIngredient, { color: colors.text }]}>{currentIngredient.name}</Text>
                  <Text style={[s.checkAmount, { color: colors.mutedForeground }]}>{currentIngredient.original}</Text>
                </View>
                <View style={s.checkBtns}>
                  <TouchableOpacity style={[s.checkBtn, { backgroundColor: colors.primary }]} onPress={handleHaveIt} activeOpacity={0.8}>
                    <Ionicons name="checkmark" size={32} color="#fff" />
                    <Text style={s.checkBtnText}>Yes, I have it</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[s.checkBtn, { backgroundColor: colors.card, borderWidth: 1.5, borderColor: colors.border }]} onPress={handleDontHaveIt} activeOpacity={0.8}>
                    <Ionicons name="close" size={32} color={colors.text} />
                    <Text style={[s.checkBtnText, { color: colors.text }]}>No, I don't</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}

            {awaitingSub && loadingSub && (
              <View style={s.checkSubLoading}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={[s.checkSubLoadingText, { color: colors.mutedForeground }]}>Finding a substitute…</Text>
              </View>
            )}

            {awaitingSub && !loadingSub && suggestedSub && (
              <View style={s.checkSubBox}>
                <Text style={[s.checkSubLabel, { color: colors.mutedForeground }]}>Do you want to replace</Text>
                <Text style={[s.checkSubName, { color: colors.text }]}>{currentIngredient.name}</Text>
                <Text style={[s.checkSubLabel, { color: colors.mutedForeground }]}>with</Text>
                <Text style={[s.checkSubName, { color: colors.primary }]}>{suggestedSubDisplay ?? suggestedSub}</Text>
                {suggestedSub !== suggestedSubDisplay && (
                  <Text style={{ fontSize: 12, color: colors.mutedForeground, textAlign: "center", fontStyle: "italic", marginTop: 0, marginBottom: 0, paddingHorizontal: 16 }}>{suggestedSub}</Text>
                )}
                <Text style={[s.checkSubQuestion, { color: colors.mutedForeground }]}>?</Text>
                <View style={s.checkSubBtns}>
                  <TouchableOpacity style={[s.checkSubBtn, { backgroundColor: colors.primary }]} onPress={handleUseSub} activeOpacity={0.8}>
                    <Ionicons name="swap-horizontal" size={20} color="#fff" />
                    <Text style={s.checkSubBtnText}>Yes, replace it</Text>
                  </TouchableOpacity>
                  <Animated.View style={{ flex: 1, opacity: addedFlash }}>
                    <TouchableOpacity style={[s.checkSubBtn, { backgroundColor: colors.card, borderWidth: 1.5, borderColor: colors.border, flex: 1 }]} onPress={handleBuyIt} activeOpacity={0.8}>
                      <Ionicons name="cart-outline" size={20} color={colors.text} />
                      <Text style={[s.checkSubBtnText, { color: colors.text }]}>No, buy original</Text>
                    </TouchableOpacity>
                  </Animated.View>
                </View>
              </View>
            )}

            {awaitingSub && !loadingSub && !suggestedSub && (
              <View style={s.checkSubBox}>
                <Text style={[s.checkSubName, { color: colors.text, textAlign: "center" }]}>{currentIngredient.name}</Text>
                <Text style={[s.checkSubLabel, { color: colors.mutedForeground }]}>No substitute found</Text>
                <View style={s.checkSubBtns}>
                  <Animated.View style={{ flex: 1, opacity: addedFlash }}>
                    <TouchableOpacity style={[s.checkSubBtn, { backgroundColor: colors.primary, flex: 1 }]} onPress={handleBuyIt} activeOpacity={0.8}>
                      <Ionicons name="cart-outline" size={20} color="#fff" />
                      <Text style={s.checkSubBtnText}>Buy the original</Text>
                    </TouchableOpacity>
                  </Animated.View>
                  <TouchableOpacity style={[s.checkSubBtn, { backgroundColor: colors.card, borderWidth: 1.5, borderColor: colors.border }]} onPress={() => advanceCheck(pendingSubstitutions)} activeOpacity={0.8}>
                    <Text style={[s.checkSubBtnText, { color: colors.text }]}>Skip</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        </Modal>
      )
    }

    // Done summary
    if (checkStep === "done") {
      const toBuy = quickListAdded.length
      return (
        <Modal visible animationType="fade" transparent={false} statusBarTranslucent onRequestClose={() => setCheckStep(null)}>
          <View style={[s.checkScreen, { backgroundColor: colors.background }]}>
            <Ionicons name={toBuy === 0 ? "checkmark-circle" : "cart"} size={64} color={colors.primary} style={{ marginBottom: 16 }} />
            <Text style={[s.checkIngredient, { color: colors.text, textAlign: "center" }]}>
              {toBuy === 0 ? "You have everything!" : `You need to buy ${toBuy} ingredient${toBuy > 1 ? "s" : ""}`}
            </Text>
            {sessionSubstitutions.length > 0 && (
              <View style={s.subsList}>
                {sessionSubstitutions.map((s, i) => (
                  <Text key={i} style={{ color: colors.mutedForeground, fontSize: 14, marginTop: 4 }}>
                    • {s.original} → {s.substitute}
                  </Text>
                ))}
              </View>
            )}
            {toBuy > 0 ? (
              <>
                <TouchableOpacity style={[s.sheetBtn, { backgroundColor: colors.primary, marginTop: 32, alignSelf: "stretch", marginHorizontal: 24 }]} onPress={() => { setCheckStep(null); navigation.navigate("QuickShoppingList") }} activeOpacity={0.8}>
                  <Text style={s.sheetBtnText}>Check Quick Shopping List</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[s.sheetBtn, { backgroundColor: "transparent", borderWidth: 1.5, borderColor: colors.border, marginTop: 12, alignSelf: "stretch", marginHorizontal: 24 }]} onPress={() => setCheckStep(null)} activeOpacity={0.8}>
                  <Text style={[s.sheetBtnText, { color: colors.text, fontSize: 14 }]}>Open recipe</Text>
                </TouchableOpacity>
              </>
            ) : (
              <TouchableOpacity style={[s.sheetBtn, { backgroundColor: colors.primary, marginTop: 32, paddingHorizontal: 48, alignSelf: "stretch", marginHorizontal: 24 }]} onPress={() => setCheckStep(null)} activeOpacity={0.8}>
                <Text style={s.sheetBtnText}>Open recipe</Text>
              </TouchableOpacity>
            )}
          </View>
        </Modal>
      )
    }

    return null
  }

  if (loading) return (
    <View style={[s.center, { flex: 1 }]}>
      <ActivityIndicator size="large" color={colors.primary} />
    </View>
  )

  if (!recipe) return null

  const allAdded = recipe.extendedIngredients?.every((i: any) => addedIngredients.has(i.name))
  const effectiveSteps = getEffectiveSteps()

  return (
    <>
      <ScrollView style={s.container} contentContainerStyle={{ paddingBottom: 40 }}>
        <Image source={{ uri: recipe.image }} style={s.heroImage} resizeMode="cover" />

        <View style={s.actionBar}>
          <TouchableOpacity
            style={[s.actionBtn, favourited && s.actionBtnActive]}
            onPress={() => favourited ? removeFavourite() : openSaveModal("toTry")}
          >
            <Ionicons name={favourited ? "bookmark" : "bookmark-outline"} size={20} color={favourited ? colors.primary : colors.text} />
            <Text style={[s.actionBtnText, favourited && { color: colors.primary }]}>
              {favourited ? "In Try List" : "Add to Try List"}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[s.actionBtn, isTried && s.actionBtnActive]}
            onPress={() => isTried ? removeTried() : openSaveModal("tried")}
          >
            <Ionicons name={isTried ? "checkmark-circle" : "checkmark-circle-outline"} size={20} color={isTried ? colors.green : colors.text} />
            <Text style={[s.actionBtnText, isTried && { color: colors.green }]}>
              {isTried ? "Tried" : "Mark as Tried"}
            </Text>
          </TouchableOpacity>
          {fromSession && (
            <TouchableOpacity style={[s.actionBtn, { borderColor: colors.destructive + "66" }]} onPress={async () => { await clearSession(); navigation.navigate("Tabs") }}>
              <Ionicons name="stop-circle-outline" size={20} color={colors.destructive} />
              <Text style={[s.actionBtnText, { color: colors.destructive }]}>Stop</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={s.header}>
          <Text style={s.title}>{recipe.title}</Text>
          {sessionSubstitutions.length > 0 && (
            <View style={s.subsBanner}>
              <Ionicons name="swap-horizontal" size={14} color={colors.primary} />
              <Text style={s.subsBannerText}>{sessionSubstitutions.length} substitution{sessionSubstitutions.length > 1 ? "s" : ""} applied</Text>
            </View>
          )}
          <View style={s.metaRow}>
            {recipe.readyInMinutes > 0 && (
              <View style={s.metaChip}>
                <Ionicons name="time-outline" size={14} color={colors.mutedForeground} />
                <Text style={s.metaText}>{recipe.readyInMinutes} min</Text>
              </View>
            )}
            {recipe.servings > 0 && (
              <View style={s.metaChip}>
                <Ionicons name="people-outline" size={14} color={colors.mutedForeground} />
                <Text style={s.metaText}>{recipe.servings} servings</Text>
              </View>
            )}
            {recipe.vegan && <View style={s.badge}><Text style={s.badgeText}>Vegan</Text></View>}
            {recipe.vegetarian && !recipe.vegan && <View style={s.badge}><Text style={s.badgeText}>Vegetarian</Text></View>}
            {recipe.glutenFree && <View style={s.badge}><Text style={s.badgeText}>Gluten-Free</Text></View>}
          </View>
        </View>

        <View style={s.tabs}>
          {(["overview", "ingredients", "steps"] as Tab[]).map(t => (
            <TouchableOpacity key={t} style={[s.tab, tab === t && s.tabActive]} onPress={() => setTab(t)}>
              <Text style={[s.tabText, tab === t && s.tabTextActive]}>
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
          {isBreakfast ? (
            <TouchableOpacity style={s.tab} onPress={() => showAlert({ title: "Seriously? 🍷", message: "It's breakfast… sure you want a drink?" })}>
              <Text style={s.tabText}>🍷 Wine</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={[s.tab, tab === "wine" && s.tabActive]} onPress={fetchWinePairing}>
              <Text style={[s.tabText, tab === "wine" && s.tabTextActive]}>🍷 Wine</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={s.tabContent}>
          {tab === "overview" && (
            <View style={{ gap: 16 }}>
              {recipe.summary ? (
                <Text style={s.summary}>
                  {recipe.summary.replace(/<[^>]+>/g, "").slice(0, 400)}...
                </Text>
              ) : null}
              {recipe.nutrition?.nutrients && (() => {
                const byName = (name: string) => recipe.nutrition.nutrients.find((n: any) => n.name === name)
                const calories = byName("Calories")
                const protein = byName("Protein")
                const fat = byName("Fat")
                const satFat = byName("Saturated Fat")
                const carbs = byName("Carbohydrates")
                if (!calories && !protein && !fat && !carbs) return null
                return (
                  <View style={s.nutritionBox}>
                    <View style={s.nutritionPerServing}>
                      <Text style={s.nutritionPerServingText}>Per serving · {recipe.servings} servings total</Text>
                    </View>
                    {calories && (
                      <View style={s.nutritionCalRow}>
                        <Text style={s.nutritionCalLabel}>Calories</Text>
                        <Text style={s.nutritionCalValue}>{Math.round(calories.amount)}</Text>
                      </View>
                    )}
                    <View style={s.nutritionMacros}>
                      {[
                        { n: protein, label: "Protein" },
                        { n: fat, label: "Fat", sub: satFat ? `sat. fat ${Math.round(satFat.amount)}${satFat.unit}` : null },
                        { n: carbs, label: "Carbs" },
                      ].filter(x => x.n).map(({ n, label, sub }: any, i: number, arr: any[]) => (
                        <View key={label} style={[s.nutritionMacroCard, i === arr.length - 1 && { borderRightWidth: 0 }]}>
                          <Text style={s.nutritionValue}>{Math.round(n.amount)}{n.unit}</Text>
                          <Text style={s.nutritionLabel}>{label}</Text>
                          {sub && <Text style={s.nutritionSub}>{sub}</Text>}
                        </View>
                      ))}
                    </View>
                  </View>
                )
              })()}
            </View>
          )}

          {tab === "ingredients" && (
            <View>
              <TouchableOpacity
                style={[s.addAllBtn, allAdded && s.addAllBtnDone]}
                onPress={addAllIngredients}
                disabled={addingAll || allAdded}
              >
                {addingAll ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Ionicons name="cart" size={18} color="#fff" style={{ marginRight: 8 }} />
                )}
                <Text style={s.addAllBtnText}>{allAdded ? "All Added" : "Add All to Shopping List"}</Text>
              </TouchableOpacity>

              {recipe.extendedIngredients?.map((ing: any, idx: number) => {
                const added = addedIngredients.has(ing.name)
                const sub = substitutes[ing.name]
                const loadingSubPremium = substituteLoading === ing.name
                const appliedSub = sessionSubstitutions.find(s =>
                  s.original === ing.name || s.original === ing.original || s.original.includes(ing.name)
                )
                const notReplaceable = ing.name in substitutes && !sub
                const subDisabled = loadingSubPremium || !!appliedSub || notReplaceable || !!sub
                const inQuickList = (fromScan || fromSession) && quickListAdded.includes(ing.name)
                const hasPendingSub = !!sub && !appliedSub
                return (
                  <View key={`ing-${idx}`} style={[s.ingredientRow, { flexDirection: "column", alignItems: "stretch" }]}>
                    <View style={{ flexDirection: "row", alignItems: "center" }}>
                      <View style={{ flex: 1 }}>
                        <Text style={[s.ingredientName, appliedSub && { textDecorationLine: "line-through", color: colors.muted }]}>{ing.name}</Text>
                        {appliedSub && <Text style={[s.ingredientName, { color: colors.primary }]}>→ {appliedSub.display ?? appliedSub.substitute}</Text>}
                        {notReplaceable && !appliedSub && <Text style={{ fontSize: 11, color: colors.muted, marginTop: 2 }}>Not replaceable</Text>}
                        <Text style={s.ingredientAmount}>{appliedSub ? appliedSub.substitute : ing.original}</Text>
                      </View>
                      <View style={s.ingActions}>
                        {appliedSub ? (
                          <TouchableOpacity
                            style={s.subBtn}
                            onPress={() => removeSubstitution(appliedSub.original)}
                          >
                            <Ionicons name="arrow-undo-outline" size={16} color={colors.primary} />
                          </TouchableOpacity>
                        ) : (
                          <TouchableOpacity
                            style={[s.subBtn, subDisabled && { opacity: 0.35 }]}
                            onPress={() => !subDisabled && fetchSubstitute(ing.name, ing.original)}
                            disabled={subDisabled}
                          >
                            {loadingSubPremium
                              ? <ActivityIndicator size="small" color={colors.primary} />
                              : <Ionicons name="swap-horizontal-outline" size={16} color={colors.primary} />
                            }
                          </TouchableOpacity>
                        )}
                        {inQuickList ? (
                          <TouchableOpacity
                            style={[s.cartBtn, s.cartBtnAdded]}
                            onPress={() => {
                              setQuickListAdded(prev => prev.filter(n => n !== ing.name))
                              apiFetch("/api/quick-shopping-list", { method: "DELETE", body: JSON.stringify({ userId: user!.id, ingredientName: ing.name, recipeId: String(recipe.id) }) })
                              refreshQuickListCount()
                            }}
                          >
                            <Ionicons name="remove" size={16} color={colors.destructive} />
                          </TouchableOpacity>
                        ) : (
                          <TouchableOpacity
                            style={[s.cartBtn, added && s.cartBtnAdded]}
                            onPress={() => toggleIngredient(ing.name, ing.original)}
                          >
                            <Ionicons name={added ? "remove" : "cart-outline"} size={16} color={added ? colors.destructive : colors.primary} />
                          </TouchableOpacity>
                        )}
                      </View>
                    </View>
                    {hasPendingSub && (
                      <View style={s.pendingSubRow}>
                        <View style={{ flex: 1 }}>
                          <Text style={[s.ingredientName, { color: colors.primary }]}>→ {sub.display}</Text>
                          {sub.substitute !== sub.display && (
                            <Text style={{ fontSize: 12, color: colors.mutedForeground, marginTop: 2 }}>{sub.substitute}</Text>
                          )}
                        </View>
                        <View style={{ flexDirection: "row", gap: 8 }}>
                          <TouchableOpacity
                            style={[s.subActionBtn, { backgroundColor: colors.primary }]}
                            onPress={() => applyTabSubstitute(ing, sub)}
                          >
                            <Ionicons name="checkmark" size={16} color="#fff" />
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={[s.subActionBtn, { backgroundColor: colors.card, borderWidth: 1.5, borderColor: colors.border }]}
                            onPress={() => setSubstitutes(prev => { const next = { ...prev }; delete next[ing.name]; return next })}
                          >
                            <Ionicons name="close" size={16} color={colors.text} />
                          </TouchableOpacity>
                        </View>
                      </View>
                    )}
                  </View>
                )
              })}
            </View>
          )}

          {tab === "steps" && (
            <View style={{ gap: 16 }}>
              {effectiveSteps.length > 0 && (
                <TouchableOpacity
                  style={s.cookingModeBtn}
                  onPress={() => navigation.navigate("CookingMode", {
                    steps: effectiveSteps,
                    recipeTitle: recipe.title,
                  })}
                >
                  <Ionicons name="mic" size={18} color="#fff" style={{ marginRight: 8 }} />
                  <Text style={s.cookingModeBtnText}>Start Cooking Mode</Text>
                </TouchableOpacity>
              )}
              {effectiveSteps.map((step: any) => (
                <View key={step.number} style={s.step}>
                  <View style={s.stepNum}>
                    <Text style={s.stepNumText}>{step.number}</Text>
                  </View>
                  <Text style={s.stepText}>{step.step}</Text>
                </View>
              ))}
              {effectiveSteps.length === 0 && <Text style={{ color: colors.mutedForeground }}>No instructions available.</Text>}
            </View>
          )}

          {tab === "wine" && (
            <View style={{ gap: 16 }}>
              {wineLoading && <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 32 }} />}
              {!wineLoading && winePairing && (
                <>
                  <Text style={s.wineIntro}>{winePairing.pairingText}</Text>
                  {winePairing.productMatches?.slice(0, 4).map((wine: any) => (
                    <View key={wine.id} style={s.wineCard}>
                      <View style={s.wineCardLeft}>
                        <Text style={s.wineName}>{wine.title}</Text>
                        <Text style={s.wineDesc} numberOfLines={2}>{wine.description}</Text>
                        <View style={s.wineRow}>
                          <Text style={s.winePrice}>{wine.price}</Text>
                          <View style={s.wineRating}>
                            <Ionicons name="star" size={12} color="#f59e0b" />
                            <Text style={s.wineRatingText}>{wine.averageRating?.toFixed(1)}</Text>
                          </View>
                        </View>
                      </View>
                    </View>
                  ))}
                  {winePairing.pairedWines?.length > 0 && (
                    <View>
                      <Text style={s.winesLabel}>Recommended wine types</Text>
                      <View style={s.winesRow}>
                        {winePairing.pairedWines.map((w: string) => (
                          <View key={w} style={s.winePill}>
                            <Text style={s.winePillText}>{w.replace(/_/g, " ")}</Text>
                          </View>
                        ))}
                      </View>
                    </View>
                  )}
                </>
              )}
              {!wineLoading && !winePairing && (
                <View style={s.wineEmptyBox}>
                  <Text style={s.wineEmptyIcon}>🍷</Text>
                  <Text style={s.wineEmptyTitle}>No pairing found</Text>
                  <Text style={s.wineEmpty}>We couldn't find a wine match for this recipe. Try a light white or rosé — it goes with almost anything.</Text>
                </View>
              )}
            </View>
          )}
        </View>

        <PaywallModal visible={showPaywall} onClose={() => setShowPaywall(false)} featureName="Wine Pairing & Substitutes" />
      </ScrollView>

      {renderCheckModal()}

      {/* ── Save to Try List / Tried modal ── */}
      {saveListModal && (() => {
        const isToTry = saveListModal === "toTry"
        const title = isToTry ? "Add to Try List" : "Mark as Tried"
        const existingFolders = isToTry ? existingToTryFolders : existingTriedFolders
        return (
          <Modal visible animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setSaveListModal(null)}>
            <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={["top"]}>
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border }}>
                <TouchableOpacity onPress={() => setSaveListModal(null)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Ionicons name="arrow-back" size={24} color={colors.text} />
                </TouchableOpacity>
                <Text style={{ fontSize: 17, fontWeight: "700", color: colors.text }}>{title}</Text>
                <View style={{ width: 24 }} />
              </View>
              <ScrollView contentContainerStyle={{ padding: spacing.md, gap: 20 }} keyboardShouldPersistTaps="handled">
                <Text style={{ fontSize: 15, fontWeight: "700", color: colors.text }} numberOfLines={2}>{recipe?.title}</Text>
                <View>
                  <Text style={{ fontSize: 13, fontWeight: "700", color: colors.mutedForeground, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 10 }}>Folder (optional)</Text>
                  {existingFolders.length > 0 && (
                    <>
                      <Text style={{ fontSize: 12, color: colors.mutedForeground, marginBottom: 6 }}>Existing folders</Text>
                      <TouchableOpacity
                        style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderWidth: 1.5, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: 14, paddingVertical: 12, backgroundColor: colors.card, marginBottom: 12 }}
                        onPress={() => setShowFolderPicker(true)}
                        activeOpacity={0.8}
                      >
                        <Text style={{ color: (saveFolder && saveFolder !== "__custom__") ? colors.text : colors.muted, fontSize: 15 }}>
                          {(saveFolder && saveFolder !== "__custom__") ? saveFolder : "Choose an existing folder…"}
                        </Text>
                        <Ionicons name="chevron-down" size={16} color={colors.muted} />
                      </TouchableOpacity>
                    </>
                  )}
                  <Text style={{ fontSize: 12, color: colors.mutedForeground, marginBottom: 8 }}>Or add to main list / new folder</Text>
                  <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                    <TouchableOpacity
                      style={{ flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 14, paddingVertical: 9, borderRadius: 99, borderWidth: 1.5, borderColor: saveFolder === "" ? colors.primary : colors.border, backgroundColor: saveFolder === "" ? colors.primary : "transparent" }}
                      onPress={() => { setSaveFolder(""); setSaveFolderCustom("") }}
                    >
                      <Text style={{ fontSize: 13, fontWeight: "700", color: saveFolder === "" ? "#fff" : colors.primary }}>Main List</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={{ flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 14, paddingVertical: 9, borderRadius: 99, borderWidth: 1.5, borderColor: saveFolder === "__custom__" ? colors.primary : colors.border, backgroundColor: saveFolder === "__custom__" ? colors.primary : "transparent" }}
                      onPress={() => setSaveFolder("__custom__")}
                    >
                      <Ionicons name="add" size={14} color={saveFolder === "__custom__" ? "#fff" : colors.primary} />
                      <Text style={{ fontSize: 13, fontWeight: "700", color: saveFolder === "__custom__" ? "#fff" : colors.primary }}>New Folder</Text>
                    </TouchableOpacity>
                  </View>
                  {saveFolder === "__custom__" && (
                    <TextInput
                      style={{ borderWidth: 1.5, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: 14, paddingVertical: 12, color: colors.text, fontSize: 15, backgroundColor: colors.card, marginTop: 10 }}
                      value={saveFolderCustom}
                      onChangeText={setSaveFolderCustom}
                      placeholder="Enter folder name..."
                      placeholderTextColor={colors.muted}
                      autoFocus
                    />
                  )}
                </View>
              </ScrollView>
              <View style={{ padding: spacing.md, borderTopWidth: 1, borderTopColor: colors.border }}>
                <TouchableOpacity
                  style={{ backgroundColor: colors.primary, paddingVertical: 14, borderRadius: radius.md, alignItems: "center", opacity: savingList ? 0.5 : 1 }}
                  onPress={confirmSaveToList}
                  disabled={savingList}
                >
                  {savingList ? <ActivityIndicator color="#fff" /> : <Text style={{ color: "#fff", fontWeight: "700", fontSize: 16 }}>{title}</Text>}
                </TouchableOpacity>
              </View>
            </SafeAreaView>

            {/* Folder picker sheet */}
            <Modal visible={showFolderPicker} transparent animationType="slide" onRequestClose={() => setShowFolderPicker(false)}>
              <View style={{ flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.45)" }}>
                <View style={{ backgroundColor: colors.background, borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingBottom: 32, maxHeight: "60%" }}>
                  <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border }}>
                    <View style={{ width: 24 }} />
                    <Text style={{ fontSize: 17, fontWeight: "700", color: colors.text }}>Choose Folder</Text>
                    <TouchableOpacity onPress={() => setShowFolderPicker(false)}>
                      <Ionicons name="close" size={22} color={colors.text} />
                    </TouchableOpacity>
                  </View>
                  <ScrollView contentContainerStyle={{ padding: spacing.md, gap: 10 }}>
                    {existingFolders.map(f => (
                      <TouchableOpacity
                        key={f}
                        style={{ flexDirection: "row", alignItems: "center", gap: 12, padding: 14, borderRadius: radius.md, backgroundColor: colors.card, borderWidth: saveFolder === f ? 2 : 1, borderColor: saveFolder === f ? colors.primary : colors.border }}
                        onPress={() => { setSaveFolder(f); setShowFolderPicker(false) }}
                        activeOpacity={0.8}
                      >
                        <View style={{ width: 40, height: 40, borderRadius: 10, backgroundColor: colors.primary + "22", alignItems: "center", justifyContent: "center" }}>
                          <Ionicons name="folder" size={20} color={colors.primary} />
                        </View>
                        <Text style={{ flex: 1, fontSize: 15, fontWeight: "600", color: colors.text }}>{f}</Text>
                        {saveFolder === f && <Ionicons name="checkmark-circle" size={22} color={colors.primary} />}
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              </View>
            </Modal>
          </Modal>
        )
      })()}
    </>
  )
}

const makeStyles = (colors: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.background },
  heroImage: { width: "100%", height: 240 },
  actionBar: { flexDirection: "row", gap: 12, padding: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border },
  actionBtn: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card },
  actionBtnActive: { borderColor: colors.primary + "66" },
  actionBtnText: { fontSize: 14, fontWeight: "500", color: colors.text },
  header: { padding: spacing.md },
  title: { fontSize: 22, fontWeight: "800", color: colors.text, marginBottom: 10, lineHeight: 28 },
  subsBanner: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 8, backgroundColor: colors.primary + "22", paddingHorizontal: 10, paddingVertical: 5, borderRadius: radius.md, alignSelf: "flex-start" },
  subsBannerText: { fontSize: 12, color: colors.primary, fontWeight: "600" },
  metaRow: { flexDirection: "row", flexWrap: "wrap", gap: 10, alignItems: "center" },
  metaChip: { flexDirection: "row", alignItems: "center", gap: 4 },
  metaText: { fontSize: 13, color: colors.mutedForeground },
  badge: { backgroundColor: colors.primary + "33", paddingHorizontal: 8, paddingVertical: 2, borderRadius: 99 },
  badgeText: { fontSize: 11, color: colors.primary, fontWeight: "600" },
  tabs: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: colors.border, marginHorizontal: spacing.md },
  tab: { flex: 1, paddingVertical: 12, alignItems: "center", borderBottomWidth: 2, borderBottomColor: "transparent" },
  tabActive: { borderBottomColor: colors.primary },
  tabText: { fontSize: 14, fontWeight: "500", color: colors.mutedForeground },
  tabTextActive: { color: colors.primary, fontWeight: "700" },
  tabContent: { padding: spacing.md },
  summary: { fontSize: 14, color: colors.mutedForeground, lineHeight: 22 },
  nutritionBox: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, overflow: "hidden" },
  nutritionPerServing: { paddingHorizontal: 16, paddingTop: 10, paddingBottom: 4 },
  nutritionPerServingText: { fontSize: 11, color: colors.mutedForeground, textTransform: "uppercase", letterSpacing: 0.4 },
  nutritionCalRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border },
  nutritionCalLabel: { fontSize: 14, fontWeight: "700", color: colors.text, textTransform: "uppercase", letterSpacing: 0.5 },
  nutritionCalValue: { fontSize: 28, fontWeight: "800", color: colors.text },
  nutritionMacros: { flexDirection: "row" },
  nutritionMacroCard: { flex: 1, alignItems: "center", paddingVertical: 12, borderRightWidth: 1, borderRightColor: colors.border },
  nutritionGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  nutritionCard: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: spacing.sm, minWidth: "30%", alignItems: "center", flex: 1 },
  nutritionValue: { fontSize: 18, fontWeight: "700", color: colors.text },
  nutritionLabel: { fontSize: 11, color: colors.mutedForeground, marginTop: 2, textAlign: "center", textTransform: "uppercase", letterSpacing: 0.3 },
  nutritionSub: { fontSize: 10, color: colors.mutedForeground, marginTop: 3, textAlign: "center", fontStyle: "italic" },
  addAllBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", backgroundColor: colors.primary, padding: 14, borderRadius: radius.md, marginBottom: 16 },
  addAllBtnDone: { backgroundColor: colors.muted },
  addAllBtnText: { color: "#fff", fontWeight: "700", fontSize: 15 },
  ingredientRow: { flexDirection: "row", alignItems: "center", paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border },
  ingredientName: { fontSize: 15, fontWeight: "600", color: colors.text },
  ingredientAmount: { fontSize: 13, color: colors.mutedForeground, marginTop: 2 },
  cartBtn: { width: 36, height: 36, borderRadius: 18, borderWidth: 1.5, borderColor: colors.primary, alignItems: "center", justifyContent: "center" },
  cartBtnAdded: { borderColor: colors.destructive },
  cookingModeBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", backgroundColor: colors.primary, padding: 14, borderRadius: radius.md, marginBottom: 4 },
  cookingModeBtnText: { color: "#fff", fontWeight: "700", fontSize: 15 },
  step: { flexDirection: "row", gap: 14, alignItems: "flex-start" },
  stepNum: { width: 28, height: 28, borderRadius: 14, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  stepNumText: { color: "#fff", fontWeight: "700", fontSize: 13 },
  stepText: { flex: 1, fontSize: 14, color: colors.text, lineHeight: 22 },
  ingActions: { flexDirection: "row", alignItems: "center", gap: 8 },
  subBtn: { width: 36, height: 36, borderRadius: 18, borderWidth: 1.5, borderColor: colors.primary + "66", alignItems: "center", justifyContent: "center" },
  pendingSubRow: { flexDirection: "row", alignItems: "center", marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: colors.border },
  subActionBtn: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  wineIntro: { fontSize: 14, color: colors.mutedForeground, lineHeight: 22, fontStyle: "italic" },
  wineCard: { backgroundColor: colors.card, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: spacing.md },
  wineCardLeft: { gap: 6 },
  wineName: { fontSize: 15, fontWeight: "700", color: colors.text },
  wineDesc: { fontSize: 13, color: colors.mutedForeground, lineHeight: 18 },
  wineRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  winePrice: { fontSize: 14, fontWeight: "700", color: colors.primary },
  wineRating: { flexDirection: "row", alignItems: "center", gap: 4 },
  wineRatingText: { fontSize: 13, color: colors.mutedForeground },
  winesLabel: { fontSize: 13, fontWeight: "700", color: colors.text, marginBottom: 10 },
  winesRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  winePill: { backgroundColor: colors.primary + "22", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 99 },
  winePillText: { fontSize: 13, color: colors.primary, fontWeight: "600", textTransform: "capitalize" },
  wineEmptyBox: { alignItems: "center", marginTop: 48, paddingHorizontal: 24, gap: 8 },
  wineEmptyIcon: { fontSize: 40 },
  wineEmptyTitle: { fontSize: 16, fontWeight: "700", color: colors.text },
  wineEmpty: { fontSize: 14, color: colors.mutedForeground, textAlign: "center", lineHeight: 20 },
  // Check flow
  sheetOverlay: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.5)" },
  sheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, gap: 12 },
  sheetTitle: { fontSize: 20, fontWeight: "700", marginBottom: 4 },
  sheetSub: { fontSize: 14, lineHeight: 20, marginBottom: 8 },
  sheetBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: 16, borderRadius: radius.lg },
  sheetBtnText: { color: "#fff", fontWeight: "700", fontSize: 16 },
  checkScreen: { flex: 1, padding: 24, justifyContent: "center", alignItems: "center", gap: 8 },
  checkProgress: { position: "absolute", top: 60, left: 24, right: 24, flexDirection: "row", justifyContent: "space-between" },
  checkProgressText: { fontSize: 14 },
  checkSkipText: { fontSize: 14 },
  checkContent: { alignItems: "center", gap: 6 },
  checkLabel: { fontSize: 16 },
  checkIngredient: { fontSize: 32, fontWeight: "800", textAlign: "center" },
  checkAmount: { fontSize: 14 },
  checkBtns: { flexDirection: "row", gap: 16, width: "100%", marginTop: 8 },
  checkBtn: { flex: 1, alignItems: "center", justifyContent: "center", paddingVertical: 32, borderRadius: radius.lg, gap: 8 },
  checkBtnText: { color: "#fff", fontWeight: "700", fontSize: 16 },
  checkSubLoading: { alignItems: "center", gap: 12 },
  checkSubLoadingText: { fontSize: 14 },
  checkSubBox: { width: "100%", alignItems: "center", gap: 4 },
  checkSubLabel: { fontSize: 12, letterSpacing: 0.5, textTransform: "uppercase" },
  checkSubName: { fontSize: 28, fontWeight: "800" },
  checkSubQuestion: { fontSize: 36, fontWeight: "800", marginTop: 8 },
  checkSubBtns: { flexDirection: "row", gap: 12, width: "100%", marginTop: 32 },
  checkSubBtn: { flex: 1, flexDirection: "column", alignItems: "center", justifyContent: "center", paddingVertical: 18, borderRadius: radius.lg, gap: 4 },
  quickListBadge: { flexDirection: "row", alignItems: "center", gap: 3, backgroundColor: colors.primary + "22", paddingHorizontal: 10, paddingVertical: 5, borderRadius: 99, borderWidth: 1, borderColor: colors.primary + "55" },
  quickListBadgeText: { fontSize: 13, fontWeight: "700" },
  checkSubBtnText: { color: "#fff", fontWeight: "700", fontSize: 16 },
  subsList: { marginTop: 8, alignItems: "center" },
})
