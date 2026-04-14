import { apiRequest } from "@/src/client/api/http"

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
      localStorage.setItem("ziply5_access_token", response.data.accessToken)
      localStorage.setItem("ziply5_refresh_token", response.data.refreshToken)
      window.location.href = response.data.user.role === "seller" ? "/seller/dashboard" : "/admin/dashboard"
    } catch (error) {
      console.error("Login failed:", error)
    }
  })
}
