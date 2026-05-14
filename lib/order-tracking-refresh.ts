/**
 * POST /api/v1/orders/:id/tracking/refresh — parse JSON safely and throw with server message.
 */
export async function assertTrackingRefreshOk(res: Response): Promise<void> {
  const text = await res.text()
  let payload: { success?: boolean; message?: string } = {}
  if (text.trim()) {
    try {
      payload = JSON.parse(text) as { success?: boolean; message?: string }
    } catch {
      throw new Error(`Invalid response from server (${res.status})`)
    }
  }
  if (!res.ok || payload.success === false) {
    const msg =
      typeof payload.message === "string" && payload.message.trim() !== ""
        ? payload.message.trim()
        : `Request failed (${res.status})`
    throw new Error(msg)
  }
}
