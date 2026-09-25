// https://nuxt.com/docs/api/configuration/nuxt-config
import { version as bbScoreVersion } from './package.json'

export default defineNuxtConfig({
  compatibilityDate: '2026-09-01',
  devtools: { enabled: true },

  modules: ['@nuxt/fonts', '@vite-pwa/nuxt'],

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

    /**
     * `/board` — UND NUR GENAU DIESE EINE ADRESSE — WIRD ZUM STATISCHEN,
     * DATENLOSEN GERÜST.
     *
     * Der Grund steht in sw.ts ausführlich ("DAS OFFLINE-GERÜST"): der
     * Service Worker braucht ein Dokument, das er OHNE Netz ausliefern
     * darf, ohne damit eine Behauptung über eine laufende Partie
     * abzugeben. Jede andere Tafelseite ([eventId]/index.vue,
     * [eventId]/[table].vue) rendert serverseitig MIT echten Daten
     * (Tischliste, Spielstand) — genau das, was hier ausdrücklich NICHT
     * zwischengespeichert werden darf.
     *
     * `/board` selbst ist dafür der EINZIGE Kandidat: sie zeigt beim
     * normalen (Online-)Aufruf nur eine Liste von Veranstaltungen, und ihre
     * eigentliche Aufgabe — das Gerät zu seiner gemerkten Veranstaltung und
     * seinem gemerkten Tisch weiterzuspringen — läuft ohnehin ausschließlich
     * über `onMounted` und `localStorage`, also über JavaScript im Browser.
     * Serverseitiges Rendern trägt zu GENAU DIESER Aufgabe nichts bei; ein
     * Gerät ohne JavaScript käme über diese Seite so oder so nicht hinaus.
     *
     * `ssr: false` macht daraus ein Nuxt-SPA-Blatt: die ausgelieferte Seite
     * enthält keine eingebetteten Nutzdaten (kein `__NUXT_DATA__` mit der
     * Veranstaltungsliste von vorhin), sondern nur das Gerüst, das den
     * Client-Bau lädt und dort die Veranstaltungswahl komplett im Browser
     * aufbaut — GENAU wie es täte, wenn `/board` mit echtem Netz aufgerufen
     * würde, nur dass die erste (leere) Anzeige diesmal aus dem Speicher des
     * Geräts kommt statt vom Server.
     *
     * `prerender: true` bäckt daraus beim BAUEN eine echte Datei unter
     * `.output/public/board/index.html` — nicht, weil sie schneller wäre
     * (das wäre sie, aber das ist nicht der Grund), sondern weil nur eine
     * echte Datei vom Bauvorgang des Service Workers (`injectManifest`,
     * siehe sw.ts) automatisch GEFUNDEN und in sein Gerüst-Verzeichnis
     * aufgenommen wird. Eine Seite, die es nur als Serverroute gibt, könnte
     * der Service Worker nicht vorab einsammeln, ohne sie selbst separat
     * anzufragen und dafür extra Buchführung zu betreiben.
     */
    '/board': { ssr: false, prerender: true },
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

  /**
   * DER SERVICE WORKER — WARUM ÜBERHAUPT EINE ABHÄNGIGKEIT, UND WARUM DIESE.
   *
   * Ein Service Worker braucht bei jedem Bau eine korrekte Liste der
   * tatsächlich erzeugten Dateien samt ihrer Hashes (`self.__WB_MANIFEST`) —
   * das von Hand nachzuführen (jeder Lauf von `nuxt build` benennt jede
   * Chunk-Datei neu) ist genau die Art Buchführung, die eine eigene,
   * schlecht getestete Fassung eher bricht als eine gepflegte. `@vite-pwa/
   * nuxt` (Workbox darunter) übernimmt NUR das: das Einsammeln der gebauten
   * Dateien aus `.output/public` und ihr Einspritzen in die selbst
   * geschriebene Datei `sw.ts`.
   *
   * ALLES ANDERE — Registrierung, Routing, Zwischenspeicher-Strategie,
   * Umgang mit `/api/**`, das Zusammenspiel mit useFassungswechsel — steht
   * NICHT in dieser Konfiguration, sondern von Hand in `sw.ts` und
   * `app/plugins/service-worker.client.ts`. Deshalb `strategies:
   * 'injectManifest'` und nicht die Vorgabe `generateSW`: `generateSW`
   * ERZEUGT die Routing-Logik selbst aus ein paar Optionen und verlangt für
   * jede Abweichung (hier: NIE `/api/**` zwischenspeichern, die Navigation
   * NIE aus dem Speicher bedienen ausser als bewusster Rückfall) eigene
   * `runtimeCaching`-Einträge, die am Ende genauso viel eigenen Code
   * bräuchten wie `injectManifest` — nur unübersichtlicher verteilt über
   * Konfigurationsobjekte statt in einer lesbaren Datei.
   *
   * `manifest: false`, `injectRegister: false`, `client.registerPlugin:
   * false`: das Modul soll WEDER ein eigenes Web-App-Manifest erzeugen (das
   * gibt es schon, siehe server/routes/board.webmanifest.get.ts, mit dem
   * Verbandsnamen aus der Laufzeitkonfiguration — etwas, das ein zur
   * Bauzeit erzeugtes zweites Manifest nicht könnte) NOCH selbst
   * registrieren. Eine automatische, globale Registrierung liefe auf JEDER
   * Seite dieser Anwendung — hier ist zwar jede Seite Tafel-nah, aber die
   * Registrierung gehört inhaltlich zu `/board` und soll das auch im Code
   * zeigen (siehe der Plugin, der die Route selbst prüft).
   */
  pwa: {
    strategies: 'injectManifest',
    srcDir: '.',
    filename: 'sw.ts',
    injectManifest: {
      /*
       * NUR DAS GERÜST: gebaute Bündel, Schriften, Symbole — UND, weil
       * `/board` seit der Regel oben eine echte Datei ist
       * (`board/index.html`), auch sie.
       */
      globPatterns: ['**/*.{js,mjs,css,woff2,woff,ttf,png,svg,ico}', 'board/index.html'],
      /*
       * `_nuxt/builds/**` — TROTZ FEHLENDER `.json`-ENDUNG OBEN — HÄNGT
       * `@vite-pwa/nuxt` SELBST WIEDER AN, UND ZWAR AUF ZWEI WEGEN.
       *
       * Erstens fügt das Modul, weil es Nuxts eigenes "app manifest" erkennt
       * (dieselben Dateien, an denen `useFassungswechsel.ts` eine neue
       * Bau-Kennung erkennt: `_nuxt/builds/latest.json` und
       * `_nuxt/builds/meta/<kennung>.json`), den `globPatterns` von sich aus
       * ein weiteres Muster hinzu — GEMESSEN am ersten Bauversuch dieser
       * Änderung, nicht vermutet: trotz der fehlenden `.json`-Endung oben
       * standen beide Dateien danach trotzdem im Gerüst. `globIgnores` holt
       * sie hier wieder heraus.
       *
       * Zweitens — und DAS holt `globIgnores` NICHT zurück — hängt dasselbe
       * Modul unterhalb der Glob-Suche einen eigenen `manifestTransform` ein,
       * der `_nuxt/builds/latest.json` UNBEDINGT erneut einfügt, falls sie
       * fehlt (`createManifestTransform` in seinem eigenen Quelltext). Dafür
       * ersetzt `manifestTransforms` weiter unten diesen Schritt durch einen
       * eigenen, der NUR das übernimmt, was diese Datei tatsächlich braucht.
       *
       * Ein zwischengespeichertes `latest.json` wäre für useFassungswechsel
       * unsichtbar: die Kennung darin änderte sich nie wieder, und ein Gerät
       * bekäme nie mehr eine neue Fassung gemeldet.
       */
      globIgnores: ['sw.js', 'sw.js.map', '**/_nuxt/builds/**'],
      /*
       * ERSETZT DEN STANDARD-TRANSFORM VON `@vite-pwa/nuxt` VOLLSTÄNDIG —
       * siehe die Begründung an `globIgnores` oben, "zweitens".
       *
       * Übernommen wird NUR der Teil, den diese Datei braucht: eine
       * `<pfad>/index.html` verliert ihre Dateiendung und wird zu `<pfad>`
       * (`board/index.html` → `board`) — GENAU die Form, unter der
       * `sw.ts` sie mit `matchPrecache('/board')` wiederfindet (Workbox löst
       * `board` und `/board` beim Nachschlagen auf dieselbe volle Adresse
       * auf, insofern ist die Schreibweise dort frei). Ohne diesen Schritt
       * bliebe der Eintrag `board/index.html` heißen, und der
       * Offline-Rückfall in `sw.ts` liefe ins Leere.
       *
       * NICHT übernommen wird der Teil, der `_nuxt/builds/latest.json`
       * erneut einfügt (siehe oben) — das ist der ganze Sinn dieses
       * Ersatzes.
       */
      manifestTransforms: [
        (eintraege) => {
          for (const eintrag of eintraege) {
            if (!eintrag.url.endsWith('.html')) continue
            const teile = eintrag.url.replace(/^\/+/, '').split('/')
            const name = teile[teile.length - 1]!.replace(/\.html$/, '')
            teile[teile.length - 1] = name
            eintrag.url = name === 'index'
              ? (teile.slice(0, -1).join('/') || '/')
              : teile.join('/')
          }
          return { manifest: eintraege, warnings: [] }
        },
      ],
    },
    manifest: false,
    injectRegister: false,
    client: { registerPlugin: false },
    devOptions: {
      /*
       * Im `nuxt dev` gibt es kein `.output/public` zum Durchsuchen, und
       * der springende Punkt dieser Aufgabe — ein NEULADEN ohne Netz — lässt
       * sich mit dem Entwicklungsserver ohnehin nicht ehrlich nachstellen
       * (der Vite-Client hängt an einer WebSocket-Verbindung, die ein
       * "Netz aus" im Browser genauso kappt wie jede andere Verbindung).
       * Geprüft wird das gebaute Ergebnis, siehe LIESMICH.md, Abschnitt
       * "Starten", Zeile mit `node .output/server/index.mjs`.
       */
      enabled: false,
    },
  },
})
