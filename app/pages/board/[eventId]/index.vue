<script setup lang="ts">
import type { BoardTables } from '~~/shared/types/api'

/**
 * DIE TISCHWAHL AUF DEM BILDSCHIRM SELBST
 *
 * /board/<eventId> ohne Tischnummer. Der Aufbau braucht damit nur EINE
 * Adresse für alle Schirme der Halle, und welcher Tisch daneben steht,
 * entscheidet sich am Gerät.
 *
 * Vorher stand in jeder Adresse eine UUID und dahinter eine Nummer. Zwanzig
 * Mal abgetippt sind das zwanzig Gelegenheiten für einen Vertipper, der erst
 * auffällt, wenn der Saal voll ist — und die Turnierleitung hat in dem Moment
 * anderes zu tun, als Adressleisten zu vergleichen.
 *
 * SIE WIRD AUS FÜNF METERN BEDIENT, OFT MIT EINER FERNBEDIENUNG
 *
 * Deshalb große Felder statt einer Liste, und deshalb drei Wege zum Ziel:
 *
 *   - Tippen oder Klicken. Ein Feld ist mindestens 14dvh hoch; das trifft man
 *     auch mit dem Finger auf einem Tablet an der Wand.
 *   - Pfeiltasten und Enter. Was eine Fernbedienung mit Steuerkreuz und OK
 *     schickt, sind gewöhnliche Tastenereignisse; eine eigene Hervorhebung
 *     ist verlässlicher als die Sprungnavigation des Browsers, die auf
 *     Fernsehern mal da ist und mal nicht.
 *   - Ziffern. Wer "12" tippt, meint Tisch 12. Die Eingabe steht sichtbar
 *     unten und verfällt nach zwei Sekunden — sonst bliebe eine halbe
 *     Nummer stehen, die beim nächsten Tastendruck etwas anderes ergibt.
 *
 * DER SCHIRM MERKT SICH DEN TISCH
 *
 * Nach der Wahl liegt die Nummer in localStorage, und beim nächsten Aufruf
 * von /board/<eventId> springt der Schirm ohne Frage dorthin. Das ist der
 * eigentliche Zweck: ein Hallenrechner, der über Nacht neu startet, zeigt am
 * Morgen wieder seinen Tisch, ohne dass jemand durch die Halle geht. Ein
 * Cookie wäre hier falsch — die Auskunft gehört diesem Gerät und muss
 * nirgends hin.
 *
 * ZURÜCK ZUR AUSWAHL: TASTE 0 ODER LANGER DRUCK
 *
 * Ein Schirm wandert im Lauf eines Turniers an einen anderen Tisch. Beides
 * steht auf der Tafel selbst ([table].vue) und ist dort mit Absicht
 * unsichtbar: die Tafel ist eine Ansicht und keine Bedienung, und ein
 * sichtbarer Knopf "Tisch wechseln" neben einem laufenden Halbfinale ist
 * eine Einladung an jeden Vorbeigehenden. Die Null ist eindeutig, weil kein
 * Tisch die Nummer 0 trägt.
 */
definePageMeta({ layout: false })

const route = useRoute()
const eventId = String(route.params.eventId ?? '')

const { data } = await useAsyncData(
  `board-tables-${eventId}`,
  async () => {
    try {
      return {
        tables: await $fetch<BoardTables>(`/api/events/${encodeURIComponent(eventId)}/tables`),
        unknownEvent: false,
      }
    }
    catch (error: unknown) {
      return { tables: null, unknownEvent: (error as { statusCode?: number }).statusCode === 404 }
    }
  },
)

const board = computed(() => data.value?.tables ?? null)
const unknownEvent = computed(() => data.value?.unknownEvent ?? false)
const tables = computed(() => board.value?.tables ?? [])

/**
 * KEINE FRISCHE ANTWORT — WEDER BESTÄTIGT NOCH WIDERLEGT.
 *
 * `board.value` ist `null` in ZWEI Fällen: die Veranstaltung gibt es
 * wirklich nicht (`unknownEvent`, ein 404 — eine ECHTE Antwort), oder der
 * Abruf ist am Netz gescheitert (siehe `catch` oben, kein 404). Nur der
 * zweite Fall ist ein Netzfehler und keine Auskunft; er kommt seit dem
 * Service Worker (sw.ts) auch bei einem Neuladen OHNE Netz vor — vorher
 * lud diese Seite ohne Netz gar nicht erst, also konnte dieser Zweig nie
 * mit leeren Händen laufen.
 */
const noAnswer = computed(() => board.value === null && !unknownEvent.value)

/** Der Schlüssel trägt die Veranstaltung: ein Schirm überlebt das Turnier. */
const storageKey = `bb.board.table.${eventId}`

function remembered(): number | null {
  if (import.meta.server) return null
  const raw = window.localStorage.getItem(storageKey)
  const n = raw === null ? Number.NaN : Number.parseInt(raw, 10)
  return Number.isFinite(n) && n > 0 ? n : null
}

/* ------------------------------------------------------------------------
 * DER TISCH ÜBERLEBT AUCH DEN VERANSTALTUNGSWECHSEL — ALS VORSCHLAG
 *
 * Der Auftraggeber schildert den Ablauf, den es in den Hallen wirklich gibt:
 * „aktuell ist das so das nach einer EC mit 2 tagen luft in der gleichen
 * halle dann die EuroTour startet, mit den gleichen geräten.. beispiel 14.
 * bis 22. läuft die EC und 24. bis 27. die EuroTour in der gleichen Halle
 * mit der gleichen Austattung".
 *
 * Gleiche Halle, gleiche Ausstattung, dieselben vierundzwanzig Tablets an
 * denselben Tischen — und weil der Merkschlüssel oben die Veranstaltung
 * trägt, war die Nummer nach dem Wechsel weg. Vierundzwanzig Geräte, die
 * jemand einzeln antippen muss, und zwar in der Stunde, in der die
 * Turnierleitung am wenigsten Zeit dafür hat.
 *
 * DESHALB ZUSÄTZLICH UND NICHT STATT DESSEN. Der Schlüssel je Veranstaltung
 * bleibt genau, wie er war: er allein entscheidet, ob ohne Frage gesprungen
 * wird. Dieser hier ist die Erinnerung des GERÄTS an sich selbst, über
 * Veranstaltungen hinweg, und er führt nie zu einem Sprung — nur zu einem
 * Vorschlag, den jemand annehmen muss.
 *
 * WARUM KEIN SPRUNG. Ein Sprung wäre die Behauptung, die Nummerierung der
 * neuen Veranstaltung sei dieselbe. Sie ist es OFT, aber nicht immer: eine
 * kleinere Halle, ein anderer Plan, und Tisch 7 liegt woanders. Ein Gerät,
 * das ungefragt die falsche Tafel zeigt, ist schlimmer als eines, das fragt
 * — es wird nämlich geglaubt, und der Fehler fällt erst auf, wenn an zwei
 * Tischen derselbe Stand steht.
 * --------------------------------------------------------------------- */

/**
 * EINE NEUE FASSUNG — sofort, und als einzige Seite mit eigener Frage.
 *
 * Auf der Tischwahl läuft nie eine Partie; es gibt hier nichts zu
 * zerreissen, also `darf: () => true`. Sie ist aber auch die einzige
 * Tafelseite, die ihre Daten EINMAL holt und danach nie wieder — es gibt
 * keine Antwort, in der die Bau-Kennung mitfahren könnte. Deshalb fragt sie
 * selbst, einmal in der Minute, nach der winzigen Datei, die Nuxt dafür
 * ohnehin schreibt. Warum das für die Tafel am Tisch NICHT der Weg ist,
 * steht in useVersionSwitch.ts.
 */
