<script setup lang="ts">
import type { BoardEventList, BoardEventItem } from '~~/shared/types/api'

/**
 * DIE EINE ADRESSE FÜR ALLE TABLETS — /board, OHNE VERANSTALTUNG
 *
 * Der Auftraggeber: „so müsste man auf dem tablet nur eine 'default' url
 * hinterlegen für die scoreboards und fertig.." Genau das ist diese Seite.
 * Vorher begann jeder Weg zur Tafel mit einer UUID, die beim Veranstalter
 * lag: erst die Adresse erfragen, dann durch die Halle zu zwanzig Tablets
 * und zwanzig Mal tippen. Jetzt steht auf jedem Gerät dieselbe Adresse, und
 * WELCHE Veranstaltung es zeigt, entscheidet sich vor Ort mit einem Griff.
 *
 * KEINE CODEABFRAGE VOR DER LISTE
 *
 * Der Auftraggeber nannte zwei Wege — Code, dann Sprung zur Veranstaltung;
 * oder eine Liste zum Auswählen — und neigte selbst zum zweiten. Er hat
 * recht, und der Grund steht schon im Bestand: die Tafel verbindet sich
 * ZUERST nur lesend, und erst der sechsstellige Tafelcode schaltet die
 * Eingabe frei (siehe [eventId]/index.vue, „DIE FREIGABE PER CODE"). Diese
 * Liste zeigt also nichts, was nicht ohnehin öffentlich ist: dieselben
 * Veranstaltungen stehen im Kalender der Verbandsseite. Ein Code davor wäre
 * eine Hürde ohne Schutz — und am Turniermorgen eine Hürde für jeden, der
 * nur einen Bildschirm anschliessen will.
 *
 * WELCHE VERANSTALTUNGEN STEHEN HIER
 *
 * Die des Mandanten dieser Seite (`X-BB-Site`, serverseitig gesetzt), und
 * nur die, für die heute überhaupt eine Tafel in Betrieb sein kann: von zwei
 * Tagen vor dem Beginn bis einen Tag nach dem Ende. Das ist KEINE neue
 * Frist, sondern genau die des Tafelcodes — siehe die Meldung
 * `OUT_OF_WINDOW` nebenan („A board code works from two days before until
 * one day after"). Eine Veranstaltung anzubieten, an der sich kein Gerät
 * freischalten liesse, wäre eine Einladung in eine Sackgasse.
 *
 * DER SCHIRM MERKT SICH DIE VERANSTALTUNG
 *
 * Wie die Tischwahl daneben sich den Tisch merkt. Ein Hallenrechner, der
 * über Nacht neu startet, steht am Morgen wieder an seinem Tisch, ohne dass
 * jemand durch die Halle geht: /board → gemerkte Veranstaltung → gemerkter
 * Tisch → Tafel. Gesprungen wird nur, solange die gemerkte Veranstaltung
 * noch in der Liste steht — am Montag nach dem Turnier fällt sie heraus und
 * das Gerät zeigt wieder die Auswahl. Wer die Liste trotz Merker sehen will,
 * kommt mit `?switch=1` her; das ist der Weg des Knopfes „Switch event".
 */
definePageMeta({ layout: false })

const route = useRoute()

/** Kam der Aufruf über „Switch event"? Dann nicht wieder wegspringen. */
const wechselwunsch = computed(() => route.query.switch !== undefined)

const { data, refresh } = await useAsyncData(
  'board-events',
  () => $fetch<BoardEventList>('/api/board/events'),
  { default: () => ({ events: [], next: null }) as BoardEventList },
)

const events = computed(() => data.value?.events ?? [])
const naechste = computed(() => data.value?.next ?? null)

/**
 * EINE NEUE FASSUNG — hier ohne jeden Vorbehalt.
 *
 * Auf der Veranstaltungswahl läuft nie eine Partie, es gibt keine
 * Zifferneingabe und kein Menü. Sobald der zweiminütige Abruf eine andere
 * Bau-Kennung mitbringt, wird geladen. `darf: () => true` ist deshalb keine
 * Nachlässigkeit, sondern die vollständige Antwort für diese Seite.
 *
 * Gemeldet wird in einem Beobachter und nicht im Abruf: `refresh()` schreibt
 * `data` und gibt nichts zurück, was hier zu greifen wäre.
 */
const fassung = useFassungswechsel({ darf: () => true })
watch(() => data.value?.buildId, k => fassung.melden(k), { immediate: true })

/* ------------------------------------------------------------------------
 * DER MERKER
 * --------------------------------------------------------------------- */

