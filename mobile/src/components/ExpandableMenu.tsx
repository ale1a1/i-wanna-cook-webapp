import React, { useRef, useEffect } from "react"
import { TouchableOpacity, Animated, StyleSheet } from "react-native"
import { Ionicons } from "@expo/vector-icons"
import { useTheme } from "../context/ThemeContext"

type Props = {
  isOpen: boolean
  onToggle: () => void
}

export default function ExpandableMenu({ isOpen, onToggle }: Props) {
  const { colors } = useTheme()
  const rotation = useRef(new Animated.Value(0)).current

  useEffect(() => {
    Animated.timing(rotation, {
      toValue: isOpen ? 1 : 0,
      duration: 220,
      useNativeDriver: true,
    }).start()
  }, [isOpen])

  const handlePress = () => {
    onToggle()
  }

  const rotateInterpolate = rotation.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "45deg"],
  })

  return (
    <TouchableOpacity onPress={handlePress} style={styles.plusButton} activeOpacity={0.8}>
      <Animated.View style={[styles.plusInner, { backgroundColor: colors.primary, transform: [{ rotate: rotateInterpolate }] }]}>
        <Ionicons name="add" size={26} color="#fff" />
      </Animated.View>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  plusButton: {
    alignItems: "center",
    justifyContent: "center",
    flex: 1,
  },
  plusInner: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#f97316",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 6,
  },
})
