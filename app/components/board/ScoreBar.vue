<script setup lang="ts">
import type { Match } from '~~/shared/types/api'
import type { FoulKind, TableState, Side, ScorePair, ScoringError, Extra } from '~/composables/useScoring'

/**
 * DIE ZÄHLLEISTE — die Tafel wird zum Zählgerät.
 *
 * WO SIE LIEGT UND WARUM DORT
 *
 * Unten, über der Fußzeile, in denselben drei Spalten wie die Tafel
 * darüber: links, was dem linken Spieler zustösst, rechts, was dem rechten,
 * in der Mitte, was beide angeht. Das ist keine Gestaltung, sondern die
 * Übernahme dessen, was das Vorgängersystem über den Zifferblock einer
 * Fernbedienung macht: 7 links oben zählt links hoch, 9 rechts oben rechts,
 * 1 und 3 darunter nehmen zurück, 4 und 6 in der Mitte sind die Auszeiten
 * der beiden Seiten. Wer das seit Jahren bedient, findet hier dieselbe
 * Anordnung wieder — nur als Fläche statt als Taste.
 *
 * Die Tastenbelegung gilt WEITER (siehe [table].vue): in den Hallen liegen
 * diese Fernbedienungen, und sie wegzunehmen wäre ein Rückschritt für jeden,
 * der schneller tippt als zielt. Deshalb steht die Ziffer klein in der Ecke
 * jeder Fläche.
 *
 * WARUM SIE NICHT ÜBER DER TAFEL LIEGT
 *
 * Zuschauer sehen auf dasselbe Gerät. Der Stand ist das grösste Element des
 * Bildes und bleibt es; die Leiste nimmt sich den Platz, der zwischen dem
 * Namen und der Fußzeile ohnehin Luft war. Eine Bedienung, die sich über den
 * Stand legt, macht aus einer Anzeigetafel ein Formular.
 *
 * WAS VOM VORBILD NICHT ÜBERNOMMEN IST
 *
 * Die beiden Dialoge. `whoBreaksModal` und `matchIsFinishedModal` legen sich
 * im Vorgängersystem über die ganze Tafel und machen sie unlesbar — beim
 * Anstoß zu Beginn jeder Partie, beim Beenden ausgerechnet in dem Moment,
 * in dem am meisten Publikum davorsteht. Beide stehen hier als Zeile in der
 * Leiste: dieselbe Frage, dieselben zwei Antworten, und die Tafel bleibt
 * eine Tafel.
 */
const props = defineProps<{
  match: Match
  /**
   * WELCHE FASSUNG DER LEISTE — drei und nicht mehr zwei.
   *
   * RACK_RACE zählt Sätze, POINT_RACE Punkte (siehe `sport.discipline`).
   * STRAIGHT_POOL ist ebenfalls eine Punktwertung, bekommt aber seit dem
   * 16.09.2026 eine eigene Fassung: 14.1 endlos wird nicht gezählt, sondern
   * ABGELESEN — der Schiedsrichter trägt ein, wie viele Kugeln noch liegen,
   * und das Gerät rechnet die Punkte daraus aus.
   *
   * Der dritte Wert ist nötig, weil POINT_RACE ZWEI Disziplinen trägt:
   * Straight Pool und Shoot-out. Ein Shoot-out hat keine Restkugeln, keine
   * Racks und keine Foulfolge; ihm dieselben Flächen hinzustellen wäre für
   * eine der beiden Disziplinen falsch.
   */
  mode: 'RACK_RACE' | 'POINT_RACE' | 'STRAIGHT_POOL'
  score: ScorePair
  /**
   * Restkugeln und Foulzähler — nur bei STRAIGHT_POOL von Bedeutung.
   *
   * Sie kommt als Ganzes und nicht als zwei Werte: am Tisch wird sie als EIN
   * Zustand gelesen ("acht liegen noch, und er steht auf zwei Fouls").
   */
  ballsOnTable: TableState
  /** Wer am Tisch ist. Null heisst: der Anstoss steht noch aus. */
  atTable: Side | null
  extra: Extra | null
  /**
   * Wessen Auszeit gerade läuft — je Seite, weil BEIDE laufen können.
   *
   * Bis zum 14.09.2026 war es eine einzelne Seite (`auszeitSeite`), und
   * damit liess sich nicht ausdrücken, was am Tisch vorkommt: beide gehen
   * hinaus, beide nehmen ihre Auszeit. Die Taste 4 beendet dann nur die des
   * linken Spielers und lässt die des rechten laufen.
   */
  timeoutRunning: { A: boolean, B: boolean }
  /**
   * Wer die Distanz erreicht hat — null, solange niemand. Die Regel steht
   * auf der Tafel und nicht hier, weil die Tastatur des Vorgängersystems
   * (Taste 5) dieselbe Antwort braucht und zwei Rechnungen auseinanderlaufen.
   */
  winner: Side | null
  /**
   * DIE DISTANZ IST ERREICHT — UND DAS IST NICHT DASSELBE WIE `winner`.
   *
   * `winner` beantwortet „wer hat gewonnen" und verlangt dafür einen
   * VORSPRUNG; diese Angabe beantwortet „ist die Partie durch" und fragt nur
   * gegen die Distanz. Die beiden fallen in genau einem Fall auseinander,
   * und der ist der Grund für die zweite Angabe: stehen BEIDE auf der
   * Distanz, gibt es keinen Sieger (die Anwendung nennt das RACE_AMBIGUOUS
   * und will, dass jemand nachsieht) — gezählt werden darf dort erst recht
   * nicht mehr. Eine einzige Angabe für beide Fragen liesse die Tafel in
   * genau dieser Lage weiterzählen.
   *
   * Sie kommt von der Tafel und wird hier nicht gerechnet, aus demselben
   * Grund wie `winner`: die Taste 5 der Fernbedienung braucht dieselbe
   * Antwort, und zwei Rechnungen für dieselbe Frage laufen auseinander.
   */
  raceReached: boolean
  /** Welche Seite der Partie links auf dem Schirm steht — siehe Spiegel. */
  left: Side
  right: Side
  busy: boolean
  error: ScoringError | null
  canUndo: boolean
}>()

const emit = defineEmits<{
  count: [side: Side, step: number]
  set: [score: ScorePair]
  undo: []
  break: [side: Side]
  timeout: [side: Side, running: boolean]
  finish: []
  /* 14.1 endlos — die fünf Vorgänge am Tisch. Sie tragen KEINE Seite: sie
     gehen immer den an, der gerade am Tisch ist, und den kennt das Zählwerk
     besser als diese Leiste. */
  remaining: [remaining: number]
  rack: [alsoFifteenth: boolean]
  safety: []
  foul: [kind: FoulKind]
  table: []
}>()

function sideData(side: Side) {
  return side === 'A' ? props.match.sideA : props.match.sideB
}

/**
 * Der Name auf einer Fläche — das letzte Wort und sonst nichts.
 *
 * NICHT dieselbe Zerlegung wie in BoardSide: dort geht es darum, einen
 * Namen auf zwei Zeilen richtig zu gewichten, hier um eine Beschriftung, die
 * in eine Knopfbreite passt. "Hjalmarström breaks" ist am Tisch eindeutig;
 * "Linnéa Hjalmarström breaks" passt nicht und sagt nichts mehr.
 */
function shortName(side: Side): string {
  const full = sideData(side).displayName.trim()
  const parts = full.split(/\s+/)
  return parts[parts.length - 1] ?? full
}

/** Die Distanz: was zum Sieg fehlt. 0 heisst „steht nicht fest". */
const distance = computed(() => props.extra?.raceTo ?? props.match.raceTo ?? 0)

/**
 * Der Anstoß ist noch nicht entschieden — die erste Frage jeder Partie.
 *
 * Solange sie offen ist, weist die Anwendung jeden Stand mit
 * BREAK_UNDECIDED ab. Die Leiste zeigt deshalb nichts anderes: ein Plus, das
 * garantiert scheitert, ist schlimmer als keines.
 */
const breakOpen = computed(() => !props.extra?.nextBreak)

const finished = computed(() =>
  props.match.status === 'FINISHED' || props.match.status === 'APPROVED')

/* ------------------------------------------------------------------------
 * AB DER DISTANZ WIRD NICHT MEHR GEZAEHLT
 * ------------------------------------------------------------------------
 *
 * DER BEFUND. „beim 14.1.. kann ich über das race to ziel hinaus, weiter
 * punkte eingeben.. das darf natürlich nicht sein.. und es wird der run bzw.
 * high auch weiter gezählt". Er trifft alle drei Zählweisen: die Flächen
 * trugen bis zum 16.09.2026 nur `beendet || laeuft || !amTisch`, und
 * zwischen „Distanz erreicht" und „Finish gedrückt" lief alles weiter.
 *
 * WAS DIE REGEL SAGT. WPA 7.4: der Spieler bleibt am Tisch, „as long as he
 * continues to legally pocket called balls OR WINS THE MATCH by scoring the
 * required number of points". Mit der Gewinnkugel hört er auf — er schiebt
 * keine Serie über die Distanz hinaus.
 *
 * DER EINTRAG, DER DIE LINIE ÜBERSCHREITET, WIRD GEDECKELT — UND NICHT
 * ABGEWIESEN. Der Schiedsrichter bucht eine Aufnahme NACH ihrem Ende: bei
 * 97 von 100 tippt er „Rest 8", das wären +7. Verbucht werden 3, der
 * Stand steht auf 100.
 *
 * Hier stand bis heute das Gegenteil („dieser EINE Eintrag ist richtig, er
 * enthält die Gewinnkugel"), und der Auftraggeber hat anders entschieden:
 * „beim erreichen von race-to ist ende.. fertig". Er hat auch recht. Der
 * Schiedsrichter trägt den Rest ein, den er SIEHT — dass von den sieben
 * Kugeln nur drei zur Partie gehörten und die anderen vier nach der
 * Gewinnkugel fielen, steht auf keinem Tisch. Gerechnet werden kann es nur
 * hier.
 *
 * DER EINWAND GEGEN DEN DECKEL WAR, ER RISSE STAND, RESTKUGELN UND AUFNAHME
 * AUSEINANDER. Er tut es nicht, weil er an der richtigen Stelle sitzt: die
 * drei werden aus DERSELBEN Differenz gerechnet (`restEintragen` und `rack`
 * in useScoring), und gedeckelt wird genau diese Differenz, bevor sie
 * dreimal verwendet wird (`zubuchbar`). Der Stand steht auf 100, die
 * Aufnahme wächst um 3, der High run mit ihr. Nur die Restkugeln bleiben,
 * was der Schiedsrichter gesehen hat — acht liegen, also stehen acht da;
 * die Partie ist aus, und die Kugeln liegen trotzdem.
 *
 * UND DAS UNDO FÜHRT SAUBER ZURÜCK: es legt den GANZEN Schritt wieder hin,
 * den es vorher weggenommen hat (Stand, Lage, wer am Tisch war), und
 * rechnet nichts nach.
 *
 * GESPERRT WIRD DANN JEDER EINTRAG, DER DANACH KÄME. Die Sperre fragt den
 * Zustand und nicht den Tastendruck.
 *
 * DIE AUFNAHME UND DER HIGH RUN brauchen deshalb keine eigene Bremse in
 * `laufFort`: sie wachsen nur an einem Eintrag, jeder Eintrag geht durch
 * `zubuchbar`, und nach dem Erreichen kommt gar keiner mehr durch. Eine
 * zweite Bremse wäre eine zweite Rechnung für dieselbe Frage.
 *
 * WAS OFFEN BLEIBT — und das ist der eigentliche Entwurf:
 *
 *   FINISH. Die Sperre führt zu ihm hin und nicht von ihm weg.
 *
 *   UNDO. Der häufigste Weg in diesen Zustand ist ein Vertipper, und wer
 *   sich vertippt hat, muss zurück können. Eine Sperre ohne Schlüssel wäre
 *   am Turniertag schlimmer als der Befund.
 *
 *   DAS MINUS JE SEITE auf der Satztafel. Es IST eine Rücknahme und keine
 *   Korrektur — so steht es an `zaehlen` in useScoring, und am Tisch gibt
 *   es genau zwei Wege abwärts. Die Regel dieser Sperre lautet deshalb
 *   nicht „nichts geht mehr", sondern: was den Stand nur SENKEN kann,
 *   bleibt offen. Aufwärts ist Zählen, abwärts ist Berichtigen.
 *
 *   DER WEG INS SCHIEDSRICHTERMENUE (zweimal 0, langer Druck). Er hängt an
 *   der Tafel und nicht an dieser Leiste und wird hier nicht angefasst.
 *
 * DIE AUSZEIT IST GESPERRT, und das ist eine Entscheidung und kein
 * Versehen. Sie ist das Recht eines Spielers WAEHREND einer Partie; nach
 * der Gewinnkugel gibt es nichts mehr, wofür man hinausginge. Sie kostet
 * dabei ein Guthaben, das nach zehn Sekunden nicht mehr zurückkommt — ein
 * Druck ohne Bedeutung hätte also einen Preis. Wer sie wirklich braucht,
 * weil die Distanz durch einen Vertipper erreicht ist, nimmt ihn zurück;
 * damit fällt die Sperre in demselben Augenblick.
 *
 * VERWORFEN: nach `winner` zu sperren. Stehen beide auf der Distanz, ist
 * `winner` leer und die Tafel zählte ausgerechnet in der kaputtesten Lage
 * weiter. Gefragt wird deshalb `raceReached` — siehe dort.
 *
 * VERWORFEN: eine Rückfrage („wirklich weiterzählen?"). Sie machte aus
 * jedem Griff zwei und hinterliesse einen Zustand, den es im Spiel nicht
 * gibt. Die Tafel sagt, was gilt; berichtigt wird über Undo.
 *
 * DIE OBERFLAECHE IST DIE BEQUEMLICHKEIT UND NICHT DIE WACHE. Dieselbe
 * Grenze steht in der Datenbank (competition.the_race_blocks_the_count),
 * und zwar BEIDE Hälften: dort wird ebenso gedeckelt und ebenso abgewiesen
 * (RACE_ALREADY_REACHED). Ein freigeschaltetes Gerät mit einer
 * Browserkonsole käme sonst über die Route weiter durch, egal was hier
 * steht — und PUT /matches/{id}/score nimmt den Stand aus dem Rumpf.
 *
 * DER UNTERSCHIED ZWISCHEN BEIDEN IST DER ORT, NICHT DIE REGEL: der
 * Auslöser greift nur, wenn an einem freigeschalteten Gerät geschrieben
 * wird (`app.table_grant_id`). Das Turnierbüro bleibt frei — angemeldet,
 * mit Recht, auch über die Distanz hinaus. Diese Leiste steht ohnehin nur
 * am Tisch.
 */
