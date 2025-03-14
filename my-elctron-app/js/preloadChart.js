const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('safeElectronAPI', {
  onReceiveData: (callback) => {
    ipcRenderer.on('chart-data', (event, accounts) => callback(accounts));
  },
  reportError: (errorMessage) => {
    console.log('Reporting error:', errorMessage);
    ipcRenderer.send('report-error', errorMessage);
  },
  sendData: (channel, data) => {
    ipcRenderer.send(channel, data);
  }
});