import { createRouter, createWebHistory } from 'vue-router'
import AppLayout from '@/components/AppLayout.vue'

const routes = [
  {
    path: '/',
    component: AppLayout,
    children: [
      {
        path: '',
        name: 'Home',
        component: () => import('@/views/HomePage.vue'),
        meta: { title: '首页' }
      },
      {
        path: 'map',
        name: 'Map',
        component: () => import('@/views/MapView.vue'),
        meta: { title: '地图标注' }
      },
      {
        path: 'agv',
        name: 'AGVDemo',
        component: () => import('@/views/AGVDemo.vue'),
        meta: { title: 'AGV 演示' }
      }
    ]
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior: () => ({ top: 0 })
})

// 路由守卫 - 设置页面标题
router.beforeEach((to, _from, next) => {
  document.title = to.meta.title
    ? `${to.meta.title} - Smart GIS`
    : 'Smart GIS Platform'
  next()
})

export default router
