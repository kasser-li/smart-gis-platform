<template>
  <div class="map-container">
    <!-- 顶部工具栏 -->
    <div class="toolbar">
      <div class="toolbar-left">
        <h2>🗺️ Smart GIS 平台</h2>
      </div>
      <div class="toolbar-center">
        <el-button-group>
          <el-button :type="activeTool === 'marker' ? 'primary' : ''" @click="activeTool = 'marker'">
            <el-icon><Location /></el-icon> 标点
          </el-button>
          <el-button :type="activeTool === 'cad' ? 'primary' : ''" @click="showCadDialog = true">
            <el-icon><Document /></el-icon> CAD
          </el-button>
          <el-button :type="activeTool === 'measure' ? 'primary' : ''" @click="activeTool = 'measure'">
            <el-icon><ScaleToOriginal /></el-icon> 测量
          </el-button>
        </el-button-group>
      </div>
      <div class="toolbar-right">
        <el-button @click="showLayerPanel = !showLayerPanel">
          <el-icon><Layers /></el-icon> 图层
        </el-button>
      </div>
    </div>

    <!-- 地图容器 -->
    <div ref="mapContainer" :class="['map-wrapper', activeTool === 'marker' ? 'marker-mode' : '']"></div>

    <!-- 右侧图层面板 -->
    <div v-if="showLayerPanel" class="layer-panel">
      <h3>图层管理</h3>
      <el-collapse v-model="activeLayers">
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

    <!-- 标点表单 -->
    <div v-if="activeTool === 'marker' && showMarkerForm" class="marker-form">
      <el-card>
        <template #header>
          <span>添加标记点</span>
          <el-button size="small" @click="showMarkerForm = false">关闭</el-button>
        </template>
        <el-form :model="markerForm" label-width="80px">
          <el-form-item label="名称">
            <el-input v-model="markerForm.name" placeholder="输入名称" />
          </el-form-item>
          <el-form-item label="类型">
            <el-select v-model="markerForm.type" style="width: 100%">
              <el-option label="普通点" value="point" />
              <el-option label="建筑物" value="building" />
              <el-option label="设施" value="facility" />
              <el-option label="警告点" value="warning" />
            </el-select>
          </el-form-item>
          <el-form-item label="描述">
            <el-input v-model="markerForm.description" type="textarea" placeholder="输入描述" />
          </el-form-item>
          <el-form-item>
            <el-button type="primary" @click="addMarker">确定</el-button>
            <el-button @click="cancelMarker">取消</el-button>
          </el-form-item>
        </el-form>
      </el-card>
    </div>

    <!-- CAD 上传对话框 -->
    <el-dialog v-model="showCadDialog" title="上传 CAD 图纸" width="500px">
      <el-upload
        drag
        :auto-upload="true"
        :http-request="uploadCad"
        accept=".dxf,.dwg"
        :limit="1"
      >
        <el-icon class="el-icon--upload"><upload-filled /></el-icon>
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

    <!-- 标记点列表 -->
    <div class="marker-list">
      <el-card>
        <template #header>
          <div class="card-header">
            <span>标记点列表</span>
            <el-button size="small" @click="loadMarkers">刷新</el-button>
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
              <el-button size="small" @click="locateMarker(row)">定位</el-button>
              <el-button size="small" type="danger" @click="deleteMarker(row.id)">删除</el-button>
            </template>
          </el-table-column>
        </el-table>
      </el-card>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, reactive } from 'vue';
import L from 'leaflet';
import { ElMessage } from 'element-plus';
import axios from 'axios';

// 工具状态
const activeTool = ref<'marker' | 'cad' | 'measure'>('marker');
const showLayerPanel = ref(false);
const showCadDialog = ref(false);
const showMarkerForm = ref(false);

// 地图引用
const mapContainer = ref<HTMLElement | null>(null);
let map: L.Map | null = null;
const markers = ref<any[]>([]);
const markerLayers = ref([
  { name: '普通点', visible: true, count: 0 },
  { name: '建筑物', visible: true, count: 0 },
  { name: '设施', visible: true, count: 0 },
  { name: '警告点', visible: true, count: 0 }
]);
const cadLayers = ref<any[]>([]);
const activeLayers = ref(['markers']);

// 存储地图上的标记点图层
const markerLayerGroup = L.layerGroup();
const cadLayerGroup = L.layerGroup();

// 标记点表单
const markerForm = reactive({
  name: '',
  type: 'point',
  description: '',
  lat: 0,
  lng: 0
});

