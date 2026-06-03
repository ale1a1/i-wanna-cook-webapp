import React, { useRef, useState } from "react"
import { View, PanResponder, Animated } from "react-native"

interface Props<T> {
  data: T[]
  keyExtractor: (item: T) => string
  renderItem: (item: T, index: number, isDragging: boolean) => React.ReactNode
  itemHeight: number
  onReorder: (newData: T[]) => void
}

export default function DraggableList<T>({
  data,
  keyExtractor,
  renderItem,
  itemHeight,
  onReorder,
}: Props<T>) {
  const [draggingIndex, setDraggingIndex] = useState(-1)
  const [hoverIndex, setHoverIndex] = useState(-1)
  const dragY = useRef(new Animated.Value(0)).current
  const startY = useRef(0)
  const currentDragIndex = useRef(-1)
  // Keep latest data accessible inside pan responder callbacks without stale closure
  const dataRef = useRef(data)
  dataRef.current = data

  const getDisplayOrder = (): number[] => {
    if (draggingIndex === -1 || hoverIndex === -1 || draggingIndex === hoverIndex) {
      return data.map((_, i) => i)
    }
    const order = data.map((_, i) => i)
    order.splice(draggingIndex, 1)
    order.splice(hoverIndex, 0, draggingIndex)
    return order
  }

  // Pan responders are keyed by item key and recreated only when the key changes.
  // Using dataRef inside callbacks avoids stale closures over index.
  const panResponderCache = useRef<Map<string, ReturnType<typeof PanResponder.create>>>(new Map())

  const getPanResponder = (itemKey: string, currentIndex: number) => {
    if (panResponderCache.current.has(itemKey)) {
      return panResponderCache.current.get(itemKey)!
    }
    const pr = PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gs) => Math.abs(gs.dy) > 4,
      onPanResponderGrant: () => {
        // Read live index from dataRef at gesture start
        const liveIndex = dataRef.current.findIndex((item) => keyExtractor(item) === itemKey)
        currentDragIndex.current = liveIndex
        startY.current = liveIndex * itemHeight
        dragY.setValue(0)
        setDraggingIndex(liveIndex)
        setHoverIndex(liveIndex)
      },
      onPanResponderMove: (_, gs) => {
        dragY.setValue(gs.dy)
        const rawTarget = Math.round((startY.current + gs.dy) / itemHeight)
        const clamped = Math.max(0, Math.min(dataRef.current.length - 1, rawTarget))
        setHoverIndex(clamped)
      },
      onPanResponderRelease: (_, gs) => {
        const from = currentDragIndex.current
        const rawTarget = Math.round((startY.current + gs.dy) / itemHeight)
        const to = Math.max(0, Math.min(dataRef.current.length - 1, rawTarget))
        dragY.setValue(0)
        setDraggingIndex(-1)
        setHoverIndex(-1)
        currentDragIndex.current = -1
        if (from !== -1 && from !== to) {
          const next = [...dataRef.current]
          const [moved] = next.splice(from, 1)
          next.splice(to, 0, moved)
          onReorder(next)
        }
      },
      onPanResponderTerminate: () => {
        dragY.setValue(0)
        setDraggingIndex(-1)
        setHoverIndex(-1)
        currentDragIndex.current = -1
      },
    })
    panResponderCache.current.set(itemKey, pr)
    return pr
  }

  // Evict cache entries for keys no longer in data
  const currentKeys = new Set(data.map(keyExtractor))
  panResponderCache.current.forEach((_, k) => {
    if (!currentKeys.has(k)) panResponderCache.current.delete(k)
  })

  const displayOrder = getDisplayOrder()

  return (
    <View style={{ position: "relative", height: itemHeight * data.length }}>
      {displayOrder.map((dataIdx, displayPos) => {
        const item = data[dataIdx]
        const itemKey = keyExtractor(item)
        const isDragging = dataIdx === draggingIndex
        const top = isDragging
          ? Animated.add(new Animated.Value(draggingIndex * itemHeight), dragY)
          : displayPos * itemHeight

        return (
          <Animated.View
            key={itemKey}
            style={{
              position: "absolute",
              top,
              left: 0,
              right: 0,
              height: itemHeight,
              zIndex: isDragging ? 100 : 1,
              opacity: isDragging ? 0.92 : 1,
              elevation: isDragging ? 8 : 0,
            }}
            {...getPanResponder(itemKey, dataIdx).panHandlers}
          >
            {renderItem(item, dataIdx, isDragging)}
          </Animated.View>
        )
      })}
    </View>
  )
}
