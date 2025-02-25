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
  console.log('showing dialog', options);
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
