# Rumbo a la IPO

Un examen-juego de texto para la **Unidad 7 de CORE Econ, "La empresa y sus clientes"**. Cada estudiante funda una marca de café y toma decisiones de precio, costos, diferenciación y competencia. Si razona mal, quiebra. Si razona bien, llega a la IPO. Puede reintentar las veces que quiera: cada empresa nueva tiene números distintos.

## Cómo se califica (100 puntos, cuenta el mejor intento)

| Componente | Puntos |
|---|---|
| Desenlace: IPO / venta, boutique o regulador / quiebra | 40 / 20 / 0 |
| 8 preguntas del CFO (5 c/u; las respuestas cambian según la partida) | 40 |
| Valor de la empresa vs. el mejor valor posible con esos números | 20 |
| Respuesta abierta del roadshow | 0 (la lees tú; bono a tu criterio) |

Valor de la empresa = caja final + 8 × utilidad promedio de los últimos 2 trimestres.

Hay 9 finales: 3 IPO (marca premium, volumen, duopolio), 3 "honorables" (vendida al rival, boutique, el regulador te parte) y 3 quiebras (precio bajo el costo, guerra de precios, sobreinversión).

## Probarlo en tu computadora

```bash
python3 -m http.server 8000
# abre http://localhost:8000
```

Los módulos de JavaScript no funcionan si abres `index.html` con doble clic: hace falta un servidor (el comando de arriba basta).

Pruebas automáticas (requiere Node 18 o más reciente): `npm test`

## Conectar tu Google Sheet (una sola vez)

1. Crea una Google Sheet nueva.
2. **Extensiones → Apps Script**. Borra lo que haya y pega el contenido de `apps-script/Code.gs`. Guarda.
3. En el editor, elige la función `setupBestTab` y presiona **Ejecutar**. Autoriza los permisos. Se crean las pestañas `Intentos` y `Mejor intento`.
4. **Implementar → Nueva implementación → Tipo: Aplicación web**.
   - Ejecutar como: **Yo**
   - Quién tiene acceso: **Cualquier persona**
5. Copia la URL que termina en `/exec` y pégala en `js/config.js`:
   ```js
   export const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/…/exec';
   ```
6. (Opcional) En el mismo archivo, define los códigos de clase válidos: `export const CLASS_CODES = ['MICRO-2026'];`

Cada intento terminado agrega una fila en `Intentos`. Si se envía dos veces, se ignora el duplicado. `Mejor intento` muestra el mejor total por matrícula, cuántos intentos hizo cada quien y cuántos finales descubrió. Si un estudiante no tenía internet al terminar, el resultado se guarda en su navegador y se envía la próxima vez que abra el juego.

## Publicarlo en GitHub Pages

1. Sube esta carpeta a un repositorio de GitHub. En el plan gratuito, Pages requiere que el repositorio sea **público**.
2. **Settings → Pages → Branch: `main`, carpeta `/ (root)`**.
3. Comparte con tus estudiantes la URL que aparece ahí (por ejemplo, desde un post de "examen" en tu plataforma).

## Editar los textos

Todo lo que leen los estudiantes está en **`js/content.js`**: la narración del CFO, las opciones, las preguntas y sus explicaciones, los finales, el Manual del CFO y la explicación de la calificación. `{x}` inserta un número y `{$x}` un monto en pesos. Después de editar, corre `npm test`: avisa si quedó alguna variable o texto faltante.

## Auditar un intento sospechoso

Cada fila trae la `seed` (la semilla que generó todos los números de la partida) y un `decisionLog` con cada decisión y respuesta. Con la semilla puedes reconstruir exactamente esa partida:

```bash
node -e "import('./js/params.js').then(m => console.log(m.generateParams(SEMILLA)))"
```

No hay login ni protección contra trampas: un estudiante con conocimientos técnicos podría enviar un resultado falso. Para un grupo de 12 es un riesgo aceptado.

## Estructura

```
index.html, css/style.css        página
js/content.js                    TODOS los textos
js/config.js                     URL del Apps Script y códigos de clase
js/economy.js, params.js         modelo económico y números de cada partida
js/rival.js                      juego de precios con el rival (CORE 7.10)
js/engine.js, endings.js         decisiones y finales
js/checkpoints.js                banco de preguntas del CFO
js/scoring.js                    calificación y "mejor valor posible"
js/game.js                       flujo de la partida
js/ui.js, main.js, storage.js, results.js   interfaz, guardado y envío
apps-script/Code.gs              receptor en Google Sheets
tests/                           pruebas (npm test)
```
