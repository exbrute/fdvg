const { contextBridge } = require('electron');

// Предоставляем безопасные API для рендерера
contextBridge.exposeInMainWorld('electronAPI', {
  platform: process.platform,
  versions: {
    node: process.versions.node,
    chrome: process.versions.chrome,
    electron: process.versions.electron
  },
  // Добавьте здесь свои кастомные API
  ping: () => 'pong from main process'
});