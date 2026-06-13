import React, { useCallback, useState } from "react"
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { Ionicons } from "@expo/vector-icons"
import { useFocusEffect } from "@react-navigation/native"
import { apiFetch } from "../lib/api"
import { useAuth } from "../context/AuthContext"
import { useTheme } from "../context/ThemeContext"
import { useGlobalError } from "../context/GlobalErrorContext"
import { useActiveRecipeSession } from "../context/ActiveRecipeSessionContext"
import { spacing, radius } from "../lib/theme"
import { showAlert } from "../components/CustomAlert"

type QuickItem = { id: string; recipe_id: string; recipe_title: string; ingredient_name: string; ingredient_amount: string; checked: boolean }

export default function QuickShoppingListScreen() {
  const { user } = useAuth()
  const { colors } = useTheme()
  const { showError } = useGlobalError()
  const { refreshQuickListCount } = useActiveRecipeSession()
  const s = makeStyles(colors)
  const [items, setItems] = useState<QuickItem[]>([])
  const [loading, setLoading] = useState(true)

  const fetchItems = useCallback(async () => {
    if (!user) return
    setLoading(true)
    try {
      const res = await apiFetch(`/api/quick-shopping-list?userId=${user.id}`, { screen: "Quick List" })
      const data = await res.json()
      if (!res.ok) { showError(data?.error ?? `Error ${res.status}`, "Quick List", fetchItems); return }
      setItems(data.items || [])
    } catch (e: any) {
      showError(e?.message ?? "Failed to load quick list", "Quick List", fetchItems)
    } finally { setLoading(false) }
  }, [user])

  useFocusEffect(useCallback(() => { fetchItems() }, [fetchItems]))

  const toggleCheck = async (item: QuickItem) => {
    const newChecked = !item.checked
    setItems(prev => prev.map(i => i.id === item.id ? { ...i, checked: newChecked } : i))
    await apiFetch("/api/quick-shopping-list/check", { method: "PATCH", body: JSON.stringify({ userId: user!.id, itemId: item.id, checked: newChecked }) })
    await refreshQuickListCount()
  }

  const deleteItem = async (itemId: string) => {
    setItems(prev => prev.filter(i => i.id !== itemId))
    await apiFetch("/api/quick-shopping-list", { method: "DELETE", body: JSON.stringify({ userId: user!.id, itemId }) })
    await refreshQuickListCount()
  }

  const moveToShoppingList = async (item: QuickItem) => {
    await apiFetch("/api/shopping-list", {
      method: "POST",
      body: JSON.stringify({
        userId: user!.id,
        recipeId: item.recipe_id,
        recipeTitle: item.recipe_title,
        ingredients: [{ name: item.ingredient_name, amount: item.ingredient_amount }],
      }),
    })
    setItems(prev => prev.filter(i => i.id !== item.id))
    await apiFetch("/api/quick-shopping-list", { method: "DELETE", body: JSON.stringify({ userId: user!.id, itemId: item.id }) })
    await refreshQuickListCount()
  }

  const moveAllToShoppingList = () => {
    showAlert({ title: "Move all to shopping list?", message: "All items will be moved to your main shopping list.", buttons: [
      { text: "Cancel", style: "cancel" },
      {
        text: "Move all", onPress: async () => {
          const grouped: Record<string, { name: string; amount: string }[]> = {}
          items.forEach(item => {
            if (!grouped[item.recipe_id]) grouped[item.recipe_id] = []
            grouped[item.recipe_id].push({ name: item.ingredient_name, amount: item.ingredient_amount })
          })
          const firstItem = items[0]
          await Promise.all(
            Object.entries(grouped).map(([recipeId, ings]) =>
              apiFetch("/api/shopping-list", {
                method: "POST",
                body: JSON.stringify({
                  userId: user!.id,
                  recipeId,
                  recipeTitle: items.find(i => i.recipe_id === recipeId)?.recipe_title ?? "",
                  ingredients: ings,
                }),
              })
            )
          )
          setItems([])
          await apiFetch("/api/quick-shopping-list", { method: "DELETE", body: JSON.stringify({ userId: user!.id }) })
          await refreshQuickListCount()
        }
      }
    ]})
  }

  const clearAll = () => {
    showAlert({ title: "Clear quick list?", message: "Remove all items from your quick shopping list?", buttons: [
      { text: "Cancel", style: "cancel" },
      {
        text: "Clear", style: "destructive", onPress: async () => {
          setItems([])
          await apiFetch("/api/quick-shopping-list", { method: "DELETE", body: JSON.stringify({ userId: user!.id }) })
          await refreshQuickListCount()
        }
      }
    ]})
  }

  if (!user) return null
  if (loading) return <View style={s.center}><ActivityIndicator size="large" color={colors.primary} /></View>

  const checkedCount = items.filter(i => i.checked).length

  return (
    <SafeAreaView style={s.container} edges={["top"]}>
      {items.length > 0 && (
        <View style={s.header}>
          <Text style={s.headerCount}>{checkedCount}/{items.length}</Text>
          <View style={{ flexDirection: "row", gap: 8 }}>
            <TouchableOpacity style={s.moveAllBtn} onPress={moveAllToShoppingList}>
              <Ionicons name="cart-outline" size={14} color={colors.primary} />
              <Text style={s.moveAllBtnText}>Move all</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.clearBtn} onPress={clearAll}>
              <Ionicons name="trash-outline" size={14} color={colors.destructive} />
              <Text style={s.clearBtnText}>Clear</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {items.length === 0 ? (
        <View style={s.empty}>
          <Ionicons name="flash-outline" size={56} color={colors.muted} />
          <Text style={s.emptyTitle}>Quick list is empty</Text>
          <Text style={s.emptySubText}>Ingredients you're missing from a scan will appear here.</Text>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={i => i.id}
          contentContainerStyle={{ padding: spacing.md, gap: 8 }}
          renderItem={({ item }) => (
            <View style={s.row}>
              <TouchableOpacity onPress={() => toggleCheck(item)} style={s.checkbox}>
                <Ionicons name={item.checked ? "checkbox" : "square-outline"} size={24} color={item.checked ? colors.primary : colors.muted} />
              </TouchableOpacity>
              <View style={{ flex: 1 }}>
                <Text style={[s.name, item.checked && s.nameChecked]}>{item.ingredient_name}</Text>
                {item.ingredient_amount ? <Text style={s.amount}>{item.ingredient_amount}</Text> : null}
                <Text style={s.recipeLabel}>{item.recipe_title}</Text>
              </View>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                <TouchableOpacity onPress={() => moveToShoppingList(item)} style={s.moveBtn}>
                  <Ionicons name="cart-outline" size={15} color={colors.primary} />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => deleteItem(item.id)}>
                  <Ionicons name="trash-outline" size={15} color={colors.destructive} />
                </TouchableOpacity>
              </View>
            </View>
          )}
        />
      )}
    </SafeAreaView>
  )
}

