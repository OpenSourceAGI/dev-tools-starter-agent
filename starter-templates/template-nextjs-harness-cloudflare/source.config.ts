import {
  defineConfig,
  defineDocs,
  frontmatterSchema,
  metaSchema,
} from 'fumadocs-mdx/config'
import jsonSchema from 'fumadocs-mdx/plugins/json-schema'
import lastModified from 'fumadocs-mdx/plugins/last-modified'
import type { ElementContent } from 'hast'
import type { ShikiTransformer } from 'shiki'
import { z } from 'zod'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import * as path from 'node:path'

const execFileAsync = promisify(execFile)

export const docs = defineDocs({
  docs: {
    schema: frontmatterSchema.extend({
      index: z.boolean().default(false),
      /**
       * API routes only
       */
      method: z.string().optional(),
    }),
    postprocess: {
      includeProcessedMarkdown: true,
      extractLinkReferences: true,
    },
    async: true,
  },
  meta: {
    schema: metaSchema.extend({
      description: z.string().optional(),
    }),
  },
})

function transformerEscape(): ShikiTransformer {
  return {
    name: '@shikijs/transformers:remove-notation-escape',
    code(hast) {
      function replace(node: ElementContent) {
        if (node.type === 'text') {
          node.value = node.value.replace('[\\!code', '[!code')
        } else if ('children' in node) {
          for (const child of node.children) {
            replace(child)
          }
        }
      }

      replace(hast)
      return hast
    },
  }
}

export default defineConfig({
  plugins: [
    jsonSchema({
      insert: true,
    }),
    lastModified({
      versionControl: async (filePath) => {
        if (filePath.includes('(generated)')) return undefined
        try {
          const relativePath = path.relative(process.cwd(), filePath)
          const { stdout } = await execFileAsync('git', [
            'log',
            '-1',
            '--pretty=%ai',
            relativePath,
          ])
          return new Date(stdout.trim())
        } catch {
          return undefined
        }
      },
    }),
  ],
  mdxOptions: async () => {
    const { rehypeCodeDefaultOptions } = await import(
      'fumadocs-core/mdx-plugins/rehype-code'
    )
    const { remarkSteps } = await import(
      'fumadocs-core/mdx-plugins/remark-steps'
    )
    const { transformerTwoslash } = await import('fumadocs-twoslash')
    const { createFileSystemTypesCache } = await import(
      'fumadocs-twoslash/cache-fs'
    )
    const { default: remarkMath } = await import('remark-math')
    const { default: rehypeKatex } = await import('rehype-katex')
    const { remarkAutoTypeTable } = await import('fumadocs-typescript')

    return {
      rehypeCodeOptions: {
        // Don't restrict langs to allow any language in docs
        // langs: ['ts', 'js', 'html', 'tsx', 'mdx'],
        inline: 'tailing-curly-colon',
        themes: {
          light: 'catppuccin-latte',
          dark: 'catppuccin-mocha',
        },
        transformers: [
          ...(rehypeCodeDefaultOptions.transformers ?? []),
          transformerTwoslash({
            typesCache: createFileSystemTypesCache(),
          }),
          transformerEscape(),
        ],
      },
      remarkCodeTabOptions: {
        parseMdx: true,
      },
      remarkNpmOptions: {
        persist: {
          id: 'package-manager',
        },
      },
      remarkPlugins: [remarkSteps, remarkMath, remarkAutoTypeTable],
      rehypePlugins: (v) => [rehypeKatex, ...v],
    }
  },
})
