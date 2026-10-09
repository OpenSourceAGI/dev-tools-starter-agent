import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

const external = (id: string) =>
  id.startsWith('@/') ||
  ['react', 'react-dom', 'react/jsx-runtime', 'next-themes', 'framer-motion',
    'lucide-react', 'next-auth', 'next-auth/react', 'next/navigation', 'next/link',
    'class-variance-authority', 'clsx', 'tailwind-merge'].includes(id) ||
  id.startsWith('@radix-ui/')

export default defineConfig({
  plugins: [react()],
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      formats: ['es'],
    },
    rollupOptions: {
      external,
      output: {
        preserveModules: true,
        preserveModulesRoot: 'src',
        dir: 'dist',
        entryFileNames: '[name].js',
      },
    },
  },
})
