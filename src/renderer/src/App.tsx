import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { JSX } from 'react'
import type {
  AudioCodec,
  AudioMode,
  Container,
  EncodeOptions,
  EncodePreset,
  FfmpegStatus,
  HardwareAccel,
  JobProgress,
  JobResult,
  MediaProbe,
  RateMode,
  UpdateState,
  VideoCodec
} from '@shared/types'
import { DEFAULT_OPTIONS, QUALITY_RANGE, formatBytes, formatDuration } from './defaults'
import { estimateWeight, scaledPixels } from './estimate'
import { explain, type FriendlyError } from './errors'
import { Crease, Segmented, Switch } from './Crease'
import { Packet } from './Packet'
import {
  IconAlert,
  IconArrow,
  IconCheck,
  IconChevron,
  IconFolder,
  IconPacket,
  IconSheet,
  IconStop
} from './Icons'
import './styles/app.css'

const RATE_MODES = [
  { value: 'targetSize' as const, label: 'Peso objetivo' },
  { value: 'quality' as const, label: 'Calidad' },
  { value: 'bitrate' as const, label: 'Bitrate' }
]

const CODECS = [
  { value: 'h264' as const, label: 'H.264' },
  { value: 'h265' as const, label: 'H.265' },
  { value: 'av1' as const, label: 'AV1' },
  { value: 'vp9' as const, label: 'VP9' }
]

const PRESETS = [
  { value: 'ultrafast' as const, label: 'Inmediato' },
  { value: 'veryfast' as const, label: 'Muy rápido' },
  { value: 'fast' as const, label: 'Rápido' },
  { value: 'medium' as const, label: 'Medio' },
  { value: 'slow' as const, label: 'Lento' },
  { value: 'slower' as const, label: 'Más lento' },
  { value: 'veryslow' as const, label: 'Máximo' }
]

const VIDEO_EXTENSIONS = new Set([
  'mp4', 'mkv', 'mov', 'avi', 'webm', 'wmv', 'flv', 'm4v', 'mpg', 'mpeg', 'ts', 'm2ts', '3gp', 'ogv'
])

