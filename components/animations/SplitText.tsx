"use client"

import { useMemo, useState, useEffect } from "react"
import { m, Variants } from "framer-motion"

interface SplitTextProps {
  text: string
  className?: string
  delay?: number
  stagger?: number
}

export default function SplitText({ text, className = "", delay = 0, stagger = 0.05 }: SplitTextProps) {
  const letters = useMemo(() => text.split(""), [text])
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    // A tiny timeout ensures the browser has painted the initial hidden state
    const timer = setTimeout(() => setMounted(true), 100)
    return () => clearTimeout(timer)
  }, [])

  const container: Variants = {
    hidden: { opacity: 0 },
    visible: (i: number = 1) => ({
      opacity: 1,
      transition: { staggerChildren: stagger, delayChildren: delay * i },
    }),
  }

  const child: Variants = {
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        type: "spring",
        damping: 12,
        stiffness: 200,
      },
    },
    hidden: {
      opacity: 0,
      y: 20,
      transition: {
        type: "spring",
        damping: 12,
        stiffness: 200,
      },
    },
  }

  return (
    <m.span
      style={{ display: "inline-block", overflow: "hidden" }}
      variants={container}
      initial="hidden"
      animate={mounted ? "visible" : "hidden"}
      className={className}
    >
      {letters.map((letter, index) => (
        letter === "\n" ? (
          <br key={index} />
        ) : (
          <m.span
            variants={child}
            key={index}
            style={{ display: "inline-block" }}
          >
            {letter === " " ? "\u00A0" : letter}
          </m.span>
        )
      ))}
    </m.span>
  )
}
