// renderer.js
console.log('renderer.js is running');
const ledgerModalcloseBtn = document.getElementById('ledgerModalCloseBtn');
const ledgerModal = document.getElementById('ledgerModal');
const ledgerModalconfirmBtn = document.getElementById('ledgerModalconfirmBtn');
const importModalcloseBtn = document.getElementById('importModalCloseBtn');
const improtModal = document.getElementById('importModal');
const importFileInput = document.getElementById('importFileInput');
const importModalconfirmBtn = document.getElementById('importModalconfirmBtn');
const importBtn = document.getElementById('importBtn');
// 分页配置
const ITEMS_PER_PAGE = 15; // 5x3
let currentPage = 1;
let totalLedgers = 0;
// 自定义 myalert 函数
async function myalert(message, type = 'info') {
    console.log('myalert is running');
  await window.electronAPI.myalert({
    type: type,
    title: '提示',
    message: message,
    buttons: ['确定']
  });
}
// 添加路由映射
const routes = {
  '/': showLedgerList,
  '/ledger/:id': showLedgerDetail
};
function showLedgerList() {
  document.getElementById('ledger-list').display = 'block';
}
//
// 添加路由处理函数
function handleRouting() {
  const path = window.location.pathname;
  // 解析路径，此处需要添加实际的路由解析逻辑
  if (path.startsWith('/ledger/')) {
    const ledgerId = path.split('/')[2];
    showLedgerDetail(ledgerId);
  } else {
    showLedgerList();
  }
}

async function showLedgerDetail(ledgerId) {
  document.getElementById('ledger-list').style.display = 'none';
  console.log('hidden');
  document.getElementById('ledger-detail').style.display = 'block';
  history.pushState({}, '', `/ledger/${ledgerId}`);

  // 获取当前年月
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth() + 1; // 月份从0开始，所以需要加1
  console.log('currentYear: '+ currentYear + ', currentMonth: '+ currentMonth);
  // 默认显示当前年月的流水
  const accounts = await window.electronAPI.getAccounts(ledgerId, currentYear, currentMonth);
  console.log('showLedgerDetail accounts: '+ accounts);
  displayAccounts(accounts);

  // 生成月份列表并显示在左侧
  const monthList = generateMonthList(currentYear, currentMonth);
  displayMonthList(monthList);

  // 监听月份列表的点击事件
  document.getElementById('month-list').addEventListener('click', async (event) => {
    if (event.target.tagName === 'LI') {
      const selectedYear = event.target.dataset.year;
      const selectedMonth = event.target.dataset.month;

      // 获取选中月份的流水
      const selectedAccounts = await window.electronAPI.getAccounts(ledgerId, selectedYear, selectedMonth);
      displayAccounts(selectedAccounts);
    }
  });
}

// 生成月份列表
function generateMonthList(currentYear, currentMonth) {
  const monthList = [];
  for (let i = 0; i < 12; i++) {
    const year = currentYear - Math.floor((currentMonth - i - 1) / 12);
    const month = (currentMonth - i - 1 + 12) % 12 + 1;
    monthList.push({ year, month });
  }
  return monthList;
}

// 显示月份列表
function displayMonthList(monthList) {
  const monthListElement = document.getElementById('month-list');
  monthListElement.innerHTML = monthList
    .map(({ year, month }) => `<li data-year="${year}" data-month="${month}">${year}年${month}月</li>`)
    .join('');
  
}

// 显示流水
function displayAccounts(accounts) {
  const accountsElement = document.getElementById('accounts');
  accountsElement.innerHTML = accounts
    .map(entry => {
      const date = new Date(entry.date);
      return `<div>Date: ${date.toLocaleDateString()}, Amount: ${entry.amount}, Note: ${entry.note}</div>`;
    })
    .join('');
}

function showLedgerModal() {
  ledgerModal.style.display = 'block';
  ledgerNameInput.value = '';
  ledgerNameInput.focus();
};

importBtn.onclick = showImportModal;

function showImportModal() {
  improtModal.style.display = 'block';
  importFileInput.value = '';
  importFileInput.focus();  
}

// 新增获取账本ID的函数
function getLedgerIdFromPath() {
  const pathSegments = window.location.pathname.split('/');
  const ledgerIndex = pathSegments.findIndex(segment => segment.toLowerCase() === 'ledger');
  
  if (ledgerIndex !== -1 && pathSegments.length > ledgerIndex + 1) {
    return pathSegments[ledgerIndex + 1];
  }
  return null;
}


