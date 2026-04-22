import { createRouter, createWebHistory } from 'vue-router';
import MapView from '../views/MapView.vue';
import AGVDemo from '../views/AGVDemo.vue';

const routes = [
  {
    path: '/',
    name: 'Map',
    component: MapView
  },
  {
    path: '/agv',
    name: 'AGVDemo',
    component: AGVDemo
  }
];

const router = createRouter({
  history: createWebHistory(),
  routes
});

export default router;
