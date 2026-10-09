'use client'

import { createOpenAPIPage } from 'fumadocs-openapi/ui'

export const OpenAPIPage = createOpenAPIPage({
  shikiOptions: {
    themes: {
      dark: 'vesper',
      light: 'vitesse-light',
    },
  },
})
