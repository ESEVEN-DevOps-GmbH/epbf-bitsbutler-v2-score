<script setup lang="ts">
import type { MatchSide } from '~~/shared/types/api'

/**
 * EINE SEITE DER ANZEIGETAFEL AM TISCH — Zahl oben, Name unten.
 *
 * Die Tafel ist symmetrisch: Spieler A steht ganz links, Spieler B ganz
 * rechts, und die Mitte gehört dem Verband, der Tischnummer und der
 * Disziplin. Diese Komponente ist deshalb ZWEIMAL im Bild, einmal
 * gespiegelt — und genau darum ist sie eine Komponente: die
 * Namenszerlegung, die Schriftskalierung und der Anstoßbalken müssten
 * sonst in derselben Datei zweimal stehen und würden beim nächsten
 * Eingriff auseinanderlaufen.
 *
 * VERWORFEN: eine Zeile je Spieler (Flagge, Name, Zahl nebeneinander), wie
 * die Tafel es bis zum 14.09.2026 machte. Aus fünf Metern ist eine Liste
 * von zwei Zeilen nicht als Partie zu erkennen — sie sieht aus wie ein
 * Auszug aus einer Tabelle. Der Auftraggeber liest seit Jahren die
 * symmetrische Tafel des Vorgängersystems, und sie ist auch die bessere:
 * links und rechts sind zwei Menschen, die gegeneinander spielen.
 */
const props = defineProps<{
  side: MatchSide
  /** Diese Seite stößt den nächsten Satz an — trägt den breiten Balken. */
  breaking: boolean
  /** `end` spiegelt die Seite nach aussen; Spieler B steht rechtsbündig. */
  align: 'start' | 'end'
  /**
   * Die laufende Auszeit DIESER Seite; null, wenn die andere Seite sie
   * genommen hat oder keine läuft.
   *
   * Sie steht am Spieler und nicht in der Fußzeile, wo sie bis zum
   * 14.09.2026 stand: eine Auszeit gehört einem von beiden, und wer vor der
   * Tafel steht, will nicht lesen, WESSEN Auszeit läuft, sondern es sehen.
   * In der Fußzeile brauchte sie außerdem den Namen ein zweites Mal und
   * war damit so breit, dass sie die Zeile umbrach.
   */
  timeout?: { text: string, overrun: boolean } | null
  /**
   * DIE AUFNAHME DIESER SEITE BEI 14.1 ENDLOS — laufend und höchste.
   *
   * `null` heisst: keine Partie, die das kennt. Dann steht die Zeile gar
   * nicht im Dokument; eine 9-Ball-Tafel gibt für sie keine Höhe her.
   *
   * `lauf: null` heisst: dieser Spieler ist NICHT am Tisch. Eine laufende
   * Aufnahme hat immer nur einer, und beim anderen stünde sonst eine Zahl,
   * die seit fünf Minuten steht und trotzdem „läuft" heisst. Der High run
   * steht bei beiden — er ist die Zahl, die im Saal verglichen wird.
   */
  inning?: { current: number | null, high: number } | null
}>()

/**
 * Namensteilchen, die zum Nachnamen gehören, obwohl sie klein geschrieben
 * sind: "van den Berg" ist ein Nachname und nicht "Berg" mit dem Vornamen
 * "Nick van den".
 */
const NAME_PARTICLES = new Set([
  'van', 'von', 'de', 'del', 'della', 'di', 'da', 'das', 'dos', 'du', 'der',
  'den', 'la', 'le', 'les', 'ten', 'ter', 'af', 'av', 'al', 'bin', 'bint',
  'mac', 'mc', 'op', 'st',
])

