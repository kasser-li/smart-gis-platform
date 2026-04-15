# CAD 渲染性能优化 - 任务分解

**创建时间**: 2026-04-15  
**状态**: 进行中  
**总工时**: 12 小时

---

## 阶段 1: 后端 LOD 过滤 (4 小时)

### ✅ 任务 1.1: 实现 LOD 配置
- **优先级**: P0
- **预估时间**: 1 小时
- **状态**: ⏳ 待实施

**实施步骤**:
```typescript
// 1. 创建 LOD 配置文件
backend/src/config/lod.config.ts

// 2. 定义 LOD 级别
export const LOD_CONFIG = [
  { minZoom: 0, maxZoom: 10, ratio: 0.01, tolerance: 0.01, priority: 'major' },
  { minZoom: 10, maxZoom: 12, ratio: 0.05, tolerance: 0.005, priority: 'major' },
  { minZoom: 12, maxZoom: 14, ratio: 0.20, tolerance: 0.001, priority: 'medium' },
  { minZoom: 14, maxZoom: 16, ratio: 0.50, tolerance: 0.0005, priority: 'minor' },
  { minZoom: 16, maxZoom: 20, ratio: 1.00, tolerance: 0, priority: 'all' }
];

// 3. 导出配置
export function getLODConfig(zoom: number): LODLevel {
  return LOD_CONFIG.find(l => zoom >= l.minZoom && zoom < l.maxZoom) || LOD_CONFIG[4];
}
```

**验收标准**:
- [ ] LOD_CONFIG 定义完整
- [ ] getLODConfig 函数正确
- [ ] 单元测试通过

---

### ✅ 任务 1.2: 实现实体过滤
- **优先级**: P0
- **预估时间**: 1.5 小时
- **状态**: ⏳ 待实施

**实施步骤**:
```typescript
// backend/src/services/cad-filter.service.ts

// 1. 创建过滤服务
class CADFilterService {
  // 按 LOD 级别过滤
  filterByLOD(entities: Entity[], zoom: number): Entity[] {
    const config = getLODConfig(zoom);
    return this.filterByRatio(entities, config.ratio, config.priority);
  }
  
  // 按比例过滤
  filterByRatio(entities: Entity[], ratio: number, priority: string): Entity[] {
    if (ratio >= 1.0) return entities;
    
    // 按优先级排序
    const sorted = this.sortByPriority(entities, priority);
    
    // 返回前 N%
    const count = Math.floor(entities.length * ratio);
    return sorted.slice(0, count);
  }
  
  // 按优先级排序
  sortByPriority(entities: Entity[], priority: string): Entity[] {
    // 实现优先级排序逻辑
  }
}

// 2. 在 cad.service.ts 中调用
const filterService = new CADFilterService();
const filteredEntities = filterService.filterByLOD(allEntities, zoom);
```

**验收标准**:
- [ ] filterByLOD 函数正确
- [ ] 按优先级排序正确
- [ ] 返回数量符合预期

---

### ✅ 任务 1.3: 实现视口裁剪
- **优先级**: P0
- **预估时间**: 1.5 小时
- **状态**: ⏳ 待实施

**实施步骤**:
```typescript
// backend/src/services/viewport-clip.service.ts

class ViewportClipService {
  // 裁剪到视口
  clipToViewport(entities: Entity[], bounds: Viewport, context: TransformContext): Entity[] {
    return entities.filter(entity => {
      const geo = this.cadToGeo(entity.geometry, context);
      return this.isInViewport(geo, bounds);
    });
  }
  
  // CAD 坐标转地理坐标
  cadToGeo(geometry: any, context: TransformContext): LatLng {
    // 实现坐标转换
  }
  
  // 检查是否在视口内
  isInViewport(latLng: LatLng, bounds: Viewport): boolean {
    return latLng.lat >= bounds.south &&
           latLng.lat <= bounds.north &&
           latLng.lng >= bounds.west &&
           latLng.lng <= bounds.east;
  }
}
```

**验收标准**:
- [ ] 坐标转换正确
- [ ] 视口检测准确
- [ ] 只返回视口内实体

---

### ✅ 任务 1.4: 修改合并接口
- **优先级**: P0
- **预估时间**: 1 小时
- **状态**: ⏳ 待实施

**实施步骤**:
```typescript
// backend/src/controllers/cad.controller.ts

export const mergeChunks = async (req: Request, res: Response) => {
  const { chunkId, filename, totalChunks, renderOptions } = req.body;
  
  // ... 合并分片 ...
  
  // 解析 CAD
  const cadFile = await cadService.parseDXF(outputFile, filename);
  
  // 应用 LOD 过滤
  if (renderOptions) {
    const { zoom, bounds } = renderOptions;
    cadFile.layers = applyLOD(cadFile.layers, zoom, bounds);
  }
  
  res.json({
    code: 200,
    data: {
      ...cadFile,
      metadata: {
        ...cadFile.metadata,
        totalEntities: originalCount,
        returnedEntities: filteredCount,
        simplified: true,
        zoomLevel: zoom
      }
    }
  });
};
```

**验收标准**:
- [ ] 接口接受 renderOptions
- [ ] LOD 过滤生效
- [ ] 返回元数据正确

---

## 阶段 2: 数据简化算法 (4 小时)

### ✅ 任务 2.1: 实现 Douglas-Peucker 算法
- **优先级**: P0
- **预估时间**: 2 小时
- **状态**: ⏳ 待实施

