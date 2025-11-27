import type { InventoryPreset } from '../types';
import { inventoryPresets } from '../database/schema';
import type { InventoryPresetRow } from '../database/schema';
import { drizzleDb } from '../database/drizzleClient';
import { eq, asc } from 'drizzle-orm';

export interface IInventoryPresetRepository {
  findAll(): Promise<InventoryPreset[]>;
  create(preset: Omit<InventoryPreset,'id'>): Promise<void>;
  update(id: number, preset: Partial<Omit<InventoryPreset,'id'>>): Promise<void>;
  delete(id: number): Promise<void>;
}

export class DrizzleInventoryPresetRepository implements IInventoryPresetRepository {
  private db = drizzleDb;
  async findAll(): Promise<InventoryPreset[]> {
    const rows = await this.db.select().from(inventoryPresets).orderBy(asc(inventoryPresets.id)).all();
    return rows.map(r => this.mapRow(r as InventoryPresetRow));
  }
  async create(preset: Omit<InventoryPreset,'id'>): Promise<void> {
    await this.db.insert(inventoryPresets).values({
      label: preset.label,
      icon_code: preset.iconCode,
      book_ids: JSON.stringify(preset.bookIds),
      is_default: preset.isDefault ? 1 : 0,
    }).run();
  }
  async update(id: number, preset: Partial<Omit<InventoryPreset,'id'>>): Promise<void> {
    const updates: any = {};
    if (preset.label !== undefined) updates.label = preset.label;
    if (preset.iconCode !== undefined) updates.icon_code = preset.iconCode;
    if (preset.bookIds !== undefined) updates.book_ids = JSON.stringify(preset.bookIds);
    if (preset.isDefault !== undefined) updates.is_default = preset.isDefault ? 1 : 0;
    
    if (Object.keys(updates).length === 0) return;
    await this.db.update(inventoryPresets).set(updates).where(eq(inventoryPresets.id, id)).run();
  }
  async delete(id: number): Promise<void> {
    await this.db.delete(inventoryPresets).where(eq(inventoryPresets.id, id)).run();
  }

  private mapRow(row: InventoryPresetRow): InventoryPreset {
    return {
      id: row.id ?? 0,
      label: row.label,
      iconCode: row.icon_code ?? 0,
      bookIds: (() => { try { return JSON.parse(row.book_ids || '[]'); } catch { return []; } })(),
      isDefault: !!row.is_default,
    };
  }
}
