/**
 * Was an einem Tisch steht — die Quelle der Anzeigetafel.
 *
 * Ohne Zwischenspeicher; die Route-Regel dafür steht in nuxt.config unter
 * `/api/events/**`. Eine Tafel, die eine zwischengespeicherte Antwort
 * bekommt, zeigt den Stand von vorhin — und niemand im Saal weiß, warum.
 *
 * 404 nur für eine Veranstaltung, die es nicht (öffentlich) gibt. Ein Tisch
 * ohne Partie ist eine gültige Antwort: das ist die Pause zwischen zwei
 * Partien und kein Fehler.
 *
 * Ohne `useContentRepository()` — siehe server/utils/board-repository.ts.
 */
export default defineEventHandler(async (event) => {
  const id = parseId(getRouterParam(event, 'id'), 'Veranstaltungskennung')

  /*
   * Die Tischnummer ist nicht `parseId`: sie ist eine kleine Zahl und keine
   * Kennung. Geprüft wird sie trotzdem, denn sie kommt aus der Adresse — der
   * Bildschirm in der Halle hat sie einmal bekommen, jeder andere kann
   * hineinschreiben, was er will.
   */
  const roh = String(getRouterParam(event, 'number') ?? '')
  const nummer = Number.parseInt(roh, 10)
  if (!/^[0-9]{1,3}$/.test(roh) || nummer < 1) {
    throw createError({ statusCode: 400, statusMessage: 'Keine Tischnummer' })
  }

  const basis = String(process.env.BB_API ?? '')
  if (!basis) {
    throw createError({ statusCode: 503, statusMessage: 'Scoring not reachable' })
  }

  const tafel = await getTableBoard(basis, String(process.env.BB_SITE ?? ''), id, nummer)
  if (!tafel) {
    throw createError({ statusCode: 404, statusMessage: 'Veranstaltung nicht gefunden' })
  }
  return tafel
})
