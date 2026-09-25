/**
 * Abmelden. Zweimal abmelden ist kein Fehler.
 *
 * Die Sitzung wird in der Anwendung widerrufen — nicht nur das Cookie
 * gelöscht: ein gelöschtes Cookie beendet nichts, es versteckt nur den
 * Schlüssel. Wer ihn noch hat, wäre weiter angemeldet.
 */
export default defineEventHandler(async (event) => {
  const session = getCookie(event, 'bb_session')
  const base = String(process.env.BB_API ?? '')

  if (session && base) {
    await $fetch(`${base}/api/admin/v1/session`, {
      method: 'DELETE',
      headers: { cookie: `bb_session=${session}` },
      timeout: 10_000,
    }).catch(() => undefined)
  }

  deleteCookie(event, 'bb_session', { path: '/' })
  return { signedOut: true }
})
