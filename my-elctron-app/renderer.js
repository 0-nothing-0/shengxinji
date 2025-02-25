// renderer.js
console.log('renderer.js is running');
const closeBtn = document.getElementById('closeBtn');
const ledgerModal = document.getElementById('ledgerModal');
const confirmBtn = document.getElementById('confirmBtn');
const ledgerNameInput = document.getElementById('ledgerNameInput');
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

function showLedgerModal() {
  ledgerModal.style.display = 'block';
  ledgerNameInput.value = '';
  ledgerNameInput.focus();
};

confirmBtn.onclick = async () => {
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

// 关闭模态框
closeBtn.onclick = () => {
  ledgerModal.style.display = 'none';
  ledgerNameInput.value = '';
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