# CAD LOD 分层规格说明

**版本**: 1.0  
**创建时间**: 2026-04-15  
**状态**: 待实施

---

## 1. LOD 分层设计

### 1.1 分层规则

```typescript
interface LODLevel {
  minZoom: number;      // 最小 zoom
  maxZoom: number;      // 最大 zoom
  ratio: number;        // 返回比例 (0.0-1.0)
  tolerance: number;    // 简化容差
  priority: string;     // 优先级策略
}

const LOD_CONFIG: LODLevel[] = [
  { minZoom: 0, maxZoom: 10, ratio: 0.01, tolerance: 0.01, priority: 'major' },
  { minZoom: 10, maxZoom: 12, ratio: 0.05, tolerance: 0.005, priority: 'major' },
  { minZoom: 12, maxZoom: 14, ratio: 0.20, tolerance: 0.001, priority: 'medium' },
  { minZoom: 14, maxZoom: 16, ratio: 0.50, tolerance: 0.0005, priority: 'minor' },
  { minZoom: 16, maxZoom: 20, ratio: 1.00, tolerance: 0, priority: 'all' }
];
```

### 1.2 优先级策略

#### Priority: 'major' (zoom < 12)
- 只返回主要结构
- 优先返回：LWPOLYLINE, POLYLINE（轮廓线）
- 忽略：POINT, INSERT（细节点）

#### Priority: 'medium' (zoom 12-14)
- 返回主要结构 + 次要结构
- 优先返回：长度 > 100 单位的线段
- 忽略：长度 < 10 单位的短线段

#### Priority: 'minor' (zoom 14-16)
- 返回大部分实体
- 优先返回：所有 LINE, LWPOLYLINE
- 忽略：部分重复的 INSERT

#### Priority: 'all' (zoom > 16)
- 返回所有实体
- 不进行过滤

---

## 2. 实体过滤算法

### 2.1 基于类型的过滤

```typescript
function filterByType(entities: Entity[], priority: string): Entity[] {
  switch (priority) {
    case 'major':
      // 只返回轮廓线
      return entities.filter(e => 
        ['LWPOLYLINE', 'POLYLINE'].includes(e.type)
      );
    
    case 'medium':
      // 返回轮廓线 + 主要线段
      return entities.filter(e => 
        ['LWPOLYLINE', 'POLYLINE', 'LINE'].includes(e.type) ||
        (e.type === 'INSERT' && e.properties.importance === 'high')
      );
    
    case 'minor':
      // 返回大部分，忽略少量重复
      return filterDuplicates(entities, 0.5);
    
    case 'all':
    default:
      return entities;
  }
}
```

### 2.2 基于长度的过滤

```typescript
function filterByLength(entities: Entity[], minLength: number): Entity[] {
  return entities.filter(e => {
    if (e.type === 'LINE') {
      const length = calculateLength(e.geometry.start, e.geometry.end);
      return length >= minLength;
    }
    
    if (e.type === 'LWPOLYLINE' || e.type === 'POLYLINE') {
      const length = calculatePolylineLength(e.geometry.vertices);
      return length >= minLength;
    }
    
    return true; // 其他类型不过滤
  });
}
```

### 2.3 基于重要性的过滤

```typescript
// 在 DXF 解析时标记重要性
function markImportance(entity: Entity): void {
  // 建筑物轮廓 - 高重要性
  if (entity.layer === 'BUILDING' || entity.layer === 'WALL') {
    entity.properties.importance = 'high';
  }
  
  // 主要设备 - 中重要性
  if (entity.layer === 'EQUIPMENT' && entity.type === 'INSERT') {
    entity.properties.importance = 'medium';
  }
  
  // 标注文字 - 低重要性
  if (entity.type === 'TEXT' || entity.type === 'MTEXT') {
    entity.properties.importance = 'low';
  }
}

// 根据重要性过滤
function filterByImportance(entities: Entity[], minImportance: string): Entity[] {
  const importanceOrder = { 'high': 3, 'medium': 2, 'low': 1 };
  const minLevel = importanceOrder[minImportance];
  
  return entities.filter(e => {
    const level = importanceOrder[e.properties.importance || 'low'];
    return level >= minLevel;
  });
}
```

---

## 3. 视口裁剪规格

### 3.1 坐标转换

```typescript
// CAD 坐标 → 地理坐标
function cadToGeo(x: number, y: number, context: TransformContext): LatLng {
  return {
    lat: context.mapCenter.lat + (y - context.cadCenterY) * context.scale,
    lng: context.mapCenter.lng + (x - context.cadCenterX) * context.scale
  };
}

// 地理坐标 → CAD 坐标
function geoToCad(lat: number, lng: number, context: TransformContext): Point {
  return {
    x: context.cadCenterX + (lng - context.mapCenter.lng) / context.scale,
    y: context.cadCenterY + (lat - context.mapCenter.lat) / context.scale
  };
}
```

