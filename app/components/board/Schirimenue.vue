<script setup lang="ts">
import type { Match, MatchEventPublic } from '~~/shared/types/api'
import type { Seite, Zaehlfehler, Zusatz } from '~/composables/useZaehlwerk'

/**
 * DAS SCHIEDSRICHTER-MENÜ — was am Tisch getan wird und nicht gezählt.
 *
 * WOFÜR ES DA IST
 *
 * Die Zählleiste macht das, was hundertmal am Tag vorkommt: ein Satz mehr,
 * ein Satz weniger, eine Auszeit, das Ende. Alles daneben kam bisher gar
 * nicht vor — der Schiedsrichter musste jemanden ins Turnierbüro schicken,
 * und bis dahin lief die Partie mit einer Auszeit, die keiner genommen
 * hatte. Was hier steht, ist genau diese zweite Liste: selten, aber dringend,
 * und jedes Stück davon gehört an den Tisch und nicht in ein Büro.
 *
 * WARUM ES EIN VORHANG IST UND KEINE WEITERE LEISTE
 *
 * Die Zählleiste legt sich mit Absicht NICHT über den Stand: sie wird
 * dauernd bedient, und der Saal schaut die ganze Zeit auf dasselbe Gerät.
 * Hier ist es umgekehrt. Was in diesem Menü steht — welche Verwarnung ein
 * Spieler hat, ob jemand aufgibt —, ist eine Sache zwischen Schiedsrichter
 * und Turnierleitung und geht die Zuschauer in der ersten Reihe nichts an.
 * Ein Vorhang, der nach dem Gebrauch wieder zugeht, trennt das besser als
 * jede kleine Ecke, die dauerhaft mitläuft: was niemand sieht, weil es nur
 * zwanzig Sekunden da war, bleibt ungesehen.
 *
 * Der STAND bleibt trotzdem oben stehen. Ein Halbfinale, dessen Tafel
 * schwarz wird, weil der Schiedsrichter etwas nachschlägt, ist für den Saal
 * ein Ausfall — und für den Schiedsrichter wäre es einer, denn er müsste das
 * Menü zumachen, um zu sehen, worüber er gerade entscheidet.
 *
 * VERWORFEN: ein zweiter Schirm für den Schiedsrichter. Er hat keinen; in
 * den Hallen steht ein Gerät je Tisch, und ein zweites zu verlangen heisst,
 * das Menü gibt es nicht.
 *
 * ES GEHT VON SELBST WIEDER ZU
 *
 * Nach einer halben Minute ohne Berührung. Ein Schiedsrichter, der mitten
 * im Menü an den Tisch gerufen wird, lässt es offen — und dann stünde eine
 * Verwarnungsliste eine Viertelstunde lang vor dem Publikum, und der Stand
 * wäre so lange klein. Die Uhr beginnt bei jeder Berührung von vorn.
 */
const props = defineProps<{
  partie: Match
  zusatz: Zusatz | null
  /** Welche Seite der Partie links auf dem Schirm steht — siehe Spiegel. */
  links: Seite
  rechts: Seite
  /** Wessen Auszeit gerade läuft — beide können. */
  auszeitLaeuft: { A: boolean, B: boolean }
  /**
   * Welche Zählweise am Tisch gilt — NUR für die Fernbedienungsübersicht.
   *
   * Sie ist je Zählweise eine andere (im Straight Pool sind die Ziffern die
   * Kugeln, die noch liegen), und eine Übersicht, die beide Belegungen
   * nebeneinander zeigte, liesse den Schiedsrichter die falsche lernen.
   */
  modus: 'RACK_RACE' | 'POINT_RACE' | 'STRAIGHT_POOL'
  /** Eine Eingabe ist unterwegs; die ganze Fläche sperrt sich so lange. */
  laeuft: boolean
  fehler: Zaehlfehler | null
  /**
   * Ob an diesem Schirm ein ausgewiesener MENSCH handelt.
   *
   * Entscheidet nur, ob die Rückfrage von sich aus nach sechs Ziffern fragt.
   * Wer sich ausgewiesen hat, ist ausgewiesen; ihn noch einmal zu fragen
   * wäre eine Hürde ohne Gewinn — und zwar für die Turnierleitung, die am
   * häufigsten hier steht. Die Prüfung selbst steht am Server: diese Angabe
   * ist eine Bedienhilfe und keine Sicherung.
   *
   * UND SEIT DEM 16.09.2026 IST SIE AUCH NUR NOCH EINE VERMUTUNG. Angemeldet
   * heisst nicht berechtigt: ein Konto, das zufällig im Browser offen liegt,
   * trägt an dieser Veranstaltung womöglich gar nichts. Verlangt der Server
   * daraufhin einen Code, kommt dieselbe Frage mit Ziffernfeld zurück — der
   * Watcher auf `BOARD_PIN_REQUIRED` weiter unten.
   *
   * SIE HIESS BIS ZUM 16.09.2026 `angemeldet` UND KAM AUS EINEM KEKS.
   * Die Tafel fragte, ob `bb_session` im Browser LIEGT — nicht, ob er noch
   * trägt. An einem Tablet mit einer abgelaufenen Anmeldung blieb die
   * Codeabfrage damit aus, die Bestätigung ging hinaus, und die Verwaltung
   * antwortete mit BOARD_PIN_REQUIRED: „aber er fragt keinen personal code
   * ab, und wenn ich das einfach bestätige, kommt fehlermeldung das ein
   * personal code nötig wäre". Jetzt sagt der Server, wie gehandelt wird
   * (`CurrentActor.via()` über `/board/grant/live`), und diese Angabe ist
   * seine Antwort — dieselbe, nach der er beim Schreiben selbst entscheidet.
   */
  alsMensch: boolean
  /**
   * WELCHE FASSUNG HIER LÄUFT — die ersten Stellen der Bau-Kennung.
   *
   * Sie steht hier für genau einen Vorgang: am Telefon wird gefragt „welche
   * Fassung hast du da?", und der Schiedsrichter am Tisch soll die Antwort
   * ABLESEN können statt sie zu suchen. Deshalb im Menü und nicht auf der
   * Tafel — auf der Tafel steht der Stand, und vor ihr sitzt das Publikum.
   *
   * Die ersten acht Stellen und nicht die ganze Kennung: sie ist eine UUID
   * mit 36 Zeichen, und acht davon unterscheiden am Telefon zuverlässig
   * zwei Bauvorgänge. Wer mehr braucht, liest die Adresszeile.
   */
  fassung: string
  /**
   * Eine neuere Fassung ist bekannt, und die Tafel wartet nur noch auf den
   * ruhigen Augenblick.
   *
   * Das steht dabei, weil sonst die Auskunft in die Irre führt: „ich habe
   * 3b3cb68a" ist die halbe Antwort, wenn das Gerät in Wahrheit gleich
   * lädt. Es ist KEINE Aufforderung — niemand soll hier etwas drücken, das
   * Laden geschieht von selbst, sobald die Partie vorbei ist.
   */
  fassungWartet: boolean
  /**
   * DIE ZEITLIMIT-UHR (HEYBALL), so wie die Tafel sie zeigt — Restzeit,
   * Überzug und ob sie GERADE läuft.
   *
   * `null` bedeutet: kein Zeitlimit an diesem Turnier, noch kein Anwurf oder
   * die Partie ist schon zu Ende — dieselbe Lesart wie bei den Auszeiten,
   * und aus demselben Grund kommt sie fertig gerechnet von der Tafel
   * ([eventId]/[table].vue, `zeitlimit`) statt hier ein zweites Mal aus dem
   * Abruf gezogen zu werden.
   */
  zeitlimit: { text: string, ueberzogen: boolean, running: boolean } | null
}>()

const emit = defineEmits<{
  schliessen: []
  tischwechsel: []
  auszeitZurueck: [seite: Seite, code: string]
  aufgabe: [seite: Seite, art: 'NO_SHOW' | 'FORFEIT', code: string]
  shotClock: []
  /** Heyball: die Zeitlimit-Uhr von Hand anhalten (false) oder fortsetzen (true). */
  zeitlimitLaufen: [laufend: boolean]
  /** Heyball: die Partie über das Zeitlimit beenden — Shoot-out-Sieger nur bei Gleichstand. */
  zeitlimitBeenden: [shootoutWinner?: Seite]
  /**
   * Ein Satz (Pool) bzw. Frame (Snooker) ist zu Ende, seit dem 25.09.2026.
   *
   * OHNE `winner`: Pool — die Verwaltung leitet den Satzgewinner aus dem
   * Stand gegen `setRaceTo` ab. MIT `winner`: Snooker — der Schiedsrichter
   * nennt den Gewinner, weil ein Frame an keiner Zahl endet.
   */
  satzAbschliessen: [winner?: Seite]
}>()

/**
 * Der Name auf einer Fläche — das letzte Wort, wie in der Zählleiste.
 *
 * Dieselbe Kürzung und nicht eine eigene: die beiden Flächen liegen
 * übereinander, und ein Spieler, der unten "Hjalmarström" heisst und hier
 * "L. Hjalmarström", sieht aus wie zwei verschiedene Leute.
 */
function kurzname(seite: Seite): string {
  const ganz = (seite === 'A' ? props.partie.sideA : props.partie.sideB).displayName.trim()
  const teile = ganz.split(/\s+/)
  return teile[teile.length - 1] ?? ganz
}

function langname(seite: Seite): string {
  return (seite === 'A' ? props.partie.sideA : props.partie.sideB).displayName
}

function punkte(seite: Seite): number {
  return (seite === 'A' ? props.partie.sideA : props.partie.sideB).score ?? 0
}

/* ------------------------------------------------------------------------
 * DIE SHOT-CLOCK
 *
 * HIER LIEGT DIE BESTÄTIGUNG, UND ZWAR ABSICHTLICH HIER.
 *
 * Die Vorgabe lautet: "das bestaetigen der shot-clock am tablet, sollte
 * nicht offensichtlich moeglich sein, ueber einen 'bestaetigen' button..
 * das sollte was sein, was moeglichst nur die schiri's kennen". Der Grund
 * liegt auf der Hand, sobald man am Tisch steht: dort stehen die SPIELER,
 * und die Shot-Clock ist eine Anordnung GEGEN einen von ihnen. Wer sie
 * wegklicken kann, klickt sie weg.
 *
 * ZWEI WEGE WAREN MÖGLICH, UND DAS IST DIE ABWÄGUNG:
 *
 *   (a) Die Bestätigung liegt IM Schiedsrichtermenü — hinter der Geste, die
 *       es ohnehin schon gibt: zwei Sekunden Druck auf den Rahmen
 *       (`druckAn` in board/[eventId]/[table].vue).
 *   (b) Eine EIGENE Geste an der Meldung selbst — langer Druck darauf,
 *       Wischen, zwei Finger.
 *
 * GENOMMEN IST (a). Drei Gründe, und der dritte gibt den Ausschlag:
 *
 *   1. KEIN ZWEITES GEHEIMNIS. Der Rahmengriff wird jedem Schiedsrichter
 *      bei der Akkreditierung gezeigt; er ist die Tür zu allem, was am
 *      Tisch selten und dringend ist. Die Shot-Clock gehört genau dorthin.
 *   2. DIE VERSCHLEIERUNG WIRD NICHT SCHWÄCHER. Für den Spieler, der
 *      danebensteht, ist der Griff undurchsichtig, egal ob er eine Sache
 *      verbirgt oder sechs.
 *   3. EINE GESTE, DIE NIEMAND SIEHT, FINDET AUCH EIN NEUER
 *      SCHIEDSRICHTER NICHT — und weil die unbestätigte Anordnung das
 *      Weiterzählen SPERRT, stünde die Partie so lange still. Im Menü steht
 *      die Bestätigung zwischen Dingen, die er ohnehin dort sucht. (b) wäre
 *      noch unauffälliger und hätte zusätzlich den Fehler, auf sich selbst
 *      zu zeigen: die Meldung ist das Element, an dem ein neugieriger
 *      Spieler zuerst herumdrückt, und ein langer Druck ist das erste, was
 *      jeder probiert.
 *
 * DAS IST VERSCHLEIERUNG UND KEINE SICHERHEIT, und so soll es hier auch
 * stehen bleiben. Ein Spieler, der drei Tage auf dem Turnier ist und dem
 * Schiedsrichter zusieht, kennt den Griff bald. Er leistet genau das, was
 * er leisten soll: das Bestätigen passiert nicht BEILÄUFIG und nicht aus
 * Versehen.
 *
 * KEIN PERSONENCODE, UND DAS IST EINE ENTSCHEIDUNG UND KEIN VERSEHEN.
 * Die sechs Ziffern sichern hier die Aufgabe, das Nichtantreten und die
 * Auszeit-Rücknahme — Vorgänge, die ein ERGEBNIS ändern. Das Bestätigen
 * ändert nichts; es gibt nur wieder frei. Mit Code stünde die Partie still,
 * bis jemand mit Code an den Tisch kommt, und das ist für eine
 * Kenntnisnahme der falsche Preis. Wer das hier nachträglich "härtet",
 * tauscht den Spielbetrieb gegen einen Schutz, den niemand gebraucht hat.
 * --------------------------------------------------------------------- */

/** Die angeordnete Shot-Clock, oder null. Zwei Zeitpunkte — es läuft keine Uhr. */
const shotClock = computed(() => props.zusatz?.shotClock ?? null)

/** Sie ist angeordnet und noch nicht zur Kenntnis genommen — die Partie steht. */
const shotClockOffen = computed(() =>
  shotClock.value !== null && shotClock.value.acknowledgedAt === null)

/**
 * Die Rückfrage vor der Bestätigung.
 *
 * <p>Eine Rückfrage und kein sofortiges Absenden, obwohl der Vorgang
 * harmlos ist: der Schiedsrichter soll lesen, WOFÜR er quittiert, bevor er
 * quittiert. "I have seen it" ist das Wort auf dem Knopf und nicht "OK" —
 * es sagt, was er tut, und es sagt auch, was er NICHT tut: zustimmen. Wer
 * die Anordnung für falsch hält, spricht mit der Turnierleitung; nur sie
 * kann aufheben.
 */
function shotClockFragen() {
  fragen({
    frage: 'Shot clock for this match',
    erklaerung: 'The tournament leadership has ordered the shot clock. '
      + 'Acknowledge that you have seen it — then the score goes on again. '
      + 'You keep the clock yourself at the table; nothing runs here.',
    wort: 'I have seen it',
    // KEIN Code — siehe die Begründung über diesem Abschnitt.
    code: false,
    tun: () => emit('shotClock'),
  })
}

