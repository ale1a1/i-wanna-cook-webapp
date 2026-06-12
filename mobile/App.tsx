import "react-native-gesture-handler"
import React, { Component } from "react"
import { View, TouchableOpacity, Text } from "react-native"
import { NavigationContainer, useNavigation } from "@react-navigation/native"
import { createNativeStackNavigator } from "@react-navigation/native-stack"
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs"
import { StatusBar } from "expo-status-bar"
import { Ionicons } from "@expo/vector-icons"
import { SafeAreaProvider, useSafeAreaInsets } from "react-native-safe-area-context"

import { AuthProvider, useAuth } from "./src/context/AuthContext"
import { ThemeProvider, useTheme } from "./src/context/ThemeContext"
import { GlobalErrorProvider } from "./src/context/GlobalErrorContext"
import { SubscriptionProvider } from "./src/context/SubscriptionContext"
import { ActiveRecipeSessionProvider, useActiveRecipeSession } from "./src/context/ActiveRecipeSessionContext"
import ErrorCard from "./src/components/ErrorCard"
import SlidingTabBar, { TabItem } from "./src/components/SlidingTabBar"
import HomeScreen from "./src/screens/HomeScreen"
import SearchScreen from "./src/screens/SearchScreen"
import ScanScreen from "./src/screens/ScanScreen"
import RecipeDetailScreen from "./src/screens/RecipeDetailScreen"
import ShoppingListScreen from "./src/screens/ShoppingListScreen"
import MyRecipesScreen from "./src/screens/MyRecipesScreen"
import ProfileScreen from "./src/screens/ProfileScreen"
import LoginScreen from "./src/screens/LoginScreen"
import CookingModeScreen from "./src/screens/CookingModeScreen"
import MealPlanScreen from "./src/screens/MealPlanScreen"
import QuickShoppingListScreen from "./src/screens/QuickShoppingListScreen"
import ReadyToCookScreen from "./src/screens/ReadyToCookScreen"

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

function HomeTabs() {
  const { user } = useAuth()
  const { colors } = useTheme()
  const insets = useSafeAreaInsets()
  const navigation = useNavigation<any>()
  const { quickListCount, session } = useActiveRecipeSession()
  const [currentRoute, setCurrentRoute] = React.useState("Home")

  const tabBarHeight = 72 + insets.bottom

  const profileTab: TabItem = {
    name: "Profile",
    label: user ? "Profile" : "Sign in",
    icon: user ? "person-outline" : "log-in-outline",
  }

  // Build the two pages based on whether there is an active session
  let page1: TabItem[]
  let page2: TabItem[]

  if (session) {
    // Active session — full carousel, Home rotates too
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
    // No active session — Home pinned on page 1
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

  const handleNavigate = (name: string) => {
    setCurrentRoute(name)
    navigation.navigate(name)
  }

  return (
    <View style={{ flex: 1 }}>
      <Tab.Navigator
        screenOptions={{
          headerShown: false,
          tabBarStyle: { display: "none" },
        }}
        screenListeners={{ state: (e: any) => setCurrentRoute(e.data.state.routes[e.data.state.index]?.name ?? "") }}
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
      </Tab.Navigator>

      <SlidingTabBar
        page1={page1}
        page2={page2}
        activeRoute={currentRoute}
        onNavigate={handleNavigate}
      />
    </View>
  )
}

function AppNavigator() {
  const { colors } = useTheme()
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.card },
        headerShadowVisible: false,
        headerTintColor: colors.text,
        headerTitleStyle: { fontWeight: "700" },
        headerBottom: () => <View style={{ height: 1, backgroundColor: "rgba(255,255,255,0.4)", width: "100%" }} />,
      }}
    >
      <Stack.Screen name="Tabs" component={HomeTabs} options={{ headerShown: false }} />
      <Stack.Screen name="RecipeDetail" component={RecipeDetailScreen} options={({ route }: any) => ({ title: route.params?.title ?? "Recipe", headerBackTitle: "Back" })} />
      <Stack.Screen name="CookingMode" component={CookingModeScreen} options={{ headerShown: false, presentation: "fullScreenModal" }} />
      <Stack.Screen name="Login" component={LoginScreen} options={({ navigation }: any) => ({ title: "Sign in", presentation: "modal", headerLeft: () => ( <TouchableOpacity onPress={() => navigation.navigate("Tabs")} style={{ paddingHorizontal: 8 }}><Ionicons name="arrow-back" size={24} color="#fff" /></TouchableOpacity> ) })} />
      <Stack.Screen name="MyRecipes" component={MyRecipesScreen} options={{ headerShown: false }} />
      <Stack.Screen name="MealPlan" component={MealPlanScreen} options={{ headerShown: false }} />
      <Stack.Screen name="Profile" component={ProfileScreen} options={{ headerShown: false }} />
      <Stack.Screen name="QuickShoppingList" component={QuickShoppingListScreen} options={{ headerShown: false }} />
      <Stack.Screen name="ReadyToCook" component={ReadyToCookScreen} options={{ headerShown: false, presentation: "modal" }} />
    </Stack.Navigator>
  )
}

function AppContent() {
  const { theme, colors } = useTheme()
  return (
    <NavigationContainer>
      <StatusBar style={theme === "light" ? "dark" : "light"} translucent={false} backgroundColor={colors.background} />
      <AppNavigator />
    </NavigationContainer>
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
                  <AppContent />
                </GlobalErrorProvider>
              </ActiveRecipeSessionProvider>
            </SubscriptionProvider>
          </AuthProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </ErrorBoundary>
  )
}
