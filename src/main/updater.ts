import { app, BrowserWindow } from 'electron'
import electronUpdater from 'electron-updater'
import log from 'electron-log'
import type { UpdateState } from '@shared/types'
import { IPC } from '@shared/ipc'

const { autoUpdater } = electronUpdater

/**
 * El ciclo de actualización es parte del producto, no un trámite de release:
 * el usuario quiere que la app recoja cada cambio sin reinstalarla a mano.
 * Por eso se descarga sola y sólo se pide confirmación para reiniciar.
 */

let state: UpdateState = { status: 'idle' }

function push(next: UpdateState): void {
  state = next
  for (const win of BrowserWindow.getAllWindows()) {
    win.webContents.send(IPC.onUpdateState, next)
  }
}

export function getUpdateState(): UpdateState {
  return state
}

export function initUpdater(): void {
  autoUpdater.logger = log
  autoUpdater.autoDownload = true
  // Instalar en silencio al cerrar sería sorpresivo a mitad de una codificación.
  autoUpdater.autoInstallOnAppQuit = true

  autoUpdater.on('checking-for-update', () => push({ status: 'checking' }))
  autoUpdater.on('update-available', (info) => push({ status: 'available', version: info.version }))
  autoUpdater.on('update-not-available', () => push({ status: 'none' }))
  autoUpdater.on('download-progress', (p) =>
    push({ status: 'downloading', percent: Math.round(p.percent) })
  )
  autoUpdater.on('update-downloaded', (info) => push({ status: 'ready', version: info.version }))
  autoUpdater.on('error', (err) => {
    log.error('[updater]', err)
    push({ status: 'error', message: err?.message ?? 'Error desconocido al actualizar' })
  })

  if (app.isPackaged) {
    void autoUpdater.checkForUpdates()
    // Revisión periódica para builds de larga sesión.
    setInterval(() => void autoUpdater.checkForUpdates(), 1000 * 60 * 60 * 4)
  } else {
    push({ status: 'idle' })
  }
}

export async function checkForUpdates(): Promise<UpdateState> {
  if (!app.isPackaged) {
    push({ status: 'none' })
    return state
  }
  try {
    await autoUpdater.checkForUpdates()
  } catch (err) {
    push({ status: 'error', message: err instanceof Error ? err.message : String(err) })
  }
  return state
}

export function installUpdate(): void {
  if (state.status !== 'ready') return
  autoUpdater.quitAndInstall()
}
