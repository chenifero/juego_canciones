import {
  BeerStein,
  ListNumbers,
  Pill,
  Power,
  Printer,
  Question,
  SkipForward,
  SlidersHorizontal,
  SpotifyLogo,
  Trophy,
  UsersThree,
  Password,
} from '@phosphor-icons/react'
import { useEffect, useState } from 'react'
import { GuidedTour, type TourStep } from '../components/Tour.tsx'

export const ADMIN_TOUR_KEY = 'bg.tour.admin'

type Facts = { barOpen: boolean; dosePoints: number; lockSecs: number }

/**
 * Lo que la dueña tiene que saber para llevar la noche, en el orden en que lo va a usar.
 * Si la barra está cerrada, el primer paso sobre el mando es abrirla (y no hay código todavía).
 */
function adminSteps({ barOpen: open, dosePoints, lockSecs }: Facts): TourStep[] {
  const night: TourStep = open
    ? {
        target: 'noche',
        icon: Power,
        tone: 'metal',
        title: 'Cerrar la noche',
        body: 'Cuando cierres el bar, ciérrala aquí. Se borran las canciones, la gente y las fotos, y mañana se empieza de cero.',
        tip: 'Pide dos toques: el primero pregunta y el segundo cierra.',
      }
    : {
        target: 'noche',
        icon: Power,
        tone: 'cyan',
        title: 'Abre la barra',
        body: 'Así empieza la noche: se abre el juego para tus clientes y sale el código para entrar. Ábrela cuando haya gente y Spotify esté sonando.',
        tip: 'Al cerrarla, con este mismo botón, se borra todo lo de la noche.',
      }

  return [
    {
      icon: BeerStein,
      tone: 'amber',
      title: 'Así se lleva la noche',
      body: 'Tus clientes eligen la música desde su móvil: piden canciones, juegan para subirlas y la que va primera suena después. Tú solo tienes que hacer esto:',
      list: [
        { icon: SpotifyLogo, text: 'Pon Spotify a sonar en este móvil, con la lista que quieras.' },
        { icon: Power, text: 'Abre la barra y di el código a quien llegue.' },
        { icon: Pill, text: 'Con cada consumición, dale una dosis de puntos.' },
        { icon: Trophy, text: 'Lo demás va solo: la ganadora entra en la cola de Spotify.' },
      ],
      tip: 'Te lo enseño sobre el mando en un minuto.',
    },
    {
      target: 'suena',
      icon: SpotifyLogo,
      tone: 'cyan',
      title: 'Lo que suena',
      body: `La canción de ahora y, debajo, la que va después. El número cuenta lo que falta para cerrar las votaciones: ${lockSecs} s antes de que acabe la canción, la ganadora entra sola en la cola de Spotify.`,
      tip: 'La bombilla ámbar dice que Spotify va bien. Si se pone rosa, sale un aviso que te dice qué hacer. No cambies la cola de Spotify a mano.',
    },
    ...(open
      ? [
          {
            target: 'codigo',
            icon: Password,
            tone: 'cyan',
            title: 'El código de hoy',
            body: 'Sin él no se entra: así solo juega quien está en el bar. Díselo a quien llegue o apúntalo en una pizarra. Quien ya entró vuelve sin pedirlo.',
            tip: 'Si el código ha llegado a gente de fuera, toca «Cambiar». Los que ya están dentro siguen dentro.',
          } satisfies TourStep,
        ]
      : [night]),
    {
      target: 'dosis',
      icon: Pill,
      tone: 'cyan',
      title: 'Una dosis por consumición',
      body: `Cuando alguien pida algo, toca Dosis y enséñale el QR que sale. Lo escanea desde BarmaGames y suma +${dosePoints} puntos a la canción que elija.`,
      tip: 'Cada QR vale una sola vez y caduca a los 90 s. Los puntos de la dosis se cambian en Ajustes.',
    },
    {
      target: 'saltar',
      icon: SkipForward,
      tone: 'metal',
      title: 'Saltar la canción',
      body: 'Por si suena algo que no pega. Toca una vez y el botón se pone rosa preguntando; toca otra vez para saltar.',
      tip: 'Si no confirmas en 3 s, se desarma solo. Todo lo que borra o echa a alguien funciona así.',
    },
    {
      target: 'teclas',
      icon: SlidersHorizontal,
      tone: 'metal',
      title: 'Ranking, gente y ajustes',
      body: 'Tres cajones para cuando haga falta. El número es cuántas canciones o personas hay.',
      list: [
        { icon: ListNumbers, text: 'Ranking: las canciones pedidas. Quita la que no quieras que suene.' },
        { icon: UsersThree, text: 'Gente: quién ha entrado. Quita una foto o bloquea un móvil esta noche.' },
        { icon: Printer, text: 'Ajustes: puntos y tiempos del juego, la cuenta de Spotify y el cartel con el QR para imprimir.' },
      ],
    },
    ...(open ? [night] : []),
    {
      target: 'ayuda',
      icon: Question,
      tone: 'amber',
      title: '¿Se te olvida algo?',
      body: 'Toca aquí cuando quieras y te lo vuelvo a enseñar.',
      tip: 'Abajo del todo ves cuánta gente hay conectada y la ronda en la que va la noche.',
    },
  ]
}

/**
 * Tour del mando de la dueña: sale la primera vez que entra en el panel y se repite con «?».
 * Los pasos se fijan al abrirlo (si abre la barra a mitad, el tour no se descoloca).
 */
export function AdminTour({ open, onClose, ...facts }: { open: boolean; onClose: () => void } & Facts) {
  const [steps, setSteps] = useState<TourStep[]>(() => adminSteps(facts))
  useEffect(() => {
    if (open) setSteps(adminSteps(facts))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])
  return (
    <GuidedTour
      open={open}
      onClose={onClose}
      steps={steps}
      seenKey={ADMIN_TOUR_KEY}
      startLabel="Enséñamelo"
      finishLabel="¡A servir!"
      interactive={false}
      back
      roomy
    />
  )
}
