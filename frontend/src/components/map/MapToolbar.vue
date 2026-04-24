/**
 * 地图工具栏
 */

<template>
  <div class="map-toolbar">
    <div class="toolbar-left">
      <h2 class="toolbar-title">🗺️ Smart GIS 平台</h2>
    </div>

    <div class="toolbar-center">
      <el-button-group>
        <el-button
          :type="activeTool === 'marker' ? 'primary' : ''"
          @click="$emit('update:tool', 'marker')"
        >
          <el-icon><Location /></el-icon> 标点
        </el-button>
        <el-button
          :type="activeTool === 'cad' ? 'primary' : ''"
          @click="$emit('cad-click')"
        >
          <el-icon><Document /></el-icon> CAD
        </el-button>
        <el-button
          :type="activeTool === 'measure' ? 'primary' : ''"
          @click="$emit('update:tool', 'measure')"
        >
          <el-icon><ScaleToOriginal /></el-icon> 测量
        </el-button>
      </el-button-group>
    </div>

    <div class="toolbar-right">
      <el-button @click="$emit('agv-click')">
        <el-icon><Van /></el-icon> AGV
      </el-button>
      <el-button @click="$emit('toggle-layers')">
        <el-icon><Layers /></el-icon> 图层
      </el-button>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  activeTool: 'marker' | 'cad' | 'measure'
}>()

defineEmits<{
  (e: 'update:tool', tool: 'marker' | 'cad' | 'measure'): void
  (e: 'cad-click'): void
  (e: 'agv-click'): void
  (e: 'toggle-layers'): void
}>()
</script>

<style scoped>
.map-toolbar {
  height: 52px;
  background: #fff;
  border-bottom: 1px solid #e8e8e8;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 16px;
  flex-shrink: 0;
  z-index: 10;
}

.toolbar-title {
  font-size: 1rem;
  margin: 0;
  white-space: nowrap;
}

.toolbar-center {
  display: flex;
  align-items: center;
}

.toolbar-right {
  display: flex;
  align-items: center;
  gap: 8px;
}
</style>
