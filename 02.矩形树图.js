// @ts-nocheck
// 原始数据：只有 fundname 和 scale
const rawData = [
  { fundname: '新能源A', scale: 200 },
  { fundname: '消费龙头', scale: 150 },
  { fundname: '医药创新', scale: 100 },
  { fundname: '中证500', scale: 50 },
  { fundname: '港股科技', scale: 65 }
];

// 统一底色（蓝色）：#5781FD -> 对应 RGB
const BASE_RGB = [87, 129, 253];

// 透明度范围，可按需调整：越小越透明
const MIN_ALPHA = 0.5; // 最低透明度（保证可见）
const MAX_ALPHA = 0.9;  // 最高不透明

/**
 * 根据数值在区间 [min, max] 内的位置，线性映射到 [MIN_ALPHA, MAX_ALPHA]
 * @param {number} scale - 当前数据的规模
 * @param {number} min   - 所有数据的最小规模
 * @param {number} max   - 所有数据的最大规模
 * @returns {number} alpha - 介于 MIN_ALPHA 和 MAX_ALPHA 之间的透明度
 */
function computeAlpha(scale, min, max) {
  if (max === min) return MAX_ALPHA;
  // 归一化到 [0,1]
  const lin = (scale - min) / (max - min);
  // 使用平滑 S 型缓动（easeInOutSine）弱化两端差异
  const t = 0.5 - 0.5 * Math.cos(Math.PI * Math.min(1, Math.max(0, lin)));

  return Math.min(
    MAX_ALPHA,
    Math.max(MIN_ALPHA, MIN_ALPHA + t * (MAX_ALPHA - MIN_ALPHA))
  );
}

/**
 * 将原始数据映射为 Treemap 需要的结构，并附加按规模计算的颜色（仅透明度变化）
 * @param {Array<{fundname:string, scale:number}>} src
 * @returns {Array<Object>} treemap series 的 data 数组
 */
function mapData(src) {
  const scales = src.map(d => d.scale);
  const min = Math.min(...scales);
  const max = Math.max(...scales);

  return src.map(d => {
    const a = computeAlpha(d.scale, min, max); // 计算透明度
    return {
      name: d.fundname,     // treemap 显示名称
      value: d.scale,       // treemap 用于面积计算的值
      fundname: d.fundname, // 备用：在 tooltip 中使用
      scale: d.scale,       // 备用：在 tooltip 中使用
      itemStyle: {
        // 使用统一蓝色，透明度随规模变化
        color: `rgba(${BASE_RGB[0]}, ${BASE_RGB[1]}, ${BASE_RGB[2]}, ${a.toFixed(3)})`
      }
    };
  });
}

// 计算出 treemap 数据
const treemapData = mapData(rawData);

// 实例化图表（确保页面存在 id="main" 的容器）
const chart = echarts.init(document.getElementById('main'));

// 图表配置项
const option = {
  tooltip: {
    // 自定义提示框内容：展示基金名与规模
    formatter: (info) => {
      const { data } = info;
      return `
  <div style="font-weight:600;margin-bottom:4px;">${data.fundname}</div>
  规模：${data.scale}
  `;
    }
  },
  series: [{
    type: 'treemap',
    roam: false,           // 关闭拖拽/缩放
    nodeClick: false,      // 只有一层，不需要下钻
    breadcrumb: { show: false }, // 隐藏面包屑
    label: {
      show: true,
      formatter: '{b}',    // b = name
      overflow: 'truncate' // 文本过长省略
    },
    upperLabel: { show: false },
    itemStyle: {
      borderColor: '#fff', // 分块白色边框
      borderWidth: 2,
      gapWidth: 2          // 区块间距
    },
    data: treemapData      // 实际数据
  }]
};

// 渲染图表
chart.setOption(option);

// 窗口尺寸变化时，自适应大小
window.addEventListener('resize', () => chart.resize());

/**
 * 动态更新图表数据的辅助函数
 * 使用方式：window.updateTreemap([{ fundname:'xxx', scale:123 }, ...])
 * 仍然按照相同规则重新计算透明度并更新颜色
 */
window.updateTreemap = function (nextRawData) {
  const nextData = mapData(nextRawData);
  chart.setOption({
    series: [{ data: nextData }]
  });
};