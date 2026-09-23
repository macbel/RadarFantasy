# Ejecución local-first móvil

Fecha de ejecución: 2026-09-21
Versión del producto: 3.13.1 (Android `versionCode` 59)
Branch de trabajo: `codex/release-3.12.3`

Mandato de entrega recibido durante la ejecución: cerrar con commit subido al repositorio remoto, APK generada y web desplegada/verificada, preservando credenciales, datos y `output/`.

## Cambios implementados

- El almacenamiento funcional nativo usa `LocalDataPlugin` con SQLite schema 2, claves `(scope, record_key)`, tabla de metadatos, revisiones, migración v1 y secretos separados cifrados con AES-GCM/Android Keystore. `setMany` valida tamaño y claves, confirma la transacción antes de resolver, usa `insertOrThrow` y admite borrado atómico.
- `mobile-local-first.js` mantiene un `Map` por cuenta, cola serial de escrituras, `openAccount`, `set/get/remove`, `flush`, exportación e importación. La copia de `localStorage` es un espejo de transición. El marcador `legacy-import-v1` y la carga por scope evitan mezclar cuentas; los fallos de SQLite se propagan y no se anuncian como guardados.
- La autenticación móvil emite un JWT RS256 con `sub`, `aud`, `iss`, hash de dispositivo, fechas, autorización, rol y permisos. La clave privada se obtiene del entorno o de `.fantasy-db/offline-auth.pem`, protegido de webroot; el cliente valida firma, issuer, audience, dispositivo, permisos, fechas finitas y TTL máximo de siete días antes del arranque offline.
- El gateway `/api/mobile/permission` y `/api/mobile/team-tracking/feed` resuelve auth/CORS antes de abrir archivos funcionales. Cada petición reconstruye el contexto del proveedor desde el token y liga seleccionada, sin persistir sesiones móviles en los archivos globales. El feed exige el permiso `teamTracking`.
- Backup portátil desde Ajustes usa PBKDF2-SHA256 (210.000 iteraciones) y AES-GCM sobre JSON versionado, sin secretos. Android usa el selector SAF para guardar/abrir; cancelación, tamaño inválido y contraseña/corrupción no mutan datos. `allowBackup=false` evita copias automáticas de secretos Keystore.
- El almacenamiento SQLite es autoridad tras abrir la cuenta: la cola drena escrituras concurrentes, el cambio de cuenta confirma antes de cambiar scope, la importación confirma antes de mutar memoria y la migración legacy sólo acepta claves de la cuenta actual o claves explícitamente de dispositivo.
- Inicio móvil muestra saldo desconocido como `—`, prioriza deuda real y evita posiciones de ranking sin identificador válido. Mercado y Plantilla reducen los paneles iniciales en 320/390 px; Plantilla alterna Plantilla/Alineación y `Centro de liga` queda accesible una vez desde Más en móvil.

## Evidencia local

- `npm.cmd test`: correcto; incluye contratos DOM, motor deportivo y `tests/mobile-local-first.test.js` (aislamiento de scopes, borrado durable, rechazo de backup inválido, importación transaccional, cambio de cuenta y escrituras concurrentes).
- `node --check app.js`, `node --check mobile-local-first.js` y `node --check app-config.js`: correctos.
- `npm.cmd run mobile:copy`: correcto; copia el nuevo módulo a `mobile-web` y assets Android/iOS.
- Gradle JDK 21 desde `.tooling/jdk-21.0.6+7`: `android\gradlew.bat assembleDebug --no-daemon` correcto.
- APK debug: `android/app/build/outputs/apk/debug/app-debug.apk`, SHA-256 `9520CEC8207EE6706AE7295A0D978F35783147205AC535D672F268684C4DF610`, tamaño 8.075.527 bytes. `apksigner` verificó el certificado SHA-256 `a3b5f863747adeca6f201be149984377896762b7c8b5dd63ff8e4773d4f79484`, igual al APK histórico comprobado localmente.
- `git diff --check`: correcto.
- `C:\\Users\\USUARIO\\Documents\\App Mercado Fantasy\\.tooling\\php-audit\\php.exe -l api/auth.php` y `-l api/index.php`: correctos. Con su extensión OpenSSL se firmó y verificó una autorización aislada, sin cuenta ni operación real.
- `git diff --check`: correcto. El commit y el despliegue de esta ejecución se anotan tras completar la paridad remota.

