//const { app, BrowserWindow } = require('electron/main')
const { app, BrowserWindow, ipcMain ,dialog} = require('electron')
const Path = require('path')
const { spawn } = require('child_process');
//const { console } = require('inspector');
let win;
const createWindow = () => {
   win = new BrowserWindow({
    width: 800,
    height: 600,
    autoHideMenuBar: true,
    webPreferences: {
      devTools: true,
      preload: Path.resolve(__dirname, './preload.js')
      }
  })

  win.loadFile(Path.join(__dirname, '../html/index.html'))
}
function getPythonScriptPath(scriptName) {
  const basePath = app.isPackaged 
    ?  Path.join(__dirname, '../../')// 打包后路径
    : app.getAppPath();     // 开发环境路径

  return Path.join(basePath, 'python', scriptName);
}

let chartWindow = null;
ipcMain.handle('get-app-path', () => {
  return getPythonScriptPath('get_months.py');
});
ipcMain.handle('open-chart-window', async (event, accounts) => {
  try {
    // 如果窗口已存在则聚焦
    if (chartWindow) {
      chartWindow.focus();
      return;
    }
    console.log('opening chart window');
    // 创建新窗口
    chartWindow = new BrowserWindow({
      width: 1200,
      height: 800,
      autoHideMenuBar: true,
      webPreferences: {
        preload: Path.join(__dirname, 'preloadChart.js'),
        contextIsolation: true, // 保持启用
        sandbox: true,
        nodeIntegration: false,
        // 关键：允许预加载脚本访问模块
        enableRemoteModule: false, // 禁用远程模块
        worldSafeExecuteJavaScript: true
      },
    });

    // 加载图表页面
    await chartWindow.loadFile(Path.join(__dirname, '../html/chartWindow.html'));

    // 发送数据到图表窗口
    chartWindow.webContents.send('chart-data', accounts);

    // 窗口关闭时清理引用
    chartWindow.on('closed', () => {
      chartWindow = null;
    });

  } catch (error) {
    console.error('打开图表窗口失败:', error);
    dialog.showErrorBox('窗口错误', '无法创建图表窗口');
  }
});


// 错误处理
ipcMain.on('report-error', (event, errorMessage) => {
  console.error('Error reported from renderer:', errorMessage);
});

