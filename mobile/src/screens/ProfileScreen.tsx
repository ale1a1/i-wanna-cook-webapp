import React, { useCallback, useState } from "react"
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Image, ActivityIndicator, Alert, TextInput, Modal
} from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { Ionicons } from "@expo/vector-icons"
import { useNavigation, useFocusEffect } from "@react-navigation/native"
import { apiFetch } from "../lib/api"
import { useAuth } from "../context/AuthContext"
import { colors, spacing, radius } from "../lib/theme"

type TriedRecipe = {
  id: string
  recipe_id: string
  recipe_title: string
  recipe_image: string
  tried_at: string
}

const PASSWORD_RULES = [
  { label: "At least 8 characters", test: (p: string) => p.length >= 8 },
  { label: "One uppercase letter", test: (p: string) => /[A-Z]/.test(p) },
  { label: "One lowercase letter", test: (p: string) => /[a-z]/.test(p) },
  { label: "One number", test: (p: string) => /[0-9]/.test(p) },
  { label: "One special character", test: (p: string) => /[^A-Za-z0-9]/.test(p) },
]

export default function ProfileScreen() {
  const { user, logout } = useAuth()
  const navigation = useNavigation<any>()
  const [tried, setTried] = useState<TriedRecipe[]>([])
  const [loading, setLoading] = useState(true)

  const [editingUsername, setEditingUsername] = useState(false)
  const [newUsername, setNewUsername] = useState("")
  const [usernameLoading, setUsernameLoading] = useState(false)
  const [usernameError, setUsernameError] = useState("")

  const [showPasswordModal, setShowPasswordModal] = useState(false)
  const [passwordForm, setPasswordForm] = useState({ current: "", new: "", confirm: "" })
  const [passwordLoading, setPasswordLoading] = useState(false)
  const [passwordError, setPasswordError] = useState("")
  const [passwordSuccess, setPasswordSuccess] = useState(false)
  const [showPasswords, setShowPasswords] = useState({ current: false, new: false, confirm: false })

  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState("")
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [deleteError, setDeleteError] = useState("")

  useFocusEffect(useCallback(() => {
    if (!user) { navigation.navigate("Login"); return }
    setLoading(true)
    apiFetch(`/api/tried-recipes?userId=${user.id}`)
      .then(r => r.json())
      .then(data => { setTried(data.triedRecipes || []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [user]))

  const handleLogout = () => {
    Alert.alert("Sign out", "Are you sure?", [
      { text: "Cancel", style: "cancel" },
      { text: "Sign out", style: "destructive", onPress: async () => { await logout(); navigation.navigate("Home") } }
    ])
  }

  const handleSaveUsername = async () => {
    if (newUsername.length < 3) { setUsernameError("Min. 3 characters"); return }
    setUsernameLoading(true)
    setUsernameError("")
    try {
      const res = await apiFetch("/api/user", {
        method: "PATCH",
        body: JSON.stringify({ userId: user!.id, username: newUsername }),
      })
      const data = await res.json()
      if (!res.ok) { setUsernameError(data.error); return }
      setEditingUsername(false)
    } catch {
      setUsernameError("Update failed")
    } finally {
      setUsernameLoading(false)
    }
  }

  const handleChangePassword = async () => {
    if (passwordForm.new !== passwordForm.confirm) { setPasswordError("Passwords do not match"); return }
    if (!PASSWORD_RULES.every(r => r.test(passwordForm.new))) { setPasswordError("Password doesn't meet requirements"); return }
    setPasswordLoading(true)
    setPasswordError("")
    try {
      const res = await apiFetch("/api/user", {
        method: "PATCH",
        body: JSON.stringify({ userId: user!.id, currentPassword: passwordForm.current, newPassword: passwordForm.new, accessToken: user!.accessToken }),
      })
      const data = await res.json()
      if (!res.ok) { setPasswordError(data.error); return }
      setPasswordSuccess(true)
      setTimeout(() => { setShowPasswordModal(false); setPasswordSuccess(false); setPasswordForm({ current: "", new: "", confirm: "" }) }, 1500)
    } catch {
      setPasswordError("Update failed")
    } finally {
      setPasswordLoading(false)
    }
  }

  const handleDeleteAccount = async () => {
    if (deleteConfirm !== user!.username) return
    setDeleteLoading(true)
    setDeleteError("")
    try {
      const res = await apiFetch("/api/user", {
        method: "DELETE",
        body: JSON.stringify({ userId: user!.id, accessToken: user!.accessToken }),
      })
      const data = await res.json()
      if (!res.ok) { setDeleteError(data.error); return }
      await logout()
      navigation.navigate("Home")
    } catch {
      setDeleteError("Deletion failed")
    } finally {
      setDeleteLoading(false)
    }
  }

  if (!user) return null

  const newPasswordValid = PASSWORD_RULES.every(r => r.test(passwordForm.new))

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>

        {/* Header card */}
        <View style={styles.card}>
          <View style={styles.profileRow}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{user.username.charAt(0).toUpperCase()}</Text>
            </View>
            <View style={{ flex: 1 }}>
              {editingUsername ? (
                <View style={styles.editRow}>
                  <TextInput
                    style={styles.usernameInput}
                    value={newUsername}
                    onChangeText={setNewUsername}
                    autoFocus
                    autoCapitalize="none"
                  />
                  <TouchableOpacity onPress={handleSaveUsername} disabled={usernameLoading}>
                    {usernameLoading ? <ActivityIndicator color={colors.green} /> : <Ionicons name="checkmark" size={22} color={colors.green} />}
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => { setEditingUsername(false); setUsernameError("") }}>
                    <Ionicons name="close" size={22} color={colors.destructive} />
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.editRow}>
                  <Text style={styles.username}>{user.username}</Text>
                  <TouchableOpacity onPress={() => { setNewUsername(user.username); setEditingUsername(true) }}>
                    <Ionicons name="pencil-outline" size={16} color={colors.mutedForeground} />
                  </TouchableOpacity>
                </View>
              )}
              {usernameError ? <Text style={styles.errorText}>{usernameError}</Text> : null}
              <Text style={styles.email}>{user.email}</Text>
            </View>
          </View>
        </View>

        {/* Stats */}
        <View style={styles.card}>
          <Text style={styles.sectionHeader}>Stats</Text>
          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{tried.length}</Text>
              <Text style={styles.statLabel}>Recipes Tried</Text>
            </View>
          </View>
        </View>

        {/* Security */}
        <View style={styles.card}>
          <Text style={styles.sectionHeader}>Security</Text>
          <TouchableOpacity style={styles.row} onPress={() => setShowPasswordModal(true)}>
            <Text style={styles.rowText}>Change Password</Text>
            <Ionicons name="chevron-forward" size={18} color={colors.mutedForeground} />
          </TouchableOpacity>
        </View>

        {/* Tried recipes */}
        <View style={[styles.card, { marginBottom: 0 }]}>
          <Text style={styles.sectionHeader}>Recipes I've Tried</Text>
        </View>

        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : tried.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="restaurant-outline" size={48} color={colors.muted} />
            <Text style={styles.emptyText}>No tried recipes yet</Text>
            <TouchableOpacity style={styles.browseBtn} onPress={() => navigation.navigate("Search")}>
              <Text style={styles.browseBtnText}>Find Recipes</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={{ padding: spacing.md, gap: 10 }}>
            {tried.map(item => (
              <TouchableOpacity key={item.id} style={styles.recipeCard} onPress={() => navigation.navigate("RecipeDetail", { id: item.recipe_id, title: item.recipe_title })}>
                <Image source={{ uri: item.recipe_image }} style={styles.recipeImage} resizeMode="cover" />
                <View style={styles.recipeBody}>
                  <Text style={styles.recipeTitle} numberOfLines={2}>{item.recipe_title}</Text>
                  <Text style={styles.triedDate}>
                    {new Date(item.tried_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                  </Text>
                </View>
                <Ionicons name="checkmark-circle" size={22} color={colors.green} style={{ padding: spacing.sm }} />
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Account actions */}
        <View style={[styles.card, { marginTop: spacing.md }]}>
          <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
            <Ionicons name="log-out-outline" size={18} color={colors.text} />
            <Text style={styles.logoutBtnText}>Logout</Text>
          </TouchableOpacity>
          <View style={{ height: 1, backgroundColor: colors.border, marginVertical: spacing.sm }} />
          <TouchableOpacity style={styles.deleteBtn} onPress={() => setShowDeleteModal(true)}>
            <Ionicons name="trash-outline" size={18} color={colors.destructive} />
            <Text style={styles.deleteBtnText}>Delete Account</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Change Password Modal */}
      <Modal visible={showPasswordModal} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={styles.modalContainer} edges={["top"]}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Change Password</Text>
            <TouchableOpacity onPress={() => { setShowPasswordModal(false); setPasswordError(""); setPasswordForm({ current: "", new: "", confirm: "" }) }}>
              <Ionicons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>
          <ScrollView style={{ padding: spacing.md }} keyboardShouldPersistTaps="handled">
            {(["current", "new", "confirm"] as const).map(field => (
              <View key={field} style={{ marginBottom: spacing.md }}>
                <Text style={styles.label}>
                  {field === "current" ? "Current password" : field === "new" ? "New password" : "Confirm new password"}
                </Text>
                <View style={styles.inputWrapper}>
                  <TextInput
                    style={[styles.input, { flex: 1, borderWidth: 0 }]}
                    value={passwordForm[field]}
                    onChangeText={v => setPasswordForm(f => ({ ...f, [field]: v }))}
                    secureTextEntry={!showPasswords[field]}
                    autoCapitalize="none"
                    placeholder="••••••••"
                    placeholderTextColor={colors.muted}
                  />
                  <TouchableOpacity onPress={() => setShowPasswords(s => ({ ...s, [field]: !s[field] }))}>
                    <Ionicons name={showPasswords[field] ? "eye-off" : "eye"} size={20} color={colors.muted} />
                  </TouchableOpacity>
                </View>
                {field === "new" && passwordForm.new.length > 0 && (
                  <View style={{ marginTop: 6 }}>
                    {PASSWORD_RULES.map(rule => (
                      <View key={rule.label} style={styles.ruleRow}>
                        <Ionicons name={rule.test(passwordForm.new) ? "checkmark-circle" : "close-circle"} size={13} color={rule.test(passwordForm.new) ? colors.green : colors.muted} />
                        <Text style={[styles.ruleText, rule.test(passwordForm.new) && { color: colors.green }]}>{rule.label}</Text>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            ))}
            {passwordError ? <Text style={styles.errorText}>{passwordError}</Text> : null}
            {passwordSuccess ? <Text style={{ color: colors.green, marginBottom: 12 }}>Password changed!</Text> : null}
            <TouchableOpacity
              style={[styles.submitBtn, (!newPasswordValid || passwordLoading) && styles.submitBtnDisabled]}
              onPress={handleChangePassword}
              disabled={!newPasswordValid || passwordLoading}
            >
              {passwordLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitBtnText}>Save Password</Text>}
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Delete Account Modal */}
      <Modal visible={showDeleteModal} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={styles.modalContainer} edges={["top"]}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Delete Account</Text>
            <TouchableOpacity onPress={() => { setShowDeleteModal(false); setDeleteConfirm(""); setDeleteError("") }}>
              <Ionicons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>
          <View style={{ padding: spacing.md }}>
            <Text style={{ color: colors.mutedForeground, marginBottom: 16, lineHeight: 22 }}>
              This will permanently delete your account and all your data (shopping list, tried recipes). This cannot be undone.
            </Text>
            <Text style={styles.label}>Type <Text style={{ color: colors.primary }}>{user.username}</Text> to confirm</Text>
            <TextInput
              style={[styles.input, { marginTop: 6, marginBottom: 16 }]}
              value={deleteConfirm}
              onChangeText={setDeleteConfirm}
              placeholder={user.username}
              placeholderTextColor={colors.muted}
              autoCapitalize="none"
            />
            {deleteError ? <Text style={styles.errorText}>{deleteError}</Text> : null}
            <TouchableOpacity
              style={[styles.deleteConfirmBtn, (deleteConfirm !== user.username || deleteLoading) && styles.submitBtnDisabled]}
              onPress={handleDeleteAccount}
              disabled={deleteConfirm !== user.username || deleteLoading}
            >
              {deleteLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitBtnText}>Delete Account</Text>}
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  center: { padding: 40, alignItems: "center" },
  card: { backgroundColor: colors.card, borderBottomWidth: 1, borderTopWidth: 1, borderColor: colors.border, padding: spacing.md, marginBottom: spacing.sm },
  profileRow: { flexDirection: "row", alignItems: "center", gap: 14 },
  avatar: { width: 56, height: 56, borderRadius: 28, backgroundColor: colors.primary + "33", alignItems: "center", justifyContent: "center" },
  avatarText: { fontSize: 24, fontWeight: "700", color: colors.primary },
  editRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  username: { fontSize: 18, fontWeight: "700", color: colors.text },
  usernameInput: { fontSize: 18, fontWeight: "700", color: colors.text, borderBottomWidth: 1, borderBottomColor: colors.primary, flex: 1, paddingVertical: 2 },
  email: { fontSize: 13, color: colors.mutedForeground, marginTop: 2 },
  logoutBtn: { flexDirection: "row", alignItems: "center", gap: 8, justifyContent: "center", paddingVertical: 4 },
  logoutBtnText: { color: colors.text, fontWeight: "600", fontSize: 15 },
  sectionHeader: { fontSize: 15, fontWeight: "700", color: colors.text, marginBottom: 12 },
  statsRow: { flexDirection: "row", gap: 12 },
  statCard: { flex: 1, backgroundColor: colors.background, borderRadius: radius.md, padding: spacing.md, alignItems: "center", borderWidth: 1, borderColor: colors.border },
  statValue: { fontSize: 28, fontWeight: "800", color: colors.primary },
  statLabel: { fontSize: 12, color: colors.mutedForeground, marginTop: 4 },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 4 },
  rowText: { fontSize: 15, color: colors.text },
  empty: { alignItems: "center", gap: 12, padding: spacing.xl },
  emptyText: { fontSize: 16, color: colors.mutedForeground },
  browseBtn: { backgroundColor: colors.primary, paddingHorizontal: 24, paddingVertical: 12, borderRadius: radius.md },
  browseBtnText: { color: "#fff", fontWeight: "700" },
  recipeCard: { backgroundColor: colors.card, borderRadius: radius.lg, overflow: "hidden", borderWidth: 1, borderColor: colors.border, flexDirection: "row" },
  recipeImage: { width: 80, height: 80 },
  recipeBody: { flex: 1, padding: spacing.sm, justifyContent: "center" },
  recipeTitle: { fontSize: 14, fontWeight: "600", color: colors.text, marginBottom: 4 },
  triedDate: { fontSize: 12, color: colors.mutedForeground },
  deleteBtn: { flexDirection: "row", alignItems: "center", gap: 8, justifyContent: "center", paddingVertical: 4 },
  deleteBtnText: { color: colors.destructive, fontWeight: "600", fontSize: 15 },
  modalContainer: { flex: 1, backgroundColor: colors.background },
  modalHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border },
  modalTitle: { fontSize: 18, fontWeight: "700", color: colors.text },
  label: { fontSize: 13, fontWeight: "600", color: colors.text, marginBottom: 4 },
  input: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: 12, paddingVertical: 11, color: colors.text, fontSize: 14 },
  inputWrapper: { flexDirection: "row", alignItems: "center", backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: 12 },
  ruleRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 2 },
  ruleText: { fontSize: 12, color: colors.muted },
  errorText: { fontSize: 13, color: colors.destructive, marginBottom: 8 },
  submitBtn: { backgroundColor: colors.primary, paddingVertical: 14, borderRadius: radius.md, alignItems: "center" },
  submitBtnDisabled: { opacity: 0.4 },
  submitBtnText: { color: "#fff", fontWeight: "700", fontSize: 16 },
  deleteConfirmBtn: { backgroundColor: colors.destructive, paddingVertical: 14, borderRadius: radius.md, alignItems: "center" },
})
