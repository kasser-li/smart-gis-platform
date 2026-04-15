/**
 * LOD (Level of Detail) 配置
 * 根据地图缩放级别定义渲染精度
 */

export interface LODLevel {
  minZoom: number;      // 最小 zoom 级别
  maxZoom: number;      // 最大 zoom 级别
  ratio: number;        // 返回比例 (0.0-1.0)
  tolerance: number;    // Douglas-Peucker 简化容差
  priority: string;     // 优先级策略：major, medium, minor, all
  description: string;  // 描述
}

/**
 * LOD 配置表
 * zoom 越小，返回比例越小，简化越多
 */
export const LOD_CONFIG: LODLevel[] = [
  {
    minZoom: 0,
    maxZoom: 10,
    ratio: 0.01,
    tolerance: 0.01,
    priority: 'major',
    description: '省级视图 - 只看轮廓 (1%)'
  },
  {
    minZoom: 10,
    maxZoom: 12,
    ratio: 0.05,
    tolerance: 0.005,
    priority: 'major',
    description: '市级视图 - 主要结构 (5%)'
  },
  {
    minZoom: 12,
    maxZoom: 14,
    ratio: 0.20,
    tolerance: 0.001,
    priority: 'medium',
    description: '区级视图 - 中等细节 (20%)'
  },
  {
    minZoom: 14,
    maxZoom: 16,
    ratio: 0.50,
    tolerance: 0.0005,
    priority: 'minor',
    description: '街道视图 - 较多细节 (50%)'
  },
  {
    minZoom: 16,
    maxZoom: 20,
    ratio: 1.00,
    tolerance: 0,
    priority: 'all',
    description: '建筑视图 - 全部细节 (100%)'
  }
];

/**
 * 根据 zoom 级别获取 LOD 配置
 * @param zoom 地图缩放级别
 * @returns LOD 配置
 */
export function getLODConfig(zoom: number): LODLevel {
  const config = LOD_CONFIG.find(level => 
    zoom >= level.minZoom && zoom < level.maxZoom
  );
  
  return config || LOD_CONFIG[LOD_CONFIG.length - 1];
}

/**
 * 根据 zoom 计算简化容差
 * zoom 越小，容差越大，简化越多
 * @param zoom 地图缩放级别
 * @returns 简化容差
 */
export function calculateTolerance(zoom: number): number {
  const config = getLODConfig(zoom);
  return config.tolerance;
}

/**
 * 根据 zoom 计算返回比例
 * @param zoom 地图缩放级别
 * @returns 返回比例 (0.0-1.0)
 */
export function getReturnRatio(zoom: number): number {
  const config = getLODConfig(zoom);
  return config.ratio;
}

/**
 * 获取 LOD 级别描述
 * @param zoom 地图缩放级别
 * @returns 描述信息
 */
export function getLODDescription(zoom: number): string {
  const config = getLODConfig(zoom);
  return `${config.description} - zoom ${zoom}`;
}
