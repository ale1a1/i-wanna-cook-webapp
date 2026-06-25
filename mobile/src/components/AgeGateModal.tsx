import React, { useEffect, useState } from "react"
import { Modal, View, Text, TouchableOpacity, StyleSheet } from "react-native"
import AsyncStorage from "@react-native-async-storage/async-storage"
import { useNavigation } from "@react-navigation/native"
import { useAuth } from "../context/AuthContext"
import { useTheme } from "../context/ThemeContext"
import { apiFetch } from "../lib/api"

const GUEST_KEY = "age_gate_accepted_guest"

export default function AgeGateModal({ onAccepted }: { onAccepted?: () => void }) {
  const { user, setAgeVerified } = useAuth()
  const { colors } = useTheme()
  const navigation = useNavigation<any>()
  const [needsAgeGate, setNeedsAgeGate] = useState(false)
  const [onLegal, setOnLegal] = useState(false)
  const [blocked, setBlocked] = useState(false)

  const visible = needsAgeGate && !onLegal

  useEffect(() => {
    checkAgeGate()
  }, [user])

  useEffect(() => {
    const unsubscribe = navigation.addListener("state", () => {
      const state = navigation.getState()
      const topRoute = state?.routes?.[state.index]?.name
      setOnLegal(topRoute === "Legal")
    })
    return unsubscribe
  }, [navigation])

  async function checkAgeGate() {
    // Logged-in user: already verified in DB
    if (user) {
      if (!user.ageVerifiedAt) setNeedsAgeGate(true)
      return
    }
    // Guest: check AsyncStorage
    // TODO: TESTING ONLY — remove next line and uncomment the two below before launch
    setNeedsAgeGate(true)
    // const accepted = await AsyncStorage.getItem(GUEST_KEY)
    // if (!accepted) setNeedsAgeGate(true)
  }

  async function handleYes() {
    const now = new Date().toISOString()

    if (user) {
      try {
        const res = await apiFetch("/api/age-verify", {
          method: "POST",
          body: JSON.stringify({ userId: user.id }),
          screen: "AgeGate",
        })
        if (res.ok) {
          const data = await res.json()
          await setAgeVerified(data.age_verified_at ?? now)
        }
      } catch {}
    }

    await AsyncStorage.setItem(GUEST_KEY, now)
    setNeedsAgeGate(false)
    onAccepted?.()
  }

  function handleNo() {
    setNeedsAgeGate(false)
    setBlocked(true)
  }

  if (blocked) {
    return (
      <Modal visible transparent animationType="fade">
        <View style={ag.backdrop}>
          <View style={[ag.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[ag.title, { color: colors.text }]}>Access restricted</Text>
            <Text style={[ag.body, { color: colors.mutedForeground }]}>
              This app is only available to users aged 18 and over. You must close the app to exit.
            </Text>
          </View>
        </View>
      </Modal>
    )
  }

  if (!visible) return null

  return (
    <Modal visible transparent animationType="fade">
      <View style={ag.backdrop}>
        <View style={[ag.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[ag.title, { color: colors.text }]}>Are you 18 or over?</Text>
          <Text style={[ag.body, { color: colors.mutedForeground }]}>
            This app includes wine pairing recommendations and is intended for adults aged 18 and over.
          </Text>
          <View style={ag.row}>
            <TouchableOpacity
              style={[ag.btn, ag.btnNo, { borderColor: colors.border }]}
              onPress={handleNo}
            >
              <Text style={[ag.btnNoText, { color: colors.text }]}>No</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[ag.btn, ag.btnYes, { backgroundColor: colors.primary }]}
              onPress={handleYes}
            >
              <Text style={ag.btnYesText}>Yes, I'm 18+</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  )
}

const ag = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.85)", justifyContent: "center", alignItems: "center", padding: 24 },
  card: { width: "100%", borderRadius: 16, borderWidth: 1.5, padding: 24, gap: 16 },
  title: { fontSize: 20, fontWeight: "800" },
  body: { fontSize: 14, lineHeight: 22 },
  row: { flexDirection: "row", gap: 12, marginTop: 4 },
  btn: { flex: 1, paddingVertical: 13, borderRadius: 10, alignItems: "center" },
  btnNo: { borderWidth: 1.5 },
  btnYes: {},
  btnNoText: { fontWeight: "700", fontSize: 15 },
  btnYesText: { color: "#fff", fontWeight: "700", fontSize: 15 },
})
