/**
 * Eine neue Fassung ist ausgerollt — und die Tafel merkt es.
 *
 * DAS PROBLEM, DAS ES ÜBERALL SONST NICHT GIBT
 *
 * Jede andere Seite dieser Anwendung wird von einem Menschen geöffnet, und
 * beim nächsten Öffnen kommt die neue Fassung mit. Die Anzeigetafel wird
 * EINMAL geöffnet — am Aufbautag, auf einem iPad, das danach acht Stunden
 * am Tisch liegt und nie wieder angefasst wird. Rollt jemand mittags eine
 * Korrektur aus, steht sie auf jedem Schirm der Halle erst am nächsten
 * Morgen. Niemand geht durch die Reihen und lädt zwanzig Geräte neu.
 *
 * DIE ENTSCHEIDUNG DES AUFTRAGGEBERS: „wenn keine partie läuft,
 * aktualisieren.. fertig". Keine Rückfrage, kein Unterschied zwischen
 * Wandschirm und Zählgerät. Läuft eine Partie, wird gewartet.
 *
 * WARUM NICHT NUXTS EIGENER WEG
 *
 * Nuxt bringt beides mit: eine Prüfung (`experimental.checkOutdatedBuildInterval`)
 * und einen Haken (`app:manifest:update`). Beides wurde angesehen und beides
 * verworfen, und zwar aus drei Gründen, von denen der erste allein genügt:
 *
 *   1. DIE PRÜFFRIST IST GLOBAL. Sie steht zur Bauzeit in
 *      `#build/nuxt.config.mjs` und gilt für JEDE Seite — auch für
 *      /livescores, auf der an einem Turniertag zehntausend Zuschauer
 *      stehen. Die Vorgabe ist eine Stunde; das wäre für die Tafel deutlich
 *      zu träge. Sie auf zehn Sekunden zu stellen, hiesse, zehntausend
 *      Browsern alle zehn Sekunden eine Frage aufzuerlegen, die genau
 *      zwanzig Geräte in der Halle etwas angeht. Eine Frist je Route gibt es
 *      nicht.
 *   2. DIE PRÜFUNG IST EIN EIGENER RUNDLAUF — nach
 *      `/_nuxt/builds/latest.json`, zusätzlich zu den beiden Abfragen, die
 *      die Tafel ohnehin alle zehn Sekunden stellt. Die Kennung fährt in
 *      einer davon kostenlos mit (siehe
 *      `server/api/board/[eventId]/tables/[number].get.ts`); der Server
 *      kennt seine eigene Bau-Kennung, ohne dafür eine Datei zu lesen.
 *   3. DER HAKEN LÄDT NICHT, ER MERKT SICH NUR. Nuxt lädt bei der nächsten
 *      NAVIGATION neu — und eine Anzeigetafel navigiert nie. Die ganze
 *      Entscheidung „läuft gerade eine Partie?" und die Sperre gegen
 *      Schleifen müssten ohnehin hier stehen. Übrig bliebe vom Haken die
 *      eine Zeile `meta.id !== buildId`.
 *
 * In der ENTWICKLUNG käme er zusätzlich nie zum Zug: `latest.json` liefert
 * dort dauerhaft `{"id":"dev"}`, und die Kennung ändert sich erst beim
 * Bauen. Was nie auslöst, lässt sich auch nicht durchspielen.
 *
 * WAS NUXT TROTZDEM BEISTEUERT: die Kennung selbst. `app.buildId` steht in
 * der Laufzeitkonfiguration — auf dem Server wie im Browser — und ist
 * WÖRTLICH dieselbe Zeichenkette, die in `/_nuxt/builds/latest.json` unter
 * `id` steht. Es wird hier also keine zweite Fassungsangabe erfunden,
 * sondern die des Rahmenwerks benutzt.
 */

import type { Ref } from 'vue'

