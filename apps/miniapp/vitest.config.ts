import { defineConfig } from 'vitest/config';
import vue from '@vitejs/plugin-vue';

// 单元测试不加载 uni-app 构建插件，避免 Node 测试环境初始化小程序编译器。
export default defineConfig({
  plugins: [vue({ template: { compilerOptions: { isCustomElement: (tag) => tag === 'slider' } } })],
  test: {
    environment: 'jsdom',
    // Workspace tests run concurrently with the API suite; allow jsdom startup
    // contention without masking genuinely hanging component tests.
    testTimeout: 15_000,
  },
});