/* ------------------------------------------------------------------------
 * DIE RÜCKFRAGE
 *
 * Jeder Punkt hier ist NICHT zurückzunehmen: eine Aufgabe beendet die Partie
 * und reicht sie im Baum weiter, ein Tischwechsel wirft den Schirm aus einer
 * laufenden Partie. Für sie steht zwischen Druck und Wirkung eine Frage —
 * dieselbe Bauart wie der Ziffernblock der Leiste, nur mit zwei Antworten.
 *
 * UND SEIT DEM 16.09.2026 TRÄGT JEDE DIESER FRAGEN AM FREIGESCHALTETEN
 * GERÄT DAS ZIFFERNFELD. Der Auftraggeber: "wenn der schiri ins menue geht
 * und dort dann eine der schiri aktionen ausfuehrt, sollte ein popup
 * kommen, was eine schiri pin abfragt". Die einzige Ausnahme ist die
 * Shot-Clock-Quittung — sie ändert nichts, sie gibt nur wieder frei, und
 * mit Code stünde die Partie still, bis jemand mit Code an den Tisch kommt.
 *
 * DIE AUSZEIT-RÜCKNAHME HAT SEIT DEM 15.09.2026 AUCH EINE, und das ist eine
 * Kehrtwende. Hier stand: sie brauche keine, weil sie selbst schon die
 * Rücknahme eines Fehltippers sei und wer sie versehentlich drücke, eine
 * Handbreit tiefer dasselbe umsonst bekomme. Beides galt, solange sie
 * dasselbe tat wie die Zählleiste. Sie tut es nicht mehr: sie schreibt das
 * Guthaben IMMER zurück, auch nach einer halben Minute, und kann damit
 * mehr als jede Fläche darunter.
 *
 * Damit ist die Frage keine dritte Berührung für einen Fehler mehr, sondern
 * der Träger des Personencodes — und der ist der eigentliche Grund: ein
 * Spieler, der den Weg ins Menü kennt, könnte sich sonst Auszeiten
 * nachlegen. Der Code ERSETZT auch hier den bestätigenden Knopf; wer
 * ausgewiesen ist, sieht die Frage ohne Ziffernfeld und ist mit einer
 * Berührung durch.
 * --------------------------------------------------------------------- */
interface Rueckfrage {
  frage: string
  erklaerung: string
  /** Was auf dem bestätigenden Knopf steht — nie „OK". */
  wort: string
  /**
   * Verlangt sechs Ziffern, die einem MENSCHEN gehören.
   *
   * IN der Rückfrage und nicht davor. Das ist die Entscheidung, um die es
   * hier geht: der Code ERSETZT den bestätigenden Knopf, er kommt nicht zu
   * ihm hinzu. No-Show und Forfeit hatten ohnehin schon eine Rückfrage, und
   * damit kostet die zweite Ebene keinen zusätzlichen Bedienschritt.
   *
   * VERWORFEN: ein Vorhang vor dem ganzen Menü. Dann müsste jemand sechs
   * Ziffern tippen, um den VERLAUF anzusehen — eine Auskunft, die niemanden
   * etwas angeht und die am Tisch dauernd gebraucht wird. Der Code gehört an
   * die Tat und nicht an die Tür.
   *
   * Seit dem 16.09.2026 trägt ihn auch der Tischwechsel. Er stand hier
   * lange als das zweite Beispiel für "geht keinen etwas an", und das war
   * zu kurz gedacht: er nimmt dem Saal die Tafel und dem Schiedsrichter die
   * Bedienung, mitten in einer Partie. Nur der Verlauf ist übrig — und der
   * ist das einzige Stück dieses Menüs, das wirklich nichts TUT.
   */
  code?: boolean
  tun: (code: string) => void
}

/*
 * DIE EIGENE ROTE ZEILE — für die zwei Anfragen, die dieses Menü SELBST
 * schickt.
 *
 * Die Karte und der Nachweis des Personencodes gehen nicht durch
 * `useZaehlwerk`; sie sind kein Stand, haben keinen Vorgriff und nichts
 * zurückzudrehen. Bis zum 16.09.2026 endeten beide in einem `catch`, das
 * bloss `kartenFehler` setzte — und diese Angabe wurde von keiner Zeile der
 * Vorlage gelesen. EINE FALSCHE PIN BEI EINER VERWARNUNG WAR DAMIT AM TISCH
 * NICHT ZU SEHEN: es passierte einfach nichts, und der Schiedsrichter tippte
 * noch einmal.
 *
 * `useAbweisung` ist dieselbe Uhr wie unten in der Leiste (fünfzehn
 * Sekunden, dann geht die Zeile von selbst) und derselbe Satzkatalog
 * (`BOARD_PIN_REJECTED` → "That code was not accepted. Nothing was
 * changed."). Zwei Uhren mit zwei Fristen wären zwei Antworten auf dieselbe
 * Frage.
 */
const eigen = useAbweisung()

/**
 * Was oben rot steht: die eigene Abweisung zuerst.
 *
 * Sie ist die jüngere von beiden — wer gerade im Menü getippt hat, soll die
 * Antwort auf DIESEN Druck lesen und nicht eine Auszeit-Meldung von vorhin,
 * die noch ihre Frist absitzt.
 */
const roteZeile = computed(() => eigen.fehler.value ?? props.fehler)

const rueckfrage = ref<Rueckfrage | null>(null)

/**
 * Die eingetippten Ziffern — nur solange die Frage offen ist.
 *
 * Sie stehen in einem `ref` und nicht im Formular, weil sie beim Schliessen
 * weg sein müssen: ein Code, der nach einer abgebrochenen Rückfrage im Feld
 * stehen bleibt, wird beim nächsten Mal mitgeschickt, ohne dass ihn jemand
 * eingetippt hat.
 */
const codeZiffern = ref('')

/**
 * Das Codefeld bekommt den Fokus, sobald die Abfrage aufgeht.
 *
 * BIS ZUM 25.09.2026 STAND HIER DAS GEGENTEIL, und die Begruendung war
 * nicht falsch: die Tafel steht neben einem laufenden Spiel, und eine
 * Tastatur, die von selbst aufgeht, nimmt den unteren Teil des Schirms --
 * dort, wo die Rueckfrage sitzt. Wer nur hinsehen will, soll nicht
 * wegtippen muessen.
 *
 * Der Auftraggeber hat anders entschieden, und im Betrieb gibt ihm der
 * Ablauf recht: Diese Abfrage kommt nie von selbst. Sie kommt, weil
 * jemand gerade eine Verwarnung, eine Disqualifikation oder eine andere
 * Handlung ausgeloest hat, die einen Ausweis verlangt -- er steht also
 * ohnehin am Geraet und will tippen. Ihn dann erst auf ein Feld zielen zu
 * lassen, kostet den Griff, den die Tastatur sparen sollte.
 *
 * `nextTick`, weil das Feld erst mit `rueckfrage.code` entsteht: ein
 * `focus()` im selben Durchgang traefe ein Element, das es noch nicht gibt.
 */
const codeFeld = ref<HTMLInputElement | null>(null)

watch(() => rueckfrage.value?.code === true, async (fragtNachCode) => {
  if (!fragtNachCode) return
  await nextTick()
  codeFeld.value?.focus()
})

const codeVollstaendig = computed(() => /^[0-9]{6}$/.test(codeZiffern.value))

/**
 * Die zuletzt bestätigte Frage — der Rückweg, wenn der Server einen Code
 * verlangt.
 *
 * Sie überlebt das Schliessen mit Absicht: `jaSagen` macht die Frage zu,
 * BEVOR sie ausgeführt wird, und die Antwort des Servers kommt erst danach.
 * Ohne diese Kopie wäre in dem Augenblick, in dem „Code nötig" hereinkommt,
 * nichts mehr da, was man wieder aufschlagen könnte.
 *
 * Die ZIFFERN stehen ausdrücklich NICHT darin. Sie werden bei jedem
 * Aufschlagen geleert; eine Frage, die mit einem alten Code im Feld
 * wiederkommt, schickte ihn beim nächsten Druck mit, ohne dass ihn jemand
 * eingetippt hat.
 */
const letzteFrage = ref<Rueckfrage | null>(null)

function fragen(f: Rueckfrage) {
  codeZiffern.value = ''
  rueckfrage.value = f
}

function frageSchliessen() {
  codeZiffern.value = ''
  rueckfrage.value = null
}

function jaSagen() {
  const f = rueckfrage.value
  if (f?.code && !codeVollstaendig.value) return
  const ziffern = codeZiffern.value
  frageSchliessen()
  letzteFrage.value = f ?? null
  f?.tun(ziffern)
}

/* ------------------------------------------------------------------------
 * WENN DER SERVER DEN CODE VERLANGT, DEN NIEMAND ANGEBOTEN HAT
 *
 * `code: !alsMensch` ist eine VERMUTUNG und keine Prüfung — das steht so
 * auch an den Aufrufstellen. Sie war bis zum 16.09.2026 die einzige
 * Entscheidung darüber, ob das Ziffernfeld erscheint, und sie geht in einem
 * Fall daneben, der am Tisch alles andere als selten ist: jemand ist am
 * Gerät ANGEMELDET (`alsMensch` ist wahr, das Feld bleibt weg), trägt aber
 * an dieser Veranstaltung kein Recht. Bis heute endete das in einer 403 und
 * der Satz darunter log — „This account may not score at this event" — und
 * der Schiedsrichter stand mit seinen sechs Ziffern daneben, ohne dass ihn
 * jemand danach fragte.
 *
 * Der Server fragt jetzt danach (`BOARD_PIN_REQUIRED` statt 403, siehe
 * `CardController.ausweisen` und `MatchController.nochOhneAusweis`). Diese
 * Stelle ist die Antwort der Tafel darauf: DIESELBE Frage kommt wieder,
 * diesmal mit dem Ziffernfeld. Der Schiedsrichter entscheidet nicht zweimal
 * — er sieht seinen eigenen Satz („Kudlik did not show up?") noch einmal und
 * ergänzt, was fehlte.
 *
 * VERWORFEN: vor JEDER Tat nach dem Code zu fragen und `alsMensch` ganz
 * fallen zu lassen. Dann tippte die Turnierleitung, die ihr Recht trägt,
 * sechs Ziffern für etwas, das sie ohne sie darf — und zwar jedes Mal.
 *
 * VERWORFEN: das Ziffernfeld vorab beim Server zu erfragen. Das wäre ein
 * Umlauf mehr beim Aufschlagen des Menüs, für eine Auskunft, die genau dann
 * gebraucht wird, wenn sie ohnehin schon unterwegs ist.
 * --------------------------------------------------------------------- */
watch(() => roteZeile.value?.schluessel, (schluessel) => {
  if (schluessel !== 'BOARD_PIN_REQUIRED') return
  const f = letzteFrage.value
  // Nur, wenn gerade nichts offen ist: eine Frage, die dem Schiedsrichter
  // unter der Hand ausgetauscht wird, ist schlimmer als gar keine.
  if (!f || rueckfrage.value) return
  fragen({ ...f, code: true })
})

/* ------------------------------------------------------------------------
 * DIE PUNKTE DES MENÜS
 * --------------------------------------------------------------------- */

/**
 * Was auf der Auszeit-Fläche steht — und ob sie überhaupt etwas kann.
 *
 * ZURÜCKGENOMMEN WIRD DIE LAUFENDE UND NUR SIE. Die laufende Uhr ist der
 * Beleg, dass `competition.take_timeout` das Guthaben eben belastet hat;
 * ohne sie wäre die Gutschrift geschenkt, und der Vorgang liesse sich
 * wiederholen, bis ein Spieler mehr Auszeiten hat als das Turnier vorsieht.
 *
 * DIE ZEHN SEKUNDEN GELTEN HIER NICHT MEHR — seit dem 15.09.2026, und das
 * ist die Umkehrung dessen, was an dieser Stelle stand.
 *
 * Hier stand: eine Auszeit, die seit drei Minuten läuft, SEI genommen
 * worden, und sie zurückzugeben sei eine Regelentscheidung und keine
 * Rücknahme. Das beantwortet aber die falsche Frage. Es geht nicht darum,
 * ob der Spieler draussen war, sondern darum, WER draussen war: der
 * Auftraggeber meint den Fall "die falsche Seite hat die Auszeit bekommen",
 * und der fällt beim Blick auf die Tafel oft erst nach einer halben Minute
 * auf — die Uhr läuft ja, sie läuft nur beim Falschen. Zehn Sekunden sind
 * die Frist für den Griff auf die falsche Fläche AN DER LEISTE, wo derselbe
 * Mensch sofort hinsieht; dort bleiben sie unverändert
 * (`competition.end_timeout`).
 *
 * Dieser Punkt geht deshalb über `competition.withdraw_timeout` und
 * schreibt immer gut. Bezahlt wird das mit dem Personencode — siehe die
 * Rückfrage oben.
 *
 * WAS DAS MENÜ AUSSERDEM TUT: es macht die Rücknahme überhaupt erst
 * FINDBAR. Bis hierher war sie ein Nebeneffekt der Auszeit-Fläche ("nochmal
 * tippen, dann ist sie weg"), und niemand, der sie brauchte, wusste das.
 */
function auszeitPunkt(seite: Seite) {
  const laeuftJetzt = props.auszeitLaeuft[seite]
  const genommen = props.zusatz?.timeoutsTaken?.[seite] ?? 0
  return {
    moeglich: laeuftJetzt,
    hinweis: laeuftJetzt
      ? 'gives the time-out back to the player'
      : genommen === 0
        ? 'no time-out taken'
        : 'only while it is running',
  }
}

/**
 * Die Rückfrage vor der Rücknahme — der Träger des Personencodes.
 *
 * Sie sagt ausdrücklich, was zurückkommt ("gets the time-out back"), weil
 * genau das der Punkt der Änderung ist: bis zum 15.09.2026 hat dieser Weg
 * die Auszeit nach zehn Sekunden nur noch BEENDET, und der Schiedsrichter
 * konnte am Bildschirm nicht sehen, dass ihm das Guthaben durch die Lappen
 * ging.
 */
function auszeitZurueckFragen(seite: Seite) {
  fragen({
    frage: `Take back ${kurzname(seite)}'s time-out?`,
    erklaerung: `The clock stops and ${langname(seite)} gets the time-out `
      + 'back — it will not count as taken. Use this when the wrong side got it.',
    wort: 'Take it back',
    // Dieselbe Regel wie bei der Aufgabe: nur am freigeschalteten Gerät.
    // Wer über eine tragende Sitzung handelt, hat sich ausgewiesen.
    code: !props.alsMensch,
    tun: (code: string) => emit('auszeitZurueck', seite, code),
  })
}

