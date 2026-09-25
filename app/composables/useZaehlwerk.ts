import type { Match } from '~~/shared/types/api'

/** Eine Seite der Partie. A steht auf der Tafel links, B rechts. */
export type Seite = 'A' | 'B'

/** Der Stand beider Seiten — immer beide, nie einer allein. */
export interface Standpaar { A: number, B: number }

/** Wie viele Kugeln ein volles Rack hat. Die Zahl steht in WPA 7 ueberall. */
export const VOLLES_RACK = 15

/**
 * WELCHES FOUL AM TISCH GEDRUECKT WURDE — die BEDIENUNG und nicht die Regel.
 *
 * Drei Werte, obwohl die Anwendung nur drei FOULARTEN kennt (STANDARD,
 * BREAK, THIRD) und die beiden Break-Griffe dort dieselbe sind: sie kosten
 * beide zwei Punkte und zaehlen beide nicht fuer die Dreierfolge (WPA 7.10 /
 * 7.11). Was sie unterscheidet, ist WER DANACH AM TISCH STEHT, und das ist
 * die Wahl des Gegners nach 7.3 (b) — eine Angabe ueber den Tisch und nicht
 * ueber das Foul. Deshalb bleibt sie hier vorn und reist nicht mit:
 * `foulart` an die Anwendung ist in beiden Faellen 'BREAK'.
 */
export type Foulgriff = 'STANDARD' | 'BREAK_AGAIN' | 'BREAK_ACCEPT'

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
 * WER AM TISCH IST, STEHT NICHT HIER. Er steht in `anstossStand.next` —
 * dieselbe Auskunft, die die Tafel ohnehin fuehrt und vorwegnimmt. Bei 14.1
 * wird einmal angestossen und danach gespielt, bis jemand verschiesst; wer
 * als naechstes zum Stoss kommt, IST der, der am Tisch steht. Eine zweite
 * Angabe daneben waere ein zweiter Schattenzustand fuer dieselbe Sache.
 */
export interface Lage {
  rest: number
  fouls: Standpaar
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
  lauf: Standpaar
  /**
   * DER HIGH RUN je Seite — die höchste Aufnahme dieser Partie.
   *
   * Sie wird MITGEFÜHRT und nicht ausgerechnet. Als blosses Maximum liesse
   * sie sich nicht zurücknehmen: wer den Stoss zurücknimmt, der sie auf 41
   * gehoben hat, müsste wissen, ob davor 38 oder 12 dastand — und das steht
   * nirgends ausser im Verlaufsstapel dieses Geräts.
   */
  high: Standpaar
}

/**
 * Ein Schritt im Rueckgaengig-Stapel — der GANZE Zustand und nicht nur der
 * Stand.
 *
 * Bis zum 16.09.2026 lag hier ein blosses {@link Standpaar}, und das genuegte,
 * solange eine Zahl das Einzige war, was ein Tastendruck veraenderte. Bei
 * 14.1 endlos veraendert er vier Dinge auf einmal: Punkte, Restkugeln,
 * Foulzaehler und wer am Tisch ist. Ein Undo, das nur die Punkte zuruecknimmt,
 * laesst den Rest stehen — und die naechste Aufnahme rechnet dann falsch,
 * ohne dass jemand sieht, warum.
 */
interface Schritt {
  stand: Standpaar
  lage: Lage
  /** Wer am Tisch war. `null` bei Satzwertung — dort gibt es das nicht. */
  amTisch: Seite | null
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
  foulart?: 'STANDARD' | 'BREAK' | 'THIRD'
}

/**
 * Was ein Tastendruck bei 14.1 endlos NEBEN dem Stand mitschickt.
 *
 * `foulart` ist keine Angabe über den Stand, sondern über den Vorgang —
 * dieselbe Bauart wie `undo` und aus demselben Grund: die Anwendung sieht
 * sonst nur, dass eine Zahl gefallen ist, und ein Foul stünde im Verlauf als
 * „Score corrected" da. Drei Werte, weil die drei Fouls Verschiedenes kosten
 * (WPA 7.9 / 7.10 / 7.11) und sich an der Differenz allein nicht sicher
 * auseinanderhalten lassen.
 */
interface Vierzehnfassung {
  lage: Lage
  amTisch: Seite
  foulart?: 'STANDARD' | 'BREAK' | 'THIRD'
}

/**
 * Was `PUT /matches/{id}/score` beantwortet — einmal benannt, weil sowohl
 * `setzen` als auch die Netzwiederholung bei einem Merkposten (siehe
 * `merkposten` in `useZaehlwerk`) dieselbe Form brauchen: ein Wiederholungs-
 * versuch schickt denselben Rumpf ein zweites Mal und erwartet dieselbe
 * Antwort.
 */
interface StandAntwort {
  scoreA: number, scoreB: number
  ballsOnTable?: number | null, foulsA?: number | null, foulsB?: number | null
  runA?: number | null, highA?: number | null
  runB?: number | null, highB?: number | null
}

/**
 * Ein Schreibvorgang auf den Stand, so vollständig, dass er sich UNVERÄNDERT
 * wiederholen lässt — der Rumpf, was bei Ankunft geschieht, und was bei
 * einer (fachlichen) Abweisung zurückzudrehen ist. Siehe `merkposten`.
 */
interface StandAuftrag {
  was: () => Promise<StandAntwort>
  angekommen: (antwort: StandAntwort) => void
  zurueckdrehen: () => void
}

/**
 * DER MERKPOSTEN, WIE ER EIN NEULADEN ÜBERLEBT — je Partie höchstens EINER.
 *
 * Ein Merkposten im Arbeitsspeicher übersteht einen Netzausfall, aber kein
 * Neuladen: ein Tablet in einer Halle wird gewischt, der Browser räumt
 * Speicher auf, das Gerät geht kurz aus — und danach ist der ganze
 * Zustand dieser Datei weg, lautlos, ohne dass irgendwer es sieht. Deshalb
 * liegt hier ab, WAS zu tun ist, wenn die Verbindung zurück ist — nicht
 * mehr, denn Funktionen (`was`, `angekommen`, `zurueckdrehen` von
 * `StandAuftrag`) lassen sich nicht in `localStorage` schreiben.
 *
 * EIN SCHLÜSSEL JE PARTIE (`merkpostenSchluessel`), damit zwei Tafeln auf
 * demselben Gerät sich nicht ins Gehege kommen und ein gemerktes Ende einen
 * gemerkten Stand am selben Schlüssel ERSETZT statt daneben abzulegen —
 * dieselbe Haltung wie beim Merkposten im Arbeitsspeicher (siehe dort,
 * "EIN GEMERKTES ERGEBNIS ERSETZT EINEN GEMERKTEN STAND").
 */
type GespeicherterMerkposten = GespeicherterStand | GespeichertesEnde

/** Ein Stand, der noch hinaus muss — siehe `merkposten` in `useZaehlwerk`. */
interface GespeicherterStand {
  art: 'stand'
  /**
   * Der Stand, AUF DEM dieser Merkposten aufbaute — nicht der, den er
   * schickt. Die Grundlage des Abgleichs beim Wiederlesen, siehe
   * `merkpostenWiederherstellen`: eine absolute Zahl sagt für sich nicht,
   * worauf sie aufbaute, und ohne diese Angabe ließe sich nicht erkennen,
   * ob der Server inzwischen etwas anderes führt.
   */
  basis: Standpaar
  neu: Standpaar
  ruecknahme: boolean
  vierzehn?: Vierzehnfassung
}

/** Ein Ende (`beenden`/`aufgeben`), das noch hinaus muss. */
interface GespeichertesEnde {
  art: 'ende'
  pfad: 'confirm' | 'result'
  /**
   * Nur bei `pfad: 'result'` gesetzt — `confirm` hat keinen Rumpf, siehe
   * `beenden`.
   */
  rumpf?: {
    winner: Seite, scoreA: number, scoreB: number
    resolution: 'WALKOVER' | 'FORFEIT', boardPin?: string
  }
  /**
   * Der Stand, auf dem `rumpf.scoreA`/`scoreB` beruhen — wie `basis` bei
   * {@link GespeicherterStand}, und aus demselben Grund. `null` bei
   * WALKOVER: dort steht im Rumpf immer 0:0, unabhängig vom tatsächlichen
   * Stand, und ein Vergleich gegen "0:0" wäre kein Abgleich, sondern ein
   * Zufallstreffer.
   */
  basis: Standpaar | null
}

/**
 * Der Schlüssel EINER Partie — nicht des Tisches und nicht des Turniers:
 * die nächste Partie an diesem Tisch soll den Merkposten der vorigen weder
 * erben noch sehen.
 */
