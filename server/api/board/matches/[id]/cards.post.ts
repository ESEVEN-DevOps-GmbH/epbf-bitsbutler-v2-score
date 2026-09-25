/**
 * Eine Verwarnung am Tisch — § 9.1 der Sportordnung.
 *
 * DREI FARBEN UND NICHT VIER
 *
 * Grün, Gelb und Rot gibt der Schiedsrichter. Schwarz nicht: die Fußnote des
 * § 9.1 behält sie dem Turnierleiter und dem Sportdirektor vor, und diese
 * Route weist sie deshalb schon hier ab — mit derselben Begründung, aus der
 * `result.post.ts` die Disqualifikation nicht durchlässt.
 *
 * Das ist die DRITTE von drei Stellen, und keine davon ist überflüssig:
 * `Schirimenue.vue` bietet bei SCHWARZ gar keinen Knopf an, diese Liste
 * weist die Farbe ab, und `competition.issue_card` fragt am Ende selbst nach
 * `disqualification/X`. Die erste Stelle ist Höflichkeit, die zweite spart
 * einen Weg zur Verwaltung, und nur die dritte ist die Sicherung — eine
 * Oberfläche und eine Route sind Behauptungen eines Geräts, das im Saal
 * steht.
 *
 * WARUM DER PERSONENCODE HIER PFLICHT IST UND BEIM ZÄHLEN NICHT
 *
 * Eine Karte trägt den Namen dessen, der sie gegeben hat. "Tisch 7" ist kein
 * Name. Ein angemeldeter Mensch schickt keinen Code (er hat sich schon
 * ausgewiesen); ein Gerät ohne Code bekommt aus der Verwaltung
 * BOARD_PIN_REQUIRED zurück, und das Menü fragt dann nach den sechs Ziffern.
 */
const FARBEN = ['GREEN', 'YELLOW', 'RED']

export default defineEventHandler(async (event) => {
  const id = parseId(getRouterParam(event, 'id'), 'Partiekennung')
  const body = await readBody<{
    playerId?: string, card?: string, reasonCode?: string, note?: string, boardPin?: string
  }>(event)

  const spieler = String(body?.playerId ?? '').trim()
  if (!/^[0-9a-f-]{36}$/i.test(spieler)) {
    throw createError({ statusCode: 400, statusMessage: 'Keine Spielerkennung' })
  }

  const farbe = String(body?.card ?? '').trim().toUpperCase()
  if (!FARBEN.includes(farbe)) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Rejected',
      data: {
        error: 'CARD_NEEDS_DISQUALIFICATION_RIGHT',
        detail: 'A black card is given by the tournament leader or the sports director.',
        params: {},
      },
    })
  }

  const code = String(body?.boardPin ?? '').trim()
  if (code !== '' && !/^[0-9]{6}$/.test(code)) {
    // Sechs Ziffern sind sechs Ziffern. Ein Versuch, der schon an der Form
    // scheitert, soll die Bremse des Geräts nicht mit hochzählen.
    throw createError({
      statusCode: 400,
      statusMessage: 'Rejected',
      data: { error: 'BOARD_PIN_REJECTED', detail: 'A personal code is six digits.', params: {} },
    })
  }

  const anlass = String(body?.reasonCode ?? '').trim()
  const notiz = String(body?.note ?? '').trim()

  return await anDieVerwaltung(event, `/matches/${id}/cards`, {
    method: 'POST',
    body: {
      playerId: spieler,
      card: farbe,
      ...(anlass === '' ? {} : { reasonCode: anlass.slice(0, 64) }),
      ...(notiz === '' ? {} : { note: notiz.slice(0, 500) }),
      ...(code === '' ? {} : { boardPin: code }),
    },
  })
})
