/**
 * Datenvertrag, den die Anzeigetafel von der öffentlichen BitsButler-
 * Schnittstelle (/api/public/v1) braucht.
 *
 * Dies ist ein AUSZUG aus epbf-website/shared/types/api.ts (1824 Zeilen).
 * Die Tafel zog am 25.09.2026 in ein eigenes Projekt um (siehe LIESMICH.md)
 * und nimmt seither nur die zehn Typen mit, die ihre Seiten und Komponenten
 * tatsächlich importieren, plus deren eigene Abhängigkeiten: IsoDate,
 * IsoDateTime, ImageRef, CodeLabel, ScoringKind, MatchDiscipline, Country,
 * TourSummary, MatchStatus, MatchKind, MatchTieState, MatchSide, Match,
 * MatchTimeout, MatchTimeLimit, SponsorRank, BoardSponsor, TableBoard,
 * BoardTable, BoardTables, BoardEventItem, BoardEventList, MatchEventPublic,
 * MatchStream.
 *
 * Wer eine Seite hinzufügt, die einen elften Typ braucht, holt ihn aus der
 * Quelle dort — wortgleich, wie die übrigen hier stehen.
 */

/** ISO-8601-Datum ohne Zeit, z. B. "2026-08-23". */
export type IsoDate = string

/** ISO-8601-Zeitpunkt mit Zone, z. B. "2026-08-23T14:30:00+02:00". */
export type IsoDateTime = string

/**
 * Bild als URL statt als Base64.
 *
 * Der Bestand bettet jedes Bild als Data-URI ins HTML ein; die Nachrichten-
 * seite wiegt dadurch 15 MB. Der Vertrag liefert stattdessen Adressen, die der
 * Browser einzeln laden und zwischenspeichern kann.
 */
export interface ImageRef {
  url: string
  /** Vorschaugröße für Listen und Kacheln. */
  thumbnailUrl?: string
  width: number
  height: number
  /** Bildbeschreibung für Screenreader; leer bei rein dekorativen Bildern. */
  alt: string
}

/**
 * Kürzel mit Klartext.
 *
 * Der Bestand liefert in Kalender und Turnierlisten nur Kürzel — "S46", "PY",
 * "WC", "A" — und die Seite hat keine Legende dazu. Wer nicht weiß, dass S46
 * "Seniors 40+" heißt, kann den Kalender nicht filtern. Jedes Kürzel im
 * Vertrag trägt deshalb seinen Namen mit.
 */
export interface CodeLabel {
  code: string
  name: string
}

/**
 * Wie eine Spielart gezählt wird — `sport.discipline.scoring_kind`.
 *
 * FRAME_RACE steht im Prüfzwang der Spalte, trägt aber keine Disziplin:
 * Snooker gibt es in v2 nicht. Das Wort steht trotzdem hier, weil die
 * Datenbank es zulässt und eine Fassung, die es nicht kennt, beim ersten
 * Snookerturnier stumm das Falsche zeichnete.
 */
export type ScoringKind = 'RACK_RACE' | 'POINT_RACE' | 'FRAME_RACE'

/**
 * Die Spielart einer Partie — mit dem, woran die Anzeigetafel ihre
 * Zählleiste entscheidet.
 *
 * `code` und `name` sind das, was jede Liste zeigt. `key` und `scoringKind`
 * sind das, was die Tafel BRAUCHT: `scoringKind` trennt Satz- von
 * Punktwertung, `key` trennt die beiden Punktdisziplinen voneinander —
 * Straight Pool (POOL_14_1) rechnet über die Restkugeln, hat Racks,
 * Punktabzüge und eine Foulfolge, ein Shoot-out hat nichts davon.
 *
 * SIE STEHEN AN DER PARTIE UND NICHT IN EINER ZWEITEN AUSKUNFT. Bis zum
 * 17.09.2026 holte die Tafel die Zuordnung Kürzel → Wertungsart aus der
 * Referenzverwaltung; die hängt an `system.reference:R`, und ein
 * Schiedsrichter hat das Recht nicht. Ein Gerät, das nur über den
 * sechsstelligen Tafelcode freigegeben ist, bekam gar nichts und zeichnete
 * im Straight Pool die Satzleiste. Jetzt kommt es aus
 * `competition.public_match` mit der Partie.
 */
