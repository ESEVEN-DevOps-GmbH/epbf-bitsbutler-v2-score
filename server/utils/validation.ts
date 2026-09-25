/**
 * Eingabeprüfung für die serverseitigen Routen.
 *
 * Alles, was aus der URL kommt, ist eine Behauptung. Der Bestand reicht solche
 * Werte ungeprüft an die Schnittstelle weiter; hier werden sie zuerst auf einen
 * erlaubten Bereich gezwungen.
 */
/** UUID in der üblichen Schreibweise: acht-vier-vier-vier-zwölf. */
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * Eine Kennung aus der Adresse — als Zeichenkette, nicht als Zahl.
 *
 * v2 schlüsselt mit UUIDs. Die Schnittstelle nimmt daneben die alte Nummer
 * an, weil es Verweise gibt, die älter sind als v2: gedruckte QR-Codes auf
 * Turnierblättern, von Suchmaschinen erfasste Adressen, Verweise in fremden
 * Foren. Aufgelöst wird das in der Datenbank; hier wird nur geprüft, dass
 * überhaupt eine der beiden Formen vorliegt.
 *
 * Die Prüfung bleibt, obwohl sie jetzt zwei Formen kennt: alles aus der
 * Adresse ist eine Behauptung, und eine Behauptung, die weder UUID noch
 * Zahl ist, hat in keiner Abfrage etwas verloren.
 */
export function parseId(raw: unknown, what: string): string {
  const wert = String(raw ?? '').trim()

  if (UUID.test(wert)) return wert

  if (/^[0-9]+$/.test(wert)) {
    const zahl = Number.parseInt(wert, 10)
    if (zahl > 0 && zahl <= 9_999_999) return wert
  }

  throw createError({ statusCode: 400, statusMessage: `Ungültige ${what}` })
}

/**
 * Dieselbe Kennung, in EINER Schreibweise.
 *
 * WOFÜR
 *
 * `parseId` lässt mehrere Schreibweisen derselben Kennung durch: eine UUID in
 * Groß- wie in Kleinbuchstaben, und eine Nummer mit beliebig vielen führenden
 * Nullen — `7`, `07`, `000007` macht `parseInt` alle drei zur Sieben. Für die
 * Abfrage ist das gleichgültig. Für einen Zwischenspeicher, der nach der
 * Adresse schlüsselt, ist es der Unterschied zwischen einem Eintrag und
 * beliebig vielen: `?tournament=0…07` ist ein unbegrenzter Vorrat an
 * Adressen, die alle dieselbe Antwort tragen.
 *
 * Diese Funktion beantwortet deshalb die Frage, die der Zwischenspeicher
 * stellen muss — nicht „ist der Wert erlaubt", sondern „WELCHE Auskunft ist
 * gemeint". Zwei Anfragen mit derselben Antwort bekommen denselben
 * Rückgabewert.
 *
 * WAS SIE NICHT ÄNDERT
 *
 * Den erlaubten Bereich. Geprüft wird weiter mit `parseId`: was heute
 * durchkommt, kommt weiter durch, und was heute 400 ergibt, ergibt weiter
 * 400. Hinzu kommt allein die einheitliche Schreibweise. Das war Absicht —
 * enger zu prüfen hätte den Schlüsselraum ebenfalls begrenzt, aber auf
 * Kosten von Aufrufern, die `?tournament=07` schicken und heute eine Antwort
 * bekommen.
 *
 * Fehlt der Wert, oder steht er MEHRFACH in der Adresse (`getQuery` liefert
 * dann ein Feld und keine Zeichenkette), ist das kein Fehler, sondern „kein
 * Filter". Genau so verhielt sich die Route vorher schon, und daran darf sich
 * nichts ändern: server/middleware/canonical-query.ts leitet den
 * Zwischenspeicher-Schlüssel aus demselben Aufruf ab, und die beiden müssen
 * dieselbe Frage beantworten.
 */
export function kanonischeKennung(roh: unknown, was: string): string | undefined {
  if (typeof roh !== 'string' || !roh) return undefined

  const geprueft = parseId(roh, was)
  if (UUID.test(geprueft)) return geprueft.toLowerCase()
  return String(Number.parseInt(geprueft, 10))
}

/**
 * Ein Slug aus der Adresse — der URL-Bestandteil einer Serie oder Seite.
 *
 * Klein, Ziffern, Bindestriche, höchstens ein paar Zeichen lang. Anders als
 * bei einer Kennung gibt es hier keine zweite erlaubte Form: ein Slug ist,
 * was in der Adresse steht, und alles andere ist ein Tippfehler oder ein
 * Versuch.
 *
 * Der Schrägstrich ist erlaubt, weil Inhaltsseiten geschachtelt sind
 * ("about/statutes"); zwei aufeinanderfolgende nicht, und mit einem
 * beginnen oder enden darf er auch nicht.
 */
export function parseSlug(raw: unknown, what: string): string {
  const wert = String(raw ?? '').trim().toLowerCase()

  if (/^[a-z0-9]+(?:[-/][a-z0-9]+)*$/.test(wert) && wert.length <= 120) {
    return wert
  }

  throw createError({ statusCode: 400, statusMessage: `Ungültige ${what}` })
}

/**
 * Jahreszahlen außerhalb dieses Bereichs sind keine Kalenderjahre.
 *
 * Die Untergrenze lag auf 1990 und war damit enger als der Bestand: die
 * Anwendung führt Termine ab 1980 und nennt sie in `availableYears`, woraus
 * das Kalendermenü seine Einträge bildet. Zehn Menüpunkte führten deshalb
 * auf einen Fehler. Die Grenze prüft jetzt nur noch, dass überhaupt eine
 * Jahreszahl dasteht — welche Jahre es gibt, weiß die Anwendung.
 */
export const KALENDER_JAHR_MIN = 1900
export const KALENDER_JAHR_MAX = 2100

export function parseYear(raw: unknown): number {
  const year = Number.parseInt(String(raw ?? ''), 10)
  if (!Number.isInteger(year) || year < KALENDER_JAHR_MIN || year > KALENDER_JAHR_MAX) {
    throw createError({ statusCode: 400, statusMessage: 'Ungültiges Jahr' })
  }
  return year
}