useVersionSwitch({ allowed: () => true, selfPollMs: 60_000 })

const lastStorageKey = 'bb.board.table.last'

/**
 * WIE LANGE DIE ERINNERUNG GILT — VIERZEHN TAGE.
 *
 * Gemessen an dem, wofür sie da ist: zwei Veranstaltungen in derselben
 * Halle, dazwischen die Tage, die der Auftraggeber nennt („2 tagen luft").
 * Vierzehn Tage decken auch eine Woche Pause und den Aufbau davor, und sie
 * sind kurz genug, dass keine Saison hineinpasst.
 *
 * Der Fall, der ausgeschlossen gehört, ist der Schrank: ein Gerät, das ein
 * halbes Jahr weggeräumt war, schlägt Tisch 7 von damals vor, obwohl es
 * inzwischen in einer anderen Halle steht — und die Nummer 7 gibt es dort
 * auch, also greift die Prüfung gegen die Tischliste nicht. Genau dagegen
 * ist die Frist da, und deshalb ist sie in TAGEN gerechnet und nicht in
 * Monaten.
 */
const MEMORY_MS = 14 * 24 * 60 * 60 * 1000

function rememberLast(number: number) {
  try {
    window.localStorage.setItem(lastStorageKey, JSON.stringify({ n: number, t: Date.now() }))
  }
  catch {
    // Wie oben: ein Gerät im privaten Modus verweigert den Speicher, und die
    // Wahl geht trotzdem durch.
  }
}

/**
 * Die zuletzt benutzte Nummer — oder null, wenn sie fehlt, kaputt oder alt
 * ist.
 *
 * Kaputt heisst hier auch: von Hand hineingeschrieben oder aus einer
 * früheren Fassung. Was sich nicht als `{ n, t }` lesen lässt, gilt als
 * nicht vorhanden; eine Ausnahme, die den Aufbau der Seite abbricht, wäre
 * für eine Bequemlichkeit ein zu hoher Preis.
 */
function lastTable(): number | null {
  if (import.meta.server) return null
  try {
    const raw = window.localStorage.getItem(lastStorageKey)
    if (!raw) return null
    const o = JSON.parse(raw) as { n?: unknown, t?: unknown }
    const n = Number(o.n)
    const t = Number(o.t)
    if (!Number.isFinite(n) || n <= 0) return null
    if (!Number.isFinite(t) || Date.now() - t > MEMORY_MS) return null
    return n
  }
  catch {
    return null
  }
}

/**
 * Der Vorschlag, den die Seite anbietet — null heisst: es gibt keinen.
 *
 * Er wird EINMAL beim Aufbau gesetzt (siehe onMounted) und danach nur noch
 * weggenommen: entweder weil jemand ihn annimmt oder weil jemand ihn
 * wegtippt. Ein Vorschlag, der wiederkäme, während der Finger über den
 * Kacheln steht, wäre eine Fläche, die unter der Hand wandert.
 */
const suggestion = ref<number | null>(null)

function acceptSuggestion() {
  const n = suggestion.value
  if (n !== null) choose(n)
}

/**
 * Weggetippt — und er kommt nicht wieder.
 *
 * Er wird NICHT vergessen (der Schlüssel bleibt stehen): wer ihn hier
 * wegtippt, sagt etwas über diesen Aufruf und nicht über das Gerät. Beim
 * nächsten Mal steht er wieder da, bis wirklich ein Tisch gewählt ist.
 */
function dismissSuggestion() {
  suggestion.value = null
}

/**
 * Welcher Tisch gerade geoeffnet wird -- oder null.
 *
 * DER GRUND: die Tafelseite braucht bis zum ersten Bild MEHRERE SEKUNDEN
 * (gemessen am 16.09.2026 im Homelab: 3,5 bis 3,9 s). Dazwischen passierte
 * sichtbar nichts. Der Auftraggeber: "wer das nicht weiss wuerde da mehrfach
 * drauf klicken" -- und genau das tut jeder, der ein Tablet bedient.
 *
 * Das ist die Beruhigung, nicht die Heilung: die Sekunden gehoeren
 * weggeschafft, und das ist eine eigene Sache. Bis dahin sagt die Kachel
 * wenigstens, dass sie den Druck bekommen hat.
 *
 * VERWORFEN: eine Sperre ueber die ganze Flaeche. Wer versehentlich den
 * falschen Tisch trifft, soll den richtigen noch waehlen koennen, solange
 * die Seite nicht da ist -- ein Fehlgriff, der eine Minute kostet, ist
 * schlimmer als ein zweiter Aufruf.
 */
const opening = ref<number | null>(null)

async function choose(number: number) {
  // Derselbe Tisch zweimal: der zweite Druck ist die Ungeduld, nicht die
  // Absicht. Ein anderer Tisch geht durch -- siehe oben.
  if (opening.value === number) return
  opening.value = number

  // Der Vorschlag hat sich erledigt, sobald gewählt ist — auch dann, wenn
  // ein ANDERER Tisch gewählt wurde. Sonst stünde das Band noch da, während
  // die Kachel daneben schon lädt.
  suggestion.value = null
  rememberLast(number)

  try {
    window.localStorage.setItem(storageKey, String(number))
  }
  catch {
    /*
     * Ein Gerät im privaten Modus verweigert den Speicher. Dann geht die
     * Wahl trotzdem durch — sie hält nur bis zum nächsten Neustart. Eine
     * Fehlermeldung an dieser Stelle hielte den Schirm von dem ab, was er
     * eigentlich soll.
     */
  }

  /*
   * DIE FREIGABE ZIEHT MIT UM.
   *
   * Sie gilt für EINEN Tisch — das ist ihr Sinn, und ohne diesen Aufruf
   * bliebe sie an dem Tisch stehen, an dem sie eingelöst wurde. Ein Schirm,
   * den jemand einen Tisch weiterrollt, zeigte dann Tisch 7 an und dürfte
   * weiter nur an Tisch 3 zählen; die Flächen wären da und jede einzelne
   * würde abgewiesen.
   *
   * Der Fehler wird verschluckt und die Wahl geht trotzdem durch: die
   * Tischwahl ist der Weg zur ANZEIGE, und die darf jeder sehen. Ob auch
   * gezählt werden kann, sagt die Tafel selbst — sie fragt beim ersten
   * Abruf nach und zeigt ohne Freigabe eben keine Bedienflächen.
   */
  if (grant.value?.released) {
    await $fetch('/api/board/grant/table', {
      method: 'PUT',
      body: { tableNumber: number },
    }).catch(() => undefined)
  }

  navigateTo(`/board/${eventId}/${number}`)
}

/**
 * Die Hervorhebung — und was die Pfeiltasten bewegen.
 *
 * Sie beginnt beim ersten Tisch und nicht bei keinem: eine Fernbedienung mit
 * OK soll etwas treffen, ohne vorher zu wandern.
 */
const index = ref(0)
const columns = ref(4)

/** Was gerade an Ziffern eingetippt ist. Leer heißt: nichts. */
const typed = ref('')
let digitsTimer: ReturnType<typeof setTimeout> | null = null

function digit(z: string) {
  typed.value = (typed.value + z).slice(-3)
  const foundIndex = tables.value.findIndex(t => t.number === Number.parseInt(typed.value, 10))
  if (foundIndex >= 0) index.value = foundIndex

  if (digitsTimer) clearTimeout(digitsTimer)
  // Zwei Sekunden: lang genug für zwei Ziffern mit einer Fernbedienung, kurz
  // genug, dass die alte Eingabe nicht in die nächste hineinragt.
  digitsTimer = setTimeout(() => (typed.value = ''), 2000)
}