/**
 * NO SHOW ODER AUFGABE — zwei verschiedene Dinge, und der Bestand hat drei
 * Felder dafür (`competition.match_slot.walkover`, `.forfeit`,
 * `.disqualified`).
 *
 * Benannt ist hier nach dem, was der Schiedsrichter am Tisch SIEHT, und
 * nicht nach der Spalte:
 *
 *   "Did not show up"  Der Stuhl ist leer. Die Partie hat nie begonnen, es
 *                      gibt keinen Stand, der Gegner bekommt sie ohne einen
 *                      Stoss. Das ist der walkover des Bestands — die Spalte
 *                      heisst so, weil sie beim GEWINNER sitzt ("er ist
 *                      durchgegangen"); am Tisch fehlt aber der andere, und
 *                      danach wird gefragt.
 *   "Gives up"         Es wird gespielt, und einer hört auf: Verletzung,
 *                      Abreise, Aufgabe. Es gibt einen Stand, und der bleibt
 *                      stehen. Das ist forfeit.
 *
 * DISQUALIFIKATION STEHT NICHT HIER. Sie ist die Folge einer Verwarnung
 * (schwarze Karte) und damit eine Entscheidung der Turnierleitung — ein
 * Schiedsrichter meldet den Vorfall, disqualifiziert aber niemanden vom
 * Tablet aus. Die Spalte bleibt, der Knopf kommt nicht.
 *
 * WELCHER DER BEIDEN GEHT, entscheidet die Partie und nicht der
 * Schiedsrichter. Zwei Knöpfe, von denen einer immer falsch ist, sind eine
 * Falle — diese Regel bleibt, und deshalb steht hier weiterhin genau eine
 * Fassung. Geändert hat sich, WORAN sie hängt.
 *
 * SIE HING BIS ZUM 16.09.2026 AM STATUS, UND DAS WAR FALSCH. Eine Partie
 * galt als begonnen, sobald sie RUNNING war — auch bei 0:0. Der Ablauf am
 * Tisch ist aber immer derselbe: der Schiedsrichter stellt den Anstoss (die
 * Partie geht damit auf RUNNING), und ERST DANN stellt er fest, dass einer
 * gar nicht kommt. Angeboten wurde ihm da nur noch „gives up", und das
 * buchte ein FORFEIT mit dem Stand 0–0. Der Hinweis lautete wörtlich
 * „JASTRZAB WINS 0–0" — ein Satz über eine Partie, in der kein Ball
 * gefallen ist. In der Ergebnisliste stand danach `FF`, wo `w/o` hingehört.
 * Der Auftraggeber: „wenn ein spieler nicht zum match erscheint, wird die
 * partie für den anderen gewertet".
 *
 * JETZT ENTSCHEIDET DER STAND, UND NUR ER. Steht 0:0, ist nichts geschehen,
 * das stehenbleiben könnte: kein Satz, kein Ergebnis, nichts, was der Gegner
 * erspielt hätte. Genau das ist der Walkover. Sobald EIN Satz gefallen ist,
 * gibt es einen Stand — und der bleibt stehen, das ist der Forfeit.
 *
 * VERWORFEN: den VERLAUF zu fragen (`SCORE`, `FOUL`, `PENALTY_RACK` belegen
 * Spielgeschehen, `STARTED` belegt nur den vergebenen Anstoss). Das wäre die
 * genauere Auskunft und ist hier trotzdem das schlechtere Mass: der Verlauf
 * wird beim Öffnen des Menüs erst geholt, er kann noch unterwegs sein und er
 * kann ausbleiben (`verlaufFehler`). Eine Beschriftung, die eine Sekunde
 * nach dem Aufschlagen von „did not show up" auf „gives up" umspringt oder
 * bei schlechtem WLAN etwas anderes sagt als bei gutem, ist genau die Falle,
 * die dieser Absatz verhindern soll. Der Stand liegt immer vor und ändert
 * sich nur, wenn jemand ihn ändert.
 *
 * WAS DAS KOSTET: der Spieler, der antritt, anstösst und noch vor dem ersten
 * Satz aufgibt — Verletzung in der ersten Aufnahme —, wird als Walkover
 * gebucht und nicht als Aufgabe. Das ist selten (beide Seiten müssen bei
 * null stehen, die Partie ist also höchstens ein paar Minuten alt) und in
 * der Sache eine kleine Ungenauigkeit: es gibt in beiden Fällen keinen
 * Stand. Die Turnierleitung kann die Art im Büro richtigstellen. Der Fehler
 * in der anderen Richtung — ein echtes Nichterscheinen als Aufgabe mit
 * „0–0" — steht dagegen in jeder Ergebnisliste und ist der gemeldete.
 */
const angefangen = computed(() =>
  (props.partie.sideA.score ?? 0) > 0
  || (props.partie.sideB.score ?? 0) > 0)

const aufgabeArt = computed<'NO_SHOW' | 'FORFEIT'>(() =>
  angefangen.value ? 'FORFEIT' : 'NO_SHOW')

function aufgabeWort(seite: Seite): string {
  return aufgabeArt.value === 'NO_SHOW'
    ? `${kurzname(seite)} did not show up`
    : `${kurzname(seite)} gives up`
}

function aufgabeHinweis(seite: Seite): string {
  const gegner = seite === props.links ? props.rechts : props.links
  return aufgabeArt.value === 'NO_SHOW'
    ? `${kurzname(gegner)} walks over · no score`
    : `${kurzname(gegner)} wins ${punkte(gegner)}–${punkte(seite)}`
}

function aufgabeFragen(seite: Seite) {
  const gegner = seite === props.links ? props.rechts : props.links
  fragen({
    frage: aufgabeWort(seite) + '?',
    erklaerung: aufgabeArt.value === 'NO_SHOW'
      ? `${langname(gegner)} takes the match without playing. `
        + 'This ends the match and moves the bracket on.'
      : `${langname(gegner)} wins ${punkte(gegner)}–${punkte(seite)}. `
        + 'This ends the match and moves the bracket on.',
    wort: aufgabeArt.value === 'NO_SHOW' ? 'No show' : 'Give up',
    /*
     * Nur am freigeschalteten Gerät. Wer ANGEMELDET ist, hat sich schon
     * ausgewiesen — ihn ein zweites Mal danach zu fragen wäre eine Hürde
     * ohne Gewinn, und zwar genau für die Turnierleitung, die am häufigsten
     * hier steht. Geprüft wird es ohnehin am Server; dies ist nur die
     * Frage, ob das Feld erscheint.
     */
    code: !props.alsMensch,
    tun: (code: string) => emit('aufgabe', seite, aufgabeArt.value, code),
  })
}

/* ------------------------------------------------------------------------
 * DAS ZEITLIMIT (HEYBALL) — "race to 7 ODER 100 Minuten, was zuerst
 * eintritt".
 *
 * ZWEI GETRENNTE DINGE, UND BEIDE STEHEN HIER UND NICHT AN DER ZÄHLLEISTE:
 *
 *   1. Die Uhr anhalten/fortsetzen — der Griff des Schiedsrichters zwischen
 *      zwei Racks (siehe Kopf der Datei, aus der das Zeitlimit stammt:
 *      "der schiri, haelt die uhr immer an, wenn neu aufgebaut wird.. also
 *      zwischen den racks quasi"). Er ist HÄUFIG und GENAU DESHALB hier und
 *      nicht in einem Vorhang, der sich schon nach einer halben Minute ohne
 *      Berührung wieder schliesst — der Schiedsrichter braucht ihn nach
 *      praktisch jedem Rack.
 *   2. Die Partie über die Uhr beenden — SELTEN, genau EINMAL je Partie,
 *      und bei einem Gleichstand eine Entscheidung, die nur er treffen
 *      kann (den Shoot-out-Sieger). Das ist dieselbe Art Vorgang wie
 *      "A player stops" darüber: endgültig, verlangt eine Rückfrage, und
 *      gehört deshalb ins Menü und nicht auf die Zählleiste, die dauernd
 *      bedient wird und über die auch die Zuschauer mitsehen.
 *
 * KEIN PERSONENCODE BEI BEIDEN. `MatchController.setTimeLimitRunning` und
 * `.confirmTimeLimit` verlangen keinen (anders als Aufgabe und
 * Auszeit-Rücknahme) — das Anhalten/Fortsetzen ist vollständig umkehrbar
 * wie das Zählen selbst, und das Bestätigen des Zeitlimits ist dieselbe
 * Bestätigung dessen, was ohnehin auf der Tafel steht, wie bei
 * `confirm.post.ts` (die Spieler dürfen das Erreichen von race_to selbst
 * bestätigen). Nur WER den Shoot-out gewonnen hat, ist eine Angabe, die die
 * Tafel nicht kennt — deshalb die Rückfrage, aber ohne Ziffernfeld.
 * --------------------------------------------------------------------- */

/** Der Stand, den DIESES Menü sieht — derselbe wie oben in der Kopfzeile. */
const zeitlimitUnentschieden = computed(() => punkte('A') === punkte('B'))

const zeitlimitFuehrend = computed<Seite>(() => (punkte('A') >= punkte('B') ? 'A' : 'B'))

/**
 * Anhalten oder fortsetzen — OHNE RÜCKFRAGE.
 *
 * Anders als Aufgabe und Tischwechsel ist das hier vollständig umkehrbar:
 * ein Druck auf die falsche Fläche kostet nichts als einen zweiten Druck.
 * Eine Rückfrage bei jedem Neuaufbau wäre die Bremse, die der
 * Schiedsrichter am wenigsten braucht — er soll die Uhr in der Zeit
 * fortsetzen, die der Gegner braucht, um an den Tisch zurückzukommen.
 */
function zeitlimitLaufenSchalten() {
  emit('zeitlimitLaufen', !(props.zeitlimit?.running ?? false))
}

/**
 * Die Partie über das Zeitlimit beenden — kein Gleichstand, also gewinnt
 * die führende Seite von selbst.
 *
 * OHNE SHOOT-OUT-SIEGER IM AUFRUF, aus demselben Grund wie bei
 * `aufgabeFragen`: was diese Fläche nicht anbietet, muss der Server nicht
 * abweisen. Steht es doch gleich — die Tafel und die Datenbank könnten
 * durch eine verspätete Satzwertung kurz auseinanderlaufen —, sagt
 * `SHOOTOUT_WINNER_REQUIRED` das, und die rote Zeile erklärt, was zu tun
 * ist.
 */
function zeitlimitBeendenFragen() {
  const sieger = zeitlimitFuehrend.value
  fragen({
    frage: 'Time limit reached — finish the match?',
    erklaerung: `${langname(sieger)} leads ${punkte(sieger)}–${punkte(sieger === 'A' ? 'B' : 'A')} `
      + 'and wins on the clock. This ends the match and moves the bracket on.',
    wort: 'Finish',
    code: false,
    tun: () => emit('zeitlimitBeenden'),
  })
}

/**
 * Die Partie über das Zeitlimit beenden — Gleichstand, also entscheidet
 * der Shoot-out, den die beiden am Tisch schon gespielt haben.
 *
 * ZWEI FLÄCHEN, EINE JE SEITE — dieselbe Bauart wie bei der Aufgabe: zwei
 * Knöpfe, von denen einer immer falsch ist, sind eine Falle, aber hier gibt
 * es keine dritte Möglichkeit, die eine einzelne Fläche anbieten könnte.
 * Welche Seite gewonnen hat, weiss nur der Schiedsrichter — die Tafel führt
 * darüber kein Feld, denn der Shoot-out selbst läuft nicht über
 * `match_slot.score` (siehe `competition.confirm_match_time_limit`).
 */
function zeitlimitShootoutFragen(seite: Seite) {
  fragen({
    frage: `${kurzname(seite)} wins the shoot-out?`,
    erklaerung: `The time limit found the match tied at ${punkte('A')}–${punkte('B')}. `
      + `${langname(seite)} wins the shoot-out and the match — this moves the bracket on.`,
    wort: 'Finish',
    code: false,
    tun: () => emit('zeitlimitBeenden', seite),
  })
}

/* ------------------------------------------------------------------------
 * SATZ ABSCHLIESSEN (POOL) BZW. FRAME ABSCHLIESSEN (SNOOKER)
 *
 * SEIT DEM 25.09.2026, UND EIN EINTRAG MIT ZWEI GESICHTERN.
 *
 * `Match.setRaceTo`/`Match.discipline.scoringKind` sagen, welches der
 * beiden hier gilt — dieselbe Auskunft, die schon die Satzanzeige auf der
 * Tafel liest (`[table].vue`, `satzanzeige`), und nicht ein zweites Mal
 * geraten.
 *
 *   POOL     "best of 5, je race to 5". `setRaceTo` ist gesetzt, und die
 *            Verwaltung leitet den Satzgewinner selbst aus dem Stand ab
 *            (`competition.confirm_set_result` OHNE `p_winner`) — genau wie
 *            beim Beenden der ganzen Partie (`confirm.post.ts`) wird hier
 *            NICHTS behauptet, das sich fälschen liesse. Anklickbar erst,
 *            wenn eine Seite die Distanz erreicht hat: vorher liefe der
 *            Aufruf gegen SET_RACE_NOT_REACHED, und ein Knopf, der das
 *            immer zuerst versucht, ist die schlechtere Auskunft als einer,
 *            der bis dahin gesperrt bleibt.
 *   SNOOKER  Ein Frame endet nicht an einer Zahl, sondern wenn keine Bälle
 *            mehr liegen und der Rückstand uneinholbar ist — `setRaceTo`
 *            bleibt dafür immer `null`. Nur der Mensch am Tisch weiss, wer
 *            gewonnen hat, und er sagt es ausdrücklich: zwei Flächen, eine
 *            je Seite, dieselbe Bauart wie beim Shoot-out des Zeitlimits
 *            weiter oben.
 *
 * OHNE PERSONENCODE, wie `confirm.post.ts`/`confirm-time-limit.post.ts` und
 * aus demselben Grund: beide bestätigen nur, was ohnehin auf der Tafel
 * steht (Pool) bzw. was am Tisch gerade jeder sieht (Snooker) — das ändert
 * kein Ergebnis, das ein Unbefugter sich selbst schreiben könnte, wie es
 * bei Aufgabe und Nichtantreten der Fall wäre.
 */
const satzModus = computed<'POOL' | 'SNOOKER' | null>(() => {
  if (props.partie.discipline.scoringKind === 'FRAME_RACE') return 'SNOOKER'
  if (props.partie.setRaceTo !== null) return 'POOL'
  return null
})

/** Pool: hat eine Seite die Distanz DIESES Satzes erreicht? */
const satzErreicht = computed(() => {
  const distanz = props.partie.setRaceTo ?? 0
  if (distanz <= 0) return false
  return (props.partie.sideA.setScore ?? 0) >= distanz
    || (props.partie.sideB.setScore ?? 0) >= distanz
})

function satzFragen(winner?: Seite) {
  const istSnooker = satzModus.value === 'SNOOKER'
  fragen({
    frage: istSnooker ? `Confirm frame — ${kurzname(winner!)} wins?` : 'Confirm this set?',
    erklaerung: istSnooker
      ? `${langname(winner!)} takes this frame. The next frame starts at 0:0.`
      : 'The set race has been reached. The winner is taken from the score '
        + 'shown on the board — the next set starts at 0:0.',
    wort: istSnooker ? 'Confirm frame' : 'Confirm set',
    // Kein Code — siehe die Begründung über diesem Abschnitt.
    code: false,
    tun: () => emit('satzAbschliessen', winner),
  })
}

