const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

let lastUserCount = 0;
let lastProfileCount = 0;

async function monitorAuth() {
  console.clear();
  console.log('=== 🔴 LIVE AUTH MONITORING ===');
  console.log(`Time: ${new Date().toLocaleTimeString()}\n`);
  
  // Get auth users
  const { data: { users }, error: usersError } = await supabaseAdmin.auth.admin.listUsers();
  
  if (usersError) {
    console.error('❌ Error fetching users:', usersError.message);
    return;
  }
  
  // Get profiles
  const { data: profiles, error: profilesError } = await supabaseAdmin
    .from('profiles')
    .select('*');
  
  if (profilesError) {
    console.error('❌ Error fetching profiles:', profilesError.message);
    return;
  }
  
  const confirmedUsers = users.filter(u => u.email_confirmed_at);
  const unconfirmedUsers = users.filter(u => !u.email_confirmed_at);
  const profileIds = new Set(profiles.map(p => p.id));
  const orphanedUsers = confirmedUsers.filter(u => !profileIds.has(u.id));
  
  // Stats
  console.log('📊 STATISTICS:');
  console.log(`   Total Users: ${users.length} ${users.length !== lastUserCount ? '🆕' : ''}`);
  console.log(`   Confirmed: ${confirmedUsers.length}`);
  console.log(`   Unconfirmed: ${unconfirmedUsers.length}`);
  console.log(`   Profiles: ${profiles.length} ${profiles.length !== lastProfileCount ? '🆕' : ''}`);
  console.log(`   Orphaned: ${orphanedUsers.length} ${orphanedUsers.length > 0 ? '⚠️' : '✅'}`);
  
  if (users.length !== lastUserCount || profiles.length !== lastProfileCount) {
    console.log('\n   🔔 NEW ACTIVITY DETECTED!');
  }
  
  lastUserCount = users.length;
  lastProfileCount = profiles.length;
  
  // Recent signups (last 2 minutes)
  const twoMinutesAgo = Date.now() - 2 * 60 * 1000;
  const recentSignups = users.filter(u => new Date(u.created_at).getTime() > twoMinutesAgo);
  
  if (recentSignups.length > 0) {
    console.log('\n🆕 RECENT SIGNUPS (last 2 minutes):');
    recentSignups.forEach(u => {
      const confirmed = u.email_confirmed_at ? '✅' : '⏳';
      const hasProfile = profileIds.has(u.id) ? '✅' : '❌';
      const role = u.user_metadata?.role || 'user';
      console.log(`   ${confirmed} ${u.email}`);
      console.log(`      Profile: ${hasProfile} | Role: ${role} | Created: ${new Date(u.created_at).toLocaleTimeString()}`);
    });
  }
  
  // Recent confirmations (last 2 minutes)
  const recentConfirmations = confirmedUsers.filter(u => 
    u.email_confirmed_at && new Date(u.email_confirmed_at).getTime() > twoMinutesAgo
  );
  
  if (recentConfirmations.length > 0) {
    console.log('\n✅ RECENT CONFIRMATIONS (last 2 minutes):');
    recentConfirmations.forEach(u => {
      const hasProfile = profileIds.has(u.id) ? '✅' : '❌';
      const role = u.user_metadata?.role || 'user';
      console.log(`   ${u.email}`);
      console.log(`      Profile: ${hasProfile} | Role: ${role} | Confirmed: ${new Date(u.email_confirmed_at).toLocaleTimeString()}`);
    });
  }
  
  // Orphaned users (confirmed but no profile)
  if (orphanedUsers.length > 0) {
    console.log('\n⚠️  ORPHANED USERS (confirmed but no profile):');
    orphanedUsers.forEach(u => {
      console.log(`   ${u.email} - Confirmed ${Math.floor((Date.now() - new Date(u.email_confirmed_at).getTime()) / 60000)} min ago`);
    });
    console.log('\n   Run: node scripts/fix-orphaned-users.js');
  }
  
  // Last 3 profiles by creation
  const recentProfiles = profiles
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 3);
  
  console.log('\n📝 RECENT PROFILES:');
  recentProfiles.forEach((p, i) => {
    const timeAgo = Math.floor((Date.now() - new Date(p.created_at).getTime()) / 60000);
    console.log(`   ${i + 1}. ${p.email || p.id.substring(0, 8)} - ${p.full_name} (${p.role}) - ${timeAgo} min ago`);
  });
  
  console.log('\n' + '='.repeat(50));
  console.log('Press Ctrl+C to stop monitoring');
  console.log('Refreshing in 3 seconds...');
}

// Run monitor every 3 seconds
console.log('🚀 Starting real-time auth monitor...\n');
monitorAuth();
const interval = setInterval(monitorAuth, 3000);

// Cleanup on exit
process.on('SIGINT', () => {
  clearInterval(interval);
  console.log('\n\n✅ Monitor stopped');
  process.exit(0);
});
