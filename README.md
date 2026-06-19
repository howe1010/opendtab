# Opened Tabs

## 项目概述

**Opened Tabs** 是一个基于 **Manifest V3** 的浏览器扩展（Edge/Chrome），用于在一个统一的页面中管理和展示用户打开的标签页、收藏夹和浏览历史。

## 核心功能

### 1. 标签页管理
- 按域名分组展示所有已打开的标签页
- 支持搜索过滤标签页
- 显示标签页统计信息
- 支持折叠/展开域名分组

### 2. 收藏夹管理
- 集成浏览器原生书签 API
- 树形目录结构浏览
- 支持新建文件夹
- 面包屑导航
- 展开/折叠子文件夹

### 3. 历史记录查看
- 多时间范围筛选（今天、最近7天、最近30天）
- 两种分组方式：按日期或按域名
- 支持清除浏览记录

### 4. 用户体验
- 深色/浅色主题切换
- 实时搜索功能
- 响应式卡片布局
- Toast 提示通知
- 模态框交互

## 技术栈

- **开发语言**: JavaScript (ES Module)
- **代码规范**: ESLint v9.39.4 + @eslint/js
- **API 使用**: Chrome Extension API (tabs, bookmarks, history)
- **架构模式**: Manifest V3 Service Worker

## 文件结构

```
openedtab-edge/
├── background.js          # 后台服务，处理扩展图标点击事件
├── tabs.html              # 主界面 HTML
├── tabs.js                # 标签页管理逻辑
├── tabs.css               # 样式表
├── favorites.js           # 收藏夹数据层
├── favorites-ui.js        # 收藏夹 UI 层
├── history.js             # 历史记录数据层
├── history-ui.js          # 历史记录 UI 层
├── storage.js             # 存储管理模块
├── manifest.json          # 扩展配置文件
├── package.json           # Node.js 包配置
└── icons/                 # 扩展图标
    ├── icon16.png
    ├── icon48.png
    └── icon128.png
```

## 开发脚本

```bash
npm run lint      # 运行 ESLint 代码检查
npm run lint:fix  # 自动修复 ESLint 问题
```

## 权限说明

扩展需要以下权限：
- `tabs` - 访问和管理浏览器标签页
- `bookmarks` - 访问和管理书签
- `history` - 访问浏览历史

## 使用说明

1. 点击浏览器工具栏中的扩展图标
2. 如果页面已打开，将切换到该标签页
3. 如果未打开，将创建新标签页并显示管理界面
4. 使用导航标签在以下视图间切换：
   - 打开标签页视图
   - 收藏夹视图
   - 历史记录视图
