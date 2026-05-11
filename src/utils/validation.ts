/**
 * Validation schemas using Zod for GDPR/Security compliance
 */

import { z } from 'zod';

export const UrlSchema = z.string().url("Ungültiges URL-Format");

export const UrlListSchema = z.string()
  .transform(v => v.split('\n').map(u => u.trim()).filter(Boolean))
  .pipe(z.array(UrlSchema).min(1, "Mindestens eine URL erforderlich"));

export const ManualContentSchema = z.string()
  .min(10, "Inhalt zu kurz (Min. 10 Zeichen)");
