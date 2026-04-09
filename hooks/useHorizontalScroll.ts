import { useRef } from "react"

export function useHorizontalScroll<T extends HTMLElement>(scrollAmount = 200) {
  const scrollRef = useRef<T>(null)

  const scroll = (direction: "left" | "right") => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({
        left: direction === "left" ? -scrollAmount : scrollAmount,
        behavior: "smooth",
      })
    }
  }

  return { scrollRef, scroll }
}