function merkpostenSchluessel(matchId: string): string {
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
function merkpostenSpeichern(matchId: string, wert: GespeicherterMerkposten) {
  try {
    window.localStorage.setItem(merkpostenSchluessel(matchId), JSON.stringify(wert))
  }
  catch {
    // Kein Speicher — siehe oben.
  }
}

function merkpostenGelesen(matchId: string): GespeicherterMerkposten | null {
  try {
    const roh = window.localStorage.getItem(merkpostenSchluessel(matchId))
    return roh ? JSON.parse(roh) as GespeicherterMerkposten : null
  }
  catch {
    return null
  }
}

function merkpostenGeloescht(matchId: string) {
  try {
    window.localStorage.removeItem(merkpostenSchluessel(matchId))
  }
  catch {
    // Kein Speicher — siehe oben.
  }
}

/**
 * Eine Seite, deren Trikotkontrolle noch aussteht — mit dem Namen dessen,
 * der dort steht. Genau das, was `competition.uniform_blocks_start` liefert.
 */
export interface Trikotoffen {
  side: Seite
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
export interface Zusatz {
  id: string
  status: string
  raceTo: number | null
  firstBreak: Seite | null
  nextBreak: Seite | null
  breakRule: string | null
  timeoutsTaken: Standpaar
  /** Wie viele jede Seite HAT. null heisst: keine Obergrenze gepflegt. */
  timeoutsAllowed: number | null
  /**
   * WIE LANGE eine Auszeit dauert, in Sekunden — nicht wie viele es sind.
   *
   * Die beiden nebeneinander zu haben ist der ganze Grund, aus dem die
   * Auszeit jetzt vorweggenommen werden kann: bis zum 14.09.2026 kannte
   * dieses Gerät nur `timeoutsAllowed`, und mit einer ANZAHL lässt sich
   * keine Uhr stellen. Siehe `auszeit`.
   *
   * null heisst: die Dauer ist nicht bekannt — dann wird NICHT
   * vorweggenommen, statt eine Restzeit zu erfinden.
   */
  timeoutSeconds: number | null
  score: Standpaar
  /**
   * Wessen Trikotkontrolle noch offen ist. Leer heisst: die Partie darf
   * beginnen.
   *
   * <p>KEIN FEHLER, SONDERN EIN ZUSTAND — und deshalb steht sie hier bei
   * `raceTo` und `timeoutsAllowed` und nicht bei {@link Zaehlfehler}. Eine
   * Abweisung beantwortet den Druck, der gerade danebenging, und
   * verschwindet nach fünfzehn Sekunden von selbst (FEHLER_MS). Diese
   * Angabe beantwortet keinen Druck: sie steht am Tisch, bis jemand die
   * Kontrolle abnimmt, und sie geht auch nur dann — dann nämlich liefert
   * der nächste Abruf sie nicht mehr mit.
   */
  uniformOpen: Trikotoffen[]
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
   * die Tafel faellt dann auf {@link VOLLES_RACK} zurueck, denn so beginnt
   * jede Partie. Bei Satzwertung bleibt die Angabe immer null.
   */
  ballsOnTable: number | null
  /** Standardfouls hintereinander, je Seite (WPA 7.11). */
  fouls: Standpaar
  /** Die laufende Aufnahme, je Seite — siehe {@link Lage}. */
  lauf: Standpaar
  /** Der High run, je Seite. */
  high: Standpaar
}

/** Eine abgewiesene Eingabe, so wie sie am Gerät stehen soll. */
export interface Zaehlfehler {
  /** Der Schlüssel der Anwendung, z. B. MATCH_FINISHED_NO_SCORE. */
  schluessel: string
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
 * Stand, der noch unterwegs ist, SIEHT anders aus (`unbestaetigt`), und wird
 * er abgewiesen, springt die Zahl zurück und die rote Zeile sagt warum.
 *
 * ZWEITENS: ANTWORTEN KOMMEN IN FALSCHER REIHENFOLGE — siehe `losschicken`.
 * Das ist der Kern dieses Stücks und steht dort ausführlich.
 *
 * DRITTENS: NICHT JEDER WEG NIMMT VORWEG
 *
 * Ein Punkt wird vorweggenommen, ein Ergebnis nicht. Wer den Sieger meldet,
 * reicht den Turnierbaum weiter und rechnet Plätze ab — das ist kein Tipp,
 * den man zurücknimmt, und eine Fläche, die dabei sofort "fertig" sagt und
 * eine Sekunde später doch nicht, ist schlimmer als eine, die kurz wartet.
 * `beenden` und `aufgeben` gehen deshalb weiter durch {@link schreiben} und
 * halten die Leiste an; alles andere geht durch {@link losschicken}.
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
export function useZaehlwerk(optionen: {
  partie: Ref<Match | null>
  zusatz: Ref<Zusatz | null>
  /**
   * Was der ABRUF über die laufenden Auszeiten sagt — je Seite ein Ja oder
   * Nein, roh und ohne das, was hier vorweggenommen wurde.
   *
   * ROH IST BEDINGUNG UND NICHT BEQUEMLICHKEIT. Diese Angabe entscheidet
   * unten, wann ein Vorgriff losgelassen wird; käme sie aus der Anzeige,
   * die den Vorgriff schon enthält, bestätigte sich der Vorgriff selbst und
   * würde nie wieder los.
   */
  auszeitenLaufen: Ref<Record<Seite, boolean>>
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
   * ausschliesslich ueber `satzAbschliessen`. Ohne diese Angabe rechnete
   * `stand` weiterhin gegen `sideX.score` — und das waere fuer eine
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
  satzformat: Ref<boolean>
  /** Die ganze Tafel neu holen. NIE abwartend — siehe `losschicken`. */
  nachschauen: () => Promise<void>
}) {
  const { partie, zusatz, auszeitenLaufen, straightPool, satzformat, nachschauen } = optionen

  /**
   * Ein AUFHALTENDER Vorgang läuft — und nur ein solcher.
   *
   * Sie sperrt jede Fläche der Leiste (`:arbeitet`), und genau deshalb trägt
   * sie seit dem 14.09.2026 nur noch, was ein Ende meldet: `beenden` und
   * `aufgeben`. Punkt, Auszeit und Anstoß sperren nichts mehr — wer zweimal
   * schnell tippt, muss zweimal zählen können, und das war der Auftrag.
   */
  const laeuft = ref(false)
  const { fehler, melden, abweisen } = useAbweisung()

  /** Der zuletzt BESTÄTIGTE eigene Stand samt Zeitpunkt — siehe Kopf. */
  const gehalten = ref<{ stand: Standpaar, seit: number } | null>(null)

  /**
   * Der eigene Stand, der noch unterwegs ist — die Zahl, die sofort hochging.
   *
   * Er steht über allem: über dem Abruf und über `gehalten`. Solange er
   * gesetzt ist, kann weder der Zehn-Sekunden-Takt noch eine überholte
   * Antwort die Zahl bewegen, auf die der Zählende gerade geschaut hat.
   *
   * Er braucht KEINE eigene Verfallsfrist, obwohl `gehalten` eine hat. Der
   * Grund liegt in SENDEFRIST_MS: jeder Schreibvorgang endet spätestens nach
   * acht Sekunden, mit Antwort oder mit Abbruch, und genau dort wird er
   * gelöscht. Eine zweite Frist hier wäre eine zweite Wahrheit über
   * dieselbe Sache — und die beiden liefen früher oder später auseinander.
   */
  const vorgemerkt = ref<Standpaar | null>(null)

  const HALTEDAUER_MS = 20_000

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
  const SENDEFRIST_MS = 8_000

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
   * ES BEGINNT ABER NICHT SOFORT, SONDERN NACH WIMPERNSCHLAG_MS. Im Saal
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
  const WIMPERNSCHLAG_MS = 600
  const unbestaetigt = ref(false)
  let wimpernUhr: ReturnType<typeof setTimeout> | null = null

  function wartenBeginnt() {
    if (wimpernUhr || unbestaetigt.value) return
    wimpernUhr = setTimeout(() => {
      unbestaetigt.value = true
      wimpernUhr = null
    }, WIMPERNSCHLAG_MS)
  }

  function wartenEndet() {
    if (wimpernUhr) { clearTimeout(wimpernUhr); wimpernUhr = null }
    unbestaetigt.value = false
  }

  // Die Uhr der roten Zeile raeumt `useAbweisung` selbst ab — sie gehoert
  // seit dem 16.09.2026 dorthin und nicht mehr hierher.
  onScopeDispose(() => {
    if (wimpernUhr) clearTimeout(wimpernUhr)
  })

  /* ----------------------------------------------------------------------
   * DER NETZFEHLER — GEMERKT UND WIEDERHOLT, NICHT ABGEWIESEN
   * ----------------------------------------------------------------------
   *
   * Der Auftrag vom 25.09.2026: die Tafel soll weiterzählen, wenn das Netz
   * in der Halle ausfällt, und den Stand nachholen, sobald die Verbindung
   * zurück ist. `vorgemerkt` darüber löst das für einen Aussetzer von ein
   * paar Sekunden schon; es löst es nicht für einen Ausfall von Minuten,
   * denn `losschicken` gab bis hierher jeden gescheiterten Schreibvorgang
   * verloren — gleich, OB die Anwendung nein gesagt hat oder ob sie die
   * Frage nie zu Gesicht bekam.
   *
   * GENAU DIESE ZWEI FÄLLE WERDEN JETZT GETRENNT (`istNetzfehler`, am Ende
   * der Datei, wo `alsFehler` dieselbe Antwort schon zerlegt):
   *
   *   FACHLICH   Die Anwendung hat geantwortet und NEIN gesagt (400, 403,
   *              409 mit einer Fachkennung wie SET_RACE_ALREADY_REACHED).
   *              Das bleibt, wie es war: Anzeige zurückgedreht, rote Zeile,
   *              fertig — ein Wiederholen machte aus einem Nein kein Ja,
   *              sondern eine Schleife, die nie ankommt.
   *   NETZFEHLER Keine Verbindung, eine Zeitüberschreitung (`SENDEFRIST_MS`)
   *              oder ein 502/503/504 — die Frage ist nie angekommen oder
   *              nie beantwortet worden. Hier, und nur hier, lohnt sich ein
   *              zweiter Versuch: die Anwendung hat nichts abgelehnt, sie
   *              hat nichts gesehen.
   *
   * KEINE SCHLANGE, EIN MERKPOSTEN. `losschicken` verwirft mit Absicht jede
   * überholte Antwort (siehe dort, "VERWORFEN: die Schreibvorgänge in einer
   * Schlange") — dieselbe Haltung gilt hier: es gibt höchstens EINEN Stand,
   * der noch hinaus soll, nämlich den jüngsten. `merkposten` ist deshalb
   * eine einzelne Variable und kein Feld, in das eingereiht wird; ein neuer
   * Tastendruck ERSETZT sie, bevor er selbst losgeschickt wird (siehe
   * `merkpostenAufraeumen` in `setzen`), und der alte Versuch wird dabei
   * nicht nachgeholt, sondern fallengelassen — genau wie eine überholte
   * Antwort fallengelassen wird.
   *
   * NUR DIE PUNKTE. `setzen` ist die einzige Stelle, die `netzfehler` an
   * `losschicken` übergibt. Anstoß, Auszeit und ihre Rücknahme gehen
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
  let merkposten: { matchId: string, auftrag: StandAuftrag } | null = null
  let wiederholUhr: ReturnType<typeof setTimeout> | null = null
  let wiederholVersuch = 0
  const NETZ_WIEDERHOLUNG_MS = [2_000, 5_000, 10_000, 20_000]

  /**
   * Steht ein Stand noch aus, weil eine Anfrage an einem Netzfehler
   * gescheitert ist?
   *
   * Anders als `unbestaetigt` (ein halber Wimpernschlag, siehe oben) ist das
   * die Auskunft für den LANGEN Ausfall — die Tafel zeigt sie dauerhaft an
   * (siehe [table].vue): "diese Zahl ist hier richtig, aber die Anwendung
   * weiss noch nichts davon".
   */
  const netzausfall = ref(false)

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
  function merkpostenAufraeumen() {
    if (wiederholUhr) { clearTimeout(wiederholUhr); wiederholUhr = null }
    if (merkposten) merkpostenGeloescht(merkposten.matchId)
    merkposten = null
    wiederholVersuch = 0
    netzausfall.value = false
  }

  /** Den nächsten Wiederholungsversuch für den aktuellen Merkposten einplanen. */
  function wiederholungPlanen() {
    if (wiederholUhr) clearTimeout(wiederholUhr)
    const wartezeit = NETZ_WIEDERHOLUNG_MS[
      Math.min(wiederholVersuch, NETZ_WIEDERHOLUNG_MS.length - 1)
    ]!
    wiederholUhr = setTimeout(() => {
      wiederholUhr = null
      const eintrag = merkposten
      if (!eintrag) return
      wiederholVersuch++
      // Derselbe Auftrag geht unverändert ein weiteres Mal hinaus — siehe
      // "EIN AUFRUF UND NICHT ZWEI" bei `setzen`. Scheitert er wieder an
      // einem Netzfehler, plant er sich hier selbst erneut ein; scheitert er
      // fachlich, greift `zurueckdrehen` im Auftrag selbst.
      losschicken({ ...eintrag.auftrag, netzfehler: wiederholungPlanen })
    }, wartezeit)
  }

  /**
   * Ein Stand ist an einem Netzfehler gescheitert — hier merken (im
   * Arbeitsspeicher UND in `localStorage`, siehe `GespeicherterStand`) und
   * den ersten Wiederholungsversuch anstossen.
   */
  function merkpostenSenden(matchId: string, auftrag: StandAuftrag, gespeichert: GespeicherterStand) {
    merkposten = { matchId, auftrag }
    wiederholVersuch = 0
    netzausfall.value = true
    merkpostenSpeichern(matchId, gespeichert)
    wiederholungPlanen()
  }

  /**
   * BEIM LADEN NACHSEHEN: LIEGT FÜR DIESE PARTIE EIN NICHT ANGEKOMMENER
   * STAND ODER EIN NICHT ANGEKOMMENES ENDE?
   *
   * Aufgerufen aus dem Beobachter auf `partie.value?.id` weiter unten —
   * FÜR JEDE Partie, die an diesem Tisch neu erscheint, nicht nur beim
   * allerersten Laden. Ein Gerät, das mitten in einer Partie neu geladen
   * wird (der häufigste Fall: jemand wischt das Tablet), sieht dieselbe
   * Partien-Kennung wie vorher — und `localStorage` hat den Merkposten die
   * ganze Zeit gehalten, auch wenn der Arbeitsspeicher gerade neu
   * aufgesetzt wurde.
   *
   * DER ABGLEICH GEGEN DEN AKTUELLEN SERVERSTAND STEHT BEI DEN BEIDEN
   * WIEDERHERSTELLUNGEN SELBST (`merkposten`/`ergebnis`), NICHT HIER —
   * beide brauchen dafür etwas anderes (einen Stand bzw. gar nichts).
   */
  function merkpostenWiederherstellen(matchId: string) {
    const gespeichert = merkpostenGelesen(matchId)
    if (!gespeichert) return
    if (gespeichert.art === 'ende') {
      ergebnisWiederherstellen(matchId, gespeichert)
      return
    }
    standWiederherstellen(matchId, gespeichert)
  }

  /**
   * Einen gespeicherten Stand wiederherstellen — oder verwerfen.
   *
   * DER ABGLEICH GEGEN `basis`, UND WARUM ER VOR ALLEM ANDEREN STEHT: der
   * gespeicherte Stand ist ABSOLUT (siehe der Kopf der Datei, "score wird
   * ABSOLUT übertragen") — ihn einfach erneut zu schicken, würde JEDE
   * Änderung überschreiben, die seit dem Netzausfall geschehen ist, gleich
   * ob sie von der Turnierleitung kam oder von einem zweiten Gerät. `basis`
   * ist der Stand, auf dem dieser Merkposten aufbaute; stimmt er nicht mehr
   * mit dem überein, was der Server JETZT führt, hat sich zwischenzeitlich
   * etwas geändert, von dem dieses Gerät nichts weiß — und dann gilt die
   * Regel dieser ganzen Datei: gezeigt wird, was die Anwendung zuletzt
   * nachweislich führte, nicht, was das Gerät sich zwischendurch gedacht
   * hat. Der Merkposten wird verworfen, NICHT gesendet.
   */
  function standWiederherstellen(matchId: string, gespeichert: GespeicherterStand) {
    const m = partie.value
    if (!m) return
    const aktuell: Standpaar = { A: rohstand(m, 'A'), B: rohstand(m, 'B') }
    if (aktuell.A !== gespeichert.basis.A || aktuell.B !== gespeichert.basis.B) {
      merkpostenGeloescht(matchId)
      return
    }

    // Die Anzeige sofort wiederherstellen — genau das, was `setzen` beim
    // ersten Tipp auch getan hätte.
    vorgemerkt.value = { ...gespeichert.neu }
    if (gespeichert.vierzehn) {
      lageVorgemerkt.value = {
        rest: gespeichert.vierzehn.lage.rest,
        fouls: { ...gespeichert.vierzehn.lage.fouls },
        lauf: { ...gespeichert.vierzehn.lage.lauf },
        high: { ...gespeichert.vierzehn.lage.high },
      }
      anstossVorgemerkt.value = {
        first: (anstossStand.value.first ?? gespeichert.vierzehn.amTisch) as Seite,
        next: gespeichert.vierzehn.amTisch,
        seit: Date.now(),
      }
    }

    const auftrag = standAuftragBauen(m, gespeichert.neu, gespeichert.ruecknahme, gespeichert.vierzehn)
    merkpostenSenden(matchId, auftrag, gespeichert)
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
   * mit Satzformat, sonst der gewohnte Aussenstand. Siehe `satzformat`.
   */
  function rohstand(m: Match, seite: Seite): number {
    return (satzformat.value ? (seite === 'A' ? m.sideA.setScore : m.sideB.setScore)
      : (seite === 'A' ? m.sideA.score : m.sideB.score)) ?? 0
  }

  const stand = computed<Standpaar>(() => {
    if (vorgemerkt.value) return vorgemerkt.value

    const m = partie.value
    const roh = { A: m ? rohstand(m, 'A') : 0, B: m ? rohstand(m, 'B') : 0 }
    const eigen = gehalten.value
    if (!eigen) return roh
    if (Date.now() - eigen.seit > HALTEDAUER_MS) return roh
    return eigen.stand
  })

  /**
   * Hat der Abruf den eigenen Stand eingeholt, wird er losgelassen.
   *
   * Ohne diese Freigabe hinge der Stand die vollen zwanzig Sekunden am
   * eigenen Wert — und eine Änderung aus dem Turnierbüro käme in dieser
   * Zeit nicht durch, obwohl beide längst dasselbe meinen.
   */
  watch(partie, (neu) => {
    const eigen = gehalten.value
    if (!eigen || !neu) return
    if (rohstand(neu, 'A') === eigen.stand.A && rohstand(neu, 'B') === eigen.stand.B) {
      gehalten.value = null
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
  const verlauf = ref<Schritt[]>([])
  const kannZurueck = computed(() => verlauf.value.length > 0 && !laeuft.value)

  /* ----------------------------------------------------------------------
   * DIE DISTANZ — DIE EINE GRENZE, UND SIE WIRD HIER GERECHNET
   * ----------------------------------------------------------------------
   *
   * Der Auftraggeber am 16.09.2026, wörtlich: „beim erreichen von race-to
   * ist ende.. fertig". Zwei Sätze stehen darin, und beide stehen hier:
   *
   *   1. DER STAND GEHT NIE ÜBER DIE DISTANZ HINAUS. Was darüber
   *      hinausführte, wird auf die Distanz GEDECKELT (`zubuchbar`).
   *   2. AB DEM ERREICHEN WIRD NICHT MEHR GEZÄHLT. Das sperrt die Leiste
   *      (`distanzErreicht` → `zaehlsperre` in Zaehlleiste.vue).
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
   * (`restEintragen`, `rack`), und wer nur den Stand deckelte, risse die
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
   * Verschiebung wie bei `stand`/`rohstand` und aus demselben Grund: mit
   * Satzformat rechnet `PUT /score` gegen die Racks bzw. Punkte EINES
   * Satzes, nicht gegen die Saetze der ganzen Partie. `raceTo` bliebe hier
   * die AEUSSERE Zahl (z. B. 3 von 5 Saetzen) — eine Deckelung dagegen
   * spraeche schon nach drei Racks von "Distanz erreicht", mitten im ersten
   * Satz eines "race to 5".
   *
   * `zusatz.value?.raceTo` bleibt nur der Rueckfall OHNE Satzformat: die
   * Verwaltung fuehrt dort keine `setRaceTo` (sie steht schon oeffentlich an
   * der Partie, siehe `Match.setRaceTo`, und braucht keine zweite Quelle).
   */
  const distanz = computed(() => satzformat.value
    ? (partie.value?.setRaceTo ?? 0)
    : (zusatz.value?.raceTo ?? partie.value?.raceTo ?? 0))

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
  const distanzErreicht = computed(() => distanz.value > 0
    && (stand.value.A >= distanz.value || stand.value.B >= distanz.value))

  /**
   * Was von `punkte` einer Seite noch gutgeschrieben werden darf.
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
  function zubuchbar(seite: Seite, punkte: number): number {
    if (punkte <= 0 || distanz.value <= 0) return punkte
    return Math.max(0, Math.min(punkte, distanz.value - stand.value[seite]))
  }

  function merken(alt: Schritt) {
    verlauf.value.push(alt)
    if (verlauf.value.length > 20) verlauf.value.shift()
  }

  /* ----------------------------------------------------------------------
   * DIE LAGE AM TISCH — DIESELBEN DREI SCHICHTEN WIE DER STAND
   * ------------------------------------------------------------------- */

  /**
   * Die Lage, die noch unterwegs ist, und die zuletzt bestaetigte.
   *
   * Gebaut wie {@link vorgemerkt} und {@link gehalten} beim Stand, und aus
   * demselben Grund: die Restkugeln stehen am Tisch neben dem Stand, und
   * eine Zahl, die zurueckspringt, ist dort dasselbe Aergernis wie ein Stand,
   * der zurueckspringt — nur schlimmer, weil die naechste Aufnahme mit ihr
   * RECHNET. Sprang der Rest von 8 auf 15 zurueck, weil eine ueberholte
   * Antwort eintraf, schriebe der naechste Eintrag dem Spieler sieben Punkte
   * zu viel gut.
   */
  const lageVorgemerkt = ref<Lage | null>(null)
  const lageGehalten = ref<{ wert: Lage, seit: number } | null>(null)

  /** Die Lage, die die Tafel zeigen soll — Vorgriff, dann Gehaltenes, dann Abruf. */
  const lage = computed<Lage>(() => {
    if (lageVorgemerkt.value) return lageVorgemerkt.value

    const roh: Lage = {
      rest: zusatz.value?.ballsOnTable ?? VOLLES_RACK,
      fouls: {
        A: zusatz.value?.fouls?.A ?? 0,
        B: zusatz.value?.fouls?.B ?? 0,
      },
      lauf: {
        A: zusatz.value?.lauf?.A ?? 0,
        B: zusatz.value?.lauf?.B ?? 0,
      },
      high: {
        A: zusatz.value?.high?.A ?? 0,
        B: zusatz.value?.high?.B ?? 0,
      },
    }
    const eigen = lageGehalten.value
    if (!eigen) return roh
    if (Date.now() - eigen.seit > HALTEDAUER_MS) return roh
    return eigen.wert
  })

  /** Hat der Abruf die eigene Lage eingeholt, wird sie losgelassen — wie beim Stand. */
  watch(zusatz, (neu) => {
    const eigen = lageGehalten.value
    if (!eigen || !neu) return
    if ((neu.ballsOnTable ?? VOLLES_RACK) === eigen.wert.rest
      && (neu.fouls?.A ?? 0) === eigen.wert.fouls.A
      && (neu.fouls?.B ?? 0) === eigen.wert.fouls.B
      /*
       * DIE AUFNAHME GEHÖRT MIT IN DEN VERGLEICH. Wird sie ausgelassen,
       * lässt der Abruf die eigene Lage schon los, sobald Rest und Fouls
       * stimmen — und ein High run, der noch unterwegs war, spränge auf der
       * Tafel zurück, um beim nächsten Abruf wieder zu stehen.
       */
      && (neu.lauf?.A ?? 0) === eigen.wert.lauf.A
      && (neu.lauf?.B ?? 0) === eigen.wert.lauf.B
      && (neu.high?.A ?? 0) === eigen.wert.high.A
      && (neu.high?.B ?? 0) === eigen.wert.high.B) {
      lageGehalten.value = null
    }
  })

  /* ----------------------------------------------------------------------
   * DIE AUSZEIT-UHR, VORWEGGENOMMEN — UND WARUM SIE NICHT SPRINGT
   * ------------------------------------------------------------------- */

  /**
   * Was hier an einer Auszeit gedrückt wurde, bevor die Anwendung es weiß.
   *
   * `anker` ist der Zeitpunkt des Drucks und damit der Beginn der Uhr;
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
   * steht in `zusatz.timeoutSeconds` und kommt aus `tournament.
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
  interface Auszeitvorgriff {
    /** Wann hier gedrückt wurde. `null` heisst: vorweggenommenes ENDE. */
    anker: number | null
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
    gesehen: boolean
    /**
     * Wann dieser Vorgriff entstand — die Lunte, nicht die Uhr.
     *
     * `anker` taugt dafür nicht: beim vorweggenommenen ENDE ist er null,
     * und gerade dort wird die Frist gebraucht.
     */
    seit: number
  }

  const auszeitVorgriff = ref<Partial<Record<Seite, Auszeitvorgriff>>>({})

  /**
   * Wie lange ein Vorgriff höchstens UNBESTÄTIGT stehen darf.
   *
   * OHNE DIESE FRIST GIBT ES DEN FALL "HÄNGT FÜR IMMER". Ein Vorgriff wird
   * losgelassen, sobald der Abruf ihn einmal genannt und danach nicht mehr
   * genannt hat — was aber, wenn er ihn NIE nennt? Dann bleibt `gesehen`
   * falsch, und die Regel darüber hält ihn genau deshalb fest.
   *
   * Der Fall ist nicht erfunden. Scheitert ein Schreibvorgang, während
   * schon ein jüngerer unterwegs ist, unterbleibt sein `zurueckdrehen` —
   * das ist Absicht (siehe `losschicken`, "eine Abweisung, die nicht die
   * jüngste ist, wird verschwiegen"), nimmt dem Vorgriff aber den Weg
   * hinaus. Ohne Frist liefe danach eine Uhr auf der Tafel, die niemand
   * gestartet hat und die auch der nächsten Partie noch gehört.
   *
   * Zwanzig Sekunden, dieselben wie HALTEDAUER_MS und aus demselben Grund:
   * die Sendefrist ist nach acht Sekunden vorbei, und danach müssen ZWEI
   * Abrufe Gelegenheit gehabt haben, die Auszeit zu nennen. Läuft sie in
   * der Anwendung wirklich, übernimmt danach deren Uhr — eine Sekunde
   * Versatz ist der richtige Preis dafür, aus diesem Zustand
   * herauszukommen.
   */
  const VORGRIFF_FRIST_MS = HALTEDAUER_MS

  /**
   * Der Abruf holt den Vorgriff ein — und erst dann wird losgelassen.
   *
   * Zwei Fälle, und sie sind spiegelbildlich:
   *
   *   Vorweggenommener BEGINN (`anker` gesetzt). Nennt der Abruf die
   *   Auszeit, ist sie angekommen (`gesehen`). Nennt er sie DANACH nicht
   *   mehr, hat sie jemand beendet — dieses Gerät oder ein anderer —, und
   *   der Vorgriff geht. Die Uhr verschwindet damit, ohne je umgeschaltet
   *   zu haben.
   *
   *   Vorweggenommenes ENDE (`anker` null). Hier ist es umgekehrt: solange
   *   der Abruf die Auszeit noch führt, wird sie unterdrückt; nennt er sie
   *   nicht mehr, sind beide einig und der Vorgriff wird überflüssig.
   */
  watch(auszeitenLaufen, (laeuft) => {
    const naechster: Partial<Record<Seite, Auszeitvorgriff>> = {}
    for (const seite of ['A', 'B'] as Seite[]) {
      const v = auszeitVorgriff.value[seite]
      if (!v) continue

      // Die Lunte zuerst: was nie bestätigt wurde, geht nach der Frist —
      // gleich, was der Abruf gerade sagt. Siehe VORGRIFF_FRIST_MS.
      if (!v.gesehen && Date.now() - v.seit > VORGRIFF_FRIST_MS) continue

      if (v.anker === null) {
        // Vorweggenommenes Ende: fällt weg, sobald der Abruf zustimmt.
        if (laeuft[seite]) naechster[seite] = v
        continue
      }
      if (laeuft[seite]) naechster[seite] = { ...v, gesehen: true }
      else if (!v.gesehen) naechster[seite] = v
      // sonst: gesehen und jetzt weg — die Auszeit ist zu Ende.
    }
    auszeitVorgriff.value = naechster
  }, { deep: true })

  /**
   * Wer anstößt, vorweggenommen — beide Felder, weil beide mitgeschickt
   * werden.
   *
   * Gehalten wie {@link gehalten} beim Stand und aus demselben Grund: ein
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
  const anstossVorgemerkt = ref<{ first: Seite, next: Seite, seit: number } | null>(null)

  /** Der Anstoß, den die Tafel zeigen soll — Vorgriff vor Abruf. */
  const anstossStand = computed<{ first: Seite | null, next: Seite | null }>(() => {
    const v = anstossVorgemerkt.value
    if (v && Date.now() - v.seit <= HALTEDAUER_MS) return { first: v.first, next: v.next }
    return {
      first: (zusatz.value?.firstBreak ?? null),
      next: (zusatz.value?.nextBreak ?? partie.value?.nextBreak ?? null) as Seite | null,
    }
  })

  /** Hat der Abruf den Anstoß eingeholt, wird er losgelassen — wie beim Stand. */
  watch(zusatz, (neu) => {
    const v = anstossVorgemerkt.value
    if (!v || !neu) return
    if (neu.firstBreak === v.first && neu.nextBreak === v.next) anstossVorgemerkt.value = null
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
   * Auf die KENNUNG und nicht auf das Objekt: `partie` bekommt bei jedem
   * Abruf eine neue Hülle mit demselben Inhalt, und darauf zu horchen
   * hiesse, den Vorgriff alle zehn Sekunden wegzuwerfen.
   *
   * `{ immediate: true }` SEIT DEM 25.09.2026 — vorher lief dieser
   * Beobachter erst bei einem WECHSEL der Partie an diesem Tisch. Für das
   * Wiederherstellen eines Merkpostens nach einem Neuladen (siehe
   * `merkpostenWiederherstellen` unten) muss er aber auch beim ALLERERSTEN
   * Erscheinen einer Partie laufen — genau der Fall bei einem Neuladen,
   * bei dem die Partie dieselbe bleibt. Für den bisherigen Zweck ändert das
   * nichts: beim allerersten Aufruf sind `auszeitVorgriff` & Co. ohnehin
   * schon leer, `merkpostenAufraeumen`/`ergebnisAufraeumen` finden noch
   * nichts zum Abräumen, und `laeuft` steht schon auf `false`.
   */
  watch(() => partie.value?.id ?? null, (neu, alt) => {
    if (neu === alt) return
    auszeitVorgriff.value = {}
    anstossVorgemerkt.value = null
    // Die Lage gehoert der alten Partie: ein Rest von 8 auf einer frisch
    // aufgebauten Tafel waere eine Falschauskunft, mit der die erste
    // Aufnahme der neuen Partie sofort falsch rechnete.
    lageVorgemerkt.value = null
    lageGehalten.value = null
    verlauf.value = []
    // Und ein Merkposten erst recht: er wiederholte sonst einen Stand der
    // alten Partie gegen eine neue, die an diesem Tisch inzwischen steht.
    merkpostenAufraeumen()
    // Dasselbe für ein gemerktes Ende — es gehört der Partie, die gerade
    // vom Tisch geht, und nicht der, die an ihre Stelle tritt. `laeuft`
    // geht mit: ohne diese Zeile bliebe die Leiste der NEUEN Partie
    // gesperrt, wenn die alte den Tisch verliess, während ihr Ende noch auf
    // eine Wiederholung wartete (die Turnierleitung kann eingreifen, auch
    // wenn dieses Gerät gerade offline war).
    ergebnisAufraeumen()
    laeuft.value = false

    // Und erst NACH dem Aufräumen nachsehen, ob für DIESE (neue oder erste)
    // Partie ein Merkposten aus einem früheren Neuladen bereitliegt.
    if (neu) merkpostenWiederherstellen(neu)
  }, { immediate: true })

  /* ----------------------------------------------------------------------
   * DIE REIHENFOLGE DER ANTWORTEN
   * ------------------------------------------------------------------- */

  /**
   * Die Nummer des zuletzt LOSGESCHICKTEN Vorgangs.
   *
   * Sie zählt nur hoch und wird nie zurückgesetzt. `letzteNummer` ist damit
   * gleichbedeutend mit "der jüngste Tastendruck", und das ist die einzige
   * Auskunft, auf die es unten ankommt.
   */
  let letzteNummer = 0

  /** Die höchste Nummer, deren Antwort schon da war. Siehe `losschicken`. */
  let hoechsteAntwort = 0

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
   *   (a) `n < hoechsteAntwort` — eine JÜNGERE Antwort war schon da.
   *       Dann ist diese hier überholt, und zwar restlos: sie beschreibt
   *       einen Stand, über den die Anwendung inzwischen hinweggegangen ist.
   *       Sie wird weggeworfen, ohne Wirkung und ohne Meldung. Das ist die
   *       Antwort auf das Bild oben.
   *
   *   (b) `n === letzteNummer` — es ist nichts JÜNGERES mehr unterwegs.
   *       Nur dann wird die Anzeige festgeschrieben (`vorgemerkt` gelöscht,
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
  function losschicken<T>(auftrag: {
    was: () => Promise<T>
    /** Die Antwort, wenn sie nicht überholt ist — auch wenn Jüngeres läuft. */
    angekommen?: (summary: T) => void
    /** Was die Anzeige zurückdreht, wenn DIESER Vorgang der jüngste ist und scheitert. */
    zurueckdrehen?: () => void
    /**
     * Danach die Tafel neu holen.
     *
     * NUR dort, wo die Antwort die Wirkung nicht zeigt — siehe `auszeit`
     * und `anstoss`. Beim Stand wäre es verschenkte Zeit: die Antwort des
     * Endpunkts NENNT den Stand, den die Anwendung führt.
     */
    nachfassen?: boolean
    /**
     * Was bei einem NETZFEHLER geschehen soll, statt der Anwendungsabweisung
     * darunter — nur gesetzt, wo ein Netzausfall überbrückt werden soll
     * (siehe `merkposten`/`setzen`, "DER NETZFEHLER" weiter oben). Bleibt
     * dieses Feld leer, läuft ein Netzfehler durch denselben Zweig wie jede
     * fachliche Abweisung: Anzeige zurück, rote Zeile, fertig. `losschicken`
     * selbst unterscheidet nicht mehr als das — WAS wiederholt wird und WIE
     * lange, entscheidet allein der Aufrufer.
     */
    netzfehler?: () => void
  }) {
    const n = ++letzteNummer
    melden(null)
    wartenBeginnt()

    auftrag.was().then(
      (summary) => {
        if (n < hoechsteAntwort) return
        hoechsteAntwort = n
        auftrag.angekommen?.(summary)
        if (n !== letzteNummer) return
        vorgemerkt.value = null
        lageVorgemerkt.value = null
        wartenEndet()
        /*
         * Ohne `await` und mit Absicht: der Abruf ist eine Auffrischung und
         * keine Bedingung. Wer darauf wartete, hätte den zweiten und dritten
         * Umlauf wieder im Tastendruck — das war der Fehler, der hier gerade
         * behoben wurde. Schlägt er fehl, holt der Zehn-Sekunden-Takt es
         * nach; deshalb auch kein `catch`, `holen` schluckt selbst.
         */
        if (auftrag.nachfassen) void nachschauen()
      },
      (roh: unknown) => {
        if (n < hoechsteAntwort) return
        hoechsteAntwort = n
        if (n !== letzteNummer) return
        /*
         * NETZFEHLER UND NICHT FACHLICH, UND DER AUFRUFER WILL WIEDERHOLEN.
         * Die Anzeige bleibt unangetastet stehen: kein Zurückdrehen, keine
         * rote Zeile, kein `wartenEndet` — sie zeigt weiter den vorgemerkten
         * Stand, bis entweder die Wiederholung durchkommt (dann läuft die
         * Antwort oben durch den ERFOLGS-Zweig) oder die Anwendung ihn
         * irgendwann tatsächlich ablehnt (dann greift der Zweig darunter).
         */
        if (auftrag.netzfehler && istNetzfehler(roh)) {
          auftrag.netzfehler()
          return
        }
        abweisen(roh)
        auftrag.zurueckdrehen?.()
        vorgemerkt.value = null
        lageVorgemerkt.value = null
        wartenEndet()
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
  function alleUeberholen() {
    hoechsteAntwort = ++letzteNummer
    vorgemerkt.value = null
    lageVorgemerkt.value = null
    wartenEndet()
    merkpostenAufraeumen()
  }

  /**
   * Ein Schreibvorgang, der die Tafel ANHÄLT — für die beiden, bei denen das
   * richtig ist.
   *
   * Er wartet die Antwort ab, sperrt solange die ganze Leiste und holt
   * danach die Tafel neu. Das ist teuer, und deshalb gehen nur `beenden` und
   * `aufgeben` hier durch: sie melden ein Ergebnis, reichen den Turnierbaum
   * weiter und lassen sich nicht zurücknehmen. Siehe DRITTENS im Kopf.
   */
  async function schreiben<T>(was: () => Promise<T>): Promise<T | null> {
    if (laeuft.value) return null
    laeuft.value = true
    melden(null)
    try {
      const summary = await was()
      await nachschauen()
      return summary
    }
    catch (roh: unknown) {
      abweisen(roh)
      return null
    }
    finally {
      laeuft.value = false
    }
  }

  /**
   * Ein neuer Stand — auf der Tafel sofort, in der Anwendung gleich.
   *
   * @param altMerken ob der bisherige Stand in den Verlauf soll (bei
   *   {@link zurueck} nicht, sonst liefe man im Kreis)
   * @param auchZurueck was neben dem Verlauf noch zurückzunehmen ist,
   *   falls dieser Vorgang der jüngste ist und scheitert
   * @param ruecknahme ob dieser Stand am Tisch ZURÜCKGENOMMEN wird — die
   *   Taste "Undo" und das Minus je Seite. Es ist keine Angabe über den
   *   Stand, sondern über die Bedienung, und sie geht mit auf die Reise:
   *   die Anwendung sieht sonst nur, dass eine Zahl kleiner wurde, und ein
   *   Vertipper sähe im Verlauf aus wie eine Richtigstellung aus dem
   *   Turnierbüro. Siehe `competition.score_writes_its_history`.
   */
  function setzen(neu: Standpaar, altMerken = true, auchZurueck?: () => void,
                  ruecknahme = false, vierzehn?: Vierzehnfassung) {
    const m = partie.value
    if (!m) return
    const alt = schrittJetzt(vierzehn?.foulart)

    /*
     * EIN NEUER TIPP ERSETZT EINEN ETWA NOCH AUSSTEHENDEN MERKPOSTEN — er
     * reiht sich nicht dahinter (siehe "DER NETZFEHLER" weiter oben). Der
     * alte Versuch trägt ohnehin einen überholten Stand; ihn jetzt noch
     * nachzuholen, könnte den Stand, den DIESER Tipp gleich schickt, später
     * wieder überschreiben.
     */
    merkpostenAufraeumen()

    /*
     * ZUERST DIE ANZEIGE, DANN DAS NETZ — und in dieser Reihenfolge steht
     * die ganze Änderung. Ab hier liest der nächste Tastendruck (`zaehlen`)
     * bereits den neuen Wert, und deshalb ergeben zwei schnelle "+" zwei
     * Sätze und nicht einen.
     */
    vorgemerkt.value = { ...neu }
    /*
     * DIE LAGE GEHT MIT DEMSELBEN TASTENDRUCK LOS — und zwar sofort, wie der
     * Stand. Wer „Rack" drückt, sieht die Restkugeln im selben Augenblick auf
     * 15 springen; kommt der Schreibvorgang nicht durch, springen Stand UND
     * Rest zusammen zurück.
     *
     * WER AM TISCH IST, GEHT ÜBER `anstossVorgemerkt` und nicht über ein
     * eigenes Feld. Das ist dieselbe Auskunft, die die Tafel oben schon
     * zeichnet (siehe `anstossStand`) — ein zweites Feld daneben wäre ein
     * zweiter Schattenzustand, und die beiden liefen früher oder später
     * auseinander.
     */
    if (vierzehn) {
      lageVorgemerkt.value = {
        rest: vierzehn.lage.rest,
        fouls: { ...vierzehn.lage.fouls },
        lauf: { ...vierzehn.lage.lauf },
        high: { ...vierzehn.lage.high },
      }
      anstossVorgemerkt.value = {
        first: (anstossStand.value.first ?? vierzehn.amTisch) as Seite,
        next: vierzehn.amTisch,
        seit: Date.now(),
      }
    }
    if (altMerken) merken(alt)

    const auftrag = standAuftragBauen(m, neu, ruecknahme, vierzehn, () => {
      if (altMerken) verlauf.value.pop()
      auchZurueck?.()
    })

    losschicken({
      ...auftrag,
      // Nur der Stand wiederholt sich selbst bei einem Netzfehler — siehe
      // "NUR DIE PUNKTE" bei `merkposten` weiter oben.
      netzfehler: () => merkpostenSenden(
        m.id, auftrag, { art: 'stand', basis: alt.stand, neu, ruecknahme, vierzehn }),
    })
  }

  /**
   * Der Rumpf von `PUT /score` und was mit seiner Antwort geschieht — EINMAL
   * GEBAUT UND ZWEIMAL GEBRAUCHT: beim ersten Tipp (`setzen`) UND beim
   * Wiederherstellen eines gespeicherten Merkpostens nach einem Neuladen
   * (`standWiederherstellen`). Ein Inline-Objekt in `setzen` liesse sich für
   * den zweiten Fall nicht aufheben, denn dort gibt es kein `setzen`, das es
   * bauen könnte — nur einen gespeicherten `GespeicherterStand`.
   *
   * @param nachZurueckdrehen was NEBEN dem Merkposten noch zurückzunehmen
   *   ist, wenn dieser Vorgang der jüngste ist und fachlich scheitert — beim
   *   ersten Tipp der Verlauf, beim Wiederherstellen nichts (siehe dort).
   */
  function standAuftragBauen(
    m: Match, neu: Standpaar, ruecknahme: boolean, vierzehn: Vierzehnfassung | undefined,
    nachZurueckdrehen: () => void = () => {},
  ): StandAuftrag {
    return {
      was: () => $fetch<StandAntwort>(
        `/api/board/matches/${m.id}/score`,
        {
          method: 'PUT',
          body: {
            scoreA: neu.A, scoreB: neu.B, undo: ruecknahme,
            /*
             * EIN AUFRUF UND NICHT ZWEI. Punkte, Restkugeln, Foulzähler und
             * der Tisch gehören zu demselben Stoss; zwei Umläufe wären zwei
             * Wartezeiten für einen Tastendruck — und der zweite könnte
             * ausbleiben. Ein halber Zustand (Punkte gebucht, Rest nicht) ist
             * am Tisch schlimmer als gar keiner.
             */
            ...(vierzehn
              ? {
                  ballsOnTable: vierzehn.lage.rest,
                  foulsA: vierzehn.lage.fouls.A,
                  foulsB: vierzehn.lage.fouls.B,
                  /*
                   * BEIDE SEITEN UND BEIDE ZAHLEN, jedes Mal. Nur EINE Seite
                   * zu schicken wäre zwar meist richtig — es ist immer nur
                   * einer am Tisch —, aber beim Rückgängig stimmt es nicht:
                   * ein zurückgenommener Tischwechsel setzt die Aufnahme des
                   * einen zurück UND die des anderen auf null. Absolut
                   * heisst absolut, und das ist die ganze Bauart hier.
                   */
                  runA: vierzehn.lage.lauf.A,
                  highA: vierzehn.lage.high.A,
                  runB: vierzehn.lage.lauf.B,
                  highB: vierzehn.lage.high.B,
                  atTable: vierzehn.amTisch,
                  ...(vierzehn.foulart ? { foul: vierzehn.foulart } : {}),
                }
              : {}),
          },
          timeout: SENDEFRIST_MS,
        },
      ),
      // Der Stand der ANTWORT und nicht der geschickte: die Anwendung ist die
      // Stelle, die ihn festhält, und sie darf ihn anders auslegen.
      angekommen: (antwort) => {
        // Angekommen heisst: ein etwa noch offener Merkposten hat sich
        // erledigt — gleich, ob es der erste Versuch war oder eine
        // Wiederholung nach einem Netzausfall.
        merkpostenAufraeumen()
        gehalten.value = { stand: { A: antwort.scoreA, B: antwort.scoreB }, seit: Date.now() }
        // Dieselbe Regel für die Lage — und nur, wenn die Antwort sie führt.
        // Eine Satzpartie bekommt hier nichts zurück und soll auch nichts
        // festhalten.
        if (vierzehn && antwort.ballsOnTable !== null && antwort.ballsOnTable !== undefined) {
          lageGehalten.value = {
            wert: {
              rest: antwort.ballsOnTable,
              fouls: { A: antwort.foulsA ?? 0, B: antwort.foulsB ?? 0 },
              lauf: { A: antwort.runA ?? 0, B: antwort.runB ?? 0 },
              high: { A: antwort.highA ?? 0, B: antwort.highB ?? 0 },
            },
            seit: Date.now(),
          }
        }
      },
      /*
       * Zurückgedreht wird auf `gehalten`, also auf den letzten bestätigten
       * Stand — nicht auf den Stand vor DIESEM Tipp. Bei mehreren Tipps
       * hintereinander ist das derselbe Wert; bei einem Tipp, dessen
       * Vorgänger noch unterwegs war, ist es der richtigere: gezeigt wird,
       * was die Anwendung zuletzt nachweislich führte, und nicht, was das
       * Gerät sich zwischendurch gedacht hat.
       *
       * NUR HIER, BEI DER FACHLICHEN ABWEISUNG — nicht beim Netzfehler
       * (siehe `netzfehler` in `setzen`/`standWiederherstellen`): der wird
       * gemerkt und wiederholt statt zurückgedreht, und räumt den
       * Merkposten deshalb nicht hier auf, sondern erst in `angekommen`
       * oder wenn diese Zeile hier doch noch erreicht wird.
       */
      zurueckdrehen: () => {
        merkpostenAufraeumen()
        nachZurueckdrehen()
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
   * Browser). Der Zifferblock zählt nur aufwärts — `blockOeffnen` wird an
   * allen vier Stellen mit Vorzeichen +1 geöffnet.
   */
  function zaehlen(seite: Seite, schritt: number) {
    const jetzt = stand.value
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
     * `zubuchbar` deckelt, was über die Distanz hinausführte: aus einem
     * Zifferblock-Eintrag „+7" bei 97 von 100 werden 3. Für das einzelne
     * `+1` der Satzfassung ist das meist ein Nullgeschäft — die Sperre in
     * der Leiste kommt ihm zuvor —, und genau deshalb steht es hier und
     * nicht dort: der Zifferblock (`+ N`) trägt eine ganze Aufnahme ein,
     * und der kommt an derselben Zeile vorbei.
     *
     * NUR AUFWÄRTS, siehe `zubuchbar`. Ein negativer Schritt geht
     * unverändert durch — abwärts ist Berichtigen.
     */
    const roh = jetzt[seite] + zubuchbar(seite, schritt)
    const neu = {
      ...jetzt,
      [seite]: straightPool.value ? roh : Math.max(0, roh),
    } as Standpaar
    if (neu.A === jetzt.A && neu.B === jetzt.B) return
    setzen(neu, true, undefined, schritt < 0)
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
   * SIE SCHREIBEN IMMER DEM ZU, DER AM TISCH WAR — `anstossStand.next`, also
   * der Zustand VOR diesem Tastendruck. Wer danach dran ist, steht in
   * demselben Aufruf mit drin.
   * ------------------------------------------------------------------- */

  /** Wer gerade am Tisch ist. Null heisst: der Anstoss steht noch aus. */
  const amTisch = computed<Seite | null>(() => anstossStand.value.next)

  /** Der ganze Zustand, so wie er JETZT gilt — die Vorlage fuer den Verlauf. */
  function schrittJetzt(foulart?: 'STANDARD' | 'BREAK' | 'THIRD'): Schritt {
    return {
      stand: { ...stand.value },
      lage: {
        rest: lage.value.rest,
        fouls: { ...lage.value.fouls },
        lauf: { ...lage.value.lauf },
        high: { ...lage.value.high },
      },
      amTisch: amTisch.value,
      ...(foulart ? { foulart } : {}),
    }
  }

  /** Die andere Seite. */
  function gegen(seite: Seite): Seite {
    return seite === 'A' ? 'B' : 'A'
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
   * @param seite Wer am Tisch WAR — ihm gehört die Aufnahme.
   * @param punkte Wie viele Kugeln er auf diesem Vorgang legal versenkt hat.
   * @param bleibt Ob er am Tisch bleibt. Nur das Rack lässt die Aufnahme
   *   weiterlaufen (WPA 7.4); alles andere gibt den Tisch weg und beendet
   *   sie.
   *
   * FOULS MINDERN SIE NICHT, SIE BEENDEN SIE. WPA 7.7 zieht die Strafpunkte
   * vom STAND ab („Fouls are penalized by subtracting points from the
   * offending player's score") und sagt über die Aufnahme nichts — sie ist
   * die Folge LEGAL VERSENKTER Kugeln, und ein Foul versenkt keine. Wer 30
   * macht und dann foult, hat einen High run von 30 und einen Stand von 29.
   * Die Fouls kommen deshalb mit `punkte: 0` hier durch und nicht mit −1.
   *
   * DER HIGH RUN WÄCHST MIT DER LAUFENDEN und nicht erst an ihrem Ende. Wer
   * mitten im Lauf über seinen bisherigen Höchstwert steigt, soll ihn auch
   * dann steigen sehen, wenn die Aufnahme noch weitergeht — und beim
   * Rückgängig steht der alte Wert in demselben Schritt, der ihn gehoben hat.
   * Die Prüfbedingung `match_slot_runs` schreibt dieselbe Ordnung fest.
   */
  function laufFort(seite: Seite, punkte: number, bleibt: boolean):
  { lauf: Standpaar, high: Standpaar } {
    const jetzt = lage.value
    const gesamt = jetzt.lauf[seite] + punkte
    return {
      lauf: { ...jetzt.lauf, [seite]: bleibt ? gesamt : 0 } as Standpaar,
      high: {
        ...jetzt.high,
        [seite]: Math.max(jetzt.high[seite], gesamt),
      } as Standpaar,
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
  function restEintragen(uebrig: number) {
    const seite = amTisch.value
    if (!seite) return
    const jetzt = lage.value
    if (uebrig < 0 || uebrig > jetzt.rest) return

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
    const punkte = zubuchbar(seite, jetzt.rest - uebrig)
    setzen(
      { ...stand.value, [seite]: stand.value[seite] + punkte } as Standpaar,
      true, undefined, false,
      {
        lage: {
          rest: uebrig <= 1 ? VOLLES_RACK : uebrig,
          fouls: { ...jetzt.fouls, [seite]: 0 } as Standpaar,
          // Der Fehlstoss beendet die Aufnahme — die Kugeln DIESES Stosses
          // zaehlen noch zu ihr, der Tisch geht danach weg.
          ...laufFort(seite, punkte, false),
        },
        amTisch: gegen(seite),
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
   * @param auchDieFuenfzehnte Die fuenfzehnte fiel auf demselben Stoss, der
   *   die vierzehnte erzielte (WPA 7.8 a). Dann zaehlen ALLE verbliebenen
   *   Kugeln, und alle fuenfzehn werden neu aufgebaut. Das ist der Grund,
   *   warum „0 uebrig" ein gueltiger Fall sein muss und nicht nur „1".
   *
   * Danach liegen in beiden Faellen 15: einmal vierzehn im Dreieck plus der
   * Breakball, einmal fuenfzehn neu aufgebaute.
   */
  function rack(auchDieFuenfzehnte = false) {
    const seite = amTisch.value
    if (!seite) return
    const jetzt = lage.value
    // Gedeckelt wie beim Fehlstoss und aus demselben Grund: Stand,
    // Restkugeln und Aufnahme kommen aus dieser einen Zahl.
    const punkte = zubuchbar(seite,
                             Math.max(0, jetzt.rest - (auchDieFuenfzehnte ? 0 : 1)))

    setzen(
      { ...stand.value, [seite]: stand.value[seite] + punkte } as Standpaar,
      true, undefined, false,
      {
        lage: {
          rest: VOLLES_RACK,
          fouls: { ...jetzt.fouls, [seite]: 0 } as Standpaar,
          // DIE AUFNAHME LAEUFT WEITER — das Rack ist der EINZIGE Vorgang
          // mit `bleibt: true`, und genau deshalb gibt es im Straight Pool
          // Laeufe ueber hundert Punkte (WPA 7.4).
          ...laufFort(seite, punkte, true),
        },
        // ER BLEIBT. Das ist der ganze Unterschied zum Fehlstoss, und der
        // Grund, aus dem der Knopf ueberhaupt eigens dasteht.
        amTisch: seite,
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
    const seite = amTisch.value
    if (!seite) return
    const jetzt = lage.value
    setzen(
      { ...stand.value }, true, undefined, false,
      {
        lage: {
          rest: jetzt.rest,
          fouls: { ...jetzt.fouls, [seite]: 0 } as Standpaar,
          // Keine Punkte, aber der Tisch geht weg: die Aufnahme ist zu Ende.
          ...laufFort(seite, 0, false),
        },
        amTisch: gegen(seite),
      },
    )
  }

  /**
   * DAS FOUL (WPA 7.9 bis 7.11) — DREI GRIFFE UND NICHT ZWEI.
   *
   * @param griff Was am Tisch passiert ist:
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
   * deshalb steht `rest` hier ausdruecklich auf {@link VOLLES_RACK} und
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
   * {@link laufFort}. Auch das dritte Standardfoul, bei dem der Suender am
   * Tisch BLEIBT: eine Aufnahme ist die Folge legal versenkter Kugeln, und
   * die ist mit dem Foul gerissen.
   */
  function foul(griff: Foulgriff = 'STANDARD') {
    const seite = amTisch.value
    if (!seite) return
    const jetzt = lage.value

    if (griff === 'BREAK_AGAIN' || griff === 'BREAK_ACCEPT') {
      const nochmal = griff === 'BREAK_AGAIN'
      setzen(
        { ...stand.value, [seite]: stand.value[seite] - 2 } as Standpaar,
        true, undefined, false,
        {
          lage: {
            // Wiederholung: neu aufgebaut, also wieder fuenfzehn (7.2/7.6).
            // Annahme: die Lage bleibt genau so liegen, wie sie liegt.
            rest: nochmal ? VOLLES_RACK : jetzt.rest,
            // UNBERUEHRT — 7.11, und zwar bei jedem Fehlversuch.
            fouls: { ...jetzt.fouls },
            ...laufFort(seite, 0, false),
          },
          // DER EINZIGE UNTERSCHIED ZWISCHEN DEN BEIDEN GRIFFEN.
          amTisch: nochmal ? seite : gegen(seite),
          foulart: 'BREAK',
        },
      )
      return
    }

    const folge = jetzt.fouls[seite] + 1
    const dritte = folge >= 3
    setzen(
      { ...stand.value, [seite]: stand.value[seite] - (dritte ? 16 : 1) } as Standpaar,
      true, undefined, false,
      {
        lage: {
          rest: dritte ? VOLLES_RACK : jetzt.rest,
          fouls: { ...jetzt.fouls, [seite]: dritte ? 0 : folge } as Standpaar,
          ...laufFort(seite, 0, false),
        },
        amTisch: dritte ? seite : gegen(seite),
        foulart: dritte ? 'THIRD' : 'STANDARD',
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
  function tischWechseln() {
    const seite = amTisch.value
    if (!seite) return
    const jetzt = lage.value
    setzen({ ...stand.value }, true, undefined, false,
           {
             lage: {
               rest: jetzt.rest,
               fouls: { ...jetzt.fouls },
               ...laufFort(seite, 0, false),
             },
             amTisch: gegen(seite),
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
   * (`if (!fehler.value)`) — das ging nur, solange auf die Antwort gewartet
   * wurde, und hätte ohne dieses Warten den Fehltipper zweimal zurückgenommen.
   */
  function zurueck() {
    const alt = verlauf.value[verlauf.value.length - 1]
    if (!alt) return
    verlauf.value.pop()
    /*
     * IM STRAIGHT POOL GEHT DIE GANZE LAGE MIT ZURÜCK — Restkugeln,
     * Foulzähler und der Tisch. Ohne sie nähme das Undo nur die Punkte
     * zurück und liesse den Rest stehen, und die nächste Aufnahme rechnete
     * mit einer Zahl, die zu einem Stand gehört, den es nicht mehr gibt.
     *
     * `alt.amTisch` kann nur dann fehlen, wenn der Schritt vor dem ersten
     * Anstoss entstanden ist — dann gibt es auch nichts zurückzugeben.
     */
    setzen(alt.stand, false, () => verlauf.value.push(alt), true,
           straightPool.value && alt.amTisch
             ? { lage: alt.lage, amTisch: alt.amTisch, foulart: alt.foulart }
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
   * VORWEGGENOMMEN SEIT DEM 15.09.2026 — siehe `anstossVorgemerkt`, wo die
   * Abwägung gegen den früheren Einwand steht. Nachgefasst wird weiter: die
   * Wirkung steht nicht in der Antwort, und der Vorgriff soll so kurz wie
   * möglich der einzige Zeuge sein.
   */
  function anstoss(seite: Seite) {
    const m = partie.value
    if (!m) return
    const erster = (anstossStand.value.first ?? seite) as Seite
    const vorher = anstossVorgemerkt.value

    // Zuerst die Anzeige, dann das Netz — dieselbe Reihenfolge wie in
    // `setzen`, und aus demselben Grund: der Balken springt sofort um.
    anstossVorgemerkt.value = { first: erster, next: seite, seit: Date.now() }

    losschicken({
      was: () => $fetch<{ firstBreak: string, nextBreak: string }>(
        `/api/board/matches/${m.id}/break`, {
          method: 'PUT',
          body: { firstBreak: erster, nextBreak: seite },
          timeout: SENDEFRIST_MS,
        }),
      // Zurück auf den Stand VOR diesem Druck und nicht auf null: war schon
      // etwas vorgemerkt, das der Abruf noch nicht bestätigt hat, wäre null
      // ein Sprung auf eine Auskunft, die älter ist als beide.
      zurueckdrehen: () => { anstossVorgemerkt.value = vorher },
      nachfassen: true,
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
   * `auszeitVorgriff`.
   *
   * Der Einwand von gestern ("das Gerät kennt die Länge nicht") ist nicht
   * weggewischt, sondern erledigt: die Länge steht jetzt in
   * `zusatz.timeoutSeconds`. Fehlt sie doch einmal, wird der BEGINN nicht
   * vorweggenommen — eine Uhr ohne Länge wäre eine erfundene Restzeit, und
   * das war der Einwand zu Recht. Das ENDE braucht keine Länge und wird
   * darum immer vorweggenommen.
   */
  function auszeit(seite: Seite, laeuftGerade: boolean) {
    const m = partie.value
    if (!m) return

    const vorher = auszeitVorgriff.value[seite]
    const dauer = zusatz.value?.timeoutSeconds ?? null

    if (laeuftGerade) {
      auszeitVorgriff.value = {
        ...auszeitVorgriff.value, [seite]: { anker: null, gesehen: false, seit: Date.now() },
      }
    }
    else if (dauer !== null) {
      auszeitVorgriff.value = {
        ...auszeitVorgriff.value, [seite]: { anker: Date.now(), gesehen: false, seit: Date.now() },
      }
    }

    losschicken({
      was: () => $fetch<{
        side?: string, taken?: number, status?: string, withdrawn?: boolean
      }>(
        `/api/board/matches/${m.id}/timeout`, {
          method: 'POST',
          body: { side: seite, running: laeuftGerade },
          timeout: SENDEFRIST_MS,
        }),
      /*
       * Abgewiesen heisst: die Uhr gehört weg beziehungsweise wieder her.
       * Das ist der Fall TIMEOUTS_USED_UP — die Fläche sagt "keine mehr
       * übrig", und eine Uhr, die daneben weiterliefe, wäre die
       * schlimmere Falschmeldung von beiden.
       */
      zurueckdrehen: () => { auszeitVorgriffSetzen(seite, vorher) },
      nachfassen: true,
    })
  }

  /** Einen Vorgriff setzen oder entfernen — an einer Stelle, für drei Aufrufer. */
  function auszeitVorgriffSetzen(seite: Seite, wert: Auszeitvorgriff | undefined) {
    const naechster = { ...auszeitVorgriff.value }
    if (wert) naechster[seite] = wert
    else delete naechster[seite]
    auszeitVorgriff.value = naechster
  }

  /**
   * DIE AUSZEIT ZURÜCKNEHMEN — der Weg des Schiedsrichtermenüs.
   *
   * NICHT {@link auszeit}, und das ist seit dem 15.09.2026 der ganze Punkt.
   * Bis dahin rief der Menüpunkt schlicht `auszeit(seite, true)` auf, also
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
  function auszeitRuecknahme(seite: Seite, code = '') {
    const m = partie.value
    if (!m) return

    const vorher = auszeitVorgriff.value[seite]
    auszeitVorgriff.value = {
      ...auszeitVorgriff.value, [seite]: { anker: null, gesehen: false, seit: Date.now() },
    }

    losschicken({
      was: () => $fetch<{
        side?: string, taken?: number, status?: string, withdrawn?: boolean
      }>(
        `/api/board/matches/${m.id}/timeout/withdraw`, {
          method: 'POST',
          body: { side: seite, ...(code === '' ? {} : { boardPin: code }) },
          timeout: SENDEFRIST_MS,
        }),
      zurueckdrehen: () => { auszeitVorgriffSetzen(seite, vorher) },
      // Das Guthaben steht in `zusatz.timeoutsTaken` und nicht in der
      // Anzeige dieser Datei — ohne Nachfassen bliebe im Menü "2 taken"
      // stehen, obwohl die Rücknahme längst durch ist.
      nachfassen: true,
    })
  }

  /* ----------------------------------------------------------------------
   * DAS ENDE, WENN ES AN EINEM NETZFEHLER SCHEITERT
   * ----------------------------------------------------------------------
   *
   * Der Auftraggeber, präzisiert am 25.09.2026: "eine Partie ohne WiFi am
   * Tablet zu Ende spielen können, exkl. Schiri-Eingriffe". Zu Ende SPIELEN
   * schliesst das ABSCHLIESSEN ein — ohne `beenden`/`aufgeben` bliebe die
   * Partie auf "läuft" stehen und blockierte den Tisch, und genau das soll
   * dieser ganze Umbau verhindern.
   *
   * DIE BEGRÜNDUNG ÜBER `beenden`, WARUM ES NICHT VORWEGGENOMMEN WIRD (siehe
   * DRITTENS im Kopf der Datei), BLEIBT UNVERÄNDERT RICHTIG: die Fläche darf
   * nicht sofort "fertig" behaupten und es eine Sekunde später doch nicht
   * sein. Sie sagt NICHT, dass ein Netzfehler nicht überbrückt werden dürfe
   * — sie sagt nur, dass die Anzeige dabei nicht vorgreifen darf. Deshalb
   * bleiben `beenden` und `aufgeben` ABWARTEND: sie laufen weiter über
   * `laeuft` und sperren die Leiste, solange ein Versuch — der erste oder
   * eine Wiederholung — unterwegs ist oder auf seine Wiederholung wartet.
   *
   * FACHLICH GENAUSO WIE BEIM STAND: eine Abweisung mit einer Fachkennung
   * (etwa RACE_NOT_REACHED, weil das Turnierbüro inzwischen selbst
   * eingegriffen hat) wird gezeigt und NICHT wiederholt. Nur ein Netzfehler
   * — keine Verbindung, eine Zeitüberschreitung, 502/503/504 — wird gemerkt
   * (`ergebnis`) und mit denselben wachsenden Abständen erneut versucht wie
   * ein Stand (`NETZ_WIEDERHOLUNG_MS`, siehe dort für die Begründung gegen
   * `navigator.onLine`).
   *
   * DIE TAFEL SAGT DABEI AUSDRÜCKLICH NICHT "FINISHED". Es gibt hier keinen
   * Vorgriff — anders als beim Stand ist der ganze Sinn dieser Route, dass
   * die Anwendung selbst entscheidet, ob die Partie zu Ende ist (siehe
   * "KEIN RUMPF, UND KEIN SIEGER IM AUFRUF" unten). `ergebnisAusstehend`
   * ist deshalb nur eine Auskunft — "das Ergebnis liegt hier bereit, die
   * Anwendung hat es noch nicht gesehen" — und keine Behauptung, dass es
   * schon gilt.
   *
   * EIN GEMERKTES ERGEBNIS ERSETZT EINEN GEMERKTEN STAND, NICHT UMGEKEHRT.
   * `aufgeben` schickt scoreA/scoreB selbst mit (siehe dort) — ein noch
   * offener Punkt-Merkposten wäre in dem Moment nur eine überflüssige
   * zweite Wahrheit über denselben Stand und wird deshalb VOR dem Versuch
   * aufgeräumt. `beenden` dagegen trägt gar keinen Stand im Aufruf
   * (`competition.confirm_match_result` liest ihn aus der Datenbank) — ein
   * zu diesem Zeitpunkt noch offener Punkt-Merkposten bliebe hier unberührt
   * und liefe unabhängig weiter; das ist der eine Fall, den dieser Umbau
   * NICHT auflöst (siehe die Meldung am Ende des Auftrags).
   *
   * ÜBERSTEHT EBENFALLS EIN NEULADEN — genau wie der Stand (siehe
   * `GespeicherterMerkposten` am Kopf der Datei): am selben Schlüssel liegt
   * hier `{ art: 'ende', ... }`, und `merkpostenWiederherstellen` liest ihn
   * genauso aus wie einen Stand.
   */
  let ergebnis: {
    matchId: string
    was: () => Promise<{ advanced: number, newlySettled: number }>
    gespeichert: GespeichertesEnde
  } | null = null
  let ergebnisUhr: ReturnType<typeof setTimeout> | null = null
  let ergebnisVersuch = 0

  /**
   * Liegt ein Ende bereit, das die Anwendung noch nicht gesehen hat?
   *
   * Die Tafel zeigt dafür ausdrücklich NICHT "finished" (siehe oben), aber
   * auch nicht nichts — sonst stünde die Leiste minutenlang gesperrt, ohne
   * dass irgendwer sagen könnte, warum.
   */
  const ergebnisAusstehend = ref(false)

  function ergebnisAufraeumen() {
    if (ergebnisUhr) { clearTimeout(ergebnisUhr); ergebnisUhr = null }
    if (ergebnis) merkpostenGeloescht(ergebnis.matchId)
    ergebnis = null
    ergebnisVersuch = 0
    ergebnisAusstehend.value = false
  }

  /** Einen Versuch unternehmen — den ersten oder eine Wiederholung. */
  async function ergebnisVersuchen() {
    const eintrag = ergebnis
    if (!eintrag) return
    try {
      await eintrag.was()
      await nachschauen()
      // Was zu Ende ist, wird nicht mehr zurückgenommen — und ein Verlauf,
      // der auf eine beendete Partie zeigt, wäre eine Falle.
      verlauf.value = []
      gehalten.value = null
      lageGehalten.value = null
      alleUeberholen()
      ergebnisAufraeumen()
      laeuft.value = false
    }
    catch (roh: unknown) {
      if (istNetzfehler(roh)) {
        // Erst HIER abgelegt und nicht schon in `beendenSchreiben`: ein
        // Ende, das beim ersten Versuch sofort durchgeht (der häufigste
        // Fall, solange das Netz steht), soll gar nicht erst in
        // `localStorage` stehen — dort gehört nur, was WIRKLICH noch
        // aussteht.
        merkpostenSpeichern(eintrag.matchId, eintrag.gespeichert)
        ergebnisAusstehend.value = true
        ergebnisWiederholungPlanen()
        // `laeuft` bleibt WAHR — die Leiste bleibt gesperrt, bis entweder
        // die Wiederholung durchkommt oder die Anwendung doch noch fachlich
        // ablehnt. Das ist dieselbe Abwägung wie beim ersten Versuch: eine
        // Fläche, die zwischendurch wieder "geht", behauptete ein Ende, das
        // gerade nicht feststeht.
        return
      }
      abweisen(roh)
      ergebnisAufraeumen()
      laeuft.value = false
    }
  }

  function ergebnisWiederholungPlanen() {
    if (ergebnisUhr) clearTimeout(ergebnisUhr)
    const wartezeit = NETZ_WIEDERHOLUNG_MS[
      Math.min(ergebnisVersuch, NETZ_WIEDERHOLUNG_MS.length - 1)
    ]!
    ergebnisUhr = setTimeout(() => {
      ergebnisUhr = null
      if (!ergebnis) return
      ergebnisVersuch++
      void ergebnisVersuchen()
    }, wartezeit)
  }

  /**
   * Der abwartende Weg für `beenden`/`aufgeben` — dieselbe Sperre wie
   * `schreiben`, aber mit der Netzwiederholung von oben statt einer
   * endgültigen Abweisung.
   */
  async function beendenSchreiben(
    matchId: string,
    was: () => Promise<{ advanced: number, newlySettled: number }>,
    gespeichert: GespeichertesEnde,
  ) {
    if (laeuft.value) return
    laeuft.value = true
    melden(null)
    ergebnis = { matchId, was, gespeichert }
    await ergebnisVersuchen()
  }

  /**
   * Ein gespeichertes Ende nach einem Neuladen wiederherstellen.
   *
   * KEIN ABGLEICH BEI `confirm` — der Aufruf trägt keinen Stand, die
   * Anwendung liest ihn selbst aus der Datenbank (siehe die Begründung vor
   * `beenden`); es gibt hier nichts, das veralten könnte.
   *
   * BEI `result` DERSELBE ABGLEICH WIE BEIM STAND (`standWiederherstellen`):
   * `basis` ist der Stand, auf dem `rumpf.scoreA`/`scoreB` beruhen. Führt
   * der Server inzwischen einen anderen, hat sich seit dem Netzausfall
   * etwas geändert, von dem dieses Gerät nichts weiß — verworfen statt
   * gesendet, aus demselben Grund. `basis` ist `null` bei WALKOVER: dort
   * ist der Rumpf immer 0:0, unabhängig vom tatsächlichen Stand, und es
   * gibt nichts, wogegen sich das abgleichen ließe.
   */
  function ergebnisWiederherstellen(matchId: string, gespeichert: GespeichertesEnde) {
    const m = partie.value
    if (!m) return

    if (gespeichert.pfad === 'result' && gespeichert.basis) {
      const aktuell: Standpaar = { A: rohstand(m, 'A'), B: rohstand(m, 'B') }
      if (aktuell.A !== gespeichert.basis.A || aktuell.B !== gespeichert.basis.B) {
        merkpostenGeloescht(matchId)
        return
      }
    }

    const was = () => gespeichert.pfad === 'confirm'
      ? $fetch<{ advanced: number, newlySettled: number }>(
          `/api/board/matches/${m.id}/confirm`, { method: 'POST', timeout: SENDEFRIST_MS })
      : $fetch<{ advanced: number, newlySettled: number }>(
          `/api/board/matches/${m.id}/result`, {
            method: 'POST', body: gespeichert.rumpf, timeout: SENDEFRIST_MS,
          })

    // Die Leiste bleibt gesperrt, genau wie beim ersten Versuch vor dem
    // Neuladen — siehe die Begründung im Kopf dieses Abschnitts.
    laeuft.value = true
    ergebnis = { matchId, was, gespeichert }
    ergebnisAusstehend.value = true
    ergebnisWiederholungPlanen()
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
  async function beenden() {
    const m = partie.value
    if (!m) return
    await beendenSchreiben(
      m.id,
      () => $fetch<{ advanced: number, newlySettled: number }>(
        `/api/board/matches/${m.id}/confirm`, {
          method: 'POST',
          timeout: SENDEFRIST_MS,
        }),
      { art: 'ende', pfad: 'confirm', basis: null },
    )
  }

  /**
   * Die Partie endet, OHNE dass gespielt wurde — oder ohne dass zu Ende
   * gespielt wurde.
   *
   * Derselbe Weg wie {@link beenden}, und das ist die Entscheidung: ein Ende
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
  async function aufgeben(seite: Seite, art: 'NO_SHOW' | 'FORFEIT', code = '') {
    const m = partie.value
    if (!m) return
    const gegner: Seite = seite === 'A' ? 'B' : 'A'
    const walkover = art === 'NO_SHOW'
    const punkte = walkover ? { A: 0, B: 0 } : stand.value

    /*
     * EIN GEMERKTES ERGEBNIS ERSETZT EINEN GEMERKTEN STAND — dieser Aufruf
     * trägt scoreA/scoreB absolut mit (`punkte`, oben aus `stand.value`
     * entnommen). Ein noch offener Punkt-Merkposten würde denselben Stand
     * nur ein zweites Mal und überflüssig hinterherschicken, siehe "DER
     * NETZFEHLER" bei `setzen` und die Begründung vor `beenden`.
     */
    merkpostenAufraeumen()

    const rumpf = {
      winner: gegner,
      scoreA: punkte.A,
      scoreB: punkte.B,
      resolution: (walkover ? 'WALKOVER' : 'FORFEIT') as 'WALKOVER' | 'FORFEIT',
      ...(code === '' ? {} : { boardPin: code }),
    }

    await beendenSchreiben(
      m.id,
      () => $fetch<{ advanced: number, newlySettled: number }>(
        `/api/board/matches/${m.id}/result`, {
          method: 'POST',
          body: rumpf,
          timeout: SENDEFRIST_MS,
        }),
      /*
       * `basis` NUR BEI FORFEIT — bei WALKOVER steht im Rumpf immer 0:0
       * (siehe oben), unabhängig vom tatsächlichen Stand, und ein Abgleich
       * dagegen wäre keiner. Siehe `ergebnisWiederherstellen`.
       */
      { art: 'ende', pfad: 'result', rumpf, basis: walkover ? null : { ...punkte } },
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
  async function shotClockBestaetigen() {
    const m = partie.value
    if (!m) return
    await schreiben(() => $fetch<{ acknowledgedAt: string }>(
      `/api/board/matches/${m.id}/shot-clock/acknowledge`, {
        method: 'POST',
        timeout: SENDEFRIST_MS,
      }))
  }

  /**
   * Die Zeitlimit-Uhr von Hand anhalten oder fortsetzen — der Griff des
   * Schiedsrichters zwischen zwei Racks (Heyball).
   *
   * DER GANZE ZUSTAND AUF EINMAL UND ABSOLUT, dieselbe Haltung wie
   * `zaehlen`/`setzen`: `laufend` ist der Zustand, den die Uhr danach haben
   * soll, keine Veränderung. Beide Richtungen sind idempotent — der Server
   * lässt eine schon laufende Uhr bei `running: true` unangetastet, eine
   * schon stehende bei `running: false`.
   *
   * KEIN VORGRIFF UND KEINE RÜCKFRAGE. Anders als beim Stand darf die Uhr
   * am Gerät kurz hinter dem Server herlaufen — sie wird eh nur einmal je
   * Sekunde gelesen und steht nicht selbst unter Publikum wie eine Punktzahl.
   * Und anders als `beenden`/`aufgeben` ist dieser Griff vollständig
   * umkehrbar und wird oft gebraucht, nach jedem Rack (siehe der Kopf der
   * Datei, aus der das Zeitlimit stammt) — eine Rückfrage bei jedem
   * Neuaufbau wäre die Bremse, die der Schiedsrichter am wenigsten braucht.
   */
  async function zeitlimitLaufen(laufend: boolean) {
    const m = partie.value
    if (!m) return
    await schreiben(() => $fetch<{ running: boolean }>(
      `/api/board/matches/${m.id}/time-limit/running`, {
        method: 'PUT',
        body: { running: laufend },
        timeout: SENDEFRIST_MS,
      }))
  }

  /**
   * Die Partie ist zu Ende — die Uhr und nicht die Distanz hat sie beendet
   * (Heyball: "race to 7 ODER 100 Minuten, was zuerst eintritt").
   *
   * Das Geschwister von `beenden`: derselbe Weg (schreibend, ohne
   * Rücknahme, `alleUeberholen` danach), ein anderer Endpunkt.
   * `shootoutWinner` geht nur mit, wenn die Tafel unentschieden steht — wer
   * ihn ruft, weiss das am Stand, den diese Tafel ohnehin führt
   * (`stand`/`punkte` im Schiedsrichtermenü); die Datenbank prüft ihn
   * trotzdem noch einmal gegen den tatsächlichen Gleichstand und weist ihn
   * sonst ab.
   */
  async function zeitlimitBeenden(shootoutWinner?: Seite) {
    const m = partie.value
    if (!m) return
    const summary = await schreiben(() => $fetch<{ advanced: number, newlySettled: number }>(
      `/api/board/matches/${m.id}/confirm-time-limit`, {
        method: 'POST',
        body: shootoutWinner ? { shootoutWinner } : {},
        timeout: SENDEFRIST_MS,
      }))
    if (summary === null) return
    verlauf.value = []
    gehalten.value = null
    lageGehalten.value = null
    alleUeberholen()
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
   * `schreiben` ALLEIN: `summary` ist nur dann `null`, wenn der Aufruf gar
   * nicht durchging (abgewiesen oder schon ein anderer Vorgang unterwegs) —
   * in dem Fall bleibt hier alles stehen, wie es war.
   *
   * AUFGERAEUMT WIRD IN BEIDEN FAELLEN, OB DIE PARTIE ENDET ODER NICHT.
   * Anders als bei `beenden`/`zeitlimitBeenden`, wo die Partie IMMER zu Ende
   * ist, endet hier haeufiger nur der SATZ: `set_score` steht danach
   * serverseitig wieder auf 0:0, der Anstoss ist gedreht. Ein `gehalten`,
   * das noch den alten Satzstand traegt (z. B. 5:3), wuerde vom naechsten
   * Abruf NIE eingeholt — der Abruf liefert ja 0:0 — und stuende bis zu
   * HALTEDAUER_MS ueber dem frischen Satz. Derselbe Grund gilt fuer den
   * Verlauf: ein "Undo" nach dem Satzende darf nicht versuchen, einen Satz
   * zurueckzudrehen, den die Verwaltung bereits abgeschlossen und verworfen
   * hat.
   */
  async function satzAbschliessen(winner?: Seite) {
    const m = partie.value
    if (!m) return null
    const summary = await schreiben(() => $fetch<{
      advanced: number, newlySettled: number, matchFinished: boolean
    }>(`/api/board/matches/${m.id}/confirm-set`, {
      method: 'POST',
      body: winner ? { winner } : {},
      timeout: SENDEFRIST_MS,
    }))
    if (summary === null) return null
    verlauf.value = []
    gehalten.value = null
    lageGehalten.value = null
    alleUeberholen()
    return summary
  }

  return {
    laeuft, fehler, stand, kannZurueck, unbestaetigt,
    /**
     * Wartet ein Stand auf eine Wiederholung, weil das Netz ausgefallen war?
     *
     * ANDERS ALS `unbestaetigt` IST DAS DIE AUSKUNFT FÜR DEN LANGEN AUSFALL
     * — die Tafel zeigt sie dauerhaft, nicht nur für einen Wimpernschlag.
     * Siehe die Begründung bei `netzausfall` weiter oben und die Verwendung
     * in [table].vue.
     */
    netzausfall,
    /**
     * Liegt ein Ende (`beenden`/`aufgeben`) bereit, das an einem Netzfehler
     * gescheitert ist und auf seine Wiederholung wartet?
     *
     * Die Tafel sagt dabei ausdrücklich NICHT "finished" — siehe die
     * Begründung vor `beenden` — sondern nur, dass ein Ergebnis hier liegt
     * und noch hinaus muss.
     */
    ergebnisAusstehend,
    /**
     * Ist Schluss? Die Auskunft, nach der die Leiste ihre Flächen sperrt.
     * Sie kommt von hier und nicht aus [table].vue, damit sie dieselbe Zahl
     * liest, nach der `zubuchbar` deckelt.
     */
    distanzErreicht,
    /** Restkugeln und Foulzähler — die Lage bei 14.1 endlos. */
    lage,
    /** Wer am Tisch ist. Dieselbe Auskunft wie `anstossStand.next`. */
    amTisch,
    restEintragen, rack, safety, foul, tischWechseln,
    /** Was an den Auszeiten vorweggenommen ist — die Tafel zeichnet es. */
    auszeitVorgriff,
    /** Der Anstoß, den die Tafel zeigen soll: Vorgriff vor Abruf. */
    anstossStand,
    zaehlen, setzen, zurueck, anstoss, auszeit, auszeitRuecknahme,
    shotClockBestaetigen,
    beenden, aufgeben,
    /** Heyball: die Zeitlimit-Uhr von Hand anhalten oder fortsetzen. */
    zeitlimitLaufen,
    /** Heyball: die Partie über das Zeitlimit beenden, siehe dort. */
    zeitlimitBeenden,
    /** Ein Satz bzw. Frame ist zu Ende — siehe dort. */
    satzAbschliessen,
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
const FEHLER_MS = 15_000

/**
 * Die rote Zeile und ihre Uhr — einmal gebaut, zweimal gebraucht.
 *
 * WARUM SIE AUS `useZaehlwerk` HERAUSGELÖST IST (16.09.2026)
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
 * `useZaehlwerk` zu schicken. Sie ist kein Stand — sie hat keinen Vorgriff,
 * kein Zurückdrehen und keine Reihenfolge, und der Block "Warnings" braucht
 * die Antwort (`sides`) an Ort und Stelle.
 *
 * Die Uhr wird beim Verlassen des Bereichs abgeräumt: ein Menü, das sich
 * schliesst, während die Frist läuft, liesse sonst einen Zeitgeber auf einem
 * Gerät zurück, das tagelang durchläuft.
 */
export function useAbweisung() {
  const fehler = ref<Zaehlfehler | null>(null)
  let uhr: ReturnType<typeof setTimeout> | null = null

  /** Setzt die Abweisung und laesst sie von selbst wieder gehen. */
  function melden(neuerFehler: Zaehlfehler | null) {
    if (uhr) { clearTimeout(uhr); uhr = null }
    fehler.value = neuerFehler
    if (neuerFehler) {
      uhr = setTimeout(() => { fehler.value = null; uhr = null }, FEHLER_MS)
    }
  }

  /** Dasselbe, aber aus dem rohen Wurf einer Anfrage. */
  function abweisen(roh: unknown) {
    melden(alsFehler(roh))
  }

  onScopeDispose(() => { if (uhr) clearTimeout(uhr) })

  return { fehler, melden, abweisen }
}

/**
 * IST DIESE ABWEISUNG EIN NETZFEHLER — UND KEINE ABWEISUNG DER ANWENDUNG?
 *
 * Die Unterscheidung ist die ganze Grundlage der Netzwiederholung in
 * `useZaehlwerk` (siehe dort, "DER NETZFEHLER"): ein Netzfehler wird
 * gemerkt und irgendwann nachgeholt, eine fachliche Abweisung NIE — sie
 * widerspräche der Anwendung sonst endlos.
 *
 * NETZFEHLER SIND:
 *
 *   - GAR KEINE ANTWORT (keine Verbindung, DNS, eine Zeitüberschreitung
 *     durch `timeout: SENDEFRIST_MS`). `alsFehler` erkennt das am fehlenden
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
function istNetzfehler(roh: unknown): boolean {
  const antwort = roh as { statusCode?: number, status?: number }
  const code = antwort?.statusCode ?? antwort?.status
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
/** Der Fachfehler der Anwendung, so wie er am Ende wirklich ankommt. */
interface Fachfehler { error?: string | boolean, detail?: string, data?: Fachfehler }

function alsFehler(roh: unknown): Zaehlfehler {
  const antwort = roh as { statusCode?: number, status?: number, data?: Fachfehler }

  /*
   * ZWEI SCHICHTEN, UND DIE ÄUSSERE LÜGT
   *
   * Die Anwendung antwortet mit {error, detail, params}. Die Durchreiche
   * reicht das über `createError({data})` weiter, und h3 packt seinen
   * eigenen Umschlag darum — dessen `error` ist ein schlichtes `true`. Wer
   * nur die äussere Schicht liest, bekommt für jede Abweisung denselben
   * Satz, und aus "keine Auszeit mehr übrig" wird "Rejected".
   */
  const kern = antwort?.data?.data ?? antwort?.data
  const schluessel = typeof kern?.error === 'string' ? kern.error : ''

  const texte: Record<string, string> = {
    NOT_SIGNED_IN: 'This screen is not signed in. Set it up again from the table list.',
    SCORING_UNREACHABLE: 'Not sent — no connection. The score is unchanged.',
    MATCH_FINISHED_NO_SCORE: 'The match is already finished. Nothing was changed.',
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
    MATCH_ALREADY_FINISHED: 'This match is already over. Nothing was changed.',
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
    BOARD_PIN_REJECTED: 'That code was not accepted. Nothing was changed.',
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
  if (texte[schluessel]) return { schluessel, text: texte[schluessel]! }

  const code = antwort?.statusCode ?? antwort?.status
  if (code === 401) {
    return { schluessel: 'NOT_SIGNED_IN', text: 'This screen is not signed in.' }
  }
  if (code === 403) {
    return {
      schluessel: 'NOT_ALLOWED',
      text: 'This account may not score at this event. Nothing was changed.',
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
      schluessel: 'NO_CONNECTION',
      text: 'Not sent — no connection. The score is unchanged.',
    }
  }
  return {
    schluessel: schluessel || 'REJECTED',
    text: kern?.detail ?? 'Rejected. The score is unchanged.',
  }
}
