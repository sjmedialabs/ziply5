import crypto from "node:crypto"
import jwt from "jsonwebtoken"
import { env } from "@/src/server/core/config/env"

export type AppTokenPayload = {
  sub: string
  email: string
  role: string
}

export const signAccessToken = (payload: AppTokenPayload) =>
  jwt.sign(payload, env.JWT_ACCESS_SECRET, {
    expiresIn: env.JWT_ACCESS_EXPIRES_IN as jwt.SignOptions["expiresIn"],
  })

export const signRefreshToken = (payload: Pick<AppTokenPayload, "sub" | "role">) =>
  jwt.sign(payload, env.JWT_REFRESH_SECRET, {
    expiresIn: env.JWT_REFRESH_EXPIRES_IN as jwt.SignOptions["expiresIn"],
  })

export const verifyAccessToken = (token: string) => jwt.verify(token, env.JWT_ACCESS_SECRET) as AppTokenPayload

export const verifyRefreshToken = (token: string) =>
  jwt.verify(token, env.JWT_REFRESH_SECRET) as Pick<AppTokenPayload, "sub" | "role">

export const sha256 = (value: string) => crypto.createHash("sha256").update(value).digest("hex")
