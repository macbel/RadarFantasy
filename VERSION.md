# Version 2.7.1

Fecha de cierre: 2026-06-26

## Alcance

- Web app de mercado fantasy multiplataforma, empezando por Biwenger.
- API PHP para hosting compartido.
- Empaquetado Android/iOS con Capacitor.
- APK debug local: `Radar-Fantasy-Android-v2.7.1.apk`.

## Notas de version

- Centro de mercado con recomendaciones, puja maxima y racha visual.
- Centro de pujas/ventas con simulacion de saldo y puja maxima.
- Filtro reforzado para no mostrar pujas antiguas o duplicadas.
- Importacion directa de mercado y equipo desde Biwenger.
- Secciones de equipo, rivales, jornada, jornada fantasy y videos.
- Renombre de marca visible a `Radar Fantasy` en web, PWA, Android e iOS.

## Seguridad de configuracion

- `app-config.js` es local y no se versiona.
- Claves de ScoreBat y API-Football deben configurarse por variable de entorno o archivos privados en `.fantasy-db/`.
- `.tooling/`, builds, APKs y caches quedan fuera de Git.
