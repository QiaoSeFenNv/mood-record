<script setup lang="ts">
import { computed } from 'vue';
import type { MoodRecord } from '@mood-record/contracts';

const props = defineProps<{ records: MoodRecord[] }>();
const emit = defineEmits<{ select: [record: MoodRecord] }>();

const points = computed(() =>
  props.records.map((record) => {
    const local = new Date(
      Date.parse(record.occurredAtUtc) - record.timezoneOffsetMinutes * 60_000,
    );
    const minutes = local.getUTCHours() * 60 + local.getUTCMinutes();
    return { record, left: `${(minutes / 1439) * 100}%` };
  }),
);
</script>

<template>
  <view class="timeline-section">
    <view class="title">今天 · 24 小时</view>
    <view class="timeline">
      <view class="line" />
      <view
        v-for="point in points"
        :key="point.record.id"
        class="point"
        :style="{ left: point.left }"
        @tap="emit('select', point.record)"
      />
    </view>
    <view class="labels"
      ><text>00:00</text><text>06:00</text><text>12:00</text><text>18:00</text
      ><text>24:00</text></view
    >
    <view v-if="!records.length" class="muted empty">今天还没有记录。</view>
    <view v-else class="muted">轻触圆点，查看当时的心情。</view>
  </view>
</template>

<style scoped>
.timeline-section {
  border-top: 1rpx solid #d5e3da;
  padding: 30rpx 32rpx;
}
.title {
  font-size: 30rpx;
  font-weight: 600;
  color: #173f3c;
}
.timeline {
  position: relative;
  margin: 40rpx 12rpx 22rpx;
  height: 42rpx;
}
.line {
  position: absolute;
  top: 18rpx;
  left: 0;
  right: 0;
  height: 4rpx;
  background: #8fb8a7;
  opacity: 0.65;
}
.point {
  position: absolute;
  top: 5rpx;
  width: 30rpx;
  height: 30rpx;
  margin-left: -15rpx;
  border-radius: 50%;
  background: #e3a774;
  border: 4rpx solid #f7fbf5;
}
.labels {
  display: flex;
  justify-content: space-between;
  color: #587973;
  font-size: 19rpx;
}
.empty {
  margin-top: 20rpx;
}
</style>
