# Asesor privado de Mercado con tu PC

Radar usa tu sesión habitual de Codex con ChatGPT mediante un agente local. No requiere clave API OpenAI. El PC debe permanecer conectado y encendido. Sólo genera recomendaciones: no realiza pujas, ventas ni alineaciones.

El plan propone decisiones con los nombres reales de tu plantilla y mercado: qué jugador vender o conservar y por quién pujar, siempre que los datos lo justifiquen. Puede explicar una sustitución concreta y sus condiciones deportivas y económicas. No utiliza jugadores de ejemplo ni fuerza una operación cuando la evidencia aconseja esperar. «Vender» significa una venta candidata: confirma oferta, precio y cobertura; ese ingreso no aumenta el presupuesto garantizado de la compra.

## Preparación

1. Instala Node 24 o posterior y Codex CLI; ejecuta `codex login` si `codex login status` no indica ChatGPT. Los comandos npm y el lanzador oculto usan `node --use-system-ca` para confiar también en los certificados del sistema Windows, manteniendo la verificación TLS activa. Si ejecutas el script directamente, incluye esa opción: `node --use-system-ca scripts/market-agent.cjs run`. No desactives la validación de certificados.
2. El administrador habilita exclusivamente tu ID Radar en `.fantasy-db/market-agent-allowed-users.json`: `{"userIds":["ID_DE_TU_CUENTA"]}`. Sin ese archivo/lista no hay cuentas habilitadas. También se acepta `FMS_MARKET_AGENT_ALLOWED_USERS` con IDs separados por comas.
3. En Mercado abre «Conectar mi PC y privacidad», genera el código temporal y ejecuta en PowerShell `npm.cmd run market-agent:pair -- https://TU_DOMINIO/fms`. Introduce el código cuando se solicite. Caduca a los cinco minutos y sólo sirve una vez.
4. Ejecuta `npm.cmd run market-agent`. Si Codex no está en PATH, establece `FMS_CODEX_BINARY` a la ruta de `codex.exe` obtenida con `(Get-Command codex).Source`.
5. En Mercado selecciona perfil/horizonte y pulsa «Analizar estrategia». Puedes cancelar; la pantalla descarta respuestas al cambiar cuenta, liga o datos.

Para iniciar oculto: `powershell.exe -NoProfile -File scripts/start-market-agent.ps1`. La ejecución visible permite cerrar con Ctrl+C. La ejecución oculta termina al revocar la conexión desde Mercado, cuando reciba el rechazo de autenticación del relay. `npm.cmd run market-agent:forget` elimina además la credencial del PC. No se instala inicio automático por defecto.

La credencial de Radar queda cifrada con Windows DPAPI para tu usuario en `%LOCALAPPDATA%\RadarFantasy\market-agent.dpapi`. Es independiente de las credenciales ChatGPT; no se copian ni exportan éstas. No pegues códigos/tokens en Git ni archivos públicos. Un nuevo emparejamiento revoca el worker anterior.

## Datos y límites

La petición manual actualiza noticias fechadas de ocho candidatos y ocho jugadores propios prioritarios; también reutiliza las noticias recientes disponibles del equipo/favoritos. Consulta plantillas rivales visibles con concurrencia dos, límite total dieciocho segundos y caché de seis horas. Incluye un máximo de 25 candidatos y 40 jugadores propios, con salud disponible de todos y racha/calendario detallados de 40 perfiles prioritarios; como máximo dos noticias recientes por jugador, clasificación y finanzas conocidas. Los resúmenes rivales agregan posiciones/bajas y tres amenazas visibles sin fingir una cobertura mayor. Las noticias sin fecha no justifican actualidad; no se conocen pujas ni saldo ocultos de rivales. Los datos se recortan a 96 KiB y 240 evidencias y se informa de los límites. Revisar fecha y condiciones antes de operar. Un resultado válido se conserva en el dispositivo quince minutos, ligado a cuenta/liga/firma de datos; las respuestas lentas de otro contexto se descartan.

El relay PHP HTTPS guarda el snapshot transitoriamente hasta que el PC lo recoge (máximo cinco minutos), entonces elimina el snapshot y conserva sólo validadores mínimos durante el lease de tres minutos. Al terminar elimina validadores; el resultado caduca a los quince minutos. El barrido se realiza con cada acceso. Esto es una excepción explícita de transporte al almacenamiento funcional local de la APK. La cuenta habilitada y permisos market/team/league se comprueban en el servidor. El modelo sólo recibe este resumen en stdin; CLI efímera, directorio vacío, herramientas y conectores deshabilitados. No hay fallback etiquetado como IA: fallo de login/CLI/salida o PC desconectado se muestra como error recuperable y el motor local existente sigue accesible.

Una petición activa, cooldown 30 segundos, seis por hora y veinte por día/cuenta; cola global máximo cincuenta. No hay puerto entrante en el PC. El token worker sólo se transmite como Bearer sobre HTTPS. Nunca devolver HTML del modelo.

## Desarrollo y comprobación

Usa `npm.cmd run start:php` para comportamiento equivalente al relay productivo. El servidor Node `npm.cmd start` no implementa el asesor: no emparejar contra él. PHP necesita almacenamiento privado `.fantasy-db` protegido por Apache y escritura. La política deny debe estar activa en producción. `npm.cmd run test:market-agent` valida IDs/evidencia, compras y presupuesto combinado, deuda/finanzas caducadas, noticias con fecha, entorno CLI y salida de un proceso fake. El fake no prueba inferencia ChatGPT real.

Config opcional: `FMS_MARKET_AGENT_MODEL` (predeterminado `gpt-6.1-sol`, razonamiento low). Cambia sólo configuración del proceso local; nunca configuración global de Codex. Los límites del plan ChatGPT pueden interrumpir un análisis. Los errores del worker se registran mediante códigos, sin snapshot/respuesta privada.