const scoreLockReason = computed(() =>
  props.raceReached && !finished.value
    ? `Race to ${distance.value} is reached — finish or undo`
    : '')

/**
 * DIE OFFENE TRIKOTKONTROLLE — EIN ZUSTAND UND KEINE MELDUNG.
 *
 * WARUM SIE NICHT DURCH `error` LÄUFT
 *
 * Seit dem 14.09.2026 verschwindet eine Abweisung nach fünfzehn Sekunden
 * (FEHLER_MS in useScoring), weil sie "ein Hinweis fuer den Moment" ist:
 * "No time-outs left" beantwortet den Druck, der gerade danebenging. Die
 * Trikotkontrolle ist das Gegenteil — sie steht am Tisch, bis jemand sie
 * abnimmt, und der Auftraggeber verlangt ausdrücklich "am besten auch als
 * dauerhafte meldung". Liefe sie über denselben Weg, wäre sie nach einer
 * Viertelminute weg und die Partie trotzdem noch gesperrt.
 *
 * Deshalb hat sie keine Uhr. Sie hängt am Abruf alle zehn Sekunden und
 * verschwindet in dem Moment, in dem `competition.uniform_blocks_start`
 * nichts mehr zurückgibt — ohne dass jemand den Schirm neu lädt.
 *
 * WARUM SIE ÜBER DER ANSTOSSFRAGE STEHT
 *
 * Das ist die Vorgabe: "die meldung muss schon kommen bevor die bestimmen
 * koennen, wer zuerst anstoesst". Bisher war die Reihenfolge umgekehrt —
 * Anstoss bestimmen, erstes Plus tippen, und ERST die Abweisung des
 * Auslösers sagte, dass die Kontrolle fehlt. Jetzt steht sie da, bevor am
 * Tisch überhaupt jemand tippt.
 *
 * WARUM SIE DIE ANSTOSSFRAGE TROTZDEM NICHT SPERRT
 *
 * Gesperrt ist der START, und zwar in der Datenbank
 * (`competition.match_starts`) — daran ändert diese Leiste nichts, und das
 * ist auch der richtige Ort dafür. Den Anstoss zu bestimmen, kostet
 * dagegen nichts und ist Vorbereitung: er ist die Vorbedingung, ohne die
 * die Partie in der Sekunde, in der die Kontrolle gebucht ist, immer noch
 * nicht loslegen könnte. Eine zweite Sperre hier nähme dem Schiedsrichter
 * den einen Schritt, den er ohne Schaden schon tun kann — und wäre, wenn
 * die Kontrolle aus irgendeinem Grund nicht gebucht werden kann, eine
 * Sperre, die sich am Turniertag von der Tafel aus nicht mehr aufheben
 * lässt.
 */
const uniformCheckOpen = computed(() => props.extra?.uniformOpen ?? [])

/**
 * Hält die Kontrolle die Partie überhaupt noch auf?
 *
 * DIE BEDINGUNG IST DIE DES AUSLÖSERS UND NICHT EINE ÄHNLICHE.
 * `competition.match_starts` greift beim WECHSEL auf RUNNING, und
 * `markRunning` schreibt diesen Wechsel bei jedem Zwischenstand — also aus
 * READY heraus und auch aus TIMEOUT heraus. Was schon auf RUNNING steht,
 * löst ihn nicht mehr aus: nimmt jemand die Abnahme mitten in der Partie
 * zurück, bleibt der Balken stehen, aber gezählt wird weiter.
 *
 * Deshalb genau zwei Ausnahmen und nicht drei: RUNNING und was vorbei ist.
 * Ein Satz "nothing counts", der an einem Tisch mit 4:3 steht, wäre falsch,
 * und ein falscher Satz auf einer Tafel kostet mehr als ein fehlender.
 */
const uniformCheckBlocks = computed(() => {
  const ballsOnTable = props.extra?.status ?? props.match.status
  return ballsOnTable !== 'RUNNING' && !finished.value
})

/*
 * HIER STAND `trikotErledigt` — DIE ZEILE "Uniform control done".
 *
 * Sie ist am 16.09.2026 ersatzlos weg. Der Auftraggeber: "des weiteren
 * brauch 'uniform control done' auch nicht drin stehen.. merkt man doch,
 * wenn die meldung das noch uniform fuer xy offen ist, nicht mehr da ist ..
 * so nimmt die meldung nur platz weg".
 *
 * Er hat recht, und zwar genau in der Begründung: der Wechsel IST die
 * Auskunft. Die offene Kontrolle steht dauerhaft am Tisch, und in dem
 * Augenblick, in dem der nächste Abruf sie nicht mehr mitbringt, ist sie
 * abgenommen. Eine zweite Zeile, die dasselbe noch einmal behauptet,
 * beantwortet keine Frage, die jemand danach noch hat — sie nimmt nur den
 * Platz, an dem sonst die nächste Meldung stünde.
 *
 * WAS DAMIT AUCH WEGFÄLLT: die Unterscheidung "alles abgenommen" gegen
 * "dieses Turnier führt gar keine Kontrolle". Sie war nur nötig, um nicht
 * "erledigt" über einen Vorgang zu sagen, den es nicht gibt. Ohne die Zeile
 * gibt es nichts mehr falsch zu behaupten — und deshalb ist `uniformControl`
 * auch aus `Extra` und aus der Durchreiche verschwunden. Es steht weiter
 * in `competition.live_board.uniform_control`, wo es herkommt.
 *
 * DIE OFFEN-MELDUNG BLEIBT UNVERÄNDERT: dauerhaft, ohne Uhr, und VOR der
 * Anstossfrage (Vorgabe vom 14.09.2026). Sie ist die, auf die es ankommt.
 */

/**
 * DIE ANGEORDNETE SHOT-CLOCK — DIE MELDUNG, DIE DIE PARTIE ANHÄLT.
 *
 * DIESELBE BAUART WIE DIE TRIKOTKONTROLLE DARÜBER, UND AUS DEMSELBEN GRUND:
 * ein Zustand und keine Abweisung. Sie hat keine Uhr, die sie wegnimmt — sie
 * steht am Tisch, bis der Schiedsrichter bestätigt hat, und verschwindet in
 * dem Moment, in dem der nächste Abruf `acknowledgedAt` mitbringt.
 *
 * HIER LÄUFT KEINE UHR, UND ZWAR WIRKLICH KEINE. Kein Countdown, keine
 * Sekunden, keine Verlängerung. Der Schiedsrichter steht mit seiner eigenen
 * Stoppuhr am Tisch und macht die Ansagen; dieses Gerät weiss nur, DASS die
 * Shot-Clock gilt. `since` ist der Zeitpunkt der ANORDNUNG und wird auch
 * nicht angezeigt — eine Zahl, die aussieht wie eine Restzeit, wäre am Tisch
 * die gefährlichste Angabe von allen.
 *
 * WARUM DIE MELDUNG DEN STAND NICHT VERDECKT
 *
 * Auf dasselbe Gerät sieht der Saal. Sie liegt deshalb dort, wo die
 * Trikotkontrolle liegt — in der Leiste unten, in dem Platz, der zwischen
 * Namen und Fußzeile ohnehin Luft war —, und nicht als Vorhang über der
 * Tafel. Auffallen tut sie durch die Farbe und die Breite, nicht durch die
 * Fläche, die sie dem Stand wegnimmt.
 */
const shotClock = computed(() => props.extra?.shotClock ?? null)

/**
 * Die Anordnung steht und niemand hat sie zur Kenntnis genommen.
 *
 * <p>Das ist der Zustand, in dem die Datenbank jeden Punkt abweist
 * (SHOT_CLOCK_NOT_ACKNOWLEDGED). Die Leiste sagt es deshalb vorher, statt
 * den Schiedsrichter erst ins Leere tippen zu lassen — dieselbe Reihenfolge
 * wie bei der Trikotkontrolle: die Meldung steht da, bevor am Tisch jemand
 * tippt.
 */
const shotClockPending = computed(() =>
  shotClock.value !== null && shotClock.value.acknowledgedAt === null && !finished.value)

/**
 * DER DAUERZUSTAND: bestätigt, und sie gilt weiter.
 *
 * <p>Die Anordnung endet nicht mit der Bestätigung — sie endet, wenn die
 * Turnierleitung sie aufhebt oder die Partie vorbei ist. Am Tisch muss
 * deshalb sichtbar BLEIBEN, dass nach Uhr gespielt wird; wer nach einer
 * Auszeit an den Tisch zurückkommt, soll es sehen, ohne zu fragen.
 *
 * <p>Leise und nicht rot: Rot heisst auf dieser Tafel "hier fehlt etwas" —
 * und wenn bestätigt ist, fehlt nichts mehr.
 *
 * <p>UND SIE BLEIBT STEHEN, obwohl "Uniform control done" daneben am
 * 16.09.2026 gestrichen wurde. Der Unterschied ist, was die Zeile sagt: die
 * Trikotkontrolle war ABGESCHLOSSEN, und ein abgeschlossener Vorgang
 * braucht keine Zeile — sein Ende sieht man daran, dass die offene Meldung
 * verschwindet. Die Shot-Clock GILT WEITER; wer nach einer Auszeit an den
 * Tisch zurückkommt, muss sehen, dass nach Uhr gespielt wird.
 */
const shotClockActive = computed(() =>
  shotClock.value !== null && shotClock.value.acknowledgedAt !== null && !finished.value)

/** Links oder rechts — der Schiedsrichter sucht am Tisch und nicht in der Auslosung. */
function sideWord(side: Side): string {
  return side === props.left ? 'left' : 'right'
}

/**
 * Was der Spieler noch hat — und nicht, was er schon verbraucht hat.
 *
 * Bis zum 14.09.2026 stand hier "2 taken": `competition.live_board` führte
 * nur die genommenen Auszeiten und nicht die erlaubten, und eine Zahl, die
 * stimmt, war besser als eine, die geraten ist. Inzwischen führt die Sicht
 * `timeouts_allowed` (aus `tournament.time_outs`) mit, und damit lässt sich
 * die Frage beantworten, die am Tisch wirklich gestellt wird: darf er noch?
 *
 * Ist keine Obergrenze gepflegt (null heisst unbegrenzt), bleibt es bei der
 * genommenen Zahl — eine Restzahl ohne Obergrenze gibt es nicht.
 */
function timeoutHint(side: Side): string {
  if (props.timeoutRunning[side]) return 'running · tap to end'

  const taken = props.extra?.timeoutsTaken?.[side] ?? 0
  const allowed = props.extra?.timeoutsAllowed ?? null

  if (allowed === null) return taken === 0 ? '' : `${taken} taken`
  return `${Math.max(0, allowed - taken)} left`
}

/**
 * DIE PUNKTFASSUNG: EINE AUFNAHME AUF EINMAL
 *
 * Wer im Straight Pool in einer Aufnahme dreissig Bälle macht, tippt nicht
 * dreissigmal. Das Vorgängersystem öffnet dafür ein Feld, in das die Zahl
 * getippt und mit Enter bestätigt wird (`scoreBoxAdd`/`scoreBoxSubtract`);
 * hier ist es ein Zifferblock, weil am Tisch ein Tablet steht und keine
 * Tastatur.
 *
 * Der Block liegt ÜBER der Leiste und nicht über der Tafel: der Stand, den
 * man gerade verändert, muss dabei sichtbar bleiben.
 */
const block = ref<{ side: Side, sign: 1 | -1, input: string } | null>(null)

/**
 * ER GEHÖRT DER PUNKTFASSUNG, UND DIE SPERRE STEHT HIER.
 *
 * Nicht nur beim Aufrufer: `blockOpen` ist nach aussen gereicht
 * (defineExpose) und wird von der Tastatur der Tafel gerufen. Wer eine
 * Fläche oder eine Taste ergänzt, soll nicht versehentlich einen Zifferblock
 * in eine Fassung holen, für die er nie gedacht war — in der Satzwertung
 * trug „3 7 OK" siebenunddreissig SÄTZE ein, und dafür gibt es dort weder
 * eine Fläche noch eine Zeile in der Übersicht des Schiedsrichtermenüs.
 * Der Straight Pool hat seine eigene Eingabe (die Kugelreihe).
 */
function blockOpen(side: Side, sign: 1 | -1) {
  if (props.mode !== 'POINT_RACE') return
  /*
   * UND NICHT MEHR UEBER DIE DISTANZ HINAUS. Der Zifferblock zählt nur
   * aufwärts (alle vier Aufrufer öffnen ihn mit +1), und aufwärts ist nach
   * der Distanz nichts mehr einzutragen. Die Sperre sitzt HIER und nicht
   * nur an den beiden Flächen, weil die Taste „+" der Fernbedienung
   * denselben Weg nimmt — dieselbe Überlegung, aus der schon die
   * Fassungsprüfung eine Zeile darüber hier steht und nicht beim Aufrufer.
   *
   * Der Grund wird GESAGT und der Druck nicht geschluckt: ein Block, der
   * sich nicht öffnet, ist von einem Gerät, das hängt, nicht zu
   * unterscheiden.
   */
  if (scoreLockReason.value) {
    spSay(scoreLockReason.value)
    return
  }
  block.value = { side, sign, input: '' }
}

