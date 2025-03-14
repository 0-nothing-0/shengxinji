// renderer.js
console.log('renderer.js is running');
console.log('path:',window.electronAPI.getAppPath())
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

// 新增筛选按钮和模态框的变量
const filterBtn = document.getElementById('filterBtn');
const filterModal = document.getElementById('filterModal');
const filterModalCloseBtn = document.getElementById('filterModalCloseBtn');
const filterModalconfirmBtn = document.getElementById('filterModalconfirmBtn');

//批量操作相关变量

const batchActionBar = document.createElement('div');
batchActionBar.id = 'batchActionBar';
batchActionBar.innerHTML = `
  <button id="batchDeleteBtn">删除</button>
  <button id="batchEditBtn">修改</button>
`;
batchActionBar.style.display = 'none';
document.querySelector('#ledger-detail').appendChild(batchActionBar);



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
// 清空模态框函数
function clearModalInputs(modal) {
  modal.querySelectorAll('input, select').forEach(element => {
    if(element.type !== 'button') element.value = '';
  });
}
document.getElementById('backToLedgers').addEventListener('click', () => {
  document.getElementById('ledger-detail').style.display = 'none';
  document.getElementById('ledger-list').style.display = 'block';
  history.pushState({}, '', '/');
});


// 显示月份列表
async function displayMonthList(ledgerId) {
  const monthListElement = document.getElementById('month-list');
  
  try {
    // 获取有记录的月份数据 {2023:[7,8], 2022:[12]}
    const { data: yearMonths } = await window.electronAPI.getMonthsWithRecords(ledgerId);
    
    let html = '';
    for (const [year, months] of Object.entries(yearMonths)) {
      html += `
        <div class="year-group">
          <div class="year-header" data-year="${year}">
            <span>${year}年</span>
            <span class="toggle-icon">▼</span>
          </div>
          <div class="month-list" data-year="${year}" >
            ${months.map(month => `
              <div class="month-item" data-year="${year}" data-month="${month}">
                ${month}月
              </div>
            `).join('')}
          </div>
        </div>
      `;
    }
    
    monthListElement.innerHTML = html;
    
    // 添加年份展开/收起事件
    monthListElement.querySelectorAll('.year-header').forEach(header => {
      header.addEventListener('click', function() {
        const year = this.dataset.year;
        const monthList = this.nextElementSibling;
        const isCollapsed = monthList.style.display === 'none';
        
        monthList.style.display = isCollapsed ? 'block' : 'none';
        this.querySelector('.toggle-icon').textContent = isCollapsed ? '▼' : '▶';
      });
    });

    // 添加月份点击事件
    monthListElement.addEventListener('click', (e) => {
      const monthItem = e.target.closest('.month-item');
      if (monthItem) {
        const year = monthItem.dataset.year;
        const month = monthItem.dataset.month;
        getAccountsForMonth(ledgerId, year, month);
      }
    });

  } catch (error) {
    console.error('获取月份数据失败:', error);
  }
}

function showLedgerModal() {
  clearModalInputs(ledgerModal)
  ledgerModal.style.display = 'block';
  ledgerNameInput.value = '';
  ledgerNameInput.focus();
};

importBtn.onclick = showImportModal;
let importedRecords = []; // 存储导入记录的ID
async function showImportModal() {
  clearModalInputs(improtModal);
  improtModal.style.display = 'block';
  importFileInput.value = '';
}

addAccountBtn.onclick = function () {
  showaddAccountModal(false); 
};