/**
 * NACHNAME OBEN, VORNAME DARUNTER — ZWEI WEGE, UND DER ERSTE IST DER RICHTIGE
 *
 * ERSTER WEG: die Schnittstelle sagt es. `MatchSide` führt seit dem
 * 14.09.2026 `givenName` und `familyName` getrennt, direkt aus
 * identity.person — dort standen sie immer, sie wurden nur nie
 * durchgereicht. Steht beides da, wird hier nichts entschieden, sondern
 * abgeschrieben. Das ist der Normalfall für jeden Menschen auf der Tafel.
 *
 * ZWEITER WEG, DER RÜCKFALL: wo die Teile fehlen, gilt die alte Regel —
 * das LETZTE Wort ist der Nachname, nach links erweitert um Partikel
 * ("van den Berg" ist ein Nachname und nicht "Berg"). Er greift in zwei
 * Lagen: gegen eine ältere Anwendung, die die Felder noch nicht schickt
 * (die Tafel läuft tagelang ohne Bedienung und darf einen Rückstand der
 * Gegenseite nicht mit einem leeren Namen quittieren), und bei einer Seite
 * mit `playerId`, hinter der die Datenbank doch keine Person findet.
 *
 * GELÖSCHT wurde er also NICHT, obwohl er falsch raten kann: nachgerechnet
 * gegen alle 9 202 Personen des Bestands trifft er 8 926 (97,00 %), und bei
 * den übrigen 276 (spanische und portugiesische Doppelnachnamen wie
 * "Fuentes Vasquez", auch "Zhe Jin" oder "Husein Faraj")
 * steht der Name immer noch vollständig und in richtiger Reihenfolge da —
 * nur die Gewichtung stimmt nicht. Ein leerer Bildschirm wäre schlimmer.
 *
 * KEINE ZERLEGUNG OHNE PERSON — das gilt auf beiden Wegen. `displayName`
 * ist oft gar kein Name, sondern "Walkover", "Qualifier", "Winner M17"
 * oder — bei einer Mannschaft — "Germany". Aus "Winner M17" würde sonst
 * "M17" groß und "Winner" klein, und das ist Unsinn. Die Anwendung lässt
 * `givenName`/`familyName` in genau diesen Fällen leer; woran es hier
 * zusätzlich erkannt wird: eine Platzhalterseite hat keine `playerId`, ein
 * anonymisierter Spieler trägt `erased`.
 */
const nameParts = computed(() => {
  const full = props.side.displayName.trim()
  if (!props.side.playerId || props.side.erased) return { familyName: full, givenName: '' }

  const familyName = props.side.familyName?.trim()
  if (familyName) return { familyName, givenName: props.side.givenName?.trim() ?? '' }

  const parts = full.split(/\s+/)
  if (parts.length < 2) return { familyName: full, givenName: '' }

  let i = parts.length - 1
  while (i > 1 && NAME_PARTICLES.has((parts[i - 1] ?? '').toLowerCase())) i--
  return { familyName: parts.slice(i).join(' '), givenName: parts.slice(0, i).join(' ') }
})

/**
 * WIE DIE SCHRIFT MIT DEM NAMEN SCHRUMPFT — UND WORAN SIE MISST
 *
 * Eine Tafel darf nicht abschneiden. Bis zum 14.09.2026 stand hier
 * "Dominik Jastr…" — auf einem Bildschirm, der die ganze Wand hat, ist das
 * kein Platzmangel, sondern ein Fehler. Auch Umbrechen ist keine Lösung:
 * "Linnéa Hjalmarström" auf drei Zeilen schiebt die Zahl aus dem Bild.
 *
 * Also rechnet die Schrift mit — und zwar AM EIGENEN KASTEN und nicht mehr
 * am Fenster.
 *
 * WAS BIS ZUM 16.09.2026 FALSCH WAR: die Maße standen in `dvh` und `vw`,
 * also in Bruchteilen des FENSTERS. Der Platz, den eine Spielerseite
 * wirklich hat, ist aber nur der Kasten über der Zählleiste, und der ist
 * auf einem Zählgerät knapp die Hälfte des Fensters. Je flacher und breiter
 * der Schirm, desto größer wurde die über `vw` gerechnete Schrift bei
 * gleichbleibender Höhe — auf dem iPad des Auftraggebers schnitt die
 * Oberkante der Leiste waagerecht durch den Vornamen. Die Luft darunter war
 * Rest und nicht Absicht: nichts hielt den Fuß über der Kante.
 *
 * WIE ES JETZT RECHNET: `.seite` ist ein Größen-Container (siehe unten im
 * CSS), und jedes Maß hier steht in `cqh`/`cqw` — Hundertsteln der eigenen
 * Spalte. 100 cqw IST die Spaltenbreite, 100 cqh IST die Spaltenhöhe; es
 * wird nichts mehr über das Raster angenommen. Die Summe aller Teile ist
 * unten am Kasten `.seite` einmal durchgerechnet und bleibt unter 100 cqh —
 * damit hält die Aufteilung bei JEDEM Seitenverhältnis und nicht nur bei
 * den Formaten, die zufällig geprüft wurden.
 *
 * DESHALB GIBT ES AUCH KEIN `kompakt` MEHR. Es sagte der Seite von außen,
 * dass unten gezählt wird und sie sich kleiner machen soll. Der Container
 * weiß das von selbst: liegt die Leiste darunter, ist der Kasten niedriger,
 * und alles darin schrumpft im selben Verhältnis mit.
 *
 * VERWORFEN: die Breite im Browser messen (ResizeObserver, canvas.measureText)
 * und danach skalieren. Das misst genauer, kostet aber einen zweiten
 * Durchlauf nach jedem Abruf — auf einem Fernseher sichtbar als Zucken der
 * Namen alle zehn Sekunden. Gerechnet wird serverseitig genauso wie im
 * Browser, und der Name steht beim ersten Bild richtig.
 */
