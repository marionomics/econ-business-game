// TODO EL TEXTO DEL JUEGO VIVE AQUÍ. Edita libremente: {x} inserta un número, {$x} un monto en pesos.
// describeStep(step, run) convierte cada paso del juego en texto listo para mostrar.

const nf = new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 });
export const number = (n) => (n < 0 ? '−' : '') + nf.format(Math.abs(n));
export const money = (n) => (n < 0 ? '−$' : '$') + nf.format(Math.round(Math.abs(n)));
export const pct = (x) => `${Math.round(x * 100)}%`;

export const RIVAL_NAMES = ['Bean&Co.', 'Grano Rebelde', 'Tueste Norte', 'Café Volcán', 'La Molienda'];

export const T = {
  // ---------- Interfaz ----------
  'ui.title': 'Rumbo a la IPO',
  'ui.subtitle': 'Un examen-juego sobre la empresa y sus clientes (CORE, Unidad 7)',
  'ui.cash': 'Caja', 'ui.lastProfit': 'Utilidad del trimestre', 'ui.share': 'Cuota de mercado', 'ui.loyal': 'Clientes leales',
  'ui.quarter': 'Trimestre', 'ui.continue': 'Continuar', 'ui.answer': 'Responder', 'ui.send': 'Enviar respuesta',
  'ui.manual': 'Manual del CFO', 'ui.gallery': 'Finales', 'ui.close': 'Cerrar', 'ui.newRun': 'Fundar otra empresa',
  'ui.inputError': 'No entendí ese número. Escríbelo así: 1250 o 1,250.5',
  'ui.correct': '✔ Correcto', 'ui.incorrect': '✘ No exactamente',
  'ui.yourAnswer': 'Tu respuesta: {yours} · Respuesta correcta: {right}',
  'ui.sent': 'Resultado enviado al profesor.',
  'ui.queued': 'Guardado en este dispositivo; se enviará la próxima vez que abras el juego con internet.',
  'ui.sending': 'Enviando resultado…',
  'ui.welcome.name': 'Tu nombre', 'ui.welcome.id': 'Matrícula', 'ui.welcome.code': 'Código de la clase',
  'ui.welcome.firm': 'Nombre de tu marca de café', 'ui.welcome.start': 'Fundar mi empresa',
  'ui.welcome.badCode': 'Ese código de clase no existe. Pídeselo a tu profesor.',
  'ui.welcome.missing': 'Llena todos los campos.',
  'ui.resume': 'Tienes una empresa en marcha. Continuamos donde te quedaste.',
  'ui.locked': '???', 'ui.galleryIntro': 'Has desbloqueado {n} de {total} finales. Cada estrategia distinta lleva a un final distinto.',
  'ui.score.title': 'Tu calificación en este intento',
  'ui.score.outcome': 'Desenlace', 'ui.score.checkpoints': 'Preguntas del CFO', 'ui.score.value': 'Valor de la empresa',
  'ui.score.total': 'Total', 'ui.score.best': 'Cuenta tu mejor intento. Puedes jugar las veces que quieras.',
  'ui.score.valueLine': 'Valor final: {$value} · Mejor valor posible con estos números: {$bench}',
  'ui.matrix.caption': 'Utilidad del trimestre (tú, {rival})',
  'ui.matrix.you': 'Tú', 'ui.matrix.high': 'Alto ({$P})', 'ui.matrix.low': 'Bajo ({$P})',
  'ui.survey.price': 'Precio por bolsa', 'ui.survey.qty': 'Bolsas que se venderían',
  'ui.stage.0': 'Arranque', 'ui.stage.1': 'Etapa 1 · Lanzamiento', 'ui.stage.2': 'Etapa 2 · Crecer',
  'ui.stage.3': 'Etapa 3 · Llega un rival', 'ui.stage.4': 'Etapa 4 · Roadshow',

  // ---------- Narración ----------
  'nar.intro.title': 'Bienvenida, fundadora o fundador',
  'nar.intro': 'Soy tu CFO. Acabas de fundar {firm}, una marca de café de especialidad. Tenemos {$cash} en caja. Tostar y empacar cada bolsa nos cuesta {$c} (costo marginal), y la renta, los sueldos y el tostador nos cuestan {$F} por trimestre, vendamos o no (costo fijo).\n\nMi trabajo es decirte la verdad. El tuyo es no quebrar. Si quebramos, fundamos otra empresa y lo intentamos de nuevo. Si llegamos a la IPO, salimos a bolsa.',
  'nar.s2_intro.title': 'Ya sobrevivimos al lanzamiento',
  'nar.s2_intro': 'Tenemos {$cash} en caja. Hay dos maneras de crecer. Una es hacer el café más barato de producir (un tostador industrial: más costo fijo, menos costo marginal). La otra es hacer que la gente quiera tu café y no otro (marca: publicidad, diseño, historia). O puedes no hacer nada y guardar la caja. Cada camino lleva a una empresa distinta.',
  'nar.s2_choque.fijo.title': 'Malas noticias: subió la renta',
  'nar.s2_choque.fijo': 'El dueño del local nos subió la renta {$amount} por trimestre. Ahora el costo fijo es {$F}. El costo de cada bolsa sigue en {$c}.',
  'nar.s2_choque.marginal.title': 'Malas noticias: subió el grano',
  'nar.s2_choque.marginal': 'Una mala cosecha subió el precio del grano verde. Ahora cada bolsa nos cuesta {$amount} más: el costo marginal es {$c}. La renta sigue igual ({$F} por trimestre).',
  'nar.s3_rival.title': 'Llegó {rival}',
  'nar.s3_rival': 'Abrió {rival} a dos cuadras. Ahora el mercado se reparte entre los dos. Hay dos precios posibles: alto ({$H}) o bajo ({$L}). Hay tres tipos de clientes: los leales (te compran a ti aunque seas más caro), los que comparan (se van con el más barato) y los que solo compran si el precio es bajo. Cuántos leales tengas depende de lo que hiciste antes.',

  // ---------- Decisiones ----------
  'dec.s1_precio_1': 'Hice una encuesta de mercado. Esta es la cantidad de bolsas que venderíamos por trimestre a cada precio. ¿Qué precio fijamos?',
  'dec.s1_precio_2': 'Segundo trimestre. La demanda es la misma que en la encuesta. ¿Qué precio fijamos ahora?',
  'dec.s2_inversion': '¿Cómo quieres crecer?',
  'dec.s2_precio_1': 'Con los costos y la demanda nuevos, actualicé la encuesta. ¿Qué precio fijamos?',
  'dec.s2_precio_2': 'Otro trimestre con los mismos números. ¿Qué precio fijamos?',
  'dec.s3_movida': 'Antes de competir con {rival}, ¿haces alguna movida? Hoy el {loyalPct} del mercado es leal.',
  'dec.s3_ronda': 'Ronda {round} de 3 contra {rival}. Ellos deciden su precio sin saber el tuyo. ¿Alto o bajo?',
  'dec.s4_oferta': 'No llegamos a los números de una IPO (necesitábamos {$ipoCash} en caja y utilidades positivas). Pero {rival} nos ofrece comprarnos por {$value}. ¿Aceptas?',
  'opt.precio': '{$P} por bolsa',
  'opt.s2_inversion.ninguna': 'No invertir: cuidar la caja',
  'opt.s2_inversion.tostadora': 'Tostador industrial: cuesta {$cost} hoy, el costo fijo sube {$dF} y cada bolsa cuesta {$dc} menos',
  'opt.s2_inversion.marca': 'Campaña de marca: cuesta {$cost} hoy, más gente quiere tu café y más clientes se vuelven leales',
  'opt.s2_inversion.ambas': 'Las dos cosas: cuesta {$cost} hoy',
  'opt.s3_movida.nada': 'Ninguna: competir con lo que tenemos',
  'opt.s3_movida.lealtad': 'Programa de lealtad (tarjeta de sellos, suscripción): cuesta {$cost}, más clientes leales',
  'opt.s3_movida.bloquear': 'Rentar el único otro local de la zona para que nadie más se instale: cuesta {$cost}',
  'opt.s3_ronda.H': 'Precio alto ({$H})',
  'opt.s3_ronda.L': 'Precio bajo ({$L})',
  'opt.s4_oferta.aceptar': 'Aceptar la oferta y vender la empresa',
  'opt.s4_oferta.seguir': 'Rechazarla y seguir como cafetería boutique',

  // ---------- Resultado del trimestre ----------
  'qr.title': 'Resultado del trimestre {n}',
  'qr.numbers': 'Precio {$P} · Vendimos {Q} bolsas · Utilidad {$profit} · Caja {$cash}',
  'qr.precio.bajo_costo': 'Vendimos cada bolsa por debajo de lo que nos cuesta hacerla. Cada bolsa extra que vendemos aumenta la pérdida. Vender más no compensa: al contrario.',
  'qr.precio.bajo': 'Vendimos mucho, pero el margen por bolsa fue chico. Con un precio un poco más alto habríamos perdido algo de ingreso, pero habríamos ahorrado más en costos al producir menos bolsas: más utilidad.',
  'qr.precio.optimo': 'Buen trimestre. Fue el punto en que ganar un poco más por bolsa ya no compensa las bolsas que dejaríamos de vender.',
  'qr.precio.alto': 'Margen grande, pocas bolsas. En esa zona la demanda es elástica: un precio un poco más bajo nos habría hecho vender bastante más.',
  'qr.ronda.HH': 'Los dos cobramos alto. Nos repartimos a los que comparan y cada quien se quedó con sus leales.',
  'qr.ronda.HL': '{rival} cobró bajo y nosotros alto. Se llevaron a todos los que comparan y a los que solo compran barato. Solo nos quedaron los leales.',
  'qr.ronda.LH': 'Cobramos bajo mientras {rival} cobraba alto. Nos llevamos a los que comparan y a los cazadores de ofertas. Veremos cómo responden.',
  'qr.ronda.LL': 'Guerra de precios: los dos cobramos bajo. Vendemos mucho con margen mínimo, y el costo fijo no perdona.',
  'qr.quiebra_inversion': 'No nos alcanzó la caja para pagar lo que decidiste. Gastar más de lo que tienes no es estrategia, es quiebra.',
  'qr.bankrupt': 'La caja quedó en negativo. Quebramos.',

  // ---------- Pregunta abierta ----------
  'open.title': 'El roadshow',
  'open.prompt': 'Antes de cerrar, un regulador de competencia te pregunta frente a los inversionistas: "Su precio está muy por encima de su costo marginal. Eso significa que hay clientes que pagarían más que su costo y no compran: es una pérdida para la sociedad. ¿Por qué deberíamos permitirlo?" Defiende tu markup o concede el punto. Usa lo que aprendiste: elasticidad, lealtad, sustitutos, pérdida irrecuperable.',
  'open.placeholder': 'Escribe tu respuesta (unas líneas bastan)…',

  // ---------- Preguntas del CFO (checkpoints) ----------
  'cp.utilidad_total.prompt': 'Pregunta del CFO: el trimestre pasado cobramos {$P}, vendimos {Q} bolsas, cada bolsa costó {$c} y el costo fijo fue {$F}. ¿Cuál fue la utilidad del trimestre?',
  'cp.utilidad_total.explain': 'Utilidad = (P − c) × Q − F = ({$P} − {$c}) × {Q} − {$F} = {$answer}.',
  'cp.utilidad_unidad.prompt': 'Pregunta del CFO: cobramos {$P} por bolsa y producir cada bolsa cuesta {$c}. ¿Cuánto ganamos por cada bolsa adicional que vendemos (el margen)?',
  'cp.utilidad_unidad.explain': 'Margen = P − c = {$P} − {$c} = {$answer}. El costo fijo no entra aquí: no cambia por vender una bolsa más.',
  'cp.costo_medio.prompt': 'Pregunta del CFO: vendimos {Q} bolsas, cada una cuesta {$c} y el costo fijo es {$F}. ¿Cuál fue el costo medio por bolsa?',
  'cp.costo_medio.explain': 'Costo medio = c + F/Q = {$c} + {$F}/{Q} = {answer}. El costo fijo se reparte entre todas las bolsas.',
  'cp.elast_arco.prompt': 'Pregunta del CFO: según la encuesta, a {$P} vendemos {Q} bolsas y a {$P2} vendemos {Q2}. ¿Cuál es la elasticidad precio de la demanda al pasar de {$P} a {$P2}? (Usa el primer punto como base. Escribe dos decimales.)',
  'cp.elast_arco.explain': 'ε = −(%ΔQ)/(%ΔP) = −[({Q2} − {Q})/{Q}] / [({P2} − {P})/{P}] = {answer}.',
  'cp.elast_clasif.prompt': 'Pregunta del CFO: a {$P} vendemos {Q} bolsas y a {$P2} vendemos {Q2}. En ese tramo, ¿la demanda es…?',
  'cp.elast_clasif.opt.elastica': 'Elástica (ε > 1)',
  'cp.elast_clasif.opt.inelastica': 'Inelástica (ε < 1)',
  'cp.elast_clasif.opt.unitaria': 'De elasticidad unitaria (ε = 1)',
  'cp.elast_clasif.explain': 'ε = −(%ΔQ)/(%ΔP) ≈ {eps}. Si es mayor que 1, la cantidad reacciona más que el precio: la demanda es elástica.',
  'cp.ingreso_direccion.prompt': 'Pregunta del CFO: hoy podríamos cobrar {$P2} y vender {Q2} bolsas. Si bajamos a {$P}, venderíamos {Q}. ¿Qué pasa con el ingreso total (P × Q)?',
  'cp.ingreso_direccion.opt.sube': 'Sube', 'cp.ingreso_direccion.opt.baja': 'Baja', 'cp.ingreso_direccion.opt.igual': 'No cambia',
  'cp.ingreso_direccion.explain': 'Ingreso antes: {$P2} × {Q2} = {$R1}. Después: {$P} × {Q} = {$R2}. Si la demanda es elástica en ese tramo, bajar el precio sube el ingreso; si es inelástica, lo baja.',
  'cp.optimo_tangencia.prompt': 'Pregunta del CFO: un inversionista dice "si quieren ganar más, vendan lo más posible". ¿Qué le contestas?',
  'cp.optimo_tangencia.opt.max_utilidad': 'El precio que maximiza la utilidad no es el que vende más: más ventas exigen un precio menor para todas las bolsas',
  'cp.optimo_tangencia.opt.vender_mas': 'Tiene razón: más volumen siempre significa más utilidad',
  'cp.optimo_tangencia.opt.precio_alto': 'Al revés: lo mejor siempre es el precio más alto posible',
  'cp.optimo_tangencia.opt.cubrir_fijo': 'Lo correcto es fijar el precio que cubre exactamente el costo fijo',
  'cp.optimo_tangencia.explain': 'El óptimo está donde la curva de isoutilidad más alta toca la demanda. Para vender una bolsa más hay que bajar el precio de todas, y en algún punto eso cuesta más de lo que suma.',
  'cp.isoprofit_comparar.prompt': 'Pregunta del CFO: hoy cobramos {$P} y vendemos {Q} bolsas (costo marginal {$c}, costo fijo {$F}). ¿Cuál de estas combinaciones está sobre la MISMA curva de isoutilidad?',
  'cp.isoprofit_comparar.opt.mitad': '{$P} y {Q} bolsas', 'cp.isoprofit_comparar.opt.tres_cuartos': '{$P} y {Q} bolsas',
  'cp.isoprofit_comparar.opt.margen_tres': '{$P} y {Q} bolsas', 'cp.isoprofit_comparar.opt.margen_uno': '{$P} y {Q} bolsas',
  'cp.isoprofit_comparar.explain': 'Misma utilidad significa mismo (P − c) × Q, porque F no cambia. Si duplicas el margen y vendes la mitad, la utilidad queda igual.',
  'cp.precio_bajo_costo.prompt': 'Pregunta del CFO: alguien propone cobrar menos de {$c} por bolsa "para ganar mercado". ¿Qué pasa?',
  'cp.precio_bajo_costo.opt.cada_unidad_pierde': 'Cada bolsa vendida pierde dinero; vender más agranda la pérdida',
  'cp.precio_bajo_costo.opt.volumen_compensa': 'Se pierde por bolsa, pero el volumen lo compensa',
  'cp.precio_bajo_costo.opt.cubre_fijo': 'Al menos se cubre el costo fijo',
  'cp.precio_bajo_costo.opt.gana_mercado': 'No pasa nada malo: ganar mercado siempre conviene',
  'cp.precio_bajo_costo.explain': 'Si P < c, el margen por bolsa es negativo. Cada bolsa adicional resta, y además hay que pagar el costo fijo.',

  'cp.choque_fijo.prompt': 'Pregunta del CFO: la renta subió {$amount} por trimestre. La demanda y el costo por bolsa no cambiaron. ¿Qué pasa con el precio que maximiza la utilidad?',
  'cp.choque_marginal.prompt': 'Pregunta del CFO: cada bolsa cuesta ahora {$amount} más. La demanda no cambió. ¿Qué pasa con el precio que maximiza la utilidad (con demanda lineal)?',
  'cp.choque_fijo.opt.sube': 'Sube lo mismo que el costo', 'cp.choque_fijo.opt.igual': 'No cambia', 'cp.choque_fijo.opt.baja': 'Baja', 'cp.choque_fijo.opt.sube_mitad': 'Sube la mitad del aumento del costo',
  'cp.choque_marginal.opt.sube': 'Sube lo mismo que el costo', 'cp.choque_marginal.opt.igual': 'No cambia', 'cp.choque_marginal.opt.baja': 'Baja', 'cp.choque_marginal.opt.sube_mitad': 'Sube la mitad del aumento del costo',
  'cp.choque_fijo.explain': 'El costo fijo no depende de cuántas bolsas vendes, así que no cambia el ingreso marginal ni el costo marginal. El precio óptimo es el mismo; solo bajan las utilidades. Subir el precio "para cubrir la renta" haría perder más.',
  'cp.choque_marginal.explain': 'Con demanda P = a − bQ, el precio óptimo es (a + c)/2. Si c sube {$amount}, el precio óptimo sube la mitad. Parte del aumento lo absorbe la empresa, porque subir todo el costo espantaría demasiados clientes.',
  'cp.choque_utilidad.prompt': 'Pregunta del CFO: con los costos nuevos (c = {$c}, F = {$F}), si cobramos {$P} venderíamos {Q} bolsas. ¿Cuál sería la utilidad del trimestre?',
  'cp.choque_utilidad.explain': '(P − c) × Q − F = ({$P} − {$c}) × {Q} − {$F} = {$answer}.',
  'cp.markup_precio.prompt': 'Pregunta del CFO: el analista estima que en el óptimo la elasticidad es ε = {eps}. El costo marginal es {$c}. Usa la regla del markup, (P − c)/P = 1/ε. ¿Qué precio fijamos? (Dos decimales.)',
  'cp.markup_precio.explain': 'Despejando, P = c × ε/(ε − 1) = {$c} × {eps}/({eps} − 1) = {answer}.',
  'cp.markup_eps.prompt': 'Pregunta del CFO: estamos en el precio óptimo, {$P}, y el costo marginal es {$c}. Según la regla del markup, ¿cuál es la elasticidad de la demanda en ese punto? (Dos decimales.)',
  'cp.markup_eps.explain': '(P − c)/P = 1/ε, entonces ε = P/(P − c) = {$P}/({$P} − {$c}) = {answer}.',
  'cp.markup_marca.prompt': 'Pregunta del CFO: invertimos en marca. Más gente siente que nuestro café no tiene sustituto. ¿Qué le pasa a nuestro markup óptimo, (P − c)/P?',
  'cp.markup_marca.opt.sube': 'Sube', 'cp.markup_marca.opt.baja': 'Baja', 'cp.markup_marca.opt.igual': 'No cambia',
  'cp.markup_marca.explain': 'Menos sustitutos cercanos significa demanda menos elástica. Como markup = 1/ε, un ε menor permite un markup mayor. Es la estrategia de las marcas premium.',
  'cp.markup_sustituto.prompt': 'Pregunta del CFO: imagina que abre una cadena con un café casi idéntico al nuestro. Nuestros clientes ahora tienen un sustituto cercano. ¿Qué le pasa a nuestro markup óptimo, (P − c)/P?',
  'cp.markup_sustituto.opt.sube': 'Sube', 'cp.markup_sustituto.opt.baja': 'Baja', 'cp.markup_sustituto.opt.igual': 'No cambia',
  'cp.markup_sustituto.explain': 'Con un sustituto cercano, la demanda se vuelve más elástica: si subimos el precio, la gente se va. Como markup = 1/ε, el markup óptimo baja.',
  'cp.escala_cm.prompt': 'Pregunta del CFO: con c = {$c} y F = {$F}, ¿cuál sería el costo medio por bolsa si producimos {Q} bolsas? (Dos decimales.)',
  'cp.escala_cm.explain': 'CMe = c + F/Q = {$c} + {$F}/{Q} = {answer}. Entre más bolsas, más se reparte el costo fijo: así funcionan las economías de escala.',
  'cp.escala_cmg.prompt': 'Pregunta del CFO: al principio cada bolsa costaba {$c0}. El tostador redujo el costo por bolsa en {$dc} (0 si no lo compraste) y el grano lo subió en {$shockC} (0 si no hubo ese choque). El tostador también subió el costo fijo en {$dF}. ¿Cuál es hoy nuestro costo marginal?',
  'cp.escala_cmg.explain': 'El costo marginal solo cambia con lo que cuesta cada bolsa adicional: {$c0} − {$dc} + {$shockC} = {$answer}. El aumento del costo fijo no entra.',
  'cp.escala_retornos.prompt': 'Pregunta del CFO: ¿por qué nuestro costo medio baja cuando producimos más bolsas?',
  'cp.escala_retornos.opt.fijo_repartido': 'Porque el costo fijo se reparte entre más bolsas',
  'cp.escala_retornos.opt.cmg_baja': 'Porque cada bolsa adicional cuesta cada vez menos',
  'cp.escala_retornos.opt.precio_sube': 'Porque al vender más podemos subir el precio',
  'cp.escala_retornos.opt.trabajadores_rinden': 'Porque los trabajadores se cansan menos',
  'cp.escala_retornos.explain': 'Con C = F + cQ, el costo medio es c + F/Q. El costo marginal c es constante; lo que baja es F/Q.',
  'cp.excedente_consumidor.prompt': 'Pregunta del CFO: con la demanda actual, el precio máximo que alguien pagaría es {$a}. Si cobramos {$P}, vendemos {Q} bolsas. ¿Cuál es el excedente del consumidor (el triángulo entre la demanda y el precio)?',
  'cp.excedente_consumidor.explain': 'Excedente del consumidor = ½ × Q × (a − P) = ½ × {Q} × ({$a} − {$P}) = {$answer}.',
  'cp.perdida_irrecuperable.prompt': 'Pregunta del CFO: si cobramos {$P}, vendemos {Q} bolsas. Si cobráramos el costo marginal ({$c}), se venderían {Qc}. ¿Cuál es la pérdida irrecuperable de eficiencia (el triángulo)?',
  'cp.perdida_irrecuperable.explain': 'PIE = ½ × (Qc − Q) × (P − c) = ½ × ({Qc} − {Q}) × ({$P} − {$c}) = {$answer}. Son los intercambios que beneficiarían a ambos lados y no ocurren.',
  'cp.excedente_pareto.prompt': 'Pregunta del CFO: hay un cliente dispuesto a pagar más que {$c} (nuestro costo marginal) pero menos que nuestro precio. Venderle ganaría algo para los dos. ¿Por qué no lo hacemos?',
  'cp.excedente_pareto.opt.precio_unico': 'Porque cobramos un solo precio: bajarlo para él implicaría bajarlo para todos',
  'cp.excedente_pareto.opt.no_hay_comprador': 'Porque en realidad ese cliente no existe',
  'cp.excedente_pareto.opt.costo_fijo': 'Porque esa venta no cubriría el costo fijo',
  'cp.excedente_pareto.opt.ilegal': 'Porque vender a precios distintos siempre es ilegal',
  'cp.excedente_pareto.explain': 'Con un solo precio, vender una bolsa más obliga a bajar el precio de todas. Por eso la empresa deja ventas mutuamente beneficiosas sin hacer: es la pérdida irrecuperable. Con discriminación de precios perfecta no ocurriría.',

  'cp.nash.prompt': 'Pregunta del CFO: esta es la tabla de utilidades contra {rival}. ¿Cuál o cuáles son equilibrios de Nash?',
  'cp.nash.opt.HH': 'Solo (alto, alto)', 'cp.nash.opt.LL': 'Solo (bajo, bajo)', 'cp.nash.opt.HH_LL': 'Tanto (alto, alto) como (bajo, bajo)', 'cp.nash.opt.ninguno': 'Ninguno de esos',
  'cp.nash.explain': 'En un equilibrio de Nash nadie gana cambiando solo su precio. Revisa cada celda: ¿te conviene moverte si el rival se queda? ¿Le conviene a él? Aquí la respuesta es: {answerLabel}.',
  'cp.tipo_juego.prompt': 'Pregunta del CFO: viendo la tabla de utilidades contra {rival}, ¿qué tipo de juego es?',
  'cp.tipo_juego.opt.coordinacion': 'Juego de coordinación: (alto, alto) y (bajo, bajo) son equilibrios',
  'cp.tipo_juego.opt.dilema': 'Dilema del prisionero: a ambos les conviene bajar, aunque juntos ganarían más con precio alto',
  'cp.tipo_juego.opt.dominante_H': 'El precio alto es dominante: conviene sin importar lo que haga el rival',
  'cp.tipo_juego.opt.otro': 'Ninguno de los anteriores',
  'cp.tipo_juego.explain': 'Depende de cuántos clientes leales hay. Con muchos leales, bajar el precio no atrae suficientes clientes nuevos y el precio alto domina o coordina. Con pocos, cada quien tiene la tentación de bajar. Aquí: {answerLabel}.',
  'cp.mejor_respuesta.prompt': 'Pregunta del CFO: en la ronda pasada {rival} cobró {rivalLabel}. Si vuelve a hacerlo, ¿cuál es tu mejor respuesta según la tabla?',
  'cp.mejor_respuesta.opt.H': 'Precio alto', 'cp.mejor_respuesta.opt.L': 'Precio bajo',
  'cp.mejor_respuesta.explain': 'Ve la columna del precio que eligió el rival y escoge la fila con tu mayor utilidad: {answerLabel}.',
  'cp.lealtad_poder.prompt': 'Pregunta del CFO: ¿por qué tener más clientes leales nos permite cobrar más caro?',
  'cp.lealtad_poder.opt.menos_elastica': 'Porque nuestra demanda se vuelve menos elástica: subir el precio espanta a menos gente',
  'cp.lealtad_poder.opt.mas_clientes_mas_barato': 'Porque con más clientes los costos bajan',
  'cp.lealtad_poder.opt.costo_baja': 'Porque los clientes leales nos cuestan menos',
  'cp.lealtad_poder.opt.nada': 'No nos lo permite: la lealtad no tiene que ver con el precio',
  'cp.lealtad_poder.explain': 'Los clientes leales no se van con el rival si subimos el precio. Eso hace nuestra demanda menos elástica, y con ε menor el markup óptimo (1/ε) es mayor. Es poder de mercado.',
  'cp.bloquear.prompt': 'Pregunta del CFO: rentamos el único otro local de la zona para que nadie más se instale. ¿Por qué eso le interesa a un regulador de competencia?',
  'cp.bloquear.opt.quita_sustitutos': 'Porque impide la entrada: quita sustitutos a los clientes y aumenta nuestro poder de mercado',
  'cp.bloquear.opt.eficiencia': 'Porque nos hace más eficientes',
  'cp.bloquear.opt.legal_siempre': 'No le interesa: rentar un local siempre es legal',
  'cp.bloquear.opt.baja_costos': 'Porque baja nuestros costos y eso es injusto',
  'cp.bloquear.explain': 'Es lo que hicieron algunos supermercados del Reino Unido: comprar terrenos para dejarlos vacíos y bloquear a competidores (CORE 7.12). Sin sustitutos, la demanda es menos elástica, los precios suben y la pérdida irrecuperable crece.',
  'cp.pago_celda.prompt': 'Pregunta del CFO: si cobramos {meLabel} ({$P}) y {rival} cobra {rivalLabel} ({$Prival}), venderíamos {Q} bolsas. Con c = {$c} y F = {$F}, ¿cuál sería nuestra utilidad del trimestre?',
  'cp.pago_celda.explain': '(P − c) × Q − F = ({$P} − {$c}) × {Q} − {$F} = {$answer}.',
};

