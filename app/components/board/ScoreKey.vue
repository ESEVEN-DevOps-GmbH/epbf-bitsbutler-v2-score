<script setup lang="ts">
/**
 * EINE FLÄCHE DER ZÄHLLEISTE.
 *
 * Es gibt zehn davon auf der Tafel, und ohne ein eigenes Bauteil stünden
 * Mindestgröße, Sperrzustand und Tastenhinweis zehnmal in derselben Datei.
 *
 * WIE GROSS — UND WARUM GEMESSEN UND NICHT GESCHÄTZT
 *
 * Bedient wird im Stehen, am Tisch, mit Kreide an den Fingern; das Gerät
 * steht auf einem Ständer und wird nicht in der Hand gehalten. Die
 * Untergrenze für so etwas ist keine Geschmacksfrage: die üblichen 44 px
 * gelten für ein Telefon in der Hand bei ruhigem Blick. Hier sind es
 * mindestens 9 vh (bei 768 px Höhe knapp 70 px, auf einem Fernseher
 * entsprechend mehr) und die Beschriftung gross genug, dass man sie im
 * Vorbeigehen liest und nicht sucht.
 *
 * WAS GESPERRT IST, BLEIBT STEHEN UND SAGT WARUM
 *
 * Eine Fläche, die verschwindet, sobald sie nicht geht, wandert der Hand
 * unter dem Finger weg — und hinterlässt die Frage, wo sie hin ist. Sie
 * bleibt also liegen, wird blass, und der Grund steht als zweite Zeile
 * darin. "Nobody has reached 9 yet" ist eine bessere Auskunft als ein Knopf,
 * den es nicht mehr gibt.
 */
const props = defineProps<{
  /** Die grosse Zeile — ein Zeichen oder ein Wort, nie ein Satz. */
  label: string
  /** Die kleine Zeile darunter: Zustand oder Grund. Leer heisst: keine. */
  hint?: string
  /**
   * Die Taste des Vorgängersystems, die dasselbe tut. Sie steht klein in
   * der Ecke, weil in den Hallen Fernbedienungen mit Zifferblock liegen und
   * die Zählenden diese Belegung seit Jahren kennen.
   */
  key?: string
  /** `gross` füllt die Zeile, `schmal` steht daneben. */
  width?: 'gross' | 'schmal' | 'voll'
  /** `plus` zählt hoch, `minus` nimmt zurück, `ende` beendet. */
  kind?: 'plus' | 'minus' | 'ende' | 'neutral'
  locked?: boolean
  /** Solange etwas unterwegs ist, zeigt die ganze Leiste, dass sie arbeitet. */
  busy?: boolean
}>()

/**
 * WIE BREIT DARF DIE SCHRIFT HÖCHSTENS WERDEN — GERECHNET AN DIESER FLÄCHE.
 *
 * Eine Fläche weiss, wie breit sie ist (sie ist ihr eigener Container, siehe
 * CSS), und sie weiss, was auf ihr steht. Daraus folgt der grösste
 * Schriftgrad, bei dem die Beschriftung noch hineinpasst. Das Ergebnis
 * steht als Kennwert am Knopf; welcher der beiden Werte am Ende gilt — die
 * Höhe oder diese Breite — entscheidet das `min()` im CSS.
 *
 * ALS KENNWERT UND NICHT ALS SCHRIFTGRÖSSE DIREKT: eine Schriftgröße im
 * `style`-Attribut schlägt jede Regel aus einer Datei, und die beiden Bänder
 * der Straight-Pool-Leiste brauchen ein EINHEITLICHES Maß über alle Flächen
 * der Reihe (sonst stünde „RACK" gross neben einem kleinen „BREAK FOUL ·
 * ACCEPT"). So können sie es überschreiben.
 *
 * Die Dichten sind am 16.09.2026 nachgemessen: Versalien in Montserrat 700
 * mit Sperrung 0,04 em belegen 0,658 („BREAK FOUL · AGAIN") bis 0,706
 * („SAFETY") em je Zeichen, der Hinweis in Gewicht 600 deren 0,584 bis
 * 0,611. Gerechnet wird über dem Höchstwert.
 */
function fitFontSize(text: string, share: number, density: number): string {
  const chars = Math.max(text.trim().length, 1)
  return `${(share / (chars * density)).toFixed(2)}cqw`
}

/* 92 statt 100 cqw: die Beschriftung soll nicht am Rand kleben. */
const labelFontSize = computed(() => fitFontSize(props.label, 92, 0.72))

/*
 * Der Hinweis darf umbrechen, deshalb 170 statt 92: er bekommt knapp zwei
 * Zeilen zugestanden. Drei Zeilen wären nicht falsch, aber sie machen die
 * Fläche höher, und die Leiste nimmt der Tafel darüber die Höhe weg.
 */
const hintFontSize = computed(() => fitFontSize(props.hint ?? '', 170, 0.63))
</script>

<template>
  <button
    type="button"
    class="taste"
    :class="[
      `taste--${width ?? 'gross'}`,
      `taste--${kind ?? 'neutral'}`,
      { 'taste--aus': locked, 'taste--tut': busy },
    ]"
    :disabled="locked || busy"
    :style="{ '--wort-breite': labelFontSize, '--hinweis-breite': hintFontSize }"
  >
    <span class="taste__wort">{{ label }}</span>
    <span v-if="hint" class="taste__hinweis">{{ hint }}</span>
    <span v-if="key" class="taste__taste" aria-hidden="true">{{ key }}</span>
  </button>
</template>