/**
 * Ein Schlüssel ohne Veranstaltung — er IST die Veranstaltung.
 *
 * localStorage und kein Keks: die Auskunft gehört diesem Bildschirm und hat
 * auf keinem Server etwas zu suchen. Genau wie `bb.board.table.<eventId>`
 * und `bb.board.mirror.<eventId>` nebenan.
 */
const merkschluessel = 'bb.board.event'

function gemerkt(): string | null {
  if (import.meta.server) return null
  try {
    return window.localStorage.getItem(merkschluessel) || null
  }
  catch {
    // Privater Modus: kein Merker, dann eben jedes Mal die Auswahl.
    return null
  }
}

function merken(id: string) {
  try {
    window.localStorage.setItem(merkschluessel, id)
  }
  catch {
    /* siehe oben — die Wahl gilt trotzdem, nur nicht über den Neustart. */
  }
}

/* ------------------------------------------------------------------------
 * DIE FREIGABE — SIE HÄNGT AN EINER VERANSTALTUNG
 * --------------------------------------------------------------------- */

/**
 * Was dieses Gerät gerade darf, und WO.
 *
 * Die Freigabe (`bb_board`) gilt für EINE Veranstaltung und EINEN Tisch.
 * Deshalb steht hier `eventId` und nicht nur `released`: ohne sie wüsste
 * diese Seite nicht, ob ein Wechsel ein Wechsel ist.
 */
const freigabe = ref<{
  released: boolean, eventId: string | null, tableNumber: number | null
} | null>(null)

async function freigabeHolen() {
  freigabe.value = await $fetch<{
    released: boolean, eventId: string | null, tableNumber: number | null
  }>('/api/board/grant').catch(() => null)
}

/** Die Veranstaltung, an der dieses Gerät gerade zählen darf — oder null. */
const zaehltBei = computed(() =>
  freigabe.value?.released ? freigabe.value.eventId : null)

/* ------------------------------------------------------------------------
 * DIE WAHL
 * --------------------------------------------------------------------- */

const oeffnet = ref<string | null>(null)

/**
 * Eine Veranstaltung wählen — und dabei die alte Freigabe abgeben.
 *
 * DAS IST DIE EIGENTLICHE ENTSCHEIDUNG DIESER SEITE.
 *
 * Ein Gerät, das in Halle A freigeschaltet wurde und danach auf Halle B
 * umgestellt wird, darf in Halle A nicht weiter zählen dürfen. Das ist kein
 * theoretischer Fall: ein Tablet wandert im Verband von Turnier zu Turnier,
 * und der Keks lebt bis einen Tag nach der Veranstaltung weiter. Bliebe er
 * liegen, hinge an einem Gerät, das längst woanders steht, noch ein Recht
 * auf fremde Partien — und niemand in Halle A sähe, warum.
 *
 * Deshalb: wer die Veranstaltung wechselt, gibt die Freigabe ab. Ohne
 * Rückfrage, und ohne dass dabei etwas verloren geht, was nicht in sechs
 * Ziffern wiederzubeschaffen wäre — in der neuen Halle braucht es ohnehin
 * den Code der dortigen Turnierleitung. Der Weg ist genau der von
 * „Stop counting here" nebenan, nur dass ihn hier der Wechsel auslöst.
 *
 * DIESELBE Veranstaltung noch einmal zu wählen ist KEIN Wechsel: das Gerät
 * behält seine Freigabe. Sonst kostete jeder Blick in die Liste den Code.
 *
 * Der Fehler wird verschluckt und die Wahl geht trotzdem durch: die Liste
 * ist der Weg zur ANZEIGE, und die darf jeder sehen. Schlimmstenfalls
 * bleibt die alte Freigabe stehen — dann nimmt sie die Turnierleitung in
 * ihrer Maske zurück, wie jede andere auch.
 */
async function waehlen(v: BoardEventItem) {
  if (oeffnet.value === v.id) return
  oeffnet.value = v.id

  merken(v.id)

  if (zaehltBei.value && zaehltBei.value !== v.id) {
    await $fetch('/api/board/grant', { method: 'DELETE' }).catch(() => undefined)
  }

  navigateTo(`/board/${v.id}`)
}

/* ------------------------------------------------------------------------
 * BEDIENUNG: FINGER, PFEILE, ZIFFERN
 * --------------------------------------------------------------------- */

