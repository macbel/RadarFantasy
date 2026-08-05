# Version 3.10.0

Fecha de publicación: 2026-08-05

## Notas de versión

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
