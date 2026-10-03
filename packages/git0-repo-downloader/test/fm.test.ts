import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import os from 'os';
import path from 'path';
// @ts-expect-error - plain JS module
import { FileManager } from '../src/fm.js';

/**
 * `fm` is a full-screen terminal app, so every terminal touch point is
 * replaced for the duration of a test: stdin raw-mode toggles, the process
 * listeners the constructor registers (which would otherwise fire
 * `process.exit` when the test runner exits), console output, terminal size,
 * and the HOME directory the bookmarks file lives in.
 */
let home: string;
let work: string;
let out: string[];
let writes: string[];
let exits: number[];
let restore: Array<() => void>;
let fm: any;

const strip = (s: string) => s.replace(/\x1b\[[0-9;?]*[a-zA-Z]/g, '');
const text = () => strip(out.join('\n'));

function patch<T extends object, K extends keyof T>(obj: T, key: K, value: T[K]) {
  const had = Object.prototype.hasOwnProperty.call(obj, key);
  const orig = (obj as any)[key];
  Object.defineProperty(obj, key, { value, configurable: true, writable: true });
  restore.push(() => {
    if (had) Object.defineProperty(obj, key, { value: orig, configurable: true, writable: true });
    else delete (obj as any)[key];
  });
}

/** Queue answers for `getInput()` prompts. */
function answers(...a: string[]) {
  const queue = [...a];
  fm.getInput = async () => queue.shift() ?? '';
  fm.waitForKey = async () => {};
}

function makeTree() {
  fs.mkdirSync(path.join(work, 'alpha'));
  fs.mkdirSync(path.join(work, 'zeta'));
  fs.mkdirSync(path.join(work, '.hidden-dir'));
  fs.writeFileSync(path.join(work, 'b.txt'), 'hello\nworld\nthree\nfour');
  fs.writeFileSync(path.join(work, 'a10.md'), '# ten');
  fs.writeFileSync(path.join(work, 'a2.md'), '# two!!');
  fs.writeFileSync(path.join(work, '.secret'), 's');
  fs.writeFileSync(path.join(work, 'run.sh'), '#!/bin/sh');
  fs.chmodSync(path.join(work, 'run.sh'), 0o755);
  fs.writeFileSync(path.join(work, 'pic.png'), 'x'.repeat(2048));
  fs.writeFileSync(path.join(work, 'pic.png'), 'x'.repeat(2048));
  fs.writeFileSync(path.join(work, 'song.mp3'), 'x');
  fs.writeFileSync(path.join(work, 'clip.mp4'), 'x');
  fs.writeFileSync(path.join(work, 'pack.zip'), 'x');
  fs.writeFileSync(path.join(work, 'unknown.xyz'), 'x');
  fs.symlinkSync(path.join(work, 'b.txt'), path.join(work, 'link-to-b'));
}

async function create() {
  const f = new FileManager();
  f.rl.close();
  f.rl = { question: (_q: string, cb: (a: string) => void) => cb('') };
  f.currentPath = work;
  f.history = [work];
  f.historyIndex = 0;
  await f.loadDirectory();
  return f;
}

beforeEach(async () => {
  restore = [];
  out = [];
  writes = [];
  exits = [];
  home = fs.mkdtempSync(path.join(os.tmpdir(), 'fm-home-'));
  work = fs.mkdtempSync(path.join(os.tmpdir(), 'fm-work-'));
  // Bun's os.homedir() ignores runtime HOME changes, so patch the function itself.
  patch(os, 'homedir', () => home);

  const stdin = process.stdin as any;
  patch(stdin, 'setRawMode', () => stdin);
  patch(stdin, 'resume', () => stdin);
  patch(stdin, 'setEncoding', () => stdin);

  // The constructor wires cleanup() to SIGINT/SIGTERM/exit; don't let it.
  const realOn = process.on.bind(process);
  patch(process, 'on', ((ev: string, fn: any) =>
    ['SIGINT', 'SIGTERM', 'exit'].includes(ev) ? process : realOn(ev, fn)) as any);

  patch(process, 'exit', ((code?: number) => void exits.push(code ?? 0)) as any);
  patch(process.stdout, 'write', ((s: any) => (writes.push(String(s)), true)) as any);
  patch(process.stdout, 'columns', 100);
  patch(process.stdout, 'rows', 30);
  patch(console, 'log', (...a: unknown[]) => void out.push(a.join(' ')));
  patch(console, 'clear', () => void out.push('<clear>'));

  makeTree();
  fm = await create();
});

afterEach(() => {
  process.stdin.removeAllListeners('data');
  for (const r of restore.reverse()) r();
  fs.rmSync(home, { recursive: true, force: true });
  fs.rmSync(work, { recursive: true, force: true });
});

const names = () => fm.items.map((i: any) => i.name);

describe('construction and bookmarks', () => {
  test('enables mouse tracking and hides the cursor', () => {
    const joined = writes.join('');
    expect(joined).toContain('\x1b[?1000h');
    expect(joined).toContain('\x1b[?1006h');
    expect(joined).toContain('\x1B[?25l');
  });

  test('defaults bookmarks to the usual home folders', () => {
    expect(fm.bookmarks.Home).toBe(home);
    expect(fm.bookmarks.Documents).toBe(path.join(home, 'Documents'));
    expect(Object.keys(fm.bookmarks)).toEqual(['Home', 'Documents', 'Downloads', 'Desktop']);
  });

  test('loads saved bookmarks and ignores a corrupt file', async () => {
    fs.writeFileSync(path.join(home, '.fileman-bookmarks.json'), JSON.stringify({ Proj: '/p' }));
    expect(new FileManager().loadBookmarks()).toEqual({ Proj: '/p' });
    fs.writeFileSync(path.join(home, '.fileman-bookmarks.json'), '{nope');
    expect(Object.keys(new FileManager().loadBookmarks())).toContain('Home');
  });

  test('saveBookmarks persists and swallows write errors', () => {
    fm.bookmarks = { A: '/a' };
    fm.saveBookmarks();
    expect(JSON.parse(fs.readFileSync(path.join(home, '.fileman-bookmarks.json'), 'utf8'))).toEqual({ A: '/a' });
    patch(os, 'homedir', () => path.join(home, 'missing', 'deeper'));
    expect(() => fm.saveBookmarks()).not.toThrow();
  });

  test('cleanup restores the terminal, saves bookmarks and exits 0', () => {
    fm.bookmarks = { Saved: '/s' };
    fm.cleanup();
    const joined = writes.join('');
    expect(joined).toContain('\x1B[?25h');
    expect(joined).toContain('\x1b[?1000l');
    expect(exits).toEqual([0]);
    expect(fs.existsSync(path.join(home, '.fileman-bookmarks.json'))).toBe(true);
  });
});

describe('pure helpers', () => {
  test('getFileIcon picks by type, hidden-ness and extension', () => {
    expect(fm.getFileIcon({ isDirectory: true, name: 'src' })).toBe('📁');
    expect(fm.getFileIcon({ isDirectory: true, name: '.git' })).toBe('📂');
    expect(fm.getFileIcon({ isDirectory: false, name: 'a.PNG' })).toBe('🖼️');
    expect(fm.getFileIcon({ isDirectory: false, name: 'a.rs' })).toBe('🦀');
    expect(fm.getFileIcon({ isDirectory: false, name: 'a.unknown' })).toBe('📄');
  });

  test('getPermissions renders rwx triplets', () => {
    expect(fm.getPermissions(0o755)).toBe('rwxr-xr-x');
    expect(fm.getPermissions(0o644)).toBe('rw-r--r--');
    expect(fm.getPermissions(0o000)).toBe('---------');
    expect(fm.getPermissions(0o100777)).toBe('rwxrwxrwx');
  });

  test('formatSize scales units', () => {
    expect(fm.formatSize(0)).toBe('0 B');
    expect(fm.formatSize(512)).toBe('512 B');
    expect(fm.formatSize(1536)).toBe('1.5 KB');
    expect(fm.formatSize(5 * 1024 * 1024)).toBe('5 MB');
    expect(fm.formatSize(3 * 1024 ** 3)).toBe('3 GB');
  });

  test('formatDate includes the date and a time', () => {
    const s = fm.formatDate(new Date(2024, 0, 2, 3, 4));
    expect(s).toContain(new Date(2024, 0, 2).toLocaleDateString());
    expect(s.length).toBeGreaterThan(8);
  });

  test('truncateName shortens with an ellipsis', () => {
    expect(fm.truncateName('short', 10)).toBe('short');
    expect(fm.truncateName('abcdefghijkl', 8)).toBe('abcde...');
  });

  test('getFileColor classifies by kind', () => {
    const c = (o: any) => fm.getFileColor({ isSymbolicLink: false, isDirectory: false, mode: 0o644, name: 'x', ...o });
    expect(c({ isSymbolicLink: true })).toBe('\x1b[36m');
    expect(c({ isDirectory: true })).toBe('\x1b[34m');
    expect(c({ name: '.rc' })).toBe('\x1b[2m');
    expect(c({ mode: 0o755 })).toBe('\x1b[32m');
    expect(c({ name: 'a.png' })).toBe('\x1b[35m');
    expect(c({ name: 'a.mp3' })).toBe('\x1b[33m');
    expect(c({ name: 'a.mkv' })).toBe('\x1b[31m');
    expect(c({ name: 'a.zip' })).toBe('\x1b[91m');
    expect(c({ name: 'a.txt' })).toBe('\x1b[37m');
  });
});

describe('loading and sorting', () => {
  test('lists visible entries, directories first, natural name order', () => {
    expect(names()).toEqual([
      'alpha', 'zeta',
      'a2.md', 'a10.md', 'b.txt', 'clip.mp4', 'link-to-b', 'pic.png', 'run.sh', 'song.mp3', 'pack.zip', 'unknown.xyz',
    ].sort((a, b) => {
      const dirs = ['alpha', 'zeta'];
      if (dirs.includes(a) !== dirs.includes(b)) return dirs.includes(a) ? -1 : 1;
      return a.localeCompare(b, undefined, { numeric: true });
    }));
  });

  test('records metadata for each entry', () => {
    const run = fm.items.find((i: any) => i.name === 'run.sh');
    expect(run.isFile).toBe(true);
    expect(run.permissions).toBe('rwxr-xr-x');
    expect(run.type).toBe('.sh');
    const dir = fm.items.find((i: any) => i.name === 'alpha');
    expect(dir.isDirectory).toBe(true);
    expect(dir.type).toBe('directory');
    expect(fm.items.find((i: any) => i.name === 'link-to-b').isSymbolicLink).toBe(true);
  });

  test('showHidden reveals dotfiles', async () => {
    expect(names()).not.toContain('.secret');
    fm.showHidden = true;
    await fm.loadDirectory();
    expect(names()).toEqual(expect.arrayContaining(['.secret', '.hidden-dir']));
  });

  test('filterText narrows the list case-insensitively', async () => {
    fm.filterText = 'PIC';
    await fm.loadDirectory();
    expect(names()).toEqual(['pic.png']);
  });

  test('sorts by size, date, type and descending', async () => {
    fm.sortBy = 'size';
    await fm.loadDirectory();
    const files = fm.items.filter((i: any) => !i.isDirectory).map((i: any) => i.size);
    expect(files).toEqual([...files].sort((a, b) => a - b));

    fm.sortBy = 'type';
    await fm.loadDirectory();
    const types = fm.items.filter((i: any) => !i.isDirectory).map((i: any) => i.type);
    expect(types).toEqual([...types].sort((a, b) => a.localeCompare(b)));

    const old = new Date(2001, 1, 1);
    fs.utimesSync(path.join(work, 'b.txt'), old, old);
    fm.sortBy = 'date';
    await fm.loadDirectory();
    const firstFile = fm.items.find((i: any) => !i.isDirectory);
    expect(firstFile.name).toBe('b.txt');

    fm.sortBy = 'name';
    fm.sortOrder = 'desc';
    await fm.loadDirectory();
    expect(fm.items.find((i: any) => !i.isDirectory).name).toBe('unknown.xyz');
    expect(fm.items[0].isDirectory).toBe(true);
  });

  test('clamps the selection when the list shrinks', async () => {
    fm.selectedIndex = 999;
    await fm.loadDirectory();
    expect(fm.selectedIndex).toBe(fm.items.length - 1);
  });

  test('loading another directory returns its items without touching the view', async () => {
    const before = fm.items;
    const other = await fm.loadDirectory(path.join(work, 'alpha'));
    expect(other).toEqual([]);
    expect(fm.items).toBe(before);
  });

  test('an unreadable directory yields an empty list', async () => {
    fm.currentPath = path.join(work, 'does-not-exist');
    expect(await fm.loadDirectory()).toEqual([]);
    expect(fm.items).toEqual([]);
    expect(fm.selectedIndex).toBe(0);
    expect(await fm.loadDirectory(path.join(work, 'nope'))).toEqual([]);
  });

  test('a broken symlink falls back to zeroed stats', async () => {
    fs.symlinkSync(path.join(work, 'gone'), path.join(work, 'dangling'));
    await fm.loadDirectory();
    const d = fm.items.find((i: any) => i.name === 'dangling');
    expect(d.size).toBe(0);
    expect(d.permissions).toBe('---------');
  });
});

describe('selection and modes', () => {
  test('moveSelection stays in range', () => {
    fm.moveSelection(-1);
    expect(fm.selectedIndex).toBe(0);
    fm.moveSelection(1);
    expect(fm.selectedIndex).toBe(1);
    fm.selectedIndex = fm.items.length - 1;
    fm.moveSelection(1);
    expect(fm.selectedIndex).toBe(fm.items.length - 1);
  });

  test('toggleMultiSelect adds/removes and tracks the mode flag', () => {
    fm.toggleMultiSelect();
    expect(fm.selectedItems.has(0)).toBe(true);
    expect(fm.multiSelectMode).toBe(true);
    fm.toggleMultiSelect();
    expect(fm.selectedItems.size).toBe(0);
    expect(fm.multiSelectMode).toBe(false);
  });

  test('selectAll selects every row', () => {
    fm.selectAll();
    expect(fm.selectedItems.size).toBe(fm.items.length);
    expect(fm.multiSelectMode).toBe(true);
  });

  test('cycleSortMode and cycleViewMode wrap around', () => {
    const sorts = [];
    for (let i = 0; i < 5; i++) {
      fm.cycleSortMode();
      sorts.push(fm.sortBy);
    }
    expect(sorts).toEqual(['size', 'date', 'type', 'name', 'size']);
    const views = [];
    for (let i = 0; i < 4; i++) {
      fm.cycleViewMode();
      views.push(fm.viewMode);
    }
    expect(views).toEqual(['simple', 'grid', 'detailed', 'simple']);
  });
});

describe('navigation', () => {
  test('openSelected enters a directory and records history', async () => {
    fm.selectedIndex = names().indexOf('alpha');
    await fm.openSelected();
    expect(fm.currentPath).toBe(path.join(work, 'alpha'));
    expect(fm.history).toEqual([work, path.join(work, 'alpha')]);
    expect(fm.selectedIndex).toBe(0);
  });

  test('openSelected on an empty list is a no-op', async () => {
    fm.items = [];
    await fm.openSelected();
    expect(fm.currentPath).toBe(work);
  });

  test('openSelected reports a file that cannot be opened', async () => {
    answers();
    fm.items = [{ name: 'ghost.txt', isDirectory: false, fullPath: '/definitely/not/here/ghost.txt' }];
    fm.selectedIndex = 0;
    await fm.openSelected();
    expect(text()).toContain('Cannot open file: ghost.txt');
  });

  test('goUp moves to the parent and stops at the root', async () => {
    fm.currentPath = path.join(work, 'alpha');
    await fm.goUp();
    expect(fm.currentPath).toBe(work);
    fm.currentPath = path.parse(work).root;
    const hist = fm.history.length;
    await fm.goUp();
    expect(fm.currentPath).toBe(path.parse(work).root);
    expect(fm.history.length).toBe(hist);
  });

  test('back and forward walk the history', async () => {
    fm.selectedIndex = names().indexOf('alpha');
    await fm.openSelected();
    fm.goBack();
    expect(fm.currentPath).toBe(work);
    fm.goBack();
    expect(fm.historyIndex).toBe(0);
    fm.goForward();
    expect(fm.historyIndex).toBe(1);
    expect(fm.currentPath).toBe(path.join(work, 'alpha'));
    fm.goForward();
    fm.goForward();
    expect(fm.historyIndex).toBe(1);
  });

  test('addToHistory drops the forward branch and caps the length at 50', () => {
    fm.history = ['a', 'b', 'c'];
    fm.historyIndex = 0;
    fm.addToHistory('x');
    expect(fm.history).toEqual(['a', 'x']);

    fm.history = Array.from({ length: 50 }, (_, i) => `p${i}`);
    fm.historyIndex = 49;
    fm.addToHistory('new');
    expect(fm.history).toHaveLength(50);
    expect(fm.history[0]).toBe('p1');
    expect(fm.history.at(-1)).toBe('new');
    expect(fm.historyIndex).toBe(49);
  });
});

describe('clipboard operations', () => {
  const idx = (n: string) => names().indexOf(n);

  test('copy and cut capture the highlighted or multi-selected paths', () => {
    fm.selectedIndex = idx('b.txt');
    fm.copySelected();
    expect(fm.clipboard).toEqual([path.join(work, 'b.txt')]);
    expect(fm.clipboardAction).toBe('copy');

    fm.selectedItems = new Set([idx('a2.md'), idx('a10.md')]);
    fm.cutSelected();
    expect(fm.clipboard).toHaveLength(2);
    expect(fm.clipboardAction).toBe('cut');
  });

  test('copy/cut with nothing to take leave the clipboard empty', () => {
    fm.items = [];
    fm.copySelected();
    fm.cutSelected();
    expect(fm.clipboard).toEqual([]);
    expect(fm.clipboardAction).toBe('cut');
  });

  test('paste copies files and whole directories', async () => {
    fs.writeFileSync(path.join(work, 'alpha', 'inner.txt'), 'inner');
    fs.mkdirSync(path.join(work, 'alpha', 'deep'));
    fs.writeFileSync(path.join(work, 'alpha', 'deep', 'd.txt'), 'deep');
    fm.clipboard = [path.join(work, 'alpha'), path.join(work, 'b.txt')];
    fm.clipboardAction = 'copy';
    fm.currentPath = path.join(work, 'zeta');
    await fm.paste();
    expect(fs.readFileSync(path.join(work, 'zeta', 'alpha', 'deep', 'd.txt'), 'utf8')).toBe('deep');
    expect(fs.readFileSync(path.join(work, 'zeta', 'b.txt'), 'utf8')).toContain('hello');
    expect(fs.existsSync(path.join(work, 'b.txt'))).toBe(true);
    expect(fm.clipboard).toHaveLength(2);
  });

  test('paste after cut moves the file and clears the clipboard', async () => {
    fm.clipboard = [path.join(work, 'b.txt')];
    fm.clipboardAction = 'cut';
    fm.currentPath = path.join(work, 'zeta');
    await fm.paste();
    expect(fs.existsSync(path.join(work, 'b.txt'))).toBe(false);
    expect(fs.existsSync(path.join(work, 'zeta', 'b.txt'))).toBe(true);
    expect(fm.clipboard).toEqual([]);
    expect(fm.clipboardAction).toBeNull();
  });

  test('paste with an empty clipboard does nothing, and reports failures', async () => {
    await fm.paste();
    expect(out).toEqual([]);
    answers();
    fm.clipboard = [path.join(work, 'missing.txt')];
    fm.clipboardAction = 'copy';
    await fm.paste();
    expect(text()).toContain('Paste failed');
  });
});

describe('delete, rename, create', () => {
  const idx = (n: string) => names().indexOf(n);

  test('delete asks for confirmation and removes files and directories', async () => {
    fs.writeFileSync(path.join(work, 'zeta', 'x'), 'x');
    fm.selectedItems = new Set([idx('zeta'), idx('b.txt')]);
    answers('y');
    await fm.deleteSelected();
    expect(text()).toContain('Delete 2 item(s): zeta, b.txt? (y/N)');
    expect(fs.existsSync(path.join(work, 'zeta'))).toBe(false);
    expect(fs.existsSync(path.join(work, 'b.txt'))).toBe(false);
    expect(fm.selectedItems.size).toBe(0);
  });

  test('delete does nothing unless confirmed', async () => {
    fm.selectedIndex = idx('b.txt');
    answers('n');
    await fm.deleteSelected();
    expect(fs.existsSync(path.join(work, 'b.txt'))).toBe(true);
  });

  test('delete with an empty list is a no-op', async () => {
    fm.items = [];
    answers('y');
    await fm.deleteSelected();
    expect(out).toEqual([]);
  });

  test('delete reports failures', async () => {
    fm.items = [{ name: 'ghost', isDirectory: false, fullPath: path.join(work, 'ghost') }];
    fm.selectedIndex = 0;
    answers('Y');
    await fm.deleteSelected();
    expect(text()).toContain('Delete failed');
  });

  test('rename moves the file, ignoring blank or unchanged names', async () => {
    fm.selectedIndex = idx('b.txt');
    answers('renamed.txt');
    await fm.renameSelected();
    expect(fs.existsSync(path.join(work, 'renamed.txt'))).toBe(true);

    fm.selectedIndex = idx('renamed.txt');
    answers('   ');
    await fm.renameSelected();
    answers('renamed.txt');
    await fm.renameSelected();
    expect(fs.existsSync(path.join(work, 'renamed.txt'))).toBe(true);
  });

  test('rename on an empty list is a no-op and failures are reported', async () => {
    fm.items = [];
    await fm.renameSelected();
    expect(out).toEqual([]);
    fm.items = [{ name: 'ghost', isDirectory: false, fullPath: path.join(work, 'ghost') }];
    fm.selectedIndex = 0;
    answers('new-name');
    await fm.renameSelected();
    expect(text()).toContain('Rename failed');
  });

  test('createNew makes a file or directory (asking when no type is given)', async () => {
    answers('made.txt');
    await fm.createNew('file');
    expect(fs.statSync(path.join(work, 'made.txt')).isFile()).toBe(true);

    answers('madedir');
    await fm.createNew('directory');
    expect(fs.statSync(path.join(work, 'madedir')).isDirectory()).toBe(true);

    answers('d', 'asked-dir');
    await fm.createNew();
    expect(fs.statSync(path.join(work, 'asked-dir')).isDirectory()).toBe(true);

    answers('f', 'asked-file');
    await fm.createNew();
    expect(fs.statSync(path.join(work, 'asked-file')).isFile()).toBe(true);
  });

  test('createNew ignores a blank name and reports failures', async () => {
    answers('  ');
    await fm.createNew('file');
    answers('alpha');
    await fm.createNew('directory');
    expect(text()).toContain('Create failed');
  });
});

describe('bookmarks and settings screens', () => {
  test('showBookmarks navigates to the chosen bookmark', async () => {
    fm.bookmarks = { Alpha: path.join(work, 'alpha') };
    answers('1');
    await fm.showBookmarks();
    expect(text()).toContain(`1. Alpha -> ${path.join(work, 'alpha')}`);
    expect(fm.currentPath).toBe(path.join(work, 'alpha'));
  });

  test('showBookmarks warns about missing paths and ignores bad input', async () => {
    fm.bookmarks = { Gone: path.join(work, 'gone') };
    answers('1');
    await fm.showBookmarks();
    expect(text()).toContain('Bookmark path does not exist');
    expect(fm.currentPath).toBe(work);
    answers('');
    await fm.showBookmarks();
    answers('9');
    await fm.showBookmarks();
    expect(fm.currentPath).toBe(work);
  });

  test('addBookmark stores and persists the current directory', async () => {
    answers('  Work  ');
    await fm.addBookmark();
    expect(fm.bookmarks.Work).toBe(work);
    expect(JSON.parse(fs.readFileSync(path.join(home, '.fileman-bookmarks.json'), 'utf8')).Work).toBe(work);
    answers('   ');
    await fm.addBookmark();
    expect(Object.keys(fm.bookmarks)).not.toContain('');
  });

  test.each([
    ['1', () => expect(fm.showHidden).toBe(true)],
    ['2', () => expect(fm.sortBy).toBe('size')],
    ['3', () => expect(fm.sortOrder).toBe('desc')],
    ['4', () => expect(fm.viewMode).toBe('simple')],
    ['5', () => expect(fm.previewMode).toBe(true)],
    ['6', () => expect(fm.splitView).toBe(true)],
    ['', () => expect(fm.showHidden).toBe(false)],
  ])('settings choice %j', async (choice, check) => {
    answers(choice as string);
    await fm.showSettings();
    expect(text()).toContain('=== Settings ===');
    (check as () => void)();
  });

  test('showHelp lists the key bindings', async () => {
    answers();
    await fm.showHelp();
    expect(text()).toContain('File Manager Help');
    expect(text()).toContain('Press any key to continue');
  });
});

describe('rendering', () => {
  test('render draws header, toolbar, list, status bar and clipboard line', () => {
    fm.clipboard = [path.join(work, 'b.txt')];
    fm.clipboardAction = 'copy';
    fm.render();
    const t = text();
    expect(t).toContain('File Manager');
    expect(t).toContain(work);
    expect(t).toContain('alpha');
    expect(t).toContain(`${fm.items.length} items | Sort: name asc | View: detailed`);
    expect(t).toContain('Copied: b.txt');
    fm.clipboard = [path.join(work, 'a'), path.join(work, 'b')];
    fm.clipboardAction = 'cut';
    out.length = 0;
    fm.render();
    expect(text()).toContain('Cut: 2 items');
  });

  test('render truncates a very long path and shows the search bar', () => {
    fm.currentPath = '/' + 'x'.repeat(200);
    fm.searchMode = true;
    fm.filterText = 'abc';
    fm.render();
    expect(text()).toContain('...');
    expect(text()).toContain('Search: abc_');
  });

  test('renderFileList handles an empty directory and the scroll indicator', () => {
    fm.items = [];
    fm.renderFileList();
    expect(text()).toContain('Empty directory');

    out.length = 0;
    patch(process.stdout, 'rows', 10);
    fm.items = Array.from({ length: 40 }, (_, i) => ({
      name: `f${i}`, isDirectory: false, size: 1, mtime: new Date(), permissions: 'rw-r--r--', mode: 0o644, fullPath: `/f${i}`,
    }));
    fm.selectedIndex = 20;
    fm.renderFileList();
    expect(text()).toMatch(/\[\d+%\] 21\/40/);
  });

  test('renderFileItem supports detailed, simple and grid modes with selection markers', () => {
    const item = fm.items.find((i: any) => i.name === 'b.txt');
    const idx = fm.items.indexOf(item);

    fm.selectedIndex = idx;
    fm.selectedItems = new Set([idx]);
    fm.renderFileItem(idx, 100);
    expect(out.at(-1)).toContain('\x1b[43m');

    fm.selectedItems = new Set();
    fm.renderFileItem(idx, 100);
    expect(out.at(-1)).toContain('\x1b[47m');

    fm.selectedIndex = 0;
    fm.selectedItems = new Set([idx]);
    fm.renderFileItem(idx, 100);
    expect(out.at(-1)).toContain('\x1b[46m');

    fm.selectedItems = new Set();
    fm.renderFileItem(idx, 100);
    expect(out.at(-1)).toContain('b.txt');
    expect(out.at(-1)).toContain('rw');

    const dir = fm.items.findIndex((i: any) => i.isDirectory);
    fm.renderFileItem(dir, 100);
    expect(out.at(-1)).toContain('<DIR>');

    fm.viewMode = 'simple';
    fm.renderFileItem(idx, 100);
    expect(strip(out.at(-1)!)).toContain('b.txt');

    fm.viewMode = 'grid';
    writes.length = 0;
    out.length = 0;
    fm.selectedIndex = 0;
    for (let i = 0; i < 4; i++) fm.renderFileItem(i, 100);
    expect(writes.join('')).toContain('alpha');
    expect(out).toContain('');
  });

  test('split view prints both pane headers', () => {
    fm.splitView = true;
    fm.renderFileList();
    expect(text()).toContain(`Left Pane: ${work}`);
    expect(text()).toContain(`Right Pane: ${fm.rightPanePath}`);
  });

  test('status bar mentions selection count and handles an empty list', () => {
    fm.selectedItems = new Set([1, 2]);
    fm.renderStatusBar();
    expect(text()).toContain('Selected: 2');
    out.length = 0;
    fm.items = [];
    fm.selectedItems = new Set();
    fm.renderStatusBar();
    expect(text()).toContain('0 items');
  });

  test('status bar trims overlong lines', () => {
    patch(process.stdout, 'columns', 20);
    fm.renderStatusBar();
    expect(out.at(-1)!.replace('\x1b[0m', '').length).toBeLessThanOrEqual(30);
  });

  test('toolbar prints every icon', () => {
    fm.renderToolbar();
    expect(out.at(-1)).toContain('🏠');
    expect(out.at(-1)).toContain('🔧');
  });

  test('preview shows file info and a content excerpt', () => {
    fm.previewMode = true;
    fm.selectedIndex = names().indexOf('b.txt');
    fm.renderPreview();
    const t = text();
    expect(t).toContain('--- Preview ---');
    expect(t).toContain('Content preview:');
    expect(t).toContain('hello');
    expect(t).not.toContain('four');
  });

  test('preview truncates long lines, skips binary types and survives read errors', () => {
    fs.writeFileSync(path.join(work, 'long.txt'), 'y'.repeat(80));
    fm.selectedIndex = names().indexOf('pic.png');
    fm.renderPreview();
    expect(text()).not.toContain('Content preview');

    out.length = 0;
    fm.items = [{ name: 'long.txt', isDirectory: false, size: 80, mtime: new Date(), permissions: 'rw-', fullPath: path.join(work, 'long.txt') }];
    fm.selectedIndex = 0;
    fm.renderPreview();
    expect(text()).toContain('y'.repeat(50) + '...');

    out.length = 0;
    fm.items = [{ name: 'gone.txt', isDirectory: false, size: 1, mtime: new Date(), permissions: 'rw-', fullPath: path.join(work, 'gone.txt') }];
    fm.renderPreview();
    expect(text()).toContain('Cannot preview file content');
  });

  test('preview summarises a directory', async () => {
    for (let i = 0; i < 7; i++) fs.writeFileSync(path.join(work, 'alpha', `f${i}.txt`), '');
    fm.selectedIndex = names().indexOf('alpha');
    fm.renderPreview();
    await new Promise((r) => setTimeout(r, 30));
    expect(text()).toContain('Directory contains 7 items');
    expect(text()).toContain('... and 2 more');
  });

  test('preview with no selection prints nothing', () => {
    fm.items = [];
    fm.renderPreview();
    expect(out).toEqual([]);
  });

  test('render includes the preview pane when enabled', () => {
    fm.previewMode = true;
    fm.render();
    expect(text()).toContain('--- Preview ---');
  });
});

describe('key handling', () => {
  const press = async (...keys: string[]) => {
    for (const k of keys) await fm.handleKeyPress(k);
  };

  test('arrow and vim keys move the selection', async () => {
    await press('\u001b[B', 'j');
    expect(fm.selectedIndex).toBe(2);
    await press('\u001b[A', 'k');
    expect(fm.selectedIndex).toBe(0);
    await press('G');
    expect(fm.selectedIndex).toBe(fm.items.length - 1);
    await press('g');
    expect(fm.selectedIndex).toBe(0);
  });

  test('enter/right open a directory; right ignores files; left goes up', async () => {
    await press('\r');
    expect(fm.currentPath).toBe(path.join(work, 'alpha'));
    await press('h');
    expect(fm.currentPath).toBe(work);
    await press('\u001b[C');
    expect(fm.currentPath).toBe(path.join(work, 'alpha'));
    await press('\u001b[D');
    fm.selectedIndex = names().indexOf('b.txt');
    await press('l');
    expect(fm.currentPath).toBe(work);
    fm.items = [];
    await press('l');
    await press('\n');
  });

  test('space/a/A drive multi-select', async () => {
    await press(' ');
    expect(fm.selectedItems.size).toBe(1);
    await press('a');
    expect(fm.selectedItems.size).toBe(fm.items.length);
    await press('A');
    expect(fm.selectedItems.size).toBe(0);
  });

  test('s, S, v, H, P, T toggle view settings', async () => {
    await press('s');
    expect(fm.sortBy).toBe('size');
    await press('S');
    expect(fm.sortOrder).toBe('desc');
    await press('v');
    expect(fm.viewMode).toBe('simple');
    await press('H');
    expect(fm.showHidden).toBe(true);
    await press('P');
    expect(fm.previewMode).toBe(true);
    await press('T');
    expect(fm.splitView).toBe(true);
    await press('R');
  });

  test('c/x/p copy, cut and paste via keys', async () => {
    fm.selectedIndex = names().indexOf('b.txt');
    await press('c');
    expect(fm.clipboardAction).toBe('copy');
    await press('x');
    expect(fm.clipboardAction).toBe('cut');
    fm.currentPath = path.join(work, 'zeta');
    await press('p');
    expect(fs.existsSync(path.join(work, 'zeta', 'b.txt'))).toBe(true);
  });

  test('d, n, N, r prompt for input', async () => {
    fm.selectedIndex = names().indexOf('b.txt');
    answers('y');
    await press('d');
    expect(fs.existsSync(path.join(work, 'b.txt'))).toBe(false);
    answers('f', 'k-new');
    await press('n');
    answers('k-dir');
    await press('N');
    expect(fs.existsSync(path.join(work, 'k-new'))).toBe(true);
    expect(fs.statSync(path.join(work, 'k-dir')).isDirectory()).toBe(true);
    fm.selectedIndex = names().indexOf('k-new');
    answers('k-renamed');
    await press('r');
    expect(fs.existsSync(path.join(work, 'k-renamed'))).toBe(true);
  });

  test('b, B, ? open the bookmark, add-bookmark and help screens', async () => {
    answers('');
    await press('b');
    answers('Mark');
    await press('B');
    answers();
    await press('?');
    expect(fm.bookmarks.Mark).toBe(work);
    expect(text()).toContain('File Manager Help');
  });

  test('u and U step through history', async () => {
    await press('\r');
    await press('u');
    expect(fm.currentPath).toBe(work);
    await press('U');
    expect(fm.currentPath).toBe(path.join(work, 'alpha'));
  });

  test('q and ctrl-c quit', async () => {
    await press('q');
    await press('\u0003');
    expect(exits).toEqual([0, 0]);
  });

  test('f and / enter search mode, where typing filters live', async () => {
    await press('f');
    expect(fm.searchMode).toBe(true);
    await press('p', 'i', 'c');
    expect(fm.filterText).toBe('pic');
    expect(names()).toEqual(['pic.png']);
    await press('\x7f');
    expect(fm.filterText).toBe('pi');
    await press('\b');
    expect(fm.filterText).toBe('p');
    await press('\r');
    expect(fm.searchMode).toBe(false);
    await press('/');
    expect(fm.filterText).toBe('');
    await press('x', '\x1b');
    expect(fm.searchMode).toBe(false);
  });

  test('unrecognised keys and control sequences in search are ignored', async () => {
    await press('f');
    await press('\u001b[A');
    expect(fm.filterText).toBe('');
    await press('\x1b');
    await press('~');
  });

  test('mouse sequences are routed to the toolbar', async () => {
    fm.executeToolbarAction = async (a: string) => void (fm.lastAction = a);
    await press('\x1b[<0;4;1M');
    expect(fm.lastAction).toBe(fm.toolbarIcons[Math.floor(4 / 3)].action);
    fm.lastAction = undefined;
    await press('\x1b[M!!!');
    expect(fm.lastAction).toBeUndefined();
    await press('\x1b[<1;1;1M');
    await press('\x1b[<0;999;1M');
    expect(fm.lastAction).toBeUndefined();
  });
});

describe('toolbar actions', () => {
  test('navigation actions', async () => {
    await fm.executeToolbarAction('home');
    expect(fm.currentPath).toBe(home);
    await fm.executeToolbarAction('up');
    await fm.executeToolbarAction('back');
    await fm.executeToolbarAction('forward');
    await fm.executeToolbarAction('refresh');
  });

  test('file actions', async () => {
    fm.currentPath = work;
    await fm.loadDirectory();
    fm.selectedIndex = names().indexOf('b.txt');
    await fm.executeToolbarAction('copy');
    expect(fm.clipboardAction).toBe('copy');
    await fm.executeToolbarAction('cut');
    expect(fm.clipboardAction).toBe('cut');
    fm.currentPath = path.join(work, 'zeta');
    await fm.executeToolbarAction('paste');
    expect(fs.existsSync(path.join(work, 'zeta', 'b.txt'))).toBe(true);

    fm.currentPath = work;
    await fm.loadDirectory();
    answers('tb-dir');
    await fm.executeToolbarAction('newdir');
    answers('tb-file');
    await fm.executeToolbarAction('newfile');
    expect(fs.existsSync(path.join(work, 'tb-dir'))).toBe(true);
    expect(fs.existsSync(path.join(work, 'tb-file'))).toBe(true);
    fm.selectedIndex = names().indexOf('tb-file');
    answers('y');
    await fm.executeToolbarAction('delete');
    expect(fs.existsSync(path.join(work, 'tb-file'))).toBe(false);
  });

  test('view actions', async () => {
    await fm.executeToolbarAction('search');
    expect(fm.searchMode).toBe(true);
    await fm.executeToolbarAction('preview');
    expect(fm.previewMode).toBe(true);
    await fm.executeToolbarAction('view');
    expect(fm.viewMode).toBe('simple');
    answers('');
    await fm.executeToolbarAction('bookmark');
    answers('');
    await fm.executeToolbarAction('settings');
    await fm.executeToolbarAction('unknown-action');
  });
});

describe('input helpers and run loop', () => {
  test('getInput resolves with the readline answer and toggles the cursor', async () => {
    fm.rl = { question: (_q: string, cb: (a: string) => void) => cb('typed') };
    expect(await fm.getInput()).toBe('typed');
    const joined = writes.join('');
    expect(joined).toContain('\x1B[?25h');
    expect(joined).toContain('\x1B[?25l');
  });

  test('waitForKey resolves on the next stdin data event', async () => {
    const p = fm.waitForKey();
    process.stdin.emit('data', 'x');
    await p;
  });

  test('run loads the directory, renders, and re-renders after each key', async () => {
    await fm.run();
    const rendered = text();
    expect(rendered).toContain('File Manager');
    out.length = 0;
    process.stdin.emit('data', 'j');
    await new Promise((r) => setTimeout(r, 30));
    expect(fm.selectedIndex).toBe(1);
    expect(text()).toContain('File Manager');
  });
});
