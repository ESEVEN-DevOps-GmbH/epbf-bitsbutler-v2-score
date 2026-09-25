// https://nuxt.com/docs/api/configuration/nuxt-config
import { version as bbScoreVersion } from './package.json'

export default defineNuxtConfig({
  compatibilityDate: '2026-09-01',
  devtools: { enabled: true },

  modules: ['@nuxt/fonts'],

  /**
   * Serverseitiges Rendern ist Pflicht, nicht Geschmack: die Tafel wird pro
   * Bildschirm einmal geöffnet und läuft danach tagelang — sie soll nach
   * einem Stromausfall ohne eigenes Zutun wieder ein vollständiges Bild
   * zeigen, statt auf eine JavaScript-Ladung zu warten.
   */
  ssr: true,

  /**
   * NICHTS wird hier zwischengespeichert.
   *
   * Anders als epbf-website (siehe dort, `routeRules`) hat dieses Projekt
   * keine Serien-, Turnier- oder Nachrichtenseiten mit einer sinnvollen
   * Frist — es gibt nur die Tafel, und die hängt an einem Bildschirm, der
   * stundenlang ohne Neuladen läuft. Ein Zwischenspeicher wäre hier nie ein
   * Gewinn, sondern nur das Risiko, den Stand von vorhin zu zeigen.
   */
  routeRules: {
    '/**': { swr: false, headers: { 'cache-control': 'no-store' } },
  },

  /**
   * Schriften werden lokal ausgeliefert statt von fonts.googleapis.com.
   *
   * Nur Montserrat: die Tafel und das Schiedsrichtermenü setzen sie
   * ausdrücklich (siehe [table].vue, Schirimenue.vue); alles andere auf
   * dieser Seite erbt eine Systemschrift. Dieselben Schnitte wie in
   * epbf-website, aus demselben Grund: die Schriftgrößen auf der Tafel sind
   * gegen die wirklich geladene Montserrat vermessen (siehe Side.vue).
   */
  fonts: {
    families: [
      { name: 'Montserrat', provider: 'google', weights: [600, 700, 900] },
    ],
  },

  css: [
    /*
     * Der Flaggensatz für UiCountryTag — Spieler auf der Tafel tragen eine
     * Nationalität, und die meisten Länder zeichnet dieser Satz.
     */
    'flag-icons/css/flag-icons.min.css',
  ],

  app: {
    head: {
      htmlAttrs: { lang: 'en' },
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        { name: 'build-version', content: bbScoreVersion },
      ],
      link: [
        { rel: 'icon', type: 'image/svg+xml', href: '/app-icons/scoreboard.svg' },
        { rel: 'apple-touch-icon', href: '/app-icons/scoreboard-180.png', key: 'apple-touch-icon' },
      ],
    },
  },

  nitro: {
    routeRules: {
      '/**': {
        headers: {
          'X-Content-Type-Options': 'nosniff',
          'Referrer-Policy': 'strict-origin-when-cross-origin',
          'X-Frame-Options': 'DENY',
        },
      },
    },
  },

  /**
   * `BB_API` UND `BB_SITE` STEHEN NICHT HIER.
   *
   * Ein Wert unter `runtimeConfig` wird beim BAUEN eingefroren (Nitro
   * berechnet daraus ein `Object.freeze`tes Objekt beim Start des
   * Prozesses) und lässt sich danach nur über Nitros eigene, NUXT_-
   * vorangestellte Namenskonvention übersteuern — nie über `BB_API` selbst.
   * Der Auftrag sieht aber ausdrücklich vor, einmal zu bauen und denselben
   * gebauten Server danach mit wechselnden Backends zu starten
   * (`BB_API=... node .output/server/index.mjs`, keine zweite Halle baut
   * neu). Deshalb lesen `server/utils/verwaltung.ts` und die wenigen
   * Routen, die unmittelbar mit der Anwendung sprechen, `process.env.BB_API`
   * bzw. `process.env.BB_SITE` selbst und direkt — das ist echte
   * Prozessumgebung und nichts, was der Bauvorgang festschreiben könnte.
   *
   * `BB_API` leer heißt: kein Backend erreichbar. Die Tafel meldet das dann
   * ehrlich (503 bzw. eine leere Veranstaltungsliste) statt erfundener
   * Daten — anders als epbf-website, das ohne Backend auf Beispieldaten
   * zurückfällt: eine Tafel ohne echten Turnierstand ist keine sinnvolle
   * Seite, die es zu gestalten gäbe.
   *
   * `BB_SITE` ist der Seitenschlüssel (`X-BB-Site`); leer heißt `DIRECTORY`
   * — siehe `bitsbutler-v2/instanzen/LIESMICH.md`.
   */
  runtimeConfig: {
    /**
     * Wie die installierte Tafel auf dem Tablet heisst — gelesen von
     * server/routes/board.webmanifest.get.ts. Dieselben Werte wie in
     * epbf-website, wo sie schon produktbezogen und nicht verbandsbezogen
     * gewählt waren ("BitsButler Scoreboard", nicht "EPBF"). Übersteuerbar
     * über NUXT_TAFEL_APP_NAME / NUXT_TAFEL_APP_KURZNAME, Nuxts eigener
     * Konvention — anders als BB_API/BB_SITE geht es hier nicht um die
     * eine Backend-Adresse, für die die Instanzen-Konvention gilt.
     */
    tafelAppName: 'BitsButler Scoreboard',
    tafelAppKurzname: 'Scoreboard',

    public: {},
  },

  typescript: {
    strict: true,
    typeCheck: false,
  },
})