const makeStyles = (colors: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.background },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: spacing.md, borderBottomWidth: 1.5, borderBottomColor: "rgba(255,255,255,0.4)" },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 8 },
  headerTitle: { fontSize: 20, fontWeight: "700", color: colors.text },
  headerCount: { fontSize: 13, color: colors.mutedForeground },
  moveAllBtn: { flexDirection: "row", alignItems: "center", gap: 6, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 12, paddingVertical: 6, borderRadius: radius.md },
  moveAllBtnText: { fontSize: 13, color: colors.primary, fontWeight: "500" },
  moveBtn: { padding: 4 },
  clearBtn: { flexDirection: "row", alignItems: "center", gap: 6, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 12, paddingVertical: 6, borderRadius: radius.md },
  clearBtnText: { fontSize: 13, color: colors.destructive, fontWeight: "500" },
  empty: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, padding: spacing.xl },
  emptyTitle: { fontSize: 18, fontWeight: "600", color: colors.text },
  emptySubText: { fontSize: 14, color: colors.mutedForeground, textAlign: "center" },
  row: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: colors.card, borderWidth: 1.5, borderColor: colors.border, borderRadius: radius.lg, paddingHorizontal: spacing.md, paddingVertical: 12 },
  checkbox: { padding: 2 },
  name: { fontSize: 15, fontWeight: "600", color: colors.text },
  nameChecked: { textDecorationLine: "line-through", color: colors.muted },
  amount: { fontSize: 12, color: colors.mutedForeground, marginTop: 1 },
  recipeLabel: { fontSize: 11, color: colors.primary, marginTop: 3, fontWeight: "500" },
})
