import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { startOfMonth, endOfMonth, format } from "https://deno.land/x/date_fns/index.js";

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

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('Unauthorized');
    
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) throw new Error('User not found');

    const { schedule_id } = await req.json();
    if (!schedule_id) throw new Error('Schedule ID is required');

    // --- Lógica de validación de créditos ---
    const { data: schedule, error: scheduleError } = await supabaseAdmin
      .from('schedules')
      .select('start_time, classes(type)')
      .eq('id', schedule_id)
      .single();

    if (scheduleError || !schedule) throw new Error('Schedule not found');

    const classDate = new Date(schedule.start_time);
    const classType = schedule.classes.type;
    const monthStart = format(startOfMonth(classDate), 'yyyy-MM-dd');
    const monthEnd = format(endOfMonth(classDate), 'yyyy-MM-dd');

    const { data: userPackage, error: packageError } = await supabaseAdmin
      .from('user_packages')
      .select('*, packages(*, package_items(*))')
      .eq('user_id', user.id)
      .eq('valid_from', monthStart)
      .eq('valid_until', monthEnd)
      .single();

    if (packageError || !userPackage) {
      return new Response(JSON.stringify({ error: 'You do not have an active package for this month.' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const packageItem = userPackage.packages.package_items.find(item => item.class_type === classType);
    if (!packageItem) {
      return new Response(JSON.stringify({ error: 'This class type is not included in your package.' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const { count: bookedCount, error: countError } = await supabaseAdmin
      .from('bookings')
      .select('id', { count: 'exact' })
      .eq('user_id', user.id)
      .gte('booking_date', userPackage.valid_from)
      .lte('booking_date', userPackage.valid_until)
      .eq('class_id', (await supabaseAdmin.from('schedules').select('class_id').eq('id', schedule_id).single()).data.class_id);
      
    if (countError) throw countError;

    if (bookedCount >= packageItem.credits) {
      return new Response(JSON.stringify({ error: `No credits left for ${classType} classes.` }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    // --- Fin de la lógica de validación ---

    const { data, error } = await supabaseAdmin.rpc('book_class_if_available', {
      p_schedule_id: schedule_id,
      p_user_id: user.id
    });

    if (error) throw error;
    const result = data as string;

    if (result === 'SUCCESS') {
      return new Response(JSON.stringify({ message: 'Booking successful' }), { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    } else {
      const statusMap = {
        'ALREADY_BOOKED': 409, 'CLASS_FULL': 409, 'SCHEDULE_NOT_FOUND': 404,
        'ERROR_INSERT_FAILED': 500, 'UNAUTHORIZED': 401
      };
      const messageMap = {
        'ALREADY_BOOKED': 'You are already booked for this class.',
        'CLASS_FULL': 'The class is full.',
        'SCHEDULE_NOT_FOUND': 'Scheduled class not found.',
        'ERROR_INSERT_FAILED': 'Could not register the booking.',
        'UNAUTHORIZED': 'Unauthorized action.'
      };
      return new Response(JSON.stringify({ error: messageMap[result] || 'An unexpected error occurred.' }), { status: statusMap[result] || 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});