import React, { useState, useMemo } from "react"
import { View, Text, StyleSheet, TouchableOpacity, Modal, ScrollView, TextInput, Alert } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { Ionicons } from "@expo/vector-icons"
import { useNavigation, useRoute } from "@react-navigation/native"
import { useTheme } from "../context/ThemeContext"
import { useMyRecipes, ListType, Recipe } from "../context/MyRecipesContext"
import { spacing, radius } from "../lib/theme"
import DraggableList from "../components/DraggableList"

const FILTER_SECTION_LABELS: Record<string, string> = { diet: "Diet", cuisine: "Cuisine", prepTime: "Prep Time", budget: "Budget", taste: "Taste", healthiness: "Health" }
const FILTER_VALUE_LABELS: Record<string, Record<string, string>> = {
  diet: { vegetarian: "Vegetarian", vegan: "Vegan", glutenFree: "GF", keto: "Keto", paleo: "Paleo" },
  prepTime: { under15: "< 15 min", under30: "< 30 min", under60: "< 1 hr", over60: "> 1 hr" },
  budget: { cheap: "Cheap", moderate: "Moderate", expensive: "Premium" },
  taste: { sweet: "Sweet", salty: "Salty", spicy: "Spicy", savory: "Savory" },
  healthiness: { healthy: "Healthy", veryHealthy: "Very Healthy", indulgent: "Indulgent" },
}
function labelFor(field: string, value: string): string {
  return FILTER_VALUE_LABELS[field]?.[value] ?? (value.charAt(0).toUpperCase() + value.slice(1))
}

