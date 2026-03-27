// Find more peptide stores and scrape their emails
// Run: npx tsx scripts/find-more-peptide-stores.ts

import * as fs from 'fs';

const OUTPUT = '/Users/breckentroike/Documents/peptide_outreach_list.csv';

// Extended list of peptide/SARM/research chem stores to scrape
const STORES = [
  // Already have these 25, adding new ones
  { company: 'Core Peptides', domain: 'corepeptides.com' },
  { company: 'Amino Asylum', domain: 'aminoasylum.shop' },
  { company: 'Limitless Life Nootropics', domain: 'limitlesslifenootropics.com' },
  { company: 'Peptide Sciences', domain: 'peptidesciences.com' },
  { company: 'Behemoth Labz', domain: 'behemothlabz.com' },
  { company: 'Chemyo', domain: 'chemyo.com' },
  { company: 'Science.bio', domain: 'science.bio' },
  { company: 'Rats Army', domain: 'ratsarmy.com' },
  { company: 'Umbrella Labs', domain: 'umbrellalabs.is' },
  { company: 'US Gains', domain: 'usgains.com' },
  { company: 'Nootropic Source', domain: 'nootropicsource.com' },
  { company: 'Narrowlabs', domain: 'narrowlabs.com' },
  { company: 'Chemist Warehouse Peptides', domain: 'peptidewarehouse.com' },
  { company: 'Evolve Clinics Research', domain: 'evolveclinicsresearch.com' },
  { company: 'Peptideshealth', domain: 'peptideshealth.info' },
  { company: 'Research Peptides', domain: 'researchpeptides.com' },
  { company: 'Peptide Pros', domain: 'peptidepros.net' },
  { company: 'Enhanced Peptides', domain: 'enhancedpeptides.com' },
  { company: 'Pinnacle Peptides', domain: 'pinnaclepeptides.com' },
  { company: 'American Research Labs', domain: 'americanresearchlabs.com' },
  { company: 'Quality Peptides', domain: 'qualitypeptides.com' },
  { company: 'Tailor Made Compounding', domain: 'tailormadehealth.com' },
  { company: 'Peptide Warehouse', domain: 'peptidewarehouse.com' },
  { company: 'Nootroo', domain: 'nootroo.com' },
  { company: 'SARMs Pharm', domain: 'sarmspharm.com' },
  { company: 'Proven Peptides', domain: 'provenpeptides.com' },
  { company: 'SARM Tech', domain: 'sarmtech.com.au' },
  { company: 'Element SARMs', domain: 'elementsarms.com' },
  { company: 'Venogen', domain: 'venogen.com' },
  { company: 'Receptor Chem', domain: 'receptorchem.co.uk' },
  { company: 'HQSARMS', domain: 'hqsarms.com' },
  { company: 'Peak Body', domain: 'peakbody.co.uk' },
  { company: 'Bodybuilt Labs', domain: 'bodybuiltlabs.co.uk' },
  { company: 'Next Gen Peptides', domain: 'nextgenpeptides.com' },
  { company: 'Maxim Peptide', domain: 'maximpeptide.com' },
  { company: 'Geo Peptides', domain: 'geopeptides.com' },
  { company: 'PeptidesUK', domain: 'peptidesuk.com' },
  { company: 'Direct Peptides', domain: 'directpeptides.com' },
  { company: 'Southern Research', domain: 'southernresearch.com' },
  { company: 'Research Chemical', domain: 'researchchemical.com' },
  { company: 'SARMs Global', domain: 'sarmsglobal.com' },
  { company: 'Titan Peptides', domain: 'titanpeptides.com' },
  { company: 'Alpha Pharm Canada', domain: 'alphapharmcanada.com' },
  { company: 'BuyDeus', domain: 'buydeus.com' },
  { company: 'Brutal Force', domain: 'brutalforce.com' },
  { company: 'Sports Technology Labs', domain: 'sportstechnologylabs.com' },
  { company: 'Rats Army Shop', domain: 'ratsarmy.shop' },
  { company: 'SARMs Store', domain: 'thesarmsstore.co.uk' },
  { company: 'Paradigm Research Products', domain: 'paradigmresearchproducts.com' },
  { company: 'Neuro Peptides', domain: 'neuropeptides.com' },
  { company: 'Swiss Chems', domain: 'swisschems.is' },
  { company: 'Pep Sciences', domain: 'pepsciences.com' },
  { company: 'Elixir Peptides', domain: 'elixirpeptides.com' },
  { company: 'NuPeptides', domain: 'nupeptides.com' },
  { company: 'CanLab', domain: 'canlab.ca' },
  { company: 'Canadian Anabolics', domain: 'canadiananabolics.com' },
  { company: 'SARMs Revolution Lab', domain: 'sarmsrevolutionlab.com' },
  { company: 'Unique Peptides', domain: 'uniquepeptides.com' },
  { company: 'Infini Peptides', domain: 'infinipeptides.com' },
  { company: 'Xcel Peptides', domain: 'xcelpeptides.com' },
  { company: 'BioPure Peptides', domain: 'biopurepeptides.com' },
  { company: 'AUS Peptides', domain: 'auspeptides.com.au' },
  { company: 'Peptides Direct', domain: 'peptidesdirect.ca' },
  { company: 'SARMs Canada', domain: 'sarmscanada.com' },
  { company: 'Sarms UP', domain: 'sarmsup.co' },
  { company: 'Swiss SARMs', domain: 'swisssarms.com' },
  { company: 'Lab Peptides', domain: 'labpeptides.com' },
  { company: 'Research Peptide Lab', domain: 'researchpeptidelab.com' },
  { company: 'Straight Fire Peptides', domain: 'straightfirepeptides.com' },
  { company: 'American Made Peptides', domain: 'americanmadepeptides.com' },
  { company: 'Xpeptides', domain: 'xpeptides.com' },
  { company: 'IronBound Peptides', domain: 'ironboundpeptides.com' },
  { company: 'BPC Peptides', domain: 'bpcpeptides.com' },
  { company: 'Raw Peptides', domain: 'rawpeptides.com' },
  { company: 'Vital Peptides', domain: 'vitalpeptides.com' },
  { company: 'Elite Peptides', domain: 'elitepeptides.com' },
  { company: 'Prime Peptides', domain: 'primepeptides.com' },
  { company: 'Nova Peptides', domain: 'novapeptides.com' },
  { company: 'Ace Peptides', domain: 'acepeptides.com' },
  { company: 'Iron Peptides', domain: 'ironpeptides.com' },
  { company: 'Apex Peptides', domain: 'apexpeptides.com' },
];

