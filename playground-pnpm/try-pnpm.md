# Trying pnpm workspaces (the no-tool baseline)

Hands-on migration of the 24 `sample-repos/` into a single pnpm workspace.
This is the baseline every other candidate builds on: it gives us **internal
dependency** (workspace links) and partial **action dependency** (topological
`pnpm -r`), and deliberately lacks **build cache** and **task pipelines** — so
after this trial you'll know exactly which pain the other tools exist to remove.

Work through the phases in order; each has an expected outcome and a
**Record** prompt — write findings into the scorecard at the bottom as you go,
they become the pnpm column of the README comparison.

Target version: **pnpm 12** (12.2.1 as of 2026-09 — note npm's `latest` tag
still points at 11.25, so 12 is a fresh major; the README table's "11.x" cell
is snapshot drift). pnpm 11 was the big breaking release — Node 22+ only,
config evicted from `.npmrc`, `allowBuilds` replacing `onlyBuiltDependencies`,
supply-chain gates on by default — and 12 is a drop-in on top of it. Each of
those is called out in the phase where it bites.

---

## Phase 0 — safety net (~5 min)

Keep the multi-repo baseline intact; do everything on a branch.

- [ ] `git checkout -b try-pnpm`
- [ ] Start the registry — still needed, because three consumers pin **old
      majors** that only exist in Verdaccio (see Phase 6):

  ```sh
  cd registry && npm install && npm start   # http://localhost:4873
  ```

- [ ] Seed it if empty: `node scripts/publish-all.mjs --build`
      (full mode, so old-major tarballs contain real `dist/`)

To abandon or restart the trial at any point:

```sh
git checkout master
git clean -fdx sample-repos/   # kills node_modules, lockfiles, build output
rm -rf node_modules pnpm-lock.yaml pnpm-workspace.yaml
```

## Phase 1 — scaffold the workspace (~10 min)

A pnpm workspace is: a root `package.json`, a `pnpm-workspace.yaml`, one root
`.npmrc`, one lockfile. That's the entire tool footprint — remember this when
comparing config surface with turbo/nx/moon later.

- [ ] Root `package.json`:

  ```json
  {
    "name": "acme-monorepo",
    "private": true,
    "packageManager": "pnpm@12.2.1"
  }
  ```

  (`packageManager` pins the version via corepack — version drift between
  machines is a real multi-repo disease, kill it on day one. Bonus in v12:
  with a pinned pnpm, misspelled keys in `pnpm-workspace.yaml` are hard
  errors with suggestions, not silent no-ops.)

- [ ] Root `pnpm-workspace.yaml`:

  ```yaml
  packages:
    - sample-repos/*

  # v11+ supply-chain gate: packages younger than 1 day won't resolve.
  # Our @acme/* tarballs were published to Verdaccio minutes ago, so the
  # very first install would refuse them. Exempt the internal scope and
  # keep the 1-day quarantine for public packages:
  minimumReleaseAgeExclude:
    - "@acme/*"
  # (lab shortcut instead, if you prefer: minimumReleaseAge: 0)
  ```

  The four non-npm repos (barcode-cli, stock-audit-cli, label-gen-cli,
  picking-e2e) have no `package.json`; pnpm silently skips them. Note that
  down — it's the "Non-JS tasks" row scoring itself.

- [ ] Root `.npmrc` (since v11 this file is for **auth and registry settings
      only** — everything else must live in `pnpm-workspace.yaml`, and our
      scoped-registry line is exactly the kind that stays; the per-repo
      `.npmrc` files are now dead):

  ```ini
  @acme:registry=http://localhost:4873/
  ```

- [ ] Add `node_modules/` and `pnpm-lock.yaml`? No — lockfile gets committed.
      Add to root `.gitignore`:

  ```
  node_modules/
  ```

