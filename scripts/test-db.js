const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://lboicfbzysnaetesvylt.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxib2ljZmJ6eXNuYWV0ZXN2eWx0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ5NTI2NjUsImV4cCI6MjA5MDUyODY2NX0.9L_wOK8aiSiXfLq6qUGonLEM__4xD_-cEY4nczGoW0w'
);

async function test() {
  const { data, error } = await supabase.from('connect_communities').select('count').limit(1);
  console.log('connect_communities:', error ? 'MISSING - ' + error.message : 'EXISTS');
  
  const { data: d2, error: e2 } = await supabase.from('connect_profiles').select('count').limit(1);
  console.log('connect_profiles:', e2 ? 'MISSING - ' + e2.message : 'EXISTS');
}

test().catch(console.error);
