import React, { useState } from "react"
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  ScrollView, ActivityIndicator, KeyboardAvoidingView, Platform
} from "react-native"
import { Ionicons } from "@expo/vector-icons"
import { useNavigation } from "@react-navigation/native"
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

export default function LoginScreen() {
  const navigation = useNavigation<any>()
  const { login } = useAuth()
  const [activeTab, setActiveTab] = useState<"login" | "register">("login")
  const [loginForm, setLoginForm] = useState({ email: "", password: "" })
  const [regForm, setRegForm] = useState({ email: "", username: "", password: "", confirm: "" })
  const [showPass, setShowPass] = useState({ login: false, reg: false, confirm: false })
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  const passwordPassed = PASSWORD_RULES.filter(r => r.test(regForm.password)).length
  const regValid = regForm.email && regForm.username.length >= 3 &&
    PASSWORD_RULES.every(r => r.test(regForm.password)) && regForm.password === regForm.confirm

  const handleLogin = async () => {
    setError("")
    setLoading(true)
    try {
      const res = await apiFetch("/api/auth/login", {
        method: "POST",
        body: JSON.stringify(loginForm),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || "Login failed"); return }
      await login({ id: data.user.id, email: data.user.email, username: data.user.username, accessToken: data.tokens?.accessToken })
      navigation.goBack()
    } catch {
      setError("Something went wrong. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const handleRegister = async () => {
    setError("")
    if (!regValid) return
    setLoading(true)
    try {
      const res = await apiFetch("/api/auth/register", {
        method: "POST",
        body: JSON.stringify({ email: regForm.email, username: regForm.username, password: regForm.password }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || "Registration failed"); return }
      setActiveTab("login")
      setError("")
    } catch {
      setError("Something went wrong. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.logoRow}>
          <Ionicons name="restaurant" size={48} color={colors.primary} />
          <Text style={styles.logoText}>What Should I Cook?</Text>
        </View>

        <View style={styles.card}>
          {/* Tabs */}
          <View style={styles.tabs}>
            <TouchableOpacity style={[styles.tab, activeTab === "login" && styles.tabActive]} onPress={() => { setActiveTab("login"); setError("") }}>
              <Text style={[styles.tabText, activeTab === "login" && styles.tabTextActive]}>Login</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.tab, activeTab === "register" && styles.tabActive]} onPress={() => { setActiveTab("register"); setError("") }}>
              <Text style={[styles.tabText, activeTab === "register" && styles.tabTextActive]}>Register</Text>
            </TouchableOpacity>
          </View>

          {activeTab === "login" ? (
            <View style={styles.form}>
              <View style={styles.field}>
                <Text style={styles.label}>Email</Text>
                <TextInput
                  style={styles.input}
                  value={loginForm.email}
                  onChangeText={v => setLoginForm(f => ({ ...f, email: v }))}
                  placeholder="you@example.com"
                  placeholderTextColor={colors.muted}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>
              <View style={styles.field}>
                <Text style={styles.label}>Password</Text>
                <View style={styles.inputWrapper}>
                  <TextInput
                    style={[styles.input, { flex: 1, borderWidth: 0 }]}
                    value={loginForm.password}
                    onChangeText={v => setLoginForm(f => ({ ...f, password: v }))}
                    placeholder="••••••••"
                    placeholderTextColor={colors.muted}
                    secureTextEntry={!showPass.login}
                    autoCapitalize="none"
                  />
                  <TouchableOpacity onPress={() => setShowPass(s => ({ ...s, login: !s.login }))}>
                    <Ionicons name={showPass.login ? "eye-off" : "eye"} size={20} color={colors.muted} />
                  </TouchableOpacity>
                </View>
              </View>
              {error ? <Text style={styles.error}>{error}</Text> : null}
              <TouchableOpacity style={styles.submitBtn} onPress={handleLogin} disabled={loading}>
                {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitBtnText}>Sign in</Text>}
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.form}>
              <View style={styles.field}>
                <Text style={styles.label}>Email</Text>
                <TextInput
                  style={styles.input}
                  value={regForm.email}
                  onChangeText={v => setRegForm(f => ({ ...f, email: v }))}
                  placeholder="you@example.com"
                  placeholderTextColor={colors.muted}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>
              <View style={styles.field}>
                <Text style={styles.label}>Username</Text>
                <TextInput
                  style={styles.input}
                  value={regForm.username}
                  onChangeText={v => setRegForm(f => ({ ...f, username: v }))}
                  placeholder="chef_alex (min. 3 chars)"
                  placeholderTextColor={colors.muted}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>
              <View style={styles.field}>
                <Text style={styles.label}>Password</Text>
                <View style={styles.inputWrapper}>
                  <TextInput
                    style={[styles.input, { flex: 1, borderWidth: 0 }]}
                    value={regForm.password}
                    onChangeText={v => setRegForm(f => ({ ...f, password: v }))}
                    placeholder="••••••••"
                    placeholderTextColor={colors.muted}
                    secureTextEntry={!showPass.reg}
                    autoCapitalize="none"
                  />
                  <TouchableOpacity onPress={() => setShowPass(s => ({ ...s, reg: !s.reg }))}>
                    <Ionicons name={showPass.reg ? "eye-off" : "eye"} size={20} color={colors.muted} />
                  </TouchableOpacity>
                </View>
                {regForm.password.length > 0 && (
                  <View style={{ marginTop: 8 }}>
                    <View style={styles.strengthBar}>
                      <View style={[styles.strengthFill, {
                        width: `${(passwordPassed / PASSWORD_RULES.length) * 100}%` as any,
                        backgroundColor: passwordPassed <= 2 ? colors.destructive : passwordPassed <= 4 ? colors.yellow : colors.green
                      }]} />
                    </View>
                    {PASSWORD_RULES.map(rule => (
                      <View key={rule.label} style={styles.ruleRow}>
                        <Ionicons name={rule.test(regForm.password) ? "checkmark-circle" : "close-circle"} size={13} color={rule.test(regForm.password) ? colors.green : colors.muted} />
                        <Text style={[styles.ruleText, rule.test(regForm.password) && { color: colors.green }]}>{rule.label}</Text>
                      </View>
                    ))}
                  </View>
                )}
              </View>
              <View style={styles.field}>
                <Text style={styles.label}>Confirm Password</Text>
                <View style={styles.inputWrapper}>
                  <TextInput
                    style={[styles.input, { flex: 1, borderWidth: 0 }]}
                    value={regForm.confirm}
                    onChangeText={v => setRegForm(f => ({ ...f, confirm: v }))}
                    placeholder="••••••••"
                    placeholderTextColor={colors.muted}
                    secureTextEntry={!showPass.confirm}
                    autoCapitalize="none"
                  />
                  <TouchableOpacity onPress={() => setShowPass(s => ({ ...s, confirm: !s.confirm }))}>
                    <Ionicons name={showPass.confirm ? "eye-off" : "eye"} size={20} color={colors.muted} />
                  </TouchableOpacity>
                </View>
              </View>
              {error ? <Text style={styles.error}>{error}</Text> : null}
              <TouchableOpacity style={[styles.submitBtn, !regValid && styles.submitBtnDisabled]} onPress={handleRegister} disabled={loading || !regValid}>
                {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitBtnText}>Create Account</Text>}
              </TouchableOpacity>
            </View>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md, paddingTop: 40, paddingBottom: 40 },
  logoRow: { alignItems: "center", gap: 12, marginBottom: 28 },
  logoText: { fontSize: 22, fontWeight: "800", color: colors.text, textAlign: "center" },
  card: { backgroundColor: colors.card, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, overflow: "hidden" },
  tabs: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: colors.border },
  tab: { flex: 1, paddingVertical: 14, alignItems: "center", borderBottomWidth: 2, borderBottomColor: "transparent" },
  tabActive: { borderBottomColor: colors.primary },
  tabText: { fontSize: 15, fontWeight: "500", color: colors.mutedForeground },
  tabTextActive: { color: colors.primary, fontWeight: "700" },
  form: { padding: spacing.md, gap: 16 },
  field: { gap: 6 },
  label: { fontSize: 13, fontWeight: "600", color: colors.text },
  input: { backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: 12, paddingVertical: 11, color: colors.text, fontSize: 14 },
  inputWrapper: { flexDirection: "row", alignItems: "center", backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: 12 },
  strengthBar: { height: 4, backgroundColor: colors.border, borderRadius: 2, overflow: "hidden", marginBottom: 6 },
  strengthFill: { height: "100%", borderRadius: 2 },
  ruleRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 2 },
  ruleText: { fontSize: 12, color: colors.muted },
  error: { fontSize: 13, color: colors.destructive },
  submitBtn: { backgroundColor: colors.primary, paddingVertical: 14, borderRadius: radius.md, alignItems: "center" },
  submitBtnDisabled: { opacity: 0.5 },
  submitBtnText: { color: "#fff", fontWeight: "700", fontSize: 16 },
})
