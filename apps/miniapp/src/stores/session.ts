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
});

export const useSessionStore = defineStore('session', () => {
  const accessToken = ref('');
  const displayCode = ref('');
  const vibrationEnabled = ref(true);
  const reducedMotion = ref(false);

  function restore(): void {
    const stored = storedSessionSchema.safeParse(uni.getStorageSync(SESSION_KEY)).data;
    accessToken.value = stored?.accessToken ?? '';
    displayCode.value = stored?.displayCode ?? '';
    const settings = storedSettingsSchema.safeParse(uni.getStorageSync(SETTINGS_KEY)).data;
    vibrationEnabled.value = settings?.vibrationEnabled ?? true;
    reducedMotion.value = settings?.reducedMotion ?? false;
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
    });
  }

  return {
    accessToken,
    displayCode,
    vibrationEnabled,
    reducedMotion,
    restore,
    setSession,
    clearSession,
    saveSettings,
  };
});
