import "react-native-gesture-handler"
import React, { Component } from "react"
import { View, Text, TouchableOpacity, StyleSheet, Alert } from "react-native"
import { NavigationContainer } from "@react-navigation/native"
import { createNativeStackNavigator } from "@react-navigation/native-stack"
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs"
import { StatusBar } from "expo-status-bar"
import { Ionicons } from "@expo/vector-icons"
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context"

class ErrorBoundary extends Component<{ children: React.ReactNode }, { error: string | null }> {
  state = { error: null }
  static getDerivedStateFromError(e: Error) { return { error: e.message || String(e) } }
  async report() {
    const result = await reportError(this.state.error ?? "Unknown crash", "App crash")
    if (result === "sent") Alert.alert("Reported", "The developer has been notified.")
    else if (result === "cooldown") Alert.alert("Already reported", "You've already sent a report recently.")
    else Alert.alert("Failed", "Could not send report.")
  }
  render() {
    if (this.state.error) {
      return (
        <SafeAreaView style={eb.container}>
          <Ionicons name="alert-circle-outline" size={56} color="#ef4444" />
          <Text style={eb.title}>Something went wrong</Text>
          <Text style={eb.msg}>{this.state.error}</Text>
          <TouchableOpacity style={eb.retryBtn} onPress={() => this.setState({ error: null })}>
            <Text style={eb.retryText}>Try Again</Text>
          </TouchableOpacity>
          <TouchableOpacity style={eb.reportBtn} onPress={() => this.report()}>
            <Ionicons name="mail-outline" size={16} color="#64748b" style={{ marginRight: 6 }} />
            <Text style={eb.reportText}>Report to developer</Text>
          </TouchableOpacity>
        </SafeAreaView>
      )
    }
    return this.props.children
  }
}

const eb = StyleSheet.create({
  container: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, padding: 32, backgroundColor: "#0f1117" },
  title: { fontSize: 20, fontWeight: "700", color: "#f1f5f9" },
  msg: { fontSize: 13, color: "#94a3b8", textAlign: "center" },
  retryBtn: { backgroundColor: "#f97316", paddingHorizontal: 24, paddingVertical: 12, borderRadius: 8, marginTop: 4 },
  retryText: { color: "#fff", fontWeight: "700" },
  reportBtn: { flexDirection: "row", alignItems: "center", marginTop: 4 },
  reportText: { fontSize: 13, color: "#64748b", textDecorationLine: "underline" },
})

import { AuthProvider, useAuth } from "./src/context/AuthContext"
import { ThemeProvider, useTheme } from "./src/context/ThemeContext"
import { reportError } from "./src/lib/reportError"
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
