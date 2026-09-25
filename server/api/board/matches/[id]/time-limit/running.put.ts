/**
 * Die Zeitlimit-Uhr von Hand anhalten oder fortsetzen — der Griff des
 * Schiedsrichters zwischen zwei Racks.
 *
 * Korrektur des Auftraggebers vom 21.09.2026, wörtlich: "die uhr wird bei
 * einem time-out angehalten.. aber auch der schiri, haelt die uhr immer an,
 * wenn neu aufgebaut wird.. also zwischen den racks quasi". Auszeit,
 * gewertetes Rack und Partieende halten die Uhr schon automatisch an
 * (`competition.take_timeout`, `competition.score_pauses_the_clock`,
 * `competition.report_match_result`); für den Neuaufbau zwischen zwei
 * Racks gibt es dagegen kein verlässliches automatisches Signal — der
 * Schiedsrichter setzt die Uhr deshalb hier von Hand fort und hält sie hier
 * auch von Hand an, für jeden Fall, den die automatischen Stellen nicht
 * abdecken.
 *
 * DER GANZE ZUSTAND AUF EINMAL UND ABSOLUT, dieselbe Haltung wie bei
 * `timeout.post.ts`: `running` ist der Zustand, den die Uhr danach haben
 * soll, keine Veränderung. Beide Richtungen sind idempotent —
 * `competition.set_match_time_limit_running` lässt eine schon laufende Uhr
 * bei `running: true` unangetastet, eine schon stehende bei `running:
 * false`.
 *
 * OHNE PERSONENCODE. `MatchController.setTimeLimitRunning` verlangt keinen
 * — er ist ebenso reversibel wie das Zählen selbst und wird oft gebraucht,
 * nach jedem Rack. Ein Code stünde hier zwischen dem Schiedsrichter und dem
 * Griff, den er am häufigsten braucht.
 */
export default defineEventHandler(async (event) => {
  const id = parseId(getRouterParam(event, 'id'), 'Partiekennung')
  const body = await readBody<{ running?: boolean }>(event)

  if (typeof body?.running !== 'boolean') {
    throw createError({ statusCode: 400, statusMessage: 'Kein Zustand' })
  }

  return await anDieVerwaltung<{ running: boolean }>(
    event, `/matches/${id}/time-limit/running`, {
      method: 'PUT',
      body: { running: body.running },
    })
})
