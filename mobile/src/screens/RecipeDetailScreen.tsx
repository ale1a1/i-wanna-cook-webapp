import React, { useEffect, useState, useCallback } from "react"
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Image, ActivityIndicator, Alert, Modal
} from "react-native"
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

type Tab = "overview" | "ingredients" | "steps" | "wine"
type CheckStep = "ask" | "checking" | "done"

function applySubstitutions(text: string, substitutions: Substitution[]): string {
  let result = text
  for (const { original, substitute } of substitutions) {
    const regex = new RegExp(`\\b${original}\\b`, "gi")
    result = result.replace(regex, substitute)
  }
  return result
}

export default function RecipeDetailScreen() {
  const navigation = useNavigation<any>()
  const route = useRoute<any>()
  const { id, fromScan } = route.params
  const { user } = useAuth()
  const { colors } = useTheme()
  const { showError } = useGlobalError()
  const { isPremium } = useSubscription()
  const { saveSession, refreshQuickListCount } = useActiveRecipeSession()
  const s = makeStyles(colors)

  const [recipe, setRecipe] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<Tab>("overview")
  const [favourited, setFavourited] = useState(false)
  const [isTried, setIsTried] = useState(false)
  const [addedIngredients, setAddedIngredients] = useState<Set<string>>(new Set())
  const [addingAll, setAddingAll] = useState(false)
  const [showPaywall, setShowPaywall] = useState(false)
  const [sessionSubstitutions, setSessionSubstitutions] = useState<Substitution[]>([])

  // Wine pairing
  const [winePairing, setWinePairing] = useState<any>(null)
  const [wineLoading, setWineLoading] = useState(false)

  // Ingredient substitutes (premium feature in ingredients tab)
  const [substitutes, setSubstitutes] = useState<Record<string, string[]>>({})
  const [substituteLoading, setSubstituteLoading] = useState<string | null>(null)

  // Ingredient check flow
  const [checkStep, setCheckStep] = useState<CheckStep | null>(fromScan ? "ask" : null)
  const [checkIndex, setCheckIndex] = useState(0)
  const [suggestedSub, setSuggestedSub] = useState<string | null>(null)
  const [loadingSub, setLoadingSub] = useState(false)
  const [awaitingSub, setAwaitingSub] = useState(false)
  const [pendingSubstitutions, setPendingSubstitutions] = useState<Substitution[]>([])

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
    if (!user || !recipe) return
    apiFetch(`/api/favourites?userId=${user.id}`)
      .then(r => r.json())
      .then(data => {
        const ids = (data.favourites || []).map((f: any) => f.recipe_id)
        setFavourited(ids.includes(String(recipe.id)))
      }).catch(() => {})

    apiFetch(`/api/shopping-list?userId=${user.id}`)
      .then(r => r.json())
      .then(data => {
        const existing = (data.items || [])
          .filter((i: any) => i.recipe_id === String(recipe.id))
          .map((i: any) => i.ingredient_name)
        setAddedIngredients(new Set(existing))
      }).catch(() => {})

    apiFetch(`/api/tried-recipes?userId=${user.id}`)
      .then(r => r.json())
      .then(data => {
        const ids = (data.triedRecipes || []).map((t: any) => t.recipe_id)
        setIsTried(ids.includes(String(recipe.id)))
      }).catch(() => {})
  }, [user, recipe?.id])

  const toggleFavourite = async () => {
    if (!user) { navigation.navigate("Login"); return }
    if (favourited) {
      await apiFetch("/api/favourites", { method: "DELETE", body: JSON.stringify({ userId: user.id, recipeId: recipe.id }) })
      setFavourited(false)
    } else {
      await apiFetch("/api/favourites", {
        method: "POST",
        body: JSON.stringify({ userId: user.id, recipeId: recipe.id, recipeTitle: recipe.title, recipeImage: recipe.image, readyInMinutes: recipe.readyInMinutes, servings: recipe.servings }),
      })
      setFavourited(true)
    }
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

  const markTried = async () => {
    if (!user) { navigation.navigate("Login"); return }
    const res = await apiFetch("/api/tried-recipes", {
      method: "POST",
      screen: "Recipe Detail",
      body: JSON.stringify({ userId: user.id, recipeId: String(recipe.id), recipeTitle: recipe.title }),
    })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      showError(data?.error ?? `Error ${res.status}`, "Recipe Detail", markTried)
      return
    }
    setIsTried(true)
    Alert.alert("Marked as tried!")
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

  const fetchSubstitute = useCallback(async (ingredient: string) => {
    if (!isPremium) { setShowPaywall(true); return }
    if (substitutes[ingredient]) return
    setSubstituteLoading(ingredient)
    try {
      const res = await apiFetch(`/api/recipes/substitute?ingredient=${encodeURIComponent(ingredient)}`, { screen: "Recipe Detail" })
      const data = await res.json()
      setSubstitutes(prev => ({ ...prev, [ingredient]: res.ok ? (data.substitutes ?? []) : ["No substitutes found"] }))
    } catch {
      setSubstitutes(prev => ({ ...prev, [ingredient]: ["No substitutes found"] }))
    } finally { setSubstituteLoading(null) }
  }, [isPremium, substitutes])

  // ── INGREDIENT CHECK FLOW ──────────────────────────────────

  const ingredients = recipe?.extendedIngredients ?? []
  const currentIngredient = ingredients[checkIndex]

  const advanceCheck = (subs: Substitution[]) => {
    setSuggestedSub(null)
    setAwaitingSub(false)
    if (checkIndex + 1 >= ingredients.length) {
      finishCheck(subs)
    } else {
      setCheckIndex(i => i + 1)
    }
  }

  const fetchSuggestedSub = useCallback(async (ingredient: string) => {
    setLoadingSub(true)
    setSuggestedSub(null)
    try {
      const res = await fetch(`${API_BASE_URL}/api/recipes/suggest-substitute`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ingredient, recipeTitle: recipe?.title }),
      })
      const data = await res.json()
      setSuggestedSub(data.substitute ?? null)
    } catch { setSuggestedSub(null) }
    finally { setLoadingSub(false) }
  }, [recipe?.title])

  const handleHaveIt = () => {
    advanceCheck(pendingSubstitutions)
  }

  const handleDontHaveIt = () => {
    setAwaitingSub(true)
    fetchSuggestedSub(currentIngredient.name)
  }

  const handleUseSub = () => {
    if (!suggestedSub) return
    const newSubs = [...pendingSubstitutions, { original: currentIngredient.name, substitute: suggestedSub }]
    setPendingSubstitutions(newSubs)
    advanceCheck(newSubs)
  }

  const handleBuyIt = async () => {
    if (!user) return
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
        <Modal visible animationType="slide" transparent>
          <View style={s.sheetOverlay}>
            <View style={[s.sheet, { backgroundColor: colors.card }]}>
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
        <Modal visible animationType="fade" transparent={false} statusBarTranslucent>
          <View style={[s.checkScreen, { backgroundColor: colors.background }]}>
            <View style={s.checkProgress}>
              <Text style={[s.checkProgressText, { color: colors.mutedForeground }]}>
                {checkIndex + 1} of {ingredients.length}
              </Text>
              <TouchableOpacity onPress={() => finishCheck(pendingSubstitutions)}>
                <Text style={[s.checkSkipText, { color: colors.mutedForeground }]}>Skip all</Text>
              </TouchableOpacity>
            </View>

            <View style={s.checkContent}>
              <Text style={[s.checkLabel, { color: colors.mutedForeground }]}>Do you have</Text>
              <Text style={[s.checkIngredient, { color: colors.text }]}>{currentIngredient.name}</Text>
              <Text style={[s.checkAmount, { color: colors.mutedForeground }]}>{currentIngredient.original}</Text>
            </View>

            {!awaitingSub && (
              <View style={s.checkBtns}>
                <TouchableOpacity style={[s.checkBtn, { backgroundColor: colors.primary }]} onPress={handleHaveIt} activeOpacity={0.8}>
                  <Ionicons name="checkmark" size={32} color="#fff" />
                  <Text style={s.checkBtnText}>I have it</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[s.checkBtn, { backgroundColor: colors.card, borderWidth: 1.5, borderColor: colors.border }]} onPress={handleDontHaveIt} activeOpacity={0.8}>
                  <Ionicons name="close" size={32} color={colors.text} />
                  <Text style={[s.checkBtnText, { color: colors.text }]}>I don't have it</Text>
                </TouchableOpacity>
              </View>
            )}

            {awaitingSub && loadingSub && (
              <View style={s.checkSubLoading}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={[s.checkSubLoadingText, { color: colors.mutedForeground }]}>Finding a substitute…</Text>
              </View>
            )}

            {awaitingSub && !loadingSub && suggestedSub && (
              <View style={s.checkSubBox}>
                <Text style={[s.checkSubLabel, { color: colors.mutedForeground }]}>Try this instead:</Text>
                <Text style={[s.checkSubName, { color: colors.text }]}>{suggestedSub}</Text>
                <View style={s.checkSubBtns}>
                  <TouchableOpacity style={[s.checkSubBtn, { backgroundColor: colors.primary }]} onPress={handleUseSub} activeOpacity={0.8}>
                    <Text style={s.checkSubBtnText}>Use it</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[s.checkSubBtn, { backgroundColor: colors.card, borderWidth: 1.5, borderColor: colors.border }]} onPress={handleBuyIt} activeOpacity={0.8}>
                    <Ionicons name="flash" size={16} color={colors.primary} style={{ marginRight: 6 }} />
                    <Text style={[s.checkSubBtnText, { color: colors.text }]}>Buy it</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {awaitingSub && !loadingSub && !suggestedSub && (
              <View style={s.checkSubBox}>
                <Text style={[s.checkSubLabel, { color: colors.mutedForeground }]}>No substitute found</Text>
                <View style={s.checkSubBtns}>
                  <TouchableOpacity style={[s.checkSubBtn, { backgroundColor: colors.primary }]} onPress={handleBuyIt} activeOpacity={0.8}>
                    <Ionicons name="flash" size={16} color="#fff" style={{ marginRight: 6 }} />
                    <Text style={s.checkSubBtnText}>Buy it</Text>
                  </TouchableOpacity>
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
      const missing = pendingSubstitutions.length
      return (
        <Modal visible animationType="fade" transparent={false} statusBarTranslucent>
          <View style={[s.checkScreen, { backgroundColor: colors.background }]}>
            <Ionicons name="checkmark-circle" size={64} color={colors.primary} style={{ marginBottom: 16 }} />
            <Text style={[s.checkIngredient, { color: colors.text, textAlign: "center" }]}>
              {missing === 0 ? "You have everything!" : `${missing} substitution${missing > 1 ? "s" : ""} applied`}
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
            <TouchableOpacity style={[s.sheetBtn, { backgroundColor: colors.primary, marginTop: 32 }]} onPress={() => setCheckStep(null)} activeOpacity={0.8}>
              <Text style={s.sheetBtnText}>Open recipe</Text>
            </TouchableOpacity>
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
          <TouchableOpacity style={[s.actionBtn, favourited && s.actionBtnActive]} onPress={toggleFavourite}>
            <Ionicons name={favourited ? "heart" : "heart-outline"} size={20} color={favourited ? colors.primary : colors.text} />
            <Text style={[s.actionBtnText, favourited && { color: colors.primary }]}>
              {favourited ? "Saved" : "Save"}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity style={[s.actionBtn, isTried && s.actionBtnActive]} onPress={markTried}>
            <Ionicons name={isTried ? "checkmark-circle" : "checkmark-circle-outline"} size={20} color={isTried ? colors.green : colors.text} />
            <Text style={[s.actionBtnText, isTried && { color: colors.green }]}>
              {isTried ? "Tried" : "Mark tried"}
            </Text>
          </TouchableOpacity>
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
          <TouchableOpacity style={[s.tab, tab === "wine" && s.tabActive]} onPress={fetchWinePairing}>
            <Text style={[s.tabText, tab === "wine" && s.tabTextActive]}>🍷 Wine</Text>
          </TouchableOpacity>
        </View>

        <View style={s.tabContent}>
          {tab === "overview" && (
            <View style={{ gap: 16 }}>
              {recipe.summary ? (
                <Text style={s.summary}>
                  {recipe.summary.replace(/<[^>]+>/g, "").slice(0, 400)}...
                </Text>
              ) : null}
              {recipe.nutrition?.nutrients && (
                <View style={s.nutritionGrid}>
                  {recipe.nutrition.nutrients.slice(0, 6).map((n: any) => (
                    <View key={n.name} style={s.nutritionCard}>
                      <Text style={s.nutritionValue}>{Math.round(n.amount)}{n.unit}</Text>
                      <Text style={s.nutritionLabel}>{n.name}</Text>
                    </View>
                  ))}
                </View>
              )}
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

              {recipe.extendedIngredients?.map((ing: any) => {
                const added = addedIngredients.has(ing.name)
                const subs = substitutes[ing.name]
                const loadingSubPremium = substituteLoading === ing.name
                const appliedSub = sessionSubstitutions.find(s => s.original === ing.name)
                return (
                  <View key={ing.id} style={s.ingredientRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={[s.ingredientName, appliedSub && { textDecorationLine: "line-through", color: colors.muted }]}>{ing.name}</Text>
                      {appliedSub && <Text style={[s.ingredientName, { color: colors.primary }]}>→ {appliedSub.substitute}</Text>}
                      <Text style={s.ingredientAmount}>{ing.original}</Text>
                      {subs && (
                        <View style={s.subsBox}>
                          <Text style={s.subsLabel}>Substitutes:</Text>
                          {subs.map((sub, i) => <Text key={i} style={s.subItem}>• {sub}</Text>)}
                        </View>
                      )}
                    </View>
                    <View style={s.ingActions}>
                      <TouchableOpacity
                        style={s.subBtn}
                        onPress={() => fetchSubstitute(ing.name)}
                        disabled={loadingSubPremium}
                      >
                        {loadingSubPremium
                          ? <ActivityIndicator size="small" color={colors.primary} />
                          : <Ionicons name="swap-horizontal-outline" size={16} color={colors.primary} />
                        }
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[s.cartBtn, added && s.cartBtnAdded]}
                        onPress={() => toggleIngredient(ing.name, ing.original)}
                      >
                        <Ionicons name={added ? "remove" : "cart-outline"} size={16} color={added ? colors.destructive : colors.primary} />
                      </TouchableOpacity>
                    </View>
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
                <Text style={s.wineEmpty}>No wine pairing found for this recipe.</Text>
              )}
            </View>
          )}
        </View>

        <PaywallModal visible={showPaywall} onClose={() => setShowPaywall(false)} featureName="Wine Pairing & Substitutes" />
      </ScrollView>

      {renderCheckModal()}
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
  nutritionGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  nutritionCard: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: spacing.sm, minWidth: "30%", alignItems: "center", flex: 1 },
  nutritionValue: { fontSize: 18, fontWeight: "700", color: colors.text },
  nutritionLabel: { fontSize: 11, color: colors.mutedForeground, marginTop: 2, textAlign: "center" },
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
  subsBox: { marginTop: 8, backgroundColor: colors.card, borderRadius: radius.sm, padding: 10, borderWidth: 1, borderColor: colors.border },
  subsLabel: { fontSize: 11, fontWeight: "700", color: colors.primary, textTransform: "uppercase", marginBottom: 4 },
  subItem: { fontSize: 13, color: colors.text, lineHeight: 20 },
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
  wineEmpty: { fontSize: 14, color: colors.mutedForeground, textAlign: "center", marginTop: 32 },
  // Check flow
  sheetOverlay: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.5)" },
  sheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, gap: 12 },
  sheetTitle: { fontSize: 20, fontWeight: "700", marginBottom: 4 },
  sheetSub: { fontSize: 14, lineHeight: 20, marginBottom: 8 },
  sheetBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: 16, borderRadius: radius.lg },
  sheetBtnText: { color: "#fff", fontWeight: "700", fontSize: 16 },
  checkScreen: { flex: 1, padding: 24, justifyContent: "center", alignItems: "center", gap: 16 },
  checkProgress: { position: "absolute", top: 60, left: 24, right: 24, flexDirection: "row", justifyContent: "space-between" },
  checkProgressText: { fontSize: 14 },
  checkSkipText: { fontSize: 14 },
  checkContent: { alignItems: "center", gap: 8 },
  checkLabel: { fontSize: 16 },
  checkIngredient: { fontSize: 32, fontWeight: "800", textAlign: "center" },
  checkAmount: { fontSize: 14 },
  checkBtns: { flexDirection: "row", gap: 16, width: "100%" },
  checkBtn: { flex: 1, alignItems: "center", justifyContent: "center", paddingVertical: 32, borderRadius: radius.lg, gap: 8 },
  checkBtnText: { color: "#fff", fontWeight: "700", fontSize: 16 },
  checkSubLoading: { alignItems: "center", gap: 12 },
  checkSubLoadingText: { fontSize: 14 },
  checkSubBox: { width: "100%", alignItems: "center", gap: 12 },
  checkSubLabel: { fontSize: 14 },
  checkSubName: { fontSize: 28, fontWeight: "800" },
  checkSubBtns: { flexDirection: "row", gap: 12, width: "100%" },
  checkSubBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: 18, borderRadius: radius.lg },
  checkSubBtnText: { color: "#fff", fontWeight: "700", fontSize: 16 },
  subsList: { marginTop: 8, alignItems: "center" },
})
