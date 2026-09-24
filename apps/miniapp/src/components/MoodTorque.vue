<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { moodBandName, torqueToMoodBand } from '@mood-record/domain';

const props = defineProps<{
  disabled?: boolean;
  vibrationEnabled?: boolean;
  resetToken?: number;
}>();
const emit = defineEmits<{
  preview: [torque: number | null];
  commit: [torque: number];
}>();

const current = ref(0);
const gestureActive = ref(false);
const hasDraft = ref(false);
const submitted = ref(false);
const bandName = computed(() => moodBandName(torqueToMoodBand(current.value)));

watch(
  () => props.resetToken,
  () => {
    current.value = 0;
    gestureActive.value = false;
    hasDraft.value = false;
    submitted.value = false;
  },
);

function changing(event: { detail: { value: number } }): void {
  if (props.disabled) return;
  gestureActive.value = true;
  hasDraft.value = true;
  submitted.value = false;
  current.value = Math.round(event.detail.value);
  emit('preview', current.value);
}

function complete(event: { detail: { value: number } }): void {
  if (props.disabled) return;
  if (!gestureActive.value) return;
  current.value = Math.round(event.detail.value);
  emit('preview', current.value);
  gestureActive.value = false;
  if (props.vibrationEnabled && current.value < -20) {
    uni.vibrateShort({ type: 'light', fail: () => undefined });
  }
}

function confirm(): void {
  if (props.disabled || !hasDraft.value || submitted.value) return;
  submitted.value = true;
  emit('commit', current.value);
}

function discard(): void {
  if (props.disabled) return;
  hasDraft.value = false;
  submitted.value = false;
  gestureActive.value = false;
  current.value = 0;
  emit('preview', null);
}
</script>

<template>
  <view class="torque">
    <view class="torque-head">
      <text class="torque-title">此刻的心情</text>
      <text class="torque-value">{{
        hasDraft ? `${current > 0 ? '+' : ''}${current} · ${bandName}` : '轻轻滑动，看看此刻'
      }}</text>
    </view>
    <view class="track">
      <slider
        class="slider"
        :value="current"
        :min="-100"
        :max="100"
        :step="1"
        :disabled="disabled"
        activeColor="#357976"
        backgroundColor="#d8e6d8"
        block-color="#fff9e9"
        :block-size="26"
        @changing="changing"
        @change="complete"
      />
    </view>
    <view class="ends"><text>低落</text><text>平静</text><text>愉快</text></view>
    <view class="actions">
      <button v-if="hasDraft" class="discard" :disabled="!!disabled" @tap="discard">放弃</button>
      <button
        class="action confirm"
        :disabled="!!disabled || !hasDraft || submitted"
        @tap="confirm"
      >
        记下这一刻
      </button>
    </view>
  </view>
</template>

<style scoped>
.torque {
  padding: 24rpx 32rpx 32rpx;
  background: #f7fbf5;
}
.torque-head {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 12rpx;
  flex-wrap: wrap;
}
.torque-title {
  font-size: 31rpx;
  font-weight: 700;
  color: #173f3c;
}
.torque-value {
  color: #336967;
  font-size: 27rpx;
  font-variant-numeric: tabular-nums;
}
.track {
  position: relative;
  height: 65rpx;
  margin: 18rpx -12rpx 0;
}
.slider {
  margin: 0;
}
.ends {
  display: flex;
  justify-content: space-between;
  color: #587973;
  font-size: 23rpx;
  margin: 0 8rpx;
}
.actions {
  display: flex;
  gap: 14rpx;
  margin-top: 22rpx;
}
.actions button {
  margin: 0;
  min-height: 82rpx;
  line-height: 82rpx;
  font-size: 29rpx;
}
.confirm {
  flex: 1;
}
.confirm[disabled] {
  background: #bdcfc1;
  color: #50665c;
}
.discard {
  width: 132rpx;
  background: transparent;
  color: #496b62;
}
</style>
