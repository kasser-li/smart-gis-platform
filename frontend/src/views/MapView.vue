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
    <div ref="mapContainer" class="map-wrapper"></div>

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
    }
  } catch (error) {
    ElMessage.error('加载标记点失败');
  }
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
  const formData = new FormData();
  formData.append('file', options.file);

  try {
    const response = await axios.post('/api/cad/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });

    if (response.data.code === 200) {
      ElMessage.success('CAD 解析成功');
      showCadDialog.value = false;
      // 更新 CAD 图层
      cadLayers.value = response.data.data.layers.map((l: any) => ({
        name: l.name,
        visible: true,
        count: l.entityCount
      }));
    }
  } catch (error) {
    ElMessage.error('上传失败');
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
