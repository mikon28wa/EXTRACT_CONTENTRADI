import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import axios from "axios";
import * as cheerio from "cheerio";
import TurndownService from "turndown";
import rateLimit from "express-rate-limit";
import ipaddr from "ipaddr.js";
import sanitizeHtml from "sanitize-html";
import { lookup as dnsLookup } from "dns";

// URL-Validierung: Nur HTTP/HTTPS und keine privaten IPs
function isValidUrl(urlString: string): boolean {
  try {
    const url = new URL(urlString);
    
    // Nur HTTP und HTTPS erlauben
    if (!['http:', 'https:'].includes(url.protocol)) {
      return false;
    }
    
    const hostname = url.hostname;
    
    // IP-Adresse validieren
    try {
      if (ipaddr.isValid(hostname)) {
        const addr = ipaddr.parse(hostname);
        // Private IP-Bereiche blockieren
        if ((addr as any).range() !== 'unicast') {
          return false;
        }
      }
    } catch {
      // Hostname ist keine IP, DNS-Rebinding-Schutz durch spätere Prüfung
    }
    
    return true;
  } catch {
    return false;
  }
}

// Schutz vor DNS Rebinding: IP nach Auflösung prüfen
function isSafeIP(ip: string): boolean {
  try {
    const addr = ipaddr.parse(ip);
    // Nur unicast IPs erlauben (keine privaten, loopback, link-local etc.)
    return (addr as any).range() === 'unicast';
  } catch {
    return false;
  }
}

// Custom DNS Lookup Funktion
function customLookup(hostname: string, family: number | null, callback: any) {
  if (typeof family === 'function') {
    callback = family;
    family = 0;
  }
  
  dnsLookup(hostname, { all: true }, (err: any, addresses: any[]) => {
    if (err) {
      return callback(err);
    }
    // Alle aufgelösten IPs prüfen
    for (const addr of addresses) {
      const ip = addr.address;
      if (!isSafeIP(ip)) {
        return callback(new Error(`DNS-Rebinding-Angriff erkannt: ${ip} ist nicht erlaubt`));
      }
    }
    // Erste sichere IP zurückgeben
    callback(null, addresses[0].address, addresses[0].family);
  });
}

async function startServer() {
  const app = express();
  const PORT = 3000;
  
  const turndownService = new TurndownService({
    headingStyle: 'atx',
    codeBlockStyle: 'fenced'
  });

  app.use(express.json());

  // Rate Limiting konfigurieren
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 Minuten
    max: 100, // Max 100 Requests pro IP im Zeitfenster
    message: { error: "Zu viele Anfragen. Bitte warten Sie." },
    standardHeaders: true,
    legacyHeaders: false,
  });

  // Rate Limiting auf alle API-Routen anwenden
  app.use("/api", limiter);

  // CORS-Einstellungen explizit konfigurieren
  app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*'); // In Produktion auf spezifische Domains beschränken
    res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') {
      return res.sendStatus(204);
    }
    next();
  });

  // API Route to fetch and extract content
  app.post("/api/fetch", async (req, res) => {
    const { url } = req.body;

    if (!url) {
      return res.status(400).json({ error: "URL is required" });
    }

    // URL validieren
    if (!isValidUrl(url)) {
      return res.status(400).json({ 
        error: "Ungültige URL. Nur HTTP/HTTPS URLs von öffentlichen Servern sind erlaubt." 
      });
    }

    try {
      console.log(`Fetching URL: ${url}`);
      
      // Axios mit DNS-Callback für IP-Validierung
      const response = await axios.get(url, {
        timeout: 10000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8'
        },
        validateStatus: (status) => status < 500,
        // DNS Lookup mit Sicherheitsprüfung
        lookup: customLookup
      });

      if (response.status !== 200) {
        return res.status(response.status).json({ 
          error: `HTTP Error ${response.status}: ${response.statusText}`,
          statusCode: response.status 
        });
      }

      const html = response.data;
      
      // HTML sanitizen bevor es verarbeitet wird
      const sanitizedHtml = sanitizeHtml(html, {
        allowedTags: sanitizeHtml.defaults.allowedTags.concat(['img']),
        allowedAttributes: {
          ...sanitizeHtml.defaults.allowedAttributes,
          img: ['src', 'alt', 'title']
        },
        disallowedTagsMode: 'discard'
      });

      const $ = cheerio.load(sanitizedHtml);

      // Remove noise
      $('script, style, nav, footer, header, iframe, noscript, .ad, .sidebar').remove();

      let title = $('title').text() || $('h1').first().text() || "Untitled Content";
      let content = "";

      // Try specialized Mistral/Chat selectors or generic ones
      const selectors = [
        '.chat-container', 
        '.messages-container',
        '[role="log"]',
        'main', 
        'article', 
        '#content',
        '.post-content',
        'body' // Absolute fallback
      ];

      for (const selector of selectors) {
        const el = $(selector);
        if (el.length > 0) {
          // If we find a good container, prefer its HTML for better turndown results
          const htmlContent = el.html();
          if (htmlContent && htmlContent.length > 100) {
            content = turndownService.turndown(htmlContent);
            break;
          }
        }
      }

      if (!content) {
        content = turndownService.turndown($('body').html() || "");
      }

      res.json({ title, content });
    } catch (error: any) {
      const isTimeout = error.code === 'ECONNABORTED';
      // Generische Fehlermeldung ohne interne Details
      res.status(isTimeout ? 408 : 500).json({ 
        error: isTimeout ? "Request timed out" : "Fehler bei der Verarbeitung der Anfrage"
      });
    }
  });

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