### 3.2 视口检测

```typescript
interface Viewport {
  north: number;
  south: number;
  east: number;
  west: number;
}

function isInViewport(entity: Entity, viewport: Viewport, context: TransformContext): boolean {
  const geo = cadToGeo(entity.geometry, context);
  
  return geo.lat >= viewport.south &&
         geo.lat <= viewport.north &&
         geo.lng >= viewport.west &&
         geo.lng <= viewport.east;
}

// 带缓冲区的视口检测
function isInViewportWithBuffer(entity: Entity, viewport: Viewport, buffer: number = 0.2): boolean {
  const paddedViewport = {
    north: viewport.north + buffer,
    south: viewport.south - buffer,
    east: viewport.east + buffer,
    west: viewport.west - buffer
  };
  
  return isInViewport(entity, paddedViewport);
}
```

### 3.3 批量裁剪

```typescript
function clipToViewport(entities: Entity[], viewport: Viewport, context: TransformContext): Entity[] {
  // 使用空间索引加速查询
  const index = buildSpatialIndex(entities, context);
  return index.query(viewport);
}

// 构建 R-Tree 空间索引
function buildSpatialIndex(entities: Entity[], context: TransformContext): RTree {
  const rtree = new RTree();
  
  entities.forEach((entity, index) => {
    const bounds = getEntityBounds(entity, context);
    rtree.insert({
      minX: bounds.west,
      minY: bounds.south,
      maxX: bounds.east,
      maxY: bounds.north,
      id: index
    });
  });
  
  return rtree;
}
```

---

## 4. 数据简化规格

### 4.1 Douglas-Peucker 算法

```typescript
/**
 * Douglas-Peucker 多段线简化算法
 * @param points 原始点集
 * @param tolerance 简化容差（值越大，简化越多）
 * @returns 简化后的点集
 */
function douglasPeucker(points: Point[], tolerance: number): Point[] {
  if (points.length < 3) return points;
  
  // 找到距离基线最远的点
  let maxDist = 0;
  let maxIndex = 0;
  const start = points[0];
  const end = points[points.length - 1];
  
  for (let i = 1; i < points.length - 1; i++) {
    const dist = perpendicularDistance(points[i], start, end);
    if (dist > maxDist) {
      maxDist = dist;
      maxIndex = i;
    }
  }
  
  // 如果最远点距离大于容差，递归简化
  if (maxDist > tolerance) {
    const left = douglasPeucker(points.slice(0, maxIndex + 1), tolerance);
    const right = douglasPeucker(points.slice(maxIndex), tolerance);
    return [...left.slice(0, -1), ...right];
  } else {
    // 否则只保留端点
    return [start, end];
  }
}

// 计算点到线段的垂直距离
function perpendicularDistance(point: Point, lineStart: Point, lineEnd: Point): number {
  const dx = lineEnd.x - lineStart.x;
  const dy = lineEnd.y - lineStart.y;
  const lenSq = dx * dx + dy * dy;
  
  if (lenSq === 0) {
    return Math.sqrt((point.x - lineStart.x) ** 2 + (point.y - lineStart.y) ** 2);
  }
  
  const t = Math.max(0, Math.min(1, 
    ((point.x - lineStart.x) * dx + (point.y - lineStart.y) * dy) / lenSq
  ));
  
  const projX = lineStart.x + t * dx;
  const projY = lineStart.y + t * dy;
  
  return Math.sqrt((point.x - projX) ** 2 + (point.y - projY) ** 2);
}
```

### 4.2 容差计算

```typescript
/**
 * 根据 zoom level 计算简化容差
 * zoom 越小，容差越大，简化越多
 */
function calculateTolerance(zoom: number): number {
  // 指数衰减：zoom 每增加 1，容差减半
  const baseTolerance = 0.01;  // zoom=0 时的容差
  const halfLife = 2;          // 每 2 级 zoom，容差减半
  
  return baseTolerance * Math.pow(0.5, (zoom / halfLife));
}

// 容差对照表
const TOLERANCE_TABLE = {
  0: 0.01,      // 世界视图
  5: 0.005,     // 国家视图
  10: 0.001,    // 省级视图
  12: 0.0005,   // 市级视图
  14: 0.0001,   // 区级视图
  16: 0.00005,  // 街道视图
  18: 0.00001,  // 建筑视图
  20: 0         // 不简化
};
```

