import { writeFile, access } from 'node:fs/promises'
import { basename, dirname, extname, join } from 'node:path'
import type { CaptureRequest } from '@shared/types'

/**
 * Guarda un fotograma junto al video del que salió.
 *
 * Sin diálogo: capturar un cuadro es un gesto que se repite — se avanza, se
 * mira, se guarda — y un explorador de archivos en medio lo convertiría en un
 * trámite. La misma decisión que toma el compresor con el sufijo «-ligero».
 *
 * Nunca sobrescribe. Dos capturas del mismo cuadro son dos archivos, porque
 * pisar el anterior destruye trabajo que el usuario no puede recuperar.
 */
async function exists(path: string): Promise<boolean> {
  return access(path).then(
    () => true,
    () => false
  )
}

export async function saveCapture(req: CaptureRequest): Promise<string> {
  const dir = dirname(req.sourcePath)
  const stem = basename(req.sourcePath, extname(req.sourcePath))
  const base = `${stem}-cuadro-${req.frame}${req.crop ? '-recorte' : ''}`

  let target = join(dir, `${base}.png`)
  for (let copy = 2; await exists(target); copy++) {
    target = join(dir, `${base}-${copy}.png`)
  }

  await writeFile(target, Buffer.from(req.data))
  return target
}
