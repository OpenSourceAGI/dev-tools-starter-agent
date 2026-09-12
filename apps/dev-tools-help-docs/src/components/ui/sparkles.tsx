"use client"

import { useEffect, useRef } from "react"
import { cn } from "@/lib/cn"

interface SparklesCoreProps {
  background?: string
  minSize?: number
  maxSize?: number
  particleDensity?: number
  className?: string
  particleColor?: string
  speed?: number
}

interface Particle {
  x: number
  y: number
  size: number
  vx: number
  vy: number
  opacity: number
  fadeSpeed: number
}

export function SparklesCore({
  background = "transparent",
  minSize = 0.4,
  maxSize = 1,
  particleDensity = 100,
  className,
  particleColor = "#FFFFFF",
  speed = 1,
}: SparklesCoreProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const particlesRef = useRef<Particle[]>([])
  const rafRef = useRef<number>(0)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const resize = () => {
      canvas.width = canvas.offsetWidth
      canvas.height = canvas.offsetHeight
      initParticles()
    }

    const initParticles = () => {
      const count = Math.floor((canvas.width * canvas.height) / (10000 / (particleDensity / 100)))
      particlesRef.current = Array.from({ length: count }, () => createParticle(canvas))
    }

    const createParticle = (c: HTMLCanvasElement): Particle => ({
      x: Math.random() * c.width,
      y: Math.random() * c.height,
      size: minSize + Math.random() * (maxSize - minSize),
      vx: (Math.random() - 0.5) * 0.3 * speed,
      vy: (Math.random() - 0.5) * 0.3 * speed,
      opacity: Math.random(),
      fadeSpeed: 0.003 + Math.random() * 0.007,
    })

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      for (const p of particlesRef.current) {
        p.x += p.vx
        p.y += p.vy
        p.opacity += p.fadeSpeed
        if (p.opacity >= 1 || p.opacity <= 0) p.fadeSpeed *= -1

        if (p.x < 0) p.x = canvas.width
        if (p.x > canvas.width) p.x = 0
        if (p.y < 0) p.y = canvas.height
        if (p.y > canvas.height) p.y = 0

        ctx.save()
        ctx.globalAlpha = Math.abs(p.opacity)
        ctx.fillStyle = particleColor
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
        ctx.fill()
        ctx.restore()
      }

      rafRef.current = requestAnimationFrame(render)
    }

    const ro = new ResizeObserver(resize)
    ro.observe(canvas)
    resize()
    rafRef.current = requestAnimationFrame(render)

    return () => {
      cancelAnimationFrame(rafRef.current)
      ro.disconnect()
    }
  }, [minSize, maxSize, particleDensity, particleColor, speed])

  return (
    <canvas
      ref={canvasRef}
      style={{ background }}
      className={cn("w-full h-full", className)}
    />
  )
}