export interface MatchDiscipline extends CodeLabel {
  /** Der Schlüssel aus `sport.discipline` — POOL_14_1, POOL_9BALL, … */
  key: string
  scoringKind: ScoringKind
}

/**
 * Land bzw. Nationalität — im Bestand in drei verschiedenen Formen
 * (`playerNationality.iso3`, `playerProfileNationality`, `countryIso3`).
 * Hier genau eine.
 */
export interface Country {
  iso3: string
  name: string
  /** ISO-2, sofern das Land eine hat. */
  iso2?: string | null
  /**
   * Der Schlüssel im mitgelieferten Flaggensatz — meist die ISO-2-Kennung
   * klein geschrieben, für England, Schottland und Wales gb-eng, gb-sct und
   * gb-wls. Fehlt, wenn der Satz für dieses Land nichts hat.
   */
  flagKey?: string | null
  /** Ob die Anwendung eine eigene Grafik für dieses Land hält. */
  hasOwnFlag?: boolean
}


export interface TourSummary {
  /** URL-Bestandteil, z. B. "eurotour". */
  slug: string
  /** Kürzel der Wertungsklasse, z. B. "ETM", "ETW", "EC", "YT", "HB". */
  code: string
  name: string
  /**
   * Der Name im Menü, mit Hauptsponsor: „Predator Euro Tour". Er steht in
   * der Verwaltung und nicht im Quelltext — Sponsoren wechseln.
   */
  longName: string
  /**
   * Worauf der Menüpunkt zeigt.
   *
   * `EVENT`: auf eine Veranstaltung mit ihren Turnieren — eine
   * Europameisterschaft hat zehn davon. `TOURNAMENT`: unmittelbar auf ein
   * Turnier — eine Euro-Tour-Station ist eines, und die der Damen läuft im
   * selben Wochenende wie die der Herren.
   */
  pageMode?: 'EVENT' | 'TOURNAMENT'
  /**
   * Das Kopflogo dieser Serie — was auf ihren Seiten oben links steht.
   *
   * Optional UND nullbar, und beides ist nötig: die Anwendung baut das Feld
   * als `NULL`, wenn nichts hinterlegt ist, und `jsonb_strip_nulls` in
   * `tours()` wirft es dann ganz hinaus. Bis zum 16.09.2026 stand hier
   * `logo: ImageRef` — ein Vertragsbruch, der nur deshalb nicht auffiel,
   * weil das Feld niemand las.
   *
   * Gepflegt wird es vom BETREIBER und nicht vom Veranstalter: es ist das
   * Aussehen der Seite und nicht die Marke dessen, der die Turniere
   * ausrichtet.
   */
  logo?: ImageRef | null
}


export type MatchStatus =
  | 'NONE' | 'CREATED' | 'SCHEDULED' | 'READY'
  | 'RUNNING' | 'TIMEOUT' | 'FINISHED' | 'APPROVED'

/**
 * Einzelpartie oder Mannschaftsbegegnung.
 *
 * `TIE` ist die Begegnung selbst (Germany v Poland), `SINGLES` sowohl eine
 * gewoehnliche Einzelpartie als auch ein Einzel INNERHALB einer Begegnung --
 * das eine vom anderen unterscheidet `parentMatchId`, nicht die Art. So
 * herum, weil ein Einzel aus einer Begegnung in jeder anderen Hinsicht eine
 * Einzelpartie ist: gleicher Stand, gleicher Tisch, gleiche Anzeige.
 */
export type MatchKind = 'SINGLES' | 'TIE'

