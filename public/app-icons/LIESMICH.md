# Das Symbol der installierten Anzeigetafel

`scoreboard.svg` ist die Quelle, die drei PNG daneben sind daraus gerechnet.
Wer das Symbol aendert, aendert die SVG und rechnet neu:

    cd public/app-icons
    for s in 180 192 512; do
      rsvg-convert -w $s -h $s -b '#00afee' scoreboard.svg -o scoreboard-$s.png
    done

`-b '#00afee'` ist nicht schmueckendes Beiwerk: Es legt eine deckende Flaeche
unter das Bild. iOS stellt durchsichtige Stellen eines Home-Bildschirm-Symbols
SCHWARZ dar — ein freigestelltes PNG kaeme als schwarzer Klotz heraus. Nach dem
Rechnen pruefen: `sips -g hasAlpha scoreboard-180.png` muss `no` sagen.

## Warum dieses Motiv und nicht das Verbandslogo

Gefordert war ein Symbol, das auf dem Startbildschirm bei 60 px noch traegt.
Vier Entwuerfe wurden bei genau dieser Groesse verglichen:

* **Ausschnitt aus `header-mark.png`** (die Acht vor der naechtlichen Erdkugel).
  Faellt durch. Das Bild lebt von Textur — Lichter auf dem Nachtkontinent, ein
  Lichtsaum am Rand der Kugel. Bei 60 px ist davon ein blaugrauer Fleck uebrig,
  in dem die Acht nicht mehr zu erkennen ist.
* **Schriftzug** (`epbf_logo_text_shadow.png` und die Serienlogos). Faellt
  durch: 562 px Breite auf 60 px gebracht sind keine lesbaren Buchstaben.
* **Schwarzer Grund mit blauem Ring.** Traegt, verschwindet aber auf einem
  dunklen Startbildschirm — genau dort, wo die Tablets stehen.
* **Blauer Grund, Kugel, Acht.** Gewaehlt.

Es traegt, weil es nur drei Dinge zeigt und alle drei gross sind: eine Flaeche
im Verbandsblau (#00afee → #00559e, dieselbe Farbe wie die Seite), eine dunkle
Kugel darauf, eine weisse Scheibe mit der Acht darin. Bei 60 px bleiben davon
drei unterscheidbare Helligkeitsstufen — und das ist alles, was auf dieser
Groesse ueberhaupt ankommt.

Der blaue Grund hat noch einen zweiten Zweck: Er hebt das Symbol von hellen
UND von dunklen Startbildschirmen ab. Ein Symbol auf schwarzem Grund tut das
nur auf einem hellen.

## Keine eigenen runden Ecken

Das Motiv geht randvoll bis in jede Ecke. iOS und Android maskieren selbst;
ein Bild, das seine Ecken schon mitbringt, bekommt sie zweimal und sieht
eingeschrumpft aus.

Die Kugel misst 68 % der Kantenlaenge und liegt damit in der sicheren Zone von
80 %, die ein maskierender Beschnitt uebriglaesst. Deshalb dient dasselbe Bild
im Manifest auch als `maskable`, ohne dass eine zweite Fassung noetig waere.

## Wer das hier liest, weil er den Namen sucht

Der Name unter dem Symbol steht nicht hier, sondern in `nuxt.config.ts`
(`tafelAppKurzname`) und in `app/app.vue` (`apple-mobile-web-app-title`).
