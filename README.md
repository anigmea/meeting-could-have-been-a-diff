# meeting-could-have-been-a-diff

A PR card with receipts. Diff facts plus evidence you supply, nothing it invents.

Most "write my PR description" tools guess. They read your diff, invent intent,
and produce confident prose about work they never verified. This one does the
opposite: it reports only what it can read (git facts) and what you hand it
(evidence files), and it says "none supplied" when you hand it nothing.

## Install

```sh
npm install -g meeting-could-have-been-a-diff
```

## Use

Inside a git repo, on a branch you want to describe:

```sh
mchbad                      # card for HEAD vs the default base
mchbad --base main          # pick the base explicitly
mchbad --evidence ./test-output.txt --evidence ./bench.md
mchbad --blocker "migration 0042 needs the DBA window on Friday"
mchbad --json               # machine-readable card
```

The card has three parts:

1. **Diff facts** - read straight from `git diff` / `git log`: files changed,
   insertions, deletions, commit subjects. No interpretation.
2. **Evidence** - files *you* supply. The card links them by path and SHA-256
   hash so the receipt cannot be quietly swapped later. It never runs your
   tests and never claims they passed. If you say the evidence is a test run,
   that is your claim; the card just carries it.
3. **Blockers** - exactly the blocker strings you pass in, verbatim. If none
   are passed, the card says so. It never infers a blocker from the diff.

If no evidence is supplied, the card marks `evidenceStatus: none-supplied`
so reviewers can see the gap instead of assuming it exists.

## What it will not do

- No LLM, no network calls, no API keys. It works fully offline.
- It does not execute your test suite (or anything else). You run tests; you
  hand it the output; it hashes and links.
- It does not summarize, paraphrase, or editorialize the diff. Facts only.
- Evidence is capped (8 files, 256 KiB each, 1 MiB total) because a PR card is
  a pointer to evidence, not an archive of it.

## Programmatic use

```js
import { buildCard } from 'meeting-could-have-been-a-diff';

const card = await buildCard({
  cwd: process.cwd(),
  base: 'main',
  evidence: ['./test-output.txt'],
  blockers: ['needs a rebase after #17 lands'],
});
console.log(card.markdown);
```

## Adjacent tools

PR description generators with LLM summaries (various Copilot-style CLIs and
GitHub Actions) produce fluent prose but no receipts. `gh pr create` fills a
template but verifies nothing. This tool is deliberately narrower: a card of
checkable facts and linked evidence, and silence where there is nothing to say.

## License

MIT
