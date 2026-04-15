# CAD 坐标转换规格说明

**版本**: 1.0  
**创建时间**: 2026-04-15  
**状态**: 已完成

---

## 1. 问题描述

### 1.1 背景
CAD 图纸使用**平面坐标系**（单位：毫米/米），而地图使用**地理坐标系**（单位：经纬度）。直接渲染会导致坐标超出地球范围。

### 1.2 问题示例

**白坪.dxf 坐标范围**:
```
minX: -1000, minY: 0
maxX: 330, maxY: 330
```

如果直接当作经纬度：
- ❌ 经度 -1000°（超出 -180~180）
- ❌ 纬度 330°（超出 -90~90）

**结果**: 图形在地球范围外，无法显示

---

## 2. 解决方案

### 2.1 智能坐标检测

```typescript
function isGeoCoordinate(extents: Extents): boolean {
  return extents.minX >= -180 && extents.maxX <= 180 &&
         extents.minY >= -90 && extents.maxY <= 90;
}
```

**判断逻辑**:
- ✅ 如果坐标在 [-180, 180] × [-90, 90] 范围内 → 地理坐标，直接使用
- ❌ 否则 → 平面坐标，需要转换

### 2.2 坐标转换算法

#### 方案：以地图中心为基准的仿射变换

```typescript
// 1. 计算 CAD 图中心点
const cadCenterX = (extents.minX + extents.maxX) / 2;
const cadCenterY = (extents.minY + extents.maxY) / 2;

// 2. 获取当前地图中心
const mapCenter = map.getCenter(); // {lat, lng}

// 3. 定义比例尺（CAD 单位 → 地图单位）
const scale = 0.00001; // 1 CAD 单位 ≈ 0.00001 度 ≈ 1.11 米

// 4. 坐标转换
function convertCadToGeo(x: number, y: number): {lat: number, lng: number} {
  const lat = mapCenter.lat + (y - cadCenterY) * scale;
  const lng = mapCenter.lng + (x - cadCenterX) * scale;
  return { lat, lng };
}
```

### 2.3 比例尺选择

| CAD 单位 | 推荐比例尺 | 说明 |
|----------|-----------|------|
| 毫米 | 0.0000001 | 1mm ≈ 0.0000001° |
| 厘米 | 0.000001 | 1cm ≈ 0.000001° |
| 米 | 0.00001 | 1m ≈ 0.00001° |
| 千米 | 0.01 | 1km ≈ 0.01° |

**默认值**: `scale = 0.00001`（假设 CAD 单位为米）

---

## 3. 实现细节

### 3.1 前端实现

```typescript
// 文件：frontend/src/views/MapView.vue

const renderCadFile = (cadData: any) => {
  const extents = cadData.metadata?.extents;
  
  // 1. 检测坐标类型
  const isGeoCoordinate = 
    extents.minX >= -180 && extents.maxX <= 180 &&
    extents.minY >= -90 && extents.maxY <= 90;
  
  // 2. 计算 CAD 图中心
  const cadCenterX = (extents.minX + extents.maxX) / 2;
  const cadCenterY = (extents.minY + extents.maxY) / 2;
  
  // 3. 获取地图中心
  const mapCenter = map?.getCenter() || { lat: 39.9042, lng: 116.4074 };
  
  // 4. 定义比例尺
  const scale = isGeoCoordinate ? 1 : 0.00001;
  
  // 5. 遍历实体并转换坐标
  cadData.layers.forEach(layer => {
    layer.entities.forEach(entity => {
      if (entity.type === 'LINE') {
        const { start, end } = entity.geometry;
        
        let latLngs: [number, number][];
        
        if (isGeoCoordinate) {
          // 地理坐标，直接使用
          latLngs = [[start.y, start.x], [end.y, end.x]];
        } else {
          // 平面坐标，转换
          latLngs = [
            [
              mapCenter.lat + (start.y - cadCenterY) * scale,
              mapCenter.lng + (start.x - cadCenterX) * scale
            ],
            [
              mapCenter.lat + (end.y - cadCenterY) * scale,
              mapCenter.lng + (end.x - cadCenterX) * scale
            ]
          ];
        }
        
        const polyline = L.polyline(latLngs, {
          color: '#ff0000',
          weight: 2,
          opacity: 0.8
        });
        cadLayerGroup.addLayer(polyline);
      }
    });
  });
  
  // 6. 自动调整视图
  const bounds = cadLayerGroup.getBounds();
  if (bounds.isValid()) {
    map?.fitBounds(bounds, { padding: [50, 50] });
  }
};
```

### 3.2 后端实现

