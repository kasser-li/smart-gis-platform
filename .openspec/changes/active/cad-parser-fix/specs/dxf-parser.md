# DXF 解析规格说明

**版本**: 1.0  
**创建时间**: 2026-04-15  
**状态**: 已完成

---

## 1. 功能描述

使用专业 DXF 解析库 `dxf-parser` 正确解析 DXF 文件，提取所有图层和实体信息，并在地图上正确显示。

---

## 2. 技术规格

### 2.1 依赖库

```json
{
  "name": "dxf-parser",
  "version": "latest",
  "description": "DXF file parser for AutoCAD drawings",
  "supported_formats": ["DXF R12", "DXF 2000", "DXF 2004", "DXF 2007", "DXF 2010", "DXF 2018"]
}
```

### 2.2 支持的实体类型

| 实体类型 | 说明 | 几何信息 |
|----------|------|----------|
| LINE | 线段 | start{x,y}, end{x,y} |
| POINT | 点 | x, y |
| LWPOLYLINE | 轻量多段线 | vertices[{x,y}] |
| POLYLINE | 多段线 | vertices[{x,y}] |
| CIRCLE | 圆 | center{x,y}, radius |
| ARC | 弧 | center{x,y}, radius, startAngle, endAngle |
| TEXT | 文字 | position{x,y}, text |
| MTEXT | 多行文字 | position{x,y}, text |
| SPLINE | 样条曲线 | controlPoints[{x,y}] |
| ELLIPSE | 椭圆 | center{x,y}, majorAxis, minorAxis |

### 2.3 数据结构

#### CADFile
```typescript
interface CADFile {
  filename: string;           // 文件名
  layers: CADLayer[];         // 图层列表
  metadata: {
    version: string;          // DXF 版本
    units: string;            // 单位
    extents: {
      minX: number;
      minY: number;
      maxX: number;
      maxY: number;
    };
  };
  uploadTime: Date;           // 上传时间
}
```

#### CADLayer
```typescript
interface CADLayer {
  name: string;               // 图层名称
  color: number;              // 颜色索引
  visible: boolean;           // 是否可见
  entities: CADEntity[];      // 实体列表
}
```

#### CADEntity
```typescript
interface CADEntity {
  type: string;               // 实体类型
  layer: string;              // 所属图层
  properties: Record<string, any>;  // 原始属性
  geometry: {                 // 几何信息
    start?: {x: number, y: number};
    end?: {x: number, y: number};
    center?: {x: number, y: number};
    radius?: number;
    vertices?: Array<{x: number, y: number}>;
    text?: string;
  };
}
```

---

## 3. 解析流程

### 3.1 流程图

```
用户上传 DXF 文件
    ↓
读取文件内容（UTF-8）
    ↓
dxf-parser.parseSync(content)
    ↓
解析 DXF 数据结构
    ├─ header（版本、单位等）
    ├─ tables（图层定义）
    ├─ entities（所有实体）
    └─ blocks（块定义）
    ↓
转换图层和实体
    ↓
计算坐标范围
    ↓
返回标准化数据
```

### 3.2 代码实现

```typescript
import DxfParser from 'dxf-parser';

const parser = new DxfParser();

async parseDXF(filePath: string, filename: string): Promise<CADFile> {
  const content = fs.readFileSync(filePath, 'utf-8');
  const dxfData = parser.parseSync(content);
  
  // 转换图层
  const layers = this.convertLayers(dxfData);
  
  // 计算范围
  const extents = this.calculateExtentsFromDXF(dxfData);
  
  return {
    filename,
    layers,
    metadata: {
      version: dxfData.header?.ACADVER || 'Unknown',
      units: this.getUnits(dxfData.header?.MEASUREMENT),
      extents
    },
    uploadTime: new Date()
  };
}
```

---

## 4. 坐标系统

### 4.1 坐标类型检测

```typescript
function isGeoCoordinate(extents: Extents): boolean {
  return extents.minX >= -180 && extents.maxX <= 180 &&
         extents.minY >= -90 && extents.maxY <= 90;
}
```

