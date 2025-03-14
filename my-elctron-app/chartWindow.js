// 初始化图表实例
let charts = {
    dailyLine: null,
    monthlyLine: null,
    categoryPie: null,
    subCategoryPie: null
  };
  
  // 接收主进程数据
  window.safeElectronAPI.onReceiveData((accounts) => {
    console.log('Received data:', accounts);
    try {
      // ------------------------- 数据处理 -------------------------
      const processData = () => {
        // 按日聚合并排序
        const dailyData = accounts.reduce((acc, { date, amount }) => {
          const dateStr = new Date(date).toLocaleDateString();
          acc[dateStr] = (acc[dateStr] || 0) + amount;
          return acc;
        }, {});
  
        // 补齐每日数据
        const sortedDailyKeys = Object.keys(dailyData).sort((a, b) => new Date(a) - new Date(b));
        const startDate = new Date(sortedDailyKeys[0]);
        const endDate = new Date(sortedDailyKeys[sortedDailyKeys.length - 1]);
        const allDays = [];
        for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
          allDays.push(d.toLocaleDateString());
        }
        const completeDailyData = {};
        allDays.forEach(day => {
          completeDailyData[day] = dailyData[day] || 0;
        });
  
        // 按月聚合并排序
        const monthlyData = accounts.reduce((acc, { date, amount }) => {
          const dateObj = new Date(date);
          const key = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}`;
          acc[key] = (acc[key] || 0) + amount;
          return acc;
        }, {});
  
        // 补齐12个月数据
        const sortedMonthlyKeys = Object.keys(monthlyData).sort();
        const startMonth = new Date(sortedMonthlyKeys[0] + '-01');
        const endMonth = new Date(sortedMonthlyKeys[sortedMonthlyKeys.length - 1] + '-01');
        const allMonths = [];
        for (let m = new Date(startMonth); m <= endMonth; m.setMonth(m.getMonth() + 1)) {
          allMonths.push(`${m.getFullYear()}-${String(m.getMonth() + 1).padStart(2, '0')}`);
        }
        // 如果不足12个月，向前或向后补齐
        while (allMonths.length < 12) {
          const firstMonth = new Date(allMonths[0] + '-01');
          firstMonth.setMonth(firstMonth.getMonth() - 1);
          allMonths.unshift(`${firstMonth.getFullYear()}-${String(firstMonth.getMonth() + 1).padStart(2, '0')}`);
        }
        const completeMonthlyData = {};
        allMonths.forEach(month => {
          completeMonthlyData[month] = monthlyData[month] || 0;
        });
  
        // 分类统计（取绝对值）
        const categoryData = accounts.reduce((acc, { category, amount }) => {
          acc[category] = (acc[category] || 0) + Math.abs(amount);
          return acc;
        }, {});
  
        // 子分类统计（对每个子分类都绘制饼图，过滤掉未分类的数据）
        const subCategoryData = {};
        accounts.forEach(({ category, subCategory, amount }) => {
          if (!subCategory || subCategory.trim() === '') return; // 过滤掉未分类的子分类
          if (!subCategoryData[category]) {
            subCategoryData[category] = {};
          }
          subCategoryData[category][subCategory] = (subCategoryData[category][subCategory] || 0) + Math.abs(amount);
        });
  
        return {
          dailyData: completeDailyData,
          monthlyData: completeMonthlyData,
          categoryData,
          subCategoryData
        };
      };
  
      // ------------------------- 图表初始化 -------------------------
      const initCharts = () => {
        const data = processData();
  
        // 销毁旧实例
        Object.values(charts).forEach(chart => chart?.dispose());
  
        // 每日趋势（折线图）
        charts.dailyLine = echarts.init(document.getElementById('dailyLine'));
        charts.dailyLine.setOption({
          title: { text: '每日收支趋势', left: 'center' },
          tooltip: { trigger: 'axis' },
          xAxis: {
            type: 'category',
            data: Object.keys(data.dailyData),
            axisLabel: { rotate: 45 }
          },
          yAxis: { type: 'value' },
          series: [{
            data: Object.values(data.dailyData).map(value => parseFloat(value.toFixed(2))),
            type: 'line',
            smooth: true,
            areaStyle: {}
          }]
        });
  
        // 每月趋势（柱状图）
        charts.monthlyLine = echarts.init(document.getElementById('monthlyLine'));
        charts.monthlyLine.setOption({
          title: { text: '每月收支趋势', left: 'center' },
          tooltip: { trigger: 'axis' },
          xAxis: {
            type: 'category',
            data: Object.keys(data.monthlyData),
            axisLabel: { rotate: 45 }
          },
          yAxis: { type: 'value' },
          series: [{
            data: Object.values(data.monthlyData).map(value => parseFloat(value.toFixed(2))),
            type: 'bar',
            itemStyle: { color: '#5470c6' }
          }]
        });
  
        // 分类占比（饼图）
        charts.categoryPie = echarts.init(document.getElementById('categoryPie'));
        charts.categoryPie.setOption({
          title: { text: '分类占比', left: 'center' },
          tooltip: { trigger: 'item' },
          series: [{
            type: 'pie',
            radius: '60%',
            data: Object.entries(data.categoryData).map(([name, value]) => ({
              name,
              value:parseFloat(value.toFixed(2)),
              itemStyle: {
                color: generateColor(name) // 同一色系的颜色
              }
            }))
          }]
        });
  
                // 子分类占比（饼图）
                const subCategoryPieContainer = document.getElementById('subCategoryPie');
                subCategoryPieContainer.innerHTML = ''; // 清空容器
                Object.entries(data.subCategoryData).forEach(([category, subData]) => {
                  if (category === '未分类') {
                    return; // 跳过未分类的绘制
                  }
                  const chartId = `subCategoryPie-${category}`;
                  const chartDiv = document.createElement('div');
                  chartDiv.id = chartId;
                  chartDiv.style.width = '100%';
                  chartDiv.style.height = '400px';
                  subCategoryPieContainer.appendChild(chartDiv);
                  
                  const chart = echarts.init(chartDiv);
                  chart.setOption({
                    title: { text: `${category}子分类占比`, left: 'center' },
                    tooltip: { trigger: 'item' },
                    series: [{
                      type: 'pie',
                      radius: '60%',
                      data: Object.entries(subData).map(([name, value]) => ({
                        name,
                        value:parseFloat(value.toFixed(2)),
                        itemStyle: {
                          color: generateColor(name) // 同一色系的颜色
                        }
                      }))
                    }]
                  });
                  charts[`subCategoryPie-${category}`] = chart;
                });
              };
        
  
      // ------------------------- 选项卡切换 -------------------------
      const initTabSwitch = () => {
        document.querySelectorAll('.tab-btn').forEach(btn => {
          btn.addEventListener('click', function () {
            // 移除所有active状态
            document.querySelectorAll('.tab-btn, .chart-container').forEach(el => {
              el.classList.remove('active');
            });
  
            // 设置当前active
            this.classList.add('active');
            const targetChart = this.dataset.chart;
            const chartContainer = document.getElementById(targetChart);
            chartContainer.classList.add('active');
  
            // 延迟调整尺寸确保容器可见
            setTimeout(() => {
              if (targetChart === 'subCategoryPie') {
                Object.keys(charts).forEach(key => {
                  if (key.startsWith('subCategoryPie-')) {
                    charts[key]?.resize();
                  }
                });
              } else {
                charts[targetChart]?.resize();
              }
            }, 10);
          });
        });
      };
  
      // ------------------------- 随机颜色生成 -------------------------
      const generateColor = (seed) => {
        const hue = (seed.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % 360);
        const saturation = 70 + Math.random() * 20; // 饱和度
        const lightness = 50 + Math.random() * 10; // 亮度
        return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
      };
  
      // ------------------------- 执行初始化 -------------------------
      initCharts();
      initTabSwitch();
  
      // 窗口resize监听
      window.addEventListener('resize', () => {
        Object.values(charts).forEach(chart => chart?.resize());
      });
  
    } catch (error) {
      window.safeElectronAPI.reportError({
        message: error.message,
        stack: error.stack
      });
    }
  });