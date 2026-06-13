import React, { useState, useCallback } from "react"
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  ActivityIndicator,
  Modal,
  ScrollView,
} from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { Ionicons } from "@expo/vector-icons"
import * as ImagePicker from "expo-image-picker"
import { useNavigation } from "@react-navigation/native"
import { useTheme } from "../context/ThemeContext"
import { spacing } from "../lib/theme"
import { useGlobalError } from "../context/GlobalErrorContext"
import { API_BASE_URL } from "../lib/api"
import { reportError } from "../lib/reportError"
import { useAuth } from "../context/AuthContext"
import { useSubscription } from "../context/SubscriptionContext"

type Step = "capture" | "review" | "mode" | "filters"

export default function ScanScreen() {
  const { colors } = useTheme()
  const { showError } = useGlobalError()
  const navigation = useNavigation<any>()
  const s = makeStyles(colors)
  const { user } = useAuth()
  const { isPremium } = useSubscription()

  const [step, setStep] = useState<Step>("capture")
  const [capturedAssets, setCapturedAssets] = useState<ImagePicker.ImagePickerAsset[]>([])
  const [analyzing, setAnalyzing] = useState(false)
  const [ingredients, setIngredients] = useState<string[]>([])
  const [mode, setMode] = useState<"all" | "some" | null>(null)

  const openCamera = useCallback(async () => {
    if (capturedAssets.length >= 10) return
    const { status } = await ImagePicker.requestCameraPermissionsAsync()
    if (status !== "granted") { showError("Please allow camera access to scan ingredients.", "Camera"); return }
    const result = await ImagePicker.launchCameraAsync({ base64: true, quality: 0.6 })
    if (!result.canceled) setCapturedAssets(prev => [...prev, ...result.assets])
  }, [capturedAssets.length])

  const openLibrary = useCallback(async () => {
    const remaining = 10 - capturedAssets.length
    if (remaining <= 0) return
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (status !== "granted") { showError("Please allow photo library access to scan ingredients.", "Library"); return }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      selectionLimit: remaining,
      base64: true,
      quality: 0.6,
    })
    if (!result.canceled) setCapturedAssets(prev => [...prev, ...result.assets])
  }, [capturedAssets.length])

  const analyze = useCallback(async () => {
    if (capturedAssets.length === 0) return
    setAnalyzing(true)
    const detected: string[] = []

    try {
      await Promise.all(
        capturedAssets.map(async (asset) => {
          if (!asset.base64) return
          const res = await fetch(`${API_BASE_URL}/api/recipes/analyze-image`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ base64: asset.base64, mimeType: asset.mimeType ?? "image/jpeg", userId: user?.id, isPremium }),
          })
          const data = await res.json()
          if (!res.ok) {
            if (data.code === "SCAN_LIMIT") throw new Error(`You've used all ${data.limit} free scans this week. Upgrade to Premium for unlimited scans.`)
            throw new Error(data.error ?? `Error ${res.status}`)
          }
          if (data.all?.length) detected.push(...data.all)
          else if (data.ingredient) detected.push(data.ingredient)
        })
      )
    } catch (e: any) {
      setAnalyzing(false)
      const msg = e?.message ?? "Network error — couldn't reach the server."
      if (!msg.includes("No ingredients detected")) reportError(msg, "Scan Ingredients")
      showError(msg, "Scan Ingredients")
      return
    }

    setAnalyzing(false)

    if (detected.length === 0) {
      showError("Couldn't identify any ingredients. Try closer photos of individual items.", "Scan Ingredients")
      return
    }

    const unique = Array.from(new Set([...ingredients, ...detected]))
    setIngredients(unique)
    setCapturedAssets([])
    setStep("review")
  }, [capturedAssets, ingredients])

  const reset = () => {
    setStep("capture")
    setCapturedAssets([])
    setIngredients([])
    setMode(null)
  }

  const goSearch = (selectedMode: "all" | "some" | null, openFilters: boolean) => {
    navigation.navigate("Search", {
      scannedIngredients: ingredients,
      searchMode: selectedMode ?? "all",
      openFilters,
    })
  }

  // ── STEP: CAPTURE ──────────────────────────────────────────
  if (step === "capture") return (
    <>
      <SafeAreaView style={[s.container, { backgroundColor: colors.background }]} edges={["top"]}>
        <View style={s.header}>
          <View style={s.headerLeft}>
            <Ionicons name="camera-outline" size={26} color={colors.primary} />
            <Text style={s.headerTitle}>Scan Fridge</Text>
          </View>
        </View>
        <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
          <View style={s.hero}>
            <Ionicons name="camera" size={56} color={colors.primary} />
            <Text style={[s.heroTitle, { color: colors.text }]}>What's in your fridge?</Text>
            <Text style={[s.heroSubtitle, { color: colors.muted }]}>
              Take a picture of your fridge or cupboards and I'll suggest what you should cook.
            </Text>
          </View>

          <View style={s.btns}>
            <TouchableOpacity style={[s.actionBtn, { backgroundColor: colors.card, borderColor: colors.border }]} onPress={openCamera} disabled={capturedAssets.length >= 10} activeOpacity={0.7}>
              <Ionicons name="camera" size={32} color={colors.primary} />
              <Text style={[s.actionBtnText, { color: colors.text }]}>Take photo</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[s.actionBtn, { backgroundColor: colors.card, borderColor: colors.border }]} onPress={openLibrary} disabled={capturedAssets.length >= 10} activeOpacity={0.7}>
              <Ionicons name="images" size={32} color={colors.primary} />
              <Text style={[s.actionBtnText, { color: colors.text }]}>From library</Text>
            </TouchableOpacity>
          </View>

          {capturedAssets.length > 0 && (
            <>
              <Text style={[s.photoCount, { color: colors.muted }]}>
                {capturedAssets.length} photo{capturedAssets.length > 1 ? "s" : ""} added · {10 - capturedAssets.length} more allowed
              </Text>
              <View style={s.thumbsRow}>
                {capturedAssets.map((a, i) => (
                  <View key={i} style={s.thumb}>
                    <Image source={{ uri: a.uri }} style={s.thumbImg} />
                    <TouchableOpacity style={s.thumbRemove} onPress={() => setCapturedAssets(prev => prev.filter((_, idx) => idx !== i))}>
                      <Ionicons name="close-circle" size={20} color="#fff" />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
              <TouchableOpacity style={[s.scanBtn, { backgroundColor: colors.primary }]} onPress={analyze} activeOpacity={0.8}>
                <Ionicons name="flash" size={20} color="#fff" style={{ marginRight: 8 }} />
                <Text style={s.scanBtnText}>Scan now ({capturedAssets.length})</Text>
              </TouchableOpacity>
            </>
          )}
        </ScrollView>
      </SafeAreaView>
      <Modal visible={analyzing} transparent={false} animationType="fade" statusBarTranslucent>
        <View style={s.aiOverlay}>
          <Text style={s.aiEmoji}>🤖</Text>
          <ActivityIndicator size="large" color="#fff" style={{ marginTop: 16 }} />
          <Text style={s.aiText}>AI reading pictures…</Text>
        </View>
      </Modal>
    </>
  )

  // ── STEP: REVIEW ──────────────────────────────────────────
  if (step === "review") return (
    <SafeAreaView style={[s.container, { backgroundColor: colors.background }]} edges={["top"]}>
      <View style={s.stepHeader}>
        <TouchableOpacity onPress={reset}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[s.stepTitle, { color: colors.text }]}>Detected ingredients</Text>
        <View style={{ width: 24 }} />
      </View>
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        <Text style={[s.stepSubtitle, { color: colors.muted }]}>
          Remove anything wrong or take more photos to add more.
        </Text>

        <View style={s.chipsWrap}>
          {ingredients.map((ing, i) => (
            <TouchableOpacity
              key={i}
              style={[s.chipRemovable, { backgroundColor: colors.primary + "22", borderColor: colors.primary }]}
              onPress={() => setIngredients(prev => prev.filter((_, idx) => idx !== i))}
              activeOpacity={0.7}
            >
              <Text style={[s.chipText, { color: colors.primary }]}>{ing}</Text>
              <Ionicons name="close" size={13} color={colors.primary} style={{ marginLeft: 4 }} />
            </TouchableOpacity>
          ))}
        </View>

        <View style={s.morePhotosBtns}>
          <TouchableOpacity style={[s.moreBtn, { borderColor: colors.border, backgroundColor: colors.card }]} onPress={() => { setStep("capture") }} activeOpacity={0.7}>
            <Ionicons name="camera" size={18} color={colors.primary} />
            <Text style={[s.moreBtnText, { color: colors.text }]}>Add more photos</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <View style={[s.footer, { borderTopColor: colors.border, backgroundColor: colors.background }]}>
        <TouchableOpacity
          style={[s.nextBtn, { backgroundColor: ingredients.length === 0 ? colors.muted : colors.primary }]}
          onPress={() => ingredients.length === 1 ? setStep("filters") : setStep("mode")}
          disabled={ingredients.length === 0}
          activeOpacity={0.8}
        >
          <Text style={s.nextBtnText}>Continue ({ingredients.length})</Text>
          <Ionicons name="arrow-forward" size={18} color="#fff" style={{ marginLeft: 8 }} />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  )

  // ── STEP: MODE ──────────────────────────────────────────
  if (step === "mode") return (
    <SafeAreaView style={[s.container, { backgroundColor: colors.background }]} edges={["top"]}>
      <View style={s.stepHeader}>
        <TouchableOpacity onPress={() => setStep("review")}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[s.stepTitle, { color: colors.text }]}>How should we search?</Text>
        <View style={{ width: 24 }} />
      </View>
      <ScrollView contentContainerStyle={[s.scroll, { gap: 16 }]} showsVerticalScrollIndicator={false}>
        <Text style={[s.stepSubtitle, { color: colors.muted }]}>
          You've added {ingredients.length} ingredient{ingredients.length > 1 ? "s" : ""}. How strict should the match be?
        </Text>

        <TouchableOpacity
          style={[s.modeCard, { backgroundColor: colors.card, borderColor: mode === "all" ? colors.primary : colors.border, borderWidth: mode === "all" ? 2 : 1 }]}
          onPress={() => setMode("all")}
          activeOpacity={0.8}
        >
          <Ionicons name="checkmark-done-circle" size={32} color={mode === "all" ? colors.primary : colors.muted} />
          <View style={{ flex: 1 }}>
            <Text style={[s.modeTitle, { color: colors.text }]}>Match all ingredients</Text>
            <Text style={[s.modeSub, { color: colors.muted }]}>Recipes that contain everything you scanned. Fewer results but more precise.</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={[s.modeCard, { backgroundColor: colors.card, borderColor: mode === "some" ? colors.primary : colors.border, borderWidth: mode === "some" ? 2 : 1 }]}
          onPress={() => setMode("some")}
          activeOpacity={0.8}
        >
          <Ionicons name="restaurant" size={32} color={mode === "some" ? colors.primary : colors.muted} />
          <View style={{ flex: 1 }}>
            <Text style={[s.modeTitle, { color: colors.text }]}>Match some ingredients</Text>
            <Text style={[s.modeSub, { color: colors.muted }]}>Recipes that use at least some of these ingredients. More results, more variety.</Text>
          </View>
        </TouchableOpacity>
      </ScrollView>

      <View style={[s.footer, { borderTopColor: colors.border, backgroundColor: colors.background }]}>
        <TouchableOpacity
          style={[s.nextBtn, { backgroundColor: mode === null ? colors.muted : colors.primary }]}
          onPress={() => mode && setStep("filters")}
          disabled={mode === null}
          activeOpacity={0.8}
        >
          <Text style={s.nextBtnText}>Continue</Text>
          <Ionicons name="arrow-forward" size={18} color="#fff" style={{ marginLeft: 8 }} />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  )

  // ── STEP: FILTERS ──────────────────────────────────────────
  return (
    <SafeAreaView style={[s.container, { backgroundColor: colors.background }]} edges={["top"]}>
      <View style={s.stepHeader}>
        <TouchableOpacity onPress={() => ingredients.length === 1 ? setStep("review") : setStep("mode")}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[s.stepTitle, { color: colors.text }]}>Any extra filters?</Text>
        <View style={{ width: 24 }} />
      </View>
      <ScrollView contentContainerStyle={[s.scroll, { gap: 16 }]} showsVerticalScrollIndicator={false}>
        <Text style={[s.stepSubtitle, { color: colors.muted }]}>
          Search straight away, or fine-tune with diet, cuisine, prep time and more.
        </Text>

        <TouchableOpacity
          style={[s.modeCard, { backgroundColor: colors.primary }]}
          onPress={() => goSearch(mode!, false)}
          activeOpacity={0.8}
        >
          <Ionicons name="flash" size={32} color="#fff" />
          <View style={{ flex: 1 }}>
            <Text style={[s.modeTitle, { color: "#fff" }]}>Search now</Text>
            <Text style={[s.modeSub, { color: "rgba(255,255,255,0.7)" }]}>Find recipes right away with your ingredients.</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={[s.modeCard, { backgroundColor: colors.card, borderColor: colors.border }]}
          onPress={() => goSearch(mode!, true)}
          activeOpacity={0.8}
        >
          <Ionicons name="options" size={32} color={colors.primary} />
          <View style={{ flex: 1 }}>
            <Text style={[s.modeTitle, { color: colors.text }]}>Add filters</Text>
            <Text style={[s.modeSub, { color: colors.muted }]}>Open the search screen with your ingredients pre-filled and apply extra filters.</Text>
          </View>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  )
}

