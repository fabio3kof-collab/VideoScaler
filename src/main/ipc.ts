import { basename, dirname, extname, join } from 'node:path'
import { app, BrowserWindow, dialog, ipcMain, shell } from 'electron'
import type { CaptureRequest, Container, EncodeRequest, JobResult, MediaProbe } from '@shared/types'
import type { RenderRequest } from '@shared/edit'
import { IPC } from '@shared/ipc'
import { cancelEncode, runEncode } from './ffmpeg/encode'
import { runRender } from './ffmpeg/render'
import { makePreview } from './ffmpeg/preview'
import { probeMedia } from './ffmpeg/probe'
import { resolveFfmpeg } from './ffmpeg/paths'
import { grantMedia } from './media'
import { saveCapture } from './capture'
import { checkForUpdates, getUpdateState, installUpdate } from './updater'

const VIDEO_EXTENSIONS = ['mp4', 'mkv', 'mov', 'avi', 'webm', 'wmv', 'flv', 'm4v', 'mpg', 'mpeg', 'ts']
const AUDIO_EXTENSIONS = ['mp3', 'wav', 'm4a', 'aac', 'flac', 'ogg', 'opus', 'wma']
const IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp', 'avif', 'bmp', 'tiff', 'heic']

export function registerIpc(): void {
  ipcMain.handle(IPC.pickFiles, async (): Promise<string[]> => {
    const result = await dialog.showOpenDialog({
      title: 'Elegir archivos',
      properties: ['openFile', 'multiSelections'],
      // Sin filtro de imagen: la ventana rechaza todo lo que no tenga pista de
      // video, así que ofrecerlo garantizaría un error. Vuelve cuando el
      // alcance de imágenes exista de verdad.
      filters: [
        { name: 'Video', extensions: VIDEO_EXTENSIONS },
        { name: 'Todos los archivos', extensions: ['*'] }
      ]
    })
    return result.canceled ? [] : result.filePaths
  })

  // El montaje sí admite sólo audio: una canción no tiene imagen y aun así
  // tiene todo el sentido del mundo debajo de un video.
  ipcMain.handle(IPC.pickMedia, async (): Promise<string[]> => {
    const result = await dialog.showOpenDialog({
      title: 'Añadir al montaje',
      properties: ['openFile', 'multiSelections'],
      filters: [
        { name: 'Video y audio', extensions: [...VIDEO_EXTENSIONS, ...AUDIO_EXTENSIONS] },
        { name: 'Video', extensions: VIDEO_EXTENSIONS },
        { name: 'Audio', extensions: AUDIO_EXTENSIONS },
        { name: 'Todos los archivos', extensions: ['*'] }
      ]
    })
    return result.canceled ? [] : result.filePaths
  })

  ipcMain.handle(IPC.probe, async (_e, path: string): Promise<MediaProbe> => probeMedia(path))

  ipcMain.handle(
    IPC.suggestOutputPath,
    (_e, inputPath: string, container: Container): string => {
      // Sufijo en vez de sobrescribir: el original es irrecuperable si nos
      // equivocamos, y equivocarse aquí destruye el archivo del usuario.
      const stem = basename(inputPath, extname(inputPath))
      return join(dirname(inputPath), `${stem}-ligero.${container}`)
    }
  )

  ipcMain.handle(
    IPC.suggestProjectPath,
    (_e, seedPath: string, container: Container): string => {
      const stem = basename(seedPath, extname(seedPath))
      return join(dirname(seedPath), `${stem}-montaje.${container}`)
    }
  )

  // El montaje corre por el mismo registro de trabajos que la compresión, así
  // que Detener es el mismo Detener y no hay dos formas de cancelar.
  ipcMain.handle(IPC.startRender, async (event, req: RenderRequest): Promise<JobResult> => {
    const sender = event.sender
    const result = await runRender(
      req.jobId,
      req.project,
      req.options,
      req.outputPath,
      (progress) => {
        if (!sender.isDestroyed()) sender.send(IPC.onProgress, progress)
      }
    )
    if (!sender.isDestroyed()) sender.send(IPC.onJobDone, result)
    return result
  })

  ipcMain.handle(IPC.startEncode, async (event, req: EncodeRequest): Promise<JobResult> => {
    const probe = await probeMedia(req.inputPath)
    const sender = event.sender
    const result = await runEncode(
      req.jobId,
      req.inputPath,
      req.outputPath,
      req.options,
      probe,
      (progress) => {
        if (!sender.isDestroyed()) sender.send(IPC.onProgress, progress)
      }
    )
    if (!sender.isDestroyed()) sender.send(IPC.onJobDone, result)
    return result
  })

  ipcMain.handle(IPC.cancelEncode, (_e, jobId: string): boolean => cancelEncode(jobId))

  // Reproducir un archivo es leerlo, no procesarlo: el renderer recibe una URL
  // que sólo sirve para esta ruta y sigue sin ver el disco.
  ipcMain.handle(IPC.mediaUrl, (_e, path: string): string => grantMedia(path))

  ipcMain.handle(IPC.makePreview, async (_e, path: string): Promise<string> =>
    grantMedia(await makePreview(path))
  )

  ipcMain.handle(IPC.saveCapture, (_e, req: CaptureRequest): Promise<string> => saveCapture(req))

  ipcMain.handle(IPC.ffmpegStatus, () => resolveFfmpeg(true))
  ipcMain.handle(IPC.appVersion, () => app.getVersion())

  ipcMain.handle(IPC.revealInFolder, (_e, path: string) => {
    shell.showItemInFolder(path)
  })

  ipcMain.handle(IPC.checkForUpdates, async () => {
    await checkForUpdates()
    return getUpdateState()
  })

  ipcMain.handle(IPC.installUpdate, () => installUpdate())
}

/** Reenvía a la ventana los archivos soltados sobre ella desde el explorador. */
export function acceptedExtensions(): string[] {
  return [...VIDEO_EXTENSIONS, ...IMAGE_EXTENSIONS]
}

export function focusMainWindow(): void {
  const [win] = BrowserWindow.getAllWindows()
  if (!win) return
  if (win.isMinimized()) win.restore()
  win.focus()
}
