import QRCode from 'qrcode'
import { useEffect, useState } from 'react'
import { LedCross } from './components/LedCross.tsx'

/**
 * Cartel A3 para imprimir y colgar en el bar. El QR apunta a esta misma web
 * (o a ?url=... si se quiere forzar otra dirección).
 */
export function Poster() {
  const target = new URLSearchParams(location.search).get('url') || location.origin
  const [qr, setQr] = useState<string | null>(null)

  useEffect(() => {
    QRCode.toString(target, { type: 'svg', margin: 0, errorCorrectionLevel: 'H', color: { dark: '#05070a', light: '#0000' } })
      .then((svg) => setQr(`data:image/svg+xml;utf8,${encodeURIComponent(svg)}`))
      .catch(() => setQr(null))
  }, [target])

  return (
    <div className="min-h-dvh bg-[#1a1f27] py-8 print:bg-transparent print:p-0">
      <style>{`@page { size: A3 portrait; margin: 0 } @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact } }`}</style>
      <div className="mx-auto mb-4 flex max-w-[420px] items-center justify-between text-sm text-white/70 print:hidden">
        <span>Vista previa del cartel A3</span>
        <button onClick={() => window.print()} className="rounded-full bg-cyan px-4 py-2 font-bold text-ink">
          🖨️ Imprimir
        </button>
      </div>
      <article
        className="relative mx-auto flex aspect-[297/420] w-full max-w-[420px] flex-col items-center overflow-hidden bg-ink px-[6%] py-[5%] text-center text-white shadow-2xl print:h-[420mm] print:w-[297mm] print:max-w-none print:shadow-none"
        style={{ containerType: 'inline-size' }}
      >
        <div className="pointer-events-none absolute -left-1/3 -top-1/4 h-2/3 w-[120%] rounded-full bg-cyan/20 blur-[60px]" />
        <div className="pointer-events-none absolute -bottom-1/4 -right-1/3 h-2/3 w-[120%] rounded-full bg-green/15 blur-[60px]" />

        <img src="/brand/logo-full.png" alt="BarmaGames" className="relative w-[34%]" />
        <h1 className="relative mt-[3%] font-display font-black leading-[0.95]" style={{ fontSize: '8.2cqw' }}>
          ¡TÚ PONES
          <br />
          <span className="text-cyan">LA MÚSICA!</span>
        </h1>

        <div className="relative mt-[4%] rounded-[5cqw] bg-white p-[3.5%] shadow-[0_0_80px_rgb(25_195_255/0.45)]">
          {qr && <img src={qr} alt={`QR para entrar en ${target}`} className="aspect-square w-[38cqw]" />}
          <div className="absolute left-1/2 top-1/2 grid size-[10cqw] -translate-x-1/2 -translate-y-1/2 place-items-center rounded-[2.5cqw] bg-ink">
            <LedCross size={40} className="size-[78%]" />
          </div>
        </div>

        <ol className="relative mt-[4%] grid w-full grid-cols-3 gap-[3%] font-bold leading-tight" style={{ fontSize: '3cqw' }}>
          {[
            ['📷', 'Escanea el QR'],
            ['🎵', 'Pide tu canción'],
            ['⚡', 'Juega y hazla sonar'],
          ].map(([e, t], i) => (
            <li key={t} className="rounded-[3cqw] border border-white/15 bg-white/5 px-[6%] py-[7%]">
              <span className="block" style={{ fontSize: '5cqw' }}>
                {e}
              </span>
              <span className="mt-[0.6em] block">
                <span className="text-cyan">{i + 1}.</span> {t}
              </span>
            </li>
          ))}
        </ol>

        <p className="relative mt-auto pt-[3%] font-display font-bold text-green" style={{ fontSize: '3.3cqw' }}>
          💊 Pide tu dosis en la barra con tu consumición
        </p>
        <p className="relative mt-[2%] text-white/40" style={{ fontSize: '2.4cqw' }}>
          {target.replace(/^https?:\/\//, '')}
        </p>
      </article>
    </div>
  )
}
