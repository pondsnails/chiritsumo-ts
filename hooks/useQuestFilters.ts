/**
 * useQuestFilters - プリセットフィルター管理
 */
import { useState, useCallback, useEffect, useMemo } from 'react';
import { useServices } from '@core/di/ServicesProvider';
import type { InventoryPreset, Book } from '@core/types';

interface UseQuestFiltersReturn {
  presets: InventoryPreset[];
  activePresetId: number | null;
  setActivePresetId: (id: number | null) => void;
  selectedBookIds: string[];
  refreshPresets: () => Promise<void>;
}

export function useQuestFilters(books: Book[]): UseQuestFiltersReturn {
  const { questService } = useServices();
  const [presets, setPresets] = useState<InventoryPreset[]>([]);
  const [activePresetId, setActivePresetId] = useState<number | null>(null);

  const refreshPresets = useCallback(async () => {
    const loaded = await questService.getInventoryPresets();
    setPresets(loaded);
    const def = loaded.find(p => p.isDefault);
    if (def && !activePresetId) {
      setActivePresetId(def.id);
    }
  }, [questService, activePresetId]);

  useEffect(() => {
    refreshPresets();
  }, [refreshPresets]);

  const selectedBookIds = useMemo(
    () => questService.resolveTargetBookIds(books, presets, activePresetId),
    [books.map(b => b.id).join(','), presets.map(p => p.id).join(','), activePresetId]
  );

  return {
    presets,
    activePresetId,
    setActivePresetId,
    selectedBookIds,
    refreshPresets,
  };
}
