import React, { useCallback, useState, useMemo } from "react"
import { View, Text, StyleSheet, TouchableOpacity, Image, ActivityIndicator, Modal, ScrollView, Alert, TextInput } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { Ionicons } from "@expo/vector-icons"
import { useNavigation, useFocusEffect } from "@react-navigation/native"
import { apiFetch } from "../lib/api"
import { useAuth } from "../context/AuthContext"
import { useTheme } from "../context/ThemeContext"
import { useGlobalError } from "../context/GlobalErrorContext"
import { spacing, radius } from "../lib/theme"
import DraggableList from "../components/DraggableList"

type ListType = "toTry" | "tried"
type ViewLevel = "home" | "folders" | "recipes"

type Recipe = {
  recipeId: string
  title: string
  image: string
  readyInMinutes: number
  servings: number
  tags: string[]
  folder: string | null
  searchFilters: Record<string, any> | null
  // tried fields
  triedOn?: string
  satisfaction?: number
  timeAccuracy?: number
  difficulty?: string
  isTried: boolean
  isSaved: boolean
}

const DIFFICULTIES = ["Very Easy", "Easy", "Moderate", "Difficult", "Very Difficult"]
const SUGGESTED_TAGS = ["Romantic", "Weekend", "Treat", "Kids", "Quick", "Healthy", "Comfort", "Batch Cook"]
const DIET_LABELS: Record<string, string> = { vegetarian: "Vegetarian", vegan: "Vegan", glutenFree: "GF", keto: "Keto", paleo: "Paleo" }
const PREP_LABELS: Record<string, string> = { under15: "< 15 min", under30: "< 30 min", under60: "< 1 hr", over60: "> 1 hr" }
const BUDGET_LABELS: Record<string, string> = { cheap: "Cheap", moderate: "Moderate", expensive: "Premium" }
const TASTE_LABELS: Record<string, string> = { sweet: "Sweet", salty: "Salty", spicy: "Spicy", savory: "Savory" }
const HEALTH_LABELS: Record<string, string> = { healthy: "Healthy", veryHealthy: "Very Healthy", indulgent: "Indulgent" }

const FILTER_SECTION_LABELS: Record<string, string> = {
  diet: "Diet", cuisine: "Cuisine", prepTime: "Prep Time",
  budget: "Budget", taste: "Taste", healthiness: "Health",
}
const FILTER_VALUE_LABELS: Record<string, Record<string, string>> = {
  diet: DIET_LABELS, prepTime: PREP_LABELS, budget: BUDGET_LABELS, taste: TASTE_LABELS, healthiness: HEALTH_LABELS,
}