/**
 * Dieselben drei Wege wie bei der Tischwahl, und aus demselben Grund: das
 * Gerät hängt an der Wand oder steht auf einem Tisch, und was daneben liegt,
 * ist mal ein Finger und mal eine Fernbedienung.
 *
 * Die Ziffern wählen die n-te Zeile — die Veranstaltungen tragen keine
 * Nummern, also stehen sie sichtbar an der Kachel. Eine Halle hat heute ein
 * Turnier und nicht vierhundert; mehr als neun Zeilen sind hier nicht zu
 * erwarten, und für den Rest bleiben Pfeile und Finger.
 */
const stelle = ref(0)

function bewegen(d: number) {
  const n = events.value.length
  if (n === 0) return
  stelle.value = (stelle.value + d + n) % n
}

function taste(ev: KeyboardEvent) {
  const ziel = ev.target as HTMLElement | null
  if (ziel && /^(input|textarea|select)$/i.test(ziel.tagName)) return
  if (events.value.length === 0) return

  if (ev.key >= '1' && ev.key <= '9') {
    const i = Number.parseInt(ev.key, 10) - 1
    const v = events.value[i]
    if (v) {
      stelle.value = i
      waehlen(v)
    }
    ev.preventDefault()
    return
  }

  const schritt: Record<string, number> = {
    ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1,
  }
  if (ev.key in schritt) {
    bewegen(schritt[ev.key]!)
    ev.preventDefault()
    return
  }

  if (ev.key === 'Enter' || ev.key === ' ') {
    const v = events.value[stelle.value]
    if (v) waehlen(v)
    ev.preventDefault()
  }
}

/* ------------------------------------------------------------------------
 * DIE SEITE STEHT TAGELANG — SIE MUSS SICH SELBST EINHOLEN
 * --------------------------------------------------------------------- */

/**
 * Alle zwei Minuten neu fragen.
 *
 * Der Zweck der ganzen Seite ist ein Tablet, auf dem EINE Adresse
 * hinterlegt ist und das danach niemand mehr anfasst. Steht es am
 * Montagmorgen auf „nothing running" und wird am Mittwoch die Halle
 * aufgebaut, muss die Veranstaltung von allein erscheinen — sonst geht doch
 * wieder jemand durch die Reihen und lädt zwanzig Seiten neu.
 *
 * Zwei Minuten: die Liste ändert sich im Tagesrhythmus (eine Veranstaltung
 * beginnt oder endet), nicht im Sekundentakt. Häufiger wäre Last ohne
 * Gewinn, seltener hiesse, dass jemand vor einem Gerät steht und wartet.
 */
let uhr: ReturnType<typeof setInterval> | null = null

onMounted(() => {
  const merk = gemerkt()
  const steht = merk !== null && events.value.some(v => v.id === merk)

  if (!wechselwunsch.value && steht) {
    // `replace`: ohne das läge diese Seite im Verlauf, und die Zurück-Taste
    // landete auf ihr — die sofort wieder wegspringt. Eine Schleife, aus der
    // auf einem Gerät ohne Tastatur niemand herauskommt.
    navigateTo(`/board/${merk}`, { replace: true })
    return
  }

  /*
   * Eine Veranstaltung, die aus dem Fenster gefallen ist, wird vergessen —
   * genau wie die Tischwahl einen Tisch vergisst, den es nicht mehr gibt.
   * Sonst läge auf jedem Tablet bis in alle Ewigkeit das Turnier vom letzten
   * Jahr, und beim Wechsel zurück dorthin (Liste, gleicher Name, neues Jahr)
   * hinge daran eine Kennung, die niemand mehr nachvollziehen kann.
   *
   * Nicht beim Wechselwunsch: wer nur nachsehen will, was sonst noch läuft,
   * und es sich anders überlegt, soll sein Gerät unverändert vorfinden.
   */
  if (!wechselwunsch.value && merk !== null && !steht) {
    try {
      window.localStorage.removeItem(merkschluessel)
    }
    catch { /* kein Speicher, nichts zu vergessen */ }
  }

  window.addEventListener('keydown', taste)
  freigabeHolen()
  uhr = setInterval(() => refresh(), 120_000)
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', taste)
  if (uhr) clearInterval(uhr)
})

/* ------------------------------------------------------------------------
 * DARSTELLUNG
 * --------------------------------------------------------------------- */

/**
 * „16–20 Sep 2026" statt zweier vollständiger Daten.
 *
 * Englisch wie alles Sichtbare auf dieser Seite, und ohne Jahr im ersten
 * Teil: wer davor steht, will wissen, ob das die Veranstaltung ist, an der
 * er gerade arbeitet — nicht das Datum abschreiben.
 */
