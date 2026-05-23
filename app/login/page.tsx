"use client"

import type React from "react"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ChefHat, Loader2, CheckCircle2, XCircle, Eye, EyeOff } from "lucide-react"
import { login } from "@/redux/features/auth/authSlice"
import { useAppDispatch } from "@/redux/hooks"
import { useTheme } from "next-themes"
import Link from "next/link"

const PASSWORD_RULES = [
  { label: "At least 8 characters", test: (p: string) => p.length >= 8 },
  { label: "One uppercase letter", test: (p: string) => /[A-Z]/.test(p) },
  { label: "One lowercase letter", test: (p: string) => /[a-z]/.test(p) },
  { label: "One number", test: (p: string) => /[0-9]/.test(p) },
  { label: "One special character", test: (p: string) => /[^A-Za-z0-9]/.test(p) },
]

function FieldError({ message }: { message: string }) {
  if (!message) return null
  return <p className="text-xs text-destructive mt-1">{message}</p>
}

function EyeToggle({ show, onToggle }: { show: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
      tabIndex={-1}
    >
      {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
    </button>
  )
}

function PasswordStrength({ password }: { password: string }) {
  if (!password) return null
  const passed = PASSWORD_RULES.filter((r) => r.test(password)).length
  const strength = passed <= 2 ? "Weak" : passed <= 4 ? "Fair" : "Strong"
  const color = passed <= 2 ? "bg-destructive" : passed <= 4 ? "bg-yellow-500" : "bg-green-500"
  const width = `${(passed / PASSWORD_RULES.length) * 100}%`

  return (
    <div className="mt-2 space-y-2">
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>Password strength</span>
        <span className={passed <= 2 ? "text-destructive" : passed <= 4 ? "text-yellow-500" : "text-green-500"}>
          {strength}
        </span>
      </div>
      <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width }} />
      </div>
      <ul className="space-y-1">
        {PASSWORD_RULES.map((rule) => {
          const ok = rule.test(password)
          return (
            <li key={rule.label} className={`flex items-center gap-1.5 text-xs ${ok ? "text-green-500" : "text-muted-foreground"}`}>
              {ok ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
              {rule.label}
            </li>
          )
        })}
      </ul>
    </div>
  )
}

