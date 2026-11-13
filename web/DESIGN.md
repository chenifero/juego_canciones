---
name: BarmaGames
description: La tragaperras del bar La Barmacia. Pides tu canción, sube por la escalera de premios y gana el duelo.
colors:
  cyan: "#19c3ff"
  glass-hi: "#7fe0ff"
  glass-lo: "#0f9fd6"
  amber: "#ffc23d"
  lamp-off: "#3a2f17"
  pink: "#ff3d8b"
  ink: "#0b0c0e"
  night: "#111317"
  panel: "#171a1f"
  panel-2: "#1f232a"
  line: "rgb(255 255 255 / 0.09)"
  mute: "#8d97a6"
  paper: "#f4f7fa"
  print: "#06121a"
typography:
  display:
    fontFamily: "Bungee, Archivo Variable, sans-serif"
    fontSize: "44px"
    fontWeight: 400
    lineHeight: 1
  headline:
    fontFamily: "Bungee, Archivo Variable, sans-serif"
    fontSize: "18px"
    fontWeight: 400
    lineHeight: 1
  title:
    fontFamily: "Archivo Variable, system-ui, sans-serif"
    fontSize: "16px"
    fontWeight: 800
    lineHeight: 1.1
    fontVariation: "'wdth' 88"
  body:
    fontFamily: "Archivo Variable, system-ui, sans-serif"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.5
    fontFeature: "'tnum' 1"
  label:
    fontFamily: "Bungee, Archivo Variable, sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.15
  counter:
    fontFamily: "DSEG7, ui-monospace, monospace"
    fontSize: "24px"
    fontWeight: 700
    lineHeight: 1
rounded:
  stamp: "3px"
  well: "4px"
  machine: "6px"
  drawer: "14px"
  round: "9999px"
spacing:
  bezel: "3px"
  deck: "12px"
  page: "16px"
  sheet: "20px"
components:
  pulsador-pide:
    backgroundColor: "{colors.cyan}"
    textColor: "{colors.print}"
    typography: "{typography.label}"
    rounded: "{rounded.machine}"
    height: "100px"
  pulsador-jugar:
    backgroundColor: "{colors.amber}"
    textColor: "{colors.print}"
    typography: "{typography.label}"
    rounded: "{rounded.machine}"
    height: "100px"
    width: "104px"
  pulsador-secundario:
    backgroundColor: "{colors.cyan}"
    textColor: "{colors.print}"
    typography: "{typography.label}"
    rounded: "{rounded.machine}"
    height: "64px"
  pulsador-voto:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.amber}"
    typography: "{typography.label}"
    rounded: "{rounded.machine}"
    height: "32px"
  ventanilla-led:
    backgroundColor: "#050607"
    textColor: "{colors.amber}"
    typography: "{typography.counter}"
    rounded: "{rounded.well}"
    padding: "6px 8px"
  campo-busqueda:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.print}"
    rounded: "{rounded.machine}"
    height: "56px"
    padding: "0 16px"
  cajon:
    backgroundColor: "{colors.night}"
    textColor: "{colors.paper}"
    rounded: "{rounded.drawer}"
    padding: "16px 20px"
  aviso-ok:
    backgroundColor: "{colors.amber}"
    textColor: "{colors.print}"
    rounded: "{rounded.machine}"
    padding: "12px 16px"
  aviso-error:
    backgroundColor: "{colors.pink}"
    textColor: "{colors.print}"
    rounded: "{rounded.machine}"
    padding: "12px 16px"
  aviso-info:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.print}"
    rounded: "{rounded.machine}"
    padding: "12px 16px"
  sello:
    textColor: "{colors.paper}"
    rounded: "{rounded.stamp}"
    padding: "1px 6px"
---

# Design System: BarmaGames

## Overview

**Creative North Star: "La tragaperras del bar"**

La pantalla del cliente es el frontal de una máquina de bar: mueble negro mate, paneles de cristal cian retroiluminado serigrafiados en negro, hileras de bombillas ámbar, contadores LED de 7 segmentos y pulsadores cuadrados con labio y luz interior. Todo lo que se toca es un pulsador, todo lo que cuenta es un LED, todo lo que está vivo se ilumina. Se lee de un vistazo, con una mano, a oscuras y con la música alta.

