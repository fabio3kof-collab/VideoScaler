import { join } from 'node:path'
import { app, BrowserWindow, protocol, shell } from 'electron'
import log from 'electron-log'
import { registerIpc, focusMainWindow } from './ipc'
import { cancelAll } from './ffmpeg/encode'
import { clearPreviews } from './ffmpeg/preview'
import { resolveFfmpeg } from './ffmpeg/paths'
import { MEDIA_SCHEME, registerMediaProtocol } from './media'
import { initUpdater } from './updater'

log.initialize()
log.info(`VideoScaler ${app.getVersion()} arrancando`)

/*
 * Los privilegios de un esquema se declaran antes de que la aplicación esté
 * lista; después ya no se pueden conceder. `stream` es el que permite pedir
 * trozos del archivo, y sin trozos no hay barra de tiempo: buscar un minuto
 * dentro de un video de dos gigas descargaría los dos gigas.
 */
protocol.registerSchemesAsPrivileged([
  {
    scheme: MEDIA_SCHEME,
    privileges: { standard: true, secure: true, supportFetchAPI: true, stream: true, corsEnabled: true }
  }
])

/*
 * El icono de la ventana sólo hace falta en desarrollo: la aplicación empacada
 * ya lo toma del ejecutable, que electron-builder marca con `build/icon.png`.
 * En `electron-vite dev` no hay ejecutable propio, y sin esto la barra de
 * tareas muestra el átomo de Electron en lugar del logo.
 */
function devIcon(): string | undefined {
  return app.isPackaged ? undefined : join(import.meta.dirname, '../../build/icon.png')
}

function createWindow(): BrowserWindow {
  const win = new BrowserWindow({
    width: 1180,
    height: 780,
    minWidth: 900,
    minHeight: 620,
    show: false,
    icon: devIcon(),
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
    registerMediaProtocol()
    registerIpc()

    // También al arrancar, y no sólo al salir: `before-quit` no espera a que la
    // promesa termine, y un cierre forzado o un cuelgue dejarían en el temporal
    // una copia entera de un video. Aquí no hay prisa y nadie tiene el archivo
    // abierto, así que este es el borrado que de verdad ocurre.
    void clearPreviews()
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
// se los termina explícitamente. Y borrar las vistas previas, que son copias
// enteras de los originales y no tienen por qué quedarse en el disco.
app.on('before-quit', () => {
  cancelAll()
  void clearPreviews()
})