/* ------------------------------------------------------------------------
 * DIE FERNBEDIENUNG — DIE ÜBERSICHT ZUM NACHSEHEN
 *
 * Auf den Flächen der Zählleiste steht jede Taste schon in der Ecke; wer das
 * Tablet bedient, lernt die Fernbedienung dabei nebenbei. Hier steht sie NOCH
 * EINMAL AM STÜCK, und zwar für zwei Fälle, die es auf den Flächen nicht
 * gibt: für den, der gar kein Tablet vor sich hat (Fernseher an der Wand,
 * Fernbedienung in der Hand), und für die Griffe, die überhaupt keine Fläche
 * haben — das Menü selbst (0 0), die Shot-Clock (R), die Anstossfrage und den
 * Abbruch einer angefangenen Eingabe (/).
 *
 * SIE MUSS MITWANDERN. Eine Übersicht, die eine alte Belegung zeigt, ist
 * schlimmer als keine: sie wird geglaubt. Wer unten in der Zählleiste eine
 * Taste ändert, ändert sie hier mit.
 * --------------------------------------------------------------------- */

/**
 * Die Belegung der laufenden Zählweise, als Paare aus Taste und Wirkung.
 *
 * Englisch wie alles Sichtbare. Die Reihenfolge ist die der Häufigkeit am
 * Tisch und nicht die des Zifferblocks — gesucht wird hier nach dem Vorgang
 * und nicht nach der Taste.
 */
const belegung = computed<{ taste: string, was: string }[]>(() => {
  if (props.modus === 'STRAIGHT_POOL') {
    return [
      { taste: '2 … 9', was: 'Balls left after the miss' },
      { taste: '1 then 0 … 5', was: 'Balls left: 10 … 15' },
      { taste: '1 then ⏎', was: 'Balls left: 1 — only while 10 or more are up' },
      { taste: '+', was: 'Rack · break ball left' },
      { taste: '−', was: 'Safety' },
      { taste: '.', was: 'Foul' },
      { taste: '*', was: 'Undo the last entry' },
      { taste: '/', was: 'More — and cancels anything half typed' },
      { taste: '/ 1', was: 'Rack · 15th down' },
      { taste: '/ 2', was: 'Break foul · again' },
      { taste: '/ 3', was: 'Break foul · accept' },
      { taste: '/ 4', was: `Time out ${kurzname('A')}` },
      { taste: '/ 5', was: 'Switch the table — or finish the match' },
      { taste: '/ 6', was: `Time out ${kurzname('B')}` },
      { taste: '1 · 3', was: 'Before the break only: who breaks first' },
      { taste: 'R', was: 'Acknowledge the shot clock' },
      { taste: '0 0', was: 'This menu · 0 closes it' },
    ]
  }
  const punkt = props.modus === 'POINT_RACE'
  return [
    { taste: '7 · 9', was: punkt ? `One point for ${kurzname('A')} · ${kurzname('B')}` : `One rack for ${kurzname('A')} · ${kurzname('B')}` },
    { taste: '1 · 3', was: punkt ? 'Take one point back' : 'Take one rack back' },
    /*
     * + UND − STEHEN NUR IN DER PUNKTFASSUNG — UND SEIT DEM 16.09.2026
     * STIMMT DAS AUCH.
     *
     * Bis dahin war es eine Lücke: die Übersicht nannte sie nur hier, die
     * Tafel öffnete den Zifferblock aber in BEIDEN Nicht-Straight-Pool-
     * Fassungen. In der Satzwertung trug `3` `7` OK damit siebenunddreissig
     * SÄTZE ein, und dafür gibt es dort weder eine Fläche noch eine Grenze.
     *
     * Aufgelöst wurde es auf der Seite der Tafel und nicht auf der dieser
     * Liste: der Zifferblock ist in der Satzwertung geschlossen worden
     * (`case '+'` in board/[eventId]/[table].vue, zweite Sperre in
     * `blockOeffnen` in Zaehlleiste.vue). Diese Zeile bleibt deshalb, wie
     * sie war — sie war die richtige Hälfte.
     */
    ...(punkt ? [{ taste: '+ · −', was: 'A whole run — type it in' }] : []),
    { taste: '4 · 6', was: `Time out ${kurzname('A')} · ${kurzname('B')}` },
    { taste: '5', was: punkt ? 'End of turn — or finish the match' : 'Finish the match' },
    { taste: '*', was: 'Undo the last entry' },
    { taste: '1 · 3', was: 'Before the break only: who breaks first' },
    { taste: 'R', was: 'Acknowledge the shot clock' },
    { taste: '0 0', was: 'This menu · 0 closes it' },
  ]
})

/* ------------------------------------------------------------------------
 * DIE VERWARNUNGEN — § 9.1 DER SPORTORDNUNG
 *
 * VIER FARBEN, UND DER SCHIEDSRICHTER WÄHLT KEINE DAVON.
 *
 * Er wählt, WAS passiert ist, und die Farbe folgt aus der Sportordnung:
 * § 9.1.1 zählt die grünen Anlässe auf, § 9.1.2 die gelben, § 9.1.3 die
 * roten. Das ist nicht bloss bequemer — es ist der einzige Weg, auf dem die
 * Liste am Tisch dieselbe bleibt wie im Regelwerk. Wer erst eine Farbe und
 * dann einen Grund wählte, könnte "Mobiltelefon" mit Rot verbinden, und
 * damit stünde in der Datenbank eine Entscheidung, die § 9.1 nicht deckt.
 *
 * DIE FOLGE STEHT NICHT HIER. Ob aus dieser Karte ein Rack für den Gegner
 * wird oder das Ende der Partie, entscheidet der STAND und nicht die Farbe
 * — das zweite Grün macht Gelb, und Gelb kostet ein Rack. Gerechnet wird das
 * in `competition.issue_card`; das Menü zeigt hinterher nur den neuen Stand.
 *
 * SCHWARZ FEHLT MIT ABSICHT. Die Fussnote des § 9.1 behält sie dem
 * Turnierleiter und dem Sportdirektor vor. Steht ein Spieler auf SCHWARZ,
 * erscheint hier ein Satz und kein Knopf: entschieden wird das nicht am
 * Tisch.
 */
interface Kartenanlass {
  code: string
  text: string
  karte: 'GREEN' | 'YELLOW' | 'RED'
}

/**
 * DIE NOTFALLLISTE — und nur die.
 *
 * Die Anlässe kommen seit dem 16.09.2026 vom Server: sie stehen in
 * `sport.card_reason`, der Betreiber pflegt sie in der Verwaltung, und sie
 * fahren im selben Aufruf mit wie der Kartenstand (`/api/board/matches/…/
 * cards`). Ändert der Verband seine Sportordnung, ist das eine Zeile in einer
 * Maske und kein Deploy dieser Webseite mehr.
 *
 * WAS PASSIERT, WENN DIE LISTE NICHT KOMMT — die Entscheidung, um die es
 * hier geht.
 *
 * Kommt der Aufruf gar nicht durch, ist der ganze Block "Warnings" leer: ohne
 * Stand keine Karte, und daran ändert auch ein Katalog nichts. Der Fall, für
 * den diese Konstante da ist, ist der andere: die Antwort kommt, aber die
 * Liste darin ist leer — ein Server, der die Neuerung noch nicht kennt, ein
 * Katalog, den jemand versehentlich stillgelegt hat. Dann nimmt die Tafel
 * diese hier.
 *
 * VERWORFEN: in dem Fall gar keine Auswahl anzubieten. Das wäre die reinere
 * Lösung und die falsche — am Tisch steht ein Schiedsrichter, vor ihm ein
 * Spieler, der gerade geraucht hat, und die Antwort "der Katalog ist leer"
 * hilft keinem von beiden. Eine Karte MUSS am Tisch gegeben werden können.
 *
 * Der Preis ist benannt: ein hier eingebauter Anlass könnte inzwischen
 * stillgelegt sein. Das ist verkraftbar, weil in `sport.card_reason` nie
 * gelöscht wird — der Code bleibt auflösbar, die Akte bleibt lesbar, und
 * `competition.issue_card` schreibt den Wortlaut ohnehin mit. Eine Karte aus
 * der Notfallliste ist damit schlimmstenfalls nach einer Regel gegeben, die
 * seit kurzem anders heisst; die Alternative wäre gar keine Karte.
 *
 * Wörtlich aus § 9.1.1 bis § 9.1.3, gekürzt auf das, was auf eine Fläche
 * passt, aber nicht umgedeutet — dieselben fünfzehn Zeilen, die auch in
 * `V2__die_stammdaten.sql` stehen.
 */
const NOTFALLLISTE: Kartenanlass[] = [
  { code: 'TIMEOUT_NOT_ANNOUNCED', text: 'Time-out without telling the referee', karte: 'GREEN' },
  { code: 'DEVICE_VISIBLE', text: 'Phone or device visible', karte: 'GREEN' },
  { code: 'RACK_INSPECTED', text: 'Inspecting or touching the rack', karte: 'GREEN' },
  { code: 'EQUIPMENT_MISUSE', text: 'Misuse of equipment', karte: 'GREEN' },
  { code: 'PATTERN_RACKING', text: 'Pattern racking', karte: 'GREEN' },
  { code: 'TIMEOUT_LATE', text: 'Late back from the time-out', karte: 'YELLOW' },
  { code: 'TIMEOUT_PRACTICE', text: 'Practising during the time-out', karte: 'YELLOW' },
  { code: 'RACK_TOUCHED', text: 'Touching the rack that was racked', karte: 'YELLOW' },
  { code: 'DEVICE_USED', text: 'Using a phone, or it rings or vibrates', karte: 'YELLOW' },
  { code: 'SMOKING', text: 'Smoking, snus, snuff or e-cigarette', karte: 'YELLOW' },
  { code: 'TAPPING', text: 'Tapping the table or the balls', karte: 'YELLOW' },
  { code: 'UNSPORTSMANLIKE', text: 'Unsportsmanlike conduct (serious)', karte: 'YELLOW' },
  { code: 'EQUIPMENT_DAMAGE', text: 'Damaging equipment', karte: 'RED' },
  { code: 'UNSPORTSMANLIKE_SEVERE', text: 'Unsportsmanlike conduct (very serious)', karte: 'RED' },
  { code: 'ALCOHOL', text: 'Drinking alcohol during the match', karte: 'RED' },
]

interface Kartenstand {
  side: Seite
  playerId: string
  displayName: string
  standing: 'NONE' | 'GREEN' | 'YELLOW' | 'RED' | 'BLACK'
}

const staende = ref<Kartenstand[] | null>(null)

/**
 * Der Katalog, wie der Server ihn geschickt hat — `null`, solange noch keine
 * Antwort da war.
 */
const anlaesseVomServer = ref<Kartenanlass[] | null>(null)

/**
 * Was am Tisch aufklappt. Der Katalog des Verbandes, und wenn er leer
 * ankommt, die eingebaute Liste — siehe den Kommentar an `NOTFALLLISTE`.
 */
const anlaesse = computed<Kartenanlass[]>(() => {
  const vomServer = anlaesseVomServer.value
  return vomServer && vomServer.length > 0 ? vomServer : NOTFALLLISTE
})
/** Für wen gerade die Anlassliste offensteht — `null`, wenn keine. */
const anlassFuer = ref<Kartenstand | null>(null)

async function staendeHolen() {
  try {
    const roh = await $fetch<{ sides: Kartenstand[], reasons: Kartenanlass[] }>(
      `/api/board/matches/${props.partie.id}/cards`,
      { headers: { 'cache-control': 'no-cache' } },
    )
    staende.value = roh?.sides ?? []
    anlaesseVomServer.value = roh?.reasons ?? []
  }
  catch {
    /*
     * Wie beim Verlauf: ein Block, der nicht kommt, darf die Handlungen
     * darüber nicht mitreissen. Ein Gerät ohne Freigabe und ohne Anmeldung
     * kommt gar nicht bis hierher, und das ist kein Fehler der Tafel.
     *
     * KEINE ROTE ZEILE. Sie ist dem LESEN vorbehalten, was es nicht gibt —
     * gemeldet wird, was jemand getan hat und abgewiesen wurde. Ein
     * Abrufer, der im Hintergrund stolpert, hat niemandes Druck
     * beantwortet.
     */
    staende.value = null
    /*
     * Der Katalog bleibt auf `null` und NICHT auf leer: leer hiesse "der
     * Server sagt, es gibt keine", null heisst "wir wissen es nicht". Beim
     * nächsten gelungenen Abruf steht wieder, was gilt. Auf die Auswahl wirkt
     * es ohnehin nicht — ohne Stand gibt es keinen Knopf, der sie öffnet.
     */
    anlaesseVomServer.value = null
  }
}

onMounted(staendeHolen)

/** Die Menschen einer Seite — beim Doppel sind es zwei. */
function staendeDer(seite: Seite): Kartenstand[] {
  return (staende.value ?? []).filter(z => z.side === seite)
}

/**
 * Was auf der Farbfläche steht.
 *
 * "Clean" und nicht "None": am Tisch wird gefragt, ob jemand etwas hat, und
 * die Antwort darauf heisst "nein" und nicht "der Wert ist leer".
 */
function standWort(stand: Kartenstand['standing']): string {
  switch (stand) {
    case 'GREEN': return 'Green'
    case 'YELLOW': return 'Yellow'
    case 'RED': return 'Red'
    case 'BLACK': return 'Black'
    default: return 'Clean'
  }
}

function anlassOeffnen(wer: Kartenstand) {
  anlassFuer.value = anlassFuer.value?.playerId === wer.playerId ? null : wer
}

/**
 * Was diese Karte bei DIESEM Stand auslöst — in einem Satz, vor der Tat.
 *
 * Gerechnet wird hier dieselbe Regel wie in `competition.card_next`: eine
 * Stufe höher als der Stand, mindestens aber die Karte selbst. Das ist eine
 * Doppelung, und sie ist bewusst: der Schiedsrichter soll VOR dem Druck
 * lesen, dass sein zweites Grün ein Rack kostet. Verbindlich ist die
 * Datenbank — sie rechnet es gleich noch einmal und überschreibt, was hier
 * stünde.
 */
const LEITER = ['NONE', 'GREEN', 'YELLOW', 'RED', 'BLACK']

function standDanach(vorher: string, karte: string): string {
  const i = Math.min(Math.max(LEITER.indexOf(vorher) + 1, LEITER.indexOf(karte)), 4)
  return LEITER[i] ?? 'NONE'
}

function folgeText(wer: Kartenstand, anlass: Kartenanlass): string {
  const neu = standDanach(wer.standing, anlass.karte)
  const gegner = wer.side === props.links ? props.rechts : props.links
  if (neu === 'YELLOW') return `${kurzname(gegner)} gets a rack`
  if (neu === 'RED') return `${kurzname(wer.side)} loses the match`
  if (neu === 'BLACK') return 'Standing goes to black — the tournament leadership decides'
  return 'Warning only'
}