### 4.3 简化应用

```typescript
function simplifyEntity(entity: Entity, tolerance: number): Entity {
  if (!entity.geometry || tolerance === 0) {
    return entity;
  }
  
  const simplified = { ...entity };
  
  switch (entity.type) {
    case 'LWPOLYLINE':
    case 'POLYLINE':
      simplified.geometry = {
        ...entity.geometry,
        vertices: douglasPeucker(entity.geometry.vertices, tolerance)
      };
      break;
    
    case 'LINE':
      // 线段不简化，只有两个点
      break;
    
    case 'CIRCLE':
      // 圆不简化
      break;
  }
  
  return simplified;
}
```

---

## 5. 性能优化

### 5.1 缓存策略

```typescript
// LOD 缓存
const lodCache = new Map<string, {
  data: Entity[];
  zoom: number;
  bounds: Viewport;
  timestamp: number
}>();

function getFromCache(key: string, zoom: number, bounds: Viewport): Entity[] | null {
  const cached = lodCache.get(key);
  
  if (!cached) return null;
  
  // 缓存过期检查（5 分钟）
  if (Date.now() - cached.timestamp > 5 * 60 * 1000) {
    lodCache.delete(key);
    return null;
  }
  
  // zoom 级别匹配
  if (Math.abs(cached.zoom - zoom) > 1) {
    return null;
  }
  
  // 视口重叠检查
  if (!viewportsOverlap(cached.bounds, bounds)) {
    return null;
  }
  
  return cached.data;
}

function setCache(key: string, data: Entity[], zoom: number, bounds: Viewport): void {
  lodCache.set(key, {
    data,
    zoom,
    bounds,
    timestamp: Date.now()
  });
  
  // 限制缓存大小
  if (lodCache.size > 100) {
    const oldest = Array.from(lodCache.entries())
      .sort((a, b) => a[1].timestamp - b[1].timestamp)[0][0];
    lodCache.delete(oldest);
  }
}
```

### 5.2 增量加载

```typescript
// 分块加载大量实体
async function loadEntitiesIncrementally(
  filename: string,
  zoom: number,
  bounds: Viewport,
  batchSize: number = 1000
): Promise<Entity[]> {
  const allEntities: Entity[] = [];
  let offset = 0;
  let hasMore = true;
  
  while (hasMore) {
    const batch = await fetchEntities(filename, zoom, bounds, offset, batchSize);
    allEntities.push(...batch);
    
    hasMore = batch.length === batchSize;
    offset += batchSize;
    
    // 每批之间暂停，避免阻塞 UI
    if (hasMore) {
      await new Promise(resolve => setTimeout(resolve, 10));
    }
  }
  
  return allEntities;
}
```

---

## 6. 测试用例

### 6.1 LOD 分级测试

```typescript
describe('LOD 分级', () => {
  it('zoom=10 应该返回 1% 实体', async () => {
    const result = await filterByLOD(entities, 10);
    expect(result.length).toBeCloseTo(entities.length * 0.01, 1);
  });
  
  it('zoom=14 应该返回 20% 实体', async () => {
    const result = await filterByLOD(entities, 14);
    expect(result.length).toBeCloseTo(entities.length * 0.20, 1);
  });
  
  it('zoom=18 应该返回 100% 实体', async () => {
    const result = await filterByLOD(entities, 18);
    expect(result.length).toBe(entities.length);
  });
});
```

### 6.2 视口裁剪测试

```typescript
describe('视口裁剪', () => {
  it('应该只返回视口内的实体', () => {
    const viewport = { north: 40, south: 39, east: 117, west: 116 };
    const result = clipToViewport(entities, viewport, context);
    
    result.forEach(entity => {
      const geo = cadToGeo(entity.geometry, context);
      expect(geo.lat).toBeGreaterThanOrEqual(39);
      expect(geo.lat).toBeLessThanOrEqual(40);
    });
  });
});
```

### 6.3 数据简化测试

```typescript
describe('Douglas-Peucker 简化', () => {
  it('应该减少点数但保持形状', () => {
    const original = generateTestPolyline(1000);  // 1000 个点
    const simplified = douglasPeucker(original, 0.001);
    
    expect(simplified.length).toBeLessThan(original.length);
    expect(simplified.length).toBeGreaterThan(10);  // 至少保留关键点
    
    // 形状相似度检查
    const similarity = calculateShapeSimilarity(original, simplified);
    expect(similarity).toBeGreaterThan(0.95);
  });
});
```

---

**审批**:
- [ ] 技术负责人
- [ ] 架构师

**状态**: ⏳ 待审批
