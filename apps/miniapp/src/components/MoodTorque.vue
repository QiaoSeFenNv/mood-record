<script setup lang="ts">
import { computed, ref } from 'vue';
import { moodBandName, torqueToMoodBand } from '@mood-record/domain';

const props = defineProps<{ disabled?: boolean; vibrationEnabled?: boolean }>();
const emit = defineEmits<{
  preview: [torque: number | null];
  commit: [torque: number];
}>();

const current = ref(0);
const gestureActive = ref(false);
const bandName = computed(() => moodBandName(torqueToMoodBand(current.value)));
const fill = computed(() => `${(current.value + 100) / 2}%`);

function changing(event: { detail: { value: number } }): void {
  if (props.disabled) return;
  gestureActive.value = true;
  current.value = Math.round(event.detail.value);
  emit('preview', current.value);
}

function complete(event: { detail: { value: number } }): void {
  if (props.disabled) return;
  current.value = Math.round(event.detail.value);
  emit('preview', null);
  if (!gestureActive.value) return;
  gestureActive.value = false;
  if (props.vibrationEnabled && current.value < -20) {
    uni.vibrateShort({ type: 'light', fail: () => undefined });
  }
  emit('commit', current.value);
}
</script>

<template>
  <view class="torque card">
    <view class="torque-title">记录此刻</view>
    <view class="torque-value">{{ current > 0 ? '+' : '' }}{{ current }} · {{ bandName }}</view>
    <view class="track" :class="{ heavy: current < -20 }">
      <view class="track-fill" :style="{ width: fill }" />
      <slider
        class="slider"
        :value="current"
        :min="-100"
        :max="100"
        :step="1"
        :disabled="disabled"
        activeColor="transparent"
        backgroundColor="transparent"
        block-color="#f0e6c4"
        :block-size="30"
        @changing="changing"
        @change="complete"
      />
    </view>
    <view class="ends"><text>低落</text><text>平静</text><text>愉快</text></view>
    <view class="muted">滑动并松手，即保存这次心情。每一段心情都值得被看见。</view>
  </view>
</template>

<style scoped>
.torque {
  text-align: center;
}
.torque-title {
  font-size: 34rpx;
  font-weight: 600;
}
.torque-value {
  color: #efdcac;
  font-size: 42rpx;
  margin: 22rpx 0;
}
.track {
  position: relative;
  height: 80rpx;
  border-radius: 40rpx;
  background: linear-gradient(90deg, #6173ad, #81baa9 50%, #eacb86);
  transition: box-shadow 0.2s;
}
.track.heavy {
  box-shadow:
    inset 18rpx 0 25rpx #263a73,
    0 0 22rpx #6874b488;
}
.track-fill {
  height: 100%;
  border-radius: 40rpx;
  background: #e9e2b240;
  pointer-events: none;
}
.slider {
  position: absolute;
  left: -12rpx;
  right: -12rpx;
  top: -12rpx;
  margin: 0;
}
.ends {
  display: flex;
  justify-content: space-between;
  color: #b4cac8;
  font-size: 24rpx;
  margin: 12rpx 8rpx 28rpx;
}
</style>
