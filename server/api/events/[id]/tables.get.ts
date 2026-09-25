/**
 * Welche Tische es gibt — die Grundlage der Tischwahl am Bildschirm.
 *
 * Ohne Zwischenspeicher wie der Tafelabruf daneben; die Route-Regel dafür
 * steht in nuxt.config unter `/api/events/**`. Ein Tisch, der beim Aufbau
 * dazukommt, soll in der Auswahl erscheinen, sobald der Schirm sie das
 * nächste Mal zeigt.
 *
 * 404 nur für eine Veranstaltung, die es nicht (öffentlich) gibt. Eine leere
 * Tischliste ist eine gültige Antwort: das ist der Aufbau, bevor die Tische
 * angelegt sind, und kein Fehler.
 *
 * Ohne `useContentRepository()`: die Tafel kennt keine Beispieldaten und
 * keine 34 anderen Abfragen der Verbandsseite (siehe server/utils/board-
 * repository.ts). Ohne Anwendung dahinter gibt es hier ehrlich 503 und keine
 * erfundene Tischliste.
 */
export default defineEventHandler(async (event) => {
  const id = parseId(getRouterParam(event, 'id'), 'Veranstaltungskennung')

  const basis = String(process.env.BB_API ?? '')
  if (!basis) {
    throw createError({ statusCode: 503, statusMessage: 'Scoring not reachable' })
  }

  const tische = await getBoardTables(basis, String(process.env.BB_SITE ?? ''), id)
  if (!tische) {
    throw createError({ statusCode: 404, statusMessage: 'Veranstaltung nicht gefunden' })
  }
  return tische
})
