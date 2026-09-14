import React from 'react';
import type { Block, ListItem } from '../types';
import { accentOf, resolveIcon, type IconMap } from './icons';
import type { Accent } from '../types';

const URL_OR_EMAIL = /(https?:\/\/[^\s<)]+|[\w.+-]+@[\w-]+\.[\w.-]+)/g;

/**
 * Turn bare URLs and email addresses inside the legal text into links.
 *
 * The content model stores plain strings so it can render to Markdown and
 * text too; this is where the React view earns its links back.
 */
export function linkify(text: string): React.ReactNode[] {
  return text.split(URL_OR_EMAIL).map((part, i) => {
    if (i % 2 === 0) return <React.Fragment key={i}>{part}</React.Fragment>;
    const href = part.includes('@') && !part.startsWith('http') ? `mailto:${part}` : part;
    return (
      <a
        key={i}
        href={href}
        className="text-blue-600 underline underline-offset-2 hover:text-blue-800 dark:text-blue-400"
        {...(href.startsWith('http') ? { target: '_blank', rel: 'noreferrer noopener' } : {})}
      >
        {part}
      </a>
    );
  });
}

function ListItems({ items, ordered }: { items: ListItem[]; ordered: boolean }) {
  const Tag = ordered ? 'ol' : 'ul';
  return (
    <Tag
      className={
        ordered
          ? 'my-3 list-decimal space-y-2 pl-6 [&_ol]:list-[lower-alpha]'
          : 'my-3 list-disc space-y-2 pl-6'
      }
    >
      {items.map((item, i) =>
        typeof item === 'string' ? (
          <li key={i}>{linkify(item)}</li>
        ) : (
          <li key={i}>
            {linkify(item.text)}
            {item.items ? <ListItems items={item.items} ordered={ordered} /> : null}
          </li>
        ),
      )}
    </Tag>
  );
}

export interface BlockProps {
  block: Block;
  accent?: Accent;
  icons?: IconMap;
  /** `'cards'` keeps the tinted tile layout; `'prose'` flattens to headings and lists. */
  style?: 'cards' | 'prose';
}

/**
 * Render one content block.
 *
 * The same block data drives both views — `style: 'prose'` is what lets the
 * full-text variant show a summary-only block (or a caller's card block)
 * without a second copy of the content.
 */
export function BlockView({ block, accent, icons, style = 'cards' }: BlockProps) {
  const tint = accentOf(accent);

  switch (block.type) {
    case 'p':
      return (
        <p className="my-4 leading-relaxed">
          {block.strong ? <strong>{linkify(block.text)}</strong> : linkify(block.text)}
        </p>
      );

    case 'ol':
    case 'ul':
      return (
        <>
          {block.lead ? <p className="my-4 leading-relaxed">{linkify(block.lead)}</p> : null}
          <ListItems items={block.items} ordered={block.type === 'ol'} />
        </>
      );

    case 'cards': {
      const columns = block.columns ?? 3;
      const grid =
        columns === 1
          ? 'grid-cols-1'
          : columns === 2
            ? 'sm:grid-cols-2'
            : columns === 3
              ? 'sm:grid-cols-2 lg:grid-cols-3'
              : 'sm:grid-cols-2 lg:grid-cols-4';
      if (style === 'prose') {
        return (
          <div className="my-4 space-y-4">
            {block.items.map((card, i) => (
              <div key={i}>
                <h4 className="font-semibold">{card.title}</h4>
                {card.text ? <p className="my-2 leading-relaxed">{linkify(card.text)}</p> : null}
                {card.items ? <ListItems items={card.items} ordered={false} /> : null}
              </div>
            ))}
          </div>
        );
      }
      return (
        <div className={`my-4 grid gap-4 ${grid}`}>
          {block.items.map((card, i) => {
            const Icon = resolveIcon(card.icon, icons);
            return (
              <div
                key={i}
                className={`rounded-lg border bg-white/80 p-4 backdrop-blur-sm transition-transform duration-300 hover:scale-[1.02] dark:bg-slate-900/60 ${tint.chip} ${
                  block.center ? 'text-center' : ''
                }`}
              >
                {card.icon ? (
                  <Icon
                    className={`mb-3 h-7 w-7 ${tint.icon} ${block.center ? 'mx-auto' : ''}`}
                  />
                ) : null}
                <h4 className="mb-2 text-base font-semibold">{card.title}</h4>
                {card.text ? <p className="text-sm leading-relaxed">{linkify(card.text)}</p> : null}
                {card.items ? (
                  <ul className="mt-2 space-y-1 text-sm">
                    {card.items.map((item, j) => (
                      <li key={j}>• {linkify(item)}</li>
                    ))}
                  </ul>
                ) : null}
              </div>
            );
          })}
        </div>
      );
    }

    case 'note': {
      const Icon = resolveIcon(block.icon, icons);
      if (style === 'prose') {
        return (
          <div className="my-4">
            {block.title ? <h4 className="font-semibold">{block.title}</h4> : null}
            {block.text ? <p className="my-2 leading-relaxed">{linkify(block.text)}</p> : null}
            {block.items ? <ListItems items={block.items} ordered={false} /> : null}
          </div>
        );
      }
      return (
        <div
          className={`my-4 rounded-lg border bg-white/80 p-4 backdrop-blur-sm dark:bg-slate-900/60 ${tint.chip}`}
        >
          {block.title ? (
            <h4 className="mb-3 flex items-center text-base font-semibold">
              {block.icon ? <Icon className={`mr-2 h-5 w-5 ${tint.icon}`} /> : null}
              {block.title}
            </h4>
          ) : null}
          {block.text ? <p className="text-sm leading-relaxed">{linkify(block.text)}</p> : null}
          {block.items ? (
            <ul className="mt-2 space-y-2 text-sm">
              {block.items.map((item, i) => (
                <li key={i}>• {linkify(typeof item === 'string' ? item : item.text)}</li>
              ))}
            </ul>
          ) : null}
        </div>
      );
    }
  }
}
