/**
 * Wer anstößt — die erste Eingabe jeder Partie.
 *
 * Im Vorgängersystem ist das ein eigener Bildschirm ("Which player begins
 * breaking? Press 1 = Left, 3 = Right"), der die Tafel blockiert, bis jemand
 * geantwortet hat. Der Grund dafür steht in der Anwendung: ohne
 * `first_break` weist der Zwischenstand mit BREAK_UNDECIDED ab. Ohne
 * Anstoß fängt nichts an.
 *
 * ZWEI FELDER UND NICHT EINES
 *
 * `firstBreak` ist die Vorbedingung der Partie und wird einmal gesetzt;
 * `nextBreak` ist, wer den nächsten Satz beginnt, und wandert danach nach
 * der Regel des Turniers (competition.break_after). Die Tafel schickt beim
 * ersten Mal beide gleich — wer beginnt, stößt auch den ersten Satz an —
 * und danach nur noch `nextBreak`, wenn am Tisch etwas anderes passiert ist
 * als die Regel vorsieht.
 */
export default defineEventHandler(async (event) => {
  const id = parseId(getRouterParam(event, 'id'), 'Partiekennung')
  const body = await readBody<{ firstBreak?: string | null, nextBreak?: string | null }>(event)

  const side = (value: unknown): string | null => {
    const s = String(value ?? '').trim().toUpperCase()
    return s === 'A' || s === 'B' ? s : null
  }

  const firstSide = side(body?.firstBreak)
  const nextSide = side(body?.nextBreak)
  if (!firstSide && !nextSide) {
    throw createError({ statusCode: 400, statusMessage: 'Keine Seite' })
  }

  return await toAdmin(event, `/matches/${id}/break`, {
    method: 'PUT',
    body: { firstBreak: firstSide, nextBreak: nextSide },
  })
})