const makeStyles = (colors: any) => StyleSheet.create({
  container: { flex: 1 },
  scroll: { padding: 24, gap: 24 },
  hero: { alignItems: "center", gap: 12, paddingTop: 16 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "center", padding: spacing.md, borderBottomWidth: 1.5, borderBottomColor: "rgba(255,255,255,0.4)" },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 8 },
  headerTitle: { fontSize: 20, fontWeight: "700", color: colors.text },
  heroTitle: { fontSize: 26, fontWeight: "700", textAlign: "center" },
  heroSubtitle: { fontSize: 15, textAlign: "center", lineHeight: 22 },
  btns: { flexDirection: "row", gap: 16 },
  actionBtn: { flex: 1, borderWidth: 1.5, borderRadius: 16, padding: 24, alignItems: "center", gap: 10 },
  actionBtnText: { fontSize: 15, fontWeight: "600" },
  photoCount: { fontSize: 13, textAlign: "center" },
  thumbsRow: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  thumb: { width: 80, height: 80, borderRadius: 10, overflow: "hidden" },
  thumbImg: { width: "100%", height: "100%" },
  thumbRemove: { position: "absolute", top: 2, right: 2 },
  scanBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: 16, borderRadius: 14 },
  scanBtnText: { color: "#fff", fontWeight: "700", fontSize: 16 },
  aiOverlay: { flex: 1, backgroundColor: "#000", alignItems: "center", justifyContent: "center" },
  aiEmoji: { fontSize: 72 },
  aiText: { marginTop: 20, fontSize: 18, fontWeight: "700", color: "#fff" },
  stepHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 16, borderBottomWidth: 1, borderBottomColor: colors.border },
  stepTitle: { fontSize: 17, fontWeight: "700" },
  stepSubtitle: { fontSize: 14, lineHeight: 20 },
  chipsWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chipRemovable: { flexDirection: "row", alignItems: "center", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 99, borderWidth: 1 },
  chipText: { fontSize: 13, fontWeight: "500" },
  morePhotosBtns: { flexDirection: "row", gap: 12 },
  moreBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, borderWidth: 1.5, borderRadius: 12, paddingVertical: 12 },
  moreBtnText: { fontSize: 14, fontWeight: "600" },
  footer: { padding: 16, borderTopWidth: 1 },
  nextBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: 16, borderRadius: 14 },
  nextBtnText: { color: "#fff", fontWeight: "700", fontSize: 16 },
  modeCard: { flexDirection: "row", alignItems: "center", gap: 16, padding: 20, borderRadius: 16, borderWidth: 1 },
  modeTitle: { fontSize: 16, fontWeight: "700", marginBottom: 4 },
  modeSub: { fontSize: 13, lineHeight: 18 },
})
