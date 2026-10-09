import { tool } from '@langchain/core/tools'
import { z } from 'zod'
import { source } from '@/lib/docs/source'

export const getPageContent = tool(
  async ({ path }) => {
    const slugs = path.split('/')
    const page = source.getPage(slugs)

    if (!page) {
      return {
        success: false,
        data: 'Page not found',
      }
    }

    return {
      success: true,
      data: await page.data.getText('processed'),
    }
  },
  {
    name: 'getPageContent',
    description: 'Get the list of pages in the documentation.',
    schema: z.object({
      path: z.string().describe('The path of the page to get the content of.'),
    }),
  }
)
