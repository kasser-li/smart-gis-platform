/**
 * CAD 图纸解析服务
 * 支持 DXF/DWG 文件解析
 */

import { logger } from '../utils/logger';
import * as fs from 'fs';
import * as path from 'path';
import DxfParser from 'dxf-parser';
import type { CADLayer, CADEntity, CADFile } from '../models/cad.model';

// 重新导出，保持向后兼容
export type { CADLayer, CADEntity, CADFile } from '../models/cad.model';

export class CADService {
  private dxfParser = new DxfParser();

  /**
   * 解析 CAD 文件（支持 DXF 和 DWG）
   */
  async parseCAD(filePath: string, filename: string): Promise<CADFile> {
    const ext = path.extname(filename).toLowerCase();
    
    if (ext === '.dwg') {
      throw new Error(
        'DWG 格式需要转换为 DXF 后上传。\n\n' +
        '转换方法：\n' +
        '1. 使用 AutoCAD: 文件 → 另存为 → 选择 DXF 格式\n' +
        '2. 使用在线转换：https://cadsofttools.com/dwg-to-dxf/\n' +
        '3. 使用 ODA File Converter: https://www.opendesign.com/guestfiles/oda_file_converter\n' +
        '4. 使用 LibreDWG: dwg2dxf 命令'
      );
    } else if (ext === '.dxf') {
      return this.parseDXF(filePath, filename);
    } else {
      throw new Error(`不支持的文件格式：${ext}，仅支持 .dxf 和 .dwg`);
    }
  }

  /**
   * 解析 DXF 文件
   */
  async parseDXF(filePath: string, filename: string): Promise<CADFile> {
    try {
      logger.info(`开始解析 DXF 文件：${filename}`);
      
      const content = fs.readFileSync(filePath, 'utf-8');
      
      // 使用专业的 dxf-parser 解析
      const dxfData = this.dxfParser.parseSync(content);
      
      if (!dxfData) {
        throw new Error('DXF 解析结果为空');
      }
      
      logger.info(`DXF 解析成功：${dxfData.entities?.length || 0} 个实体`);
      
      // 转换图层和实体
      const layers = this.convertLayers(dxfData);
      const extents = this.calculateExtentsFromDXF(dxfData);

      const cadFile: CADFile = {
        filename,
        layers,
        metadata: {
          version: typeof dxfData.header?.ACADVER === 'string' ? dxfData.header.ACADVER : 'Unknown',
          units: this.getUnits(typeof dxfData.header?.MEASUREMENT === 'number' ? dxfData.header.MEASUREMENT : 3),
          extents
        },
        uploadTime: new Date()
      };

      logger.info(`DXF 解析完成：${layers.length} 个图层，${layers.reduce((sum, l) => sum + l.entities.length, 0)} 个实体`);
      
      return cadFile;
    } catch (error: any) {
      logger.error('DXF 解析失败:', error);
      throw new Error(`DXF 解析失败：${error.message}`);
    }
  }



  /**
   * 转换图层数据
   */
  private convertLayers(dxfData: any): CADLayer[] {
    const layersMap = new Map<string, CADLayer>();
    
    // 初始化所有图层（从 tables.layers 获取图层定义）
    if (dxfData.tables?.layers) {
      for (const [name, layer] of Object.entries(dxfData.tables.layers)) {
        const layerObj: any = layer as any;
        layersMap.set(name, {
          name,
          style: {
            color: layerObj.color,
            colorIndex: layerObj.colorIndex,
            lineType: layerObj.lineType,
            lineWeight: layerObj.lineweight,
            transparency: layerObj.transparency
          },
          // 兼容字段
          color: layerObj.color || 7,
          visible: layerObj.visible !== false,
          entities: []
        });
      }
    }
    
    // 确保至少有一个默认图层
    if (layersMap.size === 0) {
      layersMap.set('0', {
        name: '0',
        style: {
          color: 7,
          colorIndex: 7
        },
        // 兼容字段
        color: 7,
        visible: true,
        entities: []
      });
    }
    
    // 将实体分配到对应图层
    if (dxfData.entities) {
      dxfData.entities.forEach((entity: any) => {
        const layerName = entity.layer || '0';
        let layer = layersMap.get(layerName);
        
        // 如果图层不存在，创建它
        if (!layer) {
          layer = {
            name: layerName,
            style: {
              color: entity.color,
              colorIndex: entity.colorIndex
            },
            // 兼容字段
            color: entity.color || 7,
            visible: entity.visible !== false,
            entities: []
          };
          layersMap.set(layerName, layer);
        }
        
        // 转换实体格式
        const convertedEntity = this.convertEntity(entity);
        if (convertedEntity) {
          layer.entities.push(convertedEntity);
        }
      });
    }
    
    return Array.from(layersMap.values());
  }

