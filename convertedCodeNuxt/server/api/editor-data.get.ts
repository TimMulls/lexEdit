// Mock API route for editor data
import { defineEventHandler } from "h3"

export default defineEventHandler(async () => {
  const url = "https://agentzmarketing.com//DesktopModules/EditorServices/API/LexEditor/GetOrderData?orderNumber=292879&userId=0&sessionId=1axrn53oagwmqvxdwi1la5cy"

  const res = await fetch(url)
  if (!res.ok) {
    // return a simple error object to make failures visible in dev
    return { error: true, status: res.status, statusText: res.statusText }
  }

  const data = await res.json()
  return data
})
