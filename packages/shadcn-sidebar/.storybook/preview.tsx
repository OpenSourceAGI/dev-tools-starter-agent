import type { Preview } from "@storybook/react-vite"

import "./storybook.css"

const preview: Preview = {
  parameters: {
    layout: "fullscreen",
    controls: { expanded: true },
    viewport: {
      options: {
        phone: { name: "Phone", styles: { width: "390px", height: "844px" }, type: "mobile" },
        tablet: { name: "Tablet", styles: { width: "834px", height: "1112px" }, type: "tablet" },
        desktop: { name: "Desktop", styles: { width: "1440px", height: "900px" }, type: "desktop" },
      },
    },
  },
  globalTypes: {
    theme: {
      description: "Light or dark tokens",
      toolbar: { title: "Theme", icon: "mirror", items: ["light", "dark"], dynamicTitle: true },
    },
  },
  initialGlobals: { theme: "light" },
  decorators: [
    (Story, context) => {
      if (typeof document !== "undefined") {
        document.documentElement.classList.toggle("dark", context.globals.theme === "dark")
      }
      return <Story />
    },
  ],
}

export default preview
