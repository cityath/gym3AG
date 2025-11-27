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
import { format, startOfMonth, endOfMonth, addMonths } from "date-fns";
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
  const [coveredClassTypes, setCoveredClassTypes] = useState<string[]>([]);
  const [currentUserPackage, setCurrentUserPackage] = useState<any>(null);
  const [nextMonthUserPackage, setNextMonthUserPackage] = useState<any>(null);
  const [remainingCredits, setRemainingCredits] = useState<Record<string, number>>({});

  const fetchClassesAndPackages = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const currentMonthStart = startOfMonth(today);
      const currentMonthEnd = endOfMonth(today);
      const nextMonth = addMonths(today, 1);
      const nextMonthStart = startOfMonth(nextMonth);

      const [
        { data: schedules, error: schedulesError },
        { data: userBookings, error: bookingsError },
        { data: allUserPackages, error: allPackagesError },
        { data: monthBookings, error: monthBookingsError }
      ] = await Promise.all([
        supabase.rpc('get_schedules_with_booking_counts', { start_date: today.toISOString() }),
        supabase.from('bookings').select('schedule_id').eq('user_id', user.id),
        supabase.from('user_packages').select('*, packages(*, package_items(*))').eq('user_id', user.id).gte('valid_until', format(today, 'yyyy-MM-dd')),
        supabase.from('bookings').select('classes(type)').eq('user_id', user.id).gte('booking_date', format(currentMonthStart, 'yyyy-MM-dd')).lte('booking_date', format(currentMonthEnd, 'yyyy-MM-dd'))
      ]);

      if (schedulesError) throw schedulesError;
      if (bookingsError) throw bookingsError;
      if (allPackagesError) throw allPackagesError;
      if (monthBookingsError) throw monthBookingsError;

      // Process packages
      const currentPackage = allUserPackages.find(p => new Date(p.valid_from + 'T00:00:00').getMonth() === currentMonthStart.getMonth()) || null;
      const nextPackage = allUserPackages.find(p => new Date(p.valid_from + 'T00:00:00').getMonth() === nextMonthStart.getMonth()) || null;
      setCurrentUserPackage(currentPackage);
      setNextMonthUserPackage(nextPackage);

      // Calculate remaining credits for current month
      if (currentPackage) {
        const usedCredits = (monthBookings || []).reduce((acc, booking) => {
          const type = (booking.classes as any)?.type;
          if (type) acc[type] = (acc[type] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);
        const creditsInfo = {} as Record<string, number>;
        currentPackage.packages.package_items.forEach((item: any) => {
          creditsInfo[item.class_type] = item.credits - (usedCredits[item.class_type] || 0);
        });
        setRemainingCredits(creditsInfo);
      } else {
        setRemainingCredits({});
      }

      // Process classes for display
      const userBookedScheduleIds = new Set(userBookings.map(b => b.schedule_id));
      const coveredTypes = new Set<string>();
      allUserPackages?.forEach((up: any) => up.packages.package_items.forEach((item: any) => coveredTypes.add(item.class_type.toLowerCase())));
      setCoveredClassTypes(Array.from(coveredTypes));

      const formattedClasses = schedules.map((schedule: any) => ({
        id: schedule.id, name: schedule.class_name, type: schedule.class_type, instructor: schedule.instructor,
        duration: schedule.duration, capacity: schedule.capacity, icon: schedule.icon, background_color: schedule.background_color,
        start_time: schedule.start_time, booked_spots: schedule.booked_spots, isBookedByUser: userBookedScheduleIds.has(schedule.id),
      }));
      setClasses(formattedClasses);

    } catch (error: any) {
      showError("Could not load dashboard data");
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => {
    if (!user) {
      navigate("/login");
    } else {
      fetchClassesAndPackages();
    }
  }, [user, navigate]);

  useEffect(() => {
    let result = [...classes];
    if (onlyBonus) {
      result = result.filter(cls => {
        if (!cls.type) return false;
        const classTypeLower = cls.type.toLowerCase();
        return coveredClassTypes.some(coveredType => classTypeLower.includes(coveredType) || coveredType.includes(classTypeLower));
      });
    }
    setFilteredClasses(result);

    const grouped = result.reduce((acc, cls) => {
      const dateKey = format(new Date(cls.start_time), 'yyyy-MM-dd');
      if (!acc[dateKey]) acc[dateKey] = [];
      acc[dateKey].push(cls);
      return acc;
    }, {} as Record<string, Class[]>);
    setGroupedClasses(grouped);
  }, [onlyBonus, classes, coveredClassTypes]);

  const handleBookClass = async (scheduleId: string) => {
    setBookingLoading(true);
    try {
      const { error } = await supabase.functions.invoke('book-class', { body: { schedule_id: scheduleId } });
      if (error) {
        const errorData = await error.context.json();
        throw new Error(errorData.error || 'Could not make the booking.');
      }
      showSuccess("Booking confirmed! Your spot has been successfully booked.");
      fetchClassesAndPackages();
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
        
        {!loading && (
          <Card className="mb-6">
            <CardContent className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h4 className="font-semibold text-gray-800 capitalize">{format(new Date(), "MMMM yyyy", { locale: enGB })}</h4>
                {currentUserPackage ? (
                  <div className="text-sm text-gray-600 mt-1 space-y-1">
                    {currentUserPackage.packages.package_items.map((item: any) => (
                      <p key={item.class_type}>
                        <strong>{item.class_type}:</strong> {remainingCredits[item.class_type] ?? item.credits} / {item.credits} credits remaining
                      </p>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 mt-1">No active package for this month.</p>
                )}
              </div>
              <div>
                <h4 className="font-semibold text-gray-800 capitalize">{format(addMonths(new Date(), 1), "MMMM yyyy", { locale: enGB })}</h4>
                {nextMonthUserPackage ? (
                  <div className="text-sm text-gray-600 mt-1 space-y-1">
                    {nextMonthUserPackage.packages.package_items.map((item: any) => (
                      <p key={item.class_type}>
                        <strong>{item.class_type}:</strong> {item.credits} credits
                      </p>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 mt-1">No package acquired for next month.</p>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        <div className="flex items-center space-x-2">
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