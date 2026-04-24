/**
 * CAD 上传对话框
 */

<template>
  <el-dialog :model-value="visible" title="上传 CAD 图纸" width="500px" @update:model-value="() => $emit('close')" @close="$emit('close')">
    <el-upload
      drag
      :auto-upload="true"
      :http-request="(options: any) => $emit('upload', options)"
      accept=".dxf,.dwg"
      :limit="1"
    >
      <el-icon class="el-icon--upload"><UploadFilled /></el-icon>
      <div class="el-upload__text">
        拖拽文件到此处或 <em>点击上传</em>
      </div>
      <template #tip>
        <div class="el-upload__tip">
          仅支持 DXF/DWG 格式，文件不超过 50MB
        </div>
      </template>
    </el-upload>
  </el-dialog>
</template>

<script setup lang="ts">
defineProps<{
  visible: boolean
}>()

defineEmits<{
  (e: 'close'): void
  (e: 'upload', options: any): void
}>()
</script>
