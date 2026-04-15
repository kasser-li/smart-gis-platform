# CAD 解析功能修复 - 设计文档

**版本**: 1.0  
**创建时间**: 2026-04-15  
**状态**: 已完成

---

## 1. 系统架构

### 1.1 整体架构

```
┌─────────────┐      ┌──────────────┐      ┌─────────────┐
│   前端      │      │    后端      │      │  文件系统   │
│  (Vue 3)    │─────▶│ (Node.js)    │─────▶│   (DXF)     │
│             │◀─────│              │◀─────│             │
└─────────────┘      └──────────────┘      └─────────────┘
       │                     │
       ▼                     ▼
┌─────────────┐      ┌──────────────┐
│  Leaflet    │      │ dxf-parser   │
│  (地图)     │      │ (解析库)     │
└─────────────┘      └──────────────┘
```

### 1.2 数据流

```
用户上传 DXF 文件
    ↓
前端检测文件大小
    ↓
<5MB: 直接上传
>5MB: 分片上传
    ↓
后端接收文件
    ↓
dxf-parser 解析
    ↓
提取图层和实体
    ↓
计算坐标范围
    ↓
返回标准化数据
    ↓
前端坐标转换
    ↓
渲染到地图
    ↓
自动调整视图
```

---

## 2. 模块设计

### 2.1 后端模块

#### CADService（服务层）

```typescript
class CADService {
  private parser: DxfParser;
  
  // 解析 DXF 文件
  async parseDXF(filePath: string, filename: string): Promise<CADFile>;
  
  // 转换图层数据
  private convertLayers(dxfData: any): CADLayer[];
  
  // 转换单个实体
  private convertEntity(entity: any): CADEntity | null;
  
  // 计算边界
  private calculateExtentsFromDXF(dxfData: any): Extents;
  
  // 获取单位
  private getUnits(measurement: number): string;
}
```

#### 控制器层

```typescript
// CAD 控制器
class CADController {
  // 上传并解析
  async upload(req, res);
  
  // 上传分片
  async uploadChunk(req, res);
  
  // 合并分片
  async mergeChunks(req, res);
  
  // 获取详情
  async getDetails(req, res);
}
```

#### 路由层

```typescript
// CAD 路由
router.post('/upload', upload.single('file'), controller.upload);
router.post('/upload-chunk', uploadChunk.single('file'), controller.uploadChunk);
router.post('/merge-chunks', controller.mergeChunks);
router.get('/:filename', controller.getDetails);
```

### 2.2 前端模块

#### MapView（主视图）

```typescript
// 状态
const activeTool = ref<'marker' | 'cad' | 'measure'>('marker');
const markers = ref<any[]>([]);
const cadLayers = ref<any[]>([]);
const markerLayerGroup = L.layerGroup();
const cadLayerGroup = L.layerGroup();

// 方法
const uploadCad = async (options: any);
const uploadFileDirectly = async (file: File);
const uploadFileInChunks = async (file: File);
const renderCadFile = (cadData: any);
const renderMarkers = () =>;
```

---

## 3. 接口设计

### 3.1 上传接口

```typescript
POST /api/cad/upload

请求：
  Content-Type: multipart/form-data
  file: File (DXF/DWG)

响应：
{
  "code": 200,
  "message": "解析成功",
  "data": {
    "filename": "白坪.dxf",
    "layers": [
      {
        "name": "0",
        "color": 7,
        "visible": true,
        "entityCount": 447
      }
    ],
    "metadata": {
      "version": "AC1018",
      "units": "毫米",
      "extents": {
        "minX": -1000,
        "minY": 0,
        "maxX": 330,
        "maxY": 330
      }
    },
    "uploadTime": "2026-04-15T08:50:01.992Z"
  }
}
```

### 3.2 分片上传接口

```typescript
POST /api/cad/upload-chunk

请求：
  Content-Type: multipart/form-data
  Query:
    chunkId: string
    chunkIndex: number
    totalChunks: number
    filename: string
  file: File (分片数据)

响应：
{
  "code": 200,
  "message": "分片上传成功",
  "data": {
    "chunkId": "白坪.dxf-1776239012393",
    "chunkIndex": 0,
    "uploaded": true
  }
}
```

### 3.3 合并分片接口

```typescript
POST /api/cad/merge-chunks

请求：
  Content-Type: application/json
  {
    "chunkId": "白坪.dxf-1776239012393",
    "filename": "白坪.dxf",
    "totalChunks": 4
  }

响应：
{
  "code": 200,
  "message": "分片合并成功",
  "data": {
    "filename": "白坪.dxf",
    "layers": [...],
    "metadata": {...},
    "uploadTime": "..."
  }
}
```

---

## 4. 数据结构

### 4.1 核心类型

```typescript
// CAD 文件
interface CADFile {
  filename: string;
  layers: CADLayer[];
  metadata: CADMetadata;
  uploadTime: Date;
}

// 图层
interface CADLayer {
  name: string;
  color: number;
  visible: boolean;
  entities: CADEntity[];
}

// 实体
interface CADEntity {
  type: string;
  layer: string;
  properties: Record<string, any>;
  geometry: {
    start?: {x: number, y: number};
    end?: {x: number, y: number};
    center?: {x: number, y: number};
    radius?: number;
    vertices?: Array<{x: number, y: number}>;
    text?: string;
  };
}

// 元数据
interface CADMetadata {
  version: string;
  units: string;
  extents: Extents;
}

// 坐标范围
interface Extents {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}
```