export default function App(): JSX.Element {
  const [env, setEnv] = useState<FfmpegStatus | null>(null)
  const [version, setVersion] = useState('')
  const [update, setUpdate] = useState<UpdateState>({ status: 'idle' })
  const [probe, setProbe] = useState<MediaProbe | null>(null)
  const [probing, setProbing] = useState(false)
  const [options, setOptions] = useState<EncodeOptions>(DEFAULT_OPTIONS)
  const [progress, setProgress] = useState<JobProgress | null>(null)
  const [result, setResult] = useState<JobResult | null>(null)
  const [error, setError] = useState<FriendlyError | null>(null)
  const [showDetail, setShowDetail] = useState(false)
  const [dragging, setDragging] = useState(false)
  const [deployed, setDeployed] = useState(false)
  const jobRef = useRef<string | null>(null)
  const dragDepth = useRef(0)

  useEffect(() => {
    void window.videoscaler.ffmpegStatus().then(setEnv)
    void window.videoscaler.appVersion().then(setVersion)
    const offProgress = window.videoscaler.onProgress(setProgress)
    const offUpdate = window.videoscaler.onUpdateState(setUpdate)
    return () => {
      offProgress()
      offUpdate()
    }
  }, [])

  const loadFile = useCallback(async (path: string) => {
    setError(null)
    setResult(null)
    setProgress(null)
    setShowDetail(false)

    const ext = path.split('.').pop()?.toLowerCase() ?? ''
    if (!VIDEO_EXTENSIONS.has(ext)) {
      setError({
        message: `«.${ext}» no es un formato de video que VideoScaler pueda abrir. Elige un archivo .mp4, .mkv, .mov o .avi.`,
        detail: `Extensión rechazada antes de sondear: ${path}`
      })
      return
    }

    setProbing(true)
    try {
      const next = await window.videoscaler.probe(path)
      if (!next.video) {
        setProbe(null)
        setError({
          message: `${next.filename} no tiene pista de video, así que no hay nada que comprimir aquí. Elige un archivo de video.`,
          detail: `ffprobe no encontró ningún stream con codec_type=video en ${path}`
        })
        return
      }
      setProbe(next)
      // Arrancar por debajo del original hace de la restricción una entrada
      // real en vez de un número inventado.
      const suggestedMB = Math.max(1, Math.round((next.sizeBytes / (1024 * 1024)) * 0.35))
      setOptions((o) => ({
        ...o,
        trim: null,
        video: { ...o.video, targetSizeMB: suggestedMB }
      }))
    } catch (err) {
      setProbe(null)
      setError(explain(err instanceof Error ? err.message : String(err), path.split(/[\\/]/).pop()))
    } finally {
      setProbing(false)
    }
  }, [])

  const onPick = useCallback(async () => {
    const [first] = await window.videoscaler.pickFiles()
    if (first) await loadFile(first)
  }, [loadFile])

  const onDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault()
      dragDepth.current = 0
      setDragging(false)
      const file = e.dataTransfer.files[0]
      if (file) await loadFile(window.videoscaler.pathForFile(file))
    },
    [loadFile]
  )

  const running = progress !== null && result === null

  const onEncode = useCallback(async () => {
    if (!probe) return
    setError(null)
    setResult(null)
    const jobId = `job-${Date.now()}`
    jobRef.current = jobId
    const outputPath = await window.videoscaler.suggestOutputPath(probe.path, options.container)
    setProgress({ jobId, percent: 0, speed: null, fps: null, etaSec: null, outSizeBytes: null })
    const res = await window.videoscaler.startEncode({
      jobId,
      inputPath: probe.path,
      outputPath,
      options
    })
    setResult(res)
    if (res.error) setError(explain(res.error, probe.filename))
  }, [probe, options])

  const onCancel = useCallback(() => {
    if (jobRef.current) void window.videoscaler.cancelEncode(jobRef.current)
  }, [])

  const setVideo = useCallback(
    (patch: Partial<EncodeOptions['video']>): void =>
      setOptions((o) => ({ ...o, video: { ...o.video, ...patch } })),
    []
  )
  const setAudio = useCallback(
    (patch: Partial<EncodeOptions['audio']>): void =>
      setOptions((o) => ({ ...o, audio: { ...o.audio, ...patch } })),
    []
  )

  const estimate = useMemo(() => (probe ? estimateWeight(options, probe) : null), [options, probe])
  const range = QUALITY_RANGE[options.video.codec]
  const sourceHeight = probe?.video?.height ?? 0

  const scaleValue = useMemo(() => {
    const s = options.video.scale
    if (s.kind === 'height') return `h${s.height}`
    if (s.kind === 'percent') return `p${s.percent}`
    return 'original'
  }, [options.video.scale])

  const outDims = useMemo(() => {
    if (!probe?.video) return null
    const [w, h] = scaledPixels(options.video.scale, probe.video.width, probe.video.height)
    return `${w}×${h}`
  }, [options.video.scale, probe])

  const trimmedDuration = useMemo(() => {
    if (!probe) return 0
    if (!options.trim) return probe.durationSec
    return Math.max(0, (options.trim.endSec ?? probe.durationSec) - options.trim.startSec)
  }, [options.trim, probe])

  const legend = (
    <p className="legend">
      <span>
        <i className="crease-mark crease-mark-mountain" />
        quita peso
      </span>
      <span>
        <i className="crease-mark crease-mark-valley" />
        preserva calidad
      </span>
    </p>
  )

  return (
    <div
      className={`app${dragging ? ' is-dragging' : ''}`}
      onDragEnter={(e) => {
        e.preventDefault()
        dragDepth.current += 1
        setDragging(true)
      }}
      onDragLeave={() => {
        dragDepth.current -= 1
        if (dragDepth.current <= 0) setDragging(false)
      }}
      onDragOver={(e) => e.preventDefault()}
      onDrop={onDrop}
    >
      <header className="bar">
        <span className="wordmark">
          <IconPacket aria-hidden="true" />
          VideoScaler
        </span>
        <span className="bar-spacer" />
        {probe && (
          <button type="button" className="act act-quiet" onClick={() => void onPick()}>
            <IconFolder aria-hidden="true" />
            Otro archivo
          </button>
        )}
        <span className="bar-note">{version ? `v${version}` : ''}</span>
      </header>

      <div className="scroll">
        {!probe ? (
          <Packet onPick={() => void onPick()} dragging={dragging} probing={probing} error={error} />
        ) : (
          <div className="stack">
            {env && !env.available && (
              <p className="notice" role="alert">
                <IconAlert aria-hidden="true" />
                <span>
                  No se encontró FFmpeg, así que no se puede comprimir. Reinstala VideoScaler o
                  instala FFmpeg y vuelve a abrir la aplicación.
                </span>
              </p>
            )}

            {update.status === 'ready' && (
              <p className="notice notice-quiet">
                <IconCheck aria-hidden="true" />
                <span>
                  La versión {update.version} está lista.{' '}
                  <button
                    type="button"
                    className="link"
                    onClick={() => void window.videoscaler.installUpdate()}
                  >
                    Reiniciar para actualizar
                  </button>
                </span>
              </p>
            )}

            {update.status === 'downloading' && (
              <p className="notice notice-quiet">
                <IconArrow aria-hidden="true" />
                <span>Descargando la actualización… {update.percent}%</span>
              </p>
            )}

            {update.status === 'error' && (
              <p className="notice" role="alert">
                <IconAlert aria-hidden="true" />
                <span>
                  No se pudo buscar actualizaciones. Seguirás usando la versión {version} sin
                  problema; se reintentará solo. ({update.message})
                </span>
              </p>
            )}

            {error && (
              <p className="notice" role="alert">
                <IconAlert aria-hidden="true" />
                <span>
                  {error.message}{' '}
                  <button type="button" className="link" onClick={() => setShowDetail((s) => !s)}>
                    {showDetail ? 'Ocultar detalle técnico' : 'Ver detalle técnico'}
                  </button>
                  {showDetail && <code className="detail">{error.detail}</code>}
                </span>
              </p>
            )}

            {estimate && !estimate.reachable && (
              <p className="notice" role="alert">
                <IconAlert aria-hidden="true" />
                <span>
                  El objetivo de {options.video.targetSizeMB} MB no se alcanza: sólo el audio ocupa{' '}
                  {formatBytes(estimate.audioOnlyBytes)} en {formatDuration(trimmedDuration)}. Baja
                  el bitrate de audio, pásalo a mono o silencia la pista — o recorta el video.
                </span>
              </p>
            )}

            <section className="identity">
              <strong className="identity-name">{probe.filename}</strong>
              <div className="specs">
                <div>
                  <span className="spec-k">Peso</span>
                  <span className="spec-v">{formatBytes(probe.sizeBytes)}</span>
                </div>
                <div>
                  <span className="spec-k">Duración</span>
                  <span className="spec-v">{formatDuration(probe.durationSec)}</span>
                </div>
                <div>
                  <span className="spec-k">Resolución</span>
                  <span className="spec-v">
                    {probe.video?.width}×{probe.video?.height}
                  </span>
                </div>
                <div>
                  <span className="spec-k">Códec</span>
                  <span className="spec-v">{probe.video?.codec ?? '—'}</span>
                </div>
                <div>
                  <span className="spec-k">Cuadros</span>
                  <span className="spec-v">{(probe.video?.fps ?? 0).toFixed(2)}/s</span>
                </div>
                <div>
                  <span className="spec-k">Audio</span>
                  {/* Códec y bitrate juntos: en modo Copiar, el códec es
                      exactamente lo que el usuario se está llevando. */}
                  <span className="spec-v">
                    {probe.audio
                      ? `${probe.audio.codec} · ${probe.audio.bitrateKbps ?? '—'} kbps`
                      : 'ninguno'}
                  </span>
                </div>
              </div>
            </section>

            <section>
              <div className="section-head">
                <h2>Lo esencial</h2>
                {legend}
              </div>
              <div className="creases">
                <Crease
                  kind="none"
                  label="Cómo decidir el peso"
                  hint="Fija el tamaño final, la calidad, o el bitrate."
                >
                  <Segmented
                    label="Cómo decidir el peso"
                    options={RATE_MODES}
                    value={options.video.rateMode}
                    onChange={(v: RateMode) => setVideo({ rateMode: v })}
                  />
                </Crease>

                {options.video.rateMode === 'targetSize' && (
                  <Crease
                    kind="mountain"
                    label="Peso objetivo"
                    hint="El archivo se ajustará para quedar por debajo."
                  >
                    <div className="field">
                      <input
                        className="num"
                        type="number"
                        min={1}
                        step={1}
                        aria-label="Peso objetivo en megabytes"
                        value={options.video.targetSizeMB}
                        onChange={(e) =>
                          setVideo({ targetSizeMB: Math.max(1, Number(e.target.value) || 1) })
                        }
                      />
                      <span className="field-unit" aria-hidden="true">
                        MB
                      </span>
                    </div>
                  </Crease>
                )}

                {options.video.rateMode === 'quality' && (
                  <Crease
                    kind="valley"
                    label="Calidad"
                    hint="Números bajos conservan más detalle y pesan más."
                    value={String(options.video.quality)}
                  >
                    <div className="slider">
                      <input
                        type="range"
                        min={range.min}
                        max={range.max}
                        aria-label="Calidad"
                        aria-valuetext={`${options.video.quality} de ${range.min} a ${range.max}, donde ${range.min} es máxima calidad`}
                        value={options.video.quality}
                        onChange={(e) => setVideo({ quality: Number(e.target.value) })}
                      />
                      <span className="slider-ends">
                        <span>{range.min} máxima</span>
                        <span>{range.max} mínima</span>
                      </span>
                    </div>
                  </Crease>
                )}

                {options.video.rateMode === 'bitrate' && (
                  <Crease
                    kind="mountain"
                    label="Bitrate de video"
                    hint="Kilobits por segundo dedicados a la imagen."
                  >
                    <div className="field">
                      <input
                        className="num"
                        type="number"
                        min={100}
                        step={100}
                        aria-label="Bitrate de video en kilobits por segundo"
                        value={options.video.bitrateKbps}
                        onChange={(e) =>
                          setVideo({ bitrateKbps: Math.max(100, Number(e.target.value) || 100) })
                        }
                      />
                      <span className="field-unit" aria-hidden="true">
                        kbps
                      </span>
                    </div>
                  </Crease>
                )}

                <Crease
                  kind="mountain"
                  label="Resolución"
                  hint="Menos píxeles es menos peso, y es la palanca más fuerte."
                  value={outDims ?? ''}
                >
                  <Segmented
                    label="Resolución"
                    value={scaleValue}
                    onChange={(v) =>
                      setVideo({
                        scale:
                          v === 'original'
                            ? { kind: 'original' }
                            : v.startsWith('p')
                              ? { kind: 'percent', percent: Number(v.slice(1)) }
                              : { kind: 'height', height: Number(v.slice(1)) }
                      })
                    }
                    options={[
                      { value: 'original', label: 'Original' },
                      { value: 'p75', label: '75 %' },
                      { value: 'p50', label: '50 %' },
                      ...[1080, 720, 480]
                        .filter((h) => h < sourceHeight)
                        .map((h) => ({ value: `h${h}`, label: `${h}p` }))
                    ]}
                  />
                </Crease>

                <Crease
                  kind="mountain"
                  label="Códec"
                  hint="Los más nuevos comprimen mejor pero tardan más."
                >
                  <Segmented
                    label="Códec"
                    options={CODECS}
                    value={options.video.codec}
                    onChange={(v: VideoCodec) =>
                      setVideo({ codec: v, quality: QUALITY_RANGE[v].default })
                    }
                  />
                </Crease>
              </div>
            </section>

            <section>
              <button
                type="button"
                className="deploy-toggle"
                aria-expanded={deployed}
                onClick={() => setDeployed((d) => !d)}
              >
                <IconSheet aria-hidden="true" />
                {deployed ? 'Plegar la hoja' : 'Desplegar la hoja'}
                <IconChevron aria-hidden="true" />
              </button>

              {deployed && (
                <>
                  <div className="section-head section-head-deployed">
                    <h2>Todo lo demás</h2>
                    {legend}
                  </div>
                  <div className="creases deployed">
                    <Crease
                      kind="mountain"
                      label="Recorte"
                      hint="Menos duración es menos peso, sin tocar la imagen."
                      value={formatDuration(trimmedDuration)}
                    >
                      <div className="pair">
                        <label className="pair-field">
                          <span className="pair-cap">Desde</span>
                          <div className="field">
                            <input
                              className="num"
                              type="number"
                              min={0}
                              max={Math.floor(probe.durationSec)}
                              aria-label="Recortar desde el segundo"
                              value={options.trim?.startSec ?? 0}
                              onChange={(e) => {
                                const startSec = Math.max(0, Number(e.target.value) || 0)
                                setOptions((o) => ({
                                  ...o,
                                  trim: { startSec, endSec: o.trim?.endSec ?? null }
                                }))
                              }}
                            />
                            <span className="field-unit" aria-hidden="true">
                              s
                            </span>
                          </div>
                        </label>
                        <label className="pair-field">
                          <span className="pair-cap">Hasta</span>
                          <div className="field">
                            <input
                              className="num"
                              type="number"
                              min={0}
                              max={Math.ceil(probe.durationSec)}
                              placeholder={String(Math.round(probe.durationSec))}
                              aria-label="Recortar hasta el segundo"
                              value={options.trim?.endSec ?? ''}
                              onChange={(e) => {
                                const raw = e.target.value
                                setOptions((o) => ({
                                  ...o,
                                  trim: {
                                    startSec: o.trim?.startSec ?? 0,
                                    endSec: raw === '' ? null : Number(raw)
                                  }
                                }))
                              }}
                            />
                            <span className="field-unit" aria-hidden="true">
                              s
                            </span>
                          </div>
                        </label>
                      </div>
                    </Crease>

                    <Crease
                      kind="mountain"
                      label="Esfuerzo del encoder"
                      hint="Más lento aprovecha mejor cada bit, al mismo peso."
                    >
                      <Segmented
                        label="Esfuerzo del encoder"
                        value={options.video.preset}
                        onChange={(v: EncodePreset) => setVideo({ preset: v })}
                        options={PRESETS}
                      />
                    </Crease>

                    <Crease
                      kind="valley"
                      label="Dos pasadas"
                      hint="Mide primero y reparte mejor los bits. Tarda el doble."
                    >
                      <Switch
                        label="Dos pasadas"
                        checked={options.video.twoPass}
                        onChange={(v) => setVideo({ twoPass: v })}
                      />
                    </Crease>

                    <Crease
                      kind="mountain"
                      label="Cuadros por segundo"
                      hint="Bajarlo quita peso y hace el movimiento menos fluido."
                      value={options.video.fps === null ? 'original' : `${options.video.fps}/s`}
                    >
                      <Segmented
                        label="Cuadros por segundo"
                        value={options.video.fps === null ? 'original' : String(options.video.fps)}
                        onChange={(v) => setVideo({ fps: v === 'original' ? null : Number(v) })}
                        options={[
                          { value: 'original', label: 'Original' },
                          { value: '30', label: '30' },
                          { value: '24', label: '24' },
                          { value: '15', label: '15' }
                        ]}
                      />
                    </Crease>

                    <Crease kind="none" label="Contenedor" hint="No cambia el peso ni la calidad.">
                      <Segmented
                        label="Contenedor"
                        value={options.container}
                        onChange={(v: Container) => setOptions((o) => ({ ...o, container: v }))}
                        options={[
                          { value: 'mp4' as const, label: 'MP4' },
                          { value: 'mkv' as const, label: 'MKV' },
                          { value: 'webm' as const, label: 'WebM' }
                        ]}
                      />
                    </Crease>

                    <Crease
                      kind="none"
                      label="Aceleración por hardware"
                      hint="Mucho más rápido, y algo más pesado a igual calidad."
                    >
                      <Segmented
                        label="Aceleración por hardware"
                        value={options.video.hardwareAccel}
                        onChange={(v: HardwareAccel) => setVideo({ hardwareAccel: v })}
                        options={[
                          { value: 'none' as const, label: 'Ninguna' },
                          { value: 'nvenc' as const, label: 'NVIDIA' },
                          { value: 'qsv' as const, label: 'Intel' },
                          { value: 'amf' as const, label: 'AMD' }
                        ]}
                      />
                    </Crease>

                    <Crease
                      kind="mountain"
                      label="Audio"
                      hint="Silenciarlo es el ahorro más grande que queda."
                    >
                      <Segmented
                        label="Audio"
                        value={options.audio.mode}
                        onChange={(v: AudioMode) => setAudio({ mode: v })}
                        options={[
                          { value: 'encode' as const, label: 'Recomprimir' },
                          { value: 'copy' as const, label: 'Copiar' },
                          { value: 'mute' as const, label: 'Silenciar' }
                        ]}
                      />
                    </Crease>

                    {options.audio.mode === 'encode' && (
                      <>
                        <Crease
                          kind="mountain"
                          label="Códec de audio"
                          hint="Opus a 64 kbps suena como AAC a 128."
                        >
                          <Segmented
                            label="Códec de audio"
                            value={options.audio.codec}
                            onChange={(v: AudioCodec) => setAudio({ codec: v })}
                            options={[
                              { value: 'aac' as const, label: 'AAC' },
                              { value: 'opus' as const, label: 'Opus' },
                              { value: 'mp3' as const, label: 'MP3' }
                            ]}
                          />
                        </Crease>

                        <Crease
                          kind="mountain"
                          label="Bitrate de audio"
                          hint="Kilobits por segundo dedicados al sonido."
                        >
                          <Segmented
                            label="Bitrate de audio en kilobits por segundo"
                            value={String(options.audio.bitrateKbps)}
                            onChange={(v) => setAudio({ bitrateKbps: Number(v) })}
                            options={[
                              { value: '192', label: '192' },
                              { value: '128', label: '128' },
                              { value: '96', label: '96' },
                              { value: '64', label: '64' }
                            ]}
                          />
                        </Crease>

                        <Crease
                          kind="mountain"
                          label="Canales"
                          hint="Mono pesa cerca de la mitad que estéreo."
                        >
                          <Segmented
                            label="Canales"
                            value={
                              options.audio.channels === null ? 'original' : String(options.audio.channels)
                            }
                            onChange={(v) =>
                              setAudio({ channels: v === 'original' ? null : (Number(v) as 1 | 2) })
                            }
                            options={[
                              { value: 'original', label: 'Original' },
                              { value: '2', label: 'Estéreo' },
                              { value: '1', label: 'Mono' }
                            ]}
                          />
                        </Crease>

                        <Crease
                          kind="mountain"
                          label="Frecuencia de muestreo"
                          hint="Bajarla quita peso y recorta los agudos."
                        >
                          <Segmented
                            label="Frecuencia de muestreo"
                            value={
                              options.audio.sampleRate === null ? 'original' : String(options.audio.sampleRate)
                            }
                            onChange={(v) =>
                              setAudio({ sampleRate: v === 'original' ? null : Number(v) })
                            }
                            options={[
                              { value: 'original', label: 'Original' },
                              { value: '48000', label: '48 kHz' },
                              { value: '44100', label: '44,1 kHz' },
                              { value: '22050', label: '22 kHz' }
                            ]}
                          />
                        </Crease>
                      </>
                    )}

                    <Crease
                      kind="mountain"
                      label="Quitar metadata"
                      hint="Elimina etiquetas y carátulas embebidas."
                    >
                      <Switch
                        label="Quitar metadata"
                        checked={options.stripMetadata}
                        onChange={(v) => setOptions((o) => ({ ...o, stripMetadata: v }))}
                      />
                    </Crease>

                    <Crease
                      kind="none"
                      label="Optimizar para reproducción web"
                      hint="Mueve el índice al inicio para que empiece antes. No cambia el peso."
                    >
                      <Switch
                        label="Optimizar para reproducción web"
                        checked={options.faststart}
                        onChange={(v) => setOptions((o) => ({ ...o, faststart: v }))}
                      />
                    </Crease>
                  </div>
                </>
              )}
            </section>

            {running && progress && (
              <section className="run">
                <button type="button" className="act act-quiet" onClick={onCancel}>
                  <IconStop aria-hidden="true" />
                  Detener
                </button>
                <div style={{ flex: 1 }}>
                  <div
                    className="progress-track"
                    role="progressbar"
                    aria-label="Progreso de la compresión"
                    aria-valuenow={Math.round(progress.percent)}
                    aria-valuemin={0}
                    aria-valuemax={100}
                  >
                    <div
                      className="progress-fill"
                      style={{ transform: `scaleX(${progress.percent / 100})` }}
                    />
                  </div>
                </div>
                <div className="run-stats">
                  <span>{progress.percent.toFixed(0)}%</span>
                  {progress.speed !== null && <span>{progress.speed.toFixed(1)}×</span>}
                  {progress.etaSec !== null && <span>faltan {formatDuration(progress.etaSec)}</span>}
                  <span>{formatBytes(progress.outSizeBytes)}</span>
                </div>
              </section>
            )}

            {result?.status === 'done' && (
              <section className="result">
                <div className="result-figure">
                  <span>{formatBytes(result.inputSizeBytes)}</span>
                  <IconArrow aria-hidden="true" />
                  <strong>{formatBytes(result.outputSizeBytes)}</strong>
                  {result.ratio !== null && (
                    <span className="mass-drop">−{Math.round((1 - result.ratio) * 100)}%</span>
                  )}
                </div>
                <button
                  type="button"
                  className="act act-quiet"
                  style={{ marginLeft: 'auto' }}
                  onClick={() => void window.videoscaler.revealInFolder(result.outputPath!)}
                >
                  <IconFolder aria-hidden="true" />
                  Ver en la carpeta
                </button>
              </section>
            )}

            {result?.status === 'canceled' && (
              <p className="notice notice-quiet">
                <IconCheck aria-hidden="true" />
                <span>Se detuvo la compresión. El archivo original está intacto.</span>
              </p>
            )}
          </div>
        )}
      </div>

      <footer className="mass">
        {probe && estimate ? (
          <>
            <div className="mass-group">
              <span className="mass-k">Ahora</span>
              <span className="mass-v">{formatBytes(probe.sizeBytes)}</span>
            </div>
            <IconArrow aria-hidden="true" className="mass-arrow" />
            <div className="mass-group" aria-live="polite" aria-atomic="true">
              <span className="mass-k">Quedará en</span>
              <span className="mass-v mass-v-strong">{formatBytes(estimate.bytes)}</span>
              <span className={`mass-drop${estimate.ratio > 1 ? ' mass-drop-up' : ''}`}>
                {estimate.ratio > 1 ? '+' : '−'}
                {Math.abs(Math.round((1 - estimate.ratio) * 100))}%
              </span>
              <span className="mass-approx">
                {estimate.confidence === 'approximate' ? 'estimado' : 'calculado'}
              </span>
            </div>

            {/*
              En modo peso objetivo el peso final no se mueve — ese es el punto
              del modo. Esta es la lectura que sí responde a cada palanca, así
              que se presenta con peso propio y no como una nota al pie.
            */}
            <div className="mass-group" aria-live="polite" aria-atomic="true">
              <span className="mass-k">Video a</span>
              <span className="mass-v">{estimate.videoKbps} kbps</span>
              <span className={`density density-${estimate.density}`}>{estimate.density}</span>
            </div>
            <span className="bar-spacer" />
            <button
              type="button"
              className="act act-commit"
              disabled={running || !env?.available}
              onClick={() => void onEncode()}
            >
              {running ? 'Comprimiendo' : 'Comprimir'}
              <IconArrow aria-hidden="true" />
            </button>
          </>
        ) : (
          <span className="bar-note">
            Ningún archivo cargado. Suelta un video en la ventana para empezar.
          </span>
        )}
      </footer>
    </div>
  )
}
