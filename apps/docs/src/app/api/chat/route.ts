import { type CoreMessage } from 'ai'
import { toUIMessageStream } from '@ai-sdk/langchain'
import { MissingApiKeyError, getChatModel } from '@/lib/ai/providers'
import { provideLinks } from '@/lib/ai/tools/provide-links'
import { searchDocs } from '@/lib/ai/tools/search-docs'
import { getPageContent } from '@/lib/ai/tools/get-page-content'
import { systemPrompt } from '@/lib/ai/prompts'
import { categories } from '@/lib/constants'
import { source } from '@/lib/source'
import {
  ChatPromptTemplate,
  MessagesPlaceholder,
} from '@langchain/core/prompts'
import { AIMessage, HumanMessage, SystemMessage } from '@langchain/core/messages'
import { StringOutputParser } from '@langchain/core/output_parsers'

// Fallback if createToolCallingAgent is missing in older version, though d.ts suggested exports.
// If missing, we might need another approach, but let's try strict imports or just standard runnable.
// Actually, let's use the Runnable approach which is safer across versions if bindTools exists.

function getLLMsTxt() {
  const scanned: string[] = []
  scanned.push('# Docs')
  const map = new Map<string, string[]>()

  for (const page of source.getPages()) {
    const dir = page.path.split('/')[0]
    const list = map.get(dir) ?? []
    list.push(`- [${page.data.title}](${page.url}): ${page.data.description}`)
    map.set(dir, list)
  }

  for (const [key, value] of map) {
    scanned.push(`## ${categories[key]}`)
    scanned.push(value.join('\n'))
  }

  return scanned.join('\n\n')
}

// Helper to convert message content to string, handling text parts
function stringifyContent(content: CoreMessage['content']): string {
  if (typeof content === 'string') return content
  if (!content || !Array.isArray(content)) return ''
  return content
    .filter((part) => part.type === 'text')
    .map((part) => (part as { text: string }).text)
    .join('\n')
}

export async function POST(request: Request) {
  let chatModel: ReturnType<typeof getChatModel>
  try {
    chatModel = getChatModel()
  } catch (error) {
    if (error instanceof MissingApiKeyError) {
      return new Response(error.message, { status: 503 })
    }
    throw error
  }

  const { messages }: { messages: CoreMessage[] } = await request.json()

  const tools = [provideLinks, searchDocs, getPageContent]
  
  // Create the prompt
  const prompt = ChatPromptTemplate.fromMessages([
    new SystemMessage(systemPrompt({ llms: getLLMsTxt() })),
    new MessagesPlaceholder('chat_history'),
    ['human', '{input}'],
  ])

  // Bind tools to the model
  const modelWithTools = chatModel.bindTools(tools)

  // Create the chain
  const chain = prompt.pipe(modelWithTools)

  // Separate the last message from the history
  const lastMessage = messages[messages.length - 1]
  const input = stringifyContent(lastMessage.content)
  const chatHistory = messages.slice(0, -1).map((m) => {
    const content = stringifyContent(m.content)
    return m.role === 'user'
      ? new HumanMessage(content)
      : new AIMessage(content)
  })

  // Stream events from the chain
  // We use streamEvents to get tool calls and outputs
  // However toUIMessageStream expects a stream of LangChainStreamEvent
  
  const stream = await chain.streamEvents(
    {
      input,
      chat_history: chatHistory,
    },
    { version: 'v2' }
  )

  // Transform LangChain stream to AI SDK Data Stream Protocol manually
  // Protocol: '0': text part
  const protocolStream = toUIMessageStream(stream).pipeThrough(
    new TransformStream({
      transform(chunk, controller) {
        // Log to see what we are getting
        console.log('Chunk Type:', chunk.type)
        console.log('Chunk:', JSON.stringify(chunk))
        
        // Temporary pass-through as JSON to see if client errors or ignores
        // We know client errors on object, so must be string.
        // We will fallback to enqueueing JSON string until we map types correctly.
        controller.enqueue(JSON.stringify(chunk) + '\n')
      },
    })
  )

  return new Response(protocolStream, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'X-Vercel-AI-Data-Stream': 'v1'
    },
  })
}
