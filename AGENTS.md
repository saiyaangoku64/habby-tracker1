# Habby — Agent Handoff & Context

> **Read this first** when starting a new session, switching models, or
> resuming after a long pause. It is the single source of truth for what
> the project is, what's been done, what's working, what's broken, and
> what to touch versus what to leave alone.

Last updated: phase 15 (May 2026).

---

## 1. What Habby is

A **habit tracker** built on **Expo Router (React Native)**, primary
target iOS. The defining metaphor is that **each habit is a glass jar
that fills as you log progress**, with subtle physics (water level,
moving wave) and a "cracking" decay system when habits are neglected.

A **collectible card system** layers on top of the habit loop: hitting
milestones unlocks pixel-art cards from the `assets/images/` catalog,
each with a rarity tier (Common → Legendary), star value, and lore.

- Brand color: `#6d28d9` (Habby purple)
- Store target: App Store / TestFlight via EAS
- Expo SDK: 55 (`expo ~55.0.0`, RN `0.83.6`, React `19.2.0`)
- App project root: `habby/`

---

## 2. Repo layout (the parts that matter)

```
habby/
├── AGENTS.md                 ← this file (lives at repo root above habby/, see below)
├── app/                      ← Expo Router routes
│   ├── _layout.tsx           ← root stack + state bootstrap (loadHabitCounts, etc.)
│   ├── index.tsx             ← redirect into (tabs)
│   ├── (tabs)/
│   │   ├── _layout.tsx       ← custom JS tab bar (white pill, purple active)
│   │   ├── index.tsx         ← HOME ★ phase-2 polished, green checkmarks p14
│   │   ├── stats.tsx         ← stats charts
│   │   ├── cards.tsx         ★ phase-13 — card collection grid + browser
│   │   └── leaderboard.tsx   ← podium leaderboard ★ rebuilt p14
│   ├── settings.tsx          ← standalone route (slide from right) ★ moved p14
│   ├── streak.tsx            ★ NEW p14 — streak detail (dark theme, animated flame)
│   ├── streak-celebrate.tsx  ★ NEW p14 — streak celebration modal (confetti)
│   ├── all-jars.tsx          ← full shelf view ★ phase-4 rewrite
│   ├── add-habit.tsx         ← single-screen (phase 6) + hue picker (phase 7)
│   ├── habit/[id].tsx        ← single-habit detail / log screen
│   ├── jar-break.tsx         ← full-screen modal when a jar fully breaks
│   ├── card-reveal.tsx       ★ phase-13 — transparent modal w/ flip + confetti
│   ├── achievements.tsx
│   └── premium.tsx           ← upsell modal
├── components/
│   ├── HomeJarPreview.tsx    ← reusable jar SVG (used in add-habit, premium)
│   ├── haptic-tab.tsx        ← legacy from template, currently unused
│   └── ui/, themed-*.tsx     ← legacy from Expo template, mostly unused
├── constants/                ← state stores + design tokens
│   ├── tokens.ts             ★ DESIGN SYSTEM — canvas #f5f5f7, borders #f0f0f3
│   ├── freezeState.ts        ★ NEW p14 — streak freeze system (premium, 2/month)
│   ├── ThemeContext.tsx      ← forced light-only. Dark mode "coming soon".
│   ├── jarsData.ts           ← JarMeta type + default jar palette
│   ├── jarShapes.ts          ← 7 alternative jar SVG silhouettes (PARKED)
│   ├── userJarsState.ts      ← user's jars (CRUD, persisted via AsyncStorage)
│   ├── habitState.ts         ← today's per-jar count + achievement triggers
│   ├── statsState.ts         ← week activity, history, streak math
│   ├── jarCrackState.ts      ← decay/crack/heal logic
│   ├── achievementsState.ts  ← unlock catalog
│   ├── PremiumContext.tsx    ← isPremium + JAR_SKINS catalog
│   ├── appSettings.ts        ← misc user prefs
│   ├── componentRecipes.ts   ← optional reusable style mixins (lightly used)
│   └── supabase.ts           ← optional cloud sync (auth + insert)
├── assets/images/
│   ├── mascot/               ★ NEW p14 — happy.png, angry.png, spark.png
│   └── (card artwork — 11 cards + 1 card back)
└── .kiro/specs/              ← legacy spec docs from earlier phase
```

> The `AGENTS.md` file you're reading lives at the **outer** repo root
> (one level above `habby/`). When working on the app itself, your CWD
> should usually be `habby/`.