function blockDigit(z: string) {
  if (!block.value) return
  // Drei Stellen reichen: die längste Distanz im Bestand ist 200 Punkte.
  block.value.input = (block.value.input + z).slice(0, 3)
}

/**
 * DIE OBERGRENZE EINER EINZELNEN AUFNAHME — DIE DISTANZ DER PARTIE.
 *
 * `useScoring` kennt nach oben keine Grenze; drei Stellen heissen ohne
 * weiteres 999. Eine einzelne Aufnahme, die grösser ist als die ganze
 * Distanz, kann es aber nicht geben: wer die Distanz erreicht, hat gewonnen,
 * und mehr wird nicht eingetragen. Das ist eine Grenze, die aus der Partie
 * folgt und nicht geraten ist.
 *
 * Ist keine Distanz bekannt (0), bleibt es bei den drei Stellen — eine
 * geratene Grenze wäre schlimmer als keine.
 */
const blockLimit = computed(() => (distance.value > 0 ? distance.value : 999))

/**
 * Die getippte Zahl liegt über der Grenze. Der Block bleibt dann STEHEN und
 * sagt es — geschlossen und verworfen wäre für den Bediener nicht von
 * „eingetragen" zu unterscheiden.
 */
const blockTooHigh = computed(() => {
  const b = block.value
  if (!b || b.input === '') return false
  return Number.parseInt(b.input, 10) > blockLimit.value
})

function blockConfirm() {
  const b = block.value
  if (!b) return
  if (blockTooHigh.value) return
  const value = Number.parseInt(b.input, 10)
  block.value = null
  if (!Number.isFinite(value) || value <= 0) return
  emit('count', b.side, value * b.sign)
}

function blockClear() {
  if (block.value) block.value.input = ''
}

function blockClose() {
  block.value = null
}


/* ------------------------------------------------------------------------
 * DIE STRAIGHT-POOL-FASSUNG
 *
 * WARUM DIE LEISTE HIER NEU GEDACHT IST UND NICHT NUR ERGÄNZT
 *
 * Bis zum 16.09.2026 bekam 14.1 endlos die Satzleiste mit zwei Zusätzen: ein
 * "+ N" öffnete einen Zifferblock, und "End of turn" wechselte, wer am Tisch
 * ist. Der Auftraggeber: "das scoreboard für den straight pool betrieb hast
 * du leider falsch übernommen oder nicht die unterschiede verstanden".
 *
 * Er hat recht, und der Fehler liegt tiefer als bei den Flächen. Die
 * Satzleiste fragt "wie viele Punkte hat er gemacht?" — und das ist am Tisch
 * die falsche Frage. Kein Mensch zählt seine versenkten Kugeln mit; man SIEHT
 * den Tisch, und was man sieht, ist, wie viele noch liegen. Der Auftraggeber:
 * "statt das die spieler selber zählen müssen".
 *
 * Diese Fassung fragt deshalb nur noch das Sichtbare ab. Die Punkte rechnet
 * das Gerät: vorheriger Rest minus neuer Rest.
 *
 * EIN FINGERTIPP UND NICHT ZWEI. Der Zifferblock war zweistufig — öffnen,
 * tippen, bestätigen —, und dafür ist am Tisch keine Zeit. Der Wertebereich
 * hier ist klein genug für eine Tastenreihe: höchstens fünfzehn Zahlen, und
 * mit jeder Kugel, die fällt, wird die Reihe kürzer. Was nicht mehr liegen
 * KANN, steht auch nicht mehr da.
 * --------------------------------------------------------------------- */

/**
 * Die Zahlen, die der Schiedsrichter nach einem Fehlstoss antippen kann.
 *
 * Von dem, was jetzt liegt, abwärts bis zur Eins. Der HÖCHSTE Wert ist der
 * aktuelle Rest und heisst "er hat nichts versenkt" — der häufigste Ausgang
 * einer Aufnahme überhaupt. Mehr als jetzt liegt, kann nachher nicht liegen;
 * die Reihe bietet es deshalb gar nicht erst an.
 *
 * Die NULL fehlt mit Absicht. Ein Tisch ohne Kugeln entsteht nur, wenn die
 * fünfzehnte auf demselben Stoss fiel, der die vierzehnte erzielte (WPA
 * 7.8 a) — und dann hat der Spieler ausgespielt und BLEIBT am Tisch. Das ist
 * ein Rack und kein Fehlstoss, und es steht deshalb bei den Rack-Flächen.
 */
const ballRow = computed(() => {
  const from = Math.max(1, Math.min(15, props.ballsOnTable.rest))
  return Array.from({ length: from }, (_, i) => from - i)
})

/** Was ein Eintrag dem Spieler am Tisch einbringt. */
function pointsFor(remaining: number): number {
  return Math.max(0, props.ballsOnTable.rest - remaining)
}

/** Wer am Tisch ist — als Name, für die Beschriftungen. */
const atTableName = computed(() =>
  props.atTable ? shortName(props.atTable) : '')

/**
 * Steht diese Seite auf zwei Fouls?
 *
 * Die Frage, auf die es im Straight Pool ankommt: das nächste Standardfoul
 * kostet dann nicht einen Punkt, sondern sechzehn, und der Tisch wird neu
 * aufgebaut (WPA 7.11). Beide Spieler müssen das sehen können, nicht nur der
 * Schiedsrichter — deshalb steht es gross in der Leiste und nicht klein in
 * einem Menü.
 */
function onTwoFouls(side: Side): boolean {
  return props.ballsOnTable.fouls[side] >= 2
}

/** Was das nächste Standardfoul den Spieler am Tisch kostet. */
const foulCost = computed(() => {
  const side = props.atTable
  if (!side) return 1
  return props.ballsOnTable.fouls[side] >= 2 ? 16 : 1
})

/* ------------------------------------------------------------------------
 * DIE FERNBEDIENUNG — 14.1 GANZ OHNE BILDSCHIRMBERÜHRUNG
 *
 * In den Hallen liegen Fernbedienungen mit Zifferblock, und der
 * Schiedsrichter bedient die Tafel seit Jahren damit. Bis zum 16.09.2026
 * erreichte er im Straight Pool darüber Rack (+), Safety (−), Undo (*), den
 * Tischwechsel (5) und die Auszeiten (4/6) — die KUGELREIHE aber nicht, und
 * die ist die Hauptbedienung der Disziplin. Wer einen Fehlstoss eintragen
 * wollte, musste den Schirm anfassen.
 *
 * DIE BEGRÜNDUNG VON DAMALS HATTE EINE LÜCKE. Sie lautete: fünfzehn Werte
 * über zehn Ziffern hiessen zwei Tasten je Zahl. Das gilt für die Eins und
 * für die Zehnerwerte und für sonst nichts — 2 bis 9 sind auf EINER Ziffer
 * eindeutig, weil keine Zahl über neun ohne führende Eins auskommt.
 *
 * WAS EINE TASTE KOSTET UND WAS ZWEI
 *
 *   Der Fehlstoss ist der häufigste Vorgang der Disziplin überhaupt. Er
 *   kostet EINE Taste, solange die gemeinte Zahl unter zehn liegt — und die
 *   Eins kostet auch dann nur eine, wenn ohnehin höchstens neun Kugeln
 *   liegen: dann kann 10 bis 15 gar nicht gemeint sein. Zwei Tasten braucht
 *   nur, wer bei fast vollem Tisch eine Zahl ab zehn meint, also unmittelbar
 *   nach einem Rack.
 *
 *   Rack, Safety, Foul und Undo liegen auf je einer eigenen Taste
 *   (+, −, ., *) und sind damit so schnell wie der Griff an den Schirm.
 *
 *   Was selten ist, liegt auf der zweiten Ebene hinter der `/`: das Rack mit
 *   der fünfzehnten, die beiden Break-Fouls, die Auszeiten, Wechsel und
 *   Ende. Sie kosten zwei Tasten, und die zweite steht dabei GROSS AUF DEM
 *   SCHIRM — wer die Ebene öffnet, sucht nicht, sondern liest ab.
 *
 * KEINE STILLE WARTEZEIT. Beides — die angefangene Zehnereingabe und die
 * zweite Ebene — legt einen Vorhang über die Leiste, der sagt, worauf
 * gewartet wird und wie man es abbricht. Es gibt keinen Zustand dieser
 * Bedienung, den man nicht sieht, und keinen, aus dem die `/` nicht mit
 * einem einzigen Druck wieder herausführt. Eine Ziffer, die in der Lage am
 * Tisch nicht liegen KANN, verschwindet nicht schweigend, sondern wird mit
 * dem Grund beantwortet (`spMessage`).
 *
 * WARUM 7/9/1/3 IM STRAIGHT POOL NICHT MEHR DIE RICHTIGSTELLUNG SIND
 *
 * Sie waren es bis heute (±1 je Seite) und kollidieren mit jeder
 * Ziffernbedienung der Kugelreihe. Eines von beidem musste weichen, und es
 * ist die Richtigstellung — aus drei Gründen:
 *
 *   1. Sie hat in dieser Fassung GAR KEINE FLÄCHE. Die Straight-Pool-Leiste
 *      zeigt kein „+1" und kein „−1"; die vier Tasten taten also etwas, das
 *      auf dem Schirm nirgends steht. Das widerspricht der Regel dieser
 *      Tafel, dass jede Taste auf ihrer Fläche steht — wer nur das Tablet
 *      bedient, hätte sie nie kennengelernt.
 *   2. Die Kugelreihe ist die Hauptbedienung, die Richtigstellung der
 *      Ausnahmefall. Man legt nicht die Ausnahme auf die schnellen Tasten.
 *   3. Für den Vertipper gibt es Undo (*), und das ist der bessere Weg: es
 *      nimmt den GANZEN Eintrag zurück — Punkte, Restkugeln und Foulzähler
 *      — statt nur an der Punktzahl zu drehen und die Lage schief stehen zu
 *      lassen. Genau dieser Unterschied ist bei 14.1 der Punkt: der Stand
 *      wird aus dem Rest gerechnet, ein Punkt ohne passenden Rest ist ein
 *      Widerspruch.
 *
 * In RACK_RACE und POINT_RACE bleibt 7/9/1/3 unverändert. Dort gibt es keine
 * Kugelreihe, die Flächen tragen die Ziffern weiterhin, und diese Funktion
 * wird dort nie gerufen (siehe `tafelTaste` in board/[eventId]/[table].vue).
 * --------------------------------------------------------------------- */

/**
 * Worauf die Tafel gerade wartet — und was der Vorhang darum zeigt.
 *
 * `zehner` — die Eins ist gedrückt, die zweite Ziffer steht aus.
 * `ebene2` — die `/` ist gedrückt, die seltenen Vorgänge stehen da.
 */
const spPending = ref<'tens' | 'level2' | null>(null)

/**
 * Die Antwort auf eine Taste, die in dieser Lage nichts bewirken konnte.
 *
 * Sie steht auf Englisch wie alles Sichtbare und verschwindet von selbst:
 * eine Zeile, die stehen bliebe, läse beim nächsten Fehlstoss noch der
 * vorletzte Grund.
 */
const spMessage = ref('')
let spMessageTimer: ReturnType<typeof setTimeout> | null = null

function spSay(text: string) {
  spMessage.value = text
  if (spMessageTimer) clearTimeout(spMessageTimer)
  /*
   * VIER SEKUNDEN. Zwei waren zu wenig: wer eine Taste drückt und nichts
   * geschehen sieht, schaut erst DANN auf die Tafel, und bis dahin wäre die
   * Antwort schon fort gewesen. Viel länger darf sie auch nicht stehen —
   * eine Zeile, die den nächsten Fehlstoss überdauert, nennt einen Grund,
   * der nicht mehr gilt. Dieselbe Überlegung wie bei FEHLER_MS im Zählwerk,
   * nur kürzer: dort steht die Antwort des Servers, hier die der Tafel.
   */
  spMessageTimer = setTimeout(() => (spMessage.value = ''), 4000)
}

onBeforeUnmount(() => {
  if (spMessageTimer) clearTimeout(spMessageTimer)
})

function spClose() {
  spPending.value = null
  spMessage.value = ''
}

/**
 * Kann am Tisch überhaupt etwas eingetragen werden? Wenn nein, sagt es die
 * Tafel — dieselbe Auskunft, die auf den gesperrten Flächen steht.
 */
function spCanAct(): boolean {
  if (finished.value) {
    spSay('The match is already final')
    return false
  }
  /*
   * DIE DISTANZ STEHT VOR DEM LAUFENDEN SCHREIBVORGANG, UND ZWAR WEIL SIE
   * BLEIBT.
   *
   * „Still saving — one moment" ist die Antwort auf einen Zustand von einer
   * halben Sekunde; „Race to 100 is reached" gilt, bis jemand beendet oder
   * zurücknimmt. Stünde die kürzere zuerst, läse der Schiedsrichter in dem
   * Augenblick, in dem er tippt, den Grund, der gleich nicht mehr gilt —
   * und danach gar keinen mehr, denn die Meldung steht nur vier Sekunden.
   */
  if (scoreLockReason.value) {
    spSay(scoreLockReason.value)
    return false
  }
  /*
   * UND DIE DRITTE SPERRE, DIE DIE FLÄCHEN SCHON IMMER TRAGEN.
   *
   * `busy` ist wahr, solange einer der drei nicht rücknehmbaren
   * Schreibvorgänge unterwegs ist (`beenden`, `aufgeben`,
   * `shotClockBestaetigen` in useScoring). Die Kugelreihe ist dabei
   * `disabled`, jede Fläche bekommt `:busy="busy"` und ist blass —
   * nur die Fernbedienung kam bis zum 16.09.2026 durch. Ablauf: `/ 5`
   * beendet die Partie, der POST ist unterwegs, und ein Druck auf `+`
   * schickte eine Standänderung an eine Partie, die gerade abgeschlossen
   * wird.
   *
   * Die Antwort steht da und die Taste verschwindet nicht schweigend: wer
   * in der halben Sekunde tippt, in der die Leiste blass ist, hat den
   * Grund nicht gesehen, weil er auf den Tisch schaut und nicht auf das
   * Gerät.
   */
  if (props.busy) {
    spSay('Still saving — one moment')
    return false
  }
  if (!props.atTable) {
    spSay('Nobody is at the table yet')
    return false
  }
  return true
}

