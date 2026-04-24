/**
 * 地图容器组件 - Leaflet 地图核心
 */

<template>
  <div ref="containerRef" class="map-container-inner" />
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue'
import L from 'leaflet'

const props = defineProps<{
  center?: [number, number]
  zoom?: number
  tool?: 'marker' | 'cad' | 'measure'
}>()

const emit = defineEmits<{
  (e: 'click', latlng: L.LatLng): void
  (e: 'zoom-end', zoom: number): void
  (e: 'move-end', bounds: L.LatLngBounds): void
}>()

const containerRef = ref<HTMLElement | null>(null)
let map: L.Map | null = null

onMounted(() => {
  if (!containerRef.value) return

  map = L.map(containerRef.value, {
    minZoom: 0,
    maxZoom: 19
  }).setView(
    props.center || [39.9042, 116.4074],
    props.zoom || 12
  )

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors',
    maxZoom: 19
  }).addTo(map)

  map.on('click', (e: L.LeafletMouseEvent) => {
    emit('click', e.latlng)
  })

  let zoomTimer: number | null = null
  map.on('zoomend', () => {
    if (zoomTimer) clearTimeout(zoomTimer)
    zoomTimer = window.setTimeout(() => {
      emit('zoom-end', map!.getZoom())
    }, 500)
  })

  let moveTimer: number | null = null
  map.on('moveend', () => {
    if (moveTimer) clearTimeout(moveTimer)
    moveTimer = window.setTimeout(() => {
      emit('move-end', map!.getBounds())
    }, 300)
  })
})

onUnmounted(() => {
  map?.remove()
  map = null
})

// 暴露 map 实例给父组件
defineExpose({
  getMap: () => map,
  setView: (latlng: [number, number], zoom?: number) => {
    map?.setView(latlng, zoom)
  },
  fitBounds: (bounds: L.LatLngBounds) => {
    map?.fitBounds(bounds)
  }
})
</script>

<style scoped>
.map-container-inner {
  width: 100%;
  height: 100%;
}
</style>
