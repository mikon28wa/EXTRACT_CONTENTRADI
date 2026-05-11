import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import axios from "axios";
import * as cheerio from "cheerio";
import TurndownService from "turndown";

async function startServer() {
  const app = express();
  const PORT = 3000;

  const turndownService = new TurndownService({
    headingStyle: 'atx',
    codeBlockStyle: 'fenced'
  });

  app.use(express.json());

  // API Route to fetch and extract content
  app.post("/api/fetch", async (req, res) => {
    const { url } = req.body;

    if (!url) {
      return res.status(400).json({ error: "URL is required" });
    }

    try {
      console.log(`Fetching URL: ${url}`);
      const response = await axios.get(url, {
        timeout: 10000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8'
        },
        validateStatus: (status) => status < 500 // Accept 404s etc to handle them gracefully
      });

      if (response.status !== 200) {
        return res.status(response.status).json({ 
          error: `HTTP Error ${response.status}: ${response.statusText}`,
          statusCode: response.status 
        });
      }

      const html = response.data;
      const $ = cheerio.load(html);

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
    } catch (error: unknown) {
      const err = error as { code?: string; message?: string };
      const isTimeout = err.code === 'ECONNABORTED';
      res.status(isTimeout ? 408 : 500).json({ 
        error: isTimeout ? "Request timed out" : (err.message || "Unknown error during fetch"),
        details: err.code
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
