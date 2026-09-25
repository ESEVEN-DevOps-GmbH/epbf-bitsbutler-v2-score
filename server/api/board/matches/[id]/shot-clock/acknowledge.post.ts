/**
 * Der Schiedsrichter nimmt die angeordnete Shot-Clock zur Kenntnis.
 *
 * OHNE RUMPF UND OHNE PERSONENCODE — beides mit Absicht.
 *
 * Ohne Rumpf, weil es nichts zu übergeben gibt: die Bestätigung ist ein
 * Ja oder gar nichts. `competition.acknowledge_shot_clock` setzt einen
 * Zeitpunkt und gibt damit das Weiterzählen wieder frei; sie nimmt keine
 * Sekunden entgegen, weil hier keine Uhr läuft. Der Schiedsrichter steht
 * mit seiner eigenen Stoppuhr am Tisch und macht die Ansagen — das System
 * weiß nur, DASS die Shot-Clock gilt.
 *
 * Ohne Personencode, und das ist die Abwägung: die sechsstellige Zahl
 * sichert in `result.post.ts` und in `timeout/withdraw` Vorgänge, die ein
 * ERGEBNIS ändern — ein Nichtantreten, eine Aufgabe, eine zurückgenommene
 * Auszeit. Das Bestätigen ändert nichts; es gibt nur wieder frei. Mit Code
 * stünde die Partie still, bis jemand mit Code an den Tisch kommt, und das
 * ist für eine Kenntnisnahme der falsche Preis.
 *
 * Was den Griff schützt, ist nicht dieser Weg, sondern die Geste davor: er
 * liegt im Schiedsrichtermenü, und das öffnet sich nur durch zwei Sekunden
 * Druck auf den Rahmen. Das ist Verschleierung und keine Sicherheit — ein
 * Spieler, der drei Tage zusieht, kennt sie bald. Sie leistet genau das,
 * was sie leisten soll: die Bestätigung passiert nicht beiläufig und nicht
 * aus Versehen. Und darum geht es: vor der Tafel stehen die SPIELER, und
 * die Shot-Clock ist eine Anordnung gegen einen von ihnen.
 */
export default defineEventHandler(async (event) => {
  const id = parseId(getRouterParam(event, 'id'), 'Partiekennung')

  return await toAdmin<{ acknowledgedAt: string }>(
    event, `/matches/${id}/shot-clock/acknowledge`, { method: 'POST' })
})
