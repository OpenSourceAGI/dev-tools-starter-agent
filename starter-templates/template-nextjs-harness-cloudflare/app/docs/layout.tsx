import { NextProvider } from 'fumadocs-core/framework/next'
import { DocsLayout } from 'fumadocs-ui/layouts/docs'
import { RootProvider } from 'fumadocs-ui/provider/base'
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/layout/app-sidebar"
import { AISearchTrigger } from '@/components/fumadocs/ai/search'
import { baseOptions, linkItems, logo } from '@/lib/layout.shared'
import { source } from '@/lib/docs/source'
import 'fumadocs-ui/style.css'
import 'fumadocs-twoslash/twoslash.css'
import 'fumadocs-openapi/css/preset.css'
import 'katex/dist/katex.min.css'
import type { CSSProperties } from 'react'
import { DOCS_TITLE } from '@/lib/constants'


export default function Layout({ children }: LayoutProps<'/docs'>) {
  const base = baseOptions()

  return (
    <NextProvider>
      <RootProvider>
        <SidebarProvider defaultOpen={true} open={true}>
          <AppSidebar />
          <SidebarInset className="w-full">
            <DocsLayout
              {...base}
              links={linkItems.filter((item) => item.type === 'icon')}
              tree={source.pageTree}
              sidebar={{
                collapsible: true,
                tabs: {
                  transform(option, node) {
                    const meta = source.getNodeMeta(node)
                    if (!meta || !node.icon) return option

                    const segments = meta.path.split('/')
                    const segment = serializeSegment(segments[0])

                    const color = `var(--${segment}-color, var(--color-fd-foreground))`
                    return {
                      ...option,
                      icon: (
                        <div
                          className='size-full rounded-lg text-(--tab-color) max-md:border max-md:bg-(--tab-color)/10 max-md:p-1.5 [&_svg]:size-full'
                          style={
                            {
                              '--tab-color': color,
                            } as CSSProperties
                          }
                        >
                          {node.icon}
                        </div>
                      ),
                    }
                  },
                },
              }}
              tabMode='top'

              nav={{
                ...base.nav,
                url: undefined,
                title: (
                  <>
                    <SidebarTrigger className="mr-2" />
                    {logo}
                    <span className='font-medium max-md:hidden'>{DOCS_TITLE}</span>
                  </>
                ),
              }}
            >
              {children}
              {/* <DocsBackground /> */}
              {/* <AISearchTrigger /> */}
            </DocsLayout>
          </SidebarInset>
        </SidebarProvider>
      </RootProvider>
    </NextProvider>
  )
}

function serializeSegment(segment: string | undefined): string {
  const raw = (segment ?? '').trim()

  const kebab = raw
    .toLowerCase()
    .replace(/[_\s]+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/^-+/, '')
    .replace(/-+$/, '')
  return kebab || 'fd'
}