function zeitraum(von: string, bis: string): string {
  const a = new Date(`${von}T00:00:00`)
  const b = new Date(`${bis}T00:00:00`)
  if (Number.isNaN(a.valueOf())) return ''

  const monat = (d: Date) => d.toLocaleDateString('en-GB', { month: 'short' })
  if (Number.isNaN(b.valueOf()) || von === bis) {
    return `${a.getDate()} ${monat(a)} ${a.getFullYear()}`
  }
  if (a.getMonth() === b.getMonth() && a.getFullYear() === b.getFullYear()) {
    return `${a.getDate()}–${b.getDate()} ${monat(b)} ${b.getFullYear()}`
  }
  return `${a.getDate()} ${monat(a)} – ${b.getDate()} ${monat(b)} ${b.getFullYear()}`
}

function ort(v: BoardEventItem): string {
  return [v.city, v.country].filter(Boolean).join(', ')
}

useHead({
  title: 'Pick an event – Scoreboard',
  // Wie die Tafel und die Tischwahl: eine Auswahl für einen Saal gehört
  // nicht in eine Suche.
  meta: [{ name: 'robots', content: 'noindex, nofollow' }],
  htmlAttrs: { class: 'board-screen' },
})
</script>

<template>
  <div class="pick">
    <header class="pick__head">
      <span class="pick__event">Scoreboard</span>
      <span class="pick__what">Pick an event</span>
    </header>

    <!--
      LEER IST DER NORMALFALL AM MONTAGMORGEN.

      Deshalb steht hier kein „nothing found", sondern was gilt: wann eine
      Veranstaltung erscheint (zwei Tage vor dem Beginn), dass dieses Gerät
      dafür nichts tun muss, und — wenn bekannt — welche als nächste kommt.
      Ein Bildschirm, der nur leer ist, sieht kaputt aus, und dann ruft
      jemand an.
    -->
    <main v-if="events.length === 0" class="pick__hint">
      <p class="pick__hint-title">No event is open right now</p>
      <p class="pick__hint-text">
        An event appears here two days before it starts, and stays until the
        day after it ends.
      </p>
      <p v-if="naechste" class="pick__hint-next">
        Next: <strong>{{ naechste.name }}</strong>
        · {{ zeitraum(naechste.startDate, naechste.endDate) }}
      </p>
      <p class="pick__hint-text pick__hint-text--klein">
        This screen checks again on its own. Leave it running.
      </p>
    </main>

    <main v-else ref="raster" class="pick__grid">
      <button
        v-for="(v, i) in events"
        :key="v.id"
        type="button"
        class="pick__event-card"
        :class="{
          'pick__event-card--on': i === stelle,
          'pick__event-card--oeffnet': oeffnet === v.id,
        }"
        :aria-busy="oeffnet === v.id"
        @click="waehlen(v)"
        @mouseenter="stelle = i"
      >
        <span class="pick__index" aria-hidden="true">{{ i + 1 }}</span>

        <span class="pick__lines">
          <span class="pick__name">{{ v.name }}</span>
          <span class="pick__meta">
            <span class="pick__dates">{{ zeitraum(v.startDate, v.endDate) }}</span>
            <span v-if="ort(v)" class="pick__place">· {{ ort(v) }}</span>
          </span>
        </span>

        <!--
          Zwei Merkzeichen, und beide beantworten eine Frage, die sonst ein
          Anruf wäre: läuft das gerade, und zählt dieses Gerät dort schon?
        -->
        <span class="pick__marks">
          <span v-if="v.running" class="pick__running">live</span>
          <span v-if="zaehltBei === v.id" class="pick__mine">this screen counts here</span>
        </span>

        <span v-if="oeffnet === v.id" class="pick__laeuft" aria-hidden="true" />
      </button>
    </main>

    <footer class="pick__foot">
      <span class="pick__keys">Tap, or use arrows and OK, or press the number</span>
      <span class="pick__memo">The choice is remembered on this screen</span>
    </footer>
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
 * Dieselben Farben und dieselbe Rechnung in vh wie Tafel und Tischwahl:
 * derselbe Bildschirm, dieselbe Entfernung, und ein hell getönter Schirm vor
 * einer dunklen Tafel wäre in einem abgedunkelten Saal ein Blitz.
 */
.pick {
  --ink: #ffffff;
  --ink-dim: #93a1b3;
  --ground: #05080d;
  --line: #1b2432;
  --accent: var(--color-primary, #00afee);

  display: grid;
  grid-template-rows: auto 1fr auto;
  height: 100dvh;
  background: var(--ground);
  color: var(--ink);
  font-family: system-ui, -apple-system, "Segoe UI", sans-serif;
}

.pick__head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 1rem;
  padding: 2.2dvh 3vw 1.4dvh;
  border-bottom: 1px solid var(--line);
}

