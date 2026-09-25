/**
 * Auf welcher Karte die beiden Seiten stehen — für den Schiedsrichter am Tisch.
 *
 * WARUM DAS ÜBERHAUPT EINE EIGENE ROUTE IST
 *
 * Der Stand einer Verwarnung ist keine Sportinformation. Er steht in
 * `competition.card_standing`, und diese Tabelle kennt `bb_public` gar nicht —
 * kein GRANT, keine öffentliche Richtlinie, kein öffentlicher Endpunkt. Was
 * das Publikum sieht, ist ausschließlich das `PENALTY_RACK` im Verlauf: dass
 * ein Rack zugesprochen wurde, sieht ohnehin jeder im Saal, warum, geht nur
 * die Turnierleitung etwas an.
 *
 * Diese Route führt deshalb NICHT über `/api/matches/...`, sondern über
 * `/api/board/...` — denselben Weg wie der vollständige Verlauf, und aus
 * demselben Grund: sie verlangt eine Anmeldung oder eine Tischfreigabe.
 *
 * JE MENSCH UND NICHT JE SEITE
 *
 * Bei einem Doppel stehen zwei auf einer Seite, und eine Karte trifft einen
 * von beiden (§ 8.16.3: "the offending athlete receives the card"). Eine
 * Zeile je Seite hätte die Frage "wer von den beiden?" gar nicht stellen
 * können; das Menü gruppiert sie selbst.
 *
 * DER TAFELCODE REICHT — SEIT DEM 16.09.2026
 *
 * Bis dahin hing die Verwaltungsseite dieser Route an `referee:R`, also an
 * einem PERSONENrecht. Ein Tablet mit blossem Tafelcode trägt keine Rolle,
 * und der Block "Warnings" blieb deshalb LEER — wer nicht sieht, worauf ein
 * Spieler steht, gibt auch keine Karte. Der einzige Ausweg war die
 * Anmeldung mit Konto und Kennwort mitten in der Partie, und genau die hat
 * der Auftraggeber als "null praktikabel" zurückgewiesen.
 *
 * Jetzt fragt `CardController.atTheTable` zuerst das Recht und danach die
 * Tischfreigabe (`identity.board_may_score`). Das Gerät sieht damit genau
 * die Partie, die VOR IHM LIEGT, und keine andere. Der grosse Saalschirm
 * hält keine Freigabe und sieht weiter nichts.
 *
 * DAS GEBEN BLEIBT HINTER DEN SECHS ZIFFERN. Lesen ist der Blick, Schreiben
 * ist die Tat — nur die trägt einen Namen (siehe cards.post.ts nebenan).
 *
 * WAS OHNE BEIDES PASSIERT
 *
 * `vonDerVerwaltung` gibt dann `null`. Daraus wird hier ein leerer Block und
 * kein Fehler — dieselbe Entscheidung wie beim Verlauf nebenan: ein Gerät
 * ohne Freigabe und ohne Anmeldung kommt gar nicht bis ins Menü, und eine
 * rote Zeile für einen Fall, den es nicht gibt, wäre am Tisch nur Lärm.
 */
export interface KartenStand {
  side: 'A' | 'B'
  playerId: string
  displayName: string
  givenName: string | null
  familyName: string | null
  standing: 'NONE' | 'GREEN' | 'YELLOW' | 'RED' | 'BLACK'
}

/**
 * Ein Anlass aus dem Katalog des Verbandes — § 9.1.1 bis § 9.1.3.
 *
 * Seit dem 16.09.2026 kommt die Liste aus `sport.card_reason` statt aus einer
 * Konstanten im Tafelcode. Ändert der Verband seine Sportordnung, pflegt der
 * Betreiber das in einer Maske; vorher war es ein Deploy dieser Webseite für
 * eine Zeile Text.
 *
 * Sie fährt in DIESER Antwort mit und hat keine eigene Route. Das Menü fragt
 * den Stand ohnehin beim Öffnen, die Wache ist damit dieselbe, und es gibt
 * keinen zweiten Weg, der eines Tages ohne sie auskommt.
 *
 * SCHWARZ KOMMT HIER NIE VOR. Sie hat keinen Anlass aus dieser Liste — sie
 * folgt aus einer Karte auf dem Stand ROT und wird vom Turnierleiter oder
 * Sportdirektor gegeben (Fußnote zu § 9.1).
 */
export interface Kartenanlass {
  code: string
  text: string
  paragraph: string
  karte: 'GREEN' | 'YELLOW' | 'RED'
}

export default defineEventHandler(async (event): Promise<{
  eventId: string | null
  sides: KartenStand[]
  reasons: Kartenanlass[]
  mayDisqualify: boolean
}> => {
  const roh = String(getRouterParam(event, 'id') ?? '')
  if (!/^[0-9a-f-]{36}$/i.test(roh)) {
    throw createError({ statusCode: 400, statusMessage: 'Keine Partiekennung' })
  }

  const antwort = await vonDerVerwaltung<{
    eventId: string
    mayDisqualify: boolean
    reasons: Array<{
      code: string
      text: string
      paragraph: string
      card: string
    }>
    sides: Array<{
      side: 'A' | 'B'
      player_id: string
      display_name: string | null
      given_name: string | null
      family_name: string | null
      standing: string
    }>
  }>(event, `/matches/${roh}/cards`)

  return {
    eventId: antwort?.eventId ?? null,
    mayDisqualify: antwort?.mayDisqualify === true,
    /*
     * Eine leere Liste ist hier kein Fehler, sondern eine Ansage: das Menü
     * greift dann auf seine eingebaute zurück (siehe Schirimenue.vue). Wer
     * hier würfe, hielte den ganzen Block "Warnings" an — und damit auch den
     * Stand, den der Schiedsrichter sehen muss, bevor er entscheidet.
     */
    reasons: (antwort?.reasons ?? [])
      .filter(a => a?.card === 'GREEN' || a?.card === 'YELLOW' || a?.card === 'RED')
      .map(a => ({
        code: String(a.code ?? ''),
        text: String(a.text ?? '').trim(),
        paragraph: String(a.paragraph ?? '').trim(),
        karte: a.card as Kartenanlass['karte'],
      }))
      .filter(a => a.code !== '' && a.text !== ''),
    sides: (antwort?.sides ?? []).map(z => ({
      side: z.side,
      playerId: String(z.player_id ?? ''),
      displayName: String(z.display_name ?? '').trim(),
      givenName: z.given_name ?? null,
      familyName: z.family_name ?? null,
      standing: (z.standing ?? 'NONE') as KartenStand['standing'],
    })),
  }
})
