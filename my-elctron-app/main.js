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

// 处理获取账本列表的请求
ipcMain.handle('get-ledgers', async () => {
  return new Promise((resolve, reject) => {
    const pythonProcess = spawn('python', [Path.join(__dirname, './python/get_ledger.py'), 'get-ledgers']);

    pythonProcess.stdout.on('data', (data) => {
      const ledgers = JSON.parse(data.toString());
      resolve(ledgers);
      console.log('ledgers:', ledgers);
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
const query_path = require('path');

// 获取月流水
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
    console.log('query args:', args);
    pythonProcess.stdout.on('data', (data) => {
      console.log("data:", data.toString());
      try {
        const accounts = JSON.parse(data.toString());
        resolve(accounts);
        console.log('accounts:', accounts);
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


ipcMain.handle('import-data', async (event, importPath,ledgerId) => {
  return new Promise((resolve, reject) => {
    const importProcess = spawn('python', ['./python/import.py', importPath,ledgerId.toString()],{encoding: 'gbk'});

    let output = '';
    let errorOutput = '';

    importProcess.stdout.on('data', (data) => {
      output += data.toString();
      //console.log(output);
    });

    importProcess.stderr.on('data', (data) => {
      errorOutput += data.toString();
    });

    importProcess.on('close', (code) => {
      if (code === 0) {
        try {
          const result = JSON.parse(output.trim());
          //console.log('import result:', result);
          resolve(result);
        } catch (error) {
          reject({ success: false, message: '解析导入结果失败' });
        }
      } else {
        reject({ success: false, message: errorOutput || '导入失败' });
      }
    });
  });
});

ipcMain.handle('get-categories', async (event, ledgerId) => {
  return new Promise((resolve, reject) => {
    const pythonProcess = spawn('python', [Path.join(__dirname, './python/cate_query.py'), ledgerId.toString()])

    let data = '';
    pythonProcess.stdout.on('data', (chunk) => {
      data += chunk.toString();
    });

    pythonProcess.stderr.on('data', (error) => {
      reject(error.toString());
    });

    pythonProcess.on('close', (code) => {
      if (code !== 0) {
        reject(`Python process exited with code ${code}`);
      } else {
        try {
          const result = JSON.parse(data);
          if (result.error) {
            reject(result.error);
          } else {
            resolve(result);
          }
        } catch (e) {
          reject('Failed to parse JSON');
        }
      }
    });
  });
});

ipcMain.handle('add-record', async (event, ledgerId, record) => {
  console.log('add record:', record);
  return new Promise((resolve, reject) => {
    const pythonProcess = spawn('python', [
      Path.join(__dirname, './python/insert.py'),
      'add-entry',
      ledgerId.toString(),
      JSON.stringify(record) // 将记录对象序列化为字符串
    ]);

    let output = '';
    pythonProcess.stdout.on('data', (data) => {
      output += data.toString();
    });

    pythonProcess.stderr.on('data', (data) => {
      console.error('Python Error:', data.toString());
      reject({ success: false, message: data.toString() });
    });

    pythonProcess.on('close', (code) => {
      if (code === 0) {
        try {
          const result = JSON.parse(output);
          resolve(result);
        } catch (e) {
          resolve({ success: false, message: '解析响应失败' });
        }
      } else {
        resolve({ success: false, message: `进程退出码: ${code}` });
      }
    });
  });
});