import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { JSX } from 'react'
import type {
  AudioCodec,
  AudioMode,
  Container,
  EncodeOptions,
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
import { Crease, Segmented, Slider, Switch } from './Crease'
import { ErrorNotice, Notice } from './Notice'
import { Ration } from './Ration'
import { Mass } from './Mass'
import { Working } from './Working'
import { IconArrow, IconCheck, IconChevron, IconFolder, IconPlay, IconSheet } from './Icons'

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

/**
 * Reducir: la hoja de palancas y la barra de masa.
 *
 * Era la aplicación entera hasta que apareció el segundo módulo. Sigue siendo
 * dueño de sus propias decisiones — las opciones de codificación, el trabajo en
 * curso, el resultado — y no las comparte con el reproductor: lo único que los
 * dos módulos tienen en común es el archivo.
 */
export function Scaler({
  probe,
  env,
  version,
  update,
  error,
  onError,
  onWatch
}: {
  probe: MediaProbe
  env: FfmpegStatus | null
  version: string
  update: UpdateState
  error: FriendlyError | null
  onError: (e: FriendlyError | null) => void
  /** Abre un archivo en el reproductor. Lo usa el resultado recién comprimido. */
  onWatch: (path: string) => void
}): JSX.Element {
  const [options, setOptions] = useState<EncodeOptions>(DEFAULT_OPTIONS)
  const [progress, setProgress] = useState<JobProgress | null>(null)
  const [result, setResult] = useState<JobResult | null>(null)
  const [deployed, setDeployed] = useState(false)
  const jobRef = useRef<string | null>(null)

  // Sólo el progreso del trabajo propio. El canal es uno para toda la ventana y
  // el montaje también escribe archivos por él: sin este filtro, exportar desde
  // el banco abriría *también* la hoja de este módulo — con un Detener que no
  // detiene nada, porque el trabajo no es suyo — y la dejaría colgada sin
  // resultado cuando el otro terminara.
  useEffect(() => {
    const off = window.videoscaler.onProgress((p) => {
      if (jobRef.current === p.jobId) setProgress(p)
    })
    return off
  }, [])

  // Cambiar de archivo limpia lo que era del anterior, pero no las palancas:
  // quien comprime a diario suele repetir los mismos ajustes, y devolvérselos a
  // los valores de fábrica en cada archivo le cobraría el mismo trabajo dos
  // veces. Lo único que sí se recalcula es el objetivo, que sin el peso del
  // archivo delante no significa nada.
  useEffect(() => {
    setProgress(null)
    setResult(null)
    const suggestedMB = Math.max(1, Math.round((probe.sizeBytes / (1024 * 1024)) * 0.35))
    setOptions((o) => ({
      ...o,
      trim: null,
      video: { ...o.video, targetSizeMB: suggestedMB }
    }))
  }, [probe.path, probe.sizeBytes])

  const onEncode = useCallback(async () => {
    onError(null)
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
    if (res.error) onError(explain(res.error, probe.filename))
  }, [probe, options, onError])

  const onCancel = useCallback(() => {
    if (jobRef.current) void window.videoscaler.cancelEncode(jobRef.current)
  }, [])

  /*
   * Mientras se comprime, la ventana entera queda detrás de un velo.
   *
   * No es una barra de progreso que informa: es un bloqueo, y lo es porque el
   * trabajo lo es. Un solo trabajo a la vez, un solo archivo, y las palancas
   * escritas en el proceso que ya arrancó — moverlas mientras corre no cambia
   * nada del resultado y hace creer que sí. Cambiar de archivo, peor: la ficha
   * de arriba pasaría a describir un video que no es el que se está
   * escribiendo en el disco.
   *
   * El velo tapa el puntero por sí solo, y del teclado se encarga `Working`,
   * que es la misma hoja que usa el montaje para exportar.
   */
  const running = progress !== null && result === null
  const close = useCallback(() => setProgress(null), [])

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

  const estimate = useMemo(() => estimateWeight(options, probe), [options, probe])
  const range = QUALITY_RANGE[options.video.codec]
  /* Las palancas del presupuesto viven en El reparto mientras el peso sea la
     entrada; fuera de ese modo vuelven a su fila de siempre. */
  const targetMode = options.video.rateMode === 'targetSize'
  const presetStep = Math.max(
    0,
    PRESETS.findIndex((p) => p.value === options.video.preset)
  )
  const presetLabel = PRESETS[presetStep]?.label ?? ''
  const sourceHeight = probe.video?.height ?? 0

  const scaleValue = useMemo(() => {
    const s = options.video.scale
    if (s.kind === 'height') return `h${s.height}`
    if (s.kind === 'percent') return `p${s.percent}`
    return 'original'
  }, [options.video.scale])

  const outDims = useMemo(() => {
    if (!probe.video) return null
    const [w, h] = scaledPixels(options.video.scale, probe.video.width, probe.video.height)
    return `${w}×${h}`
  }, [options.video.scale, probe])

  const trimmedDuration = useMemo(() => {
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
    <>
      <div className="scroll">
        <div className="stack">
          {env && !env.available && (
            <Notice>
              No se encontró FFmpeg, así que no se puede comprimir. Reinstala VideoScaler o instala
              FFmpeg y vuelve a abrir la aplicación.
            </Notice>
          )}

          {/* Descarga y listo-para-instalar los dice el botón de la cabecera,
              que además se ve sin archivo cargado. Aquí sólo queda el fallo,
              porque es el único que necesita explicar algo. */}
          {update.status === 'error' && (
            <Notice>
              No se pudo buscar actualizaciones. Seguirás usando la versión {version} sin problema;
              se reintentará solo. ({update.message})
            </Notice>
          )}

          {error && <ErrorNotice error={error} />}

          {estimate && !estimate.reachable && (
            <Notice>
              El objetivo de {options.video.targetSizeMB} MB no se alcanza: sólo el audio ocupa{' '}
              {formatBytes(estimate.audioOnlyBytes)} en {formatDuration(trimmedDuration)}. Baja el
              bitrate de audio, pásalo a mono o silencia la pista — o recorta el video.
            </Notice>
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
                      /* Décimas porque la barra de bitrate escribe aquí: a
                         un video corto, 1 MB de salto son cientos de kbps. */
                      step={0.1}
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

              {/* En modo peso objetivo la resolución se ajusta con barra en
                  El reparto, junto al resto del presupuesto. Aquí se oculta
                  para que la palanca no tenga dos controles distintos. */}
              {options.video.rateMode !== 'targetSize' && (
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
              )}

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

          {targetMode && estimate && (
            <Ration
              options={options}
              probe={probe}
              estimate={estimate}
              onVideo={setVideo}
              onAudio={setAudio}
              onTrim={(trim) => setOptions((o) => ({ ...o, trim }))}
            />
          )}

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
                  {/* Recorte, cuadros por segundo y bitrate de audio se
                      ajustan con barra en El reparto mientras el peso sea la
                      entrada, así que aquí no se repiten. */}
                  <Crease
                    kind="mountain"
                    label="Recorte"
                    hint="Menos duración es menos peso, sin tocar la imagen."
                    value={formatDuration(trimmedDuration)}
                    hidden={targetMode}
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

                  {/* Barra y no botones: son siete pasos de una misma escala,
                      y siete etiquetas con nombre no caben en la columna a
                      ninguna anchura de ventana. Lo que se elige aquí es
                      cuánto esfuerzo, no cuál de siete cosas. */}
                  <Crease
                    kind="mountain"
                    label="Esfuerzo del encoder"
                    hint="Más lento aprovecha mejor cada bit, al mismo peso."
                    value={presetLabel}
                  >
                    <Slider
                      label="Esfuerzo del encoder"
                      min={0}
                      max={PRESETS.length - 1}
                      value={presetStep}
                      valueText={`${presetLabel}, paso ${presetStep + 1} de ${PRESETS.length}`}
                      ends={['Inmediato', 'Máximo']}
                      onChange={(i) => {
                        const step = PRESETS[i]
                        if (step) setVideo({ preset: step.value })
                      }}
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
                    hidden={targetMode}
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
                        hidden={targetMode}
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

          {/*
            El acta, para después de cerrar la hoja.

            No es la copia de un cartel: la hoja es el momento — se lee una vez y
            se va — y esto es lo que queda cuando ya se fue. Sin ella, cerrar sin
            decidir dejaría el archivo comprimido sin ninguna forma de llegar a
            él desde la ventana.
          */}
          {result?.status === 'done' && (
            <section className="result">
              <div className="result-figure">
                <Mass bytes={result.inputSizeBytes} />
                <IconArrow aria-hidden="true" />
                <Mass bytes={result.outputSizeBytes} strong />
                {result.ratio !== null && (
                  <span className="mass-drop">−{Math.round((1 - result.ratio) * 100)}%</span>
                )}
              </div>
              <div className="result-acts">
                {/* Antes que «ver en la carpeta»: lo que sigue a comprimir no es
                    archivar el archivo, es comprobar que no se arruinó. Y es la
                    única forma de saberlo — la cifra de arriba dice cuánto pesa,
                    no cómo se ve. */}
                <button
                  type="button"
                  className="act act-quiet"
                  onClick={() => onWatch(result.outputPath!)}
                >
                  <IconPlay aria-hidden="true" />
                  Ver el resultado
                </button>
                <button
                  type="button"
                  className="act act-quiet"
                  onClick={() => void window.videoscaler.revealInFolder(result.outputPath!)}
                >
                  <IconFolder aria-hidden="true" />
                  Ver en la carpeta
                </button>
              </div>
            </section>
          )}

          {result?.status === 'canceled' && (
            <Notice tone="quiet" icon={<IconCheck aria-hidden="true" />}>
              Se detuvo la compresión. El archivo original está intacto.
            </Notice>
          )}
        </div>
      </div>

      <footer className="mass">
        {estimate ? (
          <>
            <div className="mass-group">
              <span className="mass-k">Ahora</span>
              <Mass bytes={probe.sizeBytes} />
            </div>
            <IconArrow aria-hidden="true" className="mass-arrow" />
            <div className="mass-group" aria-live="polite" aria-atomic="true">
              <span className="mass-k">Quedará en</span>
              <Mass bytes={estimate.bytes} strong />
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
          </>
        ) : (
          // Sin duración fiable no hay estimación honesta, y una barra de masa
          // que se inventa un número es peor que una que se calla.
          <span className="bar-note">
            No se puede estimar el peso final: el archivo no declara su duración.
          </span>
        )}
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
      </footer>

      <Working
        progress={progress}
        result={result}
        error={error}
        filename={probe.filename}
        path={probe.path}
        labels={{
          running: 'Comprimiendo',
          done: 'Listo',
          canceled: 'Se detuvo la compresión',
          failed: 'No se pudo comprimir'
        }}
        runningNote="La ventana queda en pausa hasta que termine. Detener no toca el original."
        canceledNote="No se escribió nada a medias que haya que borrar, y el archivo original está intacto."
        onCancel={onCancel}
        onClose={close}
        onWatch={onWatch}
      />
    </>
  )
}