// 初始化地图
onMounted(() => {
  if (!mapContainer.value) return;

  // 创建地图
  map = L.map(mapContainer.value).setView([39.9042, 116.4074], 12);

  // 添加底图
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors',
    maxZoom: 19
  }).addTo(map);

  // 添加标记点图层和 CAD 图层
  markerLayerGroup.addTo(map);
  cadLayerGroup.addTo(map);

  // 点击地图添加标记点
  map.on('click', (e: L.LeafletMouseEvent) => {
    if (activeTool.value === 'marker') {
      markerForm.lat = e.latlng.lat;
      markerForm.lng = e.latlng.lng;
      showMarkerForm.value = true;
    }
  });

  // 加载标记点
  loadMarkers();
});

// 加载标记点
const loadMarkers = async () => {
  try {
    const response = await axios.get('/api/markers');
    if (response.data.code === 200) {
      markers.value = response.data.data;
      updateMarkerLayers();
      // 在地图上渲染标记点
      renderMarkers();
    }
  } catch (error) {
    ElMessage.error('加载标记点失败');
  }
};

// 在地图上渲染标记点
const renderMarkers = () => {
  // 清除现有标记
  markerLayerGroup.clearLayers();
  
  // 添加新标记
  markers.value.forEach(marker => {
    const color = getMarkerColor(marker.type);
    const circle = L.circleMarker([marker.latitude, marker.longitude], {
      radius: 10,
      fillColor: color,
      color: '#333',
      weight: 2,
      opacity: 1,
      fillOpacity: 0.8
    });
    
    // 添加弹窗
    circle.bindPopup(`
      <strong>${marker.name}</strong><br>
      类型：${marker.type}<br>
      描述：${marker.description || '无'}<br>
      坐标：${marker.latitude.toFixed(4)}, ${marker.longitude.toFixed(4)}
    `);
    
    markerLayerGroup.addLayer(circle);
  });
};

// 获取标记点颜色
const getMarkerColor = (type: string) => {
  const colors: Record<string, string> = {
    point: '#3498db',      // 蓝色
    building: '#e74c3c',   // 红色
    facility: '#2ecc71',   // 绿色
    warning: '#f39c12'     // 橙色
  };
  return colors[type] || '#95a5a6';
};

// 更新标记点图层统计
const updateMarkerLayers = () => {
  const stats: Record<string, number> = {};
  markers.value.forEach((m) => {
    stats[m.type] = (stats[m.type] || 0) + 1;
  });
  markerLayers.value.forEach((layer) => {
    layer.count = stats[layer.name.toLowerCase().replace('点', '')] || 0;
  });
};

// 添加标记点
const addMarker = async () => {
  try {
    const response = await axios.post('/api/markers', {
      name: markerForm.name,
      type: markerForm.type,
      description: markerForm.description,
      latitude: markerForm.lat,
      longitude: markerForm.lng
    });

    if (response.data.code === 200) {
      ElMessage.success('添加成功');
      showMarkerForm.value = false;
      markerForm.name = '';
      markerForm.description = '';
      loadMarkers();
    }
  } catch (error) {
    ElMessage.error('添加失败');
  }
};

// 取消添加
const cancelMarker = () => {
  showMarkerForm.value = false;
};

// 定位到标记点
const locateMarker = (marker: any) => {
  if (map) {
    map.setView([marker.latitude, marker.longitude], 16);
  }
};

// 删除标记点
const deleteMarker = async (id: string) => {
  try {
    const response = await axios.delete(`/api/markers/${id}`);
    if (response.data.code === 200) {
      ElMessage.success('删除成功');
      loadMarkers();
    }
  } catch (error) {
    ElMessage.error('删除失败');
  }
};

// 上传 CAD 文件
const uploadCad = async (options: any) => {
  const file = options.file;
  const CHUNK_SIZE = 5 * 1024 * 1024; // 5MB per chunk
  
  // 如果文件小于 5MB，直接上传
  if (file.size <= CHUNK_SIZE) {
    await uploadFileDirectly(file);
    return;
  }
  
  // 大文件使用分片上传
  ElMessage.info('文件较大，使用分片上传...');
  await uploadFileInChunks(file);
};

