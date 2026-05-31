# Frontend — Claude Code Guidelines

React + Tailwind + Orval-generated API hooks. See root [CLAUDE.md](../CLAUDE.md) for shared rules.

## Layout & styling

- **Never mix `style={}` props with Tailwind classes.** Tailwind only. Inline styles, especially arithmetic on CSS vars (`left-[calc(var(--foo)+...)]`, `style={{ left: ... }}`), are a smell that the component is positioned in the wrong place in the tree.
- **No layout math against another component's internals.** If you find yourself computing offsets to dodge a sidebar/header/footer, the element is in the wrong parent. Move it inside the layout container (e.g. `SidebarInset`) and use normal flow, `sticky`, or flex/grid — let the parent's width changes drive layout automatically.
- Reach for `position: fixed` last, not first. Prefer flow → `sticky` → `absolute` (inside a positioned parent) → `fixed`.

## Data fetching

- **Always use Orval-generated hooks.** Run `pnpm codegen` after adding/changing a backend endpoint. Never hand-write Orval-shaped hooks.
- **`default_invalidation` is a URL path** (e.g. `"/surveys"`), not an operation name. It must match `queryKey[0]` from the generated hook for partial-match invalidation to fire.
- **Don't call generated `queryKey()` with no argument** for invalidation — it returns `[url, undefined]` which breaks partial-match predicates. Pass `[url]` directly as the prefix.

## TypeScript

- `tsc --noEmit` checks nothing in this repo because of project references. Use `tsc -b --noEmit`.
- Orval's overload signatures defeat `T` inference inside generic wrappers — pass `T` explicitly at the call site.
