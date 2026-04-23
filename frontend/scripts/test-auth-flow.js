const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseServiceKey || !supabaseAnonKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
const supabaseAnon = createClient(supabaseUrl, supabaseAnonKey);

async function testAuthFlow() {
  console.log('\n=== Testing Auth Configuration ===\n');
  
  // 1. Check redirect URLs configuration
  console.log('Expected redirect URLs:');
  console.log('  - http://localhost:3000/**');
  console.log('  - https://convenehub.vercel.app/**');
  console.log('  - http://localhost:3000/auth/callback');
  console.log('  - http://localhost:3000/auth/confirm');
  console.log('  - https://convenehub.vercel.app/auth/callback');
  console.log('  - https://convenehub.vercel.app/auth/confirm');
  console.log('\nPlease verify these are added in Supabase Dashboard > Authentication > URL Configuration\n');
  
  // 2. Check if trigger exists
  const { data: triggers, error: triggerError } = await supabaseAdmin
    .from('information_schema.triggers')
    .select('*')
    .eq('trigger_name', 'on_auth_user_created');
  
  if (triggerError) {
    console.error('❌ Could not check trigger:', triggerError.message);
  } else if (triggers && triggers.length > 0) {
    console.log('✅ Trigger "on_auth_user_created" exists');
  } else {
    console.log('⚠️  Trigger "on_auth_user_created" NOT found - profiles may not be created automatically');
  }
  
  // 3. Check profiles table schema
  console.log('\n=== Checking Profiles Table ===');
  const { data: profiles, error: profilesError } = await supabaseAdmin
    .from('profiles')
    .select('*')
    .limit(1);
    
  if (profilesError) {
    console.error('❌ Error accessing profiles table:', profilesError.message);
  } else {
    console.log('✅ Profiles table accessible');
  }
  
  // 4. Check email and phone fields
  const { data: sampleProfiles } = await supabaseAdmin
    .from('profiles')
    .select('id, email, phone, role, full_name')
    .limit(3);
    
  console.log('\nSample profiles:');
  sampleProfiles?.forEach(p => {
    console.log(`  ${p.email || 'NO EMAIL'} | ${p.phone || 'NO PHONE'} | ${p.role} | ${p.full_name}`);
  });
  
  // 5. Check auth users without profiles
  const { data: { users } } = await supabaseAdmin.auth.admin.listUsers();
  const { data: allProfiles } = await supabaseAdmin
    .from('profiles')
    .select('id');
    
  const profileIds = new Set(allProfiles?.map(p => p.id) || []);
  const orphanedUsers = users.filter(u => !profileIds.has(u.id));
  
  if (orphanedUsers.length > 0) {
    console.log(`\n⚠️  Found ${orphanedUsers.length} auth users WITHOUT profiles:`);
    orphanedUsers.forEach(u => {
      console.log(`  - ${u.email} (${u.id})`);
      console.log(`    Created: ${u.created_at}`);
      console.log(`    Confirmed: ${u.email_confirmed_at || 'NOT CONFIRMED'}`);
      console.log(`    Metadata role: ${u.user_metadata?.role || 'none'}`);
    });
    console.log('\n💡 These users may have signup issues. Check if the trigger is working.');
  } else {
    console.log('\n✅ All auth users have profiles');
  }
  
  // 6. Check RLS policies
  console.log('\n=== Testing RLS Policies ===');
  
  // Try to read profiles with anon key (should work with RLS)
  const { data: anonProfiles, error: anonError } = await supabaseAnon
    .from('profiles')
    .select('id, role')
    .limit(1);
    
  if (anonError) {
    console.error('❌ Anonymous read failed (RLS may be too restrictive):', anonError.message);
  } else {
    console.log('✅ Anonymous read works (RLS configured correctly)');
  }
  
  console.log('\n=== Auth Flow Test Complete ===\n');
}

testAuthFlow().catch(console.error);
