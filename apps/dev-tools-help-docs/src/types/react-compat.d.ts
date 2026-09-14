// React 19 + TS 5.9 compatibility: ExoticComponent (used by forwardRef components
// in lucide-react, Radix UI, etc.) returns ReactNode which includes undefined,
// making them invalid as JSX elements. This patch adds a JSX-compatible overload.

declare module 'react' {
  interface ExoticComponent<P = Record<string, unknown>> {
    (props: P): import('react').JSX.Element | null
  }
}
