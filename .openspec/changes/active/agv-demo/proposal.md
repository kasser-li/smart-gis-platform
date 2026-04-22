# AGV 路径规划功能增强提案

**创建时间**: 2026-04-22  
**状态**: 待实施  
**优先级**: P0  
**预计工时**: 4 小时

---

## 1. 问题描述

### 1.1 现状
- ❌ AGV 移动是随机偏移，没有实际路径
- ❌ 无法手动规划行驶路线
- ❌ 任务没有路径信息
- ❌ 演示效果不真实

### 1.2 用户需求
- ✅ 可在地图上手动绘制 AGV 行驶路线
- ✅ AGV 按照规划的路线移动
- ✅ 任务包含起点、途经点、终点
- ✅ 路径可视化显示

---

## 2. 解决方案

### 2.1 功能设计

#### 功能 1: 路径规划模式
```
工具栏新增 [路径规划] 按钮
点击后进入路径规划模式：
1. 点击地图添加路径点
2. 右键结束路径绘制
3. 路径自动连接成线
4. 可保存为预设路线
```

#### 功能 2: AGV 沿路径移动
```typescript
// 路径点数组
const route = [
  { lat: 39.9042, lng: 116.4074 },
  { lat: 39.9052, lng: 116.4084 },
  { lat: 39.9062, lng: 116.4094 }
];

// AGV 沿路径移动
function moveAlongRoute(agv, route, speed) {
  // 计算当前段
  // 插值移动
  // 到达 waypoint 后切换下一段
}
```

#### 功能 3: 任务绑定路径
```typescript
interface Task {
  id: string;
  route: Route;        // 新增：路径
  waypoints: string[]; // 途经点 ID 列表
}
```

### 2.2 技术实现

#### 路径数据结构
```typescript
interface Route {
  id: string;
  name: string;
  points: Array<{
    lat: number;
    lng: number;
    order: number;
  }>;
  distance: number;    // 总距离（米）
  estimatedTime: number; // 预计时间（秒）
}
```

#### 路径绘制
- 使用 Leaflet.Polyline
- 实时显示路径长度
- 支持拖拽调整路径点

#### 沿路径移动算法
```typescript
// 线性插值
function lerp(start, end, t) {
  return start + (end - start) * t;
}

// 沿路径移动
function updateAGVPosition(agv, route, elapsed) {
  const totalDistance = calculateRouteLength(route);
  const traveled = agv.speed * elapsed;
  const progress = traveled / totalDistance;
  
  // 找到当前段
  const segmentIndex = Math.floor(progress * (route.points.length - 1));
  const segmentProgress = (progress * (route.points.length - 1)) % 1;
  
  // 插值计算位置
  const current = route.points[segmentIndex];
  const next = route.points[segmentIndex + 1];
  
  return {
    lat: lerp(current.lat, next.lat, segmentProgress),
    lng: lerp(current.lng, next.lng, segmentProgress)
  };
}
```

---

## 3. 实施计划

### 3.1 阶段划分

#### 阶段 1: 路径规划 UI (1.5 小时)
- [ ] 新增路径规划工具按钮
- [ ] 实现点击添加路径点
- [ ] 实时绘制路径线
- [ ] 显示路径长度

#### 阶段 2: 路径保存与管理 (1 小时)
- [ ] 保存路径到列表
- [ ] 路径列表面板
- [ ] 加载已保存路径
- [ ] 删除路径

#### 阶段 3: AGV 沿路径移动 (1.5 小时)
- [ ] 实现路径移动算法
- [ ] AGV 绑定路径
- [ ] 实时位置更新
- [ ] 到达终点自动停止

### 3.2 界面布局

```
┌─────────────────────────────────────────────────────┐
│ [监控] [路径规划] [任务]     [开始] [暂停] [重置]   │
├──────────┬─────────────────────────┬────────────────┤
│ 路径列表  │      地图区域           │   AGV 详情     │
│          │                         │                │
│ - 路线 1  │   • 路径点标记🔵       │ 当前路径：路线 1│
│ - 路线 2  │   • 路径连线━━━       │ 进度：65%     │
│ - 路线 3  │   • AGV 位置🚗         │ 下一站：W3    │
│          │                         │ 预计：2 分钟   │
└──────────┴─────────────────────────┴────────────────┘
```

---

## 4. 验收标准

- [ ] 可在地图上绘制路径
- [ ] 路径显示清晰，可编辑
- [ ] AGV 能沿路径平滑移动
- [ ] 移动速度可调
- [ ] 到达终点自动停止
- [ ] 路径可保存和加载

---

**审批**: 待确认  
**状态**: ⏳ 待实施
