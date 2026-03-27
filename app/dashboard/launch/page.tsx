'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

const OBJECTIVES = [
  { value: 'OUTCOME_AWARENESS', label: 'Awareness', desc: 'Reach people likely to remember your ads' },
  { value: 'OUTCOME_TRAFFIC', label: 'Traffic', desc: 'Send people to a website, app, or Facebook event' },
  { value: 'OUTCOME_ENGAGEMENT', label: 'Engagement', desc: 'Get more messages, video views, post engagement, or Page likes' },
  { value: 'OUTCOME_LEADS', label: 'Leads', desc: 'Collect leads for your business via forms, calls, or messages' },
  { value: 'OUTCOME_APP_PROMOTION', label: 'App Promotion', desc: 'Get people to install or take action in your app' },
  { value: 'OUTCOME_SALES', label: 'Sales', desc: 'Find people likely to purchase your product or service' },
];

const PLACEMENTS = [
  { key: 'facebook_feed', label: 'Facebook Feed' },
  { key: 'instagram_feed', label: 'Instagram Feed' },
  { key: 'instagram_stories', label: 'Instagram Stories' },
  { key: 'instagram_reels', label: 'Instagram Reels' },
  { key: 'facebook_stories', label: 'Facebook Stories' },
  { key: 'facebook_reels', label: 'Facebook Reels' },
  { key: 'audience_network', label: 'Audience Network' },
  { key: 'messenger', label: 'Messenger' },
  { key: 'facebook_marketplace', label: 'Facebook Marketplace' },
  { key: 'facebook_video_feeds', label: 'Facebook Video Feeds' },
  { key: 'facebook_right_column', label: 'Facebook Right Column' },
  { key: 'instagram_explore', label: 'Instagram Explore' },
];

const CTA_OPTIONS = [
  'LEARN_MORE', 'SHOP_NOW', 'SIGN_UP', 'BOOK_NOW', 'GET_OFFER',
  'DOWNLOAD', 'CONTACT_US', 'APPLY_NOW', 'SUBSCRIBE', 'GET_QUOTE',
  'WATCH_MORE', 'SEND_MESSAGE',
];

const BID_STRATEGIES = [
  { value: 'LOWEST_COST_WITHOUT_CAP', label: 'Lowest Cost', desc: 'Get the most results for your budget' },
  { value: 'COST_CAP', label: 'Cost Cap', desc: 'Set an average cost per result target' },
  { value: 'BID_CAP', label: 'Bid Cap', desc: 'Set a max bid across auctions' },
  { value: 'LOWEST_COST_WITH_MIN_ROAS', label: 'ROAS Target', desc: 'Set a minimum return on ad spend' },
];

const CUSTOM_AUDIENCE_TYPES = [
  { value: 'lookalike', label: 'Lookalike Audience' },
  { value: 'website_visitors', label: 'Website Visitors' },
  { value: 'customer_list', label: 'Customer List' },
  { value: 'engagement', label: 'Engagement Audience' },
  { value: 'video_viewers', label: 'Video Viewers' },
];

const STEP_LABELS = ['Campaign', 'Audience', 'Placements', 'Budget', 'Creative', 'Review'];

