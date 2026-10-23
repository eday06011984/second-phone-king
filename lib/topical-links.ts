/** Editorial relationships, not keyword matching or inferred product endorsements. */
export const relatedGuideSlugs: Readonly<Record<string, readonly string[]>> = {
  'iphone-parts-history': ['used-iphone-activation', 'battery-and-condition', 'used-phone-checklist'],
  'used-iphone-activation': ['iphone-parts-history', 'used-phone-checklist', 'store-warranty'],
  'used-pixel-update-support': ['used-phone-checklist', 'compare-used-phone-prices', 'store-warranty'],
  'used-galaxy-diagnostics': ['used-phone-checklist', 'battery-and-condition', 'store-warranty'],
  'compare-used-phone-prices': ['battery-and-condition', 'store-warranty', 'store-vs-private-seller'],
  'used-phone-checklist': ['used-iphone-activation', 'used-galaxy-diagnostics', 'battery-and-condition'],
  'battery-and-condition': ['iphone-parts-history', 'used-phone-checklist', 'store-warranty'],
  'store-warranty': ['store-vs-private-seller', 'compare-used-phone-prices', 'used-phone-checklist'],
  'store-vs-private-seller': ['store-warranty', 'used-phone-checklist', 'compare-used-phone-prices'],
};

// Only explicitly reviewed phone-related stories get a guide recommendation.
export const newsGuideSlugs: Readonly<Record<string, readonly string[]>> = {
  'one-ui-9-used-galaxy-update': ['used-galaxy-diagnostics', 'used-phone-checklist'],
  'galaxy-fold-design-used-foldable-check': ['used-galaxy-diagnostics', 'battery-and-condition'],
  'galaxy-z-portrait-video-used-foldable-check': ['used-galaxy-diagnostics', 'used-phone-checklist'],
  'vivo-originos-7-used-phone-update-check': ['used-phone-checklist', 'store-warranty'],
  'vivo-v80-lite-10000mah-buying-check': ['battery-and-condition', 'compare-used-phone-prices'],
};

const fallbackGuideSlugs = ['used-phone-checklist', 'compare-used-phone-prices', 'store-warranty'];
type Guide = { slug: string; title: string };

function selectGuides<T extends Guide>(slugs: readonly string[], available: readonly T[], exclude?: string, limit = 3): T[] {
  const bySlug = new Map(available.map(guide => [guide.slug, guide]));
  const seen = new Set<string>(exclude ? [exclude] : []);
  const result: T[] = [];
  for (const slug of slugs) {
    const guide = bySlug.get(slug);
    if (!guide || seen.has(slug)) continue;
    result.push(guide);
    seen.add(slug);
    if (result.length >= limit) break;
  }
  return result;
}

export function relatedGuides<T extends Guide>(slug: string, available: readonly T[]): T[] {
  return selectGuides([...(relatedGuideSlugs[slug] ?? []), ...fallbackGuideSlugs, ...available.map(guide => guide.slug)], available, slug);
}

export function newsGuides<T extends Guide>(slug: string, available: readonly T[]): T[] {
  return selectGuides(newsGuideSlugs[slug] ?? [], available);
}

export function relatedNews<T extends { slug: string; category: string }>(current: T, available: readonly T[]): T[] {
  const candidates = [...available.filter(item => item.category === current.category), ...available.filter(item => item.category !== current.category)];
  const seen = new Set([current.slug]);
  return candidates.filter(item => {
    if (seen.has(item.slug)) return false;
    seen.add(item.slug);
    return true;
  }).slice(0, 3);
}
