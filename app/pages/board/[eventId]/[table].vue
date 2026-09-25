<script setup lang="ts">
import type { Match, MatchSide, MatchStatus, SponsorRank, TableBoard } from '~~/shared/types/api'
import type { Seite, Standpaar, Zusatz } from '~/composables/useZaehlwerk'

/**
 * DIE MARKE DER TAFEL SELBST — UND KEINE ZWEITE DAHINTER
 *
 * epbf-website kannte hier `useTenant()`, weil dieselbe Tafel auf der Seite
 * eines Verbands lief und dessen Namen als Rückfall zeigen konnte. Diese
 * Tafel läuft für sich (siehe LIESMICH.md) und hat keinen Verband, dessen
 * Namen sie zeigen müsste — nur ihren eigenen, denselben, den auch das
 * Installations-Manifest trägt (server/routes/board.webmanifest.get.ts).
 */
const MARKENNAME = 'BitsButler Scoreboard'
const MARKENKUERZEL = 'Scoreboard'

/**
 * Die Anzeigetafel am Tisch.
 *
 * Ein Fernseher, ein Tablet oder ein ausrangierter Laptop steht neben dem
 * Billard und zeigt den Stand der Partie, die dort gerade gespielt wird.
 * Er wird einmal eingerichtet und läuft danach tagelang ohne Bedienung.
 *
 * FÜR JEDEN EINE ANSICHT — UND FÜR EIN ANGEMELDETES GERÄT AUCH EIN ZÄHLGERÄT
 *
 * Bis zum 14.09.2026 stand hier "das ist eine Ansicht und keine Bedienung".
 * Das war richtig für den Bildschirm an der Wand und falsch für das Tablet
 * auf dem Ständer neben dem Tisch: DORT wird der Stand eingegeben, und zwar
 * seit Jahren, im Vorgängersystem über eine Fernbedienung mit Zifferblock.
 *
 * Beides ist dieselbe Seite, und der Unterschied ist die Anmeldung:
 *
 *   - Ohne Anmeldung ist alles unverändert. Kein Menü, keine Fußzeile, kein
 *     Verweis, keine Eingabe. Die Adresse ist mit Absicht ohne Anmeldung
 *     erreichbar — ein Bildschirm in einer Halle soll nach einem Stromausfall
 *     von selbst wieder etwas zeigen.
 *   - Mit angemeldetem Gerät und `match/U` an dieser Veranstaltung kommt
 *     unten die Zählleiste dazu (BoardZaehlleiste). Sie ist das, was die
 *     Fernbedienung war, nur als Fläche.
 *
 * Dass die Flächen fehlen, ist KEINE Sicherung — die liegt in der Anwendung,
 * die jeden Schreibzugriff ohne Recht mit 403 abweist. Was hier entschieden
 * wird, ist nur, ob ein Bildschirm im Saal wie ein Formular aussieht.
 *
 * Alles, was auf der Tafel steht, steht ohnehin auf /livescores. Wer die
 * Adresse kennt, sieht nichts, was er nicht auch dort sähe.
 *
 * DIE ADRESSE NENNT DEN TISCH UND NICHT DIE PARTIE
 *
 * /board/<eventId>/<tischnummer>. Sie wird beim Aufbau einmal eingetippt und
 * danach nie wieder angefasst — deshalb darf in ihr nichts stehen, was sich
 * im Lauf des Turniers ändert. Welche Partie an diesem Tisch steht,
 * beantwortet die Anwendung bei jedem Abruf neu; wechselt die Partie,
 * wechselt die Anzeige von selbst.
 *
 * WARUM NACHFRAGEN UND NICHT ZUHÖREN
 *
 * Ein Ereignisrohr gibt es nicht: weder die Anwendung noch diese Seite
 * kennen SSE oder WebSocket, und `live.device` (docs/09) ist Entwurf und
 * nichts, was heute läuft. Eines dafür zu bauen hieße, eine dauerhafte
 * Verbindung je Bildschirm zu halten und den Abriss danach selbst zu
 * behandeln — für eine Auskunft, die sich in Minuten ändert.
 *
 * Nachfragen ist hier das Richtige, und der Abstand ist gemessen und nicht
 * geraten: ein Satz im 9-Ball dauert selten unter drei Minuten, ein
 * Aufnahmestoß selten unter dreißig Sekunden. Zehn Sekunden heißt also,
 * dass ein neuer Satzstand im schlechtesten Fall zehn Sekunden später oben
 * steht — im Saal sieht man ihn dann ungefähr so schnell wie die Kugel
 * fallen. Eine Sekunde wäre sechsmal so viel Last für nichts; eine Minute
 * wäre der Stand von vorhin, und die Zuschauer neben dem Tisch merken das
 * sofort.
 *
 * Sie hält NICHT an, wenn der Reiter in den Hintergrund gerät — anders als
 * /livescores. Ein Bildschirm in der Halle hat keinen Vordergrund; wenn der
 * Browser ihn für verborgen hält, ist er es trotzdem nicht.
 */
definePageMeta({
  /*
   * Ohne Rahmen. Das Standardlayout bringt Kopfzeile, Menü, Sponsorenband
   * und Fußzeile mit — auf einem Bildschirm, der aus fünf Metern gelesen
   * wird, ist das alles nur Fläche, die dem Satzstand fehlt.
   */
  layout: false,
})

const route = useRoute()
const eventId = String(route.params.eventId ?? '')
const tischNummer = Number.parseInt(String(route.params.table ?? ''), 10)
const adresse = `/api/events/${encodeURIComponent(eventId)}/tables/${tischNummer}`

/**
 * DER LETZTE STAND DIESES TISCHES — DAMIT EIN NEULADEN OHNE NETZ IHN FINDET.
 *
 * Seit dem 25.09.2026 übersteht ein nicht gesendeter Stand einen Netzausfall
 * (`merkposten` in useZaehlwerk.ts) — aber nur, solange die Anwendung im
 * Speicher des Geräts bleibt. Ein NEULADEN ohne Netz kennt bis hierher noch
 * nicht einmal die PARTIE an diesem Tisch: die kommt aus genau dem Abruf,
 * der gerade fehlschlägt. Ohne Partie sieht `merkpostenWiederherstellen`
 * (useZaehlwerk.ts, ausgelöst über den Beobachter auf `partie.value.id`)
 * nichts, was es wiederherstellen könnte — der Schiedsrichter stünde vor
 * einer Tafel, die "kein Spiel" zeigt, während am Tisch längst weitergezählt
 * wird.
 *
 * Deshalb legt jeder ERFOLGREICHE Abruf seine Antwort hier ab, tischgenau
 * und ohne alles, was nicht ohnehin öffentlich wäre: `TableBoard` ist
 * WÖRTLICH das, was auch ein Zuschauer ohne Anmeldung auf /livescores sieht
 * (siehe die Begründung weiter oben, "Alles, was auf der Tafel steht…").
 * Anders als der Personencode in `merkposten` (siehe dort, Fund vom
 * 25.09.2026, Commit "kein Personencode im Speicher eines Tablets, das
 * herumliegt") steht hier also nichts, das auf einem herumliegenden Tablet
 * nichts verloren hätte.
 */
function tafelSchluessel(): string {
  return `bb.board.snapshot.${eventId}.${tischNummer}`
}

function tafelSpeichern(wert: TableBoard) {
  try {
    window.localStorage.setItem(tafelSchluessel(), JSON.stringify(wert))
  }
  catch {
    // Kein Speicher — dann eben ohne dieses Netz, wie zuvor diese Ergänzung.
  }
}

function tafelGelesen(): TableBoard | null {
  try {
    const roh = window.localStorage.getItem(tafelSchluessel())
    return roh ? JSON.parse(roh) as TableBoard : null
  }
  catch {
    return null
  }
}

/**
 * Der erste Stand kommt vom Server, damit der Bildschirm nach dem Einschalten
 * sofort etwas zeigt und nicht erst nach dem ersten Abruf des Browsers.
 *
 * Ein Fehler dabei wirft NICHT. Eine Anwendung, die im Moment des Aufbaus
 * gerade neu startet, ergäbe sonst eine Fehlerseite, die für immer stehen
 * bliebe — niemand geht durch die Halle und lädt zwanzig Bildschirme neu.
 * Nur eine Veranstaltung, die es nicht gibt, wird gemeldet: das ist ein
 * Vertipper in der Adresse, und den soll der Aufbau sehen.
 *
 * SCHLÄGT ER FEHL UND IST ES KEIN VERTIPPER, ist es entweder ein Backend, das
 * gerade neu startet, oder — seit dem Service Worker — ein Gerät, das ganz
 * ohne Netz neu geladen wurde. In beiden Fällen ist der zuletzt gespeicherte
 * Stand DIESES Tisches (`tafelGelesen`) die bessere Grundlage als gar keine:
 * er trägt die Partie, ohne die weder gezählt noch ein Merkposten
 * wiedergefunden werden kann. `import.meta.client`, weil es serverseitig
 * (beim gewöhnlichen SSR-Aufruf) kein `localStorage` gibt und ein
 * fehlschlagender Abruf dort ohnehin am Backend liegt, nicht am Netz dieses
 * einen Geräts.
 */
const { data: erste } = await useAsyncData(
  `board-${eventId}-${tischNummer}`,
  async () => {
    try {
      return { tafel: await $fetch<TableBoard>(adresse), unbekannt: false, ausSpeicher: false }
    }
    catch (fehler: unknown) {
      const unbekannt = (fehler as { statusCode?: number }).statusCode === 404
      const gespeichert = !unbekannt && import.meta.client ? tafelGelesen() : null
      return { tafel: gespeichert, unbekannt, ausSpeicher: gespeichert !== null }
    }
  },
)

const stand = ref<TableBoard | null>(erste.value?.tafel ?? null)
const unbekannt = ref(erste.value?.unbekannt ?? false)

/**
 * Zeigt die Tafel gerade den gespeicherten Stand aus `tafelGelesen`, und
 * nicht eine Antwort, die dieses Gerät wirklich gerade bekommen hat?
 *
 * Sie hält `zuletzt` unten ausdrücklich auf `null` — der gespeicherte Stand
 * ist per Definition nicht "gerade eben angekommen", und der
 * Verbindungspunkt (`verbindungWeg`) soll genau deshalb nach der üblichen
 * Frist "no connection" zeigen, auch wenn oben längst wieder eine Zahl
 * steht.
 */
const ausSpeicher = ref(erste.value?.ausSpeicher ?? false)

/**
 * Wann zuletzt eine ECHTE Antwort vom Server ankam. Grundlage für den
 * Verbindungspunkt unten rechts — und der einzige Grund, warum der
 * überhaupt nötig ist: wer vor der Tafel steht, soll unterscheiden können
 * zwischen "es steht 5:4" und "es stand vor einer Viertelstunde 5:4".
 *
 * Bleibt `null`, solange der erste Stand aus dem Speicher kommt
 * (`ausSpeicher`) — sonst zeigte die Tafel eine soeben verstrichene Sekunde,
 * obwohl in Wahrheit niemand geantwortet hat.
 */
const zuletzt = ref<number | null>(erste.value?.tafel && !ausSpeicher.value ? Date.now() : null)
const jetzt = ref(Date.now())

/**
 * Wann diese Seite aufgebaut wurde — die Grundlage für `verbindungWeg`,
 * solange `zuletzt` noch nie gesetzt war. Siehe dort.
 */
const gestartet = Date.now()

const ABSTAND_MS = 10_000

/**
 * Die öffentliche Tafelantwort — der Stand, den jeder sieht.
 *
 * Der bestehende Stand wird NUR bei Erfolg ersetzt. Bricht das Netz ab, bleibt
 * die letzte Anzeige stehen — ein schwarzer Bildschirm neben einem laufenden
 * Halbfinale ist schlimmer als ein Stand, der eine Minute alt ist. Aus
 * demselben Grund wird der Fehler nicht angezeigt: er ginge die Zuschauer
 * nichts an, und beim nächsten gelungenen Abruf ist er ohnehin vorbei.
 */
async function tafelHolen() {
  try {
    stand.value = await $fetch<TableBoard>(adresse)
    unbekannt.value = false
    ausSpeicher.value = false
    zuletzt.value = Date.now()
    tafelSpeichern(stand.value)
  }
  catch (fehler: unknown) {
    // Eine Veranstaltung, die es nicht (mehr) gibt, ist die Ausnahme: daran
    // ändert kein weiterer Versuch etwas, und sie gehört auf den Schirm.
    if ((fehler as { statusCode?: number }).statusCode === 404 && !stand.value) {
      unbekannt.value = true
    }
  }
}

/**
 * Ein Abruf — BEIDE Abfragen NEBENEINANDER.
 *
 * Bis zum 14.09.2026 lief die zweite erst, wenn die erste fertig war, und
 * dafür gab es einen Grund: "die Tafel zeigt zuerst, was jeder sieht". Der
 * Grund ist gewahrt, die Reihenfolge war nur nie das Mittel dazu — jede der
 * beiden setzt ihr Ergebnis, sobald sie es hat, und die öffentliche Antwort
 * ist die kleinere und ohnehin zuerst da. Was das Nacheinander wirklich
 * kostete, sah man erst über eine schlechte Leitung: ZWEI volle Umläufe je
 * Takt, und nach jedem Tastendruck noch einmal dieselben zwei obendrauf.
 *
 * `Promise.all` kann hier nicht abbrechen, weil beide ihren Fehler selbst
 * behalten — eine gescheiterte Zusatzabfrage darf die Tafel nicht aufhalten,
 * und umgekehrt genauso.
 */
async function holen() {
  await Promise.all([tafelHolen(), zusatzHolen()])
}

/**
 * ZURÜCK ZUR TISCHWAHL — UNSICHTBAR UND MIT ABSICHT
 *
 * Ein Schirm wandert im Lauf eines Turniers an einen anderen Tisch, und dann
 * muss jemand ihm das sagen können, ohne eine Adresse mit einer UUID darin
 * neu zu tippen.
 *
 * Trotzdem KEIN Knopf auf der Tafel. Sie ist eine Ansicht und keine
 * Bedienung; ein sichtbares "Tisch wechseln" neben einem laufenden Halbfinale
 * ist eine Einladung an jeden, der vorbeigeht, und eine Tafel, die plötzlich
 * eine Auswahl zeigt, sieht im Saal aus wie ein Defekt.
 *
 * BIS ZUM 14.09.2026 LAG ER AUF DER TASTE 0 UND AUF EINEM LANGEN DRUCK, und
 * beide lösten ihn SOFORT aus. Der Auftraggeber: "taste 0 ist zu einfach für
 * den tischwechsel". Er hat recht — eine Fernbedienung, die im Vorbeigehen
 * gestreift wird, warf den Schirm aus einem laufenden Halbfinale, und was
 * dann kam, sah im Saal aus wie ein Ausfall.
 *
 * Jetzt führt beides ins SCHIEDSRICHTER-MENÜ, und der Tischwechsel ist dort
 * ein Punkt unter anderen — mit einer Rückfrage davor. Aus einem Griff sind
 * drei geworden, und keiner der drei ist schwerer zu treffen als vorher.
 *
 * Der gemerkte Tisch wird beim Wechsel VERGESSEN. Sonst spränge die Auswahl
 * sofort wieder auf denselben Tisch zurück, und der Weg führte ins Leere.
 */
const merkschluessel = `bb.board.table.${eventId}`

function zurueckZurWahl() {
  try {
    window.localStorage.removeItem(merkschluessel)
  }
  catch {
    // Kein Speicher, nichts zu vergessen — die Auswahl kommt trotzdem.
  }
  navigateTo(`/board/${eventId}`)
}

/**
 * DIE TASTENBELEGUNG DES VORGÄNGERSYSTEMS — übernommen, und im Straight Pool
 * seit dem 16.09.2026 erweitert.
 *
 * In den Hallen liegen Fernbedienungen mit Zifferblock, und die Belegung ist
 * dort keine Liste, die man auswendig lernt, sondern eine LAGE: die 7 liegt
 * links oben und zählt links hoch, die 9 rechts oben und zählt rechts hoch,
 * die 1 und die 3 darunter nehmen zurück, die 4 und die 6 in der Mitte sind
 * die Auszeiten der beiden Seiten. Wer seit Jahren zählt, hat das in der
 * Hand und nicht im Kopf — und die Zählleiste unten ist genau diese Lage
 * noch einmal, als Fläche.
 *
 * Deshalb bleibt sie gültig, und deshalb steht die Ziffer klein in der Ecke
 * jeder Fläche: wer das Tablet bedient, lernt die Fernbedienung nebenbei,
 * und umgekehrt.
 *
 * Was hinzukommt, weil es das Vorbild nicht hat: die Sterntaste nimmt die
 * letzte Eingabe zurück. Der Zifferblock hat sie, sie ist mit nichts belegt,
 * und ein Fehltipper vor Publikum soll sich mit einem Druck erledigen.
 *
 * DIE 0 ÖFFNET DAS SCHIEDSRICHTER-MENÜ — ABER ERST BEIM ZWEITEN DRUCK.
 *
 * Sie war schon die Taste, mit der man diese Partie verliess; das bleibt sie
 * dem Gefühl nach, nur führt sie jetzt in ein Menü statt direkt hinaus. Wer
 * sie seit Jahren dafür drückt, muss nichts Neues lernen — er drückt
 * zweimal.
 *
 * WARUM ZWEIMAL UND NICHT EINMAL: das ist die Vorgabe ("taste 0 ist zu
 * einfach"). Ein zweiter Druck binnen anderthalb Sekunden ist keine Hürde
 * für jemanden, der ihn will, und eine für alles, was von selbst passiert:
 * eine gestreifte Fernbedienung, eine Taste, die klemmt, ein Gerät in der
 * Tasche. Die Wiederholung des Betriebssystems (`ev.repeat`) wird dabei
 * ausdrücklich NICHT gezählt — sonst öffnete eine festgehaltene Taste das
 * Menü doch wieder mit einem einzigen Griff.
 *
 * WARUM NICHT EINE ANDERE TASTE. Im Vorgängersystem sind 0 1 3 4 5 6 7 9
 * + - / R F Enter und Escape belegt; frei sind nur die 2, die 8 und die
 * Buchstaben ausser R und F. Die 2 und die 8 liegen mitten im Zählfeld
 * (zwischen 1 und 3 beziehungsweise unter der 5) — die Taste für "Menü
 * neben einem laufenden Halbfinale" darf nicht die sein, neben die man beim
 * Zählen greift. Und R gehört der Shot-Clock: sie bestätigt sie dort seit
 * Jahren, und wenn dieser Punkt hier ankommt, soll er dieselbe Taste haben.
 *
 * SEIT DEM 16.09.2026 IST ER ANGEKOMMEN, UND R IST BELEGT. Sie bestätigt
 * die angeordnete Shot-Clock — dieselbe Taste, dieselbe Handlung wie im
 * Vorgängersystem. Sie tut nur dann etwas, wenn wirklich eine unbestätigte
 * Anordnung vorliegt, und ist sonst still; eine Taste, die auf Verdacht
 * schreibt, gibt es hier nicht.
 *
 * SIE IST DER ZWEITE WEG UND NICHT DER ERSTE. Der erste ist das
 * Schiedsrichtermenü (siehe Schirimenue.vue, Abschnitt DIE SHOT-CLOCK), denn
 * am Tisch steht ein Tablet ohne Tastatur. R ist für die Hallen, in denen
 * eine Fernbedienung liegt — und dort ist sie KEIN zweites Geheimnis,
 * sondern das alte: wer zehn Jahre mit diesen Geräten gearbeitet hat, greift
 * ohnehin danach.
 *
 * WARUM NICHT ESCAPE: auf manchen Fernsehern ist sie vom Browser belegt,
 * und auf einer Fernbedienung mit Zifferblock gibt es sie gar nicht.
 *
 * SOLANGE DAS MENÜ OFFEN IST, ZÄHLT KEINE TASTE. Hinter dem Vorhang liegt
 * die Leiste, und ein Druck auf die 7, der dort ankäme, zählte einen Satz,
 * den niemand gespielt hat. Nur die 0 kommt durch — sie macht zu.
 *
 * IM STRAIGHT POOL GILT EINE EIGENE BELEGUNG — UND SIE MUSSTE ES.
 *
 * Alles oben Beschriebene ist die Belegung der SATZTAFEL, und sie passt auf
 * 14.1 endlos nicht: dort ist der häufigste Vorgang keine Erhöhung um eins,
 * sondern die Frage „wie viele Kugeln liegen noch?", und ihre Antwort ist
 * eine Zahl zwischen 1 und 15. Solange 7, 9, 1 und 3 die Richtigstellung um
 * je einen Punkt waren, war die ganze Kugelreihe über die Fernbedienung
 * nicht erreichbar — der Schiedsrichter musste den Schirm anfassen, und
 * genau danach hat der Auftraggeber gefragt.
 *
 * Die Ziffern gehören im Straight Pool deshalb den Kugeln. Was das für die
 * Richtigstellung heisst, warum die Eins manchmal auf eine zweite Ziffer
 * wartet und wo die seltenen Vorgänge liegen, steht bei `spTaste` in
 * Zaehlleiste.vue — dort, wo die Lage am Tisch bekannt ist.
 *
 * Die 0, das R und der lange Druck bleiben davon unberührt: sie gelten an
 * jeder Tafel gleich, und ein Schiedsrichter, der zwischen zwei Disziplinen
 * wechselt, soll die Wege aus einer Partie heraus nicht zweimal lernen.
 *
 * DASS `/` UND `ENTER` IM VORGÄNGERSYSTEM SCHON BELEGT WAREN, steht dem
 * nicht entgegen — sie gehörten dort dem Eingabefeld für eine ganze
 * Aufnahme, und das ist genau die Bedienung, die hier durch die Kugelreihe
 * ERSETZT wird. Doppelt belegt ist damit nichts.
 */
