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

    const { booking_id } = await req.json();
    if (!booking_id) {
      return new Response(JSON.stringify({ error: 'Booking ID is required' }), { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      });
    }

    // RLS policies will ensure the user can only delete their own booking.
    // The .eq('user_id', user.id) is an extra layer of security.
    const { error } = await supabaseClient
      .from('bookings')
      .delete()
      .eq('id', booking_id)
      .eq('user_id', user.id);

    if (error) {
      throw new Error('Failed to cancel booking.');
    }

    return new Response(JSON.stringify({ message: 'Booking cancelled successfully' }), { 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500
    });
  }
});