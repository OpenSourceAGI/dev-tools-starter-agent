/**
 * @file layout.tsx
 * @description Root layout component that wraps the entire application.
 */
import type { ReactNode } from 'react';
import { Provider } from './provider';
import './globals.css';


export default function Layout({ children }: { children: ReactNode }) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
    >
      <body className="flex flex-col min-h-screen">
        <Provider>{children}</Provider>
        {/* <RootProvider>{children}</RootProvider> */}
      </body>
    </html>
  );
}