export const ENDING_TEXT = {
  ipo_premium: { title: 'IPO: La marca premium',
    text: 'Saliste a bolsa como las marcas que la gente defiende. Apostaste por diferenciarte: tus clientes sienten que tu café no tiene sustituto, así que tu demanda es poco elástica y tu markup es alto. Es el camino de Apple: no se trata de vender más, sino de que nadie quiera irse. El riesgo: depende de que la marca siga valiendo.' },
  ipo_volumen: { title: 'IPO: Pila alta, precio bajo',
    text: 'Saliste a bolsa con el modelo de Tesco: "pile it high, sell it cheap". Bajaste el costo marginal invirtiendo en escala y ganaste con volumen, no con margen. Tu costo fijo es alto, pero repartido entre muchas bolsas el costo medio es bajo. El riesgo: si las ventas caen, ese costo fijo pesa.' },
  ipo_duopolio: { title: 'IPO: El duopolio cómodo',
    text: 'Saliste a bolsa sin una gran inversión, coordinando con tu rival en precios altos. Funcionó porque había suficientes clientes leales para que bajar el precio no tentara a nadie. Ojo: eso que a ti te parece estabilidad, al consumidor le sale caro, y a los reguladores les gusta vigilarlo.' },
  comprada: { title: 'Te compró el rival',
    text: 'No llegaste a la IPO, pero vendiste la empresa. Fue rentable, aunque demasiado pequeña para salir a bolsa. Para tu rival, comprarte elimina a su sustituto más cercano: su demanda se vuelve menos elástica. Por eso muchas fusiones pasan por la autoridad de competencia.' },
  boutique: { title: 'La boutique',
    text: 'Sobreviviste como cafetería boutique: pequeña, con clientes que te conocen y sin acceso a la bolsa. No es un fracaso, pero no alcanzó para una IPO. Revisa si dejaste dinero en la mesa: ¿tu precio estaba donde se tocaban la demanda y la isoutilidad más alta?' },
  regulador: { title: 'El regulador te parte',
    text: 'Bloqueaste la entrada de competidores y la autoridad de competencia lo notó. Quitarle sustitutos al cliente aumenta tu poder de mercado y la pérdida irrecuperable. Ese es justo el tipo de conducta que persigue la política de competencia (CORE 7.12). Tu empresa sigue, pero bajo vigilancia y sin IPO.' },
  quiebra_bajo_costo: { title: 'Quiebra: vender por debajo del costo',
    text: 'Fijaste un precio por debajo del costo marginal. Cada bolsa vendida restaba dinero, y entre más vendías, más perdías. "Ganar mercado" con margen negativo solo funciona si alguien más paga la cuenta, y aquí nadie la pagó. Funda otra empresa: esta vez compara el precio con el costo de cada bolsa.' },
  quiebra_guerra: { title: 'Quiebra: la guerra de precios',
    text: 'Terminaste en una guerra de precios con tu rival. Con precios bajos los dos vendían mucho, pero el margen no alcanzaba a cubrir el costo fijo. Cuando hay pocos clientes leales, cada empresa tiene la tentación de bajar el precio, y juntas terminan peor (dilema del prisionero). Funda otra empresa: piensa cómo cambiar el juego antes de jugarlo.' },
  quiebra_sobreinversion: { title: 'Quiebra: la caja no alcanzó',
    text: 'Gastaste más de lo que la caja aguantaba. Invertir puede bajar costos o subir la demanda, pero si la utilidad de cada trimestre no alcanza a cubrir el costo fijo y lo que gastaste, la empresa muere antes de cosechar. Funda otra empresa: compara lo que cuesta cada inversión con lo que de verdad te deja.' },
};

