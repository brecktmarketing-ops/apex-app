import * as fs from 'fs';

const OUTPUT = '/Users/breckentroike/Documents/peptide_outreach_list.csv';

// Round 4: HRT clinics, compounding pharmacies, wellness clinics selling peptides
const STORES = [
  { company: 'Empower Pharmacy', domain: 'empower.pharmacy' },
  { company: 'Olympia Pharmacy', domain: 'olympiapharmacy.com' },
  { company: 'Hallandale Pharmacy', domain: 'hallandalepharmacy.com' },
  { company: 'Valor Compounding', domain: 'valorcompounding.com' },
  { company: 'Wells Pharmacy', domain: 'wellspharmacy.com' },
  { company: 'Belmar Pharmacy', domain: 'belmarpharmacy.com' },
  { company: 'University Compounding Pharmacy', domain: 'ucprx.com' },
  { company: 'Peptide Therapy Pro', domain: 'peptidetherapypro.com' },
  { company: 'Vitality Sciences', domain: 'vitalitysciences.com' },
  { company: 'Elite Health Online', domain: 'elitehealthonline.com' },
  { company: 'TRT Nation', domain: 'trtnation.com' },
  { company: 'Renew Vitality', domain: 'renewvitality.com' },
  { company: 'Gameday Men Health', domain: 'gamedaymenshealth.com' },
  { company: 'Aspire Rejuvenation', domain: 'aspirerejuvenation.com' },
  { company: 'YourHRT', domain: 'yourhrt.com' },
  { company: 'Matrix Hormones', domain: 'matrixhormones.com' },
  { company: 'Viking Alternative', domain: 'vikingalternative.com' },
  { company: 'Evolve Telemed', domain: 'evolvetelemed.com' },
  { company: 'Peter Uncaged', domain: 'peteruncagedmd.com' },
  { company: 'Biostation', domain: 'thebiostation.com' },
  { company: 'Invigorate Men', domain: 'invigoratemen.com' },
  { company: 'Fountain TRT', domain: 'fountaintrt.com' },
  { company: 'Ehormones MD', domain: 'ehormonesmd.com' },
  { company: 'Peptide Hub', domain: 'peptidehub.com' },
  { company: 'SARMs Army', domain: 'sarmsarmy.com' },
  { company: 'Regenics', domain: 'regenics.com' },
  { company: 'Vitality Peptides', domain: 'vitalitypeptides.com' },
  { company: 'AntiAging Systems', domain: 'antiaging-systems.com' },
  { company: 'Peptide Therapy', domain: 'peptidetherapy.com' },
  { company: 'GenF20', domain: 'genf20.com' },
  { company: 'HGH.com', domain: 'hgh.com' },
  { company: 'Onnit', domain: 'onnit.com' },
  { company: 'Bioptimizers', domain: 'bioptimizers.com' },
  { company: 'Integrative Peptides', domain: 'integrativepeptides.com' },
  { company: 'Dr Seeds', domain: 'drseeds.com' },
  { company: 'BPC157.org', domain: 'bpc157.org' },
  { company: 'Research Labs Supply', domain: 'researchlabssupply.com' },
  { company: 'Supreme SARMs', domain: 'supremesarms.com' },
  { company: 'SARMs King', domain: 'sarmsking.com' },
  { company: 'LVHN Peptides', domain: 'lvhnpeptides.com' },
  { company: 'Tropin Peptides', domain: 'tropinpeptides.com' },
  { company: 'Peptide Complex', domain: 'peptidecomplex.com' },
  { company: 'Recon Peptides', domain: 'reconpeptides.com' },
  { company: 'Titan Biotech', domain: 'titanbiotech.com' },
  { company: 'ProHormones', domain: 'prohormones.com' },
  { company: 'Biogen Peptides', domain: 'biogenpeptides.com' },
  { company: 'Peptide World', domain: 'peptideworld.com' },
  { company: 'Lab Research Peptides', domain: 'labresearchpeptides.com' },
  { company: 'Nutra Bio', domain: 'nutrabio.com' },
  { company: 'SpectraLab Scientific', domain: 'spectralabsci.com' },
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
      !e.includes('noreply') && !e.includes('no-reply') && !e.includes('cloudflare') &&
      e.length < 60 && e.length > 5
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
