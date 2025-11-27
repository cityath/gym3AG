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
import CreditSummaryCard from "@/components/CreditSummaryCard";

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
  
  // State for credit summary
  const [currentUserPackage, setCurrentUserPackage] = useState<any>(null);
  const [nextMonthUserPackage, setNextMonthUserPackage] = useState<any>(null);
  const [remainingCredits, setRemainingCredits] = useState<Record<string, number>>({});
  const [nextMonthRemainingCredits, setNextMonthRemainingCredits] = useState<Record<string, number>>({});

  useEffect(() => {
    if (!user) {
      navigate("/login");
    } else {
      fetchDashboardData();
    }
  }, [user, navigate]);

  const fetchDashboardData = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const currentMonthStart = startOfMonth(today);
      const currentMonthEnd = endOfMonth(today);
      const nextMonth = addMonths(today, 1);
      const nextMonthStart = startOfMonth(nextMonth);
      const nextMonthEnd = endOfMonth(nextMonth);

      const [
        { data: schedules, error: schedulesError },
        { data: userBookings, error: bookingsError },
        { data: allUserPackages, error: allPackagesError },
        { data: currentUserPackageData, error: currentUserPackageError },
        { data: nextMonthUserPackageData, error: nextMonthUserPackageError },
        { data: monthBookings, error: monthBookingsError },
        { data: nextMonthBookings, error: nextMonthBookingsError }
      ] = await Promise.all([
        supabase.rpc('get_schedules_with_booking_counts', { start_date: today.toISOString() }),
        supabase.from('bookings').select('schedule_id').eq('user_id', user.id),
        supabase.from('user_packages').select('packages(package_items(class_type))').eq('user_id', user.id).gte('valid_until', format(today, 'yyyy-MM-dd')),
        supabase.from("user_packages").select("*, packages(*, package_items(*))").eq("user_id", user.id).gte("valid_from", format(currentMonthStart, 'yyyy-MM-dd')).lte("valid_until", format(currentMonthEnd, 'yyyy-MM-dd')).single(),
        supabase.from("user_packages").select("*, packages(*, package_items(*))").eq("user_id", user.id).gte("valid_from", format(nextMonthStart, 'yyyy-MM-dd')).lte("valid_until", format(nextMonthEnd, 'yyyy-MM-dd')).single(),
        supabase.from('bookings').select('classes(type)').eq('user_id', user.id).gte('booking_date', currentMonthStart.toISOString()).lte('booking_date', currentMonthEnd.toISOString()),
        supabase.from('bookings').select('classes(type)').eq('user_id', user.id).gte('booking_date', nextMonthStart.toISOString()).lte('booking_date', nextMonthEnd.toISOString())
      ]);

      if (schedulesError) throw schedulesError;
      if (bookingsError) throw bookingsError;
      if (allPackagesError) throw allPackagesError;
      if (currentUserPackageError && currentUserPackageError.code !== 'PGRST116') throw currentUserPackageError;
      if (nextMonthUserPackageError && nextMonthUserPackageError.code !== 'PGRST116') throw nextMonthUserPackageError;
      if (monthBookingsError) throw monthBookingsError;
      if (nextMonthBookingsError) throw nextMonthBookingsError;

      // Process data for credit summary
      setCurrentUserPackage(currentUserPackageData);
      setNextMonthUserPackage(nextMonthUserPackageData);

      // --- Process Current Month Credits ---
      if (currentUserPackageData) {
        const finalRemainingCredits: Record<string, number> = {};
        currentUserPackageData.packages.package_items.forEach((packageItem: any) => {
          const packageItemTypeLower = packageItem.class_type.toLowerCase();
          const usedCreditsCount = (monthBookings || []).filter(booking => {
            const bookingType = (booking.classes as any)?.type;
            if (!bookingType) return false;
            const bookingTypeLower = bookingType.toLowerCase();
            return bookingTypeLower.includes(packageItemTypeLower);
          }).length;
          finalRemainingCredits[packageItem.class_type] = packageItem.credits - usedCreditsCount;
        });
        setRemainingCredits(finalRemainingCredits);
      } else {
        setRemainingCredits({});
      }

      // --- Process Next Month Credits ---
      if (nextMonthUserPackageData) {
        const finalRemainingCredits: Record<string, number> = {};
        nextMonthUserPackageData.packages.package_items.forEach((packageItem: any) => {
          const packageItemTypeLower = packageItem.class_type.toLowerCase();
          const usedCreditsCount = (nextMonthBookings || []).filter(booking => {
            const bookingType = (booking.classes as any)?.type;
            if (!bookingType) return false;
            const bookingTypeLower = bookingType.toLowerCase();
            return bookingTypeLower.includes(packageItemTypeLower);
          }).length;
          finalRemainingCredits[packageItem.class_type] = packageItem.credits - usedCreditsCount;
        });
        setNextMonthRemainingCredits(finalRemainingCredits);
      } else {
        setNextMonthRemainingCredits({});
      }

      // Process data for class list
      const userBookedScheduleIds = new Set(userBookings.map(b => b.schedule_id));
      const coveredTypes = new Set<string>();
      allUserPackages?.forEach((up: any) => {
        up.packages.package_items.forEach((item: any) => coveredTypes.add(item.class_type.toLowerCase()));
      });
      setCoveredClassTypes(Array.from(coveredTypes));

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
      showError("Could not load dashboard data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let result = [...classes];
    if (onlyBonus) {
        result = result.filter(cls => {
            if (!cls.type) return false;
            const classTypeLower = cls.type.toLowerCase();
            return coveredClassTypes.some(coveredType => 
                classTypeLower.includes(coveredType) || coveredType.includes(classTypeLower)
            );
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

  const handleAttemptBooking = (cls: Class) => {
    const classDate = new Date(cls.start_time);
    const today = new Date();
    const isNextMonth = classDate.getMonth() > today.getMonth() || classDate.getFullYear() > today.getFullYear();

    const packageToCheck = isNextMonth ? nextMonthUserPackage : currentUserPackage;
    const creditsToCheck = isNextMonth ? nextMonthRemainingCredits : remainingCredits;
    const monthString = isNextMonth ? "next month" : "this month";

    if (!packageToCheck) {
        showError(`You don't have an active package for ${monthString}.`);
        return;
    }

    const classTypeToCheck = cls.type.toLowerCase();

    const relevantPackageItem = packageToCheck.packages.package_items.find((item: any) => 
        classTypeToCheck.includes(item.class_type.toLowerCase())
    );

    if (!relevantPackageItem) {
        showError(`This class is not included in your package for ${monthString}.`);
        return;
    }

    const creditsLeft = creditsToCheck[relevantPackageItem.class_type];

    if (creditsLeft !== undefined && creditsLeft > 0) {
        setClassToBook(cls);
    } else {
        showError(`You have no credits left for ${relevantPackageItem.class_type} classes.`);
    }
  };

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
      fetchDashboardData();
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
        
        <CreditSummaryCard
          loading={loading}
          currentMonthPackage={currentUserPackage}
          nextMonthPackage={nextMonthUserPackage}
          remainingCredits={remainingCredits}
          nextMonthRemainingCredits={nextMonthRemainingCredits}
        />

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
                          onClick={() => handleAttemptBooking(cls)}
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