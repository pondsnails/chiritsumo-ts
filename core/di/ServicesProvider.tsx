import React, { createContext, useContext, useMemo, ReactNode } from 'react';
import { DrizzleCardRepository } from '@core/repository/CardRepository';
import { DrizzleBookRepository } from '@core/repository/BookRepository';
import { DrizzleInventoryPresetRepository } from '@core/repository/InventoryPresetRepository';
import { QuestService } from '@core/services/QuestService';

interface ServicesContextValue {
  cardRepo: DrizzleCardRepository;
  bookRepo: DrizzleBookRepository;
  presetRepo: DrizzleInventoryPresetRepository;
  questService: QuestService;
}

const ServicesContext = createContext<ServicesContextValue | null>(null);

export const ServicesProvider = ({ children }: { children: ReactNode }) => {
  const value = useMemo(() => {
    const cardRepo = new DrizzleCardRepository();
    const bookRepo = new DrizzleBookRepository();
    const presetRepo = new DrizzleInventoryPresetRepository();
    const questService = new QuestService(cardRepo, bookRepo, presetRepo);
    return { cardRepo, bookRepo, presetRepo, questService };
  }, []);
  return <ServicesContext.Provider value={value}>{children}</ServicesContext.Provider>;
};

export const useServices = (): ServicesContextValue => {
  const ctx = useContext(ServicesContext);
  if (!ctx) {
    throw new Error('useServices must be used within ServicesProvider');
  }
  return ctx;
};
