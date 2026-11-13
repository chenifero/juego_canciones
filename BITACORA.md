# Bitácora · BarmaGames (La Barmacia)

Registro de todo lo que vamos haciendo, en orden. Lo más nuevo, abajo.

---

## 10/11/2026 · Planificación

**Qué es:** un juego web para que la gente de La Barmacia pida canciones desde el móvil. Las canciones compiten en un ranking en tiempo real, y la primera es la siguiente que suena en el Spotify del bar.

**Lo que decidimos:**
- **No hay tele.** Todo se ve en el móvil de los clientes, y la dueña lo controla desde el suyo. Se entra con un **QR fijo** en un cartel grande.
- **Horario:** de 23:00 a 03:00 aproximadamente. Cada noche es una sesión: la dueña la abre, y al cerrarla se borra todo (alias, ranking, puntos y fotos). Solo se guardan los bloqueos.
- **Registro:** alias y emoji, sin cuenta.
- **Límites:** 1 canción activa por persona, 15 minutos de espera desde que suena la tuya, máximo 3 por hora, la misma canción no se repite en 2 horas y nada de más de 7 minutos.
- **Ronda = la canción que suena:**
  - Mientras suena, el ranking está abierto.
  - En los **últimos ~60 s** hay **duelo #1 VS #2** con puntos dobles.
  - **~20 s antes del final** se cierran las votaciones y la #1 entra en la cola de Spotify.
  - La **perdedora del duelo conserva el 50 %** de sus puntos (configurable).
- **Para subir canciones:**
  - Pedir una canción le da 10 puntos de salida.
  - 1 voto gratis por ronda.
  - Minijuegos, con 3 partidas por ronda y puntos según dificultad y rendimiento.
  - **Equipos** que apoyan canciones.
  - **Duelo cara a cara** en directo.
  - **Consumición = dosis:** la dueña genera un QR de un solo uso y el cliente lo escanea.
  - **Eventos de la dueña:** happy hour y rondas temáticas.
- **Minijuegos solo visuales o táctiles**, porque en el bar la música está muy alta.
- **Foto en el VS:** quien pide sube un selfie como cara de su canción, y quienes la apoyan salen como burbujas. La dueña puede quitar fotos con un toque.
- **Descartado:** fichas y pujas.
- **Spotify:**
  - Suena desde el móvil de la dueña, conectado por bluetooth a un altavoz.
  - Las pruebas se hacen con la cuenta de Sergio.
  - El ranking vive en nuestra app, porque Spotify no deja reordenar su cola: solo le mandamos la ganadora.
- **Tecnología:** React, Vite, TypeScript, Tailwind y Motion en el frontend; Node y Socket.IO en el servidor. Se publicará en Fly.io.

---

## 10/11/2026 · Arranque del proyecto

- **Logo** (`logos/barmagames.png`). El juego se llama **BarmaGames**. Saqué versiones para fondo oscuro, con el negro pasado a blanco y el cian conservado:
  - `web/public/brand/logo-full.png`, `logo-mark.png` (solo el matraz).
  - Iconos: `icon-512.png`, `icon-192.png`, `apple-touch-icon.png` y `favicon.png`.
