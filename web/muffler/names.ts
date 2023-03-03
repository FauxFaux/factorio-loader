import { data } from '../datae';
import { singularize } from 'inflection';

export function cleanupName(name: string) {
  const stripIcons = /\[[a-z0-9-]+=[a-z0-9-]+]/g;
  const normaliseSpace = /\s+/g;
  return name.replace(stripIcons, ' ').replace(normaliseSpace, ' ').trim();
}

export function compareWithoutIcons(a: string, b: string) {
  return cleanupName(a).localeCompare(cleanupName(b), 'en', {
    sensitivity: 'base',
  });
}

function strIEq(a: string, b: string): boolean {
  return (
    0 ===
    a.localeCompare(b, 'en', {
      sensitivity: 'base',
      usage: 'search',
      ignorePunctuation: true,
    })
  );
}

const labelLookupCache: Record<string, string> = {};

export function closelyMatchesItemName(label: string): string | null {
  if (Object.keys(labelLookupCache).length === 0) {
    for (const [name, item] of Object.entries(data.items)) {
      labelLookupCache[item.localised_name.toLowerCase()] = name;
    }
  }

  const quick = labelLookupCache[label.toLowerCase()];
  if (quick) return quick;

  switch (label.toLowerCase()) {
    // typo: inductor
    case 'air-core conductor':
      return 'inductor1';
  }
  for (const [name, item] of Object.entries(data.items)) {
    if (
      strIEq(label, item.localised_name) ||
      strIEq(singularize(label), item.localised_name)
    ) {
      return name;
    }
  }

  return null;
}

export function closelyMatches(label: string): string | null {
  let cleaned = cleanupName(label);
  let v = closelyMatchesItemName(cleaned);
  if (v) return v;
  v = closelyMatchesItemName(cleaned + ' barrel');
  if (v) return v;
  if (cleaned.startsWith('Auog ')) {
    v = closelyMatchesItemName(cleaned.slice('Auog '.length));
    if (v) return v;
  }

  return null;
}