function kartenFragen(wer: Kartenstand, anlass: Kartenanlass) {
  const neu = standDanach(wer.standing, anlass.karte)
  anlassFuer.value = null
  fragen({
    frage: `${anlass.karte.toLowerCase()} card for ${wer.displayName}?`,
    erklaerung: `${anlass.text}. Standing goes from ${standWort(wer.standing).toLowerCase()} `
      + `to ${standWort(neu as Kartenstand['standing']).toLowerCase()}. ${folgeText(wer, anlass)}.`,
    wort: `${anlass.karte.charAt(0)}${anlass.karte.slice(1).toLowerCase()} card`,
    // Dieselbe Regel wie bei der Aufgabe: nur am freigeschalteten Gerät.
    // Eine Karte trägt den Namen dessen, der sie gegeben hat, und "Tisch 7"
    // ist kein Name.
    code: !props.alsMensch,
    tun: (code: string) => kartenGeben(wer, anlass, code),
  })
}

const kartenLaeuft = ref(false)

async function kartenGeben(wer: Kartenstand, anlass: Kartenanlass, code: string) {
  kartenLaeuft.value = true
  eigen.melden(null)
  try {
    await $fetch(`/api/board/matches/${props.partie.id}/cards`, {
      method: 'POST',
      body: {
        playerId: wer.playerId,
        card: anlass.karte,
        reasonCode: anlass.code,
        ...(code === '' ? {} : { boardPin: code }),
      },
    })
    // Stand und Verlauf zusammen: die Karte ändert beides, und ein Block,
    // der die Folge des eigenen Drucks nicht zeigt, sieht aus wie einer,
    // bei dem nichts passiert ist.
    await Promise.all([staendeHolen(), verlaufHolen()])
  }
  catch (roh: unknown) {
    /*
     * OBEN ROT UND NICHT IM BLOCK. Hier stand `kartenFehler.value = true`,
     * und das war die Angabe, die niemand las — die abgewiesene Karte blieb
     * am Tisch unsichtbar. Der Satz gehört an dieselbe Stelle wie jede
     * andere Abweisung: über die Flächen, weil dorthin sieht, wer eben
     * getippt hat.
     *
     * Der Stand wird NICHT nachgeholt. Abgewiesen heisst: es hat sich
     * nichts geändert, und ein Abruf, der dasselbe noch einmal bringt, sähe
     * aus wie eine Antwort auf den Druck.
     */
    eigen.abweisen(roh)
  }
  finally {
    kartenLaeuft.value = false
  }
}

/* ------------------------------------------------------------------------
 * DER TISCHWECHSEL — SEIT DEM 16.09.2026 EBENFALLS HINTER DEN SECHS ZIFFERN
 *
 * Hier stand: "Ohne Code — ein Tischwechsel nimmt nichts fest und verkürzt
 * nichts." Das stimmt für den Vorgang und beantwortet die falsche Frage. Der
 * Auftraggeber verlangt die PIN für "im endeffekt alles was dort im menue
 * drin ist", und der Fall, den er meint, ist nicht der Aufbau am Morgen,
 * sondern der Schirm, der MITTEN IN EINER PARTIE seine Partie verlässt: für
 * den Saal ist die Tafel dann weg, und für den Schiedsrichter die Bedienung.
 *
 * DER AUFBAU IST DAVON NICHT BETROFFEN, und das ist der Grund, aus dem die
 * Änderung tragbar ist. Einen Tisch SETZT man nicht hier, sondern auf der
 * Einrichtungsseite `/board/{eventId}`: dort wird der sechsstellige Code
 * eingelöst und der Tisch gewählt, und dieser Weg bleibt ohne Personencode
 * (`PUT /board/grant/table` verlangt nur eine gültige Freigabe). Wer am
 * Morgen zwanzig Geräte aufstellt, braucht also weiterhin nur den Zettel mit
 * den sechs Ziffern. Die PIN trifft genau den Wechsel aus einer laufenden
 * Partie heraus — und das ist der Fall, um den es geht.
 *
 * WAS SIE NICHT IST: eine Sperre. Wer die Adresse kennt, tippt
 * `/board/{eventId}` in die Zeile und ist auch dort. Das ist dieselbe Art
 * Schutz wie der Rahmengriff, der das Menü öffnet — er hält das, was
 * BEILÄUFIG passiert, und das ist hier alles, was zu halten ist.
 *
 * GEPRÜFT WIRD AM SERVER UND NICHT IM GERÄT. Der Tischwechsel ist der
 * einzige Punkt dieses Menüs, der nichts schreibt; ein Code, der nur hier
 * verglichen würde, wäre eine Behauptung des Geräts über sich selbst — und
 * genau die hat der Bau vom 15.09.2026 überall sonst abgeschafft. Deshalb
 * `POST /api/board/grant/pin`: er löst die sechs Ziffern in der Verwaltung
 * auf, hängt an derselben Bremse wie jeder andere Codeweg und gibt den Namen
 * zurück.
 * --------------------------------------------------------------------- */
function tischwechselFragen() {
  fragen({
    frage: 'Move this screen to another table?',
    erklaerung: 'The match below stays as it is. This screen goes back to the '
      + 'table list and will show whatever is playing at the table you pick.',
    wort: 'Change table',
    // Dieselbe Regel wie bei der Karte und der Aufgabe: nur am
    // freigeschalteten Gerät ohne Menschen dahinter.
    code: !props.alsMensch,
    tun: (code: string) => void tischwechselTun(code),
  })
}

/**
 * Erst den Code nachweisen, dann gehen.
 *
 * Ohne Code (ausgewiesener Mensch) geht es sofort — dann hat der Server
 * schon gesagt, dass hier ein Mensch handelt, und eine Anfrage, die nur
 * "ja" sagen kann, ist ein Umlauf ohne Auskunft.
 *
 * Scheitert der Nachweis, BLEIBT DAS MENÜ OFFEN und die rote Zeile sagt,
 * warum. Der Schirm auf die Tischwahl zu schicken und DORT abzuweisen wäre
 * die schlechtere Reihenfolge: dann stünde die Partie nicht mehr da, über
 * die gerade entschieden wird.
 */
async function tischwechselTun(code: string) {
  if (code === '') {
    emit('tischwechsel')
    return
  }
  eigen.melden(null)
  try {
    await $fetch('/api/board/grant/pin', { method: 'POST', body: { pin: code } })
    emit('tischwechsel')
  }
  catch (roh: unknown) {
    eigen.abweisen(roh)
  }
}

/* ------------------------------------------------------------------------
 * DER VERLAUF — WAS BISHER GESCHAH
 *
 * Der Schiedsrichter steht am Tisch und hat eine Frage: "war das schon der
 * dritte Satz?", "wann hat der seine Auszeit genommen?", "wer hat
 * angestossen?". Bis hierher konnte er sie nur beantworten, indem er jemanden
 * ins Turnierbüro schickte — dieselbe Lücke, aus der dieses Menü überhaupt
 * entstanden ist, nur dass es diesmal nichts zu TUN gibt, sondern etwas
 * nachzusehen.
 *
 * WANN GELADEN WIRD: BEIM AUFSCHLAGEN DES MENÜS, NICHT AUF ANTIPPEN.
 *
 * Die Antwort steht damit schon da, wenn die Frage gestellt wird. Der andere
 * Weg — erst beim Antippen eines Reiters holen — wurde verworfen: er legt die
 * Wartezeit genau in den Augenblick, in dem der Schiedsrichter die Auskunft
 * braucht, und über ein Hallen-WLAN sind das die zwei Sekunden, in denen zwei
 * Spieler und ein halber Saal zusehen.
 *
 * Bezahlt wird das mit EINER Anfrage je Öffnen des Menüs. Das ist vertretbar,
 * weil dieses Menü die seltene Liste ist und nicht die häufige: es wird ein
 * paar Mal je Partie aufgeschlagen und nicht ein paar Mal je Satz. Die Antwort
 * ist ausserdem klein (zwanzig Zeilen JSON) — was auf einer schlechten Leitung
 * kostet, ist der Umlauf, und den gibt es so oder so genau einmal.
 *
 * NICHT ZWISCHENGESPEICHERT. Ein Verlauf, der von vorhin stammt, ist an der
 * Tafel dasselbe wie ein Stand von vorhin — dieselbe Regel wie für alles
 * andere, was dieses Gerät fragt.
 * --------------------------------------------------------------------- */
const verlauf = ref<MatchEventPublic[] | null>(null)
const verlaufLaedt = ref(true)
const verlaufFehler = ref(false)

async function verlaufHolen() {
  verlaufLaedt.value = true
  verlaufFehler.value = false
  try {
    /*
     * DIE EIGENE ROUTE UND NICHT DIE ÖFFENTLICHE.
     *
     * `/api/matches/{id}/timeline` ist die Schnittstelle des Publikums, und
     * die lässt weg, was das Publikum nichts angeht: die Rücknahme am Gerät
     * (UNDO) und die Korrektur aus dem Turnierbüro (NOTE). Genau die beiden
     * sind hier aber die Zeilen, wegen derer jemand nachschaut — der
     * `case 'NOTE'` unten stand deshalb bis zum 15.09.2026 wirkungslos da.
     */
    const roh = await $fetch<MatchEventPublic[]>(
      `/api/board/matches/${props.partie.id}/timeline`,
      { headers: { 'cache-control': 'no-cache' } },
    )
    // Die Anwendung liefert aufsteigend; am Tisch wird von hinten gelesen.
    verlauf.value = [...roh].reverse()
  }
  catch {
    /*
     * Ein Verlauf, der nicht kommt, ist kein Fehler der Tafel und darf sie
     * auch nicht wie einer behandeln: die drei Handlungen dieses Menüs
     * müssen weiter gehen. Es bleibt bei einer Zeile und einem Knopf.
     */
    verlaufFehler.value = true
    verlauf.value = null
  }
  finally {
    verlaufLaedt.value = false
  }
}

onMounted(verlaufHolen)

/*
 * NACHGELADEN WIRD NUR, WAS DIESES MENÜ SELBST AUSGELÖST HAT.
 *
 * Die Auszeit-Rücknahme schreibt einen Verlaufseintrag (TIMEOUT_WITHDRAWN),
 * und der Schiedsrichter soll unten sehen, dass sie durch ist. Bemerkt wird
 * das an der Zahl der genommenen Auszeiten — sie kommt aus der Antwort der
 * Anwendung und ändert sich erst, wenn dort wirklich etwas steht.
 *
 * AM STAND wird bewusst NICHT gehorcht, obwohl es naheliegt: die Tafel nimmt
 * einen Punkt seit dem 14.09.2026 vorweg, die Zahl geht also hoch, BEVOR die
 * Anwendung ihn kennt. Ein Nachladen an dieser Stelle holte einen Verlauf
 * ohne den Satz, der es ausgelöst hat — und bliebe dann so stehen. Hinter dem
 * Vorhang kann ohnehin niemand zählen; er deckt die Leiste zu.
 */
watch(
  () => [props.zusatz?.timeoutsTaken?.A, props.zusatz?.timeoutsTaken?.B, props.partie.status].join('|'),
  () => { if (!verlaufLaedt.value) verlaufHolen() },
)

/**
 * WIE VIELE ZEILEN OHNE ANTIPPEN DASTEHEN.
 *
 * Vier, weil vier die Fragen abdecken, die am Tisch tatsächlich gestellt
 * werden: sie reichen über die letzten beiden Sätze samt allem, was
 * dazwischen lag. Eine Partie über neun Gewinnsätze bringt es auf zwanzig
 * Einträge, und zwanzig Zeilen an einem Tisch sind keine Auskunft, sondern
 * ein Protokoll — wer es braucht, klappt es auf.
 */
const KURZ_ANZAHL = 4
const alleZeigen = ref(false)

/**
 * Was eine Zeile sagt — oder `null`, wenn sie nicht an den Tisch gehört.
 *
 * GEZEIGT WIRD, WAS AM TISCH PASSIERT IST: der Anstoss (mit dem, der ihn
 * hatte — bei wechselndem Anstoss die häufigste Rückfrage überhaupt), jeder
 * Satz mit dem Stand, jede Auszeit mit ihrer Dauer, die Shot-Clock, jede
 * Rücknahme und jede Korrektur, der Ruf an den Tisch und das Ende.
 *
 * RÜCKNAHME UND KORREKTUR SIND ZWEIERLEI, und dieses Menü ist die Stelle, an
 * der der Unterschied gebraucht wird: "war das ein Vertipper oder wurde der
 * Stand richtiggestellt?" Beide senken eine Zahl, und bis zum 15.09.2026
 * hiessen beide gleich.
 *
 * NICHT GEZEIGT WIRD DIE FREIGABE (APPROVED). Sie geschieht im Turnierbüro,
 * nachdem am Tisch schon abgebaut wird, und beantwortet keine Frage, die
 * jemand vor dem Tisch hat.
 *
 * Eine unbekannte Art wird NICHT verschluckt, sondern lesbar gemacht
 * ("SHOT_CLOCK_EXTENDED" → "shot clock extended"). Die Anwendung bekommt
 * weitere Arten, und eine Zeile, die fehlt, ohne dass es jemand merkt, ist
 * schlimmer als eine, die etwas hölzern klingt: der Verlauf soll vollständig
 * sein, sonst zählt der Schiedsrichter an ihm vorbei.
 */
/**
 * „Am Tisch quittiert" — oder eben nicht.
 *
 * DIESER SCHIRM STEHT AM TISCH, und genau deshalb ist der Unterschied hier
 * am wichtigsten. Bis zum 16.09.2026 stand an jeder Quittung fest
 * „Shot clock acknowledged at the table", auch wenn sie aus dem
 * Turnierbüro kam — der Schiedsrichter las im eigenen Menü, ER habe
 * quittiert, und suchte die Bestätigung nicht mehr.
 *
 * Der Weg (`actorVia`) ist eine Auskunft über das GERÄT und nicht über
 * einen Menschen; der Urheber bleibt draussen wie im ganzen übrigen
 * Verlauf. Ohne Weg bleibt der Satz neutral: Zeilen von vorher wissen ihn
 * nicht, und „at the table" wäre dort geraten.
 *
 * Derselbe Wortlaut wie auf der öffentlichen Seite (MatchTable.vue).
 * VERWORFEN, ihn dort zu holen: die beiden Verläufe kommen aus zwei
 * Abfragen mit zwei verschiedenen Filtern, und eine gemeinsame Datei nur
 * für drei Sätze verbände zwei Seiten, die sonst nichts teilen.
 */
function quittungText(e: MatchEventPublic): string {
  const weg = e.actorVia ?? null
  if (weg === 'BOARD' || weg === 'BOARD_PIN') return 'Shot clock acknowledged at the table'
  if (weg === 'SESSION') return 'Shot clock acknowledged from the tournament office — not at the table'
  return 'Shot clock acknowledged'
}

