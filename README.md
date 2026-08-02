# Radar Fantasy

App para analizar mercados fantasy, empezando por Biwenger, con ranking de fichajes y apoyo de fuentes como SofaScore, FutbolFantasy y API-Football.

## Cuentas y administración

La aplicación exige iniciar sesión antes de mostrar cualquier sección. La APK nunca permite crear la cuenta administradora desde el dispositivo. El administrador inicial se crea de forma privada en el servidor y el asistente visual solo está habilitado en `localhost` para desarrollo.

Antes de publicar la API configura temporalmente:

```text
FMS_ADMIN_NAME=Manolo
FMS_ADMIN_EMAIL=tu-correo@dominio.es
FMS_ADMIN_PASSWORD=UNA_CLAVE_SEGURA_DE_AL_MENOS_10_CARACTERES
FMS_ALLOW_ADMIN_BOOTSTRAP=0
```

En la primera petición, el backend crea la cuenta con `password_hash`. Después de comprobar que puedes iniciar sesión, elimina `FMS_ADMIN_PASSWORD` del entorno del servidor. Si no hay administrador configurado, la APK muestra únicamente el acceso y no ofrece registrar uno.

El administrador puede entrar en `Usuarios` para:

- crear cuentas;
- cambiar nombre, correo y contraseña;
- conceder acceso independiente a Equipo, Mercado, Centro de liga, Favoritos, Equipos, Comparador, Vídeos y Ajustes;
- bloquear o desbloquear cuentas;
- eliminar usuarios.

La aplicación impide eliminar, bloquear o degradar al último administrador activo.

### Recuperación de contraseña

Configura en el backend PHP:

```text
FMS_APP_URL=https://alufi.es/fms
FMS_MAIL_FROM=no-reply@alufi.es
```

`FMS_APP_URL` es la dirección del frontend que recibirá el enlace de recuperación. El servidor debe tener habilitado el envío de correo de PHP (`mail()`) o un transporte equivalente configurado por el hosting.

Los enlaces caducan al cabo de 60 minutos y se guardan mediante SHA-256; las contraseñas se almacenan con `password_hash`.

### Ligas de Biwenger

Al conectar una cuenta Biwenger, todas sus ligas se incorporan automáticamente al desplegable de liga activa. No hay que crearlas manualmente. Cada usuario de Radar Fantasy conserva sus propias ligas y sesiones.

La integración con LaLiga Fantasy queda retirada temporalmente.

## Modos de uso

### Web local

La opción recomendada para probar el mismo backend PHP usado en producción es:

```powershell
npm run start:php
```

La configuración local [php-local.ini](./php-local.ini) activa `curl`, `mbstring`, `openssl` y `fileinfo` sin modificar la configuración global de PHP en Windows.

Luego abre:

```text
http://127.0.0.1:5173/index.html
```

En `localhost`, el primer arranque muestra el formulario para crear una cuenta administradora de desarrollo. Este formulario no aparece en la APK conectada a un servidor remoto.

El servidor Node alternativo sigue disponible para OCR, enriquecimiento y desarrollo de fuentes:

```powershell
node dev-server.js
```

Luego abre:

```text
http://127.0.0.1:5173/index.html
```

### App movil preparada

El proyecto queda listo para empaquetarse con Capacitor en:

- `Android`
- `iOS 16+`

La base web que usa la app nativa se genera en:

```text
mobile-web/
```

## Configuracion de API para movil

En una app nativa no existe `localhost` como en tu PC, asi que el cliente movil necesita una API accesible por red para:

- `/api/enrich`
- `/api/leagues`
- `/api/source-status`

Configura la URL en:

```text
app-config.js
```

Ejemplo:

```js
window.APP_CONFIG = {
  apiBaseUrl: "https://tu-api-fantasy.com",
  mobileApiBaseUrl: "https://tu-api-fantasy.com"
};
```

Tienes una plantilla en:

```text
app-config.example.js
```

Si no configuras API, la app movil sigue guardando ligas, mercado y equipo en el propio dispositivo, pero no podra consultar fuentes reales.

Si subes solo el frontend a un hosting estatico, el OCR seguira funcionando pero las fuentes devolveran `404` hasta que:

- publiques tambien la API `/api/*`, o
- apuntes la app a una API remota desde `Ajustes > API de fuentes`

## Despliegue en hosting PHP/Apache

Si tu servidor actual solo ofrece `PHP + MySQL + Apache`, usa la API PHP incluida en:

```text
api/
```

Subela junto al frontend dentro de tu carpeta web, por ejemplo:

```text
/fms/index.html
/fms/app.js
/fms/styles.css
/fms/api/index.php
/fms/api/.htaccess
```

En ese escenario:

