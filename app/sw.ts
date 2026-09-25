/// <reference lib="webworker" />
export type {}
declare const self: ServiceWorkerGlobalScope

import { cleanupOutdatedCaches, matchPrecache, precacheAndRoute } from 'workbox-precaching'
import { NavigationRoute, registerRoute, setCatchHandler } from 'workbox-routing'
import { NetworkOnly } from 'workbox-strategies'

/**
 * DER SERVICE WORKER DER TAFEL — WAS ER VORHÄLT, UND WAS ER NIE ANFASST.
 *
 * Der Auftrag: die Tafel soll starten, auch wenn beim Öffnen (einem
 * Neuladen ohne Netz) kein Netz da ist. Das GERÜST — HTML, JS, CSS,
 * Schriften, Symbole — wird deshalb vorgehalten. Kein einziges Byte davon
 * ist ein Spielstand: `/api/**` steht in diesem ganzen Skript kein einziges
 * Mal, und das ist Absicht — es wird dadurch gar nicht erst von diesem
 * Service Worker gesehen, siehe ganz unten.
 *
 * ===========================================================================
 * DAS ZUSAMMENSPIEL MIT useFassungswechsel — DIE EIGENTLICHE ARBEIT HIER
 * ===========================================================================
 *
 * useFassungswechsel.ts trifft eine ausdrückliche Entscheidung des
 * Auftraggebers: "wenn keine partie läuft, aktualisieren.. fertig". Ein
 * Service Worker kann das auf zwei Arten kaputt machen:
 *
 *   1. Indem er eine ALTE, zwischengespeicherte Antwort auf eine Navigation
 *      ausliefert, OBWOHL Netz da wäre — dann sieht useFassungswechsel nie
 *      eine neue Bau-Kennung, weil die Antwort, aus der sie kommt (siehe
 *      `server/api/board/[eventId]/tables/[number].get.ts`), nie wirklich
 *      beim Server war.
 *   2. Indem er beim eigenen aktiven Werden (`skipWaiting`/`clients.claim`)
 *      einer Tafel, die GERADE LÄUFT, den zwischengespeicherten Bestand
 *      unter den Füßen wegzieht — siehe unten, "WARUM KEIN skipWaiting".
 *
 * DIE LÖSUNG FÜR (1): JEDE Navigation unter `/board/**` läuft NUR über das
 * Netz (`NetworkOnly`, siehe unten) — nie `NetworkFirst`, nie
 * `StaleWhileRevalidate`. Ist Netz da, kommt IMMER die Antwort des Servers
 * an, mit der WIRKLICH aktuellen Bau-Kennung; useFassungswechsel bekommt sie
 * genau wie ohne Service Worker auch. Der einzige Fall, in dem dieser
 * Service Worker überhaupt etwas ausliefert, das nicht vom Server kam, ist
 * ein Netzfehler — und dann kann useFassungswechsel ohnehin nichts prüfen,
 * weil auch OHNE Service Worker keine Antwort käme.
 *
 * Damit erledigt sich die geforderte Entscheidung "wie merkt der Service
 * Worker eine neue Fassung, ohne dass useFassungswechsel es zweimal tut"
 * von selbst: DIESER Service Worker merkt gar nichts über Fassungen. Er
 * greift nie in eine Navigation ein, die das Netz beantworten kann, und für
 * jede, die es nicht kann, gibt es sowieso nichts zu vergleichen. Eine
 * zweite, parallele Erkennung wäre nicht nur unnötig, sondern genau die Art
 * doppelter Zuständigkeit, die auseinanderlaufen kann.
 *
 * WARUM KEIN skipWaiting() / clients.claim() — DIE ZWEITE HÄLFTE VON (2)
 *
 * Ein neuer Bau bringt einen neuen Service Worker mit (jede geänderte Datei
 * ändert `self.__WB_MANIFEST`, also den Byte-Inhalt dieser Datei nach dem
 * Bau, also erkennt der Browser sie als neue Fassung). Ohne `skipWaiting()`
 * bleibt sie im Zustand "waiting", bis KEIN Fenster mehr von der ALTEN
 * Fassung kontrolliert wird — und genau das ist hier fast immer erst der
 * Fall, wenn useFassungswechsel selbst neu lädt (oder das Gerät abends
 * ausgeschaltet wird). Das ist KEIN Nebeneffekt, den man in Kauf nimmt,
 * sondern GENAU der geforderte Rückhalt: die neue Fassung wartet auf denselben
 * Moment wie useFassungswechsel, ohne dass eine einzige Zeile beide
 * verbindet — der Browser selbst hält die Reihenfolge ein.
 *
 * Ein erzwungenes `skipWaiting()` hätte einen echten Preis gehabt: Es hätte
 * `cleanupOutdatedCaches()` sofort ausgelöst und damit die Dateien der
 * ALTEN Fassung aus dem Zwischenspeicher entfernt — WÄHREND eine Tafel mit
 * genau dieser alten Fassung noch im Speicher des Geräts läuft und offline
 * gehen könnte. Bricht das Netz dann ab, bevor useFassungswechsel überhaupt
 * geladen hätte, fände ein Nachladen eines noch nicht besuchten
 * Seitenteils (z. B. ein Wechsel zurück zur Tischwahl über das
 * Schiedsrichtermenü) weder die Datei auf dem Server (der hat nur noch die
 * neue Fassung ausliefert) NOCH im eigenen, gerade geleerten Zwischenspeicher.
 * Ohne `skipWaiting()` bleibt der alte Zwischenspeicher unangetastet, bis
 * wirklich niemand mehr an der alten Fassung hängt.
 *
 * Der Preis dieser Zurückhaltung: das GERÜST für den Offline-Rückfall
 * (`/board`, siehe unten) wird erst mit dem NÄCHSTEN natürlichen Wechsel auf
 * den neusten Stand gebracht — nach dem Neuladen, das useFassungswechsel
 * ohnehin auslöst, oder wenn ein Gerät morgens ganz neu startet. Das ist
 * hinnehmbar: der Offline-Rückfall wird nur gebraucht, wenn gerade KEIN Netz
 * da ist, und in dem Moment kann ohnehin nichts aktualisiert werden.
 */

