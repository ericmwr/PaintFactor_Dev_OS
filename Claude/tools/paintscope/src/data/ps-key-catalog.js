// Pure helpers for the PS Key picker. parsePsKey splits a key into its
// category/unit per the PS_[EXT_]<DOMAIN>_<UOM>.<NAME> convention; humanize
// turns a raw NAME segment into a readable title for uncatalogued keys.

export function parsePsKey(key) {
  if (!key || !key.startsWith('PS_')) {
    return { scope: 'special', domain: 'SPECIAL', uom: null, name: key || '' };
  }
  let rest = key.slice(3);                       // drop "PS_"
  const scope = rest.startsWith('EXT_') ? 'exterior' : 'interior';
  if (scope === 'exterior') rest = rest.slice(4);

  const dot = rest.indexOf('.');
  const head = dot === -1 ? rest : rest.slice(0, dot);
  const tail = dot === -1 ? '' : rest.slice(dot + 1);

  const headTokens = head.split('_');
  const domain = headTokens[0];                  // SURFACE | EDGE | OPENING | PROTECT | META | DOOR
  let uom, name;
  if (headTokens.length > 1) {
    uom = headTokens.slice(1).join('_');         // SF | LF | EA | EA_SIDE | FIXED
    name = tail;
  } else {
    const tailParts = tail.split('.');           // META.<UOM>.<NAME>
    uom = tailParts[0] || null;                  // EA | SF | TEXT | ENUM | FLAG
    name = tailParts.slice(1).join('.');
  }
  return { scope, domain, uom, name };
}

export function humanize(str) {
  if (!str) return '';
  const spaced = str.replace(/[._]+/g, ' ').trim().toLowerCase();
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}
