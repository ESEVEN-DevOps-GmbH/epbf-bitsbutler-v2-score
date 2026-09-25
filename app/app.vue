<script setup lang="ts">
/**
 * DIE ANZEIGETAFEL ALS INSTALLIERTE APP
 *
 * AUSZUG AUS epbf-website/app/app.vue. Dort galt dieser Kopf nur unter
 * `/board`, weil dieselbe Anwendung auch die Verbandsseite trug — hier ist
 * JEDE Seite die Tafel, und trotzdem steht die Prüfung weiter da: eine
 * feste Wahrheit ("wir sind immer die Tafel") wäre die eine Stelle, die beim
 * nächsten Ausbau (eine Startseite, eine Statusseite) still falsch würde,
 * ohne dass ein Bau das anzeigt.
 *
 * Alles unter /board bekommt hier die Kopfangaben, mit denen sich ein iPad
 * die Tafel ueber "Zum Home-Bildschirm" ablegt und sie danach ohne
 * Adressleiste und ohne Browserleisten startet.
 */
const route = useRoute()
const istTafel = computed(() => route.path === '/board' || route.path.startsWith('/board/'))

useHead({ htmlAttrs: { lang: 'en' } })

useHead(computed(() => {
  if (!istTafel.value) return {}

  return {
    link: [
      /*
       * Das Manifest. Es liegt unter server/routes/ und nicht in public/,
       * weil der Name der Tafel darin nicht verdrahtet gehoert; die
       * Begruendung steht dort.
       */
      { rel: 'manifest', href: '/board.webmanifest' },
      /*
       * DAS SYMBOL AUF DEM STARTBILDSCHIRM
       *
       * iOS nimmt `apple-touch-icon` und NICHT die `icons` aus dem Manifest.
       * Das Manifest fuehrt dieselben Bilder trotzdem, weil Android
       * umgekehrt vorgeht — beides zu setzen ist kein Doppel, sondern die
       * Bedienung zweier Systeme, die sich hier nie geeinigt haben.
       *
       * Eine Datei mit 180x180 reicht: iOS rechnet von dort auf jede
       * Kachelgroesse herunter. Deckend und ohne Transparenz — iOS legt
       * hinter ein freigestelltes PNG Schwarz, und der Verlauf waere weg.
       */
      { rel: 'apple-touch-icon', href: '/app-icons/scoreboard-180.png', key: 'apple-touch-icon' },
    ],
    meta: [
      /*
       * DER VOLLBILDBETRIEB — UND WARUM DIE ZEILE TROTZDEM STEHT
       *
       * Auf iPadOS 26 und 27 tut sie nichts mehr: seit iPadOS 26 oeffnet
       * JEDE auf den Home-Bildschirm gelegte Seite als Web-App, ohne
       * Bedingung. Vorher lag die Entscheidung bei diesem Tag (iOS 11.3 bis
       * 16) beziehungsweise bei `display: standalone` aus dem Manifest (iOS
       * 17 bis 25) — weshalb hier BEIDES steht. Ein iPad, das seit zwei
       * Jahren nicht aktualisiert wurde, ist in einer Halle kein Sonderfall.
       *
       * `mobile-web-app-capable` ist NICHT dasselbe Tag fuer Safari — es ist
       * der Name, den Chrome sehen will; ohne ihn schreibt Chrome eine
       * Warnung in die Konsole.
       */
      { name: 'apple-mobile-web-app-capable', content: 'yes' },
      { name: 'mobile-web-app-capable', content: 'yes' },
      /*
       * DIE STATUSLEISTE: `black` UND NICHT `black-translucent`
       *
       * Im abgelegten Zustand laesst iOS die Statusleiste mit Uhr, WLAN und
       * Akku stehen. `black-translucent` schoebe die Tafel unter die
       * Leiste; `black` setzt eine schwarze Leiste darueber, die neben dem
       * Tafelschwarz (#05080d) nicht auffaellt.
       */
      { name: 'apple-mobile-web-app-status-bar-style', content: 'black' },
      /*
       * Der Name UNTER dem Symbol. iOS zieht ihn diesem Tag vor dem
       * `short_name` des Manifests vor.
       */
      { name: 'apple-mobile-web-app-title', content: 'Scoreboard' },
      /* Die Farbe der Systemleisten dort, wo ein Geraet sie einfaerbt
         (Android). Dasselbe Schwarz wie die Tafel selbst. */
      { name: 'theme-color', content: '#05080d' },
      /*
       * KEIN ZOOM — UND ZWAR NUR HIER
       *
       * Im gewoehnlichen Safari ignoriert iOS `user-scalable=no` seit
       * Jahren, aus gutem Grund: Niemand darf einem Leser das Vergroessern
       * verbieten. In der abgelegten App gilt die Angabe wieder — und dort
       * ist sie richtig. Auf der Tafel gibt es keinen Text zum Vergroessern,
       * sie wird aus fuenf Metern gelesen, und ein versehentlicher Zwei-
       * Finger-Griff beim Umsetzen des Schirms hinterlaesst einen
       * verschobenen Ausschnitt, den in der Halle niemand mehr geradezieht.
       *
       * Bewusst OHNE `viewport-fit=cover`: Das gaebe der Tafel die Flaeche
       * unter dem Home-Indicator und den abgerundeten Ecken — dagegen hilft
       * nur ein Innenmass aus den Safe-Area-Werten, und das gehoert in die
       * Tafelseiten.
       */
      { name: 'viewport', content: 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no' },
    ],
  }
}))
</script>

<template>
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
</template>

<style>
/*
 * WAS STOERT, WENN KEINE LEISTEN MEHR DA SIND
 *
 * Diese Regeln haengen alle an `.board-screen` — der Klasse, die die
 * Tafelseiten selbst auf <html> setzen. Sie gelten damit AUSSCHLIESSLICH auf
 * der Tafel; auf jeder anderen Seite steht die Klasse nicht.
 *
 * Im Browserfenster faellt das meiste davon nicht auf: Es gibt eine
 * Adressleiste, an der man sieht, wo man ist, und einen Zurueck-Knopf, mit
 * dem man einen Fehlgriff heilt. In der abgelegten App gibt es beides nicht.
 * Jede Geste, die etwas verschiebt, verschiebt es dann dauerhaft.
 */

/*
 * KEIN GUMMIBAND.
 *
 * Die Tafel hat `overflow: hidden` — sie kann gar nicht scrollen. iOS zieht
 * die Seite trotzdem vom Rand weg, wenn man ueber sie streicht, und laesst
 * sie zurueckfedern. Im Saal sieht das aus, als haette sich die Tafel
 * verhakt. `overscroll-behavior` nimmt die Bewegung weg, ohne irgendwo
 * anders etwas zu sperren.
 */
.board-screen,
.board-screen body {
  overscroll-behavior: none;
}

/*
 * KEIN DOPPELTIPP-ZOOM UND KEIN GRAUER BLITZ.
 *
 * `manipulation` laesst Tippen, Ziehen und Scrollen unveraendert und nimmt
 * nur die Zoom-Geste des doppelten Tippens weg. Auf einer Tafel, auf der der
 * Schiedsrichter zaehlt, ist ein zweiter schneller Tipp keine Absicht,
 * sondern ein zweiter Punkt — und der Zoom, der stattdessen kommt, bleibt
 * stehen.
 *
 * `-webkit-tap-highlight-color` ist die zweite Haelfte: ohne sie legt iOS
 * bei jeder Beruehrung kurz ein graues Rechteck ueber das getroffene
 * Element. Auf einer dunklen Tafel, die aus fuenf Metern gelesen wird, ist
 * das ein Aufblitzen, das der ganze Saal sieht.
 */
.board-screen body {
  touch-action: manipulation;
  -webkit-tap-highlight-color: transparent;
}

/*
 * KEIN MARKIEREN — AUCH AUF DER TISCHWAHL.
 *
 * Die Tafel selbst hat das schon (siehe `.board` in [table].vue). Die
 * Tischwahl wird mit demselben Finger bedient: Wer ein Tischfeld etwas zu
 * lange haelt, bekaeme sonst die Nummer blau hinterlegt, dazu die Lupe und
 * die Leiste "Kopieren | Nachschlagen".
 *
 * Auf `body` und nicht auf `.pick`, damit es auch fuer die Einstiegsseite
 * unter /board gilt. Eine Tafel ist eine Anzeige; es gibt auf keiner dieser
 * drei Seiten Text, den jemand kopieren will.
 */
.board-screen body {
  user-select: none;
  -webkit-user-select: none;
  -webkit-touch-callout: none;
}
</style>
