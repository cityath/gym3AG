import { useEffect, useState, useCallback } from "react";
import { Calendar, dateFnsLocalizer, Views } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay } from 'date-fns';
import { enGB } from 'date-fns/locale';
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import ScheduleForm from "@/components/admin/ScheduleForm";

const locales = {
  'en-GB': enGB,
};
const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: () => startOfWeek(new Date(), { weekStartsOn: 1 }), // Monday
  getDay,
  locales,
});

interface Class {
  id: string;
  name: string;
  duration: number;
}

interface ScheduleEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  resource: {
    class_id: string;
    type: string;
    background_color?: string;
  };
}

interface BusinessHours {
  day_of_week: string;
  morning_open_time: string | null;
  morning_close_time: string | null;
  afternoon_open_time: string | null;
  afternoon_close_time: string | null;
}

const dayMapping = [
  "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"
];

const WeeklyCalendar = () => {
  const [events, setEvents] = useState<ScheduleEvent[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [businessHours, setBusinessHours] = useState<BusinessHours[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<ScheduleEvent | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<{ start: Date, end: Date } | null>(null);
  const [timeRange, setTimeRange] = useState<{ min: Date, max: Date } | null>(null);

  const fetchSchedulesAndClasses = useCallback(async () => {
    setLoading(true);
    try {
      const [
        { data: classesData, error: classesError },
        { data: schedulesData, error: schedulesError },
        { data: hoursData, error: hoursError }
      ] = await Promise.all([
        supabase.from("classes").select("id, name, duration"),
        supabase.from("schedules").select(`id, start_time, end_time, classes (id, name, type, background_color)`),
        supabase.from("business_hours").select("day_of_week, morning_open_time, morning_close_time, afternoon_open_time, afternoon_close_time")
      ]);

      if (classesError) throw classesError;
      if (schedulesError) throw schedulesError;
      if (hoursError) throw hoursError;

      setBusinessHours(hoursData || []);

      if (hoursData && hoursData.length > 0) {
        const allTimes = hoursData.flatMap(h => [
            h.morning_open_time, 
            h.morning_close_time, 
            h.afternoon_open_time, 
            h.afternoon_close_time
        ]).filter(Boolean);

        if (allTimes.length > 0) {
            const minTimeStr = allTimes.reduce((min, current) => current < min ? current : min);
            const maxTimeStr = allTimes.reduce((max, current) => current > max ? current : max);

            const [minHour, minMinute] = minTimeStr.split(':').map(Number);
            const minDate = new Date();
            minDate.setHours(minHour, minMinute, 0, 0);

            const [maxHour, maxMinute] = maxTimeStr.split(':').map(Number);
            const maxDate = new Date();
            maxDate.setHours(maxHour, maxMinute, 0, 0);

            setTimeRange({ min: minDate, max: maxDate });
        } else {
          setTimeRange(null);
        }
      }

      setClasses(classesData || []);

      const formattedEvents = schedulesData?.map((schedule: any) => ({
        id: schedule.id,
        title: schedule.classes.name,
        start: new Date(schedule.start_time),
        end: new Date(schedule.end_time),
        resource: { 
          class_id: schedule.classes.id, 
          type: schedule.classes.type,
          background_color: schedule.classes.background_color,
        },
      })) || [];
      setEvents(formattedEvents);

    } catch (error: any) {
      toast({ title: "Error", description: "Could not load the schedule.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchSchedulesAndClasses();
  }, [fetchSchedulesAndClasses]);

  const handleSelectSlot = useCallback(({ start, end }: { start: Date, end: Date }) => {
    setSelectedEvent(null);
    setSelectedSlot({ start, end });
    setIsDialogOpen(true);
  }, []);

  const handleSelectEvent = useCallback((event: ScheduleEvent) => {
    setSelectedSlot(null);
    setSelectedEvent(event);
    setIsDialogOpen(true);
  }, []);

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setSelectedEvent(null);
    setSelectedSlot(null);
  };

  const handleSave = async (values: { class_id: string; start_time: string; end_time: string; }, id?: string) => {
    const { class_id, start_time, end_time } = values;
    
    const scheduleData = {
      class_id,
      start_time,
      end_time,
    };

    let error;
    if (id) { // Update
      const { error: updateError } = await supabase.from("schedules").update(scheduleData).eq("id", id);
      error = updateError;
    } else { // Create
      const { error: insertError } = await supabase.from("schedules").insert([scheduleData]);
      error = insertError;
    }

    if (error) {
      toast({ title: "Error", description: "Could not save the scheduled class.", variant: "destructive" });
    } else {
      toast({ title: "Success", description: "Schedule saved successfully." });
      fetchSchedulesAndClasses();
    }
    handleCloseDialog();
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("schedules").delete().eq("id", id);
    if (error) {
      toast({ title: "Error", description: "Could not delete the scheduled class.", variant: "destructive" });
    } else {
      toast({ title: "Success", description: "Scheduled class deleted." });
      fetchSchedulesAndClasses();
    }
    handleCloseDialog();
  };

  const eventStyleGetter = useCallback((event: ScheduleEvent) => {
    const backgroundColor = event.resource.background_color || '#f3f4f6'; // default gray-100
    const style = {
      backgroundColor,
      color: '#1f2937', // text-gray-800
      borderRadius: '6px',
      border: 'none',
      padding: '2px 4px',
      fontSize: '0.75rem',
    };
    return {
      style,
    };
  }, []);

  const slotPropGetter = useCallback((date: Date) => {
    const dayOfWeek = dayMapping[date.getDay()];
    const dayHours = businessHours.find(h => h.day_of_week === dayOfWeek);

    if (!dayHours) {
      return { className: 'rbc-non-work-slot' };
    }

    const toTimeValue = (d: Date) => d.getHours() + d.getMinutes() / 60;
    const slotTimeValue = toTimeValue(date);

    const parseTimeValue = (timeString: string | null): number | null => {
      if (!timeString) return null;
      const parts = timeString.split(':');
      if (parts.length < 2) return null;
      const hours = parseInt(parts[0], 10);
      const minutes = parseInt(parts[1], 10);
      if (isNaN(hours) || isNaN(minutes)) return null;
      return hours + minutes / 60;
    };

    const morningOpen = parseTimeValue(dayHours.morning_open_time);
    const morningClose = parseTimeValue(dayHours.morning_close_time);
    const afternoonOpen = parseTimeValue(dayHours.afternoon_open_time);
    const afternoonClose = parseTimeValue(dayHours.afternoon_close_time);

    let isWorkHour = false;

    if (morningOpen !== null && morningClose !== null) {
      if (slotTimeValue >= morningOpen && slotTimeValue < morningClose) {
        isWorkHour = true;
      }
    }

    if (afternoonOpen !== null && afternoonClose !== null) {
      if (slotTimeValue >= afternoonOpen && slotTimeValue < afternoonClose) {
        isWorkHour = true;
      }
    }

    return isWorkHour ? {} : { className: 'rbc-non-work-slot' };
  }, [businessHours]);

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Weekly Schedule</CardTitle>
          <CardDescription>
            Click on a time slot to add a class or on an existing class to edit it. Non-working hours appear in grey.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? <p>Loading calendar...</p> : (
            <div style={{ height: '70vh' }}>
              <Calendar
                localizer={localizer}
                events={events}
                startAccessor="start"
                endAccessor="end"
                defaultView={Views.WEEK}
                views={[Views.WEEK]}
                selectable
                onSelectSlot={handleSelectSlot}
                onSelectEvent={handleSelectEvent}
                eventPropGetter={eventStyleGetter}
                slotPropGetter={slotPropGetter}
                culture="en-GB"
                min={timeRange?.min}
                max={timeRange?.max}
                messages={{
                  next: "Next",
                  previous: "Previous",
                  today: "Today",
                  week: "Week",
                  noEventsInRange: "No events in this range.",
                }}
              />
            </div>
          )}
        </CardContent>
      </Card>
      <ScheduleForm
        isOpen={isDialogOpen}
        onClose={handleCloseDialog}
        onSave={handleSave}
        onDelete={handleDelete}
        event={selectedEvent}
        slot={selectedSlot}
        classes={classes}
      />
    </>
  );
};

export default WeeklyCalendar;