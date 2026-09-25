/**
 * Der Satz (bzw. Frame) ist zu Ende — seit dem 25.09.2026.
 *
 * OHNE RUMPF LEITET DIE ANWENDUNG DEN GEWINNER AUS DEM STAND AB. Das ist
 * POOL: `competition.confirm_set_result` haelt `match_slot.set_score` gegen
 * `match.set_race_to` -- dieselbe Haltung wie bei `confirm.post.ts` fuer die
 * ganze Partie, und aus demselben Grund: `readBody` steht hier fuer den
 * Regelfall nicht, und was nicht gelesen wird, laesst sich nicht faelschen.
 *
 * MIT RUMPF ({ winner: 'A' | 'B' }) GILT DER GENANNTE GEWINNER, UND
 * set_race_to WIRD NICHT BEFRAGT -- ES DARF NULL SEIN. Das ist SNOOKER: ein
 * Frame endet nicht an einer Zahl, sondern wenn keine Baelle mehr liegen und
 * der Rueckstand uneinholbar ist. Wer ihn gewonnen hat, weiss nur der
 * Schiedsrichter am Tisch, und er sagt es ausdruecklich.
 *
 * MASSGEBLICH IST `matchFinished`, NICHT `advanced` -- die Tafel (siehe
 * useScoring.ts, `satzAbschliessen`) liest genau das und nicht das
 * andere: `advanced` ist 0, wenn nichts weitergereicht wurde, und das
 * trifft auf eine beendete Partie genauso zu wie auf einen Satz, nach dem es
 * weitergeht.
 */
export default defineEventHandler(async (event) => {
  const id = parseId(getRouterParam(event, 'id'), 'Partiekennung')
  const body = await readBody<{ winner?: string } | null>(event)

  const raw = String(body?.winner ?? '').trim().toUpperCase()
  const winner = raw === 'A' || raw === 'B' ? raw : undefined

  return await toAdmin<{
    advanced: number, newlySettled: number, matchFinished: boolean
  }>(event, `/matches/${id}/confirm-set`, {
    method: 'POST',
    body: winner ? { winner } : {},
  })
})