/**
 * Der Zwischenstand einer Mannschaftsbegegnung.
 *
 * Gewonnene Einzel (`rubbersA`/`rubbersB`) sind der Stand der Begegnung --
 * NICHT die Summe der Racks. Die Racks stehen daneben, weil sie bei
 * Gleichstand entscheiden koennen; sie sind aber nicht das Ergebnis, und
 * genau diese Verwechslung liess die Begegnung eine Zeit lang 0:0 anzeigen,
 * obwohl ein Einzel schon entschieden war.
 */
export interface MatchTieState {
  rubbersA: number
  rubbersB: number
  /** Noch nicht entschiedene Einzel -- sagt, ob der Stand noch kippen kann. */
  rubbersOpen: number
  rubberCount: number
  /** Gewonnene Einzel, die die Begegnung entscheiden. */
  winAt: number
  /** Es werden alle Einzel gespielt, auch wenn der Sieger feststeht. */
  playAll: boolean
  racksA: number
  racksB: number
  decided: boolean
  formatName: string | null
}

/**
 * Eine Seite einer Partie.
 *
 * Der Bestand löst in vier Dateien nahezu identisch auf, wer hier steht:
 * Walkover, Platzhalter, Sieger aus Partie X, Aufgabe, Disqualifikation. Diese
 * Auflösung gehört auf den Server, damit sie einmal existiert und überall
 * gleich aussieht.
 */