export const GRADING_INTRO = `Cómo se califica (de 100 puntos):
• Desenlace: IPO = 40 · venta, boutique o regulador = 20 · quiebra = 0.
• Preguntas del CFO: 8 por intento, 5 puntos cada una (40). Si quiebras, conservas las que ya contestaste.
• Valor de la empresa: hasta 20 puntos. Valor = caja final + 8 × utilidad promedio de los últimos 2 trimestres, comparado con el mejor valor posible con tus mismos números.
Cuenta tu MEJOR intento. Puedes jugar las veces que quieras: cada empresa nueva tiene números distintos. Es a libro abierto y puedes discutirlo con tus compañeros.`;

export const MANUAL = [
  { title: 'Utilidad', body: 'Utilidad = (P − c) × Q − F. P es el precio, c el costo marginal (lo que cuesta cada bolsa), Q las bolsas vendidas y F el costo fijo del trimestre. (CORE 7.2, 7.6)' },
  { title: 'Costo medio y costo marginal', body: 'C(Q) = F + cQ. Costo medio: CMe = c + F/Q, baja cuando Q sube (economías de escala). Costo marginal: CMg = c, constante. Un cambio en F no cambia el precio óptimo; un cambio en c, sí. (CORE 7.3, 7.4)' },
  { title: 'Elasticidad', body: 'ε = −(%ΔQ)/(%ΔP). Usa el primer punto como base: %ΔQ = (Q2 − Q1)/Q1. Si ε > 1 la demanda es elástica: bajar el precio sube el ingreso. Si ε < 1 es inelástica: bajar el precio baja el ingreso. (CORE 7.5)' },
  { title: 'Regla del markup', body: 'En el precio óptimo: (P − c)/P = 1/ε, es decir, P = c × ε/(ε − 1). Con menos sustitutos, ε es menor y el markup mayor. (CORE 7.6, 7.8)' },
  { title: 'Isoutilidad y óptimo', body: 'Una curva de isoutilidad une combinaciones (Q, P) con la misma utilidad. El óptimo está donde la isoutilidad más alta toca la curva de demanda. Con demanda lineal P = a − bQ y costo marginal c, el precio óptimo es (a + c)/2. (CORE 7.2, 7.6)' },
  { title: 'Excedentes y pérdida irrecuperable', body: 'Excedente del consumidor: lo que la gente estaba dispuesta a pagar menos lo que pagó (con demanda lineal, ½ × Q × (a − P)). Pérdida irrecuperable: ½ × (Q con P = c − Q actual) × (P − c). Existe porque el precio está por encima del costo marginal. (CORE 7.7)' },
  { title: 'Juego de precios con un rival', body: 'Hay clientes leales, clientes que comparan y clientes que solo compran barato. Un equilibrio de Nash es una combinación en la que nadie gana cambiando solo su precio. Con muchos leales, el precio alto domina. Con un número intermedio, hay coordinación (alto-alto o bajo-bajo). Con pocos, hay dilema del prisionero (los dos bajan). (CORE 7.10)' },
  { title: 'Poder de mercado y competencia', body: 'Diferenciación, lealtad y bloquear la entrada reducen los sustitutos y la elasticidad, y eso eleva el markup. La política de competencia vigila las fusiones y el bloqueo de entrada. (CORE 7.9, 7.12)' },
];

