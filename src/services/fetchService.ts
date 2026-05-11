/**
 * Service for fetching and extracting content from URLs
 */

import axios from 'axios';
import * as cheerio from 'cheerio';
import TurndownService from 'turndown';
import { NOISE_SELECTORS, CONTENT_SELECTORS } from '../constants';

export interface FetchResult {
  title: string;
  content: string;
}

const turndownService = new TurndownService({
  headingStyle: 'atx',
  codeBlockStyle: 'fenced'
});

/**
 * Fetch and extract content from a URL
 */
export async function fetchUrlContent(url: string): Promise<FetchResult> {
  const response = await axios.get(url, {
    timeout: 10000,
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8'
    },
    validateStatus: (status) => status < 500
  });

  if (response.status !== 200) {
    throw new Error(`HTTP Error ${response.status}: ${response.statusText}`);
  }

  return extractContentFromHtml(response.data);
}

/**
 * Extract content from HTML string
 */
export function extractContentFromHtml(html: string): FetchResult {
  const $ = cheerio.load(html);

  // Remove noise
  $(NOISE_SELECTORS.join(', ')).remove();

  const title = $('title').text() || $('h1').first().text() || "Untitled Content";
  
  let content = "";

  // Try specialized selectors or generic ones
  for (const selector of CONTENT_SELECTORS) {
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

  return { title, content };
}
