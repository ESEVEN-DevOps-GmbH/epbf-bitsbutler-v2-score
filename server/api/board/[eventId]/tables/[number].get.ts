/**
 * Was zum ZÄHLEN an einem Tisch nötig ist und in der öffentlichen
 * Tafelantwort nicht steht.
 *
 * DREI FELDER, DIE ÖFFENTLICH FEHLEN — UND WARUM SIE HIER STEHEN
 *
 *   `firstBreak`   Wer die Partie angestoßen hat. `competition.set_break`
 *                  schreibt IMMER beide Felder; wer nur den nächsten Anstoß
 *                  ändern will und `firstBreak` nicht kennt, löscht ihn —
 *                  und damit die Vorbedingung, ohne die der Zwischenstand
 *                  mit BREAK_UNDECIDED abgewiesen wird. Ein Gerät, das
 *                  mitten in einer Partie an den Tisch kommt, kann diesen
 *                  Wert nicht erraten.
 *   `breakRule`    Ob der Anstoß von selbst wandert. Bei 1 635 von 1 638
 *                  Turnieren ist er nicht gesetzt; `competition.break_after`
 *                  gibt dann NULL zurück und `next_break` bleibt stehen, wo
 *                  es war. Die Tafel muss das wissen, sonst verspricht sie
 *                  einen Wechsel, den niemand vornimmt.
 *   `uniformOpen`  Wessen Trikotkontrolle noch offen ist, je Seite. Seit
 *                  dem 14.09.2026 — siehe unten, das ist die Angabe, die
 *                  nicht öffentlich wird.
 *
 * WARUM EINE ZWEITE ABFRAGE UND NICHT DIE ERSTE ERWEITERT
 *
 * Die öffentliche Tafelantwort geht an jeden Bildschirm im Saal, alle zehn
 * Sekunden, ohne Anmeldung. Diese hier geht nur an ein Gerät, das zählt.
 * Ohne Anmeldung ist sie leer — und die Tafel sieht dann aus wie immer.
 *
 * ZWEI WEGE ZU DENSELBEN FELDERN, SEIT DEM 15.09.2026
 *
 * Wer ANGEMELDET ist, kommt wie bisher über `/events/{id}/live` — das hängt
 * an `match/R` an dieser Veranstaltung und liefert alle Tische.
 *
 * Wer eine FREIGABE hält (`bb_board`), kommt über `/board/grant/live`. Ein
 * Gerät trägt kein Recht, sondern eine Freigabe; `match/R` könnte es nie
 * bestehen, und `identity.may` sagt ohne Urheberkennung immer nein. Diese
 * Antwort liefert deshalb genau EINE Zeile: die des Tisches, für den die
 * Freigabe gilt.
 *
 * Liegen beide an, gewinnt der Mensch — dieselbe Regel wie überall sonst.
 * Sie steht hier in der REIHENFOLGE und nicht mehr in einem `else`: gefragt
 * wird zuerst er, und erst wenn sein Weg nichts bringt, trägt die Freigabe
 * die Auskunft. Bis zum 16.09.2026 stand dort ein `else`, und damit hiess
 * „der Mensch gewinnt" in Wahrheit „der Mensch gewinnt, auch wenn er nichts
 * kann" — ein Konto ohne Recht an dieser Veranstaltung machte das Tablet
 * stumm, obwohl der sechsstellige Code richtig eingegeben war.
 *
 * UND GENAU DESHALB STEHT DIE TRIKOTKONTROLLE HIER UND NICHT DORT
 *
 * "Die Trikotkontrolle ist für Lechner noch offen" ist eine Auskunft über
 * einen Menschen und über sein Verhalten, nicht über den Stand einer Partie.
 * Auf der öffentlichen Tafelantwort (`/api/events/{id}/tables/{n}`, ohne
 * Anmeldung, 200) stünde sie in jedem Saal auf zwanzig Bildschirmen und
 * käme mit einem schlichten curl aus jedem Netz heraus — ein Pranger für
 * ein falsches Hemd. Angehen tut sie den, der am Tisch steht und die
 * Kontrolle abnimmt.
 *
 * Diese Abfrage hängt an `match/R` an DIESER Veranstaltung, und das ist
 * genau der Kreis: Schiedsrichter, Turnierleitung, Veranstalter. Die
 * öffentliche Tafel bleibt, was sie ist — der Stand.
 *
 * SEIT DEM 15.09.2026 ENTSCHEIDET DARÜBER DER SERVER UND NICHT DAS GERÄT
 *
 * Vorher hing es an `bb.board.count.<eventId>` in localStorage: ein Merker,
 * den jeder umlegen kann, der an den Bildschirm kommt. Wer am 75-Zoll-Schirm
 * im Saal vorbeikam und den Schalter drückte, machte daraus ein
 * "Eingabegerät" — und dann stand "Lechner — uniform control open" vor dem
 * Publikum. Der Merker ist weg. Eingabegerät ist ein Gerät jetzt genau dann,
 * wenn es eine gültige Freigabe für DIESE Veranstaltung und DIESEN Tisch
 * hält, oder wenn jemand angemeldet ist, der die Partie lesen darf. Beides
 * lässt sich am Gerät nicht behaupten.
 *
 * DIE BAU-KENNUNG FÄHRT MIT, SEIT DEM 17.09.2026
 *
 * `buildId` ist die Kennung des Baus, der DIESEN Server ausmacht — dieselbe
 * Zeichenkette, die Nuxt in `/_nuxt/builds/latest.json` unter `id` schreibt.
 * Sie steht hier, damit die Tafel merkt, dass eine neue Fassung ausgerollt
 * wurde, OHNE dafür eine zweite Frage zu stellen: diese Abfrage läuft
 * ohnehin alle zehn Sekunden an jedem Schirm der Halle. Sie kostet keinen
 * Aufruf, keine Datei und keine Rechenzeit — der Server hat seine eigene
 * Kennung in der Laufzeitkonfiguration stehen.
 *
 * SIE STEHT IN BEIDEN ANTWORTEN, auch in der leeren weiter unten. Genau die
 * bekommt der Bildschirm an der Wand, der weder angemeldet ist noch eine
 * Freigabe hält — und genau der ist das Gerät, das von selbst nie neu lädt.
 * Sie in der leeren Antwort zu vergessen hiesse, sie ausgerechnet dort
 * wegzulassen, wofür sie gebaut wurde.
 *
 * KEIN GEHEIMNIS: Sie steht in jeder ausgelieferten Seite im Pfad der
 * Bündel (`/_nuxt/…`) und öffentlich in `latest.json`. Was die Tafel
 * DARAUFHIN tut, entscheidet sie selbst (app/composables/useVersionSwitch.ts).
 *
 * DIE WERTUNGSART STEHT SEIT DEM 17.09.2026 NICHT MEHR HIER
 *
 * Sie kam über `/reference/disciplines` als Zuordnung Kürzel → Wertungsart,
 * und das liegt hinter `system.reference:R` — ein Recht, das ein
 * Schiedsrichter nicht hat. Ein Gerät, das nur über den sechsstelligen
 * Tafelcode freigegeben ist, bekam `null` und zeichnete im Straight Pool
 * die Satzleiste mit 7/9/1/3; seit der Zifferblock daran hängt, auch die
 * falsche Tastenbelegung. Ein zweiter Weg über `/board/grant/live` hat das
 * für freigegebene Geräte aufgefangen und damit zwei Quellen für eine
 * Auskunft geschaffen.
 *
 * Jetzt trägt `competition.public_match` die Angabe an der Partie
 * (`discipline.key`, `discipline.scoringKind`). Sie kommt mit der
 * öffentlichen Tafelantwort, ohne Recht, ohne Zwischenspeicher und ohne
 * zweiten Aufruf — und sie gilt für die Partie, die wirklich am Tisch
 * steht, statt für ein Kürzel, das erst nachgeschlagen werden muss.
 */

