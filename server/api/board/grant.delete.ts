/**
 * "Dieser Schirm zählt nicht mehr."
 *
 * Am Gerät selbst und ohne Rückfrage bei der Turnierleitung: ein Bildschirm,
 * der abgebaut wird, soll seine Freigabe mitnehmen können. Der harmloseste
 * aller Wege — er nimmt nur Rechte weg, und nur die eigenen.
 *
 * Der Keks geht hier weg und nicht erst beim nächsten Abruf. Ein Gerät, das
 * seine Freigabe abgegeben hat und den Keks behält, bekäme bei jeder
 * weiteren Anfrage eine Abweisung, die niemand mehr beheben kann.
 */
export default defineEventHandler(async (event) => {
  const summary = await toAdmin<{ released: number }>(
    event, '/board/grant', { method: 'DELETE' })

  deleteCookie(event, 'bb_board', { path: '/' })
  return summary
})
