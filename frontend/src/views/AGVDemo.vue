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
          <el-button :type="activeTool === 'path' ? 'primary' : ''" @click="activeTool = 'path'">
            <el-icon><Connection /></el-icon> 路径规划
          </el-button>
          <el-button :type="activeTool === 'task' ? 'primary' : ''" @click="activeTool = 'task'">
            <el-icon><Document /></el-icon> 任务管理
          </el-button>
        </el-button-group>
      </div>
      <div class="toolbar-right">
        <el-button @click="toggleSimulation" :type="isSimulating ? 'success' : ''">
          <el-icon><VideoPlay /></el-icon> {{ isSimulating ? '暂停模拟' : '开始模拟' }}
        </el-button>
        <el-button @click="resetSimulation" type="warning">
          <el-icon><Refresh /></el-icon> 重置
        </el-button>
      </div>
    </div>

    <!-- 地图容器 -->
    <div ref="mapContainer" class="map-wrapper"></div>

    <!-- 左侧 AGV 列表 -->
    <div class="agv-list-panel">
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
          <el-table-column label="起点" width="120">
            <template #default="{ row }">
              {{ row.from?.name || '-' }}
            </template>
          </el-table-column>
          <el-table-column label="终点" width="120">
            <template #default="{ row }">
              {{ row.to?.name || '-' }}
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
        <el-form-item label="起点">
          <el-select v-model="newTask.fromId" style="width: 100%" placeholder="选择起点">
            <el-option v-for="point in waypoints" :key="point.id" :label="point.name" :value="point.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="终点">
          <el-select v-model="newTask.toId" style="width: 100%" placeholder="选择终点">
            <el-option v-for="point in waypoints" :key="point.id" :label="point.name" :value="point.id" />
          </el-select>
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
          <el-descriptions-item label="当前任务">{{ selectedAGV.currentTask || '空闲' }}</el-descriptions-item>
          <el-descriptions-item label="运行时长">{{ selectedAGV.runTime }} 分钟</el-descriptions-item>
        </el-descriptions>
        <div class="agv-actions">
          <el-button size="small" @click="chargeAGV(selectedAGV.id)" :disabled="selectedAGV.status !== '空闲'">
            🔋 充电
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
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, onUnmounted } from 'vue';
import L from 'leaflet';
import { ElMessage } from 'element-plus';

import {
  Monitor,
  Connection,
  Document,
  VideoPlay,
  Refresh,
  Plus,
  Lightning,
  DataLine,
  Van
} from '@element-plus/icons-vue';

// 工具状态
const activeTool = ref<'monitor' | 'path' | 'task'>('monitor');
const isSimulating = ref(false);
const showTaskDialog = ref(false);
const selectedAGV = ref<any>(null);

// 地图引用
const mapContainer = ref<HTMLElement | null>(null);
let map: L.Map | null = null;
let simulationInterval: number | null = null;

// AGV 图标
const agvIcon = L.divIcon({
  className: 'agv-marker',
  html: `<div style="
    width: 24px;
    height: 24px;
    background: #409EFF;
    border: 2px solid white;
    border-radius: 50%;
    box-shadow: 0 2px 8px rgba(0,0,0,0.3);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 14px;
  ">🚗</div>`,
  iconSize: [24, 24],
  iconAnchor: [12, 12]
});

// 充电站图标
const chargingIcon = L.divIcon({
  className: 'charging-marker',
  html: `<div style="
    width: 28px;
    height: 28px;
    background: #67C23A;
    border: 2px solid white;
    border-radius: 4px;
    box-shadow: 0 2px 8px rgba(0,0,0,0.3);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 16px;
  ">🔋</div>`,
  iconSize: [28, 28],
  iconAnchor: [14, 14]
});

// 路径点图标
const waypointIcon = L.divIcon({
  className: 'waypoint-marker',
  html: `<div style="
    width: 20px;
    height: 20px;
    background: #E6A23C;
    border: 2px solid white;
    border-radius: 50%;
    box-shadow: 0 2px 8px rgba(0,0,0,0.3);
  "></div>`,
  iconSize: [20, 20],
  iconAnchor: [10, 10]
});

