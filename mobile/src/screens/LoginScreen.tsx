import React, { useState, useRef, useEffect } from "react"
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, Linking, BackHandler } from "react-native"
import { Ionicons } from "@expo/vector-icons"
import { useNavigation } from "@react-navigation/native"
import { apiFetch } from "../lib/api"
import { useAuth } from "../context/AuthContext"
import { useTheme } from "../context/ThemeContext"
import { spacing, radius } from "../lib/theme"

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
  const { colors } = useTheme()
  const s = makeStyles(colors)
  const scrollRef = useRef<ScrollView>(null)

  const [activeTab, setActiveTab] = useState<"login" | "register">("login")
  const [loginForm, setLoginForm] = useState({ email: "", password: "" })
  const [regForm, setRegForm] = useState({ email: "", username: "", password: "", confirm: "" })
  const [showPass, setShowPass] = useState({ login: false, reg: false, confirm: false, reset: false })
  const [disclaimerAccepted, setDisclaimerAccepted] = useState(false)
  const [marketingConsent, setMarketingConsent] = useState(false)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  // verification step
  const [verifyEmail, setVerifyEmail] = useState("")
  const [verifyCode, setVerifyCode] = useState("")
  const [verifyError, setVerifyError] = useState("")
  const [verifyLoading, setVerifyLoading] = useState(false)
  const [resendLoading, setResendLoading] = useState(false)
  const [loginSuccess, setLoginSuccess] = useState("")

  // forgot password step: "email" | "reset" | null
  const [forgotStep, setForgotStep] = useState<"email" | "reset" | null>(null)
  const [forgotEmail, setForgotEmail] = useState("")
  const [resetCode, setResetCode] = useState("")
  const [resetPassword, setResetPassword] = useState("")
  const [forgotError, setForgotError] = useState("")
  const [forgotLoading, setForgotLoading] = useState(false)

  useEffect(() => {
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      navigation.navigate("Tabs", { screen: "Home" })
      return true
    })
    return () => sub.remove()
  }, [])

  const passwordPassed = PASSWORD_RULES.filter(r => r.test(regForm.password)).length
  const resetPasswordPassed = PASSWORD_RULES.filter(r => r.test(resetPassword)).length
  const regValid = regForm.email && regForm.username.length >= 3 &&
    PASSWORD_RULES.every(r => r.test(regForm.password)) && regForm.password === regForm.confirm &&
    disclaimerAccepted

  const handleLogin = async () => {
    setError(""); setLoading(true)
    try {
      const res = await apiFetch("/api/auth/login", { method: "POST", body: JSON.stringify(loginForm) })
      const data = await res.json()
      if (!res.ok) { setError(data.error || "Login failed"); return }
      await login({ id: data.user.id, email: data.user.email, username: data.user.username, accessToken: data.tokens?.accessToken, trialExpiresAt: data.user.trialExpiresAt, trialActive: data.user.trialActive, isPremium: data.user.isPremium })
      navigation.navigate("Tabs")
    } catch { setError("Something went wrong. Please try again.") }
    finally { setLoading(false) }
  }

  const handleRegister = async () => {
    setError("")
    if (!regValid) return
    setLoading(true)
    try {
      const res = await apiFetch("/api/auth/register", { method: "POST", body: JSON.stringify({ email: regForm.email, username: regForm.username, password: regForm.password, marketingConsent }) })
      const data = await res.json()
      if (!res.ok) { setError(data.error || "Registration failed"); return }
      setVerifyEmail(regForm.email)
      setVerifyCode("")
      setVerifyError("")
      scrollRef.current?.scrollTo({ y: 0, animated: true })
    } catch { setError("Something went wrong. Please try again.") }
    finally { setLoading(false) }
  }

  const handleVerify = async () => {
    setVerifyError(""); setVerifyLoading(true)
    try {
      const res = await apiFetch("/api/auth/verify", { method: "POST", body: JSON.stringify({ email: verifyEmail, code: verifyCode }) })
      const data = await res.json()
      if (!res.ok) { setVerifyError(data.error || "Verification failed"); return }
      setVerifyEmail("")
      setVerifyCode("")
      setActiveTab("login")
      setLoginForm(f => ({ ...f, email: regForm.email }))
      setLoginSuccess("Email verified! You can now sign in.")
      scrollRef.current?.scrollTo({ y: 0, animated: true })
    } catch { setVerifyError("Something went wrong. Please try again.") }
    finally { setVerifyLoading(false) }
  }

  const handleResend = async () => {
    setResendLoading(true); setVerifyError("")
    try {
      await apiFetch("/api/auth/verify", { method: "PUT", body: JSON.stringify({ email: verifyEmail }) })
    } catch { /* ignore */ }
    finally { setResendLoading(false) }
  }

  const handleForgotRequest = async () => {
    if (!forgotEmail) { setForgotError("Enter your email"); return }
    setForgotError(""); setForgotLoading(true)
    try {
      await apiFetch("/api/auth/forgot-password", { method: "POST", body: JSON.stringify({ email: forgotEmail }) })
      setForgotStep("reset")
    } catch { setForgotError("Something went wrong. Please try again.") }
    finally { setForgotLoading(false) }
  }

  const handleForgotReset = async () => {
    if (!PASSWORD_RULES.every(r => r.test(resetPassword))) { setForgotError("Password doesn't meet requirements"); return }
    setForgotError(""); setForgotLoading(true)
    try {
      const res = await apiFetch("/api/auth/reset-password", { method: "POST", body: JSON.stringify({ email: forgotEmail, code: resetCode, newPassword: resetPassword }) })
      const data = await res.json()
      if (!res.ok) { setForgotError(data.error || "Reset failed"); return }
      setForgotStep(null)
      setForgotEmail("")
      setResetCode("")
      setResetPassword("")
      setLoginForm(f => ({ ...f, email: forgotEmail }))
      setLoginSuccess("Password reset! You can now sign in.")
    } catch { setForgotError("Something went wrong. Please try again.") }
    finally { setForgotLoading(false) }
  }

  // Verify email screen
  if (verifyEmail) {
    return (
      <View style={{ flex: 1 }}>
        <ScrollView ref={scrollRef} style={s.container} contentContainerStyle={s.content} keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets>
          <View style={s.logoRow}>
            <View style={s.logoCircle}>
              <Ionicons name="restaurant" size={32} color={colors.primary} />
            </View>
            <Text style={s.logoText}>I Wanna Cook</Text>
          </View>
          <View style={s.card}>
            <View style={[s.banner, { backgroundColor: colors.primary + "22" }]}>
              <Ionicons name="mail-outline" size={20} color={colors.primary} />
              <Text style={[s.bannerText, { color: colors.primary }]}>
                We sent a 6-digit code to {verifyEmail}. Check your inbox (and spam folder).
              </Text>
            </View>
            <View style={s.form}>
              <Text style={s.sectionTitle}>Verify your email</Text>
              <View style={s.field}>
                <Text style={s.label}>Verification code</Text>
                <TextInput style={[s.input, s.codeInput]} value={verifyCode} onChangeText={v => setVerifyCode(v.replace(/\D/g, "").slice(0, 6))} placeholder="123456" placeholderTextColor={colors.muted} keyboardType="number-pad" maxLength={6} autoFocus />
              </View>
              {verifyError ? <Text style={s.error}>{verifyError}</Text> : null}
              <TouchableOpacity style={[s.submitBtn, verifyCode.length !== 6 && s.submitBtnDisabled]} onPress={handleVerify} disabled={verifyLoading || verifyCode.length !== 6}>
                {verifyLoading ? <ActivityIndicator color="#fff" /> : <Text style={s.submitBtnText}>Verify Email</Text>}
              </TouchableOpacity>
              <TouchableOpacity style={s.linkBtn} onPress={handleResend} disabled={resendLoading}>
                <Text style={s.linkBtnText}>{resendLoading ? "Sending..." : "Didn't get a code? Resend"}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.linkBtn} onPress={() => setVerifyEmail("")}>
                <Text style={[s.linkBtnText, { color: colors.muted }]}>Back to register</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </View>
    )
  }

  // Forgot password — enter email
  if (forgotStep === "email") {
    return (
      <View style={{ flex: 1 }}>
        <ScrollView style={s.container} contentContainerStyle={s.content} keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets>
          <View style={s.logoRow}>
            <View style={s.logoCircle}>
              <Ionicons name="restaurant" size={32} color={colors.primary} />
            </View>
            <Text style={s.logoText}>I Wanna Cook</Text>
          </View>
          <View style={s.card}>
            <View style={s.form}>
              <Text style={s.sectionTitle}>Reset password</Text>
              <Text style={{ fontSize: 13, color: colors.mutedForeground }}>Enter your email and we'll send you a reset code.</Text>
              <View style={s.field}>
                <Text style={s.label}>Email</Text>
                <TextInput style={s.input} value={forgotEmail} onChangeText={setForgotEmail} placeholder="you@example.com" placeholderTextColor={colors.muted} keyboardType="email-address" autoCapitalize="none" autoCorrect={false} autoFocus />
              </View>
              {forgotError ? <Text style={s.error}>{forgotError}</Text> : null}
              <TouchableOpacity style={[s.submitBtn, !forgotEmail && s.submitBtnDisabled]} onPress={handleForgotRequest} disabled={forgotLoading || !forgotEmail}>
                {forgotLoading ? <ActivityIndicator color="#fff" /> : <Text style={s.submitBtnText}>Send Reset Code</Text>}
              </TouchableOpacity>
              <TouchableOpacity style={s.linkBtn} onPress={() => { setForgotStep(null); setForgotError("") }}>
                <Text style={[s.linkBtnText, { color: colors.muted }]}>Back to sign in</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </View>
    )
  }

  // Forgot password — enter code + new password
  if (forgotStep === "reset") {
    return (
      <View style={{ flex: 1 }}>
        <ScrollView style={s.container} contentContainerStyle={[s.content, { paddingBottom: 200 }]} keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets>
          <View style={s.logoRow}>
            <View style={s.logoCircle}>
              <Ionicons name="restaurant" size={32} color={colors.primary} />
            </View>
            <Text style={s.logoText}>I Wanna Cook</Text>
          </View>
          <View style={s.card}>
            <View style={[s.banner, { backgroundColor: colors.primary + "22" }]}>
              <Ionicons name="mail-outline" size={20} color={colors.primary} />
              <Text style={[s.bannerText, { color: colors.primary }]}>We sent a reset code to {forgotEmail}. Check your inbox.</Text>
            </View>
            <View style={s.form}>
              <Text style={s.sectionTitle}>Set new password</Text>
              <View style={s.field}>
                <Text style={s.label}>Reset code</Text>
                <TextInput style={[s.input, s.codeInput]} value={resetCode} onChangeText={v => setResetCode(v.replace(/\D/g, "").slice(0, 6))} placeholder="123456" placeholderTextColor={colors.muted} keyboardType="number-pad" maxLength={6} autoFocus />
              </View>
              <View style={s.field}>
                <Text style={s.label}>New password</Text>
                <View style={s.inputWrapper}>
                  <TextInput style={[s.input, { flex: 1, borderWidth: 0 }]} value={resetPassword} onChangeText={setResetPassword} placeholder="••••••••" placeholderTextColor={colors.muted} secureTextEntry={!showPass.reset} autoCapitalize="none" />
                  <TouchableOpacity onPress={() => setShowPass(p => ({ ...p, reset: !p.reset }))}>
                    <Ionicons name={showPass.reset ? "eye-off" : "eye"} size={20} color={colors.muted} />
                  </TouchableOpacity>
                </View>
                {resetPassword.length > 0 && (
                  <View style={[s.rulesBox, { marginTop: 6 }]}>
                    <View style={s.strengthBar}>
                      <View style={[s.strengthFill, { width: `${(resetPasswordPassed / PASSWORD_RULES.length) * 100}%` as any, backgroundColor: resetPasswordPassed <= 2 ? colors.destructive : resetPasswordPassed <= 4 ? colors.yellow : colors.green }]} />
                    </View>
                    {PASSWORD_RULES.map(rule => (
                      <View key={rule.label} style={s.ruleRow}>
                        <Ionicons name={rule.test(resetPassword) ? "checkmark-circle" : "close-circle"} size={13} color={rule.test(resetPassword) ? colors.green : colors.muted} />
                        <Text style={[s.ruleText, rule.test(resetPassword) && { color: colors.green }]}>{rule.label}</Text>
                      </View>
                    ))}
                  </View>
                )}
              </View>
              {forgotError ? <Text style={s.error}>{forgotError}</Text> : null}
              <TouchableOpacity
                style={[s.submitBtn, (resetCode.length !== 6 || !PASSWORD_RULES.every(r => r.test(resetPassword))) && s.submitBtnDisabled]}
                onPress={handleForgotReset}
                disabled={forgotLoading || resetCode.length !== 6 || !PASSWORD_RULES.every(r => r.test(resetPassword))}
              >
                {forgotLoading ? <ActivityIndicator color="#fff" /> : <Text style={s.submitBtnText}>Reset Password</Text>}
              </TouchableOpacity>
              <TouchableOpacity style={s.linkBtn} onPress={() => setForgotStep("email")}>
                <Text style={[s.linkBtnText, { color: colors.muted }]}>Back</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </View>
    )
  }

  return (
    <View style={{ flex: 1 }}>
      <ScrollView ref={scrollRef} style={s.container} contentContainerStyle={s.content} keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets>
        <View style={s.logoRow}>
          <View style={s.logoCircle}>
            <Ionicons name="restaurant" size={32} color={colors.primary} />
          </View>
          <Text style={s.logoText}>I Wanna Cook</Text>
        </View>
        <View style={s.card}>
          <View style={s.tabs}>
            <TouchableOpacity style={[s.tab, activeTab === "login" && s.tabActive]} onPress={() => { setActiveTab("login"); setError(""); setLoginSuccess("") }}>
              <Text style={[s.tabText, activeTab === "login" && s.tabTextActive]}>Login</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[s.tab, activeTab === "register" && s.tabActive]} onPress={() => { setActiveTab("register"); setError(""); setLoginSuccess("") }}>
              <Text style={[s.tabText, activeTab === "register" && s.tabTextActive]}>Register</Text>
            </TouchableOpacity>
          </View>
          {loginSuccess ? (
            <View style={[s.banner, { backgroundColor: colors.green + "22" }]}>
              <Ionicons name="checkmark-circle-outline" size={20} color={colors.green} />
              <Text style={[s.bannerText, { color: colors.green }]}>{loginSuccess}</Text>
            </View>
          ) : null}
          {activeTab === "login" ? (
            <View style={s.form}>
              <View style={s.field}>
                <Text style={s.label}>Email</Text>
                <TextInput style={s.input} value={loginForm.email} onChangeText={v => setLoginForm(f => ({ ...f, email: v }))} placeholder="you@example.com" placeholderTextColor={colors.muted} keyboardType="email-address" autoCapitalize="none" autoCorrect={false} />
              </View>
              <View style={s.field}>
                <Text style={s.label}>Password</Text>
                <View style={s.inputWrapper}>
                  <TextInput style={[s.input, { flex: 1, borderWidth: 0 }]} value={loginForm.password} onChangeText={v => setLoginForm(f => ({ ...f, password: v }))} placeholder="••••••••" placeholderTextColor={colors.muted} secureTextEntry={!showPass.login} autoCapitalize="none" />
                  <TouchableOpacity onPress={() => setShowPass(p => ({ ...p, login: !p.login }))}>
                    <Ionicons name={showPass.login ? "eye-off" : "eye"} size={20} color={colors.muted} />
                  </TouchableOpacity>
                </View>
              </View>
              {error ? <Text style={s.error}>{error}</Text> : null}
              <TouchableOpacity style={s.submitBtn} onPress={handleLogin} disabled={loading}>
                {loading ? <ActivityIndicator color="#fff" /> : <Text style={s.submitBtnText}>Sign in</Text>}
              </TouchableOpacity>
              <TouchableOpacity style={s.linkBtn} onPress={() => { setForgotEmail(loginForm.email); setForgotError(""); setForgotStep("email") }}>
                <Text style={s.linkBtnText}>Forgot password?</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.linkBtn} onPress={() => navigation.navigate("Tabs")}>
                <Text style={[s.linkBtnText, { color: colors.muted }]}>Continue as guest</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={s.form}>
              <View style={s.field}>
                <Text style={s.label}>Email</Text>
                <TextInput style={s.input} value={regForm.email} onChangeText={v => setRegForm(f => ({ ...f, email: v }))} placeholder="you@example.com" placeholderTextColor={colors.muted} keyboardType="email-address" autoCapitalize="none" autoCorrect={false} />
              </View>
              <View style={s.field}>
                <Text style={s.label}>Username</Text>
                <TextInput style={s.input} value={regForm.username} onChangeText={v => setRegForm(f => ({ ...f, username: v }))} placeholder="chef_alex (min. 3 chars)" placeholderTextColor={colors.muted} autoCapitalize="none" autoCorrect={false} />
              </View>
              <View style={s.field}>
                <Text style={s.label}>Password</Text>
                <View style={s.inputWrapper}>
                  <TextInput style={[s.input, { flex: 1, borderWidth: 0 }]} value={regForm.password} onChangeText={v => setRegForm(f => ({ ...f, password: v }))} placeholder="••••••••" placeholderTextColor={colors.muted} secureTextEntry={!showPass.reg} autoCapitalize="none" />
                  <TouchableOpacity onPress={() => setShowPass(p => ({ ...p, reg: !p.reg }))}>
                    <Ionicons name={showPass.reg ? "eye-off" : "eye"} size={20} color={colors.muted} />
                  </TouchableOpacity>
                </View>
              </View>
              <View style={s.field}>
                <Text style={s.label}>Confirm Password</Text>
                <View style={s.inputWrapper}>
                  <TextInput style={[s.input, { flex: 1, borderWidth: 0 }]} value={regForm.confirm} onChangeText={v => setRegForm(f => ({ ...f, confirm: v }))} placeholder="••••••••" placeholderTextColor={colors.muted} secureTextEntry={!showPass.confirm} autoCapitalize="none" />
                  <TouchableOpacity onPress={() => setShowPass(p => ({ ...p, confirm: !p.confirm }))}>
                    <Ionicons name={showPass.confirm ? "eye-off" : "eye"} size={20} color={colors.muted} />
                  </TouchableOpacity>
                </View>
                {regForm.confirm.length > 0 && regForm.password !== regForm.confirm && (
                  <Text style={s.error}>Passwords do not match</Text>
                )}
              </View>
              {regForm.password.length > 0 && (
                <View style={s.rulesBox}>
                  <View style={s.strengthBar}>
                    <View style={[s.strengthFill, { width: `${(passwordPassed / PASSWORD_RULES.length) * 100}%` as any, backgroundColor: passwordPassed <= 2 ? colors.destructive : passwordPassed <= 4 ? colors.yellow : colors.green }]} />
                  </View>
                  {PASSWORD_RULES.map(rule => (
                    <View key={rule.label} style={s.ruleRow}>
                      <Ionicons name={rule.test(regForm.password) ? "checkmark-circle" : "close-circle"} size={13} color={rule.test(regForm.password) ? colors.green : colors.muted} />
                      <Text style={[s.ruleText, rule.test(regForm.password) && { color: colors.green }]}>{rule.label}</Text>
                    </View>
                  ))}
                </View>
              )}
              <TouchableOpacity style={s.consentRow} onPress={() => setDisclaimerAccepted(v => !v)} activeOpacity={0.7}>
                <View style={[s.checkbox, disclaimerAccepted && s.checkboxChecked]}>
                  {disclaimerAccepted && <Ionicons name="checkmark" size={12} color="#fff" />}
                </View>
                <Text style={s.consentText}>
                  I agree to the{" "}
                  <Text style={s.consentLink} onPress={() => navigation.navigate("Legal", { type: "terms" })}>Terms of Service</Text>
                  {" "}and{" "}
                  <Text style={s.consentLink} onPress={() => navigation.navigate("Legal", { type: "privacy" })}>Privacy Policy</Text>
                  , and I understand that nutrition and allergen information is approximate and not a substitute for professional dietary or medical advice. I will always verify ingredients independently if I have allergies or intolerances.
                </Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.consentRow} onPress={() => setMarketingConsent(v => !v)} activeOpacity={0.7}>
                <View style={[s.checkbox, marketingConsent && s.checkboxChecked]}>
                  {marketingConsent && <Ionicons name="checkmark" size={12} color="#fff" />}
                </View>
                <Text style={s.consentText}>
                  I agree to receive occasional emails about new features, tips, and promotions. You can unsubscribe at any time. (Optional)
                </Text>
              </TouchableOpacity>
              {error ? <Text style={s.error}>{error}</Text> : null}
              <TouchableOpacity style={[s.submitBtn, !regValid && s.submitBtnDisabled]} onPress={handleRegister} disabled={loading || !regValid}>
                {loading ? <ActivityIndicator color="#fff" /> : <Text style={s.submitBtnText}>Create Account</Text>}
              </TouchableOpacity>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  )
}

