import type { BoardEventItem, BoardEventList, TourSummary } from '~~/shared/types/api'

/**
 * WELCHE VERANSTALTUNGEN EINE ANZEIGETAFEL HEUTE ZEIGEN KANN
 *
 * Die Grundlage von /board — der einen Adresse, die auf jedem Tablet fest
 * hinterlegt wird. Ohne sie beginnt jeder Weg zur Tafel mit einer UUID, die
 * beim Veranstalter liegt.
 *
 * DAS FENSTER IST NICHT ERFUNDEN, ES IST DAS DES TAFELCODES
 *
 * `identity.redeem_board_code` in der Anwendung lässt einen Code gelten von
 * `starts_on - 2` (00:00) bis `ends_on + 2` (00:00, ausschliesslich) — in
 * Worten der Fehlermeldung nebenan: „from two days before until one day
 * after". Dieselbe Rechnung steht hier, und zwar aus einem handfesten Grund:
 * eine Veranstaltung anzubieten, an der sich kein Gerät freischalten liesse,
 * führte jeden, der sie wählt, in eine Sackgasse — er stünde vor der
 * Tischwahl, tippte den Code und bekäme `OUT_OF_WINDOW`.
 *
 * Gerechnet wird auf DATUMSGRENZEN und in der Zeitzone dieses Servers. Die
 * Anwendung rechnet `date::timestamptz` in der Zeitzone IHRER Verbindung;
 * stehen beide in verschiedenen Zonen, gehen die Ränder um Stunden
 * auseinander. Das ist hier bewusst hingenommen: ein Tag Unschärfe an einem
 * Rand, an dem ohnehin niemand spielt, ist harmloser als eine zweite,
 * eigenmächtige Frist. Wer es genau will, verlegt das Fenster in die
 * Anwendung (siehe Bericht).
 *
 * WESSEN VERANSTALTUNGEN — DER MANDANT KOMMT AUS DEM SEITENKOPF
 *
 * `X-BB-Site` (aus der Umgebungsvariable `BB_SITE`) geht mit jedem
 * Aufruf mit. Die Anwendung setzt daraus `tenant.public_site()`, und die
 * Zeilensicherheit auf `competition.event` lässt nur durch, was diesem
 * Mandanten gehört oder ihm ausdrücklich freigegeben ist. Ein Tablet in
 * einer EPBF-Halle sieht deshalb keine fremden Turniere — nicht, weil diese
 * Route filtert, sondern weil die Datenbank sie gar nicht erst liefert.
 *
 * WARUM ÜBER DIE SERIEN UND NICHT ÜBER EINEN EIGENEN ENDPUNKT
 *
 * Die öffentliche Schnittstelle kennt keine Veranstaltungsliste mit freiem
 * Zeitraum; sie kennt `/series/<key>/events`. Fünf Aufrufe für fünf Serien
 * statt einem — und geprüft am Bestand vom 16.09.2026: von 435
 * Veranstaltungen stehen 389 in den Serienlisten, und ALLE 46 fehlenden
 * tragen kein einziges Turnier. Ohne Turnier gibt es keine Partie, ohne
 * Partie keinen Tisch und ohne Tisch nichts anzuzeigen. Für den Zweck ist
 * die Liste also vollständig.
 *
 * Die Restlücke steht im Bericht: eine Turnierkategorie ohne Serienschlüssel
 * (heute zwei, von keinem Turnier benutzt) nähme ihrer Veranstaltung den
 * Platz in dieser Liste. Der saubere Weg wäre ein eigener öffentlicher
 * Endpunkt in der Anwendung, der `competition.event` unmittelbar im Fenster
 * abfragt. Das ist eine Änderung an der Anwendung und nicht an dieser Seite.
 */

/** Was `/series/<key>/events` je Zeile liefert — Schlangenschrift wie dort. */
interface RohVeranstaltung {
  event_id: string
  name: string
  starts_on: string
  ends_on: string
  status?: string
  tournament_count?: number
}

/** Was `/events/<id>` an Ort mitbringt. */
interface RohDetail {
  venues?: { name?: string, city?: string | null, country?: string | null }[]
}

/** Ein Datum ohne Uhrzeit, in der Zeitzone dieses Servers. */
function tag(iso: string): Date | null {
  const d = new Date(`${iso}T00:00:00`)
  return Number.isNaN(d.valueOf()) ? null : d
}

function heute(): Date {
  const j = new Date()
  return new Date(j.getFullYear(), j.getMonth(), j.getDate())
}

function plusTage(d: Date, n: number): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n)
}

