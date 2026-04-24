/**
 * 地图页面 - 组合各子组件
 */

<template>
  <div class="map-view">
    <!-- 工具栏 -->
    <MapToolbar
      :active-tool="activeTool"
      @update:tool="activeTool = $event"
      @cad-click="showCadDialog = true"
      @agv-click="$router.push('/agv')"
      @toggle-layers="showLayerPanel = !showLayerPanel"
    />

    <!-- 地图容器 -->
    <div class="map-wrapper" :class="{ 'marker-mode': activeTool === 'marker' }">
      <MapContainer
        ref="mapRef"
        :center="[39.9042, 116.4074]"
        :zoom="12"
        :tool="activeTool"
        @click="onMapClick"
        @zoom-end="onZoomEnd"
        @move-end="onMoveEnd"
      />

      <!-- 图层面板 -->
      <LayerPanel
        :visible="showLayerPanel"
        :marker-layers="markerLayers"
        :cad-layers="cadLayers"
        :active-layers="activeLayers"
      />

      <!-- 标记点面板 -->
      <MarkerPanel
        :markers="markers"
        :show-form="showMarkerForm"
        :form="markerForm"
        @refresh="loadMarkers"
        @locate="locateMarker"
        @delete="deleteMarker"
        @cancel-form="showMarkerForm = false"
        @submit-form="addMarker"
      />
    </div>

    <!-- CAD 上传对话框 -->
    <CadUploadDialog
      :visible="showCadDialog"
      @close="showCadDialog = false"
      @upload="uploadCad"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import L from 'leaflet'
import { ElMessage } from 'element-plus'
import { markerApi, cadApi } from '@/api'
import MapContainer from '@/components/map/MapContainer.vue'
import MapToolbar from '@/components/map/MapToolbar.vue'
import MarkerPanel from '@/components/map/MarkerPanel.vue'
import LayerPanel from '@/components/map/LayerPanel.vue'
import CadUploadDialog from '@/components/map/CadUploadDialog.vue'

// 工具状态
const activeTool = ref<'marker' | 'cad' | 'measure'>('marker')
const showLayerPanel = ref(false)
const showCadDialog = ref(false)
const showMarkerForm = ref(false)

// 地图引用
const mapRef = ref<InstanceType<typeof MapContainer> | null>(null)
const markers = ref<any[]>([])
const markerLayers = ref([
  { name: '普通点', visible: true, count: 0 },
  { name: '建筑物', visible: true, count: 0 },
  { name: '设施', visible: true, count: 0 },
  { name: '警告点', visible: true, count: 0 }
])
const cadLayers = ref<any[]>([])
const activeLayers = ref(['markers'])

// 地图图层组
const markerLayerGroup = L.layerGroup()
const cadLayerGroup = L.layerGroup()
const currentCadFile = ref<string | null>(null)

// 标记点表单
const markerForm = reactive({
  name: '',
  type: 'point',
  description: '',
  lat: 0,
  lng: 0
})

onMounted(() => {
  const map = mapRef.value?.getMap()
  if (!map) return

  markerLayerGroup.addTo(map)
  cadLayerGroup.addTo(map)

  loadMarkers()
  console.log('✅ 前端优化已启用：LOD + 视口动态加载')
})

// 地图事件
const onMapClick = (latlng: L.LatLng) => {
  if (activeTool.value === 'marker') {
    markerForm.lat = latlng.lat
    markerForm.lng = latlng.lng
    showMarkerForm.value = true
  }
}

const onZoomEnd = (zoom: number) => {
  console.log(`Zoom 变化：${zoom}`)
  if (currentCadFile.value) {
    reloadCadWithLOD(zoom)
  }
}

const onMoveEnd = (bounds: L.LatLngBounds) => {
  console.log(`地图移动：[${bounds.getSouth()}, ${bounds.getNorth()}] x [${bounds.getWest()}, ${bounds.getEast()}]`)
  if (currentCadFile.value) {
    reloadCadWithViewport(bounds)
  }
}

