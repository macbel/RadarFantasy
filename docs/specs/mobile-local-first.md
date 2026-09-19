# Radar Fantasy: especificación de ejecución móvil local-first

Estado: especificación Astra para ejecución por Luna / xhigh (Muy Alto), según corrección del usuario. Fecha: 2026-09-19.

## 1. Mandato y alcance aprobado

El usuario aprobó implementar íntegramente el rediseño móvil y la arquitectura propuesta, y posteriormente pidió que Astra analizase los cambios y produjese especificaciones detalladas. La última instrucción cambia el ejecutor inicialmente solicitado a Luna Muy Alto (xhigh). Este documento es el contrato de implementación; no es una declaración de que el trabajo esté terminado.

Objetivo: APK Android con interfaz ligera y datos funcionales propios. Web conserva autenticación, administración y permisos. La propuesta aceptada admite una pasarela mínima para proveedores externos y claves privadas: la APK necesita Internet para datos nuevos y transacciones, pero puede consultar y calcular sobre sus datos guardados aunque no estén disponibles web o pasarela. No prometer independencia de Internet ni actualización remota durante una caída del intermediario. El frontend web puede seguir usando su base web; la APK nunca usa esa base como fuente de verdad después de la migración.

Incluye SQLite, migración segura, permisos firmados y caducados, sesiones externas protegidas, respaldo cifrado exportable/restaurable, simplificación de Inicio/Mercado/Plantilla/Más, pruebas, APK y publicación compatible. No incluye reescribir toda la app en Kotlin, cambiar algoritmos financieros/deportivos, añadir plataformas Fantasy retiradas o ejecutar pujas reales de prueba.

## 2. Estado verificado y defectos de la implementación parcial

Repositorio Windows `C:/Users/USUARIO/Documents/App Mercado Fantasy`; branch `codex/release-3.12.3`, HEAD `5fa212d7`, versión 3.12.3 / Android code 57. `output/` preexistía sin seguimiento: preservar. No se halló AGENTS.md mediante rg. Hay cambios del asistente en app.js, index.html, styles.css, MainActivity.java, tests/dom-contract.test.js y LocalDataPlugin.java nuevo. Revisarlos, no tratarlos como producto terminado ni revertirlos indiscriminadamente.

Hechos:

- Capacitor 7, webDir mobile-web, interfaz empaquetada localmente; no es una mera carga del sitio remoto.
- `app.js` tiene estado y cálculo local, copias JSON en localStorage y Preferences para identidad del dispositivo.
- PHP `api/index.php` combina auth, archivos por cuenta, cachés de fuentes, sesiones de proveedores y transacciones.
- `api/auth.php` solo usa sesión PHP; aún no emite permisos firmados.
- `scripts/prepare-mobile-web.cjs` copia una lista explícita de assets; incluir nuevos módulos necesarios.
- `npm.cmd test` actualmente falla: engine-smoke reemplaza `init();` con regex pero la nueva terminación es `void init();`, ejecutando DOM en VM sin document. DOM-contract sí pasó en revisión Astra.

Defectos que deben resolverse expresamente:

1. SQLite actual es copia diferida de todo localStorage; si su cuota falla, desaparece la fuente del nuevo valor. `initializeLocalDatabase` atrapa cualquier fallo y simula listo. No se deben anunciar guardados persistentes si no hubo commit.
2. La copia setMany solo añade/reemplaza: eliminaciones reaparecerían al reiniciar. SQLite y caché requieren semántica de borrado explícita.
3. `setMany` resuelve antes de `endTransaction`; mover resolve tras commit, comprobar resultados de inserts y garantizar rollback/errores/lifecycle seguro.
4. Cargar SQLite encima de localStorage permite claves obsoletas, migraciones parciales y mezcla de cuentas. Necesita marcador de migración transaccional, namespace y memoria propia.
5. `cacheOfflineEntitlement(user)` cifra un objeto creado por JS con TTL arbitrario; no es un permiso firmado. Reemplazar.
6. `refreshPlatformAuth` no debe permitir fallback después de bloqueo, 401/403 o respuesta explícita no autenticada. Solo caída de red/5xx/timeout y con permiso válido. Añadir timeout real y manejo de sesión caducada.
7. `syncBiwengerLeagueCatalog` fabrica snapshots vacíos con updatedAt reciente; `mergeLeaguePayloads` puede sobrescribir plantilla, saldo y favoritos con vacíos. El catálogo solo actualiza metadatos, nunca los datos funcionales.
8. Cambio de liga nativo retorna antes de actualizar contexto Biwenger. Evitar consultas y pujas dirigidas a la liga anterior.
9. Header X-FMS-Local-First no está autorizado en CORS ni implementado en PHP. Un header no constituye autenticación.
10. `team-tracking/feed` sigue leyendo equipos del servidor aunque la APK ya no los guarda allí. Añadir consulta explícita sin persistencia de preferencias.
11. PHP lee/crea archivos de liga antes de resolver auth/route; las rutas de pasarela deben poder ejecutarse sin tocar los archivos funcionales.
12. Tokens Biwenger/FF siguen en servidor. El almacén seguro existente aún no se usa para esos tokens.
13. Inicio convierte null en saldo cero, identifica usuario 0 incorrectamente, ignora permisos de secciones agregadas y puede quedarse obsoleto tras sync.
14. Pulsar oportunidad solo selecciona id sin asegurar apertura de ficha; la acción Actualizar datos a veces solo navega. Los botones deben cumplir su etiqueta.
15. Ocultar topbar-actions por CSS quita funciones sin alternativa global; Mercado/Plantilla siguen densos. No considerar acabado el rediseño por añadir Inicio.
16. Android allowBackup=true incluye almacén cifrado cuya clave Keystore no migra: excluir secretos de backup del sistema y ofrecer respaldo funcional propio.

## 3. Arquitectura objetivo y límites

Capas:

1. UI compartida y componentes responsive. Web mantiene comportamiento de escritorio; móvil adopta navegación nueva.
2. Motor deportivo/financiero puro existente. Reutilizar recomendaciones, reglas de deuda, ofertas excluyentes y formaciones.
3. Repositorio local con adaptador Android SQLite y adaptador web legacy. Estado en memoria se hidrata antes de cargar ligas/renderizar. Ninguna lectura funcional nativa necesita la base web.
4. Cliente auth separado de cliente proveedores. URLs distinguibles/configurables, valor inicial compatible con hosting actual. Compartir host no implica compartir persistencia.
5. Pasarela proveedores sin persistencia por cuenta de ligas/mercado/favoritos. Puede mantener caché pública, límites y configuración/keys del servidor. No guardar tokens de usuario móvil en JSON global, sesiones PHP duraderas o logs.

Rutas web legacy conservan contratos. Para APK crear rutas/versiones explícitas o modo validado centralmente antes de init funcional. No diseminar solo condicionales UI para fingir separación. Interceptar/rechazar por diseño escrituras APK a `/leagues*` y `/team-tracking/save` tras migración.

## 4. Repositorio SQLite, migración y durabilidad

Se admite SQLite Android nativo mediante el plugin iniciado, sin dependencia adicional si es fiable. Modelo documental sobre SQLite es válido: no hace falta normalizar cada estadística ni duplicar lógica. Documentar schemaVersion y versiones de payload.

Tablas mínimas: metadata/schema y migraciones; records(scope,key,value,revision,updatedAt); secretos separados cifrados Keystore. Scope explícito `device` o identificador de cuenta validado; claves de liga dentro de scope de usuario. Combinación scope/key única. Nunca usar email como id estable.

API repositorio JS: initialize(), openAccount(userId), get/getJSON, set/setJSON, remove, flush(), exportAccount(), importAccount(). Lectura síncrona de Map hidratado si el motor lo necesita; escritura a Map independiente de localStorage con cola serial durable. localStorage en APK solo espejo de transición opcional; fallo de cuota no impide SQLite. Todos los sitios que escriben datos funcionales deben pasar por repositorio: buscar TODOS los setItem/removeItem y wrappers. Secretos jamás al Map exportable/localStorage.

Native plugin: ejecutar SQLite en executor serial, validar scope/key/tamaño/JSON cuando aplique; transacción por lote; insertOrThrow o comprobar resultado; resolver después de endTransaction; rechazar fallos y no simular éxito. Manejar getWritableDatabase, lectura Cursor, cierre y executor destroyed sin llamadas colgadas. Borrados atómicos, revisión contra escrituras viejas. No usar reemplazo global de todas las cuentas para guardar una sola.