const menueOffen = ref(false)

/** Wann die 0 zuletzt gedrückt wurde; siehe oben. */
let nullZuletzt = 0
const NULL_FENSTER_MS = 1500

/**
 * WAS VOM ZIFFERBLOCK WIRKLICH ANKOMMT.
 *
 * `ev.key` ist bei den vier Rechenzeichen und den Ziffern über alle Geräte
 * gleich ('+', '-', '*', '/', '0'…'9'), beim PUNKT aber nicht: dieselbe
 * Taste heisst auf einer deutschen Belegung ',' und auf einer englischen
 * '.'. Und das Enter des Blocks heisst zwar überall 'Enter', kommt aber mit
 * `code` 'NumpadEnter' statt 'Enter'.
 *
 * Gefragt wird deshalb ZUERST `ev.code`: der sagt, WELCHE Taste gedrückt
 * wurde, und ist von der eingestellten Belegung unabhängig. Nur wenn er
 * fehlt — ältere Fernbedienungen schicken ihn nicht immer —, zählt `ev.key`,
 * und dort wird das Komma auf den Punkt gelegt.
 *
 * Nicht belegt sind NumLock und Backspace: die erste schaltet den Block auf
 * Pfeiltasten um (danach kämen gar keine Ziffern mehr an), die zweite gibt
 * es auf den Fernbedienungen in den Hallen nicht.
 */
function tafeltastenwert(ev: KeyboardEvent): string {
  switch (ev.code) {
    case 'NumpadDivide': return '/'
    case 'NumpadMultiply': return '*'
    case 'NumpadSubtract': return '-'
    case 'NumpadAdd': return '+'
    case 'NumpadDecimal': return '.'
    case 'NumpadEnter': return 'Enter'
    default: return ev.key === ',' ? '.' : ev.key
  }
}

function tafelTaste(ev: KeyboardEvent) {
  // Eine Taste, die das Betriebssystem wiederholt, ist EIN Druck.
  if (ev.repeat) return

  // Wer tippt, obwohl es nicht geht, bekommt den Grund noch einmal zu
  // lesen — und zwar vor der Prüfung auf Eingabefelder, denn auch ein
  // Tippen ins Leere ist ein Versuch, das Gerät zu bedienen.
  if (hindernisGrund.value) hindernisBis.value = Date.now() + MELDUNG_MS

  /*
   * WER IN EIN FELD TIPPT, ZÄHLT NICHT.
   *
   * Seit die Rückfrage nach sechs Ziffern fragt (Personencode für No-Show
   * und Forfeit), gibt es auf dieser Seite ein Eingabefeld. Ohne diese
   * Zeile fängt der Tafelgriff die Ziffern ab, bevor sie ankommen — und
   * die 0 ist die schlimmste davon: sie wird ganz oben behandelt und macht
   * das Menü ZU. Ein Personencode mit einer Null darin — also jeder
   * zehnte — hätte die Rückfrage beim Tippen weggeklappt, und der
   * Bediener hätte nicht erkennen können, warum.
   *
   * Gefragt wird das Ziel des Ereignisses und nicht, ob gerade ein Feld
   * existiert: der Griff hängt am document, und was dort ankommt, kann
   * überall herkommen.
   */
  const ziel = ev.target as HTMLElement | null
  if (ziel && (ziel.tagName === 'INPUT' || ziel.tagName === 'TEXTAREA'
               || ziel.isContentEditable)) {
    return
  }

  const taste = tafeltastenwert(ev)

  /*
   * DIE GESTE IST ZWEIMAL 0 — UND ZWAR ZWEIMAL HINTEREINANDER.
   *
   * Jede andere Taste löscht den angefangenen Doppeldruck. Ohne diese Zeile
   * ist `nullZuletzt` ein Zeitstempel, der eine Sekunde lang stehen bleibt,
   * egal was dazwischen passiert: 0 · 7 · 0 in einer Sekunde klappte das
   * Schiedsrichtermenü über einer laufenden Partie auf, obwohl zwischen den
   * beiden Nullen ein Punkt gebucht wurde. Wer eine Taste drückt, die etwas
   * tut, ist nicht mitten in einer Geste.
   *
   * Die 0 selbst ist ausgenommen — sie IST die Geste und wird unten
   * behandelt.
   */
  if (taste !== '0') nullZuletzt = 0

  /*
   * DIE ANGEFANGENE EINGABE HAT VORRANG VOR DER 0 — UND NUR DANN.
   *
   * Im Straight Pool ist die 0 die zweite Ziffer der Zehn. Stünde die
   * Behandlung des Schiedsrichtermenüs davor, liesse sich die Zehn nicht
   * eintragen, und zweimal 1-0 hintereinander klappte mitten im Rack das
   * Menü auf.
   *
   * Umgekehrt darf die Abfrage NICHT unbedingt vorn stehen: solange nichts
   * aussteht, gehört die 0 dem Menü, und das muss auch im Straight Pool
   * erreichbar bleiben. Deshalb die Frage nach `spWartet()`.
   */
  if (!menueOffen.value && zaehlen.value && modus.value === 'STRAIGHT_POOL'
    && leiste.value?.spWartet() && leiste.value.spTaste(taste)) {
    /*
     * UND DIE 0, DIE HIER ALS ZIFFER VERBRAUCHT WURDE, ZÄHLT NICHT FÜR DIE
     * GESTE.
     *
     * Dies ist der einzige Weg, auf dem eine 0 durchkommt, ohne die
     * Behandlung darunter zu sehen — sie ist dann die zweite Ziffer der
     * Zehn. Ohne diese Zeile blieb der Zeitstempel eines FRÜHEREN
     * 0-Drucks stehen, und der nächste Druck auf die 0 galt als
     * Doppeldruck:
     *
     *   0 (Fehlgriff) · 1 (Vorhang) · 0 (Ziffer, Rest 10 gebucht) · 0
     *
     * Der letzte Druck war der ERSTE der Geste und öffnete trotzdem das
     * Menü über der laufenden Partie.
     */
    nullZuletzt = 0
    ev.preventDefault()
    return
  }

  if (taste === '0') {
    if (menueOffen.value) {
      menueOffen.value = false
      nullZuletzt = 0
    }
    else if (Date.now() - nullZuletzt < NULL_FENSTER_MS) {
      menueOeffnen()
      nullZuletzt = 0
    }
    else {
      nullZuletzt = Date.now()
    }
    ev.preventDefault()
    return
  }

  if (menueOffen.value) return
  if (!zaehlen.value) return

  const w = zaehlwerk

  /*
   * R — DIE SHOT-CLOCK, WIE IM VORGÄNGERSYSTEM.
   *
   * VOR der Anstossfrage und vor dem Zählblock, und das ist der Grund: die
   * beiden darunter hören auf zu arbeiten, solange der Anstoß offen ist —
   * dann gelten nur 1 und 3. Eine Shot-Clock kann aber schon an einer Partie
   * hängen, die noch auf den Anstoß wartet (`assign_shot_clock` lässt READY
   * zu). Stünde R weiter unten, wäre sie ausgerechnet in der Lage tot, in
   * der die Partie ohnehin steht.
   *
   * OHNE RÜCKFRAGE: auf einer Fernbedienung gibt es keinen Vorhang, und wer
   * R drückt, hat sie gesucht. Die Rückfrage steht im Menü, wo derselbe
   * Punkt GEFUNDEN und nicht gewusst wird.
   *
   * Nur, wenn es etwas zu bestätigen gibt. Sonst wiese die Anwendung ohnehin
   * ab (SHOT_CLOCK_NOT_ASSIGNED) — aber eine rote Zeile für einen Griff ins
   * Leere ist am Tisch Lärm.
   *
   * Gross und klein: eine Fernbedienung schickt 'R', eine Tastatur ohne
   * Feststelltaste 'r'. Beide meinen dasselbe.
   */
  if (taste === 'r' || taste === 'R') {
    if (shotClockOffen.value) w.shotClockBestaetigen()
    ev.preventDefault()
    return
  }

  /*
   * SOLANGE EIN NICHT RÜCKNEHMBARER SCHREIBVORGANG UNTERWEGS IST, NIMMT DIE
   * TAFEL NICHTS AN.
   *
   * `laeuft` ist wahr, während `beenden`, `aufgeben` oder
   * `shotClockBestaetigen` läuft (useZaehlwerk). Jede Fläche der Leiste
   * trägt dabei `:arbeitet="laeuft"`, ist blass und gesperrt — die
   * Fernbedienung kam bis zum 16.09.2026 durch, und damit ging ein `7`
   * kurz nach einem `5` als Standänderung an eine Partie, die gerade
   * abgeschlossen wird.
   *
   * ES STEHT VOR DER ANSTOSSFRAGE, weil auch sie schreibt und ihre beiden
   * Flächen dieselbe Sperre tragen. Die Shot-Clock lässt sich an einer
   * Partie anordnen, die noch auf den Anstoss wartet — genau dort kann
   * `laeuft` vor dem Anstoss überhaupt wahr sein.
   *
   * DIE ANTWORT GIBT IM STRAIGHT POOL DIE LEISTE UND NICHT DIESE ZEILE.
   * Dort hat jede Taste eine Bedeutung, und `spTaste` weist selbst ab und
   * SAGT den Grund (`spGehtJetzt` in Zaehlleiste.vue) — das ist die Regel
   * dieser Fassung. Auf der Satztafel gibt es keine solche Zeile; dort
   * bleibt es beim Schlucken, wie bei jeder anderen Taste ohne Bedeutung
   * (`default: return` unten).
   */
  if (zaehlwerk.laeuft.value && modus.value !== 'STRAIGHT_POOL') {
    ev.preventDefault()
    return
  }

  /*
   * Der VORWEGGENOMMENE Anstoß und nicht der des Abrufs. Sonst hiesse zwei
   * schnelle Drücke auf die 1 zweimal "links stößt an" statt einmal — die
   * zweite Taste läse noch den Zustand von vor dem ersten.
   */
  const offen = !w.anstossStand.value.next

  // Solange der Anstoß offen ist, bedeuten 1 und 3 dasselbe wie im
  // whoBreaksModal des Vorbilds: links beginnt, rechts beginnt.
  if (offen) {
    if (taste === '1') w.anstoss(links.value)
    else if (taste === '3') w.anstoss(rechts.value)
    else return
    ev.preventDefault()
    return
  }

  /*
   * STRAIGHT POOL BEDIENT SICH SELBST — GANZ UND NICHT ZUR HÄLFTE.
   *
   * Der Block darunter ist die Belegung der SATZTAFEL (7/9/1/3 zählen, 4/6
   * Auszeit, 5 Wechsel oder Ende). Im Straight Pool heisst jede dieser
   * Ziffern etwas anderes — sie ist die Zahl der Kugeln, die noch liegen —,
   * und deshalb wird hier nicht ergänzt, sondern abgezweigt: `spTaste`
   * beantwortet im Straight Pool JEDE Taste, und es fällt nichts durch.
   *
   * Das ist ausdrücklich auch die Absicherung für die anderen beiden
   * Zählweisen: was unten steht, sehen sie unverändert, weil der Straight
   * Pool gar nicht mehr dorthin kommt.
   *
   * Die Kugelreihe braucht die Lage am Tisch (wie viele liegen, wer dran
   * ist), und die kennt die Leiste besser als diese Seite — darum liegt die
   * Entscheidung dort und hier nur der Griff.
   */
  if (modus.value === 'STRAIGHT_POOL') {
    if (leiste.value?.spTaste(taste)) ev.preventDefault()
    return
  }

  /*
   * AB DER DISTANZ WIRD NICHT MEHR GEZÄHLT — AUCH NICHT ÜBER DIE
   * FERNBEDIENUNG.
   *
   * Der Auftraggeber am 16.09.2026: „beim erreichen von race-to ist ende..
   * fertig". Die Flächen der Leiste sind dann gesperrt (`zaehlsperre` in
   * Zaehlleiste.vue); ohne diese Zeilen käme die Tastatur an ihnen vorbei,
   * und das ist der Weg, den auf einem Zählgerät die meisten nehmen.
   *
   * GESPERRT WIRD NUR, WAS NACH OBEN FÜHRT ODER SCHREIBT: 7/9 (+1), 4/6
   * (Auszeit) und die 5 in ihrer Bedeutung „Tisch weitergeben". Offen
   * bleiben — und das ist der ganze Entwurf:
   *
   *   `*` — das Undo. Der häufigste Weg in diesen Zustand ist ein
   *   Vertipper, und wer sich vertippt hat, muss zurück können.
   *
   *   1/3 — das Minus je Seite. Es IST eine Rücknahme und keine Korrektur
   *   (siehe `zaehlen` in useZaehlwerk): am Tisch gibt es genau zwei Wege
   *   abwärts, und beide heissen „der Tipp davor war falsch".
   *
   *   Die 5, solange sie „ja, fertig" heisst — die Sperre führt zum Finish
   *   hin und nicht von ihm weg. Sie steht deshalb unten in ihrem eigenen
   *   Zweig und nicht hier.
   *
   *   Der lange Druck ins Schiedsrichtermenü. Er hängt an der Tafel und
   *   nicht an dieser Belegung.
   *
   * ES WIRD GESCHLUCKT UND NICHT GESAGT, und das ist die Regel DIESER
   * Fassung und keine Nachlässigkeit: die Satztafel hat keine Meldungszeile
   * für Tastendrücke — `laeuft` und jede unbelegte Taste verschwinden hier
   * ebenso wortlos (`default: return`). Im Straight Pool ist es umgekehrt,
   * dort beantwortet `spGehtJetzt` jede Taste mit einem Grund; dort gibt es
   * die Zeile auch. Eine halbe Meldung an einer Stelle, die keine hat,
   * stünde entweder über den Namen der Spieler oder gar nicht.
   */
  const zuEnde = zaehlwerk.distanzErreicht.value

  switch (taste) {
    case '7': if (zuEnde) return; w.zaehlen('A', 1); break
    case '1': w.zaehlen('A', -1); break
    case '9': if (zuEnde) return; w.zaehlen('B', 1); break
    case '3': w.zaehlen('B', -1); break
    case '4': if (zuEnde) return; w.auszeit('A', !!auszeiten.value.A); break
    case '6': if (zuEnde) return; w.auszeit('B', !!auszeiten.value.B); break
    case '*': w.zurueck(); break
    /*
     * + UND − ÖFFNEN DEN ZIFFERBLOCK FÜR EINE GANZE AUFNAHME — UND ZWAR NUR
     * IN DER PUNKTFASSUNG.
     *
     * Im Straight Pool waren sie bis zum 16.09.2026 Rack und Safety, und das
     * sind sie weiterhin — nur steht es jetzt bei den Kugeln, wo es hingehört
     * (`spTaste` in Zaehlleiste.vue). Hierher kommt der Straight Pool nicht
     * mehr, siehe die Abzweigung oben.
     *
     * IN DER SATZWERTUNG SIND SIE SEIT DEM 16.09.2026 TOT, und das ist die
     * Richtigstellung eines Fehlers: bis dahin standen sie hier ohne
     * Unterscheidung, und damit öffnete `+` auch bei RACK_RACE den
     * Zifferblock. `3` `7` OK trug dort SIEBENUNDDREISSIG SÄTZE ein — das
     * Zählwerk kennt nach oben keine Grenze, und ein Satzstand, der die
     * Distanz um das Zehnfache überschreitet, ist kein Tippfehler mehr,
     * sondern eine kaputte Partie.
     *
     * Eine Fläche dafür gab es in der Satzfassung nie: die „+ N"-Kacheln
     * stehen unter `v-if="modus === 'POINT_RACE'"`, und auch die Übersicht
     * im Schiedsrichtermenü nennt `+ · −` nur in der Punktfassung. Der
     * Zifferblock war in der Satzwertung also ein Weg, den niemand kennt
     * und den nichts beschreibt — die falsche Hälfte der Wahl zwischen
     * „Übersicht ergänzen" und „Weg schliessen".
     *
     * Er wird auch NICHT durch ±1 ersetzt: das ist 7/9/1/3, und zwei
     * Tastenpaare für denselben Vorgang sind auf einer Fernbedienung, die
     * im Stehen bedient wird, nur eine Verwechslung mehr. Sie fallen auf
     * `default: return` und tun nichts — wie jede andere unbelegte Taste
     * der Satztafel auch. Die zweite Sperre sitzt in `blockOeffnen` selbst
     * (Zaehlleiste.vue), damit der Block auch über die Fläche nicht in die
     * falsche Fassung geraten kann.
     */
    case '+':
      if (modus.value === 'POINT_RACE') leiste.value?.blockOeffnen(links.value, 1)
      else return
      break
    case '-':
      if (modus.value === 'POINT_RACE') leiste.value?.blockOeffnen(rechts.value, 1)
      else return
      break
    /*
     * Die 5 ist im Vorbild doppelt belegt, und zwar nach Lage: steht die
     * Partie zum Beenden an, heisst sie "ja, fertig"; sonst wechselt sie,
     * wer am Tisch ist. Genau so bleibt es.
     *
     * Der Straight Pool hat dieselbe Doppelung auf `/ 5` — die nackte 5 ist
     * dort die Zahl der Kugeln, die noch liegen.
     */
    case '5':
      if (sieger.value) w.beenden()
      // Der Tischwechsel ist nach der Distanz keine Regel mehr, sondern nur
      // noch eine Schreibbewegung. `zuEnde` und nicht `sieger`: stehen beide
      // auf der Distanz, ist `sieger` leer, und dann erst recht Schluss.
      else if (modus.value === 'POINT_RACE' && !zuEnde) {
        w.anstoss(w.anstossStand.value.next === 'A' ? 'B' : 'A')
      }
      break
    default: return
  }
  ev.preventDefault()
}