// 直接上传小文件
const uploadFileDirectly = async (file: File) => {
  const formData = new FormData();
  formData.append('file', file);

  try {
    const response = await axios.post('/api/cad/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      },
      onUploadProgress: (progressEvent) => {
        const percentCompleted = Math.round((progressEvent.loaded * 100) / (progressEvent.total || 1));
        console.log(`上传进度：${percentCompleted}%`);
      }
    });

    console.log('CAD 上传响应:', response.data);
    
    if (response.data.code === 200) {
      ElMessage.success('CAD 解析成功');
      showCadDialog.value = false;
      // 更新 CAD 图层
      cadLayers.value = response.data.data.layers.map((l: any) => ({
        name: l.name,
        visible: true,
        count: l.entityCount
      }));
      // 在地图上渲染 CAD 图形
      if (response.data.data) {
        renderCadFile(response.data.data);
      }
    } else {
      ElMessage.error('CAD 解析失败：' + (response.data.message || '未知错误'));
    }
  } catch (error: any) {
    console.error('CAD 上传错误:', error);
    ElMessage.error('上传失败：' + (error.response?.data?.message || error.message || '未知错误'));
  }
};

// 分片上传大文件
const uploadFileInChunks = async (file: File) => {
  const CHUNK_SIZE = 5 * 1024 * 1024; // 5MB
  const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
  const chunkId = `${file.name}-${Date.now()}`;
  
  console.log(`开始分片上传：${file.name}, 大小：${file.size} bytes, 分片数：${totalChunks}`);
  
  try {
    // 上传所有分片
    const uploadPromises = Array.from({ length: totalChunks }, async (_, index) => {
      const start = index * CHUNK_SIZE;
      const end = Math.min(start + CHUNK_SIZE, file.size);
      const chunk = file.slice(start, end);
      
      const formData = new FormData();
      formData.append('file', chunk);
      
      console.log(`上传分片 ${index + 1}/${totalChunks}...`);
      
      // 使用 query 参数传递元数据，因为 multer 处理时 body 还没解析
      const response = await axios.post(
        `/api/cad/upload-chunk?chunkId=${encodeURIComponent(chunkId)}&chunkIndex=${index}&totalChunks=${totalChunks}&filename=${encodeURIComponent(file.name)}`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        }
      );
      
      console.log(`分片 ${index + 1}/${totalChunks} 响应:`, response.data);
      ElMessage.info(`分片 ${index + 1}/${totalChunks} 上传成功`);
      return response.data;
    });
    
    // 等待所有分片上传完成
    await Promise.all(uploadPromises);
    
    // 合并分片
    ElMessage.info('正在合并分片...');
    console.log('开始合并分片...');
    
    const mergeResponse = await axios.post('/api/cad/merge-chunks', {
      chunkId,
      filename: file.name,
      totalChunks
    });
    
    console.log('合并分片响应:', mergeResponse.data);
    
    if (mergeResponse.data.code === 200) {
      ElMessage.success('CAD 解析成功（分片上传）');
      showCadDialog.value = false;
      // 更新 CAD 图层
      cadLayers.value = mergeResponse.data.data.layers.map((l: any) => ({
        name: l.name,
        visible: true,
        count: l.entityCount
      }));
      // 在地图上渲染 CAD 图形
      if (mergeResponse.data.data) {
        renderCadFile(mergeResponse.data.data);
      }
    } else {
      ElMessage.error('分片合并失败：' + (mergeResponse.data.message || '未知错误'));
    }
  } catch (error: any) {
    console.error('分片上传错误:', error);
    if (error.response) {
      console.error('错误响应:', error.response.data);
      console.error('错误状态码:', error.response.status);
    }
    ElMessage.error('上传失败：' + (error.response?.data?.message || error.message || '未知错误'));
  }
};

