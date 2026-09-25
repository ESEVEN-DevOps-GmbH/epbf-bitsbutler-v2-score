<script setup lang="ts">
import type { Side, ScorePair } from '~/composables/useScoring'

/**
 * DIE BALLWERTE — SNOOKER, SEIT DEM 25.09.2026.
 *
 * WARUM ES DIESE FLÄCHE ÜBERHAUPT GIBT UND NICHT DEN GEWOHNTEN ZIFFERBLOCK
 *
 * `BoardZaehlleiste` zählt in Sätzen bzw. Racks: ihr "+1" schreibt den
 * ABSOLUTEN Stand über `PUT /matches/{id}/score`, und ohne Satzformat
 * (`Match.setRaceTo === null`, und das gilt bei Snooker IMMER — siehe dort)
 * geht dieser Stand direkt nach `match_slot.score`, der Zahl der GEWONNENEN
 * FRAMES. Ein "+1" auf dieser Fläche schriebe also ein gewonnenes Frame gut,
 * das niemand bestätigt hat — bei einem Ballwert von "5" wäre das sogar
 * bei jedem versenkten blauen Ball ein einziges Frame Vorsprung.
 *
 * Snooker zählt anders: nicht Racks, sondern PUNKTE JE BALL innerhalb eines
 * Frames (rot 1, gelb 2, grün 3, braun 4, blau 5, rosa 6, schwarz 7 —
 * WPBSA-Regelwerk), und ein Frame endet nicht an einer Zahl, sondern wenn
 * keine Bälle mehr liegen und der Rückstand uneinholbar ist. Dafür gibt es
 * in der Verwaltung keinen Zwischenstand: `match_slot.set_score` wird
 * serverseitig nur beschrieben, wenn `set_race_to` gesetzt ist
 * (`MatchController.setScore`), und das ist bei einem Frame nie der Fall.
 *
 * DIESE FLÄCHE SCHICKT DESHALB NICHTS AN DIE VERWALTUNG. Sie meldet nur,
 * WAS AM TISCH PASSIERT IST — welcher Ball fiel, wessen Foul es war — und
 * [table].vue führt daraus den laufenden Frame-Stand rein im Gerät (siehe
 * `frameStand` dort). Bestätigt und damit dauerhaft wird erst der
 * AUSSENSTAND, wenn das Schiedsrichtermenü das Frame ausdrücklich
 * abschliesst ("Confirm frame", mit genanntem Gewinner).
 *
 * WARUM EINE EIGENE FLÄCHE UND NICHT DER ZIFFERBLOCK DER LEISTE
 *
 * Die Tastenbelegung von `BoardZaehlleiste` ist gewachsen und in den Hallen
 * eingeübt — Ziffer 7 zählt links hoch, 4 und 6 sind die Auszeiten. Sieben
 * Ballwerte auf dieselben zehn Tasten zu legen hiesse, mindestens eine
 * davon umzudeuten, und genau das soll hier NICHT passieren: die
 * vorhandenen Tasten bleiben, was sie sind, auch wenn diese Fläche sie für
 * Snooker ersetzt. Farbe statt Ziffer ist ausserdem die Auskunft, die am
 * Tisch wirklich gebraucht wird — ein Schiedsrichter sieht die Farbe des
 * Balls, nicht seine laufende Nummer.
 */
const props = defineProps<{
  /** Welche Seite der Partie links auf dem Schirm steht — siehe Spiegel. */
  left: Side
  right: Side
  /** Der laufende Frame-Stand, rein im Gerät geführt — siehe Kopf. */
  score: ScorePair
  /** Ob ein lokaler Schritt zum Zurücknehmen dasteht. */
  canUndo: boolean
}>()

const emit = defineEmits<{
  /** Ein Ball ist gefallen — legal versenkt von `side`. */
  pot: [side: Side, value: number]
  /** Ein Foul von `side` — die Punkte gehen an den Gegner, siehe [table].vue. */
  foul: [side: Side, points: number]
  /** Den letzten lokalen Eintrag zurücknehmen. */
  undo: []
}>()

/**
 * DIE SIEBEN BÄLLE — Wert, Wort und Farbe, in der Reihenfolge des
 * Regelwerks (WPBSA) und nicht nach Häufigkeit: ein Schiedsrichter sucht
 * "blau" an der Stelle, an der er es aus jeder Snookerhalle kennt.
 *
 * DIE FARBEN SIND DIE DER BÄLLE UND NICHT DIE DER TAFEL — ausdrücklich eine
 * Ausnahme von `--accent`/`--ink-dim`: die Farbe IST hier die Auskunft, und
 * eine Tafel, die "blau" in Türkis (der Akzentfarbe) zeichnete, würde genau
 * die Zuordnung verwischen, um die es geht.
 */
const BALLS: { value: number, word: string, color: string, light: boolean }[] = [
  { value: 1, word: 'Red', color: '#c62828', light: true },
  { value: 2, word: 'Yellow', color: '#f2c40c', light: false },
  { value: 3, word: 'Green', color: '#1e7d3c', light: true },
  { value: 4, word: 'Brown', color: '#6b4226', light: true },
  { value: 5, word: 'Blue', color: '#1a5fb4', light: true },
  { value: 6, word: 'Pink', color: '#e0759a', light: false },
  { value: 7, word: 'Black', color: '#1a1a1a', light: true },
]

