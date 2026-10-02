import { ChatGroq } from '@langchain/groq'
import { OpenAIEmbeddings } from '@langchain/openai'

// Lazy initialization to avoid build-time errors
let _chatModel: ChatGroq | null = null
let _embeddingModel: OpenAIEmbeddings | null = null

export const chatModel = new Proxy({} as ChatGroq, {
  get(_target, prop) {
    if (!_chatModel) {
      _chatModel = new ChatGroq({
        model: 'llama-3.3-70b-versatile',
        temperature: 0,
      })
    }
    return _chatModel[prop as keyof ChatGroq]
  },
})

export const embeddingModel = new Proxy({} as OpenAIEmbeddings, {
  get(_target, prop) {
    if (!_embeddingModel) {
      _embeddingModel = new OpenAIEmbeddings({
        model: 'text-embedding-3-small',
      })
    }
    return _embeddingModel[prop as keyof OpenAIEmbeddings]
  },
})