export interface MatchSide {
  playerId: string | null
  /** Fertig aufgelöste Anzeige: Name, "Walkover", "Qualifier" oder "Winner M17". */
  displayName: string
  /**
   * Vor- und Nachname getrennt, so wie `identity.person` sie führt.
   *
   * WOFÜR: die Anzeigetafel am Tisch setzt den Nachnamen groß und den
   * Vornamen klein darunter. Aus `displayName` allein wäre die Grenze nur zu
   * raten, und das Raten geht bei 270 der 9202 Personen daneben.
   *
   * BEIDE SIND `null`, WENN KEIN MENSCH AUF DER SEITE STEHT — bei einer
   * Mannschaft ("Germany"), bei "tbd", bei "Bye", bei Platzhaltern wie
   * "Winner M17" und bei einer gelöschten Person. Sie sind gefüllt genau
   * dann, wenn `playerId` gefüllt ist.
   *
   * `displayName` bleibt der eine fertige Name und wird von diesen beiden
   * NICHT ersetzt: er steht im Livescore, im Turnierbaum, im Spielplan, im
   * Profil und im Embed-Widget. Wer die Teile nicht braucht, ändert nichts.
   */
  givenName: string | null
  familyName: string | null
  /** Anonymisierter Spieler: Platzhaltername, kein Verweis auf ein Profil. */
  erased: boolean
  nationality: Country | null
  /**
   * Land der Meldung — festgeschrieben zum Turnier, fuer das gemeldet wurde.
   * `nationality` bleibt die Staatsangehoerigkeit und kann davon abweichen.
   */
  representsCountry: Country | null
  /** Setzposition, falls gesetzt — steht im Turnierplan neben dem Namen. */
  seed: number | null
  score: number | null
  /** Fertig aufgelöste Anzeige des Ergebnisses: Zahl, "FF" oder "DIS". */
  displayScore: string
  /**
   * Die Zahlen dieser Seite, eine je Spalte der Anzeigetafel.
   *
   * HIER KOMMT SPAETER DAS SATZSYSTEM HEREIN, UND ZWAR OHNE NEUES MARKUP
   *
   * Heute kennt `competition.match` einen Stand je Seite, also ist diese
   * Liste einelementig und die Anzeige hat eine Zahlenspalte. Wird spaeter
   * nach Saetzen gespielt, liefert der Server hier ["6","4","10"] -- und die
   * Anzeige bekommt drei Spalten, ohne dass eine Zeile Markup sich aendert.
   *
   * Als Liste am Feld und nicht als zweites Feld `sets`: sonst muesste jede
   * Anzeigestelle entscheiden, welches der beiden Felder gilt, und genau
   * solche Entscheidungen stehen im Bestand an dreizehn Stellen verschieden.
   *
   * Optional, weil der Server sie heute nicht schickt. Wer sie liest, nimmt
   * `displayScore` als die eine Spalte -- das erledigt `matchZahlen()`.
   */
  setScores?: string[] | null
  /**
   * DER STAND IM LAUFENDEN SATZ (BZW. FRAME) — seit dem 25.09.2026, und
   * NICHT dasselbe wie `score` darüber.
   *
   * `score` bleibt der AUSSENSTAND (gewonnene Sätze/Frames, gegen
   * `Match.raceTo`) — dieselbe Spalte und dieselbe Bedeutung wie bei jeder
   * Partie ohne Satzformat. Dieses Feld ist die INNERE Zahl: die Racks bzw.
   * Punkte, die diese Seite im Satz erzielt hat, der gerade läuft, gegen
   * `Match.setRaceTo`.
   *
   * `null`, solange die Partie kein Satzformat hat (`Match.setRaceTo` ist
   * dann ebenfalls `null`) — nicht `0`. Eine Partie ohne Sätze hat keinen
   * "laufenden Satz", dessen Stand `0` wäre; sie hat gar keinen.
   *
   * BEI SNOOKER (`discipline.scoringKind === 'FRAME_RACE'`) BLEIBT ES
   * IMMER `null`. Ein Frame endet nicht an einer Zahl (siehe
   * `Match.setRaceTo`), und die Verwaltung führt dafür keinen
   * Zwischenstand: `competition.match_slot.set_score` wird serverseitig nur
   * beschrieben, wenn `set_race_to` gesetzt ist — bei einem Frame ist das
   * nie der Fall. Die laufenden Ballpunkte eines Frames zählt die Tafel
   * deshalb selbst mit, rein im Gerät und ohne Rückhalt beim nächsten
   * Neuladen (siehe die Ballwerte-Fläche in `[table].vue`).
   */
  setScore: number | null
  walkover: boolean
  forfeit: boolean
  disqualified: boolean
  /**
   * Sieger dieser Partie — spart die Ergebnisauswertung im Client.
   *
   * DREIWERTIG, UND DAS IST DER PUNKT: `true` gewonnen, `false` verloren,
   * `null` noch nicht entschieden. Eine laufende Partie ist keine Niederlage
   * — genau diese Verwechslung wies eine Partie, die mit 6:4 gefuehrt wurde,
   * im Spielerprofil als verloren aus.
   */
  winner: boolean | null
  /**
   * Ob GENAU DIESE Seite einen Shoot-out gewann, nachdem das Zeitlimit die
   * Partie unentschieden antraf (Heyball). `displayScore` enthaelt den
   * Shoot-out-Punkt schon ("4:3" statt "3:3") -- dieses Feld ist fuer eine
   * Anzeige, die zusaetzlich "(shoot-out)" danebenschreiben will, und keine
   * Voraussetzung, um den Endstand richtig zu lesen.
   */
  shootoutWinner: boolean
}