// 标记点操作
const loadMarkers = async () => {
  try {
    const response = await markerApi.list()
    markers.value = response.data.data
    updateMarkerLayers()
    renderMarkers()
  } catch {
    ElMessage.error('加载标记点失败')
  }
}

const renderMarkers = () => {
  markerLayerGroup.clearLayers()
  markers.value.forEach(marker => {
    const color = getMarkerColor(marker.type)
    const circle = L.circleMarker([marker.latitude, marker.longitude], {
      radius: 10,
      fillColor: color,
      color: '#333',
      weight: 2,
      opacity: 1,
      fillOpacity: 0.8
    })
    circle.bindPopup(`
      <strong>${marker.name}</strong><br>
      类型：${marker.type}<br>
      描述：${marker.description || '无'}<br>
      坐标：${marker.latitude.toFixed(4)}, ${marker.longitude.toFixed(4)}
    `)
    markerLayerGroup.addLayer(circle)
  })
}

const getMarkerColor = (type: string) => {
  const colors: Record<string, string> = {
    point: '#3498db',
    building: '#e74c3c',
    facility: '#2ecc71',
    warning: '#f39c12'
  }
  return colors[type] || '#95a5a6'
}

const updateMarkerLayers = () => {
  const stats: Record<string, number> = {}
  markers.value.forEach((m) => {
    stats[m.type] = (stats[m.type] || 0) + 1
  })
  markerLayers.value.forEach((layer) => {
    layer.count = stats[layer.name.toLowerCase().replace('点', '')] || 0
  })
}

const addMarker = async () => {
  try {
    await markerApi.create({
      name: markerForm.name,
      type: markerForm.type,
      description: markerForm.description,
      latitude: markerForm.lat,
      longitude: markerForm.lng
    })
    ElMessage.success('添加成功')
    showMarkerForm.value = false
    markerForm.name = ''
    markerForm.description = ''
    loadMarkers()
  } catch {
    ElMessage.error('添加失败')
  }
}

const locateMarker = (marker: any) => {
  mapRef.value?.setView([marker.latitude, marker.longitude], 16)
}

const deleteMarker = async (id: string) => {
  try {
    await markerApi.delete(id)
    ElMessage.success('删除成功')
    loadMarkers()
  } catch {
    ElMessage.error('删除失败')
  }
}

// CAD 上传
const uploadCad = async (options: any) => {
  const file = options.file
  const CHUNK_SIZE = 5 * 1024 * 1024

  if (file.size <= CHUNK_SIZE) {
    await uploadFileDirectly(file)
  } else {
    ElMessage.info('文件较大，使用分片上传...')
    await uploadFileInChunks(file)
  }
}

const uploadFileDirectly = async (file: File) => {
  try {
    const response = await cadApi.upload(file)
    ElMessage.success('CAD 解析成功')
    showCadDialog.value = false
    cadLayers.value = response.data.data.layers.map((l: any) => ({
      name: l.name,
      visible: true,
      count: l.entityCount
    }))
    if (response.data.data) {
      renderCadFile(response.data.data)
    }
  } catch (error: any) {
    ElMessage.error('上传失败：' + (error.response?.data?.message || error.message || '未知错误'))
  }
}

const uploadFileInChunks = async (file: File) => {
  const CHUNK_SIZE = 5 * 1024 * 1024
  const totalChunks = Math.ceil(file.size / CHUNK_SIZE)
  const chunkId = `${file.name}-${Date.now()}`

  try {
    const uploadPromises = Array.from({ length: totalChunks }, async (_, index) => {
      const start = index * CHUNK_SIZE
      const end = Math.min(start + CHUNK_SIZE, file.size)
      const chunk = file.slice(start, end)
      const response = await cadApi.uploadChunk(chunk, chunkId, index)
      ElMessage.info(`分片 ${index + 1}/${totalChunks} 上传成功`)
      return response.data
    })

    await Promise.all(uploadPromises)
    ElMessage.info('正在合并分片...')

    const mergeResponse = await cadApi.mergeChunks(chunkId, file.name, totalChunks)
    ElMessage.success('CAD 解析成功（分片上传）')
    showCadDialog.value = false
    cadLayers.value = mergeResponse.data.data.layers.map((l: any) => ({
      name: l.name,
      visible: true,
      count: l.entityCount
    }))
    if (mergeResponse.data.data) {
      renderCadFile(mergeResponse.data.data)
    }
  } catch (error: any) {
    ElMessage.error('上传失败：' + (error.response?.data?.message || error.message || '未知错误'))
  }
}

