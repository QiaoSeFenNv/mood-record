<script setup lang="ts">
import { onLaunch } from '@dcloudio/uni-app';
import { useSessionStore } from './stores/session';

onLaunch(() => {
  useSessionStore().restore();
});
</script>

<style>
page {
  background: #11252c;
  color: #ecf4e9;
  font-family: -apple-system, BlinkMacSystemFont, 'PingFang SC', sans-serif;
}

.screen {
  padding: 36rpx 32rpx 80rpx;
}

.card {
  border: 1rpx solid rgba(183, 240, 221, 0.22);
  border-radius: 32rpx;
  background: rgba(255, 255, 255, 0.07);
  padding: 30rpx;
  margin: 24rpx 0;
}

.muted {
  color: #a9c0bf;
  font-size: 26rpx;
  line-height: 1.5;
}

.action {
  color: #183534;
  background: #c9eadb;
  border-radius: 24rpx;
  font-weight: 600;
}

.danger {
  color: #f6d4d6;
  border-color: #9c7077;
}
</style>
