'use client'

import { HeroParallax } from '@/components/ui/hero-parallax'
import { categories } from './packages-data'

const products = categories.flatMap((category) =>
  category.packages.map((pkg) => ({
    title: pkg.name,
    link: pkg.href,
    thumbnail: pkg.image,
    description: pkg.longDescription,
    eyebrow: category.name,
  }))
)

/** The homepage's scroll-driven tour of every package, app and template. */
export function PackageShowcase() {
  return (
    <HeroParallax
      className='border-border border-b'
      header={
        <div className='relative top-0 left-0 mx-auto w-full max-w-7xl px-4 py-20 sm:px-6 md:py-32 lg:px-8'>
          <p className='mb-4 font-semibold text-muted-foreground text-sm uppercase tracking-widest'>
            The toolkit
          </p>
          <h2 className='font-bold text-3xl text-foreground tracking-tight md:text-6xl'>
            {products.length} tools, <br /> one monorepo
          </h2>
          <p className='mt-8 max-w-2xl text-base text-muted-foreground leading-relaxed md:text-xl'>
            CLIs that set up servers and scaffold projects, libraries for
            storage and icons, Cloudflare services that verify phones and fix
            failed builds, and starter templates for Next.js and SvelteKit.
            Scroll through them all — hover any card for the full story, click
            for its docs.
          </p>
        </div>
      }
      products={products}
    />
  )
}
