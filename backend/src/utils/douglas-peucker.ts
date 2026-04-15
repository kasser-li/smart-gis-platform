/**
 * Douglas-Peucker 多段线简化算法
 * 在保持形状的前提下减少点数
 */

export interface Point2D {
  x: number;
  y: number;
}

/**
 * Douglas-Peucker 算法实现
 * @param points 原始点集
 * @param tolerance 简化容差（值越大，简化越多）
 * @returns 简化后的点集
 */
export function douglasPeucker(points: Point2D[], tolerance: number): Point2D[] {
  if (points.length < 3) {
    return points;
  }
  
  // 找到距离基线最远的点
  let maxDistance = 0;
  let maxIndex = 0;
  
  const start = points[0];
  const end = points[points.length - 1];
  
  for (let i = 1; i < points.length - 1; i++) {
    const distance = perpendicularDistance(points[i], start, end);
    
    if (distance > maxDistance) {
      maxDistance = distance;
      maxIndex = i;
    }
  }
  
  // 如果最远点距离大于容差，递归简化
  if (maxDistance > tolerance) {
    // 递归简化左右两部分
    const leftPoints = douglasPeucker(points.slice(0, maxIndex + 1), tolerance);
    const rightPoints = douglasPeucker(points.slice(maxIndex), tolerance);
    
    // 合并结果（去掉重复的中间点）
    return [...leftPoints.slice(0, -1), ...rightPoints];
  } else {
    // 否则只保留端点
    return [start, end];
  }
}

/**
 * 计算点到线段的垂直距离
 * @param point 点
 * @param lineStart 线段起点
 * @param lineEnd 线段终点
 * @returns 垂直距离
 */
export function perpendicularDistance(
  point: Point2D,
  lineStart: Point2D,
  lineEnd: Point2D
): number {
  const dx = lineEnd.x - lineStart.x;
  const dy = lineEnd.y - lineStart.y;
  
  // 线段长度为 0 的情况
  if (dx === 0 && dy === 0) {
    return Math.sqrt((point.x - lineStart.x) ** 2 + (point.y - lineStart.y) ** 2);
  }
  
  // 计算投影参数 t
  const t = Math.max(
    0,
    Math.min(
      1,
      ((point.x - lineStart.x) * dx + (point.y - lineStart.y) * dy) / (dx * dx + dy * dy)
    )
  );
  
  // 计算投影点
  const projX = lineStart.x + t * dx;
  const projY = lineStart.y + t * dy;
  
  // 返回点到投影点的距离
  return Math.sqrt((point.x - projX) ** 2 + (point.y - projY) ** 2);
}

/**
 * 简化 CAD 实体
 * @param entity CAD 实体
 * @param tolerance 简化容差
 * @returns 简化后的实体
 */
export function simplifyEntity(entity: any, tolerance: number): any {
  if (!entity.geometry || tolerance <= 0) {
    return entity;
  }
  
  const simplified = { ...entity };
  
  switch (entity.type) {
    case 'LWPOLYLINE':
    case 'POLYLINE':
      if (entity.geometry.vertices && entity.geometry.vertices.length > 2) {
        simplified.geometry = {
          ...entity.geometry,
          vertices: douglasPeucker(entity.geometry.vertices, tolerance)
        };
        
        console.log(
          `简化 ${entity.type}: ${entity.geometry.vertices.length} → ${simplified.geometry.vertices.length} 点`
        );
      }
      break;
    
    case 'LINE':
      // 线段只有两个点，不需要简化
      break;
    
    case 'CIRCLE':
    case 'ARC':
      // 圆和弧不简化
      break;
    
    default:
      // 其他类型不简化
      break;
  }
  
  return simplified;
}

/**
 * 批量简化实体
 * @param entities 实体列表
 * @param tolerance 简化容差
 * @returns 简化后的实体列表
 */
export function simplifyEntities(entities: any[], tolerance: number): any[] {
  if (tolerance <= 0) {
    return entities;
  }
  
  console.log(`开始简化 ${entities.length} 个实体，容差=${tolerance}`);
  
  const simplified = entities.map(entity => simplifyEntity(entity, tolerance));
  
  const originalPoints = entities.reduce((sum, e) => {
    if (e.type === 'LWPOLYLINE' || e.type === 'POLYLINE') {
      return sum + (e.geometry.vertices?.length || 0);
    }
    return sum;
  }, 0);
  
  const simplifiedPoints = simplified.reduce((sum, e) => {
    if (e.type === 'LWPOLYLINE' || e.type === 'POLYLINE') {
      return sum + (e.geometry.vertices?.length || 0);
    }
    return sum;
  }, 0);
  
  const reduction = ((originalPoints - simplifiedPoints) / originalPoints * 100).toFixed(1);
  console.log(`简化完成：点数 ${originalPoints} → ${simplifiedPoints} (减少 ${reduction}%)`);
  
  return simplified;
}

/**
 * 根据 zoom 级别计算简化容差
 * @param zoom 地图缩放级别
 * @returns 简化容差
 */
export function calculateTolerance(zoom: number): number {
  // 指数衰减：zoom 每增加 2，容差减半
  const baseTolerance = 0.01;  // zoom=0 时的容差
  const halfLife = 2;          // 每 2 级 zoom，容差减半
  
  return baseTolerance * Math.pow(0.5, zoom / halfLife);
}
