import React, { useState, useMemo } from "react"
import { View, Text, StyleSheet, TouchableOpacity, Modal, ScrollView, TextInput, Image, ActivityIndicator } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { Ionicons } from "@expo/vector-icons"
import { useNavigation, useRoute } from "@react-navigation/native"
import { useTheme } from "../context/ThemeContext"
import { useMyRecipes, ListType, Recipe } from "../context/MyRecipesContext"
import { useAuth } from "../context/AuthContext"
import { spacing, radius } from "../lib/theme"
import DraggableList from "../components/DraggableList"

const DIFFICULTIES = ["Very Easy", "Easy", "Moderate", "Difficult", "Very Difficult"]
const SUGGESTED_TAGS = ["Romantic", "Weekend", "Treat", "Kids", "Quick", "Healthy", "Comfort", "Batch Cook"]

const FILTER_FIELD_LABELS: Record<string, string> = {
  diet: "Diet", cuisine: "Cuisine", mealType: "Meal Type",
  prepTime: "Prep Time", budget: "Budget", taste: "Taste", healthiness: "Healthiness",
}
const FILTER_VALUE_LABELS: Record<string, string> = {
  vegetarian: "Vegetarian", vegan: "Vegan", glutenFree: "Gluten-free", keto: "Keto", paleo: "Paleo",
  italian: "Italian", mexican: "Mexican", thai: "Thai", indian: "Indian", chinese: "Chinese",
  french: "French", japanese: "Japanese", mediterranean: "Mediterranean", american: "American", greek: "Greek",
  breakfast: "Breakfast", lunch: "Lunch", dinner: "Dinner", "main course": "Main Course",
  "side dish": "Side Dish", soup: "Soup", salad: "Salad", appetizer: "Appetizer", dessert: "Dessert",
  under15: "< 15 min", under30: "< 30 min", under60: "< 1 hour", over60: "> 1 hour",
  cheap: "Budget-friendly", moderate: "Moderate", expensive: "Premium",
  sweet: "Sweet", salty: "Salty", spicy: "Spicy", savory: "Savory",
  healthy: "Healthy", veryHealthy: "Very Healthy", indulgent: "Indulgent",
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

export default function MyRecipesRecipesScreen() {
  const navigation = useNavigation<any>()
  const route = useRoute<any>()
  const { colors } = useTheme()
  const { user } = useAuth()
  const { toTryRecipes, triedRecipes, removeFromList, markAsTried, moveToTry, moveRecipe, submitRating, saveTags, toTryFolderOrder, triedFolderOrder, registerFolder } = useMyRecipes()
  const s = makeStyles(colors)

  const listType: ListType = route.params?.listType ?? "toTry"
  const folder: string | null = route.params?.folder ?? null

  const list = listType === "toTry" ? toTryRecipes : triedRecipes
  const listLabel = listType === "toTry" ? "To Try" : "Tried"
  const accentColor = colors.primary

  const [activeFilters, setActiveFilters] = useState<Record<string, string>>(route.params?.activeFilters ?? {})
  const [ratingFilter, setRatingFilter] = useState<{ rated: boolean; minScore: number } | null>(route.params?.ratingFilter ?? null)
  const [sortByRating, setSortByRating] = useState<"asc" | "desc" | null>(null)
  const [filterModalOpen, setFilterModalOpen] = useState(false)
  const [recipeOrder, setRecipeOrder] = useState<string[]>([])

  const [recipeActionSheet, setRecipeActionSheet] = useState<Recipe | null>(null)
  const [moveModal, setMoveModal] = useState<Recipe | null>(null)
  const [moveTarget, setMoveTarget] = useState("")
  const [moveCustom, setMoveCustom] = useState("")
  const [moving, setMoving] = useState(false)
  const [ratingModal, setRatingModal] = useState(false)
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null)
  const [ratingValues, setRatingValues] = useState({ satisfaction: 0, timeAccuracy: 0, difficulty: "Moderate" })
  const [tagEditModal, setTagEditModal] = useState(false)
  const [tagEditRecipe, setTagEditRecipe] = useState<Recipe | null>(null)
  const [editingTags, setEditingTags] = useState<string[]>([])
  const [customTag, setCustomTag] = useState("")
  const [savingRating, setSavingRating] = useState(false)

  const hasFilters = Object.keys(activeFilters).length > 0 || ratingFilter !== null
  const filterCount = Object.keys(activeFilters).length + (ratingFilter !== null ? 1 : 0)

  const recipesInFolder = useMemo(() => list.filter(r => r.folder === folder), [list, folder])

  const applyFilters = (recipes: Recipe[]) => {
    const entries = Object.entries(activeFilters)
    let result = entries.length ? recipes.filter(r => entries.every(([f, v]) => r.searchFilters?.[f] === v)) : recipes
    if (ratingFilter) result = result.filter(r => ratingFilter.rated ? (r.satisfaction ?? 0) >= ratingFilter.minScore : !r.satisfaction)
    if (sortByRating && ratingFilter?.rated) result = [...result].sort((a, b) => sortByRating === "asc" ? (a.satisfaction ?? 0) - (b.satisfaction ?? 0) : (b.satisfaction ?? 0) - (a.satisfaction ?? 0))
    return result
  }

  const orderedRecipes = useMemo(() => {
    if (!recipeOrder.length) return recipesInFolder
    const map = new Map(recipesInFolder.map(r => [r.recipeId, r]))
    const sorted = recipeOrder.map(id => map.get(id)).filter(Boolean) as Recipe[]
    const unsorted = recipesInFolder.filter(r => !recipeOrder.includes(r.recipeId))
    return [...sorted, ...unsorted]
  }, [recipesInFolder, recipeOrder])

  const filteredRecipes = useMemo(() => applyFilters(orderedRecipes), [orderedRecipes, activeFilters, ratingFilter, sortByRating])

  const listFilterOptions = useMemo(() => {
    const fields = ["diet", "cuisine", "mealType", "prepTime", "budget", "taste", "healthiness"]
    const options: Record<string, Set<string>> = {}
    for (const r of list) {
      if (!r.searchFilters) continue
      for (const field of fields) {
        const val = r.searchFilters[field]
        if (val) { if (!options[field]) options[field] = new Set(); options[field].add(val) }
      }
    }
    return Object.fromEntries(Object.entries(options).map(([k, v]) => [k, Array.from(v)]))
  }, [list])

  const toggleFilter = (field: string, value: string) => {
    setActiveFilters(prev => {
      if (prev[field] === value) { const next = { ...prev }; delete next[field]; return next }
      return { ...prev, [field]: value }
    })
  }

  const currentFolders = (listType === "toTry" ? toTryFolderOrder : triedFolderOrder).filter(f => f !== folder)

  const handleMoveConfirm = async () => {
    if (!moveModal) return
    const target = moveTarget === "__custom__" ? moveCustom.trim() : moveTarget === "" ? null : moveTarget
    setMoving(true)
    try {
      await moveRecipe(moveModal, listType, target)
      setMoveModal(null)
    } catch { }
    finally { setMoving(false) }
  }

  const handleSubmitRating = async () => {
    if (!selectedRecipe) return
    setSavingRating(true)
    try { await submitRating(selectedRecipe, ratingValues); setRatingModal(false) }
    catch { setRatingModal(false) }
    finally { setSavingRating(false) }
  }

  const handleSaveTags = async () => {
    if (!tagEditRecipe) return
    await saveTags(tagEditRecipe, editingTags)
    setTagEditModal(false)
  }

  return (
    <SafeAreaView style={s.container} edges={["top"]}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={s.headerTitle} numberOfLines={1}>My Recipes · {listLabel} · {folder ?? "Main List"}</Text>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          {listType === "tried" && ratingFilter?.rated && (
            <TouchableOpacity onPress={() => setSortByRating(prev => prev === "desc" ? "asc" : "desc")} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Text style={s.sortBtnText}>Sort by rate</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={s.filterBtn} onPress={() => setFilterModalOpen(true)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="options-outline" size={22} color={hasFilters ? colors.primary : colors.text} />
            {hasFilters && <View style={s.filterBadge}><Text style={s.filterBadgeText}>{filterCount}</Text></View>}
          </TouchableOpacity>
        </View>
      </View>

      {filteredRecipes.length === 0 ? (
        <View style={s.empty}>
          <Ionicons name={listType === "toTry" ? "bookmark-outline" : "checkmark-circle-outline"} size={48} color={colors.muted} />
          <Text style={s.emptyTitle}>{hasFilters ? "No recipes match this filter" : "No recipes here"}</Text>
          {hasFilters && <TouchableOpacity onPress={() => { setActiveFilters({}); setRatingFilter(null) }}><Text style={{ color: colors.primary, fontWeight: "600" }}>Clear filters</Text></TouchableOpacity>}
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ paddingTop: spacing.md, paddingBottom: 24 }}>
          <DraggableList
            data={filteredRecipes}
            keyExtractor={r => r.recipeId}
            itemHeight={110}
            onReorder={reordered => setRecipeOrder(reordered.map(r => r.recipeId))}
            renderItem={(item, _, isDragging) => (
              <View style={{ paddingHorizontal: spacing.md, paddingBottom: 12 }}>
                <TouchableOpacity
                  style={[s.card, isDragging && { elevation: 8, opacity: 0.94 }]}
                  onPress={() => navigation.navigate("RecipeDetail", { id: item.recipeId, title: item.title })}
                  activeOpacity={0.8}
                >
                  <View style={s.cardTop}>
                    {item.image ? (
                      <Image source={{ uri: item.image }} style={s.cardImage} resizeMode="cover" />
                    ) : (
                      <View style={[s.cardImage, s.cardImagePlaceholder]}>
                        <Ionicons name="restaurant-outline" size={24} color={colors.muted} />
                      </View>
                    )}
                    <View style={s.cardBody}>
                      <Text style={s.cardTitle} numberOfLines={1}>{item.title}</Text>
                      {item.readyInMinutes > 0 && (
                        <View style={s.metaRow}>
                          <View style={s.metaChip}>
                            <Ionicons name="time-outline" size={12} color={colors.mutedForeground} />
                            <Text style={s.metaText}>{item.readyInMinutes} min</Text>
                          </View>
                        </View>
                      )}
                      {listType === "tried" && item.satisfaction ? (
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginTop: 2 }}>
                          <Text style={{ fontSize: 10, color: colors.mutedForeground, marginRight: 2 }}>Overall</Text>
                          <Stars rating={item.satisfaction} colors={colors} />
                        </View>
                      ) : null}
                    </View>
                    <TouchableOpacity onPress={() => setRecipeActionSheet(item)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                      <Ionicons name="ellipsis-vertical" size={22} color={colors.mutedForeground} />
                    </TouchableOpacity>
                  </View>
                </TouchableOpacity>
              </View>
            )}
          />
        </ScrollView>
      )}

      {/* Recipe action sheet */}
      {recipeActionSheet && (
        <Modal visible transparent animationType="fade" onRequestClose={() => setRecipeActionSheet(null)}>
          <TouchableOpacity style={s.modalOverlay} activeOpacity={1} onPress={() => setRecipeActionSheet(null)}>
            <View style={s.actionSheet}>
              <Text style={s.actionSheetTitle}>{recipeActionSheet.title}</Text>
              {listType === "tried" && recipeActionSheet.triedOn && (
                <Text style={s.actionSheetSubtitle}>Tried on {recipeActionSheet.triedOn.split("T")[0]}</Text>
              )}
              {listType === "tried" && (
                <TouchableOpacity style={s.actionSheetRow} onPress={() => { setRecipeActionSheet(null); setSelectedRecipe(recipeActionSheet); setRatingValues({ satisfaction: recipeActionSheet.satisfaction ?? 0, timeAccuracy: recipeActionSheet.timeAccuracy ?? 0, difficulty: recipeActionSheet.difficulty ?? "Moderate" }); setRatingModal(true) }}>
                  <Ionicons name="star-outline" size={20} color={colors.text} />
                  <Text style={s.actionSheetRowText}>{recipeActionSheet.satisfaction ? "Change rating" : "Rate"}</Text>
                  <Ionicons name="chevron-forward" size={16} color={colors.muted} />
                </TouchableOpacity>
              )}
              {listType === "tried" && (
                <TouchableOpacity style={s.actionSheetRow} onPress={() => { setRecipeActionSheet(null); moveToTry(recipeActionSheet) }}>
                  <Ionicons name="bookmark-outline" size={20} color={colors.text} />
                  <Text style={s.actionSheetRowText}>Move to "To Try" group</Text>
                  <Ionicons name="chevron-forward" size={16} color={colors.muted} />
                </TouchableOpacity>
              )}
              {listType === "toTry" && (
                <TouchableOpacity style={s.actionSheetRow} onPress={() => { setRecipeActionSheet(null); markAsTried(recipeActionSheet) }}>
                  <Ionicons name="checkmark-circle-outline" size={20} color={colors.text} />
                  <Text style={s.actionSheetRowText}>Mark as Tried</Text>
                  <Ionicons name="chevron-forward" size={16} color={colors.muted} />
                </TouchableOpacity>
              )}
              <TouchableOpacity style={s.actionSheetRow} onPress={() => { setRecipeActionSheet(null); setMoveModal(recipeActionSheet); setMoveTarget(""); setMoveCustom("") }}>
                <Ionicons name="folder-outline" size={20} color={colors.text} />
                <Text style={s.actionSheetRowText}>Move to another folder</Text>
                <Ionicons name="chevron-forward" size={16} color={colors.muted} />
              </TouchableOpacity>
              <TouchableOpacity style={[s.actionSheetRow, s.actionSheetRowDestructive]} onPress={() => { setRecipeActionSheet(null); removeFromList(recipeActionSheet, listType) }}>
                <Ionicons name="trash-outline" size={20} color={colors.destructive} />
                <Text style={[s.actionSheetRowText, { color: colors.destructive }]}>Delete</Text>
                <Ionicons name="chevron-forward" size={16} color={colors.destructive} />
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </Modal>
      )}

      {/* Move modal */}
      {moveModal && (
        <Modal visible animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setMoveModal(null)}>
          <SafeAreaView style={s.modal} edges={["top"]}>
            <View style={s.modalHeader}>
              <TouchableOpacity onPress={() => setMoveModal(null)}><Ionicons name="arrow-back" size={24} color={colors.text} /></TouchableOpacity>
              <Text style={s.modalTitle}>Move Recipe</Text>
              <View style={{ width: 24 }} />
            </View>
            <ScrollView contentContainerStyle={{ padding: spacing.md, gap: 16 }} keyboardShouldPersistTaps="handled">
              <Text style={s.modalRecipeName}>{moveModal.title}</Text>
              <TouchableOpacity style={[s.moveFolderItem, moveTarget === "" && moveModal.folder !== null && s.moveFolderItemActive]} onPress={() => { setMoveTarget(""); setMoveCustom("") }}>
                <Ionicons name="list" size={18} color={accentColor} />
                <Text style={s.moveFolderText}>Main List</Text>
                {moveTarget === "" && moveModal.folder !== null && <Ionicons name="checkmark" size={16} color={accentColor} />}
              </TouchableOpacity>
              {currentFolders.map(f => (
                <TouchableOpacity key={f} style={[s.moveFolderItem, moveTarget === f && s.moveFolderItemActive]} onPress={() => { setMoveTarget(f); setMoveCustom("") }}>
                  <Ionicons name="folder" size={18} color={accentColor} />
                  <Text style={s.moveFolderText}>{f}</Text>
                  {moveTarget === f && <Ionicons name="checkmark" size={16} color={accentColor} />}
                </TouchableOpacity>
              ))}
              <TouchableOpacity style={[s.moveFolderItem, moveTarget === "__custom__" && s.moveFolderItemActive]} onPress={() => setMoveTarget("__custom__")}>
                <Ionicons name="add-circle-outline" size={18} color={accentColor} />
                <Text style={s.moveFolderText}>New Folder</Text>
              </TouchableOpacity>
              {moveTarget === "__custom__" && (
                <TextInput style={s.renameInput} value={moveCustom} onChangeText={setMoveCustom} placeholder="Folder name..." placeholderTextColor={colors.muted} autoFocus />
              )}
            </ScrollView>
            <View style={s.modalFooter}>
              <TouchableOpacity style={s.cancelBtn} onPress={() => setMoveModal(null)}>
                <Text style={s.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[s.submitBtn, { backgroundColor: accentColor }, moving && { opacity: 0.5 }]} onPress={handleMoveConfirm} disabled={moving}>
                {moving ? <ActivityIndicator color="#fff" /> : <Text style={s.submitBtnText}>Move</Text>}
              </TouchableOpacity>
            </View>
          </SafeAreaView>
        </Modal>
      )}

      {/* Rating modal */}
      <Modal visible={ratingModal} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setRatingModal(false)}>
        <SafeAreaView style={s.modal} edges={["top"]}>
          <View style={s.modalHeader}>
            <Text style={s.modalTitle}>Rate Your Experience</Text>
            <TouchableOpacity onPress={() => setRatingModal(false)}><Ionicons name="close" size={24} color={colors.text} /></TouchableOpacity>
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
            <TouchableOpacity style={s.cancelBtn} onPress={() => setRatingModal(false)}><Text style={s.cancelBtnText}>Cancel</Text></TouchableOpacity>
            <TouchableOpacity style={[s.submitBtn, savingRating && { opacity: 0.5 }]} onPress={handleSubmitRating} disabled={savingRating}>
              {savingRating ? <ActivityIndicator color="#fff" /> : <Text style={s.submitBtnText}>Save Rating</Text>}
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>

      {/* Tag edit modal */}
      <Modal visible={tagEditModal} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setTagEditModal(false)}>
        <SafeAreaView style={s.modal} edges={["top"]}>
          <View style={s.modalHeader}>
            <TouchableOpacity onPress={() => setTagEditModal(false)}><Text style={{ color: colors.mutedForeground, fontSize: 15 }}>Cancel</Text></TouchableOpacity>
            <Text style={s.modalTitle}>Edit Tags</Text>
            <TouchableOpacity onPress={handleSaveTags}><Text style={{ color: colors.primary, fontSize: 15, fontWeight: "700" }}>Save</Text></TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={{ padding: spacing.md, gap: 16 }} keyboardShouldPersistTaps="handled">
            {tagEditRecipe && <Text style={s.modalRecipeName}>{tagEditRecipe.title}</Text>}
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
              {SUGGESTED_TAGS.map(tag => {
                const active = editingTags.includes(tag)
                return (
                  <TouchableOpacity key={tag} onPress={() => setEditingTags(prev => active ? prev.filter(t => t !== tag) : [...prev, tag])} style={{ paddingHorizontal: 14, paddingVertical: 8, borderRadius: 99, borderWidth: 1.5, borderColor: active ? colors.primary : colors.border, backgroundColor: active ? colors.primary + "18" : colors.card }}>
                    <Text style={{ fontSize: 14, fontWeight: "600", color: active ? colors.primary : colors.mutedForeground }}>{tag}</Text>
                  </TouchableOpacity>
                )
              })}
            </View>
            <View style={{ flexDirection: "row", gap: 8 }}>
              <TextInput style={{ flex: 1, borderWidth: 1.5, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: 12, paddingVertical: 10, color: colors.text, backgroundColor: colors.card, fontSize: 14 }} value={customTag} onChangeText={setCustomTag} placeholder="Custom tag…" placeholderTextColor={colors.muted} returnKeyType="done" onSubmitEditing={() => { const t = customTag.trim(); if (t && !editingTags.includes(t)) setEditingTags(prev => [...prev, t]); setCustomTag("") }} />
              <TouchableOpacity style={{ backgroundColor: colors.primary, paddingHorizontal: 16, justifyContent: "center", borderRadius: radius.md }} onPress={() => { const t = customTag.trim(); if (t && !editingTags.includes(t)) setEditingTags(prev => [...prev, t]); setCustomTag("") }}>
                <Text style={{ color: "#fff", fontWeight: "700" }}>Add</Text>
              </TouchableOpacity>
            </View>
            {editingTags.length > 0 && (
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                {editingTags.map(tag => (
                  <TouchableOpacity key={tag} onPress={() => setEditingTags(prev => prev.filter(t => t !== tag))} style={{ flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 99, backgroundColor: colors.primary }}>
                    <Text style={{ color: "#fff", fontSize: 13, fontWeight: "600" }}>{tag}</Text>
                    <Ionicons name="close" size={13} color="#fff" />
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Filter modal */}
      <Modal visible={filterModalOpen} transparent animationType="slide">
        <TouchableOpacity style={s.modalOverlay} activeOpacity={1} onPress={() => setFilterModalOpen(false)}>
          <View style={s.filterSheet}>
            <View style={s.filterSheetHandle} />
            <View style={s.filterSheetHeader}>
              <Text style={s.filterSheetTitle}>Filter Recipes</Text>
              {hasFilters && <TouchableOpacity onPress={() => { setActiveFilters({}); setRatingFilter(null); setSortByRating(null); setFilterModalOpen(false) }}><Text style={{ color: colors.destructive, fontWeight: "600", fontSize: 14 }}>Clear all</Text></TouchableOpacity>}
            </View>
            <ScrollView contentContainerStyle={{ padding: spacing.md, gap: 20 }}>
              {listType === "tried" && (
                <View>
                  <Text style={s.filterSectionLabel}>Rating</Text>
                  <View style={s.filterChipsRow}>
                    <TouchableOpacity style={[s.filterChip, ratingFilter?.rated === true && s.filterChipActive]} onPress={() => setRatingFilter(prev => prev?.rated ? null : { rated: true, minScore: 1 })}>
                      <Text style={[s.filterChipText, ratingFilter?.rated === true && s.filterChipTextActive]}>Rated</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[s.filterChip, ratingFilter?.rated === false && s.filterChipActive]} onPress={() => { setRatingFilter(prev => prev?.rated === false ? null : { rated: false, minScore: 0 }); setSortByRating(null) }}>
                      <Text style={[s.filterChipText, ratingFilter?.rated === false && s.filterChipTextActive]}>Not rated</Text>
                    </TouchableOpacity>
                  </View>
                  {ratingFilter?.rated && (
                    <View style={{ marginTop: 12 }}>
                      <Text style={[s.filterSectionLabel, { marginBottom: 8 }]}>Min. score</Text>
                      <View style={{ flexDirection: "row", gap: 6 }}>
                        {[1, 2, 3, 4, 5].map(star => (
                          <TouchableOpacity key={star} onPress={() => setRatingFilter(prev => prev ? { ...prev, minScore: star } : null)}>
                            <Ionicons name={star <= (ratingFilter.minScore) ? "star" : "star-outline"} size={28} color="#f59e0b" />
                          </TouchableOpacity>
                        ))}
                      </View>
                    </View>
                  )}
                </View>
              )}
              {Object.keys(listFilterOptions).length > 0 ? Object.entries(listFilterOptions).map(([field, values]) => (
                <View key={field}>
                  <Text style={s.filterSectionLabel}>{FILTER_FIELD_LABELS[field] ?? field}</Text>
                  <View style={s.filterChipsRow}>
                    {values.map(value => (
                      <TouchableOpacity key={value} style={[s.filterChip, activeFilters[field] === value && s.filterChipActive]} onPress={() => toggleFilter(field, value)}>
                        <Text style={[s.filterChipText, activeFilters[field] === value && s.filterChipTextActive]}>{FILTER_VALUE_LABELS[value] ?? value}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )) : listType !== "tried" ? <Text style={{ color: colors.mutedForeground, fontSize: 14 }}>No filter options yet.</Text> : null}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  )
}

const makeStyles = (colors: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: "row", alignItems: "center", padding: spacing.md, borderBottomWidth: 1.5, borderBottomColor: "rgba(255,255,255,0.4)" },
  headerTitle: { flex: 1, textAlign: "center", fontSize: 17, fontWeight: "700", color: colors.text },
  filterBtn: { padding: 4 },
  filterBadge: { position: "absolute", top: -4, right: -4, backgroundColor: colors.primary, borderRadius: 99, minWidth: 16, height: 16, alignItems: "center", justifyContent: "center", paddingHorizontal: 4 },
  filterBadgeText: { fontSize: 9, fontWeight: "700", color: "#fff" },
  sortBtnText: { fontSize: 13, color: colors.primary, fontWeight: "600" },
  empty: { flex: 1, alignItems: "center", justifyContent: "center", paddingTop: 60, gap: 12 },
  emptyTitle: { fontSize: 18, fontWeight: "700", color: colors.text },
  card: { backgroundColor: colors.card, borderRadius: radius.lg, borderWidth: 1.5, borderColor: colors.border, overflow: "hidden" },
  cardTop: { flexDirection: "row", alignItems: "center", gap: 12, padding: 10 },
  cardImage: { width: 72, height: 72, borderRadius: radius.md },
  cardImagePlaceholder: { backgroundColor: colors.muted + "22", alignItems: "center", justifyContent: "center" },
  cardBody: { flex: 1, gap: 4 },
  cardTitle: { fontSize: 14, fontWeight: "700", color: colors.text },
  cardActions: { padding: 4 },
  metaRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  metaChip: { flexDirection: "row", alignItems: "center", gap: 3, backgroundColor: colors.muted + "22", paddingHorizontal: 6, paddingVertical: 3, borderRadius: 6 },
  metaText: { fontSize: 11, color: colors.mutedForeground },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  actionSheet: { backgroundColor: colors.card, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: spacing.md, paddingBottom: 32 },
  actionSheetTitle: { fontSize: 16, fontWeight: "700", color: colors.text, marginBottom: 4 },
  actionSheetSubtitle: { fontSize: 13, color: colors.mutedForeground, marginBottom: 8 },
  actionSheetRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 14, borderTopWidth: 1, borderTopColor: colors.border },
  actionSheetRowDestructive: {},
  actionSheetRowText: { flex: 1, fontSize: 15, color: colors.text },
  modal: { flex: 1, backgroundColor: colors.background },
  modalHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: spacing.md, borderBottomWidth: 1.5, borderBottomColor: "rgba(255,255,255,0.4)" },
  modalTitle: { fontSize: 18, fontWeight: "700", color: colors.text },
  modalRecipeName: { fontSize: 16, fontWeight: "600", color: colors.text, marginBottom: 16 },
  modalFooter: { flexDirection: "row", gap: 12, padding: spacing.md, borderTopWidth: 1, borderTopColor: colors.border },
  cancelBtn: { flex: 1, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingVertical: 14, alignItems: "center" },
  cancelBtnText: { fontSize: 15, fontWeight: "600", color: colors.text },
  submitBtn: { flex: 1, backgroundColor: colors.primary, borderRadius: radius.md, paddingVertical: 14, alignItems: "center" },
  submitBtnText: { fontSize: 15, fontWeight: "700", color: "#fff" },
  moveFolderItem: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14, borderRadius: radius.md, borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.card },
  moveFolderItemActive: { borderColor: colors.primary, backgroundColor: colors.primary + "11" },
  moveFolderText: { flex: 1, fontSize: 15, color: colors.text, fontWeight: "500" },
  renameInput: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: 12, paddingVertical: 10, color: colors.text, fontSize: 15, backgroundColor: colors.background },
  sectionLabel: { fontSize: 14, fontWeight: "600", color: colors.mutedForeground, marginBottom: 10 },
  difficultyOption: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 10 },
  difficultyOptionText: { fontSize: 15, color: colors.text },
  radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: colors.border },
  radioSelected: { borderColor: colors.primary, backgroundColor: colors.primary },
  filterSheet: { backgroundColor: colors.card, borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: "80%", paddingBottom: 32 },
  filterSheetHandle: { width: 40, height: 4, backgroundColor: colors.muted, borderRadius: 99, alignSelf: "center", marginTop: 12, marginBottom: 4 },
  filterSheetHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: spacing.md },
  filterSheetTitle: { fontSize: 17, fontWeight: "700", color: colors.text },
  filterSectionLabel: { fontSize: 13, fontWeight: "600", color: colors.mutedForeground, marginBottom: 8, textTransform: "uppercase" },
  filterChipsRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  filterChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 99, borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.card },
  filterChipActive: { borderColor: colors.primary, backgroundColor: colors.primary + "18" },
  filterChipText: { fontSize: 13, fontWeight: "600", color: colors.mutedForeground },
  filterChipTextActive: { color: colors.primary },
})