/** Was `competition.live_board` je Partie liefert — nur die gelesenen Felder. */
interface LiveRow {
  match_id: string
  table_number: number | null
  status: string
  race_to: number | null
  first_break: string | null
  next_break: string | null
  break_rule: string | null
  timeouts_a: number | null
  timeouts_b: number | null
  timeouts_allowed: number | null
  /** Wie lange EINE Auszeit dauern darf, in Minuten (tournament.timeout_minutes). */
  timeout_minutes: number | null
  score_a: number | null
  score_b: number | null
  tournament_id: string | null
  /** Wer auf dieser Seite die Kontrolle noch nicht bestanden hat. */
  uniform_open_a: string | null
  uniform_open_b: string | null
  /** Seit wann die Shot-Clock angeordnet ist; null heißt: keine. */
  shot_clock_since: string | null
  /** Wann der Schiedsrichter sie zur Kenntnis genommen hat; null: noch nicht. */
  shot_clock_acknowledged_at: string | null
  /** 14.1 endlos: wie viele Objektkugeln noch liegen. Sonst null. */
  balls_on_table: number | null
  /** 14.1 endlos: Standardfouls hintereinander, je Seite. */
  fouls_a: number | null
  fouls_b: number | null
  /** 14.1 endlos: die laufende und die höchste Aufnahme, je Seite. */
  run_a: number | null
  high_a: number | null
  run_b: number | null
  high_b: number | null
}


