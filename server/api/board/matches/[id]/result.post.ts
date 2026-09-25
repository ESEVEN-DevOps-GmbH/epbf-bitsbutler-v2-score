/**
 * Die Partie endet, OHNE dass zu Ende gespielt wurde.
 *
 * SEIT DEM 15.09.2026 NUR NOCH ZWEI ARTEN, UND BEIDE MIT CODE.
 *
 * Bis dahin nahm diese Route auch PLAYED entgegen, mit Sieger und Stand aus
 * dem Rumpf. Das war die offene Tür: bei 3:5 schickt ein Spieler mit der
 * Browserkonsole ein `{winner:'A',scoreA:9}` und hat gewonnen, und im
 * Protokoll ist das vom ehrlichen Weg nicht zu unterscheiden. Das normale
 * Ende läuft deshalb über `confirm.post.ts` — ohne Rumpf, mit einem Sieger,
 * den die Datenbank aus dem gezählten Stand ableitet.
 *
 * Was hier bleibt, sind die beiden Fälle, die sich aus keinem Stand
 * ableiten lassen:
 *
 *   WALKOVER  Einer ist nicht angetreten. Es gibt keinen Stand (0:0) — ein
 *             "9:0" stünde für neun Sätze, die niemand gespielt hat.
 *   FORFEIT   Einer hat aufgegeben, während gespielt wurde. Der Stand, der
 *             auf der Tafel steht, bleibt stehen: er ist erspielt.
 *
 * Beide sieht nur, wer danebensteht, und beide verkürzen ein Turnier.
 * Deshalb verlangen sie sechs Ziffern, die einem MENSCHEN gehören. Der
 * Auftraggeber: "aber auch wieder nur ueber einen code abgesichert.. so das
 * nicht spieler die wissen wie man ins menue kommt, dann selbst".
 *
 * Der Code steht IN der Rückfrage, die No-Show und Forfeit ohnehin schon
 * haben — er ersetzt dort den bestätigenden Knopf, er kommt nicht zu ihm
 * hinzu. Kein zusätzlicher Bedienschritt.
 *
 * WER ANGEMELDET IST, BRAUCHT IHN NICHT.
 *
 * Der Code weist einen Menschen aus; wer schon angemeldet ist, ist
 * ausgewiesen. Geprüft wird das nicht hier, sondern dort: der Server sieht
 * an `bb_session`, dass ein Mensch handelt, und verlangt dann keinen Code.
 * Diese Route reicht ihn nur durch, wenn es ihn gibt — eine zweite
 * Entscheidung darüber wäre die, die beim nächsten Umbau abweicht.
 *
 * NICHT hier: BYE und ANNULLED (die eine entsteht bei der Auslosung, die
 * andere ist die Aufhebung eines Ergebnisses) und die Disqualifikation.
 * Die läuft über `POST /tournaments/{id}/disqualify` und verlangt
 * `disqualification/X` — ein Recht, das die Rolle REFEREE ausdrücklich
 * NICHT trägt. Das ist keine Lücke, sondern die Absicht des Rollenmodells:
 * der Schiedsrichter meldet den Vorfall, ausgeschlossen wird von der
 * Turnierleitung.
 */
const ARTEN = ['WALKOVER', 'FORFEIT']

export default defineEventHandler(async (event) => {
  const id = parseId(getRouterParam(event, 'id'), 'Partiekennung')
  const body = await readBody<{
    winner?: string, scoreA?: number, scoreB?: number, resolution?: string, boardPin?: string
  }>(event)

  const sieger = String(body?.winner ?? '').trim().toUpperCase()
  if (sieger !== 'A' && sieger !== 'B') {
    throw createError({ statusCode: 400, statusMessage: 'Kein Sieger' })
  }

  /*
   * KEINE VORGABE MEHR. Hier stand `?? 'PLAYED'`, und mit dem Wegfall von
   * PLAYED wäre daraus eine Vorgabe geworden, die diese Route ablehnt —
   * eine Zählleiste, die nichts mitschickt, bekäme "Keine Art des Endes"
   * statt eines Hinweises auf `confirm`. Sie muss die Art jetzt nennen.
   */
  const art = String(body?.resolution ?? '').trim().toUpperCase()
  if (!ARTEN.includes(art)) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Rejected',
      data: {
        error: 'RESOLUTION_NOT_AT_THE_TABLE',
        detail: 'A played match is finished through confirm, not here.',
        params: {},
      },
    })
  }

  const a = Number(body?.scoreA)
  const b = Number(body?.scoreB)
  if (!Number.isInteger(a) || !Number.isInteger(b) || a < 0 || b < 0 || a > 999 || b > 999) {
    throw createError({ statusCode: 400, statusMessage: 'Kein Stand' })
  }

  const code = String(body?.boardPin ?? '').trim()
  if (code !== '' && !/^[0-9]{6}$/.test(code)) {
    // Sechs Ziffern sind sechs Ziffern. Ein Versuch, der schon an der Form
    // scheitert, soll die Bremse des Geräts nicht mit hochzählen.
    throw createError({
      statusCode: 400,
      statusMessage: 'Rejected',
      data: { error: 'BOARD_PIN_REJECTED', detail: 'A personal code is six digits.', params: {} },
    })
  }

  return await anDieVerwaltung(event, `/matches/${id}/result`, {
    method: 'POST',
    body: {
      winner: sieger,
      scoreA: a,
      scoreB: b,
      resolution: art,
      ...(code === '' ? {} : { boardPin: code }),
    },
  })
})
