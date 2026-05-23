import { PGlite } from '@electric-sql/pglite'
import {
  DEFAULT_SETTINGS,
  FLOW_LABELS,
  type Flow1Draft,
  type Flow1RateSnapshot,
  type Flow1Record,
  type Flow2Draft,
  type Flow2RateSnapshot,
  type Flow2Record,
  type Flow2Status,
  type Flow3Draft,
  type Flow3Record,
  type FlowType,
  type LogisticsRecord,
  type PricingSettings,
  type ProductCategory,
  type SettingsBundle,
  type UnifiedRecord,
  detectPlatform,
  generateReferenceId,
  initSchema,
  parseJsonValue,
} from './schema'

let db: PGlite | null = null

function text(value: unknown): string {
  if (value instanceof Date) return value.toISOString()
  return value === null || value === undefined ? '' : String(value)
}

function nullableText(value: unknown): string | null {
  return value === null || value === undefined || value === '' ? null : text(value)
}

function numberValue(value: unknown): number {
  return Number(value ?? 0)
}

function createId(): string {
  return globalThis.crypto.randomUUID()
}

function mapFlow1Record(row: Record<string, unknown>): Flow1Record {
  return {
    id: text(row.id),
    ref_id: text(row.ref_id),
    created_at: text(row.created_at),
    updated_at: text(row.updated_at),
    sender_name: text(row.sender_name),
    sender_phone: text(row.sender_phone),
    product_description: text(row.product_description),
    product_category: text(row.product_category) as ProductCategory,
    flight_number: text(row.flight_number),
    flight_date: text(row.flight_date).slice(0, 10),
    flight_route: text(row.flight_route),
    weight_or_quantity: numberValue(row.weight_or_quantity),
    calculated_charge: numberValue(row.calculated_charge),
    notes: nullableText(row.notes),
    rate_snapshot: parseJsonValue<Flow1RateSnapshot>(row.rate_snapshot),
  }
}

function mapFlow2Record(row: Record<string, unknown>): Flow2Record {
  return {
    id: text(row.id),
    ref_id: text(row.ref_id),
    created_at: text(row.created_at),
    updated_at: text(row.updated_at),
    tracking_number: text(row.tracking_number),
    platform: text(row.platform),
    buyer_name: text(row.buyer_name),
    buyer_phone: text(row.buyer_phone),
    weight_kg: numberValue(row.weight_kg),
    calculated_charge: numberValue(row.calculated_charge),
    date_received: text(row.date_received).slice(0, 10),
    status: text(row.status) as Flow2Status,
    rate_snapshot: parseJsonValue<Flow2RateSnapshot>(row.rate_snapshot),
  }
}

function mapFlow3Record(row: Record<string, unknown>): Flow3Record {
  return {
    id: text(row.id),
    ref_id: text(row.ref_id),
    created_at: text(row.created_at),
    updated_at: text(row.updated_at),
    sender_name: text(row.sender_name),
    sender_phone: text(row.sender_phone),
    collector_name: text(row.collector_name),
    collector_phone: text(row.collector_phone),
    item_description: text(row.item_description),
    date_received: text(row.date_received).slice(0, 10),
    date_collected: nullableText(row.date_collected),
    status: text(row.status) as Flow3Record['status'],
    notes: nullableText(row.notes),
  }
}

export async function getDB(): Promise<PGlite> {
  if (!db) {
    db = new PGlite('idb://logistics-db')
    await initSchema(db)
  }
  return db
}

export async function getSettingsBundle(): Promise<SettingsBundle> {
  const database = await getDB()
  const result = await database.query<Record<string, unknown>>(
    'SELECT value, updated_at FROM settings WHERE key = $1',
    ['pricing'],
  )
  const row = result.rows[0]

  if (!row) {
    return {
      value: DEFAULT_SETTINGS,
      updatedAt: new Date().toISOString(),
    }
  }

  return {
    value: parseJsonValue<PricingSettings>(row.value) ?? DEFAULT_SETTINGS,
    updatedAt: text(row.updated_at),
  }
}

