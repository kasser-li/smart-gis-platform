# 测试规范

> 参考阿里巴巴 Java 开发手册测试规约 + Google Testing Practices

## 必须遵守（放开头）

### 测试分类

| 类型 | 工具 | 覆盖率要求 | 说明 |
|------|------|-----------|------|
| 单元测试 | Vitest | 核心逻辑 > 80% | Service 层必须覆盖 |
| 集成测试 | Supertest | 关键 API 100% | Controller 层接口测试 |
| E2E 测试 | Playwright | 核心流程 100% | 用户操作路径 |

### 测试文件组织
- 测试文件与源码同级，命名：`xxx.test.ts`
- 共享测试工具放在 `src/__tests__/utils/`
- 测试数据/夹具放在 `src/__tests__/fixtures/`

```
src/
├── services/
│   ├── marker.service.ts
│   └── __tests__/
│       └── marker.service.test.ts
├── controllers/
│   ├── marker.controller.ts
│   └── __tests__/
│       └── marker.controller.test.ts
```

## 单元测试规范

### 命名规范
```typescript
describe('ClassName', () => {
  describe('methodName', () => {
    it('should do something when condition', () => {
      // Arrange - 准备数据
      // Act - 执行操作
      // Assert - 验证结果
    })
  })
})
```

### 测试用例编写
- 每个测试只验证一个行为
- 使用 AAA 模式：Arrange（准备）→ Act（执行）→ Assert（断言）
- 测试名称必须描述行为，不使用 `test1`、`should work`
- 边界条件必须覆盖：空值、零值、最大值、最小值

```typescript
// ✅ 推荐
it('should reject marker with latitude out of range', async () => {
  const dto: CreateMarkerDTO = {
    name: 'Test',
    latitude: 91,  // 超出范围
    longitude: 116
  }
  await expect(service.create(dto)).rejects.toThrow('纬度超出范围')
})

// ❌ 禁止
it('test1', () => { ... })
it('should work', () => { ... })
```

### Mock 规范
- 外部依赖（数据库、HTTP 请求）必须 Mock
- Mock 数据使用 fixtures 文件，禁止硬编码
- Mock 后必须验证调用次数和参数

## 集成测试规范

### API 测试
- 每个 API 端点必须测试：成功场景 + 失败场景
- 测试覆盖：参数校验、权限验证、错误处理
- 使用 Supertest 模拟 HTTP 请求

```typescript
describe('POST /api/markers', () => {
  it('should create marker with valid data', async () => {
    const res = await request(app)
      .post('/api/markers')
      .send({ name: 'Test', latitude: 39.9, longitude: 116.4 })
      .expect(200)
    
    expect(res.body.code).toBe(200)
    expect(res.body.data.name).toBe('Test')
  })

  it('should reject invalid latitude', async () => {
    const res = await request(app)
      .post('/api/markers')
      .send({ name: 'Test', latitude: 91, longitude: 116.4 })
      .expect(400)
    
    expect(res.body.message).toContain('纬度')
  })
})
```

## E2E 测试规范

### Playwright 测试
- 核心用户流程必须覆盖
- 测试场景：正常操作 + 异常操作 + 边界条件
- 使用 Page Object Model 模式

```typescript
// pages/map.page.ts
export class MapPage {
  constructor(private page: Page) {}

  async addMarker(name: string, type: string) {
    await this.page.click('[data-testid="marker-tool"]')
    await this.page.fill('[data-testid="marker-name"]', name)
    await this.page.selectOption('[data-testid="marker-type"]', type)
    await this.page.click('[data-testid="marker-submit"]')
  }

  async expectMarkerVisible(name: string) {
    await expect(this.page.getByText(name)).toBeVisible()
  }
}
```

### 测试数据
- 测试前清空测试数据
- 使用独立测试数据库，不影响开发/生产数据
- 测试后清理资源

## 测试执行

### 本地开发
```bash
# 运行所有测试
npm test

# 运行指定文件
npm test -- marker.service.test.ts

# 覆盖率报告
npm test -- --coverage
```

### CI/CD
- 每次提交前自动运行测试
- 测试失败禁止合并
- 覆盖率低于阈值禁止合并（当前阈值：80%）

---

## 重要提醒（放结尾）

- **核心逻辑必须有测试**，无测试的代码禁止合并
- **测试要测行为，不测实现**（重构时测试不应全部失败）
- **Mock 外部依赖**，测试只验证自己的代码
- **测试名称即文档**，看到名字就知道测了什么
- **覆盖率不是目标**，覆盖关键场景才是
