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
  addRecord: (ledgerId, record) => ipcRenderer.invoke('add-record', ledgerId, record),
  getCategories: (ledgerid) => ipcRenderer.invoke('get-categories', ledgerid),
  myalert: (options) => ipcRenderer.invoke('show-dialog', options), // 暴露 myalert 方法
  importData: (importPath,ledgerId) => ipcRenderer.invoke('import-data', importPath,ledgerId),
  getAccounts: (ledgerId, year=null , month=null, category=null, note=null, amountLeast=null, amountMost=null, timeLatest=null, timeOldest=null) => 
    ipcRenderer.invoke('get-accounts', ledgerId, year, month, category, note, amountLeast, amountMost, timeLatest, timeOldest)
});