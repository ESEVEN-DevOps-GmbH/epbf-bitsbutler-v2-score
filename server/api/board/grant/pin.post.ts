/**
 * Sechs Ziffern nachweisen — ohne dass etwas geschieht.
 *
 * WOFÜR ES DAS GIBT
 *
 * Der Auftraggeber verlangt den Personencode für „im endeffekt alles was
 * dort im menue drin ist". Alle Punkte des Schiedsrichtermenüs bis auf einen
 * schreiben etwas, und der Code reist bei ihnen als `boardPin` mit der Tat
 * mit — die Karte, die Aufgabe, die Auszeit-Rücknahme. Der TISCHWECHSEL
 * schreibt nichts: er schickt den Schirm zurück zur Tischwahl, und das ist
 * eine Bewegung im Browser. Ohne diesen Weg bliebe für ihn nur eine Prüfung
 * IM GERÄT, und die ist keine.
 *
 * WARUM DAS KEIN NEUES SCHEUNENTOR IST
 *
 * Geraten werden kann hier wie an jedem anderen Weg mit Code: die Verwaltung
 * hängt beide an dieselbe Bremse (`identity.verify_board_pin` — fünf
 * Fehlversuche je Freigabe, dann eine Viertelstunde Ruhe), und beide setzen
 * voraus, dass das Gerät den sechsstelligen Tafelcode schon eingelöst hat.
 * Wer raten will, tut es heute an `POST /matches/{id}/cards`.
 *
 * WAS ZURÜCKKOMMT
 *
 * Der Name — damit am Gerät stehen kann, wer den Tisch gewechselt hat.
 */
export default defineEventHandler(async (event) => {
  const body = await readBody<{ pin?: string }>(event)
  const code = String(body?.pin ?? '').trim()

  if (!/^[0-9]{6}$/.test(code)) {
    /*
     * Sechs Ziffern sind sechs Ziffern — dieselbe Vorprüfung wie in
     * `cards.post.ts`, und aus demselben Grund: ein Versuch, der schon an
     * der Form scheitert, soll die Bremse des Geräts nicht mit hochzählen.
     */
    throw createError({
      statusCode: 400,
      statusMessage: 'Rejected',
      data: { error: 'BOARD_PIN_REJECTED', detail: 'A personal code is six digits.', params: {} },
    })
  }

  return await toAdmin<{ name: string }>(
    event, '/board/grant/pin', { method: 'POST', body: { pin: code } })
})
