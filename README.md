# opendtab

Opened Tabs 是一个基于 Manifest V3 的浏览器扩展（Edge/Chrome），用于在一个统一的页面中管理和展示用户打开的标签页、收藏夹和浏览历史。
核心功能
标签页管理
按域名分组展示所有已打开的标签页
支持搜索过滤标签页
显示标签页统计信息
支持折叠/展开域名分组
收藏夹管理
集成浏览器原生书签 API
树形目录结构浏览
支持新建文件夹
面包屑导航
展开/折叠子文件夹
历史记录查看
多时间范围筛选（今天、最近7天、最近30天）
两种分组方式：按日期或按域名
支持清除浏览记录
用户体验
深色/浅色主题切换
实时搜索功能
响应式卡片布局
Toast 提示通知
模态框交互
技术栈
开发语言: JavaScript (ES Module)
代码规范: ESLint v9.39.4 + @eslint/js
API 使用: Chrome Extension API (tabs, bookmarks, history)
架构模式: Manifest V3 Service Worker
