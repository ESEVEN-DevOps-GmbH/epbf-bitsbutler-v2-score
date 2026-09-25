import type { Match } from '~~/shared/types/api'

/** Eine Seite der Partie. A steht auf der Tafel links, B rechts. */
export type Side = 'A' | 'B'

/** Der Stand beider Seiten — immer beide, nie einer allein. */
export interface ScorePair { A: number, B: number }

/** Wie viele Kugeln ein volles Rack hat. Die Zahl steht in WPA 7 ueberall. */
export const FULL_RACK = 15

/**
 * WELCHES FOUL AM TISCH GEDRUECKT WURDE — die BEDIENUNG und nicht die Regel.
 *
 * Drei Werte, obwohl die Anwendung nur drei FOULARTEN kennt (STANDARD,
 * BREAK, THIRD) und die beiden Break-Griffe dort dieselbe sind: sie kosten
 * beide zwei Punkte und zaehlen beide nicht fuer die Dreierfolge (WPA 7.10 /
 * 7.11). Was sie unterscheidet, ist WER DANACH AM TISCH STEHT, und das ist
 * die Wahl des Gegners nach 7.3 (b) — eine Angabe ueber den Tisch und nicht
 * ueber das Foul. Deshalb bleibt sie hier vorn und reist nicht mit:
 * `foulKind` an die Anwendung ist in beiden Faellen 'BREAK'.
 */
export type FoulKind = 'STANDARD' | 'BREAK_AGAIN' | 'BREAK_ACCEPT'

/**
 * DIE LAGE AM TISCH BEI 14.1 ENDLOS — was neben dem Stand noch gilt.
 *
 * Zwei Angaben, und beide sind ZUSTAND und nicht Anzeige:
 *
 *   `rest`  Wie viele Objektkugeln nach dem letzten Stoss noch liegen. Sie
 *           ist die Grundlage der ganzen Rechnung: versenkt hat jemand die
 *           DIFFERENZ zum vorherigen Rest. Nicht „15 minus Rest" — nach
 *           einem Neuaufbau liegen wieder 15, mitten in einer Aufnahme
 *           weniger, und die feste 15 waere nur im ersten Anlauf richtig.
 *   `fouls` Wie viele Standardfouls jede Seite HINTEREINANDER begangen hat.
 *           Beim dritten kostet es sechzehn Punkte statt einem und der Tisch
 *           wird neu aufgebaut (WPA 7.11) — „on two fouls" ist im Straight
 *           Pool die wichtigste Zustandsangabe ueberhaupt und gehoert
 *           deshalb auf die Tafel und nicht in ein Untermenue.
 *
 * WER AM TISCH IST, STEHT NICHT HIER. Er steht in `breakState.next` —
 * dieselbe Auskunft, die die Tafel ohnehin fuehrt und vorwegnimmt. Bei 14.1
 * wird einmal angestossen und danach gespielt, bis jemand verschiesst; wer
 * als naechstes zum Stoss kommt, IST der, der am Tisch steht. Eine zweite
 * Angabe daneben waere ein zweiter Schattenzustand fuer dieselbe Sache.
 */
export interface TableState {
  rest: number
  fouls: ScorePair
  /**
   * DIE LAUFENDE AUFNAHME je Seite — wie viele Kugeln der Spieler
   * hintereinander legal versenkt hat, ohne dass der Tisch zwischendurch
   * weggegangen ist.
   *
   * SIE LÄUFT ÜBER DEN RACK-WECHSEL HINWEG. WPA 7.4: sind vierzehn Kugeln
   * eines Racks versenkt, wird neu aufgebaut und DERSELBE Spieler spielt
   * weiter. Genau daher kommen im Straight Pool die Läufe über hundert
   * Punkte — eine Zahl, die beim Neuaufbau auf null fiele, wäre keine
   * Aufnahme, sondern eine Rackstatistik.
   *
   * ALS PAAR und nicht als eine Zahl beim Spieler am Tisch, obwohl immer nur
   * einer eine laufende Aufnahme HAT: das Rückgängig schreibt den ganzen
   * Zustand absolut zurück, auch über einen Tischwechsel hinweg. Stünde hier
   * nur die eine Zahl, müsste beim Zurücknehmen geraten werden, wem sie
   * gehörte. Die Seite, die nicht am Tisch ist, trägt 0.
   */
  run: ScorePair
  /**
   * DER HIGH RUN je Seite — die höchste Aufnahme dieser Partie.
   *
   * Sie wird MITGEFÜHRT und nicht ausgerechnet. Als blosses Maximum liesse
   * sie sich nicht zurücknehmen: wer den Stoss zurücknimmt, der sie auf 41
   * gehoben hat, müsste wissen, ob davor 38 oder 12 dastand — und das steht
   * nirgends ausser im Verlaufsstapel dieses Geräts.
   */
  high: ScorePair
}

/**
 * Ein Schritt im Rueckgaengig-Stapel — der GANZE Zustand und nicht nur der
 * Stand.
 *
 * Bis zum 16.09.2026 lag hier ein blosses {@link ScorePair}, und das genuegte,
 * solange eine Zahl das Einzige war, was ein Tastendruck veraenderte. Bei
 * 14.1 endlos veraendert er vier Dinge auf einmal: Punkte, Restkugeln,
 * Foulzaehler und wer am Tisch ist. Ein Undo, das nur die Punkte zuruecknimmt,
 * laesst den Rest stehen — und die naechste Aufnahme rechnet dann falsch,
 * ohne dass jemand sieht, warum.
 */
interface Step {
  score: ScorePair
  tableState: TableState
  /** Wer am Tisch war. `null` bei Satzwertung — dort gibt es das nicht. */
  atTable: Side | null
  /**
   * War der Vorgang, der auf diesen Zustand FOLGTE, ein Foul?
   *
   * Sie steht am Zustand DAVOR, weil genau der zurückgeschrieben wird — und
   * die Anwendung braucht die Angabe beim Zurücknehmen: ein zurückgenommenes
   * Foul HEBT den Stand, und ein steigender Stand gilt sonst als gespielter
   * Punkt (siehe `competition.score_writes_its_history`, und die Begründung
   * dafür in ScoreUndoTest). Nur zusammen mit dieser Angabe zeichnet der
   * Verlauf ihn als Rücknahme.
   */
  foulKind?: 'STANDARD' | 'BREAK' | 'THIRD'
}

/**
 * Was ein Tastendruck bei 14.1 endlos NEBEN dem Stand mitschickt.
 *
 * `foulKind` ist keine Angabe über den Stand, sondern über den Vorgang —
 * dieselbe Bauart wie `undo` und aus demselben Grund: die Anwendung sieht
 * sonst nur, dass eine Zahl gefallen ist, und ein Foul stünde im Verlauf als
 * „Score corrected" da. Drei Werte, weil die drei Fouls Verschiedenes kosten
 * (WPA 7.9 / 7.10 / 7.11) und sich an der Differenz allein nicht sicher
 * auseinanderhalten lassen.
 */
interface StraightPoolMove {
  tableState: TableState
  atTable: Side
  foulKind?: 'STANDARD' | 'BREAK' | 'THIRD'
}

/**
 * Was `PUT /matches/{id}/score` beantwortet — einmal benannt, weil sowohl
 * `setScore` als auch die Netzwiederholung bei einem Merkposten (siehe
 * `pending` in `useScoring`) dieselbe Form brauchen: ein Wiederholungs-
 * versuch schickt denselben Rumpf ein zweites Mal und erwartet dieselbe
 * Antwort.
 */
interface ScoreResponse {
  scoreA: number, scoreB: number
  ballsOnTable?: number | null, foulsA?: number | null, foulsB?: number | null
  runA?: number | null, highA?: number | null
  runB?: number | null, highB?: number | null
}

/**
 * Ein Schreibvorgang auf den Stand, so vollständig, dass er sich UNVERÄNDERT
 * wiederholen lässt — der Rumpf, was bei Ankunft geschieht, und was bei
 * einer (fachlichen) Abweisung zurückzudrehen ist. Siehe `pending`.
 */
interface ScoreRequest {
  run: () => Promise<ScoreResponse>
  onArrived: (response: ScoreResponse) => void
  rollback: () => void
}

/**
 * DER MERKPOSTEN, WIE ER EIN NEULADEN ÜBERLEBT — je Partie höchstens EINER.
 *
 * Ein Merkposten im Arbeitsspeicher übersteht einen Netzausfall, aber kein
 * Neuladen: ein Tablet in einer Halle wird gewischt, der Browser räumt
 * Speicher auf, das Gerät geht kurz aus — und danach ist der ganze
 * Zustand dieser Datei weg, lautlos, ohne dass irgendwer es sieht. Deshalb
 * liegt hier ab, WAS zu tun ist, wenn die Verbindung zurück ist — nicht
 * mehr, denn Funktionen (`run`, `onArrived`, `rollback` von
 * `ScoreRequest`) lassen sich nicht in `localStorage` schreiben.
 *
 * EIN SCHLÜSSEL JE PARTIE (`pendingStorageKey`), damit zwei Tafeln auf
 * demselben Gerät sich nicht ins Gehege kommen und ein gemerktes Ende einen
 * gemerkten Stand am selben Schlüssel ERSETZT statt daneben abzulegen —
 * dieselbe Haltung wie beim Merkposten im Arbeitsspeicher (siehe dort,
 * "EIN GEMERKTES ERGEBNIS ERSETZT EINEN GEMERKTEN STAND").
 */
type StoredPending = StoredScore | StoredResult

/** Ein Stand, der noch hinaus muss — siehe `pending` in `useScoring`. */
interface StoredScore {
  kind: 'score'
  /**
   * Der Stand, AUF DEM dieser Merkposten aufbaute — nicht der, den er
   * schickt. Die Grundlage des Abgleichs beim Wiederlesen, siehe
   * `pendingRestore`: eine absolute Zahl sagt für sich nicht,
   * worauf sie aufbaute, und ohne diese Angabe ließe sich nicht erkennen,
   * ob der Server inzwischen etwas anderes führt.
   */
  base: ScorePair
  next: ScorePair
  undo: boolean
  move?: StraightPoolMove
}

/** Ein Ende (`finish`/`giveUp`), das noch hinaus muss. */
interface StoredResult {
  kind: 'result'
  path: 'confirm' | 'result'
  /**
   * Nur bei `path: 'result'` gesetzt — `confirm` hat keinen Rumpf, siehe
   * `finish`.
   */
  body?: {
    winner: Side, scoreA: number, scoreB: number
    resolution: 'WALKOVER' | 'FORFEIT'
  }
  /**
   * Der Stand, auf dem `body.scoreA`/`scoreB` beruhen — wie `base` bei
   * {@link StoredScore}, und aus demselben Grund. `null` bei
   * WALKOVER: dort steht im Rumpf immer 0:0, unabhängig vom tatsächlichen
   * Stand, und ein Vergleich gegen "0:0" wäre kein Abgleich, sondern ein
   * Zufallstreffer.
   */
  base: ScorePair | null
}

/**
 * Der Schlüssel EINER Partie — nicht des Tisches und nicht des Turniers:
 * die nächste Partie an diesem Tisch soll den Merkposten der vorigen weder
 * erben noch sehen.
 */
function pendingStorageKey(matchId: string): string {
  return `bb.score.pending.${matchId}`
}

/**
 * Ablegen, lesen, löschen — je mit `try`/`catch` und ohne eigene Meldung.
 *
 * DIESELBE HALTUNG WIE `merkerLesen`/`zurueckZurWahl` IN [table].vue: ein
 * privater Modus ohne Speicher oder ein Kontingent, das voll ist, soll den
 * Zählenden nicht aufhalten — der Merkposten lebt dann eben nur im
 * Arbeitsspeicher, wie vor dieser Ergänzung. Dieselbe Zeile fängt auch das
 * serverseitige Rendern ab, wo es `window` gar nicht gibt: der Zugriff
 * darauf wirft dann eine `ReferenceError`, die hier genauso geschluckt
 * wird.
 */
function pendingSave(matchId: string, value: StoredPending) {
  try {
    window.localStorage.setItem(pendingStorageKey(matchId), JSON.stringify(value))
  }
  catch {
    // Kein Speicher — siehe oben.
  }
}

function pendingRead(matchId: string): StoredPending | null {
  try {
    const raw = window.localStorage.getItem(pendingStorageKey(matchId))
    return raw ? JSON.parse(raw) as StoredPending : null
  }
  catch {
    return null
  }
}

function pendingClear(matchId: string) {
  try {
    window.localStorage.removeItem(pendingStorageKey(matchId))
  }
  catch {
    // Kein Speicher — siehe oben.
  }
}

/**
 * Eine Seite, deren Trikotkontrolle noch aussteht — mit dem Namen dessen,
 * der dort steht. Genau das, was `competition.uniform_blocks_start` liefert.
 */
export interface UniformOpen {
  side: Side
  displayName: string
}

/**
 * Die angeordnete Shot-Clock einer Partie.
 *
 * ZWEI ZEITPUNKTE UND KEINE UHR — und das ist keine Lücke, die noch jemand
 * füllen soll. Der Schiedsrichter steht mit seiner eigenen Stoppuhr am
 * Tisch, macht die Ansagen und regelt die Shot-Clock selbst; dieses Gerät
 * weiß nur, DASS sie gilt. Es gibt deshalb keine Restzeit, keinen Countdown
 * und keine Verlängerung — wer eine ergänzt, baut das Vorgängersystem nach,
 * in dem eine Uhr im Browser eines Tablets so tat, als wäre sie die Uhr am
 * Tisch.
 *
 * `acknowledgedAt === null` ist der Zustand, auf den es ankommt: dann weist
 * die Datenbank jeden Punkt ab (SHOT_CLOCK_NOT_ACKNOWLEDGED), und die Partie
 * steht, bis der Schiedsrichter bestätigt hat. Genau dafür ist sie da — eine
 * Meldung, die die Partie anhält, kann niemand übersehen.
 *
 * Der ANLASS ist nicht dabei. Vor diesem Bildschirm stehen die beiden
 * Spieler, und die Shot-Clock ist eine Anordnung gegen einen von ihnen; „B
 * spielt zu langsam" in großen Lettern wäre ein Pranger. Der Satz steht in
 * der Verwaltung, bei der Turnierleitung, die ihn geschrieben hat.
 */
export interface ShotClock {
  /** Seit wann sie angeordnet ist. Kein Startpunkt einer Uhr — es läuft keine. */
  since: string
  /** Wann der Schiedsrichter sie zur Kenntnis genommen hat; null: noch nicht. */
  acknowledgedAt: string | null
}

/**
 * Was die Verwaltung zusätzlich über die Partie weiß und die öffentliche
 * Tafelantwort nicht führt. Null, solange niemand angemeldet ist.
 */
export interface Extra {
  id: string
  status: string
  raceTo: number | null
  firstBreak: Side | null
  nextBreak: Side | null
  breakRule: string | null
  timeoutsTaken: ScorePair
  /** Wie viele jede Seite HAT. null heisst: keine Obergrenze gepflegt. */
  timeoutsAllowed: number | null
  /**
   * WIE LANGE eine Auszeit dauert, in Sekunden — nicht wie viele es sind.
   *
   * Die beiden nebeneinander zu haben ist der ganze Grund, aus dem die
   * Auszeit jetzt vorweggenommen werden kann: bis zum 14.09.2026 kannte
   * dieses Gerät nur `timeoutsAllowed`, und mit einer ANZAHL lässt sich
   * keine Uhr stellen. Siehe `takeTimeout`.
   *
   * null heisst: die Dauer ist nicht bekannt — dann wird NICHT
   * vorweggenommen, statt eine Restzeit zu erfinden.
   */
  timeoutSeconds: number | null
  score: ScorePair
  /**
   * Wessen Trikotkontrolle noch offen ist. Leer heisst: die Partie darf
   * beginnen.
   *
   * <p>KEIN FEHLER, SONDERN EIN ZUSTAND — und deshalb steht sie hier bei
   * `raceTo` und `timeoutsAllowed` und nicht bei {@link ScoringError}. Eine
   * Abweisung beantwortet den Druck, der gerade danebenging, und
   * verschwindet nach fünfzehn Sekunden von selbst (REJECTION_MS). Diese
   * Angabe beantwortet keinen Druck: sie steht am Tisch, bis jemand die
   * Kontrolle abnimmt, und sie geht auch nur dann — dann nämlich liefert
   * der nächste Abruf sie nicht mehr mit.
   */
  uniformOpen: UniformOpen[]
  /*
   * HIER STAND `uniformControl` — "führt dieses Turnier überhaupt eine
   * Trikotkontrolle?".
   *
   * Es gab die Angabe für genau einen Leser: die Zeile "Uniform control
   * done" durfte nur dort stehen, wo wirklich kontrolliert wird, sonst
   * behauptete sie einen Vorgang, den es nicht gibt. Die Zeile ist am
   * 16.09.2026 gestrichen ("nimmt nur platz weg" — man merkt es daran, dass
   * die OFFEN-Meldung verschwindet), und damit ist auch der Unterschied
   * nicht mehr zu treffen. Eine Angabe ohne Leser ist keine Vorsorge,
   * sondern Ballast: die nächste Oberfläche, die ihn braucht, findet ihn in
   * `competition.live_board.uniform_control` — dort, wo er herkommt.
   */
  /**
   * Die angeordnete Shot-Clock, oder null.
   *
   * <p>KEIN FEHLER, SONDERN EIN ZUSTAND — dieselbe Einordnung wie bei
   * `uniformOpen` darüber, und aus demselben Grund: sie beantwortet keinen
   * Druck, sondern steht am Tisch, bis der Schiedsrichter bestätigt oder die
   * Turnierleitung aufhebt. Die Abweisung, die ein Punkt auslöst, ist etwas
   * anderes und verschwindet nach fünfzehn Sekunden.
   */
  shotClock: ShotClock | null
  /**
   * Wie viele Objektkugeln bei 14.1 endlos noch auf dem Tisch liegen.
   *
   * <p>`null` heisst „noch nichts gezaehlt" und NICHT „der Tisch ist leer" —
   * die Tafel faellt dann auf {@link FULL_RACK} zurueck, denn so beginnt
   * jede Partie. Bei Satzwertung bleibt die Angabe immer null.
   */
  ballsOnTable: number | null
  /** Standardfouls hintereinander, je Seite (WPA 7.11). */
  fouls: ScorePair
  /** Die laufende Aufnahme, je Seite — siehe {@link TableState}. */
  run: ScorePair
  /** Der High run, je Seite. */
  high: ScorePair
}

/** Eine abgewiesene Eingabe, so wie sie am Gerät stehen soll. */
export interface ScoringError {
  /** Der Schlüssel der Anwendung, z. B. MATCH_FINISHED_NO_SCORE. */
  errorCode: string
  text: string
}

