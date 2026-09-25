/**
 * Abmelden. Zweimal abmelden ist kein Fehler.
 *
 * Die Sitzung wird in der Anwendung widerrufen — nicht nur das Cookie
 * gelöscht: ein gelöschtes Cookie beendet nichts, es versteckt nur den
 * Schlüssel. Wer ihn noch hat, wäre weiter angemeldet.
 */
export default defineEventHandler(async (event) => {
  const sitzung = getCookie(event, 'bb_session')
  const basis = String(process.env.BB_API ?? '')

  if (sitzung && basis) {
    await $fetch(`${basis}/api/admin/v1/session`, {
      method: 'DELETE',
      headers: { cookie: `bb_session=${sitzung}` },
      timeout: 10_000,
    }).catch(() => undefined)
  }

  deleteCookie(event, 'bb_session', { path: '/' })
  return { signedOut: true }
})
