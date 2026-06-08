import React, { useCallback, useState, useMemo } from "react"
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image, ActivityIndicator, Modal, ScrollView, Alert, TextInput } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { Ionicons } from "@expo/vector-icons"
import { useNavigation, useFocusEffect } from "@react-navigation/native"
import { apiFetch } from "../lib/api"
import { useAuth } from "../context/AuthContext"
import { useTheme } from "../context/ThemeContext"
import { useGlobalError } from "../context/GlobalErrorContext"
import { spacing, radius } from "../lib/theme"

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

  // data
  const [toTryRecipes, setToTryRecipes] = useState<Recipe[]>([])
  const [triedRecipes, setTriedRecipes] = useState<Recipe[]>([])
  const [loading, setLoading] = useState(true)

  // filter inside folder
  const [activeDietFilter, setActiveDietFilter] = useState<string | null>(null)
  const [activePrepFilter, setActivePrepFilter] = useState<string | null>(null)
  const [activeCuisineFilter, setActiveCuisineFilter] = useState<string | null>(null)

  // rating modal
  const [ratingModal, setRatingModal] = useState(false)
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null)
  const [ratingValues, setRatingValues] = useState({ satisfaction: 0, timeAccuracy: 0, difficulty: "Moderate" })

  // tag edit modal (to-try only)
  const [tagEditModal, setTagEditModal] = useState(false)
  const [tagEditRecipe, setTagEditRecipe] = useState<Recipe | null>(null)
  const [editingTags, setEditingTags] = useState<string[]>([])
  const [customTag, setCustomTag] = useState("")

  // move/copy modal
  const [moveModal, setMoveModal] = useState<{ recipe: Recipe; listType: ListType; action: "move" | "copy" } | null>(null)
  const [moveTarget, setMoveTarget] = useState("")
  const [moveCustom, setMoveCustom] = useState("")
  const [moving, setMoving] = useState(false)

  // folder actions (rename/delete)
  const [folderActionModal, setFolderActionModal] = useState<{ folder: string; listType: ListType; step: "menu" | "rename" } | null>(null)
  const [folderRenameValue, setFolderRenameValue] = useState("")

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

  // available filters based on stored searchFilters in current folder
  const folderFilterOptions = useMemo(() => {
    const diets = new Set<string>()
    const preps = new Set<string>()
    const cuisines = new Set<string>()
    for (const r of recipesInView) {
      if (r.searchFilters?.diet) diets.add(r.searchFilters.diet)
      if (r.searchFilters?.prepTime) preps.add(r.searchFilters.prepTime)
      if (r.searchFilters?.cuisine) cuisines.add(r.searchFilters.cuisine)
    }
    return { diets: Array.from(diets), preps: Array.from(preps), cuisines: Array.from(cuisines) }
  }, [recipesInView])

  const filteredRecipes = useMemo(() => {
    return recipesInView.filter(r => {
      if (activeDietFilter && r.searchFilters?.diet !== activeDietFilter) return false
      if (activePrepFilter && r.searchFilters?.prepTime !== activePrepFilter) return false
      if (activeCuisineFilter && r.searchFilters?.cuisine !== activeCuisineFilter) return false
      return true
    })
  }, [recipesInView, activeDietFilter, activePrepFilter, activeCuisineFilter])

  const clearFilters = () => { setActiveDietFilter(null); setActivePrepFilter(null); setActiveCuisineFilter(null) }

  const openFolderView = (folder: string | null, list: ListType) => {
    setActiveList(list)
    setOpenFolder(folder)
    clearFilters()
    setViewLevel("recipes")
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

  // ── MOVE / COPY ──
  const confirmMoveOrCopy = async () => {
    if (!moveModal || !user) return
    const { recipe, listType, action } = moveModal
    const target = moveTarget === "__custom__" ? moveCustom.trim() : moveTarget || null
    setMoving(true)
    try {
      const endpoint = listType === "toTry" ? "/api/favourites" : "/api/tried-recipes"
      if (action === "move") {
        await apiFetch(endpoint, { method: "PATCH", body: JSON.stringify({ userId: user.id, recipeId: recipe.recipeId, targetFolder: target }) })
        setCurrentRecipes(prev => prev.map(r => r.recipeId === recipe.recipeId ? { ...r, folder: target } : r))
      } else {
        // copy: insert a new record with different folder (upsert won't copy, so we duplicate via POST with different folder key — not possible with current schema since recipe_id is unique per user; instead update folder only if not already there)
        // For copy we add to target folder by updating (move) and keep original by re-inserting original folder
        const originalFolder = recipe.folder
        await apiFetch(endpoint, { method: "PATCH", body: JSON.stringify({ userId: user.id, recipeId: recipe.recipeId, targetFolder: target }) })
        setCurrentRecipes(prev => prev.map(r => r.recipeId === recipe.recipeId ? { ...r, folder: target } : r))
        // Note: true copy isn't possible with unique constraint per user+recipe — move is applied
        Alert.alert("Moved", `"${recipe.title}" moved to ${target ?? "Main List"}.`)
      }
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
            await apiFetch("/api/tried-recipes", {
              method: "POST",
              body: JSON.stringify({ userId: user!.id, recipeId: recipe.recipeId, recipeTitle: recipe.title, folder: recipe.folder, searchFilters: recipe.searchFilters }),
            })
            // optionally keep in to-try or remove — keep it (user can remove separately)
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

  // ────────────────────────────────────────────
  // HOME: two big buttons
  // ────────────────────────────────────────────
  if (viewLevel === "home") {
    return (
      <SafeAreaView style={s.container} edges={["top"]}>
        <View style={s.header}>
          <Text style={s.headerTitle}>My Recipes</Text>
          <Text style={s.headerCount}>{toTryCount} to try · {triedCount} tried</Text>
        </View>
        <View style={s.homeButtons}>
          <TouchableOpacity style={[s.homeBtn, s.homeBtnToTry]} onPress={() => { setActiveList("toTry"); setViewLevel("folders") }} activeOpacity={0.85}>
            <Ionicons name="bookmark" size={36} color={colors.primary} />
            <Text style={s.homeBtnTitle}>To Try</Text>
            <Text style={s.homeBtnCount}>{toTryCount} recipe{toTryCount !== 1 ? "s" : ""}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[s.homeBtn, s.homeBtnTried]} onPress={() => { setActiveList("tried"); setViewLevel("folders") }} activeOpacity={0.85}>
            <Ionicons name="checkmark-circle" size={36} color="#16a34a" />
            <Text style={[s.homeBtnTitle, { color: "#16a34a" }]}>Tried</Text>
            <Text style={s.homeBtnCount}>{triedCount} recipe{triedCount !== 1 ? "s" : ""}</Text>
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
    const listFolders = Array.from(new Set(list.map(r => r.folder).filter(Boolean))) as string[]
    const mainCount = list.filter(r => r.folder === null).length
    const listLabel = activeList === "toTry" ? "To Try" : "Tried"
    const accentColor = activeList === "toTry" ? colors.primary : "#16a34a"

    return (
      <SafeAreaView style={s.container} edges={["top"]}>
        <View style={s.header}>
          <TouchableOpacity onPress={() => setViewLevel("home")} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={s.headerTitle}>{listLabel}</Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView contentContainerStyle={{ padding: spacing.md, gap: 12 }}>
          {/* Main List */}
          <TouchableOpacity style={s.folderCard} onPress={() => openFolderView(null, activeList)} activeOpacity={0.8}>
            <View style={[s.folderIconBg, { backgroundColor: accentColor + "22" }]}>
              <Ionicons name="list" size={22} color={accentColor} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.folderName}>Main List</Text>
              <Text style={s.folderCount}>{mainCount} recipe{mainCount !== 1 ? "s" : ""}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.muted} />
          </TouchableOpacity>

          {listFolders.map(folder => {
            const count = list.filter(r => r.folder === folder).length
            return (
              <View key={folder} style={s.folderRow}>
                <TouchableOpacity style={[s.folderCard, { flex: 1 }]} onPress={() => openFolderView(folder, activeList)} activeOpacity={0.8}>
                  <View style={[s.folderIconBg, { backgroundColor: accentColor + "22" }]}>
                    <Ionicons name="folder" size={22} color={accentColor} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.folderName}>{folder}</Text>
                    <Text style={s.folderCount}>{count} recipe{count !== 1 ? "s" : ""}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={colors.muted} />
                </TouchableOpacity>
                <TouchableOpacity
                  style={s.folderMenuBtn}
                  onPress={() => { setFolderActionModal({ folder, listType: activeList, step: "menu" }); setFolderRenameValue(folder) }}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons name="ellipsis-vertical" size={18} color={colors.mutedForeground} />
                </TouchableOpacity>
              </View>
            )
          })}

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
                    <TouchableOpacity style={s.actionSheetItem} onPress={() => setFolderActionModal(f => f ? { ...f, step: "rename" } : null)}>
                      <Ionicons name="pencil-outline" size={20} color={colors.text} />
                      <Text style={s.actionSheetText}>Rename folder</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={s.actionSheetItem} onPress={() => deleteFolder(folderActionModal.folder, folderActionModal.listType)}>
                      <Ionicons name="trash-outline" size={20} color={colors.destructive} />
                      <Text style={[s.actionSheetText, { color: colors.destructive }]}>Delete folder & recipes</Text>
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
      </SafeAreaView>
    )
  }

  // ────────────────────────────────────────────
  // RECIPE LIST VIEW (inside a folder)
  // ────────────────────────────────────────────
  const listLabel = activeList === "toTry" ? "To Try" : "Tried"
  const accentColor = activeList === "toTry" ? colors.primary : "#16a34a"
  const hasFilters = activeDietFilter || activePrepFilter || activeCuisineFilter
  const { diets, preps, cuisines } = folderFilterOptions
  const hasFilterOptions = diets.length > 0 || preps.length > 0 || cuisines.length > 0

  return (
    <SafeAreaView style={s.container} edges={["top"]}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => { setViewLevel("folders"); clearFilters() }} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <View style={{ flex: 1, marginHorizontal: 12 }}>
          <Text style={s.headerTitle}>{openFolder ?? "Main List"}</Text>
          <Text style={[s.headerCount, { marginTop: 0 }]}>{listLabel} · {filteredRecipes.length} recipe{filteredRecipes.length !== 1 ? "s" : ""}</Text>
        </View>
        <View style={{ width: 24 }} />
      </View>

      {/* Filter chips — only shown if there are stored filters to apply */}
      {hasFilterOptions && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.filterBar}>
          {diets.map(diet => (
            <TouchableOpacity
              key={diet}
              style={[s.filterChip, activeDietFilter === diet && s.filterChipActive]}
              onPress={() => setActiveDietFilter(activeDietFilter === diet ? null : diet)}
            >
              <Text style={[s.filterChipText, activeDietFilter === diet && s.filterChipTextActive]}>{DIET_LABELS[diet] ?? diet}</Text>
            </TouchableOpacity>
          ))}
          {preps.map(prep => (
            <TouchableOpacity
              key={prep}
              style={[s.filterChip, activePrepFilter === prep && s.filterChipActive]}
              onPress={() => setActivePrepFilter(activePrepFilter === prep ? null : prep)}
            >
              <Text style={[s.filterChipText, activePrepFilter === prep && s.filterChipTextActive]}>{PREP_LABELS[prep] ?? prep}</Text>
            </TouchableOpacity>
          ))}
          {cuisines.map(cuisine => (
            <TouchableOpacity
              key={cuisine}
              style={[s.filterChip, activeCuisineFilter === cuisine && s.filterChipActive]}
              onPress={() => setActiveCuisineFilter(activeCuisineFilter === cuisine ? null : cuisine)}
            >
              <Text style={[s.filterChipText, activeCuisineFilter === cuisine && s.filterChipTextActive]}>{cuisine.charAt(0).toUpperCase() + cuisine.slice(1)}</Text>
            </TouchableOpacity>
          ))}
          {hasFilters && (
            <TouchableOpacity style={s.clearFilterChip} onPress={clearFilters}>
              <Ionicons name="close" size={13} color={colors.destructive} />
              <Text style={{ fontSize: 13, color: colors.destructive, fontWeight: "600" }}>Clear</Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      )}

      {filteredRecipes.length === 0 ? (
        <View style={s.empty}>
          <Ionicons name={activeList === "toTry" ? "bookmark-outline" : "checkmark-circle-outline"} size={48} color={colors.muted} />
          <Text style={s.emptyTitle}>{hasFilters ? "No recipes match this filter" : "No recipes here"}</Text>
          {hasFilters && <TouchableOpacity onPress={clearFilters}><Text style={{ color: colors.primary, fontWeight: "600" }}>Clear filters</Text></TouchableOpacity>}
        </View>
      ) : (
        <FlatList
          data={filteredRecipes}
          keyExtractor={r => r.recipeId}
          contentContainerStyle={{ padding: spacing.md, gap: 12 }}
          renderItem={({ item }) => (
            <TouchableOpacity style={s.card} onPress={() => navigation.navigate("RecipeDetail", { id: item.recipeId, title: item.title })} activeOpacity={0.8}>
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
                  {/* stored filter badges */}
                  {item.searchFilters && (
                    <View style={s.tagsRow}>
                      {item.searchFilters.diet && <View style={s.filterBadge}><Text style={s.filterBadgeText}>{DIET_LABELS[item.searchFilters.diet] ?? item.searchFilters.diet}</Text></View>}
                      {item.searchFilters.cuisine && <View style={s.filterBadge}><Text style={s.filterBadgeText}>{item.searchFilters.cuisine}</Text></View>}
                      {item.searchFilters.prepTime && <View style={s.filterBadge}><Text style={s.filterBadgeText}>{PREP_LABELS[item.searchFilters.prepTime] ?? item.searchFilters.prepTime}</Text></View>}
                    </View>
                  )}
                </View>

                {/* Actions column */}
                <View style={s.cardActions}>
                  {activeList === "toTry" && (
                    <>
                      <TouchableOpacity onPress={() => openTagEdit(item)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                        <Ionicons name="pricetag-outline" size={18} color={colors.mutedForeground} />
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => markAsTried(item)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                        <Ionicons name="checkmark-circle-outline" size={20} color="#16a34a" />
                      </TouchableOpacity>
                    </>
                  )}
                  {activeList === "tried" && item.satisfaction !== undefined && (
                    <TouchableOpacity onPress={() => openRating(item)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                      <Ionicons name="star-outline" size={20} color="#f59e0b" />
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity
                    onPress={() => { setMoveModal({ recipe: item, listType: activeList, action: "move" }); setMoveTarget(""); setMoveCustom("") }}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Ionicons name="ellipsis-vertical" size={18} color={colors.mutedForeground} />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Rating row (tried) */}
              {activeList === "tried" && (
                <View style={s.ratingRow}>
                  {item.satisfaction ? (
                    <>
                      <Stars rating={item.satisfaction} colors={colors} />
                      {item.difficulty ? <Text style={s.difficultyText}>{item.difficulty}</Text> : null}
                      <TouchableOpacity onPress={() => openRating(item)}><Text style={{ fontSize: 12, color: colors.primary, fontWeight: "600" }}>Edit</Text></TouchableOpacity>
                    </>
                  ) : (
                    <TouchableOpacity onPress={() => openRating(item)}><Text style={s.noRating}>Rate this recipe →</Text></TouchableOpacity>
                  )}
                  <TouchableOpacity onPress={() => removeFromList(item)} style={{ marginLeft: "auto" }}>
                    <Ionicons name="trash-outline" size={15} color={colors.destructive} />
                  </TouchableOpacity>
                </View>
              )}
              {activeList === "toTry" && (
                <View style={s.ratingRow}>
                  <TouchableOpacity onPress={() => removeFromList(item)} style={{ marginLeft: "auto" }}>
                    <Ionicons name="trash-outline" size={15} color={colors.destructive} />
                  </TouchableOpacity>
                </View>
              )}
            </TouchableOpacity>
          )}
        />
      )}

      {/* ── Move/copy modal ── */}
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
                  <TouchableOpacity style={s.actionSheetItem} onPress={() => setFolderActionModal(f => f ? { ...f, step: "rename" } : null)}>
                    <Ionicons name="pencil-outline" size={20} color={colors.text} />
                    <Text style={s.actionSheetText}>Rename folder</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={s.actionSheetItem} onPress={() => deleteFolder(folderActionModal.folder, folderActionModal.listType)}>
                    <Ionicons name="trash-outline" size={20} color={colors.destructive} />
                    <Text style={[s.actionSheetText, { color: colors.destructive }]}>Delete folder & recipes</Text>
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
    </SafeAreaView>
  )
}

const makeStyles = (colors: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.background },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: spacing.md, borderBottomWidth: 1.5, borderBottomColor: "rgba(255,255,255,0.4)" },
  headerTitle: { fontSize: 20, fontWeight: "800", color: colors.text },
  headerCount: { fontSize: 13, color: colors.mutedForeground, marginTop: 2 },

  // home
  homeButtons: { flex: 1, flexDirection: "row", gap: spacing.md, padding: spacing.md, alignItems: "stretch" },
  homeBtn: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, borderRadius: radius.lg, borderWidth: 2, padding: spacing.xl, backgroundColor: colors.card },
  homeBtnToTry: { borderColor: colors.primary + "44" },
  homeBtnTried: { borderColor: "#16a34a44" },
  homeBtnTitle: { fontSize: 22, fontWeight: "800", color: colors.primary },
  homeBtnCount: { fontSize: 13, color: colors.mutedForeground, fontWeight: "500" },

  // folder list
  folderRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  folderCard: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14, borderRadius: radius.md, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border },
  folderIconBg: { width: 44, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  folderName: { fontSize: 16, fontWeight: "700", color: colors.text },
  folderCount: { fontSize: 13, color: colors.mutedForeground, marginTop: 2 },
  folderMenuBtn: { padding: 8 },

  // filter bar (inside folder)
  filterBar: { paddingHorizontal: spacing.md, paddingVertical: 10, gap: 8, flexDirection: "row" },
  filterChip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 99, borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.card },
  filterChipActive: { borderColor: colors.primary, backgroundColor: colors.primary },
  filterChipText: { fontSize: 13, fontWeight: "600", color: colors.mutedForeground },
  filterChipTextActive: { color: "#fff" },
  clearFilterChip: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 99, borderWidth: 1.5, borderColor: colors.destructive, backgroundColor: colors.card },

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
  filterBadge: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 99, backgroundColor: colors.primary + "18" },
  filterBadgeText: { fontSize: 10, fontWeight: "600", color: colors.primary },
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

  // action sheet (folder menu / rename)
  actionSheet: { backgroundColor: colors.card, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: spacing.md, gap: 4 },
  actionSheetTitle: { fontSize: 14, fontWeight: "700", color: colors.mutedForeground, paddingVertical: 8, paddingHorizontal: 4 },
  actionSheetItem: { flexDirection: "row", alignItems: "center", gap: 14, paddingVertical: 14, paddingHorizontal: 4, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  actionSheetText: { fontSize: 16, color: colors.text, fontWeight: "500" },
  actionSheetBtn: { borderRadius: radius.md, paddingVertical: 12, alignItems: "center", marginTop: 8 },
  renameInput: { borderWidth: 1.5, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: 14, paddingVertical: 12, color: colors.text, fontSize: 15, backgroundColor: colors.background, marginTop: 8 },
})
