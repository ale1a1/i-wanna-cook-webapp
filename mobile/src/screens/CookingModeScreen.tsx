import React, { useEffect, useRef, useState, useCallback } from "react"
import {
  View, Text, StyleSheet, TouchableOpacity,
  Animated, Easing,
} from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import * as Speech from "expo-speech"
import { Ionicons } from "@expo/vector-icons"
import { useNavigation, useRoute } from "@react-navigation/native"
import { useTheme } from "../context/ThemeContext"
import { spacing, radius } from "../lib/theme"

type Step = { number: number; step: string }

let SpeechRecognitionModule: any = null
let useSpeechRecognitionEventHook: any = null
try {
  const mod = require("expo-speech-recognition")
  SpeechRecognitionModule = mod.ExpoSpeechRecognitionModule
  useSpeechRecognitionEventHook = mod.useSpeechRecognitionEvent
} catch {
  // Expo Go — voice unavailable
}

function useSpeechEvent(event: string, handler: (e: any) => void) {
  if (useSpeechRecognitionEventHook) {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    useSpeechRecognitionEventHook(event, handler)
  }
}

export default function CookingModeScreen() {
  const navigation = useNavigation<any>()
  const route = useRoute<any>()
  const { steps, recipeTitle } = route.params as { steps: Step[]; recipeTitle: string }
  const { colors } = useTheme()
  const s = makeStyles(colors)

  const [currentIndex, setCurrentIndex] = useState(0)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [isListening, setIsListening] = useState(false)
  const [voiceHint, setVoiceHint] = useState("")
  const [micPermission, setMicPermission] = useState<"unknown" | "granted" | "denied">("unknown")

  const voiceAvailable = SpeechRecognitionModule !== null
  const isSpeakingRef = useRef(false)
  const isListeningRef = useRef(false)
  const shouldRestartRef = useRef(true) // false when user exits or voice paused intentionally
  const bounceAnim = useRef(new Animated.Value(0)).current
  const pulseAnim = useRef(new Animated.Value(1)).current
  const bounceLoop = useRef<Animated.CompositeAnimation | null>(null)
  const voiceHintTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Keep refs in sync with state so callbacks always see latest values
  useEffect(() => { isSpeakingRef.current = isSpeaking }, [isSpeaking])
  useEffect(() => { isListeningRef.current = isListening }, [isListening])

  const currentStep = steps[currentIndex]
  const isFirst = currentIndex === 0
  const isLast = currentIndex === steps.length - 1

  // --- Avatar bounce ---
  const startBounce = useCallback(() => {
    bounceLoop.current = Animated.loop(
      Animated.sequence([
        Animated.timing(bounceAnim, { toValue: -14, duration: 300, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        Animated.timing(bounceAnim, { toValue: 0, duration: 300, easing: Easing.in(Easing.quad), useNativeDriver: true }),
      ])
    )
    bounceLoop.current.start()
  }, [bounceAnim])

  const stopBounce = useCallback(() => {
    bounceLoop.current?.stop()
    Animated.timing(bounceAnim, { toValue: 0, duration: 150, useNativeDriver: true }).start()
  }, [bounceAnim])

  // --- Mic pulse ---
  const startPulse = useCallback(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.2, duration: 800, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      ])
    ).start()
  }, [pulseAnim])

  const stopPulse = useCallback(() => {
    pulseAnim.stopAnimation()
    Animated.timing(pulseAnim, { toValue: 1, duration: 150, useNativeDriver: true }).start()
  }, [pulseAnim])

  // --- Voice: start listening ---
  const startListening = useCallback(() => {
    if (!voiceAvailable || isListeningRef.current || isSpeakingRef.current) return
    try {
      SpeechRecognitionModule.start({ lang: "en-US", interimResults: false, continuous: false })
      setIsListening(true)
      startPulse()
    } catch {
      // ignore if already started
    }
  }, [voiceAvailable, startPulse])

  const stopListening = useCallback(() => {
    if (!voiceAvailable || !isListeningRef.current) return
    try {
      SpeechRecognitionModule.stop()
    } catch {}
    setIsListening(false)
    stopPulse()
  }, [voiceAvailable, stopPulse])

  // --- Request permission + kick off always-on listening ---
  const initVoice = useCallback(async () => {
    if (!voiceAvailable) return
    const { granted } = await SpeechRecognitionModule.requestPermissionsAsync()
    if (granted) {
      setMicPermission("granted")
      shouldRestartRef.current = true
      startListening()
    } else {
      setMicPermission("denied")
    }
  }, [voiceAvailable, startListening])

  // --- TTS ---
  const speakStep = useCallback((index: number) => {
    // Pause listening while speaking so TTS doesn't trigger itself
    stopListening()
    Speech.stop()
    const text = `Step ${steps[index].number}. ${steps[index].step}`
    setIsSpeaking(true)
    startBounce()
    Speech.speak(text, {
      rate: 0.9,
      onDone: () => {
        setIsSpeaking(false)
        stopBounce()
        // Resume listening after speaking
        if (shouldRestartRef.current) setTimeout(startListening, 500)
      },
      onStopped: () => {
        setIsSpeaking(false)
        stopBounce()
        if (shouldRestartRef.current) setTimeout(startListening, 500)
      },
      onError: () => {
        setIsSpeaking(false)
        stopBounce()
        if (shouldRestartRef.current) setTimeout(startListening, 500)
      },
    })
  }, [steps, startBounce, stopBounce, stopListening, startListening])

  const stopSpeaking = useCallback(() => {
    Speech.stop()
    setIsSpeaking(false)
    stopBounce()
  }, [stopBounce])

  const toggleSpeaking = useCallback(() => {
    if (isSpeaking) {
      stopSpeaking()
      if (shouldRestartRef.current) setTimeout(startListening, 300)
    } else {
      speakStep(currentIndex)
    }
  }, [isSpeaking, currentIndex, speakStep, stopSpeaking, startListening])

  // Auto-speak on mount + init voice
  useEffect(() => {
    const t = setTimeout(() => speakStep(0), 600)
    initVoice()
    return () => {
      shouldRestartRef.current = false
      clearTimeout(t)
      Speech.stop()
      if (voiceAvailable) {
        try { SpeechRecognitionModule.stop() } catch {}
      }
    }
  }, [])

  // --- Step navigation ---
  const goNext = useCallback((fromVoice = false) => {
    if (isLast) {
      if (fromVoice) showHint("That was the last step!")
      return
    }
    stopSpeaking()
    const next = currentIndex + 1
    setCurrentIndex(next)
    setTimeout(() => speakStep(next), 300)
  }, [currentIndex, isLast, speakStep, stopSpeaking])

  const goPrev = useCallback((fromVoice = false) => {
    if (isFirst) {
      if (fromVoice) showHint("Already on the first step!")
      return
    }
    stopSpeaking()
    const prev = currentIndex - 1
    setCurrentIndex(prev)
    setTimeout(() => speakStep(prev), 300)
  }, [currentIndex, isFirst, speakStep, stopSpeaking])

  const repeatStep = useCallback(() => {
    stopSpeaking()
    setTimeout(() => speakStep(currentIndex), 200)
  }, [currentIndex, speakStep, stopSpeaking])

  // --- Voice hint banner ---
  const showHint = (msg: string) => {
    setVoiceHint(msg)
    if (voiceHintTimer.current) clearTimeout(voiceHintTimer.current)
    voiceHintTimer.current = setTimeout(() => setVoiceHint(""), 2500)
  }

  // --- Parse voice command ---
  const handleTranscript = useCallback((transcript: string) => {
    const t = transcript.toLowerCase().trim()
    if (t.includes("next") || t.includes("continue") || t.includes("forward")) {
      showHint("Next step"); goNext(true)
    } else if (t.includes("previous") || t.includes("back") || t.includes("before") || t.includes("go back")) {
      showHint("Previous step"); goPrev(true)
    } else if (t.includes("repeat") || t.includes("again")) {
      showHint("Repeating..."); repeatStep()
    } else if (t.includes("stop") || t.includes("pause") || t.includes("quiet") || t.includes("shut up")) {
      showHint("Stopped"); stopSpeaking(); setTimeout(startListening, 300)
    } else if (t.includes("play") || t.includes("resume") || t.includes("continue reading")) {
      showHint("Playing"); speakStep(currentIndex)
    } else if (t.length > 0) {
      showHint(`"${t}" — say: next, previous, repeat, stop`)
      // Restart listening after unrecognised command
      setTimeout(startListening, 500)
    }
  }, [goNext, goPrev, repeatStep, stopSpeaking, speakStep, startListening, currentIndex])

  // --- Speech recognition events ---
  useSpeechEvent("result", (event: any) => {
    const transcript = event.results?.[0]?.transcript ?? ""
    if (event.isFinal && transcript) {
      setIsListening(false)
      stopPulse()
      handleTranscript(transcript)
    }
  })

  // Auto-restart listening when session ends (unless we stopped it intentionally)
  useSpeechEvent("end", () => {
    setIsListening(false)
    stopPulse()
    if (shouldRestartRef.current && !isSpeakingRef.current) {
      setTimeout(startListening, 400)
    }
  })

  useSpeechEvent("error", (_event: any) => {
    setIsListening(false)
    stopPulse()
    // "no-speech" is normal — just restart
    if (shouldRestartRef.current && !isSpeakingRef.current) {
      setTimeout(startListening, 800)
    }
  })

  const handleExit = () => {
    shouldRestartRef.current = false
    stopSpeaking()
    stopListening()
    navigation.goBack()
  }

  return (
    <SafeAreaView style={s.container}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={handleExit} style={s.backBtn}>
          <Ionicons name="close" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={s.headerTitle} numberOfLines={1}>{recipeTitle}</Text>
        {/* Mic status indicator */}
        <Animated.View style={[s.micIndicator, { transform: [{ scale: pulseAnim }] }]}>
          <Ionicons
            name={isListening ? "mic" : "mic-off-outline"}
            size={18}
            color={isListening ? colors.primary : colors.mutedForeground}
          />
        </Animated.View>
      </View>

      {/* Progress */}
      <View style={s.stepCounter}>
        <Text style={s.stepCounterText}>Step {currentStep.number} of {steps.length}</Text>
        <View style={s.progressBar}>
          {steps.map((_, i) => (
            <View key={i} style={[s.progressDot, i === currentIndex && s.progressDotActive, i < currentIndex && s.progressDotDone]} />
          ))}
        </View>
      </View>

      {/* Avatar */}
      <View style={s.avatarContainer}>
        <Animated.View style={{ transform: [{ translateY: bounceAnim }] }}>
          <View style={[s.avatarBubble, isSpeaking && s.avatarBubbleSpeaking, isListening && !isSpeaking && s.avatarBubbleListening]}>
            <Text style={s.avatarEmoji}>👨‍🍳</Text>
          </View>
        </Animated.View>
        {isSpeaking && (
          <View style={s.speakingDots}>
            <SpeakingDot delay={0} colors={colors} />
            <SpeakingDot delay={150} colors={colors} />
            <SpeakingDot delay={300} colors={colors} />
          </View>
        )}
        {!isSpeaking && isListening && (
          <Text style={s.listeningLabel}>Listening...</Text>
        )}
      </View>

      {/* Step card */}
      <View style={s.stepCard}>
        <Text style={s.stepNumber}>Step {currentStep.number}</Text>
        <Text style={s.stepText}>{currentStep.step}</Text>
      </View>

      {/* Voice hint banner */}
      {voiceHint ? (
        <View style={s.voiceHint}>
          <Ionicons name="mic" size={14} color={colors.primary} />
          <Text style={s.voiceHintText}>{voiceHint}</Text>
        </View>
      ) : (
        micPermission === "denied" ? (
          <View style={s.voiceHint}>
            <Ionicons name="mic-off" size={14} color={colors.mutedForeground} />
            <Text style={[s.voiceHintText, { color: colors.mutedForeground }]}>Mic permission denied — use buttons</Text>
          </View>
        ) : <View style={{ height: 34 }} />
      )}

      {/* Main controls */}
      <View style={s.controls}>
        <TouchableOpacity style={[s.navBtn, isFirst && s.navBtnDisabled]} onPress={() => goPrev()} disabled={isFirst}>
          <Ionicons name="chevron-back" size={26} color={isFirst ? colors.muted : colors.text} />
        </TouchableOpacity>
        <TouchableOpacity style={[s.playBtn, isSpeaking && s.playBtnActive]} onPress={toggleSpeaking}>
          <Ionicons name={isSpeaking ? "pause" : "play"} size={28} color="#fff" />
        </TouchableOpacity>
        <TouchableOpacity style={[s.navBtn, isLast && s.navBtnDisabled]} onPress={() => goNext()} disabled={isLast}>
          <Ionicons name="chevron-forward" size={26} color={isLast ? colors.muted : colors.text} />
        </TouchableOpacity>
      </View>

      {/* Repeat + Exit */}
      <View style={s.bottomRow}>
        <TouchableOpacity style={s.secondaryBtn} onPress={repeatStep}>
          <Ionicons name="refresh" size={18} color={colors.primary} />
          <Text style={s.secondaryBtnText}>Repeat</Text>
        </TouchableOpacity>
        <TouchableOpacity style={s.secondaryBtn} onPress={handleExit}>
          <Ionicons name="exit-outline" size={18} color={colors.mutedForeground} />
          <Text style={[s.secondaryBtnText, { color: colors.mutedForeground }]}>Exit</Text>
        </TouchableOpacity>
      </View>

      <Text style={s.commandsHint}>
        Say: next · previous · repeat · stop · play
      </Text>
    </SafeAreaView>
  )
}