async function showaddAccountModal(isEdit = false, recordIds = []) {
  clearModalInputs(addAccountModal);
  addAccountModal.style.display = 'block';
  console.log('showaddAccountModal is running,isEdit: ', isEdit);
  console.log(window.location.pathname);
    // 设置默认日期时间为当前时间
    const now = new Date();
    const formattedDate = now.toISOString().slice(0, 16);
    addAccountDateinput.value = formattedDate;
  
  pre_ledgerid=getLedgerIdFromPath();
   // 获取现有分类
   console.log('pre_ledgerid: ', pre_ledgerid);
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

// 如果是编辑模式
if (isEdit) {
  try {
    document.getElementById('addAccountModalconfirmBtn').innerText = '确认修改';
    document.getElementById('addAccountModalTitle').innerText = '修改记录';
    // 获取选中记录的详细信息
    const result = await window.electronAPI.getAccounts(
      pre_ledgerid,
      null, null, null, null, null, null, null, null, null,null,
      recordIds[0]
    );
    console.log('showaddAccountModal result: ', result);
    // 获取第一个记录的字段作为默认值
    const firstRecord = result.data;
    let fullDate = firstRecord.date;
    if (firstRecord.time && !fullDate.includes('T')) {
      fullDate += 'T' + firstRecord.time;
    }
    // 填充表单字段
    addAccountDateinput.value = fullDate;
    addAccountNoteinput.value = firstRecord.note;
    addAcountMoneyinput.value = firstRecord.amount;
    addAccountTypeinput.value = firstRecord.type;
    addAccountCategoryinput.value = firstRecord.category_name;
    addAccountSubCategoryinput.value = firstRecord.sub_category_name;

    // 修改提交处理逻辑
    if (submitHandler) {
      document.getElementById('addAccountModalconfirmBtn').removeEventListener('click', submitHandler);
    }
    submitHandler = async () => {
      const updatedRecord = {
        date: document.getElementById('addAccountDateInput').value,
        note: document.getElementById('addAccountNoteInput').value,
        amount: parseFloat(document.getElementById('addAccountMoneyInput').value),
        type: document.getElementById('addAccountTypeInput').value,
        category_name: document.getElementById('addAccountCategoryInput').value,
        sub_category_name: document.getElementById('addAccountSubCategoryInput').value || null
      };

      try {
        const result = await window.electronAPI.updateRecords(
          pre_ledgerid,
          recordIds,
          updatedRecord
        );
        if (result.success) {
          await myalert(`成功更新 ${result.updated} 条记录`, 'info');
          addAccountModal.style.display = 'none';
          showLedgerDetail(pre_ledgerid);
        }
      } catch (err) {
        await myalert('更新失败: ' + err.message, 'error');
      }
    };
  } catch (error) {
    await myalert('获取记录详情失败', 'error');
  }
} else {
  document.getElementById('addAccountModalconfirmBtn').innerText = '确认创建';
  document.getElementById('addAccountModalTitle').innerText = '新增记录';
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
}
document.getElementById('addAccountModalconfirmBtn').addEventListener('click', submitHandler);
}

// 新增获取账本ID的函数
function getLedgerIdFromPath() {
  
  const pathSegments = window.location.pathname.split('/');
  console.log('getLedgerIdFromPath is running,pathSegments: ', pathSegments);
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

// ==================== 导入按钮点击事件 ====================
importModalconfirmBtn.onclick = async () => {
  const fileInput = document.getElementById('importFileInput');
  const selectedFile = fileInput.files[0];

  if (!selectedFile) {
    await myalert('请选择要导入的文件', 'error');
    return;
  }

  const ledgerId = getLedgerIdFromPath();
  if (!ledgerId) {
    await myalert('无法获取当前账本 ID', 'error');
    return;
  }

  try {
    const result = await window.electronAPI.importData(selectedFile.path, ledgerId);
    
    if (result.success) {
      // 1. 提示成功并关闭模态框
      await myalert(`成功导入 ${result.entries.length} 条记录`, 'info');
      improtModal.style.display = 'none';
      
      // 2. 直接使用接口返回的条目展示（添加标题）
      displayAccounts(
        result.entries, // 直接使用导入返回的条目
        'accounts',
        true,           // 标记为特殊结果
        '导入结果'      // 展示标题
      );
      
      // 3. 刷新月份列表
      displayMonthList(ledgerId);
    } else {
      await myalert(`导入失败: ${result.message}`, 'error');
    }
  } catch (error) {
    await myalert(`导入失败: ${error.message}`, 'error');
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
  loadPresetsForDelete();
  
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
    el.removeAttribute('style');
  });

  // 切换按钮状态
  modeBtns.forEach(b => b.classList.remove('active'));
  btn.classList.add('active');

  // 修正ID匹配逻辑
  const mode = btn.dataset.mode;
  document.querySelectorAll('.mode-content').forEach(el => {
    const targetMode = 
      mode === 'create' ? 'Edit' : 
      mode === 'delete' ? 'Delete' : 
      'Select';
    el.classList.toggle('active', el.id === `preset${targetMode}Mode`);
  });

  // 清空内容
  if (mode === 'create') {
    document.getElementById('presetNameInput').value = '';
    document.getElementById('recordContainer').innerHTML = '';
  } else if (mode === 'delete') {
    loadPresetsForDelete();
  } else {
    // 清空预设选择模式的内容
    document.getElementById('presetSelector').value = '';
    document.getElementById('presetPreview').innerHTML = '';
    loadPresets();
  }
});