/**
 * DAS ZÄHLWERK — was passiert, wenn am Tisch jemand auf eine Fläche tippt.
 *
 * Es steht neben der Tafel und nicht in ihr: die Tafel zeichnet, dieses
 * Stück schreibt. Vier Dinge daran sind nicht offensichtlich, und alle vier
 * kosten sonst genau das, was am Tisch nicht passieren darf.
 *
 * ERSTENS: DIE ZAHL GEHT SOFORT HOCH, GESCHRIEBEN WIRD NEBENHER
 *
 * Bis zum 14.09.2026 stand hier das Gegenteil, und mit Begründung: die Zahl
 * ändere sich erst, wenn die Anwendung geantwortet hat, denn ein Tipp, der
 * ins Leere geht, dürfe nicht aussehen, als sei er angekommen. Im Saal, über
 * das örtliche Netz, war das ein Wimpernschlag und richtig.
 *
 * Über eine schlechte Leitung war es unbrauchbar. Der Auftraggeber, von
 * einem Turnier aus über einen Reiserouter: "die scoreboards reagieren viel
 * zu langsam.. 3-5s fuer ein + auf einer seite? oder time-out starten oder
 * stoppen". Gemessen: EIN Tastendruck machte DREI Umläufe streng
 * hintereinander — schreiben, die ganze Tafel neu holen, den Zusatz neu
 * holen — und sperrte dabei die Fläche. Dreimal dreißig Millisekunden fallen
 * nicht auf, dreimal eine Sekunde schon.
 *
 * Jetzt zeigt die Tafel den neuen Stand sofort und schickt ihn danebenher.
 * Der alte Einwand ist damit nicht weggefallen, sondern beantwortet: ein
 * Stand, der noch unterwegs ist, SIEHT anders aus (`unconfirmed`), und wird
 * er abgewiesen, springt die Zahl zurück und die rote Zeile sagt warum.
 *
 * ZWEITENS: ANTWORTEN KOMMEN IN FALSCHER REIHENFOLGE — siehe `send`.
 * Das ist der Kern dieses Stücks und steht dort ausführlich.
 *
 * DRITTENS: NICHT JEDER WEG NIMMT VORWEG
 *
 * Ein Punkt wird vorweggenommen, ein Ergebnis nicht. Wer den Sieger meldet,
 * reicht den Turnierbaum weiter und rechnet Plätze ab — das ist kein Tipp,
 * den man zurücknimmt, und eine Fläche, die dabei sofort "fertig" sagt und
 * eine Sekunde später doch nicht, ist schlimmer als eine, die kurz wartet.
 * `finish` und `giveUp` gehen deshalb weiter durch {@link write} und
 * halten die Leiste an; alles andere geht durch {@link send}.
 *
 * VIERTENS: DER EIGENE STAND WIRD GEHALTEN, BIS DER ABRUF IHN BESTÄTIGT
 *
 * Die Tafel fragt alle zehn Sekunden nach. Eine Antwort, die schon unterwegs
 * war, als hier geschrieben wurde, trägt den Stand von vorher — ohne
 * Gegenmaßnahme spränge die Zahl von 7 auf 6 und ein paar Sekunden später
 * wieder auf 7. Ein Stand, der zurückspringt, ist im Saal schlimmer als
 * einer, der eine Sekunde alt ist.
 *
 * Gehalten wird deshalb der zuletzt BESTÄTIGTE eigene Stand — und zwar nur
 * so lange, bis der Abruf ihn nennt oder zwanzig Sekunden vergangen sind.
 * Die Frist ist nicht Beiwerk: schreibt das Turnierbüro gleichzeitig, soll
 * dessen Stand nach spätestens zwei Abrufen durchkommen. Wer am Tisch steht,
 * sieht dann eine fremde Änderung — das ist richtig, denn er ist nicht der
 * Einzige, der schreiben darf.
 */
