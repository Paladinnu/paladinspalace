// Maps drug names (normalized) to preset local image paths under /public/presets/drugs
const map: Record<string, string> = {
  'cannabis': '/presets/drugs/cannabis.webp',
  'cocaine': '/presets/drugs/cocaine.webp',
  'heroina': '/presets/drugs/heroin.webp',
  'amfetamina': '/presets/drugs/amphetamine.webp',
  'mdma': '/presets/drugs/mdma.webp',
  'lsd': '/presets/drugs/lsd.webp',
  'metamfetamina': '/presets/drugs/meth.webp',
  'morfina': '/presets/drugs/morphine.webp',
  'oxycodone': '/presets/drugs/oxycodone.webp',
  'psihedelice': '/presets/drugs/psychedelics.webp',
  'tobacco': '/presets/drugs/tobacco.webp'
};

function normalize(s: string) {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[^a-z0-9\.\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function getDrugPresetImage(name?: string | null): string | null {
  if (!name) return null;
  const key = normalize(name);
  if (map[key]) return map[key];
  // Basic aliases
  const alias = key
    // Romanian to English/normalized
    .replace('cocaina', 'cocaine')
    .replace('heroina', 'heroina')
    .replace('amfetamina', 'amfetamina')
    .replace('metamfetamina', 'metamfetamina')
  .replace('marijuana', 'cannabis')
  .replace('tigari', 'tobacco')
    .replace('crack', 'cocaine')
    .replace('meth', 'metamfetamina');
  return map[alias] || null;
}

export type DrugPresetKey = keyof typeof map;
