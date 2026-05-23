import type { PGlite } from '@electric-sql/pglite'

export type UserRole = 'admin' | 'staff'
export type FlowType = 'flow1' | 'flow2' | 'flow3'
export type ProductCategory = 'clothing' | 'electronics' | 'fragile' | 'general'
export type Flow2Status = 'Received' | 'Ready' | 'Collected'
export type Flow3Status = 'Pending' | 'Collected'

export interface FlightRate {
  route: string
  base_rate: number
}

export interface ParcelRates {
  global: number
  Shopee: number
  Lazada: number
  Zalora: number
  'Ninja Van': number
  'J&T': number
  Qxpress: number
}

export interface PricingSettings {
  flight_rates: FlightRate[]
  category_surcharges: Record<ProductCategory, number>
  min_charge: number
  parcel_rates: ParcelRates
  uncollected_alert_days: number
}

export interface SettingsBundle {
  value: PricingSettings
  updatedAt: string
}

export interface Flow1RateSnapshot {
  version: string
  route: string
  base_rate: number
  category: ProductCategory
  category_surcharge: number
  min_charge: number
}

export interface Flow2RateSnapshot {
  version: string
  platform: string
  per_kg_rate: number
  source: 'platform' | 'global'
}

export interface Flow1Record {
  id: string
  ref_id: string
  created_at: string
  updated_at: string
  sender_name: string
  sender_phone: string
  product_description: string
  product_category: ProductCategory
  flight_number: string
  flight_date: string
  flight_route: string
  weight_or_quantity: number
  calculated_charge: number
  notes: string | null
  rate_snapshot: Flow1RateSnapshot | null
}

export interface Flow2Record {
  id: string
  ref_id: string
  created_at: string
  updated_at: string
  tracking_number: string
  platform: string
  buyer_name: string
  buyer_phone: string
  weight_kg: number
  calculated_charge: number
  date_received: string
  status: Flow2Status
  rate_snapshot: Flow2RateSnapshot | null
}

export interface Flow3Record {
  id: string
  ref_id: string
  created_at: string
  updated_at: string
  sender_name: string
  sender_phone: string
  collector_name: string
  collector_phone: string
  item_description: string
  date_received: string
  date_collected: string | null
  status: Flow3Status
  notes: string | null
}

export type LogisticsRecord = Flow1Record | Flow2Record | Flow3Record

export interface UnifiedRecord {
  id: string
  ref_id: string
  flow: FlowType
  flowLabel: string
  status: string
  created_at: string
  updated_at: string
  search_date: string
  primary_name: string
  secondary_name: string | null
  phone: string
  secondary_phone: string | null
  tracking_number: string | null
  description: string
  calculated_charge: number | null
  raw: LogisticsRecord
}

export interface Flow1Draft {
  sender_name: string
  sender_phone: string
  product_description: string
  product_category: ProductCategory
  flight_number: string
  flight_date: string
  flight_route: string
  weight_or_quantity: number
  notes: string
}

export interface Flow2Draft {
  tracking_number: string
  platform: string
  buyer_name: string
  buyer_phone: string
  weight_kg: number
  date_received: string
  status: Flow2Status
}

export interface Flow3Draft {
  sender_name: string
  sender_phone: string
  collector_name: string
  collector_phone: string
  item_description: string
  date_received: string
  date_collected: string
  status: Flow3Status
  notes: string
}

export const FLOW2_PLATFORMS = ['Shopee', 'Lazada', 'Zalora', 'Ninja Van', 'J&T', 'Qxpress'] as const
export const FLOW2_STATUSES: Flow2Status[] = ['Received', 'Ready', 'Collected']
export const FLOW3_STATUSES: Flow3Status[] = ['Pending', 'Collected']
export const PRODUCT_CATEGORIES: ProductCategory[] = ['clothing', 'electronics', 'fragile', 'general']
export const FLOW_LABELS: Record<FlowType, string> = {
  flow1: 'Outbound cargo',
  flow2: 'Online parcels',
  flow3: 'Inbound pickup',
}

