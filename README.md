# Rumbo a la IPO (v2)

Un simulador en vivo de una fábrica de galletas para la **Unidad 7 de CORE Econ, "La empresa y sus clientes"**. El tiempo corre mes a mes y el estudiante cambia precios, publicidad, lanza productos, amplía la planta, crea ediciones (discriminación de precios) y reacciona a aranceles, recesiones, a un rival y al regulador. Su director de finanzas, una IA sarcástica llamada M.A.R.G.E.N., le explica cada golpe con una gráfica y le hace preguntas con los números de su propia partida. La meta es una IPO: una valuación sostenida por encima de la meta durante tres meses.

La versión 1 (el juego de texto lineal) está guardada en la etiqueta `v1-final` del repositorio.

## Primera partida: el tutorial

La primera vez que un alumno juega, M.A.R.G.E.N. lo guía paso a paso: un recorrido por el tablero (caja, valuación, el reloj, las pestañas, el chat y los ⓘ), lanzar **una** galleta, presionar Continuar mientras está en desarrollo, diagnosticar el primer mes de ventas con la gráfica de demanda (con una pregunta calificada), corregir el precio y ver subir la utilidad: su **primer triunfo**. Si ignora la guía, puede quebrar: también se aprende. En partidas siguientes no aparece; en la pantalla de estrategia hay una casilla **"Repetir el tutorial en la próxima partida"**.

Además hay **mini-tutoriales** que aparecen una sola vez por alumno la primera vez que ocurre algo (segundo producto, primera publicidad, primera valuación, llega el rival, se desbloquean las ediciones, primer choque de costos o de demanda, el regulador, cuando ampliar la planta empieza a convenir), y los **avisos** de M.A.R.G.E.N. dicen qué pasó, cuál es el culpable principal y llevan con un botón a la pestaña donde se arregla.

## Idiomas

Español e inglés, con selector ES | EN en la pantalla inicial y en la barra superior (por defecto, el idioma del navegador). Los ⓘ y el Manual del CFO enlazan cada sección de CORE (*The Economy 2.0*, Unidad 7) en el idioma del alumno. El idioma de cada partida queda en el `log` de su fila del Sheet (no hay que cambiar el Apps Script).

## Cómo se califica (de 100; cuenta el mejor intento)

| Componente | Puntos |
|---|---|
| Valuación sostenida (mínimo de 3 meses) frente a la meta de la IPO | 50 |
| Crisis superadas: 6 meses después no quebró y sus últimos 3 meses suman utilidad | 30 |
| Preguntas del CFO | 20 |

Si la partida termina en quiebra o sin IPO, las crisis se dividen entre al menos 3 y las preguntas entre al menos 6, para que quebrar rápido no regale puntos. Una partida que llega a la IPO se califica con lo que realmente enfrentó.

**Calibración** (con jugadores simulados, 20 partidas por estrategia): un jugador que entiende la unidad y juega razonablemente promedia ~77 puntos y llega a la IPO en 10–35% de las partidas; uno casi óptimo llega en 60–70%; uno que nunca ajusta nada saca menos de 60. Los números se ajustan en un solo lugar: `TUNING` en `js/sim/world.js` (la meta de la IPO está en `ipoTarget`).

## Probarlo en tu computadora

```bash
python3 -m http.server 8000
# abre http://localhost:8000
```

Pruebas automáticas (Node 18 o más reciente): `npm test`

## Actualizar el Google Sheet para la v2 (obligatorio una vez)

La v2 escribe en una pestaña nueva, `Intentos v2`, con columnas distintas. Tu URL actual sigue sirviendo:

1. Abre tu Sheet → **Extensiones → Apps Script**.
2. Borra todo el código y pega el contenido de `apps-script/Code.gs`. Guarda.
3. Elige la función `setupBestTab` y presiona **Ejecutar**: crea `Intentos v2` y `Mejor intento v2`.
4. **Implementar → Administrar implementaciones → ✏️ (editar) → Versión: Nueva versión → Implementar**. La URL no cambia, así que no hay que tocar `js/config.js`.
5. Juega una partida corta y revisa que aparezca la fila en `Intentos v2`. (El juego no puede confirmar el envío por sí mismo: si no aparece la fila, revisa este paso).

Las filas de la v1 se quedan en la pestaña `Intentos` y no se mezclan.

`js/config.js` también permite limitar los códigos de clase: `export const CLASS_CODES = ['MICRO-2026'];` (vacío = cualquier código).

## Editar textos

- **Todo lo que dice el CFO, los botones, las preguntas, el tutorial y los finales:** `js/content/copy.es.js` (español) y `js/content/copy.en.js` (inglés).
- **Las explicaciones de los íconos ⓘ y el Manual del CFO:** `js/content/glossary.es.js` y `js/content/glossary.en.js`.
- Si agregas o cambias una llave en un idioma, cámbiala también en el otro: `npm test` avisa si no coinciden.
- En los textos, `{x}` inserta un número, `{$x}` un monto en pesos y `[[termino]]` o `[[termino|texto]]` crea un ⓘ con la entrada del glosario.
- Después de editar, corre `npm test`: avisa si quedó una variable o un término sin definir.

## Auditar una partida sospechosa

Cada fila trae la `seed` (semilla que genera todos los números de la partida) y un `log` con precios y publicidad por mes, lanzamientos, eventos y respuestas. Con la semilla se reconstruye el mundo exacto:

```bash
node -e "import('./js/sim/world.js').then(m => console.log(m.makeWorld(SEMILLA, 'premium')))"
```

No hay login ni protección contra trampas: la calificación se calcula en el navegador. Es un riesgo aceptado para un grupo pequeño.

## Estructura

```
js/sim/            simulación pura (mundo, mercado, acciones, mes, comodines, rival, regulador, valuación, finales, preguntas, calificación)
js/content/        copy.js (todos los textos) y glossary.js (íconos ⓘ y manual)
js/ui/             tablero, gráficas SVG, chat del CFO, reloj, pantallas
js/main.js         une todo
apps-script/Code.gs  receptor en Google Sheets
tests/             pruebas, incluidos los jugadores simulados de la calibración (tests/support/bots.js)
docs/superpowers/  diseño y plan de cada versión
```
