# Benchmark: tarball + lazy history vs. `git clone`

What this measures, and why git0 downloads a repository the way it does.

```bash
bun run bench                    # the default repo set
bun run bench facebook/react     # or whichever repos you care about
```

It hits github.com, so it is not part of `bun test` and never runs in CI — the
file is a `.bench.ts`, which Bun's test runner does not collect.

## The number that matters

Not "how long did the download take". **How long until you can run the
project.** That is the clock the user is actually watching, and it stops when
the files are on disk — when `bun install` can start and the editor has
something to index. Git history is not on that path: nothing about installing
dependencies or opening a file needs `git log`.

So every strategy is measured twice:

| column | means |
| --- | --- |
| **time to files** | source tree on disk — install can start, IDE can open |
| **time to history** | full commit history available — `git log`, `git blame`, branches |

## The four strategies

| strategy | what it does |
| --- | --- |
| `git clone` | the baseline — the command git0 replaces |
| `git clone --depth=1` | the usual "clone can be fast too" answer |
| `git0` | codeload tarball, extracted as it streams |
| `git0 --history` | the tarball, then `.git` attached afterwards |

## Why the tarball wins on time-to-files

Three reasons, and only the third is about size.

**A clone is serial; a tarball overlaps.** `git clone` is a negotiation: the
client says what it has, the server walks the object graph, counts and compresses
objects into a pack, sends it, and only then does the client resolve deltas and
write a working tree. The first file appears near the *end*. A codeload tarball
is a single pre-made gzip stream of one commit, so git0 pipes the response
straight into a `tar` extractor — bytes are being written to disk while the rest
is still arriving. Download and extraction are the same wall-clock interval
instead of two consecutive ones.

**The server has already done the work.** GitHub caches tarballs. A clone makes
the remote pack objects for your particular request; a tarball is usually served
from cache, and is never a per-request computation on the remote's CPU.

**History is most of the bytes.** For anything long-lived the object database
dwarfs the checkout — every version of every file that ever existed, against one
copy of the current ones. The `on disk` column in the table is where that shows
up, and it is the size the tarball never transfers.

`--depth=1` closes most of the gap on time-to-files, which is exactly why it is
in the table. It is still a pack negotiation rather than a cached file, and it
leaves you with a repository that cannot do the thing you wanted history for —
`git log` shows one commit, and blame is useless. It buys speed by giving up the
feature.

## Why "lazy" history is not a trick

`git0 --history` ends in the same state as `git clone`: a working tree with a
complete `.git` beside it. The difference is ordering. Extraction finishes,
and the history clone starts *there* — in parallel with the IDE launching and
dependencies installing, both of which take their own seconds and neither of
which touches `.git`.

So the honest comparison is two numbers, and the table gives both:

- **time to files** — git0 is far ahead, because it is not waiting on history.
- **time to history** — roughly `git clone`, plus the tarball it already
  finished. You pay a little more for the complete result, and get to start
  working well before it arrives.

The mechanics of attaching it (bare clone into a temporary directory, renamed
into place, `core.bare` flipped, index refreshed from `HEAD` so `git status` is
clean without touching the extracted files) are in
[`src/history.ts`](../src/history.ts).

## Reading a run

```text
### expressjs/express

| strategy | repo | time to files | time to history | on disk | vs git clone |
| --- | --- | --- | --- | --- | --- |
| git clone | expressjs/express | … | … | … | — |
| git clone --depth=1 | expressjs/express | … | — | … | …× |
| git0 | expressjs/express | … | — | … | …× |
| git0 --history | expressjs/express | … | … | … | …× |
```

`vs git clone` is the time-to-files ratio against the baseline — `4.00×` means
the working tree was ready in a quarter of the time. A `—` in **time to
history** means that strategy never produces a usable history, which is a result
about the strategy and not a gap in the measurement.

Run it against your own repositories before quoting any of it: the ratios depend
on how much history the project has and on the network between you and GitHub.