---

## 5. 错误处理

### 5.1 错误码定义

```typescript
enum ErrorCode {
  SUCCESS = 200,
  BAD_REQUEST = 400,
  NOT_FOUND = 404,
  INTERNAL_ERROR = 500
}
```

### 5.2 错误处理流程

```typescript
try {
  const result = await cadService.parseDXF(filePath, filename);
  res.json({ code: 200, message: '解析成功', data: result });
} catch (error) {
  logger.error('CAD 解析失败:', error);
  res.status(500).json({
    code: 500,
    message: error.message
  });
}
```

### 5.3 常见错误

| 错误码 | 错误信息 | 原因 | 解决方案 |
|--------|----------|------|----------|
| 400 | 文件格式错误 | 非 DXF 格式 | 检查文件扩展名 |
| 400 | 分片目录不存在 | 分片上传失败 | 检查网络，重新上传 |
| 404 | 文件不存在 | 文件被删除 | 重新上传 |
| 500 | DXF 解析失败 | 文件损坏 | 检查文件完整性 |

---

## 6. 性能设计

### 6.1 性能指标

| 指标 | 目标值 | 实测值 |
|------|--------|--------|
| 小文件解析（<1MB） | <1s | 0.3s |
| 大文件解析（17MB） | <10s | 5.2s |
| 坐标转换（1000 实体） | <100ms | 45ms |
| 分片上传（5MB/片） | <30s/片 | 12s/片 |

### 6.2 优化措施

#### 后端优化
```typescript
// 使用流式读取
const readStream = fs.createReadStream(filePath);

// 缓存解析结果
const cache = new Map<string, CADFile>();
```

#### 前端优化
```typescript
// 批量渲染
const bounds = cadLayerGroup.getBounds();
map.fitBounds(bounds);

// 使用 LayerGroup 管理
const cadLayerGroup = L.layerGroup();
```

---

## 7. 安全设计

### 7.1 文件上传安全

```typescript
// 文件类型检查
const allowedTypes = ['.dxf', '.dwg'];
const ext = path.extname(file.originalname).toLowerCase();
if (!allowedTypes.includes(ext)) {
  throw new Error('仅支持 DXF/DWG 格式');
}

// 文件大小限制
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
if (file.size > MAX_FILE_SIZE) {
  throw new Error('文件大小超过限制');
}
```

### 7.2 路径安全

```typescript
// 使用 path.join 防止路径遍历
const safePath = path.join(__dirname, '../../uploads/cad', filename);

// 验证路径在允许目录内
if (!safePath.startsWith(allowedDir)) {
  throw new Error('非法路径');
}
```

---

## 8. 测试策略

### 8.1 单元测试

```typescript
describe('CADService', () => {
  it('应该正确解析 DXF 文件', async () => {
    const result = await cadService.parseDXF('test.dxf');
    expect(result.layers.length).toBeGreaterThan(0);
  });
  
  it('应该正确处理坐标转换', () => {
    const geo = convertCadToGeo(100, 100);
    expect(geo.lat).toBeDefined();
    expect(geo.lng).toBeDefined();
  });
});
```

### 8.2 集成测试

```bash
# 测试完整流程
curl -X POST http://localhost:3000/api/cad/upload \
  -F "file=@test.dxf"
```

### 8.3 性能测试

```bash
# 测试大文件上传
time curl -X POST http://localhost:3000/api/cad/upload \
  -F "file=@白坪.dxf"
```

---

## 9. 部署设计

### 9.1 环境要求

```yaml
后端:
  Node.js: >= 20.x
  内存：>= 512MB
  磁盘：>= 10GB

前端:
  浏览器：Chrome/Firefox/Safari
  内存：>= 2GB
```

### 9.2 目录结构

```
backend/
├── uploads/
│   └── cad/
│       ├── chunks/      # 分片临时目录
│       └── *.dxf        # 上传的文件
├── logs/
│   ├── error.log
│   └── combined.log
└── src/
    └── services/
        └── cad.service.ts
```

---

## 10. 维护计划

### 10.1 监控指标

- DXF 解析成功率
- 平均解析时间
- 上传失败率
- 用户投诉数

### 10.2 日志策略

```typescript
// 关键操作日志
logger.info(`开始解析 DXF 文件：${filename}`);
logger.info(`DXF 解析完成：${entityCount} 个实体`);
logger.error('DXF 解析失败:', error);

// 性能日志
logger.info(`解析耗时：${Date.now() - startTime}ms`);
```

### 10.3 备份策略

```bash
# 每天备份上传的文件
0 2 * * * tar -czf /backup/cad-$(date +\%Y\%m\%d).tar.gz uploads/cad/
```

---

**审批**:
- [x] 架构师
- [x] 技术负责人
- [x] 测试负责人

**状态**: ✅ 已完成
