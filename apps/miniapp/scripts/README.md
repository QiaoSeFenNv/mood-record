# 今日场景素材来源

`src/static/scene/meadow-{plant}-{companion}.png` 四幅场景由 `src/static/scene/` 内已有的原创素材 `meadow-sky.png`、两种植物和两种动物合成。没有引入新的生成素材。合成过程保留原图，使用同一套低饱和暖纸调色、柔化边缘、植物根部渐隐和接地阴影，再将场景底部渐入页面纸色。

可用 Pillow 运行 `build-scenes.py` 重建四幅场景。生成文件为 900 × 720 PNG，供今天页按用户选定的植物与动物切换。五段心情痕迹仍由组件从真实记录叠加，未烘焙到图片里。
