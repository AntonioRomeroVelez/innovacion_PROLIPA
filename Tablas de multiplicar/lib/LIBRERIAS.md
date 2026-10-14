# Librerías de terceros (se incluyen dentro del proyecto para que funcione sin internet)

| Archivo | Librería | Versión | Licencia | Para qué se usa |
|---|---|---|---|---|
| `gsap.min.js` | [GSAP](https://gsap.com) | 3.15.0 | [GSAP Standard "no charge" license](https://gsap.com/standard-license) | Animaciones (rebote de las cuentas, respuesta que vuela al cuadro, mascota, puntos que suben, estrellas) |
| `confetti.browser.js` | [canvas-confetti](https://github.com/catdad/canvas-confetti) | 1.9.4 | ISC (ver `confetti.LICENSE.txt`) | Confeti al acertar y al terminar la ronda |

Origen: registro oficial de npm (`npm pack gsap canvas-confetti`).

Si falta alguno de estos archivos el juego sigue funcionando, solo que sin esas animaciones.

Para actualizar una librería: descargar la nueva versión con `npm pack <nombre>` y reemplazar el archivo correspondiente.
