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

  const getDisplayOrder = (): number[] => {
    if (draggingIndex === -1 || hoverIndex === -1 || draggingIndex === hoverIndex) {
      return data.map((_, i) => i)
    }
    const order = data.map((_, i) => i)
    order.splice(draggingIndex, 1)
    order.splice(hoverIndex, 0, draggingIndex)
    return order
  }

  const makePanResponder = (index: number) =>
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gs) => Math.abs(gs.dy) > 4,
      onPanResponderGrant: (_, gs) => {
        currentDragIndex.current = index
        startY.current = index * itemHeight
        dragY.setValue(0)
        setDraggingIndex(index)
        setHoverIndex(index)
      },
      onPanResponderMove: (_, gs) => {
        dragY.setValue(gs.dy)
        const rawTarget = Math.round((startY.current + gs.dy) / itemHeight)
        const clamped = Math.max(0, Math.min(data.length - 1, rawTarget))
        setHoverIndex(clamped)
      },
      onPanResponderRelease: (_, gs) => {
        const from = currentDragIndex.current
        const rawTarget = Math.round((startY.current + gs.dy) / itemHeight)
        const to = Math.max(0, Math.min(data.length - 1, rawTarget))
        dragY.setValue(0)
        setDraggingIndex(-1)
        setHoverIndex(-1)
        currentDragIndex.current = -1
        if (from !== to) {
          const next = [...data]
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

  const panResponders = useRef<ReturnType<typeof PanResponder.create>[]>([])
  // Rebuild pan responders only when data length changes
  if (panResponders.current.length !== data.length) {
    panResponders.current = data.map((_, i) => makePanResponder(i))
  }

  const displayOrder = getDisplayOrder()

  return (
    <View style={{ position: "relative", height: itemHeight * data.length }}>
      {displayOrder.map((dataIdx, displayPos) => {
        const isDragging = dataIdx === draggingIndex
        const top = isDragging
          ? Animated.add(new Animated.Value(draggingIndex * itemHeight), dragY)
          : displayPos * itemHeight

        return (
          <Animated.View
            key={keyExtractor(data[dataIdx])}
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
            {...panResponders.current[dataIdx].panHandlers}
          >
            {renderItem(data[dataIdx], dataIdx, isDragging)}
          </Animated.View>
        )
      })}
    </View>
  )
}