/**
 * Dasselbe für die Auszeit — die zwei Sperren ihrer Fläche und nicht drei.
 *
 * Die Auszeit ist der einzige Vorgang der Leiste, der KEINEN Spieler am
 * Tisch braucht: vor dem Anstoss darf sie genommen werden, und die Fläche
 * lässt sie deshalb zu (`:locked="finished"`). Nur die beendete Partie und
 * der laufende Schreibvorgang stehen ihr im Weg.
 */
function spTimeoutCanAct(): boolean {
  if (finished.value) {
    spSay('The match is already final')
    return false
  }
  /*
   * AUCH DIE AUSZEIT — die Begründung steht bei `scoreLockReason`: sie ist das
   * Recht eines Spielers WAEHREND einer Partie, und sie kostet ein
   * Guthaben, das nach zehn Sekunden nicht mehr zurückkommt.
   */
  if (scoreLockReason.value) {
    spSay(scoreLockReason.value)
    return false
  }
  if (props.busy) {
    spSay('Still saving — one moment')
    return false
  }
  return true
}

/**
 * Den Rest eintragen — aber nur, was in dieser Lage LIEGEN KANN.
 *
 * Mehr als jetzt liegt, kann nachher nicht liegen; die Kugelreihe bietet es
 * deshalb gar nicht erst an, und die Ziffer darf es auch nicht. Abgewiesen
 * wird mit der Zahl, die der Bediener gemeint hat, und mit dem Grund —
 * sonst stünde er vor einer Taste, die scheinbar nichts tut.
 */
function spRemaining(n: number): boolean {
  if (!spCanAct()) return false
  if (n < 1 || n > props.ballsOnTable.rest) {
    spSay(`${n} is not possible — ${props.ballsOnTable.rest} on the table`)
    return false
  }
  spClose()
  emit('remaining', n)
  return true
}

/**
 * DAS STERNCHEN VOR EINEM OFFENEN VORHANG — ES SCHLIESST, ES NIMMT NICHT
 * ZURÜCK, UND ES SAGT BEIDES.
 *
 * Bis zum 16.09.2026 wurde `*` in beiden Vorhang-Zuständen wortlos
 * geschluckt. Die Begründung fürs Schlucken („eine 8, die hier durchfiele,
 * träge einen Fehlstoss ein, den niemand gespielt hat") trägt für
 * BEDEUTUNGSLOSE Ziffern; `*` ist der Reflex nach einem Vertipper und damit
 * das Gegenteil davon.
 *
 * WARUM NICHT GLEICH ZURÜCKNEHMEN — die Frage ist entschieden worden, und
 * zwar so: der Vorhang steht zwei Sekunden, und wer in diesen zwei Sekunden
 * `*` drückt, kann ZWEIERLEI meinen. Entweder war die `1` (oder die `/`)
 * selbst der Vertipper — dann will er heraus, und Schliessen ist genau das.
 * Oder der EINTRAG DAVOR war falsch — dann will er das Undo, und das kostet
 * ihn einen zweiten Druck, der ihm hier angesagt wird.
 *
 * Ein Undo, das gleich durchliefe, wäre in der ersten Lesart ein
 * Schreibvorgang, den niemand wollte, und er nähme einen richtigen Eintrag
 * weg. Ein Druck zu viel in der zweiten Lesart kostet nichts.
 */
function spCurtainStar() {
  spClose()
  spSay(props.canUndo
    ? 'Cancelled — press * again to undo the last entry'
    : 'Cancelled — nothing to undo')
}

/**
 * DIE ZWEITE EBENE. Jede Ziffer, die hier etwas bedeutet, steht auf dem
 * Vorhang, der dabei offen ist — gelernt wird sie durch Hinsehen.
 *
 * ALLES WIRD GESCHLUCKT, solange der Vorhang steht, auch die Ziffern ohne
 * Bedeutung. Eine 8, die hier durchfiele, träge auf der Ebene darunter einen
 * Fehlstoss ein, den niemand gespielt hat.
 */
function spLevelTwo(key: string): boolean {
  switch (key) {
    case '1':
      if (spCanAct()) { spClose(); emit('rack', true) }
      break
    case '2':
      if (spCanAct()) { spClose(); emit('foul', 'BREAK_AGAIN') }
      break
    case '3':
      if (spCanAct()) { spClose(); emit('foul', 'BREAK_ACCEPT') }
      break
    /*
     * DIE AUSZEIT FRAGT NICHT NACH DEM TISCH — die Fläche auch nicht
     * (`:locked="finished"`, ohne `!atTable`). Wer vor dem Anstoss eine
     * Auszeit nimmt, nimmt sie; deshalb steht hier nicht `spCanAct`,
     * sondern dieselben zwei Sperren, die die Fläche trägt — und beide
     * ANTWORTEN jetzt, statt die Taste zu schlucken. `/ 1` sagt in
     * derselben Lage „The match is already final"; `/ 4` schwieg.
     */
    case '4':
      if (spTimeoutCanAct()) { spClose(); emit('timeout', 'A', props.timeoutRunning.A) }
      break
    case '6':
      if (spTimeoutCanAct()) { spClose(); emit('timeout', 'B', props.timeoutRunning.B) }
      break
    /*
     * Die 5 ist doppelt belegt wie eh und je, und zwar nach Lage: steht die
     * Partie zum Beenden an, heisst sie „ja, fertig"; sonst gibt sie den
     * Tisch weiter. Genau diese Doppelung trägt die Fläche auch auf der
     * Satztafel, und sie bleibt hier gleich.
     */
    case '5':
      if (props.winner && !finished.value) { spClose(); emit('finish') }
      else if (spCanAct()) { spClose(); emit('table') }
      break
    case '0':
    case '/':
      spClose()
      break
    case '*':
      spCurtainStar()
      break
  }
  return true
}

/**
 * DIE ANGEFANGENE ZEHNEREINGABE — die Eins wartet auf ihre zweite Ziffer.
 */
function spTens(key: string): boolean {
  // Die zweite Ziffer: 10 bis 15.
  if (key >= '0' && key <= '5') {
    spRemaining(10 + Number(key))
    return true
  }
  /*
   * 6 bis 9 nach einer Eins ergäbe 16 bis 19, und so viele Objektkugeln gibt
   * es nicht. Statt die Eingabe abzuweisen, wird sie als das gelesen, was sie
   * nur sein kann: die Eins war ein Vertipper, gemeint ist die Ziffer, die
   * gerade getippt wird. Dieselbe Eindeutigkeit, aus der die ganze Belegung
   * gebaut ist.
   */
  if (key >= '6' && key <= '9') {
    spClose()
    spRemaining(Number(key))
    return true
  }
  /*
   * Die Eins ALLEIN braucht eine Bestätigung, weil sie sonst nicht von
   * „Eins und noch eine Ziffer" zu unterscheiden wäre. Enter ist auf jedem
   * Zifferblock die grösste Taste und liegt gleich neben der Reihe.
   */
  if (key === 'Enter') {
    spRemaining(1)
    return true
  }
  if (key === '/') {
    spClose()
    return true
  }
  // Das Sternchen schliesst und sagt, wie das Undo zu haben ist — siehe
  // spVorhangStern. Es ist der einzige Griff, der hier nicht geschluckt wird.
  if (key === '*') {
    spCurtainStar()
    return true
  }
  // Auch hier gilt: solange etwas offen ist, fällt nichts durch.
  return true
}

/**
 * Eine Taste der Fernbedienung, im Straight Pool.
 *
 * Gibt zurück, ob sie verbraucht wurde. Die Tafel ruft diese Funktion nur im
 * STRAIGHT_POOL und erst, wenn der Anstoss entschieden ist — bis dahin
 * gehören 1 und 3 der Anstossfrage.
 */
function spKey(key: string): boolean {
  if (props.mode !== 'STRAIGHT_POOL') return false

  /*
   * DAS R KOMMT IMMER DURCH — auch durch einen offenen Vorhang.
   *
   * Es bestätigt die angeordnete Shot-Clock, und solange die unbestätigt
   * ist, weist die Anwendung JEDEN Punkt ab; die Partie steht. Eine
   * angefangene Zehnereingabe ist dagegen ein Zustand von zwei Sekunden.
   * Das Kleine darf das Grosse nicht aufhalten, und der Vorhang bleibt
   * dabei stehen — R sagt nichts über die Zahl, die gerade getippt wird.
   *
   * Die Tafel behandelt die Taste selbst (siehe tafelTaste); hier steht nur,
   * dass sie nicht verbraucht wird.
   */
  if (key === 'r' || key === 'R') return false

  if (spPending.value === 'level2') return spLevelTwo(key)
  if (spPending.value === 'tens') return spTens(key)

  if (key === '/') {
    spPending.value = 'level2'
    spMessage.value = ''
    return true
  }

  if (key >= '1' && key <= '9') {
    const digit = Number(key)
    /*
     * Die Eins wartet NUR, wenn zehn oder mehr liegen. Sonst kann sie nichts
     * anderes heissen als sich selbst, und dann ist sie sofort fertig — das
     * ist der Fall mitten im Rack und damit der häufige.
     */
    if (digit === 1 && props.ballsOnTable.rest >= 10) {
      spPending.value = 'tens'
      spMessage.value = ''
      return true
    }
    spRemaining(digit)
    return true
  }

  switch (key) {
    case '+':
      if (spCanAct()) emit('rack', false)
      return true
    case '-':
      if (spCanAct()) emit('safety')
      return true
    case '.':
      if (spCanAct()) emit('foul', 'STANDARD')
      return true
    /*
     * DER LAUFENDE SCHREIBVORGANG WIRD VOR `canUndo` GEFRAGT, UND ZWAR
     * WEGEN DER ANTWORT.
     *
     * `canUndo` ist im Zählwerk als `verlauf.length > 0 && !laeuft`
     * gerechnet — während `beenden` unterwegs ist, ist es falsch, und die
     * Leiste hätte „Nothing to undo" gesagt. Das ist der falsche Grund:
     * zurückzunehmen gäbe es etwas, es geht nur gerade nicht.
     */
    case '*':
      if (props.busy) spSay('Still saving — one moment')
      else if (props.canUndo) emit('undo')
      else spSay('Nothing to undo')
      return true
  }

  /*
   * Die 0 gehört NICHT hierher und fällt durch: zweimal gedrückt öffnet sie
   * das Schiedsrichtermenü, und ein Tisch ohne Kugeln ist kein Fehlstoss,
   * sondern ein Rack (WPA 7.8 a) — der liegt auf `/ 1`.
   */
  return false
}

/** Ob gerade etwas aussteht. Die Tafel fragt danach, bevor sie die 0 nimmt. */
function spWaiting(): boolean {
  return spPending.value !== null
}

/**
 * Welche Tastenfolge zu einer Zahl der Kugelreihe gehört — und zwar NUR
 * dann, wenn sie nicht die Zahl selbst ist.
 *
 * Auf 2 bis 9 stünde „2" unter der 2: eine Verdopplung, die fünfzehn Flächen
 * überladen würde, ohne irgendetwas zu sagen. Die Ecke bleibt dort leer, und
 * die Zeile über der Reihe sagt einmal, dass die Ziffer die Zahl ist.
 * Beschriftet wird nur, was ABWEICHT: die Zehnerwerte und die Eins, solange
 * sie auf ihre Bestätigung wartet.
 */
function spKeySequence(n: number): string {
  if (n >= 10) return `1 ${n - 10}`
  if (n === 1 && props.ballsOnTable.rest >= 10) return '1 ⏎'
  return ''
}

/**
 * Was nach der Eins noch kommen kann — für den Vorhang.
 *
 * Nicht stur 0 bis 5: liegen zwölf Kugeln, ist die 15 keine mögliche Zahl,
 * und eine Taste anzubieten, die abgewiesen wird, wäre eine Einladung zum
 * Danebentippen. Die Eins selbst steht am Ende mit ihrer Bestätigung.
 */
const spTensChoices = computed(() => {
  const upTo = Math.min(15, props.ballsOnTable.rest)
  const entryList: { key: string, value: number }[] = []
  for (let n = 10; n <= upTo; n++) entryList.push({ key: String(n - 10), value: n })
  entryList.push({ key: '⏎', value: 1 })
  return entryList
})

/**
 * Die Zeile über der Reihe — sie sagt, DASS es auch über Tasten geht.
 *
 * KURZ, UND ZWAR GEMESSEN. Hier stand bis heute nur „Tap what is left"; die
 * Zeile teilt sich eine Zeilenhöhe mit „at the table", „balls on the table"
 * und den Foulmarken, und auf einem 1024er Tablet quer bricht jedes Wort
 * mehr die ganze Reihe um — die Leiste schob sich dann über die Namen der
 * Spieler.
 *
 * WIE die zweistellige Eingabe geht, steht deshalb NICHT hier, sondern dort,
 * wo es gebraucht wird: als „1 5" unter der Fünfzehn (spTastenfolge), als
 * Vorhang, sobald die Eins gedrückt ist, und am Stück im Schiedsrichtermenü.
 * Eine Zeile, die alles erklärt, erklärt es an der falschen Stelle.
 */
const spInstructions = 'Tap what is left — or key it in'

