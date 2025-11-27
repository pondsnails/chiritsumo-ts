import type { InventoryPreset } from '../types';

export interface IInventoryPresetRepository {
  findAll(): Promise<InventoryPreset[]>;
  create(preset: Omit<InventoryPreset,'id'>): Promise<void>;
  update(id: number, preset: Omit<InventoryPreset,'id'>): Promise<void>;
  delete(id: number): Promise<void>;
}

export class DrizzleInventoryPresetRepository implements IInventoryPresetRepository {
  async findAll(): Promise<InventoryPreset[]> { return []; }
  async create(preset: Omit<InventoryPreset,'id'>): Promise<void> {}
  async update(id: number, preset: Omit<InventoryPreset,'id'>): Promise<void> {}
  async delete(id: number): Promise<void> {}
}