/**
 * DER LANGE DRUCK — der Weg des Tablets, das keine Tastatur hat.
 *
 * ZWEI SEKUNDEN UND NICHT MEHR ANDERTHALB. Anderthalb war die Zeit für
 * "zurück zur Tischwahl", und genau die war zu kurz: ein Gerät auf einem
 * Ständer, an das sich jemand anlehnt, liegt länger als anderthalb Sekunden
 * unter einem Ellenbogen. Zwei Sekunden sind für eine Hand, die es will,
 * kaum zu merken, und für ein Anlehnen schon eine bewusste Handlung.
 *
 * Auf einem Zählgerät kommt danach ohnehin nur noch ein Menü und kein
 * Wechsel mehr — das ist der eigentliche Schutz, und die halbe Sekunde ist
 * der Zuschlag. Auf einem Bildschirm an der Wand, der nie gezählt hat, ist
 * sie der ganze Schutz: dort führt der lange Druck weiter geradewegs zur
 * Tischwahl, weil es nichts gibt, worüber ein Menü etwas sagen könnte
 * (siehe menueOeffnen).
 */
let druckUhr: ReturnType<typeof setTimeout> | null = null
const DRUCK_MS = 2000

function druckAn() {
  if (druckUhr) clearTimeout(druckUhr)
  if (menueOffen.value) return
  druckUhr = setTimeout(menueOeffnen, DRUCK_MS)
}

function druckAus() {
  if (druckUhr) clearTimeout(druckUhr)
  druckUhr = null
}

/**
 * WER DAS MENÜ ÜBERHAUPT BEKOMMT — dieselbe Bedingung wie die Zählleiste.
 *
 * Das Gerät ist zum Zählen eingerichtet, es ist angemeldet, es darf an
 * dieser Veranstaltung, und es steht eine Partie am Tisch. Ohne all das
 * passiert bei zweimal 0 und beim langen Druck NICHTS — kein Menü, keine
 * Meldung, kein Hinweis, dass es eines gäbe.
 *
 * Das ist auch hier KEINE Sicherung: die liegt in der Anwendung, die jeden
 * Schreibzugriff ohne Recht mit 403 abweist. Es ist die Entscheidung, dass
 * ein Bildschirm im Saal kein Formular ist — und beim Schiedsrichter-Menü
 * wiegt sie schwerer als bei der Leiste, weil hier Partien enden.
 *
 * WAS DABEI UNTERSCHIEDEN WIRD — SEIT DEM 17.09.2026 AN GENAU EINER STELLE.
 * Das Menü selbst macht zwischen den Rollen weiterhin keinen Unterschied,
 * und für fast alles darin ist das richtig: Tischwechsel, Anstoss,
 * Auszeit-Rücknahme, Shot-Clock — das ist die Arbeit am Tisch, und die
 * gehört jedem, der `match/U` trägt (REFEREE, HEAD_REFEREE,
 * TOURNAMENT_LEADER, EVENT_ADMIN, ORGANISER_ADMIN, ADMIN, SYSTEM_ADMIN).
 *
 * Die AUFGABE war der gemeldete Fall und hängt jetzt woanders. Sie beendet
 * eine Partie und reicht den Baum weiter; § 9.1 der Sportordnung weist
 * „Nichtantreten" und „Aufgabe" ausdrücklich dem TOURNAMENT LEADER zu.
 * `match/U` konnte ihn vom Schiedsrichter nicht unterscheiden, weil beide
 * dieselben Buchstaben tragen — deshalb gibt es dafür ein eigenes Recht,
 * `forfeit/X`. Die Abwägung (warum nicht `match/X`, das die ABNAHME ist)
 * steht in V2 an der Zeile `('forfeit', …)`.
 *
 * AM BILDSCHIRM ÄNDERT DAS NICHTS, und das ist Absicht. Der Punkt bleibt im
 * Menü, die sechs Ziffern bleiben. Wessen Ziffern zählen, weiss das Tablet
 * erst, wenn sie getippt sind — ein Code sagt vorher nichts über seinen
 * Träger, und ihn vorab beim Server zu erfragen wäre ein Umlauf für eine
 * Auskunft, die mit der Tat ohnehin kommt. Reicht er nicht, steht es
 * danach da: `FORFEIT_IS_THE_TOURNAMENT_DIRECTION` (useZaehlwerk) sagt,
 * dass der Code angekommen ist und wessen hier zählt — und nicht bloss
 * „nicht erlaubt".
 *
 * TEAM_LEADER TRÄGT `match/U` AUCH — und steht trotzdem nicht in der Liste
 * oben. Sie zählt auf, wer das Recht über `identity.may` bekommt, also auf
 * einer der drei Ebenen, die für die ganze Veranstaltung gelten. Die Rolle
 * des Mannschaftsführers hat `scope = EVENT_COUNTRY` und liegt allein in
 * `identity.event_country_role`, die `identity.may` nicht liest; sein
 * `match/U` gilt nur für sein Land und wird nur über
 * `identity.leads_tie_side` gefragt — für die Aufstellung, nie für den
 * Tisch. An diesen Bildschirm kommt er damit gar nicht erst: er bekommt
 * keinen Personencode (`identity.acts_at_event`).
 */
function menueOeffnen() {
  if (zaehlen.value && partie.value) {
    menueOffen.value = true
    return
  }
  /*
   * KEIN MENÜ HEISST NICHT KEIN WEG ZURÜCK.
   *
   * Das war beim ersten Bau dieser Änderung ein Fehler, und zwar ein
   * teurer: die 0 führte nur noch ins Menü, das Menü gab es nur für ein
   * angemeldetes Zählgerät mit Partie — und damit sass ein Bildschirm, dem
   * die Anmeldung abgelaufen war, fest. Kein Menü, kein Tischwechsel, keine
   * Anmeldung, und die einzige Rettung war, in einer Halle eine Adresse mit
   * einer UUID darin neu zu tippen.
   *
   * Wo es nichts zu entscheiden gibt, geht der Weg deshalb weiter dorthin,
   * wo BEIDE Fragen beantwortet werden: die Tischwahl trägt die Anmeldung
   * und die Liste der Tische. Das gilt für den Bildschirm an der Wand, der
   * nie gezählt hat, genauso wie für das Zählgerät, das gerade nicht darf.
   *
   * Der Missstand des Auftraggebers ist damit trotzdem behoben: schwer
   * erreichbar ist nicht mehr das Ziel, sondern die GESTE — zweimal 0 oder
   * zwei Sekunden Druck, und das gilt hier wie dort.
   */
  zurueckZurWahl()
}

let uhr: ReturnType<typeof setInterval> | null = null
let sekundenzeiger: ReturnType<typeof setInterval> | null = null

onMounted(() => {
  // VOR dem ersten Abruf: davon hängt ab, ob der überhaupt die zweite Frage
  // stellt. Sonst bliebe die Leiste bis zum zweiten Takt aus.
  merkerLesen()
  if (!stand.value && !unbekannt.value) holen()
  else zusatzHolen()
  uhr = setInterval(holen, ABSTAND_MS)
  // Der erste Stand kann schon Sponsoren mitbringen (Serverseite); dann
  // läuft das Karussell ab dem Einschalten und nicht erst ab dem zweiten
  // Abruf. Der Beobachter oben sieht diesen ersten Stand nicht, weil er
  // sich nicht mehr ändert.
  sponsorUhrStellen()
  // Der Sekundentakt treibt nur die Auszeit-Uhr und den Verbindungspunkt.
  // Ohne ihn spränge die Restzeit einer Auszeit in Zehnersprüngen, und eine
  // Uhr, die springt, ist schlechter als gar keine.
  sekundenzeiger = setInterval(() => (jetzt.value = Date.now()), 1000)
  window.addEventListener('keydown', tafelTaste)
})

onBeforeUnmount(() => {
  if (uhr) clearInterval(uhr)
  if (sekundenzeiger) clearInterval(sekundenzeiger)
  if (sponsorUhr) clearTimeout(sponsorUhr)
  if (druckUhr) clearTimeout(druckUhr)
  window.removeEventListener('keydown', tafelTaste)
})

const partie = computed(() => stand.value?.match ?? null)

/**
 * Sekunden seit dem letzten ECHTEN Abruf — die Grundlage für "die Anzeige
 * steht".
 *
 * GERECHNET AB `zuletzt`, UND SOLANGE DAS NOCH NIE GESETZT WAR, AB
 * `gestartet` — seit es einen Service Worker gibt, kann diese Seite OHNE
 * JEDE erfolgreiche Antwort starten (siehe `tafelGelesen` oben): ohne diesen
 * Rückfall bliebe `alter` für immer `null` und der Verbindungspunkt unten
 * für immer stumm, obwohl seit dem Einschalten kein einziger Abruf gelungen
 * ist. Vorher konnte dieser Fall gar nicht eintreten: ohne Netz lud die
 * Seite selbst nicht, also lief dieser Code nie mit leeren Händen los.
 */
const alter = computed(() => Math.floor((jetzt.value - (zuletzt.value ?? gestartet)) / 1000))

/**
 * Erst nach dem dritten verpassten Abruf. Ein einzelner Aussetzer ist normal
 * und soll nicht blinken; eine halbe Minute Stille ist es nicht.
 */
const verbindungWeg = computed(() => alter.value > (ABSTAND_MS / 1000) * 3)

/**
 * DIE AUSZEIT-UHREN — eine je Spieler, und beide dürfen nebeneinander laufen.
 *
 * Bis zum 14.09.2026 war es EINE Uhr: die Anwendung führte eine laufende
 * Auszeit je Partie, und nahm B eine, während die von A lief, verschwand die
 * von A ohne Meldung. Eine Auszeit gehört aber einem von beiden — wollen
 * beide hinaus, nehmen beide ihre, und die Tafel zeigt zwei Uhren.
 *
 * Ein Objekt mit A und B und keine Liste: die Tafel fragt je Seite nach
 * ("läuft für den Spieler links eine?"), und ein `find` über zwei Einträge
 * stünde dafür an drei Stellen im Bild.
 *
 * Jede Uhr läuft zwischen zwei Abrufen selbst weiter. Die Anwendung nennt
 * die Restzeit in dem Moment, in dem sie antwortet; hier wird die Zeit
 * seither abgezogen. Das ist genauer als der Zehn-Sekunden-Takt und geht bei
 * jedem Abruf wieder auf den Wert der Anwendung zurück — die Uhr kann also
 * nicht davonlaufen.
 */
/**
 * Was der ABRUF über die laufenden Auszeiten sagt — roh, je Seite ein Ja
 * oder Nein.
 *
 * Sie geht ins Zählwerk und entscheidet dort, wann ein Vorgriff losgelassen
 * wird. Deshalb darf sie NICHT aus `auszeiten` unten kommen: die trägt den
 * Vorgriff schon, und ein Vorgriff, der sich selbst bestätigt, wird nie
 * wieder los.
 */
const auszeitenLaufen = computed<Record<Seite, boolean>>(() => {
  const laeuft: Record<Seite, boolean> = { A: false, B: false }
  for (const t of stand.value?.timeouts ?? []) {
    if (!t.stale) laeuft[t.side] = true
  }
  return laeuft
})

/**
 * Die Uhren, wie sie auf der Tafel stehen — Vorgriff vor Abruf.
 *
 * ZWEI QUELLEN, UND DIE NÄHERE GEWINNT. Was an diesem Gerät gedrückt und
 * noch nicht bestätigt wurde, steht über dem, was der Abruf sagt — dieselbe
 * Reihenfolge wie beim Stand (`vorgemerkt` vor `gehalten` vor Abruf) und aus
 * demselben Grund: ganz oben steht, was der am Tisch gerade getan hat.
 *
 * Ein Vorgriff wird NICHT gegen den Abruf verrechnet, sondern ersetzt ihn,
 * solange er lebt. Das ist der Kern der Sache — siehe `auszeitVorgriff` in
 * useZaehlwerk.ts: beide Uhren laufen gleich schnell und stehen um die
 * Laufzeit der Leitung auseinander, und wer mittendrin umschaltet, dreht
 * die Uhr vor Publikum um diesen Versatz zurück.
 */
const auszeiten = computed(() => {
  const seit = zuletzt.value === null ? 0 : Math.floor((jetzt.value - zuletzt.value) / 1000)
  const offen: Partial<Record<'A' | 'B', { text: string, ueberzogen: boolean }>> = {}
  const vorgriff = zaehlwerk.auszeitVorgriff.value
  const dauer = auskunft.value?.match?.timeoutSeconds ?? null

  for (const t of stand.value?.timeouts ?? []) {
    // `stale` heisst: länger als einen Tag, das hat jemand vergessen zu
    // beenden. Eine sechsstellige Zahl im Saal sagt nichts.
    if (t.stale) continue
    /*
     * Hier ist etwas vorweggenommen — der Abruf hat dazu nichts mehr zu
     * sagen, weder ein Ende (dann ist die Uhr weg) noch eine Restzeit.
     *
     * Der Vorgriff muss aber auch ETWAS ZEIGEN können, sonst verschwände
     * die Uhr ganz. Ein vorweggenommener Beginn ohne bekannte Dauer wird
     * heute gar nicht erst gesetzt (siehe `auszeit`); sollte er es doch
     * einmal, tritt er hier zur Seite, statt das Loch zu reissen.
     */
    const v = vorgriff[t.side]
    if (v && (v.anker === null || dauer !== null)) continue

    const rest = Math.max(0, t.remainingSeconds - seit)
    const ueber = rest > 0 ? 0 : t.overrunSeconds + Math.max(0, seit - t.remainingSeconds)

    offen[t.side] = { text: uhrzeit(rest > 0 ? rest : ueber), ueberzogen: rest === 0 }
  }

  /*
   * Die vorweggenommenen Uhren. Sie rechnen aus DEM Augenblick, in dem
   * gedrückt wurde, und aus der erlaubten Dauer — dieselbe Rechnung wie in
   * `competition.timeout_state`, nur mit dem eigenen Anker.
   *
   * Ohne bekannte Dauer steht hier nichts: `auszeit` nimmt dann schon den
   * Beginn nicht vorweg, und eine Uhr ohne Länge wäre eine erfundene
   * Restzeit.
   */
  for (const seite of ['A', 'B'] as Seite[]) {
    const v = vorgriff[seite]
    if (!v || v.anker === null || dauer === null) continue

    const verstrichen = Math.max(0, Math.floor((jetzt.value - v.anker) / 1000))
    const rest = Math.max(0, dauer - verstrichen)
    offen[seite] = {
      text: uhrzeit(rest > 0 ? rest : verstrichen - dauer),
      ueberzogen: rest === 0,
    }
  }
  return offen
})