function zeilenText(e: MatchEventPublic): string | null {
  const wer = e.side ? kurzname(e.side) : ''
  const d = e.detail ?? {}
  switch (e.kind) {
    case 'TABLE_ASSIGNED': return `Called to table ${d.table ?? '?'}`
    case 'TABLE_RELEASED': return 'Taken off the table'
    case 'STARTED': return wer ? `Started · ${wer} breaks` : 'Started'
    case 'SCORE': return `Rack for ${wer}`
    /*
     * DAS ZUGESPROCHENE RACK — § 9.1.2 der Sportordnung.
     *
     * "Awarded to" und nicht "Rack for": der Unterschied zwischen gespielt
     * und zugesprochen ist genau die Frage, mit der jemand hierherkommt,
     * wenn der Stand nicht zu den Aufnahmen passt.
     *
     * OHNE DIE FARBE UND OHNE DEN NAMEN DES BESTRAFTEN. Der Verlauf einer
     * Partie ist öffentlich (`competition.match_event`), und dieselbe Zeile
     * steht am Tisch wie auf der Webseite. Welche Karte dahinterstand,
     * beantwortet der Block "Warnings" weiter oben — der hängt an einer
     * Tabelle, die `bb_public` gar nicht kennt.
     */
    case 'PENALTY_RACK': return d.unit === 'points'
      ? `${d.units ?? '?'} points awarded to ${wer} (penalty)`
      : `Rack awarded to ${wer} (penalty)`
    /*
     * ZWEI ZEILEN FÜR ZWEI VERSCHIEDENE VORGÄNGE, und der Unterschied ist
     * die Frage, die am Tisch gestellt wird: war das ein Vertipper, oder
     * wurde der Stand richtiggestellt?
     *
     * UNDO — am Gerät zurückgenommen, mit "Undo" oder dem Minus. Ein
     * Fehltipper und sonst nichts; es hat niemand entschieden.
     * NOTE — von aussen richtiggestellt, aus dem Turnierbüro. Eine
     * Entscheidung, hinter der ein Mensch steht, der nicht am Tisch war.
     *
     * Beide tragen die beiden Zahlen im Beiwerk und nicht im eigenen Stand —
     * genau die Zeile, wegen der man nachschaut.
     */
    case 'UNDO': return `Taken back for ${wer}: ${d.undoneFrom ?? '?'} → ${d.undoneTo ?? '?'}`
    case 'NOTE': return d.correctedFrom !== undefined
      ? `Score corrected for ${wer}: ${d.correctedFrom} → ${d.correctedTo}`
      : null
    case 'TIMEOUT_STARTED': return `Time-out ${wer}`
    case 'TIMEOUT_ENDED': return `Time-out ${wer} over (${d.seconds ?? '?'} s)`
    case 'TIMEOUT_WITHDRAWN': return `Time-out ${wer} taken back (${d.seconds ?? '?'} s)`
    /*
     * DIE SHOT-CLOCK — DREI ZUSTÄNDE UND KEINE SEKUNDE.
     *
     * `wer` steht hier NICHT mehr, und das ist der Punkt: die Zuweisung
     * nennt keine Seite (`side` bleibt NULL). Der Verlauf einer Partie ist
     * öffentlich lesbar; "die Shot-Clock gilt" ist eine Tatsache über die
     * Partie, "die Shot-Clock gegen Herrn X" wäre eine Aussage über einen
     * Menschen. Wen sie trifft, sieht im Saal ohnehin jeder, sobald der
     * Schiedsrichter die Uhr stellt.
     *
     * Bis hierher stand da `Shot clock for ${wer}` — aus einer Zeit, in der
     * niemand dieses Ereignis je geschrieben hat. Mit leerer Seite hätte der
     * Satz "Shot clock for " gelautet.
     *
     * Und es steht KEINE Sekundenzahl dabei, weil es keine gibt: der
     * Schiedsrichter führt die Uhr am Tisch mit seiner eigenen Stoppuhr.
     */
    case 'SHOT_CLOCK': return d.state === 'ACKNOWLEDGED'
      ? quittungText(e)
      : d.state === 'LIFTED'
        ? 'Shot clock lifted'
        : 'Shot clock ordered'
    /*
     * DAS FOUL — § 7.9 bis § 7.11 des WPA-Regelwerks, Straight Pool.
     *
     * Drei Arten, weil am Tisch drei verschiedene Fragen dahinterstehen:
     * das Standardfoul kostet einen Punkt, das Foul beim Eröffnungsstoss
     * zwei, und das dritte Standardfoul in Folge sechzehn — einen für das
     * Foul selbst und fünfzehn aus § 7.11. Die Zahl steht dabei, weil sonst
     * niemand nachrechnen kann, wie der Stand zustande kam.
     *
     * MIT DEM NAMEN, anders als bei der Karte weiter oben. Ein Foul ist ein
     * Vorgang im Spiel: es fällt vor aller Augen, der Schiedsrichter ruft
     * es aus, und der Stand ändert sich sichtbar. Eine Verwarnung ist eine
     * Angabe über einen Menschen und steht deshalb in einer Tabelle, die
     * `bb_public` gar nicht kennt.
     *
     * Bis zum 16.09.2026 stand hier gar nichts und ein Foul erschien als
     * "Score corrected from 9 to 8" — bei einem Einspruch die falsche
     * Auskunft.
     */
    case 'FOUL': return d.rule === 'BREAK'
      ? `Break foul ${wer} (−${d.points ?? 2})`
      : d.rule === 'THIRD'
        ? `Third foul in a row ${wer} (−${d.points ?? 16} · all fifteen re-racked)`
        : `Foul ${wer} (−${d.points ?? 1})`
    case 'FINISHED': return wer ? `Finished · ${wer} wins` : 'Finished'
    case 'RESET': return 'Match reset'
    case 'APPROVED': return null
    default: return e.kind.toLowerCase().replace(/_/g, ' ')
  }
}

interface Verlaufszeile {
  /** Trägt Zeitpunkt, Art, Seite und Stand — zwei Einträge teilen ihn nicht. */
  schluessel: string
  at: string
  text: string
  stand: string | null
  /**
   * WER es war — oder `null`, wenn es bloss das Gerät war.
   *
   * Seit dem 16.09.2026, und es ist die Gegenleistung für die PIN: der
   * Auftraggeber will sie tippen, damit "im verlauf steht dann wer was
   * gemacht hat, weil anhand der pin ein schiri ja identifiziert werden
   * kann". Ohne diese Spalte wäre das Tippen eine Hürde ohne Ertrag.
   *
   * Steht nur an den Zeilen, hinter denen ein MENSCH steht — sechs Ziffern
   * am Tisch oder eine Anmeldung im Büro. Die Durchreiche entscheidet das
   * und nicht diese Datei; an einer gezählten Aufnahme stünde sonst
   * zwanzigmal „Anzeigetafel · Tisch 7".
   */
  wer: string | null
}

const zeilen = computed<Verlaufszeile[]>(() =>
  (verlauf.value ?? []).flatMap((e) => {
    const text = zeilenText(e)
    if (!text) return []
    return [{
      schluessel: `${e.at}|${e.kind}|${e.side ?? ''}|${e.scoreA}|${e.scoreB}`,
      at: e.at,
      text,
      stand: e.scoreA !== null && e.scoreB !== null
        // In der Lage der Tafel und nicht in der der Datenbank: wer links
        // steht, steht auch hier links. Sonst liest sich 8:5 verkehrt herum.
        ? `${props.links === 'A' ? e.scoreA : e.scoreB}:${props.links === 'A' ? e.scoreB : e.scoreA}`
        : null,
      wer: e.actorName ?? null,
    }]
  }))

const sichtbareZeilen = computed(() =>
  alleZeigen.value ? zeilen.value : zeilen.value.slice(0, KURZ_ANZAHL))

/* ------------------------------------------------------------------------
 * DIE ZEITEN
 *
 * BEIDES, UND IN DIESER REIHENFOLGE: gross der Abstand ("6 min"), klein
 * darunter die Uhrzeit ("21:46").
 *
 * Am Tisch wird nach dem Abstand gefragt und nicht nach der Uhrzeit — "wann
 * hat der seine Auszeit genommen?" heisst "wie lange ist das her?", und wer
 * "21:46" liest, muss selbst rechnen, während zwei Spieler warten. Die
 * Uhrzeit bleibt trotzdem stehen: sobald der Vorfall ins Protokoll geht oder
 * die Turnierleitung dazukommt, ist sie die Angabe, über die zwei Leute
 * reden können, und ein Abstand allein ist in dem Augenblick schon veraltet.
 *
 * 24 Stunden fest und nicht nach Gerät: auf welche Sprache das Tablet in der
 * Halle gestellt ist, weiss niemand, und "9:46 pm" in einem Protokoll, das
 * sonst durchgehend 24 Stunden führt, ist eine Fehlerquelle.
 * --------------------------------------------------------------------- */
const uhrzeitFormat = new Intl.DateTimeFormat('en-GB', {
  hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
})

function uhrzeit(iso: string): string {
  return uhrzeitFormat.format(new Date(iso))
}

/*
 * Der Abstand wird nachgeführt, und zwar auch dann, wenn niemand etwas tut:
 * das Menü steht jetzt Minuten offen (siehe unten), und "1 min" an einem
 * Eintrag, der inzwischen vier Minuten alt ist, ist schlechter als keine
 * Angabe. Alle zehn Sekunden reicht — feiner als die Anzeige selbst.
 */
const jetzt = ref(Date.now())
let uhrTakt: ReturnType<typeof setInterval> | null = null

onMounted(() => {
  uhrTakt = setInterval(() => { jetzt.value = Date.now() }, 10_000)
})
onBeforeUnmount(() => {
  if (uhrTakt) clearInterval(uhrTakt)
})

function abstand(iso: string): string {
  const ms = jetzt.value - new Date(iso).getTime()
  const minuten = Math.floor(ms / 60_000)
  if (minuten < 1) return 'just now'
  if (minuten < 60) return `${minuten} min`
  return `${Math.floor(minuten / 60)}:${String(minuten % 60).padStart(2, '0')} h`
}

/* ------------------------------------------------------------------------
 * DIE UHR, DIE DAS MENÜ WIEDER ZUMACHT
 *
 * WER LIEST, BERÜHRT NICHTS — und stand mit der ersten Fassung dieses
 * Verlaufs mitten im Satz wieder vor der Tafel. Eine halbe Minute ist für
 * drei Knöpfe richtig und für zwanzig Zeilen falsch.
 *
 * Solange der volle Verlauf aufgeklappt ist, gilt deshalb die längere Frist.
 * Abgeschaltet wird die Uhr NICHT: der Grund, aus dem es sie gibt, bleibt
 * bestehen — ein Schiedsrichter, der mitten im Lesen an den Tisch gerufen
 * wird, lässt den Vorhang offen, und dann steht er vor dem Saal. Drei Minuten
 * sind reichlich für zwanzig Zeilen und kurz genug, dass eine vergessene
 * Tafel noch im selben Satz zurückkommt.
 *
 * Die kurze Liste braucht nichts davon: vier Zeilen sind in zehn Sekunden
 * gelesen. Und jede Berührung — auch das Schieben der Liste — stellt die Uhr
 * ohnehin auf Anfang.
 * --------------------------------------------------------------------- */
const RUHE_MS = 30_000
const RUHE_LESEN_MS = 180_000
let ruheUhr: ReturnType<typeof setTimeout> | null = null

const ruheFrist = computed(() => alleZeigen.value ? RUHE_LESEN_MS : RUHE_MS)

function anstupsen() {
  if (ruheUhr) clearTimeout(ruheUhr)
  ruheUhr = setTimeout(() => emit('schliessen'), ruheFrist.value)
}

// Auf- und Zuklappen ändert die Frist — die laufende Uhr muss die neue haben.
watch(ruheFrist, anstupsen)

onMounted(anstupsen)
onBeforeUnmount(() => {
  if (ruheUhr) clearTimeout(ruheUhr)
})

/*
 * Eine Eingabe, die durchgegangen ist, schliesst das Menü NICHT von selbst.
 * Der Schiedsrichter soll sehen, was daraus geworden ist — die Restzahl der
 * Auszeiten ändert sich, die Zeile darüber sagt, dass es geklappt hat. Nur
 * die Aufgabe macht zu, weil es danach keine Partie mehr gibt, über die
 * dieses Menü etwas sagen könnte.
 */
</script>