.pick__event {
  font-size: clamp(1.1rem, 2.6dvh, 2rem);
  font-weight: 700;
  letter-spacing: 0.01em;
}

.pick__what {
  color: var(--ink-dim);
  font-size: clamp(0.85rem, 1.9dvh, 1.35rem);
  text-transform: uppercase;
  letter-spacing: 0.12em;
}

/*
 * EINE SPALTE, SOLANGE ES EINE SEIN KANN.
 *
 * Ein Veranstaltungsname ist ein Satz („European Championships 2026") und
 * keine Zahl; nebeneinander gestellte Kacheln brächen ihn dreimal um. Erst
 * ab einer wirklich breiten Fläche (Fernseher quer) stehen zwei nebeneinander.
 */
.pick__grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(30rem, 1fr));
  align-content: start;
  gap: 1.4dvh 1.2vw;
  padding: 2dvh 3vw;
  overflow-y: auto;
}

.pick__event-card {
  position: relative;
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: 1.4vw;
  /* 11dvh: auf einem iPad im Hochformat (1024 px hoch) sind das gut 110 px —
     eine Fläche, die man im Stehen mit dem Daumen trifft, ohne zu zielen. */
  min-height: 11dvh;
  padding: 1.6dvh 1.4rem;
  border: 2px solid var(--line);
  border-radius: 0.6rem;
  background: #0b1018;
  color: inherit;
  font: inherit;
  text-align: left;
  cursor: pointer;
  overflow: hidden;
}

.pick__event-card--on {
  border-color: var(--accent);
  background: #101a26;
}

.pick__event-card--oeffnet {
  border-color: var(--accent);
}

.pick__index {
  min-width: 1.6em;
  color: var(--ink-dim);
  font-size: clamp(1rem, 2.4dvh, 1.8rem);
  font-variant-numeric: tabular-nums;
  text-align: center;
}

.pick__lines {
  display: grid;
  gap: 0.4dvh;
  min-width: 0;
}

.pick__name {
  font-size: clamp(1.05rem, 2.7dvh, 2.1rem);
  font-weight: 700;
  line-height: 1.15;
}

.pick__meta {
  color: var(--ink-dim);
  font-size: clamp(0.8rem, 1.8dvh, 1.25rem);
}

.pick__place {
  margin-left: 0.4em;
}

.pick__marks {
  display: grid;
  justify-items: end;
  gap: 0.5dvh;
}

.pick__running {
  padding: 0.3em 0.7em;
  border-radius: 999px;
  background: var(--accent);
  color: #05080d;
  font-size: clamp(0.7rem, 1.5dvh, 1rem);
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.pick__mine {
  color: var(--ink-dim);
  font-size: clamp(0.65rem, 1.4dvh, 0.95rem);
  text-align: right;
}

/* Der Balken läuft unten an der Kachel entlang und nimmt keinen Platz: die
   Kachel darf beim Antippen nicht die Grösse ändern, sonst wandern die
   Nachbarn unter dem Finger weg. */
.pick__laeuft {
  position: absolute;
  inset: auto 0 0 0;
  height: 0.4dvh;
  background: var(--accent);
  animation: pick-laeuft 1.1s ease-in-out infinite;
}

@keyframes pick-laeuft {
  0% { transform: translateX(-100%); }
  100% { transform: translateX(100%); }
}

.pick__hint {
  display: grid;
  align-content: center;
  justify-items: center;
  gap: 1.4dvh;
  padding: 0 3vw;
  text-align: center;
}

.pick__hint-title {
  margin: 0;
  font-size: clamp(1.3rem, 3.4dvh, 2.6rem);
  font-weight: 700;
}

.pick__hint-text {
  max-width: 34rem;
  margin: 0;
  color: var(--ink-dim);
  font-size: clamp(0.9rem, 2.1dvh, 1.5rem);
  line-height: 1.45;
}

.pick__hint-text--klein {
  font-size: clamp(0.8rem, 1.7dvh, 1.15rem);
}

.pick__hint-next {
  margin: 0;
  padding: 1.2dvh 1.6rem;
  border: 1px solid var(--line);
  border-radius: 0.6rem;
  color: var(--ink);
  font-size: clamp(0.9rem, 2dvh, 1.4rem);
}

.pick__foot {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  padding: 1.4dvh 3vw 2dvh;
  border-top: 1px solid var(--line);
  color: var(--ink-dim);
  font-size: clamp(0.72rem, 1.6dvh, 1.05rem);
}
</style>
