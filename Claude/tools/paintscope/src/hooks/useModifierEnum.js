// Derive UI dropdown options from a static modifier's factor keys.
// Any dropdown whose values must match a modifier's keys — texture, height
// band, complexity, condition, etc. — should consume this hook instead of a
// hardcoded enum. Adding a new factor in the Modifier Editor flows through
// automatically: draft saved → hook re-renders → dropdown shows new option.
//
// Draft overlay wins over canonical: user edits in the Authoring tab show up
// immediately in substrate pickers without needing a publish/bundle rebuild.
//
// Labels: auto-humanized from keys ('orange_peel' → 'Orange Peel') unless the
// caller passes `humanize: false`. Short all-caps tokens like 'STD' or 'QT3'
// are preserved as-is.

import { useMemo } from 'react';
import { useModifierDrafts } from './useModifierDrafts.js';
import canonicalBundle from '../data/scenario-bundle.gen.js';

function humanize(s) {
  return String(s)
    .split(/[_\-\s]+/)
    .filter(Boolean)
    .map(w => (w.length <= 3 && w === w.toUpperCase()) ? w : w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}

/**
 * Return [{ value, label }] options from the named static modifier's factors.
 * Empty array if the modifier doesn't exist or has no factors.
 *
 * @param {string} modifierId - e.g. 'FAC_TEXTURE', 'FAC_HEIGHT'
 * @param {object} [opts]
 * @param {boolean} [opts.humanize=true] - humanize keys as labels
 * @returns {Array<{value: string, label: string}>}
 */
export function useModifierEnum(modifierId, opts = {}) {
  const { drafts } = useModifierDrafts();
  return useMemo(() => {
    const draft = drafts.find(d => d.id === modifierId);
    const mod = (draft && (draft.payload || draft)) || (canonicalBundle.modifiers || {})[modifierId];
    if (!mod || !mod.factors) return [];
    const keys = Object.keys(mod.factors);
    return keys.map(k => ({
      value: k,
      label: opts.humanize === false ? k : humanize(k),
    }));
  }, [drafts, modifierId, opts.humanize]);
}
