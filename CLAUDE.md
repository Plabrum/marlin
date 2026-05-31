# Sloopquest — Claude Code Guidelines

Sloopquest is a marine survey app. Stack-specific rules live alongside the code:

- Backend (`backend/`) — see [backend/CLAUDE.md](backend/CLAUDE.md)
- Frontend (`frontend/`) — see [frontend/CLAUDE.md](frontend/CLAUDE.md)

The rules below apply everywhere.

## Code philosophy

These apply everywhere — backend and frontend.

- **No defensive coding.** Belt-and-suspenders, defense-in-depth at the function level, "just in case" guards — these are anti-patterns, not virtues. Trust your callers and your types. Validate at real boundaries (HTTP input, external APIs, deserialization) and nowhere else.
- **`try` / `except` only when you have a real action to take in the failure case** (retry, fall back to a known value, translate to a typed error, clean up a resource). Wrapping code in `try` to log-and-continue or to "be safe" is worse than letting it crash — it hides bugs and produces silently wrong state.
- **Avoid nullable code.** A pure, non-null-returning function is always preferable to one that returns `T | None`. Null checks scattered through call sites are hard to read and breed off-by-one bugs. If a value is required, type it as required; if it's genuinely optional, narrow it once at the edge.
- **No stringly-typed code.** No `getattr` / `setattr` / `hasattr` with string keys to dodge the type system. No magic strings standing in for enums. If you reach for these, the model is wrong — fix the model.
- **No lazy imports.** Imports go at the top of the file. If you're using a lazy import to break a cycle, the cycle is the bug — fix the module boundary.
- **No `# type: ignore` / `@ts-ignore` / `@ts-expect-error`.** If the type checker is wrong, fix the types. If it's right, fix the code. Suppressions rot and accumulate.

## Comments

**Keep a comment when:**
- The code does something surprising or counter-intuitive
- There's a constraint not visible in the code (a workaround for an external bug, a compliance requirement, a performance trap)
- A TODO has a genuine open question or domain decision still pending

**Delete a comment when:**
- It restates what the function or class name already says
- It labels a block of code that does exactly what it says (`# Search`, `# Paginate`)
- It's a decorative section header (`# ─── Section ───`)
- It explains *what* the code does rather than *why*

**Docstrings:**
- Public API methods: include only if they explain params or non-obvious behavior, not if they repeat the name
- Internal helpers and guards: usually no docstring needed; the name should be enough
- Exception classes: skip the docstring unless the semantics are subtle
