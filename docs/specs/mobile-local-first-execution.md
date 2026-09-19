# Ejecución local-first móvil

Fecha de ejecución: 2026-09-19  
Versión del producto: 3.13.0 (Android `versionCode` 58)  
Branch de trabajo: `codex/release-3.12.3`

Mandato de entrega recibido durante la ejecución: cerrar con commit subido al repositorio remoto, APK generada y web desplegada/verificada, preservando credenciales, datos y `output/`.

## Cambios implementados

- El almacenamiento funcional nativo usa `LocalDataPlugin` con SQLite schema 2, claves `(scope, record_key)`, tabla de metadatos, revisiones, migración v1 y secretos separados cifrados con AES-GCM/Android Keystore. `setMany` valida tamaño y claves, confirma la transacción antes de resolver, usa `insertOrThrow` y admite borrado atómico.
- `mobile-local-first.js` mantiene un `Map` por cuenta, cola serial de escrituras, `openAccount`, `set/get/remove`, `flush`, exportación e importación. La copia de `localStorage` es un espejo de transición. El marcador `legacy-import-v1` y la carga por scope evitan mezclar cuentas; los fallos de SQLite se propagan y no se anuncian como guardados.
- La autenticación móvil puede emitir un JWT RS256 con `sub`, `aud`, `iss`, dispositivo hash, fechas, versión de autorización, rol y permisos. La clave privada se obtiene únicamente de `FMS_OFFLINE_AUTH_PRIVATE_KEY`; la aplicación verifica firma, issuer, audience, dispositivo y TTL máximo de siete días antes de permitir arranque offline. Deben configurarse `FMS_OFFLINE_AUTH_PRIVATE_KEY`, `FMS_OFFLINE_AUTH_PUBLIC_KEY`/`APP_CONFIG.offlineAuthPublicKey` y, opcionalmente, issuer/audience/TTL fuera del repositorio.
- Se añadió el gateway `/api/mobile/permission` y `/api/mobile/team-tracking/feed`. El gateway resuelve auth/CORS antes de abrir archivos funcionales; el feed recibe equipos explícitos y usa una estructura efímera. Las sesiones Biwenger móviles se transportan mediante `Authorization` y no se guardan en los archivos globales de sesiones; credenciales recibidas se guardan sólo en Keystore.
- Backup portátil desde Ajustes: sobre JSON versionado, PBKDF2-SHA256 (210.000 iteraciones, salt de 16 bytes), AES-GCM con IV de 12 bytes, validación de límites, contraseña no persistida y rechazo de contraseña/corrupción sin mutación. `allowBackup=false` evita que el backup automático de Android copie secretos cuya clave Keystore no migra.
- Inicio móvil conserva fecha real, estado de conexión, una acción, tres métricas sin convertir saldo desconocido en cero, oportunidades y actualización global; `mobile-local-first.js` entra en `mobile-web`/Capacitor.

## Evidencia local

- `npm.cmd test`: correcto; incluye contratos DOM, motor deportivo y `tests/mobile-local-first.test.js` (aislamiento de scopes, borrado durable y rechazo de backup inválido).
- `node --check app.js mobile-local-first.js scripts/prepare-mobile-web.cjs tests/engine-smoke.test.js`: correcto.
- `npm.cmd run mobile:copy`: correcto; copia el nuevo módulo a `mobile-web` y assets Android/iOS.
- Gradle JDK 21 desde `.tooling/jdk-21.0.6+7`: `android\gradlew.bat assembleDebug --no-daemon` correcto.
- APK debug: `android/app/build/outputs/apk/debug/app-debug.apk`, SHA-256 `CB6637EB32BA984EBD70C6C7959B63F1C943453052B8CCA8ADD7B6F3036CE1E6`, tamaño 8.068.182 bytes en esta ejecución. `apksigner` verificó el APK con el certificado Android Debug (digest SHA-256 `a3b5f863747adeca6f201be149984377896762b7c8b5dd63ff8e4773d4f79484`).
- `git diff --check`: correcto.
- PHP no está instalado en este equipo: `php -l api/index.php` y `php -l api/auth.php` quedan pendientes de un runtime PHP. No se simuló ese resultado.
- Commit publicado en `origin/codex/release-3.12.3`: `410d6771` (`Implement local-first mobile architecture`). La carpeta `output/` permaneció sin seguimiento y sin cambios incluidos.

## Límites y pasos de despliegue

La web se publicó en `/fms` mediante FTP con una copia temporal previa de los archivos remotos. Se verificó paridad SHA-256 remota para `index.html`, `app.js`, `styles.css`, `data.js`, `sw.js`, `manifest.webmanifest`, `mobile-local-first.js`, `api/index.php` y `api/auth.php`. Las comprobaciones HTTPS del 2026-09-19 devolvieron `200`: `/fms/api/healthz` respondió `ok:true`, `/fms/api/mobile/healthz` respondió `ok:true, mode:gateway` y `/fms/index.html` incluyó `mobile-local-first.js?v=1`.

El servidor no recibió ninguna clave privada durante esta ejecución. Para habilitar permisos offline firmados hay que inyectar `FMS_OFFLINE_AUTH_PRIVATE_KEY` sólo en el servidor y empaquetar en `app-config.js` la clave pública correspondiente, además de comprobar la firma de una APK release contra la publicada. La APK construida aquí es debug y no constituye evidencia de compatibilidad de actualización con la firma de producción.

La sesión PHP de proveedor sigue siendo un canal temporal para las peticiones actuales; el token móvil ya no se persiste en `biwenger-sessions.json`, pero una pasarela completamente stateless requerirá un adaptador de proveedor que acepte el contexto firmado en cada request. Las operaciones mutantes nunca se reintentan offline.