// 渲染 CAD 文件
const renderCadFile = (cadData: any) => {
  console.log('开始渲染 CAD 文件:', cadData);
  
  // 清除现有 CAD 图层
  cadLayerGroup.clearLayers();
  
  let entityCount = 0;
  
  // 计算 CAD 坐标范围
  const extents = cadData.metadata?.extents;
  if (!extents) {
    ElMessage.warning('无法获取 CAD 坐标范围');
    return;
  }
  
  console.log(`CAD 坐标范围：(${extents.minX}, ${extents.minY}) 到 (${extents.maxX}, ${extents.maxY})`);
  
  // 检查坐标是否超出地球范围（经纬度）
  const isGeoCoordinate = 
    extents.minX >= -180 && extents.maxX <= 180 &&
    extents.minY >= -90 && extents.maxY <= 90;
  
  console.log('是否为地理坐标:', isGeoCoordinate);
  
  // 计算 CAD 图的中心点
  const cadCenterX = (extents.minX + extents.maxX) / 2;
  const cadCenterY = (extents.minY + extents.maxY) / 2;
  const cadWidth = extents.maxX - extents.minX;
  const cadHeight = extents.maxY - extents.minY;
  
  // 如果不是地理坐标，需要转换到地图坐标
  // 使用当前地图中心作为 CAD 图的中心
  const mapCenter = map?.getCenter() || { lat: 39.9042, lng: 116.4074 };
  
  // 计算缩放比例（将 CAD 单位转换为地图单位）
  // 假设 CAD 单位是米，1 度 ≈ 111km
  const scale = isGeoCoordinate ? 1 : 0.00001; // 非地理坐标时使用小比例
  
  console.log(`使用比例尺：${scale}, 地图中心：`, mapCenter);
  
  // 解析 CAD 实体并在地图上绘制
  cadData.layers.forEach((layer: any) => {
    console.log(`处理图层 ${layer.name}, 实体数：${layer.entities?.length || 0}`);
    
    if (!layer.entities || layer.entities.length === 0) {
      return;
    }
    
    layer.entities.forEach((entity: any) => {
      if (entity.type === 'LINE' && entity.geometry) {
        const { start, end } = entity.geometry;
        
        let latLngs: [number, number][];
        
        if (isGeoCoordinate) {
          // 已经是地理坐标，直接使用
          latLngs = [
            [start.y, start.x],
            [end.y, end.x]
          ];
        } else {
          // 将 CAD 坐标转换为地图坐标
          // 以地图中心为基准，按比例缩放
          const lat1 = mapCenter.lat + (start.y - cadCenterY) * scale;
          const lng1 = mapCenter.lng + (start.x - cadCenterX) * scale;
          const lat2 = mapCenter.lat + (end.y - cadCenterY) * scale;
          const lng2 = mapCenter.lng + (end.x - cadCenterX) * scale;
          
          latLngs = [
            [lat1, lng1],
            [lat2, lng2]
          ];
        }
        
        const polyline = L.polyline(latLngs, {
          color: '#ff0000',
          weight: 2,
          opacity: 0.8
        });
        polyline.bindPopup(`图层：${layer.name}<br>类型：${entity.type}`);
        cadLayerGroup.addLayer(polyline);
        entityCount++;
        
      } else if (entity.type === 'POINT' && entity.geometry) {
        const { x, y } = entity.geometry;
        
        let lat: number, lng: number;
        
        if (isGeoCoordinate) {
          lat = y;
          lng = x;
        } else {
          lat = mapCenter.lat + (y - cadCenterY) * scale;
          lng = mapCenter.lng + (x - cadCenterX) * scale;
        }
        
        const circle = L.circleMarker([lat, lng], {
          radius: 5,
          fillColor: '#00ff00',
          color: '#333',
          weight: 1,
          fillOpacity: 1
        });
        circle.bindPopup(`图层：${layer.name}<br>类型：${entity.type}`);
        cadLayerGroup.addLayer(circle);
        entityCount++;
      }
    });
  });
  
  console.log(`CAD 渲染完成，共绘制 ${entityCount} 个实体`);
  ElMessage.success(`CAD 解析成功，绘制了 ${entityCount} 个实体`);
  
  // 调整地图视图以适应 CAD 图形
  if (entityCount > 0) {
    const bounds = cadLayerGroup.getBounds();
    if (bounds.isValid()) {
      map?.fitBounds(bounds, { padding: [50, 50] });
      ElMessage.success('地图视图已调整到 CAD 范围');
    }
  }
};
</script>

<style scoped>
.map-container {
  width: 100%;
  height: 100%;
  position: relative;
}

.toolbar {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 60px;
  background: white;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  z-index: 1000;
  display: flex;
  align-items: center;
  padding: 0 20px;
}

.toolbar-left h2 {
  font-size: 20px;
  color: #333;
  margin: 0;
}

.toolbar-center {
  flex: 1;
  display: flex;
  justify-content: center;
}

.toolbar-right {
  display: flex;
  gap: 10px;
}

.map-wrapper {
  width: 100%;
  height: 100%;
  cursor: crosshair;
}

.map-wrapper.marker-mode {
  cursor: pointer;
}

.layer-panel {
  position: absolute;
  top: 70px;
  right: 20px;
  width: 280px;
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.15);
  z-index: 1000;
  padding: 16px;
  max-height: calc(100% - 100px);
  overflow-y: auto;
}

.layer-panel h3 {
  margin-bottom: 12px;
  font-size: 16px;
}

.layer-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 0;
}

.marker-form {
  position: absolute;
  top: 70px;
  left: 20px;
  width: 320px;
  z-index: 1000;
}

.marker-list {
  position: absolute;
  bottom: 20px;
  left: 20px;
  width: 600px;
  max-height: 450px;
  z-index: 1000;
  overflow-y: auto;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
</style>
