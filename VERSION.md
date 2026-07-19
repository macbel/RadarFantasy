# Version 3.8.15

Fecha de publicación: 2026-07-19

## Notas de versión

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
