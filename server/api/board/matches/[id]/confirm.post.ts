/**
 * Die Distanz ist erreicht — die Spieler bestätigen es selbst.
 *
 * OHNE RUMPF, UND DAS IST DIE GANZE ABSICHERUNG.
 *
 * Bis zum 15.09.2026 lief das Ende einer Partie über `result.post.ts`, und
 * das nimmt `winner`, `scoreA` und `scoreB` entgegen. Solange nur die
 * Turnierleitung dort hineinschrieb, war das richtig. Seit die Spieler
 * selbst am Tablet bestätigen dürfen — der Auftraggeber: "die spieler selbst
 * duerfen beim erreichen von race-to das finish bedienen" —, war es eine
 * offene Tür: bei 3:5 schickt einer mit der Browserkonsole ein
 * `{winner:'A',scoreA:9}` und hat gewonnen. Im Protokoll sieht das aus wie
 * der ehrliche Weg, denn es IST derselbe Weg.
 *
 * Hier wird nichts gelesen. `readBody` steht nicht in dieser Datei, und das
 * ist kein Versehen, das jemand "vervollständigen" sollte:
 * `competition.confirm_match_result` liest den Stand aus
 * `competition.match_slot`, hält ihn gegen `race_to` und leitet den Sieger
 * selbst ab. Was nicht gelesen wird, lässt sich nicht fälschen.
 *
 * Kein Personencode. Die Spieler bestätigen damit nur, was ohnehin auf der
 * Tafel steht — und dorthin ist es Ball für Ball gezählt worden. Das
 * Abnehmen der Partie ist davon getrennt: automatisch, wenn das Turnier es
 * so hat, sonst durch die Turnierleitung.
 */
export default defineEventHandler(async (event) => {
  const id = parseId(getRouterParam(event, 'id'), 'Partiekennung')

  return await anDieVerwaltung<{ advanced: number, newlySettled: number }>(
    event, `/matches/${id}/confirm`, { method: 'POST' })
})
