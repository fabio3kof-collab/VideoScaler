import type { VideoScalerApi } from './index'

declare global {
  interface Window {
    videoscaler: VideoScalerApi
  }
}

export {}
