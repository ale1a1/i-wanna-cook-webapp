import "react-native-gesture-handler"
import React, { Component, useEffect, useState } from "react"
import { View, TouchableOpacity, Modal, Text, StyleSheet, Platform } from "react-native"
import AsyncStorage from "@react-native-async-storage/async-storage"
import { NavigationContainer, createNavigationContainerRef } from "@react-navigation/native"
import { createNativeStackNavigator } from "@react-navigation/native-stack"
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs"
import { StatusBar } from "expo-status-bar"
import { Ionicons } from "@expo/vector-icons"
import { SafeAreaProvider } from "react-native-safe-area-context"
import { AuthProvider, useAuth } from "./src/context/AuthContext"
import { ThemeProvider, useTheme } from "./src/context/ThemeContext"
import { GlobalErrorProvider } from "./src/context/GlobalErrorContext"
import { SubscriptionProvider } from "./src/context/SubscriptionContext"
import { ActiveRecipeSessionProvider, useActiveRecipeSession } from "./src/context/ActiveRecipeSessionContext"
import { MyRecipesProvider } from "./src/context/MyRecipesContext"
import { CustomAlertProvider } from "./src/components/CustomAlert"
import ErrorCard from "./src/components/ErrorCard"
import SlidingTabBar, { TabItem } from "./src/components/SlidingTabBar"
import HomeScreen from "./src/screens/HomeScreen"
import SearchScreen from "./src/screens/SearchScreen"
import ScanScreen from "./src/screens/ScanScreen"
import RecipeDetailScreen from "./src/screens/RecipeDetailScreen"
import ShoppingListScreen from "./src/screens/ShoppingListScreen"
import MyRecipesScreen from "./src/screens/MyRecipesScreen"
import MyRecipesFoldersScreen from "./src/screens/MyRecipesFoldersScreen"
import MyRecipesRecipesScreen from "./src/screens/MyRecipesRecipesScreen"
import ProfileScreen from "./src/screens/ProfileScreen"
import LoginScreen from "./src/screens/LoginScreen"
import CookingModeScreen from "./src/screens/CookingModeScreen"
import MealPlanScreen from "./src/screens/MealPlanScreen"
import QuickShoppingListScreen from "./src/screens/QuickShoppingListScreen"
import ReadyToCookScreen from "./src/screens/ReadyToCookScreen"
import LegalScreen from "./src/screens/LegalScreen"
import AgeGateModal from "./src/components/AgeGateModal"
import DisclaimerModal from "./src/components/DisclaimerModal"

const navigationRef = createNavigationContainerRef<any>()

class ErrorBoundary extends Component<{ children: React.ReactNode }, { error: string | null }> {
  state = { error: null }
  static getDerivedStateFromError(e: Error) { return { error: e.message || String(e) } }
  render() {
    if (this.state.error) {
      return (
        <View style={{ flex: 1, backgroundColor: "#0f1117" }}>
          <ErrorCard
            error={this.state.error}
            screen="App crash"
            onRetry={() => this.setState({ error: null })}
          />
        </View>
      )
    }
    return this.props.children
  }
}

const Stack = createNativeStackNavigator()
const Tab = createBottomTabNavigator()

const TAB_SCREENS = new Set(["Home", "Search", "Scan", "Shopping", "QuickShopping", "Cooking", "MyRecipes", "MealPlan", "Profile"])
const HIDE_TABBAR_SCREENS = new Set(["RecipeDetail", "CookingMode", "Login", "QuickShoppingList", "ReadyToCook", "Legal"])

function HomeTabs() {
  const { session } = useActiveRecipeSession()
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: { display: "none" },
      }}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Search" component={SearchScreen} />
      <Tab.Screen name="Scan" component={ScanScreen} />
      <Tab.Screen name="Shopping" component={ShoppingListScreen} />
      <Tab.Screen name="QuickShopping" component={QuickShoppingListScreen} />
      <Tab.Screen
        name="Cooking"
        component={RecipeDetailScreen}
        initialParams={session ? { id: session.recipeId, title: session.recipeTitle, fromSession: true } : undefined}
      />
      <Tab.Screen name="MyRecipes" component={MyRecipesScreen} />
      <Tab.Screen name="MealPlan" component={MealPlanScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  )
}

