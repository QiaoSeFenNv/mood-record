<script setup lang="ts">
import { computed, ref } from 'vue';
import { onShow } from '@dcloudio/uni-app';
import type { CalendarResponse, WeeklyResponse } from '@mood-record/contracts';

import { api } from '../../api/client';
import { useSessionStore } from '../../stores/session';

const session = useSessionStore();
const weekly = ref<WeeklyResponse | null>(null);
const calendar = ref<CalendarResponse | null>(null);
const errorMessage = ref('');
const today = new Date();
const monthLabel = computed(
  () =>
    `${calendar.value?.year ?? today.getFullYear()} 年 ${calendar.value?.month ?? today.getMonth() + 1} 月`,
);

async function refresh(): Promise<void> {
  if (!session.accessToken) return;
  try {
    const offset = new Date().getTimezoneOffset();
    [weekly.value, calendar.value] = await Promise.all([
      api.weekly(offset),
      api.calendar(today.getFullYear(), today.getMonth() + 1, offset),
    ]);
    errorMessage.value = '';
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : '回顾暂时无法读取';
  }
}

onShow(() => {
  void refresh();
});
</script>

<template>
  <view class="screen">
    <view class="title">过去七天</view>
    <view class="muted">看看这一周，心情如何经过。</view>
    <view class="test-pill">测试环境</view>
    <view v-if="errorMessage" class="card"
      >{{ errorMessage }}<button class="action" @tap="refresh">重试</button></view
    >
    <view v-if="weekly" class="review-section">
      <view class="section">最近七天</view>
      <view class="forest">
        <view v-for="day in weekly.days" :key="day.date" class="forest-day">
          <image
            class="forest-tree"
            :class="{ inactive: !day.recordCount }"
            :src="
              session.plant === 'camellia-shrub'
                ? '/static/scene/camellia-shrub.png'
                : '/static/scene/leaf-tree.png'
            "
            mode="aspectFit"
          />
          <view class="small">{{ day.date.slice(5) }}</view>
          <view class="small">{{ day.recordCount }} 次</view>
        </view>
      </view>
    </view>
    <view v-if="weekly" class="review-section">
      <view class="section">七天趋势</view>
      <view class="trend-scale">扭矩范围 −100（低落）到 +100（愉快）</view>
      <view v-for="day in weekly.days" :key="day.date" class="trend-row">
        <text>{{ day.date.slice(5) }}</text>
        <view class="trend-track"
          ><view
            v-if="day.averageTorque !== null"
            class="trend-dot"
            :style="{ left: `${(day.averageTorque + 100) / 2}%` }"
        /></view>
        <text>{{ day.averageTorque === null ? '—' : day.averageTorque }}</text>
      </view>
    </view>
    <view v-if="calendar" class="review-section">
      <view class="section">{{ monthLabel }} · 有记录的日期</view>
      <view class="calendar">
        <view v-for="day in calendar.days" :key="day.date" class="calendar-day">
          {{ day.date.slice(-2) }}<text class="small">{{ day.recordCount }} 次</text>
        </view>
      </view>
      <view v-if="!calendar.days.length" class="muted">这个月还没有记录。</view>
    </view>
    <view v-if="weekly" class="review-section">
      <view class="section">一些观察</view>
      <view v-for="insight in weekly.insights" :key="insight" class="muted insight">{{
        insight
      }}</view>
    </view>
  </view>
</template>

<style scoped>
.title {
  font-size: 42rpx;
  font-weight: 700;
  margin-bottom: 12rpx;
  color: #173f3c;
}
.screen {
  background: #f7fbf5;
  min-height: 100vh;
}
.review-section {
  padding: 30rpx 0;
  border-top: 1rpx solid #d5e3da;
  margin-top: 26rpx;
}
.test-pill {
  color: #587973;
  font-size: 22rpx;
  margin: 22rpx 0;
}
.section {
  font-size: 32rpx;
  color: #173f3c;
  font-weight: 700;
  margin-bottom: 25rpx;
}
.forest {
  display: flex;
  justify-content: space-between;
}
.forest-day {
  text-align: center;
  width: 14%;
}
.forest-tree {
  width: 72rpx;
  height: 92rpx;
}
.forest-tree.inactive {
  opacity: 0.3;
}
.small {
  font-size: 20rpx;
  color: #587973;
  display: block;
}
.trend-row {
  display: flex;
  align-items: center;
  gap: 15rpx;
  font-size: 22rpx;
  margin: 17rpx 0;
}
.trend-scale {
  color: #587973;
  font-size: 21rpx;
  margin: -12rpx 0 18rpx;
}
.trend-track {
  position: relative;
  flex: 1;
  height: 4rpx;
  background: #a1bfb4;
}
.trend-dot {
  position: absolute;
  top: -9rpx;
  width: 20rpx;
  height: 20rpx;
  border-radius: 50%;
  background: #39807a;
}
.calendar {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 12rpx;
}
.calendar-day {
  text-align: center;
  border-radius: 6rpx;
  padding: 12rpx 2rpx;
  background: #e3eee8;
}
.insight {
  margin: 12rpx 0;
}
</style>
