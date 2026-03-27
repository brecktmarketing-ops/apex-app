// Scrape contact emails from peptide store websites
// Run: npx tsx scripts/scrape-peptide-emails.ts

import * as fs from 'fs';
import * as path from 'path';

const MASTER_CSV = '/Users/breckentroike/Documents/peptide_stores_master.csv';
const OUTPUT_CSV = '/Users/breckentroike/Documents/peptide_stores_with_emails.csv';

function parseCSV(raw: string): Record<string, string>[] {
  const lines = raw.trim().split('\n');
  const headers = lines[0].split(',');
  return lines.slice(1).map(line => {
    const vals = line.split(',');
    const obj: Record<string, string> = {};
    headers.forEach((h, i) => obj[h.trim()] = (vals[i] || '').trim());
    return obj;
  });
}

async function scrapeEmails(url: string): Promise<string[]> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36' },
    });
    clearTimeout(timeout);

    if (!res.ok) return [];
    const html = await res.text();

    // Extract emails from page
    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
    const found = html.match(emailRegex) || [];

    // Filter out junk emails
    const filtered = [...new Set(found)].filter(e =>
      !e.includes('example.com') &&
      !e.includes('wixpress') &&
      !e.includes('sentry') &&
      !e.includes('.png') &&
      !e.includes('.jpg') &&
      !e.endsWith('.js') &&
      !e.includes('wordpress') &&
      !e.includes('schema.org') &&
      e.length < 60
    );

    return filtered;
  } catch {
    return [];
  }
}

async function main() {
  const raw = fs.readFileSync(MASTER_CSV, 'utf-8');
  const stores = parseCSV(raw);

  console.log(`Found ${stores.length} stores. Scraping emails...\n`);

  const results: typeof stores = [];
  let emailCount = 0;

  for (let i = 0; i < stores.length; i++) {
    const store = stores[i];
    const domain = store.website || `https://${store.domain}`;

    process.stdout.write(`[${i + 1}/${stores.length}] ${store.company}... `);

    // Try main page, contact page, about page
    const urls = [
      domain,
      `${domain}/contact`,
      `${domain}/contact-us`,
      `${domain}/about`,
      `${domain}/pages/contact`,
      `${domain}/pages/about`,
    ];

    let allEmails: string[] = store.contact_email ? [store.contact_email] : [];

    for (const url of urls) {
      const emails = await scrapeEmails(url);
      allEmails.push(...emails);
    }

    allEmails = [...new Set(allEmails)].filter(e => e.length > 0);

    if (allEmails.length > 0) {
      store.contact_email = allEmails[0]; // Primary email
      store.all_emails = allEmails.join('; ');
      emailCount++;
      console.log(`✓ ${allEmails.join(', ')}`);
    } else {
      store.all_emails = '';
      console.log('✗ no email found');
    }

    results.push(store);

    // Small delay to avoid rate limiting
    await new Promise(r => setTimeout(r, 500));
  }

  // Write results
  const headers = Object.keys(results[0] || {});
  const csvOut = [
    headers.join(','),
    ...results.map(r => headers.map(h => `"${(r[h] || '').replace(/"/g, '""')}"`).join(','))
  ].join('\n');

  fs.writeFileSync(OUTPUT_CSV, csvOut);
  console.log(`\nDone! ${emailCount}/${stores.length} stores have emails.`);
  console.log(`Saved to: ${OUTPUT_CSV}`);
}

main();
