<script setup lang="ts">
import { computed } from 'vue';
import type { MoodRecord } from '@mood-record/contracts';
import { MoodBand, torqueToMoodBand } from '@mood-record/domain';

const props = defineProps<{
  records: MoodRecord[];
  previewTorque?: number | null;
  reducedMotion?: boolean;
}>();

const traceNames: Record<MoodBand, string> = {
  [MoodBand.VERY_LOW]: 'blue-rain',
  [MoodBand.LOW]: 'mist',
  [MoodBand.CALM]: 'aura',
  [MoodBand.HAPPY]: 'gold-leaf',
  [MoodBand.VERY_HAPPY]: 'flower',
};

function stableSlot(id: string): number {
  let hash = 0;
  for (const character of id) hash = (hash * 31 + character.charCodeAt(0)) >>> 0;
  return hash % 9;
}

const traces = computed(() => {
  const grouped = new Map<MoodBand, MoodRecord[]>();
  for (const record of props.records) {
    grouped.set(record.moodBand, [...(grouped.get(record.moodBand) ?? []), record]);
  }
  return [...grouped].flatMap(([band, records]) => {
    const slots = new Set(records.map((record) => stableSlot(record.id)));
    return [...slots].map((slot) => ({
      band,
      slot,
      key: `${band}-${slot}`,
      count: records.length,
    }));
  });
});

const previewBand = computed(() =>
  props.previewTorque === null || props.previewTorque === undefined
    ? null
    : torqueToMoodBand(props.previewTorque),
);
</script>

<template>
  <view class="scene" :class="{ still: reducedMotion }" aria-label="今天的心情树">
    <view class="night-glow" />
    <view class="root-glow" />
    <view class="tree-trunk" />
    <view class="branch branch-left" />
    <view class="branch branch-right" />
    <view class="canopy canopy-left" />
    <view class="canopy canopy-center" />
    <view class="canopy canopy-right" />
    <view
      v-for="trace in traces"
      :key="trace.key"
      class="trace"
      :class="traceNames[trace.band]"
      :style="{
        left: `${15 + (trace.slot % 3) * 29}%`,
        top: `${16 + Math.floor(trace.slot / 3) * 19}%`,
        opacity: Math.min(0.95, 0.45 + trace.count * 0.1),
      }"
    />
    <view v-if="previewBand" class="trace preview" :class="traceNames[previewBand]" />
    <view class="ground" />
  </view>
</template>

<style scoped>
.scene {
  height: 610rpx;
  position: relative;
  overflow: hidden;
  border-radius: 38rpx;
  background: radial-gradient(ellipse at 50% 45%, #3c5c63 0%, #213c49 40%, #142a36 78%);
  isolation: isolate;
}
.night-glow {
  position: absolute;
  inset: 6%;
  border-radius: 50%;
  background: radial-gradient(circle, #a4ddd32b, transparent 65%);
  animation: breathe 5s infinite alternate;
}
.ground {
  position: absolute;
  left: 0;
  right: 0;
  bottom: -30rpx;
  height: 95rpx;
  border-radius: 50%;
  background: radial-gradient(ellipse, #6e998d, #29464b 70%, transparent);
}
.root-glow {
  position: absolute;
  bottom: 30rpx;
  left: 33%;
  width: 34%;
  height: 80rpx;
  border-radius: 50%;
  background: #a6ebcf70;
  filter: blur(20rpx);
}
.tree-trunk {
  position: absolute;
  left: 48%;
  top: 41%;
  width: 5%;
  height: 52%;
  border-radius: 60% 50% 12% 12%;
  background: linear-gradient(90deg, #486061, #b0ab8e 55%, #526c64);
  transform: rotate(-2deg);
  box-shadow: 0 0 24rpx #b8d2b06a;
}
.branch {
  position: absolute;
  height: 5%;
  width: 29%;
  top: 52%;
  border-top: 16rpx solid #879d87;
  border-radius: 50%;
}
.branch-left {
  right: 51%;
  transform: rotate(25deg);
}
.branch-right {
  left: 50%;
  transform: rotate(-27deg);
}
.canopy {
  position: absolute;
  border-radius: 50%;
  background: radial-gradient(circle at 40% 38%, #8ab8a789, #366b6d 60%, #27495e9c 84%);
  box-shadow:
    inset 0 0 42rpx #d7ebd183,
    0 0 32rpx #91d6c58a;
}
.canopy-left {
  width: 40%;
  height: 43%;
  left: 14%;
  top: 20%;
}
.canopy-center {
  width: 48%;
  height: 48%;
  left: 27%;
  top: 10%;
}
.canopy-right {
  width: 41%;
  height: 43%;
  right: 12%;
  top: 21%;
}
.trace {
  position: absolute;
  width: 70rpx;
  height: 70rpx;
  border-radius: 50%;
  z-index: 2;
  animation: glimmer 2.8s infinite alternate;
}
.blue-rain {
  background: radial-gradient(circle, #cad4f9 8%, #647ed1a8 22%, transparent 69%);
  box-shadow: 0 16rpx 21rpx #6d80c1aa;
}
.mist {
  background: radial-gradient(circle, #a5c4f0a0, #819dce48, transparent 70%);
  filter: blur(6rpx);
}
.aura {
  background: radial-gradient(circle, #c7f0c4, #8ed7bb65, transparent 70%);
}
.gold-leaf {
  background: radial-gradient(ellipse, #ffe9a5, #eac46e93 30%, transparent 68%);
  transform: rotate(30deg);
}
.flower {
  background: radial-gradient(circle, #fff9d2 9%, #f7d69b 16%, #f9d6ac83 44%, transparent 70%);
  box-shadow: 0 0 25rpx #f6dcae;
}
.preview {
  left: 46%;
  top: 25%;
  width: 110rpx;
  height: 110rpx;
  opacity: 0.85;
}
.still *,
.still {
  animation: none !important;
}
@keyframes breathe {
  from {
    opacity: 0.5;
  }
  to {
    opacity: 1;
  }
}
@keyframes glimmer {
  from {
    opacity: 0.45;
    transform: scale(0.9);
  }
  to {
    opacity: 0.9;
    transform: scale(1.1);
  }
}
</style>