export interface Match {
  id: string
  /** Bezeichnung der Partie im Turnierbaum, z. B. "M17". */
  label: string
  roundId: string
  roundLabel: string
  roundCode: string
  scheduledTime: IsoDateTime | null
  /** Tischnummer; null bedeutet "tba". */
  tableNumber: number | null
  /** Zuvor zugewiesener Tisch, wird ausgegraut angezeigt. */
  previousTableNumber: number | null
  /**
   * Die Übertragung des Tisches, an dem diese Partie steht — oder `null`.
   *
   * Sie steht an der PARTIE und nicht an einer Tischliste, die jede Seite
   * sich selbst holen müsste: Livescores und Order of Play gehen über
   * Veranstaltungen hinweg, und die Zuordnung Tischnummer → Kanal wäre dort
   * ein zweiter Abruf je Veranstaltung.
   *
   * Gefüllt nur bei einem Tisch mit gesetztem Streammerker UND hinterlegter
   * Adresse. Ein Zeichen an der Partie, das ins Leere führt, ist schlechter
   * als keines.
   */
  stream: MatchStream | null
  status: MatchStatus
  raceTo: number
  /**
   * Ob diese Partie durch das Zeitlimit beendet wurde und nicht, weil eine
   * Seite die Distanz erreichte (Heyball). Der Stand erreicht `raceTo` dann
   * nie — bei race-to-7 vielleicht "5 : 3" — und ohne dieses Zeichen sucht
   * man nach den fehlenden Racks. Unabhängig vom Shoot-out: eine Partie kann
   * am Zeitlimit enden, OHNE dass es zum Shoot-out kam, wenn eine Seite
   * vorne lag (siehe `MatchSide.shootoutWinner`).
   */
  endedByTimeLimit: boolean
  /** Wer den naechsten Satz anstoesst; null, solange es nicht feststeht. */
  nextBreak: 'A' | 'B' | null
  /**
   * DIE INNERE DISTANZ — Racks bzw. Punkte, die EIN Satz braucht, seit dem
   * 25.09.2026.
   *
   * `raceTo` bleibt die ÄUSSERE Zahl: wie viele Sätze bzw. Frames diese
   * Partie zum Sieg braucht ("best of 5" wäre `raceTo: 3`). Dieses Feld ist
   * die Zahl EINE Ebene tiefer — "je Satz race to 5" wäre `setRaceTo: 5`.
   * Beide zusammen zeichnen die Verwaltung als "7:4 (5:0)": aussen die
   * Sätze, in Klammern der laufende.
   *
   * `null` heisst „keine Sätze" — die allermeisten Partien. Dann bleibt an
   * der Tafel exakt, was vor dem 25.09.2026 dort stand: `raceTo` und
   * `sideX.score` zählen unmittelbar, ohne eine zweite Ebene darüber.
   *
   * BEI SNOOKER (`discipline.scoringKind === 'FRAME_RACE'`) IST ES IMMER
   * `null`, UND DAS IST KEINE LÜCKE. Ein Frame endet nicht an einer Zahl,
   * sondern wenn keine Bälle mehr liegen und der Rückstand uneinholbar
   * ist — eine Zielzahl hinzuschreiben, die es fachlich nicht gibt, wäre
   * eine Lüge, an die sich später jemand hielte. Wer bei Snooker gewonnen
   * hat, sagt der Schiedsrichter ausdrücklich (siehe `confirm-set`).
   */
  setRaceTo: number | null
  /**
   * DIE LAUFENDE SATZNUMMER (BZW. FRAMENUMMER) — nur gefüllt, wenn
   * `setRaceTo` gesetzt ist.
   *
   * `null` UND NICHT `1`, WENN ES KEINE SÄTZE GIBT — dieselbe Auskunft wie
   * bei `sideX.setScore` und aus demselben Grund: eine Partie ohne Satzformat
   * hat keinen "laufenden Satz", dessen Nummer `1` wäre.
   *
   * BEI SNOOKER EBENFALLS IMMER `null`, obwohl `competition.match.
   * current_set_no` dort serverseitig bei jedem Frame weiterzählt
   * (`confirm_set_result` erhöht sie unabhängig davon, ob der Satzgewinner
   * aus einer Zahl oder aus einer Ansage kommt) — die öffentliche Auskunft
   * blendet sie nur aus, solange `setRaceTo` fehlt. Die Framenummer führt
   * die Tafel für Snooker deshalb selbst, genau wie den Zwischenstand des
   * Frames (siehe `sideX.setScore`); eine künftige Fassung dieser
   * Schnittstelle könnte die Spalte unabhängig von `setRaceTo` ausgeben.
   */
  currentSetNo: number | null
  /**
   * Die Spielart — mit Schlüssel und Wertungsart, siehe `MatchDiscipline`.
   *
   * Die Tafel entscheidet daran ihre Zählleiste, und zwar an DIESER Angabe
   * und nicht an einer zweiten, die sie sich anderswo holt.
   */
  discipline: MatchDiscipline
  /** Nötig auf den turnierübergreifenden Seiten (Order of Play, Livescores). */
  tourCode: string
  tournamentId: string
  tournamentName: string
  /**
   * Einzelpartie oder Begegnung. Die Schnittstelle liefert das seit langem;
   * hier stand es bis zum 13.09.2026 nicht, und deshalb standen Begegnung
   * und Einzel auf der Livescore-Seite gleichrangig untereinander.
   */
  kind: MatchKind
  /** Gesetzt, wenn diese Partie ein Einzel INNERHALB einer Begegnung ist. */
  parentMatchId: string | null
  /** Reihenfolge des Einzels in der Begegnung, 1-basiert. */
  rubberSeq: number | null
  /** Nur bei `kind === 'TIE'` gefuellt. */
  tie: MatchTieState | null
  sideA: MatchSide
  sideB: MatchSide
}

