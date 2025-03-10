// renderer.js
console.log('renderer.js is running');
// 新建账本相关变量
const ledgerModalcloseBtn = document.getElementById('ledgerModalCloseBtn');
const ledgerModal = document.getElementById('ledgerModal');
const ledgerModalconfirmBtn = document.getElementById('ledgerModalconfirmBtn');

//导入相关变量

const importModalcloseBtn = document.getElementById('importModalCloseBtn');
const improtModal = document.getElementById('importModal');
const importFileInput = document.getElementById('importFileInput');
const importModalconfirmBtn = document.getElementById('importModalconfirmBtn');
const importBtn = document.getElementById('importBtn');

// 新建记录相关变量
const addAccountBtn = document.getElementById('addAccountBtn');
const addAccountModal = document.getElementById('addAccountModal');
const addAccountModalcloseBtn = document.getElementById('addAccountModalCloseBtn');
const addAccountModalconfirmBtn = document.getElementById('addAccountModalconfirmBtn');
const addAccountDateinput = document.getElementById('addAccountDateInput');
const addAccountNoteinput = document.getElementById('addAccountNoteInput');
const addAcountMoneyinput = document.getElementById('addAccountMoneyInput');
const addAccountTypeinput = document.getElementById('addAccountTypeInput');
const addAccountCategoryinput = document.getElementById('addAccountCategoryInput');
const addAccountSubCategoryinput = document.getElementById('addAccountSubCategoryInput');
let submitHandler = null; // 表单提交回调函数

// ========== 预设相关变量 ==========
const presetModal = document.getElementById('presetModal');
const presetModalCloseBtn = document.getElementById('presetModalCloseBtn');
const addfromDefaultBtn = document.getElementById('addfromDefaultBtn');
const presetEditMode = document.getElementById('presetEditMode');
const presetSelectMode = document.getElementById('presetSelectMode');
const addRecordBtn = document.getElementById('addRecordBtn');
const submitPresetBtn = document.getElementById('submitPresetBtn');
const recordContainer = document.getElementById('recordContainer');
const modeSwitcher = document.querySelector('.mode-switcher');
const modeBtns = document.querySelectorAll('.mode-btn');
const presetSelector = document.getElementById('presetSelector');
const importPresetBtn = document.getElementById('importPresetBtn');
const emptyPresetTip = document.getElementById('emptyPresetTip');
let currentRecords = []; // 当前编辑的记录集合
let presetSubmitHandler = null;

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
    const year = currentYear + Math.floor((currentMonth - i - 1) / 12);
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

addAccountBtn.onclick = showaddAccountModal;