## Verificación remota y límites (2026-09-23)

La inspección HTTPS confirmó que los archivos estáticos de producción ya coinciden byte por byte con los artefactos locales; no hizo falta volver a cargarlos. Los SHA-256 remoto/local verificados fueron:

| Archivo | SHA-256 | Resultado |
| --- | --- | --- |
| `index.html` | `F4B2A0097589F93651B444597DE41CB57D2B80F971CCD44ACD27DF63C0B54127` | Igual |
| `styles.css` | `AAB547884479DA24CEDE0622816C9BE8CCE75BE644E60692EB2A17EF71DA6699` | Igual |
| `app.js` | `E5742F68941DAF4E16841323EF0C43DB5A8A29290307D2AF20915298E5FA8AEE` | Igual |
| `data.js` | `F065E978A4C7762101ADD23EFA3B16BEAD920DCCA2665945294A4D2E7E7320FB` | Igual |
| `sw.js` | `89EB1D9EB8F4443531711927C5D8C25560EA48E1510D686FE4D647A68B9268DE` | Igual |
| `mobile-local-first.js` | `84B3EA7C2E449E9BA0340E5AC10E19CF5A5E0569730EA8C7814FA0324BFD6C34` | Igual |
| `app-config.js` (ignorado por Git) | `915C1F47043C43EC9C5D4BFDDA164024A3461AB8A5830148EDC576F689BFCCE0` | Igual |

`https://alufi.es/fms/` y una petición con query de caché respondieron 200. El HTML servido usa `styles.css?v=75`, `data.js?v=15`, `mobile-local-first.js?v=2` y `app.js?v=134`; el service worker local identifica `radar-fantasy-shell-v85`. El bundle de producción contiene `Centro de liga` y su hash coincide con el bundle local. `/api/healthz` respondió 200 (`ok:true`, `criteriaVersion:11`) y `/api/mobile/healthz` respondió 200 (`ok:true`, `mode:"gateway"`). Sin iniciar sesión, `/api/mobile/permission` y `/api/mobile/team-tracking/feed` devolvieron 401 `Debes iniciar sesión`, como corresponde. No se usó ninguna cuenta real, por lo que no se pudo comprobar una autorización firmada en vivo.

La petición HEAD a `https://alufi.es/fms/.fantasy-db/offline-auth.pem` respondió 403; `https://alufi.es/fms/api/.htaccess` también respondió 403. Esto verifica que esas rutas no se pueden leer por HTTP, pero no demuestra por sí solo que la clave privada exista ni que el backend en producción la esté usando. La firma RS256 y su verificación sí quedaron probadas localmente con una autorización aislada mediante PHP/OpenSSL, sin cuenta ni operación real.

No se transfirieron archivos durante esta comprobación. La configuración FileZilla local ofrece FTP en claro (puerto 21); `AUTH TLS` tras `USER` respondió 530 y `FEAT` no anunció TLS. El puerto 22 aceptó autenticación SSH con la clave de host previamente guardada, pero el servidor reseteó tanto la apertura del subsistema SFTP como una orden de lectura inocua (`pwd; ls -la`). Por ello no se pudo verificar la paridad de `api/index.php`/`api/auth.php` con los archivos locales ni provisionar/comprobar la clave fuera de banda. Los controles HTTP anteriores son evidencia de rutas y respuestas, no una prueba de que el backend PHP remoto tenga el mismo código que el checkout.

No hay dispositivo Android conectado para validar físicamente SAF o instalación; la compilación y los callbacks de cancelación están cubiertos por pruebas. La APK, el commit de implementación y los assets estáticos ya existentes conservan la evidencia indicada arriba.
