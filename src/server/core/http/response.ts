import { NextResponse } from "next/server"

export const ok = <T>(data: T, message = "OK", status = 200) =>
  NextResponse.json(
    {
      success: true,
      message,
      data,
    },
    { status },
  )

export const fail = (message: string, status = 400, details?: unknown) =>
  NextResponse.json(
    {
      success: false,
      message,
      details,
    },
    { status },
  )
