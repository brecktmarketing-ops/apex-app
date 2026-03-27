export default function PrivacyPage() {
  return (
    <div style={{ maxWidth: 700, margin: '0 auto', padding: '60px 24px', fontFamily: 'Inter, system-ui, sans-serif', color: '#333', lineHeight: 1.7 }}>
      <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 8 }}>Privacy Policy</h1>
      <p style={{ color: '#666', marginBottom: 32 }}>Last updated: March 26, 2026</p>

      <h2 style={{ fontSize: 18, fontWeight: 700, marginTop: 28, marginBottom: 8 }}>What We Collect</h2>
      <p>When you use APEX, we collect your email address, name, and any ad account data you connect (Meta, Google, TikTok). This data is used solely to provide you with ad management and analytics services.</p>

      <h2 style={{ fontSize: 18, fontWeight: 700, marginTop: 28, marginBottom: 8 }}>How We Use Your Data</h2>
      <p>Your ad account data is used to display campaign performance, generate AI-powered recommendations, and manage your ad campaigns. We do not sell your data to third parties.</p>

      <h2 style={{ fontSize: 18, fontWeight: 700, marginTop: 28, marginBottom: 8 }}>Third-Party Services</h2>
      <p>We integrate with Meta (Facebook/Instagram), Google, and TikTok advertising APIs to pull and manage your campaign data. We also use Anthropic (Claude AI) for our Wanda AI assistant. Data shared with these services is limited to what is necessary for functionality.</p>

      <h2 style={{ fontSize: 18, fontWeight: 700, marginTop: 28, marginBottom: 8 }}>Data Storage</h2>
      <p>Your data is stored securely on Supabase (PostgreSQL) with row-level security enabled. Each user can only access their own data. Access tokens are stored encrypted.</p>

      <h2 style={{ fontSize: 18, fontWeight: 700, marginTop: 28, marginBottom: 8 }}>Data Deletion</h2>
      <p>You can disconnect your ad accounts at any time in Settings. To delete your account entirely, contact us and we will remove all your data within 30 days.</p>

      <h2 style={{ fontSize: 18, fontWeight: 700, marginTop: 28, marginBottom: 8 }}>Contact</h2>
      <p>For questions about this policy, contact us at support@backendbranding.com</p>
    </div>
  );
}
