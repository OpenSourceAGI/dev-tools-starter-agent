'use client'

import {
  type MotionValue,
  motion,
  useScroll,
  useSpring,
  useTransform,
} from 'motion/react'
import { type ReactNode, useRef } from 'react'
import { cn } from '@/lib/cn'

export interface HeroParallaxProduct {
  title: string
  link: string
  thumbnail: string
  /** Shown over the thumbnail on hover. */
  description?: string
  /** Small label above the title on hover, e.g. the category. */
  eyebrow?: string
}

/**
 * Aceternity's hero parallax: three rows of cards that tilt into place and
 * slide in opposite directions as the section scrolls past.
 *
 * Adapted from the original to take any number of products (split evenly over
 * three rows instead of a fixed 5/5/5), a custom `header`, and an optional
 * description per card.
 */
export const HeroParallax = ({
  products,
  header = <Header />,
  className,
}: {
  products: HeroParallaxProduct[]
  header?: ReactNode
  className?: string
}) => {
  const perRow = Math.ceil(products.length / 3)
  const firstRow = products.slice(0, perRow)
  const secondRow = products.slice(perRow, perRow * 2)
  const thirdRow = products.slice(perRow * 2)
  const ref = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start start', 'end start'],
  })

  const springConfig = { stiffness: 300, damping: 30, bounce: 100 }

  const translateX = useSpring(
    useTransform(scrollYProgress, [0, 1], [0, 1000]),
    springConfig
  )
  const translateXReverse = useSpring(
    useTransform(scrollYProgress, [0, 1], [0, -1000]),
    springConfig
  )
  const rotateX = useSpring(
    useTransform(scrollYProgress, [0, 0.2], [15, 0]),
    springConfig
  )
  const opacity = useSpring(
    useTransform(scrollYProgress, [0, 0.2], [0.2, 1]),
    springConfig
  )
  const rotateZ = useSpring(
    useTransform(scrollYProgress, [0, 0.2], [20, 0]),
    springConfig
  )
  const translateY = useSpring(
    useTransform(scrollYProgress, [0, 0.2], [-700, 500]),
    springConfig
  )

  return (
    <div
      className={cn(
        'relative flex h-[300vh] flex-col self-auto overflow-hidden py-40 antialiased [perspective:1000px] [transform-style:preserve-3d]',
        className
      )}
      ref={ref}
    >
      {header}
      <motion.div
        style={{
          rotateX,
          rotateZ,
          translateY,
          opacity,
        }}
      >
        <motion.div className='mb-20 flex flex-row-reverse space-x-20 space-x-reverse'>
          {firstRow.map((product) => (
            <ProductCard
              key={product.title}
              product={product}
              translate={translateX}
            />
          ))}
        </motion.div>
        <motion.div className='mb-20 flex flex-row space-x-20'>
          {secondRow.map((product) => (
            <ProductCard
              key={product.title}
              product={product}
              translate={translateXReverse}
            />
          ))}
        </motion.div>
        <motion.div className='flex flex-row-reverse space-x-20 space-x-reverse'>
          {thirdRow.map((product) => (
            <ProductCard
              key={product.title}
              product={product}
              translate={translateX}
            />
          ))}
        </motion.div>
      </motion.div>
    </div>
  )
}

export const Header = () => {
  return (
    <div className='relative top-0 left-0 mx-auto w-full max-w-7xl px-4 py-20 md:py-40'>
      <h1 className='font-bold text-2xl md:text-7xl dark:text-white'>
        The Ultimate <br /> development studio
      </h1>
      <p className='mt-8 max-w-2xl text-base md:text-xl dark:text-neutral-200'>
        We build beautiful products with the latest technologies and frameworks.
        We are a team of passionate developers and designers that love to build
        amazing products.
      </p>
    </div>
  )
}

export const ProductCard = ({
  product,
  translate,
}: {
  product: HeroParallaxProduct
  translate: MotionValue<number>
}) => {
  const external = /^https?:\/\//.test(product.link)
  return (
    <motion.div
      className='group/product relative h-96 w-[30rem] shrink-0 overflow-hidden rounded-2xl border border-white/10 bg-neutral-950'
      style={{
        x: translate,
      }}
      whileHover={{
        y: -20,
      }}
    >
      <a
        className='block h-full group-hover/product:shadow-2xl'
        href={product.link}
        {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
      >
        {/* biome-ignore lint/performance/noImgElement: static SVG covers; next/image adds nothing here */}
        <img
          alt={product.title}
          className='absolute inset-0 h-full w-full object-cover object-top-left'
          height='768'
          loading='lazy'
          src={product.thumbnail}
          width='960'
        />
        <div className='pointer-events-none absolute inset-0 h-full w-full bg-black opacity-0 transition-opacity duration-300 group-hover/product:opacity-85' />
        <div className='pointer-events-none absolute inset-x-0 bottom-0 flex translate-y-4 flex-col gap-2 p-6 opacity-0 transition-all duration-300 group-hover/product:translate-y-0 group-hover/product:opacity-100'>
          {product.eyebrow && (
            <span className='font-semibold text-white/60 text-xs uppercase tracking-widest'>
              {product.eyebrow}
            </span>
          )}
          <h2 className='font-bold text-white text-xl'>{product.title}</h2>
          {product.description && (
            <p className='text-sm text-white/80 leading-relaxed'>
              {product.description}
            </p>
          )}
        </div>
      </a>
    </motion.div>
  )
}
