import { ChatGroq } from '@langchain/groq'
import { OpenAIEmbeddings } from '@langchain/openai'

/**
 * Providers are created lazily, on first use.
 *
 * `new ChatGroq()` / `new OpenAIEmbeddings()` throw when their API key is
 * missing, and Next.js evaluates every route module while collecting page data
 * during `next build`. Instantiating at module scope therefore fails the build
 * on any machine without the keys (CI, Vercel preview builds). Constructing on
 * demand keeps the build key-free and moves the failure to the request that
 * actually needs the model.
 */

let cachedChatModel: ChatGroq | undefined
let cachedEmbeddingModel: OpenAIEmbeddings | undefined

export class MissingApiKeyError extends Error {
  constructor(envVar: string) {
    super(
      `${envVar} is not set. Add it to your environment to enable the docs assistant.`
    )
    this.name = 'MissingApiKeyError'
  }
}

export function getChatModel(): ChatGroq {
  if (!process.env.GROQ_API_KEY) throw new MissingApiKeyError('GROQ_API_KEY')
  cachedChatModel ??= new ChatGroq({
    model: 'llama-3.3-70b-versatile',
    temperature: 0,
  })
  return cachedChatModel
}

export function getEmbeddingModel(): OpenAIEmbeddings {
  if (!process.env.OPENAI_API_KEY)
    throw new MissingApiKeyError('OPENAI_API_KEY')
  cachedEmbeddingModel ??= new OpenAIEmbeddings({
    model: 'text-embedding-3-small',
  })
  return cachedEmbeddingModel
}
