# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Clientes de La Barmacia, un bar de pueblo abierto aproximadamente de 23:00 a 03:00. Están de pie o en la barra, con la música muy alta, poca luz, a menudo con una bebida en la mano y el móvil en la otra. Entran escaneando un QR de un cartel. No leen: miran, tocan y vuelven a la conversación. Una persona puede entrar varias veces en la noche durante unos segundos cada vez.

Segunda audiencia: la dueña del bar, que lleva el panel (`/admin`) desde su móvil, el mismo que reproduce Spotify por bluetooth, mientras atiende la barra.

## Product Purpose

Que la gente del bar decida qué música suena. Cada cliente pide una canción; las canciones compiten en un ranking en tiempo real y la primera suena después de la actual en el Spotify del bar. Éxito: alguien que acaba de escanear el QR pide su canción en segundos sin leer instrucciones, y vuelve a mirar el móvil para ver cómo va su canción.

## Positioning

No es una jukebox de cola: es una competición en directo. La canción que suena marca la ronda; en el último minuto, la #1 y la #2 se enfrentan en un duelo con puntos dobles y la ganadora entra en la cola de Spotify. Los equipos, los minijuegos y la "dosis" que da la barra con cada consumición deciden quién gana.

## Operating Context

- Se entra por un QR fijo en un cartel A3. No hay tele en el bar: todo se ve en los móviles.
- Cada noche es una sesión que abre y cierra la dueña; al cerrarla se borra todo.
- Música muy alta: nada puede depender del sonido.
- Sin registro: solo un alias y un emoji (y, si quiere, un selfie que se borra al cerrar la noche).

## Capabilities and Constraints

- **Ronda = la canción que suena.** Estado de la ronda: abierta, duelo final (#1 contra #2 con puntos ×2; el resto congelado), cerrada (20 s antes del final la ganadora entra en la cola de Spotify) o en espera (nada sonando).
- **Pedir canción:** buscar en Spotify y pedir. Límites: 1 canción activa por persona, 15 min de espera desde que suena la tuya, máximo 3 por hora, sin repetir la misma en 2 h y máximo 7 min de duración.
- **Apoyar:** unirse al equipo de una canción. Incluye un voto gratis (+1) por ronda.
- **Minijuegos** (solo visuales y táctiles): Machaca el botón, Reflejos, Memoria, Al ritmo, Carátula (pixelada), Trivia y Crono a ciegas. Hay 3 partidas por ronda ("energía") y los puntos van a la canción de tu equipo. En Carátula y Trivia las preguntas y la respuesta buena las pone el servidor.
- **Selfie:** opcional. Sale como cara de la canción en el VS y en las burbujas del equipo. La dueña puede quitar cualquiera y todas se borran al cerrar la noche.
- **Dosis:** con cada consumición, la dueña enseña un QR de un solo uso que suma puntos a la canción que elijas.
- **Happy hour:** la dueña la activa y todo vale ×2.
- La perdedora del duelo conserva el 50 % de sus puntos.
- **Pendiente:** rediseñar el cartel y desplegar en Fly.
- **Stack:** React 19, Vite, Tailwind 4, Motion y Socket.IO. Funciona con conexiones móviles de bar (la wifi puede ser mala).

## Brand Commitments

- Nombre del juego: **BarmaGames**, para el bar **La Barmacia**. Logo: un matraz con un mando, una nota musical y burbujas, en negro, blanco y cian (`logos/barmagames.png`; versiones para fondo oscuro en `public/brand/`).
- Hay que conservar los **colores del logo** (cian, blanco y negro).
- Hay que conservar la **jerga de farmacia**: "pide tu receta", "dosis"…
- Hay que conservar el **duelo VS** a pantalla completa, con la frontera entre las dos canciones moviéndose según quién va ganando.
- Idioma: español de España, cercano y de bar.

## Evidence on Hand

- Carátulas y metadatos reales de Spotify (en el simulador, carátulas generadas).
- No hay fotos del bar, ni testimonios, ni datos de uso. No hay que inventarlos.

## Product Principles

1. **Se entiende mirando.** La primera acción (pedir tu canción) tiene que verse en el primer vistazo, sin leer.
2. **Menos texto, más estado visible.** Carátulas, números y tiempo dicen lo que pasa; las palabras son la excepción.
3. **Tu canción es la protagonista.** En cuanto pides, todo gira en torno a dónde está la tuya y qué puedes hacer para subirla.
4. **El momento del duelo es el espectáculo.** Lo demás prepara ese minuto.
5. **Una mano, poca luz, mucho ruido.** Objetivos grandes, contraste alto y nada que dependa del sonido.

## Accessibility & Inclusion

Contraste alto para un entorno oscuro, objetivos táctiles grandes, uso con una mano, respetar `prefers-reduced-motion` y no depender del audio.