  /**
   * 转换单个实体
   */
  private convertEntity(entity: any): CADEntity | null {
    if (!entity.type) return null;
    
    const converted: CADEntity = {
      type: entity.type,
      layer: entity.layer || '0',
      geometry: {},
      // 提取样式属性
      style: {
        color: entity.color,
        colorIndex: entity.colorIndex,
        lineType: entity.lineType,
        lineTypeScale: entity.lineTypeScale,
        lineWeight: entity.lineweight,
        visible: entity.visible,
        thickness: entity.thickness,
        transparency: entity.transparency
      },
      // 保留原始属性
      properties: entity
    };
    
    // 根据类型提取几何信息
    switch (entity.type) {
      case 'LINE':
        converted.geometry = {
          start: { x: entity.vertices?.[0]?.x || 0, y: entity.vertices?.[0]?.y || 0 },
          end: { x: entity.vertices?.[1]?.x || 0, y: entity.vertices?.[1]?.y || 0 }
        };
        break;
        
      case 'POINT':
        converted.geometry = {
          x: entity.vertices?.[0]?.x || 0,
          y: entity.vertices?.[0]?.y || 0
        };
        break;
        
      case 'LWPOLYLINE':
      case 'POLYLINE':
        converted.geometry = {
          vertices: entity.vertices?.map((v: any) => ({ x: v.x, y: v.y })) || []
        };
        break;
        
      case 'CIRCLE':
        converted.geometry = {
          center: { x: entity.center?.x || 0, y: entity.center?.y || 0 },
          radius: entity.radius || 0
        };
        break;
        
      case 'ARC':
        converted.geometry = {
          center: { x: entity.center?.x || 0, y: entity.center?.y || 0 },
          radius: entity.radius || 0,
          startAngle: entity.startAngle || 0,
          endAngle: entity.endAngle || 0
        };
        break;
        
      case 'TEXT':
        converted.geometry = {
          position: { x: entity.position?.x || 0, y: entity.position?.y || 0 },
          text: entity.text || ''
        };
        break;
        
      default:
        converted.geometry = entity;
    }
    
    return converted;
  }

  /**
   * 从 DXF 数据计算边界
   */
  private calculateExtentsFromDXF(dxfData: any): { minX: number; minY: number; maxX: number; maxY: number } {
    const extents = {
      minX: Infinity,
      minY: Infinity,
      maxX: -Infinity,
      maxY: -Infinity
    };
    
    if (dxfData.entities) {
      dxfData.entities.forEach((entity: any) => {
        this.updateExtents(entity, extents);
      });
    }
    
    // 如果没有实体，返回默认值
    if (extents.minX === Infinity) {
      return { minX: 0, minY: 0, maxX: 0, maxY: 0 };
    }
    
    return extents;
  }

  /**
   * 更新边界
   */
  private updateExtents(entity: any, extents: any) {
    // 处理顶点
    if (entity.vertices) {
      entity.vertices.forEach((v: any) => {
        if (v.x !== undefined) extents.minX = Math.min(extents.minX, v.x);
        if (v.y !== undefined) extents.minY = Math.min(extents.minY, v.y);
        if (v.x !== undefined) extents.maxX = Math.max(extents.maxX, v.x);
        if (v.y !== undefined) extents.maxY = Math.max(extents.maxY, v.y);
      });
    }
    
    // 处理圆心（圆和弧）
    if (entity.center) {
      const r = entity.radius || 0;
      extents.minX = Math.min(extents.minX, entity.center.x - r);
      extents.minY = Math.min(extents.minY, entity.center.y - r);
      extents.maxX = Math.max(extents.maxX, entity.center.x + r);
      extents.maxY = Math.max(extents.maxY, entity.center.y + r);
    }
  }