function move(d: number) {
  const n = tables.value.length
  if (n === 0) return
  // Ringförmig: am rechten Rand geht es links weiter. Ein Steuerkreuz, das
  // am Rand nichts tut, sieht aus wie eine Fernbedienung mit leerer Batterie.
  index.value = (index.value + d + n) % n
}

function onKey(ev: KeyboardEvent) {
  /*
   * Nicht, während jemand tippt. Der Grund stand hier am Anmeldeformular
   * (jede Ziffer eines Kennworts landete in der Tischwahl und wurde mit
   * preventDefault verschluckt); das Formular ist weg, die Regel bleibt —
   * das Feld für den Tafelcode besteht aus nichts als Ziffern, und ohne
   * diese Zeile käme keine einzige davon an.
   */
  const target = ev.target as HTMLElement | null
  if (target && /^(input|textarea|select)$/i.test(target.tagName)) return

  if (tables.value.length === 0) return

  /*
   * DIE NULL FÜHRT ZURÜCK ZUR VERANSTALTUNGSWAHL — aber nur allein.
   *
   * Auf der Tafel ist die Null der Weg hierher; hier ist sie der Weg eine
   * Stufe weiter zurück. Das ist dieselbe Geste an derselben Taste, und auf
   * einem Gerät mit Fernbedienung ist sie der EINZIGE Weg dorthin: die
   * Pfeiltasten steuern die Tischkacheln, der Knopf oben ist mit ihnen nicht
   * zu erreichen.
   *
   * `typed` muss leer sein. Wer „10" eingibt, tippt erst die Eins und dann
   * die Null — eine Null, die mitten in einer Eingabe die Seite wechselte,
   * machte jeden zweistelligen Tisch unerreichbar.
   */
  if (ev.key === '0' && typed.value === '') {
    navigateTo('/board?switch=1')
    ev.preventDefault()
    return
  }

  if (ev.key >= '0' && ev.key <= '9') {
    digit(ev.key)
    ev.preventDefault()
    return
  }

  const step: Record<string, number> = {
    ArrowRight: 1, ArrowLeft: -1,
    ArrowDown: columns.value, ArrowUp: -columns.value,
  }
  if (ev.key in step) {
    move(step[ev.key]!)
    ev.preventDefault()
    return
  }

  if (ev.key === 'Enter' || ev.key === ' ') {
    const t = tables.value[index.value]
    if (t) choose(t.number)
    ev.preventDefault()
  }
}

/**
 * Der gemerkte Tisch springt sofort weiter — mit `replace`.
 *
 * Ohne `replace` läge die Auswahl im Verlauf, und die Zurück-Taste einer
 * Fernbedienung landete auf ihr, die sofort wieder weiterspringt: eine
 * Schleife, aus der auf einem Gerät ohne Tastatur niemand herauskommt.
 *
 * Gespielt wird die Prüfung gegen die Tischliste: ein Tisch, den es nicht
 * mehr gibt, wird vergessen statt angesprungen — sonst zeigte der Schirm für
 * immer eine Tafel zu einer Nummer, die gelöscht wurde.
 */
onMounted(() => {
  const savedId = remembered()
  if (savedId !== null && (noAnswer.value || tables.value.some(t => t.number === savedId))) {
    // Ohne Netz (`noAnswer`) ist dieser Sprung ein VERTRAUENSVORSCHUSS
    // — siehe die Begründung an `noAnswer` oben und dieselbe
    // Unterscheidung auf board/index.vue. Die Tafel selbst weiss, wie sie
    // sich ohne Antwort verhält (siehe [table].vue, `tafelGelesen`).
    navigateTo(`/board/${eventId}/${savedId}`, { replace: true })
    return
  }

  if (savedId !== null && !noAnswer.value) {
    /*
     * DIESES GERÄT HATTE IN DIESER VERANSTALTUNG SCHON EINEN TISCH — UND
     * ER IST WEG. Dann wird NICHT vorgeschlagen.
     *
     * Die Nummer aus der VORIGEN Veranstaltung anzubieten, nachdem die
     * Nummer aus DIESER gerade als ungültig verworfen wurde, wäre der
     * schlechtere von zwei Vorschlägen — und zwar sichtbar: wer hier
     * steht, hat gerade erlebt, dass eine Tischnummer verschwunden ist.
     *
     * NUR MIT EINER ECHTEN ANTWORT (`!noAnswer`): ein Netzfehler ist
     * kein Beleg dafür, dass der Tisch verschwunden ist, siehe oben.
     */
    window.localStorage.removeItem(storageKey)
  }
  else if (savedId === null) {
    /*
     * DER VORSCHLAG — UND ER MUSS INS ZIEL FÜHREN.
     *
     * Geprüft wird gegen die Tischliste DIESER Veranstaltung, genau wie
     * beim Sprung oben. Eine kleinere Halle hat die 7 vielleicht gar
     * nicht; ein Vorschlag, der ins Leere führt, ist schlimmer als keiner,
     * weil er aus einer Auswahl eine Fehlbedienung macht.
     */
    const lastNumber = lastTable()
    if (lastNumber !== null) {
      const gridIndex = tables.value.findIndex(t => t.number === lastNumber)
      if (gridIndex >= 0) {
        suggestion.value = lastNumber
        /*
         * UND DIE HERVORHEBUNG WANDERT MIT. Sie steht ohnehin immer auf
         * irgendeiner Kachel (beim ersten Tisch, damit eine Fernbedienung
         * mit OK etwas trifft) — sie hier auf den vorgeschlagenen Tisch zu
         * setzen, macht aus dem Band einen Weg, der auch mit Steuerkreuz
         * und OK begehbar ist. Sie ist eine VORWAHL und keine Wahl; das
         * war sie vorher auch, und das Band darüber sagt es in Worten.
         */
        index.value = gridIndex
      }
    }
  }

  window.addEventListener('keydown', onKey)
  measureAndSet()
  window.addEventListener('resize', measureAndSet)
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKey)
  window.removeEventListener('resize', measureAndSet)
  if (digitsTimer) clearTimeout(digitsTimer)
})

/**
 * Wie viele Felder in einer Reihe stehen — für Pfeil auf und ab.
 *
 * Gezählt und nicht gerechnet. Das Raster ist `auto-fit`: bei sechs Tischen
 * auf einem Hochkantschirm stehen zwei in einer Reihe, bei zwanzig auf einem
 * Fernseher sechs. Die naheliegende Rechnung (Breite durch Feldbreite) war
 * hier falsch — sie unterschlägt die Abstände zwischen den Feldern, und Pfeil
 * ab sprang bei fünf Spalten um sechs Felder weiter. Die Felder einer Reihe
 * haben denselben `offsetTop`; das stimmt immer, egal was das Raster gerade
 * rechnet.
 */
const grid = ref<HTMLElement | null>(null)
function measureAndSet() {
  const el = grid.value
  if (!el) return
  const children = [...el.children] as HTMLElement[]
  if (children.length === 0) return
  const top = children[0]!.offsetTop
  columns.value = Math.max(1, children.filter(k => k.offsetTop === top).length)
}

/* ------------------------------------------------------------------------
 * DIE EINRICHTUNG ZUM ZÄHLEN
 * --------------------------------------------------------------------- */

