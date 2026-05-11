import "react-native-gesture-handler"
import React, { Component } from "react"
import { View } from "react-native"
import { NavigationContainer } from "@react-navigation/native"
import { createNativeStackNavigator } from "@react-navigation/native-stack"
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs"
import { StatusBar } from "expo-status-bar"
import { Ionicons } from "@expo/vector-icons"
import { SafeAreaProvider } from "react-native-safe-area-context"

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

import { AuthProvider, useAuth } from "./src/context/AuthContext"
import { ThemeProvider, useTheme } from "./src/context/ThemeContext"
import ErrorCard from "./src/components/ErrorCard"
import HomeScreen from "./src/screens/HomeScreen"
import SearchScreen from "./src/screens/SearchScreen"
import RecipeDetailScreen from "./src/screens/RecipeDetailScreen"
import ShoppingListScreen from "./src/screens/ShoppingListScreen"
import FavouritesScreen from "./src/screens/FavouritesScreen"
import TriedRecipesScreen from "./src/screens/TriedRecipesScreen"
import ProfileScreen from "./src/screens/ProfileScreen"
import LoginScreen from "./src/screens/LoginScreen"

const Stack = createNativeStackNavigator()
const Tab = createBottomTabNavigator()

function HomeTabs() {
  const { user } = useAuth()
  const { colors, theme } = useTheme()
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: { backgroundColor: colors.card, borderTopColor: colors.muted, borderTopWidth: 1, height: 70 },
        tabBarItemStyle: { marginTop: 0, paddingBottom: 16 },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.muted,
      }}
    >
      <Tab.Screen name="Home" component={HomeScreen} options={{
        tabBarIcon: ({ color, size }) => <Ionicons name="home-outline" size={size} color={color} />,
      }} />
      <Tab.Screen name="Search" component={SearchScreen} options={{
        tabBarIcon: ({ color, size }) => <Ionicons name="search-outline" size={size} color={color} />,
      }} />
      <Tab.Screen name="Favourites" component={FavouritesScreen} options={{
        tabBarIcon: ({ color, size }) => <Ionicons name="heart-outline" size={size} color={color} />,
      }} />
      <Tab.Screen name="Tried" component={TriedRecipesScreen} options={{
        tabBarLabel: "Tried",
        tabBarIcon: ({ color, size }) => <Ionicons name="clipboard-outline" size={size} color={color} />,
      }} />
      <Tab.Screen name="Shopping" component={ShoppingListScreen} options={{
        tabBarLabel: "Shopping",
        tabBarIcon: ({ color, size }) => <Ionicons name="cart-outline" size={size} color={color} />,
      }} />
      <Tab.Screen name="Profile" component={user ? ProfileScreen : LoginScreen} options={{
        tabBarIcon: ({ color, size }) => <Ionicons name={user ? "person-outline" : "log-in-outline"} size={size} color={color} />,
        tabBarLabel: user ? "Profile" : "Sign in",
      }} />
    </Tab.Navigator>
  )
}

function AppNavigator() {
  const { colors, theme } = useTheme()
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.card },
        headerTintColor: colors.text,
        headerTitleStyle: { fontWeight: "700" },
      }}
    >
      <Stack.Screen name="Tabs" component={HomeTabs} options={{ headerShown: false }} />
      <Stack.Screen name="RecipeDetail" component={RecipeDetailScreen} options={({ route }: any) => ({ title: route.params?.title ?? "Recipe", headerBackTitle: "Back" })} />
      <Stack.Screen name="Login" component={LoginScreen} options={{ title: "Sign in", presentation: "modal" }} />
    </Stack.Navigator>
  )
}

function AppContent() {
  const { theme } = useTheme()
  return (
    <NavigationContainer>
      <StatusBar style={theme === "light" ? "dark" : "light"} />
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
            <AppContent />
          </AuthProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </ErrorBoundary>
  )
}
