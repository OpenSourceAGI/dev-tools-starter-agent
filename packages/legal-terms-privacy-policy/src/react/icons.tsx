import React from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  BookOpen,
  Building2,
  Calendar,
  Check,
  ChevronRight,
  Copy,
  Eye,
  FileText,
  Globe,
  List,
  Lock,
  Mail,
  Menu,
  Scale,
  Settings,
  Shield,
  Sparkles,
  Star,
  User,
  Users,
  X,
} from 'lucide-react';
import type { Accent, IconName } from '../types';

/**
 * Icons referenced by the built-in content, imported by name so bundlers can
 * drop the rest of `lucide-react`.
 *
 * Callers adding their own sections can pass extra entries through the
 * `icons` prop; anything still unresolved falls back to a document glyph
 * rather than throwing.
 */
export const ICONS = {
  AlertTriangle,
  ArrowLeft,
  BookOpen,
  Building2,
  Calendar,
  Check,
  ChevronRight,
  Copy,
  Eye,
  FileText,
  Globe,
  List,
  Lock,
  Mail,
  Menu,
  Scale,
  Settings,
  Shield,
  Sparkles,
  Star,
  User,
  Users,
  X,
} as const;

export type IconComponent = React.ComponentType<{ className?: string }>;
export type IconMap = Record<string, IconComponent>;

/** Look up an icon by name, falling back to `FileText` for unknown names. */
export function resolveIcon(name: IconName | undefined, extra?: IconMap): IconComponent {
  if (!name) return FileText;
  return extra?.[name] ?? (ICONS as unknown as IconMap)[name] ?? FileText;
}

/** Tailwind classes per accent, so sections tint consistently across views. */
export const ACCENTS: Record<Accent, { card: string; icon: string; chip: string }> = {
  indigo: {
    card: 'from-indigo-50 to-purple-50 border-indigo-200 dark:from-indigo-950/40 dark:to-purple-950/40 dark:border-indigo-900',
    icon: 'text-indigo-600 dark:text-indigo-400',
    chip: 'border-indigo-200 dark:border-indigo-900',
  },
  emerald: {
    card: 'from-emerald-50 to-teal-50 border-emerald-200 dark:from-emerald-950/40 dark:to-teal-950/40 dark:border-emerald-900',
    icon: 'text-emerald-600 dark:text-emerald-400',
    chip: 'border-emerald-200 dark:border-emerald-900',
  },
  blue: {
    card: 'from-blue-50 to-indigo-50 border-blue-200 dark:from-blue-950/40 dark:to-indigo-950/40 dark:border-blue-900',
    icon: 'text-blue-600 dark:text-blue-400',
    chip: 'border-blue-200 dark:border-blue-900',
  },
  amber: {
    card: 'from-amber-50 to-orange-50 border-amber-200 dark:from-amber-950/40 dark:to-orange-950/40 dark:border-amber-900',
    icon: 'text-amber-600 dark:text-amber-400',
    chip: 'border-amber-200 dark:border-amber-900',
  },
  rose: {
    card: 'from-rose-50 to-pink-50 border-rose-200 dark:from-rose-950/40 dark:to-pink-950/40 dark:border-rose-900',
    icon: 'text-rose-600 dark:text-rose-400',
    chip: 'border-rose-200 dark:border-rose-900',
  },
  cyan: {
    card: 'from-cyan-50 to-blue-50 border-cyan-200 dark:from-cyan-950/40 dark:to-blue-950/40 dark:border-cyan-900',
    icon: 'text-cyan-600 dark:text-cyan-400',
    chip: 'border-cyan-200 dark:border-cyan-900',
  },
  teal: {
    card: 'from-teal-50 to-cyan-50 border-teal-200 dark:from-teal-950/40 dark:to-cyan-950/40 dark:border-teal-900',
    icon: 'text-teal-600 dark:text-teal-400',
    chip: 'border-teal-200 dark:border-teal-900',
  },
  green: {
    card: 'from-green-50 to-emerald-50 border-green-200 dark:from-green-950/40 dark:to-emerald-950/40 dark:border-green-900',
    icon: 'text-green-600 dark:text-green-400',
    chip: 'border-green-200 dark:border-green-900',
  },
  yellow: {
    card: 'from-yellow-50 to-amber-50 border-yellow-200 dark:from-yellow-950/40 dark:to-amber-950/40 dark:border-yellow-900',
    icon: 'text-yellow-600 dark:text-yellow-400',
    chip: 'border-yellow-200 dark:border-yellow-900',
  },
  purple: {
    card: 'from-purple-50 to-violet-50 border-purple-200 dark:from-purple-950/40 dark:to-violet-950/40 dark:border-purple-900',
    icon: 'text-purple-600 dark:text-purple-400',
    chip: 'border-purple-200 dark:border-purple-900',
  },
  red: {
    card: 'from-red-50 to-rose-50 border-red-200 dark:from-red-950/40 dark:to-rose-950/40 dark:border-red-900',
    icon: 'text-red-600 dark:text-red-400',
    chip: 'border-red-200 dark:border-red-900',
  },
  slate: {
    card: 'from-slate-50 to-gray-50 border-slate-200 dark:from-slate-900/60 dark:to-gray-900/60 dark:border-slate-700',
    icon: 'text-slate-600 dark:text-slate-400',
    chip: 'border-slate-200 dark:border-slate-700',
  },
};

/** Accent classes for a section, defaulting to `slate` for untinted sections. */
export function accentOf(accent: Accent | undefined) {
  return ACCENTS[accent ?? 'slate'];
}
