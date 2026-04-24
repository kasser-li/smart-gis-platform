/**
 * 应用主布局 - 侧边栏 + 顶栏
 */

<template>
  <div class="app-layout">
    <!-- 侧边栏 -->
    <aside class="sidebar" :class="{ collapsed: isCollapsed }">
      <div class="sidebar-logo">
        <span class="logo-icon">🗺️</span>
        <span v-show="!isCollapsed" class="logo-text">Smart GIS</span>
      </div>

      <nav class="sidebar-nav">
        <router-link to="/" class="nav-item" active-class="active">
          <el-icon><HomeFilled /></el-icon>
          <span v-show="!isCollapsed">首页</span>
        </router-link>

        <router-link to="/map" class="nav-item" active-class="active">
          <el-icon><Location /></el-icon>
          <span v-show="!isCollapsed">地图标注</span>
        </router-link>

        <router-link to="/agv" class="nav-item" active-class="active">
          <el-icon><Van /></el-icon>
          <span v-show="!isCollapsed">AGV 演示</span>
        </router-link>

        <div class="nav-divider" />

        <a href="#" class="nav-item disabled">
          <el-icon><DataAnalysis /></el-icon>
          <span v-show="!isCollapsed">数据分析</span>
          <el-tag size="small" class="coming-soon">Soon</el-tag>
        </a>

        <a href="#" class="nav-item disabled">
          <el-icon><Setting /></el-icon>
          <span v-show="!isCollapsed">系统设置</span>
          <el-tag size="small" class="coming-soon">Soon</el-tag>
        </a>
      </nav>

      <div class="sidebar-footer">
        <button class="collapse-btn" @click="isCollapsed = !isCollapsed">
          <el-icon>
            <DArrowLeft v-if="!isCollapsed" />
            <DArrowRight v-else />
          </el-icon>
        </button>
      </div>
    </aside>

    <!-- 主内容区 -->
    <div class="main-content" :class="{ collapsed: isCollapsed }">
      <!-- 顶栏 -->
      <header class="topbar">
        <div class="topbar-left">
          <el-breadcrumb separator="/">
            <el-breadcrumb-item :to="{ path: '/' }">首页</el-breadcrumb-item>
            <el-breadcrumb-item v-if="currentTitle">{{ currentTitle }}</el-breadcrumb-item>
          </el-breadcrumb>
        </div>
        <div class="topbar-right">
          <span class="env-badge">{{ env }}</span>
        </div>
      </header>

      <!-- 页面内容 -->
      <main class="page-content">
        <router-view />
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRoute } from 'vue-router'

const isCollapsed = ref(false)
const route = useRoute()

const currentTitle = computed(() => {
  const titles: Record<string, string> = {
    '/map': '地图标注',
    '/agv': 'AGV 调度演示'
  }
  return titles[route.path] || ''
})

const env = computed(() => {
  return import.meta.env.MODE === 'production' ? '生产' : '开发'
})
</script>

<style scoped>
.app-layout {
  display: flex;
  height: 100vh;
  width: 100vw;
  overflow: hidden;
}

/* Sidebar */
.sidebar {
  width: 220px;
  background: linear-gradient(180deg, #1a1a2e 0%, #16213e 100%);
  color: #fff;
  display: flex;
  flex-direction: column;
  transition: width 0.3s ease;
  flex-shrink: 0;
  z-index: 100;
}

.sidebar.collapsed {
  width: 64px;
}

.sidebar-logo {
  height: 60px;
  display: flex;
  align-items: center;
  padding: 0 16px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  gap: 12px;
}

.logo-icon {
  font-size: 24px;
  flex-shrink: 0;
}

.logo-text {
  font-size: 1.1rem;
  font-weight: 700;
  white-space: nowrap;
}

.sidebar-nav {
  flex: 1;
  padding: 12px 8px;
  overflow-y: auto;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  border-radius: 8px;
  color: rgba(255, 255, 255, 0.7);
  text-decoration: none;
  transition: all 0.2s;
  margin-bottom: 4px;
  font-size: 0.9rem;
  cursor: pointer;
}

.nav-item:hover:not(.disabled) {
  background: rgba(255, 255, 255, 0.08);
  color: #fff;
}

.nav-item.active {
  background: rgba(52, 152, 219, 0.2);
  color: #3498db;
}

.nav-item.disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.coming-soon {
  margin-left: auto;
  background: rgba(255, 255, 255, 0.1);
  border: none;
  color: rgba(255, 255, 255, 0.5);
}

.nav-divider {
  height: 1px;
  background: rgba(255, 255, 255, 0.08);
  margin: 12px 8px;
}

.sidebar-footer {
  padding: 12px;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
}

.collapse-btn {
  width: 100%;
  height: 36px;
  border: none;
  background: rgba(255, 255, 255, 0.05);
  color: rgba(255, 255, 255, 0.6);
  border-radius: 8px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.collapse-btn:hover {
  background: rgba(255, 255, 255, 0.1);
  color: #fff;
}

/* Main Content */
.main-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: #f0f2f5;
  transition: all 0.3s ease;
}

.topbar {
  height: 56px;
  background: #fff;
  border-bottom: 1px solid #e8e8e8;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24px;
  flex-shrink: 0;
}

.topbar-left {
  display: flex;
  align-items: center;
}

.topbar-right {
  display: flex;
  align-items: center;
  gap: 12px;
}

.env-badge {
  padding: 2px 10px;
  border-radius: 12px;
  font-size: 0.75rem;
  background: #e6f7ff;
  color: #1890ff;
  border: 1px solid #91d5ff;
}

.page-content {
  flex: 1;
  overflow: auto;
  padding: 0;
}

/* Override global styles for layout mode */
:deep(*) {
  /* Let child views control their own full-height */
}
</style>