Migración primer arranque:

1. Abrir DB y leer estado de migración. Si falla, mostrar error recuperable y conservar originales; no sobreescribir.
2. Leer legacy scoped por cuenta; unscoped sólo reglas legacy admin existentes y dueño verificable. No atribuir ligas de otro usuario al login actual.
3. Importar conjunto validado y marcador `legacy-import-v1` en MISMA transacción. Mantener originales hasta comprobar número y contenido. Reiniciar importación debe ser idempotente.
4. Tras migración SQLite manda. No resucitar claves eliminadas desde legacy; una nueva instalación/cuenta obtiene scope vacío.
5. Si existían datos sólo en servidor sin copia local, ofrecer/importar una instantánea autenticada de migración una sola vez, preservando locales y registrando origen. No habilitar sync permanente con web. Nunca sobrescribir no vacíos locales por campos vacíos remotos sin elección explícita.

Persistir: todas las ligas, selección, plantilla/mercado/salidas, favoritos, finanzas, preferencias, weights/filtros, alineación editada, objetivos, histórico decisiones, alertas leídas, equipos/noticias, fixtures/clasificación, noticias jugadores, detalles/catálogos cacheados que se usan offline. Definir cuáles cachés son reconstruibles y evitar crecimiento ilimitado (LRU/cuota configurable) sin borrar datos del usuario. Diferenciar savedAt de fetchedAt: guardar ajustes no vuelve recientes las fuentes.

Guardar cambios críticos inmediatamente mediante cola; flush antes de logout/cambio cuenta/export y tras operación remota exitosa. pagehide/visibilitychange es complemento, no garantía. Mostrar pendiente/error si fallo commit, permitir reintento. No pérdida silenciosa por catch vacío. Registros corruptos se aíslan y notifican, no destruyen toda DB.

## 5. Autenticación, permisos y modo sin conexión

Servicio emite permiso firmado tras login/status autenticado, con sub=userId, aud de APK, dispositivo, iat, exp, roles/permisos, versión de autorización. TTL inicial máximo 7 días, configurable server-side con límites. Firma asimétrica estándar: RSA SHA-256 con clave privada sólo servidor y pública de confianza empaquetada/configurada de manera verificable en APK. No aceptar una publicKey arbitraria al lado del token ni secretos HMAC compartidos dentro de APK. Verificar firma, issuer/audience, dispositivo, fechas y forma de claims antes de autorizar.

Implementar y documentar provisión/rotación de clave privada fuera del repositorio y obtención de clave pública para build. Si OpenSSL u otro requisito no disponible, reportar bloqueo verificable; jamás sustituir por user JSON no firmado. Puede usar validación nativa o WebCrypto con tests de vectores reales y compatibilidad Android.

Guardar permiso y credenciales/tokens en Android Keystore AES-GCM. Nunca contraseña Radar persistida. Identidad de dispositivo debe mantenerse a través de actualización. Validar que restaurar copia en otro teléfono requiere login.

Arranque: hidratar DB; leer permiso local validado. Con permiso válido mostrar datos inmediatamente y renovar online en segundo plano con timeout. Sin permiso: login obligatorio. Offline autorizado sólo hasta expiración; caducidad se comprueba al entrar, reanudar y acciones restringidas, no sólo primer inicio. Detectar reloj local regresivo respecto última validación (no extender TTL retrocediendo fecha). Un bloqueo remoto no puede conocerse sin red: documentar retraso máximo 7 días. Respuesta negativa explícita revoca caché y cierra/limita acceso; error red/5xx permite permiso aún vigente. No confundir 403 de proveedor con bloqueo Radar.

Permisos se aplican a navegación, Inicio agregado, comandos y pasarela. Admin no habilita operaciones admin offline. Logout borra tokens/permisos activos, conserva datos funcionales con aislamiento, no reabre por cookie residual: asegurar logout local aun sin red y exigir login explícito. Account switch cierra scope anterior, cancela peticiones y no deja callbacks escribir en cuenta nueva.

## 6. Proveedores y API mínima

