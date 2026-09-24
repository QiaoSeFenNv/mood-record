<script setup lang="ts">
import type { Resonance } from '@mood-record/contracts';

defineProps<{ resonance: Resonance | null; moodName?: string }>();
</script>

<template>
  <view v-if="resonance" class="resonance">
    <view class="heading">今天 · 此刻共鸣</view>
    <view v-if="resonance.displayCount !== null" class="count">
      约 {{ resonance.displayCount }} 人，也记录了{{ moodName }}
    </view>
    <view v-else class="count">今天还没有其他人记录同一段心情</view>
    <view class="muted">你的心情值得被看见。基于匿名活跃趋势估算，并非精确实时人数。</view>
    <view class="muted">测试环境的记录仅与测试用户聚合。</view>
  </view>
</template>

<style scoped>
.resonance {
  padding: 32rpx;
  border-top: 1rpx solid #d5e3da;
  background: #edf5ed;
}
.heading {
  font-size: 28rpx;
  color: #315e59;
}
.count {
  font-size: 38rpx;
  line-height: 1.35;
  margin: 18rpx 0;
  color: #173f3c;
}
</style>
