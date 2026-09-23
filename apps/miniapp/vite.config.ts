import { defineConfig, type PluginOption } from 'vite';
import uniPluginPackage from '@dcloudio/vite-plugin-uni';

type UniPluginFactory = () => PluginOption;

function isUniPluginFactory(value: unknown): value is UniPluginFactory {
  return typeof value === 'function';
}

// Node 24 加载该 CommonJS 插件时会暴露双层 default，兼容两种导出形态。
function resolveUniPlugin(value: unknown): UniPluginFactory {
  if (isUniPluginFactory(value)) return value;
  if (typeof value === 'object' && value !== null && 'default' in value) {
    if (isUniPluginFactory(value.default)) return value.default;
  }
  throw new TypeError('无法加载 uni-app Vite 插件');
}

const uniPlugin = resolveUniPlugin(uniPluginPackage);

export default defineConfig({
  plugins: [uniPlugin()],
  define: {
    __DEV_AUTH_UI__: JSON.stringify(process.env.NODE_ENV !== 'production'),
  },
});
