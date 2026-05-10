import React, { useEffect, useState, useCallback } from "react"
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, Alert
} from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { Ionicons } from "@expo/vector-icons"
import { useNavigation, useFocusEffect } from "@react-navigation/native"
import { apiFetch } from "../lib/api"
import { useAuth } from "../context/AuthContext"
import { colors, spacing, radius } from "../lib/theme"

type ShoppingItem = {
  id: string
  recipe_id: string
  recipe_title: string
  ingredient_name: string
  ingredient_amount: string
  checked: boolean
}

type Group = { recipeId: string; title: string; items: ShoppingItem[]; collapsed: boolean }

export default function ShoppingListScreen() {
  const { user } = useAuth()
  const navigation = useNavigation<any>()
  const [groups, setGroups] = useState<Group[]>([])
  const [loading, setLoading] = useState(true)

  const fetchList = useCallback(async () => {
    if (!user) return
    setLoading(true)
    try {
      const res = await apiFetch(`/api/shopping-list?userId=${user.id}`)
      const data = await res.json()
      const items: ShoppingItem[] = data.items || []
      const map = new Map<string, Group>()
      items.forEach(item => {
        if (!map.has(item.recipe_id)) {
          map.set(item.recipe_id, { recipeId: item.recipe_id, title: item.recipe_title, items: [], collapsed: false })
        }
        map.get(item.recipe_id)!.items.push(item)
      })
      setGroups(Array.from(map.values()))
    } catch {}
    finally { setLoading(false) }
  }, [user])

  useFocusEffect(useCallback(() => {
    if (!user) { navigation.navigate("Login"); return }
    fetchList()
  }, [user, fetchList]))

  const toggleCheck = async (item: ShoppingItem) => {
    setGroups(prev => prev.map(g => ({
      ...g,
      items: g.items.map(i => i.id === item.id ? { ...i, checked: !i.checked } : i)
    })))
    await apiFetch("/api/shopping-list/check", {
      method: "PATCH",
      body: JSON.stringify({ userId: user!.id, itemId: item.id, checked: !item.checked }),
    })
  }

  const deleteItem = async (itemId: string, recipeId: string) => {
    setGroups(prev => prev.map(g => g.recipeId === recipeId
      ? { ...g, items: g.items.filter(i => i.id !== itemId) }
      : g
    ).filter(g => g.items.length > 0))
    await apiFetch("/api/shopping-list", {
      method: "DELETE",
      body: JSON.stringify({ userId: user!.id, itemId }),
    })
  }

  const deleteByRecipe = async (recipeId: string) => {
    setGroups(prev => prev.filter(g => g.recipeId !== recipeId))
    await apiFetch("/api/shopping-list", {
      method: "DELETE",
      body: JSON.stringify({ userId: user!.id, recipeId }),
    })
  }

  const clearAll = () => {
    Alert.alert("Clear all?", "Remove everything from your shopping list?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Clear all", style: "destructive", onPress: async () => {
          setGroups([])
          await apiFetch("/api/shopping-list", {
            method: "DELETE",
            body: JSON.stringify({ userId: user!.id }),
          })
        }
      }
    ])
  }

  const toggleCollapse = (recipeId: string) => {
    setGroups(prev => prev.map(g => g.recipeId === recipeId ? { ...g, collapsed: !g.collapsed } : g))
  }

  if (!user) return null

  if (loading) return (
    <View style={styles.center}>
      <ActivityIndicator size="large" color={colors.primary} />
    </View>
  )

  const totalItems = groups.reduce((acc, g) => acc + g.items.length, 0)
  const checkedItems = groups.reduce((acc, g) => acc + g.items.filter(i => i.checked).length, 0)

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Ionicons name="cart" size={22} color={colors.primary} />
          <Text style={styles.headerTitle}>Shopping List</Text>
          {totalItems > 0 && <Text style={styles.headerCount}>{checkedItems}/{totalItems}</Text>}
        </View>
        {totalItems > 0 && (
          <TouchableOpacity style={styles.clearBtn} onPress={clearAll}>
            <Ionicons name="trash-outline" size={16} color={colors.destructive} />
            <Text style={styles.clearBtnText}>Clear All</Text>
          </TouchableOpacity>
        )}
      </View>

      {groups.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="cart-outline" size={56} color={colors.muted} />
          <Text style={styles.emptyTitle}>Your shopping list is empty</Text>
          <Text style={styles.emptySubText}>Open any recipe and add ingredients from the Ingredients tab.</Text>
          <TouchableOpacity style={styles.browseBtn} onPress={() => navigation.navigate("Search")}>
            <Text style={styles.browseBtnText}>Browse Recipes</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={groups}
          keyExtractor={g => g.recipeId}
          contentContainerStyle={{ padding: spacing.md, gap: 12 }}
          renderItem={({ item: group }) => {
            const allChecked = group.items.every(i => i.checked)
            return (
              <View style={[styles.card, allChecked && styles.cardDimmed]}>
                {/* Recipe header */}
                <View style={styles.cardHeader}>
                  <TouchableOpacity style={styles.cardTitleRow} onPress={() => toggleCollapse(group.recipeId)}>
                    <Ionicons
                      name={group.collapsed ? "chevron-down" : "chevron-up"}
                      size={16} color={colors.mutedForeground}
                    />
                    <Text style={styles.cardTitle} numberOfLines={2}>{group.title}</Text>
                    <Text style={styles.cardCount}>({group.items.length})</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => deleteByRecipe(group.recipeId)} style={styles.deleteRecipeBtn}>
                    <Ionicons name="trash-outline" size={17} color={colors.destructive} />
                  </TouchableOpacity>
                </View>

                {/* Items */}
                {!group.collapsed && group.items.map(item => (
                  <View key={item.id} style={styles.itemRow}>
                    <TouchableOpacity onPress={() => toggleCheck(item)} style={styles.checkbox}>
                      <Ionicons
                        name={item.checked ? "checkbox" : "square-outline"}
                        size={22} color={item.checked ? colors.primary : colors.muted}
                      />
                    </TouchableOpacity>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.itemName, item.checked && styles.itemChecked]}>{item.ingredient_name}</Text>
                      {item.ingredient_amount ? (
                        <Text style={styles.itemAmount}>{item.ingredient_amount}</Text>
                      ) : null}
                    </View>
                    <TouchableOpacity onPress={() => deleteItem(item.id, group.recipeId)}>
                      <Ionicons name="trash-outline" size={16} color={colors.destructive} />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )
          }}
        />
      )}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.background },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 8 },
  headerTitle: { fontSize: 20, fontWeight: "700", color: colors.text },
  headerCount: { fontSize: 13, color: colors.mutedForeground },
  clearBtn: { flexDirection: "row", alignItems: "center", gap: 6, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 12, paddingVertical: 6, borderRadius: radius.md },
  clearBtnText: { fontSize: 13, color: colors.destructive, fontWeight: "500" },
  empty: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, padding: spacing.xl },
  emptyTitle: { fontSize: 18, fontWeight: "600", color: colors.text },
  emptySubText: { fontSize: 14, color: colors.mutedForeground, textAlign: "center" },
  browseBtn: { backgroundColor: colors.primary, paddingHorizontal: 24, paddingVertical: 12, borderRadius: radius.md, marginTop: 8 },
  browseBtnText: { color: "#fff", fontWeight: "700" },
  card: { backgroundColor: colors.card, borderRadius: radius.lg, borderWidth: 1.5, borderColor: colors.border, overflow: "hidden" },
  cardDimmed: { opacity: 0.6 },
  cardHeader: { flexDirection: "row", alignItems: "center", padding: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border },
  cardTitleRow: { flexDirection: "row", alignItems: "center", gap: 6, flex: 1 },
  cardTitle: { fontSize: 15, fontWeight: "600", color: colors.text, flex: 1 },
  cardCount: { fontSize: 13, color: colors.mutedForeground, flexShrink: 0 },
  deleteRecipeBtn: { padding: 4 },
  itemRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: spacing.md, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border + "80" },
  checkbox: { padding: 2 },
  itemName: { fontSize: 14, fontWeight: "600", color: colors.text },
  itemChecked: { textDecorationLine: "line-through", color: colors.muted },
  itemAmount: { fontSize: 12, color: colors.mutedForeground, marginTop: 1 },
})
