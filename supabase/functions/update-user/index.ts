import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { user_id, first_name, last_name, role, phone, avatar_url, password } = await req.json();

    if (!user_id) {
        return new Response(JSON.stringify({ error: 'User ID is required' }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
        });
    }

    // Update auth user if password is provided
    if (password && password.trim() !== '') {
      const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(
        user_id,
        { password }
      );
      if (authError) throw authError;
    }

    // Update profile data
    const { data, error } = await supabaseAdmin
      .from('profiles')
      .update({ first_name, last_name, role, phone, avatar_url })
      .eq('id', user_id)
      .select()
      .single();

    if (error) throw error;

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});