/**
 * ZÄHLEN AN DIESEM SCHIRM — die Einrichtung, und sie geschieht einmal.
 *
 * WARUM SIE HIER STEHT UND NICHT AUF DER TAFEL
 *
 * Dies ist der Einrichtungsschirm — er wird am Turniermorgen einmal
 * aufgerufen und danach nur noch, wenn ein Gerät den Tisch wechselt. Genau
 * dann wird auch entschieden, ob dieses Gerät zählt. Ein Eingabefeld auf
 * der Tafel selbst wäre das Gegenteil dessen, wofür sie da ist: sie steht
 * neben einem laufenden Halbfinale, und dort gehört kein Codefeld hin.
 *
 * SEIT DEM 16.09.2026 GIBT ES NUR NOCH EINEN WEG, UND DAS IST DER CODE
 *
 * Zuerst gab es nur die Anmeldung, und dahinter einen Schalter in
 * localStorage. Der Auftraggeber: "wenn ich das scoreboard als eingabe
 * geraet nutzen will [muss ich mich anmelden] ... find ich ehrlich gesagt
 * doof.. da waere ich eher dafuer das man einen 4-stelligen code pro event
 * in der 'Anzeigentafel' maske wo man auch die links kopieren kann
 * einbaut.. mit dem man dann die scoreboard freigeben kann".
 *
 * Sechs Ziffern schalten DIESES GERÄT für DIESEN TISCH frei. Kein Konto,
 * keine Rolle, keine zwanzig Anmeldungen in einer Halle. Einen Tag lang
 * stand die Anmeldung daneben; seit dem 16.09.2026 ist sie hier weg ("das
 * mit dem sign-in per user/pw, kann doch eh weg oder nicht? ist doch jetzt
 * alles über die pins/codes"). Was ein Gerät allein nicht darf, trägt seit
 * dem 15.09.2026 der PERSONENCODE: sechs Ziffern am Tisch, und der Urheber
 * ist der Mensch dahinter, mitsamt seinen Rechten.
 *
 * DER SCHALTER IST WEG, UND ZWAR ERSATZLOS
 *
 * `bb.board.count.<eventId>` war eine BEHAUPTUNG des Geräts über sich
 * selbst, und jeder, der an den Bildschirm kam, konnte sie aufstellen. Wer
 * am 75-Zoll-Schirm im Saal vorbeiging und ihn drückte, bekam Bedienflächen
 * über einem laufenden Halbfinale — und die Trikotkontrolle dazu, also
 * "Lechner — uniform control open" vor dem Publikum. Eingabegerät ist ein
 * Gerät jetzt genau dann, wenn es eine gültige Freigabe hält, und das
 * entscheidet der Server.
 *
 * `bb.board.mirror.<eventId>` BLEIBT. Der Seitentausch ist wirklich eine
 * Eigenschaft des Aufstellorts: der Schirm hängt so herum, wie er hängt.
 * Das geht keinen Server etwas an.
 */
const mirrorStorageKey = `bb.board.mirror.${eventId}`

const mirrored = ref(false)

/** Wer angemeldet ist, samt dem, was er darf. */
interface SignedInUser {
  user?: { display_name?: string }
  grants?: { permission_key?: string, ops?: string }[]
}
const me = ref<SignedInUser | null>(null)

/**
 * Darf dieses Konto überhaupt zählen?
 *
 * Ein HINWEIS und keine Sicherung: `grants` nennt zwar `match` samt Vorgang,
 * aber bei einer Rolle am Veranstalter steht dort keine Veranstaltung, und
 * dieser Schirm weiss nicht, wem diese Veranstaltung gehört. Wer hier
 * durchkommt und trotzdem nicht darf, bekommt beim ersten Zählen eine
 * Abweisung — und die sagt es deutlicher, als eine ausgeblendete Fläche es
 * je könnte.
 */
const canScore = computed(() =>
  (me.value?.grants ?? []).some(g => g.permission_key === 'match' && (g.ops ?? '').includes('U')))

/*
 * HIER STAND DIE ANMELDUNG MIT BENUTZER UND KENNWORT — SIE IST WEG.
 *
 * Der Auftraggeber am 16.09.2026: „das mit dem sign-in per user/pw, kann
 * doch eh weg oder nicht? ist doch jetzt alles über die pins/codes". Er hat
 * recht, und die Prüfung trägt: Die Gerätefreigabe bringt Haus und Ort mit,
 * aber keine Urheberkennung; wo ein Name nötig ist, verlangt der Endpunkt
 * die sechs Ziffern, und `BoardPinService.escalate` setzt danach den
 * MENSCHEN als Urheber (`CurrentActor.setBoardPin`) — mitsamt seinen
 * Rechten. Auch die schwarze Karte, die `disqualification:X` verlangt, geht
 * so, wenn der Mensch hinter der PIN das Recht hat.
 *
 * WAS DAMIT VERSCHWINDET, IST EIN ZWEITER WEG UND KEINE FÄHIGKEIT. Die
 * Anmeldung der Webseite bleibt unberührt: wer sie braucht, meldet sich
 * unter /sign-in an und ruft diese Seite danach auf — der Keks gilt für
 * dieselbe Domäne. Was hier stand, war eine ZWEITE Anmeldefläche neben
 * jener, auf einem Einrichtungsschirm, der in der Halle oft offen
 * herumsteht. Ein Kennwortfeld auf einem Tablet, das zwanzigmal von Hand zu
 * Hand geht, ist der schlechteste Ort für ein Kennwort, den dieses System
 * hat.
 *
 * WAS BLEIBT, IST DIE ABMELDUNG. Sie ist der Gegensatz: sie nimmt nur weg,
 * und sie ist der Griff, mit dem ein Gerät einen liegengebliebenen
 * Sitzungskeks loswird. Ohne sie stünde ein Tablet mit einer fremden
 * Anmeldung schlechter da als eines ohne — und genau das darf nicht sein.
 */
async function fetchMe() {
  me.value = await $fetch<SignedInUser | null>('/api/me').catch(() => null)
}

async function signOut() {
  await $fetch('/api/session', { method: 'DELETE' }).catch(() => undefined)
  me.value = null
}

/* ------------------------------------------------------------------------
 * DIE FREIGABE PER CODE
 * --------------------------------------------------------------------- */

/** Hält dieses Gerät eine Freigabe — und für welchen Tisch? */
const grant = ref<{ released: boolean, tableNumber: number | null } | null>(null)
const codeOpen = ref(false)
const codeDigits = ref('')

/*
 * DAS FELD NIMMT DEN SCHREIBZEIGER SELBST.
 *
 * Der Auftraggeber am 16.09.2026: „wenn ich den button 'enter board code'
 * klicke/touche dann sollte der eingabe focus auf das pin feld uebergehen".
 * Und er hat recht: wer den Knopf drueckt, will tippen — kein Mensch drueckt
 * ihn, um das Feld anzusehen. Auf einem Tablet kostet der zweite Griff
 * ausserdem mehr als auf dem Schirm: erst der Knopf, dann das Feld, dann
 * wartet man auf die Bildschirmtastatur.
 *
 * `nextTick`, weil das Feld erst durch `codeOpen` ins Dokument kommt — vor
 * dem naechsten Zeichnen gibt es nichts, worauf der Zeiger springen koennte.
 */
const codeInput = ref<HTMLInputElement | null>(null)

async function openCode() {
  codeOpen.value = true
  codeError.value = ''
  await nextTick()
  codeInput.value?.focus()
}
const releasing = ref(false)
const codeError = ref('')

const codeComplete = computed(() => /^[0-9]{6}$/.test(codeDigits.value))

async function fetchGrant() {
  grant.value = await $fetch<{ released: boolean, tableNumber: number | null }>(
    '/api/board/grant').catch(() => null)
}

