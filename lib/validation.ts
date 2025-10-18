import { z } from 'zod';

export const listingImageObject = z.object({
  original: z.string().regex(/^\/(uploads|presets)\//),
  thumb: z.string().regex(/^\/(uploads|presets)\//).optional(),
  mime: z.string().optional(),
  width: z.number().int().positive().max(10000).optional(),
  height: z.number().int().positive().max(10000).optional()
});

const CATEGORIES = ['arme','droguri','masini','bani'] as const;
// Category-specific attribute schemas
export const armeAttributesSchema = z.object({
  tip: z.string().min(1).max(40),
  calibru: z.string().min(1).max(20).optional(),
  stare: z.enum(['nou', 'bun', 'folosit']).optional()
});
export const droguriAttributesSchema = z.object({
  tip: z.string().min(1).max(50),
  cantitate: z.coerce.number().int().positive(),
  unitate: z.enum(['g','kg','buc']).optional()
});
export const itemeAttributesSchema = z.object({
  tip: z.string().min(1).max(60),
  stare: z.enum(['nou', 'bun', 'folosit']).optional()
});
export const baniAttributesSchema = z.object({
  suma: z.number().int().min(1),
  // reusing field name 'moneda' but representing the type of money, constrained to 'bani_murdari'
  moneda: z.enum(['bani_murdari']).optional(),
  actiune: z.enum(['cumpara','vinde']),
  procent: z.number().int().min(15).max(45)
});
export const serviciiAttributesSchema = z.object({
  tip: z.string().min(1).max(60),
  locatie: z.string().min(1).max(120).optional()
});
export const vehicleAttributesSchema = z.object({
  brand: z.string().min(1).max(40),
  // model removed per new requirements
  vtype: z.string().min(1).max(30).optional(),
  priceMin: z.number().int().min(0).optional(),
  priceMax: z.number().int().min(0).optional(),
}).partial({ priceMin: true, priceMax: true });

// Base listing shape used by both create and update schemas
const listingBaseSchema = z.object({
  title: z.string().min(3).max(120),
  description: z.string().min(3).max(5000),
  price: z.number().int().min(0).max(200_000_000).nullable().optional(),
  category: z.enum(CATEGORIES),
  // Limit to max 3 images per listing (server may override images for some categories)
  images: z.array(listingImageObject).max(3).optional(),
  isGold: z.boolean().optional(),
  // category-specific attributes, validated per category client-side additionally
  attributes: z.union([
    vehicleAttributesSchema,
    armeAttributesSchema,
    droguriAttributesSchema,
    itemeAttributesSchema,
    baniAttributesSchema,
    serviciiAttributesSchema,
    z.record(z.string(), z.any()) // fallback for other categories until specific schemas are added
  ]).optional()
});

export const listingCreateSchema = listingBaseSchema.superRefine((data, ctx) => {
  // Require price for all categories except bani, where 'suma' acts as the price surrogate
  if (data.category !== 'bani') {
    if (data.price == null || !Number.isFinite(data.price as any)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Completează prețul.', path: ['price'] });
    }
  }
  if (data.category === 'masini') {
    try {
      vehicleAttributesSchema.parse(data.attributes);
    } catch (e) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Selectează marca pentru vehicul.',
        path: ['attributes']
      });
    }
  }
  if (data.category === 'arme') {
    try { armeAttributesSchema.parse(data.attributes); }
    catch { ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Completează tip și calibru.', path: ['attributes'] }); }
  }
  // For 'droguri', rely on server-side sanitation and be lenient here to avoid false negatives in creation flow
  // 'iteme' category removed
  if (data.category === 'bani') {
    try { baniAttributesSchema.parse(data.attributes); }
    catch { ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Completează suma.', path: ['attributes'] }); }
  }
  // 'servicii' category removed
});

// Update schema: allow partial updates (all fields optional) while keeping the same validation rules per field
export const listingUpdateSchema = listingBaseSchema.partial();

export const profileUpdateSchema = z.object({
  displayName: z.string().min(3).max(30),
  handle: z.string().regex(/^@[a-z0-9]{2,20}$/).optional(),
  bio: z.string().max(500).optional(),
  // allow either absolute http(s) URL or local uploads path
  coverUrl: z.string().regex(/^(https?:\/\/|\/uploads\/)/).optional(),
  // Discord is linked via OAuth, not manually
});

export const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6).max(100),
  displayName: z.string().min(3).max(30),
  fullNameIC: z.string().min(3).max(100),
  inGameId: z.number().int().min(1).max(200000),
  phoneIC: z.string().regex(/^\+?\d{7,15}$/)
});

export type ListingImageInput = z.infer<typeof listingImageObject>;
export type CategoryValue = typeof CATEGORIES[number];
export const CATEGORY_VALUES: CategoryValue[] = [...CATEGORIES];