export async function saveSettings(value: PricingSettings): Promise<SettingsBundle> {
  const database = await getDB()
  await database.query(
    `INSERT INTO settings (key, value, updated_at)
     VALUES ($1, $2::jsonb, NOW())
     ON CONFLICT (key)
     DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()`,
    ['pricing', JSON.stringify(value)],
  )
  return getSettingsBundle()
}

export function calculateFlow1Pricing(
  draft: Pick<Flow1Draft, 'flight_route' | 'product_category' | 'weight_or_quantity'>,
  settings: PricingSettings,
  version: string,
): { charge: number; snapshot: Flow1RateSnapshot } {
  const routeRate = settings.flight_rates.find((item) => item.route === draft.flight_route)
  const baseRate = routeRate?.base_rate ?? 0
  const surcharge = settings.category_surcharges[draft.product_category] ?? 0
  const charge = Math.max(settings.min_charge, draft.weight_or_quantity * (baseRate + surcharge))
  return {
    charge: Number(charge.toFixed(2)),
    snapshot: {
      version,
      route: draft.flight_route,
      base_rate: baseRate,
      category: draft.product_category,
      category_surcharge: surcharge,
      min_charge: settings.min_charge,
    },
  }
}

export function calculateFlow2Pricing(
  draft: Pick<Flow2Draft, 'platform' | 'tracking_number' | 'weight_kg'>,
  settings: PricingSettings,
  version: string,
): { charge: number; snapshot: Flow2RateSnapshot } {
  const detected = draft.platform || detectPlatform(draft.tracking_number)
  const platformRate = settings.parcel_rates[detected as keyof typeof settings.parcel_rates]
  const perKgRate = typeof platformRate === 'number' ? platformRate : settings.parcel_rates.global
  const source = typeof platformRate === 'number' ? 'platform' : 'global'
  const charge = draft.weight_kg * perKgRate
  return {
    charge: Number(charge.toFixed(2)),
    snapshot: {
      version,
      platform: detected || 'Global',
      per_kg_rate: perKgRate,
      source,
    },
  }
}

export async function createFlow1Record(draft: Flow1Draft): Promise<Flow1Record> {
  const database = await getDB()
  const settings = await getSettingsBundle()
  const { charge, snapshot } = calculateFlow1Pricing(draft, settings.value, settings.updatedAt)
  const id = createId()

  await database.query(
    `INSERT INTO flow1_records (
      id, ref_id, sender_name, sender_phone, product_description, product_category,
      flight_number, flight_date, flight_route, weight_or_quantity, calculated_charge,
      notes, rate_snapshot
    ) VALUES (
      $1, $2, $3, $4, $5, $6,
      $7, $8, $9, $10, $11,
      $12, $13::jsonb
    )`,
    [
      id,
      generateReferenceId('F1'),
      draft.sender_name,
      draft.sender_phone,
      draft.product_description,
      draft.product_category,
      draft.flight_number,
      draft.flight_date,
      draft.flight_route,
      draft.weight_or_quantity,
      charge,
      draft.notes || null,
      JSON.stringify(snapshot),
    ],
  )

  const record = await getFlow1RecordById(id)
  if (!record) throw new Error('Failed to create outbound cargo record.')
  return record
}

export async function createFlow2Record(draft: Flow2Draft): Promise<Flow2Record> {
  const database = await getDB()
  const settings = await getSettingsBundle()
  const platform = draft.platform || detectPlatform(draft.tracking_number)
  const nextDraft = { ...draft, platform }
  const { charge, snapshot } = calculateFlow2Pricing(nextDraft, settings.value, settings.updatedAt)
  const id = createId()

  await database.query(
    `INSERT INTO flow2_records (
      id, ref_id, tracking_number, platform, buyer_name, buyer_phone,
      weight_kg, calculated_charge, date_received, status, rate_snapshot
    ) VALUES (
      $1, $2, $3, $4, $5, $6,
      $7, $8, $9, $10, $11::jsonb
    )`,
    [
      id,
      generateReferenceId('F2'),
      nextDraft.tracking_number,
      nextDraft.platform,
      nextDraft.buyer_name,
      nextDraft.buyer_phone,
      nextDraft.weight_kg,
      charge,
      nextDraft.date_received,
      nextDraft.status,
      JSON.stringify(snapshot),
    ],
  )

  const record = await getFlow2RecordById(id)
  if (!record) throw new Error('Failed to create parcel record.')
  return record
}