/**
 * DIE SPERRE GEGEN SCHLEIFEN — und sie ist nicht theoretisch.
 *
 * Der Fall: das Gerät bekommt eine neue Kennung gemeldet, lädt neu — und
 * bekommt dasselbe alte Dokument zurück. Auf iOS ist das kein erfundenes
 * Beispiel (siehe `reload`). Ohne Sperre meldete der nächste Abruf zehn
 * Sekunden später wieder eine andere Kennung, und die Tafel lüde in einer
 * Schleife neu, für immer, vor Publikum.
 *
 * GENAU EIN VERSUCH JE KENNUNG. Kein zweiter, und das ist eine Entscheidung
 * und keine Sparsamkeit: ein zweiter Versuch ginge auf DIESELBE Adresse
 * (`?v=<kennung>`), die der Browser nach dem ersten Versuch womöglich
 * bereits liegen hat — er wäre also genau der Versuch mit der geringsten
 * Aussicht, etwas anderes zu bewirken als der erste. Was ein misslungenes
 * Nachladen wirklich braucht, ist ein Mensch oder der nächste Bau; beides
 * bringt eine neue Kennung, und dann wird wieder genau einmal geladen.
 *
 * WORAN DAS GERÄT ERKENNT, DASS ES SCHON GELADEN HAT — zwei Wege, und der
 * erste braucht keinen Speicher:
 *
 *   1. DIE ADRESSE SELBST. Nachgeladen wird auf `…?v=<zielkennung>`. Steht
 *      dieser Parameter schon da, war dieses Dokument der Versuch. Das ist
 *      der tragende Riegel: er überlebt das Neuladen zwangsläufig, er
 *      braucht keinen Speicher, und er kann nicht aus Versehen leer sein.
 *   2. DER MERKER in `sessionStorage` — für den Fall, dass der Parameter
 *      unterwegs verloren geht (ein Vorschaltserver, der aufräumt, eine
 *      Umleitung ohne Abfrageteil).
 *
 * `sessionStorage` und nicht `localStorage`: der Merker soll das Neuladen
 * überleben und den kalten Start NICHT — wer die abgelegte Web-App wirklich
 * neu startet, holt das Dokument ohnehin frisch, und dann soll ihn kein
 * Merker von gestern bremsen.
 */
const LOCK_STORAGE_KEY = 'bb.board.fassung'

/** Der Name des Parameters, der die Zielkennung in der Adresse trägt. */
const VERSION_PARAM = 'v'

interface LockRecord {
  /** Die Kennung, für die geladen wurde. */
  target: string
  /** Wann. Nur für den Menschen, der das im Speicher des Geräts nachsieht. */
  time: number
}

function storeRead(): LockRecord | null {
  try {
    const raw = window.sessionStorage.getItem(LOCK_STORAGE_KEY)
    if (!raw) return null
    const m = JSON.parse(raw) as Partial<LockRecord>
    if (typeof m.target !== 'string') return null
    return { target: m.target, time: Number(m.time) || 0 }
  }
  catch {
    // Kein Speicher, kein Merker — dann trägt der Parameter in der Adresse
    // allein, und der trägt.
    return null
  }
}

function storeWrite(m: LockRecord) {
  try {
    window.sessionStorage.setItem(LOCK_STORAGE_KEY, JSON.stringify(m))
  }
  catch { /* siehe oben */ }
}

function storeForget() {
  try {
    window.sessionStorage.removeItem(LOCK_STORAGE_KEY)
  }
  catch { /* siehe oben */ }
}

/** Trägt die Adresse dieses Dokuments schon die Zielkennung? */
function addressCarries(target: string): boolean {
  try {
    return new URLSearchParams(window.location.search).get(VERSION_PARAM) === target
  }
  catch {
    return false
  }
}

export interface VersionSwitch {
  /** Die Kennung des Baus, der gerade läuft — gekürzt siehe `short`. */
  currentBuildId: string
  /** Die ersten acht Stellen. Das ist, was am Telefon vorgelesen wird. */
  short: string
  /** Eine andere Kennung ist gemeldet und die Tafel wartet auf den Moment. */
  pending: Ref<boolean>
  /** Was ein Abruf an Kennung mitgebracht hat. Gleich oder leer: nichts tun. */
  report: (buildId: string | null | undefined) => void
}

