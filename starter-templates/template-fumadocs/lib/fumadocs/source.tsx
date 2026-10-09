/**
 * @file source.tsx
 * @description Fumadocs source loader configuration and page structure.
 */
import { docs } from 'fumadocs-mdx:collections/server'
import {
  type InferMetaType,
  type InferPageType,
  type LoaderPlugin,
  loader,
} from 'fumadocs-core/source'
import { lucideIconsPlugin } from 'fumadocs-core/source/lucide-icons'
import { openapiPlugin } from 'fumadocs-openapi/server'
import { getDocEditStore } from '@/lib/doc-edits/store'

export const source = loader({
  baseUrl: '/docs',
  plugins: [pageTreeCodeTitles(), lucideIconsPlugin(), openapiPlugin()],
  source: docs.toFumadocsSource(),
})

function pageTreeCodeTitles(): LoaderPlugin {
  return {
    transformPageTree: {
      file(node) {
        if (
          typeof node.name === 'string' &&
          (node.name.endsWith('()') || node.name.match(/^<\w+ \/>$/))
        ) {
          return {
            ...node,
            name: <code className='text-[0.8125rem]'>{node.name}</code>,
          }
        }
        return node
      },
    },
  }
}


export async function getLLMText(page: InferPageType<typeof source>) {
  // A published in-page edit replaces the file's body, so LLMs see what readers see.
  const override = await getDocEditStore().getOverride(page.slugs.join('/'));
  const processed = override?.markdown ?? (await page.data.getText('processed'));

  return `# ${page.data.title} (${page.url})

${processed}`;
}

export type Page = InferPageType<typeof source>
export type Meta = InferMetaType<typeof source>