export default function LoginPage() {
  const router = useRouter()
  const dispatch = useAppDispatch()
  const { setTheme } = useTheme()

  const [loginForm, setLoginForm] = useState({ email: "", password: "" })
  const [registerForm, setRegisterForm] = useState({ email: "", username: "", password: "", confirmPassword: "" })
  const [activeTab, setActiveTab] = useState("login")
  const [touched, setTouched] = useState({ email: false, username: false, password: false, confirmPassword: false })
  const [loginTouched, setLoginTouched] = useState({ email: false })
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [showPasswords, setShowPasswords] = useState({ login: false, register: false, confirm: false })

  const touch = (field: keyof typeof touched) => setTouched((t) => ({ ...t, [field]: true }))

  const loginEmailError = loginTouched.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(loginForm.email)
    ? "Enter a valid email address" : ""
  const emailError = touched.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(registerForm.email)
    ? "Enter a valid email address" : ""
  const usernameError = touched.username && registerForm.username.length < 3
    ? "Username must be at least 3 characters" : ""
  const passwordAllPassed = PASSWORD_RULES.every((r) => r.test(registerForm.password))
  const passwordError = touched.password && !passwordAllPassed ? "Password does not meet requirements" : ""
  const confirmError = touched.confirmPassword && registerForm.confirmPassword !== registerForm.password
    ? "Passwords do not match" : ""
  const registerValid = !emailError && !usernameError && !passwordError && !confirmError
    && registerForm.email && registerForm.username && registerForm.password && registerForm.confirmPassword

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setLoading(true)
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(loginForm),
      })
      const data = await res.json()
      if (!res.ok) {
        if (data.code === "EMAIL_NOT_VERIFIED") {
          router.push("/verify?email=" + encodeURIComponent(loginForm.email))
          return
        }
        setError(data.error)
        return
      }
      const userTheme = data.user.theme ?? "system"
      dispatch(login({
        username: data.user.username,
        email: data.user.email,
        id: data.user.id,
        theme: userTheme,
        accessToken: data.tokens?.accessToken,
      }))
      localStorage.setItem("user", JSON.stringify({ ...data.user, accessToken: data.tokens?.accessToken }))
      setTheme(userTheme)
      router.push("/")
    } catch {
      setError("Something went wrong. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    if (!registerValid) return
    setLoading(true)
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: registerForm.email, username: registerForm.username, password: registerForm.password }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error); return }
      router.push("/verify?email=" + encodeURIComponent(registerForm.email))
    } catch {
      setError("Something went wrong. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-64px)] px-4 py-8">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-2">
            <ChefHat className="h-12 w-12 text-primary" />
          </div>
          <CardTitle className="text-2xl">{activeTab === "login" ? "Sign in" : "Create Account"}</CardTitle>
          <CardDescription>{activeTab === "login" ? "Welcome back! Sign in to your account." : "Join us and start tracking your recipes."}</CardDescription>
        </CardHeader>

        <CardContent>
          <Tabs defaultValue="login" onValueChange={(val) => {
            setActiveTab(val)
            setError("")
            setTouched({ email: false, username: false, password: false, confirmPassword: false })
            setLoginTouched({ email: false })
          }}>
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="login">Login</TabsTrigger>
              <TabsTrigger value="register">Register</TabsTrigger>
            </TabsList>

            {/* Login */}
            <TabsContent value="login">
              <form onSubmit={handleLogin} className="space-y-4" autoComplete="on">
                <div className="space-y-1">
                  <Label htmlFor="login-email">Email</Label>
                  <Input
                    id="login-email"
                    type="email"
                    placeholder="you@example.com"
                    value={loginForm.email}
                    onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })}
                    onBlur={() => setLoginTouched({ email: true })}
                    className={loginEmailError ? "border-destructive focus-visible:ring-destructive" : ""}
                    autoComplete="email"
                    required
                  />
                  <FieldError message={loginEmailError} />
                </div>
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="login-password">Password</Label>
                    <Link href="/forgot-password" className="text-xs text-primary hover:underline">
                      Forgot password?
                    </Link>
                  </div>
                  <div className="relative">
                    <Input
                      id="login-password"
                      type={showPasswords.login ? "text" : "password"}
                      placeholder="••••••••"
                      value={loginForm.password}
                      onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                      className="pr-10"
                      autoComplete="current-password"
                      required
                    />
                    <EyeToggle show={showPasswords.login} onToggle={() => setShowPasswords((s) => ({ ...s, login: !s.login }))} />
                  </div>
                </div>

                {error && <p className="text-sm text-destructive">{error}</p>}
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                  Sign in
                </Button>
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-card px-2 text-muted-foreground">or</span>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={() => setLoginForm({ email: "alessandro.dev.ladu@gmail.com", password: "ChefChefChef123!" })}
                >
                  Use demo credentials
                </Button>
              </form>
            </TabsContent>

            {/* Register */}
            <TabsContent value="register">
              <form onSubmit={handleRegister} className="space-y-4" autoComplete="on">
                <div className="space-y-1">
                  <Label htmlFor="reg-email">Email</Label>
                  <Input
                    id="reg-email"
                    type="email"
                    placeholder="you@example.com"
                    value={registerForm.email}
                    onChange={(e) => setRegisterForm({ ...registerForm, email: e.target.value })}
                    onBlur={() => touch("email")}
                    className={emailError ? "border-destructive focus-visible:ring-destructive" : ""}
                    autoComplete="email"
                  />
                  <FieldError message={emailError} />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="reg-username">Username</Label>
                  <Input
                    id="reg-username"
                    type="text"
                    placeholder="chef_alex (min. 3 characters)"
                    value={registerForm.username}
                    onChange={(e) => setRegisterForm({ ...registerForm, username: e.target.value })}
                    onBlur={() => touch("username")}
                    className={usernameError ? "border-destructive focus-visible:ring-destructive" : ""}
                    autoComplete="username"
                  />
                  <FieldError message={usernameError} />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="reg-password">Password</Label>
                  <div className="relative">
                    <Input
                      id="reg-password"
                      type={showPasswords.register ? "text" : "password"}
                      placeholder="••••••••"
                      value={registerForm.password}
                      onChange={(e) => setRegisterForm({ ...registerForm, password: e.target.value })}
                      onBlur={() => touch("password")}
                      className={`pr-10 ${passwordError ? "border-destructive focus-visible:ring-destructive" : ""}`}
                      autoComplete="new-password"
                    />
                    <EyeToggle show={showPasswords.register} onToggle={() => setShowPasswords((s) => ({ ...s, register: !s.register }))} />
                  </div>
                  <PasswordStrength password={registerForm.password} />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="reg-confirm">Confirm Password</Label>
                  <div className="relative">
                    <Input
                      id="reg-confirm"
                      type={showPasswords.confirm ? "text" : "password"}
                      placeholder="••••••••"
                      value={registerForm.confirmPassword}
                      onChange={(e) => setRegisterForm({ ...registerForm, confirmPassword: e.target.value })}
                      onBlur={() => touch("confirmPassword")}
                      className={`pr-10 ${confirmError ? "border-destructive focus-visible:ring-destructive" : ""}`}
                      autoComplete="new-password"
                    />
                    <EyeToggle show={showPasswords.confirm} onToggle={() => setShowPasswords((s) => ({ ...s, confirm: !s.confirm }))} />
                  </div>
                  <FieldError message={confirmError} />
                </div>

                {error && <p className="text-sm text-destructive">{error}</p>}

                <Button type="submit" className="w-full" disabled={loading || !registerValid}>
                  {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                  Create Account
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}
