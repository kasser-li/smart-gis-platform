# AGV 调度系统 SDD (Software Design Document)

## 1. 概述

AGV（Automated Guided Vehicle）智能调度演示系统，基于 Leaflet 地图实现 AGV 车辆监控、路径规划、任务管理和模拟运行功能。

---

## 2. 架构设计

### 2.1 技术栈
- **前端框架**: Vue 3 + TypeScript
- **地图引擎**: Leaflet
- **UI 组件**: Element Plus
- **图标**: Element Plus Icons

### 2.2 模块划分

```
AGVDemo.vue
├── 工具状态管理 (activeTool, isSimulating, showTaskDialog)
├── 地图模块 (map, layers, tileLayer)
├── 路径规划模块 (drawing, saving, loading routes)
├── AGV 监控模块 (AGV list, detail panel, simulation)
├── 任务管理模块 (task CRUD, progress tracking)
└── 充电站/工作站模块 (charging stations, waypoints)
```

---

## 3. 核心设计

### 3.1 图层管理

| 图层 | 用途 | 可见性 |
|------|------|--------|
| `agvLayerGroup` | AGV 车辆标记 | 始终可见 |
| `waypointLayerGroup` | 工作站/路径点 | 始终可见 |
| `chargingLayerGroup` | 充电站标记 | 始终可见 |
| `pathLayerGroup` | 已保存路径线 | 始终可见 |
| `routePointLayerGroup` | 绘制中的路径点 | 仅绘制时 |
| `routeLineLayerGroup` | 绘制中的路径线 | 仅绘制时 |

### 3.2 图标系统