/**
 * Eine laufende Auszeit — die EINES Spielers.
 *
 * Restzeit UND Ueberzug, nicht eine Zahl mit Vorzeichen: eine abgelaufene
 * Auszeit hat keine negative Restzeit, sie hat einen Ueberzug -- und die
 * Anzeige soll das nicht aus einem Minuszeichen schliessen muessen.
 */
export interface MatchTimeout {
  side: 'A' | 'B'
  remainingSeconds: number
  overrunSeconds: number
  /** Laenger als einen Tag: das hat jemand vergessen zu beenden. */
  stale: boolean
}

/**
 * Das Zeitlimit einer Partie -- Heyball: "race to 7 ODER 100 Minuten, was
 * zuerst eintritt".
 *
 * `null` an der Tafel, wenn kein Zeitlimit gilt, noch nicht angestossen
 * wurde oder die Partie schon zu Ende ist -- dieselbe Lesart wie bei einer
 * leeren `timeouts`-Liste: eine erfundene Restzeit waere schlimmer als
 * keine.
 *
 * Restzeit UND Ueberzug wie bei {@link MatchTimeout}, aus demselben Grund.
 */
export interface MatchTimeLimit {
  allowedSeconds: number
  remainingSeconds: number
  overrunSeconds: number
  /**
   * Laeuft die Uhr GERADE dazu -- seit dem 21.09.2026 eine anhaltbare
   * Spieluhr (Auszeit, Rack-Ende, von Hand) und keine Wanduhr mehr. Eine
   * Tafel, die keinen Unterschied zwischen einer laufenden und einer
   * angehaltenen Uhr zeigt, sieht wie ein Fehler aus -- siehe
   * `competition.match_time_limit_state`.
   */
  running: boolean
}

/** Der Rang eines Sponsors — je Veranstaltung und nicht am Sponsor. */
export type SponsorRank = 'MAIN' | 'PREMIUM' | 'REGULAR'

/**
 * Ein Sponsor, wie ihn die Anzeigetafel braucht.
 *
 * Weniger als {@link Sponsor} im Fuß der Webseite: kein Anschriftenblock,
 * keine Beschreibung — ein Bildschirm im Saal zeigt ein Logo und sonst
 * nichts. Der Rang kommt trotzdem mit, denn er entscheidet über Standzeit
 * und Fläche.
 */
export interface BoardSponsor {
  id: string
  name: string
  rank: SponsorRank
  /** Leer, wenn keine hinterlegt ist. Die Tafel verlinkt nichts — sie ist
      eine Ansicht und keine Bedienung —, aber sie steht im Alternativtext. */
  website: string
  logo: ImageRef
}