export default defineEventHandler(async (event) => {
  const eventId = parseId(getRouterParam(event, 'eventId'), 'Veranstaltungskennung')

  const raw = String(getRouterParam(event, 'number') ?? '')
  const tableNumber = Number.parseInt(raw, 10)
  if (!/^[0-9]{1,3}$/.test(raw) || tableNumber < 1) {
    throw createError({ statusCode: 400, statusMessage: 'Keine Tischnummer' })
  }

  /*
   * `null` und kein Fehler, wenn niemand angemeldet ist oder das Recht
   * fehlt: „hier zählt niemand" ist eine Antwort. Eine 403 im Protokoll für
   * jeden Bildschirm im Saal wäre Lärm, und die Tafel soll sich davon nicht
   * beeindrucken lassen — sie zeigt dann eben keine Bedienflächen.
   */
  /*
   * Die Bau-Kennung dieses Servers. `app.buildId` ist eine Angabe der
   * Laufzeitkonfiguration und steht schon im Speicher — kein Dateizugriff,
   * kein Aufruf. Gelesen wird sie hier oben, weil sie in BEIDE Antworten
   * gehört, auch in die leere.
   */
  const buildId = useRuntimeConfig(event).app.buildId

  const signedIn = isSignedIn(event)
  const granted = hasGrant(event)

  let rowRec: LiveRow | null = null

  /*
   * ZWEI WEGE, UND KEIN `else` DAZWISCHEN.
   *
   * Bis zum 16.09.2026 stand hier `if (angemeldet) … else if (freigabe)`.
   * Damit wurde die Freigabe gar nicht mehr angesehen, sobald irgendeine
   * Anmeldung im Browser lag — und taugte die nichts (ein Konto ohne Recht
   * an DIESER Veranstaltung), endete es in der leeren Antwort: keine Bedienflächen,
   * dafür dauerhaft „This account may not score at this event." Der
   * Auftraggeber: „nach eingabe des vierstelligen codes, kann ich weiterhin
   * keine eingaben am tablet machen". Der Code war nicht abgelehnt, er war
   * nicht gelesen.
   *
   * Der Mensch wird weiterhin ZUERST gefragt, und das ist der Punkt: trägt
   * sein Weg, kommt alles über ihn, und im Protokoll steht sein Name und
   * nicht „Anzeigetafel · Tisch 7". Trägt er nicht, übernimmt die Freigabe
   * die AUSKUNFT — der Urheber bleibt trotzdem er (siehe
   * BoardGrantFilter: die Freigabe leiht Ort und Haus, nicht das Etikett).
   */
  const liveRows = signedIn
    ? await fromAdmin<LiveRow[]>(event, `/events/${eventId}/live`)
    : null

  /*
   * „Er darf an dieser Veranstaltung lesen" und „für diesen Tisch steht
   * eine Zeile da" sind zwei verschiedene Auskünfte, und nur die erste
   * taugt für `mayScore`. Ein Schiedsrichter an einem Tisch, auf dem gerade
   * keine Partie liegt, bekommt eine leere Liste zurück — er darf deshalb
   * nicht als „darf hier nicht zählen" dastehen.
   */
  const canReadAsPerson = liveRows !== null
  if (liveRows) rowRec = liveRows.find(z => z.table_number === tableNumber) ?? null

  /*
   * Die Freigabe wird gefragt, sobald eine anliegt — auch dann, wenn der
   * angemeldete Weg schon getragen hat.
   *
   * Sie kostet an einem Tablet, an dem zusätzlich jemand angemeldet ist,
   * einen zweiten Aufruf je Abruf. VERWORFEN, sie zu sparen und nur beim
   * Fehlschlag zu fragen: dann stünde `released` bei der angemeldeten
   * Turnierleitung auf `false`, obwohl das Gerät unter ihr freigeschaltet
   * ist — und genau dieser falsche Wert war der zweite Teil des Befundes.
   * Dieselbe Abwägung und derselbe Preis wie im BoardGrantFilter, der die
   * Freigabe aus demselben Grund immer nachschlägt.
   */
  let viaGrant = false
  /** Was der Server über den Weg sagt, wenn eine Freigabe anliegt. */
  let wayFromServer: string | null = null
  if (granted) {
    const own = await fromAdmin<{
      eventId: string | null, tableNumber: number | null, via: string | null,
      match: LiveRow | null
    }>(event, '/board/grant/live')

    /*
     * DER WEG GILT AUCH DANN, WENN DIE FREIGABE FÜR EINEN ANDEREN TISCH IST.
     *
     * Er ist eine Auskunft über DIESE Anfrage und nicht über die Freigabe:
     * ob der Sitzungskeks getragen hat, hängt nicht daran, neben welchem
     * Tisch das Gerät steht. Deshalb steht er vor der Prüfung darunter und
     * nicht darin.
     */
    if (own) wayFromServer = own.via ?? null

    /*
     * DIE FREIGABE GILT FÜR EINEN TISCH UND FÜR EINE VERANSTALTUNG.
     *
     * Der Server hat schon danach ausgewählt — diese Prüfung ist die
     * zweite, und sie steht hier, weil die Adresse in der Browserzeile
     * etwas anderes behaupten kann als der Keks: wer mit einer Freigabe für
     * Tisch 3 die Adresse von Tisch 7 aufruft, bekommt die Tafel von Tisch
     * 7 zu SEHEN (das darf jeder, sie ist öffentlich) — aber keine
     * Bedienflächen und keine Trikotkontrolle.
     */
    if (own && own.eventId === eventId && own.tableNumber === tableNumber) {
      viaGrant = true
      // Die Zeile des Angemeldeten hat Vorrang: sie ist dieselbe Auskunft
      // aus derselben Sicht, und wer sie bekommen hat, soll sie behalten.
      rowRec = rowRec ?? own.match
    }
  }

  /* ------------------------------------------------------------------------
   * WIE GEHANDELT WIRD — GEFRAGT UND NICHT GERATEN
   *
   * Hier stand `signedIn: isSignedIn(event)`, und das war die Frage, ob
   * im Browser ein Keks namens `bb_session` LIEGT. Ob er noch trägt, sagt
   * sie nicht. Ein toter Keks aus einer Anmeldung von vorgestern liegt
   * genauso da wie ein lebender, und die Tafel hat ihn für einen Menschen
   * gehalten: das Schiedsrichtermenü liess die Codeabfrage aus, der
   * Bediener bestätigte, und der Server antwortete mit BOARD_PIN_REQUIRED —
   * eine Meldung, die er nicht mehr beheben konnte, weil ihn niemand nach
   * dem Code gefragt hatte. Derselbe Irrtum behauptete eine Zeile weiter
   * unten „This account may not score at this event", also etwas über ein
   * KONTO, obwohl an diesem Gerät gar keines mehr anlag.
   *
   * Erschwerend kam dazu, dass `forwardedCookies` beide Kekse
   * gemeinsam schickt: welcher von beiden getragen hat, liesse sich von
   * hier aus mit keiner Angabe der Welt feststellen. Das kann nur der
   * Server sagen, und er sagt es jetzt.
   *
   * DREI QUELLEN, UND ALLE DREI SIND ANTWORTEN DES SERVERS:
   *
   *   1. `via` aus `/board/grant/live` — die genaue Auskunft. Sie steht
   *      immer dann zur Verfügung, wenn eine Freigabe anliegt, und das ist
   *      der gemeldete Fall: das Tablet in der Halle. SESSION oder
   *      BOARD_PIN heisst Mensch, BOARD heisst Gerät.
   *   2. Sonst: hat `/events/{id}/live` getragen, war es ein Mensch. Ohne
   *      Freigabekeks kann diese Antwort nur aus einer Sitzung kommen —
   *      `match/R` besteht ohne Urheberkennung niemand.
   *   3. Sonst, und NUR dann: ein Sitzungskeks liegt da, hat aber nichts
   *      getragen. Jetzt ist zu unterscheiden, ob er tot ist oder ob ein
   *      Mensch anliegt, der hier nichts darf — und genau diese beiden
   *      trennt die Meldung über das Konto. Das kostet einen dritten
   *      Aufruf, und zwar ausschliesslich an dem einen falsch
   *      eingerichteten Gerät: ein Schirm ohne Keks fragt nie, ein zählendes
   *      Gerät kommt über 1 oder 2 heraus.
   *
   * VERWORFEN: immer `/me` zu fragen und die beiden anderen Quellen
   * wegzulassen. Das wäre eine Frage mehr je Gerät und je zehn Sekunden für
   * eine Auskunft, die in der Antwort daneben schon steht.
   * --------------------------------------------------------------------- */
  async function resolveActingAs(): Promise<'PERSON' | 'DEVICE' | null> {
    if (wayFromServer !== null) return wayFromServer === 'BOARD' ? 'DEVICE' : 'PERSON'
    if (canReadAsPerson) return 'PERSON'
    /*
     * Ohne Sitzungskeks ist hier Schluss, und zwar mit `null` und nicht mit
     * 'DEVICE': dass ein Freigabekeks im Browser LIEGT, heisst nichts — wer
     * hier ankommt, hat oben von `/board/grant/live` nichts bekommen, und
     * damit trägt die Freigabe nicht mehr. Ein 'DEVICE' wäre dieselbe
     * Vermutung aus einem Keks, die oben gerade abgeschafft wurde.
     */
    if (!signedIn) return null
    const me = await fromAdmin<{ user: unknown }>(event, '/me')
    return me?.user ? 'PERSON' : null
  }

  const actingAs = await resolveActingAs()

  /*
   * `null` und kein Fehler, wenn niemand angemeldet ist oder das Recht
   * fehlt: „hier zählt niemand" ist eine Antwort. Eine 403 im Protokoll für
   * jeden Bildschirm im Saal wäre Lärm, und die Tafel soll sich davon nicht
   * beeindrucken lassen — sie zeigt dann eben keine Bedienflächen.
   *
   * `actingAs` fährt AUCH hier mit. Es ist der Fall, in dem die Meldung
   * über das Konto entsteht: ein ausgewiesener Mensch, der an dieser
   * Veranstaltung nicht zählen darf.
   */
  if (!canReadAsPerson && !viaGrant) {
    return {
      actingAs,
      released: false,
      mayScore: false,
      match: null,
      buildId,
    }
  }

  return {
    /*
     * WER HIER HANDELT — 'PERSON', 'DEVICE' oder niemand.
     *
     * 'PERSON' heisst: der nächste Schreibvorgang trägt einen Namen, weil
     * eine Sitzung ihn trägt. 'DEVICE' heisst: er käme als
     * `CurrentActor.BOARD` an, und dann verlangen `CardController.ausweisen`
     * und `MatchController.nochAmGeraet` die sechs Ziffern. Genau daran und
     * an nichts anderem hängt die Codeabfrage im Schiedsrichtermenü.
     *
     * Der Wert beschreibt DIESE Anfrage. Er kann zwischen zwei Abrufen
     * umspringen — eine Sitzung läuft mitten im Turnier ab —, und dann
     * erscheint die Codeabfrage beim nächsten Griff ins Menü. Das ist die
     * richtige Reihenfolge: lieber einmal zu viel gefragt als eine
     * Bestätigung, die in eine Abweisung läuft.
     */
    actingAs,
    /*
     * Dieses Gerät hält eine gültige Freigabe für genau diesen Tisch —
     * UNABHÄNGIG davon, ob zusätzlich jemand angemeldet ist.
     *
     * Bis zum 16.09.2026 stand hier `freigabe && !angemeldet`. Das war
     * dieselbe Verwechslung wie beim `else` darüber: ein angemeldeter
     * Mensch an einem freigeschalteten Gerät galt als nicht freigegeben,
     * obwohl das Gerät unter ihm dieselbe Freigabe trägt wie eine Minute
     * vorher. An der Freigabe hängt, was nur dem Gerät am Tisch gezeigt
     * wird — die Trikotkontrolle —, und die fiel damit ausgerechnet aus,
     * sobald die Turnierleitung sich anmeldete.
     *
     * Der blosse Keks genügt dafür nicht: dass die Freigabe WIRKLICH für
     * diesen Tisch und diese Veranstaltung gilt, weiss nur die Antwort von
     * `/board/grant/live`. Deshalb `ueberFreigabe` und nicht `freigabe`.
     */
    released: viaGrant,
    /*
     * Einer der beiden Wege hat getragen — `match/R` an dieser
     * Veranstaltung oder eine gültige Freigabe für genau diesen Tisch. Ob
     * auch `match/U` besteht, sagt erst der Schreibversuch: die Verwaltung
     * hat keine Frage danach, die ein Schiedsrichter stellen dürfte
     * (`users/{id}/may` verlangt `user:R`). Die Tafel zeigt die Flächen
     * deshalb und lässt sich notfalls abweisen; eine Abweisung ist eine
     * ehrlichere Auskunft als ein Knopf, der fehlt.
     */
    mayScore: true,
    match: rowRec === null
      ? null
      : {
          id: rowRec.match_id,
          status: rowRec.status,
          raceTo: rowRec.race_to,
          firstBreak: rowRec.first_break,
          nextBreak: rowRec.next_break,
          breakRule: rowRec.break_rule,
          timeoutsTaken: { A: rowRec.timeouts_a ?? 0, B: rowRec.timeouts_b ?? 0 },
          /*
           * Wie viele jeder HAT. Bis zum 14.09.2026 fehlte das: die Flaeche
           * am Tisch konnte nur "2 taken" sagen und nicht "1 left", weil
           * `competition.live_board` die erlaubte Zahl nicht fuehrte. Jetzt
           * fuehrt sie sie (timeouts_allowed aus tournament.time_outs);
           * null heisst unbegrenzt, und dann bleibt es bei der genommenen
           * Zahl — eine Restzahl ohne Obergrenze gibt es nicht.
           */
          timeoutsAllowed: rowRec.timeouts_allowed,
          /*
           * WIE LANGE eine Auszeit dauert, in Sekunden — seit dem
           * 15.09.2026, und der Grund ist die Uhr am Tisch.
           *
           * Das Geraet nimmt den Druck auf die Auszeit-Flaeche vorweg und
           * laesst die Uhr sofort anlaufen (siehe useScoring.ts). Dafuer
           * muss es die Dauer kennen, BEVOR eine Auszeit laeuft. Bis
           * hierher kannte es nur `timeoutsAllowed`, und das ist eine
           * ANZAHL und keine Dauer — genau diese Verwechslung war die
           * Begruendung, mit der die Vorwegnahme am 14.09.2026 noch
           * abgelehnt wurde.
           *
           * In SEKUNDEN und nicht in Minuten: die Tafel rechnet in
           * Sekunden (`timeout_state` liefert `remaining_seconds`), und die
           * Umrechnung gehoert an die eine Stelle, die die Einheit der
           * Datenbank kennt, statt an jede, die eine Uhr zeichnet.
           *
           * null kommt praktisch nie vor — die Spalte ist NOT NULL mit
           * Vorgabe 5, und alle 1 638 Turniere haben sie. Es steht
           * trotzdem hier, weil die Tafel ohne Dauer nichts vorwegnehmen
           * DARF, und ein `?? 300` an dieser Stelle waere eine erfundene
           * Regel.
           */
          timeoutSeconds: rowRec.timeout_minutes === null
            ? null
            : rowRec.timeout_minutes * 60,
          score: { A: rowRec.score_a ?? 0, B: rowRec.score_b ?? 0 },
          /*
           * Eine LISTE und kein Paar aus zwei Feldern: die Tafel zählt sie
           * ("zwei offen") und zeigt sie in der Reihenfolge, in der die
           * Spieler auf dem Schirm stehen. Zwei Felder zwängen ihr an drei
           * Stellen ein `if (a) ... if (b) ...` auf, und die dritte Stelle
           * vergisst man.
           *
           * Leer heisst zweierlei: alles abgenommen ODER das Turnier führt
           * gar keine Kontrolle. Für die Tafel sieht beides gleich aus, und
           * seit dem 16.09.2026 muss sie die beiden auch nicht mehr
           * trennen: hier ging dafür `uniformControl` mit hinaus, und der
           * einzige Leser war die Zeile "Uniform control done" in der
           * Zählleiste. Die ist gestrichen — man merkt die Abnahme daran,
           * dass die OFFEN-Meldung verschwindet —, und damit ist der Merker
           * ein Feld ohne Leser. Er steht weiter in
           * `competition.live_board.uniform_control`; wer ihn wieder
           * braucht, holt ihn dort und nicht aus `/events/{id}/tournaments`
           * (das hängt an `tournament:R`, und ein freigeschaltetes Gerät
           * trägt überhaupt kein Recht — der Merker wäre ausgerechnet auf
           * den Geräten leer, für die er gedacht ist).
           */
          uniformOpen: [
            ...(rowRec.uniform_open_a ? [{ side: 'A', displayName: rowRec.uniform_open_a }] : []),
            ...(rowRec.uniform_open_b ? [{ side: 'B', displayName: rowRec.uniform_open_b }] : []),
          ],
          /*
           * DIE ANGEORDNETE SHOT-CLOCK — ZWEI ZEITPUNKTE UND KEINE UHR.
           *
           * `since` sagt, dass sie gilt; `acknowledgedAt` sagt, ob der
           * Schiedsrichter es zur Kenntnis genommen hat. Steht das erste und
           * fehlt das zweite, zählt dieses Gerät gerade nicht weiter — die
           * Datenbank weist jeden Punkt ab (SHOT_CLOCK_NOT_ACKNOWLEDGED),
           * und die Leiste muss deshalb sagen können, warum.
           *
           * KEINE RESTZEIT, KEINE SEKUNDEN, KEINE VERLÄNGERUNG. Die
           * Shot-Clock führt der Schiedsrichter am Tisch mit seiner eigenen
           * Stoppuhr, weil er dabei auch die Ansagen macht. Das System weiß
           * nur, DASS sie gilt. Wer hier eine Restzeit ergänzt, baut das
           * Vorgängersystem nach — und die Uhr im Browser eines Tablets war
           * dort nie die Uhr, nach der am Tisch gespielt wurde.
           *
           * DIE BEMERKUNG IST NICHT DABEI, und sie kommt auch nicht über
           * diesen Weg nach. Vor dieser Tafel stehen die beiden Spieler;
           * „B spielt zu langsam", groß auf einem Bildschirm, wäre ein
           * Pranger — dieselbe Überlegung, die `uniformOpen` oben nur dem
           * freigeschalteten Gerät zeigt. Sie steht schon in
           * `competition.live_board` nicht drin, damit sie hier gar nicht
           * erst versehentlich weitergereicht werden kann.
           */
          shotClock: rowRec.shot_clock_since === null
            ? null
            : {
                since: rowRec.shot_clock_since,
                acknowledgedAt: rowRec.shot_clock_acknowledged_at,
              },
          /*
           * 14.1 ENDLOS: DIE RESTKUGELN UND DIE FOULFOLGE.
           *
           * Beides ist BEDIENUNG und nicht Stand, und beides steht deshalb
           * hier und nicht in der öffentlichen Tafelantwort — dieselbe
           * Trennung wie bei der Trikotkontrolle darüber, nur aus einem
           * anderen Grund: hier geht es nicht um einen Pranger, sondern
           * darum, dass der Saal den Stand sehen soll und nicht das
           * Rechenwerk dahinter.
           *
           * `null` bei den Kugeln heisst „noch nichts gezählt"; die Tafel
           * fällt dann auf ein volles Rack zurück, denn so beginnt jede
           * Partie. Es heisst NICHT „der Tisch ist leer" — das wäre die 0,
           * und die gibt es wirklich (WPA 7.8 a).
           *
           * Der Foulzähler kommt als PAAR heraus und nicht als zwei Felder:
           * die Tafel zeichnet ihn für beide Spieler nebeneinander, und
           * „on two fouls" ist eine Auskunft, die man nur im Vergleich
           * liest.
           */
          ballsOnTable: rowRec.balls_on_table,
          fouls: { A: rowRec.fouls_a ?? 0, B: rowRec.fouls_b ?? 0 },
          /*
           * DIE AUFNAHME, zweimal als Paar und aus demselben Grund wie der
           * Foulzähler: die Tafel zeichnet sie für beide Spieler, und der
           * High run wird im Saal verglichen ("41 gegen 38") und nicht
           * einzeln gelesen.
           *
           * `?? 0` und nicht null: eine Partie ohne Eintrag hat eine
           * Aufnahme von null — das ist keine fehlende Angabe, sondern die
           * richtige. Anders als bei den Restkugeln, wo null „noch nichts
           * gezählt" heisst und die Tafel auf ein volles Rack zurückfällt.
           */
          run: { A: rowRec.run_a ?? 0, B: rowRec.run_b ?? 0 },
          high: { A: rowRec.high_a ?? 0, B: rowRec.high_b ?? 0 },
        },
    /*
     * DIE WERTUNGSART UND DER SCHLÜSSEL DER DISZIPLIN STEHEN HIER NICHT
     * MEHR. Sie kommen mit der Partie selbst — `discipline.scoringKind` und
     * `discipline.key` aus `competition.public_match`. Siehe oben.
     */
    /* Die Bau-Kennung dieses Servers — siehe oben. */
    buildId,
  }
})
