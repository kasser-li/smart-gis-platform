<template>
  <div class="agv-container">
    <!-- 顶部工具栏 -->
    <div class="toolbar">
      <div class="toolbar-left">
        <h2>🤖 AGV 智能调度演示</h2>
      </div>
      <div class="toolbar-center">
        <el-button-group>
          <el-button :type="activeTool === 'monitor' ? 'primary' : ''" @click="activeTool = 'monitor'">
            <el-icon><Monitor /></el-icon> 监控
          </el-button>
          <el-button :type="activeTool === 'route' ? 'primary' : ''" @click="activeTool = 'route'">
            <el-icon><Connection /></el-icon> 路径规划
          </el-button>
          <el-button :type="activeTool === 'task' ? 'primary' : ''" @click="activeTool = 'task'">
            <el-icon><Document /></el-icon> 任务管理
          </el-button>
        </el-button-group>
      </div>
      <div class="toolbar-right">
        <el-button @click="toggleSimulation" :type="isSimulating ? 'success' : ''">
          <el-icon><VideoPlay /></el-icon> {{ isSimulating ? '暂停' : '开始' }}
        </el-button>
        <el-button @click="resetSimulation" type="warning">
          <el-icon><Refresh /></el-icon> 重置
        </el-button>
      </div>
    </div>

    <!-- 地图容器 -->
    <div ref="mapContainer" class="map-wrapper"></div>

    <!-- 左侧面板 -->
    <div v-if="activeTool === 'route'" class="route-list-panel">
      <el-card>
        <template #header>
          <div class="card-header">
            <span>🗺️ 路径列表</span>
            <el-button size="small" type="primary" @click="startNewRoute">
              <el-icon><Plus /></el-icon> 新建
            </el-button>
          </div>
        </template>
        <el-table :data="savedRoutes" style="width: 100%" max-height="500" highlight-current-row @current-change="selectRoute">
          <el-table-column prop="name" label="名称" width="120" />
          <el-table-column prop="points.length" label="点数" width="60" />
          <el-table-column prop="distance" label="距离" width="80">
            <template #default="{ row }">
              {{ row.distance.toFixed(1) }}m
            </template>
          </el-table-column>
          <el-table-column label="操作" width="150">
            <template #default="{ row }">
              <el-button size="small" @click="loadRoute(row)">加载</el-button>
              <el-button size="small" type="danger" @click="deleteRoute(row.id)">删除</el-button>
            </template>
          </el-table-column>
        </el-table>
        <div class="route-tips">
          <el-alert title="路径规划提示" type="info" :closable="false" show-icon>
            <template #default>
              <div>1. 点击"新建"开始绘制路径</div>
              <div>2. 在地图上点击添加路径点</div>
              <div>3. 双击或按 ESC 完成绘制</div>
              <div>4. 输入名称保存路径</div>
            </template>
          </el-alert>
        </div>
      </el-card>
    </div>

    <!-- 左侧 AGV 列表（监控模式） -->
    <div v-if="activeTool === 'monitor'" class="agv-list-panel">
      <el-card>
        <template #header>
          <div class="card-header">
            <span>🚗 AGV 车队 ({{ agvs.length }})</span>
            <el-button size="small" @click="addAGV">
              <el-icon><Plus /></el-icon> 添加
            </el-button>
          </div>
        </template>
        <el-table :data="agvs" style="width: 100%" max-height="500" highlight-current-row @current-change="selectAGV">
          <el-table-column prop="id" label="编号" width="80" />
          <el-table-column label="状态" width="80">
            <template #default="{ row }">
              <el-tag :type="getStatusType(row.status)" size="small">{{ row.status }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column label="电量" width="100">
            <template #default="{ row }">
              <el-progress :percentage="row.battery" :status="row.battery < 20 ? 'exception' : ''" stroke-width="12" />
            </template>
          </el-table-column>
          <el-table-column label="负载" width="80">
            <template #default="{ row }">
              {{ row.load }}kg
            </template>
          </el-table-column>
          <el-table-column label="位置">
            <template #default="{ row }">
              {{ row.position.lat.toFixed(4) }}, {{ row.position.lng.toFixed(4) }}
            </template>
          </el-table-column>
        </el-table>
      </el-card>
    </div>

    <!-- 右侧任务面板 -->
    <div v-if="activeTool === 'task'" class="task-panel">
      <el-card>
        <template #header>
          <div class="card-header">
            <span>📋 任务管理</span>
            <el-button size="small" type="primary" @click="showTaskDialog = true">
              <el-icon><Plus /></el-icon> 新建
            </el-button>
          </div>
        </template>
        <el-table :data="tasks" style="width: 100%" max-height="600">
          <el-table-column prop="id" label="任务 ID" width="100" />
          <el-table-column prop="type" label="类型" width="80">
            <template #default="{ row }">
              <el-tag size="small">{{ row.type }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="status" label="状态" width="80">
            <template #default="{ row }">
              <el-tag :type="getTaskStatusType(row.status)" size="small">{{ row.status }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="agvId" label="AGV" width="80" />
          <el-table-column label="路径" width="120">
            <template #default="{ row }">
              {{ row.route?.name || '无' }}
            </template>
          </el-table-column>
          <el-table-column label="进度" width="100">
            <template #default="{ row }">
              <el-progress :percentage="row.progress || 0" :status="row.status === '已完成' ? 'success' : ''" stroke-width="12" />
            </template>
          </el-table-column>
          <el-table-column label="操作" width="150">
            <template #default="{ row }">
              <el-button size="small" @click="viewTaskPath(row)">查看</el-button>
              <el-button size="small" type="danger" @click="cancelTask(row.id)">取消</el-button>
            </template>
          </el-table-column>
        </el-table>
      </el-card>
    </div>

    <!-- 底部状态栏 -->
    <div class="status-bar">
      <div class="status-item">
        <el-icon><Monitor /></el-icon>
        <span>在线 AGV: <strong>{{ onlineCount }}</strong></span>
      </div>
      <div class="status-item">
        <el-icon><Document /></el-icon>
        <span>进行中任务：<strong>{{ activeTaskCount }}</strong></span>
      </div>
      <div class="status-item">
        <el-icon><Lightning /></el-icon>
        <span>平均电量：<strong>{{ avgBattery }}%</strong></span>
      </div>
      <div class="status-item">
        <el-icon><DataLine /></el-icon>
        <span>今日完成任务：<strong>{{ completedTasks }}</strong></span>
      </div>
    </div>

    <!-- 新建任务对话框 -->
    <el-dialog v-model="showTaskDialog" title="新建搬运任务" width="500px">
      <el-form :model="newTask" label-width="80px">
        <el-form-item label="任务类型">
          <el-select v-model="newTask.type" style="width: 100%">
            <el-option label="物料搬运" value="搬运" />
            <el-option label="货物分拣" value="分拣" />
            <el-option label="充电" value="充电" />
            <el-option label="巡检" value="巡检" />
          </el-select>
        </el-form-item>
        <el-form-item label="AGV 选择">
          <el-select v-model="newTask.agvId" style="width: 100%" placeholder="自动分配或手动选择">
            <el-option label="自动分配" value="auto" />
            <el-option v-for="agv in availableAgvs" :key="agv.id" :label="`AGV-${agv.id}`" :value="agv.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="选择路径">
          <el-select v-model="newTask.routeId" style="width: 100%" placeholder="选择预设路径" @change="onRouteChange">
            <el-option v-for="route in savedRoutes" :key="route.id" :label="route.name" :value="route.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="路径预览">
          <div v-if="selectedRouteForTask" class="route-preview">
            <div>路径：{{ selectedRouteForTask.name }}</div>
            <div>点数：{{ selectedRouteForTask.points.length }}</div>
            <div>距离：{{ selectedRouteForTask.distance.toFixed(1) }}m</div>
            <div>预计时间：{{ calculateRouteTime(selectedRouteForTask).toFixed(0) }}秒</div>
          </div>
          <div v-else class="route-preview-empty">请先选择路径</div>
        </el-form-item>
        <el-form-item label="优先级">
          <el-radio-group v-model="newTask.priority">
            <el-radio :label="1">低</el-radio>
            <el-radio :label="2">中</el-radio>
            <el-radio :label="3">高</el-radio>
          </el-radio-group>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showTaskDialog = false">取消</el-button>
        <el-button type="primary" @click="createTask">创建任务</el-button>
      </template>
    </el-dialog>

    <!-- AGV 详情面板 -->
    <div v-if="selectedAGV" class="agv-detail-panel">
      <el-card>
        <template #header>
          <div class="card-header">
            <span>AGV-{{ selectedAGV.id }} 详情</span>
            <el-button size="small" @click="selectedAGV = null">关闭</el-button>
          </div>
        </template>
        <el-descriptions :column="1" border>
          <el-descriptions-item label="状态">
            <el-tag :type="getStatusType(selectedAGV.status)">{{ selectedAGV.status }}</el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="电量">
            <el-progress :percentage="selectedAGV.battery" :status="selectedAGV.battery < 20 ? 'exception' : ''" />
          </el-descriptions-item>
          <el-descriptions-item label="速度">{{ selectedAGV.speed }} m/s</el-descriptions-item>
          <el-descriptions-item label="负载">{{ selectedAGV.load }} kg / {{ selectedAGV.maxLoad }} kg</el-descriptions-item>
          <el-descriptions-item label="当前位置">
            {{ selectedAGV.position.lat.toFixed(6) }}, {{ selectedAGV.position.lng.toFixed(6) }}
          </el-descriptions-item>
          <el-descriptions-item label="当前路径">{{ selectedAGV.currentRoute || '无' }}</el-descriptions-item>
          <el-descriptions-item label="路径进度">
            <el-progress :percentage="selectedAGV.routeProgress || 0" stroke-width="12" />
          </el-descriptions-item>
          <el-descriptions-item label="当前任务">{{ selectedAGV.currentTask || '空闲' }}</el-descriptions-item>
        </el-descriptions>
        <div class="agv-actions">
          <el-button size="small" @click="assignRoute(selectedAGV)" :disabled="selectedAGV.status === '离线'">
            🗺️ 分配路径
          </el-button>
          <el-button size="small" type="warning" @click="stopAGV(selectedAGV.id)" :disabled="selectedAGV.status === '离线'">
            ⏸️ 暂停
          </el-button>
          <el-button size="small" type="danger" @click="emergencyStop(selectedAGV.id)">
            🚨 急停
          </el-button>
        </div>
      </el-card>
    </div>

    <!-- 路径绘制提示 -->
    <div v-if="isDrawingRoute" class="drawing-tip">
      <el-card>
        <div class="drawing-tip-content">
          <el-icon><Location /></el-icon>
          <span>正在绘制路径，点击地图添加路径点</span>
          <el-tag size="small" type="info">已添加 {{ currentRoutePoints.length }} 个点</el-tag>
          <div class="drawing-actions">
            <el-button size="small" @click="finishDrawing">完成 (双击或 ESC)</el-button>
            <el-button size="small" type="danger" @click="cancelDrawing">取消</el-button>
          </div>
        </div>
      </el-card>
    </div>

    <!-- 保存路径对话框 -->
    <el-dialog v-model="showSaveRouteDialog" title="保存路径" width="400px">
      <el-form :model="saveRouteForm" label-width="80px">
        <el-form-item label="路径名称">
          <el-input v-model="saveRouteForm.name" placeholder="输入路径名称" />
        </el-form-item>
        <el-form-item label="路径点数">
          <span>{{ currentRoutePoints.length }} 个点</span>
        </el-form-item>
        <el-form-item label="总距离">
          <span>{{ calculateRouteDistance(currentRoutePoints).toFixed(1) }} 米</span>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showSaveRouteDialog = false">取消</el-button>
        <el-button type="primary" @click="saveRoute">保存路径</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import {
  Monitor,
  Connection,
  Document,
  VideoPlay,
  Refresh,
  Plus,
  Lightning,
  DataLine,
  Location
} from '@element-plus/icons-vue';
import { ref, reactive, computed, onMounted, onUnmounted } from 'vue';
import L from 'leaflet';
import { ElMessage, ElMessageBox } from 'element-plus';

// 工具状态
const activeTool = ref<'monitor' | 'route' | 'task'>('monitor');
const isSimulating = ref(false);
const showTaskDialog = ref(false);
const selectedAGV = ref<any>(null);

// 路径规划状态
const isDrawingRoute = ref(false);
const showSaveRouteDialog = ref(false);
const currentRoutePoints = ref<Array<{ lat: number; lng: number }>>([]);
const currentRouteLine = ref<L.Polyline | null>(null);
const saveRouteForm = reactive({
  name: ''
});

// 地图引用
const mapContainer = ref<HTMLElement | null>(null);
let map: L.Map | null = null;
let simulationInterval: number | null = null;

// 路径点标记图层
const routePointLayerGroup = L.layerGroup();
const routeLineLayerGroup = L.layerGroup();

// AGV 图标
const agvIcon = L.divIcon({
  className: 'agv-marker',
  html: `<div style="
    width: 28px;
    height: 28px;
    background: #409EFF;
    border: 3px solid white;
    border-radius: 50%;
    box-shadow: 0 2px 8px rgba(0,0,0,0.3);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 16px;
  ">🚗</div>`,
  iconSize: [28, 28],
  iconAnchor: [14, 14]
});

// 路径点图标
const routePointIcon = L.divIcon({
  className: 'route-point-marker',
  html: `<div style="
    width: 16px;
    height: 16px;
    background: #E6A23C;
    border: 2px solid white;
    border-radius: 50%;
    box-shadow: 0 2px 6px rgba(0,0,0,0.3);
  "></div>`,
  iconSize: [16, 16],
  iconAnchor: [8, 8]
});

// 起点/终点图标
const startPointIcon = L.divIcon({
  className: 'start-point-marker',
  html: `<div style="
    width: 20px;
    height: 20px;
    background: #67C23A;
    border: 2px solid white;
    border-radius: 50%;
    box-shadow: 0 2px 6px rgba(0,0,0,0.3);
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    font-size: 12px;
    font-weight: bold;
  ">起</div>`,
  iconSize: [20, 20],
  iconAnchor: [10, 10]
});

const endPointIcon = L.divIcon({
  className: 'end-point-marker',
  html: `<div style="
    width: 20px;
    height: 20px;
    background: #F56C6C;
    border: 2px solid white;
    border-radius: 50%;
    box-shadow: 0 2px 6px rgba(0,0,0,0.3);
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    font-size: 12px;
    font-weight: bold;
  ">终</div>`,
  iconSize: [20, 20],
  iconAnchor: [10, 10]
});

// AGV 车队数据
const agvs = ref<any[]>([
  { id: '001', status: '工作中', battery: 78, load: 150, maxLoad: 500, speed: 1.2, position: { lat: 39.9042, lng: 116.4074 }, currentTask: 'T001', currentRoute: '路线 1', routeProgress: 45 },
  { id: '002', status: '空闲', battery: 92, load: 0, maxLoad: 500, speed: 0, position: { lat: 39.9052, lng: 116.4084 }, currentTask: null, currentRoute: null, routeProgress: 0 },
  { id: '003', status: '充电中', battery: 45, load: 0, maxLoad: 500, speed: 0, position: { lat: 39.9032, lng: 116.4064 }, currentTask: null, currentRoute: null, routeProgress: 0 },
  { id: '004', status: '工作中', battery: 65, load: 280, maxLoad: 500, speed: 1.0, position: { lat: 39.9062, lng: 116.4094 }, currentTask: 'T002', currentRoute: '路线 2', routeProgress: 72 },
  { id: '005', status: '空闲', battery: 88, load: 0, maxLoad: 500, speed: 0, position: { lat: 39.9022, lng: 116.4054 }, currentTask: null, currentRoute: null, routeProgress: 0 },
]);

// 充电站数据
const chargingStations = ref([
  { id: 'C1', name: '1 号充电站', position: { lat: 39.9032, lng: 116.4064 }, status: '占用' },
  { id: 'C2', name: '2 号充电站', position: { lat: 39.9072, lng: 116.4104 }, status: '空闲' },
  { id: 'C3', name: '3 号充电站', position: { lat: 39.9012, lng: 116.4044 }, status: '空闲' },
]);

// 路径点/工作站数据
const waypoints = ref([
  { id: 'W1', name: '原料仓库 A', position: { lat: 39.9045, lng: 116.4070 } },
  { id: 'W2', name: '原料仓库 B', position: { lat: 39.9055, lng: 116.4080 } },
  { id: 'W3', name: '生产线 1', position: { lat: 39.9065, lng: 116.4090 } },
  { id: 'W4', name: '生产线 2', position: { lat: 39.9075, lng: 116.4100 } },
  { id: 'W5', name: '成品仓库', position: { lat: 39.9025, lng: 116.4060 } },
  { id: 'W6', name: '质检区', position: { lat: 39.9035, lng: 116.4075 } },
  { id: 'W7', name: '包装区', position: { lat: 39.9085, lng: 116.4110 } },
  { id: 'W8', name: '发货区', position: { lat: 39.9015, lng: 116.4050 } },
]);

// 保存的路径
const savedRoutes = ref<any[]>([
  {
    id: 'R1',
    name: '路线 1',
    points: [
      { lat: 39.9045, lng: 116.4070 },
      { lat: 39.9055, lng: 116.4080 },
      { lat: 39.9065, lng: 116.4090 }
    ],
    distance: 280
  },
  {
    id: 'R2',
    name: '路线 2',
    points: [
      { lat: 39.9055, lng: 116.4080 },
      { lat: 39.9065, lng: 116.4090 },
      { lat: 39.9075, lng: 116.4100 },
      { lat: 39.9085, lng: 116.4110 }
    ],
    distance: 420
  },
  {
    id: 'R3',
    name: '巡检路线',
    points: [
      { lat: 39.9045, lng: 116.4070 },
      { lat: 39.9035, lng: 116.4075 },
      { lat: 39.9025, lng: 116.4060 },
      { lat: 39.9015, lng: 116.4050 }
    ],
    distance: 350
  }
]);

// 任务数据
const tasks = ref<any[]>([
  { id: 'T001', type: '搬运', status: '进行中', agvId: '001', route: { id: 'R1', name: '路线 1' }, progress: 45, priority: 2 },
  { id: 'T002', type: '搬运', status: '进行中', agvId: '004', route: { id: 'R2', name: '路线 2' }, progress: 72, priority: 3 },
  { id: 'T003', type: '分拣', status: '等待', agvId: '002', route: null, progress: 0, priority: 1 },
  { id: 'T004', type: '充电', status: '已完成', agvId: '003', route: null, progress: 100, priority: 2 },
]);

// 新建任务表单
const newTask = reactive({
  type: '搬运',
  agvId: 'auto',
  routeId: '',
  priority: 2
});

const selectedRouteForTask = ref<any>(null);

// 路径规划图层
const pathLayerGroup = L.layerGroup();
const agvLayerGroup = L.layerGroup();
const waypointLayerGroup = L.layerGroup();
const chargingLayerGroup = L.layerGroup();

// 计算属性
const onlineCount = computed(() => agvs.value.filter(a => a.status !== '离线').length);
const activeTaskCount = computed(() => tasks.value.filter(t => t.status === '进行中').length);
const avgBattery = computed(() => {
  const sum = agvs.value.reduce((acc, a) => acc + a.battery, 0);
  return Math.round(sum / agvs.value.length);
});
const completedTasks = computed(() => tasks.value.filter(t => t.status === '已完成').length);
const availableAgvs = computed(() => agvs.value.filter(a => a.status === '空闲' || a.status === '充电中'));

// 初始化地图
onMounted(() => {
  if (!mapContainer.value) return;

  // 创建地图
  map = L.map(mapContainer.value, {
    center: [39.9045, 116.4075],
    zoom: 16,
    minZoom: 14,
    maxZoom: 18
  });

  // 添加底图
  L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
    attribution: '© OpenStreetMap © CARTO',
    maxZoom: 19
  }).addTo(map);

  // 添加各图层
  agvLayerGroup.addTo(map);
  waypointLayerGroup.addTo(map);
  chargingLayerGroup.addTo(map);
  pathLayerGroup.addTo(map);
  routePointLayerGroup.addTo(map);
  routeLineLayerGroup.addTo(map);

  // 渲染 AGV
  renderAGVs();
  
  // 渲染路径点
  renderWaypoints();
  
  // 渲染充电站
  renderChargingStations();
  
  // 加载预设路径
  savedRoutes.value.forEach(route => {
    renderRoute(route, false);
  });

  // 地图点击事件
  map.on('click', handleMapClick);
  
  // 双击完成路径绘制
  map.on('dblclick', finishDrawing);
  
  // ESC 取消绘制
  document.addEventListener('keydown', handleKeyDown);
});

// 处理地图点击
const handleMapClick = (e: L.LeafletMouseEvent) => {
  if (isDrawingRoute.value) {
    const point = { lat: e.latlng.lat, lng: e.latlng.lng };
    currentRoutePoints.value.push(point);
    updateRouteVisualization();
  }
};

// 处理键盘事件
const handleKeyDown = (e: KeyboardEvent) => {
  if (e.key === 'Escape' && isDrawingRoute.value) {
    cancelDrawing();
  }
};

// 更新路径可视化
const updateRouteVisualization = () => {
  routePointLayerGroup.clearLayers();
  
  // 绘制路径点
  currentRoutePoints.value.forEach((point, index) => {
    const icon = index === 0 ? startPointIcon : (index === currentRoutePoints.value.length - 1 ? endPointIcon : routePointIcon);
    const marker = L.marker([point.lat, point.lng], { icon });
    
    if (index === 0) {
      marker.bindPopup('起点');
    } else if (index === currentRoutePoints.value.length - 1) {
      marker.bindPopup('终点');
    } else {
      marker.bindPopup(`途经点 ${index}`);
    }
    
    routePointLayerGroup.addLayer(marker);
  });
  
  // 绘制路径线
  if (currentRouteLine.value) {
    routeLineLayerGroup.removeLayer(currentRouteLine.value);
  }
  
  if (currentRoutePoints.value.length > 1) {
    const latlngs = currentRoutePoints.value.map(p => [p.lat, p.lng]);
    currentRouteLine.value = L.polyline(latlngs as L.LatLngTuple[], {
      color: '#E6A23C',
      weight: 4,
      opacity: 0.9,
      dashArray: '10, 10',
      lineCap: 'round'
    });
    routeLineLayerGroup.addLayer(currentRouteLine.value);
  }
};

// 开始新建路径
const startNewRoute = () => {
  isDrawingRoute.value = true;
  currentRoutePoints.value = [];
  routePointLayerGroup.clearLayers();
  routeLineLayerGroup.clearLayers();
  ElMessage.info('请在地图上点击添加路径点，双击或按 ESC 完成');
};

// 完成绘制
const finishDrawing = () => {
  if (!isDrawingRoute.value) return;
  
  if (currentRoutePoints.value.length < 2) {
    ElMessage.warning('至少需要 2 个路径点');
    return;
  }
  
  isDrawingRoute.value = false;
  showSaveRouteDialog.value = true;
};

// 取消绘制
const cancelDrawing = () => {
  isDrawingRoute.value = false;
  currentRoutePoints.value = [];
  routePointLayerGroup.clearLayers();
  routeLineLayerGroup.clearLayers();
  ElMessage.info('已取消路径绘制');
};

// 保存路径
const saveRoute = () => {
  if (!saveRouteForm.name) {
    ElMessage.warning('请输入路径名称');
    return;
  }
  
  const newRoute = {
    id: `R${savedRoutes.value.length + 1}`,
    name: saveRouteForm.name,
    points: [...currentRoutePoints.value],
    distance: calculateRouteDistance(currentRoutePoints.value)
  };
  
  savedRoutes.value.push(newRoute);
  renderRoute(newRoute, true);
  
  showSaveRouteDialog.value = false;
  currentRoutePoints.value = [];
  routePointLayerGroup.clearLayers();
  routeLineLayerGroup.clearLayers();
  
  ElMessage.success(`路径"${saveRouteForm.name}"已保存`);
};

// 计算路径距离（米）
const calculateRouteDistance = (points: Array<{ lat: number; lng: number }>) => {
  let distance = 0;
  for (let i = 1; i < points.length; i++) {
    distance += calculateDistance(points[i - 1], points[i]);
  }
  return distance;
};

// 计算两点距离（Haversine 公式）
const calculateDistance = (point1: { lat: number; lng: number }, point2: { lat: number; lng: number }) => {
  const R = 6371000; // 地球半径（米）
  const dLat = (point2.lat - point1.lat) * Math.PI / 180;
  const dLng = (point2.lng - point1.lng) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(point1.lat * Math.PI / 180) * Math.cos(point2.lat * Math.PI / 180) *
            Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

// 渲染路径
const renderRoute = (route: any, highlight: boolean = false) => {
  const latlngs = route.points.map((p: any) => [p.lat, p.lng]);
  const polyline = L.polyline(latlngs as L.LatLngTuple[], {
    color: highlight ? '#E6A23C' : '#409EFF',
    weight: highlight ? 5 : 3,
    opacity: 0.8,
    dashArray: highlight ? undefined : '10, 10'
  });
  
  polyline.bindPopup(`<strong>${route.name}</strong><br>距离：${route.distance.toFixed(1)}m`);
  pathLayerGroup.addLayer(polyline);
};

// 选择路径
const selectRoute = (route: any) => {
  pathLayerGroup.clearLayers();
  renderRoute(route, true);
  
  // 调整视图到路径范围
  if (route.points.length > 0) {
    const bounds = L.latLngBounds(route.points.map((p: any) => [p.lat, p.lng]));
    map?.fitBounds(bounds, { padding: [50, 50] });
  }
  
  ElMessage.success(`已加载路径：${route.name}`);
};

// 加载路径
const loadRoute = (route: any) => {
  selectRoute(route);
};

// 删除路径
const deleteRoute = (routeId: string) => {
  ElMessageBox.confirm('确定要删除该路径吗？', '提示', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning'
  }).then(() => {
    savedRoutes.value = savedRoutes.value.filter(r => r.id !== routeId);
    pathLayerGroup.clearLayers();
    savedRoutes.value.forEach(route => renderRoute(route, false));
    ElMessage.success('路径已删除');
  });
};

// 路径选择变化
const onRouteChange = (routeId: string) => {
  selectedRouteForTask.value = savedRoutes.value.find(r => r.id === routeId);
};

// 计算路径时间
const calculateRouteTime = (route: any) => {
  const avgSpeed = 1.2; // 平均速度 m/s
  return route.distance / avgSpeed;
};

// 渲染 AGV
const renderAGVs = () => {
  agvLayerGroup.clearLayers();
  
  agvs.value.forEach(agv => {
    const marker = L.marker([agv.position.lat, agv.position.lng], { icon: agvIcon });
    marker.bindPopup(`
      <strong>AGV-${agv.id}</strong><br>
      状态：${agv.status}<br>
      电量：${agv.battery}%<br>
      负载：${agv.load}kg<br>
      速度：${agv.speed}m/s<br>
      路径：${agv.currentRoute || '无'}<br>
      进度：${agv.routeProgress || 0}%<br>
      任务：${agv.currentTask || '空闲'}
    `);
    agvLayerGroup.addLayer(marker);
  });
};

// 渲染路径点
const renderWaypoints = () => {
  waypointLayerGroup.clearLayers();
  
  waypoints.value.forEach(wp => {
    const marker = L.marker([wp.position.lat, wp.position.lng]);
    marker.bindPopup(`<strong>${wp.name}</strong><br>ID: ${wp.id}`);
    waypointLayerGroup.addLayer(marker);
  });
};

// 渲染充电站
const renderChargingStations = () => {
  chargingLayerGroup.clearLayers();
  
  chargingStations.value.forEach(cs => {
    const marker = L.marker([cs.position.lat, cs.position.lng]);
    marker.bindPopup(`<strong>${cs.name}</strong><br>状态：${cs.status}`);
    chargingLayerGroup.addLayer(marker);
  });
};

// 选择 AGV
const selectAGV = (agv: any) => {
  selectedAGV.value = agv;
  if (agv && map) {
    map.setView([agv.position.lat, agv.position.lng], 17);
  }
};

// 添加 AGV
const addAGV = () => {
  const newId = String(agvs.value.length + 1).padStart(3, '0');
  agvs.value.push({
    id: newId,
    status: '空闲',
    battery: 100,
    load: 0,
    maxLoad: 500,
    speed: 0,
    position: { lat: 39.9045 + Math.random() * 0.01, lng: 116.4075 + Math.random() * 0.01 },
    currentTask: null,
    currentRoute: null,
    routeProgress: 0
  });
  renderAGVs();
  ElMessage.success(`AGV-${newId} 已添加`);
};

// 获取状态类型
const getStatusType = (status: string) => {
  const types: Record<string, any> = {
    '工作中': 'primary',
    '空闲': 'success',
    '充电中': 'warning',
    '离线': 'info',
    '故障': 'danger'
  };
  return types[status] || '';
};

// 获取任务状态类型
const getTaskStatusType = (status: string) => {
  const types: Record<string, any> = {
    '等待': 'info',
    '进行中': 'primary',
    '已完成': 'success',
    '已取消': 'danger'
  };
  return types[status] || '';
};

// 查看任务路径
const viewTaskPath = (task: any) => {
  if (task.route) {
    const route = savedRoutes.value.find(r => r.id === task.route.id);
    if (route) {
      selectRoute(route);
      ElMessage.success(`任务 ${task.id} 路径已显示`);
    }
  } else {
    ElMessage.warning('该任务没有绑定路径');
  }
};

// 取消任务
const cancelTask = (taskId: string) => {
  const task = tasks.value.find(t => t.id === taskId);
  if (task) {
    task.status = '已取消';
    if (task.agvId) {
      const agv = agvs.value.find(a => a.id === task.agvId);
      if (agv) {
        agv.status = '空闲';
        agv.currentTask = null;
        agv.currentRoute = null;
        agv.routeProgress = 0;
      }
    }
    renderAGVs();
    ElMessage.success(`任务 ${taskId} 已取消`);
  }
};

// 创建任务
const createTask = () => {
  if (!newTask.routeId) {
    ElMessage.warning('请选择路径');
    return;
  }
  
  // 自动分配 AGV
  let agvId = newTask.agvId;
  if (agvId === 'auto') {
    const available = agvs.value.find(a => a.status === '空闲' && a.battery > 20);
    if (available) {
      agvId = available.id;
    } else {
      ElMessage.warning('没有可用的 AGV');
      return;
    }
  }
  
  const route = savedRoutes.value.find(r => r.id === newTask.routeId);
  if (!route) {
    ElMessage.warning('路径不存在');
    return;
  }
  
  const newTaskId = `T${String(tasks.value.length + 1).padStart(3, '0')}`;
  tasks.value.push({
    id: newTaskId,
    type: newTask.type,
    status: '等待',
    agvId: agvId,
    route: { id: route.id, name: route.name },
    progress: 0,
    priority: newTask.priority
  });
  
  // 更新 AGV 状态
  const agv = agvs.value.find(a => a.id === agvId);
  if (agv) {
    agv.status = '工作中';
    agv.currentTask = newTaskId;
    agv.currentRoute = route.name;
    agv.routeProgress = 0;
  }
  
  showTaskDialog.value = false;
  renderAGVs();
  ElMessage.success(`任务 ${newTaskId} 已创建`);
};

// 分配路径给 AGV
const assignRoute = (agv: any) => {
  ElMessageBox.prompt('请输入路径 ID（R1, R2, R3...）', '分配路径', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    inputValue: 'R1'
  }).then(({ value }) => {
    const route = savedRoutes.value.find(r => r.id === value);
    if (route) {
      agv.currentRoute = route.name;
      agv.routeProgress = 0;
      renderAGVs();
      ElMessage.success(`AGV-${agv.id} 已分配路径：${route.name}`);
    } else {
      ElMessage.error('路径不存在');
    }
  });
};

