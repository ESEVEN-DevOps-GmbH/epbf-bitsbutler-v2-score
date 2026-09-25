/**
 * Die Auszeit ZURÜCKNEHMEN — mit Gutschrift, ohne Frist.
 *
 * EINE EIGENE ROUTE UND KEIN SCHALTER AN `timeout.post.ts`. Die
 * Nachbardatei schaltet zwischen Nehmen und Beenden um, und das ist dort
 * richtig: es ist dieselbe Taste am Tisch, und welcher der beiden Vorgänge
 * gemeint ist, weiss die Durchreiche besser als ein Abruf von vor zehn
 * Sekunden. Hier ist es anders herum — es ist eine ANDERE Taste, an einer
 * anderen Stelle, mit anderen Rechten. Ein drittes `body.irgendwas === true`
 * in jener Datei hätte die Rechtestufe von einem Rumpffeld abhängig
 * gemacht, und genau das ist das Feld, das der nächste Aufrufer vergisst.
 *
 * WAS SIE VON `DELETE /timeout` UNTERSCHEIDET
 *
 * Das Beenden an der Zählleiste gibt die Auszeit nur binnen zehn Sekunden
 * ans Guthaben zurück (`competition.end_timeout`, FEHLTIPP_SEKUNDEN) — dort
 * tippt jemand daneben und merkt es sofort. Diese Route geht über
 * `competition.withdraw_timeout` und schreibt IMMER gut. Der Auftraggeber:
 * "wenn ich ueber das schiri menue das timeout zurueck setze, wird es dem
 * spieler nicht mehr gutgeschrieben.." — dass die falsche Seite eine
 * Auszeit bekommen hat, fällt oft erst nach einer halben Minute auf.
 *
 * UND DESHALB DIE SECHS ZIFFERN
 *
 * Solange die Rücknahme dasselbe tat wie die Zählleiste eine Handbreit
 * tiefer, wäre ein Code Theater gewesen. Jetzt kann sie mehr als die
 * Zählleiste, und ein Spieler, der den Weg ins Menü kennt, könnte sich
 * sonst Auszeiten nachlegen. Geprüft wird das am Server
 * (`MatchController.withdrawTimeout`); hier steht nur die FORM — dieselbe
 * Prüfung wie in `result.post.ts`, aus demselben Grund: sechs Ziffern
 * müssen nicht über die Leitung, um als "keine sechs Ziffern" erkannt zu
 * werden.
 */
export default defineEventHandler(async (event) => {
  const id = parseId(getRouterParam(event, 'id'), 'Partiekennung')
  const body = await readBody<{ side?: string, boardPin?: string }>(event)

  const seite = String(body?.side ?? '').trim().toUpperCase()
  if (seite !== 'A' && seite !== 'B') {
    throw createError({ statusCode: 400, statusMessage: 'Keine Seite' })
  }

  const code = String(body?.boardPin ?? '').trim()
  if (code !== '' && !/^[0-9]{6}$/.test(code)) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Rejected',
      data: {
        error: 'BOARD_PIN_REJECTED',
        detail: 'A personal code is six digits.',
        params: {},
      },
    })
  }

  /*
   * Leer heisst weglassen und nicht "" mitschicken. Wer ANGEMELDET ist,
   * braucht keinen Code — der Server sieht am Keks, ob ein Mensch handelt,
   * und ein leeres Feld im Rumpf sähe aus wie ein Versuch, der schiefging.
   */
  return await anDieVerwaltung(event, `/matches/${id}/timeout/withdraw?side=${seite}`, {
    method: 'POST',
    body: code === '' ? {} : { boardPin: code },
  })
})
