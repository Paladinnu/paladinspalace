// Maps weapon names (normalized) to preset local image paths under /public/presets/weapons
const map: Record<string, string> = {
  'assault rifle mk2': '/presets/weapons/assault_rifle_mk2.webp',
  'assault rifle': '/presets/weapons/assault_rifle.webp',
  'mg': '/presets/weapons/mg.webp',
  'sawnoff shotgun': '/presets/weapons/sawnoff_shotgun.webp',
  'double action': '/presets/weapons/double_action.webp',
  'navy': '/presets/weapons/navy.webp',
  'gusenberg': '/presets/weapons/gusenberg.webp',
  'compact rifle': '/presets/weapons/compact_rifle.webp',
  'micro smg': '/presets/weapons/micro_smg.webp',
  'pistol': '/presets/weapons/pistol.webp',
  'pistol mk2': '/presets/weapons/pistol_mk2.webp',
  'ceramic pistol': '/presets/weapons/ceramic_pistol.webp',
  'vintage pistol': '/presets/weapons/vintage_pistol.webp',
  'machine pistol': '/presets/weapons/machine_pistol.webp',
  'pistol .50': '/presets/weapons/pistol_50.webp',
  'battle axe': '/presets/weapons/battle_axe.webp',
  'machete': '/presets/weapons/machete.webp',
  'switch blade': '/presets/weapons/switch_blade.webp',
  'dagger': '/presets/weapons/dagger.webp',
  'knife': '/presets/weapons/knife.webp',
  'revolver': '/presets/weapons/revolver.webp'
};

function normalize(s: string) {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[_-]+/g, ' ')
    .replace(/[^a-z0-9\.\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function getWeaponPresetImage(name?: string | null): string | null {
  if (!name) return null;
  const key = normalize(name);
  if (map[key]) return map[key];
  // Simple aliasing for common typos (assult -> assault, mircro -> micro)
  const alias = key
    .replace('assult', 'assault')
    .replace('mircro', 'micro')
    .replace('pistol50', 'pistol 50')
    .replace('pistol 50', 'pistol .50')
    .replace('machine gun', 'mg')
    .replace('mk ii', 'mk2')
    .replace('mk 2', 'mk2');
  return map[alias] || null;
}

export type WeaponPresetKey = keyof typeof map;