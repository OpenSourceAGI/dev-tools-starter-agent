/**
 * @file store.ts
 * @description Persistence for page overrides and pending suggestions.
 *
 * The default store is a single JSON file (see `DOC_EDITS_DATA_FILE`), which
 * suits `next start` on one server. Hosts without a writable filesystem
 * (Cloudflare Workers, serverless) should implement `DocEditStore` over their
 * own database or KV namespace and return it from `getDocEditStore()`.
 */
import { mkdir, readFile, rename, writeFile } from 'fs/promises';
import { dirname } from 'path';
import { getDataFile } from './config';

export type SuggestionStatus = 'pending' | 'approved' | 'rejected';

/** Published replacement body for one docs page. */
export interface DocOverride {
  /** Page slug joined with `/`; `''` is the docs index. */
  slug: string;
  markdown: string;
  updatedAt: string;
  updatedBy: string;
}

/** A change proposed by any visitor, waiting for an admin. */
export interface DocSuggestion {
  id: string;
  slug: string;
  pageTitle: string;
  /** The page body the suggester started from, to diff against. */
  baseMarkdown: string;
  markdown: string;
  note: string;
  author: string;
  status: SuggestionStatus;
  createdAt: string;
  reviewedAt?: string;
  reviewedBy?: string;
}

export interface DocEditStore {
  getOverride(slug: string): Promise<DocOverride | null>;
  listOverrides(): Promise<DocOverride[]>;
  setOverride(override: DocOverride): Promise<void>;
  deleteOverride(slug: string): Promise<boolean>;
  listSuggestions(status?: SuggestionStatus): Promise<DocSuggestion[]>;
  getSuggestion(id: string): Promise<DocSuggestion | null>;
  addSuggestion(suggestion: DocSuggestion): Promise<void>;
  updateSuggestion(id: string, patch: Partial<DocSuggestion>): Promise<DocSuggestion | null>;
}

interface DataFile {
  overrides: Record<string, DocOverride>;
  suggestions: DocSuggestion[];
}

export function createFileStore(file: string): DocEditStore {
  // Serialize writes in this process so concurrent requests can't drop each other's changes.
  let queue: Promise<unknown> = Promise.resolve();

  async function read(): Promise<DataFile> {
    try {
      const data = JSON.parse(await readFile(file, 'utf8')) as Partial<DataFile>;
      return { overrides: data.overrides ?? {}, suggestions: data.suggestions ?? [] };
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return { overrides: {}, suggestions: [] };
      }
      throw error;
    }
  }

  function mutate<T>(fn: (data: DataFile) => T): Promise<T> {
    const run = queue.then(async () => {
      const data = await read();
      const result = fn(data);
      await mkdir(dirname(file), { recursive: true });
      const tmp = `${file}.${process.pid}.tmp`;
      await writeFile(tmp, JSON.stringify(data, null, 2));
      await rename(tmp, file);
      return result;
    });
    queue = run.catch(() => undefined);
    return run;
  }

  return {
    async getOverride(slug) {
      return (await read()).overrides[slug] ?? null;
    },
    async listOverrides() {
      return Object.values((await read()).overrides).sort((a, b) =>
        b.updatedAt.localeCompare(a.updatedAt),
      );
    },
    setOverride(override) {
      return mutate((data) => {
        data.overrides[override.slug] = override;
      });
    },
    deleteOverride(slug) {
      return mutate((data) => {
        const existed = slug in data.overrides;
        delete data.overrides[slug];
        return existed;
      });
    },
    async listSuggestions(status) {
      const { suggestions } = await read();
      return suggestions
        .filter((s) => !status || s.status === status)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    },
    async getSuggestion(id) {
      return (await read()).suggestions.find((s) => s.id === id) ?? null;
    },
    addSuggestion(suggestion) {
      return mutate((data) => {
        data.suggestions.push(suggestion);
      });
    },
    updateSuggestion(id, patch) {
      return mutate((data) => {
        const suggestion = data.suggestions.find((s) => s.id === id);
        if (!suggestion) return null;
        Object.assign(suggestion, patch, { id });
        return suggestion;
      });
    },
  };
}

let store: DocEditStore | undefined;

/** The store every route and page uses. Swap the implementation here. */
export function getDocEditStore(): DocEditStore {
  store ??= createFileStore(getDataFile());
  return store;
}

export function slugKey(slug: string[] | undefined): string {
  return (slug ?? []).join('/');
}
