import React, { useEffect, useState } from "react"
import { Modal, View, Text, TouchableOpacity, StyleSheet, ScrollView, Linking } from "react-native"
import AsyncStorage from "@react-native-async-storage/async-storage"
import { useAuth } from "../context/AuthContext"
import { useTheme } from "../context/ThemeContext"

const GUEST_KEY = "disclaimer_accepted_guest"

export default function DisclaimerModal() {
  const { user } = useAuth()
  const { colors } = useTheme()
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    checkDisclaimer()
  }, [user])

  async function checkDisclaimer() {
    // Registered users have disclaimer stored in DB at registration — no modal needed
    if (user) return

    // Guests: check AsyncStorage
    const accepted = await AsyncStorage.getItem(GUEST_KEY)
    if (!accepted) setVisible(true)
  }

  async function handleAccept() {
    await AsyncStorage.setItem(GUEST_KEY, new Date().toISOString())
    setVisible(false)
  }

  if (!visible) return null

  return (
    <Modal visible transparent animationType="fade">
      <View style={dm.backdrop}>
        <View style={[dm.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[dm.title, { color: colors.text }]}>Before you continue</Text>
          <ScrollView style={dm.scroll} showsVerticalScrollIndicator={false}>
            <Text style={[dm.body, { color: colors.mutedForeground }]}>
              Nutrition and allergen information shown in this app is approximate and sourced from third-party databases. It is{" "}
              <Text style={{ fontWeight: "700", color: colors.text }}>not a substitute for professional dietary or medical advice.</Text>
              {"\n\n"}
              If you have allergies, intolerances, or any medical condition affected by diet, always verify ingredients independently before cooking or eating.{"\n\n"}
              By continuing you agree to our{" "}
              <Text style={[dm.link, { color: colors.primary }]} onPress={() => Linking.openURL("https://whatshouldIcook.app/terms")}>Terms of Service</Text>
              {" "}and{" "}
              <Text style={[dm.link, { color: colors.primary }]} onPress={() => Linking.openURL("https://whatshouldIcook.app/privacy")}>Privacy Policy</Text>.
            </Text>
          </ScrollView>
          <TouchableOpacity
            style={[dm.btn, { backgroundColor: colors.primary }]}
            onPress={handleAccept}
          >
            <Text style={dm.btnText}>I understand and agree</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  )
}

const dm = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.7)", justifyContent: "center", alignItems: "center", padding: 24 },
  card: { width: "100%", borderRadius: 16, borderWidth: 1.5, padding: 24, gap: 16, maxHeight: "75%" as any },
  title: { fontSize: 20, fontWeight: "800" },
  scroll: { flexShrink: 1 },
  body: { fontSize: 14, lineHeight: 22 },
  link: { textDecorationLine: "underline" },
  btn: { paddingVertical: 13, borderRadius: 10, alignItems: "center", marginTop: 4 },
  btnText: { color: "#fff", fontWeight: "700", fontSize: 15 },
})
