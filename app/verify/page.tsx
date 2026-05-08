"use client"

import { Suspense, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { ChefHat, Loader2, CheckCircle2 } from "lucide-react"

function VerifyForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const emailParam = searchParams.get("email") ?? ""

  const [email, setEmail] = useState(emailParam)
  const [code, setCode] = useState("")
  const [loading, setLoading] = useState(false)
  const [resending, setResending] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setLoading(true)
    try {
      const res = await fetch("/api/auth/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code }),
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

  const handleResend = async () => {
    setResending(true)
    setError("")
    try {
      await fetch("/api/auth/verify", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      })
    } catch { /* ignore */ }
    setResending(false)
  }

  if (success) {
    return (
      <Card className="w-full max-w-md text-center">
        <CardContent className="p-8">
          <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">Email Verified!</h2>
          <p className="text-muted-foreground">Redirecting you to login...</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <div className="flex justify-center mb-2">
          <ChefHat className="h-12 w-12 text-primary" />
        </div>
        <CardTitle className="text-2xl">Verify your email</CardTitle>
        <CardDescription>
          We sent a 6-digit code to <strong>{email || "your email"}</strong>. Enter it below.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleVerify} className="space-y-4">
          {!emailParam && (
            <div className="space-y-1">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
          )}
          <div className="space-y-1">
            <Label htmlFor="code">Verification code</Label>
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

          {error && <p className="text-sm text-destructive">{error}</p>}

          <Button type="submit" className="w-full" disabled={loading || code.length !== 6}>
            {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Verify Email
          </Button>

          <div className="text-center">
            <button
              type="button"
              className="text-sm text-muted-foreground hover:text-primary hover:underline"
              onClick={handleResend}
              disabled={resending}
            >
              {resending ? "Sending..." : "Didn't get a code? Resend"}
            </button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}

export default function VerifyPage() {
  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-64px)] px-4 py-8">
      <Suspense fallback={<Loader2 className="h-8 w-8 animate-spin text-primary" />}>
        <VerifyForm />
      </Suspense>
    </div>
  )
}