export const DEFAULT_SETTINGS: PricingSettings = {
  flight_rates: [
    { route: 'SIN-RGN', base_rate: 5 },
    { route: 'SIN-MDL', base_rate: 6 },
    { route: 'SIN-NYU', base_rate: 7 },
  ],
  category_surcharges: {
    clothing: 0,
    electronics: 2,
    fragile: 3,
    general: 0,
  },
  min_charge: 10,
  parcel_rates: {
    global: 3.5,
    Shopee: 3,
    Lazada: 3,
    Zalora: 3.5,
    'Ninja Van': 3.5,
    'J&T': 3,
    Qxpress: 3.5,
  },
  uncollected_alert_days: 14,
}

const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS flow1_records (
  id TEXT PRIMARY KEY,
  ref_id TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  sender_name TEXT NOT NULL,
  sender_phone TEXT NOT NULL,
  product_description TEXT NOT NULL,
  product_category TEXT NOT NULL,
  flight_number TEXT NOT NULL,
  flight_date DATE NOT NULL,
  flight_route TEXT NOT NULL,
  weight_or_quantity REAL NOT NULL,
  calculated_charge REAL NOT NULL,
  notes TEXT,
  rate_snapshot JSONB
);

CREATE TABLE IF NOT EXISTS flow2_records (
  id TEXT PRIMARY KEY,
  ref_id TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  tracking_number TEXT NOT NULL,
  platform TEXT NOT NULL,
  buyer_name TEXT NOT NULL,
  buyer_phone TEXT NOT NULL,
  weight_kg REAL NOT NULL,
  calculated_charge REAL NOT NULL,
  date_received DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'Received',
  rate_snapshot JSONB
);

CREATE TABLE IF NOT EXISTS flow3_records (
  id TEXT PRIMARY KEY,
  ref_id TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  sender_name TEXT NOT NULL,
  sender_phone TEXT NOT NULL,
  collector_name TEXT NOT NULL,
  collector_phone TEXT NOT NULL,
  item_description TEXT NOT NULL,
  date_received DATE NOT NULL,
  date_collected TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'Pending',
  notes TEXT
);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
`

export async function initSchema(db: PGlite): Promise<void> {
  await db.exec(SCHEMA_SQL)
  const result = await db.query<{ key: string }>('SELECT key FROM settings WHERE key = $1', ['pricing'])

  if (result.rows.length === 0) {
    await db.query(
      'INSERT INTO settings (key, value, updated_at) VALUES ($1, $2::jsonb, NOW())',
      ['pricing', JSON.stringify(DEFAULT_SETTINGS)],
    )
  }
}

export function detectPlatform(trackingNumber: string): string {
  const tn = trackingNumber.toUpperCase()
  if (tn.startsWith('MY') || tn.startsWith('SPX')) return 'Shopee'
  if (tn.startsWith('LZD') || tn.startsWith('LEX')) return 'Lazada'
  if (tn.startsWith('ZLR')) return 'Zalora'
  if (tn.startsWith('NVSG') || tn.startsWith('NNSG')) return 'Ninja Van'
  if (tn.startsWith('JT') || tn.startsWith('600')) return 'J&T'
  if (tn.startsWith('QX')) return 'Qxpress'
  return ''
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-SG', {
    style: 'currency',
    currency: 'SGD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}

export function toDateInput(value: string | Date = new Date()): string {
  const date = value instanceof Date ? value : new Date(value)
  const offset = date.getTimezoneOffset() * 60_000
  return new Date(date.getTime() - offset).toISOString().slice(0, 10)
}

export function generateReferenceId(prefix: 'F1' | 'F2' | 'F3'): string {
  const day = toDateInput().replaceAll('-', '')
  const random = Math.floor(1000 + Math.random() * 9000)
  return `${prefix}-${day}-${random}`
}

export function parseJsonValue<T>(value: unknown): T | null {
  if (value === null || value === undefined) return null
  if (typeof value === 'string') return JSON.parse(value) as T
  return value as T
}
