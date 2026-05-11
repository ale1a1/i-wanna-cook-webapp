import "react-native-gesture-handler"
import React from "react"
import { NavigationContainer } from "@react-navigation/native"
import { createNativeStackNavigator } from "@react-navigation/native-stack"
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs"
import { StatusBar } from "expo-status-bar"
import { Ionicons } from "@expo/vector-icons"
import { SafeAreaProvider } from "react-native-safe-area-context"

import { AuthProvider, useAuth } from "./src/context/AuthContext"
import HomeScreen from "./src/screens/HomeScreen"
import SearchScreen from "./src/screens/SearchScreen"
import RecipeDetailScreen from "./src/screens/RecipeDetailScreen"
import ShoppingListScreen from "./src/screens/ShoppingListScreen"
import FavouritesScreen from "./src/screens/FavouritesScreen"
import TriedRecipesScreen from "./src/screens/TriedRecipesScreen"
import ProfileScreen from "./src/screens/ProfileScreen"
import LoginScreen from "./src/screens/LoginScreen"
import { colors } from "./src/lib/theme"

const Stack = createNativeStackNavigator()
const Tab = createBottomTabNavigator()

function HomeTabs() {
  const { user } = useAuth()
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

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <NavigationContainer>
          <StatusBar style="light" />
          <AppNavigator />
        </NavigationContainer>
      </AuthProvider>
    </SafeAreaProvider>
  )
}
