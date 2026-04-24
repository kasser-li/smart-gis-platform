# 前端开发规范（Vue 3 + TypeScript）

> 参考 Vue 3 官方风格指南 + Airbnb TypeScript 规范

## 必须遵守（放开头）

### 技术栈
- Vue 3.x（Composition API + `<script setup>`）
- TypeScript 5.x（strict 模式）
- Vite 5.x
- Element Plus（UI 组件库）
- Leaflet（地图库）
- Axios（HTTP 客户端）
- Pinia（状态管理）

### 目录结构
```
src/
├── main.ts                # 入口文件
├── App.vue                # 根组件
├── api/                   # API 接口封装（按模块拆分）
│   ├── index.ts           # Axios 实例 + 拦截器
│   ├── marker.api.ts      # 标记点 API
│   └── cad.api.ts         # CAD API
├── components/            # 公共组件（可复用）
├── views/                 # 页面组件（路由级别）
├── stores/                # Pinia 状态管理
├── types/                 # 全局 TypeScript 类型定义
├── router/                # 路由配置
├── utils/                 # 工具函数
├── styles/                # 全局样式
└── assets/                # 静态资源
```

### 组件开发规范

#### 必须使用 `<script setup lang="ts">`
```vue
<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import type { Marker } from '@/types/marker'

// Props 必须定义类型
const props = defineProps<{
  marker: Marker
  editable?: boolean
}>()

// Emits 必须定义类型
const emit = defineEmits<{
  update: [marker: Marker]
  delete: [id: string]
}>()
</script>
```

#### 组件命名
- 组件文件名：`PascalCase.vue`
- 组件名必须具有描述性，禁止使用 `Component1`、`Test` 等无意义名称
- 单文件组件只包含一个根元素

#### 组件拆分原则
- **单个组件不超过 300 行**（超过则拆分）
- 一个组件只做一件事
- 地图、表单、列表等复杂功能拆分为独立组件
- 禁止在 MapView.vue 中混合地图渲染、表单提交、文件上传等逻辑

## API 调用规范

### 统一封装
- 所有 API 调用必须封装在 `api/` 目录
- 禁止在组件中直接使用 `axios`，必须通过 API 模块调用
- 使用 Axios 拦截器统一处理：
  - 请求拦截：添加 token、设置 Content-Type
  - 响应拦截：统一错误处理、Loading 状态

```typescript
// ✅ 推荐：api/marker.api.ts
import { request } from './index'
import type { Marker, CreateMarkerDTO } from '@/types/marker'

export const markerApi = {
  list(params?: MarkerFilter) {
    return request.get<ApiResponse<Marker[]>>('/api/markers', { params })
  },
  create(data: CreateMarkerDTO) {
    return request.post<ApiResponse<Marker>>('/api/markers', data)
  },
  delete(id: string) {
    return request.delete<ApiResponse>(`/api/markers/${id}`)
  }
}

// ❌ 禁止：组件中直接使用 axios
import axios from 'axios'
axios.post('/api/markers', data)
```

### 错误处理
- 使用 `ElMessage.error()` 显示错误提示
- 网络错误、业务错误、认证过期分别处理
- 认证过期自动跳转登录页

## 状态管理规范（Pinia）

- 使用 Composition API 风格（`defineStore` 的 setup 函数形式）
- Store 按业务模块拆分，禁止把所有状态放在一个 Store
- 状态变更必须通过 Store 的 action，禁止直接修改 state
- 异步操作在 action 中处理

```typescript
// ✅ 推荐
export const useMarkerStore = defineStore('marker', () => {
  const markers = ref<Marker[]>([])
  const loading = ref(false)

  const markerCount = computed(() => markers.value.length)

  async function fetchMarkers() {
    loading.value = true
    try {
      const res = await markerApi.list()
      markers.value = res.data?.data || []
    } finally {
      loading.value = false
    }
  }

  return { markers, loading, markerCount, fetchMarkers }
})
```

## 样式规范

- 使用 `<style scoped>` 避免样式污染
- 禁止使用 `!important`
- 使用 CSS 变量定义主题色，禁止硬编码颜色值
- 响应式布局优先（Flexbox / Grid）
- 类名使用 BEM 命名：`.block__element--modifier`

## 路由规范

- 路由配置集中在 `router/index.ts`
- 路由懒加载：`component: () => import('@/views/MapView.vue')`
- 路由命名使用 kebab-case
- 页面切换添加过渡动画

## TypeScript 规范

- 启用 `strict: true`
- 禁止使用 `any` 类型（使用 `unknown` + 类型守卫）
- 使用 `interface` 定义对象类型，`type` 定义联合/交叉类型
- 使用 `as` 类型断言时必须确保类型安全
- 使用 `satisfies` 操作符验证类型（TS 4.9+）

## 性能优化

- 列表使用 `v-for` 必须绑定 `:key`
- 大数据列表使用虚拟滚动
- 图片懒加载
- 路由懒加载
- 第三方库按需引入（禁止全量导入 Element Plus）
- 防抖/节流处理高频事件（搜索、滚动）

## 可访问性

- 表单元素关联 label
- 按钮使用语义化标签（禁止用 div 模拟按钮）
- 颜色对比度符合 WCAG 2.1 AA 标准
- 支持键盘导航

---

## 重要提醒（放结尾）

- **组件不超过 300 行**，超过必须拆分
- **API 必须封装**，禁止组件直接调用 axios
- **禁止 `any` 类型**，使用 `unknown` + 类型守卫
- **状态走 Pinia**，禁止组件间 prop 透传超过 3 层
- **样式 scoped**，禁止全局样式污染
