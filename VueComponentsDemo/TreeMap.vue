<template>
  <div class="treemap-wrapper" :style="wrapperStyle">
    <div class="chart-part" ref="chartDom"></div>
  </div>
</template>

<script>
import { ref, reactive, watch, nextTick, onMounted, onBeforeUnmount } from 'vue'
import * as echarts from 'echarts'

export default {
  name: 'TreeMap',
  props: {
    chartData: { // 数据源: [{ fund_name, scale }, ...]
      type: Array,
      default: () => []
    },
    fontSize: { // 字体大小
      type: Number,
      default: 12
    },
    fundNameKey: { // 自定义基金名称字段名
      type: String,
      default: 'fund_name'
    },
    scaleKey: { // 自定义规模字段名
      type: String,
      default: 'scale'
    },
    width: { // 图表容器宽度
      type: [String, Number],
      default: '100%'
    },
    height: { // 图表容器高度
      type: [String, Number],
      default: '100%'
    }
  },
  setup(props) {
    const chartDom = ref()
    let treeMapChart = reactive({})

    const normalizeSize = v => (typeof v === 'number' ? v + 'px' : (v || ''))
    const wrapperStyle = reactive({
      width: normalizeSize(props.width),
      height: normalizeSize(props.height)
    })

    // 透明度控制
    const BASE_RGB = [87, 129, 253]
    const MIN_ALPHA = 0.5
    const MAX_ALPHA = 0.9

    // 平滑处理透明度
    function computeAlpha(scale, min, max) {
      if (max === min) return MAX_ALPHA
      const lin = (scale - min) / (max - min)
      const t = 0.5 - 0.5 * Math.cos(Math.PI * Math.min(1, Math.max(0, lin)))
      return Math.min(MAX_ALPHA, Math.max(MIN_ALPHA, MIN_ALPHA + t * (MAX_ALPHA - MIN_ALPHA)))
    }

    // 处理数据
    function mapData(src) {
      if (!src || !src.length) return []
      const nameKey = props.fundNameKey || 'fund_name'
      const scaleKey = props.scaleKey || 'scale'
      const scales = src.map(d => Number(d?.[scaleKey]) || 0) // 全部规模值
      const min = Math.min(...scales) // 最小值
      const max = Math.max(...scales) // 最大值
      return src.map(d => {
        const scaleVal = Number(d?.[scaleKey]) || 0
        const nameVal = d?.[nameKey] ?? ''
        const a = computeAlpha(scaleVal, min, max) // 平滑透明度
        return {
          name: nameVal,
          value: scaleVal,
          fund_name: nameVal,
          scale: scaleVal,
          raw: d,
          itemStyle: {
            color: `rgba(${BASE_RGB[0]}, ${BASE_RGB[1]}, ${BASE_RGB[2]}, ${a.toFixed(3)})`
          },
          label: {
            show: true,
            fontSize: props.fontSize,
            overflow: 'truncate'
          }
        }
      })
    }

    // 一个 reactive option，每次重绘直接 dispose + init
    const option = reactive({
      tooltip: {
        trigger: 'item',
        formatter: info => {
          const d = info.data || {}
          return `<div style="font-weight:600;font-size:${props.fontSize}px;margin-bottom:4px;">${d.fund_name || ''}</div>规模：${d.scale || ''}`
        }
      },
      series: [
        {
          type: 'treemap',
          roam: false,
          nodeClick: false,
          breadcrumb: { show: false },
          label: {
            show: true,
            formatter: '{b}',
            fontSize: props.fontSize,
            overflow: 'truncate'
          },
          upperLabel: { show: false },
          itemStyle: {
            borderColor: '#fff',
            borderWidth: 2,
            gapWidth: 2
          },
          data: []
        }
      ]
    })

    const chartDraw = () => {
      if (treeMapChart) {
        try { treeMapChart.dispose() } catch (e) { /* ignore dispose errors */ }
      }
      treeMapChart = echarts.init(chartDom.value, null, { renderer: 'svg' })
      option.series[0].data = mapData(props.chartData)
      treeMapChart.clear()
      treeMapChart.setOption(option, true)
    }

    // 监听数据变化重新渲染作画
    watch(() => props.chartData, (val) => {
      nextTick(() => {
        if (val && val.length) {
          chartDraw()
        }
      })
    }, { deep: true, immediate: true })

    // 监听宽高变化并触发 resize
    watch([() => props.width, () => props.height], ([w, h]) => {
      wrapperStyle.width = normalizeSize(w)
      wrapperStyle.height = normalizeSize(h)
      nextTick(() => {
        if (treeMapChart) {
          try { treeMapChart.resize() } catch (e) { /* ignore resize errors */ }
        }
      })
    })

    // 监听 fontSize 变化，重新渲染
    watch(
      () => props.fontSize,
      () => {
        // 更新 option 中所有与字体大小相关的字段
        option.tooltip.formatter = info => {
          const d = info.data || {}
          return `<div style="font-weight:600;font-size:${props.fontSize}px;margin-bottom:4px;">`
            + `${d.fund_name || ''}</div>规模：${d.scale || ''}`
        }
        option.series[0].label.fontSize = props.fontSize
        // mapData 里也会因为 props.fontSize 变化而生效
        chartDraw()
      }
    )

    onBeforeUnmount(() => {
      treeMapChart?.dispose()
    })

    onMounted(() => {
      chartDraw()
    })

    return { chartDom, wrapperStyle }
  }
}
</script>

<style scoped lang="less">
.treemap-wrapper {
  width: 100%;
  height: 100%;

  .chart-part {
    width: 100%;
    height: 100%;
  }
}
</style>