export interface VersionSwitchOptions {
  /**
   * Ob JETZT geladen werden darf.
   *
   * Die Seite entscheidet das, nicht dieses Stück — was „läuft gerade"
   * heisst, weiss nur sie. Ein `computed`, damit auf jede Änderung sofort
   * geprüft wird: eine Partie, die auf FINISHED springt, soll nicht bis zum
   * nächsten Abruf warten müssen, und ein Menü, das zugeht, auch nicht.
   */
  allowed: Ref<boolean> | (() => boolean)
  /**
   * SELBST NACHFRAGEN — nur für Seiten, die keinen Träger haben.
   *
   * Der Regelfall ist `report()`: die Kennung fährt in einer Antwort mit,
   * die die Seite ohnehin holt, und kostet nichts. Genau eine Tafelseite hat
   * keine solche Antwort — die Tischwahl (/board/<eventId>) fragt EINMAL und
   * dann nie wieder. Sie bekommt deshalb eine eigene, langsame Frage nach
   * `/_nuxt/builds/latest.json`.
   *
   * Das ist dieselbe Datei, die Nuxts eigene Prüfung liest, und sie ist
   * winzig (rund achtzig Zeichen, von Nitro ohne Zutun der Anwendung
   * ausgeliefert). Eine Minute Abstand und nicht zehn Sekunden: hier steht
   * kein Publikum, sondern höchstens ein Gerät, das gerade eingerichtet
   * wird.
   *
   * Weglassen heisst: es wird nur gemeldet, was ankommt.
   */
  selfPollMs?: number
}