function fontSize(text: string, heightCqh: number, widthCqw: number, density: number): string {
  const chars = Math.max(text.trim().length, 1)
  return `min(${heightCqh}cqh, ${(widthCqw / (chars * density)).toFixed(2)}cqw)`
}

/*
 * DIE DICHTEN SIND AM 16.09.2026 IM BROWSER NACHGEMESSEN (canvas.measureText
 * gegen die wirklich geladene Montserrat, einschließlich der Sperrung).
 *
 * Versalien, Gewicht 800, Sperrung 0,01 em: JASTRZAB 0,720 · KASPER 0,734 ·
 * LOPOTKO 0,761 · HJALMARSTROEM 0,765 · BAUMGARTNER 0,782 · RAMKHELAWAN
 * 0,821 em je Zeichen. Gerechnet wird mit 0,84 — über dem gemessenen
 * Höchstwert, damit die Rechnung im Zweifel zu klein und nie zu groß
 * ausfällt. Hier stand bis dahin 0,80, und "RAMKHELAWAN" lief damit aus der
 * Spalte.
 *
 * 94 statt der vollen 100 cqw aus demselben Grund: ein Name soll die Spalte
 * füllen und nicht an ihr kleben.
 */
const familyNameFontSize = computed(() =>
  fontSize(nameParts.value.familyName, 11, 94, 0.84))

/*
 * Der Vorname, gemischt gesetzt, Gewicht 500: gemessen 0,565 (Konstantin)
 * bis 0,673 em je Zeichen (Ramkhelawan). Gerechnet mit 0,69 — auch hier
 * stand mit 0,62 ein Wert UNTER dem gemessenen Höchstmaß.
 *
 * Er ist außerdem an den Nachnamen GEBUNDEN und nie größer als etwas über
 * die Hälfte davon. Ohne die Bindung war er auf einem hochkanten Tablet
 * größer als der Nachname darüber: dort greift beim langen Nachnamen die
 * Breite, beim kurzen Vornamen aber die Höhe, und "Sandra" stand doppelt so
 * groß da wie "BAUMGARTNER".
 */
const givenNameFontSize = computed(() =>
  `min(${fontSize(nameParts.value.givenName, 6, 92, 0.69)}, `
  + `calc(0.58 * ${familyNameFontSize.value}))`)

/**
 * Der Stand ist das größte Element der Tafel, und zwar mit Abstand — er
 * wird aus fünf Metern gelesen, der Name erst aus dreien. Auch er rechnet
 * mit: `displayScore` ist nicht immer eine Ziffer, sondern bei einer
 * Aufgabe "FF" und bei einer Disqualifikation "DIS", und drei Zeichen in
 * voller Höhe stünden über dem Kastenrand.
 */
