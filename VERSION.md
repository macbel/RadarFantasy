# Version 3.11.1

Fecha de publicación: 2026-08-21

## Notas de versión

- La racha muestra exclusivamente partidos disputados en la temporada actual y descarta el histórico anterior del popup.
- El detalle de minutos indica si el jugador fue titular o, si entró desde el banquillo, el minuto de entrada disponible en las fuentes.
- El mercado distingue lesionados con una cruz roja y sancionados con tarjeta roja, incluyendo duración y enlace al parte médico cuando existe.
- La protección de saldo respeta el primer partido real de la jornada y la resolución diaria de pujas a las 07:00; una jornada ya iniciada no bloquea pujas de forma retroactiva.
- Se usa la próxima resolución comunicada por Biwenger cuando está disponible y las 07:00 del día siguiente como respaldo.

## Historial 3.11.0

- Añadido el sistema Feeberse Score y la modalidad Media AS/Feeberse.
- La puntuación se detecta automáticamente desde la configuración real de cada liga de Biwenger.
- Feeberse aporta el calendario de LaLiga y enlaces directos a los partidos, con las fuentes anteriores como respaldo.
- Las recomendaciones incorporan el historial, las valoraciones y los minutos jugados publicados por Feeberse.
- El popup de la racha muestra los minutos exactos, rival, fecha y la procedencia Feeberse Score.
- Las consultas públicas de Feeberse se almacenan temporalmente en caché para mejorar estabilidad y tiempos de carga.

## Historial 3.10.4

Fecha de publicación: 2026-08-14

- Los entrenadores quedan excluidos de todas las posiciones del campo y nunca pueden ocupar una plaza de MC.
- Las alineaciones antiguas que tenían un entrenador entre los once se reparan automáticamente.
- Las recomendaciones calculan el saldo tras todas las pujas activas y protegen el inicio de la próxima jornada.
- Si un fichaje dejaría el saldo negativo al comenzar la jornada, se bloquea, recomienda puja cero e indica cuánto dinero debe liberarse y antes de qué fecha.

## Historial 3.10.3

- LaLiga ya no puede confundirse con Bundesliga al buscar la competición en los proveedores de calendarios.
- Se invalida la caché de partidos incorrecta y la aplicación comprueba la competición recibida antes de mostrarla.
- Las alineaciones importadas o guardadas con solo un jugador por demarcación se completan automáticamente hasta once.
- El campo y el editor recuperan todos los titulares y sus selectores tras seleccionar o volver a importar la liga.

## Historial 3.10.2

- "Actualizar todo" fuerza una consulta nueva del calendario y deja de aceptar la caché como una actualización completada.
- El calendario se carga antes que el resto de secciones y valida cuántos jugadores reciben próximo rival.
- SofaScore y ESPN se combinan durante la actualización manual para mejorar la cobertura de equipos y partidos.
- Un fallo en noticias o fuentes secundarias ya no impide actualizar calendario, plantilla, mercado y las demás secciones.
- Si las fuentes devuelven un calendario vacío o de otra competición, se conserva el último calendario válido y se muestra el error real.

## Historial 3.10.1

- Las noticias de jugadores solo muestran publicaciones fechadas de los últimos siete días, con fecha visible y orden de más reciente a más antigua.
- Recuperados los próximos partidos de LaLiga 2026/27 mediante la consulta vigente y nuevos alias de equipos; el mercado invalida su análisis al recibir el calendario.
- La multiposición respeta el ajuste real de la liga, completa formaciones con posiciones alternativas y envía el once a Biwenger en el orden de demarcaciones correcto.
- Los suplentes se importan y envían con el contrato actual `reservesID`, uno por demarcación.
- El número de pujas se consulta automáticamente cuando la cuenta lo incluye; en cuentas básicas exige confirmación individual porque Biwenger cobra una moneda, y los fallos ya no se muestran falsamente como cero.
- Mejorado el contraste del banquillo en modo diurno.

## Historial 3.10.0

