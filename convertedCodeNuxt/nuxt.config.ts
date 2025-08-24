import tailwindcss from "@tailwindcss/vite"

export default defineNuxtConfig({
  compatibilityDate: "2025-07-15",
  devtools: { enabled: true },

  modules: [
    "@nuxt/icon",
    "@nuxt/fonts",
    "@nuxt/image",
    "@nuxt/scripts",
    // No nuxt/ui
  ],
  css: ["~/assets/main.css"],

  // Vite configuration
  vite: {
    plugins: [tailwindcss()],
  },
})