- la web queda en `https://alufi.es/fms`
- la API queda en `https://alufi.es/fms/api`

La app ya intenta usar esa ruta relativa automaticamente, asi que normalmente `no tendras que poner nada` en `API de fuentes`.

Los resumenes de partidos finalizados usan opcionalmente ScoreBat. Para activarlos,
configura la variable de entorno `FMS_SCOREBAT_TOKEN` o el archivo privado
`.fantasy-db/scorebat.key` con una clave de su Video API.
Sin clave, Jornada funciona igualmente y omite el boton `Resumen`.

API-Football tambien puede usarse como fuente adicional para `Jornada`.
Configura la clave en backend con una de estas dos opciones:

- variable de entorno `FMS_APISPORTS_KEY`
- archivo `.fantasy-db/api-sports.key`

La clave se usa solo en el servidor PHP, nunca en el frontend.

Comprobacion rapida:

```text
https://alufi.es/fms/api/source-status
https://alufi.es/fms/api/healthz
```

Si quieres forzarla manualmente desde la app, la URL correcta seria:

```text
https://alufi.es/fms/api
```

### Almacenamiento de la API PHP

La version PHP guarda:

- ligas y cache en `.fantasy-db/`
- imagenes descargadas en `api/media-db/`

No necesita MySQL para funcionar, aunque mas adelante se podria migrar.

### Resolucion fiable de jugadores

La API PHP separa la identidad del jugador de su valoracion fantasy:

1. El OCR entrega nombre, posicion y precio.
2. SoccerWiki resuelve primero la identidad comparando nombre, posicion y equipo/seleccion.
3. Transfermarkt confirma los casos ambiguos o completa identidades/fotos que falten.
4. Las coincidencias con demarcacion incompatible se descartan, aunque el nombre coincida.
5. La identidad validada se usa para obtener seleccion, club y foto.
6. Solo entonces se consulta FutbolFantasy para titularidad, estado medico y senales Biwenger.

Las identidades validadas quedan bloqueadas en `.fantasy-db/players.php.json`. La valoracion puede renovarse diariamente sin volver a asociar el jugador a un homonimo distinto.

Se puede diagnosticar un jugador concreto con:

```text
POST /api/identity/resolve
```

Ejemplo de cuerpo:

```json
{
  "competition": "worldcup",
  "player": {
    "name": "Jalal Hassan",
    "position": "POR",
    "team": "Sin seleccion"
  }
}
```

### Despliegue alternativo con Node

Si en el futuro tienes un VPS o soporte Node, siguen disponibles:

- [deploy/fms.env.example](</C:/Users/USUARIO/Documents/App Mercado Fantasy/deploy/fms.env.example>)
- [deploy/nginx-api.alufi.es.conf](</C:/Users/USUARIO/Documents/App Mercado Fantasy/deploy/nginx-api.alufi.es.conf>)
- [deploy/apache-api.alufi.es.conf](</C:/Users/USUARIO/Documents/App Mercado Fantasy/deploy/apache-api.alufi.es.conf>)
- [deploy/start-fms.ps1](</C:/Users/USUARIO/Documents/App Mercado Fantasy/deploy/start-fms.ps1>)

## Scripts

Instalar dependencias:

```powershell
npm install
```

Generar la version web para movil:

```powershell
npm run build:web
```

Sincronizar Android e iOS:

```powershell
npm run mobile:sync
```

Abrir Android Studio:

```powershell
npm run mobile:android
```

Abrir Xcode:

```powershell
npm run mobile:ios
```

## Estado de plataformas

- `android/` generado y sincronizado
- `ios/` generado y sincronizado
- objetivo de despliegue iOS ajustado a `16.0`

Nota importante:

- `Android` lo puedes compilar desde Android Studio en Windows.
- `iOS` requiere abrir `ios/App/App.xcworkspace` o el proyecto equivalente en un Mac con Xcode y CocoaPods para compilar e instalar.

## Persistencia

### En web local

La API local guarda datos en:

```text
.fantasy-db/players.json
.fantasy-db/leagues.json
```

### En app movil

Si no hay API remota, las ligas y plantillas se guardan en almacenamiento local del navegador embebido del dispositivo.

## Fuentes

La app usa o prepara integracion con:

- SofaScore
- FutbolFantasy
- OCR local con Tesseract

## Notas de OCR en Android

- La app nativa necesita copiar de nuevo `mobile-web/` a Android tras cada cambio web:

```powershell
npm run build:web
npx cap copy android
```

- El OCR usa rutas compatibles con WebView Android y carga el core/lang de Tesseract por URL para evitar fallos con assets locales.

## Verificacion rapida

```powershell
node --check app.js
node --check dev-server.js
node tests\dom-contract.test.js
node tests\engine-smoke.test.js
```
