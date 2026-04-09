import { useRef } from "react"

export function useScroll<T extends HTMLElement>() {
  const scrollRef = useRef<T>(null)

  const scroll = (direction: "left" | "right", amount = 200) => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({
        left: direction === "left" ? -amount : amount,
        behavior: "smooth",
      })
    }
  }

  return { scrollRef, scroll }
}