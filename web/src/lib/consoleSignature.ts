/**
 * Firma en consola: la cara de iamsergio.dev + el nombre en ASCII, para quien
 * curiosee con F12. Puramente decorativo, no afecta a nada de la app.
 */
const ASCII_NAME = String.raw`
██╗ █████╗ ███╗   ███╗███████╗███████╗██████╗  ██████╗ ██╗ ██████╗    ██████╗ ███████╗██╗   ██╗
██║██╔══██╗████╗ ████║██╔════╝██╔════╝██╔══██╗██╔════╝ ██║██╔═══██╗   ██╔══██╗██╔════╝██║   ██║
██║███████║██╔████╔██║███████╗█████╗  ██████╔╝██║  ███╗██║██║   ██║   ██║  ██║█████╗  ██║   ██║
██║██╔══██║██║╚██╔╝██║╚════██║██╔══╝  ██╔══██╗██║   ██║██║██║   ██║   ██║  ██║██╔══╝  ╚██╗ ██╔╝
██║██║  ██║██║ ╚═╝ ██║███████║███████╗██║  ██║╚██████╔╝██║╚██████╔╝██╗██████╔╝███████╗ ╚████╔╝
╚═╝╚═╝  ╚═╝╚═╝     ╚═╝╚══════╝╚══════╝╚═╝  ╚═╝ ╚═════╝ ╚═╝ ╚═════╝ ╚═╝╚═════╝ ╚══════╝  ╚═══╝  `

export function printConsoleSignature() {
  const face = `${import.meta.env.BASE_URL}console-face.png`

  console.log(
    '%c ',
    `font-size: 1px;
     padding: 110px 110px;
     background: url(${face}) no-repeat center;
     background-size: contain;`,
  )
  console.log(`%c${ASCII_NAME}`, 'color: #8b7bff; line-height: 1.15;')
  console.log(
    '%c¿fisgoneando el código? 👀  hecho por %chttps://iamsergio.dev',
    'color: #9aa0b4; font-size: 13px;',
    'color: #8b7bff; font-weight: bold; font-size: 13px;',
  )
}
