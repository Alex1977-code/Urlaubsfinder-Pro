/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  // Pfad der GitHub-Pages-Projektseite: https://alex1977-code.github.io/Urlaubsfinder-Pro/
  base: '/Urlaubsfinder-Pro/',
  plugins: [react(), tailwindcss()],
  test: {
    environment: 'node',
    include: ['src/**/*.test.{ts,tsx}'],
  },
})
