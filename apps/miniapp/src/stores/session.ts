import { defineStore } from 'pinia';
import { ref } from 'vue';
import { z } from 'zod';

const SESSION_KEY = 'moodRecord.testSession';
const SETTINGS_KEY = 'moodRecord.settings';

const storedSessionSchema = z.object({
  accessToken: z.string().optional(),
  displayCode: z.string().optional(),
});

const storedSettingsSchema = z.object({
  vibrationEnabled: z.boolean().optional(),
  reducedMotion: z.boolean().optional(),
  companion: z.enum(['fawn', 'tit-bird']).optional(),
  plant: z.enum(['leaf-tree', 'camellia-shrub']).optional(),
});

export type Companion = 'fawn' | 'tit-bird';
export type Plant = 'leaf-tree' | 'camellia-shrub';

export const useSessionStore = defineStore('session', () => {
  const accessToken = ref('');
  const displayCode = ref('');
  const vibrationEnabled = ref(true);
  const reducedMotion = ref(false);
  const companion = ref<Companion>('fawn');
  const plant = ref<Plant>('leaf-tree');

  function restore(): void {
    const stored = storedSessionSchema.safeParse(uni.getStorageSync(SESSION_KEY)).data;
    accessToken.value = stored?.accessToken ?? '';
    displayCode.value = stored?.displayCode ?? '';
    const settings = storedSettingsSchema.safeParse(uni.getStorageSync(SETTINGS_KEY)).data;
    vibrationEnabled.value = settings?.vibrationEnabled ?? true;
    reducedMotion.value = settings?.reducedMotion ?? false;
    companion.value = settings?.companion ?? 'fawn';
    plant.value = settings?.plant ?? 'leaf-tree';
  }

  function setSession(token: string, code: string): void {
    accessToken.value = token;
    displayCode.value = code;
    uni.setStorageSync(SESSION_KEY, { accessToken: token, displayCode: code });
  }

  function clearSession(): void {
    accessToken.value = '';
    displayCode.value = '';
    uni.removeStorageSync(SESSION_KEY);
  }

  function saveSettings(): void {
    uni.setStorageSync(SETTINGS_KEY, {
      vibrationEnabled: vibrationEnabled.value,
      reducedMotion: reducedMotion.value,
      companion: companion.value,
      plant: plant.value,
    });
  }

  return {
    accessToken,
    displayCode,
    vibrationEnabled,
    reducedMotion,
    companion,
    plant,
    restore,
    setSession,
    clearSession,
    saveSettings,
  };
});
