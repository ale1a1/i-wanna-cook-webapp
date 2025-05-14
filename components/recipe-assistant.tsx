"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { X } from "lucide-react"
import { useRouter } from "next/navigation"

type Message = {
  role: "user" | "assistant"
  content: string
}

export default function RecipeAssistant() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: "Hi there! I'm your recipe assistant. How can I help you today?",
    },
  ])
  const [input, setInput] = useState("")
  const router = useRouter()

  // Load messages from localStorage on component mount
  useEffect(() => {
    const savedMessages = localStorage.getItem("chatMessages")
    if (savedMessages) {
      try {
        setMessages(JSON.parse(savedMessages))
      } catch (e) {
        console.error("Failed to parse saved messages")
      }
    }
  }, [])

  // Save messages to localStorage when they change
  useEffect(() => {
    if (messages.length > 1) {
      // Only save if we have more than the initial message
      localStorage.setItem("chatMessages", JSON.stringify(messages))
    }
  }, [messages])

  const handleSendMessage = () => {
    if (!input.trim()) return

    // Add user message
    setMessages((prev) => [...prev, { role: "user", content: input }])

    // Simulate assistant response
    setTimeout(() => {
      let response = "I'm sorry, I don't have an answer for that yet."

      if (input.toLowerCase().includes("dinner")) {
        response =
          "Great! I can help with dinner ideas. What kind of cuisine are you in the mood for? Or do you have any dietary restrictions?"
      } else if (input.toLowerCase().includes("breakfast")) {
        response =
          "Breakfast is the most important meal of the day! Are you looking for something quick or do you have time for a more elaborate breakfast?"
      } else if (input.toLowerCase().includes("ingredient") || input.toLowerCase().includes("have")) {
        response =
          "To find recipes with specific ingredients, you can use the ingredients filter on the left sidebar. Just type in what you have!"
      }

      setMessages((prev) => [...prev, { role: "assistant", content: response }])
    }, 1000)

    setInput("")
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const closeAssistant = () => {
    router.push("/")
  }

  return (
    <Card className="fixed bottom-4 right-4 w-80 md:w-96 h-96 flex flex-col shadow-lg">
      <CardHeader className="p-3 border-b">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Recipe Assistant</CardTitle>
          <Button variant="ghost" size="icon" onClick={closeAssistant}>
            <X className="h-4 w-4" />
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">Ask me anything about cooking!</p>
      </CardHeader>

      <CardContent className="flex-1 overflow-y-auto p-3 space-y-4">
        {messages.map((message, index) => (
          <div key={index} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[80%] rounded-lg p-3 ${
                message.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted"
              }`}
            >
              {message.content}
            </div>
          </div>
        ))}
      </CardContent>

      <div className="p-3 border-t">
        <div className="flex gap-2">
          <Input
            placeholder="Type your message..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          <Button size="icon" onClick={handleSendMessage}>
            <span className="sr-only">Send</span>
            <svg width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path
                d="M1.20308 1.04312C1.00481 0.954998 0.772341 1.0048 0.627577 1.16641C0.482813 1.32802 0.458794 1.56455 0.568117 1.75196L3.92115 7.50002L0.568117 13.2481C0.458794 13.4355 0.482813 13.672 0.627577 13.8336C0.772341 13.9952 1.00481 14.045 1.20308 13.9569L14.7031 7.95693C14.8836 7.87668 15 7.69762 15 7.50002C15 7.30243 14.8836 7.12337 14.7031 7.04312L1.20308 1.04312ZM4.84553 7.10002L2.21234 2.586L13.2689 7.50002L2.21234 12.414L4.84552 7.90002H9C9.22092 7.90002 9.4 7.72094 9.4 7.50002C9.4 7.27911 9.22092 7.10002 9 7.10002H4.84553Z"
                fill="currentColor"
                fillRule="evenodd"
                clipRule="evenodd"
              ></path>
            </svg>
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mt-2 text-center">
          This is a demo chatbot. In a real app, this would connect to Chatbase.
        </p>
      </div>
    </Card>
  )
}