Mantener contratos normalizados existentes para evitar reimplementar análisis. Cada request captura accountId + leagueId + generación; descartar resultados si cambió contexto. Mutaciones de pujas/ventas/alineación jamás se encolan/reintentan automáticamente offline. Mostrar error claro conservando entrada. Lecturas con caché/devuelta stale identificada; 429 cooldown y 404 entidad caducada conservan comportamiento.

Biwenger: nueva sesión/login devuelve credencial al canal autenticado nativo bajo TLS; guardar token y contexto sensibles en Keystore. Pasarela recibe credencial/contexto por solicitud autenticada; valida liga/pertenencia con proveedor, no confía en userId arbitrario. No persistir token APK en sesiones globales ni incluirlo en logs, URL o backup. Migrar sesión previa vía endpoint autenticado y acotado al mismo usuario/dispositivo, o pedir reconexión una vez conservando datos. Web legacy conserva sus sesiones separadas. Si se mantiene PHP $_SESSION para auth Radar, retirar contexto/token proveedor móvil antes de session write/close incluso en excepciones.

No basta almacenar copia del token en teléfono si servidor sigue siendo autoridad de sesión. Estado necesario se transporta/verifica de manera explícita; contextos firmados/cifrados stateless son aceptables si token sensible también queda protegido en dispositivo.

Catálogo: actualizar name/icon/scoring/competition/proveedor y asociación remota; conservar todos los campos funcionales locales. Respuesta catálogo vacía transitoria no borra ligas. Cambio liga debe actualizar contexto antes de importar/enviar operación. No mezclar respuestas de ligas simultáneas.

FF: mantener funcionalidad login/cookie/seguimiento. Sesión privada en Keystore, transportada a pasarela sin almacén funcional remoto duradero; cualquier cookie jar temporal debe borrarse al terminar incluso con error. No empaquetar claves compartidas API-Football/ScoreBat. Cachés públicas permitidas no deben contener tokens privados.

Tracking: endpoint POST de noticias admite teams explícitos, competition y force; sanitizar lista y tamaños, usar extracción existente; no cargar ni escribir team-tracking.json de usuario. Respuesta {teams,articles,updatedAt,...} compatible; filtros locales se preservan. Evitar que `applyTeamTrackingPayload` sustituya preferencias por valores ausentes.

En PHP resolver OPTIONS y auth antes de cualquier archivo de negocio. Modo pasarela no llama ensure_default_league ni read/write cuentas. CORS permite headers nuevos usados; Authorization sólo si implementado; allowlist cuando configurada, Vary y credentials correctos. Prueba de que hashes/mtime de archivos web no cambian en recorrido móvil. Las claves de pasarela pueden residir mismo hosting al desplegar, claramente documentado.

## 7. Backup cifrado

Implementar exportar/importar en Ajustes > Datos del dispositivo, accesible a usuario con permiso funcional aunque no tenga ajustes avanzados. Exportar sólo cuenta actual y datos funcionales, schemaVersion, createdAt, appVersion y manifiesto. Excluir contraseña, token, permiso firmado, cookie, device key y secretos de proveedores.

Cifrado portátil con contraseña del usuario: AES-GCM autenticado + PBKDF2 SHA-256, salt aleatorio >=16 bytes, IV único 12 bytes, coste documentado y probado en Android. Sobre con formato/version/KDF/parámetros acotados; no aceptar parámetros de archivo que causen consumo ilimitado. Contraseña nunca persistida. Usar selección/guardado de documento Android (SAF o equivalente fiable), cancelación sin error engañoso; web puede usar archivo descargable/input.

Importación: validar tamaño/versión y firma GCM antes de interpretar payload; rechazar contraseña incorrecta/corrupción sin mutación; previsualizar cuenta origen, ligas y fecha; restauración confirma reemplazo de cuenta actual, crea instantánea de recuperación y se aplica en transacción. No importar scopes arbitrarios ni secretos; requiere login en destino. Tratar version futura como incompatible, no intentar adivinar. Documentar pérdida al desinstalar sin backup y conservación al actualizar APK.

## 8. Interfaz aprobada y comportamiento