/**
 * Sechs Ziffern einlösen.
 *
 * OHNE Tischnummer: gewählt wird der Tisch danach, oben in der Liste, und
 * zwar mit demselben Griff, mit dem ein Schirm später den Tisch wechselt.
 * Beides in einem Schritt zu verlangen hiesse, dass jeder Tischwechsel den
 * Code wieder braucht — und der liegt dann beim Turnierleiter, nicht am
 * Gerät.
 *
 * DIE AUSKÜNFTE WERDEN UNTERSCHIEDEN
 *
 * Wer hier steht, soll etwas tun können: sich vertippt (`WRONG_CODE`), zu
 * früh dran (`OUT_OF_WINDOW`), zu oft daneben (`LOCKED`) oder — seit dem
 * 25.09.2026 — der Deckel auf gleichzeitig aktive Geräte dieser
 * Veranstaltung ist erreicht (`TOO_MANY_DEVICES`, der Code war dabei
 * richtig) sind vier verschiedene nächste Schritte. Ein einziges "geht
 * nicht" schickte ihn zur Turnierleitung, wo er bei einem Tippfehler
 * nichts zu suchen hat.
 */
async function redeem() {
  if (!codeComplete.value) return
  releasing.value = true
  codeError.value = ''
  try {
    await $fetch('/api/board/grant', {
      method: 'POST',
      body: { eventId, code: codeDigits.value, label: deviceName() },
    })
    codeDigits.value = ''
    codeOpen.value = false
    await fetchGrant()
  }
  catch (error: unknown) {
    const code = (error as { data?: { data?: { error?: string } } })
      ?.data?.data?.error
      ?? (error as { data?: { error?: string } })?.data?.error
    codeError.value = codeText(code)
    codeDigits.value = ''
  }
  finally {
    releasing.value = false
  }
}

function codeText(code: string | undefined): string {
  switch (code) {
    case 'LOCKED':
      // KEINE ZEITANGABE MEHR -- seit dem 25.09.2026.
      //
      // Hier stand "locked for a quarter of an hour", und das war richtig,
      // solange jede Sperre gleich lang war. Seit die Sperre mit jedem
      // Zyklus waechst (15, 30, 60 Minuten ... bis 24 Stunden, siehe
      // identity.redeem_board_code), waere die Viertelstunde bei der
      // zweiten Sperre eine Zusage, die niemand einhaelt -- und wer nach
      // fuenfzehn Minuten wiederkommt und wieder abgewiesen wird, haelt
      // die Tafel fuer kaputt.
      //
      // Was zaehlt, steht ohnehin im zweiten Halbsatz: das Turnierbuero
      // kann die Sperre aufheben. Das ist der Weg, nicht das Warten.
      return 'Too many wrong codes. This event is locked for a while — '
        + 'the tournament office can lift it.'
    case 'OUT_OF_WINDOW':
      return 'This event is not running. A board code works from two days before '
        + 'until one day after.'
    case 'UNKNOWN_TABLE':
      return 'That table does not belong to this event.'
    case 'TOO_MANY_DEVICES':
      // Seit dem 25.09.2026: der Code war richtig, nur der Deckel auf
      // gleichzeitig aktive Geraete dieser Veranstaltung ist erreicht.
      // "That code was not accepted" waere hier die falsche Auskunft.
      return 'Too many screens are released for this event. Ask the tournament desk to '
        + 'revoke unused ones.'
    case 'SCORING_UNREACHABLE':
      return 'The scoring service did not answer. Nothing was changed.'
    default:
      return 'That code was not accepted.'
  }
}

/**
 * Wie dieses Gerät in der Liste der Turnierleitung heisst.
 *
 * Keine Eingabe: am Turniermorgen tippt niemand zwanzigmal einen Namen. Die
 * Browserkennung reicht, um einen Schirm wiederzuerkennen — daraus baut die
 * Maske "Tisch 7 · iPad · 10.0.3.12". Der Rest steht ohnehin dort.
 */
function deviceName(): string {
  return ''
}

async function releaseGrant() {
  await $fetch('/api/board/grant', { method: 'DELETE' }).catch(() => undefined)
  await fetchGrant()
}

/**
 * Ein Merker dieses Geräts — nur noch der Seitentausch.
 *
 * localStorage und kein Cookie: die Auskunft gehört diesem einen Bildschirm.
 * Ein Cookie ginge an den Server und drehte jeden Schirm mit, an dem dasselbe
 * Konto angemeldet ist.
 */
function setMirrored(value: boolean) {
  mirrored.value = value
  try {
    if (value) window.localStorage.setItem(mirrorStorageKey, '1')
    else window.localStorage.removeItem(mirrorStorageKey)
  }
  catch {
    // Privater Modus: die Einstellung gilt bis zum Neuladen. Eine Meldung
    // darüber hielte den Aufbau von dem ab, was er eigentlich tut.
  }
}

onMounted(() => {
  try {
    mirrored.value = window.localStorage.getItem(mirrorStorageKey) === '1'
  }
  catch {
    // Kein Speicher, kein Merker — der Schirm hängt dann herum wie geliefert.
  }
  fetchMe()
  fetchGrant()
})

useHead({
  title: () => `Pick a table – ${board.value?.eventName ?? 'Scoreboard'}`,
  // Wie die Tafel: eine Auswahl für einen Saal gehört nicht in eine Suche.
  meta: [{ name: 'robots', content: 'noindex, nofollow' }],
  htmlAttrs: { class: 'board-screen' },
})
</script>

