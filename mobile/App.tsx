import "react-native-gesture-handler"
import React, { Component } from "react"
import { View, Animated, Pressable, TouchableOpacity, Text } from "react-native"
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
import ExpandableMenu from "./src/components/ExpandableMenu"
import HomeScreen from "./src/screens/HomeScreen"
import SearchScreen from "./src/screens/SearchScreen"
import ScanScreen from "./src/screens/ScanScreen"
import RecipeDetailScreen from "./src/screens/RecipeDetailScreen"
import ShoppingListScreen from "./src/screens/ShoppingListScreen"
import FavouritesScreen from "./src/screens/FavouritesScreen"
import TriedRecipesScreen from "./src/screens/TriedRecipesScreen"
import ProfileScreen from "./src/screens/ProfileScreen"
import LoginScreen from "./src/screens/LoginScreen"
import CookingModeScreen from "./src/screens/CookingModeScreen"
import MealPlanScreen from "./src/screens/MealPlanScreen"
import QuickShoppingListScreen from "./src/screens/QuickShoppingListScreen"

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

const OVERFLOW_ITEMS = [
  { name: "Favourites", icon: "heart-outline" as const, label: "Favourites" },
  { name: "Tried", icon: "clipboard-outline" as const, label: "Tried" },
  { name: "MealPlan", icon: "calendar-outline" as const, label: "Meal Plan" },
  { name: "Profile", icon: "person-outline" as const, label: "Profile" },
]


function TabIcon({ name, color }: { name: keyof typeof Ionicons.glyphMap, color: string, active: boolean }) {
  return <Ionicons name={name} size={26} color={color} />
}

const OVERFLOW_ROW_HEIGHT = 72