ledgerModalconfirmBtn.onclick = async () => {
  const ledgerName = ledgerNameInput.value.trim();

  // 提前检查空值
  if (!ledgerName) {
    await myalert('账本名字不能为空！', 'warning');
    ledgerNameInput.focus();
    return;
  }

  // 发送消息到主进程
  ledger_api.createLedger(ledgerName, async (ledgerRes) => {
    console.log("主进程返回的结果:", ledgerRes);

    if (ledgerRes === "success") {
      await myalert('账本创建成功！', 'info');
      loadLedgers();
      ledgerModal.style.display = 'none';
    } else {
      switch (ledgerRes) {
        case "repeated":
          await myalert('账本名称重复，请重新输入！', 'error');
          break;
        case "empty":
          await myalert('账本名字不能为空！', 'warning');
          break;
        case "illegal":
          await myalert('只能由数字、字母或者汉字组成', 'error');
          break;
        default:
          await myalert('未知错误，请重试！', 'error');
      }
      ledgerNameInput.focus();
      ledgerNameInput.select();
    }
  });
};

importModalconfirmBtn.onclick = async () => {
  const fileInput = document.getElementById('importFileInput');
  const selectedFile = fileInput.files[0];

  if (!selectedFile) {
    await myalert('请选择要导入的文件', 'error');
    return;
  }
  const path = window.location.pathname;
  console.log('path: '+ path);
  const ledgerId = getLedgerIdFromPath();
  console.log('ledgerId: '+ ledgerId);
  if (!ledgerId) {
    await myalert('无法获取当前账本 ID', 'error');
    return;
  }
  try {
    // 通过 preload.js 提交路径给 main.js
    const result = await window.electronAPI.importData(selectedFile.path, ledgerId);

    if (result.success) {
      // 如果成功，将新添加的条目打印在模态上
      const entries = result.entries;
      const entriesContainer = document.getElementById('import-entries-container');
      entriesContainer.innerHTML = ''; // 清空之前的内容

      // 采用懒加载方式显示条目
      entries.forEach(entry => {
        const entryElement = document.createElement('div');
        entryElement.textContent = `类型: ${entry.type}, 金额: ${entry.amount}, 日期: ${entry.date}`;
        entriesContainer.appendChild(entryElement);
      });

      // 显示模态框中的条目容器
      entriesContainer.style.display = 'block';
    } else {
      await myalert(result.message || '导入失败', 'error');
    }
  } catch (error) {
    console.error('导入过程中发生错误:', error);
    await myalert('导入过程中发生错误', 'error');
  }
};


// 关闭模态框
ledgerModalcloseBtn.onclick = () => {
  ledgerModal.style.display = 'none';
  ledgerNameInput.value = '';
};
importModalcloseBtn.onclick = () => {
  improtModal.style.display = 'none';
  importFileInput.value = '';
};

// 获取账本列表并显示
async function loadLedgers(page = 1) {
  console.log('loadLedgers page: '+ page);
  try {
    const allLedgers = await window.ledger_api.getLedgerList();
    totalLedgers = allLedgers.length;
    console.log('loadLedgers totalLedgers: '+ totalLedgers);
    // 分页处理
    const start = (page - 1) * ITEMS_PER_PAGE;
    const end = start + ITEMS_PER_PAGE;
    const ledgers = allLedgers.slice(start, end);

    const grid = document.getElementById('ledger-grid');
    grid.innerHTML = ''; // 清空当前列表

    // 添加账本项
    ledgers.forEach((ledger) => {
      const item = document.createElement('div');
      item.className = 'ledger-item';
      item.textContent = ledger[1]; // 只显示名称
      item.addEventListener('click', async () => showLedgerDetail(ledger[0])); 
      grid.appendChild(item);
      console.log('loadLedgers ledger: '+ ledger)
    });

    // 添加新建按钮
    const addBtn = document.createElement('div');
    addBtn.className = 'ledger-item add-button';
    addBtn.innerHTML = '+';
    addBtn.onclick = showLedgerModal;
    grid.appendChild(addBtn);
    console.log("loadLedgers addBtn")
    // 更新分页
    updatePagination(page);
  } catch (error) {
    console.error('获取账本列表失败:', error);
  }
}

// 更新分页按钮
function updatePagination(currentPage) {
  const totalPages = Math.ceil(totalLedgers / ITEMS_PER_PAGE);
  const pagination = document.getElementById('pagination');
  pagination.innerHTML = '';

  for (let i = 1; i <= totalPages; i++) {
    const btn = document.createElement('button');
    btn.className = `page-btn ${i === currentPage ? 'active' : ''}`;
    btn.textContent = i;
    btn.onclick = () => {
      loadLedgers(i);
    };
    pagination.appendChild(btn);
  }
}

// 页面加载时初始化
window.onload = () => {
  loadLedgers(1);
  document.title = '账本管理系统 v1.0';
};