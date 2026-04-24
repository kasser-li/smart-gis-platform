# 代码质量提升 - 任务清单

**创建时间**: 2026-04-24  
**状态**: ✅ 全部完成

---

## 阶段 1: 后端修复 ✅

- [x] 创建 `models/cad.model.ts`
- [x] 安装 zod + helmet + express-rate-limit
- [x] 创建校验中间件 `middleware/validate.ts`
- [x] 创建统一响应工具 `utils/response.ts`
- [x] 改造 `index.ts` 添加安全中间件（helmet + rate-limit + 严格 CORS）
- [x] 改造 `marker.controller.ts` 使用 zod 校验 + 统一响应
- [x] 改造 `marker.routes.ts` 使用 validate 中间件
- [x] 改造 `cad.controller.ts` 使用统一响应
- [x] 改造 `cad.routes.ts` 使用 validate 中间件
- [x] 修复 `cad.service.ts` 类型错误
- [x] 修复 `cad-query.routes.ts` 元数据检查
- [x] 后端编译通过 ✅

## 阶段 2: 前端重构 ✅

- [x] 创建 `types/` 目录（marker.ts, cad.ts）
- [x] 创建 `api/` 封装层（http.ts, marker.api.ts, cad.api.ts, index.ts）
- [x] 改造 MapView.vue 使用 api 层
- [x] 拆分大组件 ✅
  - `components/map/MapContainer.vue` - Leaflet 地图核心
  - `components/map/MapToolbar.vue` - 顶部工具栏
  - `components/map/MarkerPanel.vue` - 标记点列表+表单
  - `components/map/LayerPanel.vue` - 图层管理
  - `components/map/CadUploadDialog.vue` - CAD 上传对话框
- [x] 创建 `AppLayout.vue` - 侧边栏+顶栏布局
- [x] 创建 `HomePage.vue` - 主页仪表盘
- [x] 更新路由配置 - 支持首页/地图/AGV
- [x] 前端构建通过 ✅

## 阶段 3: 测试 📋

- [ ] 配置 Vitest
- [ ] 补 marker.service 测试
- [ ] 补 API 集成测试

---

## 变更记录

| 日期 | 变更内容 | 状态 |
|------|----------|------|
| 2026-04-24 | 后端规范改进完成 | ✅ |
| 2026-04-24 | 前端 API 封装完成 | ✅ |
| 2026-04-24 | 前端组件拆分完成 | ✅ |
| 2026-04-24 | 主页设计完成 | ✅ |
| 2026-04-24 | 路由控制完成 | ✅ |
