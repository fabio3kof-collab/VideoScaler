import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process'
import { rm, stat } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import type { EncodeOptions, JobProgress, JobResult, MediaProbe } from '@shared/types'
import { buildEncodeArgs, effectiveDuration } from './args'
import { resolveFfmpeg } from './paths'

interface RunningJob {
  child: ChildProcessWithoutNullStreams
  canceled: boolean
}

const running = new Map<string, RunningJob>()

/**
 * Lee la salida `-progress` de FFmpeg, que emite bloques `clave=valor`
 * terminados en `progress=continue|end`.
 */
function parseProgressBlock(chunk: string): Record<string, string> {
  const out: Record<string, string> = {}
  for (const line of chunk.split(/\r?\n/)) {
    const eq = line.indexOf('=')
    if (eq > 0) out[line.slice(0, eq).trim()] = line.slice(eq + 1).trim()
  }
  return out
}

function runPass(
  ffmpegPath: string,
  args: string[],
  jobId: string,
  durationSec: number,
  passOffset: number,
  passCount: number,
  onProgress: (p: JobProgress) => void
): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(ffmpegPath, args, { windowsHide: true })
    running.set(jobId, { child, canceled: false })

    let stdoutBuf = ''
    let stderrTail = ''

    child.stdout.setEncoding('utf8')
    child.stdout.on('data', (data: string) => {
      stdoutBuf += data
      // Procesa sólo bloques completos; el resto queda para el próximo chunk.
      const lastBreak = stdoutBuf.lastIndexOf('progress=')
      if (lastBreak === -1) return
      const complete = stdoutBuf.slice(0, stdoutBuf.indexOf('\n', lastBreak) + 1)
      stdoutBuf = stdoutBuf.slice(complete.length)

      const fields = parseProgressBlock(complete)
      const outTimeUs = Number(fields.out_time_us ?? fields.out_time_ms)
      if (!Number.isFinite(outTimeUs) || durationSec <= 0) return

      const secondsDone = outTimeUs / 1_000_000
      const passFraction = Math.min(1, secondsDone / durationSec)
      const percent = ((passOffset + passFraction) / passCount) * 100
      const speed = Number.parseFloat(fields.speed ?? '') || null
      const remaining = durationSec - secondsDone

      onProgress({
        jobId,
        percent: Math.max(0, Math.min(100, percent)),
        speed,
        fps: Number.parseFloat(fields.fps ?? '') || null,
        etaSec: speed && speed > 0 ? Math.max(0, remaining / speed) : null,
        outSizeBytes: Number(fields.total_size) || null
      })
    })

    child.stderr.setEncoding('utf8')
    child.stderr.on('data', (data: string) => {
      // Sólo interesa el final: es donde FFmpeg deja el motivo real del fallo.
      stderrTail = (stderrTail + data).slice(-4000)
    })

    child.on('error', (err) => {
      running.delete(jobId)
      reject(err)
    })

    child.on('close', (code) => {
      const job = running.get(jobId)
      running.delete(jobId)
      if (job?.canceled) {
        reject(new Error('CANCELED'))
      } else if (code === 0) {
        resolve()
      } else {
        reject(new Error(stderrTail.trim() || `FFmpeg terminó con código ${code}`))
      }
    })
  })
}

export async function runEncode(
  jobId: string,
  inputPath: string,
  outputPath: string,
  options: EncodeOptions,
  probe: MediaProbe,
  onProgress: (p: JobProgress) => void
): Promise<JobResult> {
  const startedAt = Date.now()
  const env = await resolveFfmpeg()
  const base: JobResult = {
    jobId,
    status: 'error',
    outputPath: null,
    inputSizeBytes: probe.sizeBytes,
    outputSizeBytes: null,
    ratio: null,
    elapsedMs: 0,
    error: null
  }

  if (!env.ffmpegPath) {
    return { ...base, elapsedMs: Date.now() - startedAt, error: 'No se encontró FFmpeg.' }
  }

  const passLogPrefix = join(tmpdir(), `videoscaler-${jobId}`)
  const { passes } = buildEncodeArgs(inputPath, outputPath, options, probe, passLogPrefix)
  const duration = effectiveDuration(options, probe)

  try {
    for (let i = 0; i < passes.length; i++) {
      await runPass(env.ffmpegPath, passes[i]!, jobId, duration, i, passes.length, onProgress)
    }
    const { size } = await stat(outputPath)
    return {
      ...base,
      status: 'done',
      outputPath,
      outputSizeBytes: size,
      ratio: probe.sizeBytes > 0 ? size / probe.sizeBytes : null,
      elapsedMs: Date.now() - startedAt
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return {
      ...base,
      status: message === 'CANCELED' ? 'canceled' : 'error',
      elapsedMs: Date.now() - startedAt,
      error: message === 'CANCELED' ? null : message
    }
  } finally {
    // Los logs de dos pasadas quedan huérfanos si el trabajo se cancela.
    if (passes.length > 1) {
      await Promise.all(
        [`${passLogPrefix}-0.log`, `${passLogPrefix}-0.log.mbtree`].map((f) =>
          rm(f, { force: true }).catch(() => undefined)
        )
      )
    }
  }
}

export function cancelEncode(jobId: string): boolean {
  const job = running.get(jobId)
  if (!job) return false
  job.canceled = true
  job.child.kill('SIGKILL')
  return true
}

export function cancelAll(): void {
  for (const jobId of running.keys()) cancelEncode(jobId)
}