/**
 * WAS DIE LEISTE NACH AUSSEN REICHT.
 *
 * Die Tastatur des Vorgängersystems bleibt gültig, und der Griff dafür liegt
 * auf der Tafel und nicht hier (board/[eventId]/[table].vue) — dort hängt er
 * am `document` und muss auch dann etwas tun, wenn gar keine Leiste steht.
 *
 * `blockOpen` sorgt dafür, dass die Taste „+" dasselbe tut wie die Fläche
 * „+ N" (Punktfassung). `spKey` und `spWaiting` sind die ganze
 * Straight-Pool-Bedienung: die Tafel reicht die Taste herein, weil hier —
 * und nur hier — bekannt ist, wie viele Kugeln liegen und welche Zahl damit
 * überhaupt gemeint sein kann.
 */
defineExpose({ blockOpen, spKey, spWaiting })
</script>

<template>
  <div class="leiste" :class="{ 'leiste--tut': busy }">
    <!--
      DIE TRIKOTKONTROLLE — GANZ OBEN UND OHNE UHR.

      Sie steht über der roten Abweisungszeile, weil sie länger gilt als
      diese: unten steht, was beim letzten Tippen passiert ist, oben, was an
      dieser Partie fehlt. Und sie steht über der Anstossfrage, weil der
      Auftraggeber sie dort verlangt — siehe trikotOffen.

      `role="status"` und nicht `alert`: ein Zustand, der die ganze Zeit
      gilt, ist keine Unterbrechung. Der Schlüssel trägt die Seite, damit
      beim Abruf nicht der Name der einen Seite an der Zeile der anderen
      hängen bleibt.
    -->
    <div v-if="uniformCheckOpen.length" class="trikot" role="status">
      <p class="trikot__kopf">Uniform check open</p>
      <p class="trikot__wer">
        <span v-for="offen in uniformCheckOpen" :key="offen.side" class="trikot__name">
          {{ offen.displayName }}
          <span class="trikot__seite">{{ sideWord(offen.side) }}</span>
        </span>
      </p>
      <p v-if="uniformCheckBlocks" class="trikot__folge">
        Nothing counts before it is done.
      </p>
    </div>

    <!--
      DIE ANGEORDNETE SHOT-CLOCK — ÜBER DER ABWEISUNG UND UNTER DER
      TRIKOTKONTROLLE.

      Beide Nachbarn sind Zustände wie diese hier, und die Reihenfolge ist
      die des Spielbetriebs: die Trikotkontrolle kommt vor dem Anstoss, die
      Shot-Clock mitten in der Partie, die rote Abweisung beantwortet den
      letzten Tipper.

      KEIN KNOPF, UND DAS IST DER GANZE PUNKT.

      Diese Fläche ist NICHT anklickbar — kein `@click`, kein `role="button"`,
      kein `tabindex`. Vor der Tafel stehen die SPIELER, und die Shot-Clock ist
      eine Anordnung gegen einen von ihnen; wer sie wegklicken kann, klickt
      sie weg. Bestätigt wird sie im Schiedsrichtermenü, und dorthin kommt
      nur, wer zwei Sekunden auf den Rahmen drückt (siehe `druckAn` in
      board/[eventId]/[table].vue).

      Das ist VERSCHLEIERUNG UND KEINE SICHERHEIT, und so soll es auch im
      Kopf des nächsten Lesers stehen: ein Spieler, der drei Tage auf dem
      Turnier ist und dem Schiedsrichter zusieht, kennt die Geste bald. Sie
      leistet genau das, was sie leisten soll — es passiert nicht beiläufig
      und nicht aus Versehen.

      VERWORFEN: eine EIGENE Geste an dieser Meldung (langer Druck darauf,
      Wischen, zwei Finger). Sie wäre noch unauffälliger, hätte aber zwei
      Fehler. Erstens zeigt sie auf sich selbst: die Meldung ist das Element,
      an dem ein neugieriger Spieler zuerst herumdrückt, und ein langer Druck
      ist das erste, was jeder probiert. Zweitens wäre es ein ZWEITES
      Geheimnis — ein Schiedsrichter, dem man den Rahmengriff gezeigt hat,
      fände es nicht, und die Partie stünde so lange still. Im Menü steht die
      Bestätigung dagegen zwischen Dingen, die er ohnehin dort sucht.

      `role="status"` und nicht `alert`: ein Zustand, der gilt, bis jemand
      handelt, ist keine Unterbrechung.
    -->
    <div v-if="shotClockPending" class="shot-clock" role="status">
      <p class="shot-clock__kopf">Shot clock</p>
      <p class="shot-clock__folge">
        The referee has to acknowledge it — nothing counts before that.
      </p>
    </div>

    <!--
      DER DAUERZUSTAND, LEISE.

      An derselben Stelle wie die Meldung und nicht daneben: es ist dieselbe
      Auskunft, einmal offen und einmal geltend. Zwei Plätze für einen
      Zustand liessen den Blick am Tisch suchen.

      Ohne Zeitangabe. "Shot clock since 14:12" sähe aus wie der Beginn einer
      laufenden Uhr, und genau die gibt es nicht.
    -->
    <p v-else-if="shotClockActive" class="shot-clock shot-clock--gilt" role="status">
      Shot clock in force
    </p>

    <!--
      Die rote Zeile. Sie steht ÜBER den Flächen und nicht unter ihnen: wer
      gerade getippt hat, schaut auf den Finger, und darüber liegt der Weg
      zum Stand. Rot heisst auf dieser Tafel "hier fehlt etwas, das gebraucht
      wird" — und eine Eingabe, die nicht angekommen ist, ist genau das.
    -->
    <p v-if="error" class="leiste__fehler" role="alert">{{ error.text }}</p>

    <!--
      DIE ERSTE FRAGE: WER STÖSST AN
      Zwei Flächen, links der linke Spieler, rechts der rechte — wie die
      Tafel darüber und wie die Tasten 1 und 3 im Vorgängersystem.
    -->
    <div v-if="breakOpen && !finished" class="leiste__frage">
      <p class="leiste__frage-text">Who breaks?</p>
      <div class="leiste__frage-tasten">
        <BoardScoreKey
          :label="shortName(left)" hint="breaks first" key="1"
          kind="plus" :busy="busy" @click="emit('break', left)"
        />
        <BoardScoreKey
          :label="shortName(right)" hint="breaks first" key="3"
          kind="plus" :busy="busy" @click="emit('break', right)"
        />
      </div>
    </div>

    <!--
      ======================================================================
      DIE STRAIGHT-POOL-FASSUNG (14.1 ENDLOS)
      ======================================================================

      Drei Bänder übereinander, und sie folgen dem, was am Tisch passiert:

        1. WAS GILT     — wer am Tisch ist, was noch liegt, wer auf Fouls
                          steht. Keine Fläche, nur Auskunft.
        2. WAS LIEGT    — die Kugelreihe. Der Normalfall, ein Fingertipp.
        3. WAS SONST    — Rack, Safety, Foul. Die Fälle, die keine Zahl sind.

      Darunter das gewohnte Dreispaltenraster für Auszeiten, Undo und Ende:
      die gehören nicht zum Straight Pool, sondern zum Betrieb, und sie
      sollen dort liegen, wo sie an jeder anderen Tafel auch liegen.
    -->
    <div v-else-if="mode === 'STRAIGHT_POOL'" class="sp">
      <!--
        BAND 1 — DER ZUSTAND.

        `role="status"`: es ändert sich bei jedem Eintrag, und wer am Tisch
        mit dem Rücken zur Tafel steht, soll es vorgelesen bekommen.

        Der Foulzähler steht hier und nicht in einem Menü: „on two fouls" ist
        im Straight Pool die wichtigste Angabe überhaupt, und sie geht BEIDE
        Spieler an. Eine Null wird nicht gezeigt — eine Zeile, die bei jeder
        Partie „0 fouls, 0 fouls" sagt, liest nach zwei Minuten niemand mehr,
        und dann fällt auch die Zwei nicht mehr auf.
      -->
      <div class="sp__lage" role="status">
        <p class="sp__tisch">
          <span class="sp__etikett">At the table</span>
          <span class="sp__name">{{ atTableName || '—' }}</span>
        </p>
        <p class="sp__kugeln">
          <span class="sp__zahl">{{ ballsOnTable.rest }}</span>
          <span class="sp__etikett">balls on the table</span>
        </p>
        <p class="sp__anleitung">{{ spInstructions }}</p>
        <p class="sp__fouls">
          <template v-for="side in [left, right]" :key="side">
            <span
              v-if="ballsOnTable.fouls[side] > 0"
              class="sp__foul" :class="{ 'sp__foul--zwei': onTwoFouls(side) }"
            >{{ shortName(side) }}
              <template v-if="onTwoFouls(side)">on two fouls</template>
              <template v-else>{{ ballsOnTable.fouls[side] }} foul</template>
            </span>
          </template>
        </p>
      </div>

      <!--
        BAND 2 — DIE KUGELREIHE.

        „Er hat verschossen. Wie viele liegen noch?" Ein Tipp, und das Gerät
        rechnet: vorheriger Rest minus dieser Zahl. Die kleine Zahl unter
        jeder Fläche zeigt dieselbe Rechnung vorher an — wer „+7" liest,
        bevor er drückt, tippt nicht daneben.

        Die Reihe endet bei der Eins. Bleibt genau eine Kugel liegen, sind
        vierzehn versenkt und es wird neu aufgebaut (WPA 7.4); der Spieler
        geht trotzdem, denn er hat den Stoss verfehlt und nicht ausgespielt.
        Genau das ist der Unterschied zur Fläche „Rack" darunter.
      -->
      <div class="sp__reihe">
        <!--
          DIE ANTWORT AUF EINE TASTE, DIE NICHTS BEWIRKEN KONNTE.

          Sie steht HIER und nicht unten bei der roten Abweisungszeile: die
          beantwortet, was der Server gesagt hat, diese, was die Tafel aus
          der Taste gemacht hat. Und sie steht über der Reihe, auf die sie
          sich bezieht — „9 geht nicht, es liegen 8" liest sich nur dort, wo
          die 8 danebensteht.
        -->
        <p v-if="spMessage" class="sp__meldung" role="status">{{ spMessage }}</p>
        <div class="sp__kugeltasten" aria-label="Balls left after the miss">
          <button
            v-for="n in ballRow" :key="n"
            type="button" class="sp__kugel"
            :disabled="finished || busy || !atTable || !!scoreLockReason"
            @click="emit('remaining', n)"
          >
            <span class="sp__kugel-zahl">{{ n }}</span>
            <span class="sp__kugel-punkte">+{{ pointsFor(n) }}</span>
            <!--
              Die Tastenfolge NUR, wo sie von der Zahl abweicht — siehe
              spTastenfolge. Unter der 7 stünde sonst noch einmal eine 7.
            -->
            <span
              v-if="spKeySequence(n)" class="sp__kugel-taste" aria-hidden="true"
            >{{ spKeySequence(n) }}</span>
          </button>
        </div>
      </div>

      <!--
        BAND 3 — WAS KEINE ZAHL IST.

        RACK und RACK · 15TH DOWN sind zwei Flächen und kein Schalter: der
        zweite Fall (WPA 7.8 a — die fünfzehnte fiel auf demselben Stoss wie
        die vierzehnte) kommt selten vor, und ein Schalter daneben hiesse,
        dass der häufige Fall zweimal bedient werden muss.

        BREAK FOUL steht neben FOUL, weil es etwas anderes ist: zwei Punkte
        statt einem, und es zählt NICHT für die Dreierfolge (WPA 7.10/7.11).
        Wer die beiden zusammenlegte, zählte dem Spieler eine Foulfolge zu,
        die er nach den Regeln nicht hat. Es steht seit dem 16.09.2026
        ZWEIMAL da — die Begründung dafür bei den Flächen selbst.
      -->
      <div class="sp__tasten">
        <BoardScoreKey
          label="Rack"
          :hint="`break ball left · +${Math.max(0, ballsOnTable.rest - 1)} · stays`"
          key="+" width="voll" kind="plus"
          :locked="finished || !atTable || !!scoreLockReason" :busy="busy"
          @click="emit('rack', false)"
        />
        <BoardScoreKey
          label="Rack · 15th down"
          :hint="`all fifteen · +${ballsOnTable.rest} · stays`"
          key="/ 1" width="voll" kind="plus"
          :locked="finished || !atTable || !!scoreLockReason" :busy="busy"
          @click="emit('rack', true)"
        />
        <BoardScoreKey
          label="Safety" hint="no points · turn over"
          key="-" width="voll"
          :locked="finished || !atTable || !!scoreLockReason" :busy="busy"
          @click="emit('safety')"
        />
        <BoardScoreKey
          label="Foul"
          :hint="foulCost === 16 ? 'third foul · −16 · re-rack' : '−1 · turn over'"
          key="." width="voll" kind="minus"
          :locked="finished || !atTable || !!scoreLockReason" :busy="busy"
          @click="emit('foul', 'STANDARD')"
        />
        <!--
          DAS BREAK-FOUL HAT ZWEI AUSGÄNGE, UND SIE STEHEN NEBENEINANDER.

          WPA 7.3 (b): der Gegner darf die Kugeln in ihrer Lage annehmen ODER
          den Anstossenden zu einem neuen Eröffnungsstoss zwingen — so lange,
          bis der die Anstossbedingung erfüllt oder der Gegner annimmt. Jeder
          Fehlversuch kostet erneut zwei Punkte (7.10).

          ZWEI FLÄCHEN UND KEINE RÜCKFRAGE NACH DEM TIPPEN. Der Einwand liegt
          nahe: der Schiedsrichter weiss im Augenblick des Fouls noch nicht,
          wie der Gegner entscheidet. Er weiss es aber, BEVOR er tippt — er
          fragt ihn, und erst dann greift er zur Tafel; am Tisch wird nicht
          gebucht und dann nachgefragt. Eine Rückfrage machte aus einem Griff
          zwei, hinterliesse dazwischen eine Tafel in einem Zustand, den es
          im Spiel nicht gibt, und sie müsste selbst wieder abbrechbar sein.
          So ist ein Tastendruck ein Schreibvorgang und ein Undo-Schritt —
          dieselbe Regel wie bei allem anderen auf dieser Leiste.

          KEINE VON BEIDEN ZÄHLT FÜR DIE DREIERFOLGE (7.11), auch beim
          fünften Fehlversuch nicht. Das steht auf beiden Flächen.
        -->
        <BoardScoreKey
          label="Break foul · again"
          hint="−2 · re-rack · breaker stays"
          key="/ 2" width="voll" kind="minus"
          :locked="finished || !atTable || !!scoreLockReason" :busy="busy"
          @click="emit('foul', 'BREAK_AGAIN')"
        />
        <BoardScoreKey
          label="Break foul · accept"
          hint="−2 · balls in position · turn over"
          key="/ 3" width="voll" kind="minus"
          :locked="finished || !atTable || !!scoreLockReason" :busy="busy"
          @click="emit('foul', 'BREAK_ACCEPT')"
        />
      </div>

      <!--
        DER BETRIEB — eine Reihe und nicht drei Spalten.

        An der Satztafel stehen Undo, Wechsel und Ende UNTEREINANDER in der
        Mittelspalte; das geht dort, weil darüber nur zwei Reihen liegen.
        Hier liegen drei, und ein Dreierstapel obendrauf schob die Leiste über
        die Namen der Spieler — die Tafel ist hundert Bildhöhen hoch und nicht
        mehr.

        Die Auszeiten bleiben trotzdem aussen und in der Reihenfolge der
        Tafel: links die des linken Spielers, rechts die des rechten. Das ist
        der einzige Grund, aus dem sie überhaupt aussen liegen, und er gilt
        in einer Reihe genauso.
      -->
      <div class="sp__betrieb">
        <!--
          AUSZEIT, WECHSEL UND ENDE LIEGEN IM STRAIGHT POOL AUF DER ZWEITEN
          EBENE (/4, /5, /6) UND NICHT AUF 4, 5 UND 6.

          Das ist kein Bruch mit der Satztafel, sondern ihre Folge: dort sind
          4, 5 und 6 frei, weil dort keine Kugelreihe liegt. Hier sind sie
          Zahlen — die 5 heisst „fünf Kugeln liegen noch". Die ZIFFER bleibt
          dieselbe wie überall (4 ist Seite A, 6 ist Seite B, 5 ist Wechsel
          und Ende), sie bekommt nur die / davor. Wer die Satztafel kennt,
          muss nichts Neues lernen ausser dem Vorzeichen.
        -->
        <BoardScoreKey
          label="Time out" :hint="timeoutHint(left)"
          :key="left === 'A' ? '/ 4' : '/ 6'" width="voll"
          :locked="finished || !!scoreLockReason" :busy="busy"
          @click="emit('timeout', left, timeoutRunning[left])"
        />
        <BoardScoreKey
          label="Undo" hint="last entry" key="*"
          width="voll" kind="minus" :locked="!canUndo"
          :busy="busy" @click="emit('undo')"
        />
        <!--
          DER TISCHWECHSEL VON HAND. Er ist keine Regel, sondern die
          Richtigstellung: wer sich vertippt hat, hat den Tisch beim
          Falschen. Punkte, Restkugeln und Foulzähler bleiben unberührt —
          das ist der ganze Unterschied zu allem darüber.

          NICHT MEHR DER WEG FÜR DAS BREAK-FOUL. Bis zum 16.09.2026 stand
          hier, er sei auch für WPA 7.3 (b) da: buchen und dann den Tisch
          zurückgeben. Das waren zwei Einträge für einen Stoss, und ein Undo
          nahm davon die Hälfte. Dafür steht jetzt „Break foul · again".
        -->
        <BoardScoreKey
          label="Switch"
          :hint="atTableName ? `hand the table to ${shortName(atTable === 'A' ? 'B' : 'A')}` : ''"
          :key="winner ? '' : '/ 5'" width="voll"
          :locked="finished || !atTable || !!scoreLockReason" :busy="busy"
          @click="emit('table')"
        />
        <BoardScoreKey
          label="Finish"
          :hint="finished
            ? 'already final'
            : winner
              ? `${shortName(winner)} wins`
              : `nobody has reached ${distance}`"
          :key="winner ? '/ 5' : ''" width="voll" kind="ende"
          :locked="finished || !winner" :busy="busy"
          @click="winner && emit('finish')"
        />
        <BoardScoreKey
          label="Time out" :hint="timeoutHint(right)"
          :key="right === 'A' ? '/ 4' : '/ 6'" width="voll"
          :locked="finished || !!scoreLockReason" :busy="busy"
          @click="emit('timeout', right, timeoutRunning[right])"
        />
      </div>
    </div>

    <!--
      Drei Spalten, in genau dem Raster der Tafel darüber (siehe
      .board__partie): sonst läge die Fläche des linken Spielers nicht unter
      seinem Namen, und das ist der einzige Grund, warum sie überhaupt links
      liegt.
    -->
    <div v-else class="leiste__spalten">
      <!-- LINKE SEITE -->
      <div class="leiste__seite">
        <div class="leiste__reihe">
          <BoardScoreKey
            :label="mode === 'POINT_RACE' ? '+1' : '+'"
            :hint="shortName(left)" :key="left === 'A' ? '7' : '9'"
            kind="plus" :locked="finished || !!scoreLockReason" :busy="busy"
            @click="emit('count', left, 1)"
          />
          <BoardScoreKey
            v-if="mode === 'POINT_RACE'"
            label="+ N" hint="run" key="+"
            width="schmal" kind="plus" :locked="finished || !!scoreLockReason"
            :busy="busy"
            @click="blockOpen(left, 1)"
          />
          <BoardScoreKey
            label="−" :key="left === 'A' ? '1' : '3'"
            width="schmal" kind="minus" :locked="finished || score[left] <= 0"
            :busy="busy" @click="emit('count', left, -1)"
          />
        </div>
        <BoardScoreKey
          label="Time out" :hint="timeoutHint(left)"
          :key="left === 'A' ? '4' : '6'" width="voll"
          :locked="finished || !!scoreLockReason" :busy="busy"
          @click="emit('timeout', left, timeoutRunning[left])"
        />
      </div>

      <!-- MITTE: was beide angeht -->
      <div class="leiste__mitte">
        <BoardScoreKey
          label="Undo" hint="last entry" key="*"
          width="voll" kind="minus" :locked="!canUndo"
          :busy="busy" @click="emit('undo')"
        />
        <!--
          Der Wechsel steht NUR in der Punktfassung. Im Vorgängersystem heisst
          er `togglePlayers` und wechselt, wer am Tisch ist — im Straight Pool
          das Ende einer Aufnahme. Für ein Satzspiel gibt es ihn dort gar
          nicht, und hier deshalb auch nicht: wer anstösst, folgt der Regel
          des Turniers und wird über die Anstoßfrage gesetzt.
        -->
        <BoardScoreKey
          v-if="mode === 'POINT_RACE'"
          label="End of turn"
          :hint="extra?.nextBreak ? `${shortName(extra.nextBreak)} is at the table` : ''"
          :key="winner ? '' : '5'" width="voll"
          :locked="finished || !!scoreLockReason" :busy="busy"
          @click="emit('break', extra?.nextBreak === 'A' ? 'B' : 'A')"
        />
        <BoardScoreKey
          label="Finish"
          :hint="finished
            ? 'already final'
            : winner
              ? `${shortName(winner)} wins`
              : `nobody has reached ${distance}`"
          :key="winner ? '5' : ''" width="voll" kind="ende"
          :locked="finished || !winner" :busy="busy"
          @click="winner && emit('finish')"
        />
      </div>

      <!-- RECHTE SEITE, gespiegelt: das Plus aussen, das Minus zur Mitte -->
      <div class="leiste__seite">
        <div class="leiste__reihe">
          <BoardScoreKey
            label="−" :key="right === 'A' ? '1' : '3'"
            width="schmal" kind="minus" :locked="finished || score[right] <= 0"
            :busy="busy" @click="emit('count', right, -1)"
          />
          <BoardScoreKey
            v-if="mode === 'POINT_RACE'"
            label="+ N" hint="run" key="+"
            width="schmal" kind="plus" :locked="finished || !!scoreLockReason"
            :busy="busy"
            @click="blockOpen(right, 1)"
          />
          <BoardScoreKey
            :label="mode === 'POINT_RACE' ? '+1' : '+'"
            :hint="shortName(right)" :key="right === 'A' ? '7' : '9'"
            kind="plus" :locked="finished || !!scoreLockReason" :busy="busy"
            @click="emit('count', right, 1)"
          />
        </div>
        <BoardScoreKey
          label="Time out" :hint="timeoutHint(right)"
          :key="right === 'A' ? '4' : '6'" width="voll"
          :locked="finished || !!scoreLockReason" :busy="busy"
          @click="emit('timeout', right, timeoutRunning[right])"
        />
      </div>
    </div>

    <!--
      ======================================================================
      DER VORHANG DER FERNBEDIENUNG — WAS GERADE AUSSTEHT
      ======================================================================

      Der Auftraggeber hat sich über eine Tafel beschwert, bei der man nicht
      erkennt, ob etwas passiert. Genau das wäre eine Eins, die still auf
      ihre zweite Ziffer wartet: der Schiedsrichter drückt, nichts rührt
      sich, er drückt noch einmal — und hat 11 statt 1 eingetragen.

      Deshalb gibt es KEINEN unsichtbaren Zwischenzustand. Wartet etwas,
      steht es hier, mit allem, was jetzt möglich ist, und mit dem Weg
      hinaus. Er liegt auf der `/` (und auf dieser Fläche, für das Tablet).

      Er liegt ÜBER der Leiste und lässt den Stand frei — dieselbe Lage wie
      der Zifferblock der Punktfassung darunter, aus demselben Grund: was man
      gerade verändert, muss dabei sichtbar bleiben.

      `role="status"` und nicht `alert`: es ist ein Zustand, den der Bediener
      selbst herbeigeführt hat, und keine Unterbrechung.
    -->
    <div v-if="spPending" class="spblock" role="status">
      <template v-if="spPending === 'tens'">
        <p class="spblock__kopf">
          Balls left
          <span class="spblock__zahl">1<span class="spblock__strich">_</span></span>
        </p>
        <div class="spblock__wahlen">
          <span v-for="w in spTensChoices" :key="w.value" class="spblock__wahl">
            <b class="spblock__taste">{{ w.key }}</b>
            <span class="spblock__wort">{{ w.value }}</span>
          </span>
        </div>
      </template>

      <template v-else>
        <p class="spblock__kopf">
          More
          <span class="spblock__zahl">/</span>
        </p>
        <div class="spblock__wahlen">
          <span class="spblock__wahl">
            <b class="spblock__taste">1</b>
            <span class="spblock__wort">Rack · 15th down</span>
          </span>
          <span class="spblock__wahl">
            <b class="spblock__taste">2</b>
            <span class="spblock__wort">Break foul · again</span>
          </span>
          <span class="spblock__wahl">
            <b class="spblock__taste">3</b>
            <span class="spblock__wort">Break foul · accept</span>
          </span>
          <span class="spblock__wahl">
            <b class="spblock__taste">4</b>
            <span class="spblock__wort">Time out {{ shortName('A') }}</span>
          </span>
          <span class="spblock__wahl">
            <b class="spblock__taste">5</b>
            <span class="spblock__wort">{{ winner ? 'Finish' : 'Switch' }}</span>
          </span>
          <span class="spblock__wahl">
            <b class="spblock__taste">6</b>
            <span class="spblock__wort">Time out {{ shortName('B') }}</span>
          </span>
        </div>
      </template>

      <p v-if="spMessage" class="spblock__meldung">{{ spMessage }}</p>

      <button type="button" class="spblock__weg" @click="spClose()">
        Cancel <span class="spblock__weg-taste" aria-hidden="true">/</span>
      </button>
    </div>

    <!--
      DER ZIFFERBLOCK DER PUNKTFASSUNG
      Er liegt über der Leiste und lässt Stand und Namen frei — wer eine
      Aufnahme von 30 einträgt, will dabei sehen, wo er herkommt.
    -->
    <div v-if="block" class="block">
      <p class="block__kopf">
        Add to {{ shortName(block.side) }}
        <span class="block__zahl">{{ block.input || '0' }}</span>
      </p>
      <div class="block__ziffern">
        <button
          v-for="z in ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0']"
          :key="z" type="button" class="block__ziffer" @click="blockDigit(z)"
        >{{ z }}</button>
        <button type="button" class="block__ziffer" @click="blockClear()">C</button>
        <button
          type="button" class="block__ziffer block__ziffer--ok"
          :disabled="blockTooHigh" @click="blockConfirm()"
        >
          OK
        </button>
      </div>
      <!--
        Die Grenze wird erst beim Danebentippen genannt und nicht vorweg:
        eine Zeile, die bei jedem Öffnen „max 100" sagt, wird nach dem
        dritten Mal nicht mehr gelesen.
      -->
      <p v-if="blockTooHigh" class="block__zuviel">
        {{ blockLimit }} is the race — that cannot be one turn
      </p>
      <button type="button" class="block__weg" @click="blockClose()">Cancel</button>
    </div>
  </div>
