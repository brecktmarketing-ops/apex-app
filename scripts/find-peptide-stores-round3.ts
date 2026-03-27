import * as fs from 'fs';

const OUTPUT = '/Users/breckentroike/Documents/peptide_outreach_list.csv';

// Round 3: More peptide, SARM, and research chem stores
const STORES = [
  { company: 'Platinum Biotech', domain: 'platinumbiotech.com' },
  { company: 'Paradigm Peptides', domain: 'paradigmpeptides.com' },
  { company: 'USA Peptides', domain: 'usapeptides.com' },
  { company: 'Absolute Nootropics', domain: 'absolutenootropics.com' },
  { company: 'Peptide Clinics', domain: 'peptideclinics.com.au' },
  { company: 'Research Peptides Direct', domain: 'researchpeptidesdirect.com' },
  { company: 'Southern SARMs', domain: 'southernsarms.com' },
  { company: 'SARMs For Sale', domain: 'sarmsforsale.com' },
  { company: 'Pure Peptides UK', domain: 'purepeptidesuk.com' },
  { company: 'Peptides For Sale', domain: 'peptidesforsale.co' },
  { company: 'Research Grade Peptides', domain: 'researchgradepeptides.com' },
  { company: 'Enhanced Athlete', domain: 'enhancedathlete.com' },
  { company: 'Muscle Gelz', domain: 'musclegelz.com' },
  { company: 'Peptide Store', domain: 'peptidestore.com' },
  { company: 'BioTech Labs', domain: 'biotechlabsonline.com' },
  { company: 'Peptidevite', domain: 'peptidevite.com' },
  { company: 'GenX Bio', domain: 'genxbio.com' },
  { company: 'Lab Supply Direct', domain: 'labsupplydirect.com' },
  { company: 'Axiom Peptides', domain: 'axiompeptides.com' },
  { company: 'Mantra Labs', domain: 'mantralabz.com' },
  { company: 'Supreme Peptides', domain: 'supremepeptides.com' },
  { company: 'Nootropics Depot', domain: 'nootropicsdepot.com' },
  { company: 'Ceretropic', domain: 'ceretropic.com' },
  { company: 'Titan Medical', domain: 'titanmedicalcenter.com' },
  { company: 'Viking Therapeutics Store', domain: 'vikingtherapeutics.com' },
  { company: 'Evolve HRT', domain: 'evolvehrt.com' },
  { company: 'Peptide Kings', domain: 'peptidekings.com' },
  { company: 'Alpha Labs', domain: 'alphalabs.com' },
  { company: 'Gorilla Mind Peptides', domain: 'gorillamind.com' },
  { company: 'Black Diamond Peptides', domain: 'blackdiamondpeptides.com' },
  { company: 'Warrior Labz', domain: 'warriorlabz.com' },
  { company: 'Hybrid Peptides', domain: 'hybridpeptides.com' },
  { company: 'Precision Peptides', domain: 'precisionpeptides.com' },
  { company: 'Atlas Peptides', domain: 'atlaspeptides.com' },
  { company: 'Noble Research', domain: 'nobleresearchpeptides.com' },
  { company: 'Phoenix Peptides', domain: 'phoenixpeptides.com' },
  { company: 'Catalyst Peptides', domain: 'catalystpeptides.com' },
  { company: 'Summit Peptides', domain: 'summitpeptides.com' },
  { company: 'Velocity Labs', domain: 'velocitylabs.co' },
  { company: 'Titan SARMs', domain: 'titansarms.com' },
  { company: 'Olympus Labs', domain: 'olympuslabs.com' },
  { company: 'Alchemy Labs', domain: 'alchemylabs.co' },
  { company: 'Prestige Peptides', domain: 'prestigepeptides.com' },
  { company: 'Frontier Peptides', domain: 'frontierpeptides.com' },
  { company: 'Regal Peptides', domain: 'regalpeptides.com' },
  { company: 'United Peptides', domain: 'unitedpeptides.com' },
  { company: 'Vigor Peptides', domain: 'vigorpeptides.com' },
  { company: 'Ascend Labs', domain: 'ascendlabs.co' },
  { company: 'Liberty Peptides', domain: 'libertypeptides.com' },
  { company: 'Golden Peptides', domain: 'goldenpeptides.com' },
  { company: 'Vertex Peptides', domain: 'vertexpeptides.com' },
  { company: 'Dynasty Peptides', domain: 'dynastypeptides.com' },
  { company: 'Guardian Peptides', domain: 'guardianpeptides.com' },
  { company: 'Legacy Peptides', domain: 'legacypeptides.com' },
  { company: 'Monarch Peptides', domain: 'monarchpeptides.com' },
  { company: 'Apex Research Chem', domain: 'apexresearchchem.com' },
  { company: 'Zenith Peptides', domain: 'zenithpeptides.com' },
  { company: 'Vanguard Peptides', domain: 'vanguardpeptides.com' },
  { company: 'Patriot Peptides', domain: 'patriotpeptides.com' },
  { company: 'Empire Peptides', domain: 'empirepeptides.com' },
  { company: 'Bio Peptides Lab', domain: 'biopeptideslab.com' },
  { company: 'Applied Science Peptides', domain: 'appliedsciencepeptides.com' },
  { company: 'Evo Peptides', domain: 'evopeptides.com' },
  { company: 'ProResearch Peptides', domain: 'proresearchpeptides.com' },
  { company: 'Science Peptides', domain: 'sciencepeptides.com' },
  { company: 'American Peptide Society', domain: 'americanpeptidesociety.org' },
  { company: 'Compounding Pharmacy Peptides', domain: 'empower.pharmacy' },
  { company: 'Defy Medical', domain: 'defymedical.com' },
  { company: 'Peak Performance Peptides', domain: 'peakperformancepeptides.com' },
  { company: 'Revive MD', domain: 'revivemd.com' },
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
      !e.includes('123.123') && !e.includes('email@address') && !e.includes('test@') &&
      !e.includes('noreply') && !e.includes('no-reply') && e.length < 60 && e.length > 5
    );
  } catch { return []; }
}

