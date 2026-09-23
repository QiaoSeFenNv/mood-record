import { defineConfig } from 'vitest/config';

// 单元测试不加载 uni-app 构建插件，避免 Node 测试环境初始化小程序编译器。
export default defineConfig({
  test: {
    environment: 'node',
  },
});
