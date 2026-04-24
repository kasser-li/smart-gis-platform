/**
 * Smart GIS Platform - 主页仪表盘
 */

<template>
  <div class="home-page">
    <!-- 顶部欢迎区 -->
    <div class="hero">
      <div class="hero-content">
        <h1>🗺️ Smart GIS Platform</h1>
        <p class="subtitle">智能地理信息系统 · 地图标注 · CAD 图纸叠加 · AGV 调度</p>
        <div class="hero-actions">
          <el-button type="primary" size="large" @click="$router.push('/map')">
            <el-icon><Location /></el-icon> 进入地图
          </el-button>
          <el-button size="large" @click="$router.push('/agv')">
            <el-icon><Van /></el-icon> AGV 演示
          </el-button>
        </div>
      </div>
      <div class="hero-visual">
        <div class="globe-icon">🌍</div>
      </div>
    </div>

    <!-- 统计卡片 -->
    <div class="stats-grid">
      <el-card shadow="hover" class="stat-card">
        <div class="stat-icon" style="background: #3498db;">📍</div>
        <div class="stat-info">
          <div class="stat-value">{{ stats.markers }}</div>
          <div class="stat-label">标记点总数</div>
        </div>
      </el-card>

      <el-card shadow="hover" class="stat-card">
        <div class="stat-icon" style="background: #e74c3c;">📐</div>
        <div class="stat-info">
          <div class="stat-value">{{ stats.cadFiles }}</div>
          <div class="stat-label">CAD 图纸</div>
        </div>
      </el-card>

      <el-card shadow="hover" class="stat-card">
        <div class="stat-icon" style="background: #2ecc71;">🏗️</div>
        <div class="stat-info">
          <div class="stat-value">{{ stats.buildings }}</div>
          <div class="stat-label">建筑物</div>
        </div>
      </el-card>

      <el-card shadow="hover" class="stat-card">
        <div class="stat-icon" style="background: #f39c12;">⚠️</div>
        <div class="stat-info">
          <div class="stat-value">{{ stats.warnings }}</div>
          <div class="stat-label">警告点</div>
        </div>
      </el-card>
    </div>

    <!-- 功能模块 -->
    <div class="features-grid">
      <el-card shadow="hover" class="feature-card" @click="$router.push('/map')">
        <div class="feature-icon">🗺️</div>
        <h3>地图标注</h3>
        <p>在地图上添加、管理标记点，支持多种类型分类</p>
        <el-button type="primary" text>开始使用 →</el-button>
      </el-card>

      <el-card shadow="hover" class="feature-card" @click="$router.push('/map')">
        <div class="feature-icon">📐</div>
        <h3>CAD 图纸叠加</h3>
        <p>上传 DXF/DWG 图纸，叠加到地图上查看</p>
        <el-button type="primary" text>上传图纸 →</el-button>
      </el-card>

      <el-card shadow="hover" class="feature-card" @click="$router.push('/agv')">
        <div class="feature-icon">🚛</div>
        <h3>AGV 调度演示</h3>
        <p>模拟 AGV 小车在厂区内的自动调度运行</p>
        <el-button type="primary" text>查看演示 →</el-button>
      </el-card>

      <el-card shadow="hover" class="feature-card">
        <div class="feature-icon">📊</div>
        <h3>数据分析</h3>
        <p>地图数据统计、热力图分析、报表导出</p>
        <el-button type="primary" disabled>即将上线</el-button>
      </el-card>
    </div>

    <!-- 最近活动 -->
    <el-card shadow="never" class="activity-card">
      <template #header>
        <span>📋 最近活动</span>
      </template>
      <el-timeline>
        <el-timeline-item timestamp="2026-04-24" placement="top">
          <el-card>
            <p>✅ 后端 API 规范改进完成（Zod 校验 + 统一响应）</p>
            <p>✅ 前端 API 封装层 + TypeScript 类型定义</p>
          </el-card>
        </el-timeline-item>
        <el-timeline-item timestamp="2026-04-23" placement="top">
          <el-card>
            <p>✅ CAD 图纸解析服务上线（DXF/DWG 支持）</p>
          </el-card>
        </el-timeline-item>
        <el-timeline-item timestamp="2026-04-20" placement="top">
          <el-card>
            <p>✅ AGV 调度演示模块上线</p>
          </el-card>
        </el-timeline-item>
      </el-timeline>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { markerApi } from '@/api'