</template>

<style scoped>
.leiste {
  display: flex;
  flex-direction: column;
  gap: 1dvh;
  /* Dieselbe seitliche Flucht wie die Tafel darüber: die Fläche des linken
     Spielers muss unter seinem Namen liegen und nicht daneben. */
  padding: 0 3.5vw 1dvh;
}

/*
 * Eine dünne Linie nach oben statt eines Kastens. Die Leiste gehört zur
 * Tafel und ist kein Fenster darauf; ein Rahmen ringsum machte aus dem
 * Bildschirm zwei Bildschirme.
 */
.leiste__spalten,
.leiste__frage {
  padding-top: 1.2dvh;
  border-top: 2px solid var(--line);
}

.leiste__spalten {
  display: grid;
  /* Exakt das Raster von .board__partie — siehe Kopf. */
  grid-template-columns: minmax(0, 1fr) 26vw minmax(0, 1fr);
  gap: 0 2vw;
}

.leiste__seite,
.leiste__mitte {
  display: flex;
  flex-direction: column;
  gap: 0.8dvh;
  min-width: 0;
}

.leiste__reihe {
  display: flex;
  gap: 0.8dvh;
}

/* ------------------------------------------------------------------------
 * DIE STRAIGHT-POOL-FASSUNG
 *
 * Drei Bänder über dem gewohnten Dreispaltenraster. Sie laufen über die
 * GANZE Breite und nicht in Spalten: was hier eingetragen wird, gehört nicht
 * einer Seite, sondern dem, der am Tisch ist — und wer das ist, steht im
 * ersten Band. Eine Kugelreihe unter dem Namen des linken Spielers wäre eine
 * Behauptung darüber, wem sie gutgeschrieben wird.
 * --------------------------------------------------------------------- */
