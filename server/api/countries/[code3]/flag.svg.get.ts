/**
 * Die eigene Flaggengrafik eines Landes, durchgereicht.
 *
 * Zwei Länder führen eine: die EPBF selbst — für Spieler ohne Landesverband —
 * und Syrien. Alle übrigen zeichnet der mitgelieferte Flaggensatz im Browser,
 * und dafür kommt hier nichts an.
 *
 * Durchgereicht und nicht unmittelbar verwiesen, aus demselben Grund wie beim
 * Kalender: die Adresse steht im Quelltext jeder Seite, und der Name des
 * Anwendungsservers gehört nicht dorthin. Ein `img`-Element setzt ausserdem
 * keine Kopffelder — es kann den Mandantenschlüssel gar nicht mitschicken.
 * Hier braucht es ihn auch nicht: es gibt nur ein Länderverzeichnis.
 */
export default defineEventHandler(async (event) => {
  const raw = String(getRouterParam(event, 'code3') ?? '').replace(/\.svg$/i, '')
  // Alles aus der Adresse ist eine Behauptung. Der Bestand führt drei- und
  // vierstellige Kennungen (EPBF ist vier), mehr geht nicht durch.
  if (!/^[A-Za-z]{3,4}$/.test(raw)) {
    throw createError({ statusCode: 400, statusMessage: 'Kein Länderkürzel' })
  }

  const base = String(process.env.BB_API ?? '')
  if (!base) {
    throw createError({ statusCode: 503, statusMessage: 'Flagge nicht erreichbar' })
  }

  const response = await $fetch.raw<string>(
    `${base}/api/public/v1/countries/${raw.toUpperCase()}/flag.svg`,
    { responseType: 'text', timeout: 5_000 },
  )

  setHeader(event, 'content-type', response.headers.get('content-type') ?? 'image/svg+xml')
  // Ein Tag. Eine Flagge ändert sich seltener als alles andere auf dieser
  // Seite; sie jedes Mal neu zu holen wäre eine Anfrage je Tabellenzeile.
  setHeader(event, 'cache-control', 'public, max-age=86400')
  return String(response._data ?? '')
})
