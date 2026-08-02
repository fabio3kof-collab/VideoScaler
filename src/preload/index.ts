import { contextBridge, ipcRenderer, webUtils } from 'electron'
import type {
  CaptureRequest,
  Container,
  EncodeRequest,
  FfmpegStatus,
  JobProgress,
  JobResult,
  MediaProbe,
  UpdateState
} from '@shared/types'
import { IPC } from '@shared/ipc'

/**
 * Única superficie que el renderer ve del sistema. Nada de `nodeIntegration`:
 * el renderer no toca el filesystem ni lanza procesos por su cuenta.
 */
const api = {
  pickFiles: (): Promise<string[]> => ipcRenderer.invoke(IPC.pickFiles),

  /** Ruta real de un File soltado en la ventana (no existe `File.path` en Electron ≥32). */
  pathForFile: (file: File): string => webUtils.getPathForFile(file),

  probe: (path: string): Promise<MediaProbe> => ipcRenderer.invoke(IPC.probe, path),

  suggestOutputPath: (inputPath: string, container: Container): Promise<string> =>
    ipcRenderer.invoke(IPC.suggestOutputPath, inputPath, container),

  startEncode: (req: EncodeRequest): Promise<JobResult> =>
    ipcRenderer.invoke(IPC.startEncode, req),

  cancelEncode: (jobId: string): Promise<boolean> => ipcRenderer.invoke(IPC.cancelEncode, jobId),

  /** URL con la que el reproductor puede leer un archivo local ya elegido. */
  mediaUrl: (path: string): Promise<string> => ipcRenderer.invoke(IPC.mediaUrl, path),

  /** Copia el archivo a un MP4 temporal cuando Chromium no abre el contenedor. */
  makePreview: (path: string): Promise<string> => ipcRenderer.invoke(IPC.makePreview, path),

  saveCapture: (req: CaptureRequest): Promise<string> => ipcRenderer.invoke(IPC.saveCapture, req),

  ffmpegStatus: (): Promise<FfmpegStatus> => ipcRenderer.invoke(IPC.ffmpegStatus),

  appVersion: (): Promise<string> => ipcRenderer.invoke(IPC.appVersion),

  revealInFolder: (path: string): Promise<void> => ipcRenderer.invoke(IPC.revealInFolder, path),

  checkForUpdates: (): Promise<UpdateState> => ipcRenderer.invoke(IPC.checkForUpdates),

  installUpdate: (): Promise<void> => ipcRenderer.invoke(IPC.installUpdate),

  // Suscripciones. Devuelven la función para darse de baja: sin esto, cada
  // remontaje de React acumularía listeners sobre el mismo canal.
  onProgress: (cb: (p: JobProgress) => void): (() => void) => {
    const handler = (_e: unknown, p: JobProgress): void => cb(p)
    ipcRenderer.on(IPC.onProgress, handler)
    return () => ipcRenderer.removeListener(IPC.onProgress, handler)
  },

  onJobDone: (cb: (r: JobResult) => void): (() => void) => {
    const handler = (_e: unknown, r: JobResult): void => cb(r)
    ipcRenderer.on(IPC.onJobDone, handler)
    return () => ipcRenderer.removeListener(IPC.onJobDone, handler)
  },

  onUpdateState: (cb: (s: UpdateState) => void): (() => void) => {
    const handler = (_e: unknown, s: UpdateState): void => cb(s)
    ipcRenderer.on(IPC.onUpdateState, handler)
    return () => ipcRenderer.removeListener(IPC.onUpdateState, handler)
  }
}

export type VideoScalerApi = typeof api

contextBridge.exposeInMainWorld('videoscaler', api)