const scoreFontSize = computed(() =>
  /*
   * 64 cqw als zweite Schranke, und nicht nur die 42 cqh: hochkant ist die
   * Spalte schmal und hoch, und ohne die Schranke stießen die beiden Stände
   * in der Mitte an die Tischnummer. Quer greift sie nicht — dort ist die
   * Höhe das knappere Maß. Dichte 0,67 deckt die schmalste Möglichkeit ab
   * (die einzelne "0" misst 0,662 em; "DIS" braucht je Zeichen nur 0,581).
   */
  `min(64cqw, ${fontSize(props.side.displayScore || '0', 42, 94, 0.67)})`)

/** Verband vor Staatsangehörigkeit — dieselbe Regel wie in ScoreCard. */
const country = computed(() => props.side.representsCountry ?? props.side.nationality)
</script>

<template>
  <div class="seite" :class="`seite--${align}`">
    <!--
      Zahl und Anstoßbalken bilden EINE Gruppe. Der Balken hängt damit
      unter der Zahl dessen, der anstößt, und nicht irgendwo neben dem
      Namen — im Vorgängersystem ist das die auffälligste Angabe nach dem
      Stand, weil sie den nächsten Stoß ankündigt.
    -->
    <div class="seite__kopf">
      <p class="seite__stand" :style="{ fontSize: scoreFontSize }">
        {{ side.displayScore || '0' }}
        <!--
          DER SHOOT-OUT-PUNKT — als Zeichen ÜBER der Zahl und nicht als neue
          Zeile: die Zeilenhöhen der Spalte sind bis auf 11,4 cqh Reserve
          ausgerechnet (siehe die Tabelle im CSS unten), und eine feste
          Zeile für einen Fall, der nur beim Heyball-Zeitlimit und dort auch
          nur bei Gleichstand vorkommt, würde diese Reserve dauerhaft
          verbrauchen. Absolut positioniert kostet das Zeichen keine Höhe.

          EIN WORT UND KEIN SYMBOL, aus demselben Grund wie beim
          Anstoßbalken: ein Punkt oder ein Stern müsste erklärt werden, und
          neben dem Tisch steht keine Legende. "shoot-out" bleibt Fachbegriff.
        -->
        <span v-if="side.shootoutWinner" class="seite__shootout">shoot-out</span>
      </p>
      <!--
        Der Balken ist immer im Dokument, nur unsichtbar, wenn diese Seite
        nicht anstößt: sonst rücken Zahl und Name bei jedem Wechsel des
        Anstoßes um seine Höhe, und ein Bild, das alle paar Minuten
        springt, sieht im Saal nach einem Defekt aus.
      -->
      <p class="seite__anstoss" :class="{ 'seite__anstoss--an': breaking }" :aria-hidden="!breaking">
        Break
      </p>

      <!--
        Die Auszeit-Uhr. Sie kommt und geht, deshalb steht sie UNTER dem
        Anstoßbalken und nicht darüber: so rücken weder Zahl noch Balken,
        wenn sie erscheint.
      -->
      <!--
        DIE AUFNAHME — zwei kleine Zahlen unter dem Anstossbalken.

        WARUM HIER UND NICHT BEI DEN NAMEN: sie gehören zum STAND und nicht
        zum Spieler. Wer aus zehn Metern auf die Tafel sieht, liest die
        grosse Zahl, und die nächste Auskunft, die er sucht, ist „läuft da
        gerade was?" — die steht damit im selben Blick und eine Zeile
        darunter. Unten bei Flagge und Name wäre sie eine Fussnote.

        WARUM SIE DEN STAND NICHT STÖRT: sie ist rund ein Zehntel so gross
        wie er, sie steht unter dem Anstossbalken (der ohnehin schon dort
        liegt), und ihr Platz ist RESERVIERT — auch wenn beide Zahlen null
        sind, bleibt die Zeile stehen und ist nur unsichtbar. Sonst rückten
        Name und Flagge bei der ersten versenkten Kugel jeder Partie um ihre
        Höhe nach unten, und ein Bild, das ruckt, sieht im Saal nach einem
        Defekt aus. Dieselbe Überlegung wie beim Anstossbalken darüber.

        DIE LAUFENDE AUFNAHME IN DER AKZENTFARBE, der High run gedämpft: die
        eine verändert sich vor den Augen des Publikums, die andere steht.
      -->
      <p
        v-if="inning"
        class="seite__lauf"
        :class="{ 'seite__lauf--leer': !inning.current && !inning.high }"
      >
        <span v-if="inning.current" class="seite__lauf-jetzt">Run {{ inning.current }}</span>
        <span v-if="inning.high" class="seite__lauf-high">High {{ inning.high }}</span>
        <!-- Der Platzhalter trägt die Höhe, wenn beide Zahlen fehlen. -->
        <span v-if="!inning.current && !inning.high" class="seite__lauf-high">High 0</span>
      </p>

      <p
        v-if="timeout"
        class="seite__auszeit"
        :class="{ 'seite__auszeit--ueber': timeout.overrun }"
      >
        Time out {{ timeout.text }}
      </p>
    </div>

    <!--
      Der Name unten, die Flagge darüber und groß. Unten, weil oben der
      Stand steht und die Mitte dem Turnier gehört; groß, weil die Flagge
      aus der Entfernung früher erkannt wird als der Name.
    -->
    <div class="seite__fuss">
      <UiCountryTag :country="country" class="seite__flagge" />
      <p class="seite__nachname" :style="{ fontSize: familyNameFontSize }">
        {{ nameParts.familyName }}
      </p>
      <p v-if="nameParts.givenName" class="seite__vorname" :style="{ fontSize: givenNameFontSize }">
        {{ nameParts.givenName }}
      </p>
    </div>
  </div>
