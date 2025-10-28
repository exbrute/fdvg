const { app, BrowserWindow } = require('electron');
const path = require('path');

const isDev = process.env.NODE_ENV === 'development';

function createWindow() {
  console.log('🚀 Creating main window...');
  
  const mainWindow = new BrowserWindow({
    width: 900,
    height: 700,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
    show: true,
    title: 'VPN Desktop Application'
  });

  if (isDev) {
    console.log('🔧 Development mode - loading from Vite');
    mainWindow.loadURL('http://localhost:5173')
      .then(() => {
        console.log('✅ Successfully loaded from Vite');
        mainWindow.webContents.openDevTools();
      })
      .catch(err => {
        console.error('❌ Failed to load from Vite:', err);
        // Fallback - показать простую страницу
        mainWindow.loadURL('data:text/html;charset=UTF-8,' + encodeURIComponent(`
          <!DOCTYPE html>
          <html>
          <head><title>VPN App</title></head>
          <body style="font-family: Arial; padding: 40px; text-align: center;">
            <h1>VPN Desktop App</h1>
            <p>Vite dev server is not running on port 5173</p>
            <p>Please run: <code>npm run dev</code></p>
          </body>
          </html>
        `));
      });
  } else {
    mainWindow.loadFile(path.join(__dirname, 'dist/index.html'));
  }
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});