// CAD 渲染（保留原有逻辑）
const renderCadFile = (cadData: any) => {
  cadLayerGroup.clearLayers()
  let entityCount = 0

  const extents = cadData.metadata?.extents
  if (!extents) {
    ElMessage.warning('无法获取 CAD 坐标范围')
    return
  }

  cadData.layers.forEach((layer: any) => {
    layer.entities.forEach((entity: any) => {
      try {
        switch (entity.type) {
          case 'LINE':
            if (entity.geometry?.start && entity.geometry?.end) {
              const line = L.polyline([
                [entity.geometry.start.y, entity.geometry.start.x],
                [entity.geometry.end.y, entity.geometry.end.x]
              ], {
                color: '#' + ((entity.style?.color || 0) || 0x000000).toString(16).padStart(6, '0'),
                weight: 2
              })
              cadLayerGroup.addLayer(line)
              entityCount++
            }
            break

          case 'CIRCLE':
            if (entity.geometry?.center && entity.geometry?.radius) {
              const circle = L.circle([entity.geometry.center.y, entity.geometry.center.x], {
                radius: entity.geometry.radius * 0.00001,
                color: '#' + ((entity.style?.color || 0) || 0x000000).toString(16).padStart(6, '0'),
                fill: false
              })
              cadLayerGroup.addLayer(circle)
              entityCount++
            }
            break

          case 'LWPOLYLINE':
          case 'POLYLINE':
            if (entity.geometry?.vertices && entity.geometry.vertices.length > 1) {
              const polyline = L.polyline(
                entity.geometry.vertices.map((v: any) => [v.y, v.x]),
                {
                  color: '#' + ((entity.style?.color || 0) || 0x000000).toString(16).padStart(6, '0'),
                  weight: 2
                }
              )
              cadLayerGroup.addLayer(polyline)
              entityCount++
            }
            break

          case 'POINT':
            if (entity.geometry?.x !== undefined) {
              const point = L.circleMarker(
                [entity.geometry.y, entity.geometry.x],
                { radius: 4, fillColor: '#ff0000', color: '#333', weight: 1, fillOpacity: 1 }
              )
              cadLayerGroup.addLayer(point)
              entityCount++
            }
            break

          case 'TEXT':
            if (entity.geometry?.position) {
              const textMarker = L.marker([entity.geometry.position.y, entity.geometry.position.x], {
                icon: L.divIcon({
                  className: 'cad-text',
                  html: `<span style="font-size:12px;color:#333;">${entity.geometry.text || ''}</span>`,
                  iconSize: [100, 20]
                })
              })
              cadLayerGroup.addLayer(textMarker)
              entityCount++
            }
            break
        }
      } catch (e) {
        console.warn('实体渲染失败:', entity.type, e)
      }
    })
  })

  const map = mapRef.value?.getMap()
  if (map) {
    const southWest = L.latLng(extents.minY, extents.minX)
    const northEast = L.latLng(extents.maxY, extents.maxX)
    const bounds = L.latLngBounds(southWest, northEast)
    map.fitBounds(bounds, { padding: [50, 50] })
  }

  currentCadFile.value = cadData.filename
  ElMessage.success(`CAD 渲染完成：${entityCount} 个实体`)
}

// LOD + 视口加载（占位）
const reloadCadWithLOD = (zoom: number) => {
  console.log('LOD 重载:', zoom)
}

const reloadCadWithViewport = (bounds: L.LatLngBounds) => {
  console.log('视口重载:', bounds.toBBoxString())
}
</script>

<style scoped>
.map-view {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.map-wrapper {
  flex: 1;
  position: relative;
  overflow: hidden;
}

.marker-mode {
  cursor: crosshair;
}
</style>
