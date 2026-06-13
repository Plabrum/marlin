import { useState } from 'react';

/**
 * A local, editable copy of `source` that resets whenever `source` changes
 * upstream. The reset happens during render (via the previous-value sentinel
 * pattern) rather than in an effect, which avoids the extra commit + cascading
 * render that `useEffect(() => setDraft(source), [source])` causes.
 */
export function useSyncedDraft<S, D = S>(
  source: S,
  toDraft: (s: S) => D = (s) => s as unknown as D
): [D, (next: D) => void] {
  const [draft, setDraft] = useState(() => toDraft(source));
  const [synced, setSynced] = useState(source);
  if (!Object.is(source, synced)) {
    setSynced(source);
    setDraft(toDraft(source));
  }
  return [draft, setDraft];
}
