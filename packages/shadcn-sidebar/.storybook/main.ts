import type { StorybookConfig } from "@storybook/react-vite"
import tailwindcss from "@tailwindcss/vite"

/**
 * Storybook for shadcn-sidebar. Tailwind v4 runs through its Vite plugin and
 * compiles `.storybook/storybook.css`, which pulls in the package's default
 * tokens and scans `src/` and `stories/` for class names.
 */
const config: StorybookConfig = {
  stories: ["../stories/**/*.stories.@(ts|tsx)"],
  addons: [],
  framework: {
    name: "@storybook/react-vite",
    options: {},
  },
  async viteFinal(viteConfig) {
    viteConfig.plugins = [...(viteConfig.plugins ?? []), tailwindcss()]
    return viteConfig
  },
}

export default config