<template>
  <!--
    Das Band aus der vorigen Veranstaltung ist eine EIGENE Rasterzeile, und
    sie entsteht nur, wenn es das Band gibt. Ohne den Zusatz zählte das
    Raster die Zeilen falsch durch, und die Tischwahl bekäme die Höhe des
    Bandes statt den Rest des Schirms (grid-template-rows unten).
  -->
  <div class="pick" :class="{ 'pick--vorher': suggestion !== null }">
    <template v-if="unknownEvent">
      <div class="pick__hint pick__hint--allein">
        <p class="pick__hint-title">Unknown event</p>
        <p class="pick__hint-text">Check the address of this screen.</p>
        <!--
          Und ein Ausweg statt einer Sackgasse. Genau hier landet, wer eine
          veraltete Adresse auf einem Tablet stehen hat — bisher half nur,
          die Adressleiste zu öffnen, die auf einem Kioskgerät gar nicht da
          ist.
        -->
        <button type="button" class="pick__wechsel" @click="navigateTo('/board?switch=1')">
          Pick an event
        </button>
      </div>
    </template>

    <template v-else>
      <header class="pick__head">
        <span class="pick__event">{{ board?.eventName ?? '' }}</span>
        <span class="pick__what">Pick a table</span>
      </header>

      <!--
        DER VORSCHLAG AUS DER VORIGEN VERANSTALTUNG.

        ER DARF NICHT WIE EIN ZUSTAND AUSSEHEN, SONDERN WIE EINE FRAGE. Er
        wird im Stehen gelesen, mit einem Finger bedient und in einer lauten
        Halle, in der niemand nachfragt — deshalb steht die Zeitangabe („at
        the last event") VOR der Nummer und der Zustand („nothing is open
        yet") daneben. „Table 7" allein hätte gelesen werden können als
        „dieser Schirm IST Tisch 7", und dann hätte niemand mehr gewählt.

        Zwei Knöpfe und kein Kreuzchen: das Wegtippen muss so gross sein wie
        das Annehmen, sonst wird es zum Versehen. Beide tragen die Nummer
        beziehungsweise das Gegenteil im Wort, damit der Daumen nicht raten
        muss, welcher welcher ist.

        Über der Tischwahl und nicht darunter: er beantwortet die Frage, die
        vor der Wahl steht. Wer ihn nicht will, sieht die Kacheln darunter
        unverändert.
      -->
      <section v-if="suggestion !== null" class="vorher">
        <p class="vorher__wort">At the last event this screen stood at</p>
        <p class="vorher__zahl">Table {{ suggestion }}</p>
        <p class="vorher__text">Nothing is open yet.</p>
        <div class="vorher__knoepfe">
          <button type="button" class="vorher__ja" @click="acceptSuggestion()">
            Use table {{ suggestion }} again
          </button>
          <button type="button" class="vorher__nein" @click="dismissSuggestion()">
            Pick a different table
          </button>
        </div>
      </section>

      <main v-if="tables.length === 0" class="pick__hint">
        <p class="pick__hint-title">No tables yet</p>
        <p class="pick__hint-text">
          This screen is ready. It will show the choice as soon as tables are set up.
        </p>
      </main>

      <!--
        :key an der Tischnummer und nicht am Index. Die Liste laedt sich beim
        Aufbau nach, waehrend Tische dazukommen; ohne Schluessel setzt Vue
        nach Position um, und dann haengt am neuen Feld der alte Klick.
      -->
      <main v-else ref="grid" class="pick__grid">
        <button
          v-for="(t, i) in tables"
          :key="t.number"
          type="button"
          class="pick__table"
          :class="{
            'pick__table--on': i === index,
            'pick__table--blocked': t.isBlocked,
            'pick__table--oeffnet': opening === t.number,
          }"
          :aria-busy="opening === t.number"
          @click="choose(t.number)"
          @mouseenter="index = i"
        >
          <span class="pick__number">{{ t.number }}</span>
          <span v-if="t.name" class="pick__name">{{ t.name }}</span>
          <span v-if="t.isBlocked" class="pick__blocked">out of play</span>
          <!--
            Der Balken laeuft unten an der Kachel entlang und nimmt keinen
            Platz: die Kachel darf beim Antippen nicht die Groesse aendern,
            sonst wandern die Nachbarn unter dem Finger weg.
          -->
          <span v-if="opening === t.number" class="pick__laeuft" aria-hidden="true" />
        </button>
      </main>

      <!--
        ZÄHLEN AN DIESEM SCHIRM — die Einrichtung, nicht die Bedienung.

        Sie steht UNTER der Tischwahl: die Wahl ist, wofür diese Seite da
        ist, und zwanzig Bildschirme einer Halle werden nur angeschlossen und
        nie angemeldet. Was den einen Schirm neben dem Tisch betrifft, steht
        darunter und nicht darüber.
      -->
      <section class="zaehlen">
        <!--
          DIE VERANSTALTUNG — UND DER WEG ZU EINER ANDEREN.

          Der Auftraggeber: „so das man sich nicht erst bei dem veranstalter
          die url geben lassen muss, dann zu den ganzen tablets wieder hin
          und url wechseln". Genau dafür gibt es /board, und dies ist der
          Knopf dorthin.

          Er steht in der Einrichtungsleiste und nicht im Kopf, und zwar aus
          einem gemessenen Grund: im Kopf nahm er dem Veranstaltungsnamen so
          viel Platz, dass „European Championships 2026 (TEST)" auf einem
          iPad im Hochformat dreizeilig wurde und die ersten beiden
          Tischkacheln aus dem Bild schob. Die Tischwahl ist der Zweck
          dieser Seite; der Wechsel ist die Ausnahme und gehört zu dem, was
          hier unten ohnehin eingerichtet wird.

          Als erste Zeile, weil sie zugleich die Frage beantwortet, die vor
          jedem Wechsel steht: bin ich überhaupt in der richtigen
          Veranstaltung?
        -->
        <p class="zaehlen__zeile">
          <span class="zaehlen__wort">Event</span>
          <span class="zaehlen__text">{{ board?.eventName ?? '' }}</span>
          <button
            type="button" class="zaehlen__knopf"
            @click="navigateTo('/board?switch=1')"
          >
            Switch event
          </button>
        </p>

        <!--
          ERSTENS: DER TAFELCODE. Er steht ganz oben, weil er der Weg ist,
          der in der Halle gemeint ist — zwanzig Bildschirme, ein Code, und
          niemand meldet zwanzig Bildschirme einzeln an.
        -->
        <p v-if="grant?.released" class="zaehlen__zeile">
          <span class="zaehlen__wort">Scoring</span>
          <span class="zaehlen__text">
            This screen counts
            <template v-if="grant.tableNumber">
              at table {{ grant.tableNumber }}
            </template>
            <template v-else>· pick a table above</template>
          </span>
          <button type="button" class="zaehlen__knopf" @click="releaseGrant">
            Stop counting here
          </button>
        </p>

        <template v-else>
          <p class="zaehlen__zeile">
            <span class="zaehlen__wort">Scoring</span>
            <span class="zaehlen__text">This screen only shows the score.</span>
            <button
              v-if="!codeOpen" type="button" class="zaehlen__knopf"
              @click="openCode"
            >
              Enter board code
            </button>
          </p>

          <!--
            Sechs Ziffern, gross. Sie werden vorgelesen und abgetippt, oft von
            jemandem, der dabei steht und nicht sitzt — ein Feld in
            Fliesstextgroesse trifft dort niemand.

            `inputmode="numeric"` und nicht `type="number"`: ein Zahlenfeld
            bringt Pfeilchen zum Hoch- und Runterzaehlen mit und wirft
            fuehrende Nullen weg, und `0042` ist ein gueltiger Code.
          -->
          <form v-if="codeOpen" class="zaehlen__form" @submit.prevent="redeem">
            <input
              ref="codeInput"
              v-model="codeDigits" class="zaehlen__code"
              inputmode="numeric" autocomplete="off" maxlength="6"
              placeholder="······" aria-label="Board code" required
            >
            <button
              type="submit" class="zaehlen__knopf zaehlen__knopf--an"
              :disabled="releasing || !codeComplete"
            >
              {{ releasing ? 'Releasing …' : 'Release this screen' }}
            </button>
            <button type="button" class="zaehlen__knopf" @click="codeOpen = false">
              Cancel
            </button>
            <p v-if="codeError" class="zaehlen__fehler" role="alert">{{ codeError }}</p>
            <p class="zaehlen__hinweis">
              The tournament office reads out a six digit code. It releases this
              one screen for one table — no account needed.
            </p>
          </form>
        </template>

        <!--
          ZWEITENS: WER HIER ANGEMELDET IST — UND WIE ER WIEDER WEGKOMMT.

          Die Anmeldefläche mit Benutzer und Kennwort stand hier bis zum
          16.09.2026 und ist weg; die Begründung steht im Skriptteil. Diese
          Zeile bleibt, und sie ist mehr als eine Auskunft: sie ist der
          Griff, mit dem ein Tablet eine liegengebliebene Anmeldung loswird.

          Sie erscheint NUR, wenn wirklich jemand angemeldet ist. `/api/me`
          fragt die Verwaltung und nicht den Keks — ein abgelaufener
          Sitzungskeks ergibt hier nichts, und der Schirm behauptet dann auch
          nicht, es sei jemand da.
        -->
        <p v-if="me" class="zaehlen__zeile">
          <span class="zaehlen__wort">Signed in</span>
          <span class="zaehlen__text">{{ me.user?.display_name ?? 'Signed in' }}</span>

          <!--
            Der Hinweis gilt nur, solange dieser Schirm NICHT freigeschaltet
            ist. Ein freigegebenes Gerät zählt über seine Freigabe, und was
            das angemeldete Konto darf, geht es dann nichts an — der Satz
            stünde sonst neben einem Schirm, der einwandfrei zählt, und
            schickte jemanden auf die Suche nach einem Fehler, den es nicht
            gibt.
          -->
          <span v-if="!canScore && !grant?.released" class="zaehlen__warnung">
            no scoring permission for this account
          </span>

          <button type="button" class="zaehlen__knopf" @click="signOut">Sign out</button>
        </p>

        <!--
          DRITTENS: DER SPIEGEL. Er steht unter beidem, weil er mit dem
          Dürfen nichts zu tun hat: welche Seite der Partie links steht, ist
          eine Eigenschaft des AUFSTELLORTS. A und B sind die Reihenfolge der
          Auslosung, und wo die beiden wirklich stehen, weiss nur, wer im
          Saal ist. Er geht an keinen Server und bleibt deshalb in
          localStorage.
        -->
        <p class="zaehlen__zeile">
          <span class="zaehlen__wort">Sides</span>
          <button
            type="button"
            class="zaehlen__knopf"
            :class="{ 'zaehlen__knopf--an': mirrored }"
            @click="setMirrored(!mirrored)"
          >
            Swap sides: {{ mirrored ? 'on' : 'off' }}
          </button>
        </p>
      </section>

      <footer class="pick__foot">
        <span class="pick__keys">Arrows and OK, or type the number, or tap</span>
        <!--
          Die getippten Ziffern muessen sichtbar sein. Eine Fernbedienung gibt
          keine Rueckmeldung, und wer "1" gedrueckt hat und nichts sieht,
          drueckt noch einmal — und landet auf Tisch 11.
        -->
        <span v-if="typed" class="pick__typed">{{ typed }}</span>
        <!--
          Der Hinweis nennt jetzt beide Nullen — die auf der Tafel, die
          hierher zurückführt, und die hier, die eine Stufe weiter zur
          Veranstaltungswahl geht. Stünde nur die alte da, wäre der zweite
          Sprung eine Überraschung für jeden, der ihn auslöst.
        -->
        <span class="pick__memo">
          The choice is remembered · press 0 for another event
        </span>
      </footer>
    </template>
  </div>