export async function createFlow3Record(draft: Flow3Draft): Promise<Flow3Record> {
  const database = await getDB()
  const id = createId()
  const collectedAt = draft.status === 'Collected' ? draft.date_collected || new Date().toISOString() : null

  await database.query(
    `INSERT INTO flow3_records (
      id, ref_id, sender_name, sender_phone, collector_name, collector_phone,
      item_description, date_received, date_collected, status, notes
    ) VALUES (
      $1, $2, $3, $4, $5, $6,
      $7, $8, $9, $10, $11
    )`,
    [
      id,
      generateReferenceId('F3'),
      draft.sender_name,
      draft.sender_phone,
      draft.collector_name,
      draft.collector_phone,
      draft.item_description,
      draft.date_received,
      collectedAt,
      draft.status,
      draft.notes || null,
    ],
  )

  const record = await getFlow3RecordById(id)
  if (!record) throw new Error('Failed to create inbound pickup record.')
  return record
}

export async function getFlow1Records(): Promise<Flow1Record[]> {
  const database = await getDB()
  const result = await database.query<Record<string, unknown>>(
    'SELECT * FROM flow1_records ORDER BY created_at DESC',
  )
  return result.rows.map(mapFlow1Record)
}

export async function getFlow2Records(): Promise<Flow2Record[]> {
  const database = await getDB()
  const result = await database.query<Record<string, unknown>>(
    'SELECT * FROM flow2_records ORDER BY created_at DESC',
  )
  return result.rows.map(mapFlow2Record)
}

export async function getFlow3Records(): Promise<Flow3Record[]> {
  const database = await getDB()
  const result = await database.query<Record<string, unknown>>(
    'SELECT * FROM flow3_records ORDER BY created_at DESC',
  )
  return result.rows.map(mapFlow3Record)
}

export async function getFlow1RecordById(id: string): Promise<Flow1Record | null> {
  const database = await getDB()
  const result = await database.query<Record<string, unknown>>('SELECT * FROM flow1_records WHERE id = $1', [id])
  const row = result.rows[0]
  return row ? mapFlow1Record(row) : null
}

export async function getFlow2RecordById(id: string): Promise<Flow2Record | null> {
  const database = await getDB()
  const result = await database.query<Record<string, unknown>>('SELECT * FROM flow2_records WHERE id = $1', [id])
  const row = result.rows[0]
  return row ? mapFlow2Record(row) : null
}

export async function getFlow3RecordById(id: string): Promise<Flow3Record | null> {
  const database = await getDB()
  const result = await database.query<Record<string, unknown>>('SELECT * FROM flow3_records WHERE id = $1', [id])
  const row = result.rows[0]
  return row ? mapFlow3Record(row) : null
}

export async function getRecordByFlow(flow: FlowType, id: string): Promise<LogisticsRecord | null> {
  if (flow === 'flow1') return getFlow1RecordById(id)
  if (flow === 'flow2') return getFlow2RecordById(id)
  return getFlow3RecordById(id)
}

export async function updateFlow1Record(record: Flow1Record): Promise<void> {
  const database = await getDB()
  await database.query(
    `UPDATE flow1_records
     SET updated_at = NOW(), sender_name = $2, sender_phone = $3, product_description = $4,
         product_category = $5, flight_number = $6, flight_date = $7, flight_route = $8,
         weight_or_quantity = $9, calculated_charge = $10, notes = $11, rate_snapshot = $12::jsonb
     WHERE id = $1`,
    [
      record.id,
      record.sender_name,
      record.sender_phone,
      record.product_description,
      record.product_category,
      record.flight_number,
      record.flight_date,
      record.flight_route,
      record.weight_or_quantity,
      record.calculated_charge,
      record.notes || null,
      JSON.stringify(record.rate_snapshot),
    ],
  )
}