La densidad es de máquina, no de app: pocas piezas, grandes y físicas. El cristal encendido (cian) marca lo que importa ahora (lo que suena, el #1, el pulsador PIDE); el cristal apagado es el resto de la escalera. La luz ámbar es premio y crédito; el rosa existe solo para el rival del duelo. Los estados se estampan como sellos de goma y tu canción va rodeada a rotulador, el único gesto a mano dentro de la máquina.

El sistema rechaza la app de música oscura hecha de tarjetas con acento neón: aquí no hay tarjetas flotando, hay cristales dentro de un marco.

**Key Characteristics:**
- Cristal cian retroiluminado con tinta negra encima; nunca texto claro sobre cristal encendido.
- Marcos de metal oscuro (bisel) que contienen cristales y ventanillas, con 3px de borde visible.
- Números en LED de 7 segmentos con los segmentos apagados visibles detrás.
- Bombillas ámbar en hilera para créditos, niveles y ambiente; persiguen solo en momentos de espectáculo.
- Pulsadores cuadrados con labio inferior que se hunden 3px al pulsar.
- Sellos inclinados para estados y un círculo de rotulador para lo tuyo.

## Colors

Negro de mueble, cian de cristal, ámbar de bombilla y un rosa reservado al rival: los colores del logo (cian, blanco, negro) más la luz de la máquina.

### Primary
- **Cian cristal** (cyan): el cristal encendido. Ventana SUENA, peldaño #1, pulsador PIDE, pulsadores de acción principal, filete superior de los cajones, anillo de foco de campos, selección de texto y caret. Siempre como superficie luminosa con tinta `print` encima, o como color de número sobre fondo negro (posiciones en peldaños apagados).
- **Cian alto** (glass-hi) y **Cian bajo** (glass-lo): el centro y el borde del degradado radial del cristal; simulan el tubo de luz detrás. No se usan sueltos.

### Secondary
- **Ámbar bombilla** (amber): luz y premio. Dígitos LED, bombillas encendidas, pulsador JUGAR y botones de juego, avisos de éxito, sello de ganadora y anillo de foco global.
- **Bombilla apagada** (lamp-off): el vidrio ámbar sin corriente; base de las bombillas apagadas.

### Tertiary
- **Rosa rival** (pink): exclusivo del rival del duelo (cristal rosa en la escalera, mitad derecha de la ventana SUENA, mitad del VS). Por extensión, alarma: LED en los últimos 10 s, avisos de error, sello CERRADO y aviso de sin conexión.

### Neutral
- **Mueble** (ink): fondo de toda la pantalla y fondo de los pulsadores de voto.
- **Noche** (night): fondo de los cajones (sheets).
- **Panel** (panel) y **Panel 2** (panel-2): superficies sin luz dentro del mueble (chip del alias, botón cerrar, avatares sin foto).
- **Línea** (line): divisores entre filas de resultados.
- **Gris rótulo** (mute): texto secundario sobre negro.
- **Papel** (paper): texto principal sobre negro, campos de texto y avisos informativos.
- **Tinta de serigrafía** (print): todo texto, icono y filete que va sobre cristal o sobre ámbar.

### Named Rules
**La Regla del Rosa Rival.** El rosa es del rival del duelo. Fuera del duelo solo aparece como alarma (tiempo agotándose, error, cerrado, fallo en un minijuego); nunca como decoración ni como segundo acento. Por eso, al revelar una respuesta, la buena se enciende en ámbar (premio) y no en cian: cian y rosa juntos son el VS.

**La Regla de la Tinta.** Sobre cristal encendido o sobre ámbar, el texto es `print`. El texto claro solo vive sobre negro o sobre cristal apagado.

## Typography

**Display Font:** Bungee (con Archivo Variable)
**Body Font:** Archivo Variable (con system-ui)
**Label/Mono Font:** DSEG7 Classic Bold Italic (con ui-monospace), solo para cifras

**Character:** Bungee es la rotulación de la máquina: mayúsculas de letrero, sin pesos, para todo lo que está pintado en el mueble o en un pulsador. Archivo, comprimido (`font-stretch` 85-92 %) y pesado (800-900), pone los títulos de canción; DSEG7 pone los números como un contador real.

### Hierarchy
- **Display** (Bungee, 34-54px, 1): la gran cifra o palabra del momento. Posición de tu canción en el pulsador (44px), VS del duelo (34px), titular de ganadora (54px).
- **Headline** (Bungee, 18-24px, 1-1.15): títulos de sección y de cajón (Ranking, Juegos bonus 20px), mensajes vacíos, titular de entrada (24px).
- **Title** (Archivo 800-900, 16-24px, 1.05-1.1, ancho 85-92 %): títulos de canción. 16px en peldaños y resultados, 19px en SUENA, 20px en el duelo, 24px en ganadora. Hasta 2 líneas (`line-clamp-2`), nunca cortados a una.
- **Body** (Archivo 400-700, 15-16px): frases de ayuda y estados vacíos, en `mute` o `paper/70`. Artista y metadatos a 13-14px.
- **Label** (Bungee, 13-19px, interlineado 1.05-1.15): texto de pulsadores (PIDE 19px, JUGAR 15px, acciones de cajón 17-18px) y rótulos de estado en SUENA (14px, mayúsculas).
- **Counter** (DSEG7, 12-30px, 1): puntos, cuenta atrás y tiempos. Siempre dentro de una ventanilla LED.

### Named Rules
**La Regla del Contador.** Toda cifra que cambia en directo (puntos, tiempo, posición de juego) va en DSEG7 dentro de una ventanilla negra, con los "8" apagados detrás al 9 % de opacidad. Los números estáticos (posición del peldaño) van en Bungee.

**La Regla del Rótulo Único.** Nada se rotula dos veces: si la barra del duelo está a la vista, la ventana SUENA no repite el duelo.

## Layout

Una columna de máquina, de 512px de ancho como máximo (`max-w-lg`) y centrada, con 16px de margen lateral. De arriba abajo: hilera de bombillas (15 bombillas), marca y alias, ventana SUENA, escalera de premios y, fija abajo, la botonera.

La botonera es un bisel de 12px de relleno con dos columnas (`1fr` y 104px): PIDE ocupa todo lo que queda y JUGAR la columna estrecha, ambos de 100px de alto. Se funde con el fondo mediante un degradado de `ink` desde el 70 %, y la página reserva 192px abajo para no tapar la escalera.

Los peldaños tienen tres franjas: columna de bombilla (24px), contenido (posición, carátula de 52px, título y artista) y columna de contador con su pulsador de voto. Las piezas grandes se separan 12px; los grupos internos, 6-10px. Los cajones suben desde abajo con 20px de relleno lateral y alcanzan el 88 % (o el 92 % en búsqueda) de la altura.

En escritorio no cambia nada: la máquina sigue siendo una columna centrada sobre negro.

## Elevation & Depth

La profundidad es de objeto físico, no de capas flotantes. Casi todas las sombras son interiores: filetes, labios y pozos que dicen "esto está hundido" o "esto sobresale" dentro del mueble. Las sombras exteriores son pocas, oscuras y difusas (marco, cajón, aviso) o de luz de color (el resplandor de un pulsador iluminado).

### Shadow Vocabulary
- **Filete del cristal** (`inset 0 0 0 3px rgb(255 255 255 / 0.2), inset 0 0 0 4.5px rgb(6 18 26 / 0.45), inset 0 -18px 30px -18px rgb(0 0 0 / 0.35)`): el canto serigrafiado de todo cristal encendido.
- **Bisel** (`inset 0 1px 0 rgb(255 255 255 / 0.12), inset 0 -1px 0 rgb(0 0 0 / 0.6), 0 10px 24px -14px rgb(0 0 0 / 0.9)`): marco de metal que contiene cristales y la botonera.
- **Pozo LED** (`inset 0 2px 6px rgb(0 0 0 / 0.9), inset 0 0 0 1px rgb(255 255 255 / 0.06)`): ventanilla negra de los contadores.
- **Labio del pulsador** (`inset 0 -6px 0 rgb(0 0 0 / 0.22), inset 0 2px 0 rgb(255 255 255 / 0.55), 0 14px 30px -12px <resplandor>`): reposo. Al pulsar baja a `inset 0 -2px 0` y el pulsador se hunde 3px.
- **Resplandor** (`--pulsador-glow`): luz del color del pulsador bajo él (cian 0.5-0.55, ámbar 0.4-0.45); negro en pulsadores sin luz.
- **Bombilla encendida** (`0 0 10px 1px rgb(255 194 61 / 0.75)`) y **halo LED** (`text-shadow: 0 0 8px <color>`).
- **Cajón** (`0 -24px 60px -10px rgb(0 0 0 / 0.8)`) y **aviso** (`0 14px 30px -10px rgb(0 0 0 / 0.8)`).

### Named Rules
**La Regla de la Luz Propia.** Lo que está encendido brilla con su propio color; lo apagado no tiene resplandor. El brillo comunica estado, nunca decora.

## Shapes

Esquinas de máquina: casi rectas. Los marcos, pulsadores, campos y avisos usan 6px (`machine`); los cristales y ventanillas dentro de un marco, 4px; carátulas y sellos, 3px. El único radio grande es el canto superior del cajón (14px). Lo redondo es solo lo que es redondo en una máquina real: bombillas, avatares y los pulsadores circulares de los minijuegos.

Los marcos se construyen anidando: bisel con 3px de relleno, cristal dentro con 4px de radio. Los peldaños se separan con un filete de tinta (`print` al 60 %), no con hueco. El círculo de rotulador es la única línea irregular del sistema.

## Components

### Buttons (pulsadores)
Cuadrados, gordos y físicos: se hunden al tocarlos.
- **Shape:** esquinas casi rectas (6px), labio inferior de 6px y brillo de 2px arriba.
- **Primary (PIDE):** cristal cian encendido con tinta `print`, Bungee 19px, 100px de alto, a todo lo ancho que queda. Mientras puedas pedir, "respira" (`breathe`, 2,2 s): su resplandor cian crece y mengua.
- **Secondary (JUGAR y juegos):** ámbar con tinta `print`; JUGAR lleva sus créditos como bombillas debajo del rótulo.
- **Acción de cajón:** 64px de alto, cristal cian o ámbar, Bungee 17-18px.
- **Voto (+1):** 32px, fondo `ink`, rótulo ámbar y filete ámbar al 50 %.
- **Press / Disabled:** al pulsar baja 3px en 90ms con `ease-out-expo`; desactivado, gris al 70 % y brillo al 55 %.
- **Focus:** contorno ámbar de 3px separado 3px.

### Cards / Containers (marcos y cristales)
- **Corner Style:** bisel 6px, cristal interior 4px.
- **Background:** bisel en degradado de metal oscuro; cristal encendido (cian), apagado (azul petróleo oscuro) o rival (rosa).
- **Shadow Strategy:** ver Bisel y Filete del cristal.
- **Internal Padding:** 3px de bisel; 12px dentro de la ventana SUENA.

### Inputs / Fields
- **Style:** placa de `paper` de 56px de alto, 6px de radio, texto `print` en Archivo 700 18px, icono de lupa a la izquierda.
- **Focus:** anillo cian al 60 % de 4px.

### Navigation (cajones)
Cajones que suben desde abajo, sobre un velo `ink` al 80 %. Filete cian de 4px arriba, título en Bungee 20px y botón cerrar cuadrado de 40px en `panel-2`. Se cierran arrastrando, tocando fuera, con la X o con Escape.

### Ventanilla LED
Pozo negro con 4px de radio y dígitos DSEG7 ámbar con halo. Los segmentos apagados ("8") se ven detrás al 9 %. Cuando la cifra cambia, destella (brillo ×2,2 que se apaga en 0,6 s). En los últimos 10 s la cuenta atrás pasa a rosa y late.

### Escalera de premios
Una sola columna de cristal dentro de un bisel, un peldaño por canción. El #1 (o el lado A del duelo) es cristal encendido con la bombilla de su peldaño encendida; el rival es cristal rosa; el resto, cristal apagado. Durante el duelo los peldaños congelados bajan al 45 %. Cuando una canción suma, su peldaño y su bombilla destellan en ámbar (0,9 s). Los peldaños se reordenan con un muelle (380/32).

### Bombillas
Hileras de bombillas redondas: ámbar con brillo cuando están encendidas, vidrio marrón cuando no. Indican créditos y niveles (encendidas de izquierda a derecha) o ambiente; persiguen (paso de 140ms) solo en duelo, ganadora y entrada.

### Sello
Rótulo de estado en Bungee 10px, con borde de 2px del color del tono y 3px de radio, inclinado unos −4°. Entra estampado: llega al 180 % de tamaño y cae con un muelle seco (520/22). Tonos: papel, ámbar, cian, rosa, tinta.

### Círculo de rotulador
Un trazo a mano de 3px en `paper` que rodea tu canción y se dibuja una sola vez (0,7 s). Lo tuyo se marca así y solo así.

### Avisos
Tiras de color con letra impresa que caen desde arriba: ámbar (bien), rosa (error), papel (información). Archivo 800 15px, tinta `print`, como mucho tres a la vez.

### Cara (avatar)
Redonda, como lo único redondo de la máquina además de bombillas y pulsadores de juego. Muestra el selfie si lo hay y, si no, la inicial del nombre (Bungee, cian) sobre `panel-2`. Va separada de lo que tiene debajo por un filete de 2-4px (`ink` sobre negro, `print` sobre cristal). En el VS, la cara de quien pidió la canción crece de 44 a 68px y monta sobre la esquina de la carátula: es la cara de la canción. El selfie es opcional (se toca la cara al entrar o el chip del alias, cajón «Tu cara») y se borra al cerrar la noche.

### Minijuegos
Pantalla completa sobre `ink`, limitada a la columna de la máquina (`max-w-lg`). Arriba, siempre la misma tira: a la izquierda la ventanilla LED del tiempo (rosa y latiendo en la recta final) y a la derecha el progreso en bombillas (parejas, aciertos, golpes). El tablero de juego es un bisel con cristal apagado dentro.
- **Selector:** rejilla de pulsadores ámbar de 3 columnas (icono, nombre en Bungee, puntos máximos en LED y dificultad en 3 bombillas). El último juego, el más difícil, ocupa toda la fila: es el premio gordo.
- **Cartas (Memoria):** dorso de cristal apagado con la cruz de la botica; al destaparla, ámbar con el símbolo en tinta; pareja hecha, cristal encendido; fallo, rosa.
- **Aro (Al ritmo):** círculo de cristal encendido con su número y un aro ámbar que se cierra sobre él. El ritmo se ve en una hilera de 6 bombillas: la luz avanza una en cada golpe (con movimiento reducido, destellan todas juntas). Nada depende del sonido.
- **Respuestas (Carátula y Trivia):** pulsadores anchos en `panel-2` con título en Archivo 850 y subtítulo en `mute`. Al revelar: la buena en ámbar, la elegida si falla en rosa, el resto al 45 %. La carátula se pixela en un canvas dentro de un bisel y lleva el sello «Vale doble» mientras aún puntúa doble. La ronda va en una ventanilla LED pequeña.

### Mando de la dueña (`/admin`)

El panel sigue la estructura del mando a distancia:
- **Arriba:** la tira SUENA (cristal encendido con la barra abierta y cristal apagado con ella cerrada). A la izquierda, el logo de Spotify sobre un piloto: bombilla ámbar si va bien, rosa si hay problema.
- **Abajo, anclada con `mt-auto` para el pulgar,** la botonera dentro de un bezel:
  - Tres columnas, `1fr 1.55fr 1fr`, de 190px de alto: **HAPPY** (ámbar cuando está activa), **DOSIS** (el único pulsador de cristal cian, que respira con la barra abierta y lleva sus puntos en LED) y **SALTAR** (metal, con doble toque).
  - Debajo, tres teclas de cajón de 84px con una fila de icono y LED de altura fija (`h-6`) y una tecla de NOCHE a todo lo ancho.
- **Confirmaciones:** sin diálogos del navegador. El primer toque arma el botón, que se pone rosa con la pregunta; el segundo confirma; a los 3 s se desarma.

### Ajuste −/+

Los valores numéricos no usan deslizadores del navegador. Cada ajuste es una fila con el nombre a la izquierda y, a la derecha, un pulsador `−` de 44px, una ventanilla LED de 58px como mínimo con el valor y un pulsador `+` de 44px. Los botones se desactivan en los límites. Las unidades van en el nombre: «(%)», «(s)» y «(min)».

## Do's and Don'ts

### Do:
- **Do** pon el texto en `print` sobre cualquier cristal encendido o superficie ámbar.
- **Do** mete toda cifra que cambia en directo en una ventanilla LED con sus segmentos apagados visibles.
- **Do** construye cada pieza nueva como bisel (3px) con cristal dentro; los pulsadores, con labio y hundimiento de 3px.
- **Do** reserva el cristal cian encendido para lo que importa ahora; el resto va en cristal apagado.
- **Do** mueve una sola pieza a la vez y respeta `prefers-reduced-motion` (las bombillas dejan de perseguir y el rotulador aparece ya dibujado).
- **Do** deja que los títulos de canción ocupen hasta dos líneas antes de cortar.

### Don't:
- **Don't** uses el rosa fuera del rival del duelo salvo como alarma (tiempo, error, cerrado).
- **Don't** hagas tarjetas flotantes con sombra y acento neón: es la app de música oscura que este sistema rechaza.
- **Don't** pongas números en directo en Archivo o Bungee; van en DSEG7.
- **Don't** redondees más allá de 6px salvo bombillas, avatares, pulsadores circulares de juego y el canto del cajón.
- **Don't** rotules dos veces la misma información en pantalla.
- **Don't** confíes nada al sonido: todo estado tiene que verse.