export function useScoring(optionen: {
  match: Ref<Match | null>
  extra: Ref<Extra | null>
  /**
   * Was der ABRUF über die laufenden Auszeiten sagt — je Seite ein Ja oder
   * Nein, roh und ohne das, was hier vorweggenommen wurde.
   *
   * ROH IST BEDINGUNG UND NICHT BEQUEMLICHKEIT. Diese Angabe entscheidet
   * unten, wann ein Vorgriff losgelassen wird; käme sie aus der Anzeige,
   * die den Vorgriff schon enthält, bestätigte sich der Vorgriff selbst und
   * würde nie wieder los.
   */
  timeoutsRunning: Ref<Record<Side, boolean>>
  /**
   * Ist es 14.1 endlos?
   *
   * Sie entscheidet an genau zwei Stellen: ob ein Rückgängig auch die Lage am
   * Tisch mitschickt, und ob der Stand unter null darf (WPA 7.7).
   *
   * AUSDRÜCKLICH NICHT „wird in Punkten gezählt". POINT_RACE tragen zwei
   * Disziplinen, und das Shoot-out hat weder Restkugeln noch Fouls mit
   * Punktabzug: ein Rückgängig, das ihm `ballsOnTable: 15` schriebe, trüge
   * eine Angabe in eine Partie, zu der sie nicht gehört.
   *
   * Die Frage lässt sich hier nicht selbst beantworten — die Disziplin steht
   * in der Auskunft der Tafel und nicht in der Partie —, und sie zu raten
   * (etwa an `raceTo > 20`) wäre genau die Sorte Kürzelliste, die [table].vue
   * ausdrücklich vermeidet.
   */
  straightPool: Ref<boolean>
  /**
   * Traegt diese Partie ein Satzformat — `Match.setRaceTo` ist gesetzt?
   *
   * SIE ENTSCHEIDET, GEGEN WELCHE SPALTE DIESES GERAET RECHNET. Mit
   * Satzformat schreibt `PUT /matches/{id}/score` nach `match_slot.
   * set_score` und NICHT nach `match_slot.score` — dieselbe absolute Zahl,
   * nur eine Ebene tiefer (`MatchController.setScore`, seit dem
   * 24.09.2026). `score` zaehlt dann die GEWONNENEN Saetze und steigt
   * ausschliesslich ueber `finishSet`. Ohne diese Angabe rechnete
   * `score` weiterhin gegen `sideX.score` — und das waere fuer eine
   * Satzpartie der AUSSENSTAND (z. B. "1" gewonnener Satz), nicht der Stand
   * IM laufenden Satz (z. B. "3:2" Racks). Der Zifferblock zaehlte dann
   * sichtbar falsch, sobald der Abruf den optimistischen Vorgriff ablöst.
   *
   * NICHT SELBST ABGELEITET, aus demselben Grund wie bei `straightPool`
   * daneben: die Angabe steht an der Partie (`Match.setRaceTo`), und sie
   * hier ein zweites Mal zu raten waere die Sorte Kuerzelliste, die
   * [table].vue ausdruecklich vermeidet.
   *
   * BEI SNOOKER (FRAME_RACE) BLEIBT SIE FALSCH — `setRaceTo` ist dort immer
   * `null` (siehe die Begruendung am Feld in shared/types/api.ts). Ein Frame
   * hat keinen Zwischenstand, den dieses Zaehlwerk fuehren koennte; die
   * Ballwerte-Flaeche zaehlt ihn eigenstaendig und ausserhalb dieser Datei.
   */
  setFormat: Ref<boolean>
  /** Die ganze Tafel neu holen. NIE abwartend — siehe `send`. */
  refresh: () => Promise<void>
}) {
  const { match, extra, timeoutsRunning, straightPool, setFormat, refresh } = optionen

  /**
   * Ein AUFHALTENDER Vorgang läuft — und nur ein solcher.
   *
   * Sie sperrt jede Fläche der Leiste (`:arbeitet`), und genau deshalb trägt
   * sie seit dem 14.09.2026 nur noch, was ein Ende meldet: `finish` und
   * `giveUp`. Punkt, Auszeit und Anstoß sperren nichts mehr — wer zweimal
   * schnell tippt, muss zweimal zählen können, und das war der Auftrag.
   */
  const busy = ref(false)
  const { error, report, reject } = useRejection()

  /** Der zuletzt BESTÄTIGTE eigene Stand samt Zeitpunkt — siehe Kopf. */
  const held = ref<{ score: ScorePair, since: number } | null>(null)

  /**
   * Der eigene Stand, der noch unterwegs ist — die Zahl, die sofort hochging.
   *
   * Er steht über allem: über dem Abruf und über `held`. Solange er
   * gesetzt ist, kann weder der Zehn-Sekunden-Takt noch eine überholte
   * Antwort die Zahl bewegen, auf die der Zählende gerade geschaut hat.
   *
   * Er braucht KEINE eigene Verfallsfrist, obwohl `held` eine hat. Der
   * Grund liegt in SEND_DEADLINE_MS: jeder Schreibvorgang endet spätestens nach
   * acht Sekunden, mit Antwort oder mit Abbruch, und genau dort wird er
   * gelöscht. Eine zweite Frist hier wäre eine zweite Wahrheit über
   * dieselbe Sache — und die beiden liefen früher oder später auseinander.
   */
  const optimistic = ref<ScorePair | null>(null)

  const HOLD_MS = 20_000

  /**
   * Wie lange ein Schreibvorgang höchstens unterwegs sein darf.
   *
   * OHNE DIESE FRIST GIBT ES DEN FALL "KOMMT NICHT DURCH" GAR NICHT. `fetch`
   * bricht von sich aus nicht ab; hinter einem Reiserouter, der gerade
   * abreißt, hängt die Anfrage minutenlang, und mit ihr hinge die vorweg
   * genommene Zahl — sichtbar, aber nie bestätigt und nie zurückgedreht. Das
   * ist der eine Zustand, den eine Tafel nicht haben darf.
   *
   * Acht Sekunden: großzügig über allem, was eine schlechte Leitung im
   * Betrieb braucht (gemessen wurden drei Sekunden im schlimmsten Fall), und
   * deutlich unter den fünfzehn, die die Meldung danach stehenbleibt — der
   * Abbruch und sein roter Satz gehören noch zu demselben Tastendruck.
   */
  const SEND_DEADLINE_MS = 8_000

  /**
   * WIE EIN NOCH NICHT BESTÄTIGTER STAND AUSSIEHT — und warum er es erst
   * nach einem halben Augenblick tut.
   *
   * Wenn die Zahl sofort hochgeht, muss sichtbar sein, dass sie noch nicht
   * angekommen ist; sonst hat die Tafel eine Behauptung mehr und eine
   * Auskunft weniger. Die Tafel zeigt das an zwei Stellen leise: der Stand
   * wird eine Spur blasser, und der Verbindungspunkt unten rechts wechselt
   * die Farbe (siehe [table].vue).
   *
   * ES BEGINNT ABER NICHT SOFORT, SONDERN NACH BLINK_MS. Im Saal
   * läuft das über ein örtliches Netz und ein Schreibvorgang dauert dreißig
   * Millisekunden — flackerte die Anzeige bei jedem Tipp kurz auf, wäre das
   * genau das Zucken, wegen dessen die Vorwegnahme früher abgelehnt wurde,
   * und zwar vor Publikum. Erst wenn die Antwort AUSBLEIBT, wird die
   * Ungewissheit sichtbar — dann aber deutlich und die ganze Zeit über.
   *
   * VERWORFEN: einen Kringel drehen zu lassen. Er ist eine Bewegung, und
   * eine Bewegung auf einer Tafel zieht aus fünf Metern mehr Blicke auf sich
   * als der Satzstand daneben.
   */
  const BLINK_MS = 600
  const unconfirmed = ref(false)
  let blinkTimer: ReturnType<typeof setTimeout> | null = null

  function beginWaiting() {
    if (blinkTimer || unconfirmed.value) return
    blinkTimer = setTimeout(() => {
      unconfirmed.value = true
      blinkTimer = null
    }, BLINK_MS)
  }

  function endWaiting() {
    if (blinkTimer) { clearTimeout(blinkTimer); blinkTimer = null }
    unconfirmed.value = false
  }

  // Die Uhr der roten Zeile raeumt `useRejection` selbst ab — sie gehoert
  // seit dem 16.09.2026 dorthin und nicht mehr hierher.
  onScopeDispose(() => {
    if (blinkTimer) clearTimeout(blinkTimer)
  })

  /* ----------------------------------------------------------------------
   * DER NETZFEHLER — GEMERKT UND WIEDERHOLT, NICHT ABGEWIESEN
   * ----------------------------------------------------------------------
   *
   * Der Auftrag vom 25.09.2026: die Tafel soll weiterzählen, wenn das Netz
   * in der Halle ausfällt, und den Stand nachholen, sobald die Verbindung
   * zurück ist. `optimistic` darüber löst das für einen Aussetzer von ein
   * paar Sekunden schon; es löst es nicht für einen Ausfall von Minuten,
   * denn `send` gab bis hierher jeden gescheiterten Schreibvorgang
   * verloren — gleich, OB die Anwendung nein gesagt hat oder ob sie die
   * Frage nie zu Gesicht bekam.
   *
   * GENAU DIESE ZWEI FÄLLE WERDEN JETZT GETRENNT (`isNetworkError`, am Ende
   * der Datei, wo `alsFehler` dieselbe Antwort schon zerlegt):
   *
   *   FACHLICH   Die Anwendung hat geantwortet und NEIN gesagt (400, 403,
   *              409 mit einer Fachkennung wie SET_RACE_ALREADY_REACHED).
   *              Das bleibt, wie es war: Anzeige zurückgedreht, rote Zeile,
   *              fertig — ein Wiederholen machte aus einem Nein kein Ja,
   *              sondern eine Schleife, die nie ankommt.
   *   NETZFEHLER Keine Verbindung, eine Zeitüberschreitung (`SEND_DEADLINE_MS`)
   *              oder ein 502/503/504 — die Frage ist nie angekommen oder
   *              nie beantwortet worden. Hier, und nur hier, lohnt sich ein
   *              zweiter Versuch: die Anwendung hat nichts abgelehnt, sie
   *              hat nichts gesehen.
   *
   * KEINE SCHLANGE, EIN MERKPOSTEN. `send` verwirft mit Absicht jede
   * überholte Antwort (siehe dort, "VERWORFEN: die Schreibvorgänge in einer
   * Schlange") — dieselbe Haltung gilt hier: es gibt höchstens EINEN Stand,
   * der noch hinaus soll, nämlich den jüngsten. `pending` ist deshalb
   * eine einzelne Variable und kein Feld, in das eingereiht wird; ein neuer
   * Tastendruck ERSETZT sie, bevor er selbst losgeschickt wird (siehe
   * `pendingCleanup` in `setScore`), und der alte Versuch wird dabei
   * nicht nachgeholt, sondern fallengelassen — genau wie eine überholte
   * Antwort fallengelassen wird.
   *
   * NUR DIE PUNKTE. `setScore` ist die einzige Stelle, die `onNetworkError` an
   * `send` übergibt. Anstoß, Auszeit und ihre Rücknahme gehen
   * unverändert in den bestehenden Zweig: ein Schiedsrichtereingriff
   * verlangt ohnehin eine Serverprüfung und soll bei fehlender Verbindung
   * ERKENNBAR nicht verfügbar sein — das leistet die bestehende Abweisung
   * schon —, statt Minuten später heimlich nachzuwirken, wenn niemand mehr
   * daran denkt.
   *
   * WACHSENDE ABSTÄNDE UND KEIN `navigator.onLine`. Die Eigenschaft meldet
   * "online", sobald ein Netzwerkadapter aktiv ist — unabhängig davon, ob er
   * irgendwohin kommt. Ein Reiserouter, der sein WLAN gerade neu aufbaut,
   * bevor er selbst wieder eine Adresse hat, meldet dem Tablet "online" und
   * liefert trotzdem keine Antwort; das Ereignis wäre also ausgerechnet in
   * dem Moment falsch, in dem es gebraucht wird. Ein wiederholter Versuch
   * prüft stattdessen die Leitung, auf die es ankommt: ob der Server selbst
   * antwortet. Die Abstände wachsen (2 s, 5 s, 10 s, danach alle 20 s),
   * damit ein kurzer Aussetzer schnell nachgeholt wird und ein langer
   * Ausfall die Halle nicht mit Anfragen flutet, die ohnehin ins Leere
   * gehen.
   */
  /**
   * `base` liegt HIER NEBEN dem Auftrag, obwohl `pendingSave` sie
   * ohnehin schon nach `localStorage` schreibt (siehe `StoredScore`).
   *
   * Ohne sie im Arbeitsspeicher wüsste `scheduleRetry` vor einem
   * erneuten Versuch nicht, worauf DIESER Auftrag aufbaute, und könnte den
   * Abgleich gegen den aktuellen Serverstand nicht ziehen, den
   * `restoreScore` schon kennt (siehe dort) — sie stünde nur in
   * `localStorage`, und die dort abzuholen wäre derselbe Umweg, den ein
   * Neuladen ohnehin schon nimmt, nur ohne dass eines stattgefunden hätte.
   */
  let pending: { matchId: string, request: ScoreRequest, base: ScorePair } | null = null
  let retryTimer: ReturnType<typeof setTimeout> | null = null
  let retryAttempt = 0

  /*
   * DIE GESCHWISTER FUER DAS ENDE -- UND WARUM SIE HIER STEHEN UND NICHT
   * BEI IHREN FUNKTIONEN.
   *
   * Sie standen tausend Zeilen weiter unten, direkt ueber
   * `tryResult`, und das las sich gut: alles zum Ende an einer
   * Stelle. Es war trotzdem falsch. Der Watcher auf `match.value?.id`
   * laeuft mit `immediate: true`, also schon beim Aufbau des Zaehlwerks,
   * und ruft `resultCleanup()`. Funktionen werden nach oben gezogen,
   * `let` nicht -- der Zugriff traf eine Variable, die es noch nicht gab.
   *
   * Die Folge war kein stiller Fehler, sondern ein 500er bei JEDEM
   * serverseitigen Aufbau der Tafelseite: "Cannot access 'resultTimer'
   * before initialization". Die Tafel lud einen Tag lang gar nicht, online
   * wie offline. Gefunden hat es der Agent, der danach den Service Worker
   * baute -- er konnte seine eigene Arbeit nicht vorfuehren.
   *
   * Deshalb stehen sie jetzt bei ihren Geschwistern fuer den Stand, VOR
   * allem, was sie benutzt.
   */
  let result: {
    matchId: string
    run: () => Promise<{ advanced: number, newlySettled: number }>
    stored?: StoredResult
  } | null = null
  let resultTimer: ReturnType<typeof setTimeout> | null = null
  let resultAttempt = 0

  /**
   * Liegt ein Ende bereit, das die Anwendung noch nicht gesehen hat?
   *
   * Die Tafel zeigt dafür ausdrücklich NICHT "finished", aber auch nicht
   * nichts — sonst stünde die Leiste minutenlang gesperrt, ohne dass
   * irgendwer sagen könnte, warum.
   *
   * Steht hier oben aus demselben Grund wie die drei Zeilen darüber:
   * `resultCleanup()` setzt es zurück und läuft schon beim Aufbau.
   */
  const resultPending = ref(false)
  const NETWORK_RETRY_MS = [2_000, 5_000, 10_000, 20_000]

  /**
   * Steht ein Stand noch aus, weil eine Anfrage an einem Netzfehler
   * gescheitert ist?
   *
   * Anders als `unconfirmed` (ein halber Wimpernschlag, siehe oben) ist das
   * die Auskunft für den LANGEN Ausfall — die Tafel zeigt sie dauerhaft an
   * (siehe [table].vue): "diese Zahl ist hier richtig, aber die Anwendung
   * weiss noch nichts davon".
   */
  const offline = ref(false)

  /**
   * Einen gescheiterten Stand loswerden — bei Erfolg, bei einer (jetzt doch
   * eintreffenden) fachlichen Abweisung, oder weil ein neuerer Tipp ihn
   * ersetzt.
   *
   * RÄUMT AUCH DEN GESPEICHERTEN AUF, und zwar IMMER: ein Merkposten, den
   * niemand mehr abräumt, ist ein Stand, der zwei Wochen später an einem
   * anderen Turnier wieder auftaucht, sobald an diesem Gerät zufällig
   * dieselbe Partien-Kennung vorkäme — praktisch ausgeschlossen bei UUIDs,
   * aber der Grund, aus dem hier aufgeräumt wird und nicht bloß "meistens".
   */
  function pendingCleanup() {
    if (retryTimer) { clearTimeout(retryTimer); retryTimer = null }
    if (pending) pendingClear(pending.matchId)
    pending = null
    retryAttempt = 0
    offline.value = false
  }

  /**
   * Den nächsten Wiederholungsversuch für den aktuellen Merkposten einplanen.
   *
   * VOR JEDEM VERSUCH DERSELBE ABGLEICH WIE BEI `restoreScore` — UND
   * AUS DEMSELBEN GRUND, jetzt aber auch OHNE dass ein Neuladen dazwischen
   * lag.
   *
   * Bis zum 25.09.2026 fehlte er hier, wörtlich: "Derselbe Auftrag geht
   * unverändert ein weiteres Mal hinaus." Das galt uneingeschränkt — auch
   * dann, wenn während des Ausfalls jemand anderes geschrieben hat. Ein
   * Tablet, das das WLAN verliert und weiterzählt, hält dabei einen Stand
   * fest, der auf dem Server von VOR dem Ausfall aufbaut (`base`); trägt
   * das Turnierbüro in der Zwischenzeit von Hand einen Stand ein, damit die
   * nächste Partie an den Tisch kann, überschreibt der wiederholte Auftrag
   * genau diesen Eintrag, sobald die Verbindung zurück ist — kommentarlos,
   * denn der Auftrag selbst weiss nichts von der Änderung.
   *
   * `current` gegen `entry.base`: stimmen sie nicht mehr überein, hat der
   * Server inzwischen etwas anderes gesehen. Verworfen wird dann, NICHT
   * gesendet — `pendingCleanup` räumt Uhr, Merkposten und
   * `localStorage` dabei schon richtig ab.
   *
   * ERST NACHSCHAUEN, DANN VERGLEICHEN. `match` kommt aus der zuletzt
   * ERFOLGREICH geladenen Tafel und bleibt während eines Ausfalls
   * unverändert stehen — richtig für die Anzeige (siehe `tafelHolen` in
   * [table].vue), aber ohne eigene Alterskennung. Ohne das `await` darunter
   * träfe dieser Versuch das Fenster zwischen "Verbindung ist zurück" und
   * "der Zehn-Sekunden-Takt hat neu geladen" und vergliche gegen den ALTEN
   * Stand — bei vier Sekunden Abstand der ersten beiden Wiederholungen und
   * zehn Sekunden Takt ungefähr in jedem zweiten Fall.
   *
   * Eine Alterskennung in der Tafelantwort wäre der aufwendigere Weg zum
   * selben Ziel. `refresh` genügt, WEIL ES NIE WIRFT: bei einem
   * Netzfehler behält `tafelHolen` den alten Stand, der Abgleich findet
   * folgerichtig nichts, und der Versuch geht hinaus — er scheitert dann
   * ohnehin am selben Netzfehler und plant sich neu ein. Ist die Verbindung
   * dagegen zurück, ist `match` genau jetzt frisch.
   *
   * VERWORFEN WIRD ÜBER `supersedeAll` UND NICHT ÜBER
   * `pendingCleanup`: das räumt zwar Uhr, Merkposten und
   * `localStorage` ab, lässt aber `optimistic` stehen — der Zifferblock
   * zeigte dann weiter den verworfenen Stand, während die Meldung daneben
   * sagt, er sei verworfen. `supersedeAll` räumt den Vorgriff mit,
   * erhöht `latestResponse` (eine verspätete Antwort auf den alten Auftrag
   * greift nicht mehr) und ruft `pendingCleanup` selbst.
   */
  function scheduleRetry() {
    if (retryTimer) clearTimeout(retryTimer)
    const waitTime = NETWORK_RETRY_MS[
      Math.min(retryAttempt, NETWORK_RETRY_MS.length - 1)
    ]!
    retryTimer = setTimeout(async () => {
      retryTimer = null
      const entry = pending
      if (!entry) return
      retryAttempt++

      await refresh()
      // Zwischen dem `await` und hier kann die Partie den Tisch verlassen
      // haben; dann gehoert der Merkposten niemandem mehr.
      if (pending !== entry) return

      const m = match.value
      if (m) {
        const current: ScorePair = { A: rawScore(m, 'A'), B: rawScore(m, 'B') }
        if (current.A !== entry.base.A || current.B !== entry.base.B) {
          report({
            errorCode: 'SCORE_DISCARDED',
            text: 'Score discarded — the tournament office entered a result.',
          })
          supersedeAll()
          return
        }
      }

      // Derselbe Auftrag geht unverändert ein weiteres Mal hinaus — siehe
      // "EIN AUFRUF UND NICHT ZWEI" bei `setScore`. Scheitert er wieder an
      // einem Netzfehler, plant er sich hier selbst erneut ein; scheitert er
      // fachlich, greift `rollback` im Auftrag selbst.
      send({ ...entry.request, onNetworkError: scheduleRetry })
    }, waitTime)
  }

  /**
   * Ein Stand ist an einem Netzfehler gescheitert — hier merken (im
   * Arbeitsspeicher UND in `localStorage`, siehe `StoredScore`) und
   * den ersten Wiederholungsversuch anstossen.
   */
  function pendingSend(matchId: string, request: ScoreRequest, stored: StoredScore) {
    pending = { matchId, request, base: stored.base }
    retryAttempt = 0
    offline.value = true
    pendingSave(matchId, stored)
    scheduleRetry()
  }

  /**
   * BEIM LADEN NACHSEHEN: LIEGT FÜR DIESE PARTIE EIN NICHT ANGEKOMMENER
   * STAND ODER EIN NICHT ANGEKOMMENES ENDE?
   *
   * Aufgerufen aus dem Beobachter auf `match.value?.id` weiter unten —
   * FÜR JEDE Partie, die an diesem Tisch neu erscheint, nicht nur beim
   * allerersten Laden. Ein Gerät, das mitten in einer Partie neu geladen
   * wird (der häufigste Fall: jemand wischt das Tablet), sieht dieselbe
   * Partien-Kennung wie vorher — und `localStorage` hat den Merkposten die
   * ganze Zeit gehalten, auch wenn der Arbeitsspeicher gerade neu
   * aufgesetzt wurde.
   *
   * DER ABGLEICH GEGEN DEN AKTUELLEN SERVERSTAND STEHT BEI DEN BEIDEN
   * WIEDERHERSTELLUNGEN SELBST (`pending`/`result`), NICHT HIER —
   * beide brauchen dafür etwas anderes (einen Stand bzw. gar nichts).
   */
  function pendingRestore(matchId: string) {
    const stored = pendingRead(matchId)
    if (!stored) return
    if (stored.kind === 'result') {
      restoreResult(matchId, stored)
      return
    }
    restoreScore(matchId, stored)
  }

  /**
   * Einen gespeicherten Stand wiederherstellen — oder verwerfen.
   *
   * DER ABGLEICH GEGEN `base`, UND WARUM ER VOR ALLEM ANDEREN STEHT: der
   * gespeicherte Stand ist ABSOLUT (siehe der Kopf der Datei, "score wird
   * ABSOLUT übertragen") — ihn einfach erneut zu schicken, würde JEDE
   * Änderung überschreiben, die seit dem Netzausfall geschehen ist, gleich
   * ob sie von der Turnierleitung kam oder von einem zweiten Gerät. `base`
   * ist der Stand, auf dem dieser Merkposten aufbaute; stimmt er nicht mehr
   * mit dem überein, was der Server JETZT führt, hat sich zwischenzeitlich
   * etwas geändert, von dem dieses Gerät nichts weiß — und dann gilt die
   * Regel dieser ganzen Datei: gezeigt wird, was die Anwendung zuletzt
   * nachweislich führte, nicht, was das Gerät sich zwischendurch gedacht
   * hat. Der Merkposten wird verworfen, NICHT gesendet.
   */
  function restoreScore(matchId: string, stored: StoredScore) {
    const m = match.value
    if (!m) return
    const current: ScorePair = { A: rawScore(m, 'A'), B: rawScore(m, 'B') }
    if (current.A !== stored.base.A || current.B !== stored.base.B) {
      pendingClear(matchId)
      return
    }

    // Die Anzeige sofort wiederherstellen — genau das, was `setScore` beim
    // ersten Tipp auch getan hätte.
    optimistic.value = { ...stored.next }
    if (stored.move) {
      tableStateOptimistic.value = {
        rest: stored.move.tableState.rest,
        fouls: { ...stored.move.tableState.fouls },
        run: { ...stored.move.tableState.run },
        high: { ...stored.move.tableState.high },
      }
      breakOptimistic.value = {
        first: (breakState.value.first ?? stored.move.atTable) as Side,
        next: stored.move.atTable,
        since: Date.now(),
      }
    }

    const request = buildScoreRequest(m, stored.next, stored.undo, stored.move)
    pendingSend(matchId, request, stored)
  }

  /**
   * Der Stand, den die Tafel zeigen soll — in drei Schichten.
   *
   * Der unterwegs befindliche geht vor dem bestätigten, der bestätigte vor
   * dem des Abrufs. Die Reihenfolge ist die der Nähe zum Tisch: ganz oben
   * das, was der Zählende gerade getippt hat.
   */
  /**
   * Der Stand DIESER Seite, so wie ihn `PUT /score` gerade meint — Satzstand
   * mit Satzformat, sonst der gewohnte Aussenstand. Siehe `setFormat`.
   */
  function rawScore(m: Match, side: Side): number {
    return (setFormat.value ? (side === 'A' ? m.sideA.setScore : m.sideB.setScore)
      : (side === 'A' ? m.sideA.score : m.sideB.score)) ?? 0
  }

  const score = computed<ScorePair>(() => {
    if (optimistic.value) return optimistic.value

    const m = match.value
    const raw = { A: m ? rawScore(m, 'A') : 0, B: m ? rawScore(m, 'B') : 0 }
    const own = held.value
    if (!own) return raw
    if (Date.now() - own.since > HOLD_MS) return raw
    return own.score
  })

  /**
   * Hat der Abruf den eigenen Stand eingeholt, wird er losgelassen.
   *
   * Ohne diese Freigabe hinge der Stand die vollen zwanzig Sekunden am
   * eigenen Wert — und eine Änderung aus dem Turnierbüro käme in dieser
   * Zeit nicht durch, obwohl beide längst dasselbe meinen.
   */
  watch(match, (next) => {
    const own = held.value
    if (!own || !next) return
    if (rawScore(next, 'A') === own.score.A && rawScore(next, 'B') === own.score.B) {
      held.value = null
    }
  })

  /**
   * Die letzten Stände, jüngster zuletzt — die Grundlage des
   * Rückgängigmachens.
   *
   * OHNE RÜCKFRAGE, UND DAS IST DER PUNKT: ein Fehltipper vor Publikum muss
   * sich mit einer Bewegung zurücknehmen lassen. Ein Dialog davor hiesse,
   * dass der Zählende in dem Moment, in dem es ihm peinlich ist, zweimal
   * tippen muss.
   *
   * Zwanzig Schritte und nicht mehr: ein Satz im 9-Ball dauert Minuten, und
   * wer zwanzig Eingaben zurückgehen will, hat ein anderes Problem als
   * einen Fehltipper — das gehört ins Turnierbüro.
   */
  const history = ref<Step[]>([])
  const canUndo = computed(() => history.value.length > 0 && !busy.value)

  /* ----------------------------------------------------------------------
   * DIE DISTANZ — DIE EINE GRENZE, UND SIE WIRD HIER GERECHNET
   * ----------------------------------------------------------------------
   *
   * Der Auftraggeber am 16.09.2026, wörtlich: „beim erreichen von race-to
   * ist ende.. fertig". Zwei Sätze stehen darin, und beide stehen hier:
   *
   *   1. DER STAND GEHT NIE ÜBER DIE DISTANZ HINAUS. Was darüber
   *      hinausführte, wird auf die Distanz GEDECKELT (`creditable`).
   *   2. AB DEM ERREICHEN WIRD NICHT MEHR GEZÄHLT. Das sperrt die Leiste
   *      (`distanceReached` → `raceReached` in ScoreBar.vue).
   *
   * WPA 7.4 sagt dasselbe: der Spieler bleibt am Tisch, solange er legal
   * versenkt ODER die erforderliche Punktzahl erreicht und damit gewinnt.
   * Mit der Gewinnkugel hört er auf. Dass der Schiedsrichter die Aufnahme
   * erst NACH ihrem Ende einträgt, ändert daran nichts — die überzähligen
   * Kugeln sind nie gefallen.
   *
   * WARUM BEIDES HIER STEHT UND NICHT IN DER LEISTE. Der Deckel muss an
   * derselben Stelle sitzen wie die Rechnung, die er deckelt: Stand,
   * Restkugeln und Aufnahme werden aus EINER Differenz gerechnet
   * (`enterRest`, `rack`), und wer nur den Stand deckelte, risse die
   * drei auseinander. Und die Leiste braucht dieselbe Zahl, nach der hier
   * gedeckelt wird — zwei Rechnungen für dieselbe Frage laufen auseinander.
   *
   * DIE REGEL SELBST STEHT IN DER DATENBANK
   * (`competition.the_race_blocks_the_count`). Was hier steht, ist die
   * Bequemlichkeit: der Schiedsrichter soll gar nicht erst gegen eine Wand
   * laufen. Ein freigeschaltetes Tablet mit einer Browserkonsole käme an
   * dieser Datei vorbei — an jenem Auslöser nicht.
   * ------------------------------------------------------------------- */

  /**
   * Die Distanz, gegen die JETZT gezaehlt wird. 0 heisst „steht nicht fest".
   *
   * MIT SATZFORMAT IST DAS `setRaceTo` UND NICHT `raceTo` — dieselbe
   * Verschiebung wie bei `score`/`rawScore` und aus demselben Grund: mit
   * Satzformat rechnet `PUT /score` gegen die Racks bzw. Punkte EINES
   * Satzes, nicht gegen die Saetze der ganzen Partie. `raceTo` bliebe hier
   * die AEUSSERE Zahl (z. B. 3 von 5 Saetzen) — eine Deckelung dagegen
   * spraeche schon nach drei Racks von "Distanz erreicht", mitten im ersten
   * Satz eines "race to 5".
   *
   * `extra.value?.raceTo` bleibt nur der Rueckfall OHNE Satzformat: die
   * Verwaltung fuehrt dort keine `setRaceTo` (sie steht schon oeffentlich an
   * der Partie, siehe `Match.setRaceTo`, und braucht keine zweite Quelle).
   */
  const distance = computed(() => setFormat.value
    ? (match.value?.setRaceTo ?? 0)
    : (extra.value?.raceTo ?? match.value?.raceTo ?? 0))

  /**
   * Hat jemand die Distanz erreicht?
   *
   * NICHT `sieger` (in [table].vue) — obwohl der fast dasselbe fragt. Der
   * gibt eine SEITE zurück und ist deshalb leer, wenn BEIDE auf der Distanz
   * stehen; das kommt vor, wenn das Turnierbüro einen Stand setzt. Gefragt
   * ist hier aber nicht „wer hat gewonnen", sondern „ist Schluss", und in
   * der kaputtesten Lage soll erst recht Schluss sein.
   *
   * `>=` und nicht `=`: ein Stand, den das Turnierbüro über die Distanz
   * gesetzt hat, ist auch erreicht.
   */
  const distanceReached = computed(() => distance.value > 0
    && (score.value.A >= distance.value || score.value.B >= distance.value))

  /**
   * Was von `points` einer Seite noch gutgeschrieben werden darf.
   *
   * Beispiel des Auftraggebers: Stand 97 von 100, der Schiedsrichter tippt
   * „Rest 8" — das wären +7. Zurück kommt 3.
   *
   * NUR NACH OBEN. Abwärts ist Berichtigen und nicht Zählen: ein Foul
   * kostet Punkte (WPA 7.7), und ein Stand unter der Distanz braucht keinen
   * Deckel. Ohne Distanz (0) wird nichts angefasst.
   *
   * ES GIBT KEINEN NEGATIVEN RÜCKGABEWERT: steht die Seite schon über der
   * Distanz — vom Turnierbüro gesetzt —, kommt 0 zurück und nicht eine
   * Zahl, die den Stand SENKTE. Ein Deckel richtet nichts; er hält nur an.
   */
  function creditable(side: Side, points: number): number {
    if (points <= 0 || distance.value <= 0) return points
    return Math.max(0, Math.min(points, distance.value - score.value[side]))
  }

  function remember(old: Step) {
    history.value.push(old)
    if (history.value.length > 20) history.value.shift()
  }

  /* ----------------------------------------------------------------------
   * DIE LAGE AM TISCH — DIESELBEN DREI SCHICHTEN WIE DER STAND
   * ------------------------------------------------------------------- */

  /**
   * Die Lage, die noch unterwegs ist, und die zuletzt bestaetigte.
   *
   * Gebaut wie {@link optimistic} und {@link held} beim Stand, und aus
   * demselben Grund: die Restkugeln stehen am Tisch neben dem Stand, und
   * eine Zahl, die zurueckspringt, ist dort dasselbe Aergernis wie ein Stand,
   * der zurueckspringt — nur schlimmer, weil die naechste Aufnahme mit ihr
   * RECHNET. Sprang der Rest von 8 auf 15 zurueck, weil eine ueberholte
   * Antwort eintraf, schriebe der naechste Eintrag dem Spieler sieben Punkte
   * zu viel gut.
   */
  const tableStateOptimistic = ref<TableState | null>(null)
  const tableStateHeld = ref<{ value: TableState, since: number } | null>(null)

  /** Die Lage, die die Tafel zeigen soll — Vorgriff, dann Gehaltenes, dann Abruf. */
  const tableState = computed<TableState>(() => {
    if (tableStateOptimistic.value) return tableStateOptimistic.value

    const raw: TableState = {
      rest: extra.value?.ballsOnTable ?? FULL_RACK,
      fouls: {
        A: extra.value?.fouls?.A ?? 0,
        B: extra.value?.fouls?.B ?? 0,
      },
      run: {
        A: extra.value?.run?.A ?? 0,
        B: extra.value?.run?.B ?? 0,
      },
      high: {
        A: extra.value?.high?.A ?? 0,
        B: extra.value?.high?.B ?? 0,
      },
    }
    const own = tableStateHeld.value
    if (!own) return raw
    if (Date.now() - own.since > HOLD_MS) return raw
    return own.value
  })

  /** Hat der Abruf die eigene Lage eingeholt, wird sie losgelassen — wie beim Stand. */
  watch(extra, (next) => {
    const own = tableStateHeld.value
    if (!own || !next) return
    if ((next.ballsOnTable ?? FULL_RACK) === own.value.rest
      && (next.fouls?.A ?? 0) === own.value.fouls.A
      && (next.fouls?.B ?? 0) === own.value.fouls.B
      /*
       * DIE AUFNAHME GEHÖRT MIT IN DEN VERGLEICH. Wird sie ausgelassen,
       * lässt der Abruf die eigene Lage schon los, sobald Rest und Fouls
       * stimmen — und ein High run, der noch unterwegs war, spränge auf der
       * Tafel zurück, um beim nächsten Abruf wieder zu stehen.
       */
      && (next.run?.A ?? 0) === own.value.run.A
      && (next.run?.B ?? 0) === own.value.run.B
      && (next.high?.A ?? 0) === own.value.high.A
      && (next.high?.B ?? 0) === own.value.high.B) {
      tableStateHeld.value = null
    }
  })

  /* ----------------------------------------------------------------------
   * DIE AUSZEIT-UHR, VORWEGGENOMMEN — UND WARUM SIE NICHT SPRINGT
   * ------------------------------------------------------------------- */

  /**
   * Was hier an einer Auszeit gedrückt wurde, bevor die Anwendung es weiß.
   *
   * `anchor` ist der Zeitpunkt des Drucks und damit der Beginn der Uhr;
   * `null` heisst umgekehrt "diese Auszeit ist beendet", auch wenn der
   * Abruf sie noch führt.
   *
   * ========================================================
   * DIE UHR DARF VOR PUBLIKUM NICHT SPRINGEN — DIE KERNFRAGE
   * ========================================================
   *
   * Bis zum 14.09.2026 wurde die Auszeit mit genau diesem Einwand NICHT
   * vorweggenommen: die Tafel zeige eine Uhr, das Gerät kenne deren Länge
   * nicht, es müsste also eine Restzeit erfinden und sie beim nächsten
   * Abruf korrigieren. Der erste Teil ist inzwischen falsch — die Länge
   * steht in `extra.timeoutSeconds` und kommt aus `tournament.
   * timeout_minutes`, das alle 1 638 Turniere gesetzt haben. Der zweite
   * Teil bleibt richtig und wird hier beantwortet.
   *
   * ZWEI UHREN MIT ZWEI ANKERN. Der eigene Anker ist der Tastendruck; der
   * Anker der Anwendung ist `now()` in `competition.take_timeout`, also der
   * Augenblick, in dem das Paket ankam. Dazwischen liegt der Hinweg der
   * Leitung — bei einer Sekunde Latenz eine halbe. Beide Uhren laufen
   * danach gleich schnell; die Differenz ist ein fester Versatz und geht
   * von selbst NIE weg. Wer beim ersten Abruf auf die Zahl der Anwendung
   * umschaltet, dreht die Uhr also um diesen Versatz ZURÜCK — vor Publikum,
   * mitten in der Auszeit, und danach nie wieder.
   *
   * DESHALB WIRD NICHT UMGESCHALTET. Solange dieser Vorgriff lebt, zeichnet
   * die Tafel ihn und nicht die Restzeit des Abrufs (siehe `auszeiten` in
   * [table].vue). Der Abruf sagt dann nur noch OB die Auszeit läuft, nicht
   * mehr WIE LANGE noch — und genau das ist die Auskunft, die er besser
   * weiss als dieses Gerät.
   *
   * DAS IST AUCH FACHLICH DIE RICHTIGERE ZAHL, nicht nur die ruhigere: eine
   * Auszeit beginnt, wenn der Schiedsrichter drückt, und nicht, wenn das
   * Paket ankommt. Der eigene Anker ist der frühere von beiden — die Uhr
   * läuft also eher zu Lasten dessen, der die Auszeit genommen hat, und die
   * schlechte Leitung im Saal geht nicht auf Kosten seines Gegners.
   *
   * VERWORFEN: den Versatz nachzuziehen (die Uhr für die Dauer der
   * Differenz langsamer laufen zu lassen, bis beide Anker übereinstimmen).
   * Das wäre eine Uhr, die vor Publikum nachweislich falsch geht, um einen
   * Fehler zu verstecken, der kleiner ist als eine Sekunde — und es wäre
   * ein zweiter Zeitbegriff in einer Datei, die schon genug davon hat.
   *
   * VERWORFEN: die Antwort den Beginn nennen zu lassen (`started_at` aus
   * `take_timeout` zurückzugeben) und darauf umzuschalten. Dann stimmten
   * die Anker — und die Uhr spränge trotzdem, nämlich genau einmal, beim
   * Eintreffen der Antwort. Der Versatz verschwindet nicht dadurch, dass
   * man ihn genau kennt.
   */
  interface TimeoutOptimistic {
    /** Wann hier gedrückt wurde. `null` heisst: vorweggenommenes ENDE. */
    anchor: number | null
    /**
     * Hat der Abruf diesen Vorgriff schon eingeholt?
     *
     * Er ist die Bremse gegen das voreilige Loslassen. Ein Abruf, der schon
     * unterwegs war, als hier gedrückt wurde, weiss von der Auszeit nichts
     * — ohne dieses Merkmal gälte sein Schweigen als "die Auszeit ist
     * vorbei", und die Uhr verschwände eine Sekunde nach dem Anlaufen.
     * Losgelassen wird deshalb erst, wenn der Abruf die Auszeit einmal
     * GENANNT hat und sie danach nicht mehr nennt.
     */
    seen: boolean
    /**
     * Wann dieser Vorgriff entstand — die Lunte, nicht die Uhr.
     *
     * `anchor` taugt dafür nicht: beim vorweggenommenen ENDE ist er null,
     * und gerade dort wird die Frist gebraucht.
     */
    since: number
  }

  const timeoutOptimistic = ref<Partial<Record<Side, TimeoutOptimistic>>>({})

  /**
   * Wie lange ein Vorgriff höchstens UNBESTÄTIGT stehen darf.
   *
   * OHNE DIESE FRIST GIBT ES DEN FALL "HÄNGT FÜR IMMER". Ein Vorgriff wird
   * losgelassen, sobald der Abruf ihn einmal genannt und danach nicht mehr
   * genannt hat — was aber, wenn er ihn NIE nennt? Dann bleibt `seen`
   * falsch, und die Regel darüber hält ihn genau deshalb fest.
   *
   * Der Fall ist nicht erfunden. Scheitert ein Schreibvorgang, während
   * schon ein jüngerer unterwegs ist, unterbleibt sein `rollback` —
   * das ist Absicht (siehe `send`, "eine Abweisung, die nicht die
   * jüngste ist, wird verschwiegen"), nimmt dem Vorgriff aber den Weg
   * hinaus. Ohne Frist liefe danach eine Uhr auf der Tafel, die niemand
   * gestartet hat und die auch der nächsten Partie noch gehört.
   *
   * Zwanzig Sekunden, dieselben wie HOLD_MS und aus demselben Grund:
   * die Sendefrist ist nach acht Sekunden vorbei, und danach müssen ZWEI
   * Abrufe Gelegenheit gehabt haben, die Auszeit zu nennen. Läuft sie in
   * der Anwendung wirklich, übernimmt danach deren Uhr — eine Sekunde
   * Versatz ist der richtige Preis dafür, aus diesem Zustand
   * herauszukommen.
   */
  const OPTIMISTIC_HOLD_MS = HOLD_MS

  /**
   * Der Abruf holt den Vorgriff ein — und erst dann wird losgelassen.
   *
   * Zwei Fälle, und sie sind spiegelbildlich:
   *
   *   Vorweggenommener BEGINN (`anchor` gesetzt). Nennt der Abruf die
   *   Auszeit, ist sie angekommen (`seen`). Nennt er sie DANACH nicht
   *   mehr, hat sie jemand beendet — dieses Gerät oder ein anderer —, und
   *   der Vorgriff geht. Die Uhr verschwindet damit, ohne je umgeschaltet
   *   zu haben.
   *
   *   Vorweggenommenes ENDE (`anchor` null). Hier ist es umgekehrt: solange
   *   der Abruf die Auszeit noch führt, wird sie unterdrückt; nennt er sie
   *   nicht mehr, sind beide einig und der Vorgriff wird überflüssig.
   */
  watch(timeoutsRunning, (busy) => {
    const next: Partial<Record<Side, TimeoutOptimistic>> = {}
    for (const side of ['A', 'B'] as Side[]) {
      const v = timeoutOptimistic.value[side]
      if (!v) continue

      // Die Lunte zuerst: was nie bestätigt wurde, geht nach der Frist —
      // gleich, was der Abruf gerade sagt. Siehe OPTIMISTIC_HOLD_MS.
      if (!v.seen && Date.now() - v.since > OPTIMISTIC_HOLD_MS) continue

      if (v.anchor === null) {
        // Vorweggenommenes Ende: fällt weg, sobald der Abruf zustimmt.
        if (busy[side]) next[side] = v
        continue
      }
      if (busy[side]) next[side] = { ...v, seen: true }
      else if (!v.seen) next[side] = v
      // sonst: gesehen und jetzt weg — die Auszeit ist zu Ende.
    }
    timeoutOptimistic.value = next
  }, { deep: true })

  /**
   * Wer anstößt, vorweggenommen — beide Felder, weil beide mitgeschickt
   * werden.
   *
   * Gehalten wie {@link held} beim Stand und aus demselben Grund: ein
   * Abruf, der schon unterwegs war, trägt den alten Anstoß, und ein Balken,
   * der zurückspringt, ist im Saal dasselbe Ärgernis wie eine Zahl, die
   * zurückspringt.
   *
   * Bis zum 15.09.2026 wurde der Anstoß nicht vorweggenommen, mit der
   * Begründung, er hänge an drei Stellen und sei damit ein zweiter
   * Schattenzustand für einen Druck, der einmal je Partie vorkommt. Das
   * stimmte, wog aber leichter als der Befund des Auftraggebers: solange
   * der Balken erst nach Schreiben UND Nachfassen umspringt, sind das bei
   * einer Sekunde Latenz zwei Sekunden, in denen die Tafel behauptet, es
   * stoße noch der andere an. Die drei Stellen lesen jetzt eine einzige
   * Auskunft — diese hier —, und damit ist es kein Schatten mehr, sondern
   * die oberste von zwei Schichten.
   */
  const breakOptimistic = ref<{ first: Side, next: Side, since: number } | null>(null)

  /** Der Anstoß, den die Tafel zeigen soll — Vorgriff vor Abruf. */
  const breakState = computed<{ first: Side | null, next: Side | null }>(() => {
    const v = breakOptimistic.value
    if (v && Date.now() - v.since <= HOLD_MS) return { first: v.first, next: v.next }
    return {
      first: (extra.value?.firstBreak ?? null),
      next: (extra.value?.nextBreak ?? match.value?.nextBreak ?? null) as Side | null,
    }
  })

  /** Hat der Abruf den Anstoß eingeholt, wird er losgelassen — wie beim Stand. */
  watch(extra, (next) => {
    const v = breakOptimistic.value
    if (!v || !next) return
    if (next.firstBreak === v.first && next.nextBreak === v.next) breakOptimistic.value = null
  })

  /**
   * Eine andere Partie am Tisch — alles Vorweggenommene gehört der alten.
   *
   * Die nächste Partie kommt an den Tisch, und ein Vorgriff, der das
   * überlebte, zeigte auf der neuen Tafel eine Uhr für einen Spieler, der
   * nie draussen war, oder einen Anstoß, den niemand ausgelost hat. Die
   * Frist oben finge die Uhr nach zwanzig Sekunden auch ab; zwanzig
   * Sekunden Falschauskunft vor Publikum sind aber genau das, was diese
   * Datei sonst überall vermeidet — und für den Anstoß gibt es gar keine
   * Frist, die es abfinge.
   *
   * Auf die KENNUNG und nicht auf das Objekt: `match` bekommt bei jedem
   * Abruf eine neue Hülle mit demselben Inhalt, und darauf zu horchen
   * hiesse, den Vorgriff alle zehn Sekunden wegzuwerfen.
   *
   * `{ immediate: true }` SEIT DEM 25.09.2026 — vorher lief dieser
   * Beobachter erst bei einem WECHSEL der Partie an diesem Tisch. Für das
   * Wiederherstellen eines Merkpostens nach einem Neuladen (siehe
   * `pendingRestore` unten) muss er aber auch beim ALLERERSTEN
   * Erscheinen einer Partie laufen — genau der Fall bei einem Neuladen,
   * bei dem die Partie dieselbe bleibt. Für den bisherigen Zweck ändert das
   * nichts: beim allerersten Aufruf sind `timeoutOptimistic` & Co. ohnehin
   * schon leer, `pendingCleanup`/`resultCleanup` finden noch
   * nichts zum Abräumen, und `busy` steht schon auf `false`.
   */
  watch(() => match.value?.id ?? null, (next, old) => {
    if (next === old) return
    timeoutOptimistic.value = {}
    breakOptimistic.value = null
    // Die Lage gehoert der alten Partie: ein Rest von 8 auf einer frisch
    // aufgebauten Tafel waere eine Falschauskunft, mit der die erste
    // Aufnahme der neuen Partie sofort falsch rechnete.
    tableStateOptimistic.value = null
    tableStateHeld.value = null
    history.value = []
    // Und ein Merkposten erst recht: er wiederholte sonst einen Stand der
    // alten Partie gegen eine neue, die an diesem Tisch inzwischen steht.
    pendingCleanup()
    // Dasselbe für ein gemerktes Ende — es gehört der Partie, die gerade
    // vom Tisch geht, und nicht der, die an ihre Stelle tritt. `busy`
    // geht mit: ohne diese Zeile bliebe die Leiste der NEUEN Partie
    // gesperrt, wenn die alte den Tisch verliess, während ihr Ende noch auf
    // eine Wiederholung wartete (die Turnierleitung kann eingreifen, auch
    // wenn dieses Gerät gerade offline war).
    resultCleanup()
    busy.value = false

    // Und erst NACH dem Aufräumen nachsehen, ob für DIESE (neue oder erste)
    // Partie ein Merkposten aus einem früheren Neuladen bereitliegt.
    if (next) pendingRestore(next)
  }, { immediate: true })

  /* ----------------------------------------------------------------------
   * DIE REIHENFOLGE DER ANTWORTEN
   * ------------------------------------------------------------------- */

  /**
   * Die Nummer des zuletzt LOSGESCHICKTEN Vorgangs.
   *
   * Sie zählt nur hoch und wird nie zurückgesetzt. `sequence` ist damit
   * gleichbedeutend mit "der jüngste Tastendruck", und das ist die einzige
   * Auskunft, auf die es unten ankommt.
   */
  let sequence = 0

  /** Die höchste Nummer, deren Antwort schon da war. Siehe `send`. */
  let latestResponse = 0

  /**
   * Ein Schreibvorgang, der die Tafel NICHT aufhält.
   *
   * ============================================================
   * ANTWORTEN KOMMEN IN FALSCHER REIHENFOLGE — DIE KERNFRAGE
   * ============================================================
   *
   * Sobald die Fläche nicht mehr sperrt, können mehrere Schreibvorgänge zur
   * selben Partie gleichzeitig unterwegs sein: zweimal schnell "+" sind zwei
   * PUT, und über eine Leitung mit einer Sekunde Latenz überlappen sie sich
   * ganz sicher.
   *
   * DASS SIE SICH ÜBERHOLEN, IST IN DER ANWENDUNG KEIN PROBLEM. Der Endpunkt
   * nimmt den ABSOLUTEN Stand und kein "+1" (siehe den Kommentar in
   * server/api/board/matches/[id]/score.put.ts) — zwei Schreibvorgänge
   * können sich höchstens gegenseitig überschreiben, und der zuletzt
   * geschriebene gewinnt. Das ist richtig so: der jüngste Tastendruck ist
   * der, der zählt.
   *
   * DASS SIE SICH ÜBERHOLEN, IST AUF DER TAFEL SEHR WOHL EIN PROBLEM.
   * Angenommen, zweimal "+" auf 5:
   *
   *     Tipp 1  schickt 6   ---------------------->  Antwort "6"
   *     Tipp 2  schickt 7   ------->  Antwort "7"
   *
   * Die Antwort auf Tipp 2 ist zuerst da; die Tafel steht richtig auf 7.
   * Dann trifft die Antwort auf Tipp 1 ein und sagt "6". Wer sie ungeprüft
   * übernimmt, dreht die Tafel vor Publikum von 7 auf 6 zurück — auf einen
   * Stand, den die Anwendung selbst längst nicht mehr führt. Genau das darf
   * nicht passieren, und darum geht es hier.
   *
   * DIE LÖSUNG: JEDER VORGANG BEKOMMT EINE LAUFENDE NUMMER, UND ZWEI FRAGEN
   * ENTSCHEIDEN ÜBER SEINE ANTWORT.
   *
   *   (a) `n < latestResponse` — eine JÜNGERE Antwort war schon da.
   *       Dann ist diese hier überholt, und zwar restlos: sie beschreibt
   *       einen Stand, über den die Anwendung inzwischen hinweggegangen ist.
   *       Sie wird weggeworfen, ohne Wirkung und ohne Meldung. Das ist die
   *       Antwort auf das Bild oben.
   *
   *   (b) `n === sequence` — es ist nichts JÜNGERES mehr unterwegs.
   *       Nur dann wird die Anzeige festgeschrieben (`optimistic` gelöscht,
   *       das Warten beendet) beziehungsweise bei einer Abweisung
   *       zurückgedreht. Ist noch etwas unterwegs, bleibt die vorweg
   *       genommene Zahl stehen — der jüngere Vorgang trägt den absoluten
   *       Stand und wird gleich selbst entscheiden.
   *
   * DARAUS FOLGT AUCH, WIE MIT EINER ABWEISUNG UMGEGANGEN WIRD, DIE NICHT
   * DIE JÜNGSTE IST: sie wird verschwiegen. Scheitert Tipp 1 an einem
   * Netzaussetzer, während Tipp 2 noch läuft, dann schreibt Tipp 2 die 7 —
   * absolut, den Satz von Tipp 1 eingeschlossen — und in der Anwendung steht
   * am Ende das Richtige. Eine rote Zeile "nicht gesendet" neben einer Zahl,
   * die gleich darauf bestätigt wird, wäre eine Falschmeldung. Scheitert
   * Tipp 2 ebenfalls, meldet ER es, und die Zahl springt dann zurück.
   *
   * VERWORFEN: die Schreibvorgänge in einer Schlange nacheinander
   * abzuarbeiten. Das löst die Reihenfolge auch, kostet aber genau das, was
   * hier gewonnen werden sollte — bei einer Sekunde Latenz und fünf schnellen
   * Tipps wäre der fünfte nach fünf Sekunden beim Server. Und es ist
   * überflüssig: bei einem absoluten Stand ist der jüngste Vorgang der
   * einzige, der noch etwas zu sagen hat. Die anderen sind Ballast, und
   * Ballast schickt man nicht, man wirft ihn weg.
   *
   * VERWORFEN: die Antwort nach ihrem INHALT zu beurteilen ("nimm nur den
   * höheren Stand"). Das ginge beim Hochzählen gut und beim Zurücknehmen,
   * beim Aufheben eines Fehltippers und bei einer Korrektur aus dem
   * Turnierbüro schief — eine 6, die auf eine 7 folgt, ist nicht per se
   * falsch. Die Reihenfolge ist die Frage, also wird die Reihenfolge
   * gezählt und nicht der Inhalt geraten.
   */
  function send<T>(request: {
    run: () => Promise<T>
    /** Die Antwort, wenn sie nicht überholt ist — auch wenn Jüngeres läuft. */
    onArrived?: (summary: T) => void
    /** Was die Anzeige zurückdreht, wenn DIESER Vorgang der jüngste ist und scheitert. */
    rollback?: () => void
    /**
     * Danach die Tafel neu holen.
     *
     * NUR dort, wo die Antwort die Wirkung nicht zeigt — siehe `takeTimeout`
     * und `setBreaker`. Beim Stand wäre es verschenkte Zeit: die Antwort des
     * Endpunkts NENNT den Stand, den die Anwendung führt.
     */
    refreshAfter?: boolean
    /**
     * Was bei einem NETZFEHLER geschehen soll, statt der Anwendungsabweisung
     * darunter — nur gesetzt, wo ein Netzausfall überbrückt werden soll
     * (siehe `pending`/`setScore`, "DER NETZFEHLER" weiter oben). Bleibt
     * dieses Feld leer, läuft ein Netzfehler durch denselben Zweig wie jede
     * fachliche Abweisung: Anzeige zurück, rote Zeile, fertig. `send`
     * selbst unterscheidet nicht mehr als das — WAS wiederholt wird und WIE
     * lange, entscheidet allein der Aufrufer.
     */
    onNetworkError?: () => void
  }) {
    const n = ++sequence
    report(null)
    beginWaiting()

    request.run().then(
      (summary) => {
        if (n < latestResponse) return
        latestResponse = n
        request.onArrived?.(summary)
        if (n !== sequence) return
        optimistic.value = null
        tableStateOptimistic.value = null
        endWaiting()
        /*
         * Ohne `await` und mit Absicht: der Abruf ist eine Auffrischung und
         * keine Bedingung. Wer darauf wartete, hätte den zweiten und dritten
         * Umlauf wieder im Tastendruck — das war der Fehler, der hier gerade
         * behoben wurde. Schlägt er fehl, holt der Zehn-Sekunden-Takt es
         * nach; deshalb auch kein `catch`, `holen` schluckt selbst.
         */
        if (request.refreshAfter) void refresh()
      },
      (raw: unknown) => {
        if (n < latestResponse) return
        latestResponse = n
        if (n !== sequence) return
        /*
         * NETZFEHLER UND NICHT FACHLICH, UND DER AUFRUFER WILL WIEDERHOLEN.
         * Die Anzeige bleibt unangetastet stehen: kein Zurückdrehen, keine
         * rote Zeile, kein `endWaiting` — sie zeigt weiter den vorgemerkten
         * Stand, bis entweder die Wiederholung durchkommt (dann läuft die
         * Antwort oben durch den ERFOLGS-Zweig) oder die Anwendung ihn
         * irgendwann tatsächlich ablehnt (dann greift der Zweig darunter).
         */
        if (request.onNetworkError && isNetworkError(raw)) {
          request.onNetworkError()
          return
        }
        reject(raw)
        request.rollback?.()
        optimistic.value = null
        tableStateOptimistic.value = null
        endWaiting()
      },
    )
  }

  /**
   * Alles, was noch unterwegs ist, gilt ab jetzt als überholt.
   *
   * Gebraucht, wenn eine Partie endet: eine Antwort auf einen Punkt, die
   * eine Sekunde nach dem Endergebnis eintrifft, hätte sonst noch eine Zahl
   * auf eine Tafel geschrieben, über die bereits abgerechnet wurde.
   *
   * DER MERKPOSTEN GEHT DABEI MIT WEG. Ein Stand, der auf eine Wiederholung
   * wartet, gehört der Partie, die gerade endet — würde er trotzdem
   * irgendwann nachgeholt, schriebe er auf ein Ergebnis, über das die
   * Anwendung schon abgerechnet hat.
   */
  function supersedeAll() {
    latestResponse = ++sequence
    optimistic.value = null
    tableStateOptimistic.value = null
    endWaiting()
    pendingCleanup()
  }

  /**
   * Ein Schreibvorgang, der die Tafel ANHÄLT — für die beiden, bei denen das
   * richtig ist.
   *
   * Er wartet die Antwort ab, sperrt solange die ganze Leiste und holt
   * danach die Tafel neu. Das ist teuer, und deshalb gehen nur `finish` und
   * `giveUp` hier durch: sie melden ein Ergebnis, reichen den Turnierbaum
   * weiter und lassen sich nicht zurücknehmen. Siehe DRITTENS im Kopf.
   */
  async function write<T>(run: () => Promise<T>): Promise<T | null> {
    if (busy.value) return null
    busy.value = true
    report(null)
    try {
      const summary = await run()
      await refresh()
      return summary
    }
    catch (raw: unknown) {
      reject(raw)
      return null
    }
    finally {
      busy.value = false
    }
  }

  /**
   * Ein neuer Stand — auf der Tafel sofort, in der Anwendung gleich.
   *
   * @param rememberOld ob der bisherige Stand in den Verlauf soll (bei
   *   {@link performUndo} nicht, sonst liefe man im Kreis)
   * @param alsoRollback was neben dem Verlauf noch zurückzunehmen ist,
   *   falls dieser Vorgang der jüngste ist und scheitert
   * @param undo ob dieser Stand am Tisch ZURÜCKGENOMMEN wird — die
   *   Taste "Undo" und das Minus je Seite. Es ist keine Angabe über den
   *   Stand, sondern über die Bedienung, und sie geht mit auf die Reise:
   *   die Anwendung sieht sonst nur, dass eine Zahl kleiner wurde, und ein
   *   Vertipper sähe im Verlauf aus wie eine Richtigstellung aus dem
   *   Turnierbüro. Siehe `competition.score_writes_its_history`.
   */
  function setScore(next: ScorePair, rememberOld = true, alsoRollback?: () => void,
                  undo = false, move?: StraightPoolMove) {
    const m = match.value
    if (!m) return
    const old = currentStep(move?.foulKind)

    /*
     * EIN NEUER TIPP ERSETZT EINEN ETWA NOCH AUSSTEHENDEN MERKPOSTEN — er
     * reiht sich nicht dahinter (siehe "DER NETZFEHLER" weiter oben). Der
     * alte Versuch trägt ohnehin einen überholten Stand; ihn jetzt noch
     * nachzuholen, könnte den Stand, den DIESER Tipp gleich schickt, später
     * wieder überschreiben.
     */
    pendingCleanup()

    /*
     * ZUERST DIE ANZEIGE, DANN DAS NETZ — und in dieser Reihenfolge steht
     * die ganze Änderung. Ab hier liest der nächste Tastendruck (`count`)
     * bereits den neuen Wert, und deshalb ergeben zwei schnelle "+" zwei
     * Sätze und nicht einen.
     */
    optimistic.value = { ...next }
    /*
     * DIE LAGE GEHT MIT DEMSELBEN TASTENDRUCK LOS — und zwar sofort, wie der
     * Stand. Wer „Rack" drückt, sieht die Restkugeln im selben Augenblick auf
     * 15 springen; kommt der Schreibvorgang nicht durch, springen Stand UND
     * Rest zusammen zurück.
     *
     * WER AM TISCH IST, GEHT ÜBER `breakOptimistic` und nicht über ein
     * eigenes Feld. Das ist dieselbe Auskunft, die die Tafel oben schon
     * zeichnet (siehe `breakState`) — ein zweites Feld daneben wäre ein
     * zweiter Schattenzustand, und die beiden liefen früher oder später
     * auseinander.
     */
    if (move) {
      tableStateOptimistic.value = {
        rest: move.tableState.rest,
        fouls: { ...move.tableState.fouls },
        run: { ...move.tableState.run },
        high: { ...move.tableState.high },
      }
      breakOptimistic.value = {
        first: (breakState.value.first ?? move.atTable) as Side,
        next: move.atTable,
        since: Date.now(),
      }
    }
    if (rememberOld) remember(old)

    const request = buildScoreRequest(m, next, undo, move, () => {
      if (rememberOld) history.value.pop()
      alsoRollback?.()
    })

    send({
      ...request,
      // Nur der Stand wiederholt sich selbst bei einem Netzfehler — siehe
      // "NUR DIE PUNKTE" bei `pending` weiter oben.
      onNetworkError: () => pendingSend(
        m.id, request, { kind: 'score', base: old.score, next, undo, move }),
    })
  }

  /**
   * Der Rumpf von `PUT /score` und was mit seiner Antwort geschieht — EINMAL
   * GEBAUT UND ZWEIMAL GEBRAUCHT: beim ersten Tipp (`setScore`) UND beim
   * Wiederherstellen eines gespeicherten Merkpostens nach einem Neuladen
   * (`restoreScore`). Ein Inline-Objekt in `setScore` liesse sich für
   * den zweiten Fall nicht aufheben, denn dort gibt es kein `setScore`, das es
   * bauen könnte — nur einen gespeicherten `StoredScore`.
   *
   * @param alsoRollback was NEBEN dem Merkposten noch zurückzunehmen
   *   ist, wenn dieser Vorgang der jüngste ist und fachlich scheitert — beim
   *   ersten Tipp der Verlauf, beim Wiederherstellen nichts (siehe dort).
   */
  function buildScoreRequest(
    m: Match, next: ScorePair, undo: boolean, move: StraightPoolMove | undefined,
    alsoRollback: () => void = () => {},
  ): ScoreRequest {
    return {
      run: () => $fetch<ScoreResponse>(
        `/api/board/matches/${m.id}/score`,
        {
          method: 'PUT',
          body: {
            scoreA: next.A, scoreB: next.B, undo: undo,
            /*
             * EIN AUFRUF UND NICHT ZWEI. Punkte, Restkugeln, Foulzähler und
             * der Tisch gehören zu demselben Stoss; zwei Umläufe wären zwei
             * Wartezeiten für einen Tastendruck — und der zweite könnte
             * ausbleiben. Ein halber Zustand (Punkte gebucht, Rest nicht) ist
             * am Tisch schlimmer als gar keiner.
             */
            ...(move
              ? {
                  ballsOnTable: move.tableState.rest,
                  foulsA: move.tableState.fouls.A,
                  foulsB: move.tableState.fouls.B,
                  /*
                   * BEIDE SEITEN UND BEIDE ZAHLEN, jedes Mal. Nur EINE Seite
                   * zu schicken wäre zwar meist richtig — es ist immer nur
                   * einer am Tisch —, aber beim Rückgängig stimmt es nicht:
                   * ein zurückgenommener Tischwechsel setzt die Aufnahme des
                   * einen zurück UND die des anderen auf null. Absolut
                   * heisst absolut, und das ist die ganze Bauart hier.
                   */
                  runA: move.tableState.run.A,
                  highA: move.tableState.high.A,
                  runB: move.tableState.run.B,
                  highB: move.tableState.high.B,
                  atTable: move.atTable,
                  ...(move.foulKind ? { foul: move.foulKind } : {}),
                }
              : {}),
          },
          timeout: SEND_DEADLINE_MS,
        },
      ),
      // Der Stand der ANTWORT und nicht der geschickte: die Anwendung ist die
      // Stelle, die ihn festhält, und sie darf ihn anders auslegen.
      onArrived: (response) => {
        // Angekommen heisst: ein etwa noch offener Merkposten hat sich
        // erledigt — gleich, ob es der erste Versuch war oder eine
        // Wiederholung nach einem Netzausfall.
        pendingCleanup()
        held.value = { score: { A: response.scoreA, B: response.scoreB }, since: Date.now() }
        // Dieselbe Regel für die Lage — und nur, wenn die Antwort sie führt.
        // Eine Satzpartie bekommt hier nichts zurück und soll auch nichts
        // festhalten.
        if (move && response.ballsOnTable !== null && response.ballsOnTable !== undefined) {
          tableStateHeld.value = {
            value: {
              rest: response.ballsOnTable,
              fouls: { A: response.foulsA ?? 0, B: response.foulsB ?? 0 },
              run: { A: response.runA ?? 0, B: response.runB ?? 0 },
              high: { A: response.highA ?? 0, B: response.highB ?? 0 },
            },
            since: Date.now(),
          }
        }
      },
      /*
       * Zurückgedreht wird auf `held`, also auf den letzten bestätigten
       * Stand — nicht auf den Stand vor DIESEM Tipp. Bei mehreren Tipps
       * hintereinander ist das derselbe Wert; bei einem Tipp, dessen
       * Vorgänger noch unterwegs war, ist es der richtigere: gezeigt wird,
       * was die Anwendung zuletzt nachweislich führte, und nicht, was das
       * Gerät sich zwischendurch gedacht hat.
       *
       * NUR HIER, BEI DER FACHLICHEN ABWEISUNG — nicht beim Netzfehler
       * (siehe `onNetworkError` in `setScore`/`restoreScore`): der wird
       * gemerkt und wiederholt statt zurückgedreht, und räumt den
       * Merkposten deshalb nicht hier auf, sondern erst in `onArrived`
       * oder wenn diese Zeile hier doch noch erreicht wird.
       */
      rollback: () => {
        pendingCleanup()
        alsoRollback()
      },
    }
  }

  /**
   * Ein Satz mehr oder weniger für eine Seite.
   *
   * EIN SCHRITT NACH UNTEN IST EINE RÜCKNAHME UND KEINE KORREKTUR. Am Tisch
   * gibt es genau zwei Wege abwärts — diesen und die Taste "Undo" —, und
   * beide heissen dasselbe: der Tipp davor war falsch. Wer sie verschieden
   * zeichnete, zeichnete nicht den Vorgang, sondern den Zufall, ob das
   * Tablet zwischendurch neu geladen wurde (der Undo-Stapel lebt nur im
   * Browser). Der Zifferblock zählt nur aufwärts — `blockOpen` wird an
   * allen vier Stellen mit Vorzeichen +1 geöffnet.
   */
  function count(side: Side, step: number) {
    const now = score.value
    /*
     * UNTEN BEI NULL — AUSSER IM STRAIGHT POOL.
     *
     * Sonst gibt es keinen Stand unter null, und die Sperre verhindert einen
     * Vertipper, den niemand will. Bei 14.1 endlos gibt es ihn sehr wohl: WPA 7.7 sagt es ausdrücklich, ein Standardfoul kostet einen
     * Punkt, das dritte hintereinander sechzehn. Eine Sperre bei null machte
     * hier aus einer Richtigstellung nach unten eine, die nichts tut.
     */
    /*
     * OBEN AUF DER DISTANZ — DIE ZWEITE GRENZE UND DIE JÜNGERE.
     *
     * `creditable` deckelt, was über die Distanz hinausführte: aus einem
     * Zifferblock-Eintrag „+7" bei 97 von 100 werden 3. Für das einzelne
     * `+1` der Satzfassung ist das meist ein Nullgeschäft — die Sperre in
     * der Leiste kommt ihm zuvor —, und genau deshalb steht es hier und
     * nicht dort: der Zifferblock (`+ N`) trägt eine ganze Aufnahme ein,
     * und der kommt an derselben Zeile vorbei.
     *
     * NUR AUFWÄRTS, siehe `creditable`. Ein negativer Schritt geht
     * unverändert durch — abwärts ist Berichtigen.
     */
    const raw = now[side] + creditable(side, step)
    const next = {
      ...now,
      [side]: straightPool.value ? raw : Math.max(0, raw),
    } as ScorePair
    if (next.A === now.A && next.B === now.B) return
    setScore(next, true, undefined, step < 0)
  }

  /* ----------------------------------------------------------------------
   * 14.1 ENDLOS — DIE VIER VORGAENGE AM TISCH
   *
   * SIE RECHNEN ALLE MIT DEM VORHERIGEN REST UND NIE MIT FESTEN FUENFZEHN.
   * Der Auftraggeber beschreibt den Normalfall — „grundsaetzlich sind immer
   * 15 kugeln auf dem tisch.. 15 - 8 = 7" —, und der stimmt genau einmal je
   * Rack: beim ersten Eintrag danach. Mitten in einer Aufnahme liegen weniger
   * als 15, und „15 minus Rest" schriebe dem Spieler dann Kugeln gut, die
   * schon der Eintrag davor gezaehlt hat.
   *
   * SIE SCHREIBEN IMMER DEM ZU, DER AM TISCH WAR — `breakState.next`, also
   * der Zustand VOR diesem Tastendruck. Wer danach dran ist, steht in
   * demselben Aufruf mit drin.
   * ------------------------------------------------------------------- */

  /** Wer gerade am Tisch ist. Null heisst: der Anstoss steht noch aus. */
  const atTable = computed<Side | null>(() => breakState.value.next)

  /** Der ganze Zustand, so wie er JETZT gilt — die Vorlage fuer den Verlauf. */
  function currentStep(foulKind?: 'STANDARD' | 'BREAK' | 'THIRD'): Step {
    return {
      score: { ...score.value },
      tableState: {
        rest: tableState.value.rest,
        fouls: { ...tableState.value.fouls },
        run: { ...tableState.value.run },
        high: { ...tableState.value.high },
      },
      atTable: atTable.value,
      ...(foulKind ? { foulKind } : {}),
    }
  }

  /** Die andere Seite. */
  function otherSide(side: Side): Side {
    return side === 'A' ? 'B' : 'A'
  }

  /**
   * DIE AUFNAHME FORTSCHREIBEN — die eine Stelle, an der sie gerechnet wird.
   *
   * Alle fünf Vorgänge am Tisch gehen hier durch, und deshalb gibt es die
   * Funktion: die Aufnahme ist ein Zustand über MEHRERE Tastendrücke hinweg
   * (ein Lauf von 40 sind leicht vier Racks und ein Dutzend Eingaben), und
   * jede Stelle, die sie für sich selbst rechnete, wäre eine Stelle, an der
   * sie auseinanderlaufen kann.
   *
   * @param side Wer am Tisch WAR — ihm gehört die Aufnahme.
   * @param points Wie viele Kugeln er auf diesem Vorgang legal versenkt hat.
   * @param stays Ob er am Tisch bleibt. Nur das Rack lässt die Aufnahme
   *   weiterlaufen (WPA 7.4); alles andere gibt den Tisch weg und beendet
   *   sie.
   *
   * FOULS MINDERN SIE NICHT, SIE BEENDEN SIE. WPA 7.7 zieht die Strafpunkte
   * vom STAND ab („Fouls are penalized by subtracting points from the
   * offending player's score") und sagt über die Aufnahme nichts — sie ist
   * die Folge LEGAL VERSENKTER Kugeln, und ein Foul versenkt keine. Wer 30
   * macht und dann foult, hat einen High run von 30 und einen Stand von 29.
   * Die Fouls kommen deshalb mit `points: 0` hier durch und nicht mit −1.
   *
   * DER HIGH RUN WÄCHST MIT DER LAUFENDEN und nicht erst an ihrem Ende. Wer
   * mitten im Lauf über seinen bisherigen Höchstwert steigt, soll ihn auch
   * dann steigen sehen, wenn die Aufnahme noch weitergeht — und beim
   * Rückgängig steht der alte Wert in demselben Schritt, der ihn gehoben hat.
   * Die Prüfbedingung `match_slot_runs` schreibt dieselbe Ordnung fest.
   */
  function continueRun(side: Side, points: number, stays: boolean):
  { run: ScorePair, high: ScorePair } {
    const now = tableState.value
    const total = now.run[side] + points
    return {
      run: { ...now.run, [side]: stays ? total : 0 } as ScorePair,
      high: {
        ...now.high,
        [side]: Math.max(now.high[side], total),
      } as ScorePair,
    }
  }

  /**
   * DER FEHLSTOSS: der Schiedsrichter traegt ein, WIE VIELE KUGELN NOCH
   * LIEGEN.
   *
   * Der Auftraggeber: „das man ueber einen button immer nur die rest menge an
   * kugeln auf dem tisch angibt und das system kann daraus selbst immer
   * errechnen, wieviele baelle jemand gemacht hat.. statt das die spieler
   * selber zaehlen muessen".
   *
   * Punkte = vorheriger Rest − neuer Rest. Sie gehen an den, der am Tisch
   * WAR; danach ist der Gegner dran (WPA 7.4: der Spieler bleibt nur, solange
   * er legal versenkt).
   *
   * BLEIBT HOECHSTENS EINE KUGEL LIEGEN, IST DAS RACK VOLL. Vierzehn versenkt
   * heisst neu aufbauen (7.4), und die fuenfzehnte bleibt als Breakball
   * liegen — danach liegen wieder 15. Dass der Spieler dabei trotzdem GEHT,
   * ist der Unterschied zu {@link rack}: er hat die letzte Kugel nicht
   * versenkt, sondern den Stoss verfehlt.
   *
   * JEDER LEGALE STOSS BEENDET DIE FOULFOLGE (WPA 3.13). Ein Fehlstoss ist
   * kein Foul; der Zaehler der Seite geht auf null.
   */
  function enterRest(remaining: number) {
    const side = atTable.value
    if (!side) return
    const now = tableState.value
    if (remaining < 0 || remaining > now.rest) return

    /*
     * GEDECKELT, UND ZWAR HIER — VOR STAND, REST UND AUFNAHME.
     *
     * Der Auftraggeber: Stand 97 von 100, „Rest 8" wären +7 — verbucht
     * werden 3. Weil alle drei Zahlen aus DIESER einen Differenz gerechnet
     * werden, stimmen sie danach zusammen: der Stand steht auf 100, die
     * Aufnahme wächst um 3 und nicht um 7, und der High run mit ihr. Ein
     * Deckel weiter unten — etwa nur auf dem Stand — risse sie auseinander.
     *
     * DIE RESTKUGELN BLEIBEN, WAS DER SCHIEDSRICHTER GESEHEN HAT. Acht
     * liegen, also stehen acht da. Das ist keine Ungenauigkeit, sondern der
     * Tisch: die Partie ist aus, und die Kugeln liegen trotzdem. Ein Undo
     * führt sauber zurück — es legt den GANZEN Schritt wieder hin (Stand,
     * Lage, wer am Tisch war) und nicht eine nachgerechnete Fassung davon.
     */
    const points = creditable(side, now.rest - remaining)
    setScore(
      { ...score.value, [side]: score.value[side] + points } as ScorePair,
      true, undefined, false,
      {
        tableState: {
          rest: remaining <= 1 ? FULL_RACK : remaining,
          fouls: { ...now.fouls, [side]: 0 } as ScorePair,
          // Der Fehlstoss beendet die Aufnahme — die Kugeln DIESES Stosses
          // zaehlen noch zu ihr, der Tisch geht danach weg.
          ...continueRun(side, points, false),
        },
        atTable: otherSide(side),
      },
    )
  }

  /**
   * DAS RACK IST AUSGESPIELT — und der Spieler bleibt am Tisch.
   *
   * Der Auftraggeber: „spielt der spieler alle kugeln bis auf die letzte weg
   * .. gibt es einen button 'rack' das waere dann das was noch an kugeln da
   * waren - 1 = punkte die dazu kommen und der spieler bleibt weiter dran".
   * Genau so steht es in WPA 7.4.
   *
   * @param alsoFifteenth Die fuenfzehnte fiel auf demselben Stoss, der
   *   die vierzehnte erzielte (WPA 7.8 a). Dann zaehlen ALLE verbliebenen
   *   Kugeln, und alle fuenfzehn werden neu aufgebaut. Das ist der Grund,
   *   warum „0 uebrig" ein gueltiger Fall sein muss und nicht nur „1".
   *
   * Danach liegen in beiden Faellen 15: einmal vierzehn im Dreieck plus der
   * Breakball, einmal fuenfzehn neu aufgebaute.
   */
  function rack(alsoFifteenth = false) {
    const side = atTable.value
    if (!side) return
    const now = tableState.value
    // Gedeckelt wie beim Fehlstoss und aus demselben Grund: Stand,
    // Restkugeln und Aufnahme kommen aus dieser einen Zahl.
    const points = creditable(side,
                             Math.max(0, now.rest - (alsoFifteenth ? 0 : 1)))

    setScore(
      { ...score.value, [side]: score.value[side] + points } as ScorePair,
      true, undefined, false,
      {
        tableState: {
          rest: FULL_RACK,
          fouls: { ...now.fouls, [side]: 0 } as ScorePair,
          // DIE AUFNAHME LAEUFT WEITER — das Rack ist der EINZIGE Vorgang
          // mit `bleibt: true`, und genau deshalb gibt es im Straight Pool
          // Laeufe ueber hundert Punkte (WPA 7.4).
          ...continueRun(side, points, true),
        },
        // ER BLEIBT. Das ist der ganze Unterschied zum Fehlstoss, und der
        // Grund, aus dem der Knopf ueberhaupt eigens dasteht.
        atTable: side,
      },
    )
  }

  /**
   * DIE ANGESAGTE SAFETY (WPA 7.5) — der Zug endet ohne Punkte.
   *
   * Eine dabei versenkte Kugel wird aufgesetzt, der Rest bleibt also, wie er
   * war. Eine Safety ist KEIN Foul und unterbricht die Foulfolge.
   *
   * SIE STEHT NEBEN DER KUGELREIHE UND NICHT IN IHR, obwohl sie rechnerisch
   * „Rest unveraendert" heisst: die Reihe geht bis 14, und die haeufigste
   * Safety ist die aus vollem Rack heraus, also bei 15. Ohne diesen Knopf
   * waere ausgerechnet der Normalfall nicht einzutragen.
   */
  function safety() {
    const side = atTable.value
    if (!side) return
    const now = tableState.value
    setScore(
      { ...score.value }, true, undefined, false,
      {
        tableState: {
          rest: now.rest,
          fouls: { ...now.fouls, [side]: 0 } as ScorePair,
          // Keine Punkte, aber der Tisch geht weg: die Aufnahme ist zu Ende.
          ...continueRun(side, 0, false),
        },
        atTable: otherSide(side),
      },
    )
  }

  /**
   * DAS FOUL (WPA 7.9 bis 7.11) — DREI GRIFFE UND NICHT ZWEI.
   *
   * @param kind Was am Tisch passiert ist:
   *
   *   `STANDARD`      Das gewoehnliche Foul (7.9): ein Punkt Abzug, der
   *                   Gegner kommt an den Tisch, der Foulzaehler steigt.
   *   `BREAK_AGAIN`   Foul beim Eroeffnungsstoss (7.3 b), und der Gegner
   *                   schickt den Anstossenden NOCHMAL: zwei Punkte Abzug,
   *                   er BLEIBT am Tisch, alle fuenfzehn stehen wieder.
   *   `BREAK_ACCEPT`  Foul beim Eroeffnungsstoss, und der Gegner NIMMT DIE
   *                   LAGE AN: zwei Punkte Abzug, der Tisch geht an ihn,
   *                   die Kugeln bleiben liegen, wie sie liegen.
   *
   * WARUM DAS BREAK-FOUL ZWEI GRIFFE BRAUCHT
   *
   * WPA 7.3 (b) gibt dem nicht anstossenden Spieler die Wahl: „The
   * non-breaking player may accept the balls in position or may require the
   * breaker to play another opening break shot, until he satisfies the
   * requirements for an opening break or the non-shooting player accepts the
   * table in position." Beide Ausgaenge kosten dem Anstossenden zwei Punkte
   * (7.10), und sie unterscheiden sich NUR darin, wer danach am Tisch steht.
   * Bis zum 16.09.2026 kannte dieses Geraet nur den zweiten; der erste liess
   * sich nur nachstellen, indem man hinterher „Switch" drueckte — zwei
   * Eintraege fuer einen Stoss, und ein Rueckgaengig nahm davon die Haelfte.
   *
   * WAS BEI DER WIEDERHOLUNG MIT DEN KUGELN GESCHIEHT
   *
   * Es wird neu aufgebaut, und danach stehen wieder fuenfzehn. Zwei Regeln
   * zusammen: 7.6 setzt alle auf Fouls versenkten Kugeln wieder auf, und 7.2
   * baut fuer einen Eroeffnungsstoss alle fuenfzehn ins Dreieck (die
   * vierzehn ohne Apexkugel gelten nur beim Neuaufbau MITTEN in einer
   * Aufnahme). Ein neuer Eroeffnungsstoss ist wieder ein Eroeffnungsstoss —
   * deshalb steht `rest` hier ausdruecklich auf {@link FULL_RACK} und
   * nicht auf dem, was vorher lag.
   *
   * KEIN BREAK-FOUL ZAEHLT FUER DIE DREIERFOLGE — AUCH DAS FUENFTE NICHT
   *
   * WPA 7.11 sagt es in einem Satz: „For 3.13 Three Consecutive Fouls, only
   * standard fouls are counted, so a breaking foul does not count as one of
   * the three fouls." Es gibt dort keine Ausnahme und keine Obergrenze. Wer
   * fuenfmal hintereinander den Anstoss verfehlt, hat zehn Punkte verloren
   * und steht auf NULL Fouls; die Fuenfzehn-Punkte-Strafe aus 7.11 kann ihn
   * ueber diesen Weg nie treffen. Der Foulzaehler bleibt deshalb bei BEIDEN
   * Break-Griffen unberuehrt — und genau hier wird sich spaeter jemand
   * vertun wollen, weil „fuenf Fouls hintereinander" nach Strafe klingt.
   *
   * DAS DRITTE STANDARDFOUL HINTEREINANDER IST DER TEURE FALL (7.11): der
   * Punkt wird wie immer abgezogen, DAZU kommen weitere fuenfzehn, der
   * Zaehler geht auf null, alle fuenfzehn Kugeln werden neu aufgebaut — und
   * der Suender bleibt am Tisch, denn er muss unter den Bedingungen des
   * Eroeffnungsstosses spielen. Sechzehn Punkte auf einen Schlag, und das ist
   * der Grund, aus dem der Zaehler vorher sichtbar sein muss.
   *
   * DER STAND DARF DABEI UNTER NULL GEHEN (7.7). Weder diese Stelle noch die
   * Durchreiche noch die Spalte begrenzen ihn nach unten auf null.
   *
   * JEDES FOUL BEENDET DIE AUFNAHME, KEINES MINDERT SIE — siehe
   * {@link continueRun}. Auch das dritte Standardfoul, bei dem der Suender am
   * Tisch BLEIBT: eine Aufnahme ist die Folge legal versenkter Kugeln, und
   * die ist mit dem Foul gerissen.
   */
  function foul(kind: FoulKind = 'STANDARD') {
    const side = atTable.value
    if (!side) return
    const now = tableState.value

    if (kind === 'BREAK_AGAIN' || kind === 'BREAK_ACCEPT') {
      const again = kind === 'BREAK_AGAIN'
      setScore(
        { ...score.value, [side]: score.value[side] - 2 } as ScorePair,
        true, undefined, false,
        {
          tableState: {
            // Wiederholung: neu aufgebaut, also wieder fuenfzehn (7.2/7.6).
            // Annahme: die Lage bleibt genau so liegen, wie sie liegt.
            rest: again ? FULL_RACK : now.rest,
            // UNBERUEHRT — 7.11, und zwar bei jedem Fehlversuch.
            fouls: { ...now.fouls },
            ...continueRun(side, 0, false),
          },
          // DER EINZIGE UNTERSCHIED ZWISCHEN DEN BEIDEN GRIFFEN.
          atTable: again ? side : otherSide(side),
          foulKind: 'BREAK',
        },
      )
      return
    }

    const streak = now.fouls[side] + 1
    const third = streak >= 3
    setScore(
      { ...score.value, [side]: score.value[side] - (third ? 16 : 1) } as ScorePair,
      true, undefined, false,
      {
        tableState: {
          rest: third ? FULL_RACK : now.rest,
          fouls: { ...now.fouls, [side]: third ? 0 : streak } as ScorePair,
          ...continueRun(side, 0, false),
        },
        atTable: third ? side : otherSide(side),
        foulKind: third ? 'THIRD' : 'STANDARD',
      },
    )
  }

  /**
   * DER TISCH WECHSELT VON HAND — die Richtigstellung, die keine Regel ist.
   *
   * Wer sich vertippt hat, hat den Tisch beim Falschen. Punkte, Restkugeln
   * und Foulzaehler bleiben unberuehrt — das ist der Unterschied zu allem
   * darueber.
   *
   * NICHT MEHR DER WEG FUER DAS BREAK-FOUL. Bis zum 16.09.2026 stand hier,
   * er sei auch dafuer da, „nach einem Foul beim Eroeffnungsstoss darf der
   * Gegner den Stoss zurueckgeben (7.3)" — das ist seit `BREAK_AGAIN` ein
   * eigener Griff, und zwar mit Grund: zwei Eintraege fuer einen Stoss
   * lassen sich nicht mit EINEM Undo zuruecknehmen.
   *
   * DIE AUFNAHME ENDET TROTZDEM. Der Tisch geht weg, also ist sie zu Ende —
   * auch wenn dieser Griff nur eine Richtigstellung ist. Wer den Tisch
   * versehentlich weitergegeben hat, nimmt das mit „Undo" zurueck und nicht
   * damit, dass der Lauf heimlich stehenbleibt.
   */
  function switchTable() {
    const side = atTable.value
    if (!side) return
    const now = tableState.value
    setScore({ ...score.value }, true, undefined, false,
           {
             tableState: {
               rest: now.rest,
               fouls: { ...now.fouls },
               ...continueRun(side, 0, false),
             },
             atTable: otherSide(side),
           })
  }

  /**
   * Zurück auf den Stand von vorher.
   *
   * Der Anstoß kommt dabei von selbst mit: `competition.break_after` rechnet
   * ihn bei den Wechselregeln aus der Summe beider Stände aus, und die ist
   * nach dem Zurücknehmen wieder die alte. Bei der Regel WINNER stimmt er
   * nicht — dafür bräuchte die Anwendung, wer den letzten Satz gewonnen hat,
   * und das steht nirgends. GEMELDET; heute benutzt kein Turnier diese Regel.
   *
   * Der Schritt wird SOFORT aus dem Verlauf genommen und bei einer Abweisung
   * wieder hineingelegt. Vorher wurde er erst nach der Antwort entfernt
   * (`if (!error.value)`) — das ging nur, solange auf die Antwort gewartet
   * wurde, und hätte ohne dieses Warten den Fehltipper zweimal zurückgenommen.
   */
  function performUndo() {
    const old = history.value[history.value.length - 1]
    if (!old) return
    history.value.pop()
    /*
     * IM STRAIGHT POOL GEHT DIE GANZE LAGE MIT ZURÜCK — Restkugeln,
     * Foulzähler und der Tisch. Ohne sie nähme das Undo nur die Punkte
     * zurück und liesse den Rest stehen, und die nächste Aufnahme rechnete
     * mit einer Zahl, die zu einem Stand gehört, den es nicht mehr gibt.
     *
     * `old.atTable` kann nur dann fehlen, wenn der Schritt vor dem ersten
     * Anstoss entstanden ist — dann gibt es auch nichts zurückzugeben.
     */
    setScore(old.score, false, () => history.value.push(old), true,
           straightPool.value && old.atTable
             ? { tableState: old.tableState, atTable: old.atTable, foulKind: old.foulKind }
             : undefined)
  }

  /**
   * Wer anstößt.
   *
   * Steht noch gar nichts fest, werden beide Felder gesetzt — wer beginnt,
   * stößt auch den ersten Satz an. Später nur noch der nächste Anstoß, und
   * dafür MUSS der erste mitgeschickt werden: `competition.set_break`
   * schreibt immer beide, und ein leeres `first_break` nähme der Partie die
   * Vorbedingung, ohne die kein Stand mehr angenommen wird.
   *
   * VORWEGGENOMMEN SEIT DEM 15.09.2026 — siehe `breakOptimistic`, wo die
   * Abwägung gegen den früheren Einwand steht. Nachgefasst wird weiter: die
   * Wirkung steht nicht in der Antwort, und der Vorgriff soll so kurz wie
   * möglich der einzige Zeuge sein.
   */
  function setBreaker(side: Side) {
    const m = match.value
    if (!m) return
    const first = (breakState.value.first ?? side) as Side
    const before = breakOptimistic.value

    // Zuerst die Anzeige, dann das Netz — dieselbe Reihenfolge wie in
    // `setScore`, und aus demselben Grund: der Balken springt sofort um.
    breakOptimistic.value = { first: first, next: side, since: Date.now() }

    send({
      run: () => $fetch<{ firstBreak: string, nextBreak: string }>(
        `/api/board/matches/${m.id}/break`, {
          method: 'PUT',
          body: { firstBreak: first, nextBreak: side },
          timeout: SEND_DEADLINE_MS,
        }),
      // Zurück auf den Stand VOR diesem Druck und nicht auf null: war schon
      // etwas vorgemerkt, das der Abruf noch nicht bestätigt hat, wäre null
      // ein Sprung auf eine Auskunft, die älter ist als beide.
      rollback: () => { breakOptimistic.value = before },
      refreshAfter: true,
    })
  }

  /**
   * Auszeit — nehmen oder beenden, je nachdem, was gerade gilt.
   *
   * Welcher der beiden Vorgänge es ist, entscheidet die Durchreiche und
   * nicht diese Stelle: hier wäre die Grundlage der Abruf von vor bis zu
   * zehn Sekunden.
   *
   * DER AUFTRAGGEBER NENNT SIE AUSDRÜCKLICH ("time-out starten oder
   * stoppen"), UND SEIT DEM 15.09.2026 WIRD SIE VORWEGGENOMMEN. Die Uhr
   * läuft mit dem Tastendruck an und hört mit ihm auf; die Antwort
   * korrigiert sie höchstens, und wie das ohne Springen abgeht, steht bei
   * `timeoutOptimistic`.
   *
   * Der Einwand von gestern ("das Gerät kennt die Länge nicht") ist nicht
   * weggewischt, sondern erledigt: die Länge steht jetzt in
   * `extra.timeoutSeconds`. Fehlt sie doch einmal, wird der BEGINN nicht
   * vorweggenommen — eine Uhr ohne Länge wäre eine erfundene Restzeit, und
   * das war der Einwand zu Recht. Das ENDE braucht keine Länge und wird
   * darum immer vorweggenommen.
   */
  function takeTimeout(side: Side, running: boolean) {
    const m = match.value
    if (!m) return

    const before = timeoutOptimistic.value[side]
    const duration = extra.value?.timeoutSeconds ?? null

    if (running) {
      timeoutOptimistic.value = {
        ...timeoutOptimistic.value, [side]: { anchor: null, seen: false, since: Date.now() },
      }
    }
    else if (duration !== null) {
      timeoutOptimistic.value = {
        ...timeoutOptimistic.value, [side]: { anchor: Date.now(), seen: false, since: Date.now() },
      }
    }

    send({
      run: () => $fetch<{
        side?: string, taken?: number, status?: string, withdrawn?: boolean
      }>(
        `/api/board/matches/${m.id}/timeout`, {
          method: 'POST',
          body: { side: side, running },
          timeout: SEND_DEADLINE_MS,
        }),
      /*
       * Abgewiesen heisst: die Uhr gehört weg beziehungsweise wieder her.
       * Das ist der Fall TIMEOUTS_USED_UP — die Fläche sagt "keine mehr
       * übrig", und eine Uhr, die daneben weiterliefe, wäre die
       * schlimmere Falschmeldung von beiden.
       */
      rollback: () => { setTimeoutOptimistic(side, before) },
      refreshAfter: true,
    })
  }

  /** Einen Vorgriff setzen oder entfernen — an einer Stelle, für drei Aufrufer. */
  function setTimeoutOptimistic(side: Side, value: TimeoutOptimistic | undefined) {
    const next = { ...timeoutOptimistic.value }
    if (value) next[side] = value
    else delete next[side]
    timeoutOptimistic.value = next
  }

  /**
   * DIE AUSZEIT ZURÜCKNEHMEN — der Weg des Schiedsrichtermenüs.
   *
   * NICHT {@link takeTimeout}, und das ist seit dem 15.09.2026 der ganze Punkt.
   * Bis dahin rief der Menüpunkt schlicht `takeTimeout(side, true)` auf, also
   * genau denselben Weg wie ein zweites Antippen an der Zählleiste — und
   * damit lief er in dessen Zehn-Sekunden-Frist. Der Auftraggeber: "wenn
   * ich ueber das schiri menue das timeout zurueck setze, wird es dem
   * spieler nicht mehr gutgeschrieben". Nach zehn Sekunden BEENDETE der
   * Menüpunkt die Auszeit, gab sie aber nicht zurück; der Name log.
   *
   * Die Frist bleibt an der ZÄHLLEISTE, wo sie hingehört: dort tippt jemand
   * daneben und merkt es sofort. Hier steht "die falsche Seite hat die
   * Auszeit bekommen", und das fällt oft erst nach einer halben Minute auf.
   *
   * DIE SECHS ZIFFERN GEHEN MIT, und zwar erst seit dieser Änderung. Die
   * Rücknahme stand auf der unteren Ebene (Tafelfreigabe genügt), und das
   * war richtig, SOLANGE sie dasselbe tat wie die Zählleiste eine Handbreit
   * tiefer — ein Code auf einen Weg, den jeder umsonst daneben findet, wäre
   * Theater gewesen. Eine Rücknahme, die IMMER gutschreibt, kann die
   * Zählleiste aber nicht mehr, und ein Spieler, der den Weg ins Menü
   * kennt, könnte sich sonst Auszeiten nachlegen. Also derselbe Personencode
   * wie bei No-Show und Forfeit; entschieden wird es am Server.
   *
   * VORWEGGENOMMEN WIE DAS ENDE, obwohl ein Code dabei ist. Die Uhr
   * verschwindet sofort und kommt bei einer Abweisung zurück — dieselbe
   * Abwägung wie beim Stand, und der häufigste Grund für eine Abweisung
   * (vertippte Ziffern) erreicht die Leitung gar nicht erst: die Rückfrage
   * gibt sechs Ziffern nicht heraus, bevor es sechs sind.
   */
  function withdrawTimeout(side: Side, code = '') {
    const m = match.value
    if (!m) return

    const before = timeoutOptimistic.value[side]
    timeoutOptimistic.value = {
      ...timeoutOptimistic.value, [side]: { anchor: null, seen: false, since: Date.now() },
    }

    send({
      run: () => $fetch<{
        side?: string, taken?: number, status?: string, withdrawn?: boolean
      }>(
        `/api/board/matches/${m.id}/timeout/withdraw`, {
          method: 'POST',
          body: { side: side, ...(code === '' ? {} : { boardPin: code }) },
          timeout: SEND_DEADLINE_MS,
        }),
      rollback: () => { setTimeoutOptimistic(side, before) },
      // Das Guthaben steht in `extra.timeoutsTaken` und nicht in der
      // Anzeige dieser Datei — ohne Nachfassen bliebe im Menü "2 taken"
      // stehen, obwohl die Rücknahme längst durch ist.
      refreshAfter: true,
    })
  }

  /* ----------------------------------------------------------------------
   * DAS ENDE, WENN ES AN EINEM NETZFEHLER SCHEITERT
   * ----------------------------------------------------------------------
   *
   * Der Auftraggeber, präzisiert am 25.09.2026: "eine Partie ohne WiFi am
   * Tablet zu Ende spielen können, exkl. Schiri-Eingriffe". Zu Ende SPIELEN
   * schliesst das ABSCHLIESSEN ein — ohne `finish`/`giveUp` bliebe die
   * Partie auf "läuft" stehen und blockierte den Tisch, und genau das soll
   * dieser ganze Umbau verhindern.
   *
   * DIE BEGRÜNDUNG ÜBER `finish`, WARUM ES NICHT VORWEGGENOMMEN WIRD (siehe
   * DRITTENS im Kopf der Datei), BLEIBT UNVERÄNDERT RICHTIG: die Fläche darf
   * nicht sofort "fertig" behaupten und es eine Sekunde später doch nicht
   * sein. Sie sagt NICHT, dass ein Netzfehler nicht überbrückt werden dürfe
   * — sie sagt nur, dass die Anzeige dabei nicht vorgreifen darf. Deshalb
   * bleiben `finish` und `giveUp` ABWARTEND: sie laufen weiter über
   * `busy` und sperren die Leiste, solange ein Versuch — der erste oder
   * eine Wiederholung — unterwegs ist oder auf seine Wiederholung wartet.
   *
   * FACHLICH GENAUSO WIE BEIM STAND: eine Abweisung mit einer Fachkennung
   * (etwa RACE_NOT_REACHED, weil das Turnierbüro inzwischen selbst
   * eingegriffen hat) wird gezeigt und NICHT wiederholt. Nur ein Netzfehler
   * — keine Verbindung, eine Zeitüberschreitung, 502/503/504 — wird gemerkt
   * (`result`) und mit denselben wachsenden Abständen erneut versucht wie
   * ein Stand (`NETWORK_RETRY_MS`, siehe dort für die Begründung gegen
   * `navigator.onLine`).
   *
   * DIE TAFEL SAGT DABEI AUSDRÜCKLICH NICHT "FINISHED". Es gibt hier keinen
   * Vorgriff — anders als beim Stand ist der ganze Sinn dieser Route, dass
   * die Anwendung selbst entscheidet, ob die Partie zu Ende ist (siehe
   * "KEIN RUMPF, UND KEIN SIEGER IM AUFRUF" unten). `resultPending`
   * ist deshalb nur eine Auskunft — "das Ergebnis liegt hier bereit, die
   * Anwendung hat es noch nicht gesehen" — und keine Behauptung, dass es
   * schon gilt.
   *
   * EIN GEMERKTES ERGEBNIS ERSETZT EINEN GEMERKTEN STAND, NICHT UMGEKEHRT.
   * `giveUp` schickt scoreA/scoreB selbst mit (siehe dort) — ein noch
   * offener Punkt-Merkposten wäre in dem Moment nur eine überflüssige
   * zweite Wahrheit über denselben Stand und wird deshalb VOR dem Versuch
   * aufgeräumt. `finish` dagegen trägt gar keinen Stand im Aufruf
   * (`competition.confirm_match_result` liest ihn aus der Datenbank) — ein
   * zu diesem Zeitpunkt noch offener Punkt-Merkposten bliebe hier unberührt
   * und liefe unabhängig weiter; das ist der eine Fall, den dieser Umbau
   * NICHT auflöst (siehe die Meldung am Ende des Auftrags).
   *
   * ÜBERSTEHT EBENFALLS EIN NEULADEN — genau wie der Stand (siehe
   * `StoredPending` am Kopf der Datei): am selben Schlüssel liegt
   * hier `{ kind: 'result', ... }`, und `pendingRestore` liest ihn
   * genauso aus wie einen Stand.
   */

  function resultCleanup() {
    if (resultTimer) { clearTimeout(resultTimer); resultTimer = null }
    if (result) pendingClear(result.matchId)
    result = null
    resultAttempt = 0
    resultPending.value = false
  }

  /** Einen Versuch unternehmen — den ersten oder eine Wiederholung. */
  async function tryResult() {
    const entry = result
    if (!entry) return
    try {
      await entry.run()
      await refresh()
      // Was zu Ende ist, wird nicht mehr zurückgenommen — und ein Verlauf,
      // der auf eine beendete Partie zeigt, wäre eine Falle.
      history.value = []
      held.value = null
      tableStateHeld.value = null
      supersedeAll()
      resultCleanup()
      busy.value = false
    }
    catch (raw: unknown) {
      if (isNetworkError(raw) && entry.stored) {
        // Erst HIER abgelegt und nicht schon in `writeFinish`: ein
        // Ende, das beim ersten Versuch sofort durchgeht (der häufigste
        // Fall, solange das Netz steht), soll gar nicht erst in
        // `localStorage` stehen — dort gehört nur, was WIRKLICH noch
        // aussteht.
        pendingSave(entry.matchId, entry.stored)
        resultPending.value = true
        scheduleResultRetry()
        // `busy` bleibt WAHR — die Leiste bleibt gesperrt, bis entweder
        // die Wiederholung durchkommt oder die Anwendung doch noch fachlich
        // ablehnt. Das ist dieselbe Abwägung wie beim ersten Versuch: eine
        // Fläche, die zwischendurch wieder "geht", behauptete ein Ende, das
        // gerade nicht feststeht.
        return
      }
      reject(raw)
      resultCleanup()
      busy.value = false
    }
  }

  function scheduleResultRetry() {
    if (resultTimer) clearTimeout(resultTimer)
    const waitTime = NETWORK_RETRY_MS[
      Math.min(resultAttempt, NETWORK_RETRY_MS.length - 1)
    ]!
    resultTimer = setTimeout(() => {
      resultTimer = null
      if (!result) return
      resultAttempt++
      void tryResult()
    }, waitTime)
  }

  /**
   * Der abwartende Weg für `finish`/`giveUp` — dieselbe Sperre wie
   * `write`, aber mit der Netzwiederholung von oben statt einer
   * endgültigen Abweisung.
   */
  async function writeFinish(
    matchId: string,
    run: () => Promise<{ advanced: number, newlySettled: number }>,
    /**
     * Was bei einem Netzfehler gemerkt wird -- oder `undefined`, wenn
     * dieser Vorgang NICHT nachgeholt werden darf.
     *
     * Das ist der Fall bei einem kampflosen Ende mit Personencode: ihn zu
     * merken hiesse, ihn zu speichern, und ein Code, der eine
     * Disqualifikation deckt, gehoert nicht in den `localStorage` eines
     * Tablets, das in einer Halle herumliegt. Siehe die Begruendung bei
     * `giveUp`.
     */
    stored?: StoredResult,
  ) {
    if (busy.value) return
    busy.value = true
    report(null)
    result = { matchId, run, stored }
    await tryResult()
  }

  /**
   * Ein gespeichertes Ende nach einem Neuladen wiederherstellen.
   *
   * KEIN ABGLEICH BEI `confirm` — der Aufruf trägt keinen Stand, die
   * Anwendung liest ihn selbst aus der Datenbank (siehe die Begründung vor
   * `finish`); es gibt hier nichts, das veralten könnte.
   *
   * BEI `result` DERSELBE ABGLEICH WIE BEIM STAND (`restoreScore`):
   * `base` ist der Stand, auf dem `body.scoreA`/`scoreB` beruhen. Führt
   * der Server inzwischen einen anderen, hat sich seit dem Netzausfall
   * etwas geändert, von dem dieses Gerät nichts weiß — verworfen statt
   * gesendet, aus demselben Grund. `base` ist `null` bei WALKOVER: dort
   * ist der Rumpf immer 0:0, unabhängig vom tatsächlichen Stand, und es
   * gibt nichts, wogegen sich das abgleichen ließe.
   */
  function restoreResult(matchId: string, stored: StoredResult) {
    const m = match.value
    if (!m) return

    if (stored.path === 'result' && stored.base) {
      const current: ScorePair = { A: rawScore(m, 'A'), B: rawScore(m, 'B') }
      if (current.A !== stored.base.A || current.B !== stored.base.B) {
        pendingClear(matchId)
        return
      }
    }

    const run = () => stored.path === 'confirm'
      ? $fetch<{ advanced: number, newlySettled: number }>(
          `/api/board/matches/${m.id}/confirm`, { method: 'POST', timeout: SEND_DEADLINE_MS })
      : $fetch<{ advanced: number, newlySettled: number }>(
          `/api/board/matches/${m.id}/result`, {
            method: 'POST', body: stored.body, timeout: SEND_DEADLINE_MS,
          })

    // Die Leiste bleibt gesperrt, genau wie beim ersten Versuch vor dem
    // Neuladen — siehe die Begründung im Kopf dieses Abschnitts.
    busy.value = true
    result = { matchId, run, stored }
    resultPending.value = true
    scheduleResultRetry()
  }

  /**
   * Die Partie ist zu Ende — BESTÄTIGT, nicht gemeldet.
   *
   * KEIN RUMPF, UND KEIN SIEGER IM AUFRUF. Das ist seit dem 15.09.2026 der
   * ganze Unterschied, und er ist der Grund für diese Route.
   *
   * Vorher ging dieser Weg über `/result` und schickte `winner`, `scoreA`
   * und `scoreB` mit. Solange nur die Turnierleitung zählte, war das
   * richtig. Seit die Spieler selbst bestätigen dürfen — der Auftraggeber:
   * "die spieler selbst duerfen beim erreichen von race-to das finish
   * bedienen. um damit zu bestaetigen, das das summary so richtig ist" —
   * war es eine offene Tür: bei 3:5 schickt einer mit der Browserkonsole
   * `{winner:'A',scoreA:9}` und hat gewonnen.
   *
   * `competition.confirm_match_result` liest den Stand aus der Datenbank,
   * hält ihn gegen `race_to` und leitet den Sieger selbst ab. Was nicht
   * übergeben wird, lässt sich nicht fälschen.
   *
   * Der Parameter `sieger` ist deshalb WEG. Er stünde sonst da und sähe aus
   * wie eine Angabe, auf die es ankommt — und der nächste, der ihn sieht,
   * schickt ihn wieder mit.
   */
  async function finish() {
    const m = match.value
    if (!m) return
    await writeFinish(
      m.id,
      () => $fetch<{ advanced: number, newlySettled: number }>(
        `/api/board/matches/${m.id}/confirm`, {
          method: 'POST',
          timeout: SEND_DEADLINE_MS,
        }),
      { kind: 'result', path: 'confirm', base: null },
    )
  }

  /**
   * Die Partie endet, OHNE dass gespielt wurde — oder ohne dass zu Ende
   * gespielt wurde.
   *
   * Derselbe Weg wie {@link finish}, und das ist die Entscheidung: ein Ende
   * ist ein Ende, und `report_match_result` ist die Stelle, die den Sieger
   * weiterreicht und die Plätze abrechnet. Ein eigener Endpunkt für die
   * Aufgabe hätte dieselbe Arbeit ein zweites Mal beschrieben — und die
   * zweite Beschreibung ist die, die man beim nächsten Umbau vergisst.
   *
   * DER STAND UNTERSCHEIDET DIE BEIDEN FÄLLE:
   *
   *   WALKOVER  0:0. Es ist nicht gespielt worden, also gibt es nichts zu
   *             zeigen. Ein "9:0" stünde für neun Sätze, die niemand
   *             gespielt hat, und wäre in jeder Statistik eine Lüge.
   *   FORFEIT   Der Stand, der auf der Tafel steht. Er ist erspielt, und er
   *             bleibt — die Partie ist an dieser Stelle abgebrochen worden
   *             und nicht rückwirkend nicht gespielt.
   *
   * Der Sieger ist in beiden Fällen der ANDERE; wer aufgibt, wird
   * übergeben, und die Umkehrung passiert hier und nicht in der Leiste:
   * am Gerät wird auf den Namen dessen getippt, der geht.
   *
   * DIE SECHS ZIFFERN GEHEN MIT
   *
   * Beide Fälle verkürzen ein Turnier, und beide sieht nur, wer daneben
   * steht. Der Auftraggeber: "aber auch wieder nur ueber einen code
   * abgesichert.. so das nicht spieler die wissen wie man ins menue kommt,
   * dann selbst". Der Code ersetzt in der Rückfrage den bestätigenden Knopf
   * — er kommt nicht zu ihm hinzu, und das Menü selbst bleibt offen: den
   * VERLAUF anzusehen geht keinen etwas an. Der Tischwechsel stand hier
   * lange daneben; er trägt seit dem 16.09.2026 selbst sechs Ziffern, weil
   * er dem Saal die Tafel nimmt.
   *
   * Leer, wenn jemand angemeldet ist: wer ausgewiesen ist, weist sich nicht
   * zweimal aus. Entschieden wird das nicht hier, sondern am Server — er
   * sieht am Keks, ob ein Mensch handelt.
   */
  async function giveUp(side: Side, kind: 'NO_SHOW' | 'FORFEIT', code = '') {
    const m = match.value
    if (!m) return
    const opponent: Side = side === 'A' ? 'B' : 'A'
    const walkover = kind === 'NO_SHOW'
    const points = walkover ? { A: 0, B: 0 } : score.value

    /*
     * EIN GEMERKTES ERGEBNIS ERSETZT EINEN GEMERKTEN STAND — dieser Aufruf
     * trägt scoreA/scoreB absolut mit (`points`, oben aus `score.value`
     * entnommen). Ein noch offener Punkt-Merkposten würde denselben Stand
     * nur ein zweites Mal und überflüssig hinterherschicken, siehe "DER
     * NETZFEHLER" bei `setScore` und die Begründung vor `finish`.
     */
    pendingCleanup()

    const body = {
      winner: opponent,
      scoreA: points.A,
      scoreB: points.B,
      resolution: (walkover ? 'WALKOVER' : 'FORFEIT') as 'WALKOVER' | 'FORFEIT',
      ...(code === '' ? {} : { boardPin: code }),
    }

    /*
     * EIN KAMPFLOSES ENDE WIRD NICHT GEMERKT, WENN EIN PERSONENCODE DARAN
     * HÄNGT — korrigiert am 25.09.2026, noch am Tag des Einbaus.
     *
     * Ein gemerkter Vorgang muss beim Wiederholen alles mitbringen, was er
     * beim ersten Mal hatte. Für `boardPin` hiesse das: der Personencode
     * liegt für die Dauer des Netzausfalls im `localStorage` eines
     * Tablets, das in einer Halle auf einem Tisch liegt und das jeder
     * anfassen kann. Ein Code, der eine Disqualifikation deckt, gehört
     * nicht in einen Speicher, den die Entwicklerwerkzeuge jedes Browsers
     * in zwei Klicks zeigen.
     *
     * Der Auftraggeber hat die Grenze selbst gezogen: „schiri eingriffe
     * und so, können 'nicht verfügbar' sein". Ein Walkover und ein
     * Forfeit sind genau das — sie verlangen einen Ausweis, und wer
     * keinen vorzeigen kann, weil die Leitung weg ist, wartet. Was
     * weiterlaufen muss, sind die PUNKTE, und die brauchen keinen Code.
     *
     * OHNE Personencode (der Regelfall am Tisch: das Gerät handelt unter
     * einer Freigabe, die für diese Art Meldung reicht) wird das Ende
     * gemerkt wie jedes andere.
     */
    const asHuman = code !== ''

    await writeFinish(
      m.id,
      () => $fetch<{ advanced: number, newlySettled: number }>(
        `/api/board/matches/${m.id}/result`, {
          method: 'POST',
          body: body,
          timeout: SEND_DEADLINE_MS,
        }),
      /*
       * `base` NUR BEI FORFEIT — bei WALKOVER steht im Rumpf immer 0:0
       * (siehe oben), unabhängig vom tatsächlichen Stand, und ein Abgleich
       * dagegen wäre keiner. Siehe `restoreResult`.
       */
      asHuman
        ? undefined
        : { kind: 'result', path: 'result', body, base: walkover ? null : { ...points } },
    )
  }

  /**
   * Der Schiedsrichter nimmt die angeordnete Shot-Clock zur Kenntnis.
   *
   * DANACH ZÄHLT DIE TAFEL WIEDER. Vorher nicht: die Datenbank weist jeden
   * steigenden Stand ab, der über ein Gerät am Tisch kommt
   * (`competition.shot_clock_blocks_the_count`). Das ist der Zweck der
   * ganzen Sache — eine Anordnung, die man wegwischen kann, wird
   * weggewischt; eine, die die Partie anhält, wird gelesen.
   *
   * KEIN EIGENER VORGRIFF. Punkte und Auszeiten nimmt dieses Gerät vorweg,
   * weil die Zahl auf der Tafel vor Publikum nicht springen darf. Hier gibt
   * es nichts vorwegzunehmen: die Meldung verschwindet, wenn der nächste
   * Abruf `acknowledgedAt` mitbringt, und bis dahin — höchstens zehn
   * Sekunden — steht sie eben noch da. Ein Vorgriff, der sich bei einem
   * Fehlschlag zurückdrehen müsste, hieße hier: die Sperre sieht kurz
   * aufgehoben aus, und der nächste Punkt wird trotzdem abgewiesen. Das
   * wäre schlechter als warten.
   *
   * ZWEIMAL TIPPEN IST KEIN FEHLER. `competition.acknowledge_shot_clock`
   * tut beim zweiten Mal nichts und schreibt auch nichts in den Verlauf.
   */
  async function acknowledgeShotClock() {
    const m = match.value
    if (!m) return
    await write(() => $fetch<{ acknowledgedAt: string }>(
      `/api/board/matches/${m.id}/shot-clock/acknowledge`, {
        method: 'POST',
        timeout: SEND_DEADLINE_MS,
      }))
  }

  /**
   * Die Zeitlimit-Uhr von Hand anhalten oder fortsetzen — der Griff des
   * Schiedsrichters zwischen zwei Racks (Heyball).
   *
   * DER GANZE ZUSTAND AUF EINMAL UND ABSOLUT, dieselbe Haltung wie
   * `count`/`setScore`: `running` ist der Zustand, den die Uhr danach haben
   * soll, keine Veränderung. Beide Richtungen sind idempotent — der Server
   * lässt eine schon laufende Uhr bei `running: true` unangetastet, eine
   * schon stehende bei `running: false`.
   *
   * KEIN VORGRIFF UND KEINE RÜCKFRAGE. Anders als beim Stand darf die Uhr
   * am Gerät kurz hinter dem Server herlaufen — sie wird eh nur einmal je
   * Sekunde gelesen und steht nicht selbst unter Publikum wie eine Punktzahl.
   * Und anders als `finish`/`giveUp` ist dieser Griff vollständig
   * umkehrbar und wird oft gebraucht, nach jedem Rack (siehe der Kopf der
   * Datei, aus der das Zeitlimit stammt) — eine Rückfrage bei jedem
   * Neuaufbau wäre die Bremse, die der Schiedsrichter am wenigsten braucht.
   */
  async function setTimeLimitRunning(running: boolean) {
    const m = match.value
    if (!m) return
    await write(() => $fetch<{ running: boolean }>(
      `/api/board/matches/${m.id}/time-limit/running`, {
        method: 'PUT',
        body: { running: running },
        timeout: SEND_DEADLINE_MS,
      }))
  }

  /**
   * Die Partie ist zu Ende — die Uhr und nicht die Distanz hat sie beendet
   * (Heyball: "race to 7 ODER 100 Minuten, was zuerst eintritt").
   *
   * Das Geschwister von `finish`: derselbe Weg (schreibend, ohne
   * Rücknahme, `supersedeAll` danach), ein anderer Endpunkt.
   * `shootoutWinner` geht nur mit, wenn die Tafel unentschieden steht — wer
   * ihn ruft, weiss das am Stand, den diese Tafel ohnehin führt
   * (`score`/`points` im Schiedsrichtermenü); die Datenbank prüft ihn
   * trotzdem noch einmal gegen den tatsächlichen Gleichstand und weist ihn
   * sonst ab.
   */
  async function finishTimeLimit(shootoutWinner?: Side) {
    const m = match.value
    if (!m) return
    const summary = await write(() => $fetch<{ advanced: number, newlySettled: number }>(
      `/api/board/matches/${m.id}/confirm-time-limit`, {
        method: 'POST',
        body: shootoutWinner ? { shootoutWinner } : {},
        timeout: SEND_DEADLINE_MS,
      }))
    if (summary === null) return
    history.value = []
    held.value = null
    tableStateHeld.value = null
    supersedeAll()
  }

  /**
   * DER SATZ (BZW. FRAME) IST ZU ENDE — POOL: OHNE GEWINNER, SNOOKER: MIT.
   *
   * `POST /confirm-set` OHNE Rumpf: die Verwaltung leitet den Satzgewinner
   * aus `set_score` gegen `setRaceTo` ab — "best of 5, je race to 5". MIT
   * `winner`: der genannte Gewinner gilt, `setRaceTo` wird nicht befragt und
   * darf `null` sein — das ist Snooker, ein Frame endet nicht an einer Zahl.
   * Siehe die Begruendung an `confirm-set.post.ts`.
   *
   * MASSGEBLICH IST `matchFinished`, NICHT DER RUECKGABEWERT VON
   * `write` ALLEIN: `summary` ist nur dann `null`, wenn der Aufruf gar
   * nicht durchging (abgewiesen oder schon ein anderer Vorgang unterwegs) —
   * in dem Fall bleibt hier alles stehen, wie es war.
   *
   * AUFGERAEUMT WIRD IN BEIDEN FAELLEN, OB DIE PARTIE ENDET ODER NICHT.
   * Anders als bei `finish`/`finishTimeLimit`, wo die Partie IMMER zu Ende
   * ist, endet hier haeufiger nur der SATZ: `set_score` steht danach
   * serverseitig wieder auf 0:0, der Anstoss ist gedreht. Ein `held`,
   * das noch den alten Satzstand traegt (z. B. 5:3), wuerde vom naechsten
   * Abruf NIE eingeholt — der Abruf liefert ja 0:0 — und stuende bis zu
   * HOLD_MS ueber dem frischen Satz. Derselbe Grund gilt fuer den
   * Verlauf: ein "Undo" nach dem Satzende darf nicht versuchen, einen Satz
   * zurueckzudrehen, den die Verwaltung bereits abgeschlossen und verworfen
   * hat.
   */
  async function finishSet(winner?: Side) {
    const m = match.value
    if (!m) return null
    const summary = await write(() => $fetch<{
      advanced: number, newlySettled: number, matchFinished: boolean
    }>(`/api/board/matches/${m.id}/confirm-set`, {
      method: 'POST',
      body: winner ? { winner } : {},
      timeout: SEND_DEADLINE_MS,
    }))
    if (summary === null) return null
    history.value = []
    held.value = null
    tableStateHeld.value = null
    supersedeAll()
    return summary
  }

  return {
    busy, error, score, canUndo, unconfirmed,
    /**
     * Wartet ein Stand auf eine Wiederholung, weil das Netz ausgefallen war?
     *
     * ANDERS ALS `unconfirmed` IST DAS DIE AUSKUNFT FÜR DEN LANGEN AUSFALL
     * — die Tafel zeigt sie dauerhaft, nicht nur für einen Wimpernschlag.
     * Siehe die Begründung bei `offline` weiter oben und die Verwendung
     * in [table].vue.
     */
    offline,
    /**
     * Liegt ein Ende (`finish`/`giveUp`) bereit, das an einem Netzfehler
     * gescheitert ist und auf seine Wiederholung wartet?
     *
     * Die Tafel sagt dabei ausdrücklich NICHT "finished" — siehe die
     * Begründung vor `finish` — sondern nur, dass ein Ergebnis hier liegt
     * und noch hinaus muss.
     */
    resultPending,
    /**
     * Ist Schluss? Die Auskunft, nach der die Leiste ihre Flächen sperrt.
     * Sie kommt von hier und nicht aus [table].vue, damit sie dieselbe Zahl
     * liest, nach der `creditable` deckelt.
     */
    distanceReached,
    /** Restkugeln und Foulzähler — die Lage bei 14.1 endlos. */
    tableState,
    /** Wer am Tisch ist. Dieselbe Auskunft wie `breakState.next`. */
    atTable,
    enterRest, rack, safety, foul, switchTable,
    /** Was an den Auszeiten vorweggenommen ist — die Tafel zeichnet es. */
    timeoutOptimistic,
    /** Der Anstoß, den die Tafel zeigen soll: Vorgriff vor Abruf. */
    breakState,
    count, setScore, performUndo, setBreaker, takeTimeout, withdrawTimeout,
    acknowledgeShotClock,
    finish, giveUp,
    /** Heyball: die Zeitlimit-Uhr von Hand anhalten oder fortsetzen. */
    setTimeLimitRunning,
    /** Heyball: die Partie über das Zeitlimit beenden, siehe dort. */
    finishTimeLimit,
    /** Ein Satz bzw. Frame ist zu Ende — siehe dort. */
    finishSet,
  }
}