---

## 3. The design system (tokens.ts) — read this before styling

`constants/tokens.ts` is the single source of truth for spacing, radius,
shadow, typography, and color. **Always import from there. Never inline
hex literals or magic numbers in styles.**

Available exports:

| Export            | Use for                                                             |
| ----------------- | ------------------------------------------------------------------- |
| `SPACING`         | All padding, margin, and gap values (`xs`..`xxxl`, plus aliases)    |
| `RADIUS`          | All `borderRadius` values                                           |
| `SHADOWS`         | All shadow recipes (`subtle`/`small`/`medium`/`large`/`heavy`)      |
| `TYPOGRAPHY`      | Type scale (display/title/headline/body/caption/etc.)               |
| `COLORS`          | The full palette ★ described below                                  |
| `COLORS_DARK`     | Dark palette (exists but NOT wired — forced light)                  |
| `COLORS_SEMANTIC` | Older semantic names; prefer `COLORS.status` for new code           |
| `ANIMATION`       | Standard durations (`quick`/`standard`/`slow`)                      |

### `COLORS` palette

```ts
COLORS.brand.primary       // #6d28d9 — Habby purple
COLORS.brand.primaryDeep   // #5b21b6 — pressed / shadow side
COLORS.brand.primarySoft   // #f3efff — tinted backgrounds (chips, pills)
COLORS.brand.primarySofter // #ece4ff — even softer tint (active dot)

COLORS.surface.canvas        // #f5f5f7 — neutral gray (Apple system gray style)
COLORS.surface.card          // white card

COLORS.text.{primary,secondary,tertiary,muted,inverse,accent,onAccent}
COLORS.border.{soft,default,strong}  // soft = #f0f0f3
COLORS.status.{success,warning,danger,onTrack}
COLORS.daydot.*           // day-strip dot colors
```

---

## 4. Conventions — the unwritten rules

- **Imports order**: react → react-native → third-party → expo-* → relative.
- **Animation library**: prefer the built-in `Animated` API for screen-level
  motion. `react-native-reanimated` is installed but not used — only adopt
  if you need `useSharedValue`/`useAnimatedStyle`.
- **Haptics**: every primary CTA should fire a haptic. Use
  `triggerHaptic('light' | 'medium' | 'success')`.
- **Pluralization**: handle `n === 1` case for all counts.
- **Pressable vs TouchableOpacity**: Pressable preferred for new code.
- **Modals**: prefer `presentation: 'transparentModal'` with custom
  backdrop. See `app/card-reveal.tsx` or `app/streak-celebrate.tsx`.
- **Tab bar**: custom JS tab bar (NOT NativeTabs). White pill, rounded
  corners. Active = purple filled rounded-square icon + purple label.
  Inactive = outline gray icons. No blur/glass effects.
- **Settings navigation**: `router.push('/settings')` from avatar button
  on home. Standalone route, slides from right.

---

## 5. What works and **must not break**

