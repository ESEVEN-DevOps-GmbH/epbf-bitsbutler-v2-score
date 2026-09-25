/**
 * Hält dieses Gerät eine Freigabe — und für welchen Tisch?
 *
 * Die Frage des Einrichtungsschirms: er muss wissen, ob er das Codefeld
 * zeigt oder "dieser Schirm zählt an Tisch 7". Der Keks ist `HttpOnly` und
 * damit für den Browser unsichtbar — er könnte es sonst selbst nachsehen,
 * und genau das soll er nicht können.
 *
 * `released: false` statt eines Fehlers, wenn keine da ist. Ein Bildschirm
 * ohne Freigabe ist kein Fehlerfall, sondern der Normalfall: die meisten
 * Schirme in einer Halle zeigen nur an.
 *
 * SEIT DER VERANSTALTUNGSWAHL STEHT AUCH DIE VERANSTALTUNG HIER
 *
 * Eine Freigabe gilt für EINE Veranstaltung (`identity.board_grant.event_id`
 * ist `NOT NULL`). Solange es nur /board/<eventId> gab, war das eine
 * Selbstverständlichkeit — die Seite kannte ihre Veranstaltung aus der
 * Adresse. Die Auswahl unter /board kennt sie nicht, und sie muss die Frage
 * beantworten können, ob eine Wahl ein WECHSEL ist: nur dann gibt das Gerät
 * seine alte Freigabe ab. Ohne dieses Feld bliebe ihr nur zu raten, und ein
 * Gerät, das nach dem Umzug in zwei Hallen zählen darf, ist ein Fehler.
 *
 * Die Verwaltung liefert die Kennung längst mit; sie wurde hier bisher nur
 * weggeworfen.
 */
export default defineEventHandler(async (event) => {
  if (!hasGrant(event)) {
    return { released: false, eventId: null, tableNumber: null }
  }

  const own = await fromAdmin<{
    eventId: string | null, tableNumber: number | null
  }>(event, '/board/grant/live')

  // Kein `null`-Durchreichen: ein abgelaufener oder zurückgenommener Keks
  // liegt noch im Browser, und die Antwort darauf ist "du hältst keine" und
  // nicht "kaputt". Der Schirm zeigt dann wieder das Codefeld, und das ist
  // genau der nächste Schritt.
  if (!own) {
    return { released: false, eventId: null, tableNumber: null }
  }

  return {
    released: true,
    eventId: own.eventId,
    tableNumber: own.tableNumber,
  }
})