export default function LaunchPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [launching, setLaunching] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState('');

  // Step 1: Campaign Setup
  const [campaignName, setCampaignName] = useState('');
  const [platform, setPlatform] = useState('meta');
  const [objective, setObjective] = useState('OUTCOME_LEADS');
  const [cbo, setCbo] = useState(true);
  const [abTest, setAbTest] = useState(false);

  // Step 2: Audience
  const [ageMin, setAgeMin] = useState(25);
  const [ageMax, setAgeMax] = useState(55);
  const [gender, setGender] = useState('all');
  const [locations, setLocations] = useState<string[]>([]);
  const [locationInput, setLocationInput] = useState('');
  const [interests, setInterests] = useState<string[]>([]);
  const [interestInput, setInterestInput] = useState('');
  const [customAudiences, setCustomAudiences] = useState<string[]>([]);
  const [excludeAudiences, setExcludeAudiences] = useState<string[]>([]);
  const [excludeInput, setExcludeInput] = useState('');

  // Step 3: Placements
  const [advantagePlacements, setAdvantagePlacements] = useState(true);
  const [manualPlacements, setManualPlacements] = useState<string[]>(PLACEMENTS.map(p => p.key));
  const [deviceTargeting, setDeviceTargeting] = useState('all');

  // Step 4: Budget & Schedule
  const [budgetType, setBudgetType] = useState<'daily' | 'lifetime'>('daily');
  const [budgetAmount, setBudgetAmount] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [bidStrategy, setBidStrategy] = useState('LOWEST_COST_WITHOUT_CAP');
  const [bidAmount, setBidAmount] = useState('');
  const [chargedOn, setChargedOn] = useState('IMPRESSIONS');

  // Step 5: Creative
  const [creativeMode, setCreativeMode] = useState<'ai' | 'manual' | null>(null);
  const [businessDesc, setBusinessDesc] = useState('');
  const [adFormat, setAdFormat] = useState('SINGLE_IMAGE');
  const [primaryText, setPrimaryText] = useState('');
  const [headline, setHeadline] = useState('');
  const [description, setDescription] = useState('');
  const [cta, setCta] = useState('LEARN_MORE');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [displayLink, setDisplayLink] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState('');

  function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setImagePreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  }

  function addTag(value: string, list: string[], setList: (v: string[]) => void, setInput: (v: string) => void) {
    const trimmed = value.trim();
    if (trimmed && !list.includes(trimmed)) {
      setList([...list, trimmed]);
    }
    setInput('');
  }

  function removeTag(value: string, list: string[], setList: (v: string[]) => void) {
    setList(list.filter(t => t !== value));
  }

  function togglePlacement(key: string) {
    setManualPlacements(prev =>
      prev.includes(key) ? prev.filter(p => p !== key) : [...prev, key]
    );
  }

  function buildPayload(launchStatus: 'PAUSED' | 'ACTIVE') {
    return {
      campaign_name: campaignName,
      platform,
      objective,
      cbo,
      ab_test: abTest,
      targeting: {
        age_min: ageMin,
        age_max: ageMax,
        genders: gender,
        locations,
        interests,
        custom_audiences: customAudiences,
        exclude_audiences: excludeAudiences,
      },
      placements: advantagePlacements ? 'automatic' : manualPlacements,
      device_targeting: deviceTargeting,
      budget: {
        type: budgetType,
        amount: parseFloat(budgetAmount),
        start_date: startDate,
        end_date: endDate || null,
      },
      bid_strategy: bidStrategy,
      bid_amount: bidAmount ? parseFloat(bidAmount) : null,
      charged_on: chargedOn,
      creative: creativeMode === 'ai' ? {
        mode: 'ai',
        business_description: businessDesc,
      } : {
        mode: 'manual',
        format: adFormat,
        primary_text: primaryText,
        headline,
        description,
        cta,
        website_url: websiteUrl,
        display_link: displayLink,
      },
      status: launchStatus,
    };
  }

  async function handleLaunch(status: 'PAUSED' | 'ACTIVE') {
    setLaunching(true);
    setError('');
    try {
      const payload = buildPayload(status);
      const endpoint = creativeMode === 'ai' ? '/api/ads/smart-launch' : '/api/ads/launch';
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.error) {
        setError(data.error);
      } else {
        setResult(data);
        setStep(6);
      }
    } catch (e: any) {
      setError(e.message || 'Something went wrong');
    }
    setLaunching(false);
  }

  const today = new Date().toISOString().split('T')[0];

  // Shared styles
  const input: React.CSSProperties = {
    width: '100%', padding: '12px 16px', background: 'var(--bg)',
    border: '1px solid var(--border)', borderRadius: 10, fontSize: 14,
    color: 'var(--text)', outline: 'none', fontFamily: 'inherit',
    boxSizing: 'border-box',
  };
  const label: React.CSSProperties = {
    fontSize: 13, fontWeight: 600, color: 'var(--text)', display: 'block', marginBottom: 6,
  };
  const sectionGap: React.CSSProperties = { marginBottom: 20 };
  const tagChip: React.CSSProperties = {
    display: 'inline-flex', alignItems: 'center', gap: 6,
    padding: '4px 10px', background: 'var(--accent)', color: '#fff',
    borderRadius: 6, fontSize: 12, fontWeight: 600,
  };
  const tagRemove: React.CSSProperties = {
    background: 'none', border: 'none', color: '#fff', cursor: 'pointer',
    fontSize: 14, fontWeight: 700, padding: 0, lineHeight: 1, fontFamily: 'inherit',
  };
  const primaryBtn = (disabled = false): React.CSSProperties => ({
    flex: 1, padding: '14px 0', background: 'var(--accent)', color: '#fff',
    border: 'none', borderRadius: 12, fontSize: 15, fontWeight: 700,
    cursor: 'pointer', fontFamily: 'inherit', opacity: disabled ? 0.4 : 1,
  });
  const secondaryBtn: React.CSSProperties = {
    padding: '14px 24px', background: 'var(--card)', border: '1px solid var(--border)',
    borderRadius: 12, fontSize: 14, fontWeight: 600, cursor: 'pointer',
    color: 'var(--muted)', fontFamily: 'inherit',
  };
  const cardStyle: React.CSSProperties = {
    background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 14, padding: 20,
  };
  const toggleTrack = (on: boolean): React.CSSProperties => ({
    width: 44, height: 24, borderRadius: 12, cursor: 'pointer', border: 'none',
    background: on ? 'var(--accent)' : 'var(--border)', position: 'relative',
    transition: 'background 0.2s', flexShrink: 0,
  });
  const toggleThumb = (on: boolean): React.CSSProperties => ({
    width: 18, height: 18, borderRadius: '50%', background: '#fff',
    position: 'absolute', top: 3, left: on ? 23 : 3, transition: 'left 0.2s',
  });

  function Toggle({ value, onChange, label: lbl }: { value: boolean; onChange: (v: boolean) => void; label: string }) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0' }}>
        <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>{lbl}</span>
        <button onClick={() => onChange(!value)} style={toggleTrack(value)} type="button">
          <div style={toggleThumb(value)} />
        </button>
      </div>
    );
  }

  function TagInput({ tags, onAdd, onRemove, inputValue, onInputChange, placeholder }: {
    tags: string[]; onAdd: () => void; onRemove: (t: string) => void;
    inputValue: string; onInputChange: (v: string) => void; placeholder: string;
  }) {
    return (
      <div>
        <div style={{ display: 'flex', gap: 6, marginBottom: tags.length ? 8 : 0, flexWrap: 'wrap' }}>
          {tags.map(t => (
            <span key={t} style={tagChip}>
              {t}
              <button onClick={() => onRemove(t)} style={tagRemove}>x</button>
            </span>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            value={inputValue}
            onChange={e => onInputChange(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); onAdd(); } }}
            placeholder={placeholder}
            style={input}
          />
          <button onClick={onAdd} style={{ ...secondaryBtn, padding: '12px 16px', whiteSpace: 'nowrap' }} type="button">Add</button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 660, margin: '0 auto', paddingTop: 20, paddingBottom: 60 }}>
      {/* Progress Bar */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 8 }}>
        {STEP_LABELS.map((s, i) => (
          <div key={i} style={{ flex: 1 }}>
            <div style={{
              height: 4, borderRadius: 2, transition: 'background 0.3s',
              background: i <= step ? 'var(--accent)' : 'var(--border)',
            }} />
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 32 }}>
        {STEP_LABELS.map((lbl, i) => (
          <span key={i} style={{
            fontSize: 10, fontWeight: 600, color: i <= step ? 'var(--accent)' : 'var(--muted)',
            textTransform: 'uppercase', letterSpacing: 0.5,
          }}>{lbl}</span>
        ))}
      </div>

      {/* ============================================================ */}
      {/* STEP 0: Campaign Setup */}
      {/* ============================================================ */}
      {step === 0 && (
        <div>
          <h2 style={{ fontSize: 26, fontWeight: 800, letterSpacing: -0.5, marginBottom: 4 }}>Campaign Setup</h2>
          <p style={{ fontSize: 14, color: 'var(--muted)', marginBottom: 28 }}>Name your campaign, choose a platform, and set your objective.</p>

          <div style={sectionGap}>
            <label style={label}>Campaign Name</label>
            <input value={campaignName} onChange={e => setCampaignName(e.target.value)} placeholder="e.g. Spring Lead Gen Q2" style={input} autoFocus />
          </div>

          <div style={sectionGap}>
            <label style={label}>Platform</label>
            <div style={{ display: 'flex', gap: 10 }}>
              {[
                { value: 'meta', label: 'Meta Ads', desc: 'Facebook + Instagram', color: '#1877F2' },
                { value: 'google', label: 'Google Ads', desc: 'Search + Display + YouTube', color: '#EA4335' },
                { value: 'tiktok', label: 'TikTok Ads', desc: 'TikTok feed + For You', color: '#fe2c55' },
              ].map(p => (
                <button key={p.value} onClick={() => setPlatform(p.value)} style={{
                  flex: 1, padding: '14px 12px', borderRadius: 12, cursor: 'pointer',
                  fontFamily: 'inherit', textAlign: 'center',
                  background: platform === p.value ? `${p.color}10` : 'var(--card)',
                  border: platform === p.value ? `2px solid ${p.color}` : '1px solid var(--border)',
                  transition: 'all 0.15s',
                }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: platform === p.value ? p.color : 'var(--text)' }}>{p.label}</div>
                  <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>{p.desc}</div>
                </button>
              ))}
            </div>
          </div>

          <div style={sectionGap}>
            <label style={label}>Campaign Objective</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
              {OBJECTIVES.map(o => (
                <button key={o.value} onClick={() => setObjective(o.value)} style={{
                  padding: '14px 16px', borderRadius: 10, cursor: 'pointer',
                  fontFamily: 'inherit', textAlign: 'left',
                  background: objective === o.value ? 'var(--accent)' : 'var(--card)',
                  border: objective === o.value ? '2px solid var(--accent)' : '1px solid var(--border)',
                  transition: 'all 0.15s',
                }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: objective === o.value ? '#fff' : 'var(--text)' }}>{o.label}</div>
                  <div style={{ fontSize: 11, color: objective === o.value ? 'rgba(255,255,255,0.7)' : 'var(--muted)', marginTop: 2 }}>{o.desc}</div>
                </button>
              ))}
            </div>
          </div>

          <div style={{ ...cardStyle, marginBottom: 20 }}>
            <Toggle value={cbo} onChange={setCbo} label="Campaign Budget Optimization (CBO)" />
            <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: -4 }}>
              Automatically distribute budget across ad sets for best results
            </div>
          </div>

          <div style={cardStyle}>
            <Toggle value={abTest} onChange={setAbTest} label="A/B Test" />
            <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: -4 }}>
              Create a test to compare different strategies
            </div>
          </div>

          <button
            onClick={() => { if (campaignName.trim()) setStep(1); }}
            disabled={!campaignName.trim()}
            style={{ ...primaryBtn(!campaignName.trim()), width: '100%', marginTop: 28 }}
          >
            Next: Audience & Targeting
          </button>
        </div>
      )}

      {/* ============================================================ */}
      {/* STEP 1: Audience & Targeting */}
      {/* ============================================================ */}
      {step === 1 && (
        <div>
          <h2 style={{ fontSize: 26, fontWeight: 800, letterSpacing: -0.5, marginBottom: 4 }}>Audience & Targeting</h2>
          <p style={{ fontSize: 14, color: 'var(--muted)', marginBottom: 28 }}>Define who should see your ads.</p>

          {/* Age Range */}
          <div style={sectionGap}>
            <label style={label}>Age Range</label>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <div style={{ flex: 1 }}>
                <span style={{ fontSize: 11, color: 'var(--muted)' }}>Min: {ageMin}</span>
                <input type="range" min={18} max={65} value={ageMin} onChange={e => {
                  const v = parseInt(e.target.value);
                  setAgeMin(v > ageMax ? ageMax : v);
                }} style={{ width: '100%', accentColor: 'var(--accent)' }} />
              </div>
              <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>to</span>
              <div style={{ flex: 1 }}>
                <span style={{ fontSize: 11, color: 'var(--muted)' }}>Max: {ageMax === 65 ? '65+' : ageMax}</span>
                <input type="range" min={18} max={65} value={ageMax} onChange={e => {
                  const v = parseInt(e.target.value);
                  setAgeMax(v < ageMin ? ageMin : v);
                }} style={{ width: '100%', accentColor: 'var(--accent)' }} />
              </div>
            </div>
          </div>

          {/* Gender */}
          <div style={sectionGap}>
            <label style={label}>Gender</label>
            <div style={{ display: 'flex', gap: 8 }}>
              {[
                { value: 'all', label: 'All' },
                { value: 'male', label: 'Men' },
                { value: 'female', label: 'Women' },
              ].map(g => (
                <button key={g.value} onClick={() => setGender(g.value)} style={{
                  flex: 1, padding: '10px 0', borderRadius: 10, cursor: 'pointer',
                  fontFamily: 'inherit', fontSize: 13, fontWeight: 600, textAlign: 'center',
                  background: gender === g.value ? 'var(--accent)' : 'var(--card)',
                  color: gender === g.value ? '#fff' : 'var(--text)',
                  border: gender === g.value ? '2px solid var(--accent)' : '1px solid var(--border)',
                  transition: 'all 0.15s',
                }}>
                  {g.label}
                </button>
              ))}
            </div>
          </div>

          {/* Locations */}
          <div style={sectionGap}>
            <label style={label}>Locations</label>
            <TagInput
              tags={locations}
              onAdd={() => addTag(locationInput, locations, setLocations, setLocationInput)}
              onRemove={t => removeTag(t, locations, setLocations)}
              inputValue={locationInput}
              onInputChange={setLocationInput}
              placeholder="e.g. United States, Texas, Dallas"
            />
          </div>

          {/* Interests */}
          <div style={sectionGap}>
            <label style={label}>Detailed Targeting / Interests</label>
            <TagInput
              tags={interests}
              onAdd={() => addTag(interestInput, interests, setInterests, setInterestInput)}
              onRemove={t => removeTag(t, interests, setInterests)}
              inputValue={interestInput}
              onInputChange={setInterestInput}
              placeholder="e.g. Fitness, Real estate, Skincare"
            />
          </div>

          {/* Custom Audiences */}
          <div style={sectionGap}>
            <label style={label}>Custom Audiences</label>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: customAudiences.length ? 8 : 0 }}>
              {customAudiences.map(a => (
                <span key={a} style={tagChip}>
                  {CUSTOM_AUDIENCE_TYPES.find(c => c.value === a)?.label || a}
                  <button onClick={() => setCustomAudiences(prev => prev.filter(x => x !== a))} style={tagRemove}>x</button>
                </span>
              ))}
            </div>
            <select
              value=""
              onChange={e => {
                if (e.target.value && !customAudiences.includes(e.target.value)) {
                  setCustomAudiences([...customAudiences, e.target.value]);
                }
              }}
              style={{ ...input, cursor: 'pointer' }}
            >
              <option value="">Add a custom audience...</option>
              {CUSTOM_AUDIENCE_TYPES.filter(c => !customAudiences.includes(c.value)).map(c => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </div>

          {/* Exclude Audiences */}
          <div style={sectionGap}>
            <label style={label}>Exclude Audiences</label>
            <TagInput
              tags={excludeAudiences}
              onAdd={() => addTag(excludeInput, excludeAudiences, setExcludeAudiences, setExcludeInput)}
              onRemove={t => removeTag(t, excludeAudiences, setExcludeAudiences)}
              inputValue={excludeInput}
              onInputChange={setExcludeInput}
              placeholder="e.g. Existing customers, Past purchasers"
            />
          </div>

          <div style={{ display: 'flex', gap: 10, marginTop: 24 }}>
            <button onClick={() => setStep(0)} style={secondaryBtn}>Back</button>
            <button onClick={() => setStep(2)} style={primaryBtn()}>Next: Placements</button>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* STEP 2: Placements */}
      {/* ============================================================ */}
      {step === 2 && (
        <div>
          <h2 style={{ fontSize: 26, fontWeight: 800, letterSpacing: -0.5, marginBottom: 4 }}>Placements</h2>
          <p style={{ fontSize: 14, color: 'var(--muted)', marginBottom: 28 }}>Choose where your ads appear across platforms.</p>

          <div style={{ ...cardStyle, marginBottom: 20 }}>
            <Toggle value={advantagePlacements} onChange={setAdvantagePlacements} label="Advantage+ Placements (Recommended)" />
            <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: -4 }}>
              Let Meta automatically show your ads where they perform best
            </div>
          </div>

          {!advantagePlacements && (
            <div style={{ ...cardStyle, marginBottom: 20 }}>
              <label style={{ ...label, marginBottom: 12 }}>Manual Placements</label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 6 }}>
                {PLACEMENTS.map(p => (
                  <label key={p.key} style={{
                    display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px',
                    borderRadius: 8, cursor: 'pointer', fontSize: 13, color: 'var(--text)',
                    background: manualPlacements.includes(p.key) ? 'var(--accent)' : 'transparent',
                    border: manualPlacements.includes(p.key) ? '1px solid var(--accent)' : '1px solid var(--border)',
                    transition: 'all 0.15s',
                  }}>
                    <input
                      type="checkbox"
                      checked={manualPlacements.includes(p.key)}
                      onChange={() => togglePlacement(p.key)}
                      style={{ accentColor: 'var(--accent)' }}
                    />
                    <span style={{ fontWeight: 500, color: manualPlacements.includes(p.key) ? '#fff' : 'var(--text)' }}>{p.label}</span>
                  </label>
                ))}
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                <button onClick={() => setManualPlacements(PLACEMENTS.map(p => p.key))} style={{ ...secondaryBtn, padding: '6px 12px', fontSize: 12 }}>Select All</button>
                <button onClick={() => setManualPlacements([])} style={{ ...secondaryBtn, padding: '6px 12px', fontSize: 12 }}>Deselect All</button>
              </div>
            </div>
          )}

          <div style={sectionGap}>
            <label style={label}>Device Targeting</label>
            <div style={{ display: 'flex', gap: 8 }}>
              {[
                { value: 'all', label: 'All Devices' },
                { value: 'mobile', label: 'Mobile Only' },
                { value: 'desktop', label: 'Desktop Only' },
              ].map(d => (
                <button key={d.value} onClick={() => setDeviceTargeting(d.value)} style={{
                  flex: 1, padding: '10px 0', borderRadius: 10, cursor: 'pointer',
                  fontFamily: 'inherit', fontSize: 13, fontWeight: 600, textAlign: 'center',
                  background: deviceTargeting === d.value ? 'var(--accent)' : 'var(--card)',
                  color: deviceTargeting === d.value ? '#fff' : 'var(--text)',
                  border: deviceTargeting === d.value ? '2px solid var(--accent)' : '1px solid var(--border)',
                  transition: 'all 0.15s',
                }}>
                  {d.label}
                </button>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10, marginTop: 24 }}>
            <button onClick={() => setStep(1)} style={secondaryBtn}>Back</button>
            <button onClick={() => setStep(3)} style={primaryBtn()}>Next: Budget & Schedule</button>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* STEP 3: Budget & Schedule */}
      {/* ============================================================ */}
      {step === 3 && (
        <div>
          <h2 style={{ fontSize: 26, fontWeight: 800, letterSpacing: -0.5, marginBottom: 4 }}>Budget & Schedule</h2>
          <p style={{ fontSize: 14, color: 'var(--muted)', marginBottom: 28 }}>Set your spending limits and campaign timeline.</p>

          {/* Budget type toggle */}
          <div style={sectionGap}>
            <label style={label}>Budget Type</label>
            <div style={{ display: 'flex', gap: 8 }}>
              {([['daily', 'Daily Budget'], ['lifetime', 'Lifetime Budget']] as const).map(([val, lbl]) => (
                <button key={val} onClick={() => setBudgetType(val)} style={{
                  flex: 1, padding: '10px 0', borderRadius: 10, cursor: 'pointer',
                  fontFamily: 'inherit', fontSize: 13, fontWeight: 600, textAlign: 'center',
                  background: budgetType === val ? 'var(--accent)' : 'var(--card)',
                  color: budgetType === val ? '#fff' : 'var(--text)',
                  border: budgetType === val ? '2px solid var(--accent)' : '1px solid var(--border)',
                  transition: 'all 0.15s',
                }}>
                  {lbl}
                </button>
              ))}
            </div>
          </div>

          {/* Budget amount */}
          <div style={sectionGap}>
            <label style={label}>{budgetType === 'daily' ? 'Daily Budget' : 'Lifetime Budget'} ($)</label>
            <input
              type="number"
              value={budgetAmount}
              onChange={e => setBudgetAmount(e.target.value)}
              placeholder={budgetType === 'daily' ? 'e.g. 50' : 'e.g. 1500'}
              style={input}
              min={1}
            />
            {budgetType === 'daily' && (
              <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                {['25', '50', '100', '250', '500'].map(v => (
                  <button key={v} onClick={() => setBudgetAmount(v)} style={{
                    padding: '6px 14px', borderRadius: 8, cursor: 'pointer', fontSize: 12,
                    fontWeight: 600, fontFamily: 'inherit',
                    background: budgetAmount === v ? 'var(--accent)' : 'var(--card)',
                    color: budgetAmount === v ? '#fff' : 'var(--muted)',
                    border: budgetAmount === v ? '1px solid var(--accent)' : '1px solid var(--border)',
                  }}>
                    ${v}/day
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Dates */}
          <div style={{ display: 'flex', gap: 12, ...sectionGap }}>
            <div style={{ flex: 1 }}>
              <label style={label}>Start Date</label>
              <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} min={today} style={input} />
            </div>
            <div style={{ flex: 1 }}>
              <label style={label}>End Date (Optional)</label>
              <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} min={startDate || today} style={input} />
            </div>
          </div>

          {/* Bid strategy */}
          <div style={sectionGap}>
            <label style={label}>Bid Strategy</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
              {BID_STRATEGIES.map(b => (
                <button key={b.value} onClick={() => setBidStrategy(b.value)} style={{
                  padding: '12px 14px', borderRadius: 10, cursor: 'pointer',
                  fontFamily: 'inherit', textAlign: 'left',
                  background: bidStrategy === b.value ? 'var(--accent)' : 'var(--card)',
                  border: bidStrategy === b.value ? '2px solid var(--accent)' : '1px solid var(--border)',
                  transition: 'all 0.15s',
                }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: bidStrategy === b.value ? '#fff' : 'var(--text)' }}>{b.label}</div>
                  <div style={{ fontSize: 11, color: bidStrategy === b.value ? 'rgba(255,255,255,0.7)' : 'var(--muted)', marginTop: 2 }}>{b.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Bid amount for cost cap / bid cap */}
          {(bidStrategy === 'COST_CAP' || bidStrategy === 'BID_CAP' || bidStrategy === 'LOWEST_COST_WITH_MIN_ROAS') && (
            <div style={sectionGap}>
              <label style={label}>
                {bidStrategy === 'LOWEST_COST_WITH_MIN_ROAS' ? 'Minimum ROAS' : bidStrategy === 'COST_CAP' ? 'Cost Cap Amount ($)' : 'Bid Cap Amount ($)'}
              </label>
              <input
                type="number"
                value={bidAmount}
                onChange={e => setBidAmount(e.target.value)}
                placeholder={bidStrategy === 'LOWEST_COST_WITH_MIN_ROAS' ? 'e.g. 2.0' : 'e.g. 10.00'}
                style={input}
                min={0}
                step={bidStrategy === 'LOWEST_COST_WITH_MIN_ROAS' ? '0.1' : '0.01'}
              />
            </div>
          )}

          {/* Charged on */}
          <div style={sectionGap}>
            <label style={label}>When You Get Charged</label>
            <div style={{ display: 'flex', gap: 8 }}>
              {[
                { value: 'IMPRESSIONS', label: 'Impression' },
                { value: 'LINK_CLICKS', label: 'Link Click' },
              ].map(c => (
                <button key={c.value} onClick={() => setChargedOn(c.value)} style={{
                  flex: 1, padding: '10px 0', borderRadius: 10, cursor: 'pointer',
                  fontFamily: 'inherit', fontSize: 13, fontWeight: 600, textAlign: 'center',
                  background: chargedOn === c.value ? 'var(--accent)' : 'var(--card)',
                  color: chargedOn === c.value ? '#fff' : 'var(--text)',
                  border: chargedOn === c.value ? '2px solid var(--accent)' : '1px solid var(--border)',
                  transition: 'all 0.15s',
                }}>
                  {c.label}
                </button>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10, marginTop: 24 }}>
            <button onClick={() => setStep(2)} style={secondaryBtn}>Back</button>
            <button
              onClick={() => { if (budgetAmount) setStep(4); }}
              disabled={!budgetAmount}
              style={primaryBtn(!budgetAmount)}
            >
              Next: Ad Creative
            </button>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* STEP 4: Ad Creative */}
      {/* ============================================================ */}
      {step === 4 && (
        <div>
          <h2 style={{ fontSize: 26, fontWeight: 800, letterSpacing: -0.5, marginBottom: 4 }}>Ad Creative</h2>
          <p style={{ fontSize: 14, color: 'var(--muted)', marginBottom: 28 }}>Let Wanda build your ad or set it up yourself.</p>

          {/* Mode picker */}
          {!creativeMode && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <button onClick={() => setCreativeMode('ai')} style={{
                ...cardStyle, cursor: 'pointer', textAlign: 'left',
                border: '2px solid var(--accent)', background: 'var(--card)',
              }}>
                <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--accent)', marginBottom: 4 }}>Let Wanda Build It</div>
                <div style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.5 }}>
                  Describe your business and Wanda will generate your ad copy, headline, creative strategy, and targeting -- everything.
                </div>
              </button>
              <button onClick={() => setCreativeMode('manual')} style={{
                ...cardStyle, cursor: 'pointer', textAlign: 'left',
              }}>
                <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--text)', marginBottom: 4 }}>Manual Setup</div>
                <div style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.5 }}>
                  Full control. Set your ad format, copy, headline, CTA, and upload your own creative.
                </div>
              </button>
              <button onClick={() => setStep(3)} style={{ ...secondaryBtn, width: '100%', marginTop: 8 }}>Back</button>
            </div>
          )}

          {/* AI Mode */}
          {creativeMode === 'ai' && (
            <div>
              <div style={{ ...cardStyle, marginBottom: 20, borderColor: 'var(--accent)' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent)', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 8 }}>Wanda AI Mode</div>
                <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 16, lineHeight: 1.5 }}>
                  Describe your business, product, or service. Wanda will generate optimized ad copy, choose the right CTA, and set up your creative.
                </p>
                <label style={label}>Business Description</label>
                <textarea
                  value={businessDesc}
                  onChange={e => setBusinessDesc(e.target.value)}
                  placeholder="e.g. We sell premium research peptides online. Our best sellers are BPC-157 and TB-500. We ship same-day and have 4.9 stars on Trustpilot."
                  style={{ ...input, minHeight: 120, resize: 'vertical' }}
                />
              </div>

              <div style={sectionGap}>
                <label style={label}>Website URL</label>
                <input value={websiteUrl} onChange={e => setWebsiteUrl(e.target.value)} placeholder="https://yoursite.com" style={input} />
              </div>

              <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
                <button onClick={() => setCreativeMode(null)} style={secondaryBtn}>Back</button>
                <button
                  onClick={() => { if (businessDesc.trim() && websiteUrl.trim()) setStep(5); }}
                  disabled={!businessDesc.trim() || !websiteUrl.trim()}
                  style={primaryBtn(!businessDesc.trim() || !websiteUrl.trim())}
                >
                  Next: Review
                </button>
              </div>
            </div>
          )}

          {/* Manual Mode */}
          {creativeMode === 'manual' && (
            <div>
              {/* Ad Format */}
              <div style={sectionGap}>
                <label style={label}>Ad Format</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  {[
                    { value: 'SINGLE_IMAGE', label: 'Single Image' },
                    { value: 'CAROUSEL', label: 'Carousel' },
                    { value: 'VIDEO', label: 'Video' },
                  ].map(f => (
                    <button key={f.value} onClick={() => setAdFormat(f.value)} style={{
                      flex: 1, padding: '10px 0', borderRadius: 10, cursor: 'pointer',
                      fontFamily: 'inherit', fontSize: 13, fontWeight: 600, textAlign: 'center',
                      background: adFormat === f.value ? 'var(--accent)' : 'var(--card)',
                      color: adFormat === f.value ? '#fff' : 'var(--text)',
                      border: adFormat === f.value ? '2px solid var(--accent)' : '1px solid var(--border)',
                      transition: 'all 0.15s',
                    }}>
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Primary Text */}
              <div style={sectionGap}>
                <label style={label}>Primary Text (Body Copy)</label>
                <textarea
                  value={primaryText}
                  onChange={e => setPrimaryText(e.target.value)}
                  placeholder="The main body of your ad. This appears above the image/video."
                  style={{ ...input, minHeight: 100, resize: 'vertical' }}
                />
                <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>{primaryText.length} characters</div>
              </div>

              {/* Headline */}
              <div style={sectionGap}>
                <label style={label}>Headline</label>
                <input value={headline} onChange={e => setHeadline(e.target.value)} placeholder="e.g. Free Shipping on All Orders" style={input} />
                <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>{headline.length}/40 recommended</div>
              </div>

              {/* Description */}
              <div style={sectionGap}>
                <label style={label}>Description</label>
                <input value={description} onChange={e => setDescription(e.target.value)} placeholder="Optional description shown below headline" style={input} />
              </div>

              {/* CTA */}
              <div style={sectionGap}>
                <label style={label}>Call to Action</label>
                <select value={cta} onChange={e => setCta(e.target.value)} style={{ ...input, cursor: 'pointer' }}>
                  {CTA_OPTIONS.map(c => (
                    <option key={c} value={c}>{c.replace(/_/g, ' ')}</option>
                  ))}
                </select>
              </div>

              {/* Website URL */}
              <div style={sectionGap}>
                <label style={label}>Website URL</label>
                <input value={websiteUrl} onChange={e => setWebsiteUrl(e.target.value)} placeholder="https://yoursite.com/landing-page" style={input} />
              </div>

              {/* Display Link */}
              <div style={sectionGap}>
                <label style={label}>Display Link (Optional)</label>
                <input value={displayLink} onChange={e => setDisplayLink(e.target.value)} placeholder="e.g. yoursite.com" style={input} />
                <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>Shown instead of the full URL</div>
              </div>

              {/* Image Upload */}
              <div style={sectionGap}>
                <label style={label}>Creative Upload</label>
                <div style={{
                  ...cardStyle, textAlign: 'center', cursor: 'pointer',
                  border: '2px dashed var(--border)', position: 'relative',
                  minHeight: imagePreview ? 'auto' : 120,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexDirection: 'column', overflow: 'hidden',
                }}>
                  {imagePreview ? (
                    <div style={{ position: 'relative', width: '100%' }}>
                      <img src={imagePreview} alt="Preview" style={{ width: '100%', borderRadius: 8 }} />
                      <button
                        onClick={() => { setImageFile(null); setImagePreview(''); }}
                        style={{
                          position: 'absolute', top: 8, right: 8, width: 28, height: 28,
                          borderRadius: '50%', background: 'rgba(0,0,0,0.6)', color: '#fff',
                          border: 'none', cursor: 'pointer', fontSize: 14, fontWeight: 700,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}
                      >
                        x
                      </button>
                    </div>
                  ) : (
                    <>
                      <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 8 }}>
                        Click to upload or drag and drop
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--muted)' }}>
                        JPG, PNG, MP4 - Recommended 1080x1080
                      </div>
                    </>
                  )}
                  <input
                    type="file"
                    accept="image/*,video/*"
                    onChange={handleImageChange}
                    style={{
                      position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer',
                    }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
                <button onClick={() => setCreativeMode(null)} style={secondaryBtn}>Back</button>
                <button
                  onClick={() => { if (primaryText.trim() && headline.trim() && websiteUrl.trim()) setStep(5); }}
                  disabled={!primaryText.trim() || !headline.trim() || !websiteUrl.trim()}
                  style={primaryBtn(!primaryText.trim() || !headline.trim() || !websiteUrl.trim())}
                >
                  Next: Review
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ============================================================ */}
      {/* STEP 5: Review & Launch */}
      {/* ============================================================ */}
      {step === 5 && (
        <div>
          <h2 style={{ fontSize: 26, fontWeight: 800, letterSpacing: -0.5, marginBottom: 4 }}>Review & Launch</h2>
          <p style={{ fontSize: 14, color: 'var(--muted)', marginBottom: 28 }}>Double-check everything before launching.</p>

          {/* Campaign */}
          <div style={{ ...cardStyle, marginBottom: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', letterSpacing: 1, textTransform: 'uppercase' }}>Campaign</div>
              <button onClick={() => setStep(0)} style={{ background: 'none', border: 'none', fontSize: 12, color: 'var(--accent)', cursor: 'pointer', fontWeight: 600, fontFamily: 'inherit' }}>Edit</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <Row label="Name" value={campaignName} />
              <Row label="Platform" value={platform === 'meta' ? 'Meta Ads' : platform === 'google' ? 'Google Ads' : 'TikTok Ads'} />
              <Row label="Objective" value={OBJECTIVES.find(o => o.value === objective)?.label || objective} />
              <Row label="CBO" value={cbo ? 'On' : 'Off'} />
              {abTest && <Row label="A/B Test" value="Enabled" />}
            </div>
          </div>

          {/* Audience */}
          <div style={{ ...cardStyle, marginBottom: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', letterSpacing: 1, textTransform: 'uppercase' }}>Audience</div>
              <button onClick={() => setStep(1)} style={{ background: 'none', border: 'none', fontSize: 12, color: 'var(--accent)', cursor: 'pointer', fontWeight: 600, fontFamily: 'inherit' }}>Edit</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <Row label="Age" value={`${ageMin} - ${ageMax === 65 ? '65+' : ageMax}`} />
              <Row label="Gender" value={gender === 'all' ? 'All' : gender === 'male' ? 'Men' : 'Women'} />
              {locations.length > 0 && <Row label="Locations" value={locations.join(', ')} />}
              {interests.length > 0 && <Row label="Interests" value={interests.join(', ')} />}
              {customAudiences.length > 0 && <Row label="Custom Audiences" value={customAudiences.map(a => CUSTOM_AUDIENCE_TYPES.find(c => c.value === a)?.label || a).join(', ')} />}
              {excludeAudiences.length > 0 && <Row label="Exclusions" value={excludeAudiences.join(', ')} />}
            </div>
          </div>

          {/* Placements */}
          <div style={{ ...cardStyle, marginBottom: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', letterSpacing: 1, textTransform: 'uppercase' }}>Placements</div>
              <button onClick={() => setStep(2)} style={{ background: 'none', border: 'none', fontSize: 12, color: 'var(--accent)', cursor: 'pointer', fontWeight: 600, fontFamily: 'inherit' }}>Edit</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <Row label="Mode" value={advantagePlacements ? 'Advantage+ (Auto)' : `Manual (${manualPlacements.length} selected)`} />
              <Row label="Devices" value={deviceTargeting === 'all' ? 'All Devices' : deviceTargeting === 'mobile' ? 'Mobile Only' : 'Desktop Only'} />
            </div>
          </div>

          {/* Budget */}
          <div style={{ ...cardStyle, marginBottom: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', letterSpacing: 1, textTransform: 'uppercase' }}>Budget & Schedule</div>
              <button onClick={() => setStep(3)} style={{ background: 'none', border: 'none', fontSize: 12, color: 'var(--accent)', cursor: 'pointer', fontWeight: 600, fontFamily: 'inherit' }}>Edit</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <Row label="Budget" value={`$${budgetAmount} ${budgetType === 'daily' ? '/ day' : 'lifetime'}`} />
              {startDate && <Row label="Start" value={startDate} />}
              {endDate && <Row label="End" value={endDate} />}
              <Row label="Bid Strategy" value={BID_STRATEGIES.find(b => b.value === bidStrategy)?.label || bidStrategy} />
              {bidAmount && <Row label={bidStrategy === 'LOWEST_COST_WITH_MIN_ROAS' ? 'Min ROAS' : 'Cap'} value={bidStrategy === 'LOWEST_COST_WITH_MIN_ROAS' ? `${bidAmount}x` : `$${bidAmount}`} />}
              <Row label="Charged On" value={chargedOn === 'IMPRESSIONS' ? 'Impression' : 'Link Click'} />
            </div>
          </div>

          {/* Creative */}
          <div style={{ ...cardStyle, marginBottom: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', letterSpacing: 1, textTransform: 'uppercase' }}>Creative</div>
              <button onClick={() => setStep(4)} style={{ background: 'none', border: 'none', fontSize: 12, color: 'var(--accent)', cursor: 'pointer', fontWeight: 600, fontFamily: 'inherit' }}>Edit</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {creativeMode === 'ai' ? (
                <>
                  <Row label="Mode" value="Wanda AI" />
                  <Row label="Business" value={businessDesc.length > 80 ? businessDesc.slice(0, 80) + '...' : businessDesc} />
                  <Row label="URL" value={websiteUrl} />
                </>
              ) : (
                <>
                  <Row label="Mode" value="Manual" />
                  <Row label="Format" value={adFormat.replace(/_/g, ' ')} />
                  <Row label="Headline" value={headline} />
                  <Row label="Primary Text" value={primaryText.length > 80 ? primaryText.slice(0, 80) + '...' : primaryText} />
                  <Row label="CTA" value={cta.replace(/_/g, ' ')} />
                  <Row label="URL" value={websiteUrl} />
                  {displayLink && <Row label="Display Link" value={displayLink} />}
                  {imageFile && <Row label="Creative" value={imageFile.name} />}
                </>
              )}
            </div>
          </div>

          {error && (
            <div style={{
              padding: '12px 16px', background: 'rgba(220,38,38,0.08)',
              border: '1px solid rgba(220,38,38,0.2)', borderRadius: 10,
              fontSize: 13, color: '#dc2626', marginBottom: 16,
            }}>
              {error}
            </div>
          )}

          {/* Launch buttons */}
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={() => setStep(4)} style={secondaryBtn}>Back</button>
            <button
              onClick={() => handleLaunch('PAUSED')}
              disabled={launching}
              style={{
                flex: 1, padding: '14px 0', borderRadius: 12, fontSize: 14, fontWeight: 700,
                cursor: 'pointer', fontFamily: 'inherit', border: '2px solid var(--accent)',
                background: 'var(--card)', color: 'var(--accent)',
                opacity: launching ? 0.5 : 1,
              }}
            >
              {launching ? 'Creating...' : 'Launch Paused'}
            </button>
            <button
              onClick={() => handleLaunch('ACTIVE')}
              disabled={launching}
              style={{
                ...primaryBtn(launching), flex: 1,
              }}
            >
              {launching ? 'Creating...' : 'Launch Live'}
            </button>
          </div>
          <div style={{ fontSize: 11, color: 'var(--muted)', textAlign: 'center', marginTop: 10 }}>
            {creativeMode === 'ai'
              ? 'Wanda will generate your ad copy, targeting, and creative strategy.'
              : 'Your campaign will be submitted with the exact settings above.'}
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* STEP 6: Success */}
      {/* ============================================================ */}
      {step === 6 && result && (
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', fontSize: 28, color: '#fff', fontWeight: 800 }}>+</div>
          <h2 style={{ fontSize: 28, fontWeight: 800, letterSpacing: -0.5, marginBottom: 8 }}>Campaign Created</h2>
          <p style={{ fontSize: 14, color: 'var(--muted)', marginBottom: 28 }}>{result.message || 'Your campaign has been created successfully.'}</p>

          {result.strategy && (
            <div style={{ ...cardStyle, textAlign: 'left', marginBottom: 24 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 14 }}>What Wanda Built</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {result.strategy.campaign_name && <Row label="Campaign" value={result.strategy.campaign_name} />}
                {result.strategy.headline && <Row label="Headline" value={result.strategy.headline} />}
                {result.strategy.body && (
                  <div>
                    <span style={{ fontSize: 13, color: 'var(--muted)' }}>Ad Copy</span>
                    <p style={{ fontSize: 13, fontWeight: 500, marginTop: 4, lineHeight: 1.5 }}>{result.strategy.body}</p>
                  </div>
                )}
                {result.strategy.cta && <Row label="CTA" value={result.strategy.cta.replace(/_/g, ' ')} />}
                {result.strategy.age_min && <Row label="Targeting" value={`${result.strategy.genders === 'all' ? 'Everyone' : result.strategy.genders} ${result.strategy.age_min}-${result.strategy.age_max}`} />}
              </div>
            </div>
          )}

          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={() => router.push('/dashboard')} style={{ ...primaryBtn(), flex: 1 }}>
              View Campaigns
            </button>
            <button onClick={() => {
              setStep(0);
              setCampaignName('');
              setObjective('OUTCOME_LEADS');
              setBusinessDesc('');
              setPrimaryText('');
              setHeadline('');
              setDescription('');
              setWebsiteUrl('');
              setDisplayLink('');
              setBudgetAmount('');
              setStartDate('');
              setEndDate('');
              setLocations([]);
              setInterests([]);
              setCustomAudiences([]);
              setExcludeAudiences([]);
              setImageFile(null);
              setImagePreview('');
              setCreativeMode(null);
              setResult(null);
              setError('');
            }} style={secondaryBtn}>
              Launch Another
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function Row({ label: l, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16 }}>
      <span style={{ fontSize: 13, color: 'var(--muted)', flexShrink: 0 }}>{l}</span>
      <span style={{ fontSize: 13, fontWeight: 600, textAlign: 'right', wordBreak: 'break-word' }}>{value}</span>
    </div>
  );
}