| Subsystem              | Where                                  | Why don't touch                                   |
| ---------------------- | -------------------------------------- | ------------------------------------------------- |
| Jar rendering (single) | `components/HabbyJar.tsx`              | THE one jar renderer — home, all-jars, onboarding all use it. Hand-tuned `gPath` + `WAVE_PATH` geometry, white crack overlay. Home's old inline `SvgJar` was deleted; don't reintroduce a second copy. |
| Wave animation          | `HabbyJar.tsx`                         | Linear `Animated` loop, performant. Don't switch to Reanimated. |
| Crack/heal lifecycle    | `constants/jarCrackState.ts`           | Already persisted; achievements depend on it.     |
| Habit count store       | `constants/habitState.ts`              | Auto-resets on date change. Achievements fan out from `setHabitCount`. All-time log total reads from history only (today is already in it — don't re-add). |
| Achievement unlocks     | `_checkAchievements` (habitState)      | Listens to every count change.                    |
| AsyncStorage keys       | various                                | Renaming a key wipes user data on next launch.    |
| Card-reveal flip math   | `app/card-reveal.tsx` interpolations   | `backOpacity`/`frontOpacity` cross at 0.5.        |
| Custom tab bar          | `app/(tabs)/_layout.tsx`               | White pill + purple active square. DO NOT switch to NativeTabs. |
| Streak freeze state     | `constants/freezeState.ts`             | 2/month auto-reset logic, calendar depends on it. Loaded in `_layout.tsx` bootstrap. |
| Shared helpers          | `constants/haptics.ts`, `constants/dateUtils.ts` | `triggerHaptic` + `buildDowLabels` extracted here — import, don't re-inline. |

---

## 6. Phase log

### Phase 1 — cleanup (DONE)
Deleted mascot artifact, fixed "Er" jar name truncation, fixed
pluralization bugs, removed grey shelf bar, removed redundant footer,
added "See all" inline link.

### Phase 2 — Apple-grade polish on home (DONE)
COLORS palette, gradient canvas, redesigned avatar, day-dot date
number (later removed), 70ms stagger mount, pull-to-refresh, full
haptics, dynamic 5-band greeting, state-aware title, locale-aware DOW
labels, EmptyState card.

### Phase 3 — tab bar polish (PARTIAL → superseded by phase 4)
Soft brand pill, scale-spring icon, selection haptic. Replaced in p4.

### Phase 4 — handoff doc, streak vibe, all-jars, floating tab bar (DONE)
Wrote AGENTS.md. Floating compact pill tab bar. Home reframed
"calendar → streak" (flame icon, Streak card, eyebrow `🔥 STREAK`).
All-Jars rewritten to match home.

### Phase 5 — long-press menu + delete (DONE)
`constants/jarActions.ts` with `showJarMenu` and `confirmDelete`.
Trash button on habit detail. Removed two dead-UX header buttons.

### Phase 6 — add-habit collapse + tab-bar grey strip (DONE)
Single-scroll add-habit with stepper + segmented unit picker. Tab bar
grey strip eliminated. Home `paddingBottom` 28 → 110.

### Phase 7 — color spectrum + add-habit preview cleanup (DONE)
`constants/colorMath.ts` with `jarSkinFromHue`. Color grid split into
Free + Premium finishes. Inline `HuePicker` retints the entire screen.

### Phase 8 — hue-picker drag fix + stats redesign (DONE)
Switched from PanResponder to direct view-responder events. Stats
gained Heatmap, Insights, and Ionicon-based per-habit breakdown.

### Phase 9 — Ionicons over emojis (DONE)
32 Ionicons across 4 categories. Jars persist `iconName` + `emoji: ''`.

### Phase 10 — Stats redesign v2 (DONE)
Calendar-aligned heatmap, DoW bar chart, 8-week SVG trend line, Coach
card with 5 detectors.

### Phase 11 — Range selectors, Activity Ring, Coach expansion (DONE)
RangeSelector (4W/8W/12W). Activity Ring donut. Coach expanded to 16
detectors. Profile tab replaced with Cards (placeholder).

### Phase 12 — Jar shrink, celebration, ranks rewrite (DONE)
Home jars 110×160 → 90×130. Crack overlay scaled via `<G transform>`.
Streak celebration spring on jar goal-cross. Ranks rewritten.

### Phase 13 — Cards system, liquid glass, card reveal (DONE)
Cards tab real with 11 cards, grid + browser modal + stories. Star
rating system. Card reveal flow (shake + flip + confetti + fly-to-icon).
Liquid glass tab bar via expo-blur. `jarShapes.ts` parked.

### Phase 14 — Tab bar redesign, streak screen, leaderboard, freeze system, SDK 55, cleanup (DONE)

1. **Tab bar redesigned** — switched from NativeTabs back to custom JS
   tab bar: white pill with rounded corners, active tab has purple filled
   rounded-square icon + purple label, inactive tabs have outline gray
   icons. No blur/glass effects.
2. **Settings moved** — `app/(tabs)/settings.tsx` relocated to
   `app/settings.tsx` as standalone route (slide from right). Avatar
   button on home navigates via `router.push('/settings')`.
3. **Streak detail screen** (`app/streak.tsx`) — full dark theme with
   animated flame that changes color/size based on streak tier (Spark →
   Growth → Flame → Golden → Blaze → Inferno). Week progress with
   connected pill gradient, monthly calendar, gift milestones, streak
   freeze card with icicles SVG.
4. **Streak freeze system** (`constants/freezeState.ts`) — premium
   feature: 2 freezes per month, auto-resets, tracks frozen days (shown
   as snowflake in calendar).
5. **Streak celebration modal** (`app/streak-celebrate.tsx`) — transparent
   modal with confetti, animated flame, mascot, dynamic text. Triggered
   when streak extends.
6. **Leaderboard rebuilt** (`app/(tabs)/leaderboard.tsx`) — podium-style
   top 3 with medals (gold/silver/bronze), full rankings list, personal
   stats card with mascot. Ready for Supabase backend.
7. **Green checkmarks** on home day dots — completed days show solid green
   circle with white checkmark (Duolingo-style). Today shows purple ring
   + flame if not done.
8. **Minimal design tokens** — canvas background → neutral gray (#f5f5f7),
   borders lighter (#f0f0f3), matching Apple's system gray style.
9. **SDK 55 upgrade** — expo ~55.0.0, react 19.2.0, react-native 0.83.6.
   Added babel-preset-expo explicitly. expo-font/expo-image/expo-web-browser
   config plugins added.
10. **Supabase MCP verified** — connected to project lutetajlxnbuexvwgtqm,
    tables confirmed (profiles, habits, habit_logs, streaks,
    leaderboard_weekly).
11. **Dark mode foundation added but reverted** — `COLORS_DARK` palette
    exists in tokens.ts, `useColors()` hook exists, but ThemeContext forced
    to light-only. Settings shows "Dark mode coming soon".
12. **Rice fill concept added and removed** — attempted rice grain SVG fill
    type, didn't work properly, fully reverted. JarMeta has no fillType.
13. **Mascot integration** — 3 mascots in `assets/images/mascot/` (happy,
    angry, spark). Happy mascot in home empty state (180×180), spark in
    streak celebrate.

### Phase 15 — bug fixes, jar-renderer consolidation, polish (DONE)

1. **Fixed double-counted all-time logs** — `_checkAchievements` added
   `totalLogsToday` on top of `getAggregateHistory(365)`, which already
   includes today (written by `updateTodayCount`). Log-milestone achievements
   were unlocking at half the real count. Now reads history only.
2. **Wired `loadFreezeState()`** into `_layout.tsx` bootstrap — was defined
   but never called, so the streak screen showed default freeze counts and
   the monthly reset never ran.
3. **Unified jar rendering** — the home screen's inline `SvgJar` had drifted
   from the shared `HabbyJar`: home drew subtle WHITE cracks, the all-jars
   shelf drew heavy BLACK fractures (broken-glass look on every neglected jar).
   Aligned `HabbyJar`'s crack overlay + broken-jar (L4) visuals to home, then
   **deleted home's inline `SvgJar`/`CrackOverlay`** and pointed home at
   `HabbyJar`. There is now ONE jar renderer. (Both always used viewBox 90×130;
   the old "110×160" note was only the crack-path authoring space.)
4. **Extracted shared helpers** — `triggerHaptic` → `constants/haptics.ts`
   (3 drifted copies, one missing the `success` variant), `buildDowLabels`
   → `constants/dateUtils.ts` (2 identical copies).
5. **Premium token cleanup** — hoisted repeated brand colors into a local
   `PC` palette (premium is a bespoke DARK screen; the light `COLORS` palette
   doesn't apply). Zero visual change, kills drift.
6. **Settings polish** — haptics on every row (one change at the `Row`
   component), avatar uses theme accent, removed two dead "coming soon" rows
   (App icon, Rate — no store listing pre-launch, `expo-store-review` absent).
7. **Quest-streak date fix** — `getQuestStreak` used `today.getDate()` inside
   the walk-back loop instead of `d.getDate()` (worked by accident since `d`
   was re-cloned each iteration; made self-consistent).
8. **Dead code removed** — `constants/jarShapes.ts`, `constants/theme.ts`,
   orphaned `demoCardBtn`/`demoCardText` styles, `LeakDroplet`.

> Deliberately NOT changed: the sub-millisecond midnight rollover window in
> `habitState.ts` (the correct fix threads one clock value through the whole
> call chain — risks a real regression for a once-a-day few-ms window).


---

## 7. Outstanding work (priority-ordered)

> NOTE (post-p14 audit): card unlocks, notifications/reminders, and onboarding
> are all **built and wired** now — they were previously listed here as missing.
> Don't re-implement them. The shared-helper extraction and demo-button removal
> are also done.

### High priority

1. **Dark mode (proper implementation).** `COLORS_DARK` exists, `useColors()`
   hook exists, but needs full migration across all screens. Currently
   forced light-only. This is the biggest remaining visual-polish item.

2. **Habit detail / Jar break / Achievements token migration.** These three
   screens are still on raw hex literals with no haptics or mount animation —
   the last un-migrated screens (see §8).

### Medium priority

3. **Mascot across more screens.** 3 mascots exist in assets. Currently
   home empty state, streak celebrate, premium hero, onboarding. Could expand
   to the coach card and achievement unlocks.

4. **Real IAP for premium.** `handleUnlock` in `app/premium.tsx` shows a
   "payments launching soon" alert — wire RevenueCat in a custom dev build.

### Low priority

5. **Rice/alternative fill types (parked).** Attempted p14, didn't work.
   JarMeta has no fillType field. Revisit later if a good approach emerges.

6. **Jar shape skins (parked).** `constants/jarShapes.ts` was deleted (dead).
   Reintroduce a shape catalog + wire `shapeId` into JarMeta if/when a
   cosmetic system is wanted.

> Stats was previously flagged for a "full visual rebuild" — an audit found it
> is actually the **most** token-compliant screen in the app. No rebuild needed.

---

## 8. Per-screen quick-status

| Screen             | Token-migrated | Haptics    | Mount anim | Notes                                            |
| ------------------ | -------------- | ---------- | ---------- | ------------------------------------------------ |
| Home (tabs)        | ✅             | ✅         | ✅         | Green checkmarks, mascot empty state, p14.       |
| All Jars           | ✅             | ⚠️ partial | ❌         | Long-press menu (p5).                             |
| Stats              | ⚠️ partial     | ⚠️ partial | ⚠️ partial | Needs full visual rebuild.                        |
| Cards              | ✅             | ✅         | ❌         | Grid + browser modal + stories (p13).            |
| Leaderboard        | ✅             | ✅         | ❌         | Podium top 3, rankings list, mascot (p14).       |
| Settings           | ✅             | ✅         | ❌         | Standalone route. Haptics on all rows. Dead "coming soon" rows removed. |
| Streak             | ✅             | ✅         | ✅         | NEW p14. Dark theme, animated flame, calendar.   |
| Streak celebrate   | ✅             | ✅         | ✅         | NEW p14. Confetti + flame + mascot modal.        |
| Habit detail       | ❌             | ⚠️ partial | ❌         | Trash button (p5). Physics untouched.            |
| Add habit          | ⚠️ partial     | ⚠️ partial | partial    | Single-screen + hue picker + Ionicons.           |
| Premium            | ✅             | ✅         | ✅         | Dark upsell. Colors via local `PC` palette (not light COLORS). |
| Jar break          | ❌             | ❌         | ❌         | Full-screen modal.                               |
| Card reveal        | ✅             | ✅         | ✅         | Transparent modal w/ flip + confetti (p13).      |
| Achievements       | ❌             | ❌         | ❌         | List view.                                       |

---

## 9. Critical user feedback (running list)

1. **"Where is the bird?"** — original mascot deleted p1. 3 mascots now in assets (p14).
2. **"Er" jar name was clipped.** Fixed p1.
3. **"Home doesn't feel like a streak page, feels like a calendar."** Fixed p4.
4. **"Tab bar — make it small/floating."** Done p4. Redesigned p14.
5. **"Add habit is generic / 3 screens too complex."** Fixed p6.
6. **"All Jars looks inconsistent."** Fixed p4.
7. **"Cards should excite users to see what comes next."** Reveal flow p13.
8. **"Don't show XP on cards — use stars instead."** Stars wired p13.
9. **"Cards should have lore / story behind them."** Added p13.
10. **"Tap anywhere to collect — no button."** Implemented p13.
11. **"Locked cards should show what to do to unlock + the back art."** Done p13.
12. **"Liquid glass tab bar like Apple."** Implemented p13, then reverted p14.
13. **"Remove dark mode, it doesn't look good without full migration."** Reverted p14, forced light-only.
14. **"Tab bar should be pill-shaped with purple active square, not liquid glass."** Implemented p14.
15. **"Green checkmarks on streak dots like Duolingo."** Implemented p14.
16. **"Rice concept doesn't work, remove it."** Fully reverted p14.

---

## 10. Quick command reference

Run from `habby/`:

```bash
# Type-check (must pass before any phase ends)
npx tsc --noEmit

# Lint
npx expo lint

# iOS simulator (requires native rebuild for SDK 55)
npx expo run:ios

# Reset Metro / clear cache
npx expo start -c
```

> Note: SDK 55 upgrade in p14 requires a full native rebuild.
> `babel-preset-expo` added explicitly for compatibility.

---

## 11. House style for these AGENTS.md updates

When you complete a phase, append a `### Phase N — title (DONE)` block
to §6, update §8 if a screen's status flipped, and append any new user
quotes to §9. Keep §7 priority-sorted; move completed items to §6.
Don't grow this file beyond ~600 lines — split if it does.