const stats = ref({
  markers: 0,
  cadFiles: 0,
  buildings: 0,
  warnings: 0
})

onMounted(async () => {
  try {
    const res = await markerApi.list()
    const markers = res.data.data || []
    stats.value.markers = markers.length
    stats.value.buildings = markers.filter((m: any) => m.type === 'building').length
    stats.value.warnings = markers.filter((m: any) => m.type === 'warning').length
    stats.value.cadFiles = 1 // TODO: 从 CAD API 获取
  } catch {
    // 静默失败，使用默认值
  }
})
</script>

<style scoped>
.home-page {
  min-height: 100%;
  background: linear-gradient(135deg, #0f0c29 0%, #1a1a3e 40%, #24243e 100%);
  color: #fff;
  padding: 0;
}

/* Hero */
.hero {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 80px 60px;
  position: relative;
  overflow: hidden;
}

.hero::before {
  content: '';
  position: absolute;
  top: -50%;
  right: -20%;
  width: 600px;
  height: 600px;
  background: radial-gradient(circle, rgba(52, 152, 219, 0.15) 0%, transparent 70%);
  border-radius: 50%;
}

.hero-content {
  position: relative;
  z-index: 1;
  max-width: 600px;
}

.hero h1 {
  font-size: 3rem;
  font-weight: 700;
  margin-bottom: 16px;
  background: linear-gradient(90deg, #3498db, #2ecc71);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.subtitle {
  font-size: 1.1rem;
  color: rgba(255, 255, 255, 0.7);
  margin-bottom: 32px;
  line-height: 1.6;
}

.hero-actions {
  display: flex;
  gap: 16px;
}

.hero-visual {
  position: relative;
  z-index: 1;
}

.globe-icon {
  font-size: 120px;
  animation: float 6s ease-in-out infinite;
}

@keyframes float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-20px); }
}

/* Stats */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 20px;
  padding: 0 60px 40px;
}

.stat-card {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  transition: transform 0.3s, box-shadow 0.3s;
}

.stat-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
}

.stat-card :deep(.el-card__body) {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 20px;
}

.stat-icon {
  width: 56px;
  height: 56px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28px;
  flex-shrink: 0;
}

.stat-value {
  font-size: 2rem;
  font-weight: 700;
  color: #fff;
}

.stat-label {
  font-size: 0.85rem;
  color: rgba(255, 255, 255, 0.6);
  margin-top: 4px;
}

/* Features */
.features-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 20px;
  padding: 0 60px 40px;
}

.feature-card {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  cursor: pointer;
  transition: transform 0.3s, border-color 0.3s;
}

.feature-card:hover {
  transform: translateY(-4px);
  border-color: rgba(52, 152, 219, 0.5);
}

.feature-card :deep(.el-card__body) {
  text-align: center;
  padding: 32px 20px;
}

.feature-icon {
  font-size: 48px;
  margin-bottom: 16px;
}

.feature-card h3 {
  font-size: 1.2rem;
  margin-bottom: 8px;
  color: #fff;
}

.feature-card p {
  font-size: 0.9rem;
  color: rgba(255, 255, 255, 0.6);
  margin-bottom: 16px;
  line-height: 1.5;
}

/* Activity */
.activity-card {
  margin: 0 60px 60px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
}

.activity-card :deep(.el-card__header) {
  border-color: rgba(255, 255, 255, 0.1);
}

.activity-card :deep(.el-card__header span) {
  color: #fff;
  font-weight: 600;
}

.activity-card :deep(.el-timeline-item__timestamp) {
  color: rgba(255, 255, 255, 0.5);
}

.activity-card :deep(.el-card) {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.08);
}

.activity-card :deep(.el-card p) {
  color: rgba(255, 255, 255, 0.8);
  margin-bottom: 4px;
}

/* Responsive */
@media (max-width: 1024px) {
  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
  }
  .features-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 768px) {
  .hero {
    flex-direction: column;
    padding: 40px 20px;
    text-align: center;
  }
  .hero h1 {
    font-size: 2rem;
  }
  .hero-actions {
    justify-content: center;
  }
  .hero-visual {
    display: none;
  }
  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
    padding: 0 20px 20px;
  }
  .features-grid,
  .activity-card {
    margin: 0 20px 20px;
  }
}
</style>