<style scoped>
/*
 * JEDE FLÄCHE IST IHR EIGENER MASSSTAB.
 *
 * `container-type: inline-size` macht die Fläche zum Breiten-Container:
 * 100 cqw ist ihr Innenmaß. Die Beschriftungen rechnen daran und nicht mehr
 * in `vw` — in `vw` rechneten sie am FENSTER, während die Fläche selbst nur
 * ein Fünftel oder Sechstel davon breit ist.
 *
 * WAS DAS AM 16.09.2026 ANRICHTETE: im Straight-Pool-Band galt
 * `min(1.95dvh, 1.3vw)`. Eine Fläche dieses Bandes ist rund 15 vw breit
 * (die Leiste gibt 93 vw her, geteilt durch sechs, abzüglich der Lücken),
 * und „Break foul · accept" misst nachgemessene 12,61 em — also 16,4 vw bei
 * 1,3 vw Schriftgrad. Der vw-Zweig lief damit bei JEDEM Fenster über; dass
 * es am Schreibtisch trotzdem hielt, lag allein daran, dass dort der
 * dvh-Zweig kleiner ist und gewinnt. Sobald der Schirm hoch genug wurde
 * (iPad im Vollbild, 1180 × 820, Verhältnis 0,70 > 0,667), gewann der
 * vw-Zweig — und die Beschriftung stand aus ihrem Kasten heraus.
 *
 * NUR `inline-size` und nicht `size`: die Höhe der Fläche wächst mit ihrem
 * Inhalt (der Hinweis darf zweizeilig werden), und ein Größen-Container
 * gäbe seine Inhaltshöhe nicht mehr an die Rasterzeile zurück.
 */
.taste {
  container-type: inline-size;
  container-name: taste;

  position: relative;
  display: flex;
  flex: 1 1 auto;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.3dvh;
  /* Die Untergrenze in Pixeln NEBEN dem vh-Mass: auf einem kleinen Tablet
     wären 9 vh sonst 55 px, und das trifft niemand mit Kreide am Finger. */
  min-height: max(9dvh, 64px);
  padding: 0.6dvh 1dvh;
  border: 2px solid var(--line);
  border-radius: 1dvh;
  background: #0b1220;
  color: var(--ink);
  font-family: inherit;
  cursor: pointer;
  /* Kein Hervorheben beim Doppeltippen und keine 300-ms-Bremse: das Gerät
     wird schnell und wiederholt getippt. */
  user-select: none;
  touch-action: manipulation;
}

.taste--schmal {
  flex: 0 0 auto;
  width: max(9dvh, 64px);
}

/*
 * Volle Breite, aber NICHT volle Höhe: `flex-grow` hätte die Auszeit-Fläche
 * so hoch gemacht wie die drei Flächen der Mitte daneben, und ein Knopf, der
 * ein Viertel der Tafel einnimmt, weil die Spalte nebenan länger ist, sieht
 * aus wie ein Fehler im Raster.
 */
.taste--voll {
  flex: 0 0 auto;
  width: 100%;
  min-height: max(6dvh, 46px);
}

/*
 * DIE FARBEN SAGEN, WAS PASSIERT, UND NICHT, WIE WICHTIG ES IST
 *
 * Zählen ist die Bewegung, die hundertmal am Tag vorkommt — sie bekommt die
 * Akzentfarbe der Tafel und damit dieselbe Farbe wie der Anstoßbalken
 * darüber. Zurücknehmen ist die Gegenbewegung und steht umrandet statt
 * gefüllt: sie soll erkennbar sein und nicht einladend. Rot ist hier
 * ausdrücklich NICHT vergeben — rot heisst auf dieser Tafel "hier fehlt
 * etwas", und ein Zurücknehmen ist kein Mangel.
 */
.taste--plus {
  border-color: var(--accent);
  background: var(--accent);
  color: #00222f;
  font-weight: 800;
}

.taste--minus {
  border-color: var(--ink-dim);
  color: var(--ink-dim);
}

.taste--ende {
  border-color: var(--color-success, #33cb81);
  background: var(--color-success, #33cb81);
  color: #04240f;
  font-weight: 800;
}

.taste__wort {
  font-size: min(3.4dvh, var(--wort-breite, 100cqw));
  font-weight: 700;
  letter-spacing: 0.04em;
  line-height: 1;
  text-transform: uppercase;
  white-space: nowrap;
}

.taste--plus .taste__wort,
.taste--ende .taste__wort {
  font-size: min(4.2dvh, var(--wort-breite, 100cqw));
}

.taste__hinweis {
  max-width: 100%;
  font-size: min(1.9dvh, var(--hinweis-breite, 100cqw));
  font-weight: 600;
  letter-spacing: 0.04em;
  line-height: 1.15;
  text-align: center;
  text-transform: uppercase;
  opacity: 0.75;
}

.taste__taste {
  position: absolute;
  top: 0.4dvh;
  right: 0.6dvh;
  font-size: min(1.7dvh, 12cqw);
  font-weight: 700;
  opacity: 0.45;
}

/*
 * Gesperrt: blass, aber nicht weg — und der Zeiger sagt es auch. `disabled`
 * allein nimmt dem Knopf jede Rückmeldung; wer nicht sieht, DASS er gesperrt
 * ist, tippt weiter.
 */
.taste--aus {
  opacity: 0.4;
  cursor: not-allowed;
}

.taste--tut {
  cursor: progress;
  /* Nur gedämpft und nicht blass wie gesperrt: es geht gleich weiter. */
  opacity: 0.7;
}

/*
 * Der Druck muss zu sehen sein, bevor die Antwort da ist. Ohne diese
 * Rückmeldung tippt jemand, dessen Netz hakt, ein zweites Mal — und das ist
 * genau der Fehler, den diese Leiste nicht machen darf.
 */
.taste:active:not(:disabled) {
  transform: translateY(0.4dvh);
  filter: brightness(1.25);
}
</style>