const makeStyles = (colors: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md, paddingTop: "15%", paddingBottom: 120 },
  logoRow: { alignItems: "center", gap: 0, marginBottom: 28 },
  logoCircle: { width: 64, height: 64, borderRadius: 32, backgroundColor: colors.primary + "22", alignItems: "center", justifyContent: "center", marginBottom: 8 },
  logoText: { fontSize: 22, fontWeight: "800", color: colors.text, textAlign: "center" },
  card: { backgroundColor: colors.card, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, overflow: "hidden", marginTop: "2%" },
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
  codeInput: { textAlign: "center", fontSize: 28, fontWeight: "700", letterSpacing: 8 },
  rulesBox: { backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: 10, gap: 4 },
  strengthBar: { height: 4, backgroundColor: colors.border, borderRadius: 2, overflow: "hidden", marginBottom: 6 },
  strengthFill: { height: "100%" as any, borderRadius: 2 },
  ruleRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 2 },
  ruleText: { fontSize: 12, color: colors.muted },
  error: { fontSize: 13, color: colors.destructive },
  submitBtn: { backgroundColor: colors.primary, paddingVertical: 14, borderRadius: radius.md, alignItems: "center" },
  submitBtnDisabled: { opacity: 0.5 },
  submitBtnText: { color: "#fff", fontWeight: "700", fontSize: 16 },
  banner: { flexDirection: "row", alignItems: "flex-start", gap: 10, padding: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border },
  bannerText: { flex: 1, fontSize: 13, lineHeight: 18 },
  sectionTitle: { fontSize: 18, fontWeight: "700", color: colors.text },
  linkBtn: { alignItems: "center", paddingVertical: 4 },
  linkBtnText: { fontSize: 13, color: colors.primary },
  consentRow: { flexDirection: "row", alignItems: "flex-start", gap: 10, padding: 12, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, backgroundColor: colors.muted + "22" },
  checkbox: { width: 18, height: 18, borderRadius: 3, borderWidth: 1.5, borderColor: colors.border, alignItems: "center", justifyContent: "center", marginTop: 1, flexShrink: 0 },
  checkboxChecked: { backgroundColor: colors.primary, borderColor: colors.primary },
  consentText: { flex: 1, fontSize: 12, color: colors.mutedForeground, lineHeight: 18 },
  consentLink: { color: colors.primary, textDecorationLine: "underline" },
})
