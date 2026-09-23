<script setup lang="ts">
import { ref } from 'vue';

import { api } from '../../api/client';
import { useSessionStore } from '../../stores/session';

const session = useSessionStore();
const testUserCode = ref(session.displayCode || 'test-a');
const errorMessage = ref('');
const busy = ref(false);
const devAuthUi = __DEV_AUTH_UI__;

async function login(): Promise<void> {
  if (!__DEV_AUTH_UI__ || busy.value) return;
  busy.value = true;
  try {
    const result = await api.devSession(testUserCode.value);
    session.setSession(result.accessToken, result.user.displayCode);
    void uni.switchTab({ url: '/pages/today/index' });
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : '测试身份暂时不可用';
  } finally {
    busy.value = false;
  }
}
</script>

<template>
  <view class="screen">
    <view class="title">本地测试身份</view>
    <view class="card" v-if="devAuthUi">
      <view class="muted"
        >仅供本地开发验证；不同代码代表相互隔离的测试用户，不是真实微信登录。</view
      >
      <input v-model="testUserCode" class="input" maxlength="40" placeholder="例如 test-a" />
      <button class="action" :loading="busy" @tap="login">进入测试环境</button>
      <view v-if="errorMessage" class="muted">{{ errorMessage }}</view>
    </view>
    <view v-else class="card">测试身份入口在正式构建中不可用。</view>
  </view>
</template>

<style scoped>
.title {
  font-size: 42rpx;
  font-weight: 700;
}
.input {
  background: #dbe9df;
  color: #1d3638;
  margin: 35rpx 0;
  padding: 24rpx;
  border-radius: 18rpx;
}
</style>