/**
 * Wie lange eine Abweisung stehenbleibt.
 *
 * Sie ist ein Hinweis fuer den Augenblick, kein Zustand: "No time-outs left
 * for this player" beantwortet den Druck, der gerade danebenging, und hat
 * danach nichts mehr zu sagen. Bis zum 14.09.2026 blieb sie stehen, bis
 * jemand etwas anderes tat -- auf einem Schirm, vor dem eine Stunde lang
 * niemand tippt, also eine Stunde lang. Der Auftraggeber: "die meldung
 * koennte nach einer zeit wieder verschwinden.. 15s. zB ist ja nur ein
 * hinweis fuer den moment".
 *
 * Fuenfzehn Sekunden gelten fuer JEDE Abweisung, auch fuer "nicht gesendet,
 * keine Verbindung". Das war die Abwaegung: gerade dort koennte man
 * argumentieren, die Meldung muesse bleiben, weil der Tipp nicht ankam. Sie
 * muss es nicht -- die ZAHL auf dem Schirm zeigt nach dem Zurueckspringen
 * wieder den alten Stand, und das ist die bessere Auskunft als ein roter
 * Satz, den nach zehn Minuten niemand mehr auf den Tipp von damals bezieht.
 */
const REJECTION_MS = 15_000

/**
 * Die rote Zeile und ihre Uhr — einmal gebaut, zweimal gebraucht.
 *
 * WARUM SIE AUS `useScoring` HERAUSGELÖST IST (16.09.2026)
 *
 * Sie stand dort drin, und damit hatte nur die Zählleiste eine Abweisung.
 * Das Schiedsrichtermenü schickt aber zwei Anfragen SELBST — die Karte und
 * den Nachweis des Personencodes —, und beide endeten in einem `catch`, das
 * nichts anzeigte: `kartenFehler` wurde gesetzt und von keiner Zeile der
 * Vorlage gelesen. Eine falsche PIN bei einer Verwarnung war damit AM TISCH
 * NICHT ZU SEHEN — es passierte schlicht nichts, und der Schiedsrichter
 * tippte noch einmal.
 *
 * VERWORFEN: im Menü eine eigene Uhr mit eigener Frist aufzuziehen. Dann
 * stünde die Zahl 15 000 an zwei Stellen, und die zweite läuft der ersten
 * beim nächsten Umbau davon. VERWORFEN ebenso: die Karte durch
 * `useScoring` zu schicken. Sie ist kein Stand — sie hat keinen Vorgriff,
 * kein Zurückdrehen und keine Reihenfolge, und der Block "Warnings" braucht
 * die Antwort (`sides`) an Ort und Stelle.
 *
 * Die Uhr wird beim Verlassen des Bereichs abgeräumt: ein Menü, das sich
 * schliesst, während die Frist läuft, liesse sonst einen Zeitgeber auf einem
 * Gerät zurück, das tagelang durchläuft.
 */