- Datos, favoritos, preferencias y cachés separados por usuario y liga.
- "Actualizar todo" espera las cargas en curso y ejecuta equipo, mercado, pujas, fuentes, noticias, calendario y centro de liga.
- El editor de alineación incorpora cuatro suplentes, uno por demarcación, y permite elegir cualquiera de las posiciones admitidas por Biwenger.
- Ajustes simplificados: Futbol Fantasy y la configuración de API quedan ocultos salvo que se activen expresamente.
- Ampliada la detección de contadores de pujas y descartadas noticias de jugadores con más de 180 días.

## Historial 3.9.3

- Tras acceder a Radar Fantasy, si Biwenger no está conectado aparece directamente el formulario de conexión.
- La opción de actualizar al conectar ejecuta ahora una actualización completa y comprueba su resultado.
- El mercado recupera los próximos partidos mediante una ruta alternativa cuando el primer calendario no contiene encuentros futuros.

## Historial 3.9.2

- En la primera jornada, cuando todavía no hay historial de la temporada actual, las recomendaciones de mercado usan los últimos partidos disponibles de la temporada anterior.
- La app identifica la temporada de cada muestra y explica en el detalle del jugador cuándo está aplicando este respaldo.
- Corregida la detección de final de temporada para que una jornada 1 aislada no cierre las pujas por error.

## Historial 3.9.1

- "Actualizar todo" carga plantilla, mercado, fuentes, noticias del equipo, calendario, centro de liga, director deportivo, favoritos y seguimiento de equipos.
- La carga completa al iniciar solo comienza tras autenticar al usuario y disponer de una liga de Biwenger seleccionada.
- La liga elegida se conserva durante toda la actualización aunque Biwenger tuviera otra liga activa previamente.

## Historial 3.9.0

- Acceso obligatorio mediante cuenta de Radar Fantasy.
- Primera cuenta administradora creada desde el asistente de arranque, sin contraseñas fijas en el código.
- Administración de usuarios con altas, edición, bloqueo, eliminación y permisos por sección.
- Recuperación de contraseña mediante enlace temporal enviado por correo electrónico.
- Datos de ligas separados por usuario tanto en servidor como en el dispositivo.
- Las ligas de una cuenta Biwenger se crean y actualizan automáticamente en el selector al conectarla.
- Al elegir otra liga Biwenger, la sesión cambia a esa liga y sincroniza sus datos.
- Retirada temporal de la integración manual con LaLiga Fantasy.

## Historial 3.8.15

- Al abrir, la app muestra la última copia disponible y actualiza automáticamente equipo, mercado, calendario y centro de liga cuando Biwenger está conectado.
- "Actualizar todo" valida cada paso y conserva los últimos datos correctos si una operación falla.
- Clasificación y calendario se guardan por liga, tanto en el dispositivo como en la API, para poder abrir el centro de liga sin conexión.

- Noticias de equipos con selector persistente por fuente y máximo de cinco titulares por fuente, ordenados por actualidad.
- Consulta directa de FutbolFantasy con sus cabeceras específicas en el feed de equipos.
- Reintento secuencial para páginas de FutbolFantasy bloqueadas durante consultas simultáneas.
- Respaldo de lectura de texto para titulares de FutbolFantasy bloqueados por la IP del hosting.
- El respaldo se prioriza sobre respuestas de bloqueo que aparentan ser páginas válidas.
- Modo día corregido para las tarjetas de escenarios y lectura de rivales del Plan de hoy.
- Noticias de favoritos reforzadas: FutbolFantasy se consulta directamente y se prioriza sobre los resultados de prensa generalista.
- La competición se sincroniza desde Biwenger para cada liga conectada; la puntuación sigue siendo configurable de forma independiente.
- Modo día mejorado: botonera, liga activa, tarjetas de Plan de hoy y editor de alineación con más contraste.
- El editor de alineación distribuye correctamente líneas de cinco jugadores sin solapamientos.
- Plan de hoy protege el once durante una jornada en curso: no recomienda ventas que dejen una plantilla sin una alineación válida de 11 jugadores.
