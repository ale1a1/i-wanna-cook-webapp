"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { ChefHat } from "lucide-react"
import Link from "next/link"
import { login } from "@/redux/features/auth/authSlice"
import { useAppDispatch } from "@/redux/hooks"

export default function LoginPage() {
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const router = useRouter()
  const dispatch = useAppDispatch()

  // Check if user is already logged in
  useEffect(() => {
    const savedUser = localStorage.getItem("user")
    if (savedUser) {
      try {
        const user = JSON.parse(savedUser)
        dispatch(login({ username: user.username }))
        router.push("/")
      } catch (e) {
        console.error("Failed to parse saved user")
      }
    }
  }, [dispatch, router])

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault()
    dispatch(login({ username }))
    // Save to localStorage
    localStorage.setItem("user", JSON.stringify({ username }))
    router.push("/")
  }

  const handleQuickLogin = () => {
    dispatch(login({ username: "alessandro" }))
    // Save to localStorage
    localStorage.setItem("user", JSON.stringify({ username: "alessandro" }))
    router.push("/")
  }

  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-64px)]">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-2">
            <ChefHat className="h-12 w-12 text-primary" />
          </div>
          <CardTitle className="text-2xl">Sign in to your account</CardTitle>
          <CardDescription>Find your next delicious meal</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Input
                id="username"
                placeholder="Username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Input
                id="password"
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            <div className="text-sm text-center text-muted-foreground">
              Use these credentials to log in:
              <br />
              Username: alessandro | Password: test123
            </div>

            <Button type="submit" className="w-full">
              Sign in
            </Button>
          </form>

          <div className="mt-4 relative">
            <div className="absolute inset-0 flex items-center">
              <Separator className="w-full" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">Or</span>
            </div>
          </div>

          <Button variant="outline" className="w-full mt-4" onClick={handleQuickLogin}>
            Quick Login (Skip Credentials)
          </Button>
        </CardContent>
        <CardFooter className="flex justify-center">
          <Link href="/" className="text-sm text-primary hover:underline">
            Back to home
          </Link>
        </CardFooter>
      </Card>
    </div>
  )
}
