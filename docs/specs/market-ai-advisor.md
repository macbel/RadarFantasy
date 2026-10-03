# Asesor IA de Mercado: especificación de implementación

Fecha: 2026-10-02. Estado: opción 2 elegida por el usuario y desarrollo autorizado; no acredita implementación, llamada IA real ni despliegue.

## Decisión vigente: agente local con Codex y cuenta ChatGPT

El usuario eligió el agente local con plan ChatGPT, conectado a Mercado para su cuenta Radar vinculada. Autoriza su desarrollo conforme al workflow del proyecto. No implementar la alternativa API OpenAI de pago. Codex CLI ya está instalado y el proceso principal verificó `codex login status`: `Logged in using ChatGPT`. No leer, copiar, exportar ni introducir tokens ChatGPT; la CLI gestiona su autenticación habitual.

| Alternativa | Dónde razona/se ve el plan | Requisitos y límite |
|---|---|---|
| ChatGPT privado con MCP/plugin o GPT Actions | ChatGPT consulta un snapshot propio autenticado de Radar y devuelve el plan dentro de ChatGPT | Puente autenticado de sólo lectura y compatibilidad del producto/plan. No implica devolver automáticamente el resultado a la pantalla Mercado |
| Agente local en PC con plan ChatGPT (elegida) | Worker local ejecuta Codex CLI, lee snapshot privado y devuelve salida estructurada a Mercado | Login ChatGPT existente gestionado por CLI; PC encendido/conectado; relay HTTPS privado con conexiones salientes |
| Backend convencional con API | Plan integrado directamente en Mercado y disponible sin PC personal | Proveedor/clave y facturación API independiente; alternativa conservada, no elegida |

