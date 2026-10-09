/**
 * @file code-example.tsx
 * @description Interactive component displaying various code examples for using GRAB.
 */
"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Copy, Check } from "lucide-react"
import hljs from 'highlight.js/lib/core'
import javascript from 'highlight.js/lib/languages/javascript'
import typescript from 'highlight.js/lib/languages/typescript'
import bash from 'highlight.js/lib/languages/bash'
import 'highlight.js/styles/github-dark.css'

// Register languages
hljs.registerLanguage('javascript', javascript)
hljs.registerLanguage('typescript', typescript)
hljs.registerLanguage('bash', bash)

const codeExamples = {
  basic: `import grab from 'grab-url';

// Simple GET request
const data = await grab('users');

// POST with auto-JSON
await grab('users', {
  post: true,
  email: 'jane@example.com',
  age: 25
});

// GET with query parameters
const searchResults = await grab('search', {
  query: 'javascript',
  page: 1,
  limit: 10
});`,
  reactive: `// Reactive loading state in React

  import React, { useState } from "react";
import grab from "grab-url";

function UserProfile() {
  const [userState, setUserState] = useState<Partial<{ 
    name: string; 
    email: string;
    isLoading: boolean;
    error: string; 
  }>>({})

  await grab('user', {
    response: setUserState
  });

  return (
    <div>
      {userState.isLoading && <div>Loading...</div>}
      {userState.error && <div>Error: {userState.error}</div>}
      {userState && (
        <div>
          <h2>{userState.name}</h2>
          <p>{userState.email}</p>
        </div>
      )}
    </div>
  );
}
// Works with Vue, Svelte, and any framework!`,
  typescript: `// Full TypeScript support with tooltips
type User = {
  /** Name of the user */
  name: string;
  /** Age of the user */
  age: number;
};

type RequestParams = {
  /** Query string to search for */
  q: string;
  /** Category of search */
  category?: 'news' | 'general';
};

const result = await grab<User, RequestParams>('test-path', {
  q: 'react',
  category: 'general'
});

// Instant error highlight and tooltips!
console.log(result.name);`,
  config: `// Set defaults for all requests
grab('', {
  setDefaults: true,
  baseURL: 'https://api.myapp.com/v1',
  timeout: 30,
  debug: true,
  rateLimit: 1,
  cache: false,
  cancelOngoingIfNew: true,
  headers: {
    Authorization: 'Bearer your-token-here'
  }
});

// Or create a separate instance
const grabGoogleAPI = grab.instance({
  headers: { Authorization: 'Bearer 9e9wjeffkwf0sf' },
  baseURL: 'https://api.google.com/v1/',
  debug: true
});`,
  mock: `// Setup mock responses for testing
grab.mock.users = {
  response: [
    { id: 1, name: 'John Doe', email: 'john@example.com' },
    { id: 2, name: 'Jane Smith', email: 'jane@example.com' }
  ],
  delay: 1 // 1 second delay
};

// Conditional mock responses
grab.mock['auth/login'] = {
  response: (params) => {
    if (params.email === 'admin@example.com') {
      return { success: true, token: 'mock-jwt-token' };
    }
    return { success: false, error: 'Invalid credentials' };
  },
  post: true,
  delay: 1
};`,
  features: `// Pagination with infinite scroll
await grab('products', {
  response: productList,
  infiniteScroll: ['page', 'products', '.results-container']
});

// Rate limiting - prevent multi-click
await grab('search', {
  response: searchResults,
  rateLimit: 2 // 2 seconds between requests
});

// Cancel duplicate requests
await grab('products/search', {
  response: currentSearch,
  cancelOngoingIfNew: true
});

// Frontend caching
const categories = await grab('categories', {
  cache: true // Instant from memory on repeat
});`,
  cli: `# Install globally for CLI testing
npm i -g grab-url

# Basic request
grab https://api.example.com/users

# Request with params
grab https://api.example.com/search id=123 name=John

# Request with JSON payload
grab https://api.example.com/data '{"id":123,"name":"John"}'

# Execute once (no watching)
grab https://api.example.com/download --x`,
}

type TabKey = keyof typeof codeExamples

const tabLabels: Record<TabKey, string> = {
  basic: "Basic",
  reactive: "Reactive",
  typescript: "TypeScript",
  config: "Config",
  mock: "Mock",
  features: "Features",
  cli: "CLI",
}

const tabLanguages: Record<TabKey, string> = {
  basic: "javascript",
  reactive: "javascript",
  typescript: "typescript",
  config: "javascript",
  mock: "javascript",
  features: "javascript",
  cli: "bash",
}

export function CodeExample() {
  const [activeTab, setActiveTab] = useState<TabKey>("basic")
  const [copied, setCopied] = useState(false)
  const codeRef = useRef<HTMLElement>(null)

  const copyCode = () => {
    navigator.clipboard.writeText(codeExamples[activeTab])
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  useEffect(() => {
    if (codeRef.current) {
      // Remove previous highlighting before applying new highlighting
      delete codeRef.current.dataset.highlighted
      hljs.highlightElement(codeRef.current)
    }
  }, [activeTab])

  return (
    <section className="py-20 md:py-32 border-b border-border">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Simple Syntax, <span className="text-primary">Powerful Results</span>
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Why fetch things when you can just GRAB? One function handles everything — JSON conversion, loading states,
            caching, retries, and more.
          </p>
        </div>

        <div className="max-w-4xl mx-auto">
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="flex items-center justify-between border-b border-border px-4 py-3 overflow-x-auto">
              <div className="flex gap-1">
                {(Object.keys(codeExamples) as TabKey[]).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`px-3 py-1.5 text-sm rounded-md transition-colors whitespace-nowrap ${activeTab === tab
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                      }`}
                  >
                    {tabLabels[tab]}
                  </button>
                ))}
              </div>
              <Button variant="ghost" size="sm" onClick={copyCode} className="gap-2 ml-2 flex-shrink-0">
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                {copied ? "Copied" : "Copy"}
              </Button>
            </div>
            <pre className="p-6 overflow-x-auto text-sm max-h-[400px] overflow-y-auto">
              <code ref={codeRef} className={`font-mono language-${tabLanguages[activeTab]}`} style={{ fontFamily: 'var(--font-mono)' }}>{codeExamples[activeTab]}</code>
            </pre>
          </div>
        </div>
      </div>
    </section>
  )
}
