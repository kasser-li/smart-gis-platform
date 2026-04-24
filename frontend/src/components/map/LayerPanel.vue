/**
 * 图层管理面板
 */

<template>
  <div v-if="visible" class="layer-panel">
    <h3>图层管理</h3>
    <el-collapse :model-value="activeLayers" @update:model-value="$emit('update:activeLayers', $event)">
      <el-collapse-item title="标记点图层" name="markers">
        <div v-for="layer in markerLayers" :key="layer.name" class="layer-item">
          <el-switch v-model="layer.visible" size="small" />
          <span>{{ layer.name }} ({{ layer.count }})</span>
        </div>
      </el-collapse-item>
      <el-collapse-item title="CAD 图层" name="cad">
        <div v-for="layer in cadLayers" :key="layer.name" class="layer-item">
          <el-switch v-model="layer.visible" size="small" />
          <span>{{ layer.name }} ({{ layer.count }})</span>
        </div>
      </el-collapse-item>
    </el-collapse>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  visible: boolean
  markerLayers: any[]
  cadLayers: any[]
  activeLayers: string[]
}>()

defineEmits<{
  (e: 'update:activeLayers', val: string[]): void
}>()
</script>

<style scoped>
.layer-panel {
  position: absolute;
  top: 60px;
  right: 16px;
  width: 260px;
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.15);
  padding: 16px;
  z-index: 500;
}

.layer-panel h3 {
  margin: 0 0 12px;
  font-size: 0.95rem;
}

.layer-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 0;
  font-size: 0.85rem;
}
</style>
