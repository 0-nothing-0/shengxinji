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
  deletePresets: (ledgerId, presetIds) => ipcRenderer.invoke('delete-presets', ledgerId, presetIds),
  getPresetDetail: (ledgerId,presetId) => ipcRenderer.invoke('get-preset-detail', ledgerId,presetId),
  importPreset: (ledgerId, presetId) => ipcRenderer.invoke('import-preset', ledgerId, presetId),
  savePreset: (ledgerId, presetName, records) => ipcRenderer.invoke('save-preset', ledgerId, presetName, records),
  getPresets: (ledgerId) => ipcRenderer.invoke('get-presets', ledgerId),
  addRecord: (ledgerId, record) => ipcRenderer.invoke('add-record', ledgerId, record),
  getCategories: (ledgerid) => ipcRenderer.invoke('get-categories', ledgerid),
  myalert: (options) => ipcRenderer.invoke('show-dialog', options), // 暴露 myalert 方法
  importData: (importPath,ledgerId) => ipcRenderer.invoke('import-data', importPath,ledgerId),
  getAccounts: (ledgerId, year=null, month=null, category=null, subCategory=null, note=null, 
    amountLeast=null, amountMost=null, timeStart=null, timeEnd=null, type=null,transactionId=null) => 
ipcRenderer.invoke('get-accounts', ledgerId, year, month, category, subCategory, note, 
           amountLeast, amountMost, timeStart, timeEnd, type,transactionId),
  deleteRecords: (ledgerId, recordIds) => ipcRenderer.invoke('delete-records', ledgerId, recordIds),
  updateRecords: (ledgerId, recordIds, recordData) => ipcRenderer.invoke('update-records', ledgerId, recordIds, recordData),
  getMonthsWithRecords: (ledgerId) => ipcRenderer.invoke('get-months-with-records', ledgerId),
  openChartWindow: (accounts) => {
    return ipcRenderer.invoke('open-chart-window', accounts);
  },
  getAppPath: () => {
    return ipcRenderer.invoke('get-app-path').then(appPath => {
      console.log('App path:', appPath);
      return appPath; // 如果需要返回路径给渲染进程，可以在这里返回
    });
  },
});