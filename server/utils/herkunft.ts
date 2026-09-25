import type { H3Event } from 'h3'

/**
 * Die Kette `X-Forwarded-For`, wie sie weitergereicht werden muss.
 *
 * WOFÜR
 *
 * Der Browser spricht die Anwendung nie selbst an (siehe `session.post.ts`).
 * Damit ist dieser Server für sie der Aufrufer — und jede Entscheidung, die
 * die Anwendung an der Herkunft trifft, träfe sie für alle Besucher
 * gemeinsam. Bei „Kennwort vergessen" ist das eine Bremse von zwanzig
 * Zurücksetzungen je Stunde: ohne diesen Kopf bekäme der einundzwanzigste
 * Besucher stillschweigend keine Mail, und 3 468 übernommene Konten sollen
 * alle über diesen Weg zu ihrem ersten Kennwort kommen.
 *
 * WARUM ANGEHÄNGT UND NICHT ERSETZT
 *
 * Weil das ist, was ein Proxy tut. Die Anwendung arbeitet die Kette von
 * rechts nach links ab (Tomcats RemoteIpValve, in `application.yml` über
 * `server.forward-headers-strategy: native`) und nimmt den ersten Eintrag,
 * der nicht von einer bekannten Gegenstelle kommt. Schickt ein Browser
 * diesem Server einen erfundenen Kopf, steht die Adresse, unter der er
 * wirklich verbunden ist, rechts davon — und die gewinnt. Aus dem Internet
 * ist der Wert damit nicht zu setzen.
 *
 * Von localhost aus schon: localhost gehört zu den bekannten Gegenstellen.
 * Das ist der Entwicklungsfall und zugleich der einzige Weg, die Bremse
 * überhaupt zu prüfen, ohne zwanzig Rechner zu haben.
 */
export function herkunftskette(event: H3Event): string | undefined {
  const kette = getRequestHeader(event, 'x-forwarded-for')
  const gegenstelle = event.node.req.socket.remoteAddress
  const zusammen = [kette, gegenstelle].filter(Boolean).join(', ')
  return zusammen || undefined
}
