"use client"

import * as React from "react"

import { cn } from "@/lib/utils"

type SliderProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, "type" | "onChange" | "value"> & {
  value?: number[]
  onValueChange?: (value: number[]) => void
}

const Slider = React.forwardRef<HTMLInputElement, SliderProps>(
  ({ className, value = [0], onValueChange, min = 0, max = 100, step = 1, ...props }, ref) => {
    return (
      <input
        ref={ref}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value[0] ?? 0}
        onChange={(event) => onValueChange?.([Number(event.target.value)])}
        className={cn(
          "h-2 w-full cursor-pointer appearance-none rounded-full bg-slate-800 accent-sky-400",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950",
          className,
        )}
        {...props}
      />
    )
  },
)

Slider.displayName = "Slider"

export { Slider }
