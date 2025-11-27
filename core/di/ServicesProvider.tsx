import React, { createContext, useContext, useMemo, ReactNode } from 'react';
import { DrizzleCardRepository } from '@core/repository/CardRepository';
import { DrizzleBookRepository } from '@core/repository/BookRepository';
import { DrizzleInventoryPresetRepository } from '@core/repository/InventoryPresetRepository';
import { DrizzleLedgerRepository } from '@core/repository/LedgerRepository';
import { DrizzleSystemSettingsRepository } from '@core/repository/SystemSettingsRepository';
import { QuestService } from '@core/services/QuestService';
import { LearningSessionService } from '@core/services/LearningSessionService';

interface ServicesContextValue {
  cardRepo: DrizzleCardRepository;
  bookRepo: DrizzleBookRepository;
  presetRepo: DrizzleInventoryPresetRepository;
  ledgerRepo: DrizzleLedgerRepository;
  settingsRepo: DrizzleSystemSettingsRepository;
  questService: QuestService;
  learningSessionService: LearningSessionService;
}

const ServicesContext = createContext<ServicesContextValue | null>(null);

export const ServicesProvider = ({ children }: { children: ReactNode }) => {
  const value = useMemo(() => {
    const cardRepo = new DrizzleCardRepository();
    const bookRepo = new DrizzleBookRepository();
    const presetRepo = new DrizzleInventoryPresetRepository();
    const ledgerRepo = new DrizzleLedgerRepository();
    const settingsRepo = new DrizzleSystemSettingsRepository();
    const questService = new QuestService(cardRepo, bookRepo, presetRepo);
    const learningSessionService = new LearningSessionService(cardRepo, bookRepo);
    return { cardRepo, bookRepo, presetRepo, ledgerRepo, settingsRepo, questService, learningSessionService };
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