export default function MyRecipesFoldersScreen() {
  const navigation = useNavigation<any>()
  const route = useRoute<any>()
  const { colors } = useTheme()
  const { toTryRecipes, triedRecipes, toTryFolderOrder, triedFolderOrder, setToTryFolderOrder, setTriedFolderOrder, renameFolder, deleteFolder } = useMyRecipes()
  const s = makeStyles(colors)

  const listType: ListType = route.params?.listType ?? "toTry"
  const list = listType === "toTry" ? toTryRecipes : triedRecipes
  const listLabel = listType === "toTry" ? "To Try" : "Tried"
  const accentColor = colors.primary
  const folderOrder = listType === "toTry" ? toTryFolderOrder : triedFolderOrder
  const setFolderOrder = listType === "toTry" ? setToTryFolderOrder : setTriedFolderOrder

  const [activeFilters, setActiveFilters] = useState<Record<string, string>>({})
  const [ratingFilter, setRatingFilter] = useState<{ rated: boolean; minScore: number } | null>(null)
  const [filterModalOpen, setFilterModalOpen] = useState(false)
  const [folderActionModal, setFolderActionModal] = useState<{ folder: string; step: "menu" | "rename" } | null>(null)
  const [folderRenameValue, setFolderRenameValue] = useState("")

  const hasFilters = Object.keys(activeFilters).length > 0 || ratingFilter !== null
  const filterCount = Object.keys(activeFilters).length + (ratingFilter !== null ? 1 : 0)

  const applyFilters = (recipes: Recipe[]) => {
    const entries = Object.entries(activeFilters)
    let result = entries.length ? recipes.filter(r => entries.every(([f, v]) => r.searchFilters?.[f] === v)) : recipes
    if (ratingFilter) result = result.filter(r => ratingFilter.rated ? (r.satisfaction ?? 0) >= ratingFilter.minScore : !r.satisfaction)
    return result
  }

  const listFilterOptions = useMemo(() => {
    const fields = ["diet", "cuisine", "prepTime", "budget", "taste", "healthiness"]
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

  const folderVisibleCount = (folder: string | null) => applyFilters(list.filter(r => r.folder === folder)).length

  const handleDeleteFolder = async (folder: string) => {
    await deleteFolder(listType, folder)
    setFolderActionModal(null)
  }

  const handleRenameFolder = async () => {
    if (!folderActionModal) return
    const newName = folderRenameValue.trim()
    if (!newName || newName === folderActionModal.folder) { setFolderActionModal(null); return }
    await renameFolder(listType, folderActionModal.folder, newName)
    setFolderActionModal(null)
  }

  const toggleFilter = (field: string, value: string) => {
    setActiveFilters(prev => {
      if (prev[field] === value) { const next = { ...prev }; delete next[field]; return next }
      return { ...prev, [field]: value }
    })
  }

  return (
    <SafeAreaView style={s.container} edges={["top"]}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={s.headerTitle} numberOfLines={1}>My Recipes · {listLabel}</Text>
        <TouchableOpacity style={s.filterBtn} onPress={() => setFilterModalOpen(true)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name="options-outline" size={22} color={hasFilters ? colors.primary : colors.text} />
          {hasFilters && <View style={s.filterBadge}><Text style={s.filterBadgeText}>{filterCount}</Text></View>}
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ padding: spacing.md }}>
        <TouchableOpacity
          style={[s.folderCard, { marginBottom: 12 }]}
          onPress={() => navigation.navigate("MyRecipesRecipes", { listType, folder: null, activeFilters, ratingFilter })}
          activeOpacity={0.8}
        >
          <View style={[s.folderIconBg, { backgroundColor: accentColor + "22" }]}>
            <Ionicons name="list" size={22} color={accentColor} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.folderName}>Main List</Text>
            <Text style={s.folderCount}>{folderVisibleCount(null)} recipe{folderVisibleCount(null) !== 1 ? "s" : ""}{hasFilters ? " (filtered)" : ""}</Text>
          </View>
        </TouchableOpacity>

        {folderOrder.length > 0 && (
          <DraggableList
            data={folderOrder}
            keyExtractor={f => f}
            itemHeight={78}
            onReorder={setFolderOrder}
            renderItem={(folder, _, isDragging) => {
              const count = folderVisibleCount(folder)
              return (
                <View style={{ paddingBottom: 12 }}>
                  <TouchableOpacity
                    style={[s.folderCard, isDragging && { elevation: 8, opacity: 0.92 }]}
                    onPress={() => navigation.navigate("MyRecipesRecipes", { listType, folder, activeFilters, ratingFilter })}
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
                      onPress={() => { setFolderActionModal({ folder, step: "menu" }); setFolderRenameValue(folder) }}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      style={{ padding: 4 }}
                    >
                      <Ionicons name="ellipsis-vertical" size={22} color={colors.muted} />
                    </TouchableOpacity>
                  </TouchableOpacity>
                </View>
              )
            }}
          />
        )}

        {list.length === 0 && (
          <View style={s.empty}>
            <Ionicons name={listType === "toTry" ? "bookmark-outline" : "checkmark-circle-outline"} size={56} color={colors.muted} />
            <Text style={s.emptyTitle}>No {listLabel} recipes yet</Text>
            <Text style={s.emptySubText}>{listType === "toTry" ? "Find recipes and add them to your try list." : "Search for recipes and mark them as tried."}</Text>
            <TouchableOpacity style={[s.browseBtn, { backgroundColor: accentColor }]} onPress={() => navigation.navigate("Tabs", { screen: "Search" })}>
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
                  <TouchableOpacity style={[s.actionSheetRow, s.actionSheetRowDestructive]} onPress={() => handleDeleteFolder(folderActionModal.folder)}>
                    <Ionicons name="trash-outline" size={20} color={colors.destructive} />
                    <Text style={[s.actionSheetRowText, { color: colors.destructive }]}>Delete</Text>
                    <Ionicons name="chevron-forward" size={16} color={colors.destructive} />
                  </TouchableOpacity>
                </>
              ) : (
                <>
                  <Text style={s.actionSheetTitle}>Rename Folder</Text>
                  <TextInput style={s.renameInput} value={folderRenameValue} onChangeText={setFolderRenameValue} autoFocus selectTextOnFocus placeholderTextColor={colors.muted} />
                  <TouchableOpacity style={[s.actionSheetBtn, { backgroundColor: colors.primary }]} onPress={handleRenameFolder}>
                    <Text style={{ color: "#fff", fontWeight: "700" }}>Save</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          </TouchableOpacity>
        </Modal>
      )}

      {/* Filter modal */}
      <Modal visible={filterModalOpen} transparent animationType="slide">
        <TouchableOpacity style={s.modalOverlay} activeOpacity={1} onPress={() => setFilterModalOpen(false)}>
          <View style={s.filterSheet}>
            <View style={s.filterSheetHandle} />
            <View style={s.filterSheetHeader}>
              <Text style={s.filterSheetTitle}>Filter Recipes</Text>
              {hasFilters && (
                <TouchableOpacity onPress={() => { setActiveFilters({}); setRatingFilter(null); setFilterModalOpen(false) }}>
                  <Text style={{ color: colors.destructive, fontWeight: "600", fontSize: 14 }}>Clear all</Text>
                </TouchableOpacity>
              )}
            </View>
            <ScrollView contentContainerStyle={{ padding: spacing.md, gap: 20 }}>
              {listType === "tried" && (
                <View>
                  <Text style={s.filterSectionLabel}>Rating</Text>
                  <View style={s.filterChipsRow}>
                    <TouchableOpacity style={[s.filterChip, ratingFilter?.rated === true && s.filterChipActive]} onPress={() => setRatingFilter(prev => prev?.rated ? null : { rated: true, minScore: 1 })}>
                      <Text style={[s.filterChipText, ratingFilter?.rated === true && s.filterChipTextActive]}>Rated</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[s.filterChip, ratingFilter?.rated === false && s.filterChipActive]} onPress={() => setRatingFilter(prev => prev?.rated === false ? null : { rated: false, minScore: 0 })}>
                      <Text style={[s.filterChipText, ratingFilter?.rated === false && s.filterChipTextActive]}>Not rated</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
              {Object.keys(listFilterOptions).length > 0 ? Object.entries(listFilterOptions).map(([field, values]) => (
                <View key={field}>
                  <Text style={s.filterSectionLabel}>{FILTER_SECTION_LABELS[field] ?? field}</Text>
                  <View style={s.filterChipsRow}>
                    {values.map(value => (
                      <TouchableOpacity key={value} style={[s.filterChip, activeFilters[field] === value && s.filterChipActive]} onPress={() => toggleFilter(field, value)}>
                        <Text style={[s.filterChipText, activeFilters[field] === value && s.filterChipTextActive]}>{labelFor(field, value)}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )) : listType !== "tried" ? (
                <Text style={{ color: colors.mutedForeground, fontSize: 14 }}>No filter options yet.</Text>
              ) : null}
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
  folderCard: { flexDirection: "row", alignItems: "center", gap: 14, padding: spacing.md, borderRadius: radius.lg, backgroundColor: colors.card, borderWidth: 1.5, borderColor: colors.border },
  folderIconBg: { width: 42, height: 42, borderRadius: radius.md, alignItems: "center", justifyContent: "center" },
  folderName: { fontSize: 16, fontWeight: "700", color: colors.text },
  folderCount: { fontSize: 13, color: colors.mutedForeground, marginTop: 2 },
  empty: { flex: 1, alignItems: "center", justifyContent: "center", paddingTop: 60, gap: 12 },
  emptyTitle: { fontSize: 18, fontWeight: "700", color: colors.text },
  emptySubText: { fontSize: 14, color: colors.mutedForeground, textAlign: "center", paddingHorizontal: 32 },
  browseBtn: { marginTop: 8, paddingHorizontal: 24, paddingVertical: 12, borderRadius: radius.md },
  browseBtnText: { color: "#fff", fontWeight: "700", fontSize: 15 },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  actionSheet: { backgroundColor: colors.card, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: spacing.md, paddingBottom: 32 },
  actionSheetTitle: { fontSize: 16, fontWeight: "700", color: colors.text, marginBottom: 12 },
  actionSheetRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 14, borderTopWidth: 1, borderTopColor: colors.border },
  actionSheetRowDestructive: {},
  actionSheetRowText: { flex: 1, fontSize: 15, color: colors.text },
  actionSheetBtn: { marginTop: 12, paddingVertical: 14, borderRadius: radius.md, alignItems: "center" },
  renameInput: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: 12, paddingVertical: 10, color: colors.text, fontSize: 15, backgroundColor: colors.background },
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
