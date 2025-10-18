// Centralized weapon groups/options for UI and backend filters
export const WEAPON_GROUPS = [
  { label: 'Arme albe', value: 'arme_albe' },
  { label: 'Pistoale', value: 'pistoale' },
  { label: 'Arme mici', value: 'arme_mici' },
  { label: 'Arme mari', value: 'arme_mari' },
];

export const WEAPON_OPTIONS: Record<string, { label: string; value: string }[]> = {
  // Values are canonical slugs matching preset filenames (see public/presets/weapons)
  arme_albe: [
    { label: 'Knife', value: 'knife' },
    { label: 'Dagger', value: 'dagger' },
    { label: 'Switch Blade', value: 'switch_blade' },
    { label: 'Machete', value: 'machete' },
    { label: 'Battle Axe', value: 'battle_axe' },
  ],
  pistoale: [
    { label: 'Navy Revolver', value: 'navy' },
    { label: 'Double Action', value: 'double_action' },
    { label: 'Pistol .50', value: 'pistol_50' },
    { label: 'Vintage Pistol', value: 'vintage_pistol' },
    { label: 'Ceramic Pistol', value: 'ceramic_pistol' },
    { label: 'Pistol MK2', value: 'pistol_mk2' },
    { label: 'Pistol', value: 'pistol' },
  ],
  arme_mici: [
    { label: 'Machine Pistol', value: 'machine_pistol' },
    { label: 'Micro SMG', value: 'micro_smg' },
  ],
  arme_mari: [
    { label: 'Assault Rifle MK2', value: 'assault_rifle_mk2' },
    { label: 'Assault Rifle', value: 'assault_rifle' },
    { label: 'Machine Gun', value: 'mg' },
    { label: 'Sawnoff Shotgun', value: 'sawnoff_shotgun' },
    { label: 'Gusenberg', value: 'gusenberg' },
    { label: 'Compact Rifle', value: 'compact_rifle' },
  ],
};

// Synonyms map by canonical slug to support older/alternate names stored in DB
// These do not change UI options, only expand backend filter matching
const WEAPON_SYNONYMS: Record<string, string[]> = {
  // Arme albe
  'knife': ['cutit', 'cuțit', 'cutite', 'cuțite', 'briceag', 'knife'],
  'dagger': ['pumnal', 'dagger'],
  'switch_blade': ['switch blade', 'briceag automat', 'briceag-automat'],
  'machete': ['maceta', 'machete'],
  'battle_axe': ['battle axe', 'topor', 'topor de lupta', 'topor de luptă'],
  // Pistoale
  'pistol': ['pistolul', 'pistol'],
  'navy': ['navy revolver', 'navy-revolver', 'navy'],
  'double_action': ['double action', 'double-action'],
  'pistol_mk2': ['pistol mk2', 'pistol mk ii', 'pistol mk 2'],
  'pistol_50': ['pistol .50', 'pistol 50', 'pistol .50 cal'],
  'vintage_pistol': ['vintage pistol'],
  'ceramic_pistol': ['ceramic pistol'],
  // Arme mici
  'micro_smg': ['micro smg', 'micro-smg'],
  'machine_pistol': ['machine pistol', 'uzi', 'tec9', 'tec-9'],
  // Arme mari
  'compact_rifle': ['compact rifle', 'compact-rifle'],
  'gusenberg': ['gusenberg sweeper', 'gusenberg-sweeper', 'gusenberg'],
  'sawnoff_shotgun': ['sawnoff shotgun', 'sawn-off shotgun', 'sawn off shotgun'],
  'mg': ['machine gun', 'mg'],
  'assault_rifle': ['assault rifle', 'ak', 'ak47', 'ak-47'],
  'assault_rifle_mk2': ['assault rifle mk2', 'assault rifle mk ii', 'assault rifle mk 2']
};

// Build aliases for each weapon slug: include slug, label, and synonyms
function buildAliases(options: { label: string; value: string }[]) {
  const map: Record<string, string[]> = {};
  for (const o of options) {
    const slug = o.value;
    const syns = WEAPON_SYNONYMS[slug] || [];
    const all = new Set<string>([slug, o.label, ...syns]);
    map[slug] = Array.from(all);
  }
  return map;
}

// Per-group aliases, flattened
function combineGroup(options: { label: string; value: string }[]) {
  const aliases = buildAliases(options);
  const all: string[] = [];
  Object.values(aliases).forEach(arr => all.push(...arr));
  return Array.from(new Set(all));
}

export const weaponGroupMap: Record<string, string[]> = {
  arme_albe: combineGroup(WEAPON_OPTIONS.arme_albe),
  pistoale: combineGroup(WEAPON_OPTIONS.pistoale),
  arme_mici: combineGroup(WEAPON_OPTIONS.arme_mici),
  arme_mari: combineGroup(WEAPON_OPTIONS.arme_mari),
};

// Full alias lookup per weapon slug (across all groups)
export const WEAPON_ALIASES: Record<string, string[]> = (() => {
  const groups = [
    ...WEAPON_OPTIONS.arme_albe,
    ...WEAPON_OPTIONS.pistoale,
    ...WEAPON_OPTIONS.arme_mici,
    ...WEAPON_OPTIONS.arme_mari,
  ];
  const out: Record<string, string[]> = {};
  for (const o of groups) {
    const syns = WEAPON_SYNONYMS[o.value] || [];
    out[o.value] = Array.from(new Set<string>([o.value, o.label, ...syns]));
  }
  return out;
})();

// Strict slug list per group (no labels/synonyms) for precise filtering
export const WEAPON_GROUP_SLUGS: Record<string, string[]> = {
  arme_albe: WEAPON_OPTIONS.arme_albe.map(o => o.value),
  pistoale: WEAPON_OPTIONS.pistoale.map(o => o.value),
  arme_mici: WEAPON_OPTIONS.arme_mici.map(o => o.value),
  arme_mari: WEAPON_OPTIONS.arme_mari.map(o => o.value)
};