**实施步骤**:
```typescript
// backend/src/utils/douglas-peucker.ts

export function douglasPeucker(points: Point[], tolerance: number): Point[] {
  // 实现 DP 算法
}

export function simplifyEntity(entity: Entity, tolerance: number): Entity {
  // 简化实体
}
```

**验收标准**:
- [ ] DP 算法正确
- [ ] 简化后点数减少
- [ ] 形状保持相似

---

### ✅ 任务 2.2: 集成简化到 LOD
- **优先级**: P0
- **预估时间**: 1 小时
- **状态**: ⏳ 待实施

**实施步骤**:
```typescript
// 在 filterByLOD 中应用简化
function filterByLOD(entities: Entity[], zoom: number): Entity[] {
  const config = getLODConfig(zoom);
  
  // 先过滤
  const filtered = this.filterByRatio(entities, config.ratio);
  
  // 再简化
  if (config.tolerance > 0) {
    return filtered.map(e => simplifyEntity(e, config.tolerance));
  }
  
  return filtered;
}
```

**验收标准**:
- [ ] 简化与过滤集成
- [ ] 性能提升明显

---

### ✅ 任务 2.3: 性能测试
- **优先级**: P1
- **预估时间**: 1 小时
- **状态**: ⏳ 待实施

**测试用例**:
```bash
# 测试不同 zoom 级别
for zoom in 10 12 14 16 18; do
  time curl -X POST /api/cad/merge-chunks \
    -d "{\"zoom\": $zoom}"
done
```

**验收标准**:
- [ ] zoom=10: <500ms
- [ ] zoom=14: <1500ms
- [ ] zoom=18: <5000ms

---

## 阶段 3: 前端优化 (4 小时)

### ✅ 任务 3.1: 添加 zoom 监听
- **优先级**: P0
- **预估时间**: 1 小时
- **状态**: ⏳ 待实施

**实施步骤**:
```typescript
// frontend/src/views/MapView.vue

// 监听 zoom 变化
map.on('zoomend', () => {
  const zoom = map.getZoom();
  debouncedReloadEntities(zoom);
});

// 防抖重载
const debouncedReloadEntities = debounce((zoom: number) => {
  loadEntitiesByZoom(zoom);
}, 300);
```

**验收标准**:
- [ ] zoom 监听正常
- [ ] 防抖生效

---

### ✅ 任务 3.2: 添加视口监听
- **优先级**: P0
- **预估时间**: 1 小时
- **状态**: ⏳ 待实施

**实施步骤**:
```typescript
// 监听地图移动
map.on('moveend', () => {
  const bounds = map.getBounds();
  reloadVisibleEntities(bounds);
});

// 加载可见区域实体
async function reloadVisibleEntities(bounds: L.LatLngBounds) {
  const response = await axios.post('/api/cad/entities/query', {
    filename: currentFile,
    zoom: map.getZoom(),
    bounds: {
      north: bounds.getNorth(),
      south: bounds.getSouth(),
      east: bounds.getEast(),
      west: bounds.getWest()
    }
  });
  
  renderEntities(response.data.entities);
}
```

**验收标准**:
- [ ] 移动监听正常
- [ ] 只加载可见区域

---

### ✅ 任务 3.3: 添加加载进度
- **优先级**: P2
- **预估时间**: 1 小时
- **状态**: ⏳ 待实施

**实施步骤**:
```typescript
// 显示加载进度
ElMessage.info(`正在加载 ${count} 个实体...`);

// 加载完成
ElMessage.success(`加载完成，渲染 ${renderedCount} 个实体`);
```

**验收标准**:
- [ ] 进度提示清晰
- [ ] 用户知道在加载

---

### ✅ 任务 3.4: 性能优化
- **优先级**: P1
- **预估时间**: 1 小时
- **状态**: ⏳ 待实施

**实施步骤**:
```typescript
// 使用 requestAnimationFrame 渲染
requestAnimationFrame(() => {
  renderEntities(entities);
});

// 分批渲染
function renderInBatches(entities: Entity[], batchSize: number = 500) {
  let index = 0;
  
  function renderBatch() {
    const batch = entities.slice(index, index + batchSize);
    batch.forEach(renderEntity);
    index += batchSize;
    
    if (index < entities.length) {
      requestAnimationFrame(renderBatch);
    }
  }
  
  renderBatch();
}
```

**验收标准**:
- [ ] 渲染不卡顿
- [ ] FPS > 50

---

## 总结

### 时间统计

| 阶段 | 任务数 | 预估时间 | 实际时间 | 状态 |
|------|--------|----------|----------|------|
| 阶段 1: 后端 LOD | 4 | 4h | - | ⏳ |
| 阶段 2: 数据简化 | 3 | 4h | - | ⏳ |
| 阶段 3: 前端优化 | 4 | 4h | - | ⏳ |
| **总计** | **11** | **12h** | **-** | **⏳** |

### 交付物

- [ ] backend/src/config/lod.config.ts
- [ ] backend/src/services/cad-filter.service.ts
- [ ] backend/src/services/viewport-clip.service.ts
- [ ] backend/src/utils/douglas-peucker.ts
- [ ] frontend 优化后的 MapView.vue
- [ ] 性能测试报告

### 验收标准

- [ ] 接口响应 <2s (zoom<14)
- [ ] 前端渲染 <1s
- [ ] FPS > 50
- [ ] 内存 <100MB

---

**状态**: ⏳ 实施中  
**开始时间**: 2026-04-15 17:52  
**预计完成**: 2026-04-15 20:00
