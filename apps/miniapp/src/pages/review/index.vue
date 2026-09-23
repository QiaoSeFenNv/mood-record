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
    <view class="title">七天心情森林</view>
    <view class="muted">每一天都按真实记录留下痕迹，没有记录的日子也可以安静存在。</view>
    <view class="test-pill">测试环境</view>
    <view v-if="errorMessage" class="card"
      >{{ errorMessage }}<button class="action" @tap="refresh">重试</button></view
    >
    <view v-if="weekly" class="card">
      <view class="forest">
        <view v-for="day in weekly.days" :key="day.date" class="forest-day">
          <view
            class="forest-tree"
            :class="{ active: day.recordCount > 0 }"
            :style="{ opacity: day.recordCount ? Math.min(1, 0.45 + day.recordCount * 0.13) : 0.3 }"
            >♧</view
          >
          <view class="small">{{ day.date.slice(5) }}</view>
          <view class="small">{{ day.recordCount }} 次</view>
        </view>
      </view>
    </view>
    <view v-if="weekly" class="card">
      <view class="section">七天趋势</view>
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
    <view v-if="calendar" class="card">
      <view class="section">{{ monthLabel }} · 日历</view>
      <view class="calendar">
        <view v-for="day in calendar.days" :key="day.date" class="calendar-day">
          {{ day.date.slice(-2) }}<text class="small">{{ day.recordCount }} 次</text>
        </view>
      </view>
      <view v-if="!calendar.days.length" class="muted">这个月还没有记录。</view>
    </view>
    <view v-if="weekly" class="card">
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
}
.test-pill {
  color: #e8d8a5;
  font-size: 22rpx;
  margin: 22rpx 0;
}
.section {
  font-size: 32rpx;
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
  font-size: 64rpx;
  color: #8dabaa;
}
.forest-tree.active {
  color: #d4e9b8;
  text-shadow: 0 0 20rpx #a4efcd;
}
.small {
  font-size: 20rpx;
  color: #a9c0bf;
  display: block;
}
.trend-row {
  display: flex;
  align-items: center;
  gap: 15rpx;
  font-size: 22rpx;
  margin: 17rpx 0;
}
.trend-track {
  position: relative;
  flex: 1;
  height: 4rpx;
  background: linear-gradient(90deg, #7789c9, #aac7ba, #eac981);
}
.trend-dot {
  position: absolute;
  top: -9rpx;
  width: 20rpx;
  height: 20rpx;
  border-radius: 50%;
  background: #f7e5b8;
}
.calendar {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 12rpx;
}
.calendar-day {
  text-align: center;
  border-radius: 16rpx;
  padding: 12rpx 2rpx;
  background: #4a6d62;
}
.insight {
  margin: 12rpx 0;
}
</style>