- **Paleta:** fondo casi negro, blanco y el **cian del logo** (#19C3FF), con **verde farmacia** (#3DFF8F) y **rosa** (#FF3D8B) para el equipo rival del duelo.
- **Repositorio git** iniciado en `main`.
- **`.env.example`** con las variables, y **`.env`** (no se sube a git), donde Sergio pega sus claves de Spotify.

## 10/11/2026 · Servidor y motor del juego

**Estructura:** un monorepo con npm workspaces.
- `server/`: Node 24, que ejecuta TypeScript directamente, sin paso de compilación.
- `web/`: React 19, Vite 8 y Tailwind 4.
- `shared/types.ts`: los tipos que comparten servidor y web.

**Archivos del servidor:**
- `server/src/engine.ts`, el **motor del juego**:
  - Ronda = la canción que suena. Fases: `idle`, `open`, `duel` y `locked`.
  - **Duelo:** en el último minuto, la #1 contra la #2. Solo suman esas dos, con puntos ×2, y el resto del ranking queda congelado.
  - **Cierre** 20 s antes del final: gana la que más puntos tenga del duelo y la perdedora se queda con el 50 %. Si Spotify rechaza la canción, el cierre se deshace (la perdedora recupera sus puntos) y se reintenta.
  - **Límites:** 1 canción activa, 15 min de espera desde que suena la tuya, 3 por hora, sin repetir la misma en 2 h, máximo 7 min de duración y filtro opcional de explícitas.
  - **Equipos:** apoyar una canción te mete en su equipo y gasta tu voto gratis (+1 por ronda). Quien pide una canción no puede cambiarse de equipo.
  - **Energía:** 3 partidas por ronda, que se recargan con cada canción.
  - **Minijuegos validados en el servidor**, para frenar trampas: `tap` (machaca el botón, hasta +3), `reflex` (reflejos, hasta +3) y `stopwatch` (para el crono en 10,00, hasta +10).
  - **Dosis de la barra:** un código de un solo uso que caduca en 90 s y vale 15 puntos (configurable).
  - **Canciones en espera:** +1 punto por ronda esperando, y caducan si pasan 8 rondas sin ganar.
  - **Happy hour:** todo vale ×2.
  - **Cerrar la noche** borra todo menos los bloqueos y la configuración.
- `server/src/music/spotify.ts`: login OAuth de Spotify (la dueña lo conecta desde su panel), renovación automática del token, consulta de lo que suena, búsqueda, cola y saltar canción. Respeta los límites de peticiones de Spotify y avisa si no hay ningún dispositivo activo.
- `server/src/music/mock.ts`: **simulador** con 40 canciones de bar de unos 75–110 s y carátulas generadas. Sirve para desarrollar sin Spotify.
- `server/src/index.ts`:
  - Express y Socket.IO.
  - Un bucle que consulta el reproductor cada 2,5 s, y cada 1 s cuando se acerca el cierre.
  - Envía el estado público, el estado de cada jugador y el del panel.
  - Rutas `/auth/login` y `/callback` para Spotify.
  - En producción sirve también la web.
- **Persistencia:** el estado se guarda en `data/state.json` y los tokens de Spotify en `data/spotify.json`. Si el servidor se reinicia a mitad de noche, no se pierde nada. *Cambio sobre el plan:* usamos JSON en lugar de SQLite, porque los datos duran una sola noche.
- **Prueba de humo** (`npm test`): arranca el simulador y juega una ronda completa con tres jugadores y la dueña. **51 de 51 comprobaciones OK.**

## 10/11/2026 · La web (móvil del cliente, panel de la dueña y cartel)

**Estilo:**
- Fondo casi negro con la carátula que suena muy desenfocada detrás, y grano sutil.
- Tipografías Unbounded (títulos) y Manrope (texto), cargadas desde el propio proyecto: no dependen de Google, que la wifi del bar puede ir mal.
- **Cruz LED de farmacia animada** (`LedCross`), que se enciende en ondas desde el centro. Sale en las pantallas de carga, en "cerrado", en el panel y en el cartel.

**Móvil del cliente** (`web/src/client/`):
- **Entrada:** logo flotando, alias y emoji, sin registro.
- **Bar cerrado:** pantalla propia mientras la dueña no abra la barra.
- **Pantalla principal:**
  - Tarjeta de "Sonando ahora" con ecualizador, barra de progreso fluida y un **anillo de cuenta atrás hasta el cierre** que pasa de verde a cian, ámbar y rojo.
  - **Ranking animado:** las canciones suben y bajan con animación, los puntos ruedan y salta un "+N" al sumar. Las burbujas son los emojis del equipo, y aparecen las etiquetas TUYA y TU EQUIPO.
  - **Botón principal** que cambia según tu situación: "Pedir canción", "Tu canción va #2", "Pide en 12:03" o "¡La tuya va después!".
- **Buscar y pedir:** hoja inferior que se cierra arrastrando, con búsqueda mientras escribes. Si la canción ya estaba pedida, te une a su equipo.
- **Ficha de canción:** carátula grande, puntos, equipo, y botones para apoyar o jugar.
- **Duelo VS a pantalla completa:**
  - Las carátulas entran desde los lados y el "VS" cae de golpe con el contador.
  - **La frontera diagonal entre el cian y el rosa se mueve según quién va ganando**, como un tira y afloja.
  - En los 10 últimos segundos, el contador tiembla.
  - Se puede minimizar a una **barra de duelo** fija arriba.
- **Celebración de la ganadora:** confeti, carátula y quién la pidió, y aviso de que la perdedora se queda con sus puntos para la revancha.
- **Minijuegos** (pantalla completa con cuenta atrás 3-2-1 sincronizada con el servidor):
  - **Machaca el botón:** botón gigante con ondas en cada toque y niveles.
  - **Reflejos:** 5 rondas; tocar antes de tiempo penaliza.
  - **Crono a ciegas:** el reloj se emborrona a los 3 s.
- **Dosis:** al escanear el QR de la dueña se abre `/?dosis=CÓDIGO` y eliges a qué canción se la das.
- Vibración en los momentos clave (en Android; iPhone no vibra desde la web).

**Panel de la dueña** (`/admin`):
- Entrada con PIN mediante un teclado numérico.
- Abrir la barra y cerrar la noche (con doble toque para confirmar).
- **Dar dosis:** un QR enorme que caduca en 90 s y se cierra solo al canjearse.
- **Happy hour** con un toque.
- Estado de Spotify, botón para conectar la cuenta, saltar canción y avisos de error.
- Ranking con botón para quitar canciones, lista de gente con botón para bloquear, ajustes con deslizadores y lo que ha sonado.

**Cartel** (`/cartel`): un A3 listo para imprimir, con el logo, "¡TÚ PONES LA MÚSICA!", un QR grande con la cruz LED en el centro, los 3 pasos y el aviso de la dosis.

**Comprobado con capturas automáticas en tamaño móvil:**
- Recorrido completo: entrada, pantalla principal, búsqueda, ficha, minijuego, resultado, duelo, barra de duelo, ganadora, votaciones cerradas, panel, QR de la dosis y cartel (también exportado a PDF A3).
- Corregido a raíz de las capturas: unos recuadros oscuros detrás de los contadores (los causaba el desenfoque de fondo combinado con el brillo), el cartel que se salía del A3 y el botón de apoyar que salía desactivado sin explicar por qué.

**Rendimiento:** el panel y el cartel se cargan aparte. El cliente descarga unos 146 KB comprimidos.

## 10/11/2026 · Preparado para Fly.io

- `Dockerfile` en dos fases con Node 24 Alpine: se compila la web y la imagen final solo lleva el servidor y la web compilada.
- `fly.toml`:
  - App `barmagames`, región Madrid (`mad`).
  - **Máquina siempre encendida** (`auto_stop_machines = "off"`), porque el bucle de Spotify no puede dormirse.
  - Volumen `/data` para el estado.
  - Las claves van como `fly secrets`.
- **Sin probar todavía:** en este PC no hay Docker ni la herramienta de línea de comandos de Fly (`flyctl`). Los pasos están en el README.
- `README.md` con cómo arrancar, conectar Spotify y publicar.

### Siguiente paso
1. Sergio pega sus claves de Spotify en `.env` y cambia `ADMIN_PIN`.
2. `npm run dev`, abrir `http://127.0.0.1:5173/admin`, **Conectar Spotify**, poner música en el móvil y probar el ciclo real: búsqueda, duelo y que la ganadora entre en la cola a su hora.
3. Después: fotos en el VS, más minijuegos (carátula pixelada, memoria, círculos al ritmo, trivia) y publicar en Fly.

## 10/11/2026 · Spotify real conectado

- Sergio pegó sus claves en `.env` y cambió el PIN.
- **Conexión:** con un acceso de administración sacado del PIN (sin mostrarlo) se abrió `/auth/login` en el navegador. Sergio aceptó y Spotify quedó conectado con la cuenta **Sergio Sbk**.
- **Comprobado:** el servidor ve lo que suena (*Fucked Up* de AVAION, con su progreso y si está en pausa) y abre la ronda. La búsqueda trae canciones reales.
- **Fallo encontrado y arreglado:** la búsqueda daba `403 Insufficient client scope`. La causa era el parámetro `market=from_token`, que exige un permiso extra (`user-read-private`). Ahora se usa un país fijo, **`SPOTIFY_MARKET`** (por defecto `ES`), que además filtra las canciones que no están disponibles en España.
- **Otro problema:** había **dos copias arrancadas a la vez**, `npm run dev` y `npm run dev:mock`. Al reiniciarse, el simulador se quedó con el puerto 3000, y las dos compartían `data/state.json`. Paré la del simulador. Ahora el servidor avisa claramente si el puerto ya está ocupado.
- **Aviso:** el `hydrogen dev` de deportes_tiempo_libre también escucha en el puerto 3000, pero solo en `[::1]`. No choca porque usamos `127.0.0.1`; con `localhost` sí podría liarse.
- **Pendiente de probar con música sonando:** que la ganadora entre en la cola de Spotify a su hora.

## 10/11/2026 · Hosting gratis para probar (investigación)

Lo que necesitamos: un proceso **siempre encendido** (el bucle que vigila Spotify), WebSockets, HTTPS y, si se puede, que se guarde `data/` (los tokens de Spotify).

| Opción | Gratis | ¿Se duerme? | Disco | Comentario |
|---|---|---|---|---|
| **PC de Sergio + Cloudflare Quick Tunnel** | Sí, sin cuenta | No (mientras el PC esté encendido) | El del PC | Sin tocar código. La URL `*.trycloudflare.com` cambia en cada arranque. Máximo 200 peticiones simultáneas. Pensado para pruebas. |
| **Northflank Sandbox** | Sí | **No**: 2 servicios siempre encendidos | Por confirmar | La mejor opción gratis en la nube, con Docker. |
| Render Free | Sí | Sí, tras 15 min sin tráfico | **Se borra** al reiniciar | Habría que reconectar Spotify cada vez. |
| Koyeb Free | Sí (1 instancia, 0,1 vCPU) | Sí, tras 1 h, y no se puede desactivar | — | Comprado por Mistral en 2026. |
| Railway | Prueba de 5 $ una sola vez | — | — | El plan de pago empieza en 5 $ al mes. |
| Oracle Always Free | Sí (VM ARM, reducida en agosto de 2026) | Recupera las máquinas poco usadas | Sí | Pide tarjeta y montar un servidor; nuestra app consume tan poco que corre riesgo de que se la quiten. |
| Fly.io (destino final) | No (solo prueba) | Configurable | Volumen | Unos 2,19 $ al mes por la máquina pequeña, más el volumen. |

**Recomendación:**
1. **Para la primera prueba en el bar:** el PC de Sergio con un Cloudflare Quick Tunnel. Coste cero y nada que cambiar.
2. **Para tenerlo en la nube gratis unas semanas:** Northflank Sandbox, con un subdominio tipo `barma.iamsergio.dev`. Los DNS del dominio están en Vercel, así que bastaría un CNAME.
3. **Cuando vaya bien:** Fly.

Para que funcione en sitios donde el disco se borra, convendría permitir que el token de Spotify se lea también de una variable de entorno.

## 10/11/2026 · Rediseño visual: «La tragaperras del bar»

**Por qué:** a Sergio no le gustaba la primera interfaz. Le sobraba texto, todo eran cajas iguales, parecía una app genérica y no se veía qué hacer. Pidió algo **más visual y conciso**, que al entrar se sepa qué hacer **solo con mirarlo**, y que se usaran las skills de diseño (Impeccable y taste-skill).

**Método (Impeccable v4.8.2, actualizada en esta sesión):**
1. **PRODUCT.md** (`web/PRODUCT.md`), confirmado con Sergio:
   - La primera acción es **pedir canción**.
   - Se conservan el logo y sus colores, la jerga de farmacia y el duelo VS con la frontera móvil.
   - La cruz LED de farmacia deja de ser obligatoria.
2. **Tirada de dirección** (semilla `ca958849`) y página de decisión con alternativas: máquina de discos, panel de estación, cartel Crouwel… **Sergio eligió «La tragaperras del bar».**
3. **Contrato de dirección** en `web/.impeccable/surfaces/src-client-home-tsx.md`.
4. **Construcción directa en código:** en este PC no hay generador de imágenes, así que no hubo bocetos previos.
5. **Revisión:** dos rondas de capturas, el detector de Impeccable (que acabó sin hallazgos) y un revisor final independiente.

**El mundo visual:**
- **Mueble y luces:** mueble negro, **cristal cian retroiluminado** con letra negra impresa, **bombillas ámbar**, **contadores LED de 7 segmentos** (fuente DSEG7, con los segmentos apagados visibles detrás) y **pulsadores** con recorrido al pulsarlos. El **rosa** es solo para el rival del duelo.
- **Tipografías:** Bungee para los rótulos y Archivo (variable en anchura) para el texto. Se eliminaron Unbounded y Manrope.
- **Iconos:** Phosphor. Se acabaron los emojis usados como iconos; los emojis quedan solo como avatar elegido por cada cliente.

**Lo que cambia en la pantalla:**
- **Arriba:** marquesina de bombillas, el logo y tu alias.
- **Ventana SUENA:**
  - Cristal cian con la carátula y un **LED con la cuenta atrás al cierre**.
  - Una sola línea con la regla: «La primera suena después».
  - En el duelo, el cristal se parte en cian y rosa.
- **Ranking como escalera de premios:**
  - El nº 1 va en cristal encendido y cada peldaño lleva sus puntos en LED.
  - Un **pulsador «+1» a la vista** en cada canción: votar ya no exige abrir nada.
  - Tu canción va **rodeada a rotulador**.
  - El peldaño **destella en ámbar** cuando suma puntos.
- **Panel de pulsadores abajo:**
  - **«PIDE TU CANCIÓN»** grande, que **respira luz** mientras no hayas pedido.
  - **JUGAR** en ámbar, con tus créditos como bombillas.
  - Cuando ya has pedido, el pulsador grande dice en qué puesto va tu canción, o cuánto falta para que puedas pedir otra.
- **Resto de pantallas:**
  - **Juegos bonus:** dificultad en bombillas, puntos en LED y cuenta atrás LED.
  - Al ganar: **«¡Premio!»** con fichas cayendo y el sello «Suena después».
  - **Bar cerrado:** la máquina apagada con el sello «Cerrado».
  - **Cajones** (pedir, ficha, juegos, dosis) con un filo cian y botón de cerrar.
- **Textos:** recortados a lo mínimo, sin guiones largos.
- **Corregido tras las capturas:** el ordinal «º» en Bungee se leía como una «Q». Ahora se usan «La primera» y «Puesto 2».

**Fuera de este rediseño:** el panel de la dueña (`/admin`) y el cartel (`/cartel`) mantienen de momento el estilo anterior. Usan los nuevos colores base, pero no se han rediseñado.

### Revisión final del rediseño
- **Primera revisión** del revisor independiente de Impeccable: **«fix»**. Validó el mundo (LED, bombillas, sellos, rotulador, el VS), pero pidió 8 arreglos:
  1. La escalera todavía parecía una lista de tarjetas sueltas.
  2. Los +1 eran tan cian como PIDE.
  3. PIDE medía 88 px en vez de 96.
  4. Los juegos eran tarjetas de icono más texto.
  5. El duelo aparecía dos veces.
  6. La celebración dejaba ver el fondo.
  7. Tu canción quedaba tapada por el panel, y había dos animaciones a la vez.
  8. La elección de dirección no estaba guardada.
- **Arreglado en un solo lote:**
  - La escalera es **una sola columna de cristal**: peldaños separados por filetes, **una bombilla por peldaño** (destella al sumar), el nº 1 encendido y el resto en «cristal apagado».
  - Los +1 son **teclas oscuras con luz ámbar**.
  - PIDE y JUGAR miden **100 px**.
  - Los juegos son **tres pulsadores cuadrados** (icono, nombre, récord en LED y dificultad en bombillas).
  - Con el duelo minimizado, la ventana SUENA ya no lo repite.
  - La celebración tiene **fondo opaco**.
  - Al pedir, **tu canción se desplaza a la vista**.
  - La elección queda guardada en `web/.impeccable/answer.txt` con las palabras de Sergio.
  - Extra: el cristal lleva un **filete serigrafiado** en el borde.
- **Segunda revisión:** los **8 arreglos resueltos**. Detectó una regresión, los títulos cortados en los peldaños, que se arregló dejando el título en dos líneas. La comprobé yo con una captura; el revisor no la volvió a revisar.
- El **detector** de Impeccable terminó sin hallazgos.
- **DESIGN.md:** lo está generando el documentador de Impeccable a partir del código construido.

### DESIGN.md y cierre del rediseño
- El documentador de Impeccable escribió **`web/DESIGN.md`**, en español, y el archivo de tokens **`web/.impeccable/design.json`**. Recoge:
  - **Paleta:** cian `#19c3ff` (cristal), ámbar `#ffc23d` (luz, premios y créditos), rosa `#ff3d8b` (solo para el rival) y tinta `#0b0c0e`.
  - **Tipografías:** Bungee, Archivo y DSEG7.
  - **Radios:** 3, 4, 6 y 14 px, y redondo.
  - **Reglas con nombre:** Rival Rosa, Tinta, Contador, Un Solo Rótulo y Luz Propia.
- **Arreglado tras su informe:** las bombillas encendidas salían **cuadradas** (a `bulb-on` le faltaba el redondeo), y había una condición muerta en NowPlaying.
- **Pendiente de limpieza (no bloquea):**
  - El detector, ahora que existe DESIGN.md, avisa de 66 tamaños de letra y 9 colores escritos a mano que no están en la escala formal. Toca pasarlos a tokens.
  - También los degradados con colores sueltos en `index.css` y el botón de TapGame, que no usa `pulsador`.
  - Queda código heredado que solo usan el panel y el cartel: CountdownRing, AnimatedNumber, LedCross, Backdrop y las clases `text-glow-*`.
- **Pendiente de rediseño:** el panel de la dueña (`/admin`) y el cartel (`/cartel`).
- **Comprobado:** `npm test` (51 de 51) y los tipos, en verde.

## 10/11/2026 · Rediseño del panel de la dueña: «Mando a distancia»

- **IP del PC de Sergio** en la red de casa: **192.168.0.12** (Ethernet). Desde el móvil, con la misma wifi: juego en `http://192.168.0.12:5173` y panel en `http://192.168.0.12:5173/admin`.
- **Método (Impeccable):** el mundo visual ya estaba fijado, así que solo se decidió la estructura. La tirada (semilla `seed:7c618c4ed3390774`) repartió tres opciones: Mando a distancia, Feed de avisos y La vista del cliente con mando. **Sergio eligió «Mando a distancia».** El contrato está en `web/.impeccable/surfaces/src-admin-adminapp-tsx.md`.
- **El panel nuevo** (`web/src/admin/AdminApp.tsx`):
  - **PIN:** teclado de pulsadores; las cifras escritas se encienden como bombillas en una ventanilla LED.
  - **Arriba:** la tira SUENA, con un piloto de Spotify (bombilla ámbar si va bien, rosa si hay problema), la carátula, quién va después y la cuenta atrás LED. Si Spotify falla, sale un aviso rosa con botón de conectar.
  - **Botonera:**
    - **DOSIS** en el centro: el único pulsador de cristal cian, que respira luz con la barra abierta y lleva sus puntos en LED.
    - **HAPPY** a la izquierda, ámbar cuando está activa.
    - **SALTAR** a la derecha, que pide un doble toque.
  - **Debajo:** tres teclas de cajón (RANKING y GENTE con su contador LED, y AJUSTES) y la tecla de **NOCHE**. Cerrar pide confirmación y se pone rosa con «Se borra todo. ¿Cerrar?». Abrir es un cristal cian que respira.
  - **Cajones:**
    - **Ranking:** la canción que va después estampada, cada peldaño con su botón de quitar, y lo que ha sonado.
    - **Gente:** quién está conectado (con bombilla), bloquear y desbloquear a todos.
    - **Ajustes:** cuenta de Spotify y el botón para conectar o cambiarla, los deslizadores con su valor en LED, el filtro de explícitas y el botón para imprimir el cartel.
  - **QR de la dosis:** sobre metal, con los puntos y los segundos que le quedan en LED, y el sello «¡Canjeada!» o «Caducada».
- **Corregido tras las capturas:** «ENTRAR» no cabía en su tecla (ahora es una flecha), y el QR de la dosis no aplicaba el ×2 de la happy hour.
- **Primera revisión independiente:** **«fix»**, con 8 arreglos:
  1. La botonera estaba arriba y no al alcance del pulgar.
  2. La semilla estaba mal referenciada en el contrato.
  3. Los ajustes usaban deslizadores del navegador.
  4. El LED se quedaba en 0:00 con la siguiente canción ya en cola.
  5. Los dos LED de la dosis no decían qué eran.
  6. Faltaba el «(%)».
  7. El piloto de Spotify se confundía con las bombillas.
  8. Las teclas de cajón estaban desalineadas.
- **Arreglado en un solo lote:**
  - **Botonera anclada abajo**, con la tira SUENA arriba y el hueco en medio.
  - Ajustes con **pulsadores −/+ y el valor en LED**.
  - El LED pasa a mostrar el tiempo que le queda a la canción una vez cerrada la votación.
  - La dosis marca «PTS» y el tiempo en m:ss con un icono de reloj.
  - Logo de Spotify sobre el piloto.
  - Teclas de cajón alineadas.
  - Extras: el sello rosa «Cerrado» en la tira y la marquesina de bombillas corriendo durante la happy hour.
- **Segunda revisión:** 7 de 8 resueltos. El del LED estaba bien en el código pero sin captura que lo demostrara. Forcé ese estado en el simulador: la tira muestra «Después: Amiga mía» y el LED cuenta 1:44 (`web/.impeccable/review/admin/a9-locked.png`). Esto lo comprobé yo; el revisor no volvió a mirarlo.
- `DESIGN.md` amplía la sección de componentes con el mando de la dueña y el ajuste −/+.
- `npm test`: 51 de 51.

---

## 10/11/2026 · Cierre del día

**A Sergio le gusta cómo ha quedado la interfaz** (el cliente como «tragaperras del bar» y el panel como «mando a distancia»). Se para aquí y se sigue mañana.

**Estado al cerrar:**
- **Juego completo** con Spotify real conectado (cuenta de Sergio, catálogo `ES`). El servidor tiene el motor del juego, el bucle que vigila Spotify, las dosis y los bloqueos. `npm test` pasa 51 de 51.
- **Interfaz del cliente y panel de la dueña** rediseñados con Impeccable y revisados. Contexto de diseño en `web/PRODUCT.md`, `web/DESIGN.md` y `web/.impeccable/`.
- **Cómo arrancarlo:**
  - `npm run dev` levanta el servidor en `:3000` y la web en `:5173`. `npm run dev:mock` usa el simulador. **No arrancar los dos a la vez.**
  - En el móvil (misma wifi): `http://192.168.0.12:5173` (juego) y `/admin` (panel).
- **Git:** repositorio local en `main`, todavía **sin ningún commit**. Sergio no ha pedido hacerlo.
- **Impeccable** está actualizado a v4.8.2. La actualización dejó hooks en `~/.claude/settings.json` y las carpetas `.gemini/` y `.codex/` en el proyecto.

**Para mañana (por orden):**
1. **Probar la cola con música sonando:** que la ganadora entre sola en la cola de Spotify unos 20 s antes del final.
2. **Túnel de Cloudflare** (opción 1 de hosting gratis) para probarlo en el bar. Hay que instalar `cloudflared` con winget. Ojo: la URL `trycloudflare` cambia en cada arranque, así que el QR del cartel tendría que generarse en el momento.
3. **Rediseñar el cartel** (`/cartel`) con el estilo de la tragaperras.
4. **Limpieza técnica:**
   - Pasar a tokens los tamaños de letra y colores escritos a mano (avisos del detector frente a DESIGN.md).
   - Borrar los componentes antiguos que ya no usa nadie (CountdownRing, AnimatedNumber, LedCross, Backdrop).
   - Hacer que el botón de TapGame use `pulsador`.
5. **Funciones pendientes:**
   - Fotos (selfie) en el VS.
   - Más minijuegos: carátula pixelada, memoria, círculos al ritmo y trivia.
   - Más adelante, publicar en Northflank o Fly.

---

## 11/11/2026 · Minijuegos un pelín más difíciles

A Sergio le gusta cómo se ven los juegos, pero los quería **un poco más difíciles sin cambiar la mecánica**. Solo se han tocado los umbrales y los tiempos (servidor y web, para que las bombillas cuadren con los puntos):

| Juego | Antes | Ahora |
|---|---|---|
| **Machaca el botón** (toques en 10 s para 1/2/3 pts) | 25 / 60 / 95 | **35 / 70 / 105** |
| **Reflejos** (media en ms para 3/2/1 pts) | 260 / 330 / 450 | **240 / 300 / 400** |
| Reflejos: espera antes de «¡Ya!» | 0,9–2,6 s | **1–3,5 s** (más difícil de adivinar) |
| Reflejos: castigo por salida en falso | 1000 ms | **1200 ms** |
| **Crono a ciegas** (error en ms para 10/7/5/3/1 pts) | 30 / 80 / 150 / 300 / 600 | **20 / 60 / 120 / 250 / 500** |
| Crono: el reloj se ve hasta | 3 s | **2 s** |
| Crono: «¡Clavado!» | ≤ 30 ms | **≤ 20 ms** |

- La partida de Reflejos dura ahora 24 s en el servidor (antes 20), porque las esperas son más largas.
- La prueba de humo usa 110 toques para los 3 puntos. `npm test`: todo OK. Tipos en verde.

## 11/11/2026 · Arreglo: el buscador se escapaba al abrir «Pide tu receta» en el móvil

- **Fallo (visto por Sergio en el móvil):** al pulsar para pedir canción, el cajón se subía, la pantalla bajaba y había que hacer scroll para encontrar la barra de búsqueda.
- **Causas:**
  1. El buscador tenía `autoFocus` y cogía el foco mientras el cajón aún entraba desde abajo. Como el buscador seguía fuera de la pantalla, el navegador desplazaba la página para enseñarlo.
  2. El cajón medía `92dvh`, que no encoge con el teclado (en iOS el teclado no redimensiona la página), así que el teclado lo tapaba y el navegador volvía a desplazar la página.
- **Arreglo:**
  - **`Sheet.tsx`:** los cajones se pegan al hueco visible de verdad (`visualViewport`: altura y desplazamiento) y bloquean el scroll del fondo mientras están abiertos. Con el teclado fuera, el cajón cabe justo encima y el buscador queda arriba, a la vista. Vale para todos los cajones, también los del panel.
  - **`SearchSheet.tsx`:** el foco se da con `focus({ preventScroll: true })` en vez de `autoFocus`.
- Tipos y build en verde. **Falta probarlo en el móvil de Sergio**: el teclado real no se puede simular desde el PC.

## 11/11/2026 · Cerrar la noche saca de verdad a la gente

- **Fallo (visto por Sergio):** al cerrar la noche y volver a abrirla enseguida, el móvil seguía mostrando el usuario de antes. El servidor ya lo había borrado, pero el móvil, que seguía conectado, lo conservaba en memoria. Ese usuario no podía hacer nada: cualquier acción fallaba con «sesión caducada».
- **Arreglo (`server/src/index.ts`, `admin:night`):** al cerrar, cada móvil conectado suelta su usuario, sale de su sala y recibe `session:expired`. El móvil borra su token y, al reabrir, pide alias nuevo. Los que tenían la pantalla apagada ya funcionaban bien: al reconectar, su token no existe y también se les pide alias.
- Lo mismo al bloquear a alguien: ahora también sale de su sala.
- **Prueba de humo ampliada:** al cerrar, cada móvil pierde su usuario; tras reabrir, Ana no puede jugar sin alias y vuelve a entrar con el mismo nombre. Todo OK.

---

## 11/11/2026 · Decisiones de Sergio y plan

- **La cola de Spotify funciona** con música sonando (lo ha comprobado Sergio).
- **Hosting:** se monta **directamente en Fly**; se descarta el túnel de Cloudflare.
- **El repositorio ya está en GitHub** (`chenifero/juego_canciones`), subido por Sergio. Primer commit: `6f30d9a`.
- **Orden:**
  1. Funciones nuevas (selfie en el VS y más minijuegos).
  2. Limpieza técnica.
  3. Desplegar en Fly.

## 11/11/2026 · Selfie en el VS y cuatro minijuegos nuevos

### Selfie
- Es **opcional**. En la entrada, la cara que hay junto al nombre se toca para abrir la cámara frontal. Después se puede poner, cambiar o quitar desde el chip del alias («Tu cara»). En tu propia canción aparece el botón «Pon tu cara en el VS».
- El móvil recorta la foto al cuadrado del centro y la deja en **320×320 JPEG** (unos 25 KB). El servidor solo acepta un JPEG de verdad (con la cabecera correcta) de menos de 120 KB, como mucho una foto cada 3 s.
- Se guarda en `data/fotos/<usuario>.jpg` y se sirve en `/api/fotos/...?v=N`.
- **Se borran todas al cerrar la noche.** Al bloquear a alguien también se borra la suya. La dueña puede quitar cualquier foto desde el cajón **Gente**.
- **Dónde sale:**
  - En el **VS**: la cara de quien pidió la canción crece a 68 px.
  - En las burbujas del equipo, en el peldaño del ranking, en SUENA, en la ganadora y en el panel.
  - Sin foto, sale el emoji de siempre (componente `Avatar`).

### Minijuegos (ahora son 7)

| Juego | Cómo se juega | Puntos (máx.) |
|---|---|---|
| **Memoria** | 12 cartas (6 parejas de botica y barra) en 40 s | ≤18 s: 4 · ≤25 s: 3 · ≤32 s: 2 · terminada: 1 |
| **Al ritmo** | 18 círculos; tocarlos cuando el aro ámbar encaja. El ritmo se ve en las bombillas | Clavado 3 / bien 2 / justo 1 por círculo; de 54: ≥46: 5 … ≥14: 1 |
| **Carátula** | 3 carátulas que empiezan pixeladas y se aclaran en 7 s; 4 opciones | 2 si aciertas antes de 3 s, 1 si después (máx. 6) |
| **Trivia** | 5 preguntas («¿Quién canta…?» y «¿Cuál es de…?»); 8 s cada una | 1 por acierto (máx. 5) |

- **Carátula y Trivia sin trampas:**
  - Las preguntas las monta el servidor (`server/src/quiz.ts`) y la respuesta buena nunca llega al móvil.
  - Cada respuesta se manda con `game:answer` y el servidor dice cuál era la buena para enseñarla.
  - Los puntos los cuenta él, sin fiarse de lo que mande el móvil.
- **De dónde salen las canciones de las preguntas:**
  - Primero las de esta noche: ranking, cola y lo que ha sonado.
  - Luego lo que se ha buscado.
  - Si aún hay poco, el servidor hace 12 búsquedas de reserva (Hombres G, Estopa, Mecano…) una vez por hora.
  - En el simulador se usa todo su catálogo.
- **Selector:** rejilla de 3 columnas con los 6 juegos y el **Crono a ciegas** a todo lo ancho, como el premio gordo de la máquina.
- **La pantalla de juego** se limita a la columna de la máquina (`max-w-lg`), también en escritorio.
- **Comprobado en el navegador con el simulador:**
  - Memoria (hasta que se acaba el tiempo).
  - Al ritmo.
  - Carátula: acierto rápido → +2.
  - Trivia.
  - El VS con selfies.
  - Corregido de paso: los rótulos «Fuera/¡Clavado!» de Al ritmo ahora se desvanecen solos, y la cara del VS ya no roza los puntos.
- **Prueba de humo ampliada** (79 comprobaciones), todo OK:
  - Que la respuesta buena no viaja al móvil.
  - Que no se puede contestar en la cuenta atrás ni de más.
  - Que sin aciertos no suma aunque el móvil mande 99.
  - Que se rechaza la memoria terminada en 1 s.
  - Selfie: rechazo de no-JPEG, la foto se ve, sale en el ranking, la dueña la quita y se borra al cerrar.
- **Revisión final de Impeccable** (revisor independiente, solo código): **«fix»**, con 8 arreglos. Están todos aplicados:
  1. El metrónomo de Al ritmo marcaba a contratiempo. Ahora el paso cae en el golpe.
  2. Con movimiento reducido, las bombillas del metrónomo destellan juntas en vez de correr.
  3. La ronda de Carátula y Trivia va en LED (Regla del Contador).
  4. Al revelar, la buena va en **ámbar** y no en cian: cian y rosa juntos son el VS (Regla del Rosa Rival). Además, DESIGN.md añade «fallo en un minijuego» a los usos del rosa como alarma.
  5. El dorso de la memoria lleva la cruz de la botica, no la pastilla (que es uno de los símbolos).
  6. El LED del tiempo late en rosa en la recta final.
  7. La pregunta de la trivia va en bisel con cristal dentro.
  8. Accesibilidad: cada carta dice su símbolo y el canvas lleva `role="img"`.
- **Capturas a 390×844** (Chrome sin ventana manejado por DevTools, porque la extensión de Chrome se desconectó) en `web/.impeccable/review/juegos/` y las hojas `juegos-hoja1.jpg` y `juegos-hoja2.jpg`. Cubren:
  - la entrada con selfie, la portada con caras, «Tu cara» y el selector;
  - los 4 juegos, con su resultado;
  - Carátula y Trivia reveladas;
  - el VS con selfie.
- **Retoques tras mirarlas:**
  - El aro de Al ritmo ya no se corta contra el borde.
  - La carátula es más grande (hasta 300 px) para no dejar hueco.
  - El selfie del VS no pisa título ni puntos.
- `DESIGN.md` gana las secciones **Cara (avatar)** y **Minijuegos**. `PRODUCT.md` recoge los 7 juegos y el selfie.
- La revisión de diseño no se ha repetido después de los arreglos.
- Tipos, build y `npm test` en verde.

## 13/11/2026 · Commit y cartel nuevo

- **Commit `76a2df1`:** selfie en el VS y los 4 minijuegos nuevos (27 archivos).
- **Cartel `/cartel` rediseñado** como el frontal de la máquina, según `DESIGN.md`:
  - Bisel de metal con hileras de bombillas arriba y abajo, logo, cristal cian con «¡TÚ PONES LA MÚSICA!» en tinta y QR sobre placa de papel con el logo en el centro.
  - Tres pasos en cristal apagado con su número en LED y tira ámbar con «Pide tu dosis en la barra».
  - Fuera los emojis, el verde y la cruz LED. La dirección web va en Archivo (el LED solo para cifras).
  - Comprobado en pantalla a 600 px de ancho (cabe entero en proporción A3). **Falta** probar la impresión real y que el QR se lea desde el móvil.
- Siguiente: limpieza técnica y desplegar en Fly.

## 13/11/2026 · Carátula con álbumes famosos

- **Cambio pedido por Sergio:** la Carátula ya no usa canciones de la cola ni de las búsquedas (a veces la portada no era reconocible o fallaba). Ahora son **portadas de álbumes famosos**.
- **Cómo funciona:**
  - `server/src/albums.ts` tiene una lista de 42 álbumes (Abbey Road, Thriller, Nevermind, Motomami, Descanso Dominical…).
  - Las portadas se buscan en Spotify una sola vez (`searchAlbums`) y se guardan en memoria; si salen pocas, se reintenta pasada 1 h.
  - La pregunta es «¿Qué álbum es?», con 4 opciones (álbum + artista) de artistas distintos. Se enseña el nombre limpio de la lista, no «(Deluxe Edition)».
  - La Trivia sigue usando las canciones de la noche.
- **Comprobado con Spotify real:** 42 de 42 portadas encontradas. Tipos y `npm test` en verde (el simulador genera carátulas a partir del nombre).
- Para añadir o quitar álbumes, basta con editar `FAMOUS_ALBUMS`.

## 13/11/2026 · Suelo de puntos para la perdedora del duelo

- **Problema:** la perdedora de un duelo conservaba solo el 50 % de sus puntos (p. ej. 16 → 8) y una canción nueva entra con 10, así que se colaba por delante de la que casi suena.
- **Arreglo:** en `lock()` (`server/src/engine.ts`) la perdedora queda con `max(basePoints, mitad)`: nunca por debajo de una canción nueva.
- La prueba de humo ya cubre el caso (16 → 10). Tipos y `npm test` en verde.

## 13/11/2026 · Bombilla del ranking y entrada sin emojis

- **Ranking:** la bombilla del peldaño iba pegada al borde izquierdo del cristal. La columna pasa de 24 a 40 px (también en la escalera vacía).
- **Entrada:** fuera los emojis. Arriba, un **selfie grande** (círculo de 128 px con cámara y un «+»); debajo, el nombre. Quien no quiera foto entra solo con el nombre.
- **Sin foto:** la cara muestra la **inicial del nombre** (Bungee, cian) en lugar del emoji.
- **Limpieza:** el campo `emoji` desaparece del servidor, de los tipos compartidos, del panel de la dueña y de la prueba de humo. `npm test` y tipos en verde.

## 13/11/2026 · Vuelta al ranking: más dinámico y con rótulo de acción

- **Fuera el botón +1/+2** de cada peldaño. Se sigue pudiendo votar desde la ficha de la canción; el ranking empuja a jugar.
- **Rótulo grande (`Nudge`)** bajo la ventana SUENA: «¿Quieres que tu canción suene primero? Juega a los minijuegos». Cambia según quien mira (sin canción → «Pide tu canción»; vas primera → «No te la quiten»; sin partidas → desactivado; en equipo ajeno → únete).
- **Alarma de cierre (`Urgency`)**: en los últimos 10 s la pantalla se pone en rojo (viñeta que late), la columna tiembla cada segundo y el móvil vibra, más fuerte en los 3 últimos. El rótulo pasa a rojo con «¡Se acaba el tiempo! Juega ya», y los LED del tiempo a rojo.
- **Límites:** Safari en iPhone no permite vibrar desde una web, así que allí solo se ve (rojo y temblor). Android sí vibra.
- Tipos, build y `npm test` en verde. **Falta verlo en el móvil** con una canción a punto de cerrar (no se ha podido simular el final de canción en pantalla).

## 13/11/2026 · Alarma más roja y vibración en iPhone

- **Más rojo:** el borde de la alarma pasa de 70 a 140 px de grosor (220 px en los 3 últimos segundos) y se añade un velo rojo sobre toda la pantalla. Comprobado en una captura de prueba: ahora se ve de sobra.
- **Vibración:** Safari en iPhone no tiene `navigator.vibrate`. `vibrate()` (en `web/src/lib/util.ts`) usa ahora el toque háptico de un interruptor nativo (`<input switch>`, iOS 17.4+) cuando falta la vibración normal. Patrones más largos en la alarma (3 pulsos).
- **Confirmado por Sergio (iPhone): no vibra.** iOS solo da el toque háptico dentro de un gesto del usuario (un toque), no desde un temporizador, así que en iPhone la alarma es solo visual. En Android sí vibra. Para vibrar en iPhone haría falta una app nativa (p. ej. envolver la web con Capacitor).