```typescript
// 文件：backend/src/services/cad.service.ts

private calculateExtentsFromDXF(dxfData: any): Extents {
  const extents = {
    minX: Infinity,
    minY: Infinity,
    maxX: -Infinity,
    maxY: -Infinity
  };
  
  if (dxfData.entities) {
    dxfData.entities.forEach((entity: any) => {
      this.updateExtents(entity, extents);
    });
  }
  
  if (extents.minX === Infinity) {
    return { minX: 0, minY: 0, maxX: 0, maxY: 0 };
  }
  
  return extents;
}

private updateExtents(entity: any, extents: any) {
  // 处理顶点
  if (entity.vertices) {
    entity.vertices.forEach((v: any) => {
      if (v.x !== undefined) extents.minX = Math.min(extents.minX, v.x);
      if (v.y !== undefined) extents.minY = Math.min(extents.minY, v.y);
      if (v.x !== undefined) extents.maxX = Math.max(extents.maxX, v.x);
      if (v.y !== undefined) extents.maxY = Math.max(extents.maxY, v.y);
    });
  }
  
  // 处理圆心（圆和弧）
  if (entity.center) {
    const r = entity.radius || 0;
    extents.minX = Math.min(extents.minX, entity.center.x - r);
    extents.minY = Math.min(extents.minY, entity.center.y - r);
    extents.maxX = Math.max(extents.maxX, entity.center.x + r);
    extents.maxY = Math.max(extents.maxY, entity.center.y + r);
  }
}
```

---

## 4. 测试用例

### 4.1 坐标检测测试

```typescript
describe('坐标检测', () => {
  it('应该正确识别地理坐标', () => {
    const extents = { minX: 116.0, maxX: 117.0, minY: 39.0, maxY: 40.0 };
    expect(isGeoCoordinate(extents)).toBe(true);
  });
  
  it('应该正确识别平面坐标', () => {
    const extents = { minX: 0, maxX: 1000, minY: 0, maxY: 500 };
    expect(isGeoCoordinate(extents)).toBe(false);
  });
  
  it('应该处理边界情况', () => {
    const extents1 = { minX: -180, maxX: 180, minY: -90, maxY: 90 };
    expect(isGeoCoordinate(extents1)).toBe(true);
    
    const extents2 = { minX: -181, maxX: 181, minY: -91, maxY: 91 };
    expect(isGeoCoordinate(extents2)).toBe(false);
  });
});
```

### 4.2 坐标转换测试

```typescript
describe('坐标转换', () => {
  it('应该正确转换平面坐标', () => {
    const mapCenter = { lat: 39.9042, lng: 116.4074 };
    const cadCenter = { x: 0, y: 0 };
    const scale = 0.00001;
    
    // CAD 点 (100, 100)
    const cadPoint = { x: 100, y: 100 };
    
    // 转换为地理坐标
    const lat = mapCenter.lat + (cadPoint.y - cadCenter.y) * scale;
    const lng = mapCenter.lng + (cadPoint.x - cadCenter.x) * scale;
    
    expect(lat).toBeCloseTo(39.9052, 4);
    expect(lng).toBeCloseTo(116.4084, 4);
  });
});
```

### 4.3 集成测试

```bash
# 测试白坪.dxf（平面坐标）
curl -X POST http://localhost:3000/api/cad/upload \
  -F "file=@白坪.dxf"

# 预期结果：
# - 检测到平面坐标
# - 转换到地图中心附近
# - 自动调整视图
# - 显示 447 个实体
```

---

## 5. 性能优化

### 5.1 批量转换

```typescript
// 优化前：逐个转换
entities.forEach(entity => {
  const geo = convertCadToGeo(entity.x, entity.y);
  // ...
});

// 优化后：批量转换
const geoEntities = entities.map(entity => ({
  ...entity,
  geometry: {
    ...entity.geometry,
    start: convertCadToGeo(entity.geometry.start.x, entity.geometry.start.y),
    end: convertCadToGeo(entity.geometry.end.x, entity.geometry.end.y)
  }
}));
```

### 5.2 缓存转换结果

```typescript
const conversionCache = new Map<string, {lat: number, lng: number}>();

function convertWithCache(x: number, y: number): {lat: number, lng: number} {
  const key = `${x},${y}`;
  
  if (conversionCache.has(key)) {
    return conversionCache.get(key)!;
  }
  
  const result = convertCadToGeo(x, y);
  conversionCache.set(key, result);
  
  return result;
}
```

---

## 6. 注意事项

### 6.1 投影问题

**当前方案**: 简化的仿射变换（适用于小范围）

**局限性**:
- ❌ 不适用于大范围 CAD 图（>100km）
- ❌ 没有考虑地球曲率
- ❌ 没有考虑投影变形

**改进方案**（未来）:
- 使用专业投影库（proj4js）
- 支持 UTM、高斯 - 克吕格等投影
- 支持七参数转换

### 6.2 比例尺选择

**当前问题**: 固定比例尺 `0.00001` 可能不准确

**改进方案**:
```typescript
// 根据 CAD 图大小自动计算比例尺
const cadWidth = extents.maxX - extents.minX;
const mapWidth = 0.1; // 期望地图显示宽度（度）
const scale = mapWidth / cadWidth;
```

### 6.3 坐标原点

**注意**: CAD 坐标原点可能在左下角，地图坐标原点在左上角

**处理**:
```typescript
// 如果需要翻转 Y 轴
const lat = mapCenter.lat - (y - cadCenterY) * scale;
```

---

## 7. 验收标准

- [x] 能正确检测地理坐标和平面坐标
- [x] 平面坐标能正确转换到地图范围
- [x] 转换后的坐标在合理范围内
- [x] 自动调整地图视图
- [x] 图形显示位置合理
- [x] 性能满足要求（1000 个实体 <100ms）

---

**审批**:
- [x] 技术负责人
- [x] 测试负责人

**状态**: ✅ 已完成