// ---------------------------------------------------------------------------

export function fmt(key, vars = {}) {
  const tpl = T[key];
  if (tpl === undefined) return `⟦${key}⟧`;
  return tpl.replace(/\{(\$?)(\w+)\}/g, (_, isMoney, name) => {
    const v = vars[name];
    if (v === undefined || v === null || (typeof v === 'number' && !Number.isFinite(v))) return `⟦${name}⟧`;
    if (typeof v === 'number') return isMoney ? money(v) : number(v);
    return String(v);
  });
}

const priceLabel = (x) => (x === 'H' ? 'precio alto' : 'precio bajo');

function matrixView(matrix, H, L, rival) {
  return { caption: fmt('ui.matrix.caption', { rival }), H, L,
    colHigh: fmt('ui.matrix.high', { P: H }), colLow: fmt('ui.matrix.low', { P: L }),
    cells: Object.fromEntries(Object.entries(matrix).map(([k, [me, riv]]) => [k, `${money(me)} , ${money(riv)}`])) };
}

function checkpointVars(built, run) {
  const v = { ...built.vars, rival: run.params.rival.name };
  if (built.kind === 'numeric') v.answer = built.answer;
  if (built.kind === 'mc') v.answerLabel = fmt(`cp.${built.itemId}.opt.${built.answer}`, built.options.find((o) => o.id === built.answer)?.vars ?? {});
  if (v.me) v.meLabel = priceLabel(v.me);
  if (built.vars.rival === 'H' || built.vars.rival === 'L') v.rivalLabel = priceLabel(built.vars.rival);
  return v;
}

