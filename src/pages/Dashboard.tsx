import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Clock, Users } from "lucide-react";
import { MadeWithDyad } from "@/components/made-with-dyad";
import { showSuccess, showError } from "@/utils/toast";
import { supabase } from "@/integrations/supabase/client";
import DynamicIcon from "@/components/ui/dynamic-icon";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { enGB } from "date-fns/locale";
import BookingConfirmationDialog from "@/components/BookingConfirmationDialog";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

interface Class {
  id: string; // schedule ID
  name: string;
  type: string;
  instructor: string;
  start_time: string;
  duration: number;
  capacity: number;
  booked_spots: number;
  icon?: string;
  background_color?: string;
  isBookedByUser: boolean;
}

const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [classes, setClasses] = useState<Class[]>([]);
  const [filteredClasses, setFilteredClasses] = useState<Class[]>([]);
  const [groupedClasses, setGroupedClasses] = useState<Record<string, Class[]>>({});
  const [loading, setLoading] = useState(true);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [classToBook, setClassToBook] = useState<Class | null>(null);
  const [onlyBonus, setOnlyBonus] = useState(false);
  const [userCredits, setUserCredits] = useState<Record<string, { remaining: number }>>({});

  useEffect(() => {
    if (!user) {
      navigate("/login");
    } else {
      fetchClasses();
    }
  }, [user, navigate]);

  const fetchClasses = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const { data: schedules, error: schedulesError } = await supabase
        .rpc('get_schedules_with_booking_counts', {
          start_date: today.toISOString()
        });

      if (schedulesError) throw schedulesError;

      const { data: userBookings, error: bookingsError } = await supabase
        .from('bookings')
        .select('schedule_id')
        .eq('user_id', user.id);

      if (bookingsError) throw bookingsError;

      const userBookedScheduleIds = new Set(userBookings.map(b => b.schedule_id));

      // Fetch user's current package and calculate remaining credits
      const currentMonthStart = startOfMonth(today);
      const currentMonthEnd = endOfMonth(today);

      const { data: userPackageData, error: userPackageError } = await supabase
        .from('user_packages')
        .select('*, packages(*, package_items(*))')
        .eq('user_id', user.id)
        .gte('valid_from', format(currentMonthStart, 'yyyy-MM-dd'))
        .lte('valid_until', format(currentMonthEnd, 'yyyy-MM-dd'))
        .single();
      
      if (userPackageError && userPackageError.code !== 'PGRST116') throw userPackageError;

      const creditsInfo: Record<string, { remaining: number }> = {};
      if (userPackageData) {
        const { data: monthBookings, error: monthBookingsError } = await supabase
          .from('bookings')
          .select('classes(type)')
          .eq('user_id', user.id)
          .gte('booking_date', currentMonthStart.toISOString())
          .lte('booking_date', currentMonthEnd.toISOString());
        
        if (monthBookingsError) throw monthBookingsError;

        const usedCredits: Record<string, number> = (monthBookings || []).reduce((acc, booking) => {
            const type = (booking.classes as any)?.type;
            if (type) {
                acc[type] = (acc[type] || 0) + 1;
            }
            return acc;
        }, {});

        userPackageData.packages.package_items.forEach(item => {
            creditsInfo[item.class_type] = {
                remaining: item.credits - (usedCredits[item.class_type] || 0)
            };
        });
      }
      setUserCredits(creditsInfo);

      const formattedClasses = schedules.map((schedule: any) => ({
        id: schedule.id,
        name: schedule.class_name,
        type: schedule.class_type,
        instructor: schedule.instructor,
        duration: schedule.duration,
        capacity: schedule.capacity,
        icon: schedule.icon,
        background_color: schedule.background_color,
        start_time: schedule.start_time,
        booked_spots: schedule.booked_spots,
        isBookedByUser: userBookedScheduleIds.has(schedule.id),
      }));

      setClasses(formattedClasses);
      
    } catch (error: any) {
      showError("Could not load classes");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let result = [...classes];

    if (onlyBonus) {
        result = result.filter(cls => {
            const creditInfo = userCredits[cls.type];
            return creditInfo && creditInfo.remaining > 0;
        });
    }

    setFilteredClasses(result);

    const grouped = result.reduce((acc, cls) => {
      const dateKey = format(new Date(cls.start_time), 'yyyy-MM-dd');
      if (!acc[dateKey]) {
        acc[dateKey] = [];
      }
      acc[dateKey].push(cls);
      return acc;
    }, {} as Record<string, Class[]>);
    setGroupedClasses(grouped);

  }, [onlyBonus, userCredits, classes]);

  const handleBookClass = async (scheduleId: string) => {
    setBookingLoading(true);
    try {
      const { error } = await supabase.functions.invoke('book-class', {
        body: { schedule_id: scheduleId },
      });

      if (error) {
        const errorData = await error.context.json();
        throw new Error(errorData.error || 'Could not make the booking.');
      }

      showSuccess("Booking confirmed! Your spot has been successfully booked.");
      fetchClasses();
    } catch (error: any) {
      showError(error.message);
    } finally {
      setBookingLoading(false);
      setClassToBook(null);
    }
  };

  if (!user) return null;

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">Upcoming Classes</h2>
        
        <div className="flex items-center space-x-2 mb-6">
          <Switch id="bonus-only" checked={onlyBonus} onCheckedChange={setOnlyBonus} />
          <Label htmlFor="bonus-only">Only Bonus Acquired</Label>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64"><p>Loading classes...</p></div>
      ) : filteredClasses.length === 0 ? (
        <div className="text-center py-12"><p>No classes found with the selected filters.</p></div>
      ) : (
        <div className="space-y-8">
          {Object.keys(groupedClasses).sort().map(dateKey => (
            <div key={dateKey}>
              <h3 className="text-lg font-semibold text-gray-700 mb-4 capitalize border-b pb-2">
                {format(new Date(dateKey + 'T00:00:00'), "EEEE, d MMMM", { locale: enGB })}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {groupedClasses[dateKey].map((cls) => {
                  const isFull = cls.booked_spots >= cls.capacity;
                  const availableSpots = cls.capacity - cls.booked_spots;
                  return (
                    <Card key={cls.id} className="flex flex-col" style={{ backgroundColor: cls.background_color || 'white' }}>
                      <CardHeader className="p-4 flex flex-row justify-between items-start gap-2">
                        <div>
                          <CardTitle className="flex items-center gap-3">
                            {cls.icon && <DynamicIcon name={cls.icon} className="h-6 w-6 text-gray-700" />}
                            <span>{cls.type}</span>
                          </CardTitle>
                          <CardDescription>With... {cls.instructor}</CardDescription>
                        </div>
                        <div className="text-right shrink-0">
                          <div className="flex items-center justify-end font-bold text-lg text-gray-800">
                            <Clock className="mr-1.5 h-4 w-4" />
                            <span>{format(new Date(cls.start_time), 'p', { locale: enGB })}</span>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="flex-grow p-4 pt-0">
                        <div className="flex items-center text-sm text-gray-600"><Users className="mr-2 h-4 w-4" />Available: {availableSpots} of {cls.capacity}</div>
                      </CardContent>
                      <div className="px-4 pb-4 mt-auto pt-2">
                        <Button 
                          className="w-full" 
                          disabled={isFull || cls.isBookedByUser} 
                          onClick={() => setClassToBook(cls)}
                        >
                          {cls.isBookedByUser ? "Already booked" : isFull ? "Class full" : "Book spot"}
                        </Button>
                      </div>
                    </Card>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
      <BookingConfirmationDialog
        isOpen={!!classToBook}
        onOpenChange={(open) => !open && setClassToBook(null)}
        classData={classToBook}
        onConfirm={handleBookClass}
        loading={bookingLoading}
      />
      <MadeWithDyad />
    </div>
  );
};

export default Dashboard;