---
name: 心情晴雨表小程序
description: 在日光草地上记录、回看和理解当下心情
colors:
  meadow-paper: "#f7fbf5"
  deep-fern: "#173f3c"
  calm-teal: "#2f746e"
  soft-moss: "#edf5ed"
  muted-teal: "#4d7069"
  warm-coral: "#a24951"
rounded:
  sm: "6px"
  md: "8px"
spacing:
  sm: "8px"
  md: "16px"
  lg: "24px"
components:
  button-primary:
    backgroundColor: "{colors.calm-teal}"
    textColor: "#ffffff"
    rounded: "{rounded.md}"
    padding: "0 16px"
    height: "41px"
  surface-soft:
    backgroundColor: "{colors.soft-moss}"
    textColor: "{colors.deep-fern}"
    rounded: "{rounded.md}"
    padding: "16px"
---

# Design System: 心情晴雨表小程序

## Overview

**Creative North Star: “日光草地上的心情植物”**

页面把一次记录放在开阔的蓝紫天空与青绿色草地中。植物承载同一天可以并存的心情痕迹，原创动物只提供安静陪伴，不替用户评判情绪。操作区保持浅色、平静和可读，信息依次从场景、预览确认、匿名共鸣到时间线展开。

**Key Characteristics:**

- 原创哑光绘本光栅素材作为场景和陪伴角色。
- 浅色纸面、深绿色文字和青绿色主操作色。
- 拖动只预览，明确确认后保存。
- 今天、回顾、我的共用同一套轻量视觉语言。

## Colors

浅色草地纸面承载内容，深蕨绿色保证文字对比度，青绿色只用于主要操作和趋势标记，珊瑚红保留给危险操作。

### Primary

- **平静青绿** (#2f746e): 主确认按钮、趋势点和选中状态。

### Secondary

- **柔和苔绿** (#edf5ed): 共鸣、设置和辅助内容的浅色表面。

### Tertiary

- **暖珊瑚红** (#a24951): 删除、清除和注销等危险操作文字。

### Neutral

- **草地纸面** (#f7fbf5): 页面背景和主要操作区。
- **深蕨绿** (#173f3c): 标题和主要文字。
- **雾青灰** (#4d7069): 辅助说明、时间标记和次要标签。

**The One Scene Rule.** 场景素材负责气氛，控件区域保持浅色平面，保证记录动作不会被插画遮挡。

## Typography

**Display Font:** -apple-system, BlinkMacSystemFont, “PingFang SC”, sans-serif
**Body Font:** -apple-system, BlinkMacSystemFont, “PingFang SC”, sans-serif

**Character:** 系统无衬线字体保持中文阅读清楚，字号和粗细用层级区分操作、标题和说明。

### Hierarchy

- **Headline** (700, 29–42rpx): 页面标题和当前日期。
- **Title** (700, 31–32rpx): 分区标题和记录控件标题。
- **Body** (400, 26rpx, 1.5): 说明、隐私和共鸣文本。
- **Label** (400–600, 20–27rpx): 日期、趋势刻度和按钮辅助文字。

## Layout

移动端以单列纵向阅读为主，今天页把场景放在首屏上半部，随后是连续滑杆、共鸣和 24 小时时间线。回顾和我的使用分区线代替一串嵌套卡片；H5 在宽屏上把内容限制在约 560px，保留移动端阅读密度。

## Elevation & Depth

系统以色调分层为主，静态页面不依赖阴影。场景通过天空、草地和前景插画的层次提供深度；浅绿色表面与细分隔线区分操作组。

## Shapes

按钮和选择项使用轻微 6–8px 圆角，避免大型胶囊和装饰性圆卡。分隔线是 1px 浅苔绿色，危险按钮使用同样的轻圆角与细边框。

## Components

### Buttons

- **Shape:** 轻微圆角 (8px)，触控区域保持约 41px 高。
- **Primary:** 平静青绿底色与白色文字。
- **Disabled:** 降为浅苔绿底与深灰绿文字，明确表示尚未选择或正在保存。
- **Danger:** 透明底、珊瑚色文字和细边框，操作前使用确认对话框。

### Cards / Containers

- **Corner Style:** 仅在需要承载状态的容器使用 8px 圆角。
- **Background:** 以草地纸面和柔和苔绿分层。
- **Shadow Strategy:** 默认无阴影。
- **Border:** 页面分区使用细分隔线。
- **Internal Padding:** 约 16–24px。

### Navigation

底部 tabBar 固定为“今天 / 回顾 / 我的”。未选中使用雾青灰，当前页使用平静青绿；三个入口名称保持短而明确。

### Mood Scene

今天页使用天空草地底图、可切换植物和动物前景。五种情绪用雨滴、露珠、柔光、金叶和花朵小型图形层表现；同类记录在固定位置显示准确数量，避免大量记录互相遮挡。记录删除后由真实记录重新计算。素材加载失败时场景保持底色，并提示插画暂不可见，记录控件继续可用。

## Do's and Don'ts

### Do:

- **Do** 让每次记录的值、情绪名称和确认动作在同一视线内可见。
- **Do** 用原创光栅场景承载植物和动物，用浅色控件保证可读性。
- **Do** 披露匿名共鸣的估算口径和测试环境身份。

### Don't:

- **Don't** 把拖动过程直接写成记录。
- **Don't** 用枯萎、扣分或诊断语言表达低落。
- **Don't** 把花灌木误称为树，或把装饰素材当成业务数据。
