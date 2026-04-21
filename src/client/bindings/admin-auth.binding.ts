import { apiRequest } from "@/src/client/api/http"
import { persistSession } from "@/lib/auth-session"

type LoginResponse = {
  success: boolean
  data: {
    accessToken: string
    refreshToken: string
    user: {
      id: string
      role: string
    }
  }
}

export const bindAdminAuth = () => {
  const form = document.getElementById("adminLoginForm") as HTMLFormElement | null
  if (!form) return

  form.addEventListener("submit", async (event) => {
    event.preventDefault()
    const email = (document.getElementById("email") as HTMLInputElement | null)?.value ?? ""
    const password = (document.getElementById("password") as HTMLInputElement | null)?.value ?? ""

    try {
      const response = await apiRequest<LoginResponse>("/api/v1/auth/login", "POST", { email, password })
      persistSession({
        accessToken: response.data.accessToken,
        refreshToken: response.data.refreshToken,
        role: response.data.user.role,
        user: response.data.user,
      })
      window.location.href = "/admin/dashboard"
    } catch (error) {
      console.error("Login failed:", error)
    }
  })
}
