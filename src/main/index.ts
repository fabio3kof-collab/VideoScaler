import { join } from 'node:path'
import { app, BrowserWindow, shell } from 'electron'
import log from 'electron-log'
import { registerIpc, focusMainWindow } from './ipc'
import { cancelAll } from './ffmpeg/encode'
import { resolveFfmpeg } from './ffmpeg/paths'
import { initUpdater } from './updater'

log.initialize()
log.info(`VideoScaler ${app.getVersion()} arrancando`)

function createWindow(): BrowserWindow {
  const win = new BrowserWindow({
    width: 1180,
    height: 780,
    minWidth: 900,
    minHeight: 620,
    show: false,
    // Fondo hoja: evita un destello negro antes de que el renderer monte.
    backgroundColor: '#f7f7f7',
    autoHideMenuBar: true,
    webPreferences: {
      preload: join(import.meta.dirname, '../preload/index.mjs'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  // Evita el destello en blanco mientras el renderer monta.
  win.on('ready-to-show', () => win.show())

  // Los enlaces externos van al navegador, nunca a una ventana de Electron.
  win.webContents.setWindowOpenHandler(({ url }) => {
    void shell.openExternal(url)
    return { action: 'deny' }
  })

  if (process.env.ELECTRON_RENDERER_URL) {
    void win.loadURL(process.env.ELECTRON_RENDERER_URL)
  } else {
    void win.loadFile(join(import.meta.dirname, '../renderer/index.html'))
  }

  return win
}

// Una sola instancia: dos ventanas compitiendo por los mismos archivos de
// salida es una forma silenciosa de corromper un resultado.
if (!app.requestSingleInstanceLock()) {
  app.quit()
} else {
  app.on('second-instance', focusMainWindow)

  void app.whenReady().then(() => {
    app.setAppUserModelId('com.karbec.videoscaler')
    registerIpc()
    initUpdater()
    createWindow()

    // Queda en el log: si un usuario reporta que no puede comprimir, esta
    // línea distingue "falta FFmpeg" de cualquier otro fallo.
    void resolveFfmpeg().then((env) =>
      log.info(
        `[ffmpeg] disponible=${env.available} origen=${env.source ?? 'ninguno'} ruta=${env.ffmpegPath ?? '—'}`
      )
    )

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow()
    })
  })
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

// Matar los procesos de FFmpeg en curso: sobreviven al cierre de la app si no
// se los termina explícitamente.
app.on('before-quit', cancelAll)
