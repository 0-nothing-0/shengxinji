console.log('preload.js is running');
const { contextBridge, ipcRenderer } = require('electron');

// 暴露 API 给渲染进程
contextBridge.exposeInMainWorld('ledger_api', {
  createLedger: (ledger_name, callback) => {
    // 发送消息到主进程
    ipcRenderer.send('create-ledger', ledger_name);

    // 监听主进程的回复
    ipcRenderer.once('ledger-created', (event, ledgerRes) => {
      // 调用回调函数，将结果传递给渲染进程
      callback(ledgerRes);
    });
  },
  getLedgerList: () => ipcRenderer.invoke('get-ledgers')
});
contextBridge.exposeInMainWorld('electronAPI', {
  myalert: (options) => ipcRenderer.invoke('show-dialog', options) // 暴露 myalert 方法
});