export type CarBrand = string;
export type CarModel = string;

// Small curated dataset; extend as needed
export const CAR_BRANDS: Record<CarBrand, CarModel[]> = {
  Guardian: [],
  Helion: [],
  Winky: [],
  Vetir: [],
  Yosemite: [],
  Weevil: [],
  Manchez: [],
};

export const CAR_VEHICLE_TYPES = [
  { label: 'Sedan/Saloon', value: 'saloon' },
  { label: 'Coupe', value: 'coupe' },
  { label: 'SUV', value: 'suv' },
  { label: 'Hatchback', value: 'hatchback' },
  { label: 'Cabrio', value: 'convertible' },
  { label: 'Pickup', value: 'pickup' },
  { label: 'Van', value: 'van' },
];

export function brandOptions() {
  return Object.keys(CAR_BRANDS).map((b) => ({ label: b, value: b }));
}

export function modelOptions(brand?: string) {
  if (!brand || !CAR_BRANDS[brand]) return [];
  return CAR_BRANDS[brand].map((m) => ({ label: m, value: m }));
}