function uhrzeit(sekunden: number): string {
  const m = Math.floor(sekunden / 60)
  const s = sekunden % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

/**
 * DIE ZEITLIMIT-UHR (HEYBALL) — dieselbe Bauart wie `auszeiten` oben und aus
 * demselben Grund.
 *
 * Der Abruf nennt Restzeit, Überzug und `running` im Moment, in dem er
 * antwortet; hier wird die seither verstrichene Zeit abgezogen, solange die
 * Uhr LÄUFT. Steht sie (`running === false`), wird nichts abgezogen — genau
 * das ist der Unterschied zur Shot-Clock, die diese Tafel bewusst OHNE
 * Sekunden zeigt (siehe `shotClockOffen`): dort führt der Schiedsrichter
 * seine eigene Stoppuhr, hier ist die Uhr selbst eine anhaltbare Spieluhr
 * (Schachuhr-Bauart, siehe `competition.match_time_limit_state`) und ihr
 * Stand zwischen zwei Abrufen genauso vorhersagbar wie bei einer Auszeit.
 *
 * `null`, wenn kein Zeitlimit gilt, die Partie noch nicht angestossen ist
 * oder schon zu Ende — dieselbe Lesart wie bei `timeouts`: eine erfundene
 * Restzeit wäre schlimmer als keine, und die Anwendung liefert dafür schon
 * `timeLimit: null` (siehe `competition.match_time_limit_state`).
 */
const zeitlimit = computed(() => {
  const tl = stand.value?.timeLimit
  if (!tl) return null

  const seit = tl.running && zuletzt.value !== null
    ? Math.floor((jetzt.value - zuletzt.value) / 1000)
    : 0
  const rest = Math.max(0, tl.remainingSeconds - seit)
  const ueber = rest > 0 ? 0 : tl.overrunSeconds + Math.max(0, seit - tl.remainingSeconds)

  return {
    text: uhrzeit(rest > 0 ? rest : ueber),
    ueberzogen: rest === 0,
    running: tl.running,
  }
})

/* ------------------------------------------------------------------------
 * ZÄHLEN
 * --------------------------------------------------------------------- */

/**
 * DER SEITENTAUSCH BLEIBT IN localStorage — UND SONST NICHTS MEHR.
 *
 * Er ist wirklich eine Eigenschaft des Aufstellorts: der Schirm hängt so
 * herum, wie er hängt, und wer links steht, steht links. Das geht keinen
 * Server etwas an, und es soll auch nicht für jeden anderen Bildschirm
 * gelten.
 *
 * HIER STAND BIS ZUM 15.09.2026 AUCH `bb.board.count.<eventId>`
 *
 * Ein Merker, der sagte "dieser Schirm ist ein Eingabegerät", gesetzt auf
 * der Tischwahl. Er ist ersatzlos weg, und das ist die eigentliche
 * Änderung: er war eine BEHAUPTUNG des Geräts über sich selbst, und jeder,
 * der an den Bildschirm kam, konnte sie aufstellen. Wer am 75-Zoll-Schirm
 * im Saal vorbeiging und den Schalter drückte, bekam Bedienflächen über
 * einem laufenden Halbfinale — und die Trikotkontrolle dazu, also
 * "Lechner — uniform control open" vor dem Publikum.
 *
 * Eingabegerät ist ein Gerät jetzt genau dann, wenn es eine gültige
 * FREIGABE für diese Veranstaltung und diesen Tisch hält (`bb_board`,
 * eingelöst mit sechs Ziffern auf der Tischwahl) — oder wenn jemand
 * angemeldet ist, der die Partie lesen darf. Beides entscheidet der
 * Server, und beides lässt sich am Gerät nicht behaupten.
 */
const spiegelSchluessel = `bb.board.mirror.${eventId}`

const gespiegelt = ref(false)

function merkerLesen() {
  try {
    gespiegelt.value = window.localStorage.getItem(spiegelSchluessel) === '1'
  }
  catch {
    // Privater Modus: dann hängt der Schirm eben herum wie geliefert. Eine
    // Meldung darüber gehört nicht auf eine Tafel im Saal.
  }
}

/** Was die Durchreiche über die Partie am Tisch weiß — siehe server/api/board. */
interface Zaehlauskunft {
  /**
   * WIE an diesem Schirm gehandelt wird — vom Server gesagt, nicht geraten.
   *
   * 'PERSON': eine Sitzung (oder eine eingelöste PIN) trägt, der nächste
   * Schreibvorgang bekommt einen Namen. 'DEVICE': es handelt das
   * freigeschaltete Gerät, und dann verlangt die Verwaltung für die Karte,
   * die Aufgabe und die Rücknahme einer Auszeit die sechs Ziffern.
   * `null`: hier handelt niemand.
   *
   * Hier stand `signedIn: boolean`, und das war die Frage, ob im Browser
   * ein Sitzungskeks LIEGT — nicht, ob er noch trägt. Siehe
   * server/api/board/[eventId]/tables/[number].get.ts.
   */
  actingAs: 'PERSON' | 'DEVICE' | null
  /** Dieses Gerät hält eine gültige Freigabe für genau diesen Tisch. */
  released: boolean
  mayScore: boolean
  match: Zusatz | null
  /**
   * Die Bau-Kennung des Servers, der geantwortet hat.
   *
   * Sie fährt in dieser Antwort mit, weil die Tafel sie ohnehin alle zehn
   * Sekunden holt — siehe useFassungswechsel.ts, dort steht die ganze
   * Begründung. `undefined` bei einem Server, der älter ist als diese
   * Angabe; dann geschieht nichts, und das ist richtig.
   */
  buildId?: string
}

const auskunft = ref<Zaehlauskunft | null>(null)

/**
 * Gefragt wird IMMER, und nicht mehr nur bei gesetztem Merker.
 *
 * Vorher entschied das Gerät, ob es überhaupt fragt; jetzt entscheidet die
 * Antwort, was es darf. Ein Bildschirm ohne Freigabe und ohne Anmeldung
 * bekommt eine leere Auskunft zurück — kein Fehler, keine Bedienflächen,
 * keine Trikotkontrolle. Er kostet damit einen Aufruf alle zehn Sekunden,
 * den er vorher nicht hatte; dafür kann er sich das Zählen nicht mehr
 * selbst zusprechen.
 */
async function zusatzHolen() {
  try {
    auskunft.value = await $fetch<Zaehlauskunft>(
      `/api/board/${encodeURIComponent(eventId)}/tables/${tischNummer}`)
    // Die Bau-Kennung ist mitgekommen; ob daraus etwas folgt, entscheidet
    // `fassung` — und der Augenblick dafür ist `darfNachladen` weiter unten.
    fassung.melden(auskunft.value?.buildId)
  }
  catch {
    /*
     * Die letzte Auskunft bleibt stehen, genau wie der Stand. Ein Aussetzer
     * im Netz soll die Leiste nicht verschwinden lassen — sie geht dann
     * eben ins Leere, und DAS sagt sie beim nächsten Tippen deutlich.
     */
  }
}

/**
 * Ob unten wirklich eine Leiste steht.
 *
 * Drei Bedingungen, und jede einzeln sichtbar: das Gerät ist dafür
 * eingerichtet, es ist angemeldet, und es darf an dieser Veranstaltung. Wo
 * es hakt, sagt die Zeile darunter — „wo ist der Knopf hin" ist eine
 * schlechtere Auskunft als „der geht hier nicht, weil …".
 */
const zaehlen = computed(() =>
  auskunft.value?.mayScore === true && !!partie.value)

/**
 * Wo es hakt — aber nur für den, der es beheben kann.
 *
 * Ein Bildschirm, der nur anzeigt, hält weder Freigabe noch Anmeldung und
 * soll KEINE Zeile darüber tragen: er ist kein halb eingerichtetes
 * Eingabegerät, er ist eine Anzeigetafel, und die ist fertig. Der Satz
 * erscheint erst, wenn ein AUSGEWIESENER MENSCH hier nicht zählen darf —
 * das ist der Fall, in dem eine Auskunft etwas nützt.
 *
 * „Ausgewiesen" und nicht mehr „es liegt ein Keks da": bis zum 16.09.2026
 * stand hier `signedIn`, und das war wahr, solange irgendein toter
 * Sitzungskeks im Browser lag. Dann behauptete diese Zeile etwas über das
 * KONTO des Bedieners, an einem Gerät, an dem gar keines mehr anlag — und
 * der Bediener suchte den Fehler bei seinen Rechten statt bei der
 * abgelaufenen Anmeldung. Die Zeile über ein Gerät ohne Menschen ist jetzt
 * leer, und das ist richtig: das Gerät zählt über seine Freigabe, und die
 * Rechte eines Kontos gehen es nichts an.
 */
const hindernisGrund = computed(() => {
  if (auskunft.value === null) return ''
  if (auskunft.value.actingAs === 'PERSON' && !auskunft.value.mayScore) {
    return 'This account may not score at this event.'
  }
  return ''
})

/**
 * DIE MELDUNG HAT EINE FRIST — sie stand vorher dauerhaft auf einem Schirm,
 * der zum Saal zeigt.
 *
 * Der Auftraggeber: „diese meldung sollte nicht dauerhaft zu sehen sein".
 * Sie war ein `computed` ohne Uhr: einmal wahr, blieb sie stehen, bis sich
 * die Auskunft änderte — vor dem Publikum, neben einem laufenden
 * Halbfinale, in einer Sprache, die dort niemanden angeht.
 *
 * EINE MINUTE UND NICHT DIE FÜNFZEHN SEKUNDEN DES ZÄHLWERKS.
 * Das Vorbild ist FEHLER_MS in useZaehlwerk.ts (14.09.2026, „ist ja nur ein
 * hinweis fuer den moment"). Die Frist ist übernommen, die ZAHL nicht, und
 * der Unterschied ist, wer gerade hinsieht: eine Abweisung im Zählwerk
 * beantwortet den Druck, den jemand eben gemacht hat — er schaut schon auf
 * den Schirm, fünfzehn Sekunden sind reichlich. Diese hier beantwortet eine
 * EINRICHTUNG. Sie erscheint von selbst, während der Bediener noch den
 * Zettel mit dem Code in der Hand hält, und sie nennt einen Weg („press 0
 * twice"), der länger dauert als das Lesen. Fünfzehn Sekunden wären dann
 * weg, bevor er aufgeschaut hat.
 *
 * VERWORFEN: sie stehen zu lassen, solange das Hindernis besteht, und nur
 * zu verkleinern. Dauerhaft ist dauerhaft, auch klein — und das Hindernis
 * besteht unter Umständen den ganzen Tag, weil auf diesem Tablet nun einmal
 * ein falsches Konto angemeldet bleibt.
 *
 * Sie kommt wieder, wenn jemand eine Taste drückt: wer am Gerät tippt und
 * nichts passieren sieht, bekommt in demselben Augenblick den Grund dazu.
 */
const MELDUNG_MS = 60_000
const hindernisBis = ref(0)

watch(hindernisGrund, (neu, alt) => {
  if (neu && neu !== alt) hindernisBis.value = Date.now() + MELDUNG_MS
}, { immediate: true })

/** Der Satz, solange seine Frist läuft. `jetzt` tickt im Sekundentakt. */
const zaehlHindernis = computed(() =>
  hindernisGrund.value && jetzt.value < hindernisBis.value ? hindernisGrund.value : '')

/**
 * SATZWERTUNG ODER PUNKTWERTUNG — aus `sport.discipline` und nicht aus einer
 * Liste von Kürzeln.
 *
 * Das Vorgängersystem unterscheidet seine drei Fassungen an den Kürzeln
 * "14.1" und "SN". Das geht so lange gut, wie niemand eine Disziplin
 * anlegt: eine neue mit Punktwertung bekäme die Satzfassung und damit ein
 * Zählwerk, das dreissig Bälle einzeln zählen lässt. v2 hat für genau diese
 * Frage ein Feld, und das wird hier gefragt.
 *
 * Snooker gibt es in v2 nicht (FRAME_RACE ist im Prüfzwang der Spalte
 * vorgesehen, aber keine Disziplin trägt es) — von den drei alten Fassungen
 * bleiben zwei.
 *
 * RACK_RACE ist der Rückfall, wenn die Angabe fehlt: 1 391 Turniere gegen
 * 247. Fehlen kann sie nur noch, solange keine Partie am Tisch steht — die
 * Angabe hängt an der Partie und nicht mehr an einer zweiten Auskunft.
 *
 * SIE KOMMT MIT DER PARTIE, SEIT DEM 17.09.2026, und das ist der Punkt.
 * Vorher holte die Durchreiche eine Zuordnung Kürzel → Wertungsart aus der
 * Referenzverwaltung; die hängt an `system.reference:R`, das ein
 * Schiedsrichter nicht hat. Ein Gerät, das nur über den sechsstelligen
 * Tafelcode freigegeben ist, bekam nichts — und damit im Straight Pool die
 * Satzleiste mit 7/9/1/3 und, seit der Zifferblock daran hängt, auch die
 * Tastenbelegung der Satzfassung. Jetzt trägt `competition.public_match`
 * beides an der Partie, und die öffentliche Tafelantwort braucht kein Recht.
 */
const modus = computed<'RACK_RACE' | 'POINT_RACE' | 'STRAIGHT_POOL'>(() => {
  const spielart = partie.value?.discipline
  /*
   * 14.1 ENDLOS BEKOMMT SEINE EIGENE FASSUNG — UND ZWAR AM SCHLÜSSEL DER
   * DISZIPLIN, NICHT AN IHRER WERTUNGSART.
   *
   * POINT_RACE tragen zwei Disziplinen: Straight Pool und Shoot-out. Beide
   * werden in Punkten gezählt und sonst überhaupt nicht gleich — 14.1 rechnet
   * über die Kugeln, die noch auf dem Tisch liegen, hat Racks, Punktabzüge
   * und eine Foulfolge; ein Shoot-out hat nichts davon. Bis zum 16.09.2026
   * bekamen beide dieselbe Leiste, und für eine der beiden war sie falsch.
   */
  if (spielart?.key === 'POOL_14_1') return 'STRAIGHT_POOL'
  return spielart?.scoringKind === 'POINT_RACE' ? 'POINT_RACE' : 'RACK_RACE'
})

/**
 * TRAEGT DIESE PARTIE EIN SATZFORMAT — seit dem 25.09.2026.
 *
 * `Match.setRaceTo` ist gesetzt: "best of 5, je race to 5". Sie entscheidet
 * in `useZaehlwerk`, gegen welche Spalte gezaehlt wird (`set_score` statt
 * `score`), und hier, ob der Zifferblock den AUSSENSTAND optimistisch
 * ueberschreiben darf (`tafelseite`) — bei Saetzen zeigt die grosse Zahl die
 * gewonnenen Saetze, und die aendert sich nicht mit jedem Rack.
 *
 * BEI SNOOKER (FRAME_RACE) BLEIBT SIE FALSCH — `setRaceTo` ist dort immer
 * `null` (siehe die Begruendung an `Match.setRaceTo`). Ein Frame hat keinen
 * Zwischenstand, den die Verwaltung fuehrt; siehe `istSnooker` und die
 * Ballwerte-Flaeche weiter unten.
 */
const satzformat = computed(() => (partie.value?.setRaceTo ?? null) !== null)

/**
 * SNOOKER — die Wertungsart, fuer die es weder Racks noch eine Zielzahl
 * gibt (siehe `ScoringKind`).
 *
 * SIE ENTSCHEIDET, OB DIE NORMALE ZAEHLLEISTE UEBERHAUPT ERSCHEINT. Deren
 * "+1"-Flaechen schreiben ohne Satzformat DIREKT nach `match_slot.score` —
 * bei Snooker waere das der AUSSENSTAND (gewonnene Frames), und ein Tipp
 * darauf schriebe der Partie ein Frame gut, das niemand bestaetigt hat.
 * Die Ballwerte-Flaeche (`BoardBallwerte`) tritt deshalb an ihre Stelle: sie
 * zaehlt die laufenden Punkte eines Frames rein im Geraet und schickt
 * nichts an die Verwaltung, bis der Schiedsrichter das Frame im
 * Schiedsrichtermenue ausdruecklich abschliesst (`confirm-set` mit
 * genanntem Gewinner).
 */
const istSnooker = computed(() => partie.value?.discipline.scoringKind === 'FRAME_RACE')

const zaehlwerk = useZaehlwerk({
  partie: computed(() => partie.value),
  // Der ROHE Zusatz, so wie der Abruf ihn liefert. Das Zählwerk braucht ihn
  // ungeschönt: es entscheidet daran, wann es seinen eigenen Vorgriff
  // loslässt, und ein Vorgriff, den man ihm zurückreicht, bestätigt sich
  // selbst. Was die Oberfläche zeigt, steht eine Zeile tiefer.
  zusatz: computed(() => auskunft.value?.match ?? null),
  auszeitenLaufen,
  // NUR 14.1 endlos und nicht jede Punktwertung: das Shoot-out hat keine
  // Restkugeln, und ein Rückgängig, das ihm welche schriebe, trüge eine
  // Angabe in eine Partie, zu der sie nicht gehört.
  straightPool: computed(() => modus.value === 'STRAIGHT_POOL'),
  satzformat,
  nachschauen: holen,
})

/* ------------------------------------------------------------------------
 * SNOOKER — DER LAUFENDE FRAME, REIN IM GERAET
 *
 * Die Verwaltung fuehrt fuer ein Frame keinen Zwischenstand:
 * `match_slot.set_score` wird serverseitig nur beschrieben, wenn
 * `match.set_race_to` gesetzt ist (`MatchController.setScore`), und ein
 * Frame hat diese Zielzahl nie — es endet, wenn keine Baelle mehr liegen
 * und der Rueckstand uneinholbar ist, nicht an einer Zahl. Was hier steht,
 * ist deshalb die einzig moegliche Antwort OHNE das Backend anzufassen: die
 * Tafel zaehlt die Ballpunkte selbst mit, unbestaetigt und ungesichert.
 *
 * EIN NEULADEN MITTEN IM FRAME VERLIERT DIESEN STAND — das ist eine echte
 * Grenze und keine Nachlaessigkeit dieser Datei; siehe den Bericht der
 * Aenderung, die dies eingefuehrt hat. Bestaetigt und damit dauerhaft ist
 * erst der AUSSENSTAND, sobald das Schiedsrichtermenue das Frame
 * abschliesst.
 */
const frameStand = ref<Standpaar>({ A: 0, B: 0 })
/**
 * Die laufende Framenummer — ebenfalls nur im Geraet gefuehrt.
 *
 * `Match.currentSetNo` bleibt bei Snooker serverseitig `null` (siehe dort),
 * obwohl `competition.match.current_set_no` bei jedem Frame weiterzaehlt.
 * Diese Zahl beginnt deshalb bei 1 und zaehlt lokal mit — richtig fuer die
 * laufende Sitzung an diesem Tablet, aber falsch nach einem Neuladen mitten
 * im Turnier. Siehe denselben Vorbehalt wie bei `frameStand`.
 */
const frameNummer = ref(1)

/**
 * Der letzte lokale Eintrag am laufenden Frame — fuer ein einfaches Undo.
 *
 * NUR EINE STUFE, UND DAS GENUEGT HIER: anders als beim Zaehlwerk (zwanzig
 * Schritte, siehe `verlauf` dort) ist nichts von alldem an die Verwaltung
 * gegangen — ein Vertipper, der laenger zurueckliegt, laesst sich ebenso gut
 * durch einen Gegeneintrag richtigstellen (den falschen Ball nochmal
 * abziehen, den richtigen dazu), denn der Stand ist ohnehin nur eine
 * Gedaechtnisstuetze und keine Wahrheit, die irgendwo nachgelesen wird.
 */
const frameLetzter = ref<{ seite: Seite, betrag: number } | null>(null)

watch(() => partie.value?.id ?? null, (neu, alt) => {
  if (neu === alt) return
  frameStand.value = { A: 0, B: 0 }
  frameNummer.value = 1
  frameLetzter.value = null
})

/** Ein Ball ist gefallen — die Punkte gehen an den, der ihn versenkt hat. */
function frameBall(seite: Seite, wert: number) {
  frameStand.value = { ...frameStand.value, [seite]: frameStand.value[seite] + wert }
  frameLetzter.value = { seite, betrag: wert }
}

/** Ein Foul — die Punkte gehen an den GEGNER dessen, der gefoult hat. */
function frameFoul(verursacher: Seite, punkte: number) {
  const gegner: Seite = verursacher === 'A' ? 'B' : 'A'
  frameStand.value = { ...frameStand.value, [gegner]: frameStand.value[gegner] + punkte }
  frameLetzter.value = { seite: gegner, betrag: punkte }
}

/** Den letzten lokalen Eintrag zurücknehmen — siehe `frameLetzter`. */
function frameZurueck() {
  const letzter = frameLetzter.value
  if (!letzter) return
  frameStand.value = {
    ...frameStand.value,
    [letzter.seite]: Math.max(0, frameStand.value[letzter.seite] - letzter.betrag),
  }
  frameLetzter.value = null
}

/**
 * Ein Satz bzw. Frame ist abgeschlossen — aus dem Schiedsrichtermenue.
 *
 * NUR BEI ERFOLG WIRD DER LOKALE FRAMESTAND ZURUECKGESETZT. `satzAbschliessen`
 * liefert `null` bei einer Abweisung (nichts hat sich geaendert); ein
 * Ruecksetzen dort wuerde einen Punktestand loeschen, den die Verwaltung gar
 * nicht bestaetigt hat.
 */
async function satzAbschliessenGeklickt(winner?: Seite) {
  const ergebnis = await zaehlwerk.satzAbschliessen(winner)
  if (ergebnis && istSnooker.value) {
    frameStand.value = { A: 0, B: 0 }
    frameNummer.value += 1
    frameLetzter.value = null
  }
}

/* ------------------------------------------------------------------------
 * EINE NEUE FASSUNG IST DA — UND DIE TAFEL HOLT SIE SICH SELBST
 *
 * Die Vorgabe des Auftraggebers ist ein Satz: „wenn keine partie läuft,
 * aktualisieren.. fertig". Kein Hinweis auf dem Schirm, keine Rückfrage,
 * kein Unterschied zwischen dem Wandschirm im Saal und dem Zählgerät am
 * Tisch. Wo die Kennung herkommt und warum nicht Nuxts eigener Weg, steht in
 * useFassungswechsel.ts.
 * --------------------------------------------------------------------- */

/**
 * „Läuft gerade" — zwei Zustände und keiner mehr.
 *
 * RUNNING ist die Partie am Tisch. TIMEOUT ist sie auch: eine Auszeit ist
 * eine Unterbrechung IN der Partie, die Spieler stehen daneben, die Uhr
 * läuft auf dem Schirm, und ein Neuladen nähme genau diese Uhr weg.
 *
 * Alles andere ist ein Moment zum Laden — und zwar ausdrücklich auch
 * FINISHED und APPROVED: die Partie ist vorbei, der Sieger steht, und was
 * danach am Tisch geschieht (abräumen, nächste Partie rufen) dauert
 * Minuten. Gleiches gilt für READY (die Partie ist gerufen, aber noch nicht
 * angestossen), CREATED, SCHEDULED, NONE und den häufigsten Fall überhaupt:
 * gar keine Partie am Tisch.
 *
 * Die Liste stammt aus `MatchStatus` in shared/types/api.ts und nicht aus
 * einer Vermutung; geraten wird hier nichts.
 */
const partieLaeuft = computed(() => {
  const lage = partie.value?.status
  return lage === 'RUNNING' || lage === 'TIMEOUT'
})

/**
 * WAS AUSSER DER PARTIE NOCH BREMST — und warum es nicht die Vorgabe
 * aufweicht.
 *
 * Der Auftraggeber hat über die PARTIE entschieden. Die beiden Punkte hier
 * sind keine zweite Bedingung derselben Art, sondern der Schutz vor einem
 * Neuladen, das eine gerade laufende BEDIENUNG zerreisst:
 *
 *   - `menueOffen`: vor dem Schirm steht ein Schiedsrichter mit dem Finger
 *     auf der Fläche. Im Menü hängen der Tischwechsel, die Karten, die
 *     Aufgabe und die Rücknahme einer Auszeit — alles mit Rückfrage und
 *     teilweise mit sechs Ziffern, die er schon halb getippt hat. Genau
 *     dieser Zustand lebt NUR im Browser: die halbe Zifferneingabe, die
 *     offene Rückfrage, die gewählte Karte. Er verschwindet beim Laden
 *     ersatzlos, und er ist der Grund, weshalb das Menü sperrt. Es geht von
 *     selbst wieder zu, und dann wird geladen.
 *   - `zaehlwerk.laeuft`: ein Schreibvorgang ist unterwegs. Ein Neuladen
 *     mittendrin liesse den Bediener im Ungewissen, ob sein Druck angekommen
 *     ist — der Stand läge zwar im Server, aber er sähe die Antwort nicht
 *     mehr. Das dauert Sekundenbruchteile; beim nächsten Abruf ist es vorbei.
 *
 * WAS NICHT BREMST, weil es das Laden überlebt: der gemerkte Tisch
 * (`bb.board.table.<eventId>`), die gemerkte Veranstaltung und der
 * Seitentausch (`bb.board.mirror.<eventId>`) liegen alle in localStorage und
 * stehen nach dem Laden unverändert da. Der Stand der Partie liegt ohnehin
 * im Server. Verloren geht: das Sponsorenkarussell fängt von vorn an, und
 * die Auszeit-Uhr wird aus dem Server neu berechnet statt weitergezählt —
 * beides ist ohne laufende Partie bedeutungslos.
 */
const darfNachladen = computed(() =>
  !partieLaeuft.value && !menueOffen.value && !zaehlwerk.laeuft.value)

const fassung = useFassungswechsel({ darf: darfNachladen })

/**
 * Derselbe Zusatz, aber mit dem Anstoß, den die Tafel ZEIGEN soll.
 *
 * Der Anstoßbalken hängt an drei Stellen — auf der Tafel, in der Zählleiste
 * und im Schiedsrichtermenü. Sie lesen alle diese eine Auskunft, und genau
 * deshalb ist die Vorwegnahme kein zweiter Schattenzustand geworden: es
 * gibt weiterhin eine Quelle, sie ist nur eine Schicht höher.
 */
const zusatzAngezeigt = computed(() => {
  const roh = auskunft.value?.match ?? null
  if (!roh) return null
  const a = zaehlwerk.anstossStand.value
  return { ...roh, firstBreak: a.first, nextBreak: a.next }
})

/**
 * DER SPIEGEL: WELCHE SEITE STEHT LINKS
 *
 * A und B sind die Reihenfolge der Auslosung und sagen nichts darüber, wo
 * die beiden am Tisch stehen. Steht der Schirm so, dass der Spieler, den die
 * Tafel links zeigt, physisch rechts spielt, tippt der Zählende systematisch
 * falsch — und zwar ohne es zu merken, weil er auf die Fläche unter dem
 * Namen schaut und nicht auf den Buchstaben.
 *
 * Das Vorgängersystem hat dafür `togglePlayers`. WAS DORT ABER WIRKLICH
 * PASSIERT, ist etwas anderes: es wechselt `nextToBreak`, also wer am Tisch
 * ist, und im Straight Pool zusätzlich die Aufnahme. Eine Vertauschung der
 * Anzeige ist es nicht. Beides ist hier getrennt: der Wechsel am Tisch steht
 * in der Punktfassung der Leiste ("End of turn"), die Vertauschung der
 * Anzeige ist eine Einstellung dieses Schirms und geht an keinen Server.
 *
 * Sie wird bei der Einrichtung gesetzt (/board/<eventId>) und nicht während
 * der Partie: eine Tafel, bei der mitten im Halbfinale die Seiten springen,
 * ist für jeden im Saal ein Fehler.
 */
const links = computed<Seite>(() => (gespiegelt.value ? 'B' : 'A'))
const rechts = computed<Seite>(() => (gespiegelt.value ? 'A' : 'B'))

/**
 * Wer die Distanz erreicht hat — die Bedingung fürs Beenden.
 *
 * Dieselbe wie im Vorgängersystem (`aScore == raceTo or bScore == raceTo`),
 * nur mit `>=`: ein Stand, der aus dem Turnierbüro über die Distanz hinaus
 * gesetzt wurde, soll den Knopf nicht aussperren. Sie steht hier und nicht
 * in der Leiste, weil die Taste 5 der Fernbedienung dieselbe Antwort
 * braucht — zwei Rechnungen für dieselbe Frage laufen auseinander.
 */
const sieger = computed<Seite | null>(() => {
  /*
   * MIT SATZFORMAT GIBT ES DIESEN KNOPF NICHT — das Beenden eines Satzes
   * gehoert dem Schiedsrichtermenue ("Confirm set", Punkt 2 der Aenderung
   * vom 25.09.2026) und nicht der Zaehlleiste. `zaehlwerk.stand` traegt bei
   * Satzformat den Stand IM Satz (gegen `setRaceTo`), waehrend `raceTo` hier
   * die AEUSSERE Zahl der Saetze meint — ein Vergleich der beiden traefe
   * schon nach den ersten Racks eines Satzes zu, lange bevor die Partie
   * durch ist.
   */
  if (satzformat.value) return null
  const z = auskunft.value?.match?.raceTo ?? partie.value?.raceTo ?? 0
  if (z <= 0) return null
  const s = zaehlwerk.stand.value
  if (s.A >= z && s.A > s.B) return 'A'
  if (s.B >= z && s.B > s.A) return 'B'
  return null
})

/** Nur für die Taste "+" der Fernbedienung — siehe tafelTaste. */
const leiste = ref<{
  blockOeffnen: (seite: Seite, vorzeichen: 1 | -1) => void
  /** Die ganze Straight-Pool-Bedienung — siehe spTaste in Zaehlleiste.vue. */
  spTaste: (taste: string) => boolean
  /** Ob dort gerade etwas aussteht; entscheidet, wem die 0 gehört. */
  spWartet: () => boolean
} | null>(null)

/**
 * Das Menü geht zu, wenn seine Grundlage wegfällt.
 *
 * Zwei Fälle, und beide kommen am Turniertag vor: die Partie am Tisch ist zu
 * Ende (auch durch das Menü selbst — nach einer Aufgabe gibt es nichts mehr,
 * worüber es etwas sagen könnte), oder das Gerät zählt plötzlich nicht mehr,
 * weil die Anmeldung abgelaufen ist. Ein Vorhang, der über einer leeren
 * Tafel stehen bliebe, verdeckte im Saal die Sponsoren und liesse sich von
 * niemandem mehr zumachen, der nicht die Tastenfolge kennt.
 */
watch([zaehlen, partie], ([darf, m]) => {
  if (!darf || !m) menueOffen.value = false
})

/**
 * Die Auszeit-Rücknahme des Menüs IST SEIT DEM 15.09.2026 EIN EIGENER WEG.
 *
 * Bis dahin stand hier `zaehlwerk.auszeit(seite, true)` — derselbe Aufruf,
 * den die Fläche der Leiste beim zweiten Tippen macht, mit der Begründung,
 * zwei Aufrufe für dieselbe Sache liefen auseinander. Die Begründung war
 * richtig und die Voraussetzung falsch: es ist NICHT dieselbe Sache. Die
 * Leiste gibt das Guthaben nur binnen zehn Sekunden zurück, und danach
 * beendete dieser Menüpunkt die Auszeit, ohne sie gutzuschreiben. Der
 * Auftraggeber: "wenn ich ueber das schiri menue das timeout zurueck setze,
 * wird es dem spieler nicht mehr gutgeschrieben.."
 *
 * Jetzt geht er über `competition.withdraw_timeout` und schreibt immer gut
 * — und trägt deshalb den Personencode. Die ganze Abwägung steht an
 * `auszeitRuecknahme` in useZaehlwerk.ts.
 */
function auszeitZurueck(seite: Seite, code: string) {
  zaehlwerk.auszeitRuecknahme(seite, code)
}

/**
 * Steht eine Shot-Clock an, die noch niemand zur Kenntnis genommen hat?
 *
 * <p>Nur dafür gibt es die Taste R und den Punkt im Menü. Gelesen wird
 * `zusatzAngezeigt` und nicht `auskunft` direkt: das ist derselbe Stand, den
 * auch die Zählleiste und das Menü sehen — eine zweite Quelle für dieselbe
 * Frage liefe der ersten früher oder später davon.
 *
 * <p>Es laufen hier keine Sekunden mit. Die Shot-Clock führt der
 * Schiedsrichter am Tisch; dieses Gerät weiss nur, DASS sie gilt.
 */
const shotClockOffen = computed(() => {
  const sc = zusatzAngezeigt.value?.shotClock
  return !!sc && sc.acknowledgedAt === null
})

/**
 * Die Seite, wie die Tafel sie zeigt — mit dem Stand, den das Zählwerk hält.
 *
 * Nur wenn er abweicht: `displayScore` ist nicht immer eine Ziffer, sondern
 * bei einer Aufgabe "FF" und bei einer Disqualifikation "DIS". Das würde
 * eine Rechnung überschreiben, die es gar nicht gibt.
 */
function tafelseite(seite: Seite): MatchSide {
  const roh = seite === 'A' ? partie.value!.sideA : partie.value!.sideB
  if (!zaehlen.value) return roh
  const eigen = zaehlwerk.stand.value[seite]
  /*
   * MIT SATZFORMAT UEBERSCHREIBT DER ZIFFERBLOCK `setScore` UND NICHT
   * `score`.
   *
   * `zaehlwerk.stand` traegt bei Satzformat den Stand IM laufenden Satz
   * (gegen `setRaceTo`) — das ist die SATZANZEIGE weiter unten und das
   * Schiedsrichtermenue (dessen "Confirm set" erst anklickbar wird, sobald
   * `setScore` die Distanz erreicht). Die grosse Zahl (`score`/
   * `displayScore`) bleibt unberuehrt: sie zeigt den Aussenstand
   * (gewonnene Saetze), und der aendert sich nur beim Abschliessen eines
   * Satzes — also mit dem naechsten Abruf, nicht mit jedem Rack.
   */
  if (satzformat.value) {
    if (eigen === (roh.setScore ?? 0)) return roh
    return { ...roh, setScore: eigen }
  }
  if (eigen === (roh.score ?? 0)) return roh
  return { ...roh, score: eigen, displayScore: String(eigen) }
}

/**
 * DIE SATZANZEIGE — beide Stände, so wie sie aus fünf Metern lesbar sind.
 *
 * `null`, solange die Partie weder ein Satzformat traegt noch in Frames
 * laeuft: an einer gewöhnlichen Partie aendert sich an der Tafel dann
 * NICHTS — genau das verlangt die Aenderung vom 25.09.2026 ausdruecklich.
 *
 * WARUM EINE ZEILE IN DER MITTE UND NICHT EINE ZWEITE ZAHL JE SEITE.
 *
 * Die Verwaltung schreibt den Satzstand als "7:4 (5:0)" — aussen die Sätze,
 * in Klammern der laufende. Auf dem Papier passt das in eine Zeile; auf der
 * Tafel wäre "(5:0)" klein neben einer meterhohen "7" aus fünf Metern nicht
 * mehr zu lesen, und "5" unter Spieler A, "0" unter Spieler B nebeneinander
 * unter zwei fernen Ziffern liesse sich nicht mehr als EIN Verhältnis lesen
 * (siehe die durchgerechnete Höhenbudget-Tabelle in `Side.vue` — eine
 * weitere Zeile dort würde diese Rechnung neu aufmachen, für eine Angabe,
 * die nur eine Minderheit der Partien überhaupt betrifft).
 *
 * Die Mitte der Tafel dagegen ist für genau solche Zusatzangaben gebaut
 * (siehe `board__disziplin`, `board__begegnung`, `board__zeitlimit`), sie
 * liegt zwischen den beiden Spielern — wo ein VERHAELTNIS zwischen ihnen
 * hingehoert — und sie ist gross genug, den laufenden Stand als EIGENE,
 * lesbare Zahl zu zeigen und nicht als Fussnote unter der grossen. Die
 * Reihenfolge links/rechts folgt `links`/`rechts` wie überall auf dieser
 * Tafel — wer links steht, steht auch hier links.
 *
 * SNOOKER LIEFERT DEN INNEREN STAND NICHT VOM SERVER (siehe `Match.
 * setRaceTo`) — hier tritt `frameStand`/`frameNummer` an seine Stelle, rein
 * im Geraet gefuehrt (siehe dort).
 */
const satzanzeige = computed<{ label: string, nummer: number, links: number, rechts: number } | null>(() => {
  const m = partie.value
  if (!m) return null
  if (istSnooker.value) {
    return {
      label: 'Frame',
      nummer: frameNummer.value,
      links: frameStand.value[links.value],
      rechts: frameStand.value[rechts.value],
    }
  }
  if (m.currentSetNo === null) return null
  const s = zaehlwerk.stand.value
  return { label: 'Set', nummer: m.currentSetNo, links: s[links.value], rechts: s[rechts.value] }
})

/**
 * DIE AUFNAHME EINER SEITE, so wie sie auf der Tafel stehen soll.
 *
 * `null` bei allem ausser 14.1 endlos: dort gibt es weder eine laufende
 * Aufnahme noch einen High run, und eine Zeile, die reserviert bleibt, um
 * leer zu sein, nähme der 9-Ball-Tafel Höhe für nichts.
 *
 * DIE LAUFENDE NUR BEIM SPIELER AM TISCH. Sie ist eine Aussage über das,
 * was GERADE passiert; beim anderen wäre sie ein Rest von vorhin. Der High
 * run steht bei beiden — er ist die Zahl, die im Saal verglichen wird.
 *
 * Aus dem Zählwerk und nicht aus dem Abruf, genau wie `tafelseite` den
 * Stand: wer gerade getippt hat, soll die Zahl im selben Augenblick steigen
 * sehen und nicht beim nächsten Abruf.
 */
function aufnahme(seite: Seite): { lauf: number | null, high: number } | null {
  if (modus.value !== 'STRAIGHT_POOL') return null
  const l = zaehlwerk.lage.value
  return {
    lauf: zaehlwerk.amTisch.value === seite ? l.lauf[seite] : null,
    high: l.high[seite],
  }
}

/**
 * Die Partie MIT dem Stand, den das Zählwerk hält — für das
 * Schiedsrichter-Menü.
 *
 * Es zeigt den Stand oben klein mit und rechnet mit ihm: "Karlsson wins 6–4"
 * steht auf der Aufgabe-Fläche, und das muss dieselbe 6 sein, die eine
 * Handbreit darüber auf der Tafel steht. `partie` allein wäre der Stand des
 * letzten Abrufs und damit bis zu zehn Sekunden alt — wer gerade den
 * sechsten Satz gezählt hat und dann die Aufgabe bestätigt, schriebe 5–4
 * fest.
 */
const tafelpartie = computed<Match | null>(() => {
  const m = partie.value
  if (!m) return null
  return { ...m, sideA: tafelseite('A'), sideB: tafelseite('B') }
})

/**
 * DER RUHEZUSTAND: DIE SPONSOREN DER VERANSTALTUNG
 *
 * Zwischen zwei Partien stand hier bisher ein Satz und sonst nichts. Ein
 * Bildschirm, der eine halbe Stunde lang "NEXT MATCH TO FOLLOW" zeigt, ist
 * verschenkte Fläche — und die Sponsoren einer Veranstaltung sind genau das,
 * was dort hingehört: Sie bezahlen den Saal, in dem der Bildschirm steht.
 *
 * Es ist KEIN zweiter Betriebszustand. Kommt eine Partie an den Tisch,
 * übernimmt sie ohne Frage und ohne Verzögerung; das Karussell hat keinen
 * Vorrang, kein "erst zu Ende laufen" und keinen eigenen Schalter. Wer vor
 * dem Tisch steht, will den Stand sehen und nicht Werbung, die sich noch
 * zwei Logos Zeit lässt.
 */

/**
 * Wie lange ein Logo steht — nach Rang.
 *
 * Gemessen am Blick und nicht am Gefühl: wer an einem Tisch vorbeigeht,
 * sieht den Bildschirm zwei bis drei Sekunden an. Acht Sekunden heißen also,
 * dass jeder Vorbeigehende mindestens ein Logo ganz sieht, und wer stehen
 * bleibt, in einer Minute sieben verschiedene. Vier Sekunden wären Flackern
 * neben einem laufenden Turnier; zwanzig sähen aus, als hinge das Bild.
 *
 * Der Hauptsponsor steht doppelt so lang wie ein regulärer und bekommt
 * zusätzlich mehr Fläche (siehe unten). Beides zusammen und nicht nur eines:
 * Zeit allein fällt niemandem auf, der nur einmal hinsieht, Fläche allein
 * geht unter, wenn danach sofort das nächste Logo kommt. Ein Hauptsponsor,
 * der unauffällig zwischen zwei kleinen steht, ist das, wofür er nicht
 * bezahlt hat.
 */
const STANDZEIT_MS: Record<SponsorRank, number> = {
  MAIN: 16_000,
  PREMIUM: 11_000,
  REGULAR: 8_000,
}

/**
 * Logos, deren Bild nicht lädt, fallen aus dem Lauf.
 *
 * Sonst stünde an ihrer Stelle acht Sekunden lang eine leere weiße Fläche,
 * und die sieht im Saal aus wie ein Defekt. Nur für diese Sitzung gemerkt:
 * beim nächsten Laden des Bildschirms wird es wieder versucht — ein Bild
 * fehlt selten für immer, meistens war die Anwendung gerade neu gestartet.
 */
const defekt = ref<string[]>([])

const sponsoren = computed(() =>
  (stand.value?.sponsors ?? []).filter(s => !defekt.value.includes(s.id)))

/**
 * Das Karussell läuft NUR, wenn keine Partie da ist und mindestens ein Logo
 * übrig bleibt. Ohne Sponsoren bleibt es beim bisherigen Hinweis: ein
 * Karussell ohne Bilder wäre ein schwarzer Bildschirm im Saal, und der ist
 * von einem Ausfall nicht zu unterscheiden.
 */
const karussell = computed(() => !partie.value && sponsoren.value.length > 0)

const stelle = ref(0)
const jetzigerSponsor = computed(() => sponsoren.value[stelle.value] ?? null)

let sponsorUhr: ReturnType<typeof setTimeout> | null = null

/**
 * Der Weiterschalter.
 *
 * setTimeout je Logo und nicht ein setInterval über alle: die Standzeit
 * hängt am Rang, und ein fester Takt könnte sie nicht unterscheiden.
 *
 * BEI GENAU EINEM SPONSOR LÄUFT GAR KEINE UHR. Ein Logo, das alle acht
 * Sekunden gegen sich selbst überblendet, ist kein Karussell, sondern ein
 * Bildschirm, der blinkt — und im Saal die Frage, ob der Fernseher kaputt
 * ist. Ein Sponsor steht also einfach da, so lange der Tisch frei ist.
 */
function sponsorUhrStellen() {
  if (sponsorUhr) {
    clearTimeout(sponsorUhr)
    sponsorUhr = null
  }
  if (!karussell.value || sponsoren.value.length < 2) return

  const dauer = STANDZEIT_MS[jetzigerSponsor.value?.rank ?? 'REGULAR'] ?? STANDZEIT_MS.REGULAR
  sponsorUhr = setTimeout(() => {
    stelle.value = (stelle.value + 1) % sponsoren.value.length
    sponsorUhrStellen()
  }, dauer)
}

/**
 * Neu gestellt wird nur, wenn sich die Lage ändert: Partie kommt oder geht,
 * oder die Liste ist eine andere geworden. Der Abruf alle zehn Sekunden
 * liefert dieselbe Liste und darf das laufende Logo NICHT zurücksetzen —
 * sonst stünde immer dasselbe erste Logo da und wechselte nie.
 */
const sponsorenSchluessel = computed(() => sponsoren.value.map(s => s.id).join(','))

watch([karussell, sponsorenSchluessel], () => {
  // Ist ein Sponsor weggefallen, kann die Stelle ins Leere zeigen.
  if (stelle.value >= sponsoren.value.length) stelle.value = 0
  sponsorUhrStellen()
})

/** Die Beschriftung über dem Logo. REGULAR bekommt keine — "Partner" unter
 *  jedem zweiten Logo sagt nichts und nimmt dem Rang seine Bedeutung. */
function rangText(rang: SponsorRank): string {
  return rang === 'MAIN' ? 'Main partner' : rang === 'PREMIUM' ? 'Premium partner' : ''
}

const { formatMatchTime } = useDateFormat()

/**
 * DAS WAPPEN IN DER MITTE — ZWEI STUFEN, NICHT DREI
 *
 * Im epbf-website-Original stand hier eine dritte Stufe zwischen dem
 * Veranstalter und dem Schriftzug: `tenant.crestImage`, die Marke des
 * VERBANDS, dessen Seite die Tafel damals war. Diese Tafel gehört keinem
 * Verband (siehe LIESMICH.md) und kennt deshalb keine zweite Marke neben
 * der eigenen — sie fällt vom Logo des Veranstalters unmittelbar auf den
 * Schriftzug zurück, wie `tenant.crestImage` es dort ohnehin immer tat: es
 * stand im Bestand auf `null`.
 *
 * NICHT über `v-if` im Schablonenteil aufgereiht: dort stünde eine Frage in
 * zwei Zweigen, und der Alternativtext müsste zweimal verzweigen.
 */
const wappenBild = computed(() => stand.value?.organiserLogo?.url ?? '')

/** Der Alternativtext gehört zu dem Bild, das tatsächlich hängt. */
const wappenText = computed(() =>
  stand.value?.organiserLogo?.alt || MARKENNAME)

/**
 * DIE TISCHNUMMER, ZWEISTELLIG — "T07" UND NICHT "TABLE 7"
 *
 * Sie steht in der Mitte unter dem Wappen, dort, wo sie im Vorgängersystem
 * steht. Die führende Null ist kein Schmuck: wer durch die Halle geht,
 * liest zwanzig Tafeln als Muster und nicht als Wort, und "T07" hat neben
 * "T10" dieselbe Form. Das Wort "Table" spart sie sich — auf einem
 * Bildschirm neben einem Billardtisch ist nichts anderes gemeint.
 */
const tischschild = computed(() =>
  `T${String(stand.value?.tableNumber ?? tischNummer).padStart(2, '0')}`)

/**
 * Der eigene Name des Tisches — aber nur, wenn er mehr sagt als die Nummer.
 *
 * Die meisten Tische heissen schlicht "Table 9", und daneben stand bisher
 * "Table 9 · Table 9". Ein Name wie "TV Table" oder "Arena" ist die
 * Auskunft, für die das Feld da ist; die Nummer noch einmal ist keine.
 */
const tischname = computed(() => {
  const name = stand.value?.tableName?.trim()
  const nummer = stand.value?.tableNumber ?? tischNummer
  if (!name || name.toLowerCase() === `table ${nummer}`) return ''
  return name
})

/**
 * WAS AN DIE STELLE DER KUGEL TRITT
 *
 * Im Vorgängersystem steht in der Mitte eine gezeichnete Kugel mit der
 * Zahl der Disziplin darauf. Ein Bild dafür gibt es hier nicht:
 * `sport.discipline` trägt Schlüssel, Namen, Mnemonik und Regelwerk, aber
 * kein Bildfeld — und ein leerer Rahmen an dieser Stelle sähe aus wie ein
 * Bild, das nicht geladen hat.
 *
 * An seiner Stelle steht der NAME der Disziplin, groß gesetzt: "9-BALL"
 * trägt dieselbe Auskunft wie die Kugel mit der 9 und wird aus fünf
 * Metern schneller gelesen als eine Grafik gedeutet. Nicht das Kürzel
 * ("9B", "10B"): es spart drei Zeichen und kostet die
 * Selbstverständlichkeit — Platz ist in der Mitte genug.
 *
 * VERWORFEN: eine Kugel nachzeichnen (Kreis, Band, Zahl darin). Sie wäre
 * für 9-Ball und 10-Ball richtig und für Straight Pool, Blackball oder
 * Artistic Pool falsch, und die Tafel müsste eine Zeichnung je Disziplin
 * pflegen, die in den Daten nicht vorkommt.
 */
const disziplin = computed(() =>
  partie.value?.discipline?.name || partie.value?.discipline?.code || '')

/**
 * Auch die Disziplin rechnet mit ihrer Länge, aus demselben Grund wie die
 * Namen: "9-BALL" hat sechs Zeichen, "STRAIGHT POOL" dreizehn, und die Mitte
 * ist mit 26 vw fest. Was nicht passt, wird kleiner gesetzt — es bricht
 * nicht um und läuft nicht in die Spielerspalten.
 */
/*
 * Die Disziplin rechnet an der MITTELSPALTE und nicht mehr am Fenster:
 * `.board__mitte` ist ein Größen-Container (siehe CSS), 100 cqw sind dort
 * ihre Breite. 80 statt 100 cqw lassen dem Wort beidseitig Luft — die
 * Umrandung kostet zusätzlich 0,85 em Polster je Seite.
 */
const disziplinMass = computed(() => {
  const zeichen = Math.max(disziplin.value.length, 1)
  return `min(5.8cqh, ${(80 / (zeichen * 0.78)).toFixed(2)}cqw)`
})

/**
 * MANNSCHAFTSBEGEGNUNG: WOZU DIESE ZWEI SPIELER GEHÖREN
 *
 * An Tisch 7 stehen zwei Einzelspieler, aber sie spielen das zweite Einzel
 * einer Begegnung zweier Länder. Zu sehen war davon bisher nur der
 * Turniername ("Men Teams") klein oben links — wer davorstand, hielt es
 * für ein Einzelturnier, und die beiden Flaggen für zwei Nationalitäten
 * statt für zwei Mannschaften.
 *
 * Gezeigt wird es deshalb in der MITTE, zwischen den beiden Spielern: die
 * Begegnung ist genau das, was die beiden verbindet, und in der Mitte steht
 * auf dieser Tafel alles, was beiden gemeinsam ist. Welche Verbände
 * gegeneinander stehen, sagen die Flaggen unten ohnehin — bei einem Einzel
 * einer Begegnung ist `representsCountry` der Verband der Mannschaft.
 *
 * WAS FEHLT UND HIERMIT GEMELDET IST: der Stand der Begegnung selbst
 * ("Germany 1 : 0 Poland"). `TableBoard.match` ist das Einzel am Tisch,
 * `tie` deshalb leer, und von der Begegnung darüber kommt nur
 * `parentMatchId` mit. Sie nachzuladen hieße, je Bildschirm alle zehn
 * Sekunden eine zweite Abfrage zu stellen; richtig wäre, dass die
 * Tafelantwort den Stand der Begegnung mitbringt.
 */
const begegnung = computed(() => {
  const m = partie.value
  if (!m?.parentMatchId) return null
  return m.rubberSeq ? `Team match · Rubber ${m.rubberSeq}` : 'Team match'
})

/**
 * Der Zustand in einem Wort — und nie der rohe Schlüssel.
 *
 * `MatchStatus` kennt acht Werte, und die meisten beantworten Fragen der
 * Turnierleitung: CREATED heißt "im Baum angelegt", APPROVED "abgenommen".
 * Vor der Tafel steht das Publikum, und es unterscheidet drei Dinge: es
 * läuft, es geht gleich los, es ist vorbei. Alles andere bleibt leer und
 * fällt aus der Zeile — ein "SCHEDULED" auf einem Bildschirm im Saal ist
 * Innenleben.
 */
function zustandswort(status: MatchStatus): string {
  switch (status) {
    case 'RUNNING': return 'Running'
    case 'TIMEOUT': return 'Time out'
    case 'READY': return 'On table'
    case 'FINISHED':
    case 'APPROVED': return 'Final'
    default: return ''
  }
}

/**
 * DIE FUSSZEILE: DIE NEBENSACHEN IN EINER ZEILE
 *
 * Turnier, Runde, Partiekennung, Anstosszeit, Distanz, Zustand — dieselbe
 * Reihenfolge wie im Vorgängersystem, von der größten Einheit zur
 * kleinsten.
 *
 * Gebaut als LISTE und erst danach verbunden. Der Trennpunkt entsteht so
 * zwischen zwei vorhandenen Angaben und niemals vor einer fehlenden: ein
 * Einzel einer Begegnung hat nie eine angesetzte Zeit, eine Begegnung
 * keine Distanz in Racks, und " ·  · " sieht im Saal nach einem Defekt der
 * Anzeige aus. Aus demselben Grund kein "Time: tba": eine Angabe, die es
 * nicht gibt, fällt weg, statt sich als Platzhalter zu behaupten.
 *
 * Der Name der Veranstaltung steht NICHT dabei: die Halle, in der der
 * Bildschirm hängt, ist die Veranstaltung. Er steht auf der Tafel nur
 * dann, wenn kein Spiel läuft und niemand ihn sonst woher weiß.
 */
const fusszeile = computed<string[]>(() => {
  const m = partie.value
  if (!m) return []
  return [
    m.tournamentName,
    m.roundLabel,
    m.label ? `Match ${m.label}` : '',
    m.scheduledTime ? formatMatchTime(m.scheduledTime) : '',
    m.raceTo ? `Race to ${m.raceTo}` : '',
    zustandswort(m.status),
  ].filter(teil => !!teil)
})

useHead({
  /*
   * Als Funktion und nicht als Wert: die Partie am Tisch wechselt, ohne dass
   * die Seite neu geladen wird, und ein einmal berechneter Titel zeigte
   * abends noch die Namen vom Vormittag. Auf der Tafel selbst sieht das
   * niemand -- im Reiterkopf des Rechners, der sie betreibt, schon.
   */
  title: () => (partie.value
    ? `Table ${tischNummer} – ${partie.value.sideA.displayName} v ${partie.value.sideB.displayName}`
    : `Table ${tischNummer} – ${stand.value?.eventName ?? MARKENNAME}`),
  /*
   * Nicht in den Index. Eine Tafel ist für den Saal und nicht für die Suche;
   * ein Treffer "Table 7" führte Monate später auf eine leere Seite.
   */
  meta: [{ name: 'robots', content: 'noindex, nofollow' }],
  htmlAttrs: { class: 'board-screen' },
})
</script>

<template>
  <!--
    Der lange Druck liegt auf dem ganzen Rahmen und nicht auf einer Fläche in
    einer Ecke: wer den Schirm umsetzt, sucht keine unsichtbare Ecke. `pointer`
    und nicht `touch`, damit Maus, Finger und Stift denselben Weg nehmen.
  -->
  <div
    class="board"
    @pointerdown="druckAn" @pointerup="druckAus"
    @pointercancel="druckAus" @pointerleave="druckAus"
  >
    <template v-if="unbekannt">
      <div class="board__hint">
        <p class="board__hint-title">Unknown event</p>
        <p class="board__hint-text">Check the address of this screen.</p>
      </div>
    </template>

    <template v-else>
      <!--
        Die Kopfzeile nur im Ruhezustand. Während einer Partie steht dieselbe
        Auskunft dort, wo die Tafel sie braucht: der Tisch in der Mitte, das
        Turnier unten in der Fußzeile. Zweimal braucht es beides nicht, und
        oben gehört die Fläche dem Stand.
      -->
      <header v-if="!partie" class="board__head">
        <span class="board__tournament">{{ stand?.eventName ?? '' }}</span>
        <span class="board__table">
          Table {{ stand?.tableNumber ?? tischNummer }}
          <template v-if="tischname"> · {{ tischname }}</template>
        </span>
      </header>

      <!--
        DIE TAFEL: LINKS EIN SPIELER, RECHTS EINER, DAZWISCHEN DAS TURNIER
      -->
      <main
        v-if="partie"
        class="board__partie"
        :class="{ 'board__partie--offen': zaehlwerk.unbestaetigt.value }"
      >
        <!--
          `links` und `rechts` statt A und B: welche Seite der Partie wo
          steht, entscheidet dieser Schirm (siehe Spiegel oben) und nicht die
          Auslosung. Der Schlüssel trägt den Buchstaben mit — ohne ihn setzte
          Vue beim Umschalten die Komponente an ihrer Stelle um, und dann
          hinge am neuen Spieler die Schriftgröße des alten Namens.
        -->
        <BoardSide
          :key="`seite-${links}`"
          :side="tafelseite(links)"
          :breaking="zaehlwerk.anstossStand.value.next === links"
          :timeout="auszeiten[links] ?? null"
          :aufnahme="aufnahme(links)"
          align="start"
        />

        <div class="board__mitte">
          <!--
            Das Wappen in der Mitte, in zwei Stufen.

            ZUERST das Logo des Veranstalters aus der Tafelantwort. Es ist
            die richtige Quelle, weil eine Tafel zu einer Veranstaltung
            gehört und die einem Veranstalter — auf derselben Anlage können
            zwei Mandanten nebeneinander spielen, und dann sind es zwei
            verschiedene Logos.

            SONST das Kürzel dieser Tafel als Schriftzug (`MARKENKUERZEL`) —
            dieselbe Lösung wie im epbf-website-Original, das hier noch eine
            dritte, verbandseigene Stufe dazwischen kannte (`tenant.
            crestImage`). Die gibt es auf einer Tafel ohne Verband nicht.

            `url` und nicht `thumbnailUrl`: media.variant ist im Bestand
            praktisch leer, jede Anfrage auf /THUMB fällt still auf das
            Original zurück. Der Umweg kostet einen Rundlauf und bringt
            nichts.
          -->
          <img
            v-if="wappenBild"
            :src="wappenBild"
            :alt="wappenText"
            class="board__wappen-bild"
          >
          <p v-else class="board__wappen">{{ MARKENKUERZEL }}</p>

          <p class="board__tischschild">{{ tischschild }}</p>

          <p
            v-if="disziplin"
            class="board__disziplin"
            :style="{ fontSize: disziplinMass }"
          >{{ disziplin }}</p>

          <p v-if="begegnung" class="board__begegnung">{{ begegnung }}</p>

          <!--
            DIE ZEITLIMIT-UHR (HEYBALL) — in der Mitte und nicht bei einer
            Seite: sie gehört keinem der beiden Spieler, sondern der Partie.
            Nur bei gesetztem Zeitlimit im Dokument (`zeitlimit` ist sonst
            `null`) — an den allermeisten Turnieren gibt es keins, und dort
            ändert sich hier nichts.

            STEHT SICHTBAR ANDERS AUS ALS LAUFEND: `--pausiert` nimmt die
            Füllung und setzt einen gestrichelten Rand — Stillstand ist
            zwischen zwei Racks der HÄUFIGSTE Zustand und darf nicht wie ein
            hängengebliebener Bildschirm aussehen. `--ueber` (Zeit abgelaufen)
            bekommt den Ton der Shot-Clock: dieselbe Farbe für "hier muss
            der Schiedsrichter ran".
          -->
          <p
            v-if="zeitlimit"
            class="board__zeitlimit"
            :class="{
              'board__zeitlimit--pausiert': !zeitlimit.running,
              'board__zeitlimit--ueber': zeitlimit.ueberzogen,
            }"
          >
            <span v-if="!zeitlimit.running" class="board__zeitlimit-marke" aria-hidden="true">II</span>
            {{ zeitlimit.ueberzogen ? 'Time limit up' : 'Time limit' }} {{ zeitlimit.text }}
          </p>

          <!--
            DIE SATZANZEIGE — Sätze bzw. Frames, seit dem 25.09.2026.

            Nur, wenn die Partie ein Satzformat trägt oder in Frames läuft
            (`satzanzeige` ist sonst `null`) — an jeder anderen Partie ändert
            sich hier nichts. Siehe die Begründung an `satzanzeige`: die
            Mitte und nicht eine zweite Zeile je Spieler, weil hier ein
            VERHÄLTNIS zwischen den beiden steht und nicht eine zweite
            eigene Zahl.
          -->
          <p v-if="satzanzeige" class="board__satz">
            <span class="board__satz-label">{{ satzanzeige.label }} {{ satzanzeige.nummer }}</span>
            <span class="board__satz-stand">{{ satzanzeige.links }}:{{ satzanzeige.rechts }}</span>
          </p>
        </div>

        <BoardSide
          :key="`seite-${rechts}`"
          :side="tafelseite(rechts)"
          :breaking="zaehlwerk.anstossStand.value.next === rechts"
          :timeout="auszeiten[rechts] ?? null"
          :aufnahme="aufnahme(rechts)"
          align="end"
        />
      </main>

      <!--
        Der Ruhezustand. Entweder die Sponsoren oder der Hinweis — nie beides
        und nie nichts.
      -->
      <main v-else-if="karussell" class="board__idle board__idle--sponsors">
        <!--
          ALLE Logos stehen im Dokument, sichtbar ist eines.
          So sind sie geladen, bevor sie an die Reihe kommen; würde je Wechsel
          ein neues <img> eingehängt, zeigte der Schirm bei jedem Wechsel
          erst eine leere Fläche und dann das Bild. Bei einer Handvoll Logos
          kostet das nichts.
        -->
        <div class="board__stage">
          <figure
            v-for="(sponsor, i) in sponsoren"
            :key="sponsor.id"
            class="board__sponsor"
            :class="[
              `board__sponsor--${sponsor.rank.toLowerCase()}`,
              { 'board__sponsor--on': i === stelle },
            ]"
            :aria-hidden="i !== stelle"
          >
            <figcaption v-if="rangText(sponsor.rank)" class="board__sponsor-rank">
              {{ rangText(sponsor.rank) }}
            </figcaption>
            <span class="board__plate">
              <img
                :src="sponsor.logo.url"
                :alt="sponsor.name"
                decoding="async"
                @error="defekt.push(sponsor.id)"
              >
            </span>
          </figure>
        </div>
        <p class="board__idle-text">Next match to follow</p>
      </main>

      <main v-else class="board__idle">
        <p class="board__idle-table">Table {{ stand?.tableNumber ?? tischNummer }}</p>
        <p class="board__idle-event">{{ stand?.eventName ?? '' }}</p>
        <p class="board__idle-text">Next match to follow</p>
      </main>

      <!--
        DIE ZÄHLLEISTE — nur auf einem eingerichteten, angemeldeten Gerät.

        Sie steht zwischen Tafel und Fußzeile und nimmt sich die Luft, die
        dort ohnehin war. Über den Stand legt sie sich nicht: Zuschauer sehen
        auf dasselbe Gerät, und die grösste Zahl des Bildes bleibt die
        grösste Zahl des Bildes.
      -->
      <BoardZaehlleiste
        v-if="zaehlen && partie && !istSnooker"
        ref="leiste"
        class="board__zaehlleiste"
        :partie="partie"
        :modus="modus"
        :stand="zaehlwerk.stand.value"
        :lage="zaehlwerk.lage.value"
        :am-tisch="zaehlwerk.amTisch.value"
        :zusatz="zusatzAngezeigt"
        :auszeit-laeuft="{ A: !!auszeiten.A, B: !!auszeiten.B }"
        :sieger="sieger"
        :distanz-erreicht="zaehlwerk.distanzErreicht.value"
        :links="links"
        :rechts="rechts"
        :laeuft="zaehlwerk.laeuft.value"
        :fehler="zaehlwerk.fehler.value"
        :kann-zurueck="zaehlwerk.kannZurueck.value"
        @zaehlen="(seite, schritt) => zaehlwerk.zaehlen(seite, schritt)"
        @zurueck="zaehlwerk.zurueck()"
        @anstoss="seite => zaehlwerk.anstoss(seite)"
        @auszeit="(seite, laeuftGerade) => zaehlwerk.auszeit(seite, laeuftGerade)"
        @beenden="zaehlwerk.beenden()"
        @rest="uebrig => zaehlwerk.restEintragen(uebrig)"
        @rack="auchDieFuenfzehnte => zaehlwerk.rack(auchDieFuenfzehnte)"
        @safety="zaehlwerk.safety()"
        @foul="griff => zaehlwerk.foul(griff)"
        @tisch="zaehlwerk.tischWechseln()"
      />

      <!--
        SNOOKER — DIE BALLWERTE STATT DES GEWOHNTEN ZIFFERBLOCKS.

        Siehe die Begründung an `istSnooker` und am Kopf von
        `BoardBallwerte.vue`: `PUT /score` schriebe ohne Satzformat direkt
        den Aussenstand (gewonnene Frames), und genau das darf ein
        versenkter Ball nicht auslösen. Diese Fläche schickt deshalb nichts
        an die Verwaltung — sie meldet nur, WAS am Tisch passiert ist, und
        [table].vue führt daraus den lokalen Frame-Stand (`frameStand`).
      -->
      <BoardBallwerte
        v-else-if="zaehlen && partie && istSnooker"
        class="board__zaehlleiste"
        :links="links"
        :rechts="rechts"
        :stand="frameStand"
        :kann-zurueck="!!frameLetzter"
        @pot="(seite, wert) => frameBall(seite, wert)"
        @foul="(seite, punkte) => frameFoul(seite, punkte)"
        @zurueck="frameZurueck()"
      />

      <!--
        Eingerichtet zum Zählen, aber es geht nicht: dann steht hier, warum.
        Nicht als Fehlerbild über der ganzen Tafel — die Partie läuft
        weiter und der Saal soll sie sehen —, sondern als eine Zeile, die
        der Turnierleitung sagt, was zu tun ist.
      -->
      <p v-else-if="zaehlHindernis" class="board__zaehlhinweis">
        {{ zaehlHindernis }} · press 0 twice to set this screen up again
      </p>

      <!--
        DAS SCHIEDSRICHTER-MENÜ — der Vorhang über allem.

        Es steht hier unten und nicht in der Zählleiste, obwohl beide
        dieselbe Bedingung haben: die Leiste ist ein Teil der Tafel und
        liegt in ihrem Raster, das Menü legt sich darüber (`position:
        fixed`). Ein Vorhang, der in einer Rasterzeile hinge, wäre so hoch
        wie diese Zeile.
      -->
      <BoardSchirimenue
        v-if="menueOffen && zaehlen && tafelpartie"
        :partie="tafelpartie"
        :zusatz="zusatzAngezeigt"
        :links="links"
        :rechts="rechts"
        :auszeit-laeuft="{ A: !!auszeiten.A, B: !!auszeiten.B }"
        :modus="modus"
        :als-mensch="auskunft?.actingAs === 'PERSON'"
        :laeuft="zaehlwerk.laeuft.value"
        :fehler="zaehlwerk.fehler.value"
        :fassung="fassung.kurz"
        :fassung-wartet="fassung.wartet.value"
        :zeitlimit="zeitlimit"
        @schliessen="menueOffen = false"
        @tischwechsel="zurueckZurWahl()"
        @auszeit-zurueck="(seite, code) => auszeitZurueck(seite, code)"
        @aufgabe="(seite, art, code) => zaehlwerk.aufgeben(seite, art, code)"
        @shot-clock="zaehlwerk.shotClockBestaetigen()"
        @zeitlimit-laufen="laufend => zaehlwerk.zeitlimitLaufen(laufend)"
        @zeitlimit-beenden="shootoutWinner => zaehlwerk.zeitlimitBeenden(shootoutWinner)"
        @satz-abschliessen="winner => satzAbschliessenGeklickt(winner)"
      />

      <footer class="board__foot">
        <!--
          Drei Spalten: links nichts, Mitte die Angaben zur Partie, rechts
          die Verbindung. Die leere linke Spalte ist der Ausgleich für die
          rechte — ohne sie stände die mittlere Zeile um die Breite des
          Verbindungspunktes nach links versetzt.
        -->
        <span />

        <p class="board__angaben">
          <!--
            Der Schlüssel trägt die Stelle mit: zwei Angaben können
            gleich lauten (eine Runde "Final" und ein Zustand "Final"), und
            ein doppelter Schlüssel setzt beim Auffrischen die falsche um.
          -->
          <span
            v-for="(teil, i) in fusszeile"
            :key="`${i}-${teil}`"
            class="board__angabe"
          >{{ teil }}</span>
        </p>

        <!--
          Der Verbindungspunkt. Er steht immer da und wechselt nur die Farbe —
          ein Zeichen, das erst beim Ausfall erscheint, verschiebt in dem
          Moment die ganze Zeile, und die Bewegung fällt mehr auf als der
          Ausfall.

          SEIT DER STAND SOFORT HOCHGEHT, HAT ER MEHR ALS ZWEI ZUSTÄNDE.
          `--offen` ist der kurze: die Zahl oben steht schon, aber die
          Anwendung hat sie noch nicht bestätigt. Er bekommt KEINEN Text —
          "sending" neben einem laufenden Halbfinale wäre Innenleben, und die
          Auskunft steht ohnehin deutlicher am Stand selbst, der in diesem
          Moment blasser wird.

          `--pending` IST DER LANGE ZUSTAND, UND ER BRAUCHT EINEN SATZ.
          `zaehlwerk.netzausfall` steht, solange ein Stand an einem Netzfehler
          gescheitert ist und auf seine Wiederholung wartet (siehe
          `merkposten` in useZaehlwerk.ts) — das kann Minuten dauern, und
          "die Zahl ist blasser" reicht dafür nicht: aus fünf Metern sieht
          blass wie normal aus. Der Satz sagt deshalb ausdrücklich, dass die
          Zahl oben zwar richtig ist, die Anwendung sie aber noch nicht
          gesehen hat — ohne eine Bewegung (kein Kringel, siehe
          WIMPERNSCHLAG_MS in useZaehlwerk.ts) und ohne den Spielbetrieb zu
          unterbrechen: gezählt wird weiter, auch während der Satz steht.

          Er geht vor `--lost`, denn er ist die genauere Auskunft: ein
          Netzausfall zeigt sich hier oft VOR den drei verpassten Abrufen,
          die `verbindungWeg` erst nach dreissig Sekunden auslösen. Steht
          kein Stand mehr aus, aber die Abrufe bleiben trotzdem aus, sagt
          `--lost` weiter "no connection" — das betrifft dann die ganze
          Tafel und nicht nur den letzten Tipp.

          `zaehlwerk.ergebnisAusstehend` GEHT VOR ALLEM ANDEREN. Sie meint
          "beenden"/"aufgeben" — die Partie ist am Tisch entschieden, nur
          die Anwendung weiss es noch nicht, weil auch DIESER Aufruf an
          einem Netzfehler gescheitert ist (siehe die Begründung vor
          `beenden` in useZaehlwerk.ts). Der Satz sagt ausdrücklich NICHT
          "finished" — das würde behaupten, was noch nicht gilt —, sondern
          nur, dass ein Ergebnis hier bereitliegt. Währenddessen ist die
          Leiste ohnehin gesperrt (`laeuft`); dieser Satz ist die einzige
          Auskunft, WARUM sie es noch ist.
        -->
        <span
          class="board__link"
          :class="{
            'board__link--pending': zaehlwerk.ergebnisAusstehend.value || zaehlwerk.netzausfall.value,
            'board__link--lost': !zaehlwerk.ergebnisAusstehend.value && !zaehlwerk.netzausfall.value
              && verbindungWeg,
            'board__link--offen': !zaehlwerk.ergebnisAusstehend.value && !zaehlwerk.netzausfall.value
              && !verbindungWeg && zaehlwerk.unbestaetigt.value,
          }"
        >
          <span class="board__dot" aria-hidden="true" />
          <span v-if="zaehlwerk.ergebnisAusstehend.value">result pending</span>
          <span v-else-if="zaehlwerk.netzausfall.value">not sent yet</span>
          <span v-else-if="verbindungWeg">no connection</span>
        </span>
      </footer>
    </template>
  </div>