/*
 * DAS GERÜST — eingespritzt von @vite-pwa/nuxt beim Bauen (siehe
 * nuxt.config.ts, `pwa.injectManifest.globPatterns`): die gebauten
 * JS-/CSS-Bündel, Schriften, Symbole, und `/board` als einzige HTML-Datei
 * (siehe dort, warum genau sie). `precacheAndRoute` registriert für jede
 * dieser — genau bekannten, unveränderlichen, am Dateinamen erkennbaren —
 * Adressen automatisch einen cache-first-Weg: neu ist nichts davon jemals
 * unter demselben Namen, ein neuer Bau erzeugt neue Namen.
 */
precacheAndRoute(self.__WB_MANIFEST)

/*
 * Räumt Zwischenspeicher EHEMALIGER Fassungen weg — aber erst, wenn dieser
 * Service Worker wirklich aktiv wird, und das ist wegen des fehlenden
 * `skipWaiting()` oben erst der Fall, wenn keine alte Fassung mehr läuft.
 * Siehe die lange Begründung oben.
 */
cleanupOutdatedCaches()

/**
 * DIE NAVIGATION — NUR DAS NETZ, NIE DER ZWISCHENSPEICHER.
 *
 * `NetworkOnly` und nicht `NetworkFirst`: `NetworkFirst` würde bei Erfolg
 * die Antwort ZUSÄTZLICH ablegen — und jede Antwort auf
 * `/board/<event>/<tisch>` trägt den Spielstand dieser Partie eingebettet
 * (Nuxts serverseitig gerenderte Nutzdaten). Ein solcher Zwischenspeicher
 * wäre exakt die Behauptung über eine laufende Partie, die der Auftrag
 * ausdrücklich verbietet — schlimmer als gar keine Anzeige, weil sie als
 * aktuell durchginge. `NetworkOnly` legt NICHTS ab: Erfolg liefert die
 * Antwort weiter, Misserfolg wirft, und genau dafür steht der
 * `setCatchHandler` gleich darunter.
 *
 * `allowlist` beschränkt das auf `/board/**` — das ist ohnehin die ganze
 * Anwendung (siehe LIESMICH.md, Aufbau), aber explizit und nicht implizit:
 * eine spätere Seite ausserhalb von `/board` bekäme diesen Rückfall sonst
 * ungefragt mit.
 */
