import type { ComponentProps } from 'react'
import { OpenAPIPage } from '@/components/api-page.client'
import { openapi } from '@/lib/openapi'

type APIPageProps = Omit<
  Extract<ComponentProps<typeof OpenAPIPage>, { preloaded: unknown }>,
  'preloaded'
>

/**
 * Renders operations from a spec registered in `@/lib/openapi`.
 *
 * @example <APIPage document="verify-phone-sms" operations={[{ path: '/health', method: 'get' }]} />
 */
export async function APIPage(props: APIPageProps) {
  const { bundled } = await openapi.getSchema(props.document)

  return (
    <OpenAPIPage
      {...props}
      preloaded={{
        docs: { [props.document]: bundled },
        proxyUrl: openapi.options.proxyUrl,
      }}
    />
  )
}
