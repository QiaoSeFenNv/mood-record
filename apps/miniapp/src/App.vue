<script setup lang="ts">
import { onLaunch } from '@dcloudio/uni-app';
import { useSessionStore } from './stores/session';

onLaunch(() => {
  useSessionStore().restore();
});
</script>

<style>
page {
  background: #f7fbf5;
  color: #173f3c;
  font-family: -apple-system, BlinkMacSystemFont, 'PingFang SC', sans-serif;
}

.screen {
  padding: 36rpx 32rpx 80rpx;
}

.card {
  border-radius: 8rpx;
  background: #edf5ed;
  padding: 30rpx;
  margin: 24rpx 0;
}

.muted {
  color: #4d7069;
  font-size: 26rpx;
  line-height: 1.5;
}

.action {
  color: #ffffff;
  background: #2f746e;
  border-radius: 8rpx;
  font-weight: 600;
}

.danger {
  color: #a24951;
  border-color: #b8797e;
}

@media (min-width: 720px) {
  .screen {
    max-width: 560px;
    margin: 0 auto;
  }

  uni-tabbar {
    max-width: 560px;
    left: 50% !important;
    transform: translateX(-50%);
  }
}
</style>