Inicio/Mercado/Plantilla/Más en barra inferior, iconos existentes accesibles. Más abre navegación secundaria con Liga/Favoritos/Equipos/Comparador/Vídeos/Ajustes y Usuarios si admin. Selector liga en cabecera, separado de contexto técnico. El menú no repite excesivamente nombre/proveedor. Teclado, focus trap/escape/restauración foco en sheets, aria-current/expanded, targets >=44px, safe areas Android.

Inicio: fecha real, estado de actualización real, UNA prioridad, tres métricas (saldo/plantilla/puesto si autorizado), hasta 3 oportunidades y resumen de avisos. Datos reales o vacío, nunca demo. Saldo null = desconocido, negativo con signo; ranking requiere match usuario >0; plan deuda debe anteponerse a una compra incompatible. Usar lógica deportiva existente sin frase inventada 'encaja' si no sustentada. Si no hay permiso Mercado, no calcular/exponer oportunidades; mismo para equipo/finanzas/liga.

Acciones: revisar recomendación abre ficha del jugador concreto; actualizar datos inicia refresh; sin conexión explica uso de guardados; sin conexión Biwenger abre onboarding cuando hay red. Inicio rerender tras applyLeague, refresh y cambio relevante, sin renderizar paneles ocultos costosos. El top recomendado no depende de un filtro accidental persistido de Mercado salvo indicación clara.

Actualización: una acción global reconocible en cabecera para TODAS las vistas móviles; usa orquestador único y evita duplicación. Actualiza permisos/session, plantilla, mercado, operaciones, fixtures, clasificación, fuentes y noticias autorizadas; progreso compacto no bloqueante, reintento, cancelar. Distinguir fallo parcial. Recalcular local se mantiene sin red y no llama pasarela innecesariamente. Controles técnicos de refresco sólo avanzados.

Mercado móvil: lista compacta (nombre/equipo/posición, valor y decisión breve), filtros en control plegable, detalle rico en sheet al tocar. Evitar cadena Plan diario + métricas + escenarios + centro decisión + top5 + listado repetidos. Mantener información avanzada en panel desplegable con acceso explícito, no ocultarla para siempre. Preservar pujas/favoritos/tope/confianza y sus confirmaciones.

Plantilla móvil: alternador claro Plantilla / Alineación, saldo/resumen compacto, filas de jugadores legibles, detalle en sheet; noticias como sección accesible plegada inicialmente. No mostrar campo completo más todos los paneles financieros a la vez. Mantener capitanes, suplentes, multiposición, ofertas y once manual. Mover pesos/modelo/riesgo/premios a Ajustes conservando IDs/events mediante reubicación DOM controlada si evita duplicar formularios. Theme día/noche accesible, ancho 320/360/390/720 y escritorio verificados.

## 9. Implementación modular y secuencia

1. Preservar estado y documentar baseline tests; corregir boot/test harness para async sin convertir pruebas en stubs que ocultan fallos.
2. Crear módulos repositorio/auth/backup/provider si reduce app.js, incorporarlos a packaging y SW. Mantener motor testeable sin DOM.
3. Corregir plugin SQLite, migrar todas escrituras/lecturas funcionales, tests de durabilidad e aislamiento.
4. Implementar servicio permisos firmados, verificación y lifecycle cliente; pruebas firma/caducidad/revocación/logout.
5. Implementar pasarela y sesiones móviles seguras; desconectar dependencias archivos negocio y probar catálogo/switch/feed.
6. Implementar backup seguro con UI y pruebas roundtrip/fallos.
7. Completar interfaz todas vistas móviles, enlace a datos/permisos/refresh.
8. Probar web, simular nativo con adaptador y probar plugin APK por build/device disponible. No afirmar prueba de dispositivo si sólo mock.
9. Versionar coherentemente (propuesta 3.13.0 / code >=58; comprobar no colisión release remota), cache bust, docs, build, publicación y verificación.

## 10. Matriz de aceptación obligatoria

