# Landing → shadcn migration plan

## Goal

Lean into shadcn primitives + Tailwind for the landing page. Map the almanac palette into shadcn's theme variables so `<Button>`, `<Card>`, `<Input>`, `<Badge>`, `<Separator>`, `<NavigationMenu>` etc. inherit the look automatically. Replace bespoke buttons/inputs/cards with their shadcn equivalents; keep the structural and decorative pieces that don't compete with shadcn.

## Non-goals

- Touching the rest of the monorepo (`frontend/`, `backend/`)
- Replacing the typography utilities (`fv-*`, `t-*`) we just added — orthogonal
- Replacing the SVG art in `marks.tsx` (CompassRose, TopoLines, AnchorGlyph, StarMark, Wordmark, NauticalRule)
- Replacing the page atmosphere (`grain`, `vignette`)
- Replacing the animations (`rise`, `drift`, `pulse-dot`)

## Bootstrap

### 1. Run shadcn init

```bash
cd landing
npx shadcn@latest init -d --base radix
```

This will:
- Scaffold `components.json`
- Recreate `lib/utils.ts` with the `cn()` helper (we just deleted it — fine)
- Recreate `components/ui/` (we just deleted it — fine)
- Add `lucide-react` if missing
- Rewrite parts of `globals.css` — **back up first, then merge our palette back in**

### 2. components.json

```json
{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "new-york",
  "rsc": true,
  "tsx": true,
  "tailwind": {
    "config": "",
    "css": "src/app/globals.css",
    "baseColor": "stone",
    "cssVariables": true
  },
  "aliases": {
    "components": "@/components",
    "utils": "@/lib/utils",
    "ui": "@/components/ui",
    "lib": "@/lib",
    "hooks": "@/hooks"
  }
}
```

`baseColor: stone` is the closest stock palette to our warm paper tones, but every color will be overridden anyway via theme variables.

### 3. Components to install up front

```bash
npx shadcn@latest add button card input badge separator navigation-menu label
```

That's the minimum to cover the inventory below. We can add more (Sheet, AlertDialog) later if we hit a need.

## Theme mapping

