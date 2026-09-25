/**
 * DAS WEB-APP-MANIFEST DER ANZEIGETAFEL — UND NUR DER ANZEIGETAFEL
 *
 * Es heisst `board.webmanifest` und nicht `site.webmanifest`, weil genau das
 * der Unterschied ist: Installierbar wird die TAFEL, nicht die Verbandsseite.
 * Verlinkt wird diese Adresse ausschliesslich aus dem Kopf der Tafelseiten
 * (app/app.vue, `istTafel`). Ein Besucher auf epbf.com laedt sie nie und
 * bekommt deshalb auch keine Installationsaufforderung.
 *
 * WARUM EINE ROUTE UND KEINE DATEI UNTER public/
 *
 * Wegen des Namens. `name` traegt den Verband, und ein Verbandsname in einer
 * ausgelieferten Datei waere derselbe verdrahtete Mandant, den useTenant()
 * ueberall sonst vermeidet. Hier kommt er aus der serverseitigen
 * runtimeConfig und laesst sich je Umgebung ueber NUXT_BOARD_APP_NAME
 * setzen — ohne neuen Bau und ohne dass der Wert in den Payload jeder
 * gewoehnlichen Seite wandert (`public` waere genau das gewesen).
 *
 * WAS HIER BEWUSST NICHT STEHT
 *
 * `orientation`. Die Versuchung ist gross, `landscape` zu erzwingen — die
 * Tafel ist ein Querformat. Aber es gibt Haengungen hochkant, die Tafel
 * rechnet ohnehin mit `100dvh`, und iOS wertet das Feld gar nicht aus. Eine
 * Angabe, die auf dem Zielgeraet nichts tut und auf dem Zweitgeraet im Weg
 * steht, gehoert nicht ins Manifest.
 */
export default defineEventHandler((event) => {
  const config = useRuntimeConfig(event)

  /*
   * `display_override` vor `display`: Android nimmt `fullscreen` und blendet
   * dabei auch die Statusleiste mit Uhr und Akku aus — auf einem Schirm an
   * der Wand ist das genau richtig. iOS kennt `display_override` nicht und
   * faellt auf `standalone` zurueck; dort besorgt ohnehin das Meta-Tag den
   * Vollbildbetrieb.
   */
  const manifest = {
    id: '/board',
    name: config.boardAppName,
    short_name: config.boardAppShortName,
    description: 'Table scoreboard for the hall.',
    /*
     * Die Startadresse ist die Tischwahl OHNE Veranstaltungskennung. Das ist
     * der ganze Zweck der installierten App: ein Symbol auf zwanzig Tablets,
     * und welcher Tisch dahinter steht, entscheidet das Geraet.
     */
    start_url: '/board',
    /*
     * Der Geltungsbereich endet bei der Tafel. Alles darunter
     * (/board/<kennung>/<tisch>) bleibt in der App; ein Verweis nach draussen
     * — den es auf der Tafel nicht gibt — oeffnete Safari. Die Begrenzung ist
     * also weniger Einschraenkung als Schutz: was hier nicht hineingehoert,
     * kann die App auch nicht verschlucken.
     *
     * Unterressourcen sind davon nicht betroffen: /_nuxt/** und /api/** liegen
     * ausserhalb und werden trotzdem geladen. `scope` gilt nur fuer
     * Navigationen.
     */
    scope: '/board',
    display: 'standalone',
    display_override: ['fullscreen', 'standalone'],
    /*
     * Beide Farben sind das Schwarz der Tafel selbst (#05080d aus
     * [table].vue). Der Startschirm blitzt damit nicht weiss auf, bevor die
     * Tafel steht — in einem abgedunkelten Saal ist ein weisser Blitz auf
     * zwanzig Schirmen das, was alle sehen.
     *
     * Das gilt allerdings NUR fuer Android: `background_color` ist eines der
     * Felder, die iOS nicht auswertet. Auf dem iPad besorgt dasselbe die
     * schwarze Statusleiste aus app.vue — und der Umstand, dass die Tafel
     * serverseitig gerendert wird und deshalb schon schwarz ankommt.
     */
    background_color: '#05080d',
    theme_color: '#05080d',
    icons: [
      { src: '/app-icons/scoreboard-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/app-icons/scoreboard-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      /*
       * Dasselbe Bild noch einmal als `maskable`. Es darf dasselbe sein, weil
       * das Motiv es hergibt: die Kugel misst 68 % der Kantenlaenge und liegt
       * damit vollstaendig in der sicheren Zone von 80 %, die ein Beschnitt
       * uebriglaesst. Der Verlauf traegt bis in jede Ecke — es gibt nichts,
       * was ein runder oder eckiger Ausschnitt abschneiden koennte.
       */
      { src: '/app-icons/scoreboard-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  }

  setResponseHeader(event, 'content-type', 'application/manifest+json; charset=utf-8')
  /*
   * Eine Stunde. Das Manifest aendert sich so gut wie nie, und ein Tablet,
   * das es bei jedem Start neu holt, gewinnt nichts. Laenger waere trotzdem
   * falsch: wer den Namen der App aendert, will nicht durch die Halle gehen.
   */
  setResponseHeader(event, 'cache-control', 'public, max-age=3600')
  return manifest
})
