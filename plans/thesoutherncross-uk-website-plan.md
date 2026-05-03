# The Southern Cross UK — Guild Site Plan

Solar-system-style game server hub + Steam-driven member roster, single-page site, self-hosted on IIS.

## Progress Tracker

> **How to use:** At the start of every session, read this block first. Update the `Status` line and tick boxes as work completes. Keep the `Last touched` note so the next session knows where the last one stopped.

- **Status:** `p1-p4-complete · pr-open` &nbsp;·&nbsp; **Active phase:** Phase 5 (IIS Deployment) next &nbsp;·&nbsp; **Last touched:** 2026-05-03 — Phase 4 audit found UI already built; fixed deep-link highlight race that failed e2e (state-driven `data-highlight` instead of imperative timer). **34/34 e2e green** (grep-invert @visual) across desktop+mobile, 35/35 vitest green, typecheck clean. **Visual baselines for Phases 2 + 3 + 4 not yet captured** — needs user eyeball of live sections + `npx playwright test --grep "@visual" --update-snapshots`.
- **Session log:**
  - 2026-04-24 — feature-dev (orchestrator + 3 parallel build agents) — scaffold + backbone + shell, visual parity vs user-supplied `docs/design/user/site.html`, all 8 code-review findings addressed
  - 2026-05-02 — orchestrator + 4 sequential agents (impl → tests → review → fixes) — Phase 3 solar-system scene shipped. Discovered + fixed two **pre-existing P2 bugs** that blocked production build: `package.json` had `"type": "commonjs"` vs ESM source (Next 16 build failed on every lib/* import); `components/hud/Panel.tsx` polymorphic `forwardRef` had 3 typecheck errors. Both pre-existed P3 work — P2's commit message "next build 7/7 pages" was incorrect. Code review found 7 bugs + 4 nits in P3; all addressed except I5 (spring drift while frame-gated) and I6 (decorative-rings reduced-motion flash) — both deferred as architectural polish, non-blocking.
  - 2026-05-03 — orchestrator (deep smoke test) — caught a `Maximum update depth exceeded` infinite-render loop in the paused state via dev-log inspection during mobile e2e. Cause: `recordOrbitAngle` called inside `useFrame` every frame while paused (60Hz `pausedAngles` object churn), combined with object-returning store selectors in `Moon.tsx` + `Planet.tsx` (no shallow equality). Tests still passed because assertions completed before React's loop limit tripped — pure browser-console-only failure. Fixed in `fe9b58b`: dropped per-frame setState (`angleRef` is the source of truth on resume), switched to per-scalar selectors. PR #1 opened as draft against main with full Phase 1+2+3 history (6 commits, 87 files, +27,853/-2).
  - 2026-05-03 — orchestrator + impl/spec-review/quality-review agents — Phase 4 audit confirmed UI was built during P2 (MembersSection + MemberCard + grid + states + visual specs all in place); only failing item was the `#/members/{id}` deep-link e2e test. Root cause: imperative `setAttribute` with 2s `setTimeout` raced Playwright's `waitForReady` (networkidle + scene-ready up to 1.5s + 200ms), so `data-highlight` was already removed before assertion ran. Converted to React state-driven `data-highlight` declaratively rendered by `MemberCard`; 2s CSS pulse keyframe still fires once. Spec compliance and code quality both reviewed, approved.

### Top-level checklist

- [x] Design mocks obtained — **user-supplied HTML** at `docs/design/user/site.html` is the canonical reference. Stitch/Claude prompts not used.
- [x] **Phase 1 — Scaffold + Data Backbone**
- [x] **Phase 2 — Design System + Single-Page Shell**
- [x] **Phase 3 — Solar System Scene**
- [x] **Phase 4 — Members Section** *(code complete; live Steam creds + visual baselines captured at deploy time)*
- [ ] **Phase 5 — IIS Deployment**
- [ ] v1 shipped and verified in production

Detailed per-phase checklists live inside each phase section below.

## Context

The Southern Cross UK hosts multiple game servers (primarily Steam source-engine games and Minecraft) and wants a public site where the core feature is an **interactive solar system**: each planet is a game, each moon is a live server instance of that game. Visitors zoom from the system view down to a planet, click a moon, and see live status (online/offline, player count, connect info) without leaving the scene. Alongside this, the site shows the guild roster sourced from the Steam group.

This plan is for **v1**: a **single-page site** — landing, interactive solar system with in-scene server info panels, and member roster — all on one continuous page with hash-based section navigation. News, events, and dedicated server detail pages are deferred to v2 (which will migrate to real Next.js routes).

Execution is organised into **5 phases** with agent roles designed so independent work can run in parallel (see [Phasing & Team](#phasing--team)). Two design-generation prompts are provided in the appendices — one for a Claude design session (via the `frontend-design` skill), one for Google Stitch — so visual mocks can be produced before implementation starts.

## Phasing & Team

Work is split into **5 phases** plus an up-front design pass. Each phase has an **exit criterion** — the phase isn't done until that is true. Phases are sized so a session can typically finish one phase (or one role within a phase) and commit a reviewable slice.

### Agent roles (the "team")

| Role | Owns | Skills / tools |
|---|---|---|
| **Backend** (`agent:backend`) | `lib/poller.ts`, `lib/steam.ts`, `lib/db.ts`, `/api/*`, SQLite schemas | Node, gamedig, Steam Web API |
| **Frontend-Shell** (`agent:shell`) | design tokens, HUD component library, Hero, NavBar, Footer, hash routing, `app/layout.tsx`, `app/page.tsx` composition | Next.js App Router, Tailwind, `frontend-design` skill |
| **3D-Scene** (`agent:scene`) | `components/solar-system/*`, shaders, camera rig, HUD overlay wiring, render-loop gating | React Three Fiber, drei, postprocessing, zustand |
| **Members** (`agent:members`) | `components/members/*`, `MembersSection`, SWR wiring, deep-link highlight | Next.js client components, SWR |
| **Ops** (`agent:ops`) | `server.ts`, `web.config`, `nssm` service files, win-acme docs, production env handling | IIS, Windows Service, Let's Encrypt |
| **Reviewer** (`agent:review`) | cross-cutting code review, verification, coding-guidelines enforcement | `coding-guidelines`, `verification-before-completion`, `requesting-code-review` skills |

### Parallelization map

```
Design pass (Claude + Stitch) ─┐
                               │
Phase 1 ── Backend ────────────┼──► Phase 3 (Scene) ──┐
         └─ Shell (tokens)  ───┘                       │
                              Phase 2 (Shell build) ──┤
                                                       ├──► Phase 5 (Ops)
Phase 4 (Members) ─ depends on P1 API + P2 shell ─────┘
```

- **Phases 1 + 2 run in parallel** (backend and shell don't touch each other; the shell uses mocked API responses until P1's endpoints land).
- **Phase 3 starts when Phase 1's `/api/servers` returns valid data** for a mock config, even if Phase 2 isn't finished — the scene can develop against its own HUD styling placeholders.
- **Phase 4 runs in parallel with Phase 3** once Phase 1 + 2 are both green.
- **Phase 5 is the final gate** — all prior phases must be done.

### Phase 0 — Design pass (before code)

Secure a canonical set of mocks that every later phase will match. **User-provided designs, if supplied, are authoritative** and supersede any prompt-generated output — Phases 2 and 3 must implement the UI to match them visually (layout, spacing, colour usage, iconography). Use the Claude / Stitch prompts only if no user designs are provided, or to fill gaps in a partial design set.

- [x] **If the user supplies designs** (Figma / images / HTML / any format): drop them into `docs/design/user/`; treat them as the canonical target for Phases 2 and 3; skip the prompt-generated steps unless a section is missing — **DONE**: compiled-React SPA export saved to `docs/design/user/site.html` (+ `site.bundle.js`, `index.css`)
- [ ] ~~**Otherwise** — run **Claude design prompt** (Appendix A)~~ — _skipped; user design is authoritative_
- [ ] ~~**Otherwise** — run **Google Stitch prompt** (Appendix B)~~ — _skipped; user design is authoritative_
- [x] Pick a winning direction — **user-supplied HTML**. See "Design decisions" at bottom of this file.
- [x] Extract final color hex values, font stacks, corner-cut specs, spacing, and any iconography; feed them into Phase 2 — **DONE**: tokens live in `app/globals.css` + `tailwind.config.ts`; 10px corner-cut, Orbitron display + JetBrains Mono data, palette exactly matches plan
- [ ] **Normalise the canonical designs into PNGs at 1440×900 and 390×844**, per section; drop into `tests/visual/baselines/` — _deferred_; Playwright scaffold is in place (`tests/visual/*.spec.ts` + `freezeScene.ts` + `mockApi.ts`), baselines will be captured via `npx playwright test --update-snapshots` after the user eyeballs live sections

**Exit criterion:** a single canonical mock set exists on disk (`docs/design/user/` preferred, else `docs/design/{claude|stitch}/`), and the design tokens in "Design decisions" match it. Phases 2 and 3 gate on visual parity with this set.

### Phase 1 — Scaffold + Data Backbone

Owner: `agent:backend` (+ `agent:shell` for tooling). Runs in parallel with Phase 2.

- [ ] Create GitHub repo (user supplies name); clone, `npm init` — _local git init done; no remote yet (user deferred push)_
- [x] Scaffold Next.js + TypeScript + Tailwind, App Router, strict TS — Next 16.2.4, React 19, Tailwind 3, strict TS (note: `noUncheckedIndexedAccess` dropped for pragmatic reasons)
- [x] `server.ts` custom server that boots Next and calls `poller.start()`
- [x] `lib/db.ts` with `better-sqlite3`; migration for `server_status`, `members`, `status_history` — also adds `meta` table and helpers (`lastPollAt`, `setMetaFlag`, `pruneStatusHistory`, `withTransaction`)
- [x] `lib/query.ts` — `gamedig` wrapper with 5s timeout + retry — returns discriminated `QueryResult`, never throws
- [x] `lib/poller.ts` — 60s interval, writes to `server_status`; background 300s interval for member refresh — exposed as `createPoller(opts)` factory + default singleton; survives per-server failures
- [x] `lib/steam.ts` — group XML fetch + `GetPlayerSummaries` chunked at 100 — typed `SteamError`, avatar URL origin-whitelisted (`*.akamaihd.net` / `*.steamstatic.com`)
- [ ] `config/servers.ts` with 2 real servers (1 MC, 1 Source) for dev — _user chose "empty state" in Phase 3 brainstorming; `GAMES` is `[]` and the SYSTEM section renders "NO GAME SERVERS CURRENTLY PROVISIONED"_
- [x] `config/guild.ts` with "The Southern Cross UK" name, tagline, steam group id — full object: name, shortName, tagline, subheading, established (2015), region, ops, about, houseRules, comms, stats, join, footer. _Note: About copy is more polished than the design's placeholder; swap at `config/guild.ts` L59–72 to match design exactly if desired._
- [x] `/api/servers` → cached JSON
- [x] `/api/members` → cached JSON — includes `stale` flag
- [x] `/api/refresh?secret=…` with `lru-cache` rate limiter — rate limit runs **before** secret check so brute-force probes hit the same bucket
- [x] `/api/health` endpoint — returns 503 when `lastPollAt` > 5 min old or `dbOk: false`
- [x] SQLite opened with `journal_mode = WAL`, `synchronous = NORMAL`
- [x] Poller wraps each query in try/catch with structured `pino` logs; one failure never stops the next
- [x] `status_history` prune at end of every poll cycle (72h retention)
- [x] Steam API error path → serve stale cache + "stale data" flag in `/api/members` — poller sets `members.stale` meta flag; route surfaces it
- [x] `pino` logger + `pino-roll` writing to `logs/app.log`, daily rotation — silent destination under `NODE_ENV=test`
- [x] Unit tests for `lib/query.ts` (timeout path), `lib/steam.ts` (XML parsing), rate limiter, prune step — **35 tests across 6 files, all green**
- [x] Playwright scaffold: `@playwright/test` installed, `playwright.config.ts` with projects for chromium + mobile-chrome, `tests/lib/mockApi.ts` + fixtures in place
- [x] Playwright smoke test: `/api/health` returns 200, `/api/servers` returns expected shape — see `tests/e2e/api-smoke.spec.ts` (4 checks)
- [x] `.env.example` with `STEAM_API_KEY`, `STEAM_GROUP_ID`, `REFRESH_SECRET` — plus `DATABASE_URL`, `PORT`, `LOG_LEVEL`

**Exit criterion:** `npm run dev`, wait 60s, `curl /api/servers` and `/api/members` both return valid populated JSON; `/api/refresh?secret=<bad>` returns 401; `/api/health` returns 200 with `lastPollAt` set; a killed upstream (e.g. bad Steam key) leaves the server running with stale-cache responses instead of 500s.

### Phase 2 — Design System + Single-Page Shell

Owner: `agent:shell`. Runs in parallel with Phase 1.

- [x] Tailwind config: color tokens (`royal-purple`, `royal-purple-neon`, `royal-green`, `royal-green-neon`, `space`, `status-*`), monospace + display font stacks
- [x] Global CSS: near-black background with faint purple radial gradient, scanline overlay, HUD frame — plus `orbitPulse`, `termLine`, `blink`, `antennaBlink` keyframes
- [x] `components/layout/GuildLogo.tsx` — thin wrapper around `CruxMark` (5-point Crux stars in hex frame, real RA/DEC positions, procedural SVG)
- [x] `components/nav/NavBar.tsx` — sticky, hairline royal-green border, hash-linked items — nav labels: **HERO / ABOUT / SYSTEM / MEMBERS / JOIN** (design-driven, not plan's original SYSTEM/SERVERS/MEMBERS/JOIN)
- [x] `components/nav/useHashSection.ts` + `useActiveSection.ts` — IntersectionObserver scroll-spy, `replaceState`, debounced against hash-driven scrolls, active-id tracked via ref so observer doesn't thrash
- [x] `components/sections/Hero.tsx` — crest + tagline + status bar + scroll cue + bottom spec strip. **About was promoted to its own section per user decision ("follow design exactly")**; the hero card pattern was not needed
- [x] `components/sections/AboutSection.tsx` — full section: Mission Brief panel (about copy + numbered house rules) + Operational Vitals panel (stats grid + Comms Protocol) + decorative hair-grid background
- [x] `config/guild.ts` grows an `about` field — also grows `houseRules`, `comms`, `stats`, `join`, `footer`
- [x] `components/sections/JoinSection.tsx` — animated TTY boot-log terminal + Steam + Discord CTAs + RA/DEC coordinates footer. Respects `prefers-reduced-motion` + `__TEST_MODE__`
- [x] `config/guild.ts` grows `join` block
- [x] `components/sections/Footer.tsx` — coords line + BUILD SHA line
- [x] HUD primitives: `<Panel>`, `<HudPanel>`, `<Scanlines>`, `<HudButton>`, `<Pill>`, `<Dot>`, `<Eyebrow>`, `<HudCorner>`, `<HairlineDivider>` (barrel-exported from `components/hud/index.ts`)
- [x] `app/layout.tsx` with Next `Metadata` export — title+template, description, OG, Twitter Card, icons, manifest, `metadataBase`, viewport, colorScheme dark
- [x] `app/opengraph-image.tsx` via `next/og` — crest + title + tagline composition at 1200×630
- [x] ~~`public/favicon.ico`, `apple-touch-icon.png`~~, `icon.svg`, `manifest.webmanifest` — SVG-only icon chosen (modern browser coverage); `.ico`/`.png` dropped (not needed in 2026, and would require binary generation)
- [x] `app/robots.ts` and `app/sitemap.ts` — robots disallows `/api/` + `/kitchen-sink`; sitemap lists `/`
- [x] JSON-LD `Organization` schema in the head — via `<Script>` in `app/layout.tsx`, uses `GUILD.name`, founding date, `comms` URLs
- [x] Global `prefers-reduced-motion` CSS — universal `animation-duration: 0.001ms !important; transition-duration: 0.001ms !important;` at `globals.css` tail. SMIL antenna blink converted to CSS keyframe so this rule covers it.
- [x] Footer shows `BUILD {shortSha} · {buildDateIso}` — `next.config.ts` injects both via `execSync('git rev-parse --short HEAD')` with `stdio` suppressed so a pre-commit repo shows `BUILD dev`
- [x] `app/page.tsx` composing sections — `<NavBar/>` + `<Hero/>` + `<AboutSection/>` + `<SystemSection/>` + `<MembersSection/>` + `<JoinSection/>` + `<Footer/>`. SystemSection is the placeholder until Phase 3 lands.
- [x] `/kitchen-sink` route showing every HUD primitive in every state for visual review — Panel × 3, Button × 5, Pill × 3, Dot × 3, Eyebrow × 3, HudCorner × 4, HairlineDivider × 2, CruxMark × 3 sizes, AstronautAvatar × 5 hues, Starfield
- [x] Playwright tests: `tests/e2e/navigation.spec.ts` (hash nav + scroll-spy + deep links including `#/members/{steamid}` highlight) and `tests/e2e/keyboard-a11y.spec.ts` (tab order, Enter activates)
- [x] Playwright visual tests for sections owned by this phase: `hero.spec.ts`, `members.spec.ts` (populated + empty + error + stale states), `join.spec.ts`, `about.spec.ts`. Desktop + mobile projects configured. _Baselines not yet captured — user needs to run `--update-snapshots` once live sections are eyeballed._
- [x] Paired structural assertions alongside each visual test — each `@visual` spec pairs `toHaveScreenshot` with `expect(...).toContainText(...)` / `toBeVisible()` so a pixel drift + a DOM regression fail distinctly

**Exit criterion:** `npm run dev` shows hero + placeholder + members placeholder + join placeholder, nav works, `#/servers/foo/bar` and `#/join` deep links resolve, `/kitchen-sink` renders without console errors, OS-level "reduce motion" genuinely halts animations, view-source shows OG tags and Organization JSON-LD, footer shows a valid build SHA, **and the hero, nav, members grid, and join section visually match the canonical design set from Phase 0** (side-by-side review — layout, spacing, colour usage, iconography).

### Phase 3 — Solar System Scene

Owner: `agent:scene`. Depends on P1 (`/api/servers`) and P2 (HUD primitives).

- [x] `components/solar-system/Scene.tsx` — R3F Canvas, `<Stars>`, bloom postprocessing
- [x] `Sun.tsx` (guild crest core + emissive corona), `Planet.tsx`, `Moon.tsx`, `Orbit.tsx`
- [x] Custom Fresnel rim shader material (royal-purple rim default; planet tint from config)
- [x] `useCameraState` zustand store (`{ view, focusedGameId, focusedServerId, pausedOrbits: Set<string>, pausedAngles, listMode }`) — store grew `pausedAngles` map + `listMode` flag + `recordOrbitAngle` action vs. the original spec
- [x] `useOrbitAnimation.ts` — per-planet orbit angle driven by `useFrame`; freezes when planet id is in `pausedOrbits`, resumes from stored angle on unpause
- [x] `CameraRig.tsx` — `@react-spring/three` tweens between system / planet / server-focus; on planet-select adds that planet to `pausedOrbits`, on deselect removes it. Snap mode for `__TEST_MODE__` and reduced-motion. `api.stop()` before snap to drain in-flight spring.
- [x] HUD overlay — **deviation from plan**: design uses a side-by-side split (canvas left ~1.5fr, HUD panel right 340–400px), not the plan's "DOM overlay anchored top-right". Per Phase 0 exit criterion ("Phases 2 and 3 gate on visual parity with this set"), design wins. On mobile (<lg) the panel stacks below the canvas. `HudOverlay.tsx` consumes the store and renders breadcrumb, ZOOM OUT button, 3-col stat grid, instance list with status pills, click-to-copy CONNECT row, static 24h sparkline placeholder ("DATA ROLLING").
- [x] Deselection handling: `Esc` key, ZOOM OUT button in HUD, and a background-click catcher mesh on empty starfield all trigger zoom-out + orbit-resume
- [x] SWR polling `/api/servers` every 30s; moon colour reflects `online|laggy|offline`
- [x] Render-loop gating via `useSceneVisibility` (IntersectionObserver + `document.visibilityState`) → `Canvas frameloop` toggles `'always' | 'demand'`. Initial state `false` so off-screen mount does not waste a frame.
- [x] Deep-link restore: on first data load, if hash is `#/servers/{game}/{server}` or `#/servers/{game}`, restore camera to that focus. Gated on a `hasRestored` ref so 30s SWR polls don't overwrite user navigation.
- [x] Keyboard navigation via the DOM HUD instance list (canvas elements aren't natively focusable; the side-panel pattern lets the keyboard traverse server rows directly). Esc deselects one level. Focus ring inherited from existing globals.
- [x] WebGL availability check at mount (`webgl.ts`); if unavailable, render `<ListMode>` instead of `<Scene>` against the same `/api/servers` data
- [x] `<ListMode>` component: grouped-by-game tables of instances with status pill, players, map, COPY button (`auto-fit, minmax(380px, 1fr)` grid)
- [x] "LIST MODE" toggle in the HUD always available — not just a fallback. Toggle button persistent in the HUD; SCENE MODE button to return.
- [x] React Error Boundary wrapping `<Scene>` → auto-flips `setListMode(true)` on crash with a "3D UNAVAILABLE" indicator. Boundary lives in `SystemSection.tsx`.
- [x] Scene edge cases: zero games → centred 420px "SCAN COMPLETE" panel + decorative empty orbits + JOIN STEAM/DISCORD CTAs (matches design exactly). >8 games → tiered concentric orbit radii (`base + floor(idx/8) * gap`). Slow network → SWR skeleton via `keepPreviousData`. Camera tween cancelled when section leaves viewport (`reset()` on unmount).
- [x] Test mode hooks: `window.__TEST_MODE__` causes `Scene` to dispatch `scene-ready` after first frame, `CameraRig` to snap (no spring tweens), `Planet.phase` to be deterministic. `tests/lib/freezeScene.ts` waits for `scene-ready` (1500ms fallback for non-scene specs).
- [x] Playwright visual tests: `tests/visual/server-section.spec.ts` covering 5 states (system-empty, system-populated, system-planet-selected, system-server-focused, system-list-mode), each paired with structural assertions, on desktop + mobile projects. **Baselines not yet captured** — needs user eyeball + `npx playwright test --grep @visual --update-snapshots` (~20 PNGs).
- [x] Playwright e2e tests: `tests/e2e/scene-interaction.spec.ts` (3 tests: planet-select + URL/breadcrumb + Esc deselect; LIST/SCENE toggle round-trip; server drilldown), `tests/e2e/list-mode.spec.ts` (2 tests: WebGL stub → list mode renders; full data assertion). `tests/e2e/navigation.spec.ts` extended with one deep-link test for `#/servers/minecraft/mc-vanilla`. **6/6 e2e green.**

**Exit criterion:** clicking a planet tweens the camera in, pauses *that planet's* orbit while others keep moving, and fades in the overlay; clicking a moon expands the overlay to server detail; pressing Esc (or clicking empty space) zooms back out and the paused planet resumes orbit from the angle it was paused at; keyboard-only navigation reaches every interactive target; toggling OS "reduce motion" disables tweens and orbits; forcing a WebGL error shows `<ListMode>` with working data; killing a real server turns its moon red within 2 polling cycles; scrolling away pauses the render loop (verify via DevTools); **the system view, planet-selected view, moon-focused overlay, and list-mode fallback all visually match the canonical design set from Phase 0**.

### Phase 4 — Members Section

Owner: `agent:members`. Depends on P1 + P2.

- [x] `components/sections/MembersSection.tsx` — SWR fetch from `/api/members` (60s refresh, `revalidateOnFocus: false`)
- [x] `components/members/MemberCard.tsx` — avatar (with procedural `AstronautAvatar` fallback), persona, online dot, currently-playing-game chip, last-logoff relative time
- [x] Grid layout — `repeat(auto-fill, minmax(280px, 1fr))`, 14px gap, hairline borders via `.hud-panel`
- [x] Deep-link handler: `#/members/{steamid64}` scrolls + 2s royal-green pulse — state-driven `data-highlight` (declarative; previous imperative version raced Playwright's waitForReady)
- [x] Empty + error states (both styled in HUD chrome — "NO OPERATORS ONLINE" / "SIGNAL LOST" with retry)
- [x] Playwright visual test: `tests/visual/members.spec.ts` covers populated/empty/error/stale states. **Baselines not yet captured** — same user-eyeball gate as P2 + P3.
- [x] Playwright e2e test: `tests/e2e/navigation.spec.ts:32` validates `#/members/{id}` deep-link highlight (passes on chromium-desktop + chromium-mobile)

**Exit criterion:** real Steam group renders with avatars and personas; deep-link highlight works; loads from cache on cold start without hitting Steam; `members` visual + e2e specs pass.

### Phase 5 — IIS Deployment

Owner: `agent:ops`. Depends on all prior phases.

- [ ] `npm run build` succeeds with zero warnings relevant to production
- [ ] Build emits `NEXT_PUBLIC_BUILD_SHA` and `NEXT_PUBLIC_BUILD_DATE` — confirm footer reflects them
- [ ] `nssm` install script / documented commands for `TheSouthernCrossUK` service
- [ ] nssm stdout/stderr redirected to `logs/nssm.out.log` / `logs/nssm.err.log` with rotation
- [ ] `web.config` with URL Rewrite + ARR → `http://127.0.0.1:3000`
- [ ] `web.config` security headers block: CSP (allow `*.akamaihd.net`, `*.steamstatic.com` for `img-src`), HSTS (`max-age=63072000; includeSubDomains; preload`), `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy: interest-cohort=()`
- [ ] Long `Cache-Control` on `/_next/static/*`; `no-store` on `/api/*`
- [ ] win-acme cert bound to 443; HTTP→HTTPS redirect
- [ ] Firewall: only 80/443 publicly; Node bound to `127.0.0.1` only
- [ ] `.env` on the server populated; `nssm set TheSouthernCrossUK AppEnvironmentExtra …` captured in docs
- [ ] Uptime check against `/api/health` documented (e.g. UptimeRobot → HTTPS GET every 5 min, alert on non-200)
- [ ] Smoke test checklist from [Verification](#verification) run end-to-end on the live host
- [ ] Security header sanity check via securityheaders.com (target grade: A)
- [ ] README with operator runbook: manual deploy flow — `npm ci && npm run test:e2e && npm run build && nssm restart TheSouthernCrossUK` (Playwright suite is a pre-deploy gate in v1); rotate secrets, view logs, back up SQLite
- [ ] Mark CI/CD as v2: runbook contains a placeholder section referencing the manual flow

**Exit criterion:** site is live on the guild's domain over HTTPS, survives a Windows reboot, poller keeps ticking, `/api/health` green, security-header scan passes, all verification checks pass.

## Cross-cutting quality bars

These apply across phases — each phase's checklist references them where relevant.

### Accessibility & motion (`a11y`)
- Keyboard navigation through the scene: planets and moons are focusable (tab order), Enter selects, Esc steps out. Focus ring is royal-green neon + 2px ring.
- `prefers-reduced-motion: reduce` → disable orbit animation (planets freeze where they are), skip camera tweens (snap to state instead), disable bloom pulse.
- WebGL not available / GPU blacklisted → render a text-mode fallback in the ServerSection: grouped list of games, each with an instance table (name, status pill, players, copy connect). Uses the same `/api/servers` data.
- Text-alternate view is always available via a "LIST MODE" toggle in the HUD, for screen readers and users who find 3D disorienting.
- Color contrast: all body and HUD text uses the *neon* variants (`#7c3aed` / `#39ff88`) or pure white on `#07060c`, never the deep variants — the deep purples/greens are for fills and strokes only.

### SEO & metadata
- `app/layout.tsx` sets the full metadata block (title, description, OpenGraph, Twitter Card) via Next's `Metadata` export.
- OG image rendered via `next/og` from a static composition of the crest + tagline.
- `public/favicon.ico`, `public/apple-touch-icon.png`, `public/icon.svg`, `public/manifest.webmanifest` all present.
- `app/robots.ts` + `app/sitemap.ts` generate both; sitemap lists only `/` (hash sections aren't indexable — accept for v1).
- `application/ld+json` `Organization` schema in the head.

### Security headers
- IIS `web.config` adds: `Content-Security-Policy` allowing `img-src` for Steam avatar CDN (`*.akamaihd.net`, `*.steamstatic.com`), `connect-src` self, `script-src 'self'`, `style-src 'self' 'unsafe-inline'` (R3F inlines some), `frame-ancestors 'none'`
- `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload`
- `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy: interest-cohort=()`

### Resilience
- React Error Boundary around `<Scene>` — on WebGL crash, auto-falls back to LIST MODE with a small "3D unavailable" indicator.
- Poller wraps every per-server query in try/catch, logs with `{ level, serverId, err }`; one failure never stops the next.
- SQLite opened with `journal_mode = WAL` + `synchronous = NORMAL` for concurrent reads during writes.
- Steam API 5xx or timeout → members section serves stale cache and renders a subtle "stale data" chip rather than an empty state.

### Data retention
- `status_history` keeps 72 hours only. Prune step runs at the end of each poller cycle: `DELETE FROM status_history WHERE captured_at < NOW() - INTERVAL 72 HOUR`.
- `members` table rows never expire but are overwritten in place by steamid.
- `server_status` is a current-state table (one row per server id), not growing.

### Visual parity & testing
- Canonical design mocks from Phase 0 (`docs/design/user/` preferred) are normalised into PNGs at two fixed viewports: **1440×900** (desktop) and **390×844** (mobile). Stored at `tests/visual/baselines/{section}-{viewport}.png`.
- Playwright suite lives in `tests/`:
  - `tests/e2e/*` — user-flow tests (hash nav, deep links, keyboard nav, Esc/click-out to deselect, reduced-motion path, WebGL-missing fallback)
  - `tests/visual/*` — section-by-section visual-parity tests (hero, nav, server-section system view, planet-selected, moon-focused, list-mode, members grid, join section — plus mobile variants)
- **Determinism before any screenshot:** test helper `tests/lib/freezeScene.ts` sets `prefers-reduced-motion: reduce`, mocks `/api/servers` and `/api/members` with fixtures, seeds the starfield RNG, forces a fixed camera state, and waits for `fonts.ready` + an explicit "scene-ready" event dispatched by the app in test mode.
- **Pixel diff tolerance:** `toHaveScreenshot({ maxDiffPixelRatio: 0.05, threshold: 0.15 })` by default — designs will not be 1:1 with the browser render; the job is to catch structural drift, not anti-aliasing.
- **Structural assertions alongside pixels:** every visual test is paired with a set of DOM/computed-style assertions (e.g. "nav bottom border is `rgba(57,255,136,…)`", "hero About card is centered, ≤ 520px wide", "primary CTA has `background-color: #39ff88`"). Precise failures when the pixel diff is ambiguous.
- **Updating baselines:** only after a design change has been re-approved by the user. `npm run test:visual -- --update-snapshots` is a deliberate, reviewed action.
- Suite runs locally via `npm run test:e2e`; must pass before every deploy (called out in the v5 runbook). No CI in v1.

### Observability
- `/api/health` endpoint returns `{ ok: true, uptime, lastPollAt, dbOk }`; 503 if lastPollAt > 5 minutes ago or dbOk false.
- Logs written to `logs/app.log` with `pino` + daily rotation (`pino-roll`); nssm also redirects stdout/stderr as a belt-and-braces.
- Footer shows `BUILD {shortSha} · {buildDateIso}` — values injected at build time via `NEXT_PUBLIC_BUILD_SHA` / `NEXT_PUBLIC_BUILD_DATE`.

### Explicit v1 decisions (non-goals)
- **No analytics** in v1 → no cookie banner needed (guild is UK-based). If added later, use a cookieless provider (Plausible / Fathom) and revisit.
- **No CI/CD pipeline** in v1 → deploy runbook documents the manual flow: `git pull && npm ci && npm run build && nssm restart TheSouthernCrossUK`. GitHub Actions → SSH/WinRM deploy is a v2 upgrade.

## Stack & Hosting

- **Framework:** Next.js (App Router, TypeScript)
- **3D:** React Three Fiber + drei + postprocessing (bloom for the neon sci-fi HUD look)
- **Styling:** Tailwind CSS + CSS modules for HUD panels; no component library (keep the bespoke sci-fi feel)
- **Data cache:** SQLite (file-backed) — simple, no external service, fits self-host
- **Poller:** Node worker running in the same process via `setInterval`, plus a manual refresh route (`/api/refresh`) guarded by a secret for cron
- **Testing:**
  - Unit: `vitest` for `lib/*` pure functions
  - E2E + visual regression: **Playwright** (`@playwright/test`). Visual tests diff rendered sections against the canonical design set from Phase 0 at fixed viewports (1440×900 desktop, 390×844 mobile) with a small tolerance; structural assertions (computed styles, DOM layout, contrast) sit alongside the pixel diffs for precise-fail signals
- **Deployment target:** Guild's own **Windows server running IIS**. Run Next.js in production mode on Node; IIS fronts it with URL Rewrite + Application Request Routing (ARR) for TLS termination and reverse proxy. Node process supervised as a Windows Service via `nssm` (or `node-windows`). No Vercel-specific APIs used.
- **Repo:** New GitHub repo under the user's account (exact name/URL to be confirmed — suggested: `thesoutherncross-uk-website`)

## Architecture

```
┌────────────────────────┐         ┌─────────────────────────┐
│ Browser (single page)  │  HTTP   │ Next.js server          │
│  - Hero section        │────────▶│  - /api/servers  (JSON) │
│  - Solar system (R3F)  │         │  - /api/members  (JSON) │
│  - Members section     │         │  - /api/refresh  (cron) │
│  - Hash router (#/…)   │         │                         │
│  - Scene stays mounted │         │  lib/poller (interval)  │
└────────────────────────┘         │   ├─ steam A2S query    │
                                   │   └─ minecraft SLP      │
                                   │                         │
                                   │  lib/steam              │
                                   │   ├─ group XML fetch    │
                                   │   └─ GetPlayerSummaries │
                                   │                         │
                                   │  SQLite cache           │
                                   └─────────────────────────┘
```

### Server config (source of truth)

A single checked-in file `config/servers.ts` declares every server the guild hosts:

```ts
export const GAMES = [
  {
    id: 'minecraft',
    name: 'Minecraft',
    planet: { color: '#6ab04c', size: 1.0, orbitRadius: 8, orbitSpeed: 0.05 },
    servers: [
      { id: 'mc-vanilla', name: 'Vanilla SMP', host: 'mc.tsc-uk.tld', port: 25565, protocol: 'minecraft' },
      { id: 'mc-modded',  name: 'ATM10',       host: 'mc.tsc-uk.tld', port: 25566, protocol: 'minecraft' },
    ],
  },
  {
    id: 'cs2',
    name: 'Counter-Strike 2',
    planet: { color: '#e58e26', size: 0.8, orbitRadius: 14, orbitSpeed: 0.03 },
    servers: [
      { id: 'cs-dust', name: 'Dust2 24/7', host: '1.2.3.4', port: 27015, protocol: 'source' },
    ],
  },
  // ...
];
```

Adding a game = edit this file, add moons automatically = add to `servers`.

### Poller

`lib/poller.ts` runs on server boot:

- Every 60s, for each server in `GAMES`:
  - **protocol: 'source'** → query with the `gamedig` npm package (supports Source A2S, handles multiple steam games)
  - **protocol: 'minecraft'** → query Server List Ping (SLP) via `gamedig` (also supports MC Java/Bedrock)
- Write result to SQLite `server_status` table: `{ id, online, players, maxPlayers, map, ping, raw_json, updated_at }`
- On query timeout (5s), mark `online: false`, keep prior `raw_json` for 10 minutes before clearing
- `/api/refresh?secret=...` triggers a one-shot poll on demand (for external cron or manual test)

### Steam group roster

`lib/steam.ts`:

- `fetchGroupMembers(groupId)` → GET `https://steamcommunity.com/groups/{groupId}/memberslistxml?xml=1`, parse with `fast-xml-parser`, return array of steamID64 strings
- `fetchPlayerSummaries(steamIds)` → chunks of 100 to `ISteamUser/GetPlayerSummaries/v2` with the Steam Web API key from env. Returns avatar, persona name, online state, game currently playing
- Cached in SQLite `members` table with 15-minute TTL; background refresh on a longer interval (300s) in the same poller process
- Members are rendered client-side in `MembersSection` via SWR against `/api/members` — the cached table means the response is effectively instant

## The Solar System Scene

### Layout

- Central sun = guild crest / logo, mild bloom
- One planet per game, orbiting on a flat plane (Y=0) at configured `orbitRadius` and `orbitSpeed`
- Each planet has N moons (one per server instance) at smaller orbits around it, offset in Y so they're visible from above
- Moon color encodes status: royal-green neon (online), amber (laggy/high ping), muted crimson (offline)

### Visual style (Sci-fi HUD / neon)

- **Color scheme:** royal purple + royal green as the two brand accents
  - `--royal-purple: #4b0082` (deep base) with a brighter neon sibling `#7c3aed` for glows/rims
  - `--royal-green: #00a86b` (deep base) with a brighter neon sibling `#39ff88` for status "online" and highlights
  - Background: near-black `#07060c` with a faint purple radial gradient to avoid flat black
  - Status palette is tuned to fit: online = royal-green neon, warning/laggy = amber `#f0b429` (intentional contrast), offline = muted crimson `#b3264a` (desaturated so green dominates the scene)
- Dark space background, subtle starfield (drei `<Stars>`)
- Planets: simple shaded spheres with Fresnel rim glow (custom shader material) — default rim is royal-purple neon; planet base tints come from `config/servers.ts` per game, but HUD chrome and the sun corona are always purple/green
- Orbits: thin translucent rings in royal-purple (additive blending), faintly pulsing
- Bloom postprocessing on emissive materials (rims, moons, sun) — tuned so purple/green emissives bloom without blowing out
- HUD overlay: monospaced font, royal-green hairline borders, corner-cut panels (clip-path), subtle scanline; accent text and interactive hovers flip to royal-purple

### Interaction model

Three camera states managed by a `useCameraState` zustand store. All server/planet details are rendered as a **HUD overlay** layered over the 3D scene (DOM-over-canvas, not a side-by-side panel), so the scene always fills the section and the overlay appears in front of it.

1. **System view** (default) — orbital camera, slow auto-rotate, all planets labeled with thin leader-lines to HUD tags showing `{GameName} · {online instance count}/{total}`. All orbits animate normally. No overlay.
2. **Planet view** — **on selecting a planet:**
   - Camera tweens (react-spring + drei `CameraControls`) to fly to the planet and zoom in so it fills the frame
   - **That planet's orbit around the sun pauses** (its orbital angle is frozen); other planets keep orbiting in the background
   - The planet's moons continue to orbit around it, so they remain clickable targets
   - A HUD overlay fades in (positioned top-right over the canvas, leaving the planet visible on the left) showing: game name, instance list with status pills, and a prompt to select a server for detail
3. **Server focus** — click a moon (or row in the overlay) → camera zooms further onto that moon; the overlay expands to show: server name, host:port (click-to-copy), current players / max, map/version, last-updated timestamp, tiny 24-hour player count sparkline (from status history)

**Deselection** — press `Esc`, click the breadcrumb in the overlay, or click empty space (starfield):
- From Server focus → returns to Planet view (overlay shrinks back to instance list)
- From Planet view → camera tweens back out to System view, the overlay fades out, and the planet's orbit **resumes from the angle it was paused at** (not snapped back to start — continuity matters)

### Performance

- Instanced meshes for stars (drei already handles this)
- Planets/moons are low-poly spheres (~32 segments); total scene budget well under 5k triangles
- Pause `requestAnimationFrame` when tab hidden via `document.visibilityState`
- Lazy-load the 3D scene (`dynamic(() => import(...), { ssr: false })`); show a CSS-only sun/orbit skeleton during load

## Single-page structure & file layout

The site is **one Next.js page** (`app/page.tsx`) composed of stacked sections. A tiny hash router (`useHashSection`) maps `#/`, `#/servers`, `#/members` to the active section; the nav bar links to those hashes and highlights the current one based on scroll position + hash. API routes remain real HTTP endpoints so data is fetched the same way it would be in a multi-page setup — making v2's migration to real routes a rename, not a rewrite.

The 3D scene is mounted once inside the `ServerSection` and never unmounts. When the user scrolls away, we:
- pause the render loop via `useFrame` gate tied to `document.visibilityState` + section-in-viewport (IntersectionObserver)
- keep React state so returning to the section is instant

```
app/
  layout.tsx                    # HTML shell, global fonts, HUD frame, color vars
  page.tsx                      # composes <Hero/> <ServerSection/> <MembersSection/> <JoinSection/> <Footer/>
  api/
    servers/route.ts            # GET -> cached status JSON
    members/route.ts            # GET -> cached members JSON
    refresh/route.ts            # POST -> trigger one-off poll (secret-gated)
components/
  sections/
    Hero.tsx                    # landing: crest, tagline, About card (id="top")
    ServerSection.tsx           # wraps the R3F scene + HUD (id="servers")
    MembersSection.tsx          # member grid fed by /api/members (id="members")
    JoinSection.tsx             # CTA: join Steam group + Discord (id="join")
  nav/
    NavBar.tsx                  # hash links; sticky; active-section highlight
    useHashSection.ts           # hash <-> active section state (swap for router in v2)
    useActiveSection.ts         # IntersectionObserver driven scroll-spy
  solar-system/
    Scene.tsx                   # R3F Canvas root
    Sun.tsx
    Planet.tsx
    Moon.tsx
    Orbit.tsx
    CameraRig.tsx               # state-driven camera transitions
    HudOverlay.tsx              # DOM overlay layered over canvas (absolute, pointer-events: auto)
    useCameraState.ts           # zustand store (view, focusedGameId, focusedServerId, pausedOrbits)
    useOrbitAnimation.ts        # per-planet orbit angle; respects pausedOrbits set
  members/
    MemberCard.tsx
  layout/
    GuildLogo.tsx
    Footer.tsx
config/
  servers.ts                    # game + server declarations (see above)
  guild.ts                      # name, tagline, steam group id, colors
lib/
  poller.ts                     # interval-driven status poll
  steam.ts                      # group XML + player summaries
  db.ts                         # better-sqlite3 client + migrations
  query.ts                      # gamedig wrappers + timeout/retry
server.ts                       # custom Next.js server that boots the poller
tests/
  e2e/
    navigation.spec.ts          # hash nav + deep links (#/servers/{g}/{i}, #/members/{id}, #/join)
    scene-interaction.spec.ts   # planet select/deselect, orbit pause/resume, moon focus
    keyboard-a11y.spec.ts       # Tab order, Enter/Esc, focus ring presence
    list-mode.spec.ts           # WebGL disabled → list mode renders with same data
  visual/
    hero.spec.ts                # hero + About card (desktop + mobile)
    server-section.spec.ts      # system view / planet-selected / moon-focused / list-mode
    members.spec.ts             # members grid + card highlight
    join.spec.ts                # CTA section
    baselines/                  # PNGs derived from canonical design mocks
  lib/
    freezeScene.ts              # disables animations, seeds RNG, waits for scene-ready
    mockApi.ts                  # MSW/Playwright route handlers for /api/servers + /api/members
    fixtures/                   # sample server + member JSON
playwright.config.ts
```

### Hash routing + deep links

- `#/` or no hash → hero in viewport
- `#/servers` → smooth-scroll to server section; if a planet/server was previously focused via `#/servers/cs2/cs-dust`, the scene restores that camera state on mount
- `#/members` → smooth-scroll to members section
- `#/members/{steamid}` → scrolls + highlights that member card for 2s
- `#/join` → smooth-scroll to the join section
- Scroll-spy keeps the hash in sync with the visible section (replaceState, so no history spam)
- v2 swap plan: rename `useHashSection` to call `useRouter().push()`, rename sections to real route segments — the nav links and deep-link keys already match that shape

A custom `server.ts` is used (instead of the default `next start`) so the poller starts once on boot and shares the SQLite handle.

## Data flow (live status)

1. `server.ts` boots Next + calls `poller.start()`
2. Poller writes to `server_status` every 60s
3. Browser loads the single page → all three sections mount; R3F scene inside `ServerSection` fetches `/api/servers` (returns all cached rows) once
4. Scene polls `/api/servers` every 30s via SWR for soft refresh; status color on moons updates without remount
5. Clicking a moon reads already-loaded data from the SWR cache — no new request
6. Scrolling to `MembersSection` triggers its own SWR fetch of `/api/members` (deduped and cached by SWR for the session)
7. When the server section leaves the viewport, the R3F render loop pauses — the scene stays mounted but costs ~0 CPU

## Security & ops

- Steam Web API key in `.env.local` (loaded by Node); on the server, set via the Windows Service environment (`nssm set <svc> AppEnvironmentExtra` or a `.env` file read by Node). Never shipped to client.
- `/api/refresh` requires `?secret=` matching `REFRESH_SECRET` env — for external trigger or debugging
- Rate limit `/api/refresh` to 1 req/minute per IP (basic `lru-cache` token bucket)
- Server host/port in `config/servers.ts` are public info (the connect strings are meant to be shown); if any server should be private, add `hidden: true` and skip it in the API response
- **Windows Service:** `nssm install TheSouthernCrossUK "C:\Program Files\nodejs\node.exe" "C:\inetpub\thesoutherncross-uk-website\server.js"` with `AppDirectory` = project root, restart on failure
- **IIS site:** bind 80/443 with Let's Encrypt cert (win-acme). `web.config` uses URL Rewrite + ARR to reverse-proxy `/` → `http://localhost:3000`. Static `/_next/static/*` can be cached aggressively via `<clientCache>` rules; `/api/*` and the 3D scene HTML are left uncached.
- Firewall: only 80/443 exposed publicly; Node's `:3000` bound to `127.0.0.1` only

## Verification

End-to-end checks for v1:

1. **Local dev**
   - `npm run dev` — landing renders, sun + planets + orbits visible, no console errors
   - Mock two entries in `config/servers.ts` (one reachable MC server, one intentionally bad host) — after ~60s `/api/servers` shows one online/one offline; moon colors match
2. **Scene interactions**
   - Click a planet → camera tweens in, that planet's orbit pauses (other planets keep moving), overlay fades in with instance list; moons become clickable
   - Click a moon → overlay expands to server detail (name/host/players, sparkline); click-to-copy works
   - Esc, click the breadcrumb, or click empty starfield → zooms back out; the paused planet resumes orbit from its frozen angle (no snap-back)
   - Resize window → canvas rescales without layout shift; overlay reflows without clipping
3. **Single-page navigation**
   - Click nav links → page smooth-scrolls to the matching section; URL hash updates
   - Scroll manually → active nav item + hash update in sync (replaceState, no history spam)
   - Load `/#/servers/minecraft/mc-vanilla` directly → page renders, smooth-scrolls to the server section, camera auto-focuses on that moon, HUD panel pre-opened
   - Load `/#/members/{steamid}` directly → scrolls to members section, that card is highlighted for 2s
   - Scroll away from the server section → DevTools Performance shows GPU usage drops (render loop paused)
4. **Members**
   - Set `STEAM_GROUP_ID` + `STEAM_API_KEY` in `.env.local` → members section renders avatars and personas from the real group
   - Restart server → members load from cache on first request (no upstream call)
5. **Automated test suite**
   - `npm run test` — all vitest unit tests green
   - `npm run test:e2e` — full Playwright suite green (all e2e + visual specs). Must pass before any deploy.
   - `npm run test:visual -- --update-snapshots` only when a design change has been re-approved — reviewed as a distinct commit.
6. **Production parity (IIS / Windows)**
   - `npm run build`, then start Node via `nssm` service → Windows Event Log / service log shows one poller cycle per 60s
   - IIS serves HTTPS (win-acme cert), `/_next/static/*` returns with long `Cache-Control`, `/api/*` returns `no-store`
   - Kill one game server → within ~2 minutes its moon turns red in the UI without a page reload
   - Restart the Windows Service → site recovers; SQLite survives restart; members/status load from cache on first hit

## Open items (required from user before scaffold)

- **Guild name:** The Southern Cross UK ✓
- Tagline and logo asset (SVG preferred)
- About copy: one short paragraph (~60–120 words) for the hero About card; longer copy will be promoted to its own section
- Join section content: headline, blurb, 2–3 requirement bullets, Steam group invite URL, Discord invite URL (optional)
- Steam group vanity URL or 64-bit ID
- Initial list of games + servers (host, port, display name) — can start with placeholders
- Target Windows server details: Windows version, IIS version, domain name, whether ARR + URL Rewrite modules are already installed — only needed at deploy time, not for scaffold
- Exact GitHub repo name (suggested: `thesoutherncross-uk-website`)

## Out of scope for v1 (v2 candidates)

- Migration from single-page + hash sections to real Next.js routes (`/servers`, `/members`, `/news`)
- Dedicated server detail pages with historical charts
- News / announcements
- Events / schedule
- Steam OAuth login for members to claim profiles
- Admin UI (vs. editing `config/servers.ts`)

---

## Appendix A — Claude Design Prompt

Paste this into a new Claude session. If you have the `frontend-design` skill installed, invoke it first so Claude opens its design workflow. The expected output is one or more self-contained HTML+CSS mocks of the hero, server section (solar system stand-in), and members section.

```
You are designing the v1 visual direction for "The Southern Cross UK" — a gaming guild's single-page website. Produce polished, production-grade HTML + CSS mockups I can drop into a static folder and open in a browser.

## Brand
- Name: THE SOUTHERN CROSS UK
- Tagline placeholder: "Servers. Signals. Squad." (replace with final tagline when provided)
- Aesthetic: sci-fi HUD / command console / neon-on-black. Think "guild ops dashboard from orbit", not cartoony space. The "Southern Cross" name invites a subtle constellation motif — incorporate a four/five-star constellation mark somewhere in the hero/crest, without making it the whole identity.
- Color system — use exactly these:
  - --royal-purple: #4b0082  (deep base)
  - --royal-purple-neon: #7c3aed  (glows / rims / accents)
  - --royal-green: #00a86b  (deep base)
  - --royal-green-neon: #39ff88  (status online, key highlights, hovers)
  - --space: #07060c  (background — near-black with a faint purple radial gradient)
  - --status-warn: #f0b429
  - --status-down: #b3264a  (muted, so green dominates)
- Typography: monospace for HUD chrome and data (e.g. JetBrains Mono, IBM Plex Mono), a subtle display face for hero headings (e.g. Orbitron, Rajdhani). Keep it to two families total.
- Visual motifs: hairline borders (royal-green), corner-cut panels (clip-path polygon), faint scanline overlay on HUD panels, soft bloom on emissive elements, subtle starfield in the background, animated orbit ring arcs, a Southern-Cross constellation glyph as a recurring mark.

## Page composition (single page, three stacked sections)

1. **Hero** — full-viewport. Guild crest (with constellation mark) centered, tagline beneath, then an **About HUD card** (corner-cut panel, ~480px wide, one short paragraph of guild copy — use lorem-ipsum-style placeholder if needed), and a small "SCROLL / ENTER SYSTEM" cue at the bottom. Background: space gradient + parallax starfield. No navigation bar inside the hero itself — the bar is sticky above, hairline royal-green bottom border.

2. **Solar System (Server Hub)** — full-viewport. This is the headline feature:
   - Central sun = guild crest with a purple/green emissive corona and bloom.
   - Orbiting planets = games the guild hosts (Minecraft, Counter-Strike 2, ARK, etc.). Each planet has a Fresnel rim glow in royal-purple-neon.
   - Each planet has small moons = individual server instances of that game. Moons are color-coded: royal-green-neon (online), amber (laggy), muted crimson (offline).
   - Orbits are thin translucent royal-purple rings, faintly pulsing.
   - The **server details are an overlay** layered over the 3D scene (DOM-over-canvas, NOT a side-by-side panel). The scene always fills the section; the overlay appears in front of it (typically anchored top-right so the focused planet remains visible on the left).
   - Overlay content: selected planet name, instance list, status pills, click-to-copy "connect" string, player count and max, a 24-hour player-count sparkline.
   - Include a "breadcrumb" at the top of the overlay: `SYSTEM / MINECRAFT / VANILLA SMP`.
   - **Show three states explicitly:**
     a. System view — no overlay, all planets orbiting
     b. Planet selected — camera tight on that planet (it fills ~40% of the frame), that planet's orbit is **paused** while the others continue, overlay visible with instance list
     c. Moon focused — overlay expanded to full server detail, moon highlighted

3. **Members** — stacked grid of member cards driven by a Steam group. Each card: circular avatar with a thin royal-purple halo, persona name, online/offline dot (royal-green for online), and a chip showing the game they're currently playing if any. Empty state and error state should also be designed.

4. **Join the Guild** — single-viewport CTA section. Headline "JOIN THE CROSS" (or similar), a short "who we are looking for" paragraph, 2–3 requirement bullets (age, mic, activity expectation, whatever fits), and two buttons: a primary "JOIN THE STEAM GROUP" in royal-green-neon fill, and a secondary "DISCORD" in royal-purple-neon outline. Wrap both in a single wide HUD panel with corner-cuts. Faint constellation mark in the background.

## Deliverables
- One HTML file per section (or one combined HTML with anchor sections) using vanilla CSS and inline SVG for the solar system stand-in (no Three.js needed — a static top-down SVG of sun + 3 planets + moons is fine).
- Include at least one "focused moon" alternate composition of the Server Hub.
- Include a sticky nav bar showing active section state.
- Use CSS custom properties for the color tokens.
- No frameworks; no external UI libraries; Google Fonts link is fine.

## Constraints
- Must hold up at 1440×900 and 390×844 (mobile — the solar system can collapse to a vertical list with the HUD panel below).
- Royal purple and royal green must both feel first-class; neither should be a lone accent.
- No stock AI sparkles, no generic SaaS gradients, no glassmorphism clichés. This is a guild HUD, not a landing page template.

When you're done, show the rendered result, then summarise the key design decisions in 5 bullets so I can feed them back into my implementation plan.
```

## Appendix B — Google Stitch Prompt

Paste this into a new Stitch project (stitch.withgoogle.com). Stitch works best with short, visual-first prompts — structure, palette, and named components. Run it several times with small variations and curate the best frames into `docs/design/stitch/`.

```
Single-page gaming guild website for "The Southern Cross UK". Dark sci-fi HUD aesthetic, royal purple + royal green neon on near-black. Incorporate a subtle Southern Cross (four/five-star) constellation mark in the crest.

## Palette (use these exact hexes)
- Royal purple deep:  #4b0082
- Royal purple neon:  #7c3aed
- Royal green deep:   #00a86b
- Royal green neon:   #39ff88
- Space black:        #07060c
- Warn amber:         #f0b429
- Down crimson:       #b3264a
- Background: #07060c with a faint radial gradient of #4b0082 at 15% opacity.

## Type
Headlines: Orbitron or Rajdhani. HUD / data: JetBrains Mono.

## Page sections (stacked, single page)

1. Hero
   - Full-bleed. Guild crest centered, incorporating a Southern Cross constellation mark. Tagline placeholder: "Servers. Signals. Squad."
   - Below the tagline: an **About HUD card** (~480px wide, corner-cut panel with hairline royal-green border) containing one paragraph of guild copy. Use lorem-style placeholder.
   - Faint starfield. Scanline overlay at 4% opacity.
   - Sticky top nav above: items "SYSTEM", "SERVERS", "MEMBERS". Hairline royal-green bottom border. Active item glows royal-green-neon.

2. Server Hub (headline feature) — the 3D scene fills the full section; the HUD is an **overlay layered on top of it**, not a side-by-side split.
   - Background fills section: top-down orbital map. Central sun (guild crest, bloom). 3–4 orbiting planets (labeled Minecraft, Counter-Strike 2, ARK, Valheim). Each planet has 2–3 moons = server instances. Moon color = status (green online, amber laggy, crimson offline).
   - Overlay (top-right, ~400px wide, over the canvas): Breadcrumb "SYSTEM / MINECRAFT / VANILLA SMP". List of servers with status pills. A click-to-copy row "mc.tsc-uk.tld:25565". A 24-hour sparkline. A "COPY CONNECT" button.
   - Visual motifs: corner-cut panels (clip-path), hairline royal-green borders, faint scanline, subtle bloom on emissives, thin translucent royal-purple orbit rings.
   - Render three distinct frames:
     a. **System view** — no overlay, all planets orbiting
     b. **Planet selected** — camera zoomed onto one planet (fills ~40% of frame), *that planet's orbit is paused* while the others keep moving, overlay visible with instance list
     c. **Moon focused** — overlay expanded to full server detail, target moon highlighted

3. Members
   - Grid of ~12 member cards. Each card: circular avatar with royal-purple halo, persona name in mono, online dot (royal-green neon), chip showing game currently played.
   - Empty state: a single centered "NO OPERATORS ONLINE" panel.

4. Join the Guild (CTA)
   - Single wide HUD panel, corner-cut, hairline royal-green border. Headline in display font: "JOIN THE CROSS".
   - Short blurb (placeholder copy) and 3 requirement bullets.
   - Primary button: "JOIN THE STEAM GROUP" — royal-green-neon fill on space-black text.
   - Secondary button: "DISCORD" — royal-purple-neon outline.
   - Faint constellation mark watermark behind the panel.

## Composition rules
- Royal purple and royal green are both first-class. Neither is a lone accent.
- No glassmorphism, no pastel gradients, no SaaS rainbow, no emoji.
- Readable at 1440×900 and 390×844. On mobile, the solar map collapses to a vertical server list with the HUD panel below.

## Deliverables
- Frames: Hero, Server Hub system view, Server Hub planet-selected (zoomed in, orbit paused for that planet), Server Hub moon-focused (overlay expanded), Members grid, Join the Guild CTA.
- One responsive mobile frame of the Server Hub (overlay becomes a bottom sheet on mobile).
```

## Design decisions (filled in after Phase 0)

- **Chosen direction:** user-supplied compiled-React SPA at `docs/design/user/site.html` (sci-fi HUD / "guild ops dashboard from orbit"). Stitch/Claude prompts **not** used — the user design was comprehensive.
- **Final fonts:** Orbitron (display, weights 400/500/600/700/800) · JetBrains Mono (data/HUD, weights 400/500/600/700). Both loaded via `next/font/google` → CSS vars `--font-display` / `--font-mono`. Fallback: Rajdhani (display) + IBM Plex Mono / ui-monospace (data).
- **Final palette** (exactly as plan; confirmed by design):
  - `--royal-purple: #4b0082` / `--royal-purple-neon: #7c3aed`
  - `--royal-green: #00a86b` / `--royal-green-neon: #39ff88`
  - `--space: #07060c` / `--space-deep: #04030a` / `--space-soft: #0d0b18`
  - `--status-warn: #f0b429` / `--status-down: #b3264a`
  - `--ink: #e7e9ee` / `--ink-dim: #8a8ea3` / `--ink-faint: #4a4e62`
  - Hairlines: `--hair: rgba(0,168,107,0.32)` · `--hair-p: rgba(124,58,237,0.28)`
  - Blooms: `--bloom` (green) · `--bloom-purple` (purple) — see `app/globals.css`
- **Corner-cut spec:** `--cut: 10px` on panels; `clip-path: polygon(var(--cut) 0, 100% 0, 100% calc(100% - var(--cut)), calc(100% - var(--cut)) 100%, 0 100% var(--cut));`. Buttons use 8px cut, pills use 6px cut.
- **Hairline border technique:** `::before` pseudo with gradient fill (green → purple across 140°) + `mask-composite: exclude` so the border lives on all six edges of the clipped polygon, not just the rectangle.
- **Section order (design-driven, deviates from plan's original order):** Hero → **About** → System → Members → Join → Footer. About was promoted from a hero card into its own two-column section (Mission Brief + Operational Vitals).
- **Nav labels (design-driven):** `HERO · ABOUT · SYSTEM · MEMBERS · JOIN` (not the plan's original SYSTEM/SERVERS/MEMBERS/JOIN).
- **Guild metadata baked into `config/guild.ts`:** EST **2015** (canonical — design had an internal 2018/2015 conflict; user picked 2015). Region EU-West. Steam group `southerncrossuk`. Discord placeholder (awaiting real invite URL).
- **Deliberate copy deviation from the design's placeholder text:** `config/guild.ts` ships with longer, production-polished About + 6 detailed house rules. The design's placeholder ("friendly group of like-minded gamers…" + 4 one-word rules) is easy to restore at `config/guild.ts` L59–72 if the user prefers it.
- **Features dropped from the design (per user confirmation):** runtime palette tweaks panel (`.variant-court` / `.variant-mint`, scanline sliders, orbit speed, roster-state toggle). Design-iteration tooling, not production UI.
