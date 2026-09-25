/**
 * Das Gerät wählt seinen Tisch — oder wechselt ihn.
 *
 * Es gibt EINE Adresse für alle Schirme im Saal; gewählt wird am Gerät.
 * Deshalb ist die Tischwahl vom Einlösen getrennt: ein Schirm, der von
 * Tisch 3 nach Tisch 7 rollt, soll nicht den Code der Turnierleitung wieder
 * erfragen müssen.
 */
export default defineEventHandler(async (event) => {
  const body = await readBody<{ tableNumber?: number }>(event)
  const nummer = body?.tableNumber

  if (!Number.isInteger(nummer) || (nummer as number) < 1 || (nummer as number) > 999) {
    throw createError({ statusCode: 400, statusMessage: 'Keine Tischnummer' })
  }

  return await anDieVerwaltung<{ tableNumber: number }>(
    event, '/board/grant/table', { method: 'PUT', body: { tableNumber: nummer } })
})
