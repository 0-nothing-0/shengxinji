// renderer.js
console.log('renderer.js is running');
const addLedgerBtn = document.getElementById('addLedgerBtn');
const closeBtn = document.getElementById('closeBtn');
const confirmBtn = document.getElementById('confirmBtn');
const ledgerModal = document.getElementById('ledgerModal');
const ledgerNameInput = document.getElementById('ledgerNameInput');

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

addLedgerBtn.onclick = () => {
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
async function loadLedgers() {
  try {
    const ledgers = await window.ledger_api.getLedgerList();
    const ledgerList = document.getElementById('ledger-list');
    ledgerList.innerHTML = ''; // 清空当前列表
    console.log('ledgers:', ledgers);
    if (ledgers.length > 0) {
      ledgers.forEach((ledger) => {
        const listItem = document.createElement('li');
        listItem.textContent = `ID: ${ledger[0]}, 名称: ${ledger[1]}`;
        ledgerList.appendChild(listItem);
      });
    } else {
      const listItem = document.createElement('li');
      listItem.textContent = '暂无账本';
      ledgerList.appendChild(listItem);
    }
  } catch (error) {
    console.error('获取账本列表失败:', error);
  }
}
// 页面加载时获取账本列表
window.onload = loadLedgers;