app.whenReady().then(() => {
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
console.log('app started')
// 监听渲染进程发出的创建账本请求
ipcMain.on('create-ledger', (event, ledgerName) => {
  console.log('creating ', ledgerName);

  // 调用 Python 脚本
  const pythonProcess = spawn('python', [getPythonScriptPath('create_ledger.py'), ledgerName]);

  pythonProcess.stdout.on('data', (data) => {
    const result = JSON.parse(data.toString());  // 解析 Python 脚本的输出
    if (result.status === 'success') {
      console.log('success, ID:', result.ledger_id);
      event.reply('ledger-created', "success");  // 发送账本 ID 到渲染进程
    } else if (result.status === 'empty') {
      console.error('empty name',);
      event.reply('ledger-created', "empty"); 
    } else if (result.status === 'repeated') {
      console.error('repeated name');
      event.reply('ledger-created', "repeated"); 
    }else if (result.status === 'illegal') {
      console.error('illegal name');
      event.reply('ledger-created', "illegal"); 
    }else {
      console.error('unknown error', result.message);
      event.reply('ledger-created', null); 
    }
  });

  pythonProcess.stderr.on('data', (data) => {
    console.error('Python script error:', data.toString());
    event.reply('ledger-created', null);  // 发送 null 表示创建失败
  });

  pythonProcess.on('close', (code) => {
    console.log(`Python script closed,code:${code}`);
  });
});
ipcMain.handle('show-dialog', async (event, options) => {
  //console.log('showing dialog', options);
  return dialog.showMessageBox(win, options);
});

// 获取流水
ipcMain.handle('get-accounts', async (event, ledgerId, year, month, category, subCategory, note, amountLeast, amountMost, timeStart, timeEnd, type,transactionId) => {
  return new Promise((resolve, reject) => {
    const args = [
      getPythonScriptPath('query.py'),
      '--ledgerid', ledgerId.toString()
    ];
    if (transactionId) {
      args.push('--transactionId', transactionId.toString());
    } else {
      if (timeStart || timeEnd) {
        args.push('--time', 
          timeStart || '1970-01-01',
          timeEnd || '2100-12-31'
        );
      } else {
        if (year) args.push('-y', year.toString());
        if (month) args.push('-m', month.toString());
      }
      if (category) args.push('--category', category);
      if (subCategory) args.push('--subcategory', subCategory);
      if (note) args.push('--note', note);
      if (amountLeast !== null || amountMost !== null) {
        if (amountLeast !== null) args.push('--amountLeast', amountLeast.toString());
        if (amountMost !== null) args.push('--amountMost', amountMost.toString());
    }    
      if (type) args.push('--type', type);
    }
    const pythonProcess = spawn('python', args);
    console.log('query args:', args);

    handlePythonProcess(pythonProcess, (parsedOutput) => {
      resolve({ 
        success: true, 
        data: parsedOutput 
      });
    }, (error) => {
      resolve({ 
        success: false, 
        message: error.message,
        detail: error.detail || error.toString()
      });
    });
  });
});


// 获取账本列表
ipcMain.handle('get-ledgers', async () => {
  return new Promise((resolve, reject) => {
    const pythonProcess = spawn('python', [getPythonScriptPath('get_ledger.py'), 'get-ledgers']);
    handlePythonProcess(pythonProcess, resolve, reject);
  });
});

// 导入数据
ipcMain.handle('import-data', async (_, importPath, ledgerId) => {
  return new Promise((resolve, reject) => 
    {console.log('import args:', [
      getPythonScriptPath('import.py'),
      importPath,
      ledgerId.toString()
    ]);
    const pythonProcess = spawn('python', [
      getPythonScriptPath('import.py'),
      importPath,
      ledgerId.toString()
    ], { encoding: 'gbk' });
    
    handlePythonProcess(pythonProcess, resolve, reject);
  });
});

// 获取分类
ipcMain.handle('get-categories', async (_, ledgerId) => {
  return new Promise((resolve, reject) => {
    const pythonProcess = spawn('python', [
      getPythonScriptPath('cate_query.py'),
      ledgerId.toString()
    ]);
    
    handlePythonProcess(pythonProcess, resolve, reject);
  });
});

// 添加记录
ipcMain.handle('add-record', async (_, ledgerId, record) => {
  return new Promise((resolve, reject) => {
    console.log('adding record', record);
    const pythonProcess = spawn('python', [
      getPythonScriptPath('insert.py'),
      'add-entry',
      ledgerId.toString(),
      JSON.stringify(record)
    ]);
    
    handlePythonProcess(pythonProcess, resolve, reject);
  });
});


// 保存预设
ipcMain.handle('save-preset', async (_, ledgerId, presetName, records) => {
  console.log('saving preset', presetName, records);
  console.log('args:',[
      getPythonScriptPath('preset.py'),
      '--mode', 'save',
      '--ledgerid', ledgerId.toString(),
      '--name', presetName,
      '--record', JSON.stringify(records)
    ]);
  return new Promise((resolve, reject) => {
    const pythonProcess = spawn('python', [
      getPythonScriptPath('preset.py'),
      '--mode', 'save',
      '--ledgerid', ledgerId.toString(),
      '--name', presetName,
      '--record', JSON.stringify(records)
    ]);
    
    handlePythonProcess(pythonProcess, resolve, reject);
  });
});

// 获取预设
ipcMain.handle('get-presets', async (_, ledgerId) => {
  return new Promise((resolve, reject) => {
    const pythonProcess = spawn('python', [
      getPythonScriptPath('preset.py'),
    '--mode','list',
    '--ledgerid',ledgerId.toString()
    ]);
    console.log('get-presets');
    handlePythonProcess(pythonProcess, resolve, reject);
  });
});

// 删除预设
ipcMain.handle('delete-presets', async (_, ledgerId, presetIds) => {
  return new Promise((resolve, reject) => {
    const pythonProcess = spawn('python', [
      getPythonScriptPath('preset.py'),
      '--mode', 'remove',
      '--ledgerid', ledgerId.toString(),
      '--ids', JSON.stringify(presetIds)
    ]);

    handlePythonProcess(pythonProcess, resolve, reject);
  });
});
// 获取预设详情
ipcMain.handle('get-preset-detail', async (_, ledgerId, presetId) => {
  return new Promise((resolve, reject) => {
    const pythonProcess = spawn('python', [
      getPythonScriptPath('preset.py'),
      '--mode', 'detail',
      '--ledgerid', ledgerId.toString(),
      '--id', presetId
    ]);
    handlePythonProcess(pythonProcess, resolve, reject);
  });
});

// 导入预设
ipcMain.handle('import-preset', async (_, ledgerId, presetId) => {
  return new Promise((resolve, reject) => {
    const pythonProcess = spawn('python', [
      getPythonScriptPath('preset.py'),
      '--mode', 'import',
      '--ledgerid', ledgerId.toString(),
      '--id', presetId
    ]);
    handlePythonProcess(pythonProcess, resolve, reject);
  });
});
// 批量删除记录
ipcMain.handle('delete-records', async (_, ledgerId, recordIds) => {
  return new Promise((resolve, reject) => {
    const pythonProcess = spawn('python', [
      getPythonScriptPath('delete_and_update.py'),
      'delete',
      ledgerId.toString(),
      JSON.stringify(recordIds)
    ]);
    console.log('args:',[
      getPythonScriptPath('delete_and_update.py'),
      ledgerId.toString(),
      JSON.stringify(recordIds)
    ]);
    handlePythonProcess(pythonProcess, resolve, reject);
  });
});
//获取月份
ipcMain.handle('get-months-with-records', async (_, ledgerId) => {
  return new Promise((resolve, reject) => {
    const pythonProcess = spawn('python', [
      getPythonScriptPath('get_months.py'),
      ledgerId.toString()
    ]);
    
    handlePythonProcess(pythonProcess, resolve, reject);
  });
});

// 批量更新记录
ipcMain.handle('update-records', async (_, ledgerId, recordIds, recordData) => {
  return new Promise((resolve, reject) => {
    const pythonProcess = spawn('python', [
      getPythonScriptPath('delete_and_update.py'),
      'update',
      ledgerId.toString(),
      JSON.stringify(recordIds),
      JSON.stringify(recordData)
    ]);
    handlePythonProcess(pythonProcess, resolve, reject);
  });
});
// ==================== 通用处理函数 ====================
function handlePythonProcess(process, resolve, reject) {
  let output = '';
  let errorOutput = '';
  
  process.stdout.on('data', (data) => {
    output += data.toString();
    console.log('Python Output:', data.toString());
  });

  process.stderr.on('data', (data) => {
    errorOutput += data.toString();
    console.error('Python Error:', data.toString());
  });

  process.on('close', (code) => {
    if (code !== 0) {
      reject({ 
        success: false, 
        message: `进程异常退出 (code: ${code})`,
        detail: errorOutput 
      });
      return;
    }

    try {
      const result = JSON.parse(output);
      resolve(result);
    } catch (e) {
      reject({
        success: false,
        message: '响应解析失败',
        detail: `原始输出: ${output}`
      });
    }
  });
}
