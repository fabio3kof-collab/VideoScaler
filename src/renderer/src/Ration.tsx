import type { JSX } from 'react'
import type { EncodeOptions, MediaProbe } from '@shared/types'
import { MIN_VIDEO_KBPS, targetSizeForVideoKbps } from '@shared/budget'
import type { WeightEstimate } from './estimate'
import { scaledPixels } from './estimate'
import { formatDuration } from './defaults'
import { Crease, Slider } from './Crease'

/**
 * El reparto: qué cede para caber en el peso objetivo.
 *
 * En este modo el peso final es una entrada, así que algo tiene que ceder —
 * y hasta ahora cedía a escondidas. Lo que cede es el bitrate del video, que
 * se deriva del objetivo; aquí se dice cuánto y se ponen juntas las cuatro
 * palancas que deciden si a ese bitrate le alcanza. Ninguna de ellas cambia el
 * peso final: cambian cuántos píxeles, cuadros, kbps de audio y segundos tiene
 * que cubrir el mismo presupuesto.
 *
 * Por eso son barras y no juegos de opciones: aquí lo que se decide es cuánto,
 * no cuál.
 */
export function Ration({
  options,
  probe,
  estimate,
  onVideo,
  onAudio,
  onTrim
}: {
  options: EncodeOptions
  probe: MediaProbe
  estimate: WeightEstimate
  onVideo: (patch: Partial<EncodeOptions['video']>) => void
  onAudio: (patch: Partial<EncodeOptions['audio']>) => void
  onTrim: (trim: EncodeOptions['trim']) => void
}): JSX.Element {
  const [outW, outH] = probe.video
    ? scaledPixels(options.video.scale, probe.video.width, probe.video.height)
    : [0, 0]

  // El slider trabaja en porcentaje aunque el modo escalar sea otro: un alto
  // fijo elegido en otro modo se traduce a su porcentaje equivalente en vez de
  // saltar a 100 y perder el ajuste del usuario.
  const sourceHeight = probe.video?.height ?? 0
  const scalePercent = ((): number => {
    const s = options.video.scale
    if (s.kind === 'percent') return Math.round(s.percent)
    if (s.kind === 'height' && sourceHeight > 0) return Math.round((s.height / sourceHeight) * 100)
    return 100
  })()

  const sourceFps = Math.max(1, Math.round(probe.video?.fps ?? 30))
  const fpsValue = options.video.fps ?? sourceFps
  const fpsMin = Math.min(10, sourceFps)

  const sourceAudioKbps = probe.audio?.bitrateKbps ?? 128
  const audioKbps =
    options.audio.mode === 'mute'
      ? 0
      : options.audio.mode === 'copy'
        ? sourceAudioKbps
        : options.audio.bitrateKbps
  // El techo sube si la pista original ya venía por encima: un slider que no
  // alcanza el valor actual lo estaría bajando sin que nadie lo pidiera.
  const audioMax = Math.max(256, Math.ceil(sourceAudioKbps / 8) * 8)

  const duration = Math.max(1, Math.floor(probe.durationSec))
  const startSec = Math.min(options.trim?.startSec ?? 0, duration - 1)
  const endSec = Math.min(options.trim?.endSec ?? duration, duration)

  const setTrim = (nextStart: number, nextEnd: number): void => {
    const s = Math.max(0, Math.min(nextStart, duration - 1))
    const e = Math.max(s + 1, Math.min(nextEnd, duration))
    // Sin recorte se guarda `null`, no el rango completo: así el resto de la
    // app sigue distinguiendo "no lo tocó" de "lo puso donde ya estaba".
    onTrim(s === 0 && e >= duration ? null : { startSec: s, endSec: e >= duration ? null : e })
  }

  // El presupuesto se parte en dos y sólo en dos. El audio se lleva lo suyo
  // entero: lo que quede es lo que le toca a la imagen.
  const audioBytes = Math.max(0, estimate.audioOnlyBytes)
  const videoBytes = Math.max(0, estimate.bytes - audioBytes)

  // El techo del bitrate es el ritmo del propio archivo de origen: pedir más
  // que eso sólo produce un archivo más pesado que el original.
  const originalKbps = Math.round((probe.sizeBytes * 8) / Math.max(1, probe.durationSec) / 1000)
  const bitrateMax = Math.max(MIN_VIDEO_KBPS + 400, originalKbps)
  const bitrateStep = bitrateMax > 6000 ? 50 : 10

  /*
   * La holgura se dibuja hasta 1.5 veces la referencia, con una marca en la
   * referencia misma. Recortarla ahí es lo honesto: por encima el modelo deja
   * de distinguir nada útil, y BPP_REFERENCE no está calibrado contra
   * codificaciones medidas, así que poner cifras sería precisión inventada.
   */
  const gaugeFill = Math.min(1, Math.max(0, estimate.headroom / 1.5))

  return (
    <section>
      {/* Sin leyenda de pliegues: las cuatro filas son montaña, así que la
          entrada de valle no tendría a qué apuntar en esta sección. */}
      <div className="section-head">
        <h2>El reparto</h2>
      </div>

      <div className="ration">
        <p className="ration-say">
          {estimate.reachable ? (
            <>
              Para caber en <strong>{options.video.targetSizeMB} MB</strong>, el video va a{' '}
              <strong>{estimate.videoKbps} kbps</strong>. Bajar la resolución, los cuadros o el
              audio no cambia el peso — cambia cuánto le rinde ese bitrate.
            </>
          ) : (
            <>
              El objetivo de <strong>{options.video.targetSizeMB} MB</strong> no se alcanza: el
              video ya está en su mínimo de {MIN_VIDEO_KBPS} kbps y el audio se lleva el resto.
              Baja el audio o recorta el video.
            </>
          )}
        </p>

        {/* La lectura que sí se mueve con cada palanca cuando el peso no puede
            moverse. Va primero por eso: es la respuesta a «¿y esto qué hizo?». */}
        <p className="split-keys">
          <span>Holgura de la imagen</span>
          <strong className={`verdict verdict-${estimate.density}`}>{estimate.density}</strong>
        </p>
        <div
          className={`gauge gauge-${estimate.density}`}
          role="img"
          aria-label={`Holgura de la imagen: ${estimate.density}. ${estimate.videoKbps} kilobits por segundo para ${outW} por ${outH} a ${fpsValue} cuadros.`}
        >
          <span className="gauge-fill" style={{ transform: `scaleX(${gaugeFill})` }} />
          <span className="gauge-ref" />
        </div>
        <p className="gauge-note">
          {estimate.videoKbps} kbps para {outW}×{outH} a {fpsValue}/s
        </p>

        <p className="split-keys">
          <span>
            Video <strong>{estimate.videoKbps} kbps</strong>
          </span>
          <span>
            Audio{' '}
            <strong>{estimate.audioKbps > 0 ? `${estimate.audioKbps} kbps` : 'silenciado'}</strong>
          </span>
        </p>
        <div
          className="split"
          role="img"
          aria-label={`De los ${options.video.targetSizeMB} MB del objetivo, el video se lleva ${estimate.videoKbps} kilobits por segundo y el audio ${estimate.audioKbps}.`}
        >
          <span className="split-video" style={{ flexGrow: videoBytes }} />
          <span className="split-audio" style={{ flexGrow: audioBytes }} />
        </div>
      </div>

      <div className="creases">
        {/*
          El peso y el bitrate son el mismo número por dos caras, así que esta
          barra escribe sobre el objetivo en MB y el campo de MB mueve esta
          barra. No hay dos fuentes de verdad: hay una, con dos entradas.
        */}
        <Crease
          kind="mountain"
          label="Bitrate de video"
          hint="El peso objetivo, dicho por segundo. Moverlo mueve el objetivo."
          value={`${estimate.videoKbps} kbps`}
        >
          <Slider
            label="Bitrate de video"
            min={MIN_VIDEO_KBPS}
            max={bitrateMax}
            step={bitrateStep}
            value={Math.min(Math.max(estimate.videoKbps, MIN_VIDEO_KBPS), bitrateMax)}
            valueText={`${estimate.videoKbps} kilobits por segundo, que son ${options.video.targetSizeMB} megabytes`}
            ends={[`${MIN_VIDEO_KBPS} kbps`, `${bitrateMax} kbps`]}
            onChange={(v) =>
              onVideo({
                targetSizeMB: Math.max(
                  1,
                  Math.round(targetSizeForVideoKbps(v, options, probe) * 100) / 100
                )
              })
            }
          />
        </Crease>

        <Crease
          kind="mountain"
          label="Resolución"
          hint="Menos píxeles que cubrir con los mismos bits."
          value={`${outW}×${outH}`}
        >
          <Slider
            label="Resolución"
            min={25}
            max={100}
            step={5}
            value={scalePercent}
            valueText={`${scalePercent} % del original, ${outW} por ${outH} píxeles`}
            ends={['25 %', 'Original']}
            onChange={(v) =>
              onVideo({
                scale: v >= 100 ? { kind: 'original' } : { kind: 'percent', percent: v }
              })
            }
          />
        </Crease>

        {sourceFps > fpsMin && (
          <Crease
            kind="mountain"
            label="Cuadros por segundo"
            hint="Menos cuadros, más bits para cada uno de los que quedan."
            value={`${fpsValue}/s`}
          >
            <Slider
              label="Cuadros por segundo"
              min={fpsMin}
              max={sourceFps}
              value={fpsValue}
              valueText={`${fpsValue} cuadros por segundo`}
              ends={[`${fpsMin}/s`, 'Original']}
              onChange={(v) => onVideo({ fps: v >= sourceFps ? null : v })}
            />
          </Crease>
        )}

        {probe.audio && (
          <Crease
            kind="mountain"
            /* «Audio» a secas ya nombra la fila de modo en la hoja desplegada:
               dos filas con el mismo nombre y distinto control se confunden. */
            label="Bitrate de audio"
            hint="Cada kbps del audio es uno que el video no recibe. En cero, se silencia."
            value={audioKbps > 0 ? `${audioKbps} kbps` : 'silenciado'}
          >
            <Slider
              label="Bitrate de audio"
              min={0}
              max={audioMax}
              step={8}
              value={Math.min(audioKbps, audioMax)}
              valueText={
                audioKbps > 0 ? `${audioKbps} kilobits por segundo` : 'Sin pista de audio'
              }
              ends={['Silencio', `${audioMax} kbps`]}
              onChange={(v) =>
                v === 0 ? onAudio({ mode: 'mute' }) : onAudio({ mode: 'encode', bitrateKbps: v })
              }
            />
          </Crease>
        )}

        <Crease
          kind="mountain"
          label="Recorte"
          hint="Menos segundos reparten el mismo peso entre menos tiempo."
          value={formatDuration(endSec - startSec)}
        >
          <div className="rails">
            <div className="rail">
              <span className="rail-cap">Desde {formatDuration(startSec)}</span>
              <Slider
                label="Recortar desde"
                min={0}
                max={duration - 1}
                value={startSec}
                valueText={`Empieza en ${formatDuration(startSec)}`}
                onChange={(v) => setTrim(v, endSec)}
              />
            </div>
            <div className="rail">
              <span className="rail-cap">Hasta {formatDuration(endSec)}</span>
              <Slider
                label="Recortar hasta"
                min={1}
                max={duration}
                value={endSec}
                valueText={`Termina en ${formatDuration(endSec)}`}
                onChange={(v) => setTrim(startSec, v)}
              />
            </div>
          </div>
        </Crease>
      </div>
    </section>
  )
}
