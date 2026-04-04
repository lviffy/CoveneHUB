const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

async function fixOrphanedUsers() {
  console.log('=== Fixing Orphaned Users ===\n');
  
  // Get all auth users
  const { data: { users }, error: usersError } = await supabaseAdmin.auth.admin.listUsers();
  if (usersError) {
    console.error('Error fetching users:', usersError);
    return;
  }
  
  // Get all profiles
  const { data: profiles, error: profilesError } = await supabaseAdmin
    .from('profiles')
    .select('id');
  if (profilesError) {
    console.error('Error fetching profiles:', profilesError);
    return;
  }
  
  const profileIds = new Set(profiles.map(p => p.id));
  const orphanedUsers = users.filter(u => !profileIds.has(u.id) && u.email_confirmed_at);
  
  if (orphanedUsers.length === 0) {
    console.log('✅ No orphaned users found');
    return;
  }
  
  console.log(`Found ${orphanedUsers.length} orphaned users. Creating profiles...\n`);
  
  for (const user of orphanedUsers) {
    const metadata = user.user_metadata || {};
    
    // SECURITY: Sanitize role - never allow admin_team from metadata
    let role = 'user';
    if (metadata.role === 'movie_team') {
      role = 'movie_team';
    }
    
    const profileData = {
      id: user.id,
      full_name: metadata.full_name || user.email?.split('@')[0] || 'User',
      city: metadata.city || 'Unknown',
      role: role,
      email: user.email,
      phone: metadata.phone || user.phone || '',
    };
    
    console.log(`Creating profile for ${user.email}...`);
    console.log(`  Role: ${role}, City: ${profileData.city}, Phone: ${profileData.phone || 'none'}`);
    
    const { error: insertError } = await supabaseAdmin
      .from('profiles')
      .insert([profileData]);
    
    if (insertError) {
      console.error(`  ❌ Failed: ${insertError.message}`);
    } else {
      console.log(`  ✅ Profile created`);
    }
  }
  
  console.log('\n=== Fix Complete ===');
}

fixOrphanedUsers().catch(console.error);
