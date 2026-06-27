# Version 3.0.0

Fecha de cierre: 2026-06-27

## Alcance

- Web app de mercado fantasy multiplataforma, empezando por Biwenger.
- API PHP para hosting compartido.
- Empaquetado Android/iOS con Capacitor.
- APK debug local: `Radar-Fantasy-Android-v3.0.0.apk`.

## Notas de version

- Nuevo Director deportivo con Plan de hoy y acciones ejecutables sobre Biwenger.
- Escenarios conservador, equilibrado y agresivo con saldo de cierre, ventas, ofertas y limite real de puja.
- Calidad de fuentes por jugador, deteccion de discrepancias e intervalos de puntos esperados.
- Sincronizacion automatica coordinada de mercado, equipo, operaciones, jornada y fuentes.
- Aprendizaje local de preferencias con ajustes limitados para no ocultar riesgos deportivos o financieros.
- Inteligencia rival incorporada al plan mediante demanda, ventas, necesidades y perfiles cargados.
- Once optimizado con titularidad, racha, calendario, confianza y puntos esperados.
- Avisos web y notificaciones nativas para incidencias del once y riesgos de saldo.
- Deteccion persistente de jugadores que abandonan el catalogo activo de la competicion.

## Seguridad de configuracion

- `app-config.js` es local y no se versiona.
- Claves de ScoreBat y API-Football deben configurarse por variable de entorno o archivos privados en `.fantasy-db/`.
- `.tooling/`, builds, APKs y caches quedan fuera de Git.
