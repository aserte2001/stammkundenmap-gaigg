import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Datenschutz · Gartengestaltung Gaigg StammKundenMap",
  description:
    "Datenschutzerklärung für die StammKundenMap der Gartengestaltung Gaigg. Informationen zur 3D-Welt-Generierung über World Labs Marble.",
  robots: { index: true, follow: true },
};

export default function DatenschutzPage() {
  return (
    <main className="bg-background text-foreground mx-auto max-w-3xl px-6 py-12">
      <header className="mb-8 space-y-2">
        <Link href="/" className="text-muted-foreground hover:text-foreground text-sm">
          ← Zurück zur Karte
        </Link>
        <h1 className="text-3xl font-semibold tracking-tight">Datenschutzerklärung</h1>
        <p className="text-muted-foreground text-sm">
          Stand: 16. Mai 2026 · Diese Erklärung beschreibt wie die Gartengestaltung
          Gaigg mit personenbezogenen Daten in der internen StammKundenMap und in den
          generierten 3D-Welten umgeht.
        </p>
      </header>

      <section className="prose prose-invert max-w-none space-y-6">
        <h2>1. Verantwortlicher</h2>
        <p>
          Gartengestaltung Gaigg <br />
          Simon Geig <br />
          (Adresse, Telefon, E-Mail werden ergänzt)
        </p>

        <h2>2. Zweck der Datenverarbeitung</h2>
        <p>
          Die StammKundenMap ist ein internes Werkzeug der Gartengestaltung Gaigg zur
          Verwaltung von Kundendaten und zur Dokumentation der bei den Kunden
          ausgeführten Arbeiten. Die generierten 3D-Welten dienen ausschließlich der
          internen Beratung und der Visualisierung gegenüber dem jeweiligen Stammkunden.
          Eine Veröffentlichung erfolgt nicht.
        </p>

        <h2>3. Erhobene Datenkategorien</h2>
        <ul>
          <li>
            <strong>Kunden-Stammdaten</strong>: Name, Adresse, Auftragsdaten, Notizen.
            Quelle: Vertragsverhältnis mit der Gartengestaltung Gaigg. Rechtsgrundlage:
            Art. 6 Abs. 1 lit. b DSGVO (Vertragserfüllung).
          </li>
          <li>
            <strong>Foto-/Bildmaterial</strong>: Aufnahmen der Gartenanlage,
            angefertigt durch Gartengestaltung Gaigg im Auftrag des Kunden. Quelle:
            Erhebung vor Ort beim Kunden. Rechtsgrundlage: Art. 6 Abs. 1 lit. b DSGVO
            (Vertragsdurchführung) bzw. Einwilligung des Kunden.
          </li>
          <li>
            <strong>3D-Welt-Assets</strong> (Gaussian-Splat-Dateien, Thumbnails,
            Panoramen): Aus den Foto-Eingaben automatisch generiert. Speicherung im
            CDN von World Labs (siehe Punkt 5).
          </li>
        </ul>

        <h2>4. Speicherdauer</h2>
        <ul>
          <li>
            Stammdaten: für die Dauer der Geschäftsbeziehung plus die gesetzlichen
            Aufbewahrungsfristen.
          </li>
          <li>
            Foto-Material und 3D-Welten: bis zum Widerruf durch den Kunden, längstens
            jedoch bis zum Ende der Geschäftsbeziehung.
          </li>
          <li>
            Lokale Capture-Zwischenstände im Browser des Admins: automatisch nach 7
            Tagen gelöscht (IndexedDB).
          </li>
        </ul>

        <h2>5. Auftragsverarbeitung — World Labs Inc. (USA)</h2>
        <p>
          Für die Generierung der 3D-Welten setzen wir die <strong>Marble API</strong>
          des Anbieters <strong>World Labs Inc.</strong> ein (San Francisco, USA). Im
          Rahmen der Generierung werden die hochgeladenen Fotos an World Labs
          übermittelt, dort verarbeitet und das Ergebnis (Gaussian-Splat-Datei,
          Thumbnail, Panorama) zurückgegeben.
        </p>
        <p>
          Eine Auftragsverarbeitungs-Vereinbarung (AVV) gemäß Art. 28 DSGVO ist in
          Vorbereitung. Bis zum Vorliegen der unterschriebenen AVV werden in den
          Capture-Workflows keine personenbezogenen Daten Dritter (z.B. erkennbare
          Personen, Hausnummern, Kennzeichen) übermittelt — der Admin kontrolliert
          dies vor jedem Upload.
        </p>
        <p>
          Datenübermittlung in die USA: World Labs Inc. ist ein Unternehmen mit Sitz
          in San Francisco. Die Übermittlung erfolgt auf Basis der
          EU-Standardvertragsklauseln bzw. nach Inkrafttreten einer entsprechenden
          Zertifizierung über das EU-US Data Privacy Framework. Status der
          Vertragsanbahnung wird laufend dokumentiert (siehe interne Notiz im Repo).
        </p>

        <h2>6. Hosting & Infrastruktur</h2>
        <p>
          Die Anwendung wird auf <strong>Vercel Inc.</strong> (USA, Frankfurt-Region)
          gehostet. Statische Assets, Funktions-Logs und Cron-Jobs laufen in der
          Vercel-Plattform. Für das Hosting besteht ein eigener Auftragsverarbeitungs-Vertrag
          mit Vercel Inc.
        </p>
        <p>
          Karten-Tiles werden über <strong>Mapbox</strong> (USA) bezogen, optionale
          3D-Tiles über die <strong>Google Maps Tiles API</strong>. Für beide bestehen
          gesonderte Datenverarbeitungs-Vereinbarungen.
        </p>

        <h2>7. Zugriff auf die Anwendung</h2>
        <p>
          Die StammKundenMap ist passwortgeschützt (Vercel Password Protection). Nur
          Mitarbeiter*innen der Gartengestaltung Gaigg haben Zugriff. Stammkunden sehen
          ihre 3D-Welt nur, wenn der Admin sie ihnen vor Ort zeigt oder die URL
          temporär freigibt.
        </p>

        <h2>8. Rechte der Betroffenen</h2>
        <ul>
          <li>Auskunft über gespeicherte Daten (Art. 15 DSGVO)</li>
          <li>Berichtigung unrichtiger Daten (Art. 16)</li>
          <li>Löschung (Art. 17)</li>
          <li>Einschränkung der Verarbeitung (Art. 18)</li>
          <li>Datenübertragbarkeit (Art. 20)</li>
          <li>Widerspruch gegen die Verarbeitung (Art. 21)</li>
          <li>Beschwerderecht bei der österreichischen Datenschutzbehörde (DSB)</li>
        </ul>

        <h2>9. Kontakt für Datenschutzanfragen</h2>
        <p>
          Anfragen bitte schriftlich an die Gartengestaltung Gaigg (Postanschrift) oder
          per E-Mail an die im Impressum genannte Adresse. Der Verantwortliche prüft
          und beantwortet jede Anfrage innerhalb der gesetzlichen Frist von einem Monat.
        </p>

        <h2>10. Änderungen dieser Erklärung</h2>
        <p>
          Diese Erklärung kann an geänderte Rechtslage oder erweiterte
          Funktionalitäten angepasst werden. Die jeweils aktuelle Version ist immer
          unter <Link href="/datenschutz">/datenschutz</Link> abrufbar.
        </p>
      </section>
    </main>
  );
}