function TabBarOverlay({ stackRoute, currentRoute, onNavigate }: { stackRoute: string; currentRoute: string; onNavigate: (name: string) => void }) {
  const { user } = useAuth()
  const { quickListCount, session } = useActiveRecipeSession()

  const profileTab: TabItem = {
    name: "Profile",
    label: user ? "Profile" : "Sign in",
    icon: user ? "person-outline" : "log-in-outline",
  }

  let page1: TabItem[]
  let page2: TabItem[]

  if (session) {
    page1 = [
      { name: "Home", label: "Home", icon: "home-outline" },
      { name: "Search", label: "Search", icon: "search-outline" },
      { name: "Cooking", label: "Cooking", icon: "restaurant" },
      { name: "QuickShopping", label: "Quick List", icon: "flash", badge: quickListCount > 0 ? quickListCount : undefined },
    ]
    page2 = [
      { name: "MyRecipes", label: "My Recipes", icon: "bookmark-outline" },
      { name: "MealPlan", label: "Meal Plans", icon: "calendar-outline" },
      profileTab,
      { name: "Shopping", label: "Shopping", icon: "cart-outline" },
    ]
  } else {
    page1 = [
      { name: "Home", label: "Home", icon: "home-outline" },
      { name: "Search", label: "Search", icon: "search-outline" },
      { name: "Scan", label: "Scan", icon: "camera-outline" },
      { name: "Shopping", label: "Shopping", icon: "cart-outline" },
    ]
    page2 = [
      { name: "Home", label: "Home", icon: "home-outline" },
      { name: "MyRecipes", label: "My Recipes", icon: "bookmark-outline" },
      { name: "MealPlan", label: "Meal Plans", icon: "calendar-outline" },
      profileTab,
    ]
  }

  if (HIDE_TABBAR_SCREENS.has(stackRoute)) return null

  return (
    <SlidingTabBar
      page1={page1}
      page2={page2}
      activeRoute={currentRoute}
      onNavigate={onNavigate}
    />
  )
}

