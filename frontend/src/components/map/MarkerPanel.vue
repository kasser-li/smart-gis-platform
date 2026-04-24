/**
 * 标记点面板 - 列表 + 表单
 */

<template>
  <div class="marker-panel">
    <el-card shadow="never">
      <template #header>
        <div class="card-header">
          <span>标记点列表</span>
          <el-button size="small" @click="$emit('refresh')">刷新</el-button>
        </div>
      </template>

      <el-table :data="markers" style="width: 100%" max-height="400">
        <el-table-column prop="name" label="名称" width="120" />
        <el-table-column prop="type" label="类型" width="80">
          <template #default="{ row }">
            <el-tag size="small">{{ row.type }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="坐标">
          <template #default="{ row }">
            {{ row.latitude.toFixed(4) }}, {{ row.longitude.toFixed(4) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="150">
          <template #default="{ row }">
            <el-button size="small" @click="$emit('locate', row)">定位</el-button>
            <el-button size="small" type="danger" @click="$emit('delete', row.id)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- 标点表单 -->
    <div v-if="showForm" class="marker-form-overlay">
      <el-card>
        <template #header>
          <span>添加标记点</span>
          <el-button size="small" @click="$emit('cancel-form')">关闭</el-button>
        </template>
        <el-form :model="form" label-width="80px">
          <el-form-item label="名称">
            <el-input v-model="form.name" placeholder="输入名称" />
          </el-form-item>
          <el-form-item label="类型">
            <el-select v-model="form.type" style="width: 100%">
              <el-option label="普通点" value="point" />
              <el-option label="建筑物" value="building" />
              <el-option label="设施" value="facility" />
              <el-option label="警告点" value="warning" />
            </el-select>
          </el-form-item>
          <el-form-item label="描述">
            <el-input v-model="form.description" type="textarea" placeholder="输入描述" />
          </el-form-item>
          <el-form-item>
            <el-button type="primary" @click="$emit('submit-form')">确定</el-button>
            <el-button @click="$emit('cancel-form')">取消</el-button>
          </el-form-item>
        </el-form>
      </el-card>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  markers: any[]
  showForm: boolean
  form: any
}>()

defineEmits<{
  (e: 'refresh'): void
  (e: 'locate', marker: any): void
  (e: 'delete', id: string): void
  (e: 'cancel-form'): void
  (e: 'submit-form'): void
}>()
</script>

<style scoped>
.marker-panel {
  position: absolute;
  bottom: 16px;
  left: 16px;
  right: 16px;
  z-index: 500;
  max-width: 600px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.marker-form-overlay {
  position: absolute;
  bottom: 100%;
  left: 0;
  margin-bottom: 8px;
  width: 320px;
}
</style>
