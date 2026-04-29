import { db } from '../db'
import type { AppSettings } from '../types/settings'
import { now } from '../utils/date'

export const DEFAULT_SETTINGS_ID = 'default'

export function createDefaultSettings(): AppSettings {
  const timestamp = now()

  return {
    id: DEFAULT_SETTINGS_ID,
    hideAmount: false,
    darkMode: false,
    amountDecimalPlaces: 2,
    showDeletedAccounts: false,
    createdAt: timestamp,
    updatedAt: timestamp
  }
}

function normalizeSettings(settings: Partial<AppSettings>): AppSettings {
  const defaults = createDefaultSettings()

  return {
    ...defaults,
    ...settings,
    id: settings.id ?? DEFAULT_SETTINGS_ID,
    hideAmount: settings.hideAmount ?? false,
    darkMode: settings.darkMode ?? false,
    amountDecimalPlaces: settings.amountDecimalPlaces ?? 2,
    showDeletedAccounts: settings.showDeletedAccounts ?? false,
    createdAt: settings.createdAt ?? defaults.createdAt,
    updatedAt: settings.updatedAt ?? defaults.updatedAt
  }
}

export async function ensureSettings(): Promise<AppSettings> {
  const existing = await db.settings.get(DEFAULT_SETTINGS_ID)

  if (!existing) {
    const defaultSettings = createDefaultSettings()
    await db.settings.put(defaultSettings)
    return defaultSettings
  }

  const normalized = normalizeSettings(existing)
  if (
    normalized.amountDecimalPlaces !== existing.amountDecimalPlaces ||
    normalized.showDeletedAccounts !== existing.showDeletedAccounts
  ) {
    await db.settings.put(normalized)
  }

  return normalized
}

export async function updateSettings(patch: Partial<AppSettings>): Promise<AppSettings> {
  const current = await ensureSettings()
  const updated: AppSettings = {
    ...current,
    ...patch,
    id: DEFAULT_SETTINGS_ID,
    updatedAt: now()
  }

  await db.settings.put(updated)
  return updated
}