function labelFor(field: string, value: string): string {
  const map = FILTER_VALUE_LABELS[field]
  if (map?.[value]) return map[value]
  return value.charAt(0).toUpperCase() + value.slice(1)
}

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

  // navigation state
  const [viewLevel, setViewLevel] = useState<ViewLevel>("home")
  const [activeList, setActiveList] = useState<ListType>("toTry")
  const [openFolder, setOpenFolder] = useState<string | null>(null) // null = Main List

  // folder order per list (drag to reorder)
  const [toTryFolderOrder, setToTryFolderOrder] = useState<string[]>([])
  const [triedFolderOrder, setTriedFolderOrder] = useState<string[]>([])

  // data
  const [toTryRecipes, setToTryRecipes] = useState<Recipe[]>([])
  const [triedRecipes, setTriedRecipes] = useState<Recipe[]>([])
  const [loading, setLoading] = useState(true)

  // filters — global per list, persist across folders
  const [activeFilters, setActiveFilters] = useState<Record<string, string>>({})
  const [filterModalOpen, setFilterModalOpen] = useState(false)

  // rating modal
  const [ratingModal, setRatingModal] = useState(false)
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null)
  const [ratingValues, setRatingValues] = useState({ satisfaction: 0, timeAccuracy: 0, difficulty: "Moderate" })

  // tag edit modal (to-try only)
  const [tagEditModal, setTagEditModal] = useState(false)
  const [tagEditRecipe, setTagEditRecipe] = useState<Recipe | null>(null)
  const [editingTags, setEditingTags] = useState<string[]>([])
  const [customTag, setCustomTag] = useState("")

  // move modal (recipe)
  const [moveModal, setMoveModal] = useState<{ recipe: Recipe; listType: ListType } | null>(null)
  const [moveTarget, setMoveTarget] = useState("")
  const [moveCustom, setMoveCustom] = useState("")
  const [moving, setMoving] = useState(false)

  // recipe action sheet
  const [recipeActionSheet, setRecipeActionSheet] = useState<Recipe | null>(null)

  // folder actions (rename/delete)
  const [folderActionModal, setFolderActionModal] = useState<{ folder: string; listType: ListType; step: "menu" | "rename" } | null>(null)
  const [folderRenameValue, setFolderRenameValue] = useState("")

  // recipe order per folder (drag to reorder)
  const [recipeOrder, setRecipeOrder] = useState<Record<string, string[]>>({})  // key = `${listType}:${folder ?? "__main__"}`

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

      const savedList: Recipe[] = (favsData.favourites ?? []).map((f: any) => ({
        recipeId: f.recipe_id,
        title: f.recipe_title,
        image: f.recipe_image,
        readyInMinutes: f.ready_in_minutes ?? 0,
        servings: f.servings ?? 0,
        tags: f.tags ?? [],
        folder: f.folder ?? null,
        searchFilters: f.search_filters ?? null,
        isSaved: true,
        isTried: false,
      }))

      const triedList: Recipe[] = (triedData.triedRecipes ?? []).map((t: any) => ({
        recipeId: t.recipe_id,
        title: t.recipe_title,
        image: t.recipe_image ?? `https://spoonacular.com/recipeImages/${t.recipe_id}-312x231.jpg`,
        readyInMinutes: t.estimated_time ?? 0,
        servings: 0,
        tags: [],
        folder: t.folder ?? null,
        searchFilters: t.search_filters ?? null,
        isSaved: false,
        isTried: true,
        triedOn: t.tried_on,
        satisfaction: t.satisfaction,
        timeAccuracy: t.time_accuracy,
        difficulty: t.difficulty,
      }))

      setToTryRecipes(savedList)
      setTriedRecipes(triedList)

      const toTryFolders = Array.from(new Set(savedList.map(r => r.folder).filter(Boolean))) as string[]
      setToTryFolderOrder(prev => {
        const existing = prev.filter(f => toTryFolders.includes(f))
        const newFolders = toTryFolders.filter(f => !existing.includes(f))
        return [...existing, ...newFolders]
      })
      const triedFolders = Array.from(new Set(triedList.map(r => r.folder).filter(Boolean))) as string[]
      setTriedFolderOrder(prev => {
        const existing = prev.filter(f => triedFolders.includes(f))
        const newFolders = triedFolders.filter(f => !existing.includes(f))
        return [...existing, ...newFolders]
      })
    } catch (e: any) {
      showError(e?.message ?? "Failed to load recipes", "My Recipes", fetchAll)
    } finally { setLoading(false) }
  }, [user])

  useFocusEffect(useCallback(() => {
    if (!user) { navigation.navigate("Login"); return }
    fetchAll()
  }, [user, fetchAll]))

  const currentRecipes = activeList === "toTry" ? toTryRecipes : triedRecipes
  const setCurrentRecipes = activeList === "toTry" ? setToTryRecipes : setTriedRecipes

  // folders for current list
  const folders = useMemo(() => {
    const all = Array.from(new Set(currentRecipes.map(r => r.folder).filter(Boolean))) as string[]
    return all
  }, [currentRecipes])

  // recipes in current folder view (null = main list)
  const recipesInView = useMemo(() => {
    return currentRecipes.filter(r => r.folder === openFolder)
  }, [currentRecipes, openFolder])

  // collect all filter field→values present across the whole current list
  const listFilterOptions = useMemo(() => {
    const fields = ["diet", "cuisine", "prepTime", "budget", "taste", "healthiness"]
    const options: Record<string, Set<string>> = {}
    for (const r of currentRecipes) {
      if (!r.searchFilters) continue
      for (const field of fields) {
        const val = r.searchFilters[field]
        if (val) {
          if (!options[field]) options[field] = new Set()
          options[field].add(val)
        }
      }
    }
    return Object.fromEntries(Object.entries(options).map(([k, v]) => [k, Array.from(v)]))
  }, [currentRecipes])

  const applyFilters = (recipes: Recipe[]) => {
    const entries = Object.entries(activeFilters)
    if (!entries.length) return recipes
    return recipes.filter(r => entries.every(([field, value]) => r.searchFilters?.[field] === value))
  }

  const clearFilters = () => setActiveFilters({})

  const recipeOrderKey = `${activeList}:${openFolder ?? "__main__"}`

  const orderedRecipesInView = useMemo(() => {
    const order = recipeOrder[recipeOrderKey]
    if (!order || !order.length) return recipesInView
    const map = new Map(recipesInView.map(r => [r.recipeId, r]))
    const sorted = order.map(id => map.get(id)).filter(Boolean) as Recipe[]
    const unsorted = recipesInView.filter(r => !order.includes(r.recipeId))
    return [...sorted, ...unsorted]
  }, [recipesInView, recipeOrder, recipeOrderKey])

  const filteredOrderedRecipes = useMemo(() => applyFilters(orderedRecipesInView), [orderedRecipesInView, activeFilters])

  const toggleFilter = (field: string, value: string) => {
    setActiveFilters(prev => {
      if (prev[field] === value) {
        const next = { ...prev }
        delete next[field]
        return next
      }
      return { ...prev, [field]: value }
    })
  }

  const openFolderView = (folder: string | null, list: ListType) => {
    setActiveList(list)
    setOpenFolder(folder)
    setViewLevel("recipes")
  }

  const switchList = (list: ListType) => {
    setActiveList(list)
    clearFilters()
    setViewLevel("folders")
  }

  // ── REMOVE ──
  const removeFromList = (recipe: Recipe) => {
    const listName = activeList === "toTry" ? "Try List" : "Tried"
    Alert.alert(`Remove from ${listName}`, `Remove "${recipe.title}"?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove", style: "destructive", onPress: async () => {
          setCurrentRecipes(prev => prev.filter(r => r.recipeId !== recipe.recipeId))
          const endpoint = activeList === "toTry" ? "/api/favourites" : "/api/tried-recipes"
          await apiFetch(endpoint, { method: "DELETE", body: JSON.stringify({ userId: user!.id, recipeId: recipe.recipeId }) })
        }
      },
    ])
  }

  // ── MOVE ──
  const confirmMoveOrCopy = async () => {
    if (!moveModal || !user) return
    const { recipe, listType } = moveModal
    const target = moveTarget === "__custom__" ? moveCustom.trim() : moveTarget || null
    setMoving(true)
    try {
      const endpoint = listType === "toTry" ? "/api/favourites" : "/api/tried-recipes"
      await apiFetch(endpoint, { method: "PATCH", body: JSON.stringify({ userId: user.id, recipeId: recipe.recipeId, targetFolder: target }) })
      setCurrentRecipes(prev => prev.map(r => r.recipeId === recipe.recipeId ? { ...r, folder: target } : r))
      setMoveModal(null)
    } catch { Alert.alert("Error", "Failed to move recipe.") }
    finally { setMoving(false) }
  }

  // ── RATING ──
  const openRating = (recipe: Recipe) => {
    setSelectedRecipe(recipe)
    setRatingValues({ satisfaction: recipe.satisfaction ?? 0, timeAccuracy: recipe.timeAccuracy ?? 0, difficulty: recipe.difficulty ?? "Moderate" })
    setRatingModal(true)
  }

  const submitRating = async () => {
    if (!selectedRecipe) return
    try {
      await apiFetch("/api/tried-recipes", { method: "PATCH", screen: "My Recipes", body: JSON.stringify({ userId: user!.id, recipeId: selectedRecipe.recipeId, ...ratingValues }) })
      setTriedRecipes(prev => prev.map(r => r.recipeId === selectedRecipe.recipeId ? { ...r, ...ratingValues } : r))
      setRatingModal(false)
    } catch (e: any) { setRatingModal(false); showError(e?.message ?? "Network error", "My Recipes") }
  }

  // ── TAGS ──
  const openTagEdit = (recipe: Recipe) => {
    setTagEditRecipe(recipe)
    setEditingTags([...recipe.tags])
    setCustomTag("")
    setTagEditModal(true)
  }

  const saveTagEdit = async () => {
    if (!tagEditRecipe || !user) return
    await apiFetch("/api/favourites", { method: "PATCH", body: JSON.stringify({ userId: user.id, recipeId: tagEditRecipe.recipeId, tags: editingTags }) })
    setToTryRecipes(prev => prev.map(r => r.recipeId === tagEditRecipe.recipeId ? { ...r, tags: editingTags } : r))
    setTagEditModal(false)
  }

  // ── MARK AS TRIED (from To Try folder view) ──
  const markAsTried = async (recipe: Recipe) => {
    Alert.alert("Mark as Tried", `Move "${recipe.title}" to your Tried list?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Mark Tried", onPress: async () => {
          try {
            await Promise.all([
              apiFetch("/api/tried-recipes", {
                method: "POST",
                body: JSON.stringify({ userId: user!.id, recipeId: recipe.recipeId, recipeTitle: recipe.title, folder: recipe.folder, searchFilters: recipe.searchFilters }),
              }),
              apiFetch("/api/favourites", {
                method: "DELETE",
                body: JSON.stringify({ userId: user!.id, recipeId: recipe.recipeId }),
              }),
            ])
            setToTryRecipes(prev => prev.filter(r => r.recipeId !== recipe.recipeId))
            const newTried: Recipe = { ...recipe, isTried: true, isSaved: false, satisfaction: undefined, timeAccuracy: undefined, difficulty: undefined }
            setTriedRecipes(prev => [newTried, ...prev.filter(r => r.recipeId !== recipe.recipeId)])
          } catch { Alert.alert("Error", "Failed to mark as tried.") }
        }
      },
    ])
  }

  // ── FOLDER RENAME / DELETE ──
  const renameFolder = async () => {
    if (!folderActionModal || !user) return
    const { folder, listType } = folderActionModal
    const newName = folderRenameValue.trim()
    if (!newName || newName === folder) { setFolderActionModal(null); return }
    const endpoint = listType === "toTry" ? "/api/favourites" : "/api/tried-recipes"
    const list = listType === "toTry" ? toTryRecipes : triedRecipes
    const toRename = list.filter(r => r.folder === folder)
    await Promise.all(toRename.map(r => apiFetch(endpoint, { method: "PATCH", body: JSON.stringify({ userId: user.id, recipeId: r.recipeId, targetFolder: newName }) })))
    const setter = listType === "toTry" ? setToTryRecipes : setTriedRecipes
    setter(prev => prev.map(r => r.folder === folder ? { ...r, folder: newName } : r))
    const orderSetter = listType === "toTry" ? setToTryFolderOrder : setTriedFolderOrder
    orderSetter(prev => prev.map(f => f === folder ? newName : f))
    setFolderActionModal(null)
  }

  const deleteFolder = (folder: string, listType: ListType) => {
    Alert.alert("Delete Folder", `Delete folder "${folder}" and remove all its recipes from your ${listType === "toTry" ? "Try List" : "Tried"} list?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete", style: "destructive", onPress: async () => {
          if (!user) return
          const endpoint = listType === "toTry" ? "/api/favourites" : "/api/tried-recipes"
          const list = listType === "toTry" ? toTryRecipes : triedRecipes
          const toDelete = list.filter(r => r.folder === folder)
          await Promise.all(toDelete.map(r => apiFetch(endpoint, { method: "DELETE", body: JSON.stringify({ userId: user.id, recipeId: r.recipeId }) })))
          const setter = listType === "toTry" ? setToTryRecipes : setTriedRecipes
          setter(prev => prev.filter(r => r.folder !== folder))
          const orderSetter = listType === "toTry" ? setToTryFolderOrder : setTriedFolderOrder
          orderSetter(prev => prev.filter(f => f !== folder))
          setFolderActionModal(null)
          if (viewLevel === "recipes" && openFolder === folder) setViewLevel("folders")
        }
      },
    ])
  }

  if (!user) return null
  if (loading) return <View style={s.center}><ActivityIndicator size="large" color={colors.primary} /></View>

  const toTryCount = toTryRecipes.length
  const triedCount = triedRecipes.length

  // shared across folders and recipes views
  const hasFilters = Object.keys(activeFilters).length > 0
  const filterCount = Object.keys(activeFilters).length
  const hasFilterOptions = Object.keys(listFilterOptions).length > 0

  const filterModal = (
    <Modal visible={filterModalOpen} transparent animationType="slide">
      <TouchableOpacity style={s.modalOverlay} activeOpacity={1} onPress={() => setFilterModalOpen(false)}>
        <View style={s.filterSheet}>
          <View style={s.filterSheetHandle} />
          <View style={s.filterSheetHeader}>
            <Text style={s.filterSheetTitle}>Filter Recipes</Text>
            {hasFilters && (
              <TouchableOpacity onPress={() => { clearFilters(); setFilterModalOpen(false) }}>
                <Text style={{ color: colors.destructive, fontWeight: "600", fontSize: 14 }}>Clear all</Text>
              </TouchableOpacity>
            )}
          </View>
          <ScrollView contentContainerStyle={{ padding: spacing.md, gap: 20 }}>
            {hasFilterOptions ? Object.entries(listFilterOptions).map(([field, values]) => (
              <View key={field}>
                <Text style={s.filterSectionLabel}>{FILTER_SECTION_LABELS[field] ?? field}</Text>
                <View style={s.filterChipsRow}>
                  {values.map(value => {
                    const active = activeFilters[field] === value
                    return (
                      <TouchableOpacity
                        key={value}
                        style={[s.filterChip, active && s.filterChipActive]}
                        onPress={() => toggleFilter(field, value)}
                      >
                        <Text style={[s.filterChipText, active && s.filterChipTextActive]}>{labelFor(field, value)}</Text>
                      </TouchableOpacity>
                    )
                  })}
                </View>
              </View>
            )) : (
              <Text style={{ color: colors.mutedForeground, fontSize: 14 }}>No filter options yet — save recipes from a filtered search to enable this.</Text>
            )}
          </ScrollView>
        </View>
      </TouchableOpacity>
    </Modal>
  )

  // ────────────────────────────────────────────
  // HOME: two big buttons
  // ────────────────────────────────────────────
  if (viewLevel === "home") {
    return (
      <SafeAreaView style={s.container} edges={["top"]}>
        <View style={s.topBar}>
          <Text style={s.title}>My Recipes</Text>
        </View>
        <View style={s.homeContent}>
          <TouchableOpacity style={[s.bigBtn, { backgroundColor: colors.primary }]} onPress={() => switchList("toTry")} activeOpacity={0.85}>
            <Ionicons name="bookmark-outline" size={26} color="#fff" />
            <Text style={s.bigBtnText}>To Try</Text>
            <Text style={s.bigBtnCount}>({toTryCount})</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[s.bigBtn, s.bigBtnOrange]} onPress={() => switchList("tried")} activeOpacity={0.85}>
            <Ionicons name="checkmark-circle-outline" size={26} color={colors.primary} />
            <Text style={[s.bigBtnText, { color: colors.primary }]}>Tried</Text>
            <Text style={[s.bigBtnCount, { color: colors.primary + "99" }]}>({triedCount})</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    )
  }

  // ────────────────────────────────────────────
  // FOLDER LIST VIEW
  // ────────────────────────────────────────────
  if (viewLevel === "folders") {
    const list = activeList === "toTry" ? toTryRecipes : triedRecipes
    const listLabel = activeList === "toTry" ? "To Try" : "Tried"
    const accentColor = activeList === "toTry" ? colors.primary : "#22c55e"
    const folderOrder = activeList === "toTry" ? toTryFolderOrder : triedFolderOrder
    const folderVisibleCount = (folder: string | null) => applyFilters(list.filter(r => r.folder === folder)).length

    return (
      <SafeAreaView style={s.container} edges={["top"]}>
        <View style={s.header}>
          <TouchableOpacity onPress={() => setViewLevel("home")} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={s.headerTitle}>{listLabel}</Text>
          <TouchableOpacity style={s.filterBtn} onPress={() => setFilterModalOpen(true)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="options-outline" size={22} color={hasFilters ? colors.primary : colors.text} />
            {hasFilters && <View style={s.filterBadge}><Text style={s.filterBadgeText}>{filterCount}</Text></View>}
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={{ padding: spacing.md }}>
          {/* Main List — not draggable, no 3-dots */}
          <TouchableOpacity style={[s.folderCard, { marginBottom: 12 }]} onPress={() => openFolderView(null, activeList)} activeOpacity={0.8}>
            <View style={[s.folderIconBg, { backgroundColor: accentColor + "22" }]}>
              <Ionicons name="list" size={22} color={accentColor} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.folderName}>Main List</Text>
              <Text style={s.folderCount}>{folderVisibleCount(null)} recipe{folderVisibleCount(null) !== 1 ? "s" : ""}{hasFilters ? " (filtered)" : ""}</Text>
            </View>
          </TouchableOpacity>

          {/* Named folders — draggable */}
          {folderOrder.length > 0 && (
            <DraggableList
              data={folderOrder}
              keyExtractor={f => f}
              itemHeight={78}
              onReorder={activeList === "toTry" ? setToTryFolderOrder : setTriedFolderOrder}
              renderItem={(folder, _, isDragging) => {
                const count = folderVisibleCount(folder)
                return (
                  <View style={{ paddingBottom: 12 }}>
                    <TouchableOpacity
                      style={[s.folderCard, isDragging && { elevation: 8, opacity: 0.92 }]}
                      onPress={() => openFolderView(folder, activeList)}
                      activeOpacity={0.8}
                    >
                      <View style={[s.folderIconBg, { backgroundColor: accentColor + "22" }]}>
                        <Ionicons name="folder" size={22} color={accentColor} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={s.folderName}>{folder}</Text>
                        <Text style={s.folderCount}>{count} recipe{count !== 1 ? "s" : ""}{hasFilters ? " (filtered)" : ""}</Text>
                      </View>
                      <TouchableOpacity
                        onPress={() => { setFolderActionModal({ folder, listType: activeList, step: "menu" }); setFolderRenameValue(folder) }}
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
          )}

          {list.length === 0 && (
            <View style={s.empty}>
              <Ionicons name={activeList === "toTry" ? "bookmark-outline" : "checkmark-circle-outline"} size={56} color={colors.muted} />
              <Text style={s.emptyTitle}>No {listLabel} recipes yet</Text>
              <Text style={s.emptySubText}>{activeList === "toTry" ? "Find recipes and add them to your try list." : "Search for recipes and mark them as tried."}</Text>
              <TouchableOpacity style={[s.browseBtn, { backgroundColor: accentColor }]} onPress={() => navigation.navigate("Search")}>
                <Text style={s.browseBtnText}>Browse Recipes</Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>

        {/* Folder actions modal */}
        {folderActionModal && (
          <Modal visible transparent animationType="fade" onRequestClose={() => setFolderActionModal(null)}>
            <TouchableOpacity style={s.modalOverlay} activeOpacity={1} onPress={() => setFolderActionModal(null)}>
              <View style={s.actionSheet}>
                {folderActionModal.step === "menu" ? (
                  <>
                    <Text style={s.actionSheetTitle}>{folderActionModal.folder}</Text>
                    <TouchableOpacity style={s.actionSheetRow} onPress={() => setFolderActionModal(f => f ? { ...f, step: "rename" } : null)}>
                      <Ionicons name="pencil-outline" size={20} color={colors.text} />
                      <Text style={s.actionSheetRowText}>Rename</Text>
                      <Ionicons name="chevron-forward" size={16} color={colors.muted} />
                    </TouchableOpacity>
                    <TouchableOpacity style={[s.actionSheetRow, s.actionSheetRowDestructive]} onPress={() => deleteFolder(folderActionModal.folder, folderActionModal.listType)}>
                      <Ionicons name="trash-outline" size={20} color={colors.destructive} />
                      <Text style={[s.actionSheetRowText, { color: colors.destructive }]}>Delete</Text>
                      <Ionicons name="chevron-forward" size={16} color={colors.destructive} />
                    </TouchableOpacity>
                  </>
                ) : (
                  <>
                    <Text style={s.actionSheetTitle}>Rename Folder</Text>
                    <TextInput
                      style={s.renameInput}
                      value={folderRenameValue}
                      onChangeText={setFolderRenameValue}
                      autoFocus
                      selectTextOnFocus
                      placeholderTextColor={colors.muted}
                    />
                    <TouchableOpacity style={[s.actionSheetBtn, { backgroundColor: colors.primary }]} onPress={renameFolder}>
                      <Text style={{ color: "#fff", fontWeight: "700" }}>Save</Text>
                    </TouchableOpacity>
                  </>
                )}
              </View>
            </TouchableOpacity>
          </Modal>
        )}
        {filterModal}
      </SafeAreaView>
    )
  }

  // ────────────────────────────────────────────
  // RECIPE LIST VIEW (inside a folder)
  // ────────────────────────────────────────────
  const listLabel = activeList === "toTry" ? "To Try" : "Tried"
  const accentColor = activeList === "toTry" ? colors.primary : "#22c55e"

  return (
    <SafeAreaView style={s.container} edges={["top"]}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => setViewLevel("folders")} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <View style={{ flex: 1, marginHorizontal: 12 }}>
          <Text style={s.headerTitle}>{openFolder ?? "Main List"}</Text>
          <Text style={[s.headerCount, { marginTop: 0 }]}>{listLabel} · {filteredOrderedRecipes.length} recipe{filteredOrderedRecipes.length !== 1 ? "s" : ""}</Text>
        </View>
        <TouchableOpacity style={s.filterBtn} onPress={() => setFilterModalOpen(true)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name="options-outline" size={22} color={hasFilters ? colors.primary : colors.text} />
          {hasFilters && <View style={s.filterBadge}><Text style={s.filterBadgeText}>{filterCount}</Text></View>}
        </TouchableOpacity>
      </View>

      {filteredOrderedRecipes.length === 0 ? (
        <View style={s.empty}>
          <Ionicons name={activeList === "toTry" ? "bookmark-outline" : "checkmark-circle-outline"} size={48} color={colors.muted} />
          <Text style={s.emptyTitle}>{hasFilters ? "No recipes match this filter" : "No recipes here"}</Text>
          {hasFilters && <TouchableOpacity onPress={clearFilters}><Text style={{ color: colors.primary, fontWeight: "600" }}>Clear filters</Text></TouchableOpacity>}
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ paddingTop: spacing.md, paddingBottom: 24 }}>
        <DraggableList
          data={filteredOrderedRecipes}
          keyExtractor={r => r.recipeId}
          itemHeight={110}
          onReorder={reordered => setRecipeOrder(prev => ({ ...prev, [recipeOrderKey]: reordered.map(r => r.recipeId) }))}
          renderItem={(item, _, isDragging) => (
            <View style={{ paddingHorizontal: spacing.md, paddingBottom: 12, paddingTop: 0 }}>
              <TouchableOpacity style={[s.card, isDragging && { elevation: 8, opacity: 0.94 }]} onPress={() => navigation.navigate("RecipeDetail", { id: item.recipeId, title: item.title })} activeOpacity={0.8}>
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
                    <View style={s.metaRow}>
                      {item.readyInMinutes > 0 && <View style={s.metaChip}><Ionicons name="time-outline" size={12} color={colors.mutedForeground} /><Text style={s.metaText}>{item.readyInMinutes} min</Text></View>}
                      {item.triedOn && <View style={s.metaChip}><Ionicons name="calendar-outline" size={12} color={colors.mutedForeground} /><Text style={s.metaText}>{item.triedOn.split("T")[0]}</Text></View>}
                    </View>
                    {item.tags.length > 0 && (
                      <View style={s.tagsRow}>
                        {item.tags.map(tag => (
                          <View key={tag} style={s.tagBadge}><Text style={s.tagBadgeText}>{tag}</Text></View>
                        ))}
                      </View>
                    )}
                    {item.searchFilters && Object.keys(item.searchFilters).some(k => ["diet","cuisine","prepTime","budget","taste","healthiness"].includes(k)) && (
                      <View style={s.tagsRow}>
                        {["diet","cuisine","prepTime","budget","taste","healthiness"].map(field =>
                          item.searchFilters?.[field]
                            ? <View key={field} style={s.searchBadge}><Text style={s.searchBadgeText}>{labelFor(field, item.searchFilters[field])}</Text></View>
                            : null
                        )}
                      </View>
                    )}
                  </View>

                  {/* Star + 3-dots */}
                  <View style={s.cardActions}>
                    <TouchableOpacity
                      onPress={() => openRating(item)}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Ionicons
                        name={item.satisfaction ? "star" : "star-outline"}
                        size={20}
                        color={item.satisfaction ? "#f59e0b" : colors.mutedForeground}
                      />
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => setRecipeActionSheet(item)}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Ionicons name="ellipsis-vertical" size={18} color={colors.mutedForeground} />
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Rating row (tried) */}
                {activeList === "tried" && item.satisfaction ? (
                  <View style={s.ratingRow}>
                    <Stars rating={item.satisfaction} colors={colors} />
                    {item.difficulty ? <Text style={s.difficultyText}>{item.difficulty}</Text> : null}
                  </View>
                ) : null}
              </TouchableOpacity>
            </View>
          )}
        />
        </ScrollView>
      )}

      {/* ── Recipe action sheet ── */}
      {recipeActionSheet && (
        <Modal visible transparent animationType="fade" onRequestClose={() => setRecipeActionSheet(null)}>
          <TouchableOpacity style={s.modalOverlay} activeOpacity={1} onPress={() => setRecipeActionSheet(null)}>
            <View style={s.actionSheet}>
              <Text style={s.actionSheetTitle}>{recipeActionSheet.title}</Text>
              <TouchableOpacity style={s.actionSheetRow} onPress={() => { setRecipeActionSheet(null); openRating(recipeActionSheet) }}>
                <Ionicons name="star-outline" size={20} color={colors.text} />
                <Text style={s.actionSheetRowText}>Rate</Text>
                <Ionicons name="chevron-forward" size={16} color={colors.muted} />
              </TouchableOpacity>
              {activeList === "toTry" && (
                <TouchableOpacity style={s.actionSheetRow} onPress={() => { setRecipeActionSheet(null); openTagEdit(recipeActionSheet) }}>
                  <Ionicons name="pricetag-outline" size={20} color={colors.text} />
                  <Text style={s.actionSheetRowText}>Edit tags</Text>
                  <Ionicons name="chevron-forward" size={16} color={colors.muted} />
                </TouchableOpacity>
              )}
              {activeList === "toTry" && (
                <TouchableOpacity style={s.actionSheetRow} onPress={() => { setRecipeActionSheet(null); markAsTried(recipeActionSheet) }}>
                  <Ionicons name="checkmark-circle-outline" size={20} color={colors.text} />
                  <Text style={s.actionSheetRowText}>Mark as Tried</Text>
                  <Ionicons name="chevron-forward" size={16} color={colors.muted} />
                </TouchableOpacity>
              )}
              <TouchableOpacity style={s.actionSheetRow} onPress={() => { setRecipeActionSheet(null); setMoveModal({ recipe: recipeActionSheet, listType: activeList }); setMoveTarget(""); setMoveCustom("") }}>
                <Ionicons name="folder-outline" size={20} color={colors.text} />
                <Text style={s.actionSheetRowText}>Move to folder</Text>
                <Ionicons name="chevron-forward" size={16} color={colors.muted} />
              </TouchableOpacity>
              <TouchableOpacity style={[s.actionSheetRow, s.actionSheetRowDestructive]} onPress={() => { setRecipeActionSheet(null); removeFromList(recipeActionSheet) }}>
                <Ionicons name="trash-outline" size={20} color={colors.destructive} />
                <Text style={[s.actionSheetRowText, { color: colors.destructive }]}>Delete</Text>
                <Ionicons name="chevron-forward" size={16} color={colors.destructive} />
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </Modal>
      )}

      {/* ── Move modal ── */}
      {moveModal && (() => {
        const currentFolders = (moveModal.listType === "toTry" ? toTryRecipes : triedRecipes)
          .map(r => r.folder).filter(Boolean) as string[]
        const uniqueFolders = Array.from(new Set(currentFolders)).filter(f => f !== moveModal.recipe.folder)
        return (
          <Modal visible animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setMoveModal(null)}>
            <SafeAreaView style={s.modal} edges={["top"]}>
              <View style={s.modalHeader}>
                <TouchableOpacity onPress={() => setMoveModal(null)}><Ionicons name="arrow-back" size={24} color={colors.text} /></TouchableOpacity>
                <Text style={s.modalTitle}>Move Recipe</Text>
                <View style={{ width: 24 }} />
              </View>
              <ScrollView contentContainerStyle={{ padding: spacing.md, gap: 16 }} keyboardShouldPersistTaps="handled">
                <Text style={s.modalRecipeName}>{moveModal.recipe.title}</Text>
                <Text style={s.sectionLabel}>Move to</Text>

                <TouchableOpacity
                  style={[s.moveFolderItem, moveTarget === "" && moveModal.recipe.folder !== null && s.moveFolderItemActive]}
                  onPress={() => { setMoveTarget(""); setMoveCustom("") }}
                >
                  <Ionicons name="list" size={18} color={accentColor} />
                  <Text style={s.moveFolderText}>Main List</Text>
                  {moveTarget === "" && moveModal.recipe.folder !== null && <Ionicons name="checkmark" size={16} color={accentColor} />}
                </TouchableOpacity>

                {uniqueFolders.map(f => (
                  <TouchableOpacity
                    key={f}
                    style={[s.moveFolderItem, moveTarget === f && s.moveFolderItemActive]}
                    onPress={() => { setMoveTarget(f); setMoveCustom("") }}
                  >
                    <Ionicons name="folder" size={18} color={accentColor} />
                    <Text style={s.moveFolderText}>{f}</Text>
                    {moveTarget === f && <Ionicons name="checkmark" size={16} color={accentColor} />}
                  </TouchableOpacity>
                ))}

                <TouchableOpacity
                  style={[s.moveFolderItem, moveTarget === "__custom__" && s.moveFolderItemActive]}
                  onPress={() => setMoveTarget("__custom__")}
                >
                  <Ionicons name="add-circle-outline" size={18} color={accentColor} />
                  <Text style={s.moveFolderText}>New Folder</Text>
                </TouchableOpacity>
                {moveTarget === "__custom__" && (
                  <TextInput
                    style={s.renameInput}
                    value={moveCustom}
                    onChangeText={setMoveCustom}
                    placeholder="Folder name..."
                    placeholderTextColor={colors.muted}
                    autoFocus
                  />
                )}
              </ScrollView>
              <View style={s.modalFooter}>
                <TouchableOpacity style={s.cancelBtn} onPress={() => setMoveModal(null)}>
                  <Text style={s.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[s.submitBtn, { backgroundColor: accentColor }, moving && { opacity: 0.5 }]} onPress={confirmMoveOrCopy} disabled={moving}>
                  {moving ? <ActivityIndicator color="#fff" /> : <Text style={s.submitBtnText}>Move</Text>}
                </TouchableOpacity>
              </View>
            </SafeAreaView>
          </Modal>
        )
      })()}

      {/* ── Rating modal ── */}
      <Modal visible={ratingModal} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setRatingModal(false)}>
        <SafeAreaView style={s.modal} edges={["top"]}>
          <View style={s.modalHeader}>
            <Text style={s.modalTitle}>Rate Your Experience</Text>
            <TouchableOpacity onPress={() => setRatingModal(false)}>
              <Ionicons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>
          <ScrollView style={{ padding: spacing.md }}>
            {selectedRecipe && <Text style={s.modalRecipeName}>{selectedRecipe.title}</Text>}
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

      {/* ── Tag edit modal ── */}
      <Modal visible={tagEditModal} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setTagEditModal(false)}>
        <SafeAreaView style={s.modal} edges={["top"]}>
          <View style={s.modalHeader}>
            <TouchableOpacity onPress={() => setTagEditModal(false)}>
              <Text style={{ color: colors.mutedForeground, fontSize: 15 }}>Cancel</Text>
            </TouchableOpacity>
            <Text style={s.modalTitle}>Edit Tags</Text>
            <TouchableOpacity onPress={saveTagEdit}>
              <Text style={{ color: colors.primary, fontSize: 15, fontWeight: "700" }}>Save</Text>
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={{ padding: spacing.md, gap: 16 }} keyboardShouldPersistTaps="handled">
            {tagEditRecipe && <Text style={s.modalRecipeName}>{tagEditRecipe.title}</Text>}
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
              {SUGGESTED_TAGS.map(tag => {
                const active = editingTags.includes(tag)
                return (
                  <TouchableOpacity
                    key={tag}
                    onPress={() => setEditingTags(prev => active ? prev.filter(t => t !== tag) : [...prev, tag])}
                    style={{ paddingHorizontal: 14, paddingVertical: 8, borderRadius: 99, borderWidth: 1.5, borderColor: active ? colors.primary : colors.border, backgroundColor: active ? colors.primary + "18" : colors.card }}
                  >
                    <Text style={{ fontSize: 14, fontWeight: "600", color: active ? colors.primary : colors.mutedForeground }}>{tag}</Text>
                  </TouchableOpacity>
                )
              })}
            </View>
            <View style={{ flexDirection: "row", gap: 8 }}>
              <TextInput
                style={{ flex: 1, borderWidth: 1.5, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: 12, paddingVertical: 10, color: colors.text, backgroundColor: colors.card, fontSize: 14 }}
                value={customTag}
                onChangeText={setCustomTag}
                placeholder="Custom tag…"
                placeholderTextColor={colors.muted}
                returnKeyType="done"
                onSubmitEditing={() => { const t = customTag.trim(); if (t && !editingTags.includes(t)) setEditingTags(prev => [...prev, t]); setCustomTag("") }}
              />
              <TouchableOpacity
                style={{ backgroundColor: colors.primary, paddingHorizontal: 16, justifyContent: "center", borderRadius: radius.md }}
                onPress={() => { const t = customTag.trim(); if (t && !editingTags.includes(t)) setEditingTags(prev => [...prev, t]); setCustomTag("") }}
              >
                <Text style={{ color: "#fff", fontWeight: "700" }}>Add</Text>
              </TouchableOpacity>
            </View>
            {editingTags.length > 0 && (
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                {editingTags.map(tag => (
                  <TouchableOpacity
                    key={tag}
                    onPress={() => setEditingTags(prev => prev.filter(t => t !== tag))}
                    style={{ flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 99, backgroundColor: colors.primary }}
                  >
                    <Text style={{ color: "#fff", fontSize: 13, fontWeight: "600" }}>{tag}</Text>
                    <Ionicons name="close" size={13} color="#fff" />
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* ── Folder actions modal ── */}
      {folderActionModal && (
        <Modal visible transparent animationType="fade" onRequestClose={() => setFolderActionModal(null)}>
          <TouchableOpacity style={s.modalOverlay} activeOpacity={1} onPress={() => setFolderActionModal(null)}>
            <View style={s.actionSheet}>
              {folderActionModal.step === "menu" ? (
                <>
                  <Text style={s.actionSheetTitle}>{folderActionModal.folder}</Text>
                  <TouchableOpacity style={s.actionSheetRow} onPress={() => setFolderActionModal(f => f ? { ...f, step: "rename" } : null)}>
                    <Ionicons name="pencil-outline" size={20} color={colors.text} />
                    <Text style={s.actionSheetRowText}>Rename</Text>
                    <Ionicons name="chevron-forward" size={16} color={colors.muted} />
                  </TouchableOpacity>
                  <TouchableOpacity style={[s.actionSheetRow, s.actionSheetRowDestructive]} onPress={() => deleteFolder(folderActionModal.folder, folderActionModal.listType)}>
                    <Ionicons name="trash-outline" size={20} color={colors.destructive} />
                    <Text style={[s.actionSheetRowText, { color: colors.destructive }]}>Delete</Text>
                    <Ionicons name="chevron-forward" size={16} color={colors.destructive} />
                  </TouchableOpacity>
                </>
              ) : (
                <>
                  <Text style={s.actionSheetTitle}>Rename Folder</Text>
                  <TextInput
                    style={s.renameInput}
                    value={folderRenameValue}
                    onChangeText={setFolderRenameValue}
                    autoFocus
                    selectTextOnFocus
                    placeholderTextColor={colors.muted}
                  />
                  <TouchableOpacity style={[s.actionSheetBtn, { backgroundColor: colors.primary }]} onPress={renameFolder}>
                    <Text style={{ color: "#fff", fontWeight: "700" }}>Save</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          </TouchableOpacity>
        </Modal>
      )}
      {filterModal}
    </SafeAreaView>
  )
}

const makeStyles = (colors: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.background },
  topBar: { paddingHorizontal: spacing.md, paddingVertical: 14 },
  title: { fontSize: 26, fontWeight: "800", color: colors.text },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: spacing.md, borderBottomWidth: 1.5, borderBottomColor: "rgba(255,255,255,0.4)" },
  headerTitle: { fontSize: 20, fontWeight: "800", color: colors.text },
  headerCount: { fontSize: 13, color: colors.mutedForeground, marginTop: 2 },

  // home
  homeContent: { flex: 1, padding: spacing.md, paddingTop: 48, gap: 16 },
  bigBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 12, borderRadius: radius.lg, paddingVertical: 18 },
  bigBtnOrange: { backgroundColor: "transparent", borderWidth: 1.5, borderColor: colors.primary },
  bigBtnText: { fontSize: 17, fontWeight: "800", color: "#fff" },
  bigBtnCount: { fontSize: 13, color: "rgba(255,255,255,0.65)", fontWeight: "500" },

  // folder list
  folderCard: { flexDirection: "row", alignItems: "center", gap: 14, padding: spacing.md, borderRadius: radius.lg, backgroundColor: colors.card, borderWidth: 1.5, borderColor: colors.border },
  folderIconBg: { width: 44, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  folderName: { fontSize: 15, fontWeight: "700", color: colors.text },
  folderCount: { fontSize: 12, color: colors.mutedForeground, marginTop: 2 },

  // filter button in header
  filterBtn: { position: "relative", padding: 2 },
  filterBadge: { position: "absolute", top: -4, right: -4, minWidth: 16, height: 16, borderRadius: 8, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center", paddingHorizontal: 3 },
  filterBadgeText: { fontSize: 9, fontWeight: "800", color: "#fff" },

  // filter bottom sheet
  filterSheet: { backgroundColor: colors.card, borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: "75%" },
  filterSheetHandle: { width: 36, height: 4, borderRadius: 2, backgroundColor: colors.border, alignSelf: "center", marginTop: 10, marginBottom: 4 },
  filterSheetHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: spacing.md, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  filterSheetTitle: { fontSize: 16, fontWeight: "700", color: colors.text },
  filterSectionLabel: { fontSize: 13, fontWeight: "600", color: colors.mutedForeground, marginBottom: 10, textTransform: "uppercase", letterSpacing: 0.5 },
  filterChipsRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  filterChip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 99, borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.background },
  filterChipActive: { borderColor: colors.primary, backgroundColor: colors.primary },
  filterChipText: { fontSize: 13, fontWeight: "600", color: colors.mutedForeground },
  filterChipTextActive: { color: "#fff" },

  // recipe card
  card: { backgroundColor: colors.card, borderRadius: radius.lg, borderWidth: 1.5, borderColor: colors.border, overflow: "hidden" },
  cardTop: { flexDirection: "row", alignItems: "stretch" },
  cardImage: { width: 80, minHeight: 80 },
  cardImagePlaceholder: { alignItems: "center", justifyContent: "center", backgroundColor: colors.border },
  cardBody: { flex: 1, padding: spacing.sm },
  cardTitle: { fontSize: 14, fontWeight: "700", color: colors.text, marginBottom: 4 },
  metaRow: { flexDirection: "row", gap: 10, flexWrap: "wrap", marginBottom: 4 },
  metaChip: { flexDirection: "row", alignItems: "center", gap: 3 },
  metaText: { fontSize: 11, color: colors.mutedForeground },
  tagsRow: { flexDirection: "row", flexWrap: "wrap", gap: 5, marginTop: 4 },
  tagBadge: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 99, backgroundColor: colors.border },
  tagBadgeText: { fontSize: 10, fontWeight: "600", color: colors.mutedForeground },
  searchBadge: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 99, backgroundColor: colors.primary + "18" },
  searchBadgeText: { fontSize: 10, fontWeight: "600", color: colors.primary },
  cardActions: { flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 14, padding: spacing.sm },
  ratingRow: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: spacing.sm, paddingBottom: spacing.sm, paddingTop: 2 },
  difficultyText: { fontSize: 12, color: colors.mutedForeground, flex: 1 },
  noRating: { fontSize: 12, color: colors.mutedForeground, fontStyle: "italic" },

  // move folder
  moveFolderItem: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14, borderRadius: radius.md, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border },
  moveFolderItemActive: { borderColor: colors.primary, borderWidth: 2 },
  moveFolderText: { flex: 1, fontSize: 15, fontWeight: "600", color: colors.text },

  // empty
  empty: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, padding: spacing.xl },
  emptyTitle: { fontSize: 18, fontWeight: "600", color: colors.text, textAlign: "center" },
  emptySubText: { fontSize: 14, color: colors.mutedForeground, textAlign: "center" },
  browseBtn: { backgroundColor: colors.primary, paddingHorizontal: 24, paddingVertical: 12, borderRadius: radius.md, marginTop: 8 },
  browseBtnText: { color: "#fff", fontWeight: "700" },

  // modals
  modal: { flex: 1, backgroundColor: colors.background },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border },
  modalTitle: { fontSize: 18, fontWeight: "700", color: colors.text },
  modalRecipeName: { fontSize: 14, color: colors.mutedForeground, marginBottom: spacing.sm },
  modalFooter: { flexDirection: "row", gap: 12, padding: spacing.md, borderTopWidth: 1, borderTopColor: colors.border },
  sectionLabel: { fontSize: 15, fontWeight: "600", color: colors.text, marginBottom: spacing.sm },
  cancelBtn: { flex: 1, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingVertical: 12, alignItems: "center" },
  cancelBtnText: { color: colors.text, fontWeight: "600" },
  submitBtn: { flex: 1, backgroundColor: colors.primary, borderRadius: radius.md, paddingVertical: 12, alignItems: "center" },
  submitBtnText: { color: "#fff", fontWeight: "700" },
  difficultyOption: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 8 },
  radio: { width: 18, height: 18, borderRadius: 9, borderWidth: 2, borderColor: colors.muted },
  radioSelected: { borderColor: colors.primary, backgroundColor: colors.primary },
  difficultyOptionText: { fontSize: 15, color: colors.text },

  // action sheet (folder/recipe menu)
  actionSheet: { backgroundColor: colors.card, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: spacing.md, gap: 10, paddingBottom: 28 },
  actionSheetTitle: { fontSize: 16, fontWeight: "700", color: colors.text, paddingVertical: 8, paddingHorizontal: 4, textAlign: "center" },
  actionSheetRow: { flexDirection: "row", alignItems: "center", gap: 14, paddingVertical: 15, paddingHorizontal: 16, borderRadius: radius.lg, borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.background },
  actionSheetRowText: { flex: 1, fontSize: 16, color: colors.text, fontWeight: "600" },
  actionSheetRowDestructive: { borderColor: colors.destructive + "55" },
  actionSheetBtn: { borderRadius: radius.md, paddingVertical: 12, alignItems: "center", marginTop: 8 },
  renameInput: { borderWidth: 1.5, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: 14, paddingVertical: 12, color: colors.text, fontSize: 15, backgroundColor: colors.background, marginTop: 8 },
})
