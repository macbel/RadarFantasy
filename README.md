# Fantasy Market Scout

App para analizar mercado fantasy de Biwenger con OCR, ranking de fichajes y apoyo de fuentes como SofaScore y FutbolFantasy.

## Modos de uso

### Web local

Para usar OCR, enriquecimiento real, cache diaria y guardado en archivos locales:

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
