/**
 * Der Stand, den jemand am Tisch eingetippt hat.
 *
 * WARUM DER ABSOLUTE STAND UND KEIN "+1"
 *
 * Die Verwaltung nimmt {scoreA, scoreB} und nicht eine Veränderung. Das ist
 * die richtige Form, auch wenn am Gerät eine Taste "+1" gedrückt wurde: das
 * Turnierbüro schreibt an derselben Partie, und zwei Geräte, die "+1" rufen,
 * ergeben zusammen +2, obwohl nur ein Satz gespielt wurde. Ein absoluter
 * Stand kann sich höchstens gegenseitig überschreiben — und was zuletzt am
 * Tisch stand, ist die richtige Antwort, denn dort wird gespielt.
 *
 * Das Vorgängersystem machte es andersherum (POST updateScore mit
 * scoreChange). Es hatte auch nur ein Gerät je Tisch.
 *
 * Die Regeln bleiben drüben: dass eine beendete Partie keinen Zwischenstand
 * mehr annimmt (MATCH_FINISHED_NO_SCORE) und dass ohne Anstoß nichts gezählt
 * wird (BREAK_UNDECIDED), entscheidet die Anwendung. Hier wird nur geprüft,
 * dass überhaupt zwei Zahlen ankommen — alles aus dem Netz ist eine
 * Behauptung.
 */
