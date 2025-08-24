// Mock API route for saving editor data
import { defineEventHandler, readBody } from "h3"

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  // Simulate save
  return { success: true, received: body }
})