**Record:** lines of config written so far, and how much of it is per-package
(answer: zero — that's the maintenance baseline to beat).

## Phase 2 — first install (~20 min, expect breakage)

- [ ] Delete the 20 per-repo `package-lock.json` files (npm's lockfiles are
      meaningless under pnpm; one `pnpm-lock.yaml` replaces all of them):

  ```sh
  rm sample-repos/*/package-lock.json
  ```

- [ ] From the root: `pnpm install`

Two failure classes are _expected_ — both are findings, not nuisances:

1. **Blocked build scripts.** pnpm refuses to run dependency lifecycle
   scripts until approved, and since v11 `strictDepBuilds` defaults to true,
   so unreviewed build scripts are an install **error**, not a footnote.
   Approve interactively with `pnpm approve-builds` — it writes an
   `allowBuilds` map into `pnpm-workspace.yaml` (`true` for approved,
   `false` for explicitly denied; the pnpm-10 `onlyBuiltDependencies` family
   is gone). Likely candidates here: esbuild, @parcel/watcher,
   @playwright/test (browser download).

   ```yaml
   allowBuilds:
     esbuild: true
   ```

2. **Phantom dependencies.** pnpm's symlinked, non-flat `node_modules`
   exposes any package that was imported but never declared (npm's hoisting
   hid these for years). If a repo's build fails with "Cannot find module X",
   the fix is honest: add X to that repo's `package.json`. Count them.

(If some _public_ package refuses to resolve with a release-age error,
that's the v11 `minimumReleaseAge` quarantine doing its job on a <1-day-old
release — pin an older version or extend `minimumReleaseAgeExclude`.)

- [ ] Verify every JS repo still builds, from the root, one command:

  ```sh
  pnpm -r run build
  ```

  This replaces `scripts/build-all.mjs` (which loops `npm install` per repo).

**Record:** how many phantom deps you had to declare and where; install time
vs. 20 separate `npm install`s; disk usage of one shared store vs 20
`node_modules` (`du -sh node_modules sample-repos/*/node_modules`). Install
time got an extra v12 boost on Linux — `packageImportMethod: auto` now tries
hardlinks before copy-on-write clones — so this number flatters pnpm 12
specifically; note the version next to it.

## Phase 3 — internal dependency: `workspace:*` (~30 min)

Right now every `@acme/*` range still resolves from Verdaccio (pnpm does
**not** auto-link workspace packages for bare semver ranges — still true in
12). Make the links explicit — `workspace:*` fails loudly if the package
isn't in the workspace, instead of silently falling back to the registry.

- [ ] Convert every internal dep **whose range the workspace version already
      satisfies** to `workspace:*`. That is all of them **except three
      deliberately skewed pins** (leave these alone — they're Phase 6):

  | repo             | keep on registry (old major)   |
  | ---------------- | ------------------------------ |
  | warehouse-viewer | `@acme/http-client@^1.9.0`     |
  | warehouse-viewer | `@acme/api-types@^6.5.0` (dev) |
  | admin-dashboard  | `@acme/ui-components@^4.9.0`   |

  Convertible edges (from the README graph): shop-web (ui-components,
  http-client, date-utils, api-types), admin-dashboard (charts, http-client,
  api-types), order-service (schema-definitions, logger, validation-helpers,
  api-types), picker-kiosk (icons, http-client), e2e-checkout (api-types),
  api-contract-tests (schema-definitions), deploy-cli (logger),
  ui-components (design-tokens, icons), charts (design-tokens),
  http-client (logger), schema-definitions (api-types).

- [ ] `pnpm install` again, then prove the links:

  ```sh
  pnpm why @acme/logger          # should say "workspace" for linked consumers
  ls -l sample-repos/deploy-cli/node_modules/@acme/logger   # symlink into sample-repos/logger
  ```

- [ ] **The payoff demo** — kill the publish/install loop. Edit
      `sample-repos/logger/src/` (add an exclamation to a log prefix), then:

  ```sh
  pnpm --filter @acme/logger run build
  cd sample-repos/deploy-cli && node src/main.js --dry-run   # change is visible, nothing was published
  ```

  Note the nuance: the change was visible only **after rebuilding logger**,
  because workspace links point at the package dir and `main` points at
  `dist/`. pnpm has no watch/pipeline to do that rebuild for you — that gap
  is Turborepo's `turbo watch` / JIT packages and Nx buildable libs.

**Record:** edits required (one line per internal edge — does this drift?);
what happens if you typo `workspace:*` on a package not in the workspace
(try it: you want the loud failure).

## Phase 4 — action dependency: what `-r` gives and what it doesn't (~20 min)

- [ ] Topological ordering — works, but **only across `workspace:*` edges**:

  ```sh
  pnpm -r run build
  ```

  Watch the order: logger before http-client before shop-web. Note that
  admin-dashboard may build _before_ `@acme/ui-components` — its ui-components
  edge still points at the registry, so pnpm sees no ordering constraint.
  Silent, subtle, correct-by-luck: write that down.

- [ ] Scoped builds — "build X and everything X needs" (quote filters, zsh
      globs the dots and brackets):

  ```sh
  pnpm --filter "shop-web..." run build
  ```

- [ ] Affected detection — "everything changed since master, plus dependents":

  ```sh
  pnpm --filter "...[master]" run build
  ```

  Edit `sample-repos/logger/src/` again and re-run: expect logger +
  http-client + deploy-cli + shop-web + picker-kiosk + admin-dashboard +
  order-service (compare with the toy cache's 8-repo blast radius).

- [ ] Now the missing half — **no cross-task pipeline**. Clean everything and
      run tests without building:

  ```sh
  git clean -fdx sample-repos/*/dist sample-repos/*/lib sample-repos/*/bin sample-repos/*/.next
  pnpm -r --no-bail run test
  ```

  Tests that import a workspace package's `dist/` fail: there is no way to
  say "test dependsOn build" in pnpm. The workaround is `pnpm -r build &&
pnpm -r test` (rebuild the world) — exactly what turbo's `dependsOn` /
  nx `targetDefaults` express in one line.

**Record:** the `-r test` failure list; how you'd explain to a newcomer what
`pnpm --filter "shop-web..." build` will run (can you predict it without
running it? `pnpm ls -r --depth -1 --filter "shop-web..."` helps).

## Phase 5 — build cache: prove the absence (~10 min)

- [ ] Time a full build twice, no changes in between:

  ```sh
  time pnpm -r run build
  time pnpm -r run build   # identical duration — nothing is skipped, ever
  ```

  Compare with the toy cache's warm run (0.1 s for 17 tasks). pnpm re-executes
  everything, every time; `--filter "...[master]"` narrows _scope_ but caches
  nothing (and misses "changed and reverted" cases the content-hash cache
  catches).

- [ ] The README's env-var cache-poisoning experiment (`NODE_ENV` +
      `logger/build.mjs`) is **not applicable** — no cache, no wrong hits.
      The baseline is immune to cache bugs by having nothing to be wrong. Note
      the irony in the scorecard.

**Record:** cold vs. second-run wall time. This number is the entire
value proposition of the other three tools.

## Phase 6 — version skew: the real migration work (~30 min)

The three skewed pins are the honest cost of monorepo-izing: either keep
serving old majors from a registry forever, or upgrade the consumers.

- [ ] First, see the status quo: `pnpm why @acme/http-client` — 2.3.0
      linked from the workspace _and_ 1.9.5 from Verdaccio, coexisting.
- [ ] Try the lazy conversion to feel the failure mode: change
      warehouse-viewer's pin to `workspace:^1.9.0` and `pnpm install` — it
      fails loudly (no 1.x in the workspace). Good. Revert.
- [ ] Do one real upgrade: bump admin-dashboard's
      `@acme/ui-components` `^4.9.0 → workspace:*`, `pnpm install`, build and
      run its tests, fix what the 4→5 major broke.
- [ ] Decide (and write down) the policy for warehouse-viewer: upgrade now,
      or stay on registry pins indefinitely? A monorepo doesn't _force_
      single-version, but every tool works better with it.

**Record:** actual effort of the 4.9→5.2 upgrade — this generalizes to "cost
of joining the monorepo per skewed consumer".

## Phase 7 — non-JS repos: the hard wall (~20 min)

- [ ] Confirm the four non-npm repos are invisible: `pnpm ls -r --depth -1`
      lists 20 packages, not 24. `pnpm -r run test` runs zero Go/Python/Rust
      tests.
- [ ] The only pnpm-native move is a **wrapper `package.json`**. Try it on one
      repo, e.g. `sample-repos/barcode-cli/package.json`:

  ```json
  {
    "name": "barcode-cli",
    "private": true,
    "scripts": {
      "build": "make build",
      "test": "go test ./...",
      "e2e": "make e2e"
    }
  }
  ```

  Now `pnpm -r run test` includes it — but observe what you _cannot_ express:
  picking-e2e's dependency on a running order-service, or "rebuild
  barcode-cli when shared SKU conventions change". The graph stays npm-only;
  wrappers are labels, not edges.

- [ ] Decide whether to keep or revert the wrapper (recommend revert, so the
      turbo/nx/moon trials each face the same untouched non-JS repos).

**Record:** what a wrapper buys (uniform entry point) vs. what it can't
(ordering, inputs, cache — moot here anyway, there's no cache).

## Phase 8 — graph introspection (~10 min)

- [ ] What exists:

  ```sh
  pnpm ls -r --depth -1                        # the package list
  pnpm why @acme/logger                        # reverse deps of one package
  pnpm --filter "shop-web..." ls --depth -1    # transitive closure of one app
  ```

- [ ] What doesn't: no task graph (there are no tasks), no visualization, no
      "explain why this rebuilt" (nothing is ever skipped). Compare against
      the hand-drawn mermaid graph in the README — could you regenerate it
      from pnpm output alone? (Mostly yes for packages, no for dev vs prod
      edge styling, no for the non-JS repos.)

**Record:** is `pnpm why` output enough to debug "why did my app pick up two
majors of http-client"?

## Scorecard

Fill in as you go; this becomes the justified pnpm column of the README table.

| criterion                  | verdict | evidence / notes                                                                      |
| -------------------------- | ------- | ------------------------------------------------------------------------------------- |
| Build cache                |         | Phase 5 timings:                                                                      |
| Internal dependency        |         | Phase 3:                                                                              |
| Action dependency          |         | Phase 4:                                                                              |
| Graph introspection        |         | Phase 8:                                                                              |
| Non-JS tasks               |         | Phase 7:                                                                              |
| Easy to maintain?          |         | config lines: root ** / per-package ** ; phantom deps fixed: \_\_                     |
| Easy to reason about?      |         | could you predict `--filter "shop-web..."`?                                           |
| Easy to integrate into CI? |         | affected via `--filter "...[master]"` — works with shallow clones? needs fetch depth: |
| Migration cost             |         | Phase 2 breakage: ** ; Phase 6 skew upgrades: **                                      |

Keep the branch (`try-pnpm`) when done — turbo layers directly on top of a
working pnpm workspace, so the Turborepo trial starts from this exact state
(`git checkout -b try-turbo try-pnpm`).
