/**
 * Das Zeitlimit ist abgelaufen — die Uhr und nicht die Distanz beendet die
 * Partie (Heyball: "race to 7 ODER 100 Minuten, was zuerst eintritt").
 *
 * Das Geschwister von `confirm.post.ts` für den zweiten Fall. OHNE Stand im
 * Rumpf, aus demselben Grund: `competition.confirm_match_time_limit` liest
 * den Stand selbst, prüft die Uhr gegen `tournament.time_limit_minutes` und
 * leitet den Sieger ab — führt eine Seite, gewinnt sie von selbst; steht es
 * gleich, entscheidet der Shoot-out.
 *
 * `shootoutWinner` GEHT NUR MIT, WENN DIE TAFEL UNENTSCHIEDEN STEHT. Die
 * Datenbank prüft ihn gegen den TATSÄCHLICHEN Gleichstand und weist ihn
 * sonst ab (`SHOOTOUT_NOT_APPLICABLE`) — was nicht gelesen wird, lässt sich
 * nicht fälschen, dieselbe Haltung wie bei `confirm.post.ts` und `winner`
 * dort.
 *
 * Ohne Personencode, wie `confirm.post.ts`: der Auftraggeber erlaubt dort
 * ausdrücklich, dass die Spieler selbst das Erreichen der Distanz
 * bestätigen — "um damit zu bestaetigen, das das summary so richtig ist".
 * Beim Zeitlimit ist es dieselbe Bestätigung dessen, was ohnehin auf der
 * Tafel steht; nur der Shoot-out-Sieger ist eine Angabe, die die Tafel
 * nicht selbst kennt und die deshalb im Schiedsrichtermenü gefragt wird.
 * `MatchController.confirmTimeLimit` verlangt entsprechend keinen Code.
 */
export default defineEventHandler(async (event) => {
  const id = parseId(getRouterParam(event, 'id'), 'Partiekennung')
  const body = await readBody<{ shootoutWinner?: string } | null>(event)

  const raw = String(body?.shootoutWinner ?? '').trim().toUpperCase()
  const winner = raw === 'A' || raw === 'B' ? raw : undefined

  return await toAdmin<{ advanced: number, newlySettled: number }>(
    event, `/matches/${id}/confirm-time-limit`, {
      method: 'POST',
      body: winner ? { shootoutWinner: winner } : {},
    })
})
