const { desktopCapturer, screen } = require('electron');
const fs = require('fs');
const path = require('path');
const moment = require('moment');
const { app } = require('electron');

async function captureScreenshot() {
    const sources = await desktopCapturer.getSources({
        types: ['screen'],
        thumbnailSize: {
            width: screen.getPrimaryDisplay().workAreaSize.width,
            height: screen.getPrimaryDisplay().workAreaSize.height
        }
    });

    if (sources.length === 0) {
        throw new Error('No screens available for capture');
    }

    // Create screenshots directory if it doesn't exist
    const screenshotsDir = path.join(app.getPath('userData'), 'screenshots');
    if (!fs.existsSync(screenshotsDir)) {
        fs.mkdirSync(screenshotsDir);
    }

    // Save screenshot
    const timestamp = moment().format('YYYY-MM-DD_HH-mm-ss');
    const screenshotPath = path.join(screenshotsDir, `screenshot_${timestamp}.png`);
    const image = sources[0].thumbnail.toPNG();
    fs.writeFileSync(screenshotPath, image);

    return screenshotPath;
}

module.exports = { captureScreenshot };