function AppNavigator() {
  const { colors } = useTheme()
  const [currentRoute, setCurrentRoute] = React.useState("Home")
  const [stackRoute, setStackRoute] = React.useState("Tabs")

  const handleNavigate = (name: string) => {
    setCurrentRoute(name)
    if (!navigationRef.isReady()) return
    if (TAB_SCREENS.has(name)) {
      navigationRef.navigate("Tabs", { screen: name })
    } else {
      navigationRef.navigate(name)
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <Stack.Navigator
        screenOptions={{
          headerStyle: { backgroundColor: colors.card },
          headerShadowVisible: false,
          headerTintColor: colors.text,
          headerTitleStyle: { fontWeight: "700", fontSize: 17 },
          headerBottom: () => <View style={{ height: 1, backgroundColor: "rgba(255,255,255,0.4)", width: "100%" }} />,
          contentStyle: { backgroundColor: colors.background },
          animation: "slide_from_right",
          animationDuration: 250,
          detachPreviousScreen: false,
        }}
        screenListeners={{ state: (e: any) => {
          const routes = e.data?.state?.routes
          if (!routes?.length) return
          const topRoute = routes[routes.length - 1]
          setStackRoute(topRoute.name)
          if (topRoute.name === "Tabs") {
            const tabState = topRoute.state
            if (tabState) {
              const activeTab = tabState.routes?.[tabState.index ?? 0]?.name
              if (activeTab) setCurrentRoute(activeTab)
            } else {
              setCurrentRoute("Home")
            }
          }
        }}}
      >
        <Stack.Screen name="Tabs" component={HomeTabs} options={{ headerShown: false }} />
        <Stack.Screen name="MyRecipesFolders" component={MyRecipesFoldersScreen} options={{ headerShown: false }} />
        <Stack.Screen name="MyRecipesRecipes" component={MyRecipesRecipesScreen} options={{ headerShown: false }} />
        <Stack.Screen name="RecipeDetail" component={RecipeDetailScreen} options={({ route }: any) => ({ title: route.params?.title ?? "Recipe", headerBackTitle: "Back" })} />
        <Stack.Screen name="CookingMode" component={CookingModeScreen} options={{ headerShown: false, presentation: "fullScreenModal" }} />
        <Stack.Screen name="Login" component={LoginScreen} options={({ navigation }: any) => ({ title: "Sign in", gestureEnabled: true, headerTitleAlign: "center", headerTitleStyle: { fontWeight: "700", fontSize: 20 }, headerLeft: () => ( <TouchableOpacity onPress={() => navigation.navigate("Tabs", { screen: "Home" })} style={{ paddingHorizontal: 8 }}><Ionicons name="arrow-back" size={24} color="#fff" /></TouchableOpacity> ) })} />
        <Stack.Screen name="QuickShoppingList" component={QuickShoppingListScreen} options={{ headerShown: false }} />
        <Stack.Screen name="ReadyToCook" component={ReadyToCookScreen} options={{ headerShown: false, presentation: "modal" }} />
        <Stack.Screen name="Legal" component={LegalScreen} options={{ headerShown: false }} />
      </Stack.Navigator>

      <TabBarOverlay stackRoute={stackRoute} currentRoute={currentRoute} onNavigate={handleNavigate} />
    </View>
  )
}

function TrialExpiryModal() {
  const { user, trialActive, daysLeftInTrial } = useAuth()
  const { colors } = useTheme()
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (!user || !trialActive || daysLeftInTrial > 2) return
    const key = `trial_modal_shown_${user.id}`
    AsyncStorage.getItem(key).then((shown) => {
      if (!shown) {
        setVisible(true)
        AsyncStorage.setItem(key, "1")
      }
    })
  }, [user, trialActive, daysLeftInTrial])

  if (!visible) return null

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={() => setVisible(false)}>
      <TouchableOpacity style={tm.backdrop} activeOpacity={1} onPress={() => setVisible(false)}>
        <View style={[tm.card, { backgroundColor: colors.card, borderColor: colors.primary }]}>
          <Text style={[tm.title, { color: colors.primary }]}>⏳ Trial ending soon</Text>
          <Text style={[tm.body, { color: colors.text }]}>
            Your free trial {daysLeftInTrial === 0 ? "expires today" : `expires in ${daysLeftInTrial} day${daysLeftInTrial === 1 ? "" : "s"}`}. Upgrade to keep unlimited searches, scans, and all premium features.
          </Text>
          <Text style={[tm.price, { color: colors.mutedForeground }]}>$2.49/month or $19.99/year</Text>
          <TouchableOpacity style={[tm.btn, { backgroundColor: colors.primary }]} onPress={() => setVisible(false)}>
            <Text style={tm.btnText}>Got it</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  )
}

function TrialExpiredModal() {
  const { user, trialActive } = useAuth()
  const { colors } = useTheme()
  const [visible, setVisible] = useState(false)
  const prevTrialActive = React.useRef<boolean | null>(null)

  useEffect(() => {
    if (!user?.trialExpiresAt) return
    if (prevTrialActive.current === true && trialActive === false) {
      const key = `trial_expired_shown_${user.id}`
      AsyncStorage.getItem(key).then((shown) => {
        if (!shown) {
          setVisible(true)
          AsyncStorage.setItem(key, "1")
        }
      })
    }
    prevTrialActive.current = trialActive
  }, [trialActive, user])

  if (!visible) return null

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={() => setVisible(false)}>
      <View style={tm.backdrop}>
        <View style={[tm.card, { backgroundColor: colors.card, borderColor: "#ef4444" }]}>
          <Text style={[tm.title, { color: "#ef4444" }]}>Trial Expired</Text>
          <Text style={[tm.body, { color: colors.text }]}>
            Your 14-day free trial has ended. You're now on the free plan — 10 searches and 3 scans per week.{"\n\n"}Upgrade to Premium to restore unlimited access and all features.
          </Text>
          <Text style={[tm.price, { color: colors.mutedForeground }]}>$2.49/month or $19.99/year</Text>
          <TouchableOpacity style={[tm.btn, { backgroundColor: "#ef4444" }]} onPress={() => setVisible(false)}>
            <Text style={tm.btnText}>Got it</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  )
}

