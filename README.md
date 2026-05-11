<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Link to PDF

Eine Webanwendung, die URLs in PDF-Dokumente konvertiert. Die App ruft Webseiteninhalte ab, extrahiert den relevanten Text und ermöglicht die Generierung eines PDF-Dokuments.

## Features

- 🌐 **URL Fetching**: Abruf von Webseiteninhalten mit automatischer Bereinigung von unnötigen Elementen
- 📝 **Content Extraction**: Intelligente Extraktion von Hauptinhalten mittels Cheerio und Turndown
- 📄 **PDF Generierung**: Konvertierung von Inhalten zu PDF mit html2canvas und jsPDF
- 🎨 **Modernes UI**: React-basiertes Interface mit Tailwind CSS und Motion-Animationen
- 🔍 **Markdown Support**: Anzeige von Inhalten mit React Markdown
- 🚀 **AI Integration**: Nutzung von Google Gemini AI für erweiterte Funktionen

## Tech Stack

- **Frontend**: React 19, Vite, TypeScript, Tailwind CSS
- **Backend**: Express.js, Node.js
- **AI**: Google Generative AI (@google/genai)
- **Tools**: 
  - `cheerio` - HTML Parsing
  - `turndown` - HTML zu Markdown Konvertierung
  - `html2canvas` - Screenshot-Erstellung
  - `jsPDF` - PDF Generierung
  - `lucide-react` - Icons
  - `motion` - Animationen

## Installation & Lokale Entwicklung

**Voraussetzungen:**
- Node.js (aktuelle LTS Version empfohlen)
- npm oder pnpm

### Schritte

1. **Repository klonen und Dependencies installieren:**
   ```bash
   git clone <repository-url>
   cd link-to-pdf
   npm install
   ```

2. **Umgebungsvariablen konfigurieren:**
   
   Erstelle eine `.env.local` Datei basierend auf `.env.example`:
   ```bash
   cp .env.example .env.local
   ```
   
   Trage deinen Gemini API Key ein:
   ```
   GEMINI_API_KEY=dein_api_key_hier
   APP_URL=http://localhost:3000
   ```

3. **Entwicklungsserver starten:**
   ```bash
   npm run dev
   ```
   
   Die Anwendung ist dann unter `http://localhost:3000` verfügbar.

## Verfügbare Scripts

| Command | Beschreibung |
|---------|-------------|
| `npm run dev` | Startet den Entwicklungsserver mit Hot-Reload |
| `npm run build` | Erstellt ein Production-Build im `dist/` Ordner |
| `npm run preview` | Vorschau des Production-Builds |
| `npm run clean` | Entfernt den `dist/` Ordner |
| `npm run lint` | Führt TypeScript Typ-Überprüfung durch |

## API Endpoints

### POST `/api/fetch`

Ruft Inhalte von einer URL ab und extrahiert den Text.

**Request Body:**
```json
{
  "url": "https://example.com/article"
}
```

**Response:**
```json
{
  "title": "Article Title",
  "content": "# Article Content\n\nMarkdown formatted content..."
}
```

**Fehlerbehandlung:**
- `400` - URL fehlt
- `404` - Seite nicht gefunden
- `408` - Request Timeout
- `500` - Serverfehler

## Deployment

### Docker

Ein `Dockerfile` ist im Repository enthalten. Zum Bauen und Ausführen:

```bash
docker build -t link-to-pdf .
docker run -p 3000:3000 -e GEMINI_API_KEY=your_key link-to-pdf
```

### Google AI Studio

Diese Anwendung wurde mit [Google AI Studio](https://ai.studio/apps/72ad0899-bac4-4acd-a386-b98b4f9757b4) entwickelt und kann dort direkt deployed werden.

## Projektstruktur

```
link-to-pdf/
├── src/
│   ├── App.tsx          # Hauptkomponente mit UI-Logik
│   ├── main.tsx         # Entry Point für React
│   └── index.css        # Globale Styles
├── server.ts            # Express Server mit API-Routen
├── index.html           # HTML Template
├── package.json         # Dependencies und Scripts
├── tsconfig.json        # TypeScript Konfiguration
├── vite.config.ts       # Vite Konfiguration
├── Dockerfile           # Docker Build Konfiguration
└── .env.example         # Beispiel Umgebungsvariablen
```

## Lizenz

Dieses Projekt ist privat und nicht für öffentliche Verteilung bestimmt.

## Support

Bei Fragen oder Problemen öffne bitte ein Issue im Repository oder kontaktiere das Entwicklungsteam.
