import React, { useCallback, useState } from "react"
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, TextInput, Modal
} from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { Ionicons } from "@expo/vector-icons"
import { useNavigation, useFocusEffect } from "@react-navigation/native"
import { apiFetch } from "../lib/api"
import { useAuth } from "../context/AuthContext"
import { colors, spacing, radius } from "../lib/theme"

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

  const [triedCount, setTriedCount] = useState(0)
  const [avgRating, setAvgRating] = useState("0.0")
  const [selectedTheme, setSelectedTheme] = useState<"light" | "dark" | "system">("dark")

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
    apiFetch(`/api/tried-recipes?userId=${user.id}`)
      .then(r => r.json())
      .then(data => {
        const recipes = data.triedRecipes || []
        setTriedCount(recipes.length)
        if (recipes.length > 0) {
          const avg = recipes.reduce((sum: number, r: any) => sum + (r.satisfaction || 0), 0) / recipes.length
          setAvgRating(avg.toFixed(1))
        }
      })
      .catch(() => {})
  }, [user]))

  const handleLogout = async () => { await logout(); navigation.navigate("Home") }

  const handleSaveUsername = async () => {
    if (newUsername.length < 3) { setUsernameError("Min. 3 characters"); return }
    setUsernameLoading(true); setUsernameError("")
    try {
      const res = await apiFetch("/api/user", { method: "PATCH", body: JSON.stringify({ userId: user!.id, username: newUsername }) })
      const data = await res.json()
      if (!res.ok) { setUsernameError(data.error); return }
      setEditingUsername(false)
    } catch { setUsernameError("Update failed") }
    finally { setUsernameLoading(false) }
  }

  const handleChangePassword = async () => {
    if (passwordForm.new !== passwordForm.confirm) { setPasswordError("Passwords do not match"); return }
    if (!PASSWORD_RULES.every(r => r.test(passwordForm.new))) { setPasswordError("Password doesn't meet requirements"); return }
    setPasswordLoading(true); setPasswordError("")
    try {
      const res = await apiFetch("/api/user", { method: "PATCH", body: JSON.stringify({ userId: user!.id, currentPassword: passwordForm.current, newPassword: passwordForm.new, accessToken: user!.accessToken }) })
      const data = await res.json()
      if (!res.ok) { setPasswordError(data.error); return }
      setPasswordSuccess(true)
      setTimeout(() => { setShowPasswordModal(false); setPasswordSuccess(false); setPasswordForm({ current: "", new: "", confirm: "" }) }, 1500)
    } catch { setPasswordError("Update failed") }
    finally { setPasswordLoading(false) }
  }

  const handleDeleteAccount = async () => {
    if (deleteConfirm !== user!.username) return
    setDeleteLoading(true); setDeleteError("")
    try {
      const res = await apiFetch("/api/user", { method: "DELETE", body: JSON.stringify({ userId: user!.id, accessToken: user!.accessToken }) })
      const data = await res.json()
      if (!res.ok) { setDeleteError(data.error); return }
      await logout(); navigation.navigate("Home")
    } catch { setDeleteError("Deletion failed") }
    finally { setDeleteLoading(false) }
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
              <Ionicons name="person" size={32} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              {editingUsername ? (
                <View style={styles.editRow}>
                  <TextInput style={styles.usernameInput} value={newUsername} onChangeText={setNewUsername} autoFocus autoCapitalize="none" />
                  <TouchableOpacity onPress={handleSaveUsername} disabled={usernameLoading}>
                    {usernameLoading ? <ActivityIndicator color={colors.green} /> : <Ionicons name="checkmark" size={20} color={colors.green} />}
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => { setEditingUsername(false); setUsernameError("") }}>
                    <Ionicons name="close" size={20} color={colors.destructive} />
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.editRow}>
                  <Text style={styles.username}>{user.username}</Text>
                  <TouchableOpacity onPress={() => { setNewUsername(user.username); setEditingUsername(true) }}>
                    <Ionicons name="pencil-outline" size={15} color={colors.mutedForeground} />
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
          <Text style={styles.sectionTitle}>Stats</Text>
          <View style={styles.statsRow}>
            <View style={styles.statBox}>
              <Text style={styles.statValue}>{triedCount}</Text>
              <Text style={styles.statLabel}>Recipes Tried</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statValue}>{avgRating}</Text>
              <Text style={styles.statLabel}>Avg. Rating</Text>
            </View>
          </View>
        </View>

        {/* Preferences */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Preferences</Text>
          <Text style={styles.prefLabel}>Theme</Text>
          <View style={styles.themeRow}>
            {[
              { value: "light" as const, label: "Light", icon: "sunny-outline" as const },
              { value: "dark" as const, label: "Dark", icon: "moon-outline" as const },
              { value: "system" as const, label: "System", icon: "desktop-outline" as const },
            ].map(opt => (
              <TouchableOpacity
                key={opt.value}
                style={[styles.themeBtn, selectedTheme === opt.value && styles.themeBtnActive]}
                onPress={() => setSelectedTheme(opt.value)}
              >
                <Ionicons name={opt.icon} size={14} color={selectedTheme === opt.value ? colors.primary : colors.mutedForeground} />
                <Text style={[styles.themeBtnText, selectedTheme === opt.value && styles.themeBtnTextActive]}>{opt.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Security */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Security</Text>
          <TouchableOpacity style={styles.securityRow} onPress={() => setShowPasswordModal(true)}>
            <Text style={styles.securityLabel}>Password</Text>
            <Text style={styles.securityAction}>Change Password</Text>
          </TouchableOpacity>
        </View>

        {/* Account actions */}
        <View style={styles.card}>
          <View style={styles.actionsRow}>
            <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
              <Text style={styles.logoutBtnText}>Logout</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.deleteBtn} onPress={() => setShowDeleteModal(true)}>
              <Ionicons name="trash-outline" size={15} color="#fff" />
              <Text style={styles.deleteBtnText}>Delete Account</Text>
            </TouchableOpacity>
          </View>
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
                <Text style={styles.inputLabel}>
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
            <TouchableOpacity style={[styles.submitBtn, (!newPasswordValid || passwordLoading) && styles.disabledBtn]} onPress={handleChangePassword} disabled={!newPasswordValid || passwordLoading}>
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
              This will permanently delete your account and all your data. This cannot be undone.
            </Text>
            <Text style={styles.inputLabel}>Type <Text style={{ color: colors.primary }}>{user.username}</Text> to confirm</Text>
            <TextInput style={[styles.input, { marginTop: 6, marginBottom: 16 }]} value={deleteConfirm} onChangeText={setDeleteConfirm} placeholder={user.username} placeholderTextColor={colors.muted} autoCapitalize="none" />
            {deleteError ? <Text style={styles.errorText}>{deleteError}</Text> : null}
            <TouchableOpacity style={[styles.deleteConfirmBtn, (deleteConfirm !== user.username || deleteLoading) && styles.disabledBtn]} onPress={handleDeleteAccount} disabled={deleteConfirm !== user.username || deleteLoading}>
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
  card: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, margin: spacing.md, marginBottom: 0, padding: spacing.md },
  profileRow: { flexDirection: "row", alignItems: "center", gap: 16 },
  avatar: { width: 64, height: 64, borderRadius: 32, backgroundColor: colors.primary + "20", alignItems: "center", justifyContent: "center" },
  editRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  username: { fontSize: 20, fontWeight: "700", color: colors.text },
  usernameInput: { fontSize: 18, fontWeight: "700", color: colors.text, borderBottomWidth: 1, borderBottomColor: colors.primary, flex: 1, paddingVertical: 2 },
  email: { fontSize: 13, color: colors.mutedForeground, marginTop: 3 },
  sectionTitle: { fontSize: 16, fontWeight: "700", color: colors.text, marginBottom: 14 },
  statsRow: { flexDirection: "row", gap: 12 },
  statBox: { flex: 1, backgroundColor: colors.background + "99", borderRadius: radius.md, padding: spacing.md, alignItems: "center", borderWidth: 1, borderColor: colors.border },
  statValue: { fontSize: 26, fontWeight: "800", color: colors.primary },
  statLabel: { fontSize: 12, color: colors.mutedForeground, marginTop: 4, textAlign: "center" },
  prefLabel: { fontSize: 13, color: colors.mutedForeground, marginBottom: 10 },
  themeRow: { flexDirection: "row", gap: 8 },
  themeBtn: { flexDirection: "row", alignItems: "center", gap: 6, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: 12, paddingVertical: 8 },
  themeBtnActive: { borderColor: colors.primary, backgroundColor: colors.primary + "15" },
  themeBtnText: { fontSize: 13, color: colors.text },
  themeBtnTextActive: { color: colors.primary, fontWeight: "600" },
  securityRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: 12 },
  securityLabel: { fontSize: 14, color: colors.text },
  securityAction: { fontSize: 14, color: colors.primary, fontWeight: "600" },
  actionsRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  logoutBtn: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: 20, paddingVertical: 10 },
  logoutBtnText: { fontSize: 14, fontWeight: "600", color: colors.text },
  deleteBtn: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: colors.destructive, borderRadius: radius.md, paddingHorizontal: 14, paddingVertical: 10 },
  deleteBtnText: { fontSize: 14, fontWeight: "600", color: "#fff" },
  errorText: { fontSize: 13, color: colors.destructive, marginBottom: 8 },
  modalContainer: { flex: 1, backgroundColor: colors.background },
  modalHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border },
  modalTitle: { fontSize: 18, fontWeight: "700", color: colors.text },
  inputLabel: { fontSize: 13, fontWeight: "600", color: colors.text, marginBottom: 4 },
  input: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: 12, paddingVertical: 11, color: colors.text, fontSize: 14 },
  inputWrapper: { flexDirection: "row", alignItems: "center", backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: 12 },
  ruleRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 2 },
  ruleText: { fontSize: 12, color: colors.muted },
  submitBtn: { backgroundColor: colors.primary, paddingVertical: 14, borderRadius: radius.md, alignItems: "center" },
  disabledBtn: { opacity: 0.4 },
  submitBtnText: { color: "#fff", fontWeight: "700", fontSize: 15 },
  deleteConfirmBtn: { backgroundColor: colors.destructive, paddingVertical: 14, borderRadius: radius.md, alignItems: "center" },
})
