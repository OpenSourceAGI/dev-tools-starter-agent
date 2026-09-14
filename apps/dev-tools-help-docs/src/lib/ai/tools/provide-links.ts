import { tool } from '@langchain/core/tools'
import { ProvideLinksToolSchema } from '../qa-schema'

export const provideLinks = tool(
  async ({ links }) => ({
    links,
  }),
  {
    name: 'provideLinks',
    description:
      'Provide links to articles found using the Web Search tool. This is compulsory and MUST be called after a web search, as it gives the user context on which URLs were used to generate the response.',
    schema: ProvideLinksToolSchema,
  }
)
