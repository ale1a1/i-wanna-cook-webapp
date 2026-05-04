"use client"

import { useEffect } from "react"

declare global {
  interface Window {
    chatbaseConfig?: { chatbotId: string }
  }
}

export default function RecipeAssistant() {
  useEffect(() => {
    // Only inject once
    if (document.getElementById("chatbase-script")) return

    window.chatbaseConfig = { chatbotId: "YOUR_CHATBASE_BOT_ID" }

    const script = document.createElement("script")
    script.id = "chatbase-script"
    script.src = "https://www.chatbase.co/embed.min.js"
    script.setAttribute("chatbotId", "YOUR_CHATBASE_BOT_ID")
    script.setAttribute("domain", "www.chatbase.co")
    script.defer = true
    document.body.appendChild(script)

    return () => {
      const el = document.getElementById("chatbase-script")
      if (el) el.remove()
    }
  }, [])

  return null
}
