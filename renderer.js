document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const startBtn = document.getElementById('startBtn');
    const stopBtn = document.getElementById('stopBtn');
    const timerDisplay = document.getElementById('timer');
    const statusDisplay = document.getElementById('status');
    const projectSelect = document.getElementById('project');
    const taskSelect = document.getElementById('task');
    const memoInput = document.getElementById('memo');
    const settingsBtn = document.getElementById('settingsBtn');
    const settingsPanel = document.getElementById('settingsPanel');
    const saveSettingsBtn = document.getElementById('saveSettings');
    const erpnextUrlInput = document.getElementById('erpnextUrl');
    const apiKeyInput = document.getElementById('apiKey');
    const apiSecretInput = document.getElementById('apiSecret');
    const screenshotsSection = document.getElementById('screenshotsSection');
    const screenshotGrid = document.getElementById('screenshotGrid');

    // State
    let timerInterval;
    let seconds = 0;
    let isTracking = false;
    let screenshots = [];
    let screenshotInterval;
    let currentTask = null;

    // Load settings
    loadSettings();

    // Event Listeners
    startBtn.addEventListener('click', startTracking);
    stopBtn.addEventListener('click', stopTracking);
    settingsBtn.addEventListener('click', toggleSettings);
    saveSettingsBtn.addEventListener('click', saveSettings);
    projectSelect.addEventListener('change', loadTasks);

    // Initialize
    loadProjects();

    // Functions
    function toggleSettings() {
        settingsPanel.style.display = settingsPanel.style.display === 'block' ? 'none' : 'block';
    }

    async function loadSettings() {
        const settings = await window.electronAPI.getSettings();
        if (settings.url) erpnextUrlInput.value = settings.url;
        if (settings.apiKey) apiKeyInput.value = settings.apiKey;
        if (settings.apiSecret) apiSecretInput.value = settings.apiSecret;
    }

    async function saveSettings() {
        const settings = {
            url: erpnextUrlInput.value,
            apiKey: apiKeyInput.value,
            apiSecret: apiSecretInput.value
        };

        const result = await window.electronAPI.saveSettings(settings);
        if (result.success) {
            alert('Settings saved successfully');
            settingsPanel.style.display = 'none';
        }
    }

    async function loadProjects() {
        const result = await window.electronAPI.getProjects();
        if (result.error) {
            alert(result.error);
            return;
        }

        projectSelect.innerHTML = '<option value="">Select Project</option>';
        result.data.forEach(project => {
            const option = document.createElement('option');
            option.value = project.name;
            option.textContent = project.project_name;
            projectSelect.appendChild(option);
        });
    }

    async function loadTasks() {
        const project = projectSelect.value;
        if (!project) return;

        const result = await window.electronAPI.getTasks(project);
        if (result.error) {
            alert(result.error);
            return;
        }

        taskSelect.innerHTML = '<option value="">Select Task</option>';
        result.data.forEach(task => {
            const option = document.createElement('option');
            option.value = task.name;
            option.textContent = task.subject;
            taskSelect.appendChild(option);
        });
    }

    function startTracking() {
        const project = projectSelect.value;
        const task = taskSelect.value;
        const memo = memoInput.value;

        if (!project || !task || !memo) {
            alert('Please select project, task and enter memo');
            return;
        }

        currentTask = { project, task, memo };
        isTracking = true;
        seconds = 0;
        screenshots = [];
        screenshotGrid.innerHTML = '';
        screenshotsSection.style.display = 'block';

        startBtn.disabled = true;
        stopBtn.disabled = false;
        statusDisplay.textContent = 'Tracking...';
        statusDisplay.className = 'status active';

        // Start timer
        timerInterval = setInterval(updateTimer, 1000);
        updateTimer();

        // Start random screenshot capture (every 5-10 minutes)
        const initialDelay = Math.floor(Math.random() * 5 * 60 * 1000) + (5 * 60 * 1000);
        setTimeout(captureRandomScreenshot, initialDelay);
    }

    function stopTracking() {
        isTracking = false;
        clearInterval(timerInterval);
        clearTimeout(screenshotInterval);

        startBtn.disabled = false;
        stopBtn.disabled = true;
        statusDisplay.textContent = 'Not Tracking';
        statusDisplay.className = 'status inactive';

        // Submit timesheet to ERPNext
        if (currentTask && seconds > 60) { // Only submit if tracked for more than 1 minute
            submitTimesheet();
        }
    }

    function updateTimer() {
        seconds++;
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;
        timerDisplay.textContent = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    }

    async function captureRandomScreenshot() {
        if (!isTracking) return;

        try {
            const result = await window.electronAPI.captureScreenshot();
            if (result.success) {
                screenshots.push({
                    path: result.path,
                    timestamp: new Date()
                });

                // Display screenshot
                const screenshotItem = document.createElement('div');
                screenshotItem.className = 'screenshot-item';
                screenshotItem.innerHTML = `
                    <img src="${result.path}" alt="Screenshot">
                    <div class="screenshot-info">
                        ${new Date().toLocaleTimeString()}
                    </div>
                `;
                screenshotGrid.appendChild(screenshotItem);

                // Schedule next screenshot
                const nextDelay = Math.floor(Math.random() * 5 * 60 * 1000) + (5 * 60 * 1000);
                screenshotInterval = setTimeout(captureRandomScreenshot, nextDelay);
            }
        } catch (error) {
            console.error('Error capturing screenshot:', error);
        }
    }

    async function submitTimesheet() {
        const timesheetData = {
            project: currentTask.project,
            task: currentTask.task,
            memo: currentTask.memo,
            duration: seconds,
            screenshots: screenshots
        };

        const result = await window.electronAPI.submitTimesheet(timesheetData);
        if (result.success) {
            alert(`Timesheet submitted successfully: ${result.timesheet}`);
        } else {
            alert(`Error submitting timesheet: ${result.error}`);
        }
    }
});