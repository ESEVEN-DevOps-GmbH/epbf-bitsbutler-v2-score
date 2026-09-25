/**
 * Datums-, Zeit- und Betragsformate der Seite an einer Stelle.
 *
 * AUSZUG AUS epbf-website/app/composables/useDateFormat.ts. Dort kamen
 * Sprache und Zeitzone aus `useTenant()` — der Mandantenkonfiguration eines
 * Verbands, den es hier nicht gibt (siehe LIESMICH.md: die Tafel gehört dem
 * Produkt, nicht dem Verband). `formatMatchTime` ist die einzige Funktion,
 * die die Tafel tatsächlich ruft (die Anstosszeit in der Fusszeile).
 *
 * Sprache bleibt fest Englisch — sichtbarer Text ist es auf dieser Seite
 * ohnehin überall (siehe Hausregeln). Die Zeitzone ist die des GERÄTS: die
 * Tafel steht fest in genau einer Halle, und das Gerät steht dort, wo
 * gespielt wird — anders als bei epbf-website, wo ein Leser aus Malmö auf
 * ein Turnier in Antalya sehen kann und die Zone deshalb am Turnier hängen
 * muss und nicht am Browser.
 */

/**
 * Die Zeitzone dieses Geräts — serverseitig die des Rechners, der rendert,
 * clientseitig die des Tablets an der Wand. Beide sind für die Tafel dieselbe
 * Auskunft, weil sie in derselben Halle stehen.
 */
function deviceTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone
  }
  catch {
    return 'UTC'
  }
}

