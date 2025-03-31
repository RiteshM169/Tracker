const { app, BrowserWindow, ipcMain, dialog, screen } = require('electron');
const path = require('path');
const fs = require('fs');
const Store = require('electron-store');
const { frappeRequest } = require('./frappe-client');
const { captureScreenshot } = require('./screenshot');

// Disable GPU acceleration
app.disableHardwareAcceleration();
// Initialize store
const store = new Store();

let mainWindow;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 900,
        height: 800,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            enableRemoteModule: false,
            preload: path.join(__dirname, 'preload.js')
        }
    });

    mainWindow.loadFile('index.html');

    // Open the DevTools in development
    if (process.env.NODE_ENV === 'development') {
        mainWindow.webContents.openDevTools();
    }

    mainWindow.on('closed', function () {
        mainWindow = null;
    });
}

app.whenReady().then(createWindow);

app.on('window-all-closed', function () {
    if (process.platform !== 'darwin') app.quit();
});

app.on('activate', function () {
    if (mainWindow === null) createWindow();
});

// IPC Handlers
ipcMain.handle('get-projects', async () => {
    const url = store.get('erpnextUrl');
    const apiKey = store.get('apiKey');
    const apiSecret = store.get('apiSecret');
    
    if (!url || !apiKey || !apiSecret) {
        return { error: 'Please configure ERPNext settings first' };
    }

    try {
        const response = await frappeRequest({
            url: `${url}/api/resource/Project`,
            method: 'GET',
            apiKey,
            apiSecret
        });
        return response.data;
    } catch (error) {
        return { error: error.message };
    }
});

ipcMain.handle('get-tasks', async (event, project) => {
    const url = store.get('erpnextUrl');
    const apiKey = store.get('apiKey');
    const apiSecret = store.get('apiSecret');
    
    if (!url || !apiKey || !apiSecret) {
        return { error: 'Please configure ERPNext settings first' };
    }

    try {
        const response = await frappeRequest({
            url: `${url}/api/resource/Task?filters=[["project","=","${project}"]]`,
            method: 'GET',
            apiKey,
            apiSecret
        });
        return response.data;
    } catch (error) {
        return { error: error.message };
    }
});

ipcMain.handle('save-settings', (event, settings) => {
    store.set('erpnextUrl', settings.url);
    store.set('apiKey', settings.apiKey);
    store.set('apiSecret', settings.apiSecret);
    return { success: true };
});

ipcMain.handle('get-settings', () => {
    return {
        url: store.get('erpnextUrl'),
        apiKey: store.get('apiKey'),
        apiSecret: store.get('apiSecret')
    };
});

ipcMain.handle('capture-screenshot', async () => {
    try {
        const screenshotPath = await captureScreenshot();
        return { success: true, path: screenshotPath };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

ipcMain.handle('submit-timesheet', async (event, { project, task, memo, duration, screenshots }) => {
    const url = store.get('erpnextUrl');
    const apiKey = store.get('apiKey');
    const apiSecret = store.get('apiSecret');
    
    if (!url || !apiKey || !apiSecret) {
        return { error: 'Please configure ERPNext settings first' };
    }

    try {
        // First create the timesheet
        const timesheetResponse = await frappeRequest({
            url: `${url}/api/resource/Timesheet`,
            method: 'POST',
            apiKey,
            apiSecret,
            data: {
                doctype: "Timesheet",
                employee: store.get('employee') || "HR-EMP-00001", // You might want to configure this
                time_logs: [{
                    activity_type: "Task",
                    project: project,
                    task: task,
                    from_time: new Date(Date.now() - duration * 1000).toISOString(),
                    to_time: new Date().toISOString(),
                    hours: duration / 3600,
                    description: memo
                }]
            }
        });

        const timesheetName = timesheetResponse.data.name;

        // Upload screenshots as attachments
        for (const screenshot of screenshots) {
            const fileData = fs.readFileSync(screenshot.path);
            const base64Data = fileData.toString('base64');

            await frappeRequest({
                url: `${url}/api/method/upload_file`,
                method: 'POST',
                apiKey,
                apiSecret,
                data: {
                    doctype: "Timesheet",
                    docname: timesheetName,
                    filename: path.basename(screenshot.path),
                    filedata: base64Data,
                    folder: "Home/Attachments",
                    is_private: 1
                }
            });
        }

        return { success: true, timesheet: timesheetName };
    } catch (error) {
        return { success: false, error: error.message };
    }
});