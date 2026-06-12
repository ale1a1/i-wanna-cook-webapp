import React, { useRef, useState, useCallback } from "react"
import { View, Text, TouchableOpacity, Animated, StyleSheet, Dimensions } from "react-native"
import { Ionicons } from "@expo/vector-icons"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { useTheme } from "../context/ThemeContext"

const SCREEN_WIDTH = Dimensions.get("window").width
const TAB_BAR_HEIGHT = 72
// 4 tabs + 1 swap button
const SLOT_WIDTH = SCREEN_WIDTH / 5

export type TabItem = {
  name: string
  label: string
  icon: keyof typeof Ionicons.glyphMap
  badge?: number
}

type Props = {
  page1: TabItem[]
  page2: TabItem[]
  activeRoute: string
  onNavigate: (name: string) => void
}

export default function SlidingTabBar({ page1, page2, activeRoute, onNavigate }: Props) {
  const { colors } = useTheme()
  const insets = useSafeAreaInsets()
  const [currentPage, setCurrentPage] = useState(0)
  const slideAnim = useRef(new Animated.Value(0)).current
  const spinAnim = useRef(new Animated.Value(0)).current
  const s = makeStyles(colors)

  const toggle = useCallback(() => {
    const next = currentPage === 0 ? 1 : 0
    setCurrentPage(next)

    Animated.parallel([
      Animated.spring(slideAnim, {
        toValue: next === 0 ? 0 : -SCREEN_WIDTH,
        useNativeDriver: true,
        tension: 68,
        friction: 12,
      }),
      Animated.timing(spinAnim, {
        toValue: next,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start()
  }, [currentPage, slideAnim, spinAnim])

  const spin = spinAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "180deg"],
  })

  const renderTab = (item: TabItem) => {
    const isActive = activeRoute === item.name
    const color = isActive ? colors.primary : colors.muted
    return (
      <TouchableOpacity
        key={item.name}
        style={s.tab}
        onPress={() => onNavigate(item.name)}
        activeOpacity={0.7}
      >
        <View>
          <Ionicons name={item.icon} size={26} color={color} />
          {item.badge != null && item.badge > 0 && (
            <View style={s.badge}>
              <Text style={s.badgeText}>{item.badge}</Text>
            </View>
          )}
        </View>
        <Text style={[s.label, { color }]}>{item.label}</Text>
      </TouchableOpacity>
    )
  }

  const swapButton = (
    <TouchableOpacity key="swap" style={s.swapSlot} onPress={toggle} activeOpacity={0.85}>
      <Animated.View style={[s.swapBtn, { transform: [{ rotate: spin }] }]}>
        <Ionicons name="ellipsis-horizontal" size={22} color="#fff" />
      </Animated.View>
    </TouchableOpacity>
  )

  return (
    <View style={[s.container, { height: TAB_BAR_HEIGHT + insets.bottom }]}>
      <View style={s.topBorder} />
      <View style={s.overflow}>
        <Animated.View style={[s.track, { transform: [{ translateX: slideAnim }] }]}>
          {/* Page 1 */}
          <View style={s.page}>
            {page1.map(renderTab)}
            {swapButton}
          </View>
          {/* Page 2 — swap button still on the right, slides in */}
          <View style={s.page}>
            {page2.map(renderTab)}
            {swapButton}
          </View>
        </Animated.View>
      </View>
      <View style={{ height: insets.bottom, backgroundColor: colors.card }} />
    </View>
  )
}

const makeStyles = (colors: any) => StyleSheet.create({
  container: {
    backgroundColor: colors.card,
    position: "absolute",
    bottom: 0, left: 0, right: 0,
  },
  topBorder: {
    height: 1.5,
    backgroundColor: "rgba(255,255,255,0.4)",
  },
  overflow: {
    height: TAB_BAR_HEIGHT,
    overflow: "hidden",
  },
  track: {
    flexDirection: "row",
    width: SCREEN_WIDTH * 2,
    height: TAB_BAR_HEIGHT,
  },
  page: {
    width: SCREEN_WIDTH,
    height: TAB_BAR_HEIGHT,
    flexDirection: "row",
    alignItems: "center",
    paddingTop: 10,
    paddingBottom: 10,
  },
  tab: {
    width: SLOT_WIDTH,
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
  },
  swapSlot: {
    width: SLOT_WIDTH,
    alignItems: "center",
    justifyContent: "center",
  },
  swapBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: colors.primary,
    shadowOpacity: 0.5,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 6,
  },
  label: {
    fontSize: 10,
    fontWeight: "500",
    marginTop: -2,
  },
  badge: {
    position: "absolute",
    top: -4, right: -8,
    backgroundColor: colors.primary,
    borderRadius: 8,
    minWidth: 16, height: 16,
    alignItems: "center", justifyContent: "center",
    paddingHorizontal: 3,
  },
  badgeText: {
    color: "#fff", fontSize: 10, fontWeight: "700",
  },
})