const tm = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "center", alignItems: "center", padding: 24 },
  card: { width: "100%", borderRadius: 16, borderWidth: 1.5, padding: 24, gap: 12 },
  title: { fontSize: 18, fontWeight: "800" },
  body: { fontSize: 14, lineHeight: 22 },
  price: { fontSize: 13 },
  btn: { paddingVertical: 13, borderRadius: 10, alignItems: "center", marginTop: 4 },
  btnText: { color: "#fff", fontWeight: "700", fontSize: 15 },
})

function GuestThemeToggle({ hidden }: { hidden: boolean }) {
  const { user } = useAuth()
  const { theme, colors, setTheme } = useTheme()
  if (user || hidden) return null
  const isDark = theme === "dark" || (theme === "system" && true)
  return (
    <TouchableOpacity
      onPress={() => setTheme(isDark ? "light" : "dark")}
      style={{
        position: "absolute", top: Platform.OS === "android" ? 12 : 20, right: 16,
        zIndex: 999, width: 44, height: 44, borderRadius: 22,
        backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border,
        alignItems: "center", justifyContent: "center",
      }}
      activeOpacity={0.8}
      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
    >
      <Ionicons name={isDark ? "sunny-outline" : "moon-outline"} size={20} color={colors.text} />
    </TouchableOpacity>
  )
}

function AppContent() {
  const { theme, colors } = useTheme()
  const [ageAccepted, setAgeAccepted] = React.useState(false)
  const [modalsVisible, setModalsVisible] = React.useState(true)
  const navTheme = React.useMemo(() => ({
    dark: theme === "dark",
    colors: {
      primary: colors.primary,
      background: colors.background,
      card: colors.card,
      text: colors.text,
      border: colors.border,
      notification: colors.primary,
    },
    fonts: {
      regular: { fontFamily: "System", fontWeight: "400" as const },
      medium: { fontFamily: "System", fontWeight: "500" as const },
      bold: { fontFamily: "System", fontWeight: "700" as const },
      heavy: { fontFamily: "System", fontWeight: "900" as const },
    },
  }), [theme, colors])
  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <NavigationContainer ref={navigationRef} theme={navTheme}>
        <StatusBar style={theme === "light" ? "dark" : "light"} translucent={false} backgroundColor={colors.background} />
        <AppNavigator />
        <GuestThemeToggle hidden={modalsVisible} />
        <AgeGateModal onAccepted={() => setAgeAccepted(true)} />
        <DisclaimerModal ageAccepted={ageAccepted} onDone={() => setModalsVisible(false)} />
        <TrialExpiryModal />
        <TrialExpiredModal />
      </NavigationContainer>
    </View>
  )
}

export default function App() {
  return (
    <ErrorBoundary>
      <SafeAreaProvider>
        <ThemeProvider>
          <AuthProvider>
            <SubscriptionProvider>
              <ActiveRecipeSessionProvider>
                <GlobalErrorProvider>
                  <MyRecipesProvider>
                    <CustomAlertProvider>
                      <AppContent />
                    </CustomAlertProvider>
                  </MyRecipesProvider>
                </GlobalErrorProvider>
              </ActiveRecipeSessionProvider>
            </SubscriptionProvider>
          </AuthProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </ErrorBoundary>
  )
}
