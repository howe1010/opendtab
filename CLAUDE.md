# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概述

Edge 浏览器扩展（Manifest V3），展示所有已打开标签页并按域名分组。无构建步骤，所有 JS/CSS/HTML 直接加载。

## 语言约定

- 代码注释、commit message、UI 文案全部使用中文
- Commit message 使用 Conventional Commits 格式（如 `fix(tabs): 修复标签页计数逻辑错误`）

## 开发命令

- `npm run lint` — 检查所有 JS 文件
- `npm run lint:fix` — 自动修复 lint 问题
- 无构建/测试命令，修改后直接在 `edge://extensions/` 刷新扩展即可

## 技术要点

- Manifest V3，`background.js` 使用 `service_worker`
- 仅需 `tabs` 权限
- 主题切换通过 `data-theme` 属性 + CSS 变量实现，偏好存于 `localStorage`
- Favicon 通过 Google 公共服务获取（`google.com/s2/favicons`）
