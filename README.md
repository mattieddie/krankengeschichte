# Krankengeschichte

Persönliches, passwortgeschütztes Symptom-Tagebuch für unterwegs (Smartphone-optimiert).
Reines statisches Web-App (kein Build-Schritt nötig) mit [Supabase](https://supabase.com) als
Backend für Login und Datenspeicherung.

## Funktionen

- Neuer Eintrag: Datum + optionale Uhrzeit, möglicher Auslöser (Freitext)
- Symptome zum Ankreuzen (Anschwellung, Angioödem, Urtikaria, Schwindel, Jucken, Übelkeit,
  Erbrechen, Sprachfindungsstörung, Tremor) + Freifeld für weitere Symptome
- Zusätzliche Medikamente (Freitext)
- Besonderes (Freitext)
- Schmerz-/Symptomort: Freitext + anklickbare Körperkarte (Vorder-/Rückseite) mit
  Farbcodierung je Symptom und Reset-Knopf zum Entfernen aller Punkte
- Foto-Anhänge pro Eintrag (z.B. Foto der Hautreaktion), sicher in Supabase Storage gespeichert
- Übersicht als Liste oder Kalender, mit Filter nach Symptom und Sortierung nach Datum/Uhrzeit
- Export als PDF (Druckansicht, inkl. Körperkarte und Fotos) oder CSV für den Arztbesuch,
  optional auf einen Zeitraum eingegrenzt
- Login mit E-Mail/Passwort (Supabase Auth), Daten sind über Row Level Security abgesichert
- Beobachter/innen einladen: weitere Personen können deine Einträge nur lesen, nicht bearbeiten

## Einmaliges Setup

### 1. Supabase-Projekt erstellen

1. Auf [supabase.com](https://supabase.com) kostenlos registrieren und ein neues Projekt anlegen.
2. Im Dashboard unter **SQL Editor** → **New query** den kompletten Inhalt von
   [`sql/schema.sql`](sql/schema.sql) einfügen und ausführen. Das erstellt die Tabellen
   `entries` und `shares`, den Storage-Bucket `entry-photos` für Fotos, sowie alle
   Row-Level-Security-Regeln. Das Skript ist gefahrlos mehrfach ausführbar — nach jedem
   Update dieses Projekts (z.B. neue Spalten) einfach den aktuellen Inhalt erneut einfügen
   und ausführen.
3. Unter **Authentication → Users** → **Add user** dein eigenes Konto (E-Mail + Passwort)
   anlegen.
4. Unter **Authentication → Providers → Email** die Option **"Allow new users to sign up"**
   deaktivieren, damit sich niemand sonst selbst registrieren kann.
5. Unter **Settings → API** die **Project URL** und den **anon public key** kopieren und in
   [`js/config.js`](js/config.js) eintragen.

### 2. Auf GitHub Pages veröffentlichen

```bash
git add -A
git commit -m "Initial commit"
git push -u origin main
```

Danach im GitHub-Repo unter **Settings → Pages** als Quelle den `main`-Branch (Root) wählen.
Die App ist danach unter `https://<dein-github-name>.github.io/krankengeschichte/` erreichbar.

### Eigene Domain (daniela.metter.uk) via Cloudflare

Die Datei [`CNAME`](CNAME) im Repo-Root enthält bereits `daniela.metter.uk`.

1. Im Repo unter **Settings → Pages** bei *Custom domain* `daniela.metter.uk` eintragen.
2. Bei Cloudflare (Domain `metter.uk`) unter **DNS** einen Eintrag hinzufügen:
   Type `CNAME`, Name `daniela`, Target `<dein-github-name>.github.io`,
   Proxy-Status zunächst **DNS only** (grau).
3. Warten bis GitHub die Domain unter Pages mit einem grünen Haken bestätigt, dann
   **Enforce HTTPS** aktivieren.
4. Optional danach den Cloudflare-Eintrag auf **Proxied** (orange) umstellen — dabei unter
   **SSL/TLS → Overview** den Modus auf **Full (strict)** setzen, sonst entsteht eine
   Redirect-Loop.

> Der `anon` Key in `config.js` ist bewusst öffentlich im Code sichtbar — das ist bei Supabase
> so vorgesehen. Der eigentliche Datenschutz kommt durch die Row-Level-Security-Regeln in
> `sql/schema.sql`: Ohne gültigen Login (dein Passwort) kann niemand Einträge lesen oder
> schreiben.

## Lokal testen

Kein Build nötig, einfach einen statischen Server starten, z.B. mit Python:

```bash
python -m http.server 8080
```

Dann `http://localhost:8080` öffnen.

## Beobachter/innen einladen

Unter **Beobachter** im unteren Menü kannst du eine E-Mail-Adresse hinterlegen. Die
eingeladene Person braucht anschliessend ein eigenes Konto mit **genau dieser** E-Mail-Adresse
(du legst es ihr im Supabase-Dashboard unter Authentication → Users an, oder aktivierst
vorübergehend die Registrierung). Sie sieht dann deine Einträge nur lesend, kann aber nichts
verändern oder löschen.

## Als App auf dem Smartphone installieren

Die Seite ist eine Progressive Web App. Im mobilen Browser über "Zum Startbildschirm
hinzufügen" (iOS: Teilen-Menü, Android: Browser-Menü) installieren — danach startet sie wie
eine normale App, auch mit Offline-Grundgerüst.