function quarterComment(q, run) {
  if (q.rival) return fmt(`qr.ronda.${q.me}${q.rival}`, { rival: run.params.rival.name });
  const star = (run.state.demand.a + q.c) / 2;
  if (q.P < q.c) return fmt('qr.precio.bajo_costo');
  if (q.P === star) return fmt('qr.precio.optimo');
  return fmt(q.P > star ? 'qr.precio.alto' : 'qr.precio.bajo');
}

function decisionOptionLabel(id, o, vars, run) {
  const p = run.params;
  if (o.kind === 'precio') return fmt('opt.precio', { P: o.price });
  if (id === 's2_inversion') {
    const cost = { ninguna: 0, tostadora: p.roaster.cost, marca: p.brand.cost, ambas: p.roaster.cost + p.brand.cost }[o.id];
    return fmt(`opt.s2_inversion.${o.id}`, { cost, dF: p.roaster.dF, dc: p.roaster.dc });
  }
  if (id === 's3_movida') return fmt(`opt.s3_movida.${o.id}`, { cost: o.id === 'lealtad' ? p.loyalty.cost : p.block.cost });
  if (id.startsWith('s3_ronda')) return fmt(`opt.s3_ronda.${o.id}`, vars);
  return fmt(`opt.${id}.${o.id}`, vars);
}

