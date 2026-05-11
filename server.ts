import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import axios from "axios";
import * as cheerio from "cheerio";
import TurndownService from "turndown";

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Cache für wiederholte URL-Anfragen (Performance-Optimierung)
  const urlCache = new Map<string, { data: any; timestamp: number }>();
  const CACHE_TTL = 5 * 60 * 1000; // 5 Minuten

  const turndownService = new TurndownService({
    headingStyle: 'atx',
    codeBlockStyle: 'fenced'
  });

  app.use(express.json());

  // API Route to fetch and extract content with caching
  app.post("/api/fetch", async (req, res) => {
    const { url } = req.body;

    if (!url) {
      return res.status(400).json({ error: "URL is required" });
    }

    // Check cache first
    const cached = urlCache.get(url);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      console.log(`Cache hit for URL: ${url}`);
      return res.json(cached.data);
    }

    try {
      console.log(`Fetching URL: ${url}`);
      
      // Timeout-Optimierung mit AbortController
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);
      
      const response = await axios.get(url, {
        signal: controller.signal,
        timeout: 8000,
        maxRedirects: 3,
        maxContentLength: 5 * 1024 * 1024, // 5MB Limit
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Encoding': 'gzip, deflate',
          'Connection': 'keep-alive'
        },
        validateStatus: (status) => status < 500,
        decompress: true
      });
      
      clearTimeout(timeoutId);

      if (response.status !== 200) {
        const errorData = { 
          error: `HTTP Error ${response.status}: ${response.statusText}`,
          statusCode: response.status 
        };
        urlCache.set(url, { data: errorData, timestamp: Date.now() });
        return res.status(response.status).json(errorData);
      }

      const html = response.data;
      const $ = cheerio.load(html);

      // Remove noise - optimized selector batch
      $('script, style, nav, footer, header, iframe, noscript, .ad, .sidebar, .advertisement, .cookie-banner').remove();

      let title = $('title').text() || $('h1').first().text() || "Untitled Content";
      let content = "";

      // Optimized selector priority
      const selectors = [
        '.chat-container', 
        '.messages-container',
        '[role="log"]',
        'main', 
        'article', 
        '#content',
        '.post-content',
        '.content',
        'body'
      ];

      for (const selector of selectors) {
        const el = $(selector);
        if (el.length > 0) {
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

      const resultData = { title, content };
      
      // Cache successful result
      urlCache.set(url, { data: resultData, timestamp: Date.now() });
      
      // Cleanup old cache entries (keep last 100)
      if (urlCache.size > 100) {
        const oldestKey = Array.from(urlCache.keys())[0];
        urlCache.delete(oldestKey);
      }

      res.json(resultData);
    } catch (error: any) {
      const isTimeout = error.code === 'ECONNABORTED' || error.name === 'AbortError';
      const errorData = { 
        error: isTimeout ? "Request timed out" : (error.message || "Unknown error during fetch"),
        details: error.code
      };
      urlCache.set(url, { data: errorData, timestamp: Date.now() });
      res.status(isTimeout ? 408 : 500).json(errorData);
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
