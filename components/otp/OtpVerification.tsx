"use client"

import React, { useState, useEffect } from "react"
import {
  OTPInput,
  OTPInputContext,
  RegExpMatcher,
} from "input-otp"
import { cn } from "@/lib/utils"

interface OtpVerificationProps {
  mobile: string
  onVerify: (code: string) => Promise<void>
  onResend: () => Promise<void>
  isLoading?: boolean
  cooldownSeconds?: number
}

export function OtpVerification({
  mobile,
  onVerify,
  onResend,
  isLoading,
  cooldownSeconds = 60,
}: OtpVerificationProps) {
  const [timeLeft, setTimeLeft] = useState(cooldownSeconds)
  const [code, setCode] = useState("")

  useEffect(() => {
    if (timeLeft <= 0) return
    const timer = setInterval(() => {
      setTimeLeft((prev) => prev - 1)
    }, 1000)
    return () => clearInterval(timer)
  }, [timeLeft])

  const handleResend = async () => {
    await onResend()
    setTimeLeft(cooldownSeconds)
  }

  return (
    <div className="flex flex-col items-center gap-6 py-4">
      <div className="text-center">
        <p className="text-sm text-muted-foreground">
          Enter the 6-digit code sent to
        </p>
        <p className="font-semibold">{mobile}</p>
      </div>

      <OTPInput
        maxLength={6}
        value={code}
        onChange={setCode}
        onComplete={(val) => onVerify(val)}
        containerClassName="group flex items-center has-[:disabled]:opacity-30"
        render={({ slots }) => (
          <div className="flex gap-2">
            {slots.map((slot, idx) => (
              <div
                key={idx}
                className={cn(
                  "relative w-10 h-12 flex items-center justify-center text-lg font-bold border-2 rounded-md transition-all",
                  slot.isActive ? "border-primary ring-2 ring-primary/20" : "border-muted-foreground/20"
                )}
              >
                {slot.char}
                {slot.hasFakeCaret && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="w-px h-6 bg-primary animate-caret-blink" />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      />

      <div className="flex w-full flex-col items-center gap-4">
        <button
          onClick={() => onVerify(code)}
          disabled={code.length !== 6 || isLoading}
          className="h-12 w-full rounded-2xl bg-[#FFC222] font-semibold text-[#7B3010] shadow-sm transition hover:brightness-95 disabled:opacity-50"
        >
          {isLoading ? "VERIFYING..." : "VERIFY & PROCEED"}
        </button>

        <button
          onClick={handleResend}
          disabled={timeLeft > 0 || isLoading}
          className="text-sm font-medium text-primary hover:underline disabled:opacity-50 disabled:no-underline"
        >
          {timeLeft > 0 ? `Resend code in ${timeLeft}s` : "Resend OTP"}
        </button>
      </div>
    </div>
  )
}