</template>

<style scoped>
/*
 * Die Farben kommen von der Tafel (--ink, --ink-dim, --accent) und werden
 * hier NICHT noch einmal gesetzt: sie gehören dem Bildschirm und nicht der
 * Seite darauf.
 */
/*
 * DIESE SPALTE IST DER MASSSTAB FÜR ALLES, WAS IN IHR STEHT.
 *
 * `container-type: size` macht `.seite` zum Größen-Container: 100 cqw ist
 * ihre Breite, 100 cqh ihre Höhe — beides der Kasten, den das Raster ihr
 * wirklich gibt, und nicht das Fenster. Jede Schriftgröße hier und im
 * Skript oben misst daran.
 *
 * DIE RECHNUNG, DIE DEN FUSS ÜBER DER ZÄHLLEISTE HÄLT. Im schlimmsten Fall
 * — Auszeit läuft, Aufnahme steht, Anstoßbalken sichtbar — steht in dieser
 * Spalte übereinander:
 *
 *   Stand        42,0 cqh × 0,82 Zeilenhöhe            = 34,4 cqh
 *   Anstoß        1,8 Abstand + 1,4 Polster + 4,2×1,2  =  8,2 cqh
 *   Aufnahme      1,2 Abstand + 3,6×1,2                =  5,5 cqh
 *   Auszeit       1,4 Abstand + 4,2×(1,2+0,6+0,16)     =  9,6 cqh
 *   Flagge       11,0 cqh × 1,0                        = 11,0 cqh
 *   Nachname      1,6 Abstand + 11,0×1,02              = 12,8 cqh
 *   Vorname       0,5 Abstand + 6,0×1,1                =  7,1 cqh
 *                                                       ---------
 *                                                        88,6 cqh
 *
 * Es bleiben 11,4 cqh übrig — genug für EINE umgebrochene Nachnamenzeile
 * (11,2 cqh), falls die Breitenrechnung oben einen Namen doch unterschätzt.
 * Erst dann wäre der Kasten voll; darunter liegt zusätzlich das Polster von
 * `.board__partie`, und das ist der garantierte Abstand zur Leistenkante.
 *
 * WER HIER EIN MASS ÄNDERT, RECHNET DIESE TABELLE NEU.
 */
.seite {
  container-type: size;
  container-name: seite;

  display: flex;
  flex-direction: column;
  /* Zahl nach oben, Name nach unten, der Rest ist Luft. So stehen die
     beiden Stände auf gleicher Höhe, auch wenn nur eine Seite anstößt. */
  justify-content: space-between;
  min-width: 0;
  height: 100%;
}

.seite--start {
  align-items: flex-start;
  text-align: left;
}

.seite--end {
  align-items: flex-end;
  text-align: right;
}

