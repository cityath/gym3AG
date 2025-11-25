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
    // 1. Authenticate user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401
      });
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'User not found' }), { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401
      });
    }

    const { schedule_id } = await req.json();
    if (!schedule_id) {
      return new Response(JSON.stringify({ error: 'Schedule ID is required' }), { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      });
    }

    // Use admin client to call the RPC function for elevated privileges
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data, error } = await supabaseAdmin.rpc('book_class_if_available', {
      p_schedule_id: schedule_id,
      p_user_id: user.id
    });

    if (error) throw error;

    const result = data as string;

    if (result === 'SUCCESS') {
      return new Response(JSON.stringify({ message: 'Booking successful' }), { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 201 // 201 Created for success
      });
    } else if (result === 'ALREADY_BOOKED') {
       return new Response(JSON.stringify({ error: 'You are already booked for this class.' }), { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 409
      });
    } else if (result === 'CLASS_FULL') {
      return new Response(JSON.stringify({ error: 'The class is full.' }), { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 409 // 409 Conflict is a good status here
      });
    } else if (result === 'SCHEDULE_NOT_FOUND') {
       return new Response(JSON.stringify({ error: 'Scheduled class not found.' }), { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 404
      });
    } else if (result === 'ERROR_INSERT_FAILED') {
       return new Response(JSON.stringify({ error: 'Could not register the booking in the database.' }), { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      });
    } else {
       return new Response(JSON.stringify({ error: 'An unexpected error occurred while making the booking.' }), { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      });
    }

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500
    });
  }
});