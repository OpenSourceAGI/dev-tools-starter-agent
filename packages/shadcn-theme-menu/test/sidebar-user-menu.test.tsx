import { describe, expect, it } from 'vitest'
import { renderToString } from 'react-dom/server'
import { act } from 'react'
import { createRoot } from 'react-dom/client'

import { SidebarUserMenu } from '../src/sidebar-user-menu'

// React 19's `act` needs this flag to run effects without warning.
;(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true

describe('SidebarUserMenu', () => {
  it('renders nothing before mount, so the server emits no markup to mismatch', () => {
    // The selected color theme lives in localStorage — unreadable during a server
    // render. Emitting a checkmark here would guarantee a hydration mismatch.
    expect(renderToString(<SidebarUserMenu user={{ name: 'Ada Lovelace' }} />)).toBe('')
  })

  it('renders the account trigger once mounted', async () => {
    const container = document.createElement('div')
    document.body.appendChild(container)
    const root = createRoot(container)

    await act(async () => {
      root.render(<SidebarUserMenu user={{ name: 'Ada Lovelace', email: 'ada@example.com' }} />)
    })

    expect(container.textContent).toContain('Ada Lovelace')
    expect(container.textContent).toContain('ada@example.com')

    await act(async () => root.unmount())
    container.remove()
  })
})
