import { Pill, Printer } from '@phosphor-icons/react'
import QRCode from 'qrcode'
import { useEffect, useState } from 'react'

/**
 * Cartel A3 para imprimir y colgar en el bar: el frontal de la máquina.
 * El QR apunta a esta misma web (o a ?url=... si se quiere forzar otra dirección).
 */

const STEPS = [
  { n: '1', text: 'Escanea el QR' },
  { n: '2', text: 'Pide el código de hoy en la barra' },
  { n: '3', text: 'Pide tu canción y juega' },
]

function BulbRow({ count }: { count: number }) {
  return (
    <div className="flex w-full items-center justify-between" aria-hidden>
      {Array.from({ length: count }, (_, i) => (
        <span key={i} className="bulb-on block aspect-square" style={{ width: '2.6cqw' }} />
      ))}
    </div>
  )
}

export function Poster() {
  const target = new URLSearchParams(location.search).get('url') || location.origin
  const [qr, setQr] = useState<string | null>(null)

  useEffect(() => {
    QRCode.toString(target, { type: 'svg', margin: 0, errorCorrectionLevel: 'H', color: { dark: '#06121a', light: '#0000' } })
      .then((svg) => setQr(`data:image/svg+xml;utf8,${encodeURIComponent(svg)}`))
      .catch(() => setQr(null))
  }, [target])

  return (
    <div className="min-h-dvh bg-night py-8 print:bg-transparent print:p-0">
      <style>{`@page { size: A3 portrait; margin: 0 } @media print { html, body { background: #0b0c0e !important; -webkit-print-color-adjust: exact; print-color-adjust: exact } }`}</style>
      <div className="mx-auto mb-4 flex max-w-[420px] items-center justify-between px-4 text-sm text-mute print:hidden">
        <span>Vista previa del cartel A3</span>
        <button onClick={() => window.print()} className="pulsador glass flex h-11 items-center gap-2 px-4 font-display text-[14px]">
          <Printer size={20} weight="bold" aria-hidden /> Imprimir
        </button>
      </div>

      <article
        className="relative mx-auto flex aspect-[297/420] w-full max-w-[420px] flex-col overflow-hidden bg-ink text-center text-paper shadow-2xl print:h-[420mm] print:w-[297mm] print:max-w-none print:shadow-none"
        style={{ containerType: 'inline-size', padding: '3cqw' }}
      >
        {/* Marco de metal de la máquina */}
        <div className="bezel relative flex h-full flex-col" style={{ borderRadius: '1.6cqw', padding: '2.8cqw', gap: '2cqw' }}>
          <BulbRow count={15} />

          <img src="/brand/logo-full.png" alt="BarmaGames" className="mx-auto" style={{ width: '21cqw' }} />

          {/* Cristal encendido con el rótulo */}
          <div className="glass relative flex flex-col items-center justify-center" style={{ borderRadius: '1cqw', padding: '2.6cqw 3cqw' }}>
            <h1 className="font-display leading-[0.92] text-print" style={{ fontSize: '9cqw' }}>
              ¡TÚ PONES
              <br />
              LA MÚSICA!
            </h1>
          </div>

          {/* QR sobre placa de papel, dentro de su bisel */}
          <div className="flex min-h-0 flex-1 items-center justify-center">
            <div className="bezel h-full" style={{ borderRadius: '1.6cqw', padding: '1.2cqw' }}>
              <div className="relative aspect-square h-full bg-paper" style={{ borderRadius: '1cqw', padding: '2.6cqw' }}>
                {qr && <img src={qr} alt={`QR para entrar en ${target}`} className="block size-full" />}
                <div
                  className="absolute left-1/2 top-1/2 grid -translate-x-1/2 -translate-y-1/2 place-items-center bg-paper"
                  style={{ width: '7.4cqw', height: '7.4cqw', borderRadius: '1cqw' }}
                >
                  <img src="/brand/logo-mark.png" alt="" style={{ width: '82%' }} />
                </div>
              </div>
            </div>
          </div>

          {/* Tres pasos: pulsadores apagados con su número en LED */}
          <ol className="grid grid-cols-3" style={{ gap: '2cqw' }}>
            {STEPS.map(({ n, text }) => (
              <li key={n} className="glass-dim flex flex-col items-center" style={{ borderRadius: '1cqw', padding: '2.4cqw 2cqw', gap: '1.6cqw' }}>
                <span className="led-well flex items-center justify-center" style={{ borderRadius: '0.8cqw', width: '8cqw', height: '8cqw' }}>
                  <span className="font-led text-amber" style={{ fontSize: '5.2cqw', textShadow: '0 0 1.2cqw rgb(255 194 61 / 0.8)' }}>
                    {n}
                  </span>
                </span>
                <span className="font-sans font-extrabold leading-[1.1]" style={{ fontSize: '3.3cqw' }}>
                  {text}
                </span>
              </li>
            ))}
          </ol>

          {/* Tira ámbar: la dosis */}
          <div className="flex items-center justify-center bg-amber text-print" style={{ borderRadius: '1cqw', padding: '2.2cqw 3cqw', gap: '2cqw', boxShadow: 'inset 0 -0.5cqw 0 rgb(0 0 0 / 0.22), inset 0 0.3cqw 0 rgb(255 255 255 / 0.55)' }}>
            <Pill style={{ width: '5.4cqw', height: '5.4cqw' }} weight="bold" aria-hidden />
            <span className="font-display leading-none" style={{ fontSize: '3.1cqw' }}>
              PIDE TU DOSIS EN LA BARRA CON TU CONSUMICIÓN
            </span>
          </div>

          <div className="flex items-center justify-center">
            <span className="font-sans font-extrabold text-mute" style={{ fontSize: '2.8cqw' }}>
              {target.replace(/^https?:\/\//, '')}
            </span>
          </div>

          <BulbRow count={15} />
        </div>
      </article>
    </div>
  )
}