// 新增删除预设相关函数
async function loadPresetsForDelete() {
  try {
    const result = await window.electronAPI.getPresets(getLedgerIdFromPath());
    const container = document.getElementById('presetDeleteList');
    container.innerHTML = '';
    console.log('loadPresetsForDelete result: '+ result);
    if (result.success && result.data?.length > 0) {
      result.data.forEach(preset => {
        const item = document.createElement('div');
        item.className = 'delete-item';
        item.innerHTML = `
          <input type="checkbox" id="preset_${preset.id}" value="${preset.id}">
          <label for="preset_${preset.id}">${preset.name}</label>
        `;
        container.appendChild(item);
      });
    } else {
      container.innerHTML = '<div class="empty-tip">暂无预设可删除</div>';
    }
  } catch (err) {
    myalert('加载预设失败: ' + err.message, 'error');
  }
}
document.getElementById('deletePresetBtn').addEventListener('click', async () => {
  const checkboxes = document.querySelectorAll('#presetDeleteList input[type="checkbox"]:checked');
  const presetIds = Array.from(checkboxes).map(cb => cb.value);
  
  if (presetIds.length === 0) {
    await myalert('请选择要删除的预设', 'warning');
    return;
  }

  try {
    const result = await window.electronAPI.deletePresets(
      getLedgerIdFromPath(),
      presetIds
    );
    
    if (result.success) {
      await myalert(`成功删除 ${presetIds.length} 个预设`, 'info');
      loadPresets(); // 刷新预设列表
      loadPresetsForDelete(); // 刷新删除列表
    } else {
      await myalert(result.message || '删除失败', 'error');
    }
  } catch (err) {
    await myalert('删除过程中发生错误: ' + err.message, 'error');
  }
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
// 在显示预设记录时，动态绑定点击事件
presetSelector.addEventListener('change', async (e) => {
  const presetId = e.target.value;
  console.log('presetSelector change: ' + presetId);
  const result = await window.electronAPI.getPresetDetail(getLedgerIdFromPath(), presetId);
  if (result.success) {
    const previewHTML = result.data.records.map(r => `
      <div class="preset-record">
        <div class="preset-record-header">
          <span class="preset-amount">${Number(r.amount).toFixed(2)}</span>
          <span class="preset-type ${r.type === '支出' ? 'expense' : 'income'}">${r.type}</span>
          <span class="preset-category">${r.category_name || '未分类'}</span>
          <span class="preset-subcategory">${r.sub_category_name || '未分类'}</span>
        </div>
        <div class="preset-note">
          ${r.note || '无备注'}
        </div>
      </div>
    `).join('');
    document.getElementById('presetPreview').innerHTML = previewHTML;

    // 动态绑定点击事件
    document.querySelectorAll('.preset-note').forEach(note => {
      note.addEventListener('click', () => {
        note.classList.toggle('expanded');
      });
    });
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

// 显示筛选模态框
filterBtn.onclick = showFilterModal;

async function showFilterModal() {
  filterModal.style.display = 'block';

  // 清空输入
  document.getElementById('filterStartDate').value = '';
  document.getElementById('filterEndDate').value = '';
  document.getElementById('filterAmountLeast').value = '';
  document.getElementById('filterAmountMost').value = '';
  document.getElementById('filterCategory').value = '';
  document.getElementById('filterSubCategory').value = '';
  document.getElementById('filterNote').value = '';
  //document.getElementById('filterType').value = 'all';

  // 动态加载分类
  const ledgerId = getLedgerIdFromPath();
  const categories = await window.electronAPI.getCategories(ledgerId);

  // 填充一级分类
  const primaryList = document.getElementById('filterPrimaryCategories');
  primaryList.innerHTML = '<option value="未分类">未分类</option>';
  categories.forEach(c => {
    primaryList.innerHTML += `<option value="${c.name}">${c.name}</option>`;
  });

  // 监听一级分类变化
  document.getElementById('filterCategory').addEventListener('input', (event) => {
    const selectedCategory = categories.find(cat => cat.name === event.target.value);
    const subList = document.getElementById('filterSubCategories');
    subList.innerHTML = '<option value="未分类">未分类</option>';

    if (selectedCategory) {
      selectedCategory.sub_categories.forEach(sub => {
        subList.innerHTML += `<option value="${sub.name}">${sub.name}</option>`;
      });
    }
  });
}

// 关闭筛选模态框
filterModalCloseBtn.onclick = () => {
  filterModal.style.display = 'none';
};

filterModalconfirmBtn.onclick = async () => {
  const filterParams = {
    startDate: document.getElementById('filterStartDate').value || null,
    endDate: document.getElementById('filterEndDate').value || null,
    amountMin: parseFloat(document.getElementById('filterAmountLeast').value) || null,
    amountMax: parseFloat(document.getElementById('filterAmountMost').value) || null,
    category: document.getElementById('filterCategory').value || null,
    subCategory: document.getElementById('filterSubCategory').value || null,
    note: document.getElementById('filterNote').value || null,
    type: document.getElementById('filterType').value === 'all' ? null : document.getElementById('filterType').value
  };

  try {
    const result = await window.electronAPI.getAccounts(
      getLedgerIdFromPath(),
      null, // year - 改用日期范围查询
      null, // month - 改用日期范围查询
      filterParams.category,
      filterParams.subCategory,  // 新增二级分类参数
      filterParams.note,
      filterParams.amountMin,
      filterParams.amountMax,
      filterParams.startDate,    // 直接传递日期字符串
      filterParams.endDate,      // 直接传递日期字符串
      filterParams.type
    );

    if (result.success) {
      displayAccounts(result.data, 'accounts', true, '筛选结果'); // 添加第三个参数表示是筛选结果
      filterModal.style.display = 'none';
      //document.getElementById('month-list').style.display = 'none';
    } else {
      await myalert(result.message || '筛选失败', 'error');
    }
  } catch (error) {
    console.error('筛选错误:', error);
    await myalert(`筛选失败: ${error.message || '未知错误'}`, 'error');
  }
};



function displayAccounts(accounts, containerId = 'accounts', isSpecialResult = false, title = '') {
  const accountsElement = document.getElementById(containerId);
  let html = `
    <div class="account-header">
      <div></div> <!-- 占位checkbox列 -->
      <span>时间</span>
      <span>金额</span>
      <span>收支类型</span>
      <span>一级分类</span>
      <span>二级分类</span>
      <span>备注</span>
    </div>
  `;

  // 清空之前的统计
  document.getElementById('totalAmount').textContent = '0.00';

  // 空状态处理
  if (accounts.length === 0) {
    accountsElement.innerHTML = '<div class="empty-tip">暂无记录</div>';
    return;
  }

  // 筛选结果标题
  if (isSpecialResult && title) {
    html += `<div class="special-result-title">${title}（共 ${accounts.length} 条）</div>`;
  }

  // 全选区域
  html += `
    <div class="select-all">
      <input type="checkbox" id="selectAll">
      <label>全选</label>
    </div>
  `;

  // 生成账户条目
  html += accounts.map(entry => `
    <div class="account-item">
      <input 
        type="checkbox" 
        class="record-checkbox" 
        data-id="${entry.id}"
        data-type="${entry.type}" 
        data-amount="${Number(entry.amount).toFixed(2)}"
      >
      <div class="date">${new Date(entry.date).toLocaleDateString()}</div>
      <div class="amount">${Number(entry.amount).toFixed(2)}</div>
      <div class="type ${entry.type === '支出' ? 'expense' : 'income'}">${entry.type}</div>
      <div class="category">${entry.category_name || '未分类'}</div>
      <div class="subcategory">${entry.sub_category_name || '未分类'}</div>
      <div class="note">
        ${entry.note || '无备注'}
      </div>
    </div>
  `).join('');

  accountsElement.innerHTML = html;

  // 动态绑定备注点击事件
  document.querySelectorAll('.note').forEach(note => {
    note.addEventListener('click', () => {
      note.classList.toggle('expanded');
    });
  });

  // 金额计算函数
  const calculateTotal = () => {
    const checkedBoxes = document.querySelectorAll('.record-checkbox:checked');
    const elements = checkedBoxes.length > 0 ? 
      Array.from(checkedBoxes) : 
      document.querySelectorAll('.record-checkbox');

    const total = Array.from(elements).reduce((sum, element) => {
      const type = element.dataset.type;
      const amount = parseFloat(element.dataset.amount);
      return sum + (type === '支出' ? -amount : amount);
    }, 0);

    document.getElementById('totalAmount').textContent = total.toFixed(2);
  };

  // 全选功能
  const selectAll = document.getElementById('selectAll');
  selectAll.addEventListener('change', function(e) {
    const checkboxes = document.querySelectorAll('.record-checkbox');
    checkboxes.forEach(checkbox => checkbox.checked = e.target.checked);
    calculateTotal();
    toggleActionBar();
  });

  // 单个选择功能
  document.querySelectorAll('.record-checkbox').forEach(checkbox => {
    checkbox.addEventListener('change', () => {
      // 同步全选状态
      const allChecked = document.querySelectorAll('.record-checkbox:checked').length;
      selectAll.checked = allChecked === accounts.length;
      
      calculateTotal();
      toggleActionBar();
    });
  });

  // 初始计算总额
  calculateTotal();
}

// 修改 showLedgerDetail 方法以显示月份列表
async function showLedgerDetail(ledgerId) {
  document.getElementById('ledger-list').style.display = 'none';
  console.log('hidden');
  document.getElementById('ledger-detail').style.display = 'block';
  history.pushState({}, '', `/ledger/${ledgerId}`);
  document.getElementById('month-list').style.display = 'block';
  // 获取当前年月
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth() + 1; // 月份从0开始，所以需要加1
  console.log('currentYear: ' + currentYear + ', currentMonth: ' + currentMonth);

  // 默认显示当前年月的流水
  getAccountsForMonth(ledgerId, currentYear, currentMonth);
  
  // 生成月份列表并显示在左侧
  // const monthList = generateMonthList(currentYear, currentMonth);
  // displayMonthList(monthList);
  await displayMonthList(ledgerId); 

  // 监听月份列表的点击事件
  document.getElementById('month-list').addEventListener('click', async (event) => {
    if (event.target.tagName === 'LI') {
      const selectedYear = event.target.dataset.year;
      const selectedMonth = event.target.dataset.month;

      // 获取选中月份的流水
      getAccountsForMonth(ledgerId, selectedYear, selectedMonth);
    }
  });
}

// 修改getAccountsForMonth方法
async function getAccountsForMonth(ledgerId, year, month) {
  try {
    const result = await window.electronAPI.getAccounts(ledgerId, year, month);
    if (result.success) {
      displayAccounts(result.data, 'accounts');
    } else {
      await myalert(result.message || '获取月份记录失败', 'error');
    }
  } catch (error) {
    console.error('获取月份记录时发生错误:', error);
    await myalert('获取月份记录时发生错误', 'error');
  }
}

function toggleActionBar() {
  const checkboxes = document.querySelectorAll('.record-checkbox');
  const checked = document.querySelectorAll('.record-checkbox:checked');
  const batchActions = document.querySelector('.batch-actions');
  const selectAllContainer = document.querySelector('.select-all');
  const selectAllCheckbox = document.getElementById('selectAll');

  // 批量操作栏显示逻辑
  batchActions.style.display = checked.length > 0 ? 'flex' : 'none';

  // 全选容器显示逻辑（当有记录时显示）
  if (selectAllContainer) {
    selectAllContainer.style.display = checkboxes.length > 0 ? 'block' : 'none';
    
    // 同步全选状态
    selectAllCheckbox.checked = checked.length === checkboxes.length && checkboxes.length > 0;
    
    // 全选按钮可见性（无记录时隐藏）
    selectAllContainer.style.visibility = checkboxes.length > 0 ? 'visible' : 'hidden';
  }
}

// 批量删除功能
document.getElementById('batchDeleteBtn').addEventListener('click', async () => {
  const checked = document.querySelectorAll('.record-checkbox:checked');
  const ids = Array.from(checked).map(c => c.dataset.id);

  const confirm = await window.electronAPI.myalert({
    type: 'question',
    title: '确认删除',
    message: `确定要删除选中的 ${ids.length} 条记录吗？`,
    buttons: ['取消', '确定']
  });

  if (confirm.response === 1) {
    try {
      const result = await window.electronAPI.deleteRecords(getLedgerIdFromPath(), ids);
      if (result.success) {
        console.log('delete success');
        const currentLedgerId = getLedgerIdFromPath();
        showLedgerDetail(currentLedgerId);
        myalert('删除成功', 'info');
      }
    } catch (err) {
      myalert('删除失败: ' + err.message, 'error');
    }
  }
});

// 批量修改功能
document.getElementById('batchEditBtn').addEventListener('click', async () => {
  const checked = document.querySelectorAll('.record-checkbox:checked');
  const ids = Array.from(checked).map(c => c.dataset.id);
  
  // 显示修改模态框（复用添加记录的模态）
  showaddAccountModal(true, ids);
});


// 页面加载时初始化
window.onload = () => {
  loadLedgers(1);
  document.title = '账本管理系统 v1.0';
};

// ==================== 图表功能 ====================
document.getElementById('drawBtn').addEventListener('click', async () => {
  const accounts = Array.from(document.querySelectorAll('.account-item'))
    .map(item => ({
      date: item.querySelector('.date').textContent,
      amount: parseFloat(item.querySelector('.amount').textContent),
      type: item.querySelector('.type').textContent,
      category: item.querySelector('.category').textContent,
      subCategory: item.querySelector('.subcategory').textContent
    }));

  await window.electronAPI.openChartWindow(accounts); // 确保已暴露该API
});