function SpeakingDot({ delay, colors }: { delay: number; colors: any }) {
  const anim = useRef(new Animated.Value(0)).current
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(anim, { toValue: -6, duration: 300, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0, duration: 300, useNativeDriver: true }),
      ])
    )
    loop.start()
    return () => loop.stop()
  }, [])
  return <Animated.View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primary, marginHorizontal: 2, transform: [{ translateY: anim }] }} />
}

const makeStyles = (colors: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.border },
  backBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  headerTitle: { flex: 1, fontSize: 16, fontWeight: "700", color: colors.text, textAlign: "center" },
  micIndicator: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  stepCounter: { alignItems: "center", paddingTop: spacing.md, paddingHorizontal: spacing.lg },
  stepCounterText: { fontSize: 13, color: colors.mutedForeground, fontWeight: "600", marginBottom: 10 },
  progressBar: { flexDirection: "row", gap: 6, flexWrap: "wrap", justifyContent: "center" },
  progressDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.border },
  progressDotActive: { backgroundColor: colors.primary, width: 20 },
  progressDotDone: { backgroundColor: colors.primary + "66" },
  avatarContainer: { alignItems: "center", marginTop: spacing.xl, marginBottom: spacing.sm, height: 120 },
  avatarBubble: { width: 96, height: 96, borderRadius: 48, backgroundColor: colors.card, alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: colors.border },
  avatarBubbleSpeaking: { borderColor: colors.primary, borderWidth: 3 },
  avatarBubbleListening: { borderColor: colors.green, borderWidth: 3 },
  avatarEmoji: { fontSize: 52 },
  speakingDots: { flexDirection: "row", alignItems: "flex-end", marginTop: 8, height: 20 },
  listeningLabel: { marginTop: 8, fontSize: 12, color: colors.green, fontWeight: "600" },
  stepCard: { marginHorizontal: spacing.md, marginTop: spacing.md, backgroundColor: colors.card, borderRadius: radius.lg, padding: spacing.lg, borderWidth: 1, borderColor: colors.border, minHeight: 140 },
  stepNumber: { fontSize: 12, fontWeight: "700", color: colors.primary, textTransform: "uppercase", letterSpacing: 1, marginBottom: 10 },
  stepText: { fontSize: 17, color: colors.text, lineHeight: 26, fontWeight: "500" },
  voiceHint: { flexDirection: "row", alignItems: "center", gap: 6, alignSelf: "center", marginTop: spacing.sm, backgroundColor: colors.primary + "22", paddingHorizontal: 14, paddingVertical: 6, borderRadius: 99, height: 34 },
  voiceHintText: { fontSize: 13, color: colors.primary, fontWeight: "600" },
  controls: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing.xl, marginTop: spacing.lg },
  navBtn: { width: 52, height: 52, borderRadius: 26, backgroundColor: colors.card, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: colors.border },
  navBtnDisabled: { opacity: 0.35 },
  playBtn: { width: 68, height: 68, borderRadius: 34, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center", elevation: 4 },
  playBtnActive: { backgroundColor: colors.muted },
  bottomRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-around", paddingHorizontal: spacing.xl, marginTop: spacing.lg },
  secondaryBtn: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 14, paddingVertical: 10, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card },
  secondaryBtnText: { fontSize: 13, fontWeight: "600", color: colors.primary },
  commandsHint: { textAlign: "center", fontSize: 12, color: colors.mutedForeground, marginTop: spacing.md, paddingHorizontal: spacing.lg },
})