.seite__kopf,
.seite__fuss {
  display: flex;
  flex-direction: column;
  /* Volle Spaltenbreite und nicht Inhaltsbreite: der Anstoßbalken misst
     sich an der Spalte und nicht an der Ziffer darüber — sonst wäre er
     bei einer "1" halb so breit wie bei einer "10". */
  width: 100%;
  min-width: 0;
}

.seite--start .seite__kopf,
.seite--start .seite__fuss {
  align-items: flex-start;
}

.seite--end .seite__kopf,
.seite--end .seite__fuss {
  align-items: flex-end;
}

.seite__stand {
  position: relative;
  margin: 0;
  font-weight: 900;
  /* Dicht gesetzt: bei dieser Größe ist der Zeilenabstand sonst mehr
     Fläche als die Ziffer selbst. */
  line-height: 0.82;
  letter-spacing: -0.03em;
}

/*
 * DAS SHOOT-OUT-ZEICHEN — absolut über der Zahl, kostet keine cqh.
 *
 * Feste kleine Größe und nicht an `scoreFontSize` gebunden: die Zahl reicht von
 * einer Ziffer bis "DIS", und das Zeichen soll bei jeder Größe gleich klein
 * und gleich lesbar bleiben.
 */
.seite__shootout {
  position: absolute;
  top: -1.4cqh;
  padding: 0.3cqh 0.9cqh;
  border-radius: 0.4cqh;
  background: var(--accent);
  color: #00222f;
  font-size: clamp(0.5rem, 3cqh, 0.95rem);
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  white-space: nowrap;
}

.seite--start .seite__shootout {
  left: 0;
}

.seite--end .seite__shootout {
  right: 0;
}

/*
 * DER ANSTOSSBALKEN
 *
 * Breit und nicht als kleines Etikett neben dem Namen: er sagt, wer den
 * nächsten Satz beginnt, und das ist für den Zuschauer am Tisch die
 * zweitwichtigste Angabe der Tafel. Ein Wort und kein Symbol — ein Pfeil
 * oder ein Punkt muss erklärt werden, und neben dem Tisch steht keine
 * Legende.
 */
.seite__anstoss {
  margin: 1.8cqh 0 0;
  padding: 0.7cqh 0;
  width: 85%;
  min-width: 6em;
  border-radius: 0.5cqh;
  background: var(--accent);
  color: #00222f;
  /* "BREAK" misst mit der Sperrung rund 5,1 em; 14 cqw lassen ihm 71 der
     85 cqw, die der Balken breit ist. */
  font-size: min(4.2cqh, 14cqw);
  font-weight: 800;
  letter-spacing: 0.3em;
  /* Die Sperrung schiebt das letzte Zeichen nach links aus der Mitte. */
  text-indent: 0.3em;
  text-align: center;
  text-transform: uppercase;
  /* Nur die Sichtbarkeit wechselt, nicht der Platz — siehe Vorlage. */
  visibility: hidden;
}

.seite__anstoss--an {
  visibility: visible;
}

/*
 * Die Auszeit: umrandet, solange sie läuft, gefüllt, sobald sie überzogen
 * ist. Nicht von Anfang an gefüllt wie der Anstoßbalken — zwei gefüllte
 * Balken übereinander auf derselben Seite wären zwei gleich laute Zeichen
 * für zwei verschiedene Dinge, und das laute gehört dem Überziehen.
 *
 * Es blinkt nicht. Ein blinkendes Feld auf einem Bildschirm, der stundenlang
 * läuft, ist eine Zumutung — und für Menschen mit Anfallsleiden mehr als
 * das.
 */
.seite__auszeit {
  margin: 1.4cqh 0 0;
  padding: 0.3em 0.8em;
  border: 0.08em solid var(--accent);
  border-radius: 0.4cqh;
  color: var(--accent);
  /* "TIME OUT 0:30" misst mit Polster rund 11,2 em — 8,5 cqw halten es in
     der Spalte, auch hochkant. */
  font-size: min(4.2cqh, 8.5cqw);
  font-weight: 800;
  letter-spacing: 0.06em;
  line-height: 1.2;
  text-transform: uppercase;
  white-space: nowrap;
}