// 停止 AGV
const stopAGV = (agvId: string) => {
  const agv = agvs.value.find(a => a.id === agvId);
  if (agv) {
    agv.speed = 0;
    agv.status = '空闲';
    renderAGVs();
    ElMessage.success(`AGV-${agvId} 已暂停`);
  }
};

// 急停
const emergencyStop = (agvId: string) => {
  const agv = agvs.value.find(a => a.id === agvId);
  if (agv) {
    agv.speed = 0;
    agv.status = '空闲';
    renderAGVs();
    ElMessage.warning(`AGV-${agvId} 紧急停止`);
  }
};

// 切换模拟
const toggleSimulation = () => {
  if (isSimulating.value) {
    if (simulationInterval) {
      clearInterval(simulationInterval);
      simulationInterval = null;
    }
    isSimulating.value = false;
    ElMessage.info('模拟已暂停');
  } else {
    isSimulating.value = true;
    simulationInterval = window.setInterval(() => {
      simulateAGVMovement();
    }, 100);
    ElMessage.success('模拟已开始');
  }
};

// 重置模拟
const resetSimulation = () => {
  if (simulationInterval) {
    clearInterval(simulationInterval);
    simulationInterval = null;
  }
  isSimulating.value = false;
  
  // 重置 AGV 状态
  agvs.value.forEach((agv, index) => {
    agv.status = index % 2 === 0 ? '工作中' : '空闲';
    agv.battery = 70 + Math.random() * 30;
    agv.load = agv.status === '工作中' ? Math.random() * 300 : 0;
    agv.speed = agv.status === '工作中' ? 0.8 + Math.random() * 0.5 : 0;
    agv.currentTask = agv.status === '工作中' ? `T${String(index + 1).padStart(3, '0')}` : null;
    agv.currentRoute = agv.status === '工作中' ? `路线${index % 3 + 1}` : null;
    agv.routeProgress = agv.status === '工作中' ? Math.random() * 100 : 0;
  });
  
  // 重置任务
  tasks.value.forEach((task, index) => {
    task.status = index < 2 ? '进行中' : (index === 2 ? '等待' : '已完成');
    task.progress = index < 2 ? Math.random() * 100 : (index === 2 ? 0 : 100);
  });
  
  pathLayerGroup.clearLayers();
  savedRoutes.value.forEach(route => renderRoute(route, false));
  renderAGVs();
  ElMessage.success('模拟已重置');
};