</template>

<style>
/*
 * Nicht scoped, weil html und body keiner Komponente gehören. Die Regeln
 * hängen an der Klasse, die useHead nur auf dieser Seite setzt und beim
 * Verlassen wieder entfernt — sonst läge der schwarze Grund nach einer
 * Navigation auf der ganzen Seite.
 */
.board-screen,
.board-screen body {
  height: 100%;
  margin: 0;
  /* Kein Scrollen: die Seite füllt den Bildschirm und endet dort. Ein
     Bildschirm an der Wand hat niemanden, der scrollt. */
  overflow: hidden;
  background: #05080d;
}
</style>

<style scoped>
/*
 * EIGENE FARBEN UND NICHT DIE DER SEITE
 *
 * tenant.css beschreibt eine Marke auf weißem Grund — #404040 auf #ffffff.
 * Hier ist es umgekehrt: dunkler Saal, heller Text, und der Kontrast muss
 * aus fünf Metern tragen. Die Marke bleibt trotzdem sichtbar, aber nur als
 * Akzent (Anstoß, Auszeit) und nicht als Fläche.
 *
 * Die Maße sind in dvh und nicht in rem: die Tafel soll den Bildschirm füllen,
 * gleich ob er 32 oder 75 Zoll misst — und eine Schrift in Pixeln wäre auf
 * dem großen Gerät genauso klein wie auf dem kleinen. Gerechnet ist mit 16:9
 * quer; die zweite Grenze in vw fängt schmalere Geräte ab, damit ein langer
 * Name nicht aus dem Bild läuft.
 */