/*
 * Die Aufnahme. Eine Zeile, zwei Zahlen, beide klein — sie stehen unter
 * einer Ziffer, die fünfzehnmal so hoch ist, und das Verhältnis ist die
 * Aussage: der Stand entscheidet die Partie, die Aufnahme erzählt sie.
 *
 * `nowrap`: „Run 112 High 112" darf nicht umbrechen, sonst schiebt die
 * zweite Zeile den Namen nach unten — genau das, was die reservierte Höhe
 * verhindern soll.
 */
.seite__lauf {
  display: flex;
  gap: 0.9em;
  margin: 1.2cqh 0 0;
  /* "RUN 112 HIGH 112" misst mit Sperrung und Lücke rund 12,9 em; 7 cqw
     halten die Zeile in der Spalte — sie trägt `nowrap`. */
  font-size: min(3.6cqh, 7cqw);
  font-weight: 700;
  letter-spacing: 0.08em;
  line-height: 1.2;
  text-transform: uppercase;
  white-space: nowrap;
}

.seite--end .seite__lauf {
  justify-content: flex-end;
}

/* Leer heisst unsichtbar und nicht fort — der Platz bleibt. */
.seite__lauf--leer {
  visibility: hidden;
}

.seite__lauf-jetzt {
  color: var(--accent);
}

.seite__lauf-high {
  color: var(--ink-dim);
}

.seite__auszeit--ueber {
  border-color: var(--color-danger, #ff5252);
  background: var(--color-danger, #ff5252);
  color: #2b0000;
}

.seite__flagge {
  /* Die Flagge misst in UiCountryTag 1.33 em breit und 1 em hoch; über den
     Schriftgrad hier bekommt sie ihre Größe, ohne dass die Komponente
     davon wissen müsste. 60 cqw heisst: höchstens 80 cqw breit. */
  font-size: min(11cqh, 60cqw);
  line-height: 1;
}

.seite__flagge :deep(.country-tag__flag) {
  border-radius: 0.06em;
  /* Auf dunklem Grund verschwände sonst der Rand heller Flaggen (Polen,
     Japan); der Wert aus der Komponente ist für weißen Grund gerechnet. */
  box-shadow: 0 0 0 0.02em rgb(255 255 255 / 35%);
}

.seite__nachname {
  margin: 1.6cqh 0 0;
  max-width: 100%;
  font-weight: 800;
  line-height: 1.02;
  letter-spacing: 0.01em;
  text-transform: uppercase;
  /* Notnagel unter der gerechneten Schrift: ein Name, den die Rechnung
     unterschätzt, bricht um — abgeschnitten wird auf einer Tafel nichts. */
  overflow-wrap: anywhere;
}

.seite__vorname {
  margin: 0.5cqh 0 0;
  max-width: 100%;
  font-weight: 500;
  line-height: 1.1;
  color: var(--ink-dim);
  overflow-wrap: anywhere;
}

/*
 * HOCHKANT: DIE TAFEL BLEIBT SYMMETRISCH
 *
 * Ein Tablet am Tisch steht manchmal hochkant. Die Anordnung umzuwerfen
 * (untereinander statt nebeneinander) hieße, zwei verschiedene Tafeln zu
 * pflegen und dem Zuschauer je nach Gerät ein anderes Bild zu zeigen. Die
 * Spalten bleiben also, sie werden nur schmaler — und weil jedes Maß ein
 * `min(..cqh, ..cqw)` ist, greift dabei von selbst die Breite. Hier nur, was
 * die Rechnung nicht abdeckt: der Balken braucht die volle Spalte, und die
 * Flagge darf nicht größer sein als der Name darunter.
 */
@media (max-aspect-ratio: 1 / 1) {
  /* Hochkant ist die Spalte deutlich niedriger (die Tafel begrenzt sie dort
     auf 62 dvh, siehe [table].vue) und der Inhalt füllt sie nicht aus;
     "space-between" zöge die Blöcke dann auseinander, dieser Abstand hält
     sie zusammen. */
  .seite {
    gap: 5cqh;
  }

  .seite__anstoss {
    width: 100%;
    letter-spacing: 0.12em;
    text-indent: 0.12em;
  }

  .seite__flagge {
    font-size: min(11cqh, 45cqw);
  }
}
</style>
