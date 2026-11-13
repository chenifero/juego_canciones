# BarmaGames · La Barmacia

Juego web para pedir canciones en La Barmacia. La gente entra escaneando un QR, pide canciones, las apoya en equipo y juega minijuegos para subirlas en el ranking. La primera del ranking es la siguiente que suena en el Spotify del bar.

Todo lo que se va haciendo está en [BITACORA.md](BITACORA.md).

## Arrancar en el ordenador

Necesitas Node 24 o superior.

```bash
npm install
cp .env.example .env      # y rellena SPOTIFY_CLIENT_ID / SPOTIFY_CLIENT_SECRET / ADMIN_PIN
```

| Comando | Qué hace |
|---|---|
| `npm run dev` | Servidor (:3000) y web (:5173) con **Spotify real** |
| `npm run dev:mock` | Igual, pero con el **simulador**: no hace falta Spotify |
| `npm test` | Prueba de humo: juega una ronda completa contra el simulador |
| `npm run typecheck` | Comprueba los tipos de servidor y web |
| `npm run build` y `npm start` | Compila la web y la sirve desde el servidor (:3000) |

### Direcciones

- **Juego:** http://127.0.0.1:5173. Desde el móvil, en la misma wifi, usa `http://IP-de-tu-PC:5173`.
- **Panel de la dueña:** http://127.0.0.1:5173/admin, con el PIN de `ADMIN_PIN`.
- **Cartel para imprimir:** http://127.0.0.1:5173/cartel (en producción, imprímelo desde la web publicada para que el QR lleve la dirección buena).

### Conectar Spotify (una sola vez)

1. En el [panel de desarrolladores de Spotify](https://developer.spotify.com/dashboard), la app debe tener la Redirect URI `http://127.0.0.1:3000/callback` (y la de Fly cuando se publique).
2. Abre el panel `/admin` **en el ordenador** (con `127.0.0.1`, no con `localhost`) y pulsa **Conectar Spotify**.
3. Abre Spotify en el móvil que pone la música y dale al play. El juego empieza solo.

## Cómo funciona

- **Ronda = la canción que suena.** Durante la canción, el ranking está abierto.
- **Duelo final (último minuto):** la #1 contra la #2. Solo suman esas dos, con puntos ×2.
- **Cierre (20 s antes del final):** la ganadora entra en la cola de Spotify y la perdedora se queda con el 50 %.
- **Cada noche es una sesión.** La dueña la abre y, al cerrarla, se borra todo menos los bloqueos.
- El ranking vive en el servidor, porque Spotify no deja reordenar su cola: solo le mandamos la ganadora.

```
shared/types.ts        tipos comunes
server/src/engine.ts   reglas del juego (rondas, duelo, límites, equipos, minijuegos, dosis)
server/src/music/      Spotify real (spotify.ts) y simulador (mock.ts)
server/src/index.ts    HTTP + Socket.IO + bucle que vigila el reproductor
web/src/client/        pantallas del cliente
web/src/admin/         panel de la dueña
web/src/games/         minijuegos
```

## Publicar en Fly

```bash
fly launch --no-deploy --copy-config        # usa fly.toml (app "barmagames", región Madrid)
fly volumes create barma_data --region mad --size 1
fly secrets set SPOTIFY_CLIENT_ID=... SPOTIFY_CLIENT_SECRET=... ADMIN_PIN=...
# ADMIN_PIN: de 6 a 12 cifras y nada evidente (123456, 000000…). En Fly el servidor se niega a arrancar sin uno bueno.
fly deploy
```

Después hay que añadir `https://barmagames.fly.dev/callback` como Redirect URI en la app de Spotify y volver a conectar Spotify desde `/admin`. Si cambias el nombre de la app, cambia también `WEB_ORIGIN` y `SPOTIFY_REDIRECT_URI` en `fly.toml`.
