/**
 * Bilddateien der Anwendung, durchgereicht.
 *
 * Die Anwendung liefert sie unter `/api/public/v1/assets/<id>` und
 * `/api/public/v1/assets/<id>/THUMB` aus — aber nur, wenn die Anfrage den
 * Mandantenschlüssel trägt. Ein `<img>` kann das nicht: es setzt kein
 * Kopffeld. Diese Route setzt ihn, wie bei jeder anderen Server-zu-Server-
 * Abfrage dieser Seite.
 *
 * Ein Platzhalter über alle Adressstücke (`[...path]`) und nicht zwei
 * Routen: die Anwendung kennt heute das Original und die Variante THUMB,
 * und wenn morgen eine dritte dazukommt, reicht diese Route sie ebenfalls
 * durch. Geprüft wird trotzdem streng — was hier ankommt, ist eine
 * Behauptung aus der Adresszeile.
 *
 * Was NICHT geprüft wird, ist die Berechtigung: das tut die Anwendung in
 * ihren Zeilenrechten. Öffentlich ist ein Bild dort, wenn etwas
 * Öffentliches darauf zeigt; wer eine Kennung rät, bekommt 404.
 */
export default defineEventHandler(async (event) => {
  const raw = String(getRouterParam(event, 'path') ?? '')

  // <uuid> oder <uuid>/<VARIANTE>. Nichts anderes, und vor allem keine
  // Punkte: ein "../" in dieser Stelle wäre ein Pfad in fremde Endpunkte.
  const match = raw.match(/^([0-9a-f-]{36})(?:\/([A-Za-z0-9_]{1,20}))?$/i)
  if (!match) {
    throw createError({ statusCode: 400, statusMessage: 'Keine Bildkennung' })
  }
  const [, id, variant] = match

  const base = String(process.env.BB_API ?? '')
  if (!base) {
    throw createError({ statusCode: 503, statusMessage: 'Bilder nicht erreichbar' })
  }

  const target = `${base}/api/public/v1/assets/${id}${variant ? `/${variant}` : ''}`
  const response = await $fetch.raw<ArrayBuffer>(target, {
    headers: { 'X-BB-Site': String(process.env.BB_SITE ?? '') },
    responseType: 'arrayBuffer',
    timeout: 15_000,
  })

  setHeader(event, 'content-type', response.headers.get('content-type') ?? 'application/octet-stream')
  /*
   * Dreissig Tage, und das ist sicher: die Kennung eines Bildes ist seine
   * Kennung. Wird ein Artikel mit einem anderen Bild versehen, steht dort
   * eine andere Kennung und damit eine andere Adresse — ein zwischen-
   * gespeichertes Bild kann nie das falsche sein. Dieselbe Frist wie in
   * der Anwendung.
   */
  setHeader(event, 'cache-control', 'public, max-age=2592000, immutable')
  // Nitro nimmt hier eine Zahl. Der Kopf kommt als Zeichenkette an, und
  // eine unlesbare wird still uebergangen statt eine NaN zu setzen.
  const length = Number.parseInt(response.headers.get('content-length') ?? '', 10)
  if (Number.isFinite(length)) setHeader(event, 'content-length', length)

  /*
   * Buffer und nicht der ArrayBuffer selbst. Nitro reicht einen Buffer roh
   * durch, einen ArrayBuffer aber schickt es durch JSON.stringify — und
   * dabei wird aus einem Bild von 300 kB die Zeichenkette "{}": Antwort
   * 200, Inhaltstyp image/jpeg, zwei Byte lang. Ein Fehler, den kein
   * Statuscode verrät.
   */
  /*
   * Als Uint8Array und nicht als Buffer: Nitro reicht beide roh durch, aber
   * der Typprüfer dieser Seite kennt die Node-Typen nicht -- ein Buffer
   * hiesse hier, @types/node nur für diese eine Zeile aufzunehmen.
   * Uint8Array steht im Browser wie in Node und tut dasselbe.
   */
  return new Uint8Array(response._data as ArrayBuffer)
})
