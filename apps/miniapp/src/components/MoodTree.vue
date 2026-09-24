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

const plants = {
  'leaf-tree': '/static/scene/leaf-tree.png',
  'camellia-shrub': '/static/scene/camellia-shrub.png',
};
const companions = {
  fawn: '/static/scene/fawn.png',
  'tit-bird': '/static/scene/tit-bird.png',
};
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
const plantSrc = computed(() => plants[props.plant || 'leaf-tree']);
const companionSrc = computed(() => companions[props.companion || 'fawn']);
const assetMessage = computed(() =>
  failedAssets.value.length ? '插画暂时无法显示，仍可继续记录心情' : '',
);

function markAssetFailed(name: string): void {
  if (!failedAssets.value.includes(name)) failedAssets.value = [...failedAssets.value, name];
}

watch([plantSrc, companionSrc], () => {
  failedAssets.value = failedAssets.value.filter((name) => name === 'landscape');
});
const previewKind = computed(() =>
  props.previewTorque == null ? null : marks[torqueToMoodBand(props.previewTorque)],
);
</script>

<template>
  <view class="scene" :class="{ still: reducedMotion }" aria-label="今天的心情植物">
    <image
      class="landscape"
      src="/static/scene/meadow-sky.png"
      mode="aspectFill"
      @error="markAssetFailed('landscape')"
    />
    <view class="haze" />
    <image
      class="plant"
      :class="{ shrub: plant === 'camellia-shrub' }"
      :src="plantSrc"
      mode="aspectFit"
      @error="markAssetFailed('plant')"
    />
    <view
      v-for="trace in traces"
      :key="trace.key"
      class="trace"
      :class="trace.kind"
      :style="trace.position"
      ><text v-if="trace.count > 1" class="trace-count">{{ trace.count }}</text></view
    >
    <view v-if="previewKind" class="trace preview" :class="previewKind" />
    <image
      class="companion"
      :src="companionSrc"
      mode="aspectFit"
      @error="markAssetFailed('companion')"
    />
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
  background: #a5c8ee;
  isolation: isolate;
}
.landscape {
  position: absolute;
  width: 100%;
  height: 100%;
  left: 0;
  top: 0;
}
.haze {
  position: absolute;
  inset: 0;
  background: linear-gradient(180deg, #bde0f322, transparent 70%);
}
.plant {
  position: absolute;
  left: 18%;
  top: 8%;
  width: 64%;
  height: 88%;
}
.plant.shrub {
  left: 16%;
  top: 15%;
  width: 70%;
  height: 75%;
}
.companion {
  position: absolute;
  right: 5%;
  bottom: 5%;
  width: 28%;
  height: 30%;
}
.trace {
  position: absolute;
  width: 28rpx;
  height: 28rpx;
  z-index: 2;
  box-shadow: 2rpx 5rpx 8rpx #284c3c44;
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
  left: 30rpx;
  top: 22rpx;
  color: #173d3b;
  font-size: 23rpx;
  font-weight: 600;
  background: #f7fff0c9;
  padding: 7rpx 14rpx;
  border-radius: 6rpx;
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
</style>
