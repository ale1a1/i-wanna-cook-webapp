import React, { useState, useCallback, useEffect } from "react"
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Modal, Alert } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { Ionicons } from "@expo/vector-icons"
import { useNavigation } from "@react-navigation/native"
import { useTheme } from "../context/ThemeContext"
import { useAuth } from "../context/AuthContext"
import { useSubscription } from "../context/SubscriptionContext"
import { useGlobalError } from "../context/GlobalErrorContext"
import PaywallModal from "../components/PaywallModal"
import { apiFetch, API_BASE_URL } from "../lib/api"
import { spacing, radius } from "../lib/theme"

const DIETS = ["none", "vegetarian", "vegan", "ketogenic", "paleo", "gluten free"]
const CALORIES = ["1500", "1800", "2000", "2200", "2500"]

type Meal = { id: number; title: string; readyInMinutes: number; servings: number; sourceUrl: string }
type DayPlan = { meals: Meal[]; nutrients: { calories: number; protein: number; fat: number; carbohydrates: number } }
type WeekPlan = { week: Record<string, DayPlan> }

const DAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]

export default function MealPlanScreen() {
  const { colors } = useTheme()
  const { user } = useAuth()
  const { isPremium, isLoading: subLoading } = useSubscription()
  const { showError } = useGlobalError()
  const navigation = useNavigation<any>()
  const s = makeStyles(colors)

  const [showPaywall, setShowPaywall] = useState(false)
  const [loading, setLoading] = useState(false)
  const [plan, setPlan] = useState<WeekPlan | null>(null)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [calories, setCalories] = useState("2000")
  const [diet, setDiet] = useState("none")
  const [expandedDay, setExpandedDay] = useState<string | null>("Monday")

  useEffect(() => {
    if (!subLoading && !isPremium) setShowPaywall(true)
  }, [subLoading, isPremium])

  const generatePlan = useCallback(async () => {
    if (!isPremium) { setShowPaywall(true); return }
    setLoading(true)
    setSettingsOpen(false)
    try {
      const params = new URLSearchParams({ targetCalories: calories, timeFrame: "week" })
      if (diet !== "none") params.set("diet", diet)
      const res = await apiFetch(`/api/meal-plan/generate?${params.toString()}`, { screen: "Meal Plan" })
      const data = await res.json()
      if (!res.ok) { showError(data.error ?? "Failed to generate meal plan", "Meal Plan"); return }
      setPlan(data)

      if (user?.id) {
        const weekStart = new Date()
        weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1)
        fetch(`${API_BASE_URL}/api/meal-plan`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId: user.id, weekStart: weekStart.toISOString().split("T")[0], planData: data }),
        }).catch(() => {})

        Alert.alert(
          "Add to Shopping List?",
          "Do you want to add all this week's meal ingredients to your shopping list?",
          [
            { text: "I'll do it myself later", style: "cancel" },
            {
              text: "Yes, add them all",
              onPress: async () => {
                const allMeals: { id: number; title: string }[] = Object.values(data.week as Record<string, any>)
                  .flatMap((day: any) => day.meals ?? [])
                await Promise.all(
                  allMeals.map((meal: any) =>
                    apiFetch("/api/shopping-list", {
                      method: "POST",
                      body: JSON.stringify({
                        userId: user!.id,
                        recipeId: String(meal.id),
                        recipeTitle: meal.title,
                        ingredients: [{ name: meal.title, amount: "see recipe" }],
                      }),
                    }).catch(() => {})
                  )
                )
                Alert.alert("Done!", "All meals added to your shopping list.")
              },
            },
          ]
        )
      }
    } catch (e: any) {
      showError(e?.message ?? "Network error", "Meal Plan")
    } finally {
      setLoading(false)
    }
  }, [isPremium, calories, diet, user?.id, showError])

  if (subLoading) {
    return <SafeAreaView style={s.container} edges={["top"]}><View style={s.center}><ActivityIndicator size="large" color={colors.primary} /></View></SafeAreaView>
  }

  return (
    <SafeAreaView style={s.container} edges={["top"]}>
      <View style={s.topBar}>
        <Text style={s.title}>Meal Plan</Text>
        <View style={s.topActions}>
          <TouchableOpacity style={s.iconBtn} onPress={() => setSettingsOpen(true)}>
            <Ionicons name="options-outline" size={22} color={colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity style={[s.generateBtn, loading && s.btnDisabled]} onPress={generatePlan} disabled={loading}>
            {loading ? <ActivityIndicator size="small" color="#fff" /> : <Text style={s.generateBtnText}>Generate</Text>}
          </TouchableOpacity>
        </View>
      </View>

      {!plan && !loading && (
        <View style={s.center}>
          <Text style={s.emptyEmoji}>📅</Text>
          <Text style={s.emptyText}>No meal plan yet</Text>
          <Text style={s.emptySubText}>Tap Generate to create your week</Text>
        </View>
      )}

      {loading && (
        <View style={s.center}>
          <Text style={s.emptyEmoji}>🍽️</Text>
          <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 16 }} />
          <Text style={s.emptySubText}>Building your meal plan…</Text>
        </View>
      )}

      {plan && !loading && (
        <ScrollView contentContainerStyle={{ padding: spacing.md, gap: 10 }}>
          {DAY_NAMES.map(day => {
            const key = day.toLowerCase()
            const dayPlan = plan.week[key]
            if (!dayPlan) return null
            const isExpanded = expandedDay === day
            return (
              <TouchableOpacity key={day} style={s.dayCard} onPress={() => setExpandedDay(isExpanded ? null : day)} activeOpacity={0.8}>
                <View style={s.dayHeader}>
                  <Text style={s.dayName}>{day}</Text>
                  <View style={s.dayNutrients}>
                    <Text style={s.nutrientText}>{Math.round(dayPlan.nutrients.calories)} cal</Text>
                    <Text style={s.nutrientDot}>·</Text>
                    <Text style={s.nutrientText}>{Math.round(dayPlan.nutrients.protein)}g protein</Text>
                  </View>
                  <Ionicons name={isExpanded ? "chevron-up" : "chevron-down"} size={16} color={colors.mutedForeground} />
                </View>
                {isExpanded && (
                  <View style={s.mealsContainer}>
                    {dayPlan.meals.map((meal, i) => (
                      <TouchableOpacity key={meal.id} style={s.mealRow} onPress={() => navigation.navigate("RecipeDetail", { id: meal.id, title: meal.title })}>
                        <View style={s.mealType}>
                          <Text style={s.mealTypeText}>{["Breakfast", "Lunch", "Dinner"][i] ?? "Meal"}</Text>
                        </View>
                        <View style={s.mealInfo}>
                          <Text style={s.mealTitle} numberOfLines={2}>{meal.title}</Text>
                          <Text style={s.mealMeta}>{meal.readyInMinutes} min · {meal.servings} servings</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={16} color={colors.muted} />
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </TouchableOpacity>
            )
          })}
        </ScrollView>
      )}

      {/* Settings modal */}
      <Modal visible={settingsOpen} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={s.modalContainer} edges={["top"]}>
          <View style={s.modalHeader}>
            <Text style={s.modalTitle}>Plan Settings</Text>
            <TouchableOpacity onPress={() => setSettingsOpen(false)}><Ionicons name="close" size={24} color={colors.text} /></TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={{ padding: spacing.md, gap: 24 }}>
            <View>
              <Text style={s.settingLabel}>Daily Calories</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                {CALORIES.map(c => (
                  <TouchableOpacity key={c} style={[s.pill, calories === c && s.pillActive]} onPress={() => setCalories(c)}>
                    <Text style={[s.pillText, calories === c && s.pillTextActive]}>{c} kcal</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
            <View>
              <Text style={s.settingLabel}>Diet</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                {DIETS.map(d => (
                  <TouchableOpacity key={d} style={[s.pill, diet === d && s.pillActive]} onPress={() => setDiet(d)}>
                    <Text style={[s.pillText, diet === d && s.pillTextActive]}>{d === "none" ? "Any" : d.charAt(0).toUpperCase() + d.slice(1)}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </ScrollView>
          <View style={s.modalFooter}>
            <TouchableOpacity style={s.generateBtnLarge} onPress={generatePlan}>
              <Text style={s.generateBtnText}>Generate Plan</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>

      <PaywallModal visible={showPaywall} onClose={() => setShowPaywall(false)} featureName="Meal Planner" />
    </SafeAreaView>
  )
}

const makeStyles = (colors: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  topBar: { flexDirection: "row", alignItems: "center", gap: 12, padding: spacing.md, borderBottomWidth: 1.5, borderBottomColor: "rgba(255,255,255,0.4)" },
  title: { fontSize: 20, fontWeight: "800", color: colors.text },
  topActions: { flexDirection: "row", alignItems: "center", gap: 10 },
  iconBtn: { padding: 6 },
  generateBtn: { backgroundColor: colors.primary, paddingHorizontal: 16, paddingVertical: 8, borderRadius: radius.md },
  generateBtnText: { color: "#fff", fontWeight: "700", fontSize: 14 },
  generateBtnLarge: { flex: 1, backgroundColor: colors.primary, paddingVertical: 14, borderRadius: radius.md, alignItems: "center" },
  btnDisabled: { opacity: 0.5 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, padding: spacing.xl },
  emptyEmoji: { fontSize: 48 },
  emptyText: { fontSize: 18, fontWeight: "700", color: colors.text },
  emptySubText: { fontSize: 14, color: colors.mutedForeground },
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
  modalContainer: { flex: 1, backgroundColor: colors.background },
  modalHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border },
  modalTitle: { fontSize: 18, fontWeight: "700", color: colors.text },
  modalFooter: { flexDirection: "row", padding: spacing.md, borderTopWidth: 1, borderTopColor: colors.border },
  settingLabel: { fontSize: 13, fontWeight: "600", color: colors.mutedForeground, marginBottom: 10, textTransform: "uppercase", letterSpacing: 0.5 },
  pill: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 99, borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.card },
  pillActive: { borderColor: colors.primary, backgroundColor: colors.primary + "22" },
  pillText: { fontSize: 14, color: colors.mutedForeground },
  pillTextActive: { color: colors.primary, fontWeight: "600" },
})
