import type { H3Event } from 'h3'

/**
 * Ein Schreibvorgang der Verwaltung, von dieser Seite aus durchgereicht.
 *
 * WARUM ES DIE DURCHREICHE ÜBERHAUPT GIBT
 *
 * Die Anzeigetafel läuft auf epbf.com, die Verwaltungsschnittstelle steht
 * unter einem anderen Namen. Ein Sitzungskeks von dort wäre im Browser des
 * Tablets ein Fremdkeks und würde stillschweigend verworfen — genau der
 * Grund, aus dem es `server/api/session.post.ts` schon gibt. Diese Funktion
 * ist deren Gegenstück für alles, was die Tafel schreibt: der Keks liegt auf
 * der Domäne der Verbandsseite, und von hier geht er als gewöhnlicher
 * Kopf weiter.
 *
 * DER MANDANT KOMMT NICHT VON HIER
 *
 * `X-BB-Site` setzt nur die öffentliche Leseschnittstelle (PublicSiteFilter).
 * Die Verwaltung liest den Mandanten aus der Sitzungszeile selbst
 * (SessionFilter) — wer das hier als Kopf mitschickte, hat den Mandanten
 * damit nicht gewählt, sondern nur eine Erwartung geäußert. Deshalb steht
 * hier ausschliesslich der Keks.
 *
 * ZWEI KEKSE, UND BEIDE GEHEN MIT
 *
 * Seit dem 15.09.2026 gibt es neben der Anmeldung die Freigabe per Code:
 * `bb_board` schaltet EIN Gerät für EINEN Tisch frei, ohne Konto und ohne
 * Rolle. Beide Kekse werden hier durchgereicht, und zwar immer beide, wenn
 * beide da sind — welcher gilt, entscheidet nicht diese Datei, sondern der
 * Server: `SessionFilter` läuft zuerst, `BoardGrantFilter` fragt nur, wenn
 * dort niemand gesetzt wurde. Liegen beide an, GEWINNT DER MENSCH.
 *
 * Hier zu entscheiden wäre die zweite Stelle mit derselben Regel, und die
 * zweite ist die, die beim nächsten Umbau abweicht.
 *
 * Verlangt wird deshalb nur noch, dass ÜBERHAUPT einer da ist. Ein Tablet
 * in der Halle hat den einen, der Rechner der Turnierleitung den anderen,
 * und ein Bildschirm, der nur anzeigt, keinen von beiden — der bekommt
 * weiterhin 401 und zeigt keine Bedienflächen.
 *
 * ABWEISUNGEN WERDEN NICHT GEGLÄTTET
 *
 * Ein 403 der Wache ("du darfst hier nicht zählen") und ein 422 der Regel
 * ("die Partie ist zu Ende") sind zwei verschiedene Auskünfte, und die Tafel
 * muss sie unterscheiden können. Beide kommen mitsamt Schlüssel
 * (`{error, detail, params}`) durch. Nur ein fehlender Keks wird hier
 * beantwortet und nicht erst dort: ohne Anmeldung gibt es nichts zu fragen.
 */