// AGV 车队数据
const agvs = ref<any[]>([
  { id: '001', status: '工作中', battery: 78, load: 150, maxLoad: 500, speed: 1.2, position: { lat: 39.9042, lng: 116.4074 }, currentTask: 'T001', runTime: 125 },
  { id: '002', status: '空闲', battery: 92, load: 0, maxLoad: 500, speed: 0, position: { lat: 39.9052, lng: 116.4084 }, currentTask: null, runTime: 89 },
  { id: '003', status: '充电中', battery: 45, load: 0, maxLoad: 500, speed: 0, position: { lat: 39.9032, lng: 116.4064 }, currentTask: null, runTime: 210 },
  { id: '004', status: '工作中', battery: 65, load: 280, maxLoad: 500, speed: 1.0, position: { lat: 39.9062, lng: 116.4094 }, currentTask: 'T002', runTime: 67 },
  { id: '005', status: '空闲', battery: 88, load: 0, maxLoad: 500, speed: 0, position: { lat: 39.9022, lng: 116.4054 }, currentTask: null, runTime: 45 },
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

// 任务数据
const tasks = ref<any[]>([
  { id: 'T001', type: '搬运', status: '进行中', agvId: '001', from: { id: 'W1', name: '原料仓库 A' }, to: { id: 'W3', name: '生产线 1' }, priority: 2 },
  { id: 'T002', type: '搬运', status: '进行中', agvId: '004', from: { id: 'W2', name: '原料仓库 B' }, to: { id: 'W4', name: '生产线 2' }, priority: 3 },
  { id: 'T003', type: '分拣', status: '等待', agvId: '002', from: { id: 'W5', name: '成品仓库' }, to: { id: 'W6', name: '质检区' }, priority: 1 },
  { id: 'T004', type: '充电', status: '已完成', agvId: '003', from: null, to: { id: 'C1', name: '1 号充电站' }, priority: 2 },
]);

// 新建任务表单
const newTask = reactive({
  type: '搬运',
  agvId: 'auto',
  fromId: '',
  toId: '',
  priority: 2
});

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

  // 创建地图（使用室内地图样式）
  map = L.map(mapContainer.value, {
    center: [39.9045, 116.4075],
    zoom: 16,
    minZoom: 14,
    maxZoom: 18
  });

  // 添加底图（使用 CartoDB 浅色主题，更像室内地图）
  L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
    attribution: '© OpenStreetMap © CARTO',
    maxZoom: 19
  }).addTo(map);

  // 添加各图层
  agvLayerGroup.addTo(map);
  waypointLayerGroup.addTo(map);
  chargingLayerGroup.addTo(map);
  pathLayerGroup.addTo(map);

  // 渲染 AGV
  renderAGVs();
  
  // 渲染路径点
  renderWaypoints();
  
  // 渲染充电站
  renderChargingStations();
});

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
      任务：${agv.currentTask || '空闲'}
    `);
    agvLayerGroup.addLayer(marker);
  });
};

// 渲染路径点
const renderWaypoints = () => {
  waypointLayerGroup.clearLayers();
  
  waypoints.value.forEach(wp => {
    const marker = L.marker([wp.position.lat, wp.position.lng], { icon: waypointIcon });
    marker.bindPopup(`<strong>${wp.name}</strong><br>ID: ${wp.id}`);
    waypointLayerGroup.addLayer(marker);
  });
};

// 渲染充电站
const renderChargingStations = () => {
  chargingLayerGroup.clearLayers();
  
  chargingStations.value.forEach(cs => {
    const marker = L.marker([cs.position.lat, cs.position.lng], { icon: chargingIcon });
    marker.bindPopup(`
      <strong>${cs.name}</strong><br>
      状态：${cs.status}
    `);
    chargingLayerGroup.addLayer(marker);
  });
};

// 绘制路径
const drawPath = (from: any, to: any, color: string = '#409EFF') => {
  if (!from || !to) return;
  
  const latlngs: [number, number][] = [
    [from.position.lat, from.position.lng],
    [to.position.lat, to.position.lng]
  ];
  
  const polyline = L.polyline(latlngs, {
    color: color,
    weight: 4,
    opacity: 0.8,
    dashArray: '10, 10',
    lineCap: 'round'
  });
  
  pathLayerGroup.addLayer(polyline);
  
  // 添加起点和终点标记
  L.circleMarker([from.position.lat, from.position.lng], {
    radius: 8,
    fillColor: '#67C23A',
    color: '#fff',
    weight: 2,
    fillOpacity: 1
  }).addTo(pathLayerGroup);
  
  L.circleMarker([to.position.lat, to.position.lng], {
    radius: 8,
    fillColor: '#F56C6C',
    color: '#fff',
    weight: 2,
    fillOpacity: 1
  }).addTo(pathLayerGroup);
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
    runTime: 0
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
  pathLayerGroup.clearLayers();
  if (task.from && task.to) {
    drawPath(task.from, task.to);
    ElMessage.success(`任务 ${task.id} 路径已显示`);
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
      }
    }
    renderAGVs();
    ElMessage.success(`任务 ${taskId} 已取消`);
  }
};

// 创建任务
const createTask = () => {
  if (!newTask.fromId || !newTask.toId) {
    ElMessage.warning('请选择起点和终点');
    return;
  }
  
  const from = waypoints.value.find(w => w.id === newTask.fromId);
  const to = waypoints.value.find(w => w.id === newTask.toId);
  
  if (!from || !to) {
    ElMessage.warning('起点或终点无效');
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
  
  const newTaskId = `T${String(tasks.value.length + 1).padStart(3, '0')}`;
  tasks.value.push({
    id: newTaskId,
    type: newTask.type,
    status: '等待',
    agvId: agvId,
    from: { id: from.id, name: from.name },
    to: { id: to.id, name: to.name },
    priority: newTask.priority
  });
  
  // 更新 AGV 状态
  const agv = agvs.value.find(a => a.id === agvId);
  if (agv) {
    agv.status = '工作中';
    agv.currentTask = newTaskId;
  }
  
  showTaskDialog.value = false;
  renderAGVs();
  ElMessage.success(`任务 ${newTaskId} 已创建`);
};

// 充电
const chargeAGV = (agvId: string) => {
  const agv = agvs.value.find(a => a.id === agvId);
  if (agv) {
    agv.status = '充电中';
    agv.currentTask = null;
    renderAGVs();
    ElMessage.success(`AGV-${agvId} 开始充电`);
  }
};

// 暂停 AGV
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
    // 暂停
    if (simulationInterval) {
      clearInterval(simulationInterval);
      simulationInterval = null;
    }
    isSimulating.value = false;
    ElMessage.info('模拟已暂停');
  } else {
    // 开始
    isSimulating.value = true;
    simulationInterval = window.setInterval(() => {
      simulateAGVMovement();
    }, 1000);
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
    agv.runTime = Math.random() * 200;
  });
  
  // 重置任务
  tasks.value.forEach((task, index) => {
    task.status = index < 2 ? '进行中' : (index === 2 ? '等待' : '已完成');
  });
  
  pathLayerGroup.clearLayers();
  renderAGVs();
  ElMessage.success('模拟已重置');
};

// 模拟 AGV 移动
const simulateAGVMovement = () => {
  agvs.value.forEach(agv => {
    if (agv.status === '工作中') {
      // 模拟位置变化
      const delta = 0.0001;
      agv.position.lat += (Math.random() - 0.5) * delta;
      agv.position.lng += (Math.random() - 0.5) * delta;
      
      // 模拟电量消耗
      agv.battery = Math.max(0, agv.battery - 0.1);
      
      // 低电量自动去充电
      if (agv.battery < 15 && agv.status === '工作中') {
        agv.status = '充电中';
        agv.currentTask = null;
        agv.speed = 0;
        ElMessage.warning(`AGV-${agv.id} 电量低，自动前往充电`);
      }
    } else if (agv.status === '充电中') {
      // 模拟充电
      agv.battery = Math.min(100, agv.battery + 0.5);
      if (agv.battery >= 100) {
        agv.status = '空闲';
        ElMessage.success(`AGV-${agv.id} 充电完成`);
      }
    }
    
    // 更新运行时长
    if (agv.status === '工作中') {
      agv.runTime += 0.017; // 每分钟
    }
  });
  
  renderAGVs();
};

onUnmounted(() => {
  if (simulationInterval) {
    clearInterval(simulationInterval);
  }
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
  width: 700px;
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
</style>