export function useRejection() {
  const error = ref<ScoringError | null>(null)
  let timer: ReturnType<typeof setTimeout> | null = null

  /** Setzt die Abweisung und laesst sie von selbst wieder gehen. */
  function report(newError: ScoringError | null) {
    if (timer) { clearTimeout(timer); timer = null }
    error.value = newError
    if (newError) {
      timer = setTimeout(() => { error.value = null; timer = null }, REJECTION_MS)
    }
  }

  /** Dasselbe, aber aus dem rohen Wurf einer Anfrage. */
  function reject(raw: unknown) {
    report(asError(raw))
  }

  onScopeDispose(() => { if (timer) clearTimeout(timer) })

  return { error, report, reject }
}

/**
 * IST DIESE ABWEISUNG EIN NETZFEHLER — UND KEINE ABWEISUNG DER ANWENDUNG?
 *
 * Die Unterscheidung ist die ganze Grundlage der Netzwiederholung in
 * `useScoring` (siehe dort, "DER NETZFEHLER"): ein Netzfehler wird
 * gemerkt und irgendwann nachgeholt, eine fachliche Abweisung NIE — sie
 * widerspräche der Anwendung sonst endlos.
 *
 * NETZFEHLER SIND:
 *
 *   - GAR KEINE ANTWORT (keine Verbindung, DNS, eine Zeitüberschreitung
 *     durch `timeout: SEND_DEADLINE_MS`). `alsFehler` erkennt das am fehlenden
 *     Statuscode (dort: NO_CONNECTION), und genau dieselbe Prüfung wird
 *     hier wiederverwendet.
 *   - 502 / 503 / 504. Der Server selbst ist erreichbar — ein
 *     Vorschalt-Proxy antwortet —, aber DAHINTER ist niemand, der die
 *     Frage beantworten könnte. Fachlich ist das identisch mit "keine
 *     Verbindung": die Anwendung hat den Stand nie gesehen.
 *
 * ALLES ANDERE MIT EINEM STATUSCODE IST FACHLICH — 400, 401, 403, 409, was
 * auch immer: die Anwendung hat geantwortet und NEIN gesagt, und ein Nein
 * wird durch Wiederholen nicht zu einem Ja.
 */