<template>
  <!--
    Der Vorhang liegt über allem und fängt jede Berührung ab — auch die, die
    danebengeht. Sonst zählte ein Fehlgriff neben dem Menü einen Satz hoch.
  -->
  <div class="menue" @pointerdown.stop="anstupsen" @keydown="anstupsen">
    <!--
      DER STAND BLEIBT OBEN. Klein, aber vollständig: Namen, Zahlen, Tisch.
      Wer im Saal auf die Tafel sieht, während der Schiedsrichter arbeitet,
      soll die Partie nicht verlieren.
    -->
    <header class="menue__stand">
      <span class="menue__name">{{ langname(links) }}</span>
      <span class="menue__zahlen">{{ punkte(links) }}<span class="menue__strich">:</span>{{ punkte(rechts) }}</span>
      <span class="menue__name menue__name--rechts">{{ langname(rechts) }}</span>
    </header>

    <!--
      Die rote Zeile steht über den Flächen, wie in der Zählleiste und aus
      demselben Grund: wer eben getippt hat, schaut nach oben.
    -->
    <p v-if="roteZeile" class="menue__fehler" role="alert">{{ roteZeile.text }}</p>

    <div class="menue__kopfzeile">
      <p class="menue__titel">Referee</p>
      <button type="button" class="menue__zu" @click="emit('schliessen')">
        Close
        <span class="menue__zu-taste" aria-hidden="true">0</span>
      </button>
    </div>

    <!--
      Schieben ist Benutzung. Der Vorhang hört sonst nur auf `pointerdown`,
      und wer den Verlauf mit einer Fernbedienung oder einem angeschlossenen
      Rad durchgeht, berührt in dessen Sinn nichts.
    -->
    <div class="menue__inhalt" @scroll.passive="anstupsen">
      <!--
        DIE SHOT-CLOCK — GANZ OBEN, WEIL SIE DIE PARTIE ANHÄLT.

        Der einzige Punkt in diesem Menü, auf den gerade JEMAND WARTET:
        solange nicht bestätigt ist, weist die Datenbank jeden Punkt ab, und
        auf der Tafel steht der Balken. Alles andere hier ist selten und
        dringend; dies ist selten, dringend UND blockierend.

        Sie steht nur da, wenn es etwas zu bestätigen gibt (`v-if`). Ein
        dauerhafter Punkt "Shot clock" wäre die halbe Verschleierung wieder
        aufgegeben: wer das Menü aus einem anderen Grund öffnet, während ein
        Spieler zusieht, zeigte ihm, dass es den Griff gibt.

        Der DAUERZUSTAND — bestätigt, gilt weiter — steht nicht hier, sondern
        unten in der Zählleiste. Dort gehört er hin: er geht den Saal an, und
        das Menü ist zu.
      -->
      <section v-if="shotClockOffen" class="menue__block">
        <h2 class="menue__ueber">Shot clock</h2>
        <BoardZaehltaste
          beschriftung="Acknowledge the shot clock"
          hinweis="the score does not go on before this"
          breite="voll" art="plus"
          taste="R"
          :arbeitet="laeuft"
          @click="shotClockFragen()"
        />
      </section>

      <!--
        DAS ZEITLIMIT (HEYBALL) — nur bei gesetztem Zeitlimit im Dokument
        (`zeitlimit` ist sonst `null`); an den meisten Turnieren gibt es
        keins, und dort erscheint dieser Abschnitt nicht.

        Anhalten/Fortsetzen steht IMMER da, sobald ein Zeitlimit gilt — der
        Schiedsrichter braucht diesen Griff nach praktisch jedem Rack (siehe
        `zeitlimitLaufenSchalten`). Das Beenden kommt erst dazu, wenn die
        Zeit auch WIRKLICH um ist (`zeitlimit.ueberzogen`); ein Gleichstand
        bekommt zwei Flächen statt einer, weil nur der Schiedsrichter weiss,
        wer den Shoot-out gewonnen hat.
      -->
      <section v-if="zeitlimit" class="menue__block">
        <h2 class="menue__ueber">Time limit</h2>
        <BoardZaehltaste
          :beschriftung="zeitlimit.running ? 'Pause the clock' : 'Resume the clock'"
          :hinweis="`${zeitlimit.running ? 'running' : 'paused'} · ${zeitlimit.text}`"
          breite="voll"
          :arbeitet="laeuft"
          @click="zeitlimitLaufenSchalten()"
        />
        <template v-if="zeitlimit.ueberzogen">
          <div v-if="zeitlimitUnentschieden" class="menue__paar">
            <BoardZaehltaste
              v-for="seite in [links, rechts]" :key="`zeitlimit-so-${seite}`"
              :beschriftung="`${kurzname(seite)} wins the shoot-out`"
              hinweis="the match is tied at the time limit"
              breite="voll" art="ende"
              :arbeitet="laeuft"
              @click="zeitlimitShootoutFragen(seite)"
            />
          </div>
          <BoardZaehltaste
            v-else
            beschriftung="Finish"
            :hinweis="`${kurzname(zeitlimitFuehrend)} leads on the clock`"
            breite="voll" art="ende"
            :arbeitet="laeuft"
            @click="zeitlimitBeendenFragen()"
          />
        </template>
      </section>

      <!--
        SATZ ABSCHLIESSEN (POOL) BZW. FRAME ABSCHLIESSEN (SNOOKER).

        Nur, wenn die Partie überhaupt ein Satzformat trägt oder in Frames
        läuft (`satzModus` ist sonst `null`) — an jeder anderen Partie
        erscheint dieser Block nicht. Siehe die Begründung an `satzModus`.
      -->
      <section v-if="satzModus" class="menue__block">
        <h2 class="menue__ueber">{{ satzModus === 'SNOOKER' ? 'Frame' : 'Set' }}</h2>
        <BoardZaehltaste
          v-if="satzModus === 'POOL'"
          beschriftung="Confirm set"
          :hinweis="satzErreicht ? 'the set race has been reached' : 'nobody has reached the set race yet'"
          breite="voll" art="ende"
          :gesperrt="!satzErreicht"
          :arbeitet="laeuft"
          @click="satzFragen()"
        />
        <div v-else class="menue__paar">
          <BoardZaehltaste
            v-for="seite in [links, rechts]" :key="`satz-${seite}`"
            :beschriftung="`Confirm frame — ${kurzname(seite)} wins`"
            hinweis="ends this frame · the next one starts at 0:0"
            breite="voll" art="ende"
            :arbeitet="laeuft"
            @click="satzFragen(seite)"
          />
        </div>
      </section>

      <!--
        DIE AUSZEIT-RÜCKNAHME — eine Zeile je Spieler, in der Lage der Tafel:
        links der linke, rechts der rechte.
      -->
      <section class="menue__block">
        <h2 class="menue__ueber">Time-out taken by mistake</h2>
        <div class="menue__paar">
          <BoardZaehltaste
            v-for="seite in [links, rechts]" :key="`auszeit-${seite}`"
            :beschriftung="`Take back ${kurzname(seite)}`"
            :hinweis="auszeitPunkt(seite).hinweis"
            breite="voll" art="minus"
            :gesperrt="!auszeitPunkt(seite).moeglich" :arbeitet="laeuft"
            @click="auszeitZurueckFragen(seite)"
          />
        </div>
      </section>

      <!--
        DIE VERWARNUNGEN — § 9.1 DER SPORTORDNUNG.

        ÜBER der Aufgabe und unter der Auszeit-Rücknahme: von oben nach
        unten wird es endgültiger, und eine grüne Karte ist weniger
        endgültig als eine Aufgabe, aber mehr als eine zurückgenommene
        Auszeit.

        DER STAND ZUERST UND ALS FARBE. Am Tisch wird nicht gelesen, sondern
        hingesehen — "hat der schon was?" ist eine Frage, die eine Farbe
        beantwortet und ein Wort nicht. Das Wort steht trotzdem dabei: eine
        Fläche, die ihre Aussage allein aus der Farbe bezieht, sagt einem
        Farbenblinden nichts.
      -->
      <section v-if="staende && staende.length" class="menue__block">
        <h2 class="menue__ueber">Warnings</h2>
        <div class="menue__paar">
          <div v-for="seite in [links, rechts]" :key="`karte-${seite}`" class="karten__seite">
            <div v-for="wer in staendeDer(seite)" :key="wer.playerId" class="karten__mensch">
              <div class="karten__stand" :class="`karten__stand--${wer.standing.toLowerCase()}`">
                <span class="karten__name">{{ wer.displayName }}</span>
                <span class="karten__wort">{{ standWort(wer.standing) }}</span>
              </div>

              <!--
                AUF SCHWARZ EIN SATZ UND KEIN KNOPF. Der Ausschluss ist die
                Entscheidung der Turnierleitung (Fussnote zu § 9.1), und eine
                Fläche, die etwas anbietet, das der Server danach abweist,
                ist eine unehrliche Fläche.
              -->
              <p v-if="wer.standing === 'BLACK'" class="karten__hinweis">
                Standing: black — the tournament leadership decides.
              </p>

              <BoardZaehltaste
                v-else
                :beschriftung="anlassFuer?.playerId === wer.playerId ? 'Cancel' : 'Give a card'"
                hinweis="what happened decides the colour"
                breite="voll" :arbeitet="laeuft || kartenLaeuft"
                @click="anlassOeffnen(wer)"
              />

              <ul v-if="anlassFuer?.playerId === wer.playerId" class="anlass">
                <li v-for="a in anlaesse" :key="a.code">
                  <button
                    type="button" class="anlass__zeile"
                    :class="`anlass__zeile--${a.karte.toLowerCase()}`"
                    :disabled="laeuft || kartenLaeuft"
                    @click="kartenFragen(wer, a)"
                  >
                    <span class="anlass__text">{{ a.text }}</span>
                    <span class="anlass__folge">{{ folgeText(wer, a) }}</span>
                  </button>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      <!--
        AUFGABE. Sie steht unter der Auszeit und über dem Tischwechsel: von
        oben nach unten wird es endgültiger.
      -->
      <section class="menue__block">
        <h2 class="menue__ueber">
          {{ aufgabeArt === 'NO_SHOW' ? 'Nobody at the table' : 'A player stops' }}
        </h2>
        <div class="menue__paar">
          <BoardZaehltaste
            v-for="seite in [links, rechts]" :key="`aufgabe-${seite}`"
            :beschriftung="aufgabeWort(seite)"
            :hinweis="aufgabeHinweis(seite)"
            breite="voll" :arbeitet="laeuft"
            @click="aufgabeFragen(seite)"
          />
        </div>
      </section>

      <!--
        DER TISCHWECHSEL — der Grund, aus dem dieses Menü überhaupt gebaut
        wurde. Er lag auf der Taste 0 und auf einem langen Druck irgendwo auf
        dem Schirm, und beides ist im Saal zu leicht: ein Schirm, an den sich
        jemand anlehnt, verliess mitten im Halbfinale seine Partie.
        Jetzt liegt er hinter dem Menü UND hinter einer Rückfrage.
      -->
      <section class="menue__block">
        <h2 class="menue__ueber">This screen</h2>
        <BoardZaehltaste
          beschriftung="Change table"
          hinweis="back to the table list"
          breite="voll" :arbeitet="laeuft"
          @click="tischwechselFragen()"
        />
      </section>

      <!--
        DIE FERNBEDIENUNG — ZWISCHEN DEN HANDLUNGEN UND DEM VERLAUF.

        Sie TUT nichts und gehört deshalb nach unten; sie wird aber GESUCHT
        („welche Taste war das gleich?") und gehört deshalb vor den Verlauf,
        der beim Aufklappen alles darunter wegschiebt. Ihre Höhe steht fest,
        also springt hier nichts.
      -->
      <section class="menue__block">
        <h2 class="menue__ueber">Remote control</h2>
        <dl class="belegung">
          <template v-for="(rowRec, i) in belegung" :key="`${rowRec.taste}-${i}`">
            <dt class="belegung__taste">{{ rowRec.taste }}</dt>
            <dd class="belegung__was">{{ rowRec.was }}</dd>
          </template>
        </dl>
        <!--
          DIE FASSUNG — unter der Belegung, klein, ohne Rahmen.

          Sie gehört in diesen Block, weil er der einzige hier ist, der
          nichts TUT: er ist die Tafel zum Nachschlagen. Eine Zeile über die
          Fassung ist dasselbe — eine Auskunft, die man sucht, wenn jemand
          am Telefon danach fragt, und die einen sonst nie interessiert.
        -->
        <p class="belegung__fassung">
          Version {{ fassung }}<template v-if="fassungWartet"> · update pending</template>
        </p>
      </section>

      <!--
        DER VERLAUF — ZULETZT, UND ZWAR AUS ZWEI GRÜNDEN.

        Erstens: er ist das einzige Stück hier, das nichts TUT. Die drei
        Handlungen darüber müssen auf einem 1024er Tablet ohne Schieben
        erreichbar bleiben; ein Block, der sie nach unten drückt, nimmt dem
        Menü genau das, wofür es gebaut wurde.

        Zweitens: er ist das einzige Stück, dessen Höhe sich ÄNDERT — beim
        Aufklappen und bei jedem Nachladen. Stünde er oben, sprängen die
        Knöpfe darunter unter dem Finger weg.

        Gelesen wird er trotzdem ohne einen einzigen Druck: die vier
        jüngsten Zeilen stehen da, sobald der Vorhang aufgeht. Sie
        beantworten die Frage, mit der man herkommt; der Rest ist Protokoll
        und liegt hinter dem Knopf.
      -->
      <section class="menue__block">
        <h2 class="menue__ueber">What happened</h2>

        <p v-if="verlaufLaedt && !verlauf" class="verlauf__zeile">Loading …</p>

        <div v-else-if="verlaufFehler" class="verlauf__leer">
          <span>History not available</span>
          <button type="button" class="verlauf__mehr" @click="verlaufHolen()">
            Try again
          </button>
        </div>

        <p v-else-if="!zeilen.length" class="verlauf__zeile">
          Nothing recorded for this match yet
        </p>

        <template v-else>
          <!--
            Neueste oben. Am Tisch wird nach dem gefragt, was gerade war
            ("war das schon der dritte Satz?"); ein Verlauf, der oben mit dem
            Ruf an den Tisch beginnt, lässt genau diese Antwort zuunterst
            stehen und muss erst geschoben werden.
          -->
          <ol class="verlauf">
            <li v-for="z in sichtbareZeilen" :key="z.schluessel" class="verlauf__reihe">
              <span class="verlauf__zeit">
                <span class="verlauf__her">{{ abstand(z.at) }}</span>
                <span class="verlauf__uhr">{{ uhrzeit(z.at) }}</span>
              </span>
              <span class="verlauf__was">
                {{ z.text }}
                <!--
                  DER NAME KLEIN UND HINTER DER TAT — nicht davor.

                  Gefragt wird am Tisch nach dem, WAS war ("war das schon
                  der dritte Satz?"); wer es eingetragen hat, ist die
                  Rückfrage danach. Ein Name am Zeilenanfang schöbe ihn vor
                  die Auskunft, wegen der jemand herkommt.

                  Nur an den Zeilen, hinter denen ein Mensch steht — siehe
                  `wer`. Zwanzig Zeilen mit demselben Zusatz wären kein
                  Protokoll, sondern ein Muster.
                -->
                <span v-if="z.wer" class="verlauf__wer">{{ z.wer }}</span>
              </span>
              <span v-if="z.stand" class="verlauf__stand">{{ z.stand }}</span>
            </li>
          </ol>

          <!--
            Kein BoardZaehltaste: die Flächen der Leiste sperren sich, solange
            eine Eingabe unterwegs ist. Nachsehen ist keine Eingabe und darf
            nie auf eine warten.
          -->
          <button
            v-if="zeilen.length > KURZ_ANZAHL"
            type="button" class="verlauf__mehr"
            @click="alleZeigen = !alleZeigen"
          >
            {{ alleZeigen ? `Show only the last ${KURZ_ANZAHL}` : `Show all ${zeilen.length}` }}
            <span v-if="alleZeigen" class="verlauf__ruhe">stays open while you read</span>
          </button>
        </template>
      </section>
    </div>

    <!--
      DIE RÜCKFRAGE. Sie liegt über dem Menü und nicht über der Tafel: der
      Stand oben bleibt sichtbar, denn bei einer Aufgabe ist genau er das,
      was gleich festgeschrieben wird.
    -->
    <div v-if="rueckfrage" class="frage">
      <p class="frage__kopf">{{ rueckfrage.frage }}</p>
      <p class="frage__text">{{ rueckfrage.erklaerung }}</p>

      <!--
        DIE SECHS ZIFFERN, WENN DIESER SCHRITT SIE VERLANGT.

        `inputmode="numeric"` und nicht `type="number"`: ein Zahlenfeld
        bringt auf dem Tablet Pfeilchen zum Hoch- und Runterzählen mit und
        wirft führende Nullen weg — und `042731` ist ein gültiger Code.

        DEN FOKUS SETZT EIN WATCHER, NICHT `autofocus` -- siehe `codeFeld`
        im Kopf dieser Datei, dort steht auch, warum es ihn seit dem
        25.09.2026 gibt. `autofocus` taugt hier nicht: das Feld entsteht
        und vergeht mit der Rueckfrage, und das Merkmal wirkt nur beim
        ersten Aufbau der Seite.
      -->
      <div v-if="rueckfrage.code" class="frage__code">
        <label class="frage__code-text" for="board-pin">
          Enter your personal code
        </label>
        <input
          id="board-pin" ref="codeFeld" v-model="codeZiffern" class="frage__code-feld"
          inputmode="numeric" autocomplete="off" maxlength="6"
          placeholder="······" aria-describedby="board-pin-hint"
          @keyup.enter="jaSagen()"
        >
        <p id="board-pin-hint" class="frage__code-hinweis">
          Six digits. The tournament office hands them out.
        </p>
      </div>

      <div class="frage__tasten">
        <BoardZaehltaste
          beschriftung="Cancel" breite="voll" art="minus"
          @click="frageSchliessen()"
        />
        <BoardZaehltaste
          :beschriftung="rueckfrage.wort" breite="voll" art="ende"
          :gesperrt="rueckfrage.code && !codeVollstaendig"
          :arbeitet="laeuft" @click="jaSagen()"
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
/*
 * Das Codefeld. Gross und mit weiten Ziffernabstaenden: es wird an einem
 * Tablet bedient, das neben einem Billardtisch steht, von jemandem, der
 * dabei nicht sitzt. Ein Feld in Fliesstextgroesse trifft dort niemand.
 */
.frage__code {
  margin-bottom: 1.2rem;
}

.frage__code-text {
  display: block;
  font-size: 0.95rem;
  opacity: 0.85;
  margin-bottom: 0.4rem;
}

.frage__code-feld {
  width: 100%;
  box-sizing: border-box;
  padding: 0.6rem 0.8rem;
  font-size: 2rem;
  font-variant-numeric: tabular-nums;
  letter-spacing: 0.5em;
  text-align: center;
  border: 2px solid rgb(255 255 255 / 35%);
  border-radius: 8px;
  background: rgb(0 0 0 / 35%);
  color: inherit;
}

.frage__code-feld:focus {
  outline: none;
  border-color: rgb(255 255 255 / 80%);
}

.frage__code-hinweis {
  font-size: 0.8rem;
  opacity: 0.6;
  margin: 0.4rem 0 0;
}

/*
 * Der Vorhang deckt die ganze Tafel. `position: fixed` und nicht `absolute`:
 * die Tafel ist ein Raster mit vier Zeilen, und ein absolut gesetztes Kind
 * darin läge in einer davon.
 */
.menue {
  position: fixed;
  inset: 0;
  z-index: 20;
  display: flex;
  flex-direction: column;
  gap: 1.2dvh;
  /*
   * Nicht ganz undurchsichtig. Die Tafel scheint schwach durch, und damit
   * ist für jeden im Saal zu sehen, dass da noch eine Partie ist und der
   * Schirm nicht ausgefallen — der einzige Grund für die Durchsicht.
   */
  padding: 2dvh 2.5vw;
  background: rgba(5, 8, 13, 0.97);
  color: var(--ink, #fff);
  font-family: Montserrat, system-ui, sans-serif;
  font-variant-numeric: tabular-nums;
}

/* ---- Der Stand, klein ---- */
.menue__stand {
  display: grid;
  align-items: baseline;
  grid-template-columns: 1fr auto 1fr;
  gap: 2vw;
  padding-bottom: 1dvh;
  border-bottom: 2px solid var(--line, #1b2432);
}

.menue__name {
  overflow: hidden;
  font-size: min(3dvh, 2.4vw);
  font-weight: 700;
  letter-spacing: 0.02em;
  text-overflow: ellipsis;
  text-transform: uppercase;
  white-space: nowrap;
}

.menue__name--rechts {
  text-align: right;
}

.menue__zahlen {
  font-size: min(5dvh, 4vw);
  font-weight: 800;
  line-height: 1;
}

.menue__strich {
  padding: 0 0.6vw;
  color: var(--ink-dim, #93a1b3);
}

/* ---- Kopfzeile des Menüs ---- */
.menue__kopfzeile {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.menue__titel {
  margin: 0;
  color: var(--accent, #00afee);
  font-size: min(2.6dvh, 2vw);
  font-weight: 800;
  letter-spacing: 0.14em;
  text-transform: uppercase;
}

/*
 * Der Schliessen-Knopf ist gross genug für einen Daumen mit Kreide daran
 * (dieselbe Untergrenze wie die Zählflächen) und trägt die Taste, die
 * dasselbe tut — wer die Fernbedienung in der Hand hat, lernt sie hier.
 */
.menue__zu {
  display: flex;
  align-items: center;
  gap: 0.8vw;
  min-height: max(6dvh, 48px);
  padding: 0 2vw;
  border: 2px solid var(--line, #1b2432);
  border-radius: 1dvh;
  background: #0b1220;
  color: var(--ink, #fff);
  font-family: inherit;
  font-size: min(2.2dvh, 1.8vw);
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  cursor: pointer;
  touch-action: manipulation;
}

.menue__zu-taste {
  opacity: 0.45;
}

/*
 * DIE FERNBEDIENUNGSÜBERSICHT
 *
 * Zwei Spalten: links die Taste, rechts, was sie tut. Die linke Spalte ist so
 * breit wie ihr längster Eintrag ("1 then 0 … 5") und nicht breiter — die
 * rechte trägt die Sätze, und die sollen nicht umbrechen müssen.
 *
 * `dl` und nicht `table`: es ist eine Liste von Begriffen mit Erklärung und
 * keine Tabelle mit Spaltenbedeutung. Ein Vorleser sagt dann "Taste Stern —
 * Undo the last entry" und nicht "Zeile 7, Spalte 1".
 */
.belegung {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: 0.5dvh 1.6vw;
  margin: 0;
}

.belegung__taste {
  color: var(--accent, #00afee);
  font-size: min(2.2dvh, 1.8vw);
  font-weight: 800;
  letter-spacing: 0.04em;
  white-space: nowrap;
}

.belegung__was {
  margin: 0;
  color: var(--ink-dim, #93a1b3);
  font-size: min(2.2dvh, 1.8vw);
  font-weight: 600;
}

/*
 * Kleiner und blasser als die Belegung darüber: sie ist eine Fussnote und
 * kein Punkt der Liste. Maße in dvh und vw wie überall auf der Tafel — die
 * Begründung steht an `.board` in [table].vue.
 */
.belegung__fassung {
  margin: 1dvh 0 0;
  color: var(--ink-dim, #93a1b3);
  font-size: min(1.8dvh, 1.4vw);
  font-weight: 600;
  opacity: 0.7;
}

.menue__fehler {
  margin: 0;
  color: var(--color-danger, #ff5b5b);
  font-size: min(2.2dvh, 1.8vw);
  font-weight: 700;
  text-align: center;
}

/* ---- Die Punkte ---- */
.menue__inhalt {
  display: flex;
  flex: 1 1 auto;
  flex-direction: column;
  gap: 1.6dvh;
  /*
   * Scrollen ist hier ausdrücklich erlaubt — anders als auf der Tafel. Das
   * Menü wächst mit jedem Punkt, den es bekommt (Verwarnungen, Shot-Clock),
   * und auf einem 1024er Tablet quer ist die Höhe knapp. Ein Punkt, der
   * unten abgeschnitten wird, ist schlimmer als eine Liste, die sich
   * schieben lässt.
   */
  overflow-y: auto;
}

.menue__block {
  display: flex;
  flex-direction: column;
  gap: 0.8dvh;
}

.menue__ueber {
  margin: 0;
  color: var(--ink-dim, #93a1b3);
  font-size: min(2dvh, 1.6vw);
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}

/*
 * Zwei Spalten in der Lage der Tafel: links der linke Spieler, rechts der
 * rechte. Dieselbe Begründung wie bei der Zählleiste — wer auf den Namen
 * oben links schaut, greift unten links.
 */
.menue__paar {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1.2vw;
}

/* ---- Die Verwarnungen ----
 *
 * DIE FARBE IST DIE AUSSAGE, DAS WORT IST DIE ABSICHERUNG. Rot-Gruen-Blindheit
 * trifft jeden zwoelften Mann, und Schiedsrichter sind ueberwiegend Maenner;
 * eine Flaeche, deren einzige Auskunft in ihrer Farbe liegt, waere fuer sie
 * leer. Deshalb steht das Wort daneben und nicht nur der Farbton.
 *
 * SCHWARZ BEKOMMT EINEN RAHMEN. Auf dem dunklen Grund des Vorhangs ist eine
 * schwarze Flaeche keine Flaeche mehr -- sie saehe aus wie ein Fehler in der
 * Darstellung, und zwar ausgerechnet im schwersten Fall.
 */
.karten__seite {
  display: flex;
  flex-direction: column;
  gap: 0.8dvh;
}

.karten__mensch {
  display: flex;
  flex-direction: column;
  gap: 0.6dvh;
}

.karten__stand {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 1vw;
  padding: 0.9dvh 1.2vw;
  border: 2px solid transparent;
  border-radius: 0.9dvh;
  background: #16202f;
}

.karten__name {
  overflow: hidden;
  font-size: min(2.1dvh, 1.7vw);
  font-weight: 700;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.karten__wort {
  flex: none;
  font-size: min(1.9dvh, 1.5vw);
  font-weight: 800;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.karten__stand--none { color: var(--ink-dim, #93a1b3); }

.karten__stand--green {
  border-color: #2e9e4f;
  background: #14301d;
  color: #7ee29b;
}

.karten__stand--yellow {
  border-color: #d2a017;
  background: #322709;
  color: #ffd75e;
}

.karten__stand--red {
  border-color: #c0392b;
  background: #33120e;
  color: #ff8a7a;
}

.karten__stand--black {
  border-color: #93a1b3;
  background: #05070b;
  color: #e6edf5;
}

.karten__hinweis {
  margin: 0;
  color: var(--ink-dim, #93a1b3);
  font-size: min(1.8dvh, 1.5vw);
  line-height: 1.3;
}

/*
 * Die Anlassliste klappt UNTER der Flaeche auf, die sie geoeffnet hat, und
 * nicht als Vorhang ueber dem Menue. Der Schiedsrichter soll waehrend der
 * Wahl weiter sehen, auf welchem Stand der Spieler steht -- das ist die
 * Angabe, aus der die Folge entsteht.
 */
.anlass {
  display: flex;
  flex-direction: column;
  gap: 0.4dvh;
  margin: 0;
  padding: 0;
  list-style: none;
}

.anlass__zeile {
  display: flex;
  flex-direction: column;
  gap: 0.2dvh;
  width: 100%;
  padding: 0.7dvh 1vw;
  border: 0;
  border-left: 0.5vw solid transparent;
  border-radius: 0.5dvh;
  background: #101825;
  color: inherit;
  font: inherit;
  text-align: left;
  cursor: pointer;
}

.anlass__zeile:disabled { opacity: 0.4; }

.anlass__zeile--green { border-left-color: #2e9e4f; }
.anlass__zeile--yellow { border-left-color: #d2a017; }
.anlass__zeile--red { border-left-color: #c0392b; }

.anlass__text {
  font-size: min(1.9dvh, 1.55vw);
  font-weight: 600;
}

/*
 * Was daraus folgt, steht schon in der Liste und nicht erst in der
 * Rueckfrage: "Bodo gets a rack" neben dem Anlass ist der Unterschied
 * zwischen einer Wahl und einem Versuch.
 */
.anlass__folge {
  color: var(--ink-dim, #93a1b3);
  font-size: min(1.6dvh, 1.3vw);
}

/* ---- Der Verlauf ----
 *
 * Drei Spalten: wie lange her, was war, wie stand es danach. Die Zeit links,
 * weil daran entlang gesucht wird ("das war doch vor fünf Minuten"), der
 * Stand rechts in einer eigenen Spalte, damit die Zahlen untereinander
 * stehen und man die Sätze von oben nach unten abzählen kann.
 */
.verlauf {
  margin: 0;
  padding: 0;
  list-style: none;
}

.verlauf__reihe {
  display: grid;
  align-items: baseline;
  grid-template-columns: 6.5em 1fr auto;
  gap: 0 1.2vw;
  padding: 0.55dvh 0;
  border-bottom: 1px solid var(--line, #1b2432);
  font-size: min(2.3dvh, 1.9vw);
  line-height: 1.25;
}

.verlauf__reihe:last-child {
  border-bottom: 0;
}

.verlauf__zeit {
  display: flex;
  align-items: baseline;
  gap: 0.6vw;
}

.verlauf__her {
  font-weight: 700;
}

/* Die Uhrzeit ist die Angabe fürs Protokoll und nicht die für den Blick. */
.verlauf__uhr {
  color: var(--ink-dim, #93a1b3);
  font-size: 0.78em;
}

.verlauf__was {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/*
 * DER NAME — LEISE UND AUF DERSELBEN ZEILE.
 *
 * Keine eigene Spalte: sie stünde an vier von zwanzig Zeilen und liesse die
 * übrigen sechzehn mit einer Lücke dastehen. Am Tisch wird der Verlauf von
 * oben nach unten überflogen, und eine Spalte, die meistens leer ist, macht
 * aus dem Überfliegen ein Suchen.
 *
 * In `--ink-dim` wie die Uhrzeit daneben: es ist die Angabe, die man liest,
 * WENN man sie braucht, und nicht die, mit der man ankommt.
 */
.verlauf__wer {
  margin-left: 0.6em;
  color: var(--ink-dim);
  font-weight: 600;
}

.verlauf__stand {
  font-weight: 800;
  letter-spacing: 0.02em;
}

.verlauf__zeile,
.verlauf__leer {
  margin: 0;
  color: var(--ink-dim, #93a1b3);
  font-size: min(2.2dvh, 1.8vw);
}

.verlauf__leer {
  display: flex;
  align-items: center;
  gap: 1.5vw;
}

/*
 * Der Knopf ist kein Zählfeld und sieht auch nicht so aus — er ist flacher
 * und blasser. Die Mindesthöhe für einen Daumen gilt trotzdem: er wird im
 * Stehen getroffen wie alles hier.
 */
.verlauf__mehr {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1.2vw;
  min-height: max(5dvh, 44px);
  padding: 0 2vw;
  border: 2px solid var(--line, #1b2432);
  border-radius: 1dvh;
  background: transparent;
  color: var(--ink-dim, #93a1b3);
  font-family: inherit;
  font-size: min(2dvh, 1.6vw);
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  cursor: pointer;
  touch-action: manipulation;
}

/*
 * Der Hinweis steht NUR am aufgeklappten Verlauf: dort ist die Frage "geht
 * mir der Schirm gleich zu?" berechtigt, und die Antwort gehört an die
 * Stelle, an der sie entsteht.
 */
.verlauf__ruhe {
  color: var(--accent, #00afee);
  font-size: 0.85em;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: none;
}

/* ---- Die Rückfrage ---- */
.frage {
  position: absolute;
  right: 2.5vw;
  bottom: 2dvh;
  left: 2.5vw;
  display: flex;
  flex-direction: column;
  gap: 1.2dvh;
  padding: 2.4dvh 2.5vw;
  border: 2px solid var(--accent, #00afee);
  border-radius: 1.4dvh;
  background: #0b1220;
  box-shadow: 0 -1dvh 4dvh rgba(0, 0, 0, 0.7);
}

.frage__kopf {
  margin: 0;
  font-size: min(3.2dvh, 2.6vw);
  font-weight: 800;
  letter-spacing: 0.03em;
}

.frage__text {
  margin: 0;
  color: var(--ink-dim, #93a1b3);
  font-size: min(2.2dvh, 1.8vw);
  line-height: 1.35;
}

.frage__tasten {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1.2vw;
}
</style>
