const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase URL or Service Key');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkDatabase() {
  console.log('Checking database connection...');
  
  // Check profiles
  const { data: profiles, error } = await supabase
    .from('profiles')
    .select('*');

  if (error) {
    console.error('Error fetching profiles:', error);
    return;
  }

  console.log(`Found ${profiles.length} profiles.`);
  
  const movieTeam = profiles.filter(p => p.role === 'movie_team');
  console.log(`Movie Team members: ${movieTeam.length}`);
  movieTeam.forEach(p => {
    console.log(` - ${p.email || p.id} (${p.full_name})`);
  });

  const adminTeam = profiles.filter(p => p.role === 'admin_team');
  console.log(`ConveneHub Team members: ${adminTeam.length}`);

  // Check if we can read auth users (requires service role)
  const { data: { users }, error: authError } = await supabase.auth.admin.listUsers();
  
  if (authError) {
    console.error('Error fetching auth users:', authError);
  } else {
    console.log(`Found ${users.length} auth users.`);
    // Check metadata for recent users
    const recentUsers = users.slice(0, 5);
    console.log('Recent users metadata:');
    recentUsers.forEach(u => {
      console.log(` - ${u.email}: role=${u.user_metadata?.role}, created=${u.created_at}`);
    });
  }
}

checkDatabase();