.sp {
  display: flex;
  flex-direction: column;
  gap: 0.7dvh;
  padding-top: 0.9dvh;
  border-top: 2px solid var(--line);
}

/*
 * EINE ZEILE UND KEINE ZWEI — die Höhe der Leiste hängt daran.
 *
 * `nowrap`: bricht diese Zeile um, wächst die Leiste um drei Bildhöhen und
 * schiebt sich dem linken Spieler in den Vornamen. Das ist am 16.09.2026
 * zweimal passiert, beim zweiten Mal genau dann, wenn die Foulmarke
 * erschien — also ausgerechnet in der Lage, in der die Tafel gelesen wird.
 *
 * Die Zeile trägt im schlimmsten Fall beide Foulmarken ("X ON TWO FOULS"
 * zweimal); dafür ist bei 1920 Platz. Wird es enger, schrumpft der Name und
 * nicht die Warnung — deshalb steht `min-width: 0` an den Textstücken und
 * nicht an den Marken.
 */
.sp__lage {
  display: flex;
  flex-wrap: nowrap;
  align-items: baseline;
  gap: 0.4dvh 2vw;
  overflow: hidden;
}

.sp__tisch,
.sp__kugeln,
.sp__anleitung,
.sp__fouls {
  display: flex;
  align-items: baseline;
  gap: 0.8vw;
  margin: 0;
  min-width: 0;
}

.sp__fouls {
  flex: none;
  flex-wrap: nowrap;
  /* Nach rechts: links steht, was IMMER gilt, rechts, was nur manchmal
     gilt. Eine Meldung, die mal da ist und mal nicht, darf die beiden
     festen Angaben daneben nicht verschieben. */
  margin-left: auto;
}

.sp__etikett {
  font-size: min(2.2dvh, 1.7vw);
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--ink-dim);
}

.sp__name {
  font-size: min(3dvh, 2.3vw);
  font-weight: 800;
}

/* Die Restkugeln sind die Zahl, auf die der Schiedsrichter zwischen zwei
   Aufnahmen schaut — sie ist deshalb die grösste in diesem Band. */
.sp__zahl {
  font-size: min(3.8dvh, 2.9vw);
  font-weight: 800;
  font-variant-numeric: tabular-nums;
}

/*
 * EIN FOUL IST EIN HINWEIS, ZWEI SIND EINE WARNUNG — und sie sehen deshalb
 * verschieden aus. Bei zwei Fouls kostet der nächste Fehler sechzehn Punkte
 * statt einem; das ist keine Zwischenstufe, sondern ein anderer Zustand.
 */
.sp__foul {
  padding: 0.3dvh 0.9vw;
  border: 2px solid var(--line);
  border-radius: 0.6dvh;
  font-size: min(2.2dvh, 1.7vw);
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--ink-dim);
}