async function main() {
  const existing = fs.existsSync(OUTPUT)
    ? fs.readFileSync(OUTPUT, 'utf-8').trim().split('\n').slice(1).filter(l => l.trim()).map(l => {
        const parts = l.split(',').map(p => p.replace(/"/g, ''));
        return { company: parts[0] || '', email: parts[1] || '', domain: parts[2] || '', website: parts[3] || '' };
      }).filter(r => r.domain && r.email)
    : [];

  const existingDomains = new Set(existing.map(e => e.domain.toLowerCase()));
  const existingEmails = new Set(existing.map(e => e.email.toLowerCase()));

  console.log(`Starting with ${existing.length} existing stores. Scraping ${STORES.length} new ones...\n`);

  const newStores: typeof existing = [];

  for (let i = 0; i < STORES.length; i++) {
    const store = STORES[i];
    if (existingDomains.has(store.domain.toLowerCase())) {
      process.stdout.write(`[${i+1}/${STORES.length}] ${store.company} — skip\n`);
      continue;
    }

    process.stdout.write(`[${i+1}/${STORES.length}] ${store.company}... `);

    const urls = [
      `https://${store.domain}`,
      `https://${store.domain}/contact`,
      `https://${store.domain}/contact-us`,
      `https://${store.domain}/pages/contact`,
      `https://${store.domain}/about`,
      `https://${store.domain}/pages/about-us`,
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

  const all = [...existing, ...newStores];
  const csv = ['company,email,domain,website',
    ...all.map(r => `"${r.company}","${r.email}","${r.domain}","${r.website}"`)
  ].join('\n');

  fs.writeFileSync(OUTPUT, csv);
  console.log(`\nDone! ${newStores.length} new stores found. Total: ${all.length} stores with emails.`);
}

main();