</template>

<style>
/* Wie die Tafel: der schwarze Grund gehört html und body, nicht dieser
   Komponente — und nur auf dieser Seite. */
.board-screen,
.board-screen body {
  height: 100%;
  margin: 0;
  overflow: hidden;
  background: #05080d;
}
</style>

<style scoped>
/*
 * Dieselben Farben und dieselbe Rechnung in vh wie die Tafel: derselbe
 * Bildschirm, dieselbe Entfernung. Ein hell getönter Auswahlschirm vor einer
 * dunklen Tafel wäre in einem abgedunkelten Saal ein Blitz.
 */
.pick {
  --ink: #ffffff;
  --ink-dim: #93a1b3;
  --ground: #05080d;
  --line: #1b2432;
  --accent: var(--color-primary, #00afee);

  display: grid;
  /* Kopf, Tischwahl, Einrichtung zum Zählen, Fußzeile. Die dritte Zeile ist
     `auto` und kostet nichts, solange dort nur eine Zeile steht. */
  grid-template-rows: auto 1fr auto auto;
  height: 100dvh;
  background: var(--ground);
  color: var(--ink);
  font-family: Montserrat, system-ui, sans-serif;
  font-variant-numeric: tabular-nums;
}

/* Kopf, BAND, Tischwahl, Einrichtung, Fußzeile — siehe den Kommentar oben. */
.pick--vorher {
  grid-template-rows: auto auto 1fr auto auto;
}

/* ------------------------------------------------------------------------
 * DAS BAND AUS DER VORIGEN VERANSTALTUNG
 *
 * ES SIEHT NICHT AUS WIE EINE KACHEL, und das ist der ganze Punkt. Eine
 * gefüllte Fläche mit einer Tischnummer darin IST auf diesem Schirm die
 * Sprache für „dieser Tisch" — und gelesen würde sie als „schon gewählt".
 * Deshalb: breit statt quadratisch, getönt statt gefüllt, mit einer Zeile
 * Text über der Zahl und zwei Knöpfen darunter. Eine Kachel hat keine
 * Knöpfe; was Knöpfe hat, ist eine Frage.
 * --------------------------------------------------------------------- */
.vorher {
  display: grid;
  gap: 0.5dvh;
  margin: 2dvh 4dvh 0;
  padding: 1.8dvh 2.4dvh;
  border: 2px solid var(--accent);
  border-radius: 0.6rem;
  /* Getönt und nicht gefüllt — eine gefüllte Fläche wäre eine Wahl. */
  background: rgba(0, 175, 238, 0.12);
  text-align: center;
}

.vorher__wort {
  margin: 0;
  color: var(--ink-dim);
  font-size: min(2.3dvh, 2.3vw);
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.vorher__zahl {
  margin: 0;
  font-size: min(4.6dvh, 4.6vw);
  font-weight: 700;
}

.vorher__text {
  margin: 0;
  color: var(--ink-dim);
  font-size: min(2.2dvh, 2.2vw);
}

.vorher__knoepfe {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 1.4dvh;
  margin-top: 1dvh;
}

/*
 * BEIDE GLEICH GROSS. „Pick a different table" ist kein Kreuzchen in der
 * Ecke: wer den Vorschlag nicht will, trifft ihn im Stehen mit dem Daumen
 * genauso sicher wie den, der ihn annimmt. 6dvh sind auf einem iPad im
 * Hochformat gut 61 px.
 */
.vorher__ja,
.vorher__nein {
  min-height: 6dvh;
  padding: 0.8dvh 2.4dvh;
  border-radius: 0.5rem;
  font: inherit;
  font-size: min(2.6dvh, 2.6vw);
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  cursor: pointer;
}

.vorher__ja {
  border: 2px solid var(--accent);
  background: var(--accent);
  color: #00222f;
}

.vorher__nein {
  border: 2px solid var(--line);
  background: transparent;
  color: var(--ink-dim);
}

.vorher__nein:hover,
.vorher__nein:focus-visible {
  border-color: var(--accent);
  color: var(--ink);
}

.pick__head {
  display: flex;
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

.pick__what {
  flex: none;
  color: var(--accent);
}

/*
 * Der Ausweg aus „Unknown event" — ein Knopf, kein Link.
 *
 * Die Fläche ist bewusst kleiner als eine Tischkachel und trotzdem gross
 * genug für einen Daumen im Stehen (min-height 4.4dvh sind auf einem iPad im
 * Hochformat gut 45 px).
 */
.pick__wechsel {
  flex: none;
  min-height: 4.4dvh;
  padding: 0.6dvh 1.6dvh;
  border: 1px solid var(--line);
  border-radius: 0.4rem;
  background: transparent;
  color: var(--ink-dim);
  font: inherit;
  font-size: min(2.4dvh, 2.2vw);
  letter-spacing: 0.04em;
  text-transform: uppercase;
  cursor: pointer;
}

.pick__wechsel:hover,
.pick__wechsel:focus-visible {
  border-color: var(--accent);
  color: var(--ink);
}

/*
 * auto-fit und eine Mindestbreite: bei sechs Tischen werden die Felder groß,
 * bei dreißig kleiner, und niemand muss eine Spaltenzahl pflegen. Die
 * Mindestbreite ist in vh gerechnet, damit sie mit der Schriftgröße wächst
 * statt gegen sie zu laufen.
 */
.pick__grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(22dvh, 45vw), 1fr));
  /*
   * ZENTRIERT, ABER NUR SOLANGE ES PASST.
   *
   * `align-content: center` allein schiebt bei Überlauf die ersten Reihen
   * ÜBER den oberen Rand hinaus, und dorthin kommt kein Bildlauf: gemessen
   * am 16.09.2026 auf einem iPad im Hochformat (768×1024) mit zehn Tischen
   * standen Tisch 1 und Tisch 2 56 px oberhalb des Anfangs — sichtbar
   * angeschnitten und mit dem Finger nicht erreichbar, bei `scrollTop = 0`.
   * Das ist die bekannte Falle zentrierter Überläufe.
   *
   * `safe center` zentriert, wenn Platz ist, und rückt sonst an den Anfang.
   * Beide Zeilen: ein Browser ohne `safe` überliest die zweite und behält
   * die alte Darstellung; einer mit `safe` nimmt sie und zeigt alle Tische.
   */
  align-content: center;
  align-content: safe center;
  gap: 1.6dvh;
  padding: 2dvh 4dvh;
  overflow-y: auto;
}

