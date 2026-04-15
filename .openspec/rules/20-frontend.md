# 前端开发规范（Vue 3 + TypeScript）

## 技术栈
- Vue 3.x（Composition API）
- TypeScript 5.x
- Vite 5.x
- Element Plus
- Leaflet

## 目录结构
```
src/
├── main.ts           # 入口文件
├── App.vue           # 根组件
├── views/            # 页面组件
├── components/       # 公共组件
├── stores/           # Pinia 状态
├── api/              # API 接口
├── types/            # TypeScript 类型
└── router/           # 路由配置
```

## 组件开发
- 使用 `<script setup lang="ts">`
- 组件命名使用 PascalCase
- Props 和 Emits 必须定义类型

## API 调用
- 所有 API 封装在 api/ 目录
- 使用 Axios 拦截器统一处理
- 错误提示使用 ElMessage

## 样式规范
- 使用 scoped 样式
- 禁止使用 !important
- 响应式布局优先