.board {
  /*
   * KEIN MARKIEREN, KEIN LUPENGLAS, KEIN KONTEXTMENÜ.
   *
   * Der lange Druck öffnet das Schiedsrichtermenü (siehe `druckAn` oben) —
   * und genau dieselbe Geste ist auf iOS die zum Markieren von Text. Wer am
   * Tablet den Rahmen festhielt, bekam den halben Spielernamen blau
   * hinterlegt, dazu die Lupe und die Leiste "Kopieren | Nachschlagen",
   * während hinter alldem das Menü aufging.
   *
   * Die Zähltasten tragen das schon einzeln (Zaehltaste.vue) — der Rahmen
   * mit Namen, Stand und Tischnummer nicht, und der ist die Fläche, die man
   * festhält.
   *
   * Auf dem ganzen Rahmen und nicht nur auf der Schrift: die Geste gilt für
   * den ganzen Schirm, also darf nirgends darauf etwas anspringen.
   * `-webkit-touch-callout` ist die zweite Hälfte und nicht dieselbe Sache —
   * ohne sie bleibt das Kontextmenü, auch wenn nichts mehr markiert wird.
   *
   * Verworfen: das Markieren im `pointerdown` mit `preventDefault` abräumen.
   * Das nimmt dem Browser auch das Scrollen und das Erzeugen der Mausereignisse,
   * und es wirkt erst, nachdem der Finger aufgesetzt hat — das Aufblitzen der
   * Markierung sieht man trotzdem.
   *
   * Dass hier nichts mehr kopierbar ist, ist kein Verlust: das Gerät steht am
   * Tisch und wird bedient, nicht gelesen und abgeschrieben.
   */
  user-select: none;
  -webkit-user-select: none;
  -webkit-touch-callout: none;

  --ink: #ffffff;
  --ink-dim: #93a1b3;
  --ground: #05080d;
  --line: #1b2432;
  --accent: var(--color-primary, #00afee);
  /*
   * DIE FARBE DER SHOT-CLOCK — eigener Ton und nicht `--color-warning`.
   *
   * `--color-warning` kommt aus tenant.css, ist für helle Masken gemacht
   * (#fc8c3a) und darf sich je Mandant ändern. Diese Tafel ist schwarz und
   * steht im Saal; was darauf gelesen werden muss, darf nicht davon
   * abhängen, welches Haus gerade seine Farben gesetzt hat. Rot ist hier
   * schon dreifach belegt (fehlende Trikotkontrolle, fehlender Anstoss,
   * Abweisung) — Gelb ist im Billard ohnehin die Farbe der Verwarnung, und
   * die Shot-Clock ist die leichteste Stufe davon.
   */
  --shotclock: #ffc53d;

  display: grid;
  /*
   * Vier Zeilen und nicht drei: Kopf, Tafel, Zählleiste, Fußzeile. Die
   * dritte ist meistens leer — ein Bildschirm an der Wand zählt nicht — und
   * kostet dann nichts, weil sie `auto` ist. Nur so behält die Tafel ihre
   * Höhe, wenn die Leiste dazukommt: läge sie im selben Fluss wie die
   * Partie, schöbe sie den Stand aus dem Bild.
   */
  grid-template-rows: auto 1fr auto auto;
  /*
   * ALLE HÖHENMASSE DIESER TAFEL SIND dvh UND NICHT vh — AUCH DIE
   * SCHRIFTGRÖSSEN.
   *
   * Auf iOS Safari ist `vh` die Höhe OHNE die Browserleisten, also MEHR als
   * sichtbar ist; `dvh` ist der Bereich, den man wirklich sieht. Stand die
   * Hülle auf 100dvh und ihre Kinder auf vh, forderten die Kinder zusammen
   * mehr Platz, als die Hülle hat — am 16.09.2026 auf dem iPad des
   * Auftraggebers zu sehen: die Spielernamen lagen über der Kugelreihe.
   *
   * Auf dem Schreibtisch fällt das NIE auf, weil dort beide Masse gleich
   * sind. Wer hier ein Mass ergänzt, nimmt dvh — auch in `min()` und auch
   * in einer Schriftgrösse, die das Skript ausrechnet (siehe
   * `disziplinMass`).
   */
  height: 100dvh;
  background: var(--ground);
  color: var(--ink);
  font-family: Montserrat, system-ui, sans-serif;
  /* Zahlen sollen beim Wechsel von 9 auf 10 nicht springen. */
  font-variant-numeric: tabular-nums;
}

.board__head {
  display: flex;
  grid-row: 1;
  align-items: baseline;
  justify-content: space-between;
  gap: 2dvh;
  padding: 2.5dvh 4dvh 0;
  font-size: min(3.4dvh, 3vw);
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--ink-dim);
}

