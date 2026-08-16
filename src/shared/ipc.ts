/** Nombres de canal IPC. Compartidos para que main y preload no se desincronicen. */
export const IPC = {
  // invoke/handle
  pickFiles: 'media:pickFiles',
  /** Como `pickFiles`, pero el montaje también admite archivos de sólo audio. */
  pickMedia: 'media:pickMedia',
  probe: 'media:probe',
  suggestOutputPath: 'media:suggestOutputPath',
  suggestProjectPath: 'media:suggestProjectPath',
  startRender: 'edit:render',
  startEncode: 'encode:start',
  cancelEncode: 'encode:cancel',
  mediaUrl: 'media:url',
  makePreview: 'media:preview',
  saveCapture: 'media:saveCapture',
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