### 4.2 坐标转换

#### 地理坐标（已经是经纬度）
```typescript
// 直接使用
const lat = entity.geometry.y;
const lng = entity.geometry.x;
```

#### 平面坐标（CAD 坐标）
```typescript
// 以地图中心为基准，按比例缩放
const scale = 0.00001; // 1 CAD 单位 ≈ 0.00001 度
const lat = mapCenter.lat + (y - cadCenterY) * scale;
const lng = mapCenter.lng + (x - cadCenterX) * scale;
```

### 4.3 单位转换

| MEASUREMENT 值 | 单位 | 说明 |
|----------------|------|------|
| 0 | 英寸 | Imperial |
| 1 | 英尺 | Imperial |
| 2 | 英里 | Imperial |
| 3 | 毫米 | Metric |
| 4 | 厘米 | Metric |
| 5 | 米 | Metric |
| 6 | 千米 | Metric |

---

## 5. 错误处理

### 5.1 常见错误

#### 错误 1：文件不存在
```typescript
if (!fs.existsSync(filePath)) {
  throw new Error(`文件不存在：${filePath}`);
}
```

#### 错误 2：文件格式错误
```typescript
try {
  const dxfData = parser.parseSync(content);
} catch (error) {
  logger.error('DXF 解析失败:', error);
  throw new Error(`DXF 文件格式错误：${error.message}`);
}
```

#### 错误 3：没有实体
```typescript
if (layers.reduce((sum, l) => sum + l.entities.length, 0) === 0) {
  logger.warn('DXF 文件没有实体');
  // 不抛出错误，返回空数据
}
```

### 5.2 日志记录

```typescript
logger.info(`开始解析 DXF 文件：${filename}`);
logger.info(`DXF 解析成功：${dxfData.entities?.length || 0} 个实体`);
logger.info(`DXF 解析完成：${layers.length} 个图层，${totalEntities} 个实体`);
logger.error('DXF 解析失败:', error);
```

---

## 6. 性能优化

### 6.1 大文件处理

```typescript
// 使用流式读取大文件
const readStream = fs.createReadStream(filePath, { encoding: 'utf-8' });
let content = '';
readStream.on('data', chunk => content += chunk);
```

### 6.2 缓存机制

```typescript
// 缓存已解析的文件
const cache = new Map<string, CADFile>();

if (cache.has(filePath)) {
  return cache.get(filePath);
}

const result = await parseDXF(filePath, filename);
cache.set(filePath, result);
```

---

## 7. 测试用例

### 7.1 单元测试

```typescript
describe('CADService', () => {
  it('应该正确解析 DXF 文件', async () => {
    const result = await cadService.parseDXF('test.dxf', 'test.dxf');
    expect(result.layers.length).toBeGreaterThan(0);
    expect(result.metadata.extents).toBeDefined();
  });
  
  it('应该正确处理地理坐标', () => {
    const extents = { minX: -180, maxX: 180, minY: -90, maxY: 90 };
    expect(isGeoCoordinate(extents)).toBe(true);
  });
  
  it('应该正确处理平面坐标', () => {
    const extents = { minX: 0, maxX: 1000, minY: 0, maxY: 500 };
    expect(isGeoCoordinate(extents)).toBe(false);
  });
});
```

### 7.2 集成测试

```bash
# 测试小文件
curl -X POST http://localhost:3000/api/cad/upload \
  -F "file=@test-small.dxf"

# 测试大文件（分片上传）
curl -X POST http://localhost:3000/api/cad/upload \
  -F "file=@test-large.dxf"
```

---

## 8. 验收标准

- [x] 能正确解析 DXF R12-R2018 格式
- [x] 支持所有常见实体类型
- [x] 正确提取图层信息
- [x] 正确计算坐标范围
- [x] 地理坐标和平面坐标都能正确处理
- [x] 错误处理完善
- [x] 日志记录详细
- [x] 性能满足要求（17MB 文件 <10 秒）

---

**审批**:
- [x] 技术负责人
- [x] 测试负责人

**状态**: ✅ 已完成
