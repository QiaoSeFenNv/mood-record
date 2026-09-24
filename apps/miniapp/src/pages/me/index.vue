<script setup lang="ts">
import { ref } from 'vue';

import { api, exportCsvUrl } from '../../api/client';
import { useSessionStore } from '../../stores/session';

const session = useSessionStore();
const busy = ref(false);
const message = ref('');
const devAuthUi = __DEV_AUTH_UI__;

function switchValue(event: Event): boolean {
  return Boolean((event as unknown as { detail: { value: boolean } }).detail.value);
}

function setVibration(event: Event): void {
  session.vibrationEnabled = switchValue(event);
  session.saveSettings();
}

function setMotion(event: Event): void {
  session.reducedMotion = switchValue(event);
  session.saveSettings();
}

function setCompanion(value: 'fawn' | 'tit-bird'): void {
  session.companion = value;
  session.saveSettings();
}

function setPlant(value: 'leaf-tree' | 'camellia-shrub'): void {
  session.plant = value;
  session.saveSettings();
}

async function exportCsv(): Promise<void> {
  if (!session.accessToken || busy.value) return;
  busy.value = true;
  try {
    if (typeof document !== 'undefined') {
      const response = await fetch(exportCsvUrl(), {
        headers: { Authorization: `Bearer ${session.accessToken}` },
      });
      if (!response.ok) throw new Error('导出未完成，请稍后重试');
      const url = URL.createObjectURL(await response.blob());
      const link = document.createElement('a');
      link.href = url;
      link.download = 'mood-records.csv';
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
      message.value = 'CSV 已下载。';
    } else {
      const result = await uni.downloadFile({
        url: exportCsvUrl(),
        header: { Authorization: `Bearer ${session.accessToken}` },
      });
      if (result.statusCode !== 200) throw new Error('导出未完成，请稍后重试');
      await uni.openDocument({ filePath: result.tempFilePath, showMenu: true });
      message.value = '已生成 CSV，可在预览中保存或分享。';
    }
  } catch (error) {
    message.value = error instanceof Error ? error.message : '导出未完成';
  } finally {
    busy.value = false;
  }
}

function confirmDanger(title: string, content: string, action: () => Promise<void>): void {
  if (busy.value) return;
  uni.showModal({
    title,
    content,
    confirmColor: '#a85b65',
    success: (result) => {
      if (result.confirm) void execute(action);
    },
  });
}

async function execute(action: () => Promise<void>): Promise<void> {
  busy.value = true;
  try {
    await action();
  } catch (error) {
    message.value = error instanceof Error ? error.message : '操作未完成，请重试';
  } finally {
    busy.value = false;
  }
}

function clearAll(): void {
  confirmDanger(
    '清除全部记录？',
    '在线记录会立即删除，无法由你恢复。隔离备份最迟 30 天清理。',
    async () => {
      await api.clearMoods();
      message.value = '全部记录已清除。';
    },
  );
}

function deleteAccount(): void {
  confirmDanger(
    '注销测试身份？',
    '这会删除当前测试身份及其记录，并退出登录。此操作无法恢复。',
    async () => {
      await api.deleteAccount();
      session.clearSession();
      message.value = '测试身份已注销。';
    },
  );
}

function openDevLogin(): void {
  void uni.navigateTo({ url: '/pages/dev-login/index' });
}
</script>

<template>
  <view class="screen">
    <view class="title">陪伴与记录</view>
    <view class="muted">测试环境 · {{ session.displayCode || '未登录' }}</view>
    <view class="section-block">
      <view class="section">陪伴你的风景</view>
      <view class="setting-label">动物伙伴</view>
      <view class="choices">
        <view
          class="choice"
          :class="{ chosen: session.companion === 'fawn' }"
          @tap="setCompanion('fawn')"
          ><image src="/static/scene/fawn.png" mode="aspectFit" /><text>小鹿</text></view
        >
        <view
          class="choice"
          :class="{ chosen: session.companion === 'tit-bird' }"
          @tap="setCompanion('tit-bird')"
          ><image src="/static/scene/tit-bird.png" mode="aspectFit" /><text>山雀</text></view
        >
      </view>
      <view class="setting-label">心情植物</view>
      <view class="choices">
        <view
          class="choice"
          :class="{ chosen: session.plant === 'leaf-tree' }"
          @tap="setPlant('leaf-tree')"
          ><image src="/static/scene/leaf-tree.png" mode="aspectFit" /><text>小叶树</text></view
        >
        <view
          class="choice"
          :class="{ chosen: session.plant === 'camellia-shrub' }"
          @tap="setPlant('camellia-shrub')"
          ><image src="/static/scene/camellia-shrub.png" mode="aspectFit" /><text
            >山茶花</text
          ></view
        >
      </view>
      <view class="muted">外观只保存在本机，换设备不会同步；心情记录不受影响。</view>
    </view>
    <view class="section-block">
      <view class="section">体验设置</view>
      <view class="setting"
        ><text>轻触觉反馈</text><switch :checked="session.vibrationEnabled" @change="setVibration"
      /></view>
      <view class="setting"
        ><text>低动效模式</text><switch :checked="session.reducedMotion" @change="setMotion"
      /></view>
    </view>
    <view class="section-block">
      <view class="section">数据控制</view>
      <button class="action" :disabled="!session.accessToken || busy" @tap="exportCsv">
        导出我的 CSV
      </button>
      <button class="danger" :disabled="!session.accessToken || busy" @tap="clearAll">
        清除全部记录
      </button>
      <button class="danger" :disabled="!session.accessToken || busy" @tap="deleteAccount">
        注销测试身份
      </button>
    </view>
    <view class="section-block"
      ><view class="section">记录与隐私</view
      ><view class="muted"
        >个人心情记录默认私密。共鸣仅使用匿名的同段去重人数，展示值是趋势估算，不展示他人的记录。</view
      ></view
    >
    <view v-if="message" class="card muted">{{ message }}</view>
    <button v-if="devAuthUi" class="action" @tap="openDevLogin">切换测试身份</button>
  </view>
</template>

<style scoped>
.title {
  font-size: 42rpx;
  font-weight: 700;
  margin-bottom: 14rpx;
}
.screen {
  background: #f7fbf5;
  min-height: 100vh;
}
.section {
  font-size: 31rpx;
  font-weight: 700;
  color: #173f3c;
  margin-bottom: 20rpx;
}
.section-block {
  border-top: 1rpx solid #d5e3da;
  padding: 30rpx 0;
}
.setting-label {
  color: #315e59;
  font-size: 25rpx;
  margin: 20rpx 0 14rpx;
}
.choices {
  display: flex;
  gap: 18rpx;
}
.choice {
  display: flex;
  align-items: center;
  gap: 15rpx;
  width: 50%;
  padding: 10rpx;
  border: 2rpx solid #d5e3da;
  border-radius: 8rpx;
  color: #315e59;
  font-size: 25rpx;
}
.choice.chosen {
  border-color: #39807a;
  background: #e5f3e9;
}
.choice image {
  width: 74rpx;
  height: 74rpx;
}
.setting {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 18rpx 0;
}
.danger {
  margin-top: 24rpx;
  background: transparent;
  color: #a24951;
  border: 1rpx solid #b8797e;
  border-radius: 8rpx;
}
</style>
