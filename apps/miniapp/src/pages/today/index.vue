<script setup lang="ts">
import { computed, ref } from 'vue';
import { onHide, onShow } from '@dcloudio/uni-app';
import type { MoodRecord, Resonance } from '@mood-record/contracts';

import { api, ApiRequestError } from '../../api/client';
import DayTimeline from '../../components/DayTimeline.vue';
import MoodTorque from '../../components/MoodTorque.vue';
import MoodTree from '../../components/MoodTree.vue';
import ResonanceCard from '../../components/ResonanceCard.vue';
import UndoBar from '../../components/UndoBar.vue';
import { useSessionStore } from '../../stores/session';

const session = useSessionStore();
const records = ref<MoodRecord[]>([]);
const previewTorque = ref<number | null>(null);
const selected = ref<MoodRecord | null>(null);
const resonance = ref<Resonance | null>(null);
const savedMoodName = ref('');
const undoId = ref<string | null>(null);
const pending = ref<{ torque: number; clientMutationId: string } | null>(null);
const busy = ref(false);
const errorMessage = ref('');
const hasSession = computed(() => !!session.accessToken);

function timezoneOffset(): number {
  return new Date().getTimezoneOffset();
}

async function refresh(): Promise<void> {
  if (!hasSession.value) return;
  try {
    const today = await api.today(timezoneOffset());
    records.value = today.records;
    if (resonance.value && records.value.length) {
      resonance.value = await api.resonance(
        records.value[records.value.length - 1]!.moodBand,
        timezoneOffset(),
      );
    }
    errorMessage.value = '';
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : '今天的数据暂时无法读取';
  }
}

onShow(() => {
  void refresh();
});
onHide(() => {
  undoId.value = null;
  previewTorque.value = null;
});

async function commit(torque: number): Promise<void> {
  if (busy.value) return;
  pending.value = { torque, clientMutationId: generateMutationId() };
  await retry();
}

function generateMutationId(): string {
  const bytes = new Uint8Array(16);
  if (globalThis.crypto?.getRandomValues) globalThis.crypto.getRandomValues(bytes);
  else {
    // 微信运行时没有 Web Crypto 时，使用平台随机 UUID 生成接口的可用降级。
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (character) => {
      const random = Math.floor(Math.random() * 16);
      return (character === 'x' ? random : (random & 3) | 8).toString(16);
    });
  }
  bytes[6] = (bytes[6]! & 0x0f) | 0x40;
  bytes[8] = (bytes[8]! & 0x3f) | 0x80;
  const hex = [...bytes].map((byte) => byte.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

async function retry(): Promise<void> {
  if (!pending.value || busy.value) return;
  busy.value = true;
  errorMessage.value = '';
  try {
    const result = await api.createMood({
      torque: pending.value.torque,
      timezoneOffsetMinutes: timezoneOffset(),
      clientMutationId: pending.value.clientMutationId,
    });
    pending.value = null;
    savedMoodName.value = result.record.moodName;
    resonance.value = result.resonance;
    undoId.value = result.record.id;
    await refresh();
  } catch (error) {
    errorMessage.value =
      error instanceof ApiRequestError ? error.message : '尚未保存，请检查网络后重试';
  } finally {
    busy.value = false;
  }
}

async function undo(id: string): Promise<void> {
  undoId.value = null;
  try {
    await api.deleteMood(id);
    selected.value = null;
    resonance.value = null;
    await refresh();
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : '撤销未完成，请稍后重试';
    await refresh();
  }
}

function confirmDelete(): void {
  if (!selected.value) return;
  const record = selected.value;
  uni.showModal({
    title: '删除这条记录？',
    content: '删除后无法恢复，今天的树与回顾会重新生成。',
    success: (result) => {
      if (result.confirm) void undo(record.id);
    },
  });
}

function openDevLogin(): void {
  void uni.navigateTo({ url: '/pages/dev-login/index' });
}
</script>

<template>
  <view class="screen">
    <view class="hero-title">今天，心情在这里生长</view>
    <view class="muted">不需要解释，也不必给自己打分。</view>
    <view class="test-pill">测试环境 · {{ session.displayCode || '未登录' }}</view>

    <template v-if="hasSession">
      <MoodTree
        :records="records"
        :preview-torque="previewTorque"
        :reduced-motion="session.reducedMotion"
      />
      <MoodTorque
        :disabled="busy || !!pending"
        :vibration-enabled="session.vibrationEnabled && !session.reducedMotion"
        @preview="previewTorque = $event"
        @commit="commit"
      />
      <view v-if="busy" class="muted">正在保存这次心情…</view>
      <view v-if="errorMessage" class="card error">
        {{ errorMessage }}
        <button v-if="pending" class="action" @tap="retry">重试保存</button>
      </view>
      <ResonanceCard :resonance="resonance" :mood-name="savedMoodName" />
      <DayTimeline :records="records" @select="selected = $event" />
      <view v-if="selected" class="card">
        <view
          >{{ selected.moodName }} · {{ selected.torque > 0 ? '+' : '' }}{{ selected.torque }}</view
        >
        <view class="muted">{{ new Date(selected.occurredAtUtc).toLocaleString() }}</view>
        <button class="danger" @tap="confirmDelete">删除这条记录</button>
      </view>
      <UndoBar :record-id="undoId" @undo="undo" />
    </template>
    <view v-else class="card">
      <view>先选择一个本地测试身份，再记录此刻。</view>
      <button class="action" @tap="openDevLogin">进入测试身份</button>
    </view>
  </view>
</template>

<style scoped>
.hero-title {
  font-size: 42rpx;
  font-weight: 700;
  margin-bottom: 12rpx;
}
.test-pill {
  display: inline-block;
  color: #e8d8a5;
  background: #465947;
  padding: 8rpx 18rpx;
  border-radius: 20rpx;
  font-size: 22rpx;
  margin: 22rpx 0;
}
.error {
  color: #f2c2c5;
}
</style>
