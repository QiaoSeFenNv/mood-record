<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import type { MoodRecord } from '@mood-record/contracts';
import { MoodBand, torqueToMoodBand } from '@mood-record/domain';
import type { Companion, Plant } from '../stores/session';

const props = defineProps<{
  records: MoodRecord[];
  previewTorque?: number | null;
  reducedMotion?: boolean;
  companion?: Companion;
  plant?: Plant;
}>();

const marks: Record<MoodBand, string> = {
  [MoodBand.VERY_LOW]: 'drop',
  [MoodBand.LOW]: 'dew',
  [MoodBand.CALM]: 'light',
  [MoodBand.HAPPY]: 'leaf',
  [MoodBand.VERY_HAPPY]: 'bloom',
};

const bands = [MoodBand.VERY_LOW, MoodBand.LOW, MoodBand.CALM, MoodBand.HAPPY, MoodBand.VERY_HAPPY];
const positions = [
  { left: '26%', top: '34%' },
  { left: '47%', top: '21%' },
  { left: '68%', top: '32%' },
  { left: '35%', top: '56%' },
  { left: '61%', top: '55%' },
];
const traces = computed(() =>
  bands.flatMap((band, index) => {
    const count = props.records.filter((record) => record.moodBand === band).length;
    return count ? [{ key: band, kind: marks[band], count, position: positions[index]! }] : [];
  }),
);
const failedAssets = ref<string[]>([]);
const sceneSrc = computed(
  () => `/static/scene/meadow-${props.plant || 'leaf-tree'}-${props.companion || 'fawn'}.png`,
);
const assetMessage = computed(() =>
  failedAssets.value.length ? '插画暂时无法显示，仍可继续记录心情' : '',
);

function markAssetFailed(name: string): void {
  if (!failedAssets.value.includes(name)) failedAssets.value = [...failedAssets.value, name];
}

watch(sceneSrc, () => {
  failedAssets.value = [];
});
const previewKind = computed(() =>
  props.previewTorque == null ? null : marks[torqueToMoodBand(props.previewTorque)],
);
</script>

<template>
  <view class="scene" :class="{ still: reducedMotion }" aria-label="今天的心情植物">
    <image class="landscape" :src="sceneSrc" mode="aspectFill" @error="markAssetFailed('scene')" />
    <view
      v-for="trace in traces"
      :key="trace.key"
      class="trace"
      :class="trace.kind"
      :style="trace.position"
      ><text v-if="trace.count > 1" class="trace-count">{{ trace.count }}</text></view
    >
    <view v-if="previewKind" class="trace preview" :class="previewKind" />
    <view class="scene-wash" />
    <view v-if="assetMessage" class="asset-message" role="status">{{ assetMessage }}</view>
    <view class="scene-caption">{{
      records.length ? `今天留下 ${records.length} 处心情痕迹` : '今天的心情，从这里开始'
    }}</view>
  </view>
</template>

<style scoped>
.scene {
  position: relative;
  height: 600rpx;
  overflow: hidden;
  background: #edf5ed;
  isolation: isolate;
}
.landscape {
  position: absolute;
  width: 100%;
  height: 100%;
  left: 0;
  top: 0;
}
.scene-wash {
  position: absolute;
  z-index: 2;
  left: 0;
  right: 0;
  bottom: 0;
  height: 54rpx;
  background: linear-gradient(180deg, transparent, #f7fbf5);
}
.trace {
  position: absolute;
  width: 28rpx;
  height: 28rpx;
  z-index: 2;
  opacity: 0.92;
}
.trace-count {
  position: absolute;
  left: 20rpx;
  top: -16rpx;
  min-width: 28rpx;
  padding: 1rpx 5rpx;
  border-radius: 12rpx;
  background: #f7fbf5;
  color: #173f3c;
  font-size: 19rpx;
  font-weight: 700;
  line-height: 1.2;
  text-align: center;
}
.asset-message {
  position: absolute;
  z-index: 3;
  right: 20rpx;
  top: 20rpx;
  max-width: 46%;
  padding: 8rpx 12rpx;
  border-radius: 6rpx;
  background: #f7fbf5e8;
  color: #173f3c;
  font-size: 20rpx;
}
.drop {
  border-radius: 80% 5% 80% 80%;
  background: #698fcb;
  transform: rotate(-35deg);
}
.dew {
  border-radius: 50%;
  background: #b5e3e2;
  border: 2rpx solid #ffffff88;
}
.light {
  border-radius: 50%;
  background: #f6e6a9;
}
.leaf {
  border-radius: 80% 4% 80% 4%;
  background: #e7bc63;
  transform: rotate(35deg);
}
.bloom {
  border-radius: 50%;
  background: #f4a9a7;
  border: 5rpx solid #ffe2bd;
}
.preview {
  left: 50%;
  top: 26%;
  width: 42rpx;
  height: 42rpx;
  opacity: 0.75;
  animation: settle 2s ease-in-out infinite alternate;
}
.scene-caption {
  position: absolute;
  z-index: 3;
  left: 32rpx;
  top: 30rpx;
  color: #173d3b;
  font-size: 22rpx;
  font-weight: 500;
  text-shadow: 0 1rpx 12rpx #f7fbf5;
}
.still .preview {
  animation: none;
}
@keyframes settle {
  from {
    opacity: 0.5;
  }
  to {
    opacity: 1;
  }
}
@media (min-width: 720px) {
  .scene {
    height: 448px;
  }
}
</style>