function isNetworkError(raw: unknown): boolean {
  const response = raw as { statusCode?: number, status?: number }
  const code = response?.statusCode ?? response?.status
  if (!code) return true
  return code === 502 || code === 503 || code === 504
}

/**
 * Was eine abgewiesene Eingabe am Gerät sagen soll.
 *
 * Der Schlüssel der Anwendung wird NICHT übersetzt, sondern zu dem einen
 * Satz aufgelöst, der am Tisch weiterhilft. Die Tafel spricht Englisch wie
 * die ganze Webseite; die Verwaltung hat dafür Kataloge, ein Bildschirm im
 * Saal braucht sie nicht — er zeigt fünf verschiedene Sätze, und alle fünf
 * enden mit dem, was jetzt zu tun ist.
 */
/** Der DomainError der Anwendung, so wie er am Ende wirklich ankommt. */
interface DomainError { error?: string | boolean, detail?: string, data?: DomainError }

function asError(raw: unknown): ScoringError {
  const response = raw as { statusCode?: number, status?: number, data?: DomainError }

  /*
   * ZWEI SCHICHTEN, UND DIE ÄUSSERE LÜGT
   *
   * Die Anwendung antwortet mit {error, detail, params}. Die Durchreiche
   * reicht das über `createError({data})` weiter, und h3 packt seinen
   * eigenen Umschlag darum — dessen `error` ist ein schlichtes `true`. Wer
   * nur die äussere Schicht liest, bekommt für jede Abweisung denselben
   * Satz, und aus "keine Auszeit mehr übrig" wird "Rejected".
   */
  const core = response?.data?.data ?? response?.data
  const errorCode = typeof core?.error === 'string' ? core.error : ''

  const texts: Record<string, string> = {
    NOT_SIGNED_IN: 'This screen is not signed in. Set it up again from the table list.',
    SCORING_UNREACHABLE: 'Not sent — no connection. The score is unchanged.',
    MATCH_FINISHED_NO_SCORE: 'The match is already finished. Nothing run changed.',
    BREAK_UNDECIDED: 'Set who breaks first — nothing counts before that.',
    TIMEOUTS_USED_UP: 'No time-outs left for this player.',
    TIMEOUT_NEEDS_RUNNING_MATCH: 'A time-out needs a running match.',
    /*
     * Nicht dasselbe wie "keine mehr übrig". Die eigene Uhr läuft schon —
     * und sie wird mit Absicht NICHT neu gestartet, denn genau dieses
     * stille Neustarten war der Fehler, der am 14.09.2026 behoben wurde.
     */
    TIMEOUT_ALREADY_RUNNING: 'This player is already in a time-out.',
    MATCH_UNKNOWN: 'This match is no longer at the table.',
    /*
     * Die drei kommen aus `competition.report_match_result` und damit erst,
     * seit das Schiedsrichter-Menü eine Partie auch ohne Sieg beenden kann.
     * Ohne sie stünde am Tisch der englische Satz der Anwendung, und der
     * erklärt einem Schiedsrichter nicht, was er jetzt tun soll.
     */
    MATCH_ALREADY_FINISHED: 'This match is already over. Nothing run changed.',
    MATCH_NOT_FULLY_SET: 'One side is still open — this match has no two players yet.',
    MATCH_AGAINST_BYE: 'One side is a bye. There is nobody to give up.',
    /*
     * Heyball, Zeitlimit: die Tafel bietet bei einem Gleichstand immer den
     * Shoot-out an, weil sie die Regel des Turniers nicht kennt (sie steht
     * am Turnier, nicht an der Partie) — die Datenbank weist ab, wenn es
     * hier keine gibt, und der Satz sagt, was dann zu tun ist.
     */
    TIME_LIMIT_TIE_NO_SHOOTOUT:
      'This tournament has no shoot-out rule. The tournament office decides a tied match.',
    /*
     * Die beiden gab es schon, seit das Menü Partien beenden kann — sie
     * standen nur nicht hier, und dann stand am Tisch der Satz der
     * Anwendung. Seit die Auszeit-Rücknahme ebenfalls sechs Ziffern
     * verlangt, trifft sie jeder Schiedsrichter, der sich vertippt, und
     * der Satz muss sagen, was jetzt zu tun ist.
     */
    BOARD_PIN_REQUIRED: 'This needs a personal code. Open the menu again and enter it.',
    BOARD_PIN_REJECTED: 'That code run not accepted. Nothing run changed.',
    /*
     * DER CODE WAR RICHTIG — ER GEHÖRT NUR DEM FALSCHEN.
     *
     * Seit dem 17.09.2026 hängt das kampflose Ende an `forfeit/X`, und das
     * trägt die Turnierleitung, nicht der Schiedsrichter (§ 9.1 der
     * Sportordnung; die Abwägung steht in V2 an der Zeile `('forfeit', …)`).
     * Am Tisch ist das der Fall, den ein blosses „not allowed" am
     * schlechtesten beantwortet: da steht jemand, der eben sechs richtige
     * Ziffern getippt hat, und hält sie für falsch. Der Satz sagt deshalb
     * beides — dass der Code angekommen ist und wessen Code hier zählt.
     *
     * Der Rückfall auf 403 („This account may not score at this event")
     * bleibt für alles andere. Er wäre hier die Unwahrheit: gezählt werden
     * darf sehr wohl, nur beendet nicht.
     */
    FORFEIT_IS_THE_TOURNAMENT_DIRECTION:
      'That code is not the tournament direction — only they end a match without play.',
    /*
     * DER SATZ SAGT, WAS ZU TUN IST — UND NICHT, WIE ES GEHT.
     *
     * "Der Schiedsrichter muss sie bestätigen" ist die Anweisung. Die Geste,
     * mit der das geschieht (zwei Sekunden Druck auf den Rahmen, dann der
     * Punkt im Menü), steht hier ausdrücklich NICHT. Vor dieser Tafel stehen
     * die beiden Spieler, und die Shot-Clock ist eine Anordnung gegen einen
     * von ihnen; ein Satz, der die Geste verrät, wäre die Anleitung zum
     * Wegklicken.
     *
     * Wer die Geste kennt, braucht sie hier nicht. Wer sie nicht kennt, soll
     * den Schiedsrichter holen — und genau das steht da. Ohne diesen Satz
     * stünde jemand vor einer Tafel, die nichts mehr annimmt, und wüsste
     * nicht warum; das wäre der schlechteste Ausgang von allen.
     */
    SHOT_CLOCK_NOT_ACKNOWLEDGED:
      'Shot clock — the referee has to acknowledge it before the score goes on.',
    /*
     * DIE VIER AUS `competition.confirm_set_result`, SEIT DEM 25.09.2026.
     *
     * Ohne sie stuende hier der englische Satz der Anwendung — richtig,
     * aber ohne die Anweisung, was am Tisch jetzt zu tun ist.
     */
    SET_RACE_NOT_SET:
      'This match has no set format. Confirm the whole match instead, or name the winner of the frame.',
    SET_RACE_NOT_REACHED: 'Neither side has reached the set yet.',
    /*
     * BEIDE STEHEN AUF DER DISTANZ — dieselbe Lage wie `RACE_AMBIGUOUS` bei
     * einer Partie ohne Saetze, nur eine Ebene tiefer. Es gibt keinen
     * Knopf, der das hier aufloest; jemand muss sich den Satz ansehen.
     */
    SET_RACE_AMBIGUOUS: 'Both sides are at or past the set. Somebody has to look at this.',
    SIDE_UNKNOWN: 'That is not a side of this match.',
  }
  if (texts[errorCode]) return { errorCode, text: texts[errorCode]! }

  const code = response?.statusCode ?? response?.status
  if (code === 401) {
    return { errorCode: 'NOT_SIGNED_IN', text: 'This screen is not signed in.' }
  }
  if (code === 403) {
    return {
      errorCode: 'NOT_ALLOWED',
      text: 'This account may not score at this event. Nothing run changed.',
    }
  }
  /*
   * Kein Statuscode heisst: die Anfrage ist gar nicht angekommen. Das ist
   * der Fall, für den die ganze Leiste gebaut ist — der Satz sagt deshalb
   * ausdrücklich, dass nichts gezählt wurde, und nicht nur, dass etwas
   * schiefging.
   */
  if (!code) {
    return {
      errorCode: 'NO_CONNECTION',
      text: 'Not sent — no connection. The score is unchanged.',
    }
  }
  return {
    errorCode: errorCode || 'REJECTED',
    text: core?.detail ?? 'Rejected. The score is unchanged.',
  }
}