/**
 * Das Sammeln — einmal je Minute und nicht einmal je Tablet.
 *
 * Zwanzig Bildschirme in einer Halle fragen diese Liste; stünde hier nichts
 * davor, wären das zwanzig Mal sechs Aufrufe an die Anwendung, alle zwei
 * Minuten, für eine Antwort, die sich im TAGESrhythmus ändert. Eine Minute
 * ist die Obergrenze dessen, was jemand vor einem Gerät wartet, und schon
 * die Untergrenze dessen, was Last spart.
 *
 * Der Nitro-Zwischenspeicher und die Regel in nuxt.config sind zweierlei:
 * die Regel verbietet dem BROWSER, die Antwort aufzuheben (`no-store`, weil
 * unter `/api/board/**` sonst die Auskunft des einen Geräts im nächsten
 * landete). Was dieser Server für sich behält, ist davon unberührt — und es
 * ist für alle Geräte dieselbe öffentliche Liste.
 */
const sammeln = defineCachedFunction(
  async (basis: string, seite: string): Promise<BoardEventItem[]> => {
    async function hole<T>(pfad: string): Promise<T> {
      // Die Zusicherung ist nötig, weil $fetch seinen Rückgabetyp aus der
      // Adresse ableiten will und bei einer zusammengesetzten nichts findet
      // — wortgleich zu `hole` in shared/api/http.ts. Was hier wirklich
      // prüft, sind die Aufrufstellen unten mit ihren Vertragstypen.
      return await $fetch<T>(`${basis}/api/public/v1${pfad}`, {
        headers: { 'X-BB-Site': seite },
        timeout: 10_000,
      }) as T
    }

    const serien = await hole<TourSummary[]>('/tours').catch(() => [])

    const listen = await Promise.all(serien.map(s =>
      // Eine Serie, die klemmt, darf die Halle nicht lahmlegen: dann fehlen
      // ihre Veranstaltungen, und die der anderen stehen trotzdem da.
      hole<RohVeranstaltung[]>(`/series/${encodeURIComponent(s.code)}/events`)
        .catch(() => [] as RohVeranstaltung[]),
    ))

    /*
     * Eine Veranstaltung kann in MEHREREN Serien stehen — die Euro Tour der
     * Damen läuft im selben Wochenende am selben Ort wie die der Herren, und
     * beide hängen an derselben Veranstaltung. Ohne diese Zusammenführung
     * stünde sie zweimal in der Auswahl, und wer die zweite Kachel trifft,
     * fragte sich zu Recht, was der Unterschied ist.
     */
    const nach = new Map<string, RohVeranstaltung>()
    for (const entryList of listen) {
      for (const v of entryList) {
        // `CANCELED` steht in den Serienlisten mit drin und gehört nicht auf
        // eine Anzeigetafel: an einer abgesagten Veranstaltung wird nicht
        // gespielt, und einen Tafelcode gäbe die Anwendung dafür auch nicht
        // her.
        if (!v?.event_id) continue
        if (String(v.status ?? '').toUpperCase() === 'CANCELED') continue
        nach.set(String(v.event_id), v)
      }
    }

    return [...nach.values()].map((v): BoardEventItem => ({
      id: String(v.event_id),
      name: String(v.name ?? ''),
      startDate: String(v.starts_on ?? ''),
      endDate: String(v.ends_on ?? v.starts_on ?? ''),
      // Ort und Lauf-Merkzeichen entstehen erst im Handler: das eine kostet
      // je Veranstaltung einen Aufruf, das andere hängt am Tag und darf
      // deshalb nicht mit im Zwischenspeicher liegen.
      city: null,
      country: null,
      running: false,
    }))
  },
  {
    name: 'board-events',
    maxAge: 60,
    // Ein Schlüssel je Mandant: dieselbe Seite fragt immer mit demselben,
    // aber die Route soll nicht der Grund sein, warum ein zweiter Mandant
    // auf demselben Server die Liste des ersten sähe.
    getKey: (_basis: string, seite: string) => seite || 'ohne-mandant',
  },
)

