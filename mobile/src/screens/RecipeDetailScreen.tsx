import React, { useEffect, useState } from "react"
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Image, ActivityIndicator, Alert
} from "react-native"
import { Ionicons } from "@expo/vector-icons"
import { useNavigation, useRoute } from "@react-navigation/native"
import { apiFetch } from "../lib/api"
import { useAuth } from "../context/AuthContext"
import { useTheme } from "../context/ThemeContext"
import { useGlobalError } from "../context/GlobalErrorContext"
import { spacing, radius } from "../lib/theme"

type Tab = "overview" | "ingredients" | "steps"

export default function RecipeDetailScreen() {
  const navigation = useNavigation<any>()
  const route = useRoute<any>()
  const { id } = route.params
  const { user } = useAuth()
  const { colors } = useTheme()
  const { showError } = useGlobalError()
  const s = makeStyles(colors)

  const [recipe, setRecipe] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<Tab>("overview")
  const [favourited, setFavourited] = useState(false)
  const [isTried, setIsTried] = useState(false)
  const [addedIngredients, setAddedIngredients] = useState<Set<string>>(new Set())
  const [addingAll, setAddingAll] = useState(false)

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
      const item = { userId: user.id, recipeId: String(recipe.id), ingredientName: name }
      await apiFetch("/api/shopping-list", { method: "DELETE", body: JSON.stringify(item) })
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

  if (loading) return (
    <View style={[s.center, { flex: 1 }]}>
      <ActivityIndicator size="large" color={colors.primary} />
    </View>
  )

  if (!recipe) return null

  const allAdded = recipe.extendedIngredients?.every((i: any) => addedIngredients.has(i.name))

  return (
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
              return (
                <View key={ing.id} style={s.ingredientRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={s.ingredientName}>{ing.name}</Text>
                    <Text style={s.ingredientAmount}>{ing.original}</Text>
                  </View>
                  <TouchableOpacity
                    style={[s.cartBtn, added && s.cartBtnAdded]}
                    onPress={() => toggleIngredient(ing.name, ing.original)}
                  >
                    <Ionicons name={added ? "remove" : "cart-outline"} size={16} color={added ? colors.destructive : colors.primary} />
                  </TouchableOpacity>
                </View>
              )
            })}
          </View>
        )}

        {tab === "steps" && (
          <View style={{ gap: 16 }}>
            {recipe.analyzedInstructions?.[0]?.steps?.length > 0 && (
              <TouchableOpacity
                style={s.cookingModeBtn}
                onPress={() => navigation.navigate("CookingMode", {
                  steps: recipe.analyzedInstructions[0].steps,
                  recipeTitle: recipe.title,
                })}
              >
                <Ionicons name="mic" size={18} color="#fff" style={{ marginRight: 8 }} />
                <Text style={s.cookingModeBtnText}>Start Cooking Mode</Text>
              </TouchableOpacity>
            )}
            {recipe.analyzedInstructions?.[0]?.steps?.map((step: any) => (
              <View key={step.number} style={s.step}>
                <View style={s.stepNum}>
                  <Text style={s.stepNumText}>{step.number}</Text>
                </View>
                <Text style={s.stepText}>{step.step}</Text>
              </View>
            )) ?? <Text style={{ color: colors.mutedForeground }}>No instructions available.</Text>}
          </View>
        )}
      </View>
    </ScrollView>
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
})
