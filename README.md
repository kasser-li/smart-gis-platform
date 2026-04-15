# Smart GIS Platform

🗺️ GIS 地图标点与 CAD 图纸解析系统

## 项目简介

基于 Node.js + Vue 3 的 GIS 平台，支持地图标点管理和 CAD 图纸解析。

### 核心功能

- 🗺️ **地图展示** - 基于 Leaflet 的在线地图
- 📍 **标点管理** - 添加/编辑/删除地图标记点
- 📐 **CAD 解析** - 支持 DXF/DWG 文件上传和解析
- 📊 **图层管理** - 控制标记点和 CAD 图层显示
- 📏 **距离测量** - 计算两点间地理距离

## 技术栈

### 后端
- Node.js 20.x + TypeScript
- Express 4.x
- TypeORM
- PostgreSQL + PostGIS

### 前端
- Vue 3.x + TypeScript
- Vite 5.x
- Element Plus
- Leaflet

## 快速开始

### 环境要求
- Node.js >= 20.x
- PostgreSQL >= 14.x（可选）

### 后端启动

```bash
cd backend

# 安装依赖
npm install

# 配置环境变量
cp .env.example .env

# 开发模式启动
npm run dev

# 生产构建
npm run build
npm start
```

### 前端启动

```bash
cd frontend

# 安装依赖
npm install

# 开发模式启动
npm run dev

# 生产构建
npm run build
```

## API 接口

### 标记点管理
- `POST /api/markers` - 创建标记点
- `GET /api/markers` - 获取标记点列表
- `GET /api/markers/:id` - 获取标记点详情
- `PUT /api/markers/:id` - 更新标记点
- `DELETE /api/markers/:id` - 删除标记点
- `POST /api/markers/batch` - 批量导入

### CAD 图纸
- `POST /api/cad/upload` - 上传并解析 CAD 文件
- `GET /api/cad/:filename` - 获取 CAD 文件详情
- `POST /api/cad/:filename/layers/:layerName/visibility` - 切换图层可见性

### 地图服务
- `GET /api/maps/config` - 获取地图配置
- `POST /api/maps/geocode` - 地理编码
- `POST /api/maps/reverse-geocode` - 逆地理编码
- `POST /api/maps/distance` - 计算距离

## 开发规范

项目使用 OpenSpec 进行 SDD（规格驱动开发）：

```bash
# 需求探索
/opsx:explore

# 生成提案
/opsx:propose

# 生成代码
/opsx:apply

# 验证
/opsx:verify

# 归档
/opsx:archive
```

详细规范请参考 `.openspec/rules/` 目录。

## 项目结构

```
smart-gis-platform/
├── backend/                 # 后端服务
│   ├── src/
│   │   ├── routes/         # 路由
│   │   ├── controllers/    # 控制器
│   │   ├── services/       # 服务层
│   │   └── models/         # 数据模型
│   └── package.json
├── frontend/                # 前端应用
│   ├── src/
│   │   ├── views/          # 页面组件
│   │   ├── components/     # 公共组件
│   │   ├── stores/         # 状态管理
│   │   └── api/            # API 接口
│   └── package.json
└── .openspec/               # OpenSpec 配置
    ├── config.yaml
    └── rules/              # 开发规范
```

## 开发团队

- **作者**: 李明坤
- **License**: MIT

## 更新日志

### v1.0.0 (2026-04-15)
- ✅ 基础地图展示
- ✅ 标记点 CRUD
- ✅ CAD 文件上传解析
- ✅ 图层管理
