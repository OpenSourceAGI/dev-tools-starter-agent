"use client"

import * as React from "react"
import { X, Check, Loader2, Search } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Command, CommandGroup, CommandItem, CommandList } from "@/components/ui/command"
import { Command as CommandPrimitive } from "cmdk"
import { cn } from "@/lib/utils"

export interface Tag {
  id: string
  label: string
  value: string
  type: "indicator" | "symbol"
  color?: string
}

interface TagInputProps {
  placeholder?: string
  tags: Tag[]
  onTagsChange: (tags: Tag[]) => void
  suggestions?: Tag[] // Static suggestions (indicators)
  onSearch?: (query: string) => Promise<Tag[]> // Async suggestions (stocks)
}

export function TagInput({
  placeholder = "Add tag...",
  tags,
  onTagsChange,
  suggestions = [],
  onSearch
}: TagInputProps) {
  const inputRef = React.useRef<HTMLInputElement>(null)
  const [open, setOpen] = React.useState(false)
  const [inputValue, setInputValue] = React.useState("")
  const [searchResults, setSearchResults] = React.useState<Tag[]>([])
  const [loading, setLoading] = React.useState(false)

  // Debounced search
  React.useEffect(() => {
    const timer = setTimeout(async () => {
      if (!inputValue || inputValue.length < 2 || !onSearch) {
        setSearchResults([])
        return
      }

      setLoading(true)
      try {
        const results = await onSearch(inputValue)
        setSearchResults(results)
      } catch (error) {
        console.error("Tag search failed", error)
      } finally {
        setLoading(false)
      }
    }, 300)

    return () => clearTimeout(timer)
  }, [inputValue, onSearch])

  const handleUnselect = (tag: Tag) => {
    onTagsChange(tags.filter((t) => t.value !== tag.value))
  }

  const handleSelect = (tag: Tag) => {
    setInputValue("")
    setSearchResults([])
    // Prevent duplicates
    if (!tags.some(t => t.value === tag.value)) {
      onTagsChange([...tags, tag])
    }
    setOpen(false)
    inputRef.current?.focus()
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const input = inputRef.current
    if (input) {
      if (e.key === "Delete" || e.key === "Backspace") {
        if (input.value === "" && tags.length > 0) {
          handleUnselect(tags[tags.length - 1])
        }
      }
      if (e.key === "Escape") {
        input.blur()
      }
    }
  }

  // Filter static suggestions based on input
  const filteredSuggestions = suggestions.filter(s =>
    s.label.toLowerCase().includes(inputValue.toLowerCase()) &&
    !tags.some(t => t.value === s.value)
  )

  const showSuggestions = open && (filteredSuggestions.length > 0 || searchResults.length > 0 || loading)

  return (
    <div className="w-full">
      <Command onKeyDown={handleKeyDown} className="overflow-visible bg-transparent">
        <div className="group border border-input px-3 py-2 text-sm ring-offset-background rounded-md focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2">
          <div className="flex flex-wrap gap-1">
            {tags.map((tag) => (
              <Badge key={tag.value} variant="secondary" className={cn("gap-1 pr-1", tag.type === "indicator" ? "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300" : "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300")}>
                {tag.label}
                <button
                  className="ml-1 ring-offset-background rounded-full outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      handleUnselect(tag)
                    }
                  }}
                  onMouseDown={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                  }}
                  onClick={() => handleUnselect(tag)}
                >
                  <X className="h-3 w-3 text-muted-foreground hover:text-foreground" />
                </button>
              </Badge>
            ))}
            <CommandPrimitive.Input
              ref={inputRef}
              value={inputValue}
              onValueChange={setInputValue}
              onBlur={() => setOpen(false)}
              onFocus={() => setOpen(true)}
              placeholder={tags.length === 0 ? placeholder : ""}
              className="ml-2 flex-1 bg-transparent outline-none placeholder:text-muted-foreground min-w-[120px]"
            />
          </div>
        </div>

        {showSuggestions && (
          <div className="absolute mt-2 z-50 w-full bg-popover text-popover-foreground rounded-md border shadow-md animate-in fade-in-0 zoom-in-95 overflow-hidden">

            {/* Indicators Group */}
            {filteredSuggestions.length > 0 && (
              <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground bg-muted/30">
                Indicators
              </div>
            )}
            {filteredSuggestions.map((suggestion) => (
              <div
                key={suggestion.value}
                onMouseDown={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                }}
                onClick={() => handleSelect(suggestion)}
                className="relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50"
              >
                <div className="mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary/30">
                  <span className="text-[10px] font-bold">I</span>
                </div>
                {suggestion.label}
              </div>
            ))}


            {loading && (
              <div className="flex items-center justify-center p-4 text-sm text-muted-foreground">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Searching...
              </div>
            )}

            {searchResults.map((suggestion) => (
              <div
                key={suggestion.value}
                onMouseDown={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                }}
                onClick={() => handleSelect(suggestion)}
                className="relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50"
              >
                <div className="mr-2 flex h-4 w-4 items-center justify-center rounded-full bg-accent text-accent-foreground">
                  <span className="text-[9px] font-bold">{suggestion.value[0]}</span>
                </div>
                <div className="flex flex-col">
                  <span className="font-medium">{suggestion.value}</span>
                  <span className="text-xs text-muted-foreground">{suggestion.label}</span>
                </div>
              </div>
            ))}

            {inputValue.length > 0 && filteredSuggestions.length === 0 && searchResults.length === 0 && !loading && (
              <div className="py-6 text-center text-sm text-muted-foreground">
                No results found.
              </div>
            )}

          </div>
        )}
      </Command>
    </div>
  )
}
