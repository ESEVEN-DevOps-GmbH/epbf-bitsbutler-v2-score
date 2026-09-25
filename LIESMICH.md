# bb-score — die Anzeigetafel

Der Bildschirm neben dem Tisch: Stand, Anstoß, Auszeiten, Trikotkontrolle,
Shot-Clock, und für ein freigegebenes Gerät das Schiedsrichtermenü zum
Zählen. Nicht die Verbandsseite, nicht die Verwaltung — nur die Tafel.

Bis zum 25.09.2026 war sie Teil von `epbf-website` (`app/pages/board`,
`app/components/board`, `app/composables/useZaehlwerk.ts`,
`server/api/board`). Sie ist es seither nicht mehr, weil EPBF und
BitsButler getrennte Dinge sind: die Tafel gehört zum PRODUKT, nicht zum
Verband. Sie steht in jeder Halle — auch bei Veranstaltern, die nie eine
EPBF-Seite sehen und nie eine sehen sollen. Ein Auftraggeber, der zwei
Turniere in verschiedenen Hallen an verschiedenen Wochenenden zählen lässt,
richtet dafür nicht zwei Verbandsseiten ein.

## Starten

```
npm install
npm run dev            # http://localhost:3000
```

Gegen ein laufendes Backend:

```
BB_API=http://127.0.0.1:9080 npm run dev
```

Für den Betrieb:

```
npm run build
BB_API=http://127.0.0.1:9080 NITRO_PORT=3002 node .output/server/index.mjs
```

`BB_API` gilt dabei erst beim START des gebauten Servers und nicht erst
beim Bauen — ein einmal gebautes `.output` genügt für jede Halle, jeder
Aufbau setzt nur seine eigene Adresse. Das geht nur, weil `BB_API`/`BB_SITE`
NICHT über Nuxts `runtimeConfig` laufen (die wird beim Start eingefroren),
sondern direkt als `process.env.BB_API`/`BB_SITE` gelesen werden, dort wo
die Tafel mit der Anwendung spricht (siehe nuxt.config.ts, Abschnitt
`runtimeConfig`).

## Was sie vom Backend braucht

| Umgebungsvariable | Bedeutung | Vorgabe |
|---|---|---|
| `BB_API` | Wurzel des Backends, OHNE Pfad (z. B. `http://127.0.0.1:9080`) | leer — dann meldet die Tafel ehrlich, dass nichts erreichbar ist |
| `BB_SITE` | Seitenschlüssel (`X-BB-Site`) | leer, das ist gültig (`DIRECTORY`) |
| `NITRO_PORT` / `NITRO_HOST` | wie bei jedem Nitro-Server | Nitro-Vorgabe |

Warum die Namen so heißen und nicht `NUXT_API_BASE` oder
`PUBLIC_API_BASE_URL` (wie die anderen Werkzeuge dieses Bestands intern
tun): `bitsbutler-v2/instanzen/LIESMICH.md`. `BB_API` ist IMMER die Wurzel
ohne Pfad; den Pfad hängt an, wer ihn braucht (`/api/admin/v1/board/grant`
für die Freigabe per Code, `/api/public/v1/...` für den öffentlichen Stand).

Die Tafelsitzung liegt serverseitig, in zwei Kexen (`bb_session` für ein
angemeldetes Konto, `bb_board` für die Freigabe per vierstelligem Code) —
siehe `server/utils/verwaltung.ts`.

## Aufbau

```
app/
  pages/board/            die drei Seiten: Veranstaltungswahl, Tischwahl, Tafel
  components/board/       Zählleiste, Zähltasten, Ballwerte, Schiedsrichtermenü, Seite
  components/ui/          CountryTag — die einzige geteilte Bauform, die die Tafel braucht
  composables/
    useZaehlwerk.ts       das Herz: hält den Stand, schreibt jeden Zählvorgang
    useFassungswechsel.ts merkt eine neue Fassung und lädt neu, wenn keine Partie läuft
    useDateFormat.ts      Datums-/Zeitformate; Zeitzone des GERÄTS statt eines Verbands
server/
  api/board/              die 20 Endpunkte, an denen ein zählendes Gerät hängt
  api/events/[id]/tables* der öffentliche Stand, ohne Anmeldung
  api/countries/          Flaggengrafiken für Länder ohne ISO-Flagge (CountryTag)
  api/assets/             Bild-Durchreiche (Sponsorenlogos, Veranstalterwappen)
  api/me.get.ts,
  api/session.delete.ts   der SESSION-Pfad: ein angemeldetes Konto abmelden
  routes/board.webmanifest.get.ts   Installations-Manifest, unabhängig von jedem Mandanten
  utils/                  parseId, die Durchreiche zur Verwaltung, die Herkunftskette
shared/types/api.ts       AUSZUG aus epbf-website — nur die zehn Typen, die die Tafel braucht
public/app-icons/         das Symbol der installierten Tafel (kein Verbandslogo, siehe dort)
```

## Was bewusst fehlt

Der SESSION-Pfad (`useTenant()`, Mandantenkonfiguration, Anmeldeformular
`/sign-in`) ist NICHT mitgezogen — die Tafel hatte ihr eigenes
Anmeldeformular ohnehin schon verloren ("das mit dem sign-in per user/pw,
kann doch eh weg", 16.09.2026); übrig blieb nur das LESEN einer
Sitzung, die eine andere Anwendung gesetzt hat (`/api/me`,
`/api/session`). Das bleibt hier bestehen — es schadet nicht, wenn nie ein
`bb_session`-Keks anliegt, und es trägt wieder, sobald `bb-score` auf
derselben Elternadresse wie eine Anmeldeseite betrieben wird.

Der Mandant selbst (`useTenant()`, `app.config.ts`, `shared/types/tenant.ts`)
ist NICHT mitgezogen: dieses Projekt kennt keinen Verband. Wo die Tafel im
Original auf die Marke der Seite zurückfiel (Wappen, Name), fällt sie hier
auf ihre eigene Marke zurück ("BitsButler Scoreboard" / "Scoreboard") —
dieselben Werte, die das Original schon für das Installations-Manifest der
Tafel benutzte, weil die Tafel dort schon als eigenständiges Produkt
gedacht war und nicht als EPBF-Eigenheit.
