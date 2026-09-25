import type { MatchEventPublic } from '~~/shared/types/api'

/**
 * Der Verlauf einer Partie — für den Schiedsrichter am Tisch.
 *
 * WARUM ES DIESE ROUTE ÜBERHAUPT GIBT
 *
 * Bis zum 15.09.2026 holte sich das Schirimenü den Verlauf über
 * `/api/matches/{id}/timeline`, also über die ÖFFENTLICHE Leseschnittstelle.
 * Die filtert, was das Publikum nichts angeht: `PublicRepository.matchTimeline`
 * lässt `NOTE` und `UNDO` weg. Das Menü bekam damit nie zu sehen, was es am
 * dringendsten braucht — der `case 'NOTE'` in RefereeMenu.vue
 * ("Score corrected …") stand seit jeher da und konnte nie eintreten, weil
 * die Zeile schon in der Datenbankabfrage weggefallen war.
 *
 * Der Wunsch "ein Undo sollte auch als Undo im Verlauf ersichtlich sein" und
 * die Regel "die Zuschauer sehen den Vertipper nicht" widersprechen sich
 * nicht — sie verlangen ZWEI Verläufe. Dieser hier ist der vollständige, und
 * er ist es genau deshalb, weil er eine Anmeldung verlangt.
 *
 * WARUM DIESELBE FORM WIE DIE ÖFFENTLICHE
 *
 * Die Verwaltung liefert `score_a`, `score_b` und `actor_label`; das Menü
 * liest `MatchEventPublic`. Umgeformt wird hier und nicht dort: eine zweite
 * Form am Gerät hiesse, jede Zeile des Menüs in zwei Schreibweisen zu lesen,
 * und die Tafel soll nicht wissen, aus welcher Quelle ihr Verlauf kommt.
 *
 * DER URHEBER GEHT SEIT DEM 16.09.2026 MIT — ABER NUR, WENN ER EIN NAME IST
 *
 * Hier stand: er falle weg, "am Tisch steht ein Schiedsrichter, und 'wer war
 * das' ist dort keine Frage". Das galt, solange am Tablet EINER stand, der
 * sich angemeldet hatte. Seit die Anmeldung weg ist, weist sich jeder mit
 * seinen sechs Ziffern aus, und der Auftraggeber verlangt genau deshalb:
 * "im verlauf steht dann wer was gemacht hat, weil anhand der pin ein schiri
 * ja identifiziert werden kann". Ohne den Namen wäre die PIN eine Hürde ohne
 * Ertrag.
 *
 * DURCHGEREICHT WIRD ER NUR BEI `BOARD_PIN` UND `SESSION`, also dort, wo
 * wirklich ein Mensch dahintersteht. Eine Zeile vom blossen Gerät trägt als
 * Etikett "Anzeigetafel · Tisch 7" — das weiss am Tisch jeder schon, und
 * zwanzig solcher Zeilen im Verlauf wären Lärm über der einen, auf die es
 * ankommt.
 *
 * Und bei `BOARD_PIN` steht nur der NAME und nicht das ganze Etikett: die
 * Verwaltung setzt es als "Kudlik · Anzeigetafel · Tisch 7" zusammen
 * (BoardPinService), weil im Protokoll der Ort mit dazugehört. Am Tisch
 * gehört er nicht dazu — der Schirm, auf den man sieht, IST der Ort.
 *
 * DER ÖFFENTLICHE VERLAUF BLEIBT OHNE. Er kommt aus einer anderen Abfrage
 * (`PublicRepository.matchTimeline`), und dort ist die alte Begründung
 * weiter richtig: wer eine Auszeit genommen hat, gehört auf die Tribüne, wer
 * sie eingetragen hat, nicht.
 *
 * WAS BEI FEHLENDER ANMELDUNG PASSIERT
 *
 * `fromAdmin` gibt dann `null`, und daraus wird hier eine leere Liste
 * statt eines Fehlers. Ein Bildschirm ohne Freigabe und ohne Anmeldung
 * kommt gar nicht bis hierher (das Menü hängt an `zaehlen`), und eine rote
 * Zeile für einen Fall, den es nicht gibt, wäre am Tisch nur Lärm.
 */

/**
 * Der Name vor dem ersten " · " — oder nichts.
 *
 * Getrennt wird am selben Zeichen, mit dem `BoardPinService` zusammensetzt.
 * Fällt das Etikett eines Tages anders aus, bleibt hier der ganze Text
 * stehen; das ist der harmlose Fehler von beiden, denn ein Name zu viel ist
 * am Tisch besser als ein fehlender.
 */
function nameOnly(label: string | null): string | null {
  const full = String(label ?? '').trim()
  if (full === '') return null
  const first = full.split(' · ')[0]?.trim() ?? ''
  return first === '' ? null : first
}
export default defineEventHandler(async (event): Promise<MatchEventPublic[]> => {
  const raw = String(getRouterParam(event, 'id') ?? '')
  if (!/^[0-9a-f-]{36}$/i.test(raw)) {
    throw createError({ statusCode: 400, statusMessage: 'Keine Partiekennung' })
  }

  const rows = await fromAdmin<Array<{
    at: string
    kind: string
    side: 'A' | 'B' | null
    score_a: number | null
    score_b: number | null
    detail: Record<string, string | number> | null
    actor_label: string | null
    actor_via: 'SESSION' | 'BOARD' | 'BOARD_PIN' | null
  }>>(event, `/matches/${raw}/timeline`)

  return (rows ?? []).map(z => ({
    /*
     * Auf die Form gebracht, die `new Date` sicher versteht. Die Verwaltung
     * schreibt Zeitstempel im PostgreSQL-Stil ("…T21:46:00+02"), und für den
     * einteiligen Zonenversatz gibt V8 "Invalid Date" zurück — derselbe
     * Stolperstein, den `useDateFormat` schon einmal beschrieben hat.
     */
    at: String(z.at ?? '').replace(/([+-]\d{2})$/, '$1:00'),
    kind: String(z.kind ?? ''),
    side: z.side ?? null,
    scoreA: z.score_a ?? null,
    scoreB: z.score_b ?? null,
    detail: z.detail ?? null,
    /*
     * Der WEG und der URHEBER sind zweierlei, und beide gehen mit:
     * `actor_via` nennt die Art des Geräts, `actor_label` einen Menschen.
     * Ohne den Weg stünde im Schirimenü weiter „Shot clock acknowledged at
     * the table" für eine Quittung, die aus dem Büro kam, und der
     * Schiedsrichter am Tisch wüsste nicht, dass nicht er es war.
     */
    actorVia: z.actor_via ?? null,
    /*
     * Nur wo ein Mensch dahintersteht — siehe oben. Die Bedingung steht
     * HIER und nicht am Menü: was gar nicht erst über die Leitung geht,
     * kann eine spätere Fassung der Oberfläche auch nicht versehentlich
     * anzeigen.
     */
    actorName: z.actor_via === 'BOARD_PIN' || z.actor_via === 'SESSION'
      ? nameOnly(z.actor_label)
      : null,
  }))
})
