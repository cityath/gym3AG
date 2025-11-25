import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { format, parse, startOfWeek, getDay } from "date-fns";
import { enGB } from "date-fns/locale";
import { Calendar as CalendarIcon, Clock, User, List } from "lucide-react";
import { getContrastingTextColor } from "@/utils/styleUtils";
import { Calendar, dateFnsLocalizer, Views } from 'react-big-calendar';
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

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

interface Booking {
  id: string;
  booking_date: string;
  schedules: {
    start_time: string;
    end_time: string;
    classes: {
      name: string;
      instructor: string;
      background_color: string | null;
    }
  }
}

const MyBookings = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [groupedBookings, setGroupedBookings] = useState<Record<string, Booking[]>>({});
  const [loading, setLoading] = useState(true);
  const [bookingToCancel, setBookingToCancel] = useState<Booking | null>(null);
  const [cancelLoading, setCancelLoading] = useState(false);
  const [view, setView] = useState<'list' | 'calendar'>('list');
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  const fetchBookings = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("bookings")
        .select(`
          id,
          booking_date,
          schedules (
            start_time,
            end_time,
            classes (
              name,
              instructor,
              background_color
            )
          )
        `)
        .eq("user_id", user.id)
        .order("start_time", { referencedTable: 'schedules', ascending: true });

      if (error) throw error;
      setBookings(data as Booking[] || []);
    } catch (error: any) {
      toast({ title: "Error", description: "Could not load your bookings.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings();
  }, [user]);

  useEffect(() => {
    const grouped = bookings.reduce((acc, booking) => {
      const dateKey = format(new Date(booking.schedules.start_time), 'yyyy-MM-dd');
      if (!acc[dateKey]) {
        acc[dateKey] = [];
      }
      acc[dateKey].push(booking);
      return acc;
    }, {} as Record<string, Booking[]>);
    setGroupedBookings(grouped);
  }, [bookings]);

  const handleCancelBooking = async () => {
    if (!bookingToCancel) return;
    setCancelLoading(true);
    try {
      const { error } = await supabase.functions.invoke('cancel-booking', {
        body: { booking_id: bookingToCancel.id },
      });
      if (error) throw new Error("Could not cancel the booking.");
      
      toast({ title: "Success", description: "Booking cancelled successfully." });
      fetchBookings(); // Refresh the list
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setCancelLoading(false);
      setBookingToCancel(null);
    }
  };

  const calendarEvents = bookings.map(booking => ({
    title: booking.schedules.classes.name,
    start: new Date(booking.schedules.start_time),
    end: new Date(booking.schedules.end_time),
    resource: {
      ...booking,
      backgroundColor: booking.schedules.classes.background_color,
    }
  }));

  const eventStyleGetter = useCallback((event: any) => {
    const backgroundColor = event.resource.backgroundColor || '#f3f4f6';
    const style = {
      backgroundColor,
      color: getContrastingTextColor(backgroundColor),
      borderRadius: '6px',
      border: 'none',
      padding: '2px 4px',
      fontSize: '0.75rem',
    };
    return { style };
  }, []);

  const handleSelectEvent = useCallback((event: { start: Date }) => {
    setSelectedDate(event.start);
    setView('list');
  }, []);

  const dateKeyFromSelected = selectedDate ? format(selectedDate, 'yyyy-MM-dd') : null;
  const bookingKeys = dateKeyFromSelected
    ? (groupedBookings[dateKeyFromSelected] ? [dateKeyFromSelected] : [])
    : Object.keys(groupedBookings).sort();

  return (
    <div className="p-4 md:p-6 space-y-6">
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <CardTitle>My Bookings</CardTitle>
              <CardDescription>Here you can view and manage your upcoming classes.</CardDescription>
            </div>
            <ToggleGroup type="single" value={view} onValueChange={(value) => { if (value) { setView(value as 'list' | 'calendar'); setSelectedDate(null); } }} className="shrink-0">
              <ToggleGroupItem value="list" aria-label="List view"><List className="h-4 w-4" /></ToggleGroupItem>
              <ToggleGroupItem value="calendar" aria-label="Calendar view"><CalendarIcon className="h-4 w-4" /></ToggleGroupItem>
            </ToggleGroup>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p>Loading your bookings...</p>
          ) : view === 'list' ? (
            <>
              {selectedDate && (
                <div className="mb-4">
                  <Button variant="secondary" onClick={() => setSelectedDate(null)}>
                    &larr; Show All Bookings
                  </Button>
                </div>
              )}
              {bookingKeys.length === 0 ? (
                <p className="text-gray-500">{selectedDate ? 'No bookings for this day.' : 'You have no classes booked.'}</p>
              ) : (
                <div className="space-y-8">
                  {bookingKeys.map(dateKey => (
                    <div key={dateKey}>
                      <h3 className="text-lg font-semibold text-gray-700 mb-4 capitalize border-b pb-2">
                        {format(new Date(dateKey + 'T00:00:00'), "EEEE, d MMMM", { locale: enGB })}
                      </h3>
                      <div className="space-y-4">
                        {groupedBookings[dateKey].map((booking) => {
                          const bgColor = booking.schedules.classes.background_color;
                          const textColor = getContrastingTextColor(bgColor);
                          return (
                            <div 
                              key={booking.id} 
                              className="p-4 border rounded-lg flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4"
                              style={{ backgroundColor: bgColor || 'transparent' }}
                            >
                              <div className="space-y-2">
                                <h3 className="font-semibold text-lg" style={{ color: textColor }}>{booking.schedules.classes.name}</h3>
                                <div className="flex items-center text-sm" style={{ color: textColor }}><User className="mr-2 h-4 w-4" />{booking.schedules.classes.instructor}</div>
                                <div className="flex items-center text-sm" style={{ color: textColor }}><Clock className="mr-2 h-4 w-4" />{format(new Date(booking.schedules.start_time), 'p', { locale: enGB })}</div>
                              </div>
                              <Button variant="outline" onClick={() => setBookingToCancel(booking)}>
                                Cancel Booking
                              </Button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : (
            <div style={{ height: '70vh' }}>
              <Calendar
                localizer={localizer}
                events={calendarEvents}
                startAccessor="start"
                endAccessor="end"
                defaultView={Views.MONTH}
                views={[Views.MONTH]}
                eventPropGetter={eventStyleGetter}
                onSelectEvent={handleSelectEvent}
                culture="en-GB"
                messages={{
                  next: "Next",
                  previous: "Previous",
                  today: "Today",
                  month: "Month",
                  noEventsInRange: "No bookings in this range.",
                  showMore: total => `+ See more (${total})`
                }}
              />
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={!!bookingToCancel} onOpenChange={(open) => !open && setBookingToCancel(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm cancellation?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. You will release your spot in the <strong>{bookingToCancel?.schedules.classes.name}</strong> class.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>No, keep it</AlertDialogCancel>
            <AlertDialogAction onClick={handleCancelBooking} disabled={cancelLoading}>
              {cancelLoading ? "Cancelling..." : "Yes, cancel"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default MyBookings;