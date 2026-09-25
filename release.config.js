// semantic-release — Konfiguration fuer bb-score, die Anzeigetafel.
//
// Release-Branch ist "main", wie bei epbf-website und aus demselben Grund:
// es gibt keinen zweiten Branch, der weiter vorne liegt. Bei bitsbutler-v2
// und epbf-bitsbutler-v2-admin ist das anders -- dort waere "main"
// einzutragen genau der Fehler, den diese Regel verhindern soll.
//
// WARUM DIE TAFEL EINE EIGENE VERSION BRAUCHT
//
// Sie zog am 25.09.2026 aus der EPBF-Seite aus und ist seither ein eigener
// Dienst mit eigener Unit, eigenem Namen und eigenem Ausrollweg. Eine
// Version, die von der Webseite mitgezaehlt wird, saesse auf jedem Tablet
// in jeder Halle und bezoege sich auf etwas anderes -- und in einer Halle
// ist die Fassungsnummer keine Zierde: `useVersionSwitch` liest sie, um zu
// entscheiden, ob mitten im Betrieb neu geladen werden darf.
export default {
  branches: ['main'],
  plugins: [
    '@semantic-release/commit-analyzer',
    '@semantic-release/release-notes-generator',
    [
      '@semantic-release/changelog',
      {
        changelogFile: 'CHANGELOG.md',
      },
    ],
    [
      '@semantic-release/npm',
      {
        // Nur package.json fortschreiben, nichts auf npm veroeffentlichen --
        // die Tafel ist kein Paket.
        npmPublish: false,
      },
    ],
    [
      '@semantic-release/git',
      {
        assets: ['CHANGELOG.md', 'package.json', 'package-lock.json'],
        // Deutscher Satz nach dem Praefix, wie im ganzen Projekt ueblich.
        // "[skip ci]" verhindert, dass dieser Commit den Release-Workflow
        // erneut ausloest.
        message: 'chore: Version ${nextRelease.version} freigegeben [skip ci]\n\n${nextRelease.notes}',
      },
    ],
    '@semantic-release/github',
  ],
}
