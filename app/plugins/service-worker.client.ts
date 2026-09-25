/**
 * DIE REGISTRIERUNG DES SERVICE WORKERS — VON HAND, UND NUR UNTER /board.
 *
 * `@vite-pwa/nuxt` steuert hier bewusst NICHTS bei (siehe nuxt.config.ts,
 * `pwa.injectRegister: false` / `pwa.client.registerPlugin: false`): seine
 * eigene Registrierung liefe auf jeder Seite dieser Anwendung, und obwohl
 * das heute jede Seite unter `/board` wäre, soll das im Code selbst
 * geprüft werden und nicht aus einem Zufall der Ordnerstruktur folgen —
 * dieselbe Haltung wie `isBoard` in app.vue, das trotz "hier ist ohnehin
 * alles Tafel" ausdrücklich prüft statt anzunehmen.
 *
 * `scope: '/board'` UND NICHT DER GRUNDPFAD DER DATEI: eine unter `/sw.js`
 * ausgelieferte Datei dürfte per Voreinstellung `/` kontrollieren — mehr,
 * als diese Anwendung braucht. Der Geltungsbereich des Web-App-Manifests
 * (`server/routes/board.webmanifest.get.ts`, `scope: '/board'`) und der
 * des Service Workers sollen sich decken: beide beschreiben "das ist die
 * Tafel", und zwei verschiedene Antworten auf dieselbe Frage wären ein
 * Fehler, der erst auffiele, wenn es zu spät ist.
 *
 * NACH `window.load` und nicht sofort: die Registrierung selbst löst einen
 * Netzwerkabruf aus (`/sw.js`), und der soll nicht mit den Bildern, Fonts
 * und Skripten konkurrieren, die die Tafel für ihr ERSTES Bild braucht. Ein
 * paar hundert Millisekunden später schadet dem Service Worker nicht — er
 * wird ohnehin erst beim NÄCHSTEN Laden wirksam (siehe sw.ts, "Der
 * Zeitpunkt, an dem ein Service Worker eine bereits offene Seite
 * kontrolliert").
 */
export default defineNuxtPlugin(() => {
  if (!('serviceWorker' in navigator)) return

  const isBoard = location.pathname === '/board' || location.pathname.startsWith('/board/')
  if (!isBoard) return

  const register = () => {
    navigator.serviceWorker.register('/sw.js', { scope: '/board' }).catch(() => {
      /*
       * Ein gescheitertes Registrieren (privater Modus, ein Browser ohne
       * Unterstützung, eine Sicherheitsrichtlinie) blockiert die Tafel
       * nicht — sie arbeitet dann genau wie vor dieser Ergänzung, nur ohne
       * den Offline-Rückfall.
       */
    })
  }

  if (document.readyState === 'complete') register()
  else window.addEventListener('load', register, { once: true })
})
