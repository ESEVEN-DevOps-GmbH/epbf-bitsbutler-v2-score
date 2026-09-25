/**
 * Sechs Ziffern, und dieser Bildschirm zählt.
 *
 * Der Auftraggeber: "wenn ich das scoreboard als eingabe geraet nutzen will
 * [muss ich mich anmelden] ... find ich ehrlich gesagt doof.. da waere ich
 * eher dafuer das man einen 4-stelligen code pro event in der
 * 'Anzeigentafel' maske wo man auch die links kopieren kann einbaut.. mit
 * dem man dann die scoreboard freigeben kann".
 *
 * WARUM DIESE ROUTE NICHT ÜBER `toAdmin` GEHT
 *
 * Jene verlangt einen Keks. Hier entsteht der Keks gerade erst — das ist
 * der ganze Vorgang. Und der Keks, den die Verwaltung setzt, gehört ihrer
 * Domäne; im Browser des Tablets wäre er ein Fremdkeks und würde
 * stillschweigend verworfen. Deshalb liest diese Route das `Set-Cookie` der
 * Antwort und setzt es auf der Domäne der Verbandsseite neu — genau wie
 * `server/api/session.post.ts` es für die Anmeldung tut.
 *
 * DER AUSGANG KOMMT ALS WORT ZURÜCK
 *
 * `WRONG_CODE`, `LOCKED`, `OUT_OF_WINDOW`, `UNKNOWN_TABLE` und seit dem
 * 25.09.2026 `TOO_MANY_DEVICES` (der Deckel auf gleichzeitig aktive
 * Geräte dieser Veranstaltung ist erreicht, der Code war dabei richtig) —
 * fünf verschiedene Auskünfte für jemanden, der am Einrichtungsschirm
 * steht und etwas tun soll. Ein einziges "geht nicht" schickte ihn zur
 * Turnierleitung, wo er bei einem Tippfehler nichts zu suchen hat.
 */
export default defineEventHandler(async (event) => {
  const body = await readBody<{
    eventId?: string, code?: string, tableNumber?: number, label?: string
  }>(event)

  const eventId = parseId(body?.eventId, 'Veranstaltungskennung')

  const code = String(body?.code ?? '').trim()
  if (!/^[0-9]{6}$/.test(code)) {
    // Hier und nicht erst dort: sechs Ziffern sind sechs Ziffern, und ein
    // Versuch, der schon an der Form scheitert, soll die Bremse der
    // Veranstaltung nicht mit hochzählen.
    throw createError({
      statusCode: 400,
      statusMessage: 'Rejected',
      data: { error: 'WRONG_CODE', detail: 'A board code is six digits.', params: {} },
    })
  }

  const tableNumber = body?.tableNumber
  if (tableNumber !== undefined && tableNumber !== null
      && (!Number.isInteger(tableNumber) || tableNumber < 1 || tableNumber > 999)) {
    throw createError({ statusCode: 400, statusMessage: 'Keine Tischnummer' })
  }

  const base = String(process.env.BB_API ?? '')
  if (!base) {
    throw createError({ statusCode: 503, statusMessage: 'Scoring not reachable' })
  }

  const response = await $fetch.raw<{ outcome: string, tableNumber: number | null }>(
    `${base}/api/admin/v1/board/grant`, {
      method: 'POST',
      body: {
        eventId,
        code,
        tableNumber: tableNumber ?? null,
        label: String(body?.label ?? '').slice(0, 120) || null,
      },
      headers: {
        // Die Herkunft und die Browserkennung gehen mit: aus ihnen baut die
        // Maske der Turnierleitung "Tisch 7, iPad, 10.0.3.12", und daran
        // erkennt sie einen Schirm im Saal wieder, den sie zurücknehmen
        // will. Ohne sie stünde dort überall dieser Server.
        ...(originChain(event) ? { 'x-forwarded-for': originChain(event)! } : {}),
        ...(getHeader(event, 'user-agent')
          ? { 'user-agent': getHeader(event, 'user-agent')! }
          : {}),
      },
      timeout: 10_000,
      ignoreResponseError: true,
    }).catch(() => {
    throw createError({
      statusCode: 503,
      statusMessage: 'Scoring not reachable',
      data: {
        error: 'SCORING_UNREACHABLE',
        detail: 'The scoring service did not answer. Nothing was changed.',
        params: {},
      },
    })
  })

  if (response.status >= 400) {
    const outcome = response._data?.outcome ?? 'WRONG_CODE'
    throw createError({
      statusCode: response.status,
      statusMessage: 'Rejected',
      data: {
        error: outcome,
        // TOO_MANY_DEVICES bekommt seit dem 25.09.2026 einen eigenen Satz:
        // "das war nicht akzeptiert" ist hier die falsche Auskunft — der
        // Code war richtig, nur der Deckel auf gleichzeitig aktive Geraete
        // dieser Veranstaltung ist erreicht (identity.redeem_board_code).
        // Wer das liest, soll zur Turnierleitung gehen und dort ungenutzte
        // Freigaben zuruecknehmen, nicht die Ziffern noch einmal abtippen.
        detail: outcome === 'TOO_MANY_DEVICES'
          ? 'Too many screens are released for this event. Ask the tournament desk to '
            + 'revoke unused ones.'
          : 'That code was not accepted.',
        params: {},
      },
    })
  }

  /*
   * Den Keks der Verwaltung auf die eigene Domäne umsetzen.
   *
   * Die Lebensdauer kommt aus der Freigabe selbst (zwei Tage vor bis einen
   * Tag nach der Veranstaltung) und steht im `Max-Age` der Antwort. Sie
   * hier noch einmal zu erfinden hiesse, zwei Fristen zu haben, von denen
   * die kürzere gewinnt und niemand weiss, welche das gerade ist.
   */
  const setCookieHeader = response.headers.get('set-cookie') ?? ''
  const value = /bb_board=([^;]*)/.exec(setCookieHeader)?.[1] ?? ''
  const maxAgeSeconds = Number(/Max-Age=(\d+)/i.exec(setCookieHeader)?.[1] ?? 0)

  if (!value) {
    throw createError({ statusCode: 502, statusMessage: 'No grant returned' })
  }

  setCookie(event, 'bb_board', value, {
    httpOnly: true,
    sameSite: 'lax',
    // Wortgleich zu server/api/session.post.ts: derselbe Keks auf derselben
    // Domaene, und zwei verschiedene Arten, "laeuft das ueber TLS" zu
    // fragen, waeren die Stelle, an der die beiden irgendwann
    // auseinanderlaufen.
    secure: getRequestURL(event).protocol === 'https:',
    path: '/',
    maxAge: maxAgeSeconds > 0 ? maxAgeSeconds : 60 * 60 * 24,
  })

  return {
    outcome: response._data?.outcome ?? 'SUCCESS',
    tableNumber: response._data?.tableNumber ?? null,
  }
})
