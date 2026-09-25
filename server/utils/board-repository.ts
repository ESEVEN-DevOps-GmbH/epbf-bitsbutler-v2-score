import type { BoardTables, TableBoard } from '~~/shared/types/api'

/**
 * Die beiden öffentlichen Abfragen, aus denen die Tafel wirklich lebt.
 *
 * AUSZUG AUS epbf-website/shared/api/http.ts (720 Zeilen, `ContentRepository`
 * mit 36 Abfragen für die ganze Verbandsseite). Die Tafel braucht genau zwei
 * davon — `getBoardTables` (Tischwahl) und `getTableBoard` (die Tafel selbst)
 * — und hier stehen nur die beiden, wortgleich zur Quelle, statt einer
 * Repository-Abstraktion mit 34 Abfragen, die diese Seite nie stellt.
 *
 * Was mit umzieht, ist `biegeBilder`: die Anwendung liefert Bildadressen
 * unter `/api/public/v1/assets/<id>`, aber nur ein serverseitiger Aufruf
 * trägt den Mandantenschlüssel, den diese Adresse verlangt. Ein `<img>` im
 * Browser kann das nicht — deshalb biegt diese Funktion jede Bildadresse in
 * der Antwort auf `/api/assets/<id>` um, die eigene Durchreiche
 * (server/api/assets/[...pfad].get.ts).
 *
 * Was NICHT mitzieht, ist die Beispieldaten-Ausweichung (shared/api/mock.ts,
 * 1121 Zeilen) und der Umschaltpunkt `useContentRepository()`: die Tafel ist
 * ohne Backend keine sinnvolle Seite — sie zeigt dann ehrlich "not found"
 * statt erfundener Turniere (siehe server/api/board/events.get.ts für dieselbe
 * Haltung).
 */

const ANWENDUNG_ASSETS = '/api/public/v1/assets/'
const EIGENE_ASSETS = '/api/assets/'

function biegeBilder<T>(wert: T): T {
  if (typeof wert === 'string') {
    return (wert.startsWith(ANWENDUNG_ASSETS)
      ? EIGENE_ASSETS + wert.slice(ANWENDUNG_ASSETS.length)
      : wert) as T
  }
  if (Array.isArray(wert)) {
    return wert.map(biegeBilder) as T
  }
  if (wert && typeof wert === 'object') {
    const ziel: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(wert)) ziel[k] = biegeBilder(v)
    return ziel as T
  }
  return wert
}

/**
 * Ein Aufruf an die öffentliche Schnittstelle — wortgleich zu `hole()` in
 * epbf-website/shared/api/http.ts.
 */
async function hole<T>(basis: string, seite: string, pfad: string): Promise<T> {
  const antwort = await $fetch<T>(`${basis}/api/public/v1${pfad}`, {
    headers: { 'X-BB-Site': seite },
    timeout: 10_000,
  }) as T
  return biegeBilder(antwort)
}

/**
 * Der Zustand eines Tisches — die Quelle der Anzeigetafel.
 *
 * `null` bei 404: die Veranstaltung gibt es nicht oder sie ist nicht
 * öffentlich, und der Unterschied bleibt draußen.
 */
export async function getTableBoard(
  basis: string, seite: string, eventId: string, tableNumber: number,
): Promise<TableBoard | null> {
  try {
    return await hole<TableBoard>(
      basis, seite, `/events/${encodeURIComponent(eventId)}/tables/${tableNumber}`)
  }
  catch (fehler: unknown) {
    if ((fehler as { statusCode?: number }).statusCode === 404) return null
    throw fehler
  }
}

/**
 * Welche Tische es gibt — die Grundlage der Tischwahl am Bildschirm.
 *
 * `null` bei 404, aus demselben Grund wie beim Tafelabruf darüber.
 */
export async function getBoardTables(
  basis: string, seite: string, eventId: string,
): Promise<BoardTables | null> {
  try {
    return await hole<BoardTables>(basis, seite, `/events/${encodeURIComponent(eventId)}/tables`)
  }
  catch (fehler: unknown) {
    if ((fehler as { statusCode?: number }).statusCode === 404) return null
    throw fehler
  }
}