/**
 * DIE FOULWERTE — MINDESTENS VIER, SONST DER WERT DES BETROFFENEN BALLS.
 *
 * Aus den sieben Bällen bleiben genau vier Zahlen übrig: 1, 2 und 3 liegen
 * unter dem Mindestsatz und kommen als Foulwert nie vor, 4 ist der
 * Mindestsatz selbst (er gilt für ein Foul an Rot, Gelb, Grün oder Braun
 * gleichermassen). Vier Flächen und nicht sieben — eine für "Blau" und eine
 * für "Foul an Rot" nebeneinander wäre für dieselbe Handlung zwei
 * verschiedene Kacheln.
 */
const FOULS: { value: number, word: string }[] = [
  { value: 4, word: 'Foul' },
  { value: 5, word: 'Foul · blue' },
  { value: 6, word: 'Foul · pink' },
  { value: 7, word: 'Foul · black' },
]
</script>

<template>
  <div class="ballwerte">
    <p v-if="canUndo" class="ballwerte__kopf">
      <button type="button" class="ballwerte__zurueck" @click="emit('undo')">
        Undo last entry
      </button>
    </p>

    <div class="ballwerte__spalten">
      <div v-for="side in [left, right]" :key="`ball-${side}`" class="ballwerte__seite">
        <p class="ballwerte__stand">{{ score[side] }}</p>

        <div class="ballwerte__reihe">
          <button
            v-for="ball in BALLS" :key="`${side}-${ball.value}`"
            type="button" class="ballwerte__ball"
            :class="{ 'ballwerte__ball--hell': ball.light }"
            :style="{ background: ball.color }"
            @click="emit('pot', side, ball.value)"
          >
            <span class="ballwerte__wert">{{ ball.value }}</span>
            <span class="ballwerte__wort">{{ ball.word }}</span>
          </button>
        </div>

        <div class="ballwerte__reihe ballwerte__reihe--foul">
          <button
            v-for="f in FOULS" :key="`${side}-foul-${f.value}`"
            type="button" class="ballwerte__foul"
            @click="emit('foul', side, f.value)"
          >
            {{ f.word }} (+{{ f.value }})
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/*
 * DIESELBE ZEILE WIE DIE GEWOHNTE ZÄHLLEISTE — [table].vue weist ihr
 * dieselbe Rasterzeile zu (`.board__zaehlleiste`, `grid-row: 3`); beide
 * erscheinen nie gleichzeitig.
 */
.ballwerte {
  display: flex;
  flex-direction: column;
  gap: 0.6dvh;
  padding: 0 3.5vw 1dvh;
}

.ballwerte__kopf {
  display: flex;
  justify-content: center;
  margin: 0;
}

.ballwerte__zurueck {
  padding: 0.4dvh 1.2dvh;
  border: 2px solid var(--ink-dim);
  border-radius: 0.6dvh;
  background: none;
  color: var(--ink-dim);
  font-family: inherit;
  font-size: min(1.8dvh, 1.6vw);
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  cursor: pointer;
}

/* Dasselbe Zweispaltenraster wie `.board__partie` und `.leiste__spalten`. */
.ballwerte__spalten {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: 0 2vw;
  padding-top: 1.2dvh;
  border-top: 2px solid var(--line);
}

.ballwerte__seite {
  display: flex;
  flex-direction: column;
  gap: 0.6dvh;
  min-width: 0;
}

.ballwerte__stand {
  margin: 0;
  font-size: min(2.4dvh, 2.2vw);
  font-weight: 800;
  color: var(--ink-dim);
  text-align: center;
}

.ballwerte__reihe {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5dvh;
  justify-content: center;
}

/*
 * DIE SIEBEN BALLFLÄCHEN — quadratisch, in der Farbe des Balls, mit dem
 * Wert gross darüber. `hell`/dunkel entscheidet die Schriftfarbe: Weiss auf
 * Schwarz und Grün liest sich, Weiss auf Gelb oder Rosa nicht.
 */
.ballwerte__ball {
  display: flex;
  flex: 0 0 auto;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.1dvh;
  width: max(7.5dvh, 52px);
  min-height: max(7.5dvh, 52px);
  border: 2px solid rgb(255 255 255 / 25%);
  border-radius: 0.8dvh;
  color: #101010;
  font-family: inherit;
  cursor: pointer;
  touch-action: manipulation;
  user-select: none;
}

.ballwerte__ball--hell {
  color: #f5f5f5;
}

.ballwerte__wert {
  font-size: min(2.6dvh, 2.4vw);
  font-weight: 900;
  line-height: 1;
}

.ballwerte__wort {
  font-size: min(1.1dvh, 1vw);
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  opacity: 0.85;
}

/*
 * DIE FOULFLÄCHEN — umrandet und nicht gefüllt, wie das Zurücknehmen in
 * `ScoreKey.vue`: sie sollen erkennbar, aber nicht einladend wirken. Ein
 * Foul ist kein Ereignis, das man anstrebt.
 */
.ballwerte__foul {
  flex: 1 1 auto;
  min-width: max(11dvh, 76px);
  padding: 0.6dvh 0.4dvh;
  border: 2px solid var(--ink-dim);
  border-radius: 0.6dvh;
  background: none;
  color: var(--ink-dim);
  font-family: inherit;
  font-size: min(1.6dvh, 1.4vw);
  font-weight: 700;
  letter-spacing: 0.02em;
  text-transform: uppercase;
  cursor: pointer;
  touch-action: manipulation;
}

.ballwerte__ball:active,
.ballwerte__foul:active {
  transform: translateY(0.3dvh);
  filter: brightness(1.2);
}

@media (prefers-reduced-motion: reduce) {
  .ballwerte__ball:active,
  .ballwerte__foul:active {
    transform: none;
  }
}
</style>
