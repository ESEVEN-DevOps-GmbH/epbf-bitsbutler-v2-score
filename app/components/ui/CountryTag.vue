<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { Country } from '~~/shared/types/api'

/**
 * Ein Land: Flagge und Kürzel.
 *
 * Drei Wege, in dieser Reihenfolge — dieselben, die das Verwaltungsprogramm
 * seit jeher geht:
 *
 *   1. eine eigene Grafik aus der Anwendung, für alles ohne ISO-Kennung,
 *   2. der mitgelieferte Flaggensatz nach `flagKey`,
 *   3. nur das Kürzel.
 *
 * Bis zum 11.09.2026 ging diese Seite keinen davon. Der Grund stand hier als
 * Begründung: die Schnittstelle liefere keine Adressen für Flaggen. Das
 * stimmte — sie lieferte zu einem Land nur iso3 und name, und zwar an dreizehn
 * Stellen, die das Objekt jede für sich bauten. Inzwischen baut es
 * `identity.country_json` an einer Stelle, und dort steht auch, was für eine
 * Flagge nötig ist.
 *
 * Das Kürzel steht *statt* der Flagge, nicht neben ihr. Flagge und Kürzel
 * zusammen sagen dasselbe zweimal, und in der Meldeliste — wo der Landesname
 * ohnehin danebensteht — sogar dreimal.
 *
 * Für Screenreader bleibt es trotzdem lesbar: die Flagge trägt den Landesnamen
 * als Beschriftung, nicht als leeres Bild. Wer ein Land nicht an der Flagge
 * erkennt, findet den Namen im Tooltip — und in den Listen, die `showName`
 * setzen, ohnehin ausgeschrieben daneben.
 */
const props = defineProps<{ country: Country | null, showName?: boolean }>()

/**
 * Die eigene Grafik. Kein Ziel, wenn keine hinterlegt ist — ein `img` auf
 * einen 404 zeigt das kaputte Bildsymbol des Browsers, und das ist schlechter
 * als gar kein Bild.
 */
const loaded = ref(true)
watch(() => props.country?.iso3, () => (loaded.value = true))

const ownFlag = computed(() =>
  props.country?.hasOwnFlag && props.country.iso3 && loaded.value
    ? `/api/countries/${encodeURIComponent(props.country.iso3)}/flag.svg`
    : null)

/**
 * Die Klasse des Flaggensatzes. Streng geprüft, weil sie aus der Antwort der
 * Anwendung kommt und hier in ein Klassenattribut geht.
 */
const flagSetClass = computed(() => {
  const key = props.country?.flagKey
  return !ownFlag.value && key && /^[a-z]{2}(-[a-z]{2,3})?$/.test(key)
    ? `fi fi-${key}`
    : null
})
</script>

<template>
  <span v-if="country" class="country-tag">
    <img
      v-if="ownFlag"
      :src="ownFlag"
      :alt="country.name"
      :title="country.name"
      class="country-tag__flag"
      width="16"
      height="12"
      loading="lazy"
      decoding="async"
      @error="loaded = false"
    >
    <span
      v-else-if="flagSetClass"
      :class="flagSetClass"
      class="country-tag__flag"
      role="img"
      :title="country.name"
      :aria-label="country.name"
    />
    <abbr
      v-if="!ownFlag && !flagSetClass"
      class="country-tag__code"
      :title="country.name"
    >{{ country.iso3 }}</abbr>
    <span v-if="showName" class="country-tag__name">{{ country.name }}</span>
  </span>
  <span v-else class="country-tag country-tag--unknown" aria-hidden="true">—</span>
</template>

<style scoped>
.country-tag {
  display: inline-flex;
  align-items: center;
  gap: 0.35em;
  white-space: nowrap;
}

.country-tag__flag {
  display: inline-block;
  flex: none;
  width: 1.33em;
  height: 1em;
  border-radius: 1px;
  /* Ohne die Linie verschwimmen helle Flaggen — Japan, Polen — mit dem
     Hintergrund der Tabelle. */
  box-shadow: 0 0 0 1px rgb(0 0 0 / 12%);
  /* background-color und nicht background: die Kurzform setzt auch
     background-image zurück — und genau darüber zeichnet der Flaggensatz. */
  background-color: #f5f5f5;
  background-size: cover;
  object-fit: cover;
}

.country-tag__code {
  padding: 0 0.35em;
  border: 1px solid currentcolor;
  font-size: 0.7em;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-decoration: none;
  cursor: help;
}

.country-tag--unknown {
  opacity: 0.6;
}
</style>