// 模拟 AGV 沿路径移动
const simulateAGVMovement = () => {
  agvs.value.forEach(agv => {
    if (agv.status === '工作中' && agv.currentRoute) {
      // 找到对应的路径
      const route = savedRoutes.value.find(r => r.name === agv.currentRoute);
      if (route && route.points.length >= 2) {
        // 增加进度
        const speedIncrement = agv.speed * 0.1 / route.distance * 100; // 每 100ms 的进度增量
        agv.routeProgress = Math.min(100, agv.routeProgress + speedIncrement);
        
        // 计算当前位置
        const progress = agv.routeProgress / 100;
        const totalSegments = route.points.length - 1;
        const currentSegment = Math.floor(progress * totalSegments);
        const segmentProgress = (progress * totalSegments) % 1;
        
        if (currentSegment < totalSegments) {
          const startPoint = route.points[currentSegment];
          const endPoint = route.points[currentSegment + 1];
          
          // 线性插值
          agv.position.lat = startPoint.lat + (endPoint.lat - startPoint.lat) * segmentProgress;
          agv.position.lng = startPoint.lng + (endPoint.lng - startPoint.lng) * segmentProgress;
        }
        
        // 到达终点
        if (agv.routeProgress >= 100) {
          agv.status = '空闲';
          agv.currentRoute = null;
          agv.routeProgress = 0;
          agv.speed = 0;
          
          // 更新任务状态
          const task = tasks.value.find(t => t.agvId === agv.id && t.status === '进行中');
          if (task) {
            task.status = '已完成';
            task.progress = 100;
          }
          
          ElMessage.success(`AGV-${agv.id} 已到达目的地`);
        }
        
        // 电量消耗
        agv.battery = Math.max(0, agv.battery - 0.05);
        
        // 低电量自动充电
        if (agv.battery < 15 && agv.status === '工作中') {
          agv.status = '充电中';
          agv.currentRoute = null;
          agv.speed = 0;
          ElMessage.warning(`AGV-${agv.id} 电量低，自动前往充电`);
        }
      }
    } else if (agv.status === '充电中') {
      // 充电
      agv.battery = Math.min(100, agv.battery + 0.2);
      if (agv.battery >= 100) {
        agv.status = '空闲';
        ElMessage.success(`AGV-${agv.id} 充电完成`);
      }
    }
  });
  
  renderAGVs();
  
  // 更新任务进度
  tasks.value.forEach(task => {
    if (task.status === '进行中' && task.agvId) {
      const agv = agvs.value.find(a => a.id === task.agvId);
      if (agv) {
        task.progress = agv.routeProgress || 0;
      }
    }
  });
};