async function scrapeEmails(url: string): Promise<string[]> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36' },
    });
    clearTimeout(timeout);
    if (!res.ok) return [];
    const html = await res.text();
    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
    const found = html.match(emailRegex) || [];
    return [...new Set(found)].filter(e =>
      !e.includes('example.com') && !e.includes('wixpress') && !e.includes('sentry') &&
      !e.includes('.png') && !e.includes('.jpg') && !e.endsWith('.js') &&
      !e.includes('wordpress') && !e.includes('schema.org') && !e.includes('doe.com') &&
      !e.includes('123.123') && e.length < 60
    );
  } catch { return []; }
}

async function main() {
  // Load existing list
  const existing = fs.existsSync(OUTPUT)
    ? fs.readFileSync(OUTPUT, 'utf-8').trim().split('\n').slice(1).map(l => {
        const parts = l.split(',').map(p => p.replace(/"/g, ''));
        return { company: parts[0], email: parts[1], domain: parts[2], website: parts[3] };
      })
    : [];

  const existingDomains = new Set(existing.map(e => e.domain.toLowerCase()));
  const existingEmails = new Set(existing.map(e => e.email.toLowerCase()));

  console.log(`Starting with ${existing.length} existing stores. Scraping ${STORES.length} new ones...\n`);

  const newStores: typeof existing = [];

  for (let i = 0; i < STORES.length; i++) {
    const store = STORES[i];
    if (existingDomains.has(store.domain.toLowerCase())) {
      process.stdout.write(`[${i+1}/${STORES.length}] ${store.company} — already have, skipping\n`);
      continue;
    }

    process.stdout.write(`[${i+1}/${STORES.length}] ${store.company}... `);

    const urls = [
      `https://${store.domain}`,
      `https://${store.domain}/contact`,
      `https://${store.domain}/contact-us`,
      `https://${store.domain}/pages/contact`,
      `https://${store.domain}/about`,
    ];

    let allEmails: string[] = [];
    for (const url of urls) {
      const emails = await scrapeEmails(url);
      allEmails.push(...emails);
    }
    allEmails = [...new Set(allEmails)];

    if (allEmails.length > 0 && !existingEmails.has(allEmails[0].toLowerCase())) {
      newStores.push({
        company: store.company,
        email: allEmails[0],
        domain: store.domain,
        website: `https://${store.domain}`,
      });
      existingEmails.add(allEmails[0].toLowerCase());
      console.log(`✓ ${allEmails[0]}`);
    } else {
      console.log('✗ no email found');
    }

    await new Promise(r => setTimeout(r, 300));
  }

  // Combine and save
  const all = [...existing, ...newStores];
  const csv = ['company,email,domain,website',
    ...all.map(r => `"${r.company}","${r.email}","${r.domain}","${r.website}"`)
  ].join('\n');

  fs.writeFileSync(OUTPUT, csv);
  console.log(`\nDone! ${newStores.length} new stores found. Total: ${all.length} stores with emails.`);
  console.log(`Saved to: ${OUTPUT}`);
}

main();
