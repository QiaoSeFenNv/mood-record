<script setup lang="ts">
import { onBeforeUnmount, ref, watch } from 'vue';

const props = defineProps<{ recordId: string | null }>();
const emit = defineEmits<{ undo: [id: string] }>();
const remaining = ref(0);
let timer: ReturnType<typeof setInterval> | undefined;

function stop(): void {
  if (timer) clearInterval(timer);
  timer = undefined;
}

watch(
  () => props.recordId,
  (id) => {
    stop();
    remaining.value = id ? 5 : 0;
    if (id) {
      timer = setInterval(() => {
        remaining.value -= 1;
        if (remaining.value <= 0) stop();
      }, 1000);
    }
  },
  { immediate: true },
);
onBeforeUnmount(stop);

function undo(): void {
  if (props.recordId && remaining.value > 0) {
    stop();
    remaining.value = 0;
    emit('undo', props.recordId);
  }
}
</script>

<template>
  <view v-if="recordId && remaining > 0" class="undo-bar">
    <text>已记录 · {{ remaining }} 秒内可撤销</text>
    <text class="undo-button" @tap="undo">撤销</text>
  </view>
</template>

<style scoped>
.undo-bar {
  position: fixed;
  bottom: 140rpx;
  left: 32rpx;
  right: 32rpx;
  padding: 24rpx 30rpx;
  background: #e5efda;
  color: #213f40;
  border-radius: 22rpx;
  display: flex;
  justify-content: space-between;
  z-index: 20;
  box-shadow: 0 10rpx 40rpx #0005;
}
.undo-button {
  font-weight: 700;
  text-decoration: underline;
}
</style>
