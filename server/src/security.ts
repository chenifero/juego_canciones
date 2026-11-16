import type { RequestHandler } from 'express'

/**
 * Cabeceras de seguridad para todo lo que sirve el servidor (web, fotos, API).
 *
 * La web solo carga cosas propias: scripts y fuentes del mismo servidor, las
 * carátulas de Spotify (i.scdn.co y similares), los QR y selfies como `data:`/`blob:`
 * y el Socket.IO del mismo origen. La cámara solo la puede pedir la propia web
 * (lector de QR); el micro y la ubicación quedan cerrados.
 */
export function securityHeaders({ production }: { production: boolean }): RequestHandler {
  const csp = [
    "default-src 'self'",
    "script-src 'self'",
    // React y Motion ponen estilos en línea (style="…"); no hay <style> de terceros
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https://*.scdn.co https://*.spotifycdn.com",
    "font-src 'self' data:",
    "connect-src 'self'",
    "media-src 'self' blob:",
    "worker-src 'self' blob:",
    "manifest-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    ...(production ? ['upgrade-insecure-requests'] : []),
  ].join('; ')

  const permissions = [
    'camera=(self)',
    'microphone=()',
    'geolocation=()',
    'payment=()',
    'usb=()',
    'browsing-topics=()',
  ].join(', ')

  return (_req, res, next) => {
    res.setHeader('Content-Security-Policy', csp)
    res.setHeader('X-Content-Type-Options', 'nosniff')
    res.setHeader('X-Frame-Options', 'DENY')
    // El código de la dosis viaja en la URL (/?dosis=…): que no salga hacia otros sitios
    res.setHeader('Referrer-Policy', 'same-origin')
    res.setHeader('Permissions-Policy', permissions)
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin')
    // Solo en Fly, que va siempre por HTTPS; en casa se prueba por http://192.168…
    if (production) res.setHeader('Strict-Transport-Security', 'max-age=31536000')
    next()
  }
}