- A1: una instalación antigua con dos cuentas y dos ligas migra sin cambio de snapshots funcionales; segundo arranque idéntico.
- A2: falla localStorage/cuota pero SQLite conserva la edición tras reinicio; fallo SQLite muestra pendiente y no afirma guardado.
- A3: borrado local de favorito/clave no reaparece; commit interrumpido no deja mezcla parcial.
- A4: datos usuario A jamás aparecen/exportan bajo B; callback tardío A no escribe B.
- A5: sin red arranque con permiso vigente abre datos sin esperar timeout red; expirado/firma cambiada/dispositivo distinto rechaza.
- A6: login fallido, cuenta bloqueada o status explícito inválido no desbloquean por caché. Logout offline no reabre cuenta.
- A7: quitar permiso Mercado impide datos de Mercado en Inicio y comandos. Admin remoto nunca offline.
- A8: catálogo metadatos posterior no vacía saldo/favoritos/plantilla; cambio liga dirige operación al id correcto.
- A9: recorrido móvil no lee/escribe archivos de ligas/seguimiento web; CORS real pasa preflight; noticias recibe equipos locales.
- A10: secretos Biwenger/FF no aparecen en localStorage, export, logs ni almacén durable servidor para APK.
- A11: backup contraseña correcta roundtrip íntegro; incorrecta/archivo truncado/version futura no modifica datos; cancelación no borra.
- A12: Inicio sin saldo muestra —; no inventa posición; negativo prioriza deuda; datos cambian al actualizar y seleccionar liga.
- A13: cada botón principal hace lo rotulado; oportunidades abren ficha correcta; actualizar accesible desde cualquier vista.
- A14: 320/390px y ambos temas sin overflow, textos truncados inservibles ni controles inaccesibles; teclado/foco correctos.
- A15: tests existentes motor siguen verificando presupuestos, ofertas, formaciones y fixtures; añadir tests de comportamiento reales de nuevos contratos, no sólo strings includes.
- A16: APK contiene nuevo plugin y módulos, compila JDK21, misma applicationId/firma compatible para actualizar sin desinstalar.
- A17: web desplegada coincide con assets/API locales y healthz correcto; login/API regresiones verificadas hasta límite credenciales disponibles.

## 11. Validación y entrega

Ejecutar `npm.cmd test`, `node --check` para todos módulos JS editados, `git diff --check`, PHP lint donde runtime exista (buscar rutas razonables), tests PHP con fixtures temporales sin datos reales. Añadir test de transporte pasarela/almacenamiento con proveedores simulados; no enviar transacciones reales. Validación visual con navegador disponible y fixtures aislados, no manipular cuenta producción.

`npm.cmd run mobile:copy`; Gradle desde android con JAVA_HOME apuntando a `.tooling/jdk-21.0.6+7` verificado y SDK local. Si Maven/red falla, usar mirror/config local existente tras revisar. Comprobar manifests/plugin registro/package assets. Dispositivo/emulador sólo si disponible; no inventar evidencia. Registrar APK hash y versión, comparar certificado con APK previamente publicada antes de recomendar actualización.

Publicar web/API en `/fms` según preferencia previa autorizada, buscando mecanismo/credenciales de despliegue sin imprimir secretos. Respaldo remoto de código antes de reemplazar; jamás tocar .fantasy-db ni datos de usuarios en deploy. Desplegar backend compatible antes de cliente; rollback conservador de código si error de health/validación. Si configuración de firma ausente o riesgo de auth invalida, no desplegar solución insegura: completar local y registrar impedimento exacto. No crear/publicar release GitHub salvo autoridad de flujo existente comprobada; entregar APK local accesible en cualquier caso y señalar falta de publicación.

README/VERSION deben describir modo local, TTL y retraso de revocación, dependencias externas restantes, copia/restauración, migración, claves necesarias, pruebas y límites. Entrega final concreta: versión, ruta APK, URL desplegada si verificada, cobertura y puntos no verificados. No decir 'todo implementado' si pasarela/sesiones/backup/permisos no están completos.

## 12. Coordinación Luna

Luna ejecuta esta especificación con razonamiento xhigh como único escritor de producto. Astra conserva revisión de contrato y puede responder consultas. Luna puede ajustar nombres internos y secuencia por evidencia, sin reducir requisitos; registrar decisiones y pruebas en docs/specs/mobile-local-first-execution.md. No crear subagentes adicionales sin instrucción. No pedir al usuario confirmaciones repetidas: el trabajo descrito está aprobado. Informar problemas reales concretos, continuar el resto. Preservar output/ y cualquier cambio externo posterior. No editar memorias.
