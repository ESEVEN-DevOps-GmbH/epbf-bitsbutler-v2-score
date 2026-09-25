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
 * Was mit umzieht, ist `rewriteAssetUrl`: die Anwendung liefert Bildadressen
 * unter `/api/public/v1/assets/<id>`, aber nur ein serverseitiger Aufruf
 * trägt den Mandantenschlüssel, den diese Adresse verlangt. Ein `<img>` im
 * Browser kann das nicht — deshalb biegt diese Funktion jede Bildadresse in
 * der Antwort auf `/api/assets/<id>` um, die eigene Durchreiche
 * (server/api/assets/[...path].get.ts).
 *
 * Was NICHT mitzieht, ist die Beispieldaten-Ausweichung (shared/api/mock.ts,
 * 1121 Zeilen) und der Umschaltpunkt `useContentRepository()`: die Tafel ist
 * ohne Backend keine sinnvolle Seite — sie zeigt dann ehrlich "not found"
 * statt erfundener Turniere (siehe server/api/board/events.get.ts für dieselbe
 * Haltung).
 */

const APP_ASSETS = '/api/public/v1/assets/'
const OWN_ASSETS = '/api/assets/'

function rewriteAssetUrl<T>(value: T): T {
  if (typeof value === 'string') {
    return (value.startsWith(APP_ASSETS)
      ? OWN_ASSETS + value.slice(APP_ASSETS.length)
      : value) as T
  }
  if (Array.isArray(value)) {
    return value.map(rewriteAssetUrl) as T
  }
  if (value && typeof value === 'object') {
    const target: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(value)) target[k] = rewriteAssetUrl(v)
    return target as T
  }
  return value
}

/**
 * Ein Aufruf an die öffentliche Schnittstelle — inhaltlich wortgleich zu
 * `hole()` in epbf-website/shared/api/http.ts (dort weiterhin so benannt);
 * hier nur der Bezeichner nach der Hausregel übersetzt.
 */
async function fetchPublic<T>(base: string, site: string, path: string): Promise<T> {
  const response = await $fetch<T>(`${base}/api/public/v1${path}`, {
    headers: { 'X-BB-Site': site },
    timeout: 10_000,
  }) as T
  return rewriteAssetUrl(response)
}

/**
 * Der Zustand eines Tisches — die Quelle der Anzeigetafel.
 *
 * `null` bei 404: die Veranstaltung gibt es nicht oder sie ist nicht
 * öffentlich, und der Unterschied bleibt draußen.
 */
export async function getTableBoard(
  base: string, site: string, eventId: string, tableNumber: number,
): Promise<TableBoard | null> {
  try {
    return await fetchPublic<TableBoard>(
      base, site, `/events/${encodeURIComponent(eventId)}/tables/${tableNumber}`)
  }
  catch (error: unknown) {
    if ((error as { statusCode?: number }).statusCode === 404) return null
    throw error
  }
}

/**
 * Welche Tische es gibt — die Grundlage der Tischwahl am Bildschirm.
 *
 * `null` bei 404, aus demselben Grund wie beim Tafelabruf darüber.
 */
export async function getBoardTables(
  base: string, site: string, eventId: string,
): Promise<BoardTables | null> {
  try {
    return await fetchPublic<BoardTables>(base, site, `/events/${encodeURIComponent(eventId)}/tables`)
  }
  catch (error: unknown) {
    if ((error as { statusCode?: number }).statusCode === 404) return null
    throw error
  }
}
