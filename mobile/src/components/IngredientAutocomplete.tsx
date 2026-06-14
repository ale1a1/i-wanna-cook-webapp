import React, { useState, useRef, useCallback } from "react"
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from "react-native"
import { useTheme } from "../context/ThemeContext"
import { API_BASE_URL } from "../lib/api"

type Props = {
  onSelect: (name: string) => void
  placeholder?: string
}

export default function IngredientAutocomplete({ onSelect, placeholder }: Props) {
  const { colors } = useTheme()
  const [query, setQuery] = useState("")
  const [suggestions, setSuggestions] = useState<string[]>([])
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const s = makeStyles(colors)

  const fetchSuggestions = useCallback((q: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (!q.trim()) { setSuggestions([]); return }
    debounceRef.current = setTimeout(async () => {
      try {
        const url = `${API_BASE_URL}/api/recipes/ingredient-autocomplete?query=${encodeURIComponent(q.trim())}`
        const res = await fetch(url)
        const data = await res.json()
        setSuggestions(Array.isArray(data) ? data.map((d: any) => d.name as string).filter(Boolean) : [])
      } catch {
        setSuggestions([])
      }
    }, 300)
  }, [])

  const handleChange = (v: string) => {
    setQuery(v)
    fetchSuggestions(v)
  }

  const handleSelect = (name: string) => {
    setSuggestions([])
    setQuery("")
    onSelect(name)
  }

  return (
    <View style={{ zIndex: 999 }}>
      <TextInput
        style={s.input}
        value={query}
        onChangeText={handleChange}
        placeholder={placeholder ?? "Search ingredient..."}
        placeholderTextColor={colors.muted}
        returnKeyType="search"
        autoCorrect={false}
        autoCapitalize="none"
      />
      {suggestions.length > 0 && (
        <View style={s.dropdown}>
          {suggestions.map((name) => (
            <TouchableOpacity key={name} style={s.item} onPress={() => handleSelect(name)} activeOpacity={0.7}>
              <Text style={s.itemText}>{name}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  )
}

const makeStyles = (colors: any) => StyleSheet.create({
  input: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: colors.text,
    fontSize: 14,
  },
  dropdown: {
    position: "absolute",
    top: 46,
    left: 0,
    right: 0,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    zIndex: 999,
    elevation: 12,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  item: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  itemText: {
    fontSize: 14,
    color: colors.text,
  },
})