export interface TableBoard {
  eventId: string
  eventName: string
  tableNumber: number
  /** Eigener Name des Tisches, z. B. "TV Table"; meist keiner. */
  tableName: string | null
  /**
   * Das Logo des Veranstalters, der diese Veranstaltung trägt — die Mitte
   * der Tafel.
   *
   * `null`, solange keines hinterlegt ist; dann bleibt es beim Kürzel. Es
   * kommt aus der Tafelantwort und nicht aus der Mandantenkonfiguration:
   * eine Tafel gehört einer Veranstaltung, und die gehört einem
   * Veranstalter — bei zwei Mandanten auf einer Anlage sind das zwei
   * verschiedene Logos an zwei Tischen.
   */
  organiserLogo: ImageRef | null
  match: Match | null
  /**
   * Die laufenden Auszeiten, hoechstens eine je Seite — und beide koennen
   * gleichzeitig laufen.
   *
   * Eine LISTE und kein einzelner Eintrag: bis zum 14.09.2026 kannte die
   * Partie nur eine Auszeit, und die Auszeit des einen Spielers beendete
   * die des anderen. Eine Auszeit gehoert aber einem von beiden; wollen
   * beide hinaus, nehmen beide ihre, und beide Uhren laufen nebeneinander.
   *
   * Leer heisst "keine laeuft" — kein Sonderfall gegen null.
   */
  timeouts: MatchTimeout[]
  /** Siehe {@link MatchTimeLimit} — `null`, wenn kein Zeitlimit anliegt. */
  timeLimit: MatchTimeLimit | null
  /**
   * Die Sponsoren der Veranstaltung, die beste Reihenfolge zuerst. Leer,
   * wenn keine gepflegt sind — dann bleibt es beim Hinweis auf die nächste
   * Partie.
   */
  sponsors: BoardSponsor[]
}

/**
 * Ein Tisch, wie ihn die Tischwahl am Bildschirm braucht.
 *
 * Weniger als alles, was an einem Tisch steht: keine Gruppe, keine
 * Disziplin, kein Fernsehmerkmal. Aus fünf Metern liest niemand die
 * Disziplin eines Tisches, den er noch nicht gewählt hat. Die Sperre muss
 * mit — ein defekter Tisch wird ausgegraut und nicht angeboten.
 */
export interface BoardTable {
  number: number
  name: string | null
  isBlocked: boolean
}

/**
 * Die Tischwahl einer Veranstaltung: /board/<eventId> ohne Nummer.
 *
 * Der Name steht daneben und nicht in jedem Tisch: die Auswahl braucht eine
 * Überschrift, damit der Aufbau sieht, dass die Kennung in der Adresse die
 * richtige ist. Eine leere Tischliste ist gültig — beim Aufbau sind die
 * Tische manchmal noch nicht angelegt.
 */
export interface BoardTables {
  eventId: string
  eventName: string
  tables: BoardTable[]
}

/**
 * Eine Veranstaltung in der Auswahl der Anzeigetafeln (/board).
 *
 * Bewusst knapp: was auf einer Kachel steht, die aus zwei Metern gelesen
 * wird, ist der Name, der Zeitraum und der Ort. Alles Weitere — Turniere,
 * Meldelisten, Plakate — gehört auf die Verbandsseite und nicht auf ein
 * Tablet, das gleich einen Satzstand zählen soll.
 */
export interface BoardEventItem {
  id: string
  name: string
  startDate: IsoDate
  endDate: IsoDate
  city: string | null
  /** ISO-3 des Landes, so knapp wie die Anwendung es liefert (z. B. "POL"). */
  country: string | null
  /** Läuft heute wirklich — nicht nur „im Fenster des Tafelcodes". */
  running: boolean
}

/**
 * Was /api/board/events liefert.
 *
 * `next` ist die nächste Veranstaltung NACH dem Fenster. Sie ist nicht
 * wählbar und soll es nicht sein — sie steht nur im leeren Zustand, damit
 * ein Bildschirm am Montagmorgen nicht wie ein defektes Gerät aussieht,
 * sondern sagt, worauf er wartet.
 */
export interface BoardEventList {
  events: BoardEventItem[]
  next: { name: string, startDate: IsoDate, endDate: IsoDate } | null
  /**
   * Die Bau-Kennung des Servers, der geantwortet hat.
   *
   * Sie fährt hier mit, damit die Veranstaltungswahl eine neue Fassung
   * bemerkt, ohne dafür eine eigene Frage zu stellen — die Seite frischt
   * diese Liste ohnehin alle zwei Minuten auf. Dieselbe Angabe wie in der
   * Tafelabfrage; die Begründung steht in
   * app/composables/useFassungswechsel.ts.
   *
   * Optional, damit ein älterer Server die Seite nicht bricht.
   */
  buildId?: string
}