onUnmounted(() => {
  if (simulationInterval) {
    clearInterval(simulationInterval);
  }
  document.removeEventListener('keydown', handleKeyDown);
});
</script>

<style scoped>
.agv-container {
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

.route-list-panel {
  position: absolute;
  top: 70px;
  left: 20px;
  width: 500px;
  z-index: 1000;
  max-height: calc(100% - 150px);
  overflow-y: auto;
}

.route-tips {
  margin-top: 16px;
}

.agv-list-panel {
  position: absolute;
  top: 70px;
  left: 20px;
  width: 550px;
  z-index: 1000;
  max-height: calc(100% - 150px);
  overflow-y: auto;
}

.task-panel {
  position: absolute;
  top: 70px;
  right: 20px;
  width: 750px;
  z-index: 1000;
  max-height: calc(100% - 150px);
  overflow-y: auto;
}

.agv-detail-panel {
  position: absolute;
  bottom: 80px;
  left: 20px;
  width: 400px;
  z-index: 1000;
}

.agv-actions {
  margin-top: 16px;
  display: flex;
  gap: 8px;
}

.status-bar {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 50px;
  background: white;
  box-shadow: 0 -2px 8px rgba(0, 0, 0, 0.15);
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: space-around;
  padding: 0 20px;
}

.status-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  color: #666;
}

.status-item strong {
  color: #409EFF;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.drawing-tip {
  position: absolute;
  top: 70px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 1000;
}

.drawing-tip-content {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 8px 16px;
}

.drawing-actions {
  display: flex;
  gap: 8px;
}

.route-preview {
  background: #f5f7fa;
  padding: 12px;
  border-radius: 4px;
  font-size: 14px;
  line-height: 1.8;
}

.route-preview-empty {
  color: #999;
  font-style: italic;
}
</style>