  /**
   * 上传文件（单文件上传）
   */
  async uploadFile(file: Express.Multer.File): Promise<CADFile> {
    const filePath = file.path
    const filename = file.filename
    
    // 解析 CAD 文件
    const cadFile = await this.parseCAD(filePath, filename)
    
    // 保存解析结果到 JSON 文件
    const jsonPath = path.join(path.dirname(filePath), `${filename}.json`)
    fs.writeFileSync(jsonPath, JSON.stringify(cadFile, null, 2), 'utf-8')
    
    logger.info(`CAD 文件已保存：${filename}`)
    return cadFile
  }

  /**
   * 合并分片
   */
  async mergeChunks(chunkId: string, originalName: string, totalChunks: number): Promise<CADFile> {
    const chunksDir = path.join(__dirname, '../../uploads/cad/chunks', chunkId)
    const finalPath = path.join(__dirname, '../../uploads/cad', `${Date.now()}-${originalName}`)
    
    // 合并分片
    const writeStream = fs.createWriteStream(finalPath)
    for (let i = 0; i < totalChunks; i++) {
      const chunkPath = path.join(chunksDir, `chunk-${i}-*`)
      const files = fs.readdirSync(path.dirname(chunkPath)).filter(f => f.startsWith(`chunk-${i}-`))
      if (files.length > 0) {
        const chunkFile = path.join(path.dirname(chunkPath), files[0])
        const data = fs.readFileSync(chunkFile)
        writeStream.write(data)
      }
    }
    writeStream.end()
    
    // 等待写入完成
    await new Promise<void>((resolve, reject) => {
      writeStream.on('finish', () => resolve())
      writeStream.on('error', reject)
    })
    
    // 解析合并后的文件
    const filename = path.basename(finalPath)
    const cadFile = await this.parseCAD(finalPath, filename)
    
    // 保存解析结果
    const jsonPath = finalPath + '.json'
    fs.writeFileSync(jsonPath, JSON.stringify(cadFile, null, 2), 'utf-8')
    
    // 清理分片
    fs.rmSync(chunksDir, { recursive: true, force: true })
    
    logger.info(`分片合并完成：${originalName}`)
    return cadFile
  }

  /**
   * 获取支持的格式
   */
  getSupportedFormats(): { extensions: string[]; description: string } {
    return {
      extensions: ['.dxf', '.dwg'],
      description: 'DXF (Drawing Exchange Format) 和 DWG (AutoCAD 原生格式)'
    }
  }

  /**
   * 获取 CAD 文件详情
   */
  async getDetails(filename: string): Promise<CADFile | null> {
    const jsonPath = path.join(__dirname, '../../uploads/cad', `${filename}.json`)
    
    if (!fs.existsSync(jsonPath)) {
      return null
    }
    
    const content = fs.readFileSync(jsonPath, 'utf-8')
    return JSON.parse(content) as CADFile
  }

  /**
   * 切换图层可见性
   */
  async toggleLayerVisibility(filename: string, layerName: string, visible: boolean): Promise<boolean> {
    const jsonPath = path.join(__dirname, '../../uploads/cad', `${filename}.json`)
    
    if (!fs.existsSync(jsonPath)) {
      return false
    }
    
    const content = fs.readFileSync(jsonPath, 'utf-8')
    const cadFile: CADFile = JSON.parse(content)
    
    const layer = cadFile.layers.find(l => l.name === layerName)
    if (!layer) {
      return false
    }
    
    layer.visible = visible
    fs.writeFileSync(jsonPath, JSON.stringify(cadFile, null, 2), 'utf-8')
    
    logger.info(`图层 ${layerName} 可见性已更新为 ${visible}`)
    return true
  }

  /**
   * 获取单位
   */
  private getUnits(measurement: number): string {
    const unitsMap: Record<number, string> = {
      0: '英寸',
      1: '英尺',
      2: '英里',
      3: '毫米',
      4: '厘米',
      5: '米',
      6: '千米'
    };
    return unitsMap[measurement] || '毫米';
  }
}

// 导出单例
export const cadService = new CADService();
