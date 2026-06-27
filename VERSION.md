# Version 2.8.0

Fecha de cierre: 2026-06-27

## Alcance

- Web app de mercado fantasy multiplataforma, empezando por Biwenger.
- API PHP para hosting compartido.
- Empaquetado Android/iOS con Capacitor.
- APK debug local: `Radar-Fantasy-Android-v2.8.0.apk`.

## Notas de version

- Centro de alertas por liga para lesiones, dudas, sanciones, bajas confirmadas y jugadores fuera de competicion.
- Avisos prioritarios cuando una incidencia afecta al once, con acceso directo para corregir la alineacion.
- Asistente con saldo futuro, recompensas de jornada y ejecucion conjunta de acciones sugeridas.
- Simulacion corregida de ofertas, pujas y ventas, protegiendo jugadores en racha.
- Mercado reforzado con decisiones aprendidas, limites reales de puja y descarte de jugadores inasequibles.
- Actividad de liga enriquecida con jugadores, rivales e iconos; busqueda de emisiones y videos desde Jornada.

## Seguridad de configuracion

- `app-config.js` es local y no se versiona.
- Claves de ScoreBat y API-Football deben configurarse por variable de entorno o archivos privados en `.fantasy-db/`.
- `.tooling/`, builds, APKs y caches quedan fuera de Git.
