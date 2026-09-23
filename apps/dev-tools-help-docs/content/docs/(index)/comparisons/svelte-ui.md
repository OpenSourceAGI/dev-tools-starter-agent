---
title: 🔧 SvelteKit
---

## 🏗️ **Frameworks & Starters**
- **[SvelteKit](https://kit.svelte.dev/)** - The official full-stack framework for Svelte apps
- **[create-svelte](https://github.com/sveltejs/kit/tree/master/packages/create-svelte)** - Official CLI for creating new SvelteKit projects
- **[create-vite](https://vitejs.dev/guide/#scaffolding-your-first-vite-project)** - Vite-based Svelte app scaffold

## 🎨 **UI Libraries**
- **[shadcn-svelte](https://www.shadcn-svelte.com/)** - Copy-paste components with excellent design
- **[Melt UI](https://melt-ui.com/)** - Accessible, composable headless component builders
- **[Flowbite Svelte](https://flowbite-svelte.com/)** - Tailwind CSS + Flowbite components
- **[Skeleton](https://www.skeleton.dev/)** - Tailwind-based design system with theming
- **[Svelte Material UI](https://sveltematerialui.com/)** - Material Design components

## 🔧 **Development Tools**
- **[svelte-preprocess](https://github.com/sveltejs/svelte-preprocess)** - Universal preprocessor (PostCSS, SCSS, TypeScript, etc.)
- **[prettier-plugin-svelte](https://github.com/sveltejs/prettier-plugin-svelte)** - Code formatting for Svelte
- **[eslint-plugin-svelte](https://github.com/sveltejs/eslint-plugin-svelte)** - ESLint plugin with AST support
- **[svelte-check](https://github.com/sveltejs/language-tools/tree/master/packages/svelte-check)** - Type checking and diagnostics

## 📊 **Data & Tables**
- **[@vincjo/datatables](https://github.com/vincjo/datatables)** - Feature-rich datatable toolkit
- **[Layer Cake](https://layercake.graphics/)** - Reusable graphics and visualization framework
- **[LayerChart](https://layerchart.com/)** - Composable visualization components

## 🎭 **Animations & Interactions**
- **[AutoAnimate](https://auto-animate.formkit.com/)** - Zero-config smooth transitions
- **[neodrag](https://github.com/PuruVJ/neodrag)** - Universal drag-and-drop solution
- **[svelte-typewriter](https://github.com/henriquehbr/svelte-typewriter)** - Typewriter effect component

## 📋 **Forms & Validation**
- **[Superforms](https://superforms.rocks/)** - Advanced form handling for SvelteKit
- **[Formsnap](https://formsnap.dev/)** - High-level form components built on Superforms
- **[felte](https://felte.dev/)** - Extensible form library with validation

## 🌐 **HTTP & State**
- **[tanstack-svelte-query](https://tanstack.com/query/latest/docs/svelte/overview)** - Type-safe data fetching and caching
- **[svelte-asyncable](https://github.com/sveltetools/svelte-asyncable)** - Async-aware store contract
- **[exome](https://github.com/Marcisbee/exome)** - Proxy-based state manager

## 🧭 **Routing**
- **[svelte-spa-router](https://github.com/ItalyPaleAle/svelte-spa-router)** - Hash-based SPA routing with parameters
- **[tinro](https://github.com/AlexxNB/tinro)** - Tiny, declarative router
- **[svelte5-router](https://github.com/jycouet/svelte5-router)** - First Svelte 5 SPA router with nesting

## 🔍 **Icons & UI Components**
- **[unplugin-icons](https://github.com/antfu/unplugin-icons)** - On-demand icon components from thousands of icons
- **[lucide-svelte](https://lucide.dev/guide/packages/lucide-svelte)** - Lucide icon library for Svelte
- **[svelte-heroicons](https://github.com/krowten/svelte-heroicons)** - Heroicons by Tailwind CSS creators

## 🌍 **Internationalization**
- **[svelte-i18n](https://github.com/kaisermann/svelte-i18n)** - Comprehensive i18n library
- **[ParaglideJS](https://inlang.com/m/gerre34r/library-inlang-paraglideJs)** - Tiny, typesafe i18n with translated links

## 📱 **Mobile & Native**
- **[Svelte Native](https://svelte-native.technology/)** - Native mobile apps via NativeScript
- **[Capacitor](https://capacitorjs.com/)** - Native mobile apps with web technology

## 🧪 **Testing**
- **[@testing-library/svelte](https://testing-library.com/docs/svelte-testing-library/intro/)** - Simple DOM testing utilities
- **[svelte-jester](https://github.com/mihar-22/svelte-jester)** - Jest transformer for Svelte components

## 🎯 **Specialized Tools**
- **[MDSveX](https://mdsvex.pngwn.io/)** - MDX markdown preprocessor
- **[threlte](https://threlte.xyz/)** - Three.js integration for 3D graphics
- **[svelte-portal](https://github.com/romkor/svelte-portal)** - Render components outside parent DOM
- **[date-picker-svelte](https://github.com/probablykasper/date-picker-svelte)** - Clean date/time picker


## ⚖️ SvelteKit vs Next.js : 🏗️ Architecture & Core Philosophy

### SvelteKit: Compile-Time Philosophy
SvelteKit leverages **Svelte's compile-time philosophy**, where components are compiled into highly optimized vanilla JavaScript at build time. This eliminates the need for a virtual DOM and results in smaller bundle sizes and faster runtime performance.

**Key Technologies:**
- **Vite** as development server and build tool
- **O(1) hot reload** that processes only changed files
- **Filesystem-based routing** with `src/routes` folder structure
- **Compile-time optimizations** for maximum efficiency

### Next.js: React Server Components & App Router
Next.js 13+ introduced the **App Router** architecture built around **React Server Components (RSC)**. This revolutionary approach divides components into server and client types:

**Component Types:**
- **Server Components** (default): Rendered on server, can access databases directly
- **Client Components**: Marked with `"use client"` directive, handle user interactions
- **RSC Payload**: Compact binary representation for component reconciliation

## 📊 Performance Comparison

### Bundle Size Metrics

| Metric | SvelteKit | Next.js | Difference |
|--------|-----------|---------|------------|
| **Hello World Example** | 46.3KB (25.6KB gzipped) | 336.3KB (131.3KB gzipped) | **87% smaller** |
| **Real-world Applications** | Baseline | 60-80% larger | **60-80% smaller** |
| **Runtime Overhead** | Minimal (vanilla JS) | React + Virtual DOM | **Significantly lower** |

### Server Performance Benchmarks

| Benchmark | SvelteKit | Next.js | Performance Gain |
|-----------|-----------|---------|------------------|
| **Request Throughput** | 1,815 req/sec | 547 req/sec | **3.3x faster** |
| **Response Latency** | Lower | Higher | **Better** |
| **Static Site Performance** | Excellent | Excellent | **Similar** |

### Client-Side Performance

| Feature | SvelteKit | Next.js |
|---------|-----------|---------|
| **Initial Page Load** | ✅ Faster (smaller bundles) | ⚠️ Slower (larger bundles) |
| **DOM Updates** | ✅ Direct manipulation | ⚠️ Virtual DOM diffing |
| **Memory Efficiency** | ✅ Better | ⚠️ Higher overhead |
| **Caching Strategies** | ⚠️ Basic | ✅ Advanced |
| **Streaming SSR** | ⚠️ Limited | ✅ React Suspense |
| **Hydration** | ⚠️ Standard | ✅ Selective |

## 🗂️ Routing Systems

### SvelteKit: Convention-Based Routing
```
src/routes/
├── +page.svelte          # / (home page)
├── about/
│   └── +page.svelte      # /about
├── blog/
│   ├── +page.svelte      # /blog
│   ├── [slug]/
│   │   └── +page.svelte  # /blog/[slug] (dynamic)
│   └── +layout.svelte    # shared layout for blog/*
└── +layout.svelte        # root layout
```

**File Types:**
- `+page.svelte` - Page components
- `+page.js/.ts` - Load functions for data fetching
- `+page.server.js/.ts` - Server-side only functions
- `+layout.svelte` - Shared layouts for nested routes

### Next.js: App Router System

```
app/
├── page.tsx           # / (home page)
├── about/
│   └── page.tsx       # /about
├── blog/
│   ├── page.tsx       # /blog
│   ├── [slug]/
│   │   └── page.tsx   # /blog/[slug] (dynamic)
│   └── layout.tsx     # shared layout for blog/*
└── layout.tsx         # root layout
```

**Special Files:**
- `page.tsx` - Route pages
- `layout.tsx` - Shared layouts with automatic nesting
- `loading.tsx` - Loading UI components
- `error.tsx` - Error boundaries
- `not-found.tsx` - 404 pages

## 🔐 Authentication Solutions

| Feature | SvelteKit | Next.js |
|---------|-----------|---------|
| **Primary Solution** | Manual implementation | [NextAuth.js](https://next-auth.js.org/) |
| **OAuth Providers** | Custom integration | 50+ built-in providers |
| **Database Adapters** | Manual setup | MySQL, PostgreSQL, MongoDB |
| **Middleware Support** | Built-in form actions | Advanced route protection |
| **Enterprise Integration** | Community solutions | Auth0, Okta, etc. |

## 📊 State Management

### SvelteKit: Built-In Stores

| Feature | Description | Link |
|---------|-------------|------|
| **Svelte Stores** | Built-in reactive state management | [Docs](https://svelte.dev/docs/svelte/stores) |
| **Reactivity** | Automatic with minimal boilerplate | Built-in |
| **External Libraries** | Not needed for most use cases | N/A |
| **Performance** | Lightweight and fast | Excellent |

### Next.js: Rich Ecosystem

| Library | Description | Stars | Link |
|---------|-------------|-------|------|
| **Redux Toolkit** | Industry standard with middleware | 10k+ | [GitHub](https://github.com/reduxjs/redux-toolkit) |
| **Zustand** | Lightweight alternative | 45k+ | [GitHub](https://github.com/pmndrs/zustand) |
| **TanStack Query** | Advanced data fetching and caching | 41k+ | [GitHub](https://github.com/TanStack/query) |
| **Jotai** | Atomic state management | 18k+ | [GitHub](https://github.com/pmndrs/jotai) |

## 📝 Form Handling

### SvelteKit: Progressive Enhancement

| Feature | Description | Link |
|---------|-------------|------|
| **Superforms** | SvelteKit-specific with validation | [Docs](https://superforms.rocks/) |
| **Native Actions** | Integrated with routing | [Kit Docs](https://kit.svelte.dev/docs/form-actions) |
| **Progressive Enhancement** | Works without JavaScript | Built-in |
| **Server Validation** | Built-in support | Native |

### Next.js: Mature Libraries

| Library | Description | Stars | Link |
|---------|-------------|-------|------|
| **React Hook Form** | Performance-focused forms | 40k+ | [GitHub](https://github.com/react-hook-form/react-hook-form) |
| **Zod** | Type-safe validation | 32k+ | [GitHub](https://github.com/colinhacks/zod) |
| **Formik** | Feature-rich form library | 33k+ | [GitHub](https://github.com/jaredpalmer/formik) |
| **React Final Form** | High performance forms | 7k+ | [GitHub](https://github.com/final-form/react-final-form) |

## 🎨 UI Component Libraries

### SvelteKit: Growing Ecosystem

| Library | Description | Stars | Link |
|---------|-------------|-------|------|
| **Skeleton** | Tailwind-based design system | 4.6k+ | [Website](https://www.skeleton.dev/) |
| **Flowbite Svelte** | 63+ components with Tailwind | 2k+ | [Website](https://flowbite-svelte.com/) |
| **shadcn-svelte** | Modern UI components | 4k+ | [Website](https://www.shadcn-svelte.com/) |
| **Carbon Components** | IBM's design system | 500+ | [Website](https://carbon-components-svelte.onrender.com/) |

### Next.js: Massive Selection

| Library | Description | Stars | Link |
|---------|-------------|-------|------|
| **Material-UI (MUI)** | Enterprise-ready components | 93k+ | [Website](https://mui.com/) |
| **Ant Design** | Comprehensive design system | 90k+ | [Website](https://ant.design/) |
| **Chakra UI** | Simple and modular | 37k+ | [Website](https://chakra-ui.com/) |
| **Mantine** | Full-featured components | 25k+ | [Website](https://mantine.dev/) |

## 🧪 Testing Ecosystem

### SvelteKit: Modern Testing

| Tool | Description | Link |
|------|-------------|------|
| **Vitest** | Recommended testing framework | [Website](https://vitest.dev/) |
| **Svelte Testing Library** | Lightweight component testing | [Docs](https://testing-library.com/docs/svelte-testing-library/) |
| **Playwright** | E2E testing (requires setup) | [Website](https://playwright.dev/) |
| **Jest** | Alternative unit testing | [Website](https://jestjs.io/) |

### Next.js: Mature Testing

| Tool | Description | Link |
|------|-------------|------|
| **Jest + RTL** | Industry standard setup | [Testing Library](https://testing-library.com/) |
| **Enzyme** | Alternative component testing | [Website](https://enzymejs.github.io/enzyme/) |
| **Cypress** | E2E testing with great Next.js support | [Website](https://www.cypress.io/) |
| **Playwright** | Modern E2E testing | [Website](https://playwright.dev/) |

## 🚀 Deployment Options

### SvelteKit: Universal Adapters

| Adapter | Description | Link |
|---------|-------------|------|
| **adapter-auto** | Automatic platform detection | [Docs](https://kit.svelte.dev/docs/adapter-auto) |
| **adapter-vercel** | Vercel optimization | [Docs](https://kit.svelte.dev/docs/adapter-vercel) |
| **adapter-node** | Node.js servers | [Docs](https://kit.svelte.dev/docs/adapter-node) |
| **adapter-static** | Static site generation | [Docs](https://kit.svelte.dev/docs/adapter-static) |
| **adapter-cloudflare** | Cloudflare Pages/Workers | [Docs](https://kit.svelte.dev/docs/adapter-cloudflare) |

### Next.js: Optimized Deployment

| Platform | Description | Link |
|----------|-------------|------|
| **Vercel** | Zero-config deployment | [Website](https://vercel.com/) |
| **Netlify** | Good support with configuration | [Website](https://www.netlify.com/) |
| **AWS** | Flexible but requires setup | [AWS](https://aws.amazon.com/) |
| **Docker** | Containerized deployment | [Next.js Docker](https://nextjs.org/docs/deployment#docker-image) |

## 🛠️ Development Tools

### SvelteKit: Focused Tooling

| Tool | Description | Link |
|------|-------------|------|
| **Svelte for VS Code** | Official VS Code extension | [Marketplace](https://marketplace.visualstudio.com/items?itemName=svelte.svelte-vscode) |
| **Svelte DevTools** | Browser debugging extension | [GitHub](https://github.com/RedHatter/svelte-devtools) |
| **TypeScript** | Built-in support | Native |
| **HMR** | Hot module replacement | Built-in |

### Next.js: Rich Tooling

| Tool | Description | Link |
|------|-------------|------|
| **React DevTools** | Advanced debugging with time-travel | [Website](https://react.dev/learn/react-developer-tools) |
| **Storybook** | Component documentation | [Website](https://storybook.js.org/) |
| **Next.js DevTools** | Performance and bundle analysis | [Docs](https://nextjs.org/docs/app/building-your-application/optimizing/bundle-analyzer) |
| **Turbopack** | Next-gen bundler (experimental) | [Website](https://turbo.build/pack) |

## 🎯 Learning Curve & Developer Experience

### SvelteKit: Simpler Learning Path

| Aspect | Rating | Description |
|--------|--------|-------------|
| **Learning Curve** | ⭐⭐⭐⭐⭐ | Gentler curve, less boilerplate |
| **Documentation** | ⭐⭐⭐⭐ | Clear and comprehensive |
| **Community Size** | ⭐⭐⭐ | Smaller but passionate |
| **Job Market** | ⭐⭐⭐ | Growing but limited |
| **Ecosystem Maturity** | ⭐⭐⭐ | Newer but rapidly evolving |

### Next.js: Established but Complex

| Aspect | Rating | Description |
|--------|--------|-------------|
| **Learning Curve** | ⭐⭐⭐ | Steeper due to React complexity |
| **Documentation** | ⭐⭐⭐⭐⭐ | Excellent and comprehensive |
| **Community Size** | ⭐⭐⭐⭐⭐ | Massive React ecosystem |
| **Job Market** | ⭐⭐⭐⭐⭐ | High demand |
| **Ecosystem Maturity** | ⭐⭐⭐⭐⭐ | Very mature and stable |

## 🔄 Migration & Compatibility

### SvelteKit: Growing Ecosystem

**Note:** SvelteKit has many of the same tools as React and is simpler to learn and more efficiently designed. The ecosystem is rapidly growing with modern alternatives to React libraries.

| Category | Status | Description |
|----------|--------|-------------|
| **React Library Ports** | ✅ Growing | Many React libraries being ported |
| **Learning Simplicity** | ✅ Excellent | Less complex than React patterns |
| **Efficiency** | ✅ Superior | Compile-time optimizations |
| **Modern Architecture** | ✅ Leading | Built with modern web standards |

### Next.js: Mature Ecosystem

| Category | Status | Description |
|----------|--------|-------------|
| **Library Availability** | ✅ Extensive | Thousands of React libraries |
| **Enterprise Ready** | ✅ Yes | Battle-tested in production |
| **Migration Path** | ✅ Clear | From React apps to Next.js |
| **Long-term Support** | ✅ Stable | Backed by Vercel |

## 🏆 When to Choose Each

### Choose SvelteKit When:
- ✅ **Performance is critical** - Smaller bundles, faster runtime
- ✅ **Simpler development** experience preferred
- ✅ **Modern architecture** with compile-time optimizations
- ✅ **Flexible deployment** options needed
- ✅ **Learning efficiency** is important
- ✅ **Built-in solutions** are sufficient

### Choose Next.js When:
- ✅ **Large team** with React experience
- ✅ **Enterprise requirements** with complex needs
- ✅ **Extensive third-party integrations** required
- ✅ **Mature ecosystem** is priority
- ✅ **Job market** considerations important
- ✅ **React Server Components** needed

## 📈 Market Trends & Future

### SvelteKit Momentum
- **GitHub Stars**: 100k+ (83k Svelte, 18k SvelteKit) (rapidly growing)
- **Developer Satisfaction**: Consistently top-rated in surveys
- **Adoption**: Growing in startups and performance-focused companies
- **Innovation**: Leading in compile-time optimization

### Next.js Dominance
- **GitHub Stars**: 120k+ (established)
- **Market Share**: Dominant in React ecosystem
- **Enterprise Adoption**: Widespread
- **Backed by Vercel**: Strong commercial support

## 🔗 Essential Resources

### SvelteKit Resources
- [Official Documentation](https://kit.svelte.dev/docs)
- [Svelte Tutorial](https://svelte.dev/tutorial)
- [SvelteKit GitHub](https://github.com/sveltejs/kit)
- [Svelte Society](https://sveltesociety.dev/)

### Next.js Resources
- [Official Documentation](https://nextjs.org/docs)
- [Next.js Learn](https://nextjs.org/learn)
- [Next.js GitHub](https://github.com/vercel/next.js)
- [Awesome Next.js](https://github.com/unicodeveloper/awesome-nextjs)

---

**Bottom Line:** SvelteKit offers superior performance and developer experience with compile-time optimizations, while Next.js provides a mature ecosystem with extensive tooling. SvelteKit is simpler to learn and more efficiently designed, making it ideal for performance-critical applications and teams prioritizing developer experience.