registerRoute(
  new NavigationRoute(new NetworkOnly(), {
    allowlist: [/^\/board(?:\/.*)?$/],
  }),
)

/**
 * DER OFFLINE-EINSPRUNG — DAS GERÜST OHNE JEDE PARTIE.
 *
 * Greift NUR, wenn die `NavigationRoute` oben tatsächlich geworfen hat —
 * bei Netz kommt hier nie etwas an. Ausgeliefert wird IMMER das
 * vorgehaltene `/board`, unabhängig davon, welche Adresse wirklich
 * angefragt wurde (`/board`, `/board/<event>`, `/board/<event>/<tisch>`):
 * das ist die klassische Anwendung des Musters "eine Adresse dient als
 * Gerüst für alle" — der Browser zeigt in der Adresszeile weiter die
 * ANGEFRAGTE Adresse, nur der ausgelieferte Inhalt ist der einer anderen
 * Datei. Nuxts Client-Bau übernimmt danach ganz normal per Vue-Router:
 * `window.location.pathname` bleibt `/board/<event>/<tisch>`, und genau
 * diese Seite baut sich im Browser auf, rein aus JavaScript, ohne
 * eingebettete Daten. Sie fragt ihre eigenen Daten danach selbst beim Netz
 * an — vergeblich, solange keins da ist, aber ihre Anzeige weiss damit
 * bereits umzugehen (siehe [table].vue, `tafelGelesen`).
 *
 * Nur für `request.mode === 'navigate'`: alles andere (ein misslungenes
 * Bild, eine misslungene Schrift) soll als das erscheinen, was es ist — ein
 * fehlendes Stück und keine ganze Ersatzseite.
 */
setCatchHandler(async ({ request }) => {
  if (request.mode === 'navigate') {
    const rueckfall = await matchPrecache('/board')
    if (rueckfall) return rueckfall
  }
  return Response.error()
})

/**
 * `/_nuxt/builds/**` — NIE AUS DEM SPEICHER.
 *
 * Diese Dateien tragen die Bau-Kennung, an der `useFassungswechsel.ts` (dort
 * `kennungsadresse`) eine neue Fassung erkennt. Ein Zwischenspeicher hier
 * hätte denselben Effekt wie eine zwischengespeicherte Navigation: das Gerät
 * sähe nie wieder eine neue Kennung. `globPatterns` oben nimmt schon keine
 * `.json`-Dateien auf, diese Zeile ist die zweite, unabhängige Sicherung —
 * falls das je jemand ändert, ohne diese Begründung noch einmal zu lesen.
 */
registerRoute(
  ({ url }) => url.pathname.startsWith('/_nuxt/builds/'),
  new NetworkOnly(),
)

/*
 * `/api/**` STEHT HIER BEWUSST NICHT.
 *
 * `registerRoute` fügt Wege HINZU; was keiner beschreibt, geht am Service
 * Worker vorbei und direkt ans Netz — GENAU das ist für `/api/**` richtig,
 * und genau deshalb bleibt es unerwähnt. Ein extra `NetworkOnly`-Eintrag
 * dafür wäre keine stärkere Sicherung, nur eine, die man erst lesen und für
 * richtig befinden müsste; das Fehlen jeder Zuständigkeit ist hier die
 * unmissverständlichere Aussage.
 */
