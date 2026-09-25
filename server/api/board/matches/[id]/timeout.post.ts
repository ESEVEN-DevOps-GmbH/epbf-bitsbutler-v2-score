/**
 * Auszeit nehmen oder beenden — eine Route für beides.
 *
 * Das Vorgängersystem hat dafür einen einzigen Endpunkt (`toggleTimeout`),
 * und das ist am Gerät auch richtig: es gibt eine Taste je Seite, und was
 * sie tut, hängt davon ab, ob gerade eine Auszeit läuft. In v2 sind es zwei
 * Vorgänge — `POST /matches/{id}/timeout?side=A` nimmt eine, `DELETE
 * /matches/{id}/timeout?side=A` beendet sie —, und das ist die bessere
 * Aufteilung: eine Auszeit zu nehmen zählt gegen das Guthaben des Spielers,
 * sie zu beenden nicht.
 *
 * BEIDE Wege tragen die Seite. Bis zum 14.09.2026 endete das Beenden über
 * `POST /matches/{id}/resume`, und das galt für die ganze Partie: wer seine
 * eigene Auszeit beendete, beendete auch die des Gegners. Jetzt ist die
 * Auszeit eine Sache des Spielers, und die Partie ruht so lange, bis beide
 * zurück am Tisch sind.
 *
 * WARUM DAS UMSCHALTEN TROTZDEM HIER STEHT UND NICHT IN DER TAFEL
 *
 * Damit zwischen "läuft schon" und "wird genommen" kein zweiter Weg über
 * das Netz liegt. Entscheidet die Tafel, welchen der beiden Aufrufe sie
 * macht, entscheidet sie es anhand ihres letzten Abrufs — und der ist bis
 * zu zehn Sekunden alt. Hier steht die Entscheidung neben dem Aufruf.
 *
 * WAS DIE ANWENDUNG ANDERS MACHT ALS DAS VORBILD
 *
 * v1 zieht eine Auszeit erst vom Guthaben ab, wenn sie vorzeitig beendet
 * wird. v2 bucht sie beim Nehmen (`competition.take_timeout`) und weist mit
 * TIMEOUTS_USED_UP ab, wenn keine mehr da ist — sonst wäre eine Auszeit,
 * die niemand beendet, umsonst, und die Abweisung käme zu spät.
 *
 * Die Rücknahme des Fehltippers hat v2 seit dem 14.09.2026 auch: wer binnen
 * zehn Sekunden merkt, dass er die falsche Fläche getroffen hat, bekommt
 * die Auszeit zurück. Sie steht in `competition.end_timeout`, wo das
 * Guthaben liegt, und nicht in dieser Durchreiche.
 */
export default defineEventHandler(async (event) => {
  const id = parseId(getRouterParam(event, 'id'), 'Partiekennung')
  const body = await readBody<{ side?: string, running?: boolean }>(event)

  const side = String(body?.side ?? '').trim().toUpperCase()
  if (side !== 'A' && side !== 'B') {
    throw createError({ statusCode: 400, statusMessage: 'Keine Seite' })
  }

  return body?.running === true
    ? await toAdmin(event, `/matches/${id}/timeout?side=${side}`,
        { method: 'DELETE' })
    : await toAdmin(event, `/matches/${id}/timeout?side=${side}`,
        { method: 'POST' })
})
