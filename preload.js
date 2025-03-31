const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    getProjects: () => ipcRenderer.invoke('get-projects'),
    getTasks: (project) => ipcRenderer.invoke('get-tasks', project),
    saveSettings: (settings) => ipcRenderer.invoke('save-settings', settings),
    getSettings: () => ipcRenderer.invoke('get-settings'),
    captureScreenshot: () => ipcRenderer.invoke('capture-screenshot'),
    submitTimesheet: (data) => ipcRenderer.invoke('submit-timesheet', data),
    onScreenshotTaken: (callback) => ipcRenderer.on('screenshot-taken', callback)
});