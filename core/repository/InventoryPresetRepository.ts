import type { InventoryPreset } from '../types';
import { inventoryPresets, presetBooks } from '../database/schema';
import type { InventoryPresetRow, PresetBookRow } from '../database/schema';
import { getDrizzleDb } from '../database/drizzleClient';
import { eq, asc, inArray } from 'drizzle-orm';

export interface IInventoryPresetRepository {
  findAll(): Promise<InventoryPreset[]>;
  findDefault(): Promise<InventoryPreset | null>; // QuestService用
  create(preset: Omit<InventoryPreset,'id'>): Promise<void>;
  update(id: number, preset: Partial<Omit<InventoryPreset,'id'>>): Promise<void>;
  delete(id: number): Promise<void>;
}

export class DrizzleInventoryPresetRepository implements IInventoryPresetRepository {
  private async db() {
    return await getDrizzleDb();
  }
  async findAll(): Promise<InventoryPreset[]> {
    const db = await this.db();
    
    // JOINを使って一度に取得し、N+1問題を解消
    const rows = await db.select({
      preset: inventoryPresets,
      bookId: presetBooks.book_id
    })
    .from(inventoryPresets)
    .leftJoin(presetBooks, eq(inventoryPresets.id, presetBooks.preset_id))
    .orderBy(asc(inventoryPresets.id))
    .all();

    // アプリケーション側でグルーピング
    const presetMap = new Map<number, InventoryPreset>();

    for (const row of rows) {
      const pid = row.preset.id;
      if (!presetMap.has(pid)) {
        presetMap.set(pid, {
          id: pid,
          label: row.preset.label,
          iconCode: row.preset.icon_code ?? 0,
          bookIds: [],
          isDefault: !!row.preset.is_default,
        });
      }
      
      if (row.bookId) {
        presetMap.get(pid)!.bookIds.push(row.bookId);
      }
    }

    return Array.from(presetMap.values());
  }
  
  async findDefault(): Promise<InventoryPreset | null> {
    const all = await this.findAll();
    return all.find(p => p.isDefault) ?? null;
  }
  
  async create(preset: Omit<InventoryPreset,'id'>): Promise<void> {
    const db = await this.db();
    await db.transaction(async (tx) => {
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
    const db = await this.db();
    await db.transaction(async (tx) => {
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
    const db = await this.db();
    await db.delete(inventoryPresets).where(eq(inventoryPresets.id, id)).run();
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