shadcn uses CSS variables (HSL by default in v4, OKLCH in newer setups). Map our hex palette into shadcn's slot names. We'll keep our existing `--color-paper` etc. tokens (they're still useful for marks and bespoke styling) and add the shadcn slots that reference them.

### Light mode — paper-on-ink (the default)

| shadcn slot | Source token | Hex | HSL |
|---|---|---|---|
| `--background` | paper | #f1e8d4 | 43 50% 89% |
| `--foreground` | ink | #0d1f2c | 207 53% 11% |
| `--card` | paper-card | #faf2de | 43 73% 93% |
| `--card-foreground` | ink | #0d1f2c | 207 53% 11% |
| `--popover` | paper-card | #faf2de | 43 73% 93% |
| `--popover-foreground` | ink | #0d1f2c | 207 53% 11% |
| `--primary` | ink | #0d1f2c | 207 53% 11% |
| `--primary-foreground` | paper-warm | #f6eedb | 42 64% 91% |
| `--secondary` | paper-warm | #f6eedb | 42 64% 91% |
| `--secondary-foreground` | ink | #0d1f2c | 207 53% 11% |
| `--muted` | paper-deep | #e6dbc1 | 40 38% 83% |
| `--muted-foreground` | ink-muted | #5b6976 | 210 13% 41% |
| `--accent` | brass-deep | #8b5e3a | 25 41% 39% |
| `--accent-foreground` | paper-warm | #f6eedb | 42 64% 91% |
| `--destructive` | rust | #a85a3a | 16 49% 44% |
| `--destructive-foreground` | paper-warm | #f6eedb | 42 64% 91% |
| `--border` | paper-edge | #c5b89a | 40 26% 69% |
| `--input` | paper-edge | #c5b89a | 40 26% 69% |
| `--ring` | brass-deep | #8b5e3a | 25 41% 39% |
| `--radius` | (new) | — | `0.125rem` (matches existing `rounded-sm`) |

### Dark mode — ink-on-paper (used only on Specifications section)

Apply `<div className="dark">` around the Specifications `<Plate>` so shadcn primitives inside flip.

| shadcn slot | Source | HSL |
|---|---|---|
| `--background` | ink | 207 53% 11% |
| `--foreground` | paper-warm | 42 64% 91% |
| `--card` | ink-soft | 207 39% 19% |
| `--card-foreground` | paper-warm | 42 64% 91% |
| `--primary` | paper-warm | 42 64% 91% |
| `--primary-foreground` | ink | 207 53% 11% |
| `--secondary` | ink-soft | 207 39% 19% |
| `--secondary-foreground` | paper-warm | 42 64% 91% |
| `--muted` | ink-soft | 207 39% 19% |
| `--muted-foreground` | paper-warm (low alpha via class) | 42 64% 91% |
| `--accent` | brass-light | 28 53% 65% |
| `--accent-foreground` | ink | 207 53% 11% |
| `--border` | paper-warm @ 15% | (use `bg-paper-warm/15` directly) |
| `--ring` | brass-light | 28 53% 65% |

## Custom Button variants

After `shadcn add button`, edit `components/ui/button.tsx` to add almanac-specific variants. The stock `default`/`outline`/`destructive` already get us close via the theme mapping; we just need to add the typography (mono uppercase, wide tracking) and a couple of size variants for the big landing CTAs.

Add to the `buttonVariants` CVA:

```ts
variant: {
  // stock variants stay
  default: "...",
  outline: "...",
  destructive: "...",

  // new almanac variants
  cta: "border border-primary bg-primary text-primary-foreground font-mono uppercase tracking-[0.22em] hover:bg-ocean-deep transition-all",
  "cta-ghost": "font-mono uppercase tracking-[0.18em] text-ink-soft hover:text-ink", // for nav sign-in style links if we want them as buttons
},
size: {
  default: "h-9 px-4 py-2",
  sm: "h-8 px-3 text-xs",
  lg: "h-10 px-8",
  // new
  cta: "px-8 py-4 text-[12px]",         // hero / cta CTA size
  "cta-compact": "px-3 py-2.5 text-[10px] sm:px-4 sm:text-[11px]",  // nav size
}
```

Usage:

```tsx
<Button variant="cta" size="cta" asChild>
  <Link href="/get-started">
    <StarMark size={9} className="text-brass-light" />
    Begin a survey
    <ArrowRight />
  </Link>
</Button>
```

Use `asChild` + Next `<Link>` for client-side navigation, matching shadcn idiom.

The `PrimaryButton` wrapper we just built gets deleted in favor of this.

## Component-by-component inventory

What gets a shadcn primitive vs stays bespoke:

### `nav.tsx`
- Nav links (Field Guide, Pricing, Almanac) → `<NavigationMenu>` + `<NavigationMenuLink asChild>`
- "Sign in" link → keep as plain Link (single link, doesn't warrant the menu)
- "Begin a survey" → `<Button variant="cta" size="cta-compact" asChild>`
- Wordmark stays bespoke

### `hero.tsx`
- "Begin a survey" → `<Button variant="cta" size="cta" asChild>`
- "read the field guide" → plain Link with `link-rule`
- Issue metadata strip stays bespoke
- CompassRose / TopoLines stay
- Editor's note stays bespoke

### `lede.tsx`
- No primitive swaps. Keeps Plate wrapper.

### `pillars.tsx`
- Each pillar article → `<Card>` with `<CardHeader>` / `<CardContent>` / `<CardFooter>`
- Roman numeral + ★ counter → inside `<CardHeader>`, stays bespoke
- Bullets list stays as `<ul>` inside `<CardFooter>`
- Section header (h2 + kicker) stays bespoke
- The `border-b` divider above the grid → `<Separator>`

### `anatomy.tsx`
- Headers stay bespoke
- `Caption` helper → could be a `<Card>` but it's intentionally a left-rule note, not a card shape. Stays bespoke.

### `workspace-mock.tsx`
- Outer paper plate → `<Card>` with custom `box-shadow` style preserved
- Top header bar buttons:
  - "Generate report" → `<Button size="sm">` (default = ink fill)
- Sticky section header:
  - "+ Add finding" → `<Button variant="destructive" size="sm">` (rust)
- `FieldCard` helper → `<Card>` with `<CardHeader>` + `<CardContent>`
- Segmented control (Excellent/Good/Fair/Poor) → `<Badge>` per option with selected/unselected styling (cheap and matches), or `<ToggleGroup>` if we want it to feel interactive. Recommend **Badge** since the mock is non-interactive.
- Photo grid stays as bespoke `<div>` grid (not a shadcn shape)
- `RailSection` helper → `<Card>` (smaller, sub-section variant)
- `FindingRow` severity dot → `<Badge>` (filled, color from severity)
- "AI Surveyor" footer → `<Card>` with ocean-tinted accent

### `specifications.tsx`
- Wrap entire `<Plate>` in `<div className="dark">` so shadcn primitives inside flip
- Header h2 + kicker stay bespoke
- Spec rows: bespoke (it's a classified-ad row layout, not a Card)
- The `border-b` between rows → `<Separator />` (will pick up dark border color)
- Pull quote → bespoke `<figure>` / `<blockquote>` (semantic, no shadcn analog)

### `cta.tsx`
- "Open Marlin Survey" → `<Button variant="cta" size="cta" asChild>`
- "Or download a sample report" → plain Link
- CompassRose stays
- "No card required / iPad-ready / …" badge strip → `<Badge variant="outline">` per item? Or stay as plain spans (currently uses tiny moss dots, which is more decorative than badge-shaped). **Recommend: stay bespoke** — they're inline meta, not badges.

### `footer.tsx`
- Newsletter input → `<Input>` + `<Label>` (sr-only label)
- Subscribe button → `<Button variant="outline">` (paper bg, ink border — stock outline picks this up via the theme)
- Link columns → plain Links (a NavigationMenu would be overkill for static list-columns)
- Bottom strip → plain Links
- Newsletter section header pattern stays bespoke

## What survives, what dies

### Components (survive)

| File | Why |
|---|---|
| `plate.tsx` | Structural section wrapper — no shadcn analog |
| `section-label.tsx` | Bespoke iconography (StarMark + § numeral) |
| `marks.tsx` | All SVG art — CompassRose, StarMark, NauticalRule, AnchorGlyph, TopoLines, Wordmark |
| `workspace-mock.tsx` | Stays as a container; internals get shadcn'd |
| All section components (`hero`, `lede`, `pillars`, `anatomy`, `specifications`, `cta`, `footer`, `nav`) | Refactored, not deleted |

### Components (die)

| File | Why |
|---|---|
| `primary-button.tsx` | Replaced by `<Button variant="cta">` |

### CSS classes (survive)

| Class | Why |
|---|---|
| `.fv-*` (font-variation recipes) | Used in headings, no shadcn analog |
| `.t-*` (type recipes) | Used in micro-labels, no shadcn analog |
| `.rise` / `.rise-1`…`.rise-5` | Page-load animations |
| `.drift` | CompassRose rotation |
| `.pulse-dot` | Status indicators |
| `.dropcap` | Lede paragraph treatment |
| `.link-rule` / `.link-grow` | Bespoke link underline animations |
| `.grain` / `.vignette` | Page atmosphere overlays |
| Custom `--color-*` palette tokens | Still useful for bespoke styling outside shadcn primitives |

### CSS classes (potentially die)

None for now. Some t-* may become redundant after Card adoption but not enough to bother removing.

## Migration order

1. **Bootstrap**: run `shadcn init`, fix any clobbering of `globals.css` (especially fonts), commit clean baseline
2. **Theme mapping**: write the light + dark CSS variable blocks in `globals.css`
3. **Add primitives**: `button card input badge separator navigation-menu label`
4. **Customize Button**: add `cta` / `cta-compact` variants + sizes
5. **Replace PrimaryButton**: update nav, hero, cta call sites to use `<Button>` directly; delete `primary-button.tsx`
6. **Footer form**: `<Input>` + `<Label>` + outline `<Button>`
7. **Pillars**: convert pillar articles to `<Card>`; section divider to `<Separator>`
8. **WorkspaceMock**: outer plate `<Card>`, FieldCard `<Card>`, RailSection `<Card>`, in-mock buttons → `<Button>`, severity dots + segmented options → `<Badge>`
9. **Specifications**: wrap in `.dark`, replace inter-row borders with `<Separator>`
10. **Nav**: convert to `<NavigationMenu>`
11. **Type-check + visual smoke** (dev server, walk each section)

## Risks & open questions

- **`shadcn init` will rewrite `globals.css`.** The skill specifically warns about a Geist font gotcha — `@theme inline` resolves at parse time, so any `--font-sans: var(--font-fraunces)` in `@theme` block won't resolve. Currently our `--font-display: var(--font-fraunces)` *does* work because Next.js injects `--font-fraunces` via the `<html>` className, and our `@theme inline` references it — at parse time it becomes `var(--font-fraunces)` literally and resolves at runtime. **Need to verify after init** that fonts still render correctly. If broken, switch to literal font names per the skill's recommendation.
- **Radius**: shadcn default is `0.625rem`. Almanac uses `rounded-sm` (`0.125rem`). Set `--radius: 0.125rem` in our theme so shadcn primitives inherit the sharper edge.
- **Dark mode on a single section**: applying `.dark` to a sub-tree is supported but slightly unusual. Should work as long as we wrap at the Plate level.
- **`asChild` + Next Link**: standard idiom. The Radix Slot the Button uses will forward props correctly.
- **Existing `ocean-deep` hover on CTAs**: currently `hover:bg-ocean-deep` — that's a custom token, not a shadcn slot. We'll keep it via Tailwind class directly in the `cta` variant.
- **Lucide icons replacing arrow glyphs**: `→` is currently a literal arrow character. We can keep it that way (cheap, no extra weight) or switch to `<ArrowRight />` from lucide. **Recommend: keep the literal `→`** for the editorial feel; bring in lucide only where shadcn primitives require it.
- **The shadcn skill recommends Geist for product UI** — explicitly does not apply here. The landing's typography (Fraunces + Newsreader + JetBrains) is the brand. Override `--font-sans` to point at Newsreader so shadcn primitives inherit serif body text where they fall back to "sans"; mono and display stay explicit per-component.

## Estimated diff size

- ~10 files touched (8 section components + button.tsx + globals.css)
- ~3 files deleted (primary-button.tsx + recreated lib/utils.ts + recreated components/ui scaffold)
- ~6 new files under `components/ui/` (button, card, input, badge, separator, navigation-menu, label)
- Net LoC: probably ~similar to current — primitives are smaller per call site but the ui/ shadcn files themselves add bulk

## Decisions (locked in)

1. **Radius**: `0.125rem` — keep sharp almanac edges
2. **Segmented control** (Excellent/Good/Fair/Poor): `<ToggleGroup>` — go full shadcn even though mock is static
3. **Footer link columns**: `<NavigationMenu>` — go full shadcn here too
4. **CTA arrows**: switch from literal `→` to `<ArrowRight />` from lucide-react
5. **baseColor**: `stone` for init seed (everything is overridden via theme vars)

### Updated install list

```bash
npx shadcn@latest add button card input badge separator navigation-menu label toggle-group
```
