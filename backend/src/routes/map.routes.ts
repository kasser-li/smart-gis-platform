/**
 * 地图服务路由
 */

import { Router } from 'express';
import { Request, Response } from 'express';

export const router = Router();

/**
 * 获取地图配置
 * GET /api/maps/config
 */
router.get('/config', (req: Request, res: Response) => {
  res.json({
    code: 200,
    message: '获取成功',
    data: {
      defaultCenter: {
        lat: 39.9042,
        lng: 116.4074
      },
      defaultZoom: 12,
      minZoom: 3,
      maxZoom: 18,
      tileLayers: [
        {
          name: 'OpenStreetMap',
          url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
          attribution: '© OpenStreetMap contributors',
          maxZoom: 19
        },
        {
          name: 'Satellite',
          url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
          attribution: '© Esri',
          maxZoom: 19
        }
      ]
    }
  });
});

/**
 * 地理编码（地址转坐标）
 * POST /api/maps/geocode
 */
router.post('/geocode', async (req: Request, res: Response) => {
  try {
    const { address } = req.body;
    
    if (!address) {
      res.status(400).json({
        code: 400,
        message: '缺少地址参数'
      });
      return;
    }

    // 简化实现，实际应调用地理编码服务
    // 如：高德地图 API、Google Maps API 等
    res.json({
      code: 200,
      message: '地理编码成功（模拟）',
      data: {
        address,
        location: {
          lat: 39.9042 + Math.random() * 0.1,
          lng: 116.4074 + Math.random() * 0.1
        },
        accuracy: 'ROOFTOP'
      }
    });
  } catch (error: any) {
    res.status(500).json({
      code: 500,
      message: error.message
    });
  }
});

/**
 * 逆地理编码（坐标转地址）
 * POST /api/maps/reverse-geocode
 */
router.post('/reverse-geocode', async (req: Request, res: Response) => {
  try {
    const { lat, lng } = req.body;
    
    if (lat === undefined || lng === undefined) {
      res.status(400).json({
        code: 400,
        message: '缺少坐标参数'
      });
      return;
    }

    // 简化实现
    res.json({
      code: 200,
      message: '逆地理编码成功（模拟）',
      data: {
        location: { lat, lng },
        address: '北京市朝阳区某某街道',
        components: {
          city: '北京市',
          district: '朝阳区',
          street: '某某街道'
        }
      }
    });
  } catch (error: any) {
    res.status(500).json({
      code: 500,
      message: error.message
    });
  }
});

/**
 * 计算距离
 * POST /api/maps/distance
 */
router.post('/distance', async (req: Request, res: Response) => {
  try {
    const { origin, destination } = req.body;
    
    if (!origin || !destination) {
      res.status(400).json({
        code: 400,
        message: '缺少起点或终点坐标'
      });
      return;
    }

    // Haversine 公式计算距离
    const R = 6371; // 地球半径 (km)
    const dLat = toRad(destination.lat - origin.lat);
    const dLng = toRad(destination.lng - origin.lng);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(origin.lat)) * Math.cos(toRad(destination.lat)) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;

    res.json({
      code: 200,
      message: '计算成功',
      data: {
        origin,
        destination,
        distance: Number(distance.toFixed(2)),
        unit: 'km'
      }
    });
  } catch (error: any) {
    res.status(500).json({
      code: 500,
      message: error.message
    });
  }
});

function toRad(degrees: number): number {
  return degrees * Math.PI / 180;
}
