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
    // Use the service role key to perform admin actions
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { email, password, first_name, last_name, role, phone, avatar_url } = await req.json();

    // 1. Create the user in auth.users
    const { data: { user }, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm user for simplicity
      user_metadata: { first_name, last_name },
    });

    if (createError) throw createError;
    if (!user) throw new Error("User creation failed.");

    // The handle_new_user trigger will create the profile.
    // 2. Update the newly created profile with the specified role.
    const { error: updateError } = await supabaseAdmin
      .from('profiles')
      .update({ role, phone, avatar_url })
      .eq('id', user.id);

    if (updateError) {
      // If updating the role fails, we should probably delete the user to avoid an inconsistent state.
      await supabaseAdmin.auth.admin.deleteUser(user.id);
      throw updateError;
    }

    return new Response(JSON.stringify({ user }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 201,
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});