export async function updateFlow2Record(record: Flow2Record): Promise<void> {
  const database = await getDB()
  await database.query(
    `UPDATE flow2_records
     SET updated_at = NOW(), tracking_number = $2, platform = $3, buyer_name = $4,
         buyer_phone = $5, weight_kg = $6, calculated_charge = $7, date_received = $8,
         status = $9, rate_snapshot = $10::jsonb
     WHERE id = $1`,
    [
      record.id,
      record.tracking_number,
      record.platform,
      record.buyer_name,
      record.buyer_phone,
      record.weight_kg,
      record.calculated_charge,
      record.date_received,
      record.status,
      JSON.stringify(record.rate_snapshot),
    ],
  )
}

export async function updateFlow3Record(record: Flow3Record): Promise<void> {
  const database = await getDB()
  const collectedAt = record.status === 'Collected' ? record.date_collected || new Date().toISOString() : null
  await database.query(
    `UPDATE flow3_records
     SET updated_at = NOW(), sender_name = $2, sender_phone = $3, collector_name = $4,
         collector_phone = $5, item_description = $6, date_received = $7, date_collected = $8,
         status = $9, notes = $10
     WHERE id = $1`,
    [
      record.id,
      record.sender_name,
      record.sender_phone,
      record.collector_name,
      record.collector_phone,
      record.item_description,
      record.date_received,
      collectedAt,
      record.status,
      record.notes || null,
    ],
  )
}

export async function updateRecordByFlow(record: LogisticsRecord): Promise<void> {
  if ('tracking_number' in record) {
    await updateFlow2Record(record)
    return
  }
  if ('collector_name' in record) {
    await updateFlow3Record(record)
    return
  }
  await updateFlow1Record(record)
}

export async function updateFlow2Status(id: string, status: Flow2Status): Promise<void> {
  const record = await getFlow2RecordById(id)
  if (!record) return
  await updateFlow2Record({ ...record, status })
}

export async function markFlow3Collected(id: string): Promise<void> {
  const record = await getFlow3RecordById(id)
  if (!record) return
  await updateFlow3Record({
    ...record,
    status: 'Collected',
    date_collected: record.date_collected || new Date().toISOString(),
  })
}

export async function getUnifiedRecords(): Promise<UnifiedRecord[]> {
  const [flow1, flow2, flow3] = await Promise.all([getFlow1Records(), getFlow2Records(), getFlow3Records()])

  const unified: UnifiedRecord[] = [
    ...flow1.map((record) => ({
      id: record.id,
      ref_id: record.ref_id,
      flow: 'flow1' as const,
      flowLabel: FLOW_LABELS.flow1,
      status: 'Logged',
      created_at: record.created_at,
      updated_at: record.updated_at,
      search_date: record.flight_date,
      primary_name: record.sender_name,
      secondary_name: null,
      phone: record.sender_phone,
      secondary_phone: null,
      tracking_number: null,
      description: `${record.product_description} • ${record.flight_route}`,
      calculated_charge: record.calculated_charge,
      raw: record,
    })),
    ...flow2.map((record) => ({
      id: record.id,
      ref_id: record.ref_id,
      flow: 'flow2' as const,
      flowLabel: FLOW_LABELS.flow2,
      status: record.status,
      created_at: record.created_at,
      updated_at: record.updated_at,
      search_date: record.date_received,
      primary_name: record.buyer_name,
      secondary_name: null,
      phone: record.buyer_phone,
      secondary_phone: null,
      tracking_number: record.tracking_number,
      description: `${record.platform} parcel`,
      calculated_charge: record.calculated_charge,
      raw: record,
    })),
    ...flow3.map((record) => ({
      id: record.id,
      ref_id: record.ref_id,
      flow: 'flow3' as const,
      flowLabel: FLOW_LABELS.flow3,
      status: record.status,
      created_at: record.created_at,
      updated_at: record.updated_at,
      search_date: record.date_received,
      primary_name: record.sender_name,
      secondary_name: record.collector_name,
      phone: record.sender_phone,
      secondary_phone: record.collector_phone,
      tracking_number: null,
      description: record.item_description,
      calculated_charge: null,
      raw: record,
    })),
  ]

  return unified.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
}