/**
 * Eine Zeile im Spielverlauf, wie ihn die Webseite bekommt.
 *
 * Ohne Urheber: wer eine Auszeit genommen hat, gehört auf die Tribüne; wer
 * sie eingetragen hat, nicht.
 */
export interface MatchEventPublic {
  at: string
  kind: string
  side: 'A' | 'B' | null
  scoreA: number | null
  scoreB: number | null
  detail: Record<string, string | number> | null
  /**
   * Auf welchem Weg die Zeile entstanden ist — und ausdrücklich NICHT, wer
   * sie geschrieben hat. Der Urheber bleibt draussen (siehe oben); der Weg
   * ist eine Auskunft über das GERÄT und nicht über einen Menschen.
   *
   * Gebraucht wird er für genau eine Aussage, und die stand vorher falsch
   * da: „Shot clock acknowledged at the table". Quittiert wurde manchmal
   * aus dem Turnierbüro, und bei einem Einspruch ist das der Unterschied,
   * um den es geht.
   *
   * `null` bei jeder Zeile, die vor dem 16.09.2026 geschrieben wurde — und
   * dann sagt der Verlauf „bestätigt" und behauptet keinen Ort.
   */
  actorVia?: 'SESSION' | 'BOARD' | 'BOARD_PIN' | null
  /**
   * WER es war — und zwar NUR auf dem Weg über `/api/board/...`.
   *
   * Der öffentliche Verlauf hat dieses Feld nie; dort bleibt es bei dem Satz
   * über dieser Schnittstelle („wer sie eingetragen hat, gehört nicht auf
   * die Tribüne"). Im Schiedsrichtermenü ist es umgekehrt, seit der
   * 16.09.2026 die Anmeldung vom Tablet genommen hat: an EINEM Tablet
   * stehen im Lauf eines Tages mehrere Schiedsrichter, jeder weist sich mit
   * seinen sechs Ziffern aus, und der Auftraggeber verlangt ausdrücklich,
   * dass „im verlauf steht dann wer was gemacht hat". Ohne diesen Namen
   * wäre die PIN eine Hürde ohne Ertrag.
   *
   * `null` bei allem, was ein Gerät OHNE Ziffern getan hat — gezählt,
   * angestossen, Auszeit genommen. Dort stünde nur „Anzeigetafel · Tisch 7",
   * und das weiss am Tisch jeder schon.
   */
  actorName?: string | null
}

/**
 * Die Übertragung eines Tisches, wie sie an einer Partie hängt.
 *
 * `channelId` ist dieselbe Kennung wie in {@link StreamChannel}. Damit führt
 * das Zeichen an der Partie auf `/streams?channel=…` und schlägt dort GENAU
 * diesen Kanal auf — nicht den ersten der Liste.
 */
export interface MatchStream {
  channelId: string
  /**
   * Wohin das Bild geht — `null`, wenn der eigene Server noch keine Adresse
   * kennt (eine Sendung, die es dort nicht gibt).
   */
  url: string | null
  /**
   * Sendet dieser Kanal gerade?
   *
   * `null` heißt **unbekannt** und ist die ehrliche Antwort für eine frei
   * eingetragene Adresse: YouTube sagt uns nicht, ob dort jemand sendet. Nur
   * beim eigenen Streamserver steht `true` oder `false`.
   */
  isLive: boolean | null
  /**
   * Das Bild bringt den Stand schon mit — dann legt die Seite keinen zweiten
   * darüber.
   *
   * Viele Veranstalter blenden ihn im Sender ein (OBS und dergleichen). Zwei
   * Stände nebeneinander, die um Sekunden auseinanderliegen, sind schlimmer
   * als gar keiner: Der Zuschauer glaubt danach keinem von beiden.
   */
  showsScore: boolean
}
