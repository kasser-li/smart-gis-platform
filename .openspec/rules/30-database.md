# 数据库规范（PostgreSQL + PostGIS）

## 设计规范
- 表名使用小写蛇形：`marker_info`, `cad_files`
- 字段名使用小写蛇形：`user_name`, `create_time`
- 必须包含主键、创建时间、更新时间

## 空间数据
- 使用 PostGIS 扩展
- 坐标使用 WGS84（EPSG:4326）
- 空间索引使用 GIST

## 标记点表
```sql
CREATE TABLE markers (
  id VARCHAR(32) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  altitude DOUBLE PRECISION,
  type VARCHAR(20) DEFAULT 'point',
  properties JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

## CAD 文件表
```sql
CREATE TABLE cad_files (
  id VARCHAR(32) PRIMARY KEY,
  filename VARCHAR(255) NOT NULL,
  file_path VARCHAR(500),
  file_size BIGINT,
  layers JSONB,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);
```