.board__table {
  flex: none;
  color: var(--accent);
}

/*
 * DIE ANORDNUNG
 *
 * Aussen die beiden Spieler, in der Mitte, was ihnen gemeinsam ist. Der
 * Stand steht oben und ist das größte Element des Bildes, der Name unten
 * mit der Flagge darüber; dazwischen ist Luft, und die ist nicht
 * verschenkt: sie trennt die beiden Blöcke so weit, dass das Auge aus fünf
 * Metern zuerst die Zahl findet.
 *
 * Die Seiten sind `1fr`, die Mitte `auto`: Wappen, Tischnummer und
 * Disziplin brauchen ihre Breite, der ganze Rest gehört zu gleichen Teilen
 * den Namen — und gleich groß, damit die Tafel symmetrisch bleibt, auch
 * wenn einer "Tamm" heißt und der andere "Hjalmarström".
 */
.board__partie {
  display: grid;
  grid-row: 2;
  /* Die Mitte hat ein FESTES Maß und nicht `auto`: sonst hängt die Breite
     der Spielerspalten davon ab, wie lang der Name der Disziplin ist — und
     die Schrift der Namen rechnet mit dieser Breite (siehe BoardSide). Ein
     Turnier in "Straight Pool" hätte die Namen sonst aus der Spalte
     geschoben. */
  grid-template-columns: minmax(0, 1fr) 26vw minmax(0, 1fr);
  /*
   * EINE ZEILE, UND SIE FÜLLT DIE HÖHE — AUSGESCHRIEBEN UND NICHT IMPLIZIT.
   *
   * Die drei Kinder sind seit dem 16.09.2026 Größen-Container (siehe
   * `.seite` und `.board__mitte`), und ein Größen-Container gibt seinem
   * Elternteil KEINE Inhaltshöhe mehr zurück. Eine implizite `auto`-Zeile
   * fiele damit auf null zusammen. `minmax(0, 1fr)` sagt es ausdrücklich:
   * die Zeile ist so hoch wie der Kasten, und die Kinder messen daran.
   */
  grid-template-rows: minmax(0, 1fr);
  gap: 0 2vw;
  min-height: 0;
  /*
   * DAS UNTERE POLSTER IST DER GARANTIERTE ABSTAND ZUR ZÄHLLEISTE.
   *
   * Die Leiste beginnt mit ihrer Oberkante (`.sp`, `.leiste__spalten`)
   * genau dort, wo dieser Kasten endet. Was in ihm steht, bleibt in ihm —
   * dafür sorgt die Rechnung in `.seite`; was hier stehenbleibt, ist die
   * Luft dazwischen, und die ist damit Absicht und nicht Rest. `max(..px)`,
   * weil 2,6 dvh auf einem flachen Schirm (480 px) nur zwölf Punkte wären
   * und die Kante dann an der Unterlänge des Vornamens klebte.
   */
  padding: max(2.4dvh, 14px) 3.5vw max(2.6dvh, 18px);
}

/*
 * EIN STAND, DER NOCH UNTERWEGS IST — DIE ZAHL WIRD BLASSER.
 *
 * Seit die Zahl beim Tippen sofort hochgeht, behauptet die Tafel für einen
 * Moment etwas, was die Anwendung noch nicht bestätigt hat. Das muss man ihr
 * ansehen, sonst hat sie eine Behauptung mehr und eine Auskunft weniger.
 *
 * ES IST DIE ZAHL SELBST und nicht ein Zeichen daneben: wer am Tisch tippt,
 * schaut auf den Stand, und eine Auskunft über den Stand gehört an den Stand.
 * Der Verbindungspunkt unten rechts wechselt zur selben Zeit die Farbe — für
 * den, der von weiter weg hinsieht, und für den Fall, dass gerade gar nichts
 * getippt wurde.
 *
 * ERST NACH EINEM HALBEN AUGENBLICK, siehe WIMPERNSCHLAG_MS in useZaehlwerk:
 * im Saal dauert ein Schreibvorgang dreißig Millisekunden, und eine Tafel,
 * die bei jedem Satz kurz zuckt, wäre vor Publikum schlimmer als die
 * Ungewissheit, die sie anzeigen soll.
 *
 * Blasser und nicht bunt: Rot hiesse Fehler (den gibt es, und dann steht die
 * rote Zeile der Leiste da), die Akzentfarbe hiesse Anstoss. Blass heisst
 * "noch nicht fest", und das ist genau die Auskunft. Die Übergangszeit ist
 * absichtlich träge — ein hartes Umschalten wäre selbst das Zucken.
 */