.pick__table {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.4dvh;
  min-height: 14dvh;
  padding: 1.5dvh 1dvh;
  border: 2px solid var(--line);
  border-radius: 1.2dvh;
  background: #0b1220;
  color: var(--ink);
  font-family: inherit;
  cursor: pointer;
}

/* Die Hervorhebung ist ein Rahmen und keine Füllung: gefüllt sah das Feld
   aus wie "schon gewählt", und gewählt ist noch keines. */
.pick__table--on {
  border-color: var(--accent);
  box-shadow: 0 0 0 0.4dvh rgb(0 175 238 / 25%);
}

/*
 * DIE KACHEL, DIE GERADE OEFFNET.
 *
 * Zwei Zeichen, weil eins zu wenig ist: die Kachel bleibt hell markiert
 * (auch auf einem Geraet ohne Zeigegeraet, wo `--on` nie kommt), und unten
 * laeuft ein Balken. Der Balken allein waere auf einem hellen Schirm im
 * Saal schwer zu sehen, die Markierung allein saehe aus wie die
 * gewoehnliche Hervorhebung.
 *
 * Nichts davon aendert die Groesse -- die Nachbarn duerfen nicht unter dem
 * Finger wegwandern, waehrend jemand noch tippt.
 */
.pick__table--oeffnet {
  border-color: var(--accent);
  background: rgb(0 175 238 / 12%);
}

.pick__laeuft {
  position: absolute;
  left: 0;
  bottom: 0;
  height: 0.5dvh;
  width: 100%;
  overflow: hidden;
  background: rgb(0 175 238 / 20%);
}

.pick__laeuft::after {
  content: '';
  position: absolute;
  inset: 0;
  background: var(--accent);
  transform-origin: left;
  animation: pick-laeuft 1.1s ease-in-out infinite;
}

@keyframes pick-laeuft {
  0%   { transform: translateX(-100%) scaleX(0.4); }
  50%  { transform: translateX(0)     scaleX(0.6); }
  100% { transform: translateX(100%)  scaleX(0.4); }
}

/*
 * Ohne Bewegung bleibt der Balken stehen und gefuellt: die Auskunft "hier
 * passiert etwas" darf nicht an einer Animation haengen.
 */
@media (prefers-reduced-motion: reduce) {
  .pick__laeuft::after { animation: none; transform: none; }
}

.pick__table--blocked {
  opacity: 0.45;
}

.pick__number {
  font-size: min(7dvh, 9vw);
  font-weight: 700;
  line-height: 1;
}

.pick__name {
  font-size: min(2.2dvh, 3vw);
  color: var(--ink-dim);
  text-align: center;
}

.pick__blocked {
  font-size: min(1.8dvh, 2.6vw);
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: #ff6b6b;
}

/*
 * DIE EINRICHTUNGSZEILE
 *
 * Gedämpft und schmal. Sie ist nicht das, wofür diese Seite da ist — zwanzig
 * Bildschirme einer Halle werden nur angeschlossen, und für sie muss die
 * Zeile unsichtbar bleiben können, ohne dass sie fehlt. Deshalb kein Kasten,
 * kein Titel, keine Farbe ausser dort, wo ein Schalter an ist.
 */
.zaehlen {
  padding: 1.5dvh 4dvh 0;
  border-top: 2px solid var(--line);
  font-size: min(2.2dvh, 2.4vw);
}

.zaehlen__zeile,
.zaehlen__form {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 1.2dvh;
  margin: 0 0 1dvh;
}

.zaehlen__wort {
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--accent);
}

.zaehlen__text {
  color: var(--ink-dim);
}

.zaehlen__knopf {
  padding: 0.8dvh 1.6dvh;
  border: 2px solid var(--line);
  border-radius: 0.8dvh;
  background: #0b1220;
  color: var(--ink);
  font-family: inherit;
  font-size: inherit;
  cursor: pointer;
}

.zaehlen__knopf--an {
  border-color: var(--accent);
  background: var(--accent);
  color: #00222f;
  font-weight: 700;
}

/* Gesperrt, aber da. Der Grund steht im `title` und als Warnung daneben. */
.zaehlen__knopf:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.zaehlen__form input {
  padding: 0.8dvh 1.2dvh;
  border: 2px solid var(--line);
  border-radius: 0.8dvh;
  background: #0b1220;
  color: var(--ink);
  font-family: inherit;
  font-size: inherit;
}

.zaehlen__code {
  width: 9ch;
  padding: 0.35rem 0.5rem;
  font-size: 1.6rem;
  font-variant-numeric: tabular-nums;
  letter-spacing: 0.35em;
  text-align: center;
}

.zaehlen__hinweis {
  flex-basis: 100%;
  margin: 0.3rem 0 0;
  font-size: 0.8rem;
  opacity: 0.6;
}

.zaehlen__fehler {
  flex: 1 0 100%;
  margin: 0;
  color: var(--color-danger, #ff5252);
  font-weight: 700;
}

/* Rot heisst: hier fehlt etwas, das gebraucht wird. */
.zaehlen__warnung {
  color: var(--color-danger, #ff5252);
  font-weight: 700;
  text-transform: uppercase;
}

.pick__foot {
  display: flex;
  align-items: center;
  gap: 2dvh;
  padding: 0 4dvh 2.5dvh;
  font-size: min(2.2dvh, 2.4vw);
  color: var(--ink-dim);
}

.pick__typed {
  padding: 0 1.2dvh;
  border: 2px solid var(--accent);
  border-radius: 0.8dvh;
  color: var(--ink);
  font-weight: 700;
}

.pick__memo {
  margin-left: auto;
  text-align: right;
}

.pick__hint {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
}

/*
 * Ohne Veranstaltung gibt es weder Kopf noch Fuss, und der Hinweis muss die
 * drei Rasterzeilen selbst ausfuellen -- sonst klebt "Unknown event" oben am
 * Rand, wo im Betrieb der Name der Veranstaltung stuende. Dieselbe Regel wie
 * auf der Tafel daneben ([table].vue, .board__hint).
 */
.pick__hint--allein {
  grid-row: 1 / -1;
}

.pick__hint-title {
  margin: 0;
  font-size: min(7dvh, 8vw);
  font-weight: 700;
}

.pick__hint-text {
  margin: 1dvh 0 0;
  font-size: min(3dvh, 4vw);
  color: var(--ink-dim);
}
</style>
