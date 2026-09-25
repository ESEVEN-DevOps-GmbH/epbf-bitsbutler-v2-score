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
  const raw = String(getRouterParam(event, 'number') ?? '')
  const tableNumber = Number.parseInt(raw, 10)
  if (!/^[0-9]{1,3}$/.test(raw) || tableNumber < 1) {
    throw createError({ statusCode: 400, statusMessage: 'Keine Tischnummer' })
  }

  const base = String(process.env.BB_API ?? '')
  if (!base) {
    throw createError({ statusCode: 503, statusMessage: 'Scoring not reachable' })
  }

  const board = await getTableBoard(base, String(process.env.BB_SITE ?? ''), id, tableNumber)
  if (!board) {
    throw createError({ statusCode: 404, statusMessage: 'Veranstaltung nicht gefunden' })
  }
  return board
})