.board__partie :deep(.seite__stand) {
  transition: opacity 280ms ease;
}

.board__partie--offen :deep(.seite__stand) {
  opacity: 0.55;
}

/*
 * HOCHKANT: DIESELBE TAFEL, NUR NIEDRIGER
 *
 * Ein Tablet am Tisch steht manchmal hochkant. Die Anordnung umzuwerfen
 * (Spieler untereinander) hieße, zwei Tafeln zu pflegen und dem Zuschauer
 * je nach Gerät ein anderes Bild zu zeigen. Die drei Spalten bleiben also;
 * begrenzt wird nur die Höhe, in der sie sich ausbreiten. Ohne die Grenze
 * lagen bei 768 x 1024 zwei Handbreit Schwarz zwischen dem Stand und der
 * Flagge, und die Tafel sah aus, als fehle etwas dazwischen.
 */
@media (max-aspect-ratio: 1 / 1) {
  .board__partie {
    align-self: center;
    /*
     * `height` und nicht mehr `max-height`: der Kasten muss ein bestimmtes
     * Maß haben, sonst hat ein Größen-Container darin nichts, woran er
     * messen könnte — und seine Kinder gäben ihm selbst keine Höhe zurück.
     * Hochkant füllte der Inhalt die 62 dvh ohnehin immer aus.
     */
    height: 62dvh;
  }
}

/*
 * AUCH DIE MITTE MISST AN SICH SELBST.
 *
 * Wappen, Tischschild und Disziplin standen in `dvh` — also am Fenster —,
 * und in Zählbetrieb ist dieser Kasten nur noch gut ein Drittel davon hoch.
 * Dann ragte die Mitte unten aus der Tafel in die Zählleiste, genau wie die
 * Namen daneben.
 *
 * Im schlimmsten Fall steht hier übereinander:
 *   Logo 34,0 + vier Lücken 9,6 + Tischschild 14,0 + Disziplin 5,8×1,93
 *   = 11,2 + Begegnung 2,5×1,2 = 3,0 + Zeitlimit (2,6×1,2 + 2×0,3×2,6)
 *   = 4,7  ->  76,5 cqh von 100. Die Zeitlimit-Zeile (Heyball) steht nur bei
 *   gesetztem Zeitlimit im Dokument -- an den meisten Turnieren gibt es
 *   keins, und dort bleibt es bei den 69,4 cqh von vorher.
 */
.board__mitte {
  container-type: size;
  container-name: mitte;

  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2.4cqh;
  min-width: 0;
  text-align: center;
}

/*
 * Das Wappen als Schriftzug, solange keines als Bild vorliegt. Kräftig und
 * hell, aber kleiner als die Tischnummer darunter: es sagt, wer die
 * Veranstaltung trägt, und das ist auf einer Tafel die dritte Frage.
 */
.board__wappen {
  margin: 0;
  font-size: min(6.5cqh, 25cqw);
  font-weight: 900;
  letter-spacing: 0.14em;
  line-height: 1;
}

/*
 * Das Logo bekommt einen FESTEN PLATZ, in den das Bild eingepasst wird:
 * volle Breite der Mittelspalte, Höhe ein gutes Drittel des Kastens (34
 * cqh). Sie stand als „min(32dvh, 20vw)" am Fenster, nach Vorgabe des
 * Auftraggebers vom 16.09.2026 — es war auf der Tafel zu klein. Am
 * Wandschirm ist das Maß praktisch dasselbe geblieben; im Zählbetrieb, wo
 * der Kasten nur noch halb so hoch ist, schrumpft das Logo jetzt mit,
 * statt in die Zählleiste zu ragen.
 *
 * Platz vorgeben und nicht das Bild messen: sonst hinge die Größe davon
 * ab, in welcher Auflösung die Datei geliefert wurde. Eine 200er-Datei
 * wird hochgezogen, eine 2000er heruntergerechnet, und beide stehen
 * gleich groß auf der Tafel.
 *
 * Die Breite ist die Spalte selbst und kein vw-Wert: sie ist fest 26vw
 * (siehe .board__partie), und ein Logo, das darüber hinausragte, schöbe
 * die Namen der Spieler zusammen. Ein sehr breites Logo — die
 * Serienvorlagen der EPBF sind vier- bis fünfmal so breit wie hoch —
 * bleibt deshalb flacher als die vorgegebene Höhe; dann begrenzt die
 * Breite, und das ist hier die richtige Reihenfolge.
 */
.board__wappen-bild {
  display: block;
  width: 100%;
  height: 34cqh;
  object-fit: contain;
}

.board__tischschild {
  margin: 0;
  font-size: min(14cqh, 34cqw);
  font-weight: 900;
  letter-spacing: 0.02em;
  line-height: 1;
  color: var(--accent);
}

/*
 * Die Disziplin: umrandet und nicht gefüllt.
 *
 * Gefüllt in Akzentfarbe sähe sie aus wie der Anstoßbalken daneben, und
 * die Tafel hätte zwei gleich laute Zeichen für zwei ganz verschiedene
 * Dinge. Der Balken sagt, was als Nächstes passiert; die Disziplin steht
 * die ganze Partie über da.
 */
.board__disziplin {
  margin: 0;
  padding: 0.3em 0.85em;
  border: 0.09em solid var(--accent);
  border-radius: 999px;
  font-weight: 800;
  letter-spacing: 0.04em;
  line-height: 1.15;
  text-transform: uppercase;
}

.board__begegnung {
  margin: 0;
  /* Passt in einer Zeile in die 26 vw der Mitte: "TEAM MATCH · RUBBER 2"
     sind einundzwanzig Zeichen, und zwei Zeilen sähen hier aus, als wäre
     etwas zu lang geraten. */
  font-size: min(2.5cqh, 6cqw);
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--ink-dim);
}

/*
 * DIE ZEITLIMIT-UHR (HEYBALL) — als Kapsel wie die Disziplin, aber gefüllt:
 * sie zeigt eine Zahl, die sich ändert, und nicht einen Namen, der steht.
 */
.board__zeitlimit {
  /* font-variant-numeric: tabular-nums kommt schon von .board. */
  display: flex;
  align-items: center;
  gap: 0.4em;
  margin: 0;
  padding: 0.3em 0.75em;
  border-radius: 999px;
  background: rgb(255 255 255 / 10%);
  font-size: min(2.6cqh, 7cqw);
  font-weight: 800;
  letter-spacing: 0.06em;
  line-height: 1.2;
  text-transform: uppercase;
  color: var(--ink);
}

/*
 * ANGEHALTEN SIEHT SICHTBAR ANDERS AUS ALS LAUFEND.
 *
 * Stillstand ist zwischen zwei Racks der HÄUFIGSTE Zustand dieser Uhr —
 * competition.score_pauses_the_clock hält sie nach jedem gewerteten Rack
 * an, und der Schiedsrichter setzt sie erst nach dem Neuaufbau von Hand
 * fort (siehe Schirimenue.vue). Die Füllung fällt deshalb weg, der Rand
 * wird gestrichelt statt durchgezogen, und die Marke "II" davor sagt, was
 * zu sehen ist, auch ohne dass jemand die Farbe deutet — dieselbe
 * Überlegung wie beim Anstoßbalken, nur umgekehrt: dort zeigt Füllung
 * "das gilt gerade", hier zeigt sie "das läuft gerade".
 */
.board__zeitlimit--pausiert {
  background: none;
  border: 0.08em dashed var(--ink-dim);
  color: var(--ink-dim);
}

.board__zeitlimit-marke {
  font-weight: 900;
  letter-spacing: 0;
}

/*
 * ZEIT ABGELAUFEN — derselbe Ton wie die Shot-Clock (--shotclock): "hier
 * muss der Schiedsrichter ran". Sie gewinnt gegen `--pausiert`, falls beide
 * Klassen zugleich stehen (die Uhr hält meist an, sobald die Zeit um ist) —
 * die dringendere Auskunft ist dann die Farbe, die "II"-Marke bleibt
 * trotzdem sichtbar.
 */
.board__zeitlimit--ueber {
  background: rgb(255 197 61 / 16%);
  border: 0.08em solid var(--shotclock, #ffc53d);
  color: var(--shotclock, #ffc53d);
}

/*
 * DIE SATZANZEIGE — zwei Zeilen, eine Kapsel wie die Disziplin und der Stand
 * darunter deutlich groesser.
 *
 * WARUM DER STAND SO GROSS WIE HIER UND NICHT WIE `board__zeitlimit`: die
 * Zeitlimit-Uhr wird gelesen, wenn jemand danach sucht; der Satzstand wird
 * WAEHREND DES SPIELS staendig verglichen ("steht er schon auf vier?") und
 * aendert sich mit jedem Rack bzw. jeder Kugel — er braucht deshalb die
 * zweitgroesste Schrift der Tafel nach dem Aussenstand selbst, sonst waere
 * er aus fuenf Metern nicht mehr vom Rauschen der Mitte zu unterscheiden.
 * `tabular-nums` kommt schon von `.board`, damit "5:0" und "12:9" gleich
 * breit stehen und die Kapsel beim Zaehlen nicht ruckt.
 */
.board__satz {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.3cqh;
  margin: 0;
}

.board__satz-label {
  padding: 0.25em 0.8em;
  border: 0.08em solid var(--ink-dim);
  border-radius: 999px;
  font-size: min(2.2cqh, 5.5cqw);
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--ink-dim);
}

.board__satz-stand {
  font-size: min(7cqh, 17cqw);
  font-weight: 900;
  letter-spacing: -0.02em;
  line-height: 1;
  color: var(--accent);
}

.board__idle {
  display: flex;
  grid-row: 2;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1.5dvh;
  text-align: center;
}

.board__idle-table {
  margin: 0;
  font-size: min(16dvh, 12vw);
  font-weight: 900;
  line-height: 1;
  color: var(--accent);
}

.board__idle-event {
  margin: 0;
  font-size: min(6dvh, 5vw);
  font-weight: 700;
}

.board__idle-text {
  margin: 0;
  font-size: min(4dvh, 3.5vw);
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--ink-dim);
}

/*
 * DAS KARUSSELL
 *
 * Der Hinweis rückt nach unten und wird klein: er bleibt die Auskunft, die
 * der Tisch schuldet ("gleich geht es weiter"), aber die Fläche gehört dem
 * Logo. Welcher Tisch das ist, steht oben rechts — zweimal braucht es das
 * nicht.
 */
.board__idle--sponsors {
  justify-content: space-between;
  gap: 0;
  padding: 3dvh 4dvh 2dvh;
}

.board__idle--sponsors .board__idle-text {
  flex: none;
  font-size: min(2.6dvh, 2.4vw);
}

/* Die Bühne. Alle Logos liegen übereinander an derselben Stelle — deshalb
   absolut und nicht im Fluss: nur so bleibt die Mitte die Mitte, gleich wie
   hoch oder breit das einzelne Bild ist. */
.board__stage {
  position: relative;
  flex: 1 1 auto;
  width: 100%;
  min-height: 0;
}

.board__sponsor {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2.5dvh;
  margin: 0;
  opacity: 0;
  /*
   * ÜBERBLENDEN UND NICHT UMSCHALTEN
   *
   * Ein harter Wechsel ist auf einem großen Schirm ein Zucken; das Auge
   * bemerkt es noch am Rand des Blickfelds und schaut hin — mitten in einer
   * Partie am Nachbartisch. Ein Schieben wäre noch schlimmer, weil Bewegung
   * den Blick wirklich zieht. Anderthalb Sekunden reine Deckkraft nimmt nur
   * wahr, wer ohnehin hinsieht.
   *
   * Kein Schwarz dazwischen: die beiden Bilder liegen übereinander, das
   * neue kommt, während das alte geht.
   */
  transition: opacity 1.5s ease-in-out;
}

.board__sponsor--on {
  opacity: 1;
}

/*
 * Der weiße Träger.
 *
 * Sponsorenlogos sind für weißes Papier gezeichnet: dunkle Schrift, oft
 * transparenter Grund. Auf dem schwarzen Grund dieser Tafel wäre die Hälfte
 * von ihnen unsichtbar. Die Alternative wäre gewesen, die Bilder per Filter
 * aufzuhellen oder umzukehren — das zerstört jedes farbige Logo und ist
 * genau bei den teuersten am schlimmsten. Ein weißes Feld mit Luft ringsum
 * zeigt jedes Logo so, wie sein Eigentümer es freigegeben hat.
 */
.board__plate {
  display: flex;
  align-items: center;
  justify-content: center;
  max-width: 100%;
  padding: 4dvh 5dvh;
  border-radius: 1.2dvh;
  background: #ffffff;
}

/*
 * HÖHE VORGEBEN UND NICHT NUR BEGRENZEN
 *
 * `max-height` allein hätte jedes Logo in seiner eigenen Pixelgröße stehen
 * lassen: eine Datei von 300 px wäre auf einem 55-Zoll-Schirm eine
 * Briefmarke gewesen, daneben eine von 2000 px bildfüllend. Was die Tafel
 * zeigt, darf nicht davon abhängen, in welcher Auflösung ein Sponsor sein
 * Logo geschickt hat. Deshalb die Höhe fest und die Breite frei, gedeckelt
 * gegen den Bildrand; `object-fit: contain` hält dabei das Seitenverhältnis,
 * auch wenn der Deckel greift — ein verzerrtes Logo ist schlimmer als ein
 * kleines.
 */
.board__plate img {
  display: block;
  width: auto;
  height: 26dvh;
  max-width: 58vw;
  object-fit: contain;
}

/*
 * Der Hauptsponsor bekommt mehr Fläche — gut zwei Drittel mehr Höhe als ein
 * regulärer. Zusammen mit der doppelten Standzeit (siehe STANDZEIT_MS) ist
 * er damit als Erster erkennbar, ohne dass es irgendwo geschrieben stünde.
 */
.board__sponsor--main .board__plate img {
  height: 44dvh;
  max-width: 74vw;
}

.board__sponsor--premium .board__plate img {
  height: 34dvh;
  max-width: 66vw;
}

.board__sponsor-rank {
  font-size: min(2.6dvh, 2.4vw);
  font-weight: 700;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--accent);
}

/*
 * Wer Bewegung abbestellt hat, bekommt keine. Auf einem Hallenschirm stellt
 * das niemand ein — auf dem Laptop, mit dem die Tafel eingerichtet wird,
 * schon, und dort soll sie trotzdem funktionieren.
 */
@media (prefers-reduced-motion: reduce) {
  .board__sponsor {
    transition-duration: 0s;
  }
}

/*
 * Die Zählleiste bekommt ihre Zeile von der Tafel und ihre Gestalt von sich
 * selbst. Nur die Einordnung steht hier — sie ist eine Eigenschaft des
 * Bildschirms und nicht der Leiste.
 */
.board__zaehlleiste {
  grid-row: 3;
}

.board__zaehlhinweis {
  grid-row: 3;
  margin: 0 3.5vw 1dvh;
  padding: 0.8dvh 1.4dvh;
  border: 2px solid var(--color-warning, #fc8c3a);
  border-radius: 0.8dvh;
  color: var(--color-warning, #fc8c3a);
  font-size: min(2.2dvh, 1.8vw);
  font-weight: 700;
  letter-spacing: 0.04em;
  text-align: center;
  text-transform: uppercase;
}

.board__foot {
  display: grid;
  grid-row: 4;
  /* Die mittlere Spalte trägt die Angaben und steht mittig im Bild; die
     beiden aeusseren sind gleich breit, damit die Mitte die Mitte bleibt,
     gleich ob links eine Auszeit läuft. */
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  gap: 2dvh;
  padding: 0 3.5vw 2.2dvh;
  /* Klein, aber nicht kleiner: sechs Angaben in einer Zeile müssen bei
     einem langen Turniernamen ("Women 10-Ball Singles") noch nebeneinander
     passen. Passen sie einmal nicht, bricht die Zeile um — das ist der
     bessere Ausgang als eine Angabe, die aus dem Bild läuft. */
  font-size: min(2.4dvh, 1.9vw);
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--ink-dim);
}

.board__angaben {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  justify-content: center;
  gap: 0 0.55em;
  margin: 0;
  text-align: center;
}

/* Der Trennpunkt steht ZWISCHEN zwei Angaben und wird nicht mitgeliefert:
   so kann keine fehlende Angabe einen Punkt uebrig lassen. */
.board__angabe + .board__angabe::before {
  content: "·";
  margin-right: 0.55em;
  color: var(--line);
}

/* Die erste Angabe ist das Turnier — sie darf heller stehen als der Rest,
   weil sie sagt, welche Partie hier überhaupt läuft. */
.board__angabe:first-child {
  color: var(--ink);
  font-weight: 700;
}

.board__link {
  display: flex;
  align-items: center;
  gap: 0.6em;
  margin-left: auto;
  font-size: 0.8em;
  /* In einer Zeile: in der schmalen rechten Spalte brach "no connection"
     sonst zwischen die beiden Wörter, und ein Ausfall, der sich selbst
     verstümmelt anzeigt, wirkt wie zwei Fehler statt einem. */
  white-space: nowrap;
}

.board__dot {
  width: 1dvh;
  height: 1dvh;
  border-radius: 50%;
  background: var(--color-success, #33cb81);
}

.board__link--lost {
  color: var(--color-warning, #fc8c3a);
}

.board__link--lost .board__dot {
  background: var(--color-warning, #fc8c3a);
}

/*
 * DIESELBE WARNFARBE WIE `--lost`, UND ABSICHTLICH — beides ist ein
 * Netzproblem, nur mit einer genaueren Ursache; der Unterschied steht im
 * Satz daneben und nicht in einer eigenen Farbe. KEINE ANIMATION: ein
 * Pulsieren wäre die Bewegung, die WIMPERNSCHLAG_MS in useZaehlwerk.ts
 * ausdrücklich vermeidet — sie zieht aus fünf Metern mehr Blicke auf sich
 * als der Satzstand daneben.
 */
.board__link--pending {
  color: var(--color-warning, #fc8c3a);
}

.board__link--pending .board__dot {
  background: var(--color-warning, #fc8c3a);
}

/*
 * Ein Stand ist getippt, aber noch nicht bestätigt. Die Akzentfarbe und
 * nicht die Warnfarbe: es ist kein Ausfall, sondern der Normalfall einer
 * langsamen Leitung — und die Warnfarbe daneben behält so ihre Bedeutung.
 */
.board__link--offen .board__dot {
  background: var(--accent);
}

.board__hint {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  grid-row: 1 / -1;
  text-align: center;
}

.board__hint-title {
  margin: 0;
  font-size: min(10dvh, 8vw);
  font-weight: 900;
}

.board__hint-text {
  margin: 1dvh 0 0;
  font-size: min(4dvh, 3.5vw);
  color: var(--ink-dim);
}
</style>