export function describeStep(step, run) {
  const rival = run.params.rival.name;
  switch (step.kind) {
    case 'narration': {
      const key = step.id === 's2_choque' ? `nar.s2_choque.${step.vars.type}` : `nar.${step.id}`;
      return { kind: 'narration', title: fmt(`${key}.title`, step.vars), body: fmt(key, step.vars), button: fmt('ui.continue') };
    }
    case 'decision': {
      const id = step.id; const key = id.startsWith('s3_ronda') ? 'dec.s3_ronda' : `dec.${id}`;
      const vars = { ...step.vars, rival, loyalPct: step.vars.loyalShare !== undefined ? pct(step.vars.loyalShare) : '' };
      const d = { kind: 'decision', body: fmt(key, vars),
        options: step.options.map((o) => ({ id: o.id, label: decisionOptionLabel(id, o, vars, run) })) };
      if (vars.survey) d.table = { head: [fmt('ui.survey.price'), fmt('ui.survey.qty')], rows: vars.survey.map((r) => [money(r.P), number(r.Q)]) };
      if (vars.matrix) d.matrix = matrixView(vars.matrix, vars.H, vars.L, rival);
      return d;
    }
    case 'quarterResult': {
      const q = step.quarter;
      if (!q) return { kind: 'quarterResult', title: fmt('qr.bankrupt'), body: fmt('qr.quiebra_inversion'), button: fmt('ui.continue') };
      const body = quarterComment(q, run) + (step.bankrupt ? '\n\n' + fmt('qr.bankrupt') : '');
      return { kind: 'quarterResult', title: fmt('qr.title', { n: run.state.quarters.length }),
        numbers: fmt('qr.numbers', q), body, button: fmt('ui.continue') };
    }
    case 'checkpoint': {
      const b = step.built; const vars = checkpointVars(b, run);
      const d = { kind: 'checkpoint', body: fmt(b.promptKey, vars), input: b.kind,
        button: fmt(b.kind === 'numeric' ? 'ui.answer' : 'ui.send') };
      if (b.kind === 'mc') d.options = b.options.map((o) => ({ id: o.id, label: fmt(o.labelKey, o.vars) }));
      if (b.vars.matrix) d.matrix = matrixView(b.vars.matrix, b.vars.H, b.vars.L, rival);
      return d;
    }
    case 'feedback': {
      const b = step.built; const vars = checkpointVars(b, run);
      const yours = b.kind === 'numeric' ? number(step.input) : fmt(`cp.${b.itemId}.opt.${step.input}`, b.options.find((o) => o.id === step.input)?.vars ?? {});
      const right = b.kind === 'numeric' ? number(b.answer) : vars.answerLabel;
      return { kind: 'feedback', correct: step.correct, title: fmt(step.correct ? 'ui.correct' : 'ui.incorrect'),
        detail: fmt('ui.yourAnswer', { yours, right }), body: fmt(b.explanationKey, vars), button: fmt('ui.continue') };
    }
    case 'openText':
      return { kind: 'openText', title: fmt('open.title'), body: fmt('open.prompt'), placeholder: fmt('open.placeholder'), button: fmt('ui.send') };
    case 'ending': {
      const e = ENDING_TEXT[step.ending]; const s = step.score;
      return { kind: 'ending', title: e.title, body: e.text, scoreTitle: fmt('ui.score.title'),
        rows: [[fmt('ui.score.outcome'), number(s.outcomePts)], [fmt('ui.score.checkpoints'), number(s.checkpointPts)],
          [fmt('ui.score.value'), number(Math.round(s.valuePts * 10) / 10)], [fmt('ui.score.total'), number(s.total)]],
        valueLine: fmt('ui.score.valueLine', { value: run.finalValue ?? 0, bench: Number.isFinite(run.benchmark) ? run.benchmark : 0 }),
        note: fmt('ui.score.best'), button: fmt('ui.newRun') };
    }
    default: return { kind: step.kind, body: '' };
  }
}
