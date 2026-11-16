import type { MeState } from '../../../shared/types.ts'

export type Energy = { left: number; max: number; /** Epoch ms en que se recargan (0 = sin espera). */ readyAt: number }

/**
 * Partidas que quedan para jugar por una canción: la tuya (se recargan con cada canción)
 * o una ajena (al gastarlas hay una espera). La espera se descuenta aquí en directo:
 * el servidor no avisa cuando se acaba, así que al llegar a 0 ya cuentan como recargadas.
 */
export function energyFor(me: MeState | null, own: boolean, now: number): Energy {
  if (!me) return { left: 0, max: 3, readyAt: 0 }
  if (own) return { left: me.ownEnergy, max: me.ownMax, readyAt: 0 }
  if (me.helpReadyAt && now >= me.helpReadyAt) return { left: me.helpMax, max: me.helpMax, readyAt: 0 }
  return { left: me.helpEnergy, max: me.helpMax, readyAt: me.helpEnergy > 0 ? 0 : me.helpReadyAt }
}

/** Las partidas de la canción por la que juegas ahora. */
export function currentEnergy(me: MeState | null, now: number): Energy {
  return energyFor(me, me?.playingOwn ?? true, now)
}
