/** Nombres de canal IPC. Compartidos para que main y preload no se desincronicen. */
export const IPC = {
  // invoke/handle
  pickFiles: 'media:pickFiles',
  probe: 'media:probe',
  suggestOutputPath: 'media:suggestOutputPath',
  startEncode: 'encode:start',
  cancelEncode: 'encode:cancel',
  ffmpegStatus: 'env:ffmpegStatus',
  appVersion: 'env:appVersion',
  revealInFolder: 'shell:revealInFolder',
  checkForUpdates: 'update:check',
  installUpdate: 'update:install',

  // main -> renderer
  onProgress: 'encode:progress',
  onJobDone: 'encode:done',
  onUpdateState: 'update:state'
} as const