async function  showaddAccountModal() {
  addAccountModal.style.display = 'block';
  
    // 设置默认日期时间为当前时间
    const now = new Date();
    const formattedDate = now.toISOString().slice(0, 16);
    addAccountDateinput.value = formattedDate;
  
  pre_ledgerid=getLedgerIdFromPath();
   // 获取现有分类
const categories = await window.electronAPI.getCategories(pre_ledgerid);
// 清空现有选项
  addAccountCategoryinput.innerHTML = '';
  addAccountSubCategoryinput.innerHTML = '';


// 清空现有选项
const primaryCategoriesList = document.getElementById('primaryCategories');
const subCategoriesList = document.getElementById('subCategories');
primaryCategoriesList.innerHTML = '';
subCategoriesList.innerHTML = '';

// 动态填充一级分类
categories.forEach(category => {
  const option = document.createElement('option');
  option.value = category.name;
  primaryCategoriesList.appendChild(option);
});

// 监听一级分类输入框的变化，动态填充二级分类
document.getElementById('addAccountCategoryInput').addEventListener('input', (event) => {
  const selectedCategory = categories.find(cat => cat.name === event.target.value);
  subCategoriesList.innerHTML = '';

  if (selectedCategory) {
    selectedCategory.sub_categories.forEach(subCategory => {
      const option = document.createElement('option');
      option.value = subCategory.name;
      subCategoriesList.appendChild(option);
    });
  }
});

  
if (submitHandler) {
  document.getElementById('addAccountModalconfirmBtn').removeEventListener('click', submitHandler);
}
      submitHandler = async()  => {
      const record = {
        date: document.getElementById('addAccountDateInput').value,
        note: document.getElementById('addAccountNoteInput').value,
        amount: parseFloat(document.getElementById('addAccountMoneyInput').value),
        type: document.getElementById('addAccountTypeInput').value,
        transaction_time : document.getElementById('addAccountDateInput').value.replace('T', ' '),
        category_name: document.getElementById('addAccountCategoryInput').value,
        sub_category_name: document.getElementById('addAccountSubCategoryInput').value || null
      };
  
      // 提交记录
      try {
        const result = await window.electronAPI.addRecord(pre_ledgerid, record);
        if (result.success) {
          await myalert('记录添加成功!', 'info');
          addAccountModal.style.display = 'none';
          // 刷新当前账本视图
          const currentLedgerId = getLedgerIdFromPath();
          showLedgerDetail(currentLedgerId);
        } else {
          await myalert(`添加失败: ${result.message}`, 'error');
        }
      } catch (err) {
        await myalert('添加记录时发生错误', 'error');
      }
};
document.getElementById('addAccountModalconfirmBtn').addEventListener('click', submitHandler);
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

addAccountModalcloseBtn.onclick = () => {
  addAccountModal.style.display = 'none';
  if (submitHandler) {
    document.getElementById('addAccountModalconfirmBtn').removeEventListener('click', submitHandler);
    submitHandler = null;
  }
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

// ========== 预设功能逻辑 ==========

async function showPresetModal() {
  presetModal.style.display = 'block';
  loadPresets();
  
  // 动态加载分类
  const ledgerId = getLedgerIdFromPath();
  const categories = await window.electronAPI.getCategories(ledgerId);
  
  // 创建datalist
  const primaryList = document.getElementById('presetPrimaryCategories') || document.createElement('datalist');
  primaryList.id = 'presetPrimaryCategories';
  primaryList.innerHTML = categories.map(c => `<option value="${c.name}">`).join('');
  
  const subList = document.getElementById('presetSubCategories') || document.createElement('datalist');
  subList.id = 'presetSubCategories';
  document.body.append(primaryList, subList);
}


async function loadPresets() {
  try {
    const result = await window.electronAPI.getPresets(getLedgerIdFromPath());
    presetSelector.innerHTML = '<option value="" disabled selected>请选择预设...</option>';
    emptyPresetTip.style.display = 'none';

    if (result.success && result.data?.length > 0) {
      result.data.forEach(preset => {
        const option = document.createElement('option');
        option.value = preset.id;
        option.textContent = `${preset.name}`;
        presetSelector.appendChild(option);
      });
    } else {
      emptyPresetTip.style.display = 'block';
      presetSelector.disabled = true;
    }
  } catch (err) {
    myalert('加载预设失败: ' + err.message, 'error');
  }
}

function createRecordForm(record = {}) {
  return `
    <div class="record-form">
      <input type="text" class="record-note" placeholder="备注" value="${record.note || ''}">
      <input type="number" class="record-amount" placeholder="金额" value="${record.amount || ''}">
      <select class="record-type">
        <option value="支出" ${record.type === '支出' ? 'selected' : ''}>支出</option>
        <option value="收入" ${record.type === '收入' ? 'selected' : ''}>收入</option>
      </select>
      <input type="text" class="record-category" list="presetPrimaryCategories" placeholder="一级分类" value="${record.category_name || ''}">
      <input type="text" class="record-subcategory" list="presetSubCategories" placeholder="二级分类" value="${record.sub_category_name || ''}">
      <button class="remove-record-btn">×</button>
    </div>
  `;
}

// ========== 事件监听 ==========
addfromDefaultBtn.onclick = showPresetModal;

modeSwitcher.addEventListener('click', (e) => {
  const btn = e.target.closest('.mode-btn');
  if (!btn) return;

  // 移除所有内联样式
  document.querySelectorAll('.mode-content').forEach(el => {
    el.removeAttribute('style'); // 关键修复点
  });
  // 切换按钮状态
  modeBtns.forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  
  // 修正ID匹配逻辑
  const mode = btn.dataset.mode;
  document.querySelectorAll('.mode-content').forEach(el => {
    const targetMode = mode === 'create' ? 'Edit' : 'Select'; // 关键修正点
    el.classList.toggle('active', el.id === `preset${targetMode}Mode`);
  });
});

// 添加新记录
addRecordBtn.onclick = () => {
  recordContainer.insertAdjacentHTML('beforeend', createRecordForm());
};

// 提交预设
submitPresetBtn.onclick = async () => {
  const presetName = document.getElementById('presetNameInput').value.trim();
  const records = Array.from(recordContainer.querySelectorAll('.record-form')).map(form => ({
    note: form.querySelector('.record-note').value,
    amount: parseFloat(form.querySelector('.record-amount').value),
    type: form.querySelector('.record-type').value,
    category_name: form.querySelector('.record-category').value,
    sub_category_name: form.querySelector('.record-subcategory').value || null
  }));

  try {
    // 获取保存结果
    const result = await window.electronAPI.savePreset(
      getLedgerIdFromPath(),
      presetName,
      records
    );

    // 明确判断success字段
    if (result.success) {
      await myalert('预设保存成功', 'info');
      //presetModal.style.display = 'none';
      
      // 清空表单
      document.getElementById('presetNameInput').value = '';
      recordContainer.innerHTML = '';
      
      // 刷新预设列表
      loadPresets();
    } else {
      // 显示服务端返回的错误信息
      const errorMsg = result.message || '未知错误';
      await myalert(`保存失败: ${errorMsg}`, 'error');
    }

  } catch (err) {
    // 处理网络异常等未捕获错误
    const errorMsg = err.message || '请求发送失败';
    await myalert(`系统错误: ${errorMsg}`, 'error');
  }
};
// ========== 预设选择事件 ==========
presetSelector.addEventListener('change', async (e) => {
  const presetId = e.target.value;
  console.log('presetSelector change: ' + presetId);
  const result = await window.electronAPI.getPresetDetail(getLedgerIdFromPath(), presetId);
  if (result.success) {
    const previewHTML = result.data.records.map(r => `
      <div class="preview-item" 
           data-category="${r.category_name}" 
           data-subcategory="${r.sub_category_name || ''}">
        <label for="presetNote_${r.id}">备注:</label>
        <input type="text" id="presetNote_${r.id}" placeholder="${r.note || '输入备注'}" value="${r.note}">

        <label for="presetAmount_${r.id}">金额:</label>
        <input type="number" id="presetAmount_${r.id}" placeholder="${r.amount}" value="${r.amount}">

        <label for="presetType_${r.id}">收支类型:</label>
        <select id="presetType_${r.id}">
          <option value="支出" ${r.type === '支出' ? 'selected' : ''}>支出</option>
          <option value="收入" ${r.type === '收入' ? 'selected' : ''}>收入</option>
        </select>

        <label for="presetCategory_${r.id}">分类:</label>
        <input type="text" id="presetCategory_${r.id}" placeholder="${r.category_name || '无分类'}" value="${r.category_name}" readonly>

        <label for="presetSubCategory_${r.id}">子分类:</label>
        <input type="text" id="presetSubCategory_${r.id}" placeholder="${r.sub_category_name || '无子分类'}" value="${r.sub_category_name || ''}" readonly>
      </div>
    `).join('');
    document.getElementById('presetPreview').innerHTML = previewHTML;
  }
});




// 在预设模态框添加日期选择
const importDateInput = document.createElement('input');
importDateInput.type = 'date';
importDateInput.id = 'presetImportDate';
importPresetBtn.parentNode.insertBefore(importDateInput, importPresetBtn);

// 修改导入事件处理
importPresetBtn.addEventListener('click', async () => {
  const selectedDate = document.getElementById('presetImportDate').value;
  if (!selectedDate) {
    await myalert('请选择导入日期', 'warning');
    return;
  }
// 获取修改后的记录
const modifiedRecords = Array.from(presetPreview.querySelectorAll('.preview-item')).map(item => {
  const noteInput = item.querySelector('input[id^="presetNote_"]');
  const amountInput = item.querySelector('input[id^="presetAmount_"]');
  const typeSelect = item.querySelector('select[id^="presetType_"]');

  return ({
    date: selectedDate, // 使用新日期
    note: noteInput.value,
    amount: parseFloat(amountInput.value),
    type: typeSelect.value,
    transaction_time: selectedDate + ' 00:00',
    category_name: item.dataset.category,
    sub_category_name: item.dataset.subcategory || null
  });
});

  try {
    // 批量提交修改后的记录
    const results = await Promise.all(
      modifiedRecords.map(record => 
        window.electronAPI.addRecord(getLedgerIdFromPath(), record)
      )
    );
    
    const successCount = results.filter(r => r.success).length;
    myalert(`成功导入 ${successCount}/${modifiedRecords.length} 条记录`, 'info');
    const currentLedgerId = getLedgerIdFromPath();
    showLedgerDetail(currentLedgerId);
  } catch (err) {
    myalert('导入失败: ' + err.message, 'error');
  }
});



// 关闭模态
presetModalCloseBtn.onclick = () => {
  presetModal.style.display = 'none';
  presetSelectMode.style.display = 'block';
  presetEditMode.style.display = 'none';
  recordContainer.innerHTML = '';
};



// 页面加载时初始化
window.onload = () => {
  loadLedgers(1);
  document.title = '账本管理系统 v1.0';
};