export default defineEventHandler(async (event) => {
  const id = parseId(getRouterParam(event, 'id'), 'Partiekennung')
  const body = await readBody<{
    scoreA?: number, scoreB?: number, undo?: boolean
    ballsOnTable?: number, foulsA?: number, foulsB?: number, atTable?: string
    foul?: string
    runA?: number, highA?: number, runB?: number, highB?: number
  }>(event)

  const a = Number(body?.scoreA)
  const b = Number(body?.scoreB)
  /*
   * Die Obergrenze ist grosszügig und nicht `raceTo`: im Straight Pool geht
   * eine Partie auf 125 Punkte, und wo die Grenze wirklich liegt, weiß
   * diese Route nicht. Sie hält nur Unsinn ab, der aus einem kaputten
   * Aufruf käme — vierstellige Stände gibt es nicht.
   *
   * NACH UNTEN BIS −999, UND DAS IST KEINE LOCKERUNG, SONDERN EINE
   * BERICHTIGUNG. Hier stand `a < 0`, mit der Begründung „negative Stände
   * gibt es nicht". Im 14.1 endlos gibt es sie sehr wohl: WPA 7.7 sagt es
   * ausdrücklich („Scores may be negative due to penalties from fouls"), ein
   * Standardfoul kostet einen Punkt, das dritte hintereinander sechzehn —
   * wer auf 3 steht und dreimal foult, steht auf −13. Die Spalte
   * `competition.match_slot.score` lässt das seit jeher zu
   * (CHECK score >= −999); diese Route war die einzige Stelle, die es
   * verhinderte, und zwar für alle Disziplinen.
   *
   * Dieselbe Zahl wie in der Prüfbedingung der Spalte und nicht eine
   * ähnliche: zwei Grenzen für dieselbe Sache laufen auseinander.
   */
  if (!Number.isInteger(a) || !Number.isInteger(b)
    || a < -999 || b < -999 || a > 999 || b > 999) {
    throw createError({ statusCode: 400, statusMessage: 'Kein Stand' })
  }

  /*
   * DIE LAGE BEI 14.1 ENDLOS — FREIWILLIG, UND FEHLEN HEISST „UNVERÄNDERT".
   *
   * Eine Satztafel schickt die vier Felder nicht mit, und dann wird an ihnen
   * auch nichts geändert. Das ist der Unterschied zu einer 0, die bei den
   * Restkugeln „der Tisch ist leer" bedeutet (WPA 7.8 a) — deshalb wird hier
   * auf „ist es überhaupt eine Zahl" geprüft und nicht auf „ist sie wahr".
   *
   * Die Grenzen sind dieselben wie in der Datenbank: 0 bis 15 Kugeln, 0 bis 2
   * Fouls hintereinander (das dritte setzt den Zähler zurück, siehe WPA
   * 7.11). Was daneben liegt, kommt aus einem kaputten Aufruf und wird
   * weggelassen statt abgewiesen — der STAND soll deshalb nicht verloren
   * gehen; er ist die Angabe, auf die es am Tisch ankommt.
   */
  function intInRange(raw: unknown, min: number, max: number): number | undefined {
    const n = Number(raw)
    if (raw === undefined || raw === null || !Number.isInteger(n)) return undefined
    return n >= min && n <= max ? n : undefined
  }

  const ballsOnTable = intInRange(body?.ballsOnTable, 0, 15)
  const foulsA = intInRange(body?.foulsA, 0, 2)
  const foulsB = intInRange(body?.foulsB, 0, 2)
  const atTable = body?.atTable === 'A' || body?.atTable === 'B' ? body.atTable : undefined

  /*
   * DIE AUFNAHME JE SEITE — laufend und höchste (WPA 7.4).
   *
   * Die Obergrenze ist die des Standes und nicht 15: eine Aufnahme läuft
   * über den Rack-Wechsel hinweg weiter, und genau daher kommen im Straight
   * Pool die Läufe über hundert Punkte. Der Weltrekord liegt bei 714 — 999
   * hält also Unsinn ab und keine Aufnahme auf.
   *
   * PAARWEISE ODER GAR NICHT. `competition.match_slot_runs` verlangt, dass
   * die höchste nie kleiner ist als die laufende; käme nur eine der beiden
   * durch, liefe der Aufruf gegen die Prüfbedingung und der STAND ginge mit
   * verloren. Deshalb fällt hier lieber das Paar weg — dieselbe Abwägung wie
   * bei den Restkugeln eine Handbreit darüber.
   */
  const runA = intInRange(body?.runA, 0, 999)
  const highA = intInRange(body?.highA, 0, 999)
  const runB = intInRange(body?.runB, 0, 999)
  const highB = intInRange(body?.highB, 0, 999)
  const hasRunA = runA !== undefined && highA !== undefined && highA >= runA
  const hasRunB = runB !== undefined && highB !== undefined && highB >= runB

  /*
   * WELCHES FOUL — und nur diese drei Wörter.
   *
   * Es ist keine Angabe über den Stand, sondern über den Vorgang, genau wie
   * `undo` darunter: ohne sie sieht die Anwendung nur eine gefallene Zahl,
   * und das Foul stünde im Verlauf als „Score corrected" — bei einem
   * Einspruch die falsche Auskunft. Was hier nicht wörtlich passt, wird
   * weggelassen; alles aus dem Netz ist eine Behauptung.
   */
  const foul = body?.foul === 'STANDARD' || body?.foul === 'BREAK' || body?.foul === 'THIRD'
    ? body.foul
    : undefined

  /*
   * DIE ABSICHT REIST MIT, UND ZWAR NUR ALS JA.
   *
   * Sie sagt nichts über den Stand, sondern über die Bedienung: am Gerät
   * wurde zurückgenommen ("Undo" oder das Minus je Seite) und nicht von
   * aussen richtiggestellt. Ohne sie sieht die Anwendung nur, dass eine Zahl
   * kleiner wurde, und beide Fälle stünden gleich im Verlauf.
   *
   * `=== true` und nicht `Boolean(...)`: alles aus dem Netz ist eine
   * Behauptung, und "yes", 1 oder ein leeres Objekt sind keine. Was hier
   * nicht ausdrücklich `true` ist, ist eine Korrektur — die alte Auslegung,
   * und damit die sichere.
   */
  return await toAdmin(event, `/matches/${id}/score`, {
    method: 'PUT',
    body: {
      scoreA: a, scoreB: b, undo: body?.undo === true,
      ...(ballsOnTable === undefined ? {} : { ballsOnTable }),
      ...(foulsA === undefined ? {} : { foulsA }),
      ...(foulsB === undefined ? {} : { foulsB }),
      ...(atTable === undefined ? {} : { atTable }),
      ...(foul === undefined ? {} : { foul }),
      ...(hasRunA ? { runA, highA } : {}),
      ...(hasRunB ? { runB, highB } : {}),
    },
  })
})