export function useVersionSwitch(options: VersionSwitchOptions): VersionSwitch {
  const currentBuildId = String(useRuntimeConfig().app.buildId ?? '')
  const reported = ref<string | null>(null)

  /**
   * Schon ausgelöst — für die Spanne zwischen `location.replace` und dem
   * Augenblick, in dem der Browser das alte Dokument wirklich verlässt.
   *
   * Sie ist kurz, aber nicht null: in ihr laufen die Beobachter weiter, und
   * ein Abruf, der in dieser Spanne zurückkommt, könnte ein zweites Mal
   * auslösen. Das wäre kein Schaden, aber eine zweite Navigation, die man
   * im Protokoll des Geräts sucht.
   */
  let triggered = false

  const isAllowedNow = () => (typeof options.allowed === 'function' ? options.allowed() : options.allowed.value)

  /**
   * NEU LADEN — MIT DER KENNUNG IN DER ADRESSE.
   *
   * `location.reload()` allein wäre der naheliegende Weg, und auf einem
   * gewöhnlichen Browser genügte er: die `/board/**`-Routen stehen auf
   * `no-store` (nuxt.config.ts), und damit darf kein Zwischenspeicher eine
   * Antwort aufheben.
   *
   * Der Fall, für den das nicht reicht, ist der, für den das hier gebaut
   * wird: eine auf dem Startbildschirm ABGELEGTE Web-App auf iOS. Sie hält
   * ihr Startdokument hartnäckig fest — das ist seit Jahren bekannt und
   * nicht abschaltbar. Eine Adresse, die es noch nie gab, kann dagegen aus
   * keinem Speicher bedient werden; deshalb fährt die Zielkennung im
   * Abfrageteil mit. Sie kostet nichts: `/board` steht in der Weissliste von
   * server/middleware/canonical-query.ts NICHT drin (der Parameter wird also
   * nicht weggeräumt), die Route wertet ihn nicht aus, und Nitro speichert
   * die Antwort ohnehin nicht.
   *
   * `replace` und nicht `assign`: die alte Adresse soll nicht im Verlauf
   * stehen bleiben. Auf einem Gerät mit Fernbedienung ist eine
   * Zurück-Taste, die in die vorige Fassung führt, kein Weg, den jemand
   * gehen soll.
   *
   * Der Parameter wird NICHT wieder weggeräumt. Er stört niemanden (eine
   * abgelegte Web-App und ein Wandschirm im Kioskbetrieb zeigen keine
   * Adresszeile), er wird beim nächsten Wechsel schlicht überschrieben — und
   * er ist am Gerät der einzige Beleg dafür, dass wirklich neu geladen wurde
   * und nicht nur neu gezeichnet.
   */
  function reload(target: string) {
    if (triggered) return

    // Die beiden Riegel — siehe SPERRE GEGEN SCHLEIFEN ganz oben.
    if (addressCarries(target)) return
    const record = storeRead()
    if (record && record.target === target) return

    triggered = true
    storeWrite({ target, time: Date.now() })

    // Aus `pathname` und nicht aus `href`: sonst sammelten sich bei jedem
    // Wechsel die Parameter der vorigen Male an.
    const address = `${window.location.pathname}?${VERSION_PARAM}=${encodeURIComponent(target)}`
    window.location.replace(address)
  }

  function report(buildId: string | null | undefined) {
    if (!buildId || !currentBuildId || buildId === currentBuildId) {
      reported.value = null
      return
    }
    reported.value = buildId
  }

  const pending = computed(() => reported.value !== null)

  /**
   * Wo `latest.json` liegt — gerechnet und nicht geraten.
   *
   * Dieselbe Rechnung wie in Nuxts `buildAssetsURL`: ein Auslieferungsnetz
   * geht vor, sonst der Grundpfad, dann das Verzeichnis der Bündel. Fest
   * „/_nuxt/builds/latest.json" hineinzuschreiben, wäre heute richtig und
   * bräche still, sobald jemand `app.baseURL` oder `app.cdnURL` setzt — und
   * zwar ohne Fehlermeldung: die Abfrage liefe ins Leere, und die Tischwahl
   * merkte nie wieder etwas.
   */
  function buildManifestUrl(): string {
    const app = useRuntimeConfig().app
    const root = String(app.cdnURL || app.baseURL || '/')
    const bundleDir = String(app.buildAssetsDir || '/_nuxt/')
    return `${root.replace(/\/$/, '')}/${bundleDir.replace(/^\/+|\/+$/g, '')}/builds/latest.json`
  }

  if (import.meta.client) {
    onMounted(() => {
      /*
       * Der Merker der VORIGEN Runde: hat das Neuladen getragen, läuft jetzt
       * genau die Fassung, für die geladen wurde — dann ist er erledigt und
       * wird weggeräumt. Was stehen bleibt, ist der Merker eines Versuchs,
       * der NICHT getragen hat; genau der soll den zweiten verhindern.
       */
      const record = storeRead()
      if (record && record.target === currentBuildId) storeForget()
    })

    /*
     * Geprüft wird bei JEDER Änderung an einer der beiden Seiten: kommt eine
     * neue Kennung an, und wechselt der Augenblick von „geht nicht" auf
     * „geht". Das ist der Unterschied zwischen „lädt, sobald die Partie
     * vorbei ist" und „lädt beim übernächsten Abruf".
     */
    watch(
      [reported, () => isAllowedNow()],
      ([target, allowed]) => {
        if (!target || !allowed) return
        reload(target)
      },
      { immediate: true },
    )

    if (options.selfPollMs) {
      let timer: ReturnType<typeof setInterval> | null = null
      onMounted(() => {
        timer = setInterval(async () => {
          try {
            // Der Zeitstempel im Abfrageteil ist Nuxts eigener Kniff: die
            // Datei liegt unter `/_nuxt/**` und wird von jedem Vorschaltcache
            // für ein Jahr aufgehoben. Ohne ihn läse man die Kennung von
            // vorgestern.
            const meta = await $fetch<{ id?: string }>(`${buildManifestUrl()}?${Date.now()}`)
            report(meta?.id)
          }
          catch {
            // Ein Aussetzer ist kein Ereignis. Die nächste Minute fragt neu.
          }
        }, options.selfPollMs)
      })
      onBeforeUnmount(() => {
        if (timer) clearInterval(timer)
      })
    }
  }

  return {
    currentBuildId,
    short: currentBuildId.slice(0, 8),
    pending,
    report,
  }
}
