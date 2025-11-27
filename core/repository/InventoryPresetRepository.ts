import type { InventoryPreset } from '../types';
import { inventoryPresets } from '../database/schema';
import type { InventoryPresetRow } from '../database/schema';
import { drizzleDb } from '../database/drizzleClient';
import { eq, asc } from 'drizzle-orm';

export interface IInventoryPresetRepository {
  findAll(): Promise<InventoryPreset[]>;
  create(preset: Omit<InventoryPreset,'id'>): Promise<void>;
  update(id: number, preset: Omit<InventoryPreset,'id'>): Promise<void>;
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
  async update(id: number, preset: Omit<InventoryPreset,'id'>): Promise<void> {
    await this.db.update(inventoryPresets).set({
      label: preset.label,
      icon_code: preset.iconCode,
      book_ids: JSON.stringify(preset.bookIds),
      is_default: preset.isDefault ? 1 : 0,
    }).where(eq(inventoryPresets.id, id)).run();
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
