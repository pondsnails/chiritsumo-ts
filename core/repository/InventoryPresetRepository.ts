import type { InventoryPreset } from '../types';
import { inventoryPresets, presetBooks } from '../database/schema';
import type { InventoryPresetRow, PresetBookRow } from '../database/schema';
import { getDrizzleDb } from '../database/drizzleClient';
import { eq, asc, inArray } from 'drizzle-orm';

export interface IInventoryPresetRepository {
  findAll(): Promise<InventoryPreset[]>;
  create(preset: Omit<InventoryPreset,'id'>): Promise<void>;
  update(id: number, preset: Partial<Omit<InventoryPreset,'id'>>): Promise<void>;
  delete(id: number): Promise<void>;
}

export class DrizzleInventoryPresetRepository implements IInventoryPresetRepository {
  private get db() {
    return getDrizzleDb();
  }
  async findAll(): Promise<InventoryPreset[]> {
    const rows = await this.db.select().from(inventoryPresets).orderBy(asc(inventoryPresets.id)).all();
    const presetIds = (rows as InventoryPresetRow[]).map(r => r.id).filter((v): v is number => typeof v === 'number');

    let links: PresetBookRow[] = [];
    if (presetIds.length > 0) {
      links = await this.db.select().from(presetBooks).where(inArray(presetBooks.preset_id, presetIds)).all() as PresetBookRow[];
    }

    const booksByPreset = new Map<number, string[]>();
    for (const link of links) {
      const list = booksByPreset.get(link.preset_id) ?? [];
      list.push(link.book_id);
      booksByPreset.set(link.preset_id, list);
    }

    return (rows as InventoryPresetRow[]).map(r => this.mapRow(r, booksByPreset.get(r.id ?? 0) ?? []));
  }
  async create(preset: Omit<InventoryPreset,'id'>): Promise<void> {
    await this.db.transaction(async (tx) => {
      const res: any = await tx.insert(inventoryPresets).values({
        label: preset.label,
        icon_code: preset.iconCode,
        is_default: preset.isDefault ? 1 : 0,
      }).run();

      // expo-sqlite/drizzle returns lastInsertRowid on run()
      const presetId: number | undefined = res?.lastInsertRowid;

      // 最後に挿入したIDが取れない場合はフォールバック取得
      const idToUse = presetId ?? (await tx.select().from(inventoryPresets).orderBy(asc(inventoryPresets.id)).all()).slice(-1)[0]?.id;

      if (idToUse && preset.bookIds?.length) {
        const rows = preset.bookIds.map(bid => ({ preset_id: idToUse, book_id: bid }));
        await tx.insert(presetBooks).values(rows as any).run();
      }
    });
  }
  async update(id: number, preset: Partial<Omit<InventoryPreset,'id'>>): Promise<void> {
    await this.db.transaction(async (tx) => {
      const updates: any = {};
      if (preset.label !== undefined) updates.label = preset.label;
      if (preset.iconCode !== undefined) updates.icon_code = preset.iconCode;
      if (preset.isDefault !== undefined) updates.is_default = preset.isDefault ? 1 : 0;

      if (Object.keys(updates).length > 0) {
        await tx.update(inventoryPresets).set(updates).where(eq(inventoryPresets.id, id)).run();
      }

      if (preset.bookIds !== undefined) {
        // リンク全削除→再挿入
        await tx.delete(presetBooks).where(eq(presetBooks.preset_id, id)).run();
        if (preset.bookIds.length > 0) {
          const rows = preset.bookIds.map(bid => ({ preset_id: id, book_id: bid }));
          await tx.insert(presetBooks).values(rows as any).run();
        }
      }
    });
  }
  async delete(id: number): Promise<void> {
    await this.db.delete(inventoryPresets).where(eq(inventoryPresets.id, id)).run();
  }

  private mapRow(row: InventoryPresetRow, bookIds: string[]): InventoryPreset {
    return {
      id: row.id ?? 0,
      label: row.label,
      iconCode: row.icon_code ?? 0,
      bookIds,
      isDefault: !!row.is_default,
    };
  }
}