export function useDateFormat() {
  const locale = 'en-GB'
  const timeZone = deviceTimeZone()

  /**
   * Zonenversatz auf die Form bringen, die `new Date` versteht.
   *
   * Die Anwendung liefert Zeitstempel im PostgreSQL-Stil "…T20:00:00+02".
   * Das ist gültiges ISO 8601, aber NICHT das Format, das ECMAScript für
   * `Date` festlegt — dort ist der Versatz zweiteilig ("+02:00"). V8 gibt
   * für die kurze Form "Invalid Date" zurück, und weil jede Formatierung
   * hier durchläuft, stand daraufhin auf der ganzen Seite "tba" oder "—",
   * wo eine Anstoßzeit oder ein Meldeschluss bekannt war.
   *
   * Ergänzt wird deshalb die fehlende Minutenangabe. Alles andere bleibt
   * unangetastet: "Z", "+02:00" und reine Datumsangaben gehen unverändert
   * durch.
   */
  const OFFSET_WITHOUT_MINUTES = /([+-]\d{2})$/

  const parse = (iso: string | null | undefined): Date | null => {
    if (!iso) return null
    const value = iso.includes('T') ? iso.replace(OFFSET_WITHOUT_MINUTES, '$1:00') : iso
    const d = new Date(value)
    return Number.isNaN(d.getTime()) ? null : d
  }

  /** Format der Nachrichtenkacheln: "Aug 24 2026". */
  const formatNewsDate = (iso: string): string => {
    const d = parse(iso)
    if (!d) return iso
    const month = d.toLocaleDateString(locale, { month: 'short', timeZone: 'UTC' })
    return `${month} ${d.getUTCDate()} ${d.getUTCFullYear()}`
  }

  /** Ausführliches Format für die Artikelseite: "24 August 2026". */
  const formatArticleDate = (iso: string): string => {
    const d = parse(iso)
    if (!d) return iso
    return d.toLocaleDateString(locale, {
      day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC',
    })
  }

  /** Ein Tag: "20 Aug 2026". */
  const formatDay = (iso: string): string => {
    const d = parse(iso)
    if (!d) return iso
    return d.toLocaleDateString(locale, {
      day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC',
    })
  }

  /**
   * Zeitraum, wie ihn der Kalender des Bestands schreibt: "20–23 Aug 2026",
   * über Monatsgrenzen "29 Oct – 1 Nov 2026", über Jahresgrenzen mit beiden
   * Jahren.
   */
  const formatDateRange = (startIso: string, endIso: string): string => {
    const start = parse(startIso)
    const end = parse(endIso)
    if (!start || !end) return `${startIso} – ${endIso}`
    const opts = { timeZone: 'UTC' } as const
    const sameYear = start.getUTCFullYear() === end.getUTCFullYear()
    const sameMonth = sameYear && start.getUTCMonth() === end.getUTCMonth()
    const month = (d: Date) => d.toLocaleDateString(locale, { month: 'short', ...opts })
    if (sameMonth && start.getUTCDate() === end.getUTCDate()) {
      return `${start.getUTCDate()} ${month(start)} ${start.getUTCFullYear()}`
    }
    if (sameMonth) {
      return `${start.getUTCDate()}–${end.getUTCDate()} ${month(start)} ${start.getUTCFullYear()}`
    }
    if (sameYear) {
      return `${start.getUTCDate()} ${month(start)} – ${end.getUTCDate()} ${month(end)} ${start.getUTCFullYear()}`
    }
    return `${formatDay(startIso)} – ${formatDay(endIso)}`
  }

  /** Monatsüberschrift im Kalender: "August 2026". */
  const formatMonth = (iso: string): string => {
    const d = parse(iso)
    if (!d) return iso
    return d.toLocaleDateString(locale, { month: 'long', year: 'numeric', timeZone: 'UTC' })
  }

  /**
   * Anstoßzeit einer Partie: "Sun, 20:00".
   *
   * In der Zone des GERÄTS — siehe die Begründung ganz oben.
   */
  const formatMatchTime = (iso: string | null): string => {
    const d = parse(iso)
    if (!d) return 'tba'
    const day = d.toLocaleDateString(locale, { weekday: 'short', timeZone })
    const time = d.toLocaleTimeString(locale, {
      hour: '2-digit', minute: '2-digit', hour12: false, timeZone,
    })
    return `${day}, ${time}`
  }

  /**
   * Die Uhrzeit allein, sekundengenau: "21:46:03".
   *
   * Für den Spielverlauf, wo innerhalb einer Minute mehrere Zeilen stehen
   * können und die Sekunde die Reihenfolge lesbar macht.
   *
   * IN DER ZONE DES GERÄTS UND NICHT IM ROHTEXT. Im epbf-website-Original
   * schnitt eine frühere Fassung die Stellen 11 bis 19 aus dem Zeitstempel
   * heraus (`iso.slice(11, 19)`) — der kommt aus der öffentlichen
   * Schnittstelle in UTC, und damit stand im ganzen Verlauf jede Uhrzeit zwei
   * Stunden zu früh. Ein Ausschnitt aus einer Zeichenkette ist keine
   * Umrechnung.
   */
  const formatClock = (iso: string | null): string => {
    const d = parse(iso)
    if (!d) return '—'
    return d.toLocaleTimeString(locale, {
      hour: '2-digit', minute: '2-digit', second: '2-digit',
      hour12: false, timeZone,
    })
  }

  /** Meldeschluss mit Datum und Uhrzeit: "22 Oct 2026, 23:59". */
  const formatDeadline = (iso: string | null): string => {
    const d = parse(iso)
    if (!d) return '—'
    const day = d.toLocaleDateString(locale, {
      day: 'numeric', month: 'short', year: 'numeric', timeZone,
    })
    const time = d.toLocaleTimeString(locale, {
      hour: '2-digit', minute: '2-digit', hour12: false, timeZone,
    })
    return `${day}, ${time}`
  }

  /**
   * Verbleibende Tage bis zu einem Zeitpunkt.
   *
   * Bewusst grob: "in 12 days" statt einer Sekundenanzeige. Eine Seite mit
   * SWR-Zwischenspeicher kann keine Sekunden verantworten.
   */
  const daysUntil = (iso: string | null, now: Date = new Date()): number | null => {
    const d = parse(iso)
    if (!d) return null
    return Math.ceil((d.getTime() - now.getTime()) / 86_400_000)
  }

  const formatMoney = (money: { amount: number, currency: string } | null): string => {
    if (!money) return '—'
    return new Intl.NumberFormat(locale, {
      style: 'currency', currency: money.currency, maximumFractionDigits: 0,
    }).format(money.amount)
  }

  return {
    formatNewsDate,
    formatArticleDate,
    formatDay,
    formatDateRange,
    formatMonth,
    formatMatchTime,
    formatClock,
    formatDeadline,
    daysUntil,
    formatMoney,
  }
}