function HomeTabs() {
  const { user } = useAuth()
  const { colors } = useTheme()
  const insets = useSafeAreaInsets()
  const navigation = useNavigation<any>()
  const { quickListCount } = useActiveRecipeSession()
  const [overflowOpen, setOverflowOpen] = React.useState(false)
  const animHeight = React.useRef(new Animated.Value(0)).current
  const [currentRoute, setCurrentRoute] = React.useState("")

  const overflowItems = OVERFLOW_ITEMS.map(item =>
    item.name === "Profile"
      ? { ...item, icon: (user ? "person-outline" : "log-in-outline") as const, label: user ? "Profile" : "Sign in" }
      : item
  )

  const closeOverflow = React.useCallback(() => {
    Animated.timing(animHeight, { toValue: 0, duration: 220, useNativeDriver: false }).start(() => setOverflowOpen(false))
  }, [animHeight])

  const toggleOverflow = () => {
    if (overflowOpen) {
      closeOverflow()
    } else {
      setOverflowOpen(true)
      Animated.timing(animHeight, { toValue: OVERFLOW_ROW_HEIGHT, duration: 220, useNativeDriver: false }).start()
    }
  }

  React.useEffect(() => {
    const unsubscribe = navigation.addListener("focus", () => {
      closeOverflow()
      setCurrentRoute("")
    })
    return unsubscribe
  }, [navigation, closeOverflow])

  const tabBarHeight = 72 + insets.bottom

  return (
    <View style={{ flex: 1 }}>
      <Tab.Navigator
        screenOptions={{
          headerShown: false,
          tabBarStyle: { backgroundColor: colors.card, borderTopColor: "rgba(255,255,255,0.4)", borderTopWidth: 1.5, height: tabBarHeight, paddingBottom: insets.bottom + 10, paddingTop: 10 },
          tabBarItemStyle: { flex: 1 },
          tabBarActiveTintColor: colors.primary,
          tabBarInactiveTintColor: colors.muted,
          tabBarLabelStyle: { fontSize: 10, fontWeight: "500", marginTop: -2 },
        }}
        screenListeners={{ state: (e: any) => { setCurrentRoute(e.data.state.routes[e.data.state.index]?.name ?? ""); if (overflowOpen) closeOverflow() } }}
      >
        <Tab.Screen name="Home" component={HomeScreen} options={{
          tabBarIcon: ({ color, focused }) => <TabIcon name="home-outline" color={color} active={focused} />,
        }} />
        <Tab.Screen name="Search" component={SearchScreen} options={{
          tabBarIcon: ({ color, focused }) => <TabIcon name="search-outline" color={color} active={focused} />,
        }} />
        <Tab.Screen name="Scan" component={ScanScreen} options={{
          tabBarIcon: ({ color, focused }) => <TabIcon name="camera-outline" color={color} active={focused} />,
        }} />
        {quickListCount > 0 ? (
          <Tab.Screen name="QuickShopping" component={QuickShoppingListScreen} options={{
            tabBarLabel: "Quick List",
            tabBarIcon: ({ color, focused }) => (
              <View>
                <TabIcon name="flash" color={color} active={focused} />
                <View style={{ position: "absolute", top: -4, right: -8, backgroundColor: colors.primary, borderRadius: 8, minWidth: 16, height: 16, alignItems: "center", justifyContent: "center", paddingHorizontal: 3 }}>
                  <Text style={{ color: "#fff", fontSize: 10, fontWeight: "700" }}>{quickListCount}</Text>
                </View>
              </View>
            ),
          }} />
        ) : (
          <Tab.Screen name="Shopping" component={ShoppingListScreen} options={{
            tabBarIcon: ({ color, focused }) => <TabIcon name="cart-outline" color={color} active={focused} />,
          }} />
        )}
        <Tab.Screen
          name="More"
          component={HomeScreen}
          options={{
            tabBarLabel: "",
            tabBarButton: () => (
              <ExpandableMenu
                isOpen={overflowOpen}
                onToggle={toggleOverflow}
              />
            ),
          }}
        />
      </Tab.Navigator>

      {overflowOpen && (
        <Pressable
          style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: tabBarHeight }}
          onPress={toggleOverflow}
        />
      )}

      <Animated.View style={{
        position: "absolute",
        bottom: tabBarHeight,
        left: 0,
        right: 0,
        height: animHeight,
        backgroundColor: colors.card,
        borderTopColor: "rgba(255,255,255,0.4)",
        borderTopWidth: overflowOpen ? 1.5 : 0,
        overflow: "hidden",
      }}>
        <View style={{ flexDirection: "row", justifyContent: "space-evenly", alignItems: "center", height: OVERFLOW_ROW_HEIGHT, paddingHorizontal: 8 }}>
          {overflowItems.map((item) => {
            const isActive = currentRoute === item.name
            return (
              <TouchableOpacity
                key={item.name}
                style={{ alignItems: "center", flex: 1 }}
                onPress={() => {
                  closeOverflow()
                  navigation.navigate(item.name)
                }}
                activeOpacity={0.7}
              >
                <Ionicons name={item.icon} size={26} color={isActive ? colors.primary : colors.muted} />
                <Text style={{ fontSize: 10, fontWeight: "500", marginTop: -2, color: isActive ? colors.primary : colors.muted }}>{item.label}</Text>
              </TouchableOpacity>
            )
          })}
        </View>
      </Animated.View>
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
      <Stack.Screen name="Login" component={LoginScreen} options={{ title: "Sign in", presentation: "modal" }} />
      <Stack.Screen name="Favourites" component={FavouritesScreen} options={{ headerShown: false }} />
      <Stack.Screen name="Tried" component={TriedRecipesScreen} options={{ headerShown: false }} />
      <Stack.Screen name="MealPlan" component={MealPlanScreen} options={{ headerShown: false }} />
      <Stack.Screen name="Profile" component={ProfileScreen} options={{ headerShown: false }} />
      <Stack.Screen name="QuickShoppingList" component={QuickShoppingListScreen} options={{ headerShown: false }} />
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
