"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { ChefHat, Loader2, CheckCircle2, Eye, EyeOff, ArrowLeft } from "lucide-react"
import Link from "next/link"

const PASSWORD_RULES = [
  { label: "At least 8 characters", test: (p: string) => p.length >= 8 },
  { label: "One uppercase letter", test: (p: string) => /[A-Z]/.test(p) },
  { label: "One lowercase letter", test: (p: string) => /[a-z]/.test(p) },
  { label: "One number", test: (p: string) => /[0-9]/.test(p) },
  { label: "One special character", test: (p: string) => /[^A-Za-z0-9]/.test(p) },
]

export default function ForgotPasswordPage() {
  const router = useRouter()
  const [step, setStep] = useState<"email" | "code">("email")
  const [email, setEmail] = useState("")
  const [code, setCode] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)

  const passwordValid = PASSWORD_RULES.every((r) => r.test(newPassword))

  const handleRequestCode = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setLoading(true)
    try {
      await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      })
      setStep("code")
    } catch {
      setError("Something went wrong. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    if (!passwordValid) return
    setLoading(true)
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code, newPassword }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error); return }
      setSuccess(true)
      setTimeout(() => router.push("/login"), 2000)
    } catch {
      setError("Something went wrong. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-64px)] px-4">
        <Card className="w-full max-w-md text-center">
          <CardContent className="p-8">
            <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-2">Password Reset!</h2>
            <p className="text-muted-foreground">Redirecting you to login...</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-64px)] px-4 py-8">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-2">
            <ChefHat className="h-12 w-12 text-primary" />
          </div>
          <CardTitle className="text-2xl">
            {step === "email" ? "Forgot Password" : "Reset Password"}
          </CardTitle>
          <CardDescription>
            {step === "email"
              ? "Enter your email and we'll send you a reset code."
              : `Enter the code sent to ${email} and your new password.`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {step === "email" ? (
            <form onSubmit={handleRequestCode} className="space-y-4">
              <div className="space-y-1">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <Button type="submit" className="w-full" disabled={loading}>
                {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Send Reset Code
              </Button>
              <div className="text-center">
                <Link href="/login" className="text-sm text-muted-foreground hover:text-primary hover:underline flex items-center justify-center gap-1">
                  <ArrowLeft className="h-3 w-3" /> Back to login
                </Link>
              </div>
            </form>
          ) : (
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div className="space-y-1">
                <Label htmlFor="code">Reset code</Label>
                <Input
                  id="code"
                  type="text"
                  inputMode="numeric"
                  placeholder="123456"
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  className="text-center text-2xl tracking-widest"
                  required
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="new-password">New password</Label>
                <div className="relative">
                  <Input
                    id="new-password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="pr-10"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((s) => !s)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {newPassword && (
                  <ul className="space-y-1 mt-1">
                    {PASSWORD_RULES.map((rule) => (
                      <li key={rule.label} className={`flex items-center gap-1.5 text-xs ${rule.test(newPassword) ? "text-green-500" : "text-muted-foreground"}`}>
                        {rule.test(newPassword) ? "✓" : "○"} {rule.label}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <Button type="submit" className="w-full" disabled={loading || !passwordValid || code.length < 6}>
                {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Reset Password
              </Button>
              <div className="text-center">
                <button type="button" onClick={() => setStep("email")} className="text-sm text-muted-foreground hover:text-primary hover:underline flex items-center justify-center gap-1 mx-auto">
                  <ArrowLeft className="h-3 w-3" /> Use a different email
                </button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