| 图标 | 颜色 | 用途 |
|------|------|------|
| `agvIcon` | 蓝色 (#409EFF) | AGV 车辆 |
| `startPointIcon` | 绿色 (#67C23A) | 路径起点 |
| `endPointIcon` | 红色 (#F56C6C) | 路径终点 |
| `routePointIcon` | 橙色 (#E6A23C) | 路径途经点 |
| `chargingStationIcon` | 绿色 (#67C23A) | 充电站 |

### 3.3 数据模型

#### 3.3.1 AGV 车辆
```typescript
interface AGV {
  id: string;              // 车辆编号 (001, 002...)
  status: string;          // 状态：工作中/空闲/充电中/离线/故障
  battery: number;         // 电量百分比 (0-100)
  load: number;            // 当前负载 (kg)
  maxLoad: number;         // 最大负载 (kg)
  speed: number;           // 速度 (m/s)
  position: { lat, lng };  // 当前位置
  currentTask: string | null;  // 当前任务 ID
  currentRoute: string | null; // 当前路径 ID (R1, R2...)
  routeProgress: number;   // 路径进度 (0-100)
  targetChargingStation: string | null; // 占用的充电站 ID
}
```

#### 3.3.2 路径
```typescript
interface Route {
  id: string;              // 路径 ID (R1, R2...)
  name: string;            // 路径名称
  points: Array<{ lat, lng }>;  // 路径点列表
  distance: number;        // 总距离 (米)
}
```

#### 3.3.3 任务
```typescript
interface Task {
  id: string;              // 任务 ID (T001, T002...)
  type: string;            // 类型：搬运/分拣/充电/巡检
  status: string;          // 状态：等待/进行中/已完成/已取消
  agvId: string;           // 关联 AGV ID
  route: { id, name } | null;  // 关联路径
  progress: number;        // 任务进度 (0-100)
  priority: number;        // 优先级 (1 低/2 中/3 高)
}
```

---

## 4. 关键逻辑

### 4.1 路径匹配机制（已修复）

**问题**: 原设计用 `route.name` 匹配路径，存在重名冲突风险。

**修复方案**: 统一使用 `route.id` 作为唯一标识。

```typescript
// ❌ 旧方案（易冲突）
agv.currentRoute = route.name;  // "路线 1"
const route = savedRoutes.find(r => r.name === agv.currentRoute);

// ✅ 新方案（唯一标识）
agv.currentRoute = route.id;    // "R1"
const route = savedRoutes.find(r => r.id === agv.currentRoute);
```

### 4.2 任务状态同步（已修复）

**问题**: 创建任务时状态为"等待"，但 AGV 已变为"工作中"，状态不一致。

**修复方案**: 创建任务后同步设置为"进行中"。

```typescript
// ✅ 创建任务时同步状态
tasks.value.push({
  status: '进行中',  // 与 AGV 状态一致
  ...
});
```

### 4.3 充电站显示（已修复）

**问题**: 充电站 marker 无自定义图标，使用默认蓝色大头针，不明显。

**修复方案**: 添加充电站专属图标（🔋，绿色圆形）。

```typescript
const chargingStationIcon = L.divIcon({
  className: 'charging-station-marker',
  html: `<div style="...">🔋</div>`,
  iconSize: [24, 24],
  iconAnchor: [12, 12]
});

const marker = L.marker([cs.position.lat, cs.position.lng], { icon: chargingStationIcon });
```

### 4.4 模拟移动逻辑

```typescript
simulateAGVMovement() {
  // 1. 遍历所有 AGV
  // 2. 仅处理 status === '工作中' 且有 currentRoute 的 AGV
  // 3. 根据 speed 和 route.distance 计算进度增量
  // 4. 线性插值计算当前位置
  // 5. 到达终点时：
  //    - AGV 状态 → 空闲
  //    - 关联任务 → 已完成
  // 6. 电量消耗：每 100ms -0.05%
  // 7. 低电量 (<15%)：自动移动到最近充电站，状态 → 充电中
  //    - 充电站状态更新为"占用"
  //    - AGV 位置移动到充电站位置
  //    - targetChargingStation 字段记录占用的充电站 ID
  // 8. 充电中：每 100ms +0.2%，满 100% 转为空闲
  //    - 释放充电站（状态 → 空闲）
  //    - 清除 targetChargingStation
}
```

### 4.5 进度精度控制（已修复）

**问题**: `routeProgress`、`battery`、`task.progress` 小数位过多（如 45.123456789%）。

**修复方案**: 使用 `Math.round(value * 100) / 100` 保留 2 位小数。

```typescript
// 路径进度
agv.routeProgress = Math.round(Math.min(100, agv.routeProgress + speedIncrement) * 100) / 100;

// 电量消耗
agv.battery = Math.round(Math.max(0, agv.battery - 0.05) * 100) / 100;

// 充电
agv.battery = Math.round(Math.min(100, agv.battery + 0.2) * 100) / 100;

// 任务进度
task.progress = Math.round((agv.routeProgress || 0) * 100) / 100;
```

---

## 5. 地图配置

| 参数 | 值 | 说明 |
|------|-----|------|
| center | [39.9045, 116.4075] | 地图中心（北京） |
| zoom | 16 | 默认缩放级别 |
| minZoom | 14 | 最小缩放 |
| maxZoom | 18 | 最大缩放 |
| tileLayer | CartoDB Light | 底图样式 |

---

## 6. 修复记录

| 日期 | 问题 | 修复方案 | 状态 |
|------|------|----------|------|
| 2026-04-24 | 充电桩不显示 | 添加充电站专属图标 | ✅ |
| 2026-04-24 | 路径用名称匹配易冲突 | 改为用 ID 匹配 | ✅ |
| 2026-04-24 | 任务状态与 AGV 不一致 | 创建时同步为"进行中" | ✅ |
| 2026-04-24 | 进度小数位过多 | Math.round 保留 2 位小数 | ✅ |
| 2026-04-27 | 低电量不回充电站 | 移动到最近充电站，充电站状态占用/释放 | ✅ |
| 2026-04-27 | AGV 点击卡顿 | marker 复用缓存，避免每 100ms 重建 | ✅ |

---

## 7. 待优化项

- [ ] 添加 AGV 碰撞检测
- [ ] 支持多 AGV 协同调度
- [ ] 添加路径避障算法
- [ ] 支持实时数据接入（WebSocket）
- [ ] 添加任务优先级队列
- [ ] 支持充电站预约功能