export default defineEventHandler(async (event): Promise<BoardEventList> => {
  const config = useRuntimeConfig()
  const basis = String(process.env.BB_API ?? '')

  /*
   * DER SEITENSCHLUESSEL DARF AUS DER ANFRAGE KOMMEN -- seit dem
   * 25.09.2026.
   *
   * Er stand nur in BB_SITE, einer Angabe je Installation. Fuer eine
   * Instanz mit EINER Veranstaltung stimmt das; fuer die Mietplattform
   * nicht. Der Auftraggeber: "wenn das wirklich als plattform angeboten
   * wird und dann 30, 50 oder mehr events parallel laufen, wie lange dann
   * die 'pick a event' liste wird". Wer in einer lauten Halle mit klammen
   * Fingern seinen Turniernamen unter dreissig fremden sucht, hat ein
   * Problem, das keine Sortierung loest.
   *
   * ?site=EPBF macht daraus einen Link, den ein Veranstalter sich als
   * Lesezeichen legt. Die Vorgabe bleibt BB_SITE, damit sich fuer die
   * EPBF-Instanz nichts aendert.
   *
   * KEINE WACHE, SONDERN EINE ABKUERZUNG. Der Schluessel geht als
   * X-BB-Site an die Anwendung, und DORT entscheiden die Zeilenrechte,
   * was sichtbar ist -- er kann also nichts oeffnen, was ohne ihn
   * verschlossen waere. Wer ihn raet, sieht dieselbe Liste wie jeder
   * andere auch. Die Wache bleibt der Tafelcode.
   *
   * Ein unbekannter Schluessel liefert eine LEERE Liste, und die Seite
   * sagt dasselbe wie bei einer Instanz ohne laufende Veranstaltung:
   * "No event is open right now". Das ist keine Nachlaessigkeit --
   * unterschiede sie die beiden Faelle, waere sie eine Auskunft darueber,
   * WELCHE Schluessel es gibt.
   */
  const ausDerAnfrage = String(getQuery(event).site ?? '').trim()
  const seite = ausDerAnfrage || String(process.env.BB_SITE ?? '')

  /*
   * Die Bau-Kennung dieses Servers — siehe
   * app/composables/useFassungswechsel.ts. Sie steht in BEIDEN Antworten,
   * auch in der leeren: ein Tablet, das am Aufbautag vor einer leeren Liste
   * steht, ist genau das Gerät, das gleich eine neue Fassung braucht.
   */
  const buildId = config.app.buildId

  /*
   * Ohne Anwendung keine Liste — und ausdrücklich kein Fehler.
   *
   * `BB_API` leer heisst: kein Backend. Anders als epbf-website (das dann
   * auf Beispieldaten zurückfällt) zeigt diese Tafel ehrlich eine leere
   * Liste — eine Tafelauswahl aus erfundenen Veranstaltungen wäre eine
   * Falle: wer sie anklickt, landet auf einer Tischwahl, die es nicht gibt.
   */
  if (!basis) return { events: [], next: null, buildId }

  const alle = await sammeln(basis, seite)
  const jetzt = heute()

  const imFenster: BoardEventItem[] = []
  let naechste: BoardEventList['next'] = null

  for (const v of alle) {
    const von = tag(v.startDate)
    const bis = tag(v.endDate) ?? von
    if (!von || !bis) continue

    // Dasselbe Fenster wie der Tafelcode: zwei Tage vor Beginn bis
    // einschliesslich einen Tag nach dem Ende.
    if (jetzt >= plusTage(von, -2) && jetzt <= plusTage(bis, 1)) {
      imFenster.push({ ...v, running: jetzt >= von && jetzt <= bis })
      continue
    }

    // Und die nächste danach — nur fürs leere Bild, nicht zum Anklicken.
    if (von > jetzt && (!naechste || v.startDate < naechste.startDate)) {
      naechste = { name: v.name, startDate: v.startDate, endDate: v.endDate }
    }
  }

  /*
   * LAUFENDE ZUERST, dann was gleich beginnt, dann was gerade endete.
   *
   * In einer Halle steht heute ein Turnier; stehen ausnahmsweise zwei in der
   * Liste, weil eines am Vortag endete, soll das laufende oben stehen und
   * nicht das alphabetisch erste. Innerhalb der Gruppen nach Beginn.
   */
  imFenster.sort((a, b) =>
    Number(b.running) - Number(a.running)
    || a.startDate.localeCompare(b.startDate)
    || a.name.localeCompare(b.name))

  /*
   * Der Ort wird erst jetzt nachgeschlagen, für die zwei oder drei
   * Veranstaltungen, die übrig sind — und nicht für vierhundert. „Kielce"
   * neben dem Namen ist der Unterschied zwischen „ist das unsere?" und
   * einem Griff.
   *
   * Ein Fehlschlag kostet den Ort und nicht die Zeile: die Kennung, der Name
   * und der Zeitraum reichen zum Wählen.
   */
  const events = await Promise.all(imFenster.map(async (v) => {
    const detail = await $fetch<RohDetail>(
      `${basis}/api/public/v1/events/${encodeURIComponent(v.id)}`,
      { headers: { 'X-BB-Site': seite }, timeout: 10_000 },
    ).catch(() => null)

    const ort = detail?.venues?.[0] ?? null
    return { ...v, city: ort?.city ?? null, country: ort?.country ?? null }
  }))

  return { events, next: naechste, buildId }
})
