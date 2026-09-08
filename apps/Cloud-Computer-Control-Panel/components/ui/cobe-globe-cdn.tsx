"use client"

import { useEffect, useRef, useCallback } from "react"
import createGlobe from "cobe"

interface CdnMarker {
  id: string
  location: [number, number]
  region: string
}

interface CdnArc {
  id: string
  from: [number, number]
  to: [number, number]
}

interface GlobeCdnProps {
  markers?: CdnMarker[]
  arcs?: CdnArc[]
  className?: string
  speed?: number
}

const defaultMarkers: CdnMarker[] = [
  { id: "cdn-iad", location: [38.95, -77.45], region: "iad1" },
  { id: "cdn-sfo", location: [37.62, -122.38], region: "sfo1" },
  { id: "cdn-cdg", location: [49.01, 2.55], region: "cdg1" },
  { id: "cdn-hnd", location: [35.55, 139.78], region: "hnd1" },
  { id: "cdn-syd", location: [-33.95, 151.18], region: "syd1" },
  { id: "cdn-gru", location: [-23.43, -46.47], region: "gru1" },
  { id: "cdn-sin", location: [1.36, 103.99], region: "sin1" },
  { id: "cdn-arn", location: [59.65, 17.93], region: "arn1" },
  { id: "cdn-dub", location: [53.43, -6.25], region: "dub1" },
  { id: "cdn-bom", location: [19.09, 72.87], region: "bom1" },
]

export function GlobeCdn({ markers = defaultMarkers, className = "", speed = 0.003 }: GlobeCdnProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const pointerInteracting = useRef<number | null>(null)
  const pointerInteractionMovement = useRef(0)
  const rotationRef = useRef(0)
  const phiRef = useRef(0)

  const handlePointerDown = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    pointerInteracting.current = e.clientX
    if (canvasRef.current) canvasRef.current.style.cursor = "grabbing"
  }, [])

  const handlePointerUp = useCallback(() => {
    pointerInteracting.current = null
    if (canvasRef.current) canvasRef.current.style.cursor = "grab"
  }, [])

  useEffect(() => {
    const handlePointerMove = (e: PointerEvent) => {
      if (pointerInteracting.current !== null) {
        const delta = e.clientX - pointerInteracting.current
        pointerInteractionMovement.current = delta
        rotationRef.current += delta / 300
        pointerInteracting.current = e.clientX
      }
    }
    window.addEventListener("pointermove", handlePointerMove, { passive: true })
    window.addEventListener("pointerup", handlePointerUp, { passive: true })
    return () => {
      window.removeEventListener("pointermove", handlePointerMove)
      window.removeEventListener("pointerup", handlePointerUp)
    }
  }, [handlePointerUp])

  useEffect(() => {
    if (!canvasRef.current) return
    const canvas = canvasRef.current
    let globe: ReturnType<typeof createGlobe> | null = null
    let width = 0

    const onResize = () => {
      width = canvas.offsetWidth
    }

    function init() {
      onResize()
      if (width === 0 || globe) return

      const dpr = Math.min(window.devicePixelRatio || 1, 2)

      globe = createGlobe(canvas, {
        devicePixelRatio: dpr,
        width: width * dpr,
        height: width * dpr,
        phi: 0,
        theta: 0.2,
        dark: 0,
        diffuse: 1.5,
        mapSamples: 16000,
        mapBrightness: 10,
        baseColor: [1, 1, 1],
        markerColor: [0, 0, 0],
        glowColor: [0.94, 0.93, 0.91],
        markers: markers.map((m) => ({ location: m.location, size: 0.05 })),
        opacity: 0.9,
        onRender: (state) => {
          if (pointerInteracting.current === null) phiRef.current += speed
          state.phi = phiRef.current + rotationRef.current
          state.width = width * dpr
          state.height = width * dpr
        },
      })

      requestAnimationFrame(() => {
        canvas.style.opacity = "1"
      })
    }

    if (canvas.offsetWidth > 0) {
      init()
    } else {
      const ro = new ResizeObserver((entries) => {
        if (entries[0]?.contentRect.width > 0) {
          ro.disconnect()
          init()
        }
      })
      ro.observe(canvas)
    }

    window.addEventListener("resize", onResize)

    return () => {
      window.removeEventListener("resize", onResize)
      if (globe) globe.destroy()
    }
  }, [markers, speed])

  return (
    <div className={`relative aspect-square select-none ${className}`}>
      <canvas
        ref={canvasRef}
        onPointerDown={handlePointerDown}
        style={{
          width: "100%",
          height: "100%",
          cursor: "grab",
          opacity: 0,
          transition: "opacity 1.2s ease",
          contain: "layout paint size",
        }}
      />
    </div>
  )
}
