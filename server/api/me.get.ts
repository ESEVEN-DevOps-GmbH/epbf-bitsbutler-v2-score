/**
 * Wer angemeldet ist — null, wenn niemand.
 *
 * Kein Fehler ohne Anmeldung: „niemand ist angemeldet" ist eine Antwort und
 * kein Ausfall. Die Seite fragt das bei jedem Aufbau, und eine 401 im
 * Protokoll jedes anonymen Besuchers wäre Lärm.
 */
export default defineEventHandler(async (event) => {
  const session = getCookie(event, 'bb_session')
  const base = String(process.env.BB_API ?? '')
  if (!session || !base) return null

  const a = await $fetch<{ user?: unknown, adminUi?: boolean, player?: unknown }>(
    `${base}/api/admin/v1/me`,
    { headers: { cookie: `bb_session=${session}` }, timeout: 10_000 },
  ).catch(() => null)

  // Die Anwendung antwortet auch ohne gültige Sitzung mit einem Rumpf, in
  // dem `user` null ist. Das ist hier dasselbe wie „niemand".
  return a?.user ? a : null
})
