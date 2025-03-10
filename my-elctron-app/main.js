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

  win.loadFile('index.html')
}

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
  const pythonProcess = spawn('python', [Path.join(__dirname, './python/create_ledger.py'), ledgerName]);

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
ipcMain.handle('get-accounts', async (event, ledgerId, year, month, category, note, amountRange, timeRange) => {
  return new Promise((resolve, reject) => {
    const args = [
      './python/query.py',
      '--ledgerid', ledgerId.toString()
    ];

    if (year) args.push('-y', year.toString());
    if (month) args.push('-m', month.toString());
    if (category) args.push('--category', category);
    if (note) args.push('--note', note);
    if (amountRange) args.push('--amount', amountRange.map(String).join(','));
    if (timeRange) args.push('--time', ...timeRange);

    const pythonProcess = spawn('python', args);
    //console.log('query args:', args);
    pythonProcess.stdout.on('data', (data) => {
      //console.log("data:", data.toString());
      try {
        const accounts = JSON.parse(data.toString());
        resolve(accounts);
        //console.log('accounts:', accounts);
      } catch (err) {
        console.error('Error parsing JSON:', err);
        reject([]);
      }
    });

    pythonProcess.stderr.on('data', (data) => {
      console.error('Python error:', data.toString());
      reject([]);
    });

    pythonProcess.on('close', (code) => {
      console.log(`Python closed, code: ${code}`);
    });
  });
});

// 获取账本列表
ipcMain.handle('get-ledgers', async () => {
  return new Promise((resolve, reject) => {
    const pythonProcess = spawn('python', [Path.join(__dirname, './python/get_ledger.py'), 'get-ledgers']);
    handlePythonProcess(pythonProcess, resolve, reject);
  });
});

// 导入数据
ipcMain.handle('import-data', async (_, importPath, ledgerId) => {
  return new Promise((resolve, reject) => {
    const pythonProcess = spawn('python', [
      './python/import.py',
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
      Path.join(__dirname, './python/cate_query.py'),
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
      Path.join(__dirname, './python/insert.py'),
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
      Path.join(__dirname, './python/preset.py'),
      '--mode', 'save',
      '--ledgerid', ledgerId.toString(),
      '--name', presetName,
      '--record', JSON.stringify(records)
    ]);
  return new Promise((resolve, reject) => {
    const pythonProcess = spawn('python', [
      Path.join(__dirname, './python/preset.py'),
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
      Path.join(__dirname, './python/preset.py'),
    '--mode','list',
    '--ledgerid',ledgerId.toString()
    ]);

    handlePythonProcess(pythonProcess, resolve, reject);
  });
});

// 获取预设详情
ipcMain.handle('get-preset-detail', async (_, ledgerId, presetId) => {
  return new Promise((resolve, reject) => {
    const pythonProcess = spawn('python', [
      Path.join(__dirname, './python/preset.py'),
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
      Path.join(__dirname, './python/preset.py'),
      '--mode', 'import',
      '--ledgerid', ledgerId.toString(),
      '--id', presetId
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