.sp__foul--zwei {
  border-color: var(--color-danger, #ff5252);
  background: rgb(255 82 82 / 16%);
  color: var(--color-danger, #ff5252);
}

/*
 * DIE ANLEITUNG STEHT IN DERSELBEN ZEILE WIE DER ZUSTAND.
 *
 * Sie hatte bis zum 16.09.2026 eine eigene Zeile über der Kugelreihe, und
 * die kostete drei Bildhöhen — genug, dass die Leiste dem Namen des linken
 * Spielers in die Zeile rutschte. Der Satz ist kurz und sagt dasselbe, wo er
 * jetzt steht; die Zeile daneben war der teurere Teil.
 */
.sp__anleitung {
  font-size: min(2.2dvh, 1.7vw);
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--ink-dim);
}

/*
 * Die Reihe teilt sich die Breite gleichmässig auf. `1fr` und keine feste
 * Breite: sie wird mit jeder gefallenen Kugel kürzer, und eine Reihe, die
 * dabei linksbündig stehen bliebe, liesse rechts ein Loch, in das niemand
 * mehr tippt — die Flächen wären ausserdem jedes Mal woanders.
 */
.sp__kugeltasten {
  display: grid;
  grid-auto-flow: column;
  grid-auto-columns: minmax(0, 1fr);
  gap: 0.6vw;
}

.sp__kugel {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.2dvh;
  /*
   * 7.5dvh statt der 9dvh einer BoardScoreKey — und das ist keine Ausnahme
   * von der Ergonomie, sondern die Folge der Form. Eine Zahl braucht keine
   * zwei Zeilen: die Fläche ist so BREIT wie ein Sechzehntel der Tafel und
   * damit an der Stelle, auf die der Finger zielt, grösser als jede Taste
   * daneben. Und sie muss es sein, denn über diesen drei Reihen steht noch
   * der Stand, und der bleibt das grösste Element des Bildes.
   */
  min-height: 8.4dvh;
  padding: 0.3dvh 0;
  border: 2px solid var(--line);
  border-radius: 0.8dvh;
  background: rgb(255 255 255 / 6%);
  color: inherit;
  cursor: pointer;
}

.sp__kugel:disabled {
  opacity: 0.35;
  cursor: default;
}

.sp__kugel-zahl {
  font-size: min(3.6dvh, 2.8vw);
  font-weight: 800;
  font-variant-numeric: tabular-nums;
  line-height: 1;
}

/* Die Rechnung, bevor sie passiert. Klein und grün: sie ist die Folge des
   Drucks und nicht seine Beschriftung. */
.sp__kugel-punkte {
  font-size: min(2dvh, 1.5vw);
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  color: var(--color-success, #59d07a);
}

/*
 * Die Tastenfolge — nur dort, wo sie von der Zahl abweicht.
 *
 * EINE EIGENE ZEILE UND KEINE ECKE, anders als bei BoardScoreKey. Deren
 * Ecke ist frei; hier steht in der Mitte eine Zahl in 3.6dvh, und eine Fläche
 * von einem Sechzehntel Tafelbreite hat in keiner Ecke Platz für zwei
 * Zeichen, ohne dass sie in dieser Zahl lägen oder am Rand abgeschnitten
 * würden. Ausprobiert und verworfen: oben rechts (lag in der Zahl), unten
 * rechts (das Enterzeichen fiel aus der Fläche).
 *
 * Die Lesefolge stimmt so auch besser: erst die Zahl, dann was sie
 * einbringt, dann wie man sie tippt. Der weite Zeichenabstand ist Absicht —
 * „1 5" sind ZWEI Tastendrücke und nicht die Zahl fünfzehn.
 */
.sp__kugel-taste {
  font-size: min(1.5dvh, 1.2vw);
  font-weight: 700;
  letter-spacing: 0.3em;
  /* Der Abstand rechts gleicht die Sperrung des letzten Zeichens aus, damit
     die Zeile wirklich mittig steht und nicht um ein Drittel nach links. */
  text-indent: 0.3em;
  opacity: 0.5;
}

/*
 * Die Antwort auf eine Taste, die nichts bewirken konnte. Umrandet statt
 * ausgefüllt — die ausgefüllte rote Fläche gehört der Abweisung vom Server
 * (.leiste__fehler), und zwei gleich aussehende rote Zeilen wären eine zu
 * viel.
 */
.sp__meldung {
  margin: 0 0 0.6dvh;
  padding: 0.5dvh 1.2dvh;
  border: 2px solid var(--color-danger, #ff5252);
  border-radius: 0.8dvh;
  color: var(--color-danger, #ff5252);
  font-size: min(2.2dvh, 1.7vw);
  font-weight: 700;
  letter-spacing: 0.04em;
  text-align: center;
}

.sp__tasten,
.sp__betrieb {
  display: grid;
  gap: 0.6vw;
}

/*
 * SECHS FLÄCHEN IN EINER REIHE UND NICHT FÜNF PLUS EINE.
 *
 * Seit das Break-Foul zwei Ausgänge hat (WPA 7.3 b), liegen in diesem Band
 * sechs Flächen. Bei fünf Spalten fiel die sechste in eine zweite Reihe —
 * und die Leiste schob sich damit über die Namen der Spieler, genau der
 * Fehler, gegen den weiter oben die Betriebsreihe einreihig gehalten wird.
 * Die Tafel ist hundert Bildhöhen hoch und nicht mehr.
 *
 * Die Betriebsreihe darunter bleibt bei fünf: sie hat fünf Flächen, und
 * sechs Spalten liessen dort eine leer stehen.
 */
.sp__tasten {
  grid-template-columns: repeat(6, minmax(0, 1fr));
}

.sp__betrieb {
  grid-template-columns: repeat(5, minmax(0, 1fr));
}

/*
 * FÜNF UND SECHS FLÄCHEN IN EINER REIHE TRAGEN KÜRZERE SCHRIFT — UND ALLE
 * DIESELBE.
 *
 * BoardScoreKey rechnet je Fläche aus ihrer eigenen Beschriftung aus, wie
 * gross die Schrift höchstens werden darf. Für eine einzelne Fläche ist das
 * richtig; für eine REIHE wäre es falsch: „RACK" stünde doppelt so gross da
 * wie „BREAK FOUL · ACCEPT" daneben, und eine Reihe mit sechs verschiedenen
 * Schriftgraden sieht aus wie ein Fehler im Raster.
 *
 * Diese beiden Bänder geben deshalb EIN Maß für alle vor, und es richtet
 * sich nach der längsten Beschriftung der Reihe. Alle Flächen einer Reihe
 * sind gleich breit (`repeat(n, minmax(0, 1fr))`), also gilt, was für die
 * längste passt, für jede.
 *
 * Gerechnet wird in `cqw` — Hundertsteln der FLÄCHE — und nicht mehr in
 * `vw`; die Begründung steht in BoardScoreKey am Container.
 */
.sp__tasten :deep(.taste__wort),
.sp__betrieb :deep(.taste__wort) {
  /* Längste Beschriftung der Betriebsreihe: „TIME OUT", nachgemessen 5,41
     em. 16 cqw lassen ihr 87 von 100. */
  font-size: min(2.7dvh, 16cqw);
}

/*
 * Nachgemessen und nicht geschätzt: „BREAK FOUL · ACCEPT" misst 12,61 em.
 * Bei 7,6 cqw braucht es 95,8 von 100 cqw der Fläche — randlos, aber
 * innerhalb. Mehr Luft ginge nur über kürzere Wörter; die Leiste bedient
 * der Schiedsrichter aus einem halben Meter und nicht aus zehn, gelesen
 * werden muss aus zehn Metern der STAND darüber, und der bleibt unberührt.
 */
.sp__tasten :deep(.taste__wort) {
  font-size: min(1.95dvh, 7.6cqw);
}

/*
 * Die Hinweiszeilen dürfen umbrechen, aber nur einmal. Längster Hinweis der
 * Betriebsreihe: „HAND THE TABLE TO RAMKHELAWAN" (rund 18 em), im
 * Tastenband „−2 · BALLS IN POSITION · TURN OVER" (20,42 em).
 *
 * DIE GRENZE IST AUSPROBIERT UND NICHT GERECHNET: der Browser bricht gierig
 * um, nicht ausgeglichen, und ob eine dritte Zeile entsteht, hängt davon
 * ab, wo die Wortfugen liegen. Bei 8 cqw stand „−2 · BALLS IN POSITION ·
 * TURN OVER" auf drei Zeilen und machte das ganze Band neun Bildpunkte
 * höher — die nimmt es der Tafel darüber weg. Bei 7,4 cqw bleiben alle
 * sechs bei höchstens zwei. Das Verhältnis Schrift zu Flächenbreite ist
 * fest, also gilt es bei jedem Format.
 */
.sp__tasten :deep(.taste__hinweis),
.sp__betrieb :deep(.taste__hinweis) {
  font-size: min(1.8dvh, 9cqw);
}

.sp__tasten :deep(.taste__hinweis) {
  font-size: min(1.6dvh, 7.4cqw);
}

.sp__tasten :deep(.taste),
.sp__betrieb :deep(.taste) {
  min-height: 7.4dvh;
}

/*
 * DIE TASTE IN DER ECKE BEKOMMT HIER EINEN RAHMEN — UND DIE BESCHRIFTUNG
 * WEICHT IHR AUS.
 *
 * Zwei Gründe, und beide gelten nur in diesen zwei Bändern:
 *
 * ERSTENS DER PLATZ. „Break foul · accept" füllt seine Fläche fast
 * randlos, und die blasse Ziffer der Ecke lag darin. Die seitliche Luft an
 * der Beschriftung hält die Ecke frei; sie steht beidseitig, damit das Wort
 * mittig bleibt.
 *
 * ZWEITENS DER PUNKT. Das Foul liegt auf der Punkttaste des Zifferblocks,
 * und ein blasser Punkt in 1.7dvh ist auf einer Tafel schlicht nicht zu
 * sehen — ein Hinweis, den niemand lesen kann, ist keiner. Der Rahmen hat
 * die Fläche, die das Zeichen nicht hat: sichtbar ist dann die TASTE, und
 * was daraufsteht, liest man aus der Nähe. Dieselbe Umrandung trägt auch
 * „/ 1" bis „/ 6" — zwei Zeichen, die als Paar gelesen werden sollen und
 * nicht als Ziffer neben einem Schrägstrich.
 *
 * An der Satztafel bleibt es bei der nackten Ziffer: dort steht je Fläche
 * EIN Zeichen, die Beschriftungen sind kurz, und ein Rahmen wäre Lärm.
 */
.sp__tasten :deep(.taste),
.sp__betrieb :deep(.taste) {
  /*
   * Ein Streifen oben, in dem KEINE Beschriftung steht. „Break foul ·
   * accept" läuft bei 1920 x 1080 auf 249 von 288 Bildpunkten und trägt
   * `white-space: nowrap` — seitlich Luft für die Ecke zu schaffen hiesse
   * also, die Beschriftung aus der Fläche zu schieben. Die Höhe hat den
   * Platz, den die Breite nicht hat.
   */
  padding-top: 2.2dvh;
  min-height: 9.2dvh;
}

.sp__tasten :deep(.taste__taste),
.sp__betrieb :deep(.taste__taste) {
  top: 0.4dvh;
  right: 0.6dvh;
  min-width: 2.8dvh;
  padding: 0.1dvh 0.5dvh;
  border: 1px solid currentcolor;
  border-radius: 0.5dvh;
  /* Auch die Ecke misst an der Fläche und nicht am Fenster — sonst wächst
     sie auf einem breiten Schirm über den Knopf hinaus, auf dem sie sitzt. */
  font-size: min(1.6dvh, 11cqw);
  line-height: 1.3;
  text-align: center;
  opacity: 0.5;
}

.leiste__frage {
  display: flex;
  align-items: center;
  gap: 2vw;
}

.leiste__frage-text {
  flex: none;
  margin: 0;
  font-size: min(3.4dvh, 2.6vw);
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  /* Rot: hier fehlt etwas, das gebraucht wird — ohne Anstoß zählt nichts. */
  color: var(--color-danger, #ff5252);
}

.leiste__frage-tasten {
  display: flex;
  flex: 1 1 auto;
  gap: 2vw;
}

/*
 * DER ZUSTAND SIEHT ANDERS AUS ALS DIE MELDUNG — mit Absicht.
 *
 * Die Abweisung darunter ist eine gefüllte rote Fläche: sie soll einmal
 * auffallen und dann gehen. Dieser Balken bleibt unter Umständen eine
 * Viertelstunde stehen, und eine viertelstündlich leuchtende Fläche im Saal
 * liest nach zwei Minuten niemand mehr. Er hat deshalb nur eine rote Kante
 * und einen Hauch Rot im Grund — rot heisst auf dieser Tafel "hier fehlt
 * etwas, das gebraucht wird", und das gilt hier, so lange es gilt.
 */
.trikot {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 0.6dvh 1.6vw;
  padding: 0.8dvh 1.4dvh;
  border: 2px solid var(--color-danger, #ff5252);
  border-left-width: 0.9dvh;
  border-radius: 0.8dvh;
  background: rgb(255 82 82 / 12%);
}

.trikot__kopf {
  margin: 0;
  font-size: min(2.6dvh, 2vw);
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--color-danger, #ff5252);
}

.trikot__wer {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4dvh 1.4vw;
  margin: 0;
  min-width: 0;
}

/* Der Name gross, die Seite klein dahinter: gesucht wird am Tisch ein
   Mensch, und "left"/"right" sagt nur, wo er steht. */
.trikot__name {
  font-size: min(2.8dvh, 2.2vw);
  font-weight: 700;
}

.trikot__seite {
  margin-left: 0.5vw;
  font-size: min(2dvh, 1.6vw);
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--ink-dim);
}

/*
 * Die Folge steht direkt hinter den Namen und NICHT rechts abgesetzt.
 * Abgesetzt fuellte sie die Zeile schoener aus, las sich auf 1920 aber wie
 * eine zweite, unverbundene Angabe — dabei ist der ganze Balken ein Satz:
 * wer, und was daraus folgt.
 */
.trikot__folge {
  margin: 0;
  font-size: min(2.2dvh, 1.7vw);
  color: var(--ink-dim);
}

/*
 * DIE SHOT-CLOCK — DIESELBE FORM WIE DIE TRIKOTKONTROLLE, IN GELB.
 *
 * Dieselbe Form, weil es dieselbe Sorte Auskunft ist: ein Zustand, der
 * steht, bis jemand etwas tut. Ein Balken mit dicker Kante links, in der
 * Flucht der Tafel. Wer den einen gelesen hat, liest den anderen ohne
 * Anleitung.
 *
 * NICHT ROT, UND DAS IST DER UNTERSCHIED. Rot ist auf dieser Tafel schon
 * dreifach belegt — die fehlende Trikotkontrolle, die fehlende
 * Anstossfrage, die Abweisung. Stünde die Shot-Clock in derselben Farbe,
 * hiesse an einem Tisch mit offener Kontrolle zweimal dasselbe Rot zwei
 * ganz verschiedene Dinge, und der Schiedsrichter müsste lesen, statt zu
 * sehen. Gelb ist die Farbe, die im Billard ohnehin „Verwarnung" heisst,
 * und die Shot-Clock ist die leichteste Stufe davon.
 *
 * SIE VERDECKT DEN STAND NICHT. Sie liegt unten in der Leiste, in derselben
 * Zeile wie ihre Nachbarn, und nimmt sich nur die Höhe, die zwischen Namen
 * und Fußzeile ohnehin Luft war. Auffallen tut sie durch Farbe und Breite —
 * eine Fläche über der Tafel wäre für den Saal das Ende der Anzeige.
 *
 * SIE BLINKT NICHT. Dieselbe Entscheidung wie bei der Auszeit-Uhr in
 * Side.vue: was eine Viertelstunde stehen kann, darf nicht zucken.
 */
.shot-clock {
  display: flex;
  flex-direction: column;
  gap: 0.3dvh;
  padding: 0.8dvh 1.4dvh;
  border: 2px solid var(--shotclock, #ffc53d);
  border-left-width: 0.9dvh;
  border-radius: 0.8dvh;
  background: rgb(255 197 61 / 12%);
}

.shot-clock__kopf {
  margin: 0;
  font-size: min(2.6dvh, 2vw);
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--shotclock, #ffc53d);
}

/*
 * WAS ZU TUN IST, UND NICHT, WIE ES GEHT.
 *
 * "The referee has to acknowledge it" sagt dem, der davorsteht, wen er
 * holen muss. Die Geste steht hier NICHT — vor der Tafel stehen die
 * Spieler, und ein Satz, der den Griff verrät, wäre die Anleitung zum
 * Wegklicken. Denselben Wortlaut führt die Abweisung in useScoring, und
 * zwar mit Absicht: zweimal dieselbe Auskunft ist besser als zwei, die sich
 * leicht unterscheiden.
 */
.shot-clock__folge {
  margin: 0;
  font-size: min(2.2dvh, 1.7vw);
  color: var(--ink-dim);
}

/*
 * GILT SIEHT AUS WIE DER BALKEN, NUR OHNE GELB: der Dauerzustand ist der
 * Normalfall, und der Normalfall braucht den Blick nicht. Die Töne sind
 * `--line` und `--ink-dim`, dieselben, in denen schon die Seitenangabe und
 * die Folgezeile stehen.
 *
 * <p>VERWORFEN: Grün. Ein grüner Balken neben der roten Abweisungszeile
 * machte aus der Leiste eine Ampel und zöge den Blick auf den Normalfall.
 *
 * Bis zum 16.09.2026 stand hier daneben `.trikot--erledigt` in derselben
 * Machart; die Zeile "Uniform control done" ist gestrichen, diese hier
 * nicht — eine abgeschlossene Kontrolle braucht keine Meldung, eine
 * geltende Shot-Clock schon.
 *
 * Weg ist die Farbe, nicht die Zeile. Der Auftraggeber will, dass am Tisch
 * sichtbar BLEIBT, dass die Shot-Clock gilt — wer nach einer Auszeit
 * zurückkommt, soll es sehen, ohne zu fragen.
 */
.shot-clock--gilt {
  margin: 0;
  padding: 0.5dvh 1.4dvh;
  border-color: var(--line);
  background: none;
  color: var(--ink-dim);
  font-size: min(2.2dvh, 1.7vw);
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.leiste__fehler {
  margin: 0;
  padding: 0.8dvh 1.4dvh;
  border-radius: 0.8dvh;
  background: var(--color-danger, #ff5252);
  color: #2b0000;
  font-size: min(2.6dvh, 2vw);
  font-weight: 700;
  letter-spacing: 0.03em;
  text-align: center;
}

/*
 * DER VORHANG DER FERNBEDIENUNG
 *
 * Dieselbe Lage und derselbe Rahmen wie der Zifferblock darunter: für den
 * Bediener ist beides dasselbe — „die Tafel wartet auf mich".
 */
.spblock {
  position: fixed;
  right: 3.5vw;
  bottom: 3dvh;
  left: 3.5vw;
  display: flex;
  flex-direction: column;
  gap: 1.2dvh;
  padding: 2dvh;
  border: 2px solid var(--accent);
  border-radius: 1.2dvh;
  background: rgb(5 8 13 / 97%);
}

.spblock__kopf {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  margin: 0;
  font-size: min(3dvh, 2.4vw);
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.spblock__zahl {
  color: var(--accent);
  font-size: min(6dvh, 5vw);
  font-weight: 900;
  font-variant-numeric: tabular-nums;
}

/* Der Unterstrich blinkt, weil genau er die Frage ist: „und jetzt?" */
.spblock__strich {
  animation: spblink 1s steps(2, start) infinite;
}

@keyframes spblink {
  50% { opacity: 0.15; }
}

/*
 * Die möglichen Fortsetzungen. Sie fliessen und stehen nicht im Raster: es
 * sind zwischen zwei und sieben, je nach Lage am Tisch, und ein festes
 * Raster liesse dabei Löcher.
 */
.spblock__wahlen {
  display: flex;
  flex-wrap: wrap;
  gap: 1dvh 1.6vw;
}

.spblock__wahl {
  display: flex;
  align-items: center;
  gap: 0.8dvh;
  padding: 0.6dvh 1.2dvh;
  border: 2px solid var(--line);
  border-radius: 0.8dvh;
  background: #0b1220;
}

.spblock__taste {
  min-width: min(3.4dvh, 2.8vw);
  color: var(--accent);
  font-size: min(3dvh, 2.4vw);
  font-weight: 900;
  text-align: center;
}

.spblock__wort {
  font-size: min(2.4dvh, 1.9vw);
  font-weight: 700;
  letter-spacing: 0.04em;
}

.spblock__meldung {
  margin: 0;
  color: var(--color-danger, #ff5252);
  font-size: min(2.4dvh, 1.9vw);
  font-weight: 700;
  text-align: center;
}

.spblock__weg {
  align-self: center;
  padding: 0.6dvh 2dvh;
  border: 0;
  background: none;
  color: var(--ink-dim);
  font-family: inherit;
  font-size: min(2.4dvh, 2vw);
  text-transform: uppercase;
  cursor: pointer;
}

.spblock__weg-taste {
  opacity: 0.55;
}

/* Der Zifferblock */
.block {
  position: fixed;
  right: 3.5vw;
  bottom: 3dvh;
  left: 3.5vw;
  display: flex;
  flex-direction: column;
  gap: 1dvh;
  padding: 2dvh;
  border: 2px solid var(--accent);
  border-radius: 1.2dvh;
  /* Fast undurchsichtig und nicht ganz: der Stand darunter bleibt zu ahnen,
     und der Block sieht nicht aus wie eine andere Seite. */
  background: rgb(5 8 13 / 97%);
}

.block__kopf {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  margin: 0;
  font-size: min(3dvh, 2.4vw);
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.block__zahl {
  font-size: min(6dvh, 5vw);
  font-weight: 900;
  color: var(--accent);
}

.block__ziffern {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 1dvh;
}

.block__ziffer {
  min-height: max(8dvh, 58px);
  border: 2px solid var(--line);
  border-radius: 1dvh;
  background: #0b1220;
  color: var(--ink);
  font-family: inherit;
  font-size: min(4dvh, 3vw);
  font-weight: 700;
  cursor: pointer;
  touch-action: manipulation;
}

.block__ziffer--ok {
  border-color: var(--accent);
  background: var(--accent);
  color: #00222f;
}

/*
 * OK IST BLASS, SOLANGE DIE ZAHL ÜBER DER DISTANZ LIEGT. Dieselbe Sprache
 * wie auf den Zählflächen: was nicht geht, ist blass, und daneben steht der
 * Grund.
 */
.block__ziffer--ok:disabled {
  border-color: var(--line);
  background: none;
  color: var(--ink-dim);
  cursor: default;
}

.block__zuviel {
  margin: 0;
  color: var(--color-danger, #ff5252);
  font-size: min(2.4dvh, 1.9vw);
  font-weight: 700;
  text-align: center;
}

.block__weg {
  align-self: center;
  padding: 0.6dvh 2dvh;
  border: 0;
  background: none;
  color: var(--ink-dim);
  font-family: inherit;
  font-size: min(2.4dvh, 2vw);
  text-transform: uppercase;
  cursor: pointer;
}

/*
 * HOCHKANT UND AUF SCHMALEN GERÄTEN
 *
 * Die Mitte gibt ihre feste Breite auf: drei Spalten mit 26 vw dazwischen
 * lassen für die Flächen links und rechts zu wenig übrig, sobald der Schirm
 * schmaler als hoch ist. Die Tafel darüber behält ihr Raster — sie hat dort
 * nur Wappen, Nummer und Disziplin zu tragen, die Leiste dagegen Knöpfe.
 */
@media (max-aspect-ratio: 1 / 1) {
  .leiste__spalten {
    grid-template-columns: minmax(0, 1fr) minmax(0, 0.8fr) minmax(0, 1fr);
    gap: 0 1vw;
  }
}
</style>