export async function anDieVerwaltung<T>(
  event: H3Event,
  pfad: string,
  // DELETE steht seit der Selbstverwaltung des Profils mit dabei (einen
  // Sponsor entfernen, einen Antrag zuruecknehmen). Es ist ein
  // Schreibvorgang wie die beiden anderen und gehoert deshalb hierher und
  // nicht zu `vonDerVerwaltung` -- der Unterschied, den diese Trennung
  // sichtbar macht, ist "aendert etwas" und nicht "schickt einen Rumpf".
  optionen: { method: 'POST' | 'PUT' | 'DELETE', body?: unknown } = { method: 'POST' },
): Promise<T> {
  const kekse = weiterzureichendeKekse(event)
  if (!kekse) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Not signed in',
      data: { error: 'NOT_SIGNED_IN', detail: 'This screen is not signed in.', params: {} },
    })
  }

  const basis = String(process.env.BB_API ?? '')
  if (!basis) {
    throw createError({ statusCode: 503, statusMessage: 'Scoring not reachable' })
  }

  /*
   * WAS PASSIERT, WENN DIE ANWENDUNG GAR NICHT ANTWORTET
   *
   * `ignoreResponseError` deckt nur Antworten mit einem Statuscode ab. Ein
   * abgerissenes Netz, eine Anwendung, die gerade neu startet, eine
   * Zeitüberschreitung — das wirft, und ohne diesen Fang stünde am Tisch
   * "Rejected" mit einem Stapel darunter. Der Zählende soll aber nicht
   * lesen, dass etwas abgelehnt wurde: abgelehnt hat niemand, es ist nur
   * nichts angekommen. Genau dieser Unterschied entscheidet, ob er noch
   * einmal tippt oder jemanden holt.
   */
  const antwort = await $fetch.raw<T>(`${basis}/api/admin/v1${pfad}`, {
    method: optionen.method,
    body: optionen.body as Record<string, unknown> | undefined,
    headers: {
      cookie: kekse,
      // Wer geschrieben hat, steht in audit und in identity.login_attempt.
      // Ohne diesen Kopf stünde dort die Adresse dieses Servers — siehe
      // server/utils/herkunft.ts.
      ...(herkunftskette(event) ? { 'x-forwarded-for': herkunftskette(event)! } : {}),
      // Und womit. Ohne ihn stünde in identity.board_grant.user_agent die
      // Kennung dieses Servers, und die Turnierleitung suchte in der Maske
      // einen Schirm, der überall gleich heisst.
      ...(getHeader(event, 'user-agent')
        ? { 'user-agent': getHeader(event, 'user-agent')! }
        : {}),
    },
    /*
     * Zehn Sekunden und nicht die Vorgabe: am Tisch wartet jemand mit
     * Kreide an den Fingern vor dem Gerät. Eine Eingabe, die eine halbe
     * Minute hängt, ist für ihn dasselbe wie eine, die nicht ankam — nur
     * dass er in der Zeit noch dreimal tippt.
     */
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

  if (antwort.status >= 400) {
    throw createError({
      statusCode: antwort.status,
      statusMessage: 'Rejected',
      data: antwort._data,
    })
  }

  return antwort._data as T
}

/**
 * Eine Lesefrage an die Verwaltung — dieselbe Durchreiche, nur ohne Wirkung.
 *
 * Getrennt von {@link anDieVerwaltung}, damit an der Aufrufstelle zu sehen
 * ist, ob etwas geschrieben wird. Eine Funktion mit einem Merkmal `method`
 * verwischt genau den Unterschied, auf den es hier ankommt.
 */
export async function vonDerVerwaltung<T>(event: H3Event, pfad: string): Promise<T | null> {
  const kekse = weiterzureichendeKekse(event)
  const basis = String(process.env.BB_API ?? '')
  if (!kekse || !basis) return null

  const antwort = await $fetch<T>(`${basis}/api/admin/v1${pfad}`, {
    headers: { cookie: kekse },
    timeout: 10_000,
  }).catch(() => null)
  // Die Zusicherung ist hier und nicht beim Aufrufer: `$fetch` verspricht
  // ohne Schema alles Mögliche zurück, und die Form, die wirklich kommt,
  // kennt der Endpunkt, der sie anfordert.
  return (antwort ?? null) as T | null
}

/**
 * Die Kekse, die weitergehen — als fertige `Cookie`-Zeile.
 *
 * `null`, wenn gar keiner da ist: dann gibt es nichts zu fragen, und der
 * Aufrufer soll das unterscheiden können von "gefragt und abgewiesen".
 *
 * Beide Namen stehen hier und nicht am Aufrufer, weil sonst jeder Endpunkt
 * sich merken müsste, dass es inzwischen zwei sind — und der nächste neue
 * merkt es sich nicht.
 */
export function weiterzureichendeKekse(event: H3Event): string | null {
  const teile: string[] = []
  const sitzung = getCookie(event, 'bb_session')
  const tafel = getCookie(event, 'bb_board')
  if (sitzung) teile.push(`bb_session=${sitzung}`)
  if (tafel) teile.push(`bb_board=${tafel}`)
  return teile.length > 0 ? teile.join('; ') : null
}

/** Hält dieses Gerät eine Freigabe? Für Endpunkte, die die Fälle trennen. */
export function haeltFreigabe(event: H3Event): boolean {
  return !!getCookie(event, 'bb_board')
}

/** Ist jemand angemeldet? Der Mensch gewinnt, und manchmal muss man das wissen. */
export function istAngemeldet(event: H3Event): boolean {
  return !!getCookie(event, 'bb_session')
}