La documentación oficial de [Sign in with ChatGPT para aplicaciones locales o de código abierto](https://developers.openai.com/siwc/token-sharing-open-source) describe registro OAuth y uso del plan ChatGPT para peticiones Responses elegibles sin clave API. Aplicaciones alojadas remotamente o de pago requieren el proceso de interés descrito por OpenAI; no asumir que el hosting PHP actual es elegible. Este acceso no equivale a automatizar la interfaz de ChatGPT, reutilizar cookies ni exportar tokens de la sesión del usuario.

La vía elegida usa Codex CLI con su sesión ChatGPT existente, sin registro de una nueva aplicación OAuth ni préstamo de credenciales al hosting. La referencia SIWC anterior describe una alternativa histórica, no un requisito de esta implementación. El relay PHP transporta trabajos y resultados; no llama directamente al modelo. Funciona desde la APK fuera de la LAN porque el PC consulta el relay por HTTPS saliente, sin abrir puertos entrantes en el ordenador.

### Contrato del relay privado

Prefijo propuesto `/api/market-advisor`; JSON schemaVersion 1. Las rutas web requieren la autenticación Radar existente. Sólo la cuenta explícitamente habilitada y emparejada puede crear trabajos. El backend obtiene accountId de la sesión; nunca confía en accountId enviado por cliente. Permiso market obligatorio; contexto team/league sólo si la cuenta conserva esos permisos.

| Método/ruta | Autenticación | Entrada y salida |
|---|---|---|
| GET `/status` | Usuario Radar | `{enabled, paired, workerOnline, lastSeenAt, queuedJobs}` sin secretos |
| POST `/pair/start` | Usuario Radar elegible | Crea código aleatorio temporal de emparejamiento, máximo 5 minutos; devuelve `{pairCode, expiresAt}` sólo a esa cuenta |
| POST `/worker/pair` | Código temporal + límites IP | `{pairCode, workerName}`; consume código una vez y devuelve `{workerId, workerToken, accountScope}`. Token aleatorio independiente de ChatGPT, sólo esta vez |
| POST `/pair/revoke` | Usuario Radar vinculado | Revoca worker, token y trabajos pendientes; deja cuenta sin conexión |
| POST `/jobs` | Usuario Radar vinculado | `{schemaVersion, requestId, context}` según snapshot del documento; devuelve 202 `{jobId, status:"queued", expiresAt}` |
| GET `/jobs/{id}` | Mismo usuario Radar | `{jobId,status,createdAt,expiresAt,result?,errorCode?}`; estados queued/running/completed/failed/expired |
| POST `/worker/claim` | Bearer workerToken | Claim atómico del siguiente trabajo de SU cuenta; devuelve `{jobId,leaseId,context,expiresAt}` o `{job:null}` y registra heartbeat |
| POST `/worker/result` | Bearer workerToken | `{jobId,leaseId,result}` o `{jobId,leaseId,errorCode}`; terminalización única y validación schema/límites |

Emparejamiento explícito mediante UI y comando del worker: el usuario inicia el código en Radar y lo introduce en el PC. Guardar backend sólo hash de token/código con comparación constante. El worker almacena su token Radar en fichero local privado ignorado por Git con ACL de usuario; nunca forma parte de APK, enlaces ni logs. Revocación inmediata y rotación mediante nuevo emparejamiento. Sólo una vinculación activa inicial; ninguna capacidad de consultar cuentas distintas.

Cola fuera de document root o con denegación HTTP verificada, locks para transiciones/cuotas y límites por cuenta. TTL inicial: 5 minutos hasta claim, lease 3 minutos; job total máximo 10 minutos. Snapshot minimizado persiste transitoriamente para traslado, exclusivamente en la cola, como excepción explícita de transporte al modelo local de datos. Se elimina del relay tras claim; worker lo conserva únicamente en memoria y en stdin de Codex. No reentregar snapshots borrados si el worker falla: marcar fallo y permitir una nueva solicitud explícita. Mantener sólo metadatos mínimos/validadores de IDs, hash y guardas financieras durante lease. Tras completion/error/TTL borrar esos validadores y contexto; resultado mínimo disponible máximo 15 minutos para recogida, después borrar. Barrido en cada acceso y tarea de limpieza si el hosting lo permite. No guardar prompts ni logs privados.

Límites iniciales: cuerpo 128 KiB, 1 job activo por cuenta, 6/hora y 20/día, salida 32 KiB/2000 tokens, 50 resultados/metadata como límite de almacenamiento global configurable. requestId idempotente por cuenta durante TTL; no replay de pairCode, lease ni result terminal. No permitir token worker en querystring, CORS abierto, IDs de trabajo enumerables o `worker/claim` autenticado con sesión de otro usuario. Claim/result verifican worker/account/job/lease y permisos vigentes. Al revocar o bloquear cuenta se invalidan todos.

### Ejecución local confinada

Worker Node local de una sola ejecución concurrente, poll saliente con backoff y abort por timeout. Comprobar CLI/login al arrancar sin mostrar secretos. Lanzar mediante spawn y argumentos, sin interpolación de shell, en directorio vacío aislado: `codex exec --ignore-user-config --ephemeral -s read-only --output-schema <schema> --skip-git-repo-check -`. Enviar instrucciones fijas y snapshot como bloque de datos por stdin; recoger JSON estructurado. Configuración mínima, únicamente autenticación ChatGPT administrada por CLI; sin API key, MCP, instrucciones del repo, herramientas de navegación ni ejecución solicitadas por noticias. Si el sandbox permite herramientas de lectura, no proporcionar archivos privados ni directorio del proyecto y verificar comportamiento real. El archivo schema es estático y no contiene datos personales.

Nunca tratar exit 0 por sí solo como análisis válido: validar JSON, IDs/evidencias y límites financieros en worker, relay y cliente. Limitar tiempo y bytes stdout/stderr; logs saneados con código/duración, no prompt ni texto privado. No guardar transcripción: `--ephemeral`, directorio sin datos persistidos y retirada de temporales si los hubiera. No alterar el entorno/configuración global de Codex ni revocar el login existente. Usuario sin permisos, cuenta no emparejada, PC offline, límite ChatGPT, CLI fallida o salida inválida dan estado concreto y análisis local etiquetado; nunca `mode:ai` sin una ejecución real válida.

## Objetivo y flujo

En Mercado, «Analizar mi estrategia» genera una recomendación con el mercado actual, plantilla propia, clasificación, plantillas rivales visibles, puntuación de la liga, lesiones/sanciones, racha, calendario, noticias y presupuesto. Devuelve una estrategia concreta: prioridades, compras con límite, ventas candidatas, jugadores que conservar o evitar y condiciones para cambiar de plan. El usuario puede seleccionar perfil prudente/equilibrado/agresivo y horizonte de 1 o 3 jornadas. Perfil predeterminado: equilibrado y próxima jornada.

Es un asesor de lectura. Sus respuestas nunca ejecutan pujas, ventas, ofertas o cambios de alineación. Abrir una ficha o revisar una operación existente conserva el flujo normal de confirmación del usuario; no conectar su salida a executeAssistantPlan.

Antes de cambiar la interfaz, presentar una vista previa de la tarjeta y su detalle para revisión del usuario. La tarjeta debe ser compacta: estrategia en dos frases, tres prioridades, fecha/cobertura, «Ver plan» y «Actualizar análisis». Detalle con compras, ventas, rivales, riesgos y fuentes. Estados: sin mercado, preparando datos, analizando, parcial, sin conexión, IA sin configurar y error recuperable. Conservar accesible el análisis actual.

## Evidencia del repositorio y fuentes reutilizables

No se encontraron AGENTS.md en la carpeta del proyecto ni en sus ancestros comprobados. Aplicar el workflow recordado: análisis/especificación por agente mínimo suficientemente capaz, después ejecución por agente ajustado al riesgo, validación y entrega conforme al proyecto; no selección fija de Astra.

| Contexto | Fuente existente | Tratamiento requerido |
|---|---|---|
| Mercado/propia | state.players, state.teamPlayers; /api/biwenger/import, biwenger_import_players | Snapshot de liga activa; mantener ID Biwenger estable y fecha |
| Finanzas y pujas | state.finance, state.biwengerOperations; importación/operaciones Biwenger | Saldo, límite, pujas comprometidas y ofertas visibles; null significa desconocido |
| Clasificación | state.leagueOverview; /api/biwenger/league, biwenger_league_overview | Posición propia, puntos y distancia; no inventar jornadas restantes |
| Rivales | /api/biwenger/rival-team, biwenger_rival_team; state.rivalTeam/rivalProfiles | Hoy sólo se mantiene una plantilla completa; añadir caché local por ID rival/liga/cuenta |
| Estado y racha | /api/enrich; health, fetchedAt, sourceSummary.recentMatches/biwenger.fitness | Separar hechos de estimaciones; starter/form/asScore iniciales pueden ser valores derivados de importación |
| Noticias | /api/team-news y /api/favorite-news; favorite_news_payload | Extender colección al mercado sin exigir favorites; reutilizar helpers, fechas y enlaces; enlaces de perfil no son noticias confirmadas |
| Calendario | state.leagueFixtures, /api/biwenger/fixtures | Partido/fecha/dificultad sólo cuando están presentes |
| Motor actual | assistantMarketPlayers, assistantTeamPlayers, smartBidPlan, renderMarketPlan, playerDataReliability, analysisConfidence | Mantener límites y ranking calculados; IA explica y compara, no reemplaza las comprobaciones |

El análisis actual ya ofrece plan de mercado, director deportivo, pujas/ventas y presión rival mediante reglas. La integración aporta síntesis contextual verificable. No presentar ese motor existente como llamada a un modelo IA.

## Arquitectura

1. Módulo JS dedicado `market-ai-advisor.js`: construcción/minimización del snapshot, estado de petición, fallback determinista, render seguro y persistencia por cuenta/liga. `app.js` expone un adaptador pequeño a las funciones anteriores. Evitar duplicar todo el motor.
2. Relay autenticado PHP en archivo helper dedicado y rutas en `api/index.php` según contrato privado anterior; soporte local Node equivalente para pruebas. El relay no tiene credenciales ni adaptador LLM.
3. El cliente reúne datos locales y utiliza las pasarelas existentes. Snapshot transitorio en cola sólo para traslado al PC, con borrado y TTL descritos arriba; la fuente de verdad y resultado recogido continúan en `mobile-local-first.js`, aislados por cuenta/liga.
4. Worker local ejecuta Codex CLI con login ChatGPT ya gestionado por CLI, salida schema y sandbox de lectura. Modelo según configuración mínima compatible del CLI y plan, sin que cliente remoto elija endpoints/configuración arbitrarios. Coste/consumo sujeto al plan y sus límites, sin prometer ejecución ilimitada.
5. Sin PC conectado, sin red o con fallo CLI, producir estrategia determinista marcada «Análisis local». Preservar análisis anterior de la misma liga mostrando fecha y motivo real.

No hay código ni variables de entorno IA detectados en esta inspección. No se inspeccionó configuración secreta del hosting y no puede afirmarse su ausencia remota. La cuenta/suscripción de Codex no configura por sí sola una clave API de la aplicación.

## Recopilación, cobertura y vigencia

Una petición manual prepara mercado/propia/finanzas/clasificación; no provocar fan-out de fuentes al abrir Mercado. Cachear rivales por cuenta + liga + competición + puntuación + ID, con fecha. Para cubrir todas las plantillas visibles, recorrer la clasificación con concurrencia máxima 2, tiempo total limitado y respeto a cooldown Biwenger/HTTP 429. Reutilizar catálogo de competición dentro de la actualización; no volver a descargarlo por rival. No actualizar por bucles de reintento automáticos. Siempre informar `rivalsLoaded/rivalsTotal` y IDs ausentes; una liga grande puede entregar análisis parcial sin fingir cobertura completa.

Límites iniciales: 80 mercado, 40 propia, 50 rivales resumidos; máximo 40 jugadores detallados para IA (selección determinista de mejores candidatos, críticos de propia y amenazas rivales), últimas 5 actuaciones disponibles y hasta 2 noticias relevantes por jugador seleccionado. El motor local puede evaluar todas las plantillas cargadas; resumir al modelo necesidades/cobertura/amenazas de cada rival y detallar los cercanos en clasificación. Mostrar recorte si excede límites.

Finanzas/mercado: marcar obsoleto tras 15 minutos o cambio de contexto; no recomendar cantidad concreta con finanzas obsoletas/desconocidas. Rivales: reutilizar hasta 6 horas y mostrar fecha; estado deportivo/noticias: advertir tras 24 horas, excluir titulares sin fecha como soporte de afirmaciones de actualidad. Noticias hasta 7 días según helper existente, con fecha de publicación real cuando exista; `fetchedAt` no sustituye `publishedAt`. Cero noticias significa cobertura ausente, no jugador sano.

La firma del snapshot incluye cuenta/liga, competición/puntuación, perfil/horizonte y datos normalizados. Cambio de usuario/liga/logout invalida estado y aborta fetch. Un ID de generación evita que una respuesta lenta de otra liga se pinte o almacene. Cambios de precio, puja, lesión, plantilla, saldo o clasificación invalidan caché aunque el TTL siga vigente.

## Contratos v1

Contenido lógico de `POST /api/market-advisor/jobs`, Content-Type JSON, autenticación existente por `apiFetch`. El transporte es asíncrono según contrato del relay; la respuesta de estrategia de esta sección es `result` del trabajo completado. Requerir permiso market. Si se incluyen datos de propia o rivales, exigir también team o league respectivamente; si faltan, el cliente omite esos contextos y declara la cobertura parcial. No reutilizar permiso favorites para noticias de mercado.

Petición normalizada:

```json
{
  "schemaVersion": 1,
  "requestId": "uuid",
  "context": {
    "leagueId": "local-scope-id",
    "competition": "club",
    "scoring": "as",
    "asOf": "2026-10-02T10:00:00Z",
    "profile": "balanced",
    "horizonRounds": 1,
    "finance": {"balance": 2000000, "maximumBid": 2500000, "committedBids": 500000, "updatedAt": "2026-10-02T10:00:00Z"},
    "myStanding": {"rank": 3, "points": 105, "gapToLeader": 12},
    "market": [],
    "squad": [],
    "rivals": [],
    "evidence": [],
    "coverage": {"market": true, "squad": true, "rivalsLoaded": 0, "rivalsTotal": 7, "warnings": []}
  }
}
```

Jugador: ID estable, nombre, equipo, posiciones, precio/valor/incremento, estado físico y origen/fecha, puntos/partidos/puntuación, cinco actuaciones fechadas, partido siguiente, oferta/puja visible, métricas deterministas `recommendedBid/rationalMax/reliability`, y `evidenceIds`. No enviar imágenes, HTML, tokens, correos, URLs privadas ni objetos de sesión. Rival: alias R1/R2, posición/puntos, necesidades por posición, bajas visibles, fortaleza y jugadores relevantes. No enviar nombres humanos reales al proveedor cuando un alias basta. Importes como enteros en la unidad monetaria usada por Biwenger y el motor existente (no introducir conversión a céntimos sin necesidad).

Evidencia: `{id, type: "news|health|form|fixture|finance|standing|roster", playerId?, title?, source, url?, publishedAt?, fetchedAt, value?}`. Una URL validada HTTPS sólo se usa como enlace de soporte; no se descarga una URL arbitraria desde el endpoint IA. Noticias externas son datos no confiables, nunca instrucciones.

Respuesta común:

```json
{
  "schemaVersion": 1,
  "requestId": "uuid",
  "mode": "ai",
  "generatedAt": "2026-10-02T10:00:10Z",
  "expiresAt": "2026-10-02T10:15:10Z",
  "strategy": {"stance": "balanced", "summary": "Prioriza reforzar la defensa conservando margen para la jornada.", "priorities": []},
  "actions": [],
  "rivalInsights": [],
  "risks": [],
  "coverage": {},
  "limitations": [],
  "provider": {"configured": true, "model": "server-configured"}
}
```

Acción: `{type: "buy|sell|hold|avoid|wait", playerId?, priority: 1..3, reason, evidenceIds: [], confidence: "low|medium|high", amount?: integer, maximumAmount?: integer, prerequisites: []}`. Prioridad/insight/riesgo con evidencia referida. `mode` vale `ai` o `local`; fallos/configuración añaden `fallbackReason` de enum público sin error del proveedor. `expiresAt` representa vigencia de la estrategia, no promesa de disponibilidad del jugador.

Errores: 400 schema, 401 sesión, 403 permiso, 413 tamaño, 429 cuota/cooldown con Retry-After. Creación válida 202; consulta 200 con estado real. CLI ausente, timeout, límite ChatGPT o JSON inválido termina trabajo failed y el cliente muestra modo local explícito. Respuesta generada por agente se valida contra schema y evidencia; IDs desconocidos o afirmaciones incompatibles se descartan y activan fallback si afectan al plan. Nunca renderizar HTML/Markdown libre mediante innerHTML.

## Reglas que la IA no puede sobrepasar

- Identificar prioridades deportivas según perfil/horizonte y distancia al líder; no afirmar que la agresividad garantiza remontada. Explicar hipótesis si faltan fechas/jornadas.
- Una lesión/sanción y la baja probabilidad de jugar penalizan la compra inmediata; compra especulativa sólo etiquetada y condicionada, con evidencia. Una racha de puntos fantasy no equivale a diagnóstico médico ni probabilidad estadística calibrada.
- Límite por jugador nunca mayor que racionalMax y maximumBid conocidos. Plan combinado respeta presupuesto y reserva del motor; contabiliza compromiso incremental, sin duplicar las pujas propias ya incluidas.
- Venta propuesta no financia una compra como ingreso garantizado: separar escenario de venta confirmada y venta pendiente. No contar premios futuros desconocidos ni suponer liquidez rival oculta.
- No vender un titular clave sin comparar sustituto, posiciones elegibles, cobertura y próximo partido. Con deuda, resolver saldo antes de compras salvo escenario condicionado explícito.
- Rivales: sólo datos visibles en la liga; necesidades/demanda son inferencias, no conocimiento de intención o puja oculta. No decir que se han analizado todas sus plantillas si falta alguna.
- Noticias citadas mediante IDs válidos y enlaces de la evidencia; no inventar actualidad, importes, retornos de lesión, calendario ni fuentes. Conflicto entre fuentes se conserva como incertidumbre.

## Seguridad y coste operativo

Variables propuestas para relay: `FMS_ADVISOR_ENABLED`, `FMS_ADVISOR_ALLOWED_ACCOUNT_ID`, `FMS_ADVISOR_QUEUE_DIR`, `FMS_ADVISOR_JOB_TTL_SECONDS`, `FMS_ADVISOR_MAX_INPUT_BYTES`, `FMS_ADVISOR_DAILY_REQUEST_LIMIT`. Worker: URL HTTPS relay, token Radar privado y ruta de CLI; sin `FMS_AI_API_KEY`. TLS validado para relay aunque las fuentes heredadas tengan configuración menos estricta. Configuración de cuenta habilitada verificada con la identidad autenticada actual; no hardcodear ID arbitrario.

Límites del relay anteriores obligatorios; objetivo de entrada 12000 tokens y salida 2000, una ejecución Codex por generación, timeout local 120 s dentro del lease. Idempotencia por requestId/hash dentro de ventana corta, cuotas atómicas. Status distingue enabled, paired, workerOnline y login válido local; ningún éxito simulado.

Cachear resultado en dispositivo durante 15 minutos por firma/cuenta/liga. Snapshot del relay sólo transporte con TTL y borrado anteriores; logs sólo código/duración y correlación no secreta. Informar que usa límites del plan ChatGPT vinculado al PC; no inventar coste por análisis ni afirmar que no consume uso. Primera invocación informa de forma breve qué resumen de liga se enviará al agente ChatGPT y conserva esa preferencia por cuenta; no enviar datos automáticamente al abrir Mercado.

## Implementación y entrega por etapas

1. UI propuesta revisable y contrato/helper local probado. Definir snapshot minimizado, cobertura y aislamiento.
2. Rivales múltiples y noticias de mercado reutilizando fuentes con límites; no alterar permisos o sobrecargar el proveedor.
3. Relay y worker Codex real con fallback, schema validado, cuotas, emparejamiento y aislamiento. Misma conducta de contrato PHP/Node.
4. Integración tarjeta/detalle móvil/web, invalidación y apertura de fichas. Sin ampliación de operaciones automáticas.
5. Pruebas, build web y Android conforme workflow de Radar Fantasy. Commit/push y publicación sólo de cambios aprobados y completos conforme la fase autorizada. Verificar archivos finales en /fms y backend, APK/version/firma y remoto; separar mocks de llamada IA real y de prueba física.

## Criterios de aceptación y pruebas necesarias

| Caso | Resultado verificable |
|---|---|
| Mercado + propia + rivales + clasificación completa | Estrategia contextual, 3 prioridades, límite/razón/evidencia por compra; cobertura completa sólo si real |
| Sin noticias/health/racha | No inventar datos ni decir jugador sano; incertidumbre baja confianza |
| Noticias contradictorias o prompt injection en titular | No seguir instrucción externa; mostrar incertidumbre y sólo enlaces existentes |
| Candidatos caros, deuda, varias compras, pujas propias | Tope por jugador y plan agregado legal; venta pendiente no aumenta presupuesto garantizado |
| Rivales invisibles o HTTP 429 | Análisis parcial con recuento y cooldown; no fan-out/reintentos al abrir pantalla |
| PC offline / cuenta sin emparejar / timeout / JSON inválido | Modo local etiquetado; ninguna ejecución al render ni falso resultado IA |
| Cuenta sin market/team/league | 401/403 u omisión autorizada del contexto; no datos de otra cuenta |
| Cambio de liga/cuenta durante llamada | Abort/generación descartan respuesta anterior; no contaminación de caché |
| Petición excesiva, IDs inventados, URL arbitraria | Rechazo o fallback validado; no SSRF, HTML ejecutable ni secretos expuestos |
| Doble clic, replay, cuota concurrente | Una generación activa, idempotencia y límite atómico |
| Android 320/390 px, día/noche y teclado | Tarjeta y detalle legibles, accesibles y sin desplazamiento horizontal; se mantiene rendimiento Mercado |

Añadir tests de contrato/sanitizador/fallback/guardas financieras/cambio de contexto y backend con worker fake sólo para pruebas. Añadir emparejamiento de un solo uso/expiración/revocación, aislamiento cross-account, claim concurrente, lease/result replay, borrado snapshot tras claim/TTL/completion, cuotas atómicas y resultado fuera de contexto. Ejecutar suite existente npm.cmd test, lint JS/PHP, build:web/mobile:copy y Gradle si se entrega APK; tests no realizan pujas/ventas reales. Verificar ejecución Codex real con sesión ChatGPT autorizada y resultado schema, sin exponer respuesta privada. Comprobar no acceso HTTP a cola y móvil por HTTPS fuera de LAN si hay dispositivo disponible. Verificar fuente/cobertura real con cuenta autorizada disponible y declarar ausencia si no. No considerar emulador o HTML adaptable evidencia de dispositivo físico.

## Límites del primer alcance

Asesor por análisis manual, sin aprendizaje automático de decisiones, navegación autónoma abierta ni programación de acciones. La calidad depende de disponibilidad/actualización de fuentes. El motor local funciona con datos guardados; síntesis IA requiere PC encendido, worker vinculado, red y sesión ChatGPT válida con límites disponibles. El análisis no promete acierto, precio de cierre ni conducta de rivales. Relay preparado sin ejecución CLI real y entrega de resultado a Mercado no es servicio IA verificado.
