---
version: 1
slug: "src-client-home-tsx"
primary_target: "src/client/Home.tsx"
related_targets: ["src/client/Screens.tsx","src/components"]
---

Alcance: pantalla del cliente de BarmaGames (`/`: entrada, pantalla principal, pedir canción, ficha de canción, minijuegos, duelo y ganadora). Modo: Operate, con la expresión de una máquina de bar.
Audiencia: clientes de pie en un bar oscuro y ruidoso, con una mano libre y segundos de atención. Tarea principal: pedir su canción; después, seguirla y empujarla.
Restricciones: logo y colores del logo (cian, blanco, negro), jerga de farmacia y duelo VS con frontera móvil. Nada que dependa del sonido.

## Direction contract

THESIS: BarmaGames es la tragaperras del bar. Un solo pulsador gordo, PIDE, y una escalera de premios iluminada por la que suben las canciones. Rechaza la app de música oscura con lista de tarjetas y acento neón.

OWN-WORLD: mueble negro mate con paneles de cristal cian retroiluminado, serigrafiados en negro y blanco. Hileras de bombillas ámbar que persiguen, contadores LED de 7 segmentos para puntos y tiempo, y pulsadores cuadrados con bisel y luz interior. El rosa es solo para el rival del duelo. Los estados se estampan como sellos y tu canción va rodeada a rotulador.

STORY: el cliente ve el pulsador PIDE y lo pulsa. Después ve su canción subir peldaño a peldaño, juega para empujarla y vive el duelo como el bonus de la máquina.

FIRST VIEWPORT: a 390×844.
- Arriba (30 %): la ventana SUENA, con la carátula y la cuenta atrás LED hasta el cierre.
- En medio: la escalera de premios, con 4 o 5 peldaños visibles y el #1 encendido.
- Abajo: el pulsador «PIDE TU CANCIÓN» a todo lo ancho (96 px o más de alto) y, al lado, JUGAR con sus créditos.

FORM: la tragaperras del bar, puesto 3 de la lista. Semilla ca958849. Sumado de las descartadas: círculo de rotulador, sellos de estado, nada rotulado dos veces y una sola pieza en movimiento a la vez.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
