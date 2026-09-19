window.APP_CONFIG = {
  // URL publica o en red local de la API que servira /api/enrich, /api/leagues y /api/source-status.
  // Ejemplos:
  // apiBaseUrl: "https://fantasy-api.tudominio.com",
  // mobileApiBaseUrl: "http://192.168.1.120:5173"
  // scorebatWorldCupEmbedUrl: "https://www.scorebat.com/embed/league/fifa-world-cup/?token=TU_TOKEN&pref=%7B%22nomaxwidth%22%3Atrue%2C%22language%22%3A%22es%22%7D"
  apiBaseUrl: "",
  mobileApiBaseUrl: "",
  // Clave publica SPKI base64/PEM de la firma RS256 emitida por FMS_OFFLINE_AUTH_PRIVATE_KEY.
  // Nunca pongas aqui una clave privada ni un secreto HMAC.
  offlineAuthPublicKey: "",
  offlineAuthIssuer: "radar-fantasy",
  offlineAuthAudience: "radar-fantasy-android"
};
