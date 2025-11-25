import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, Clock, Users } from "lucide-react";
import { MadeWithDyad } from "@/components/made-with-dyad";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import DynamicIcon from "@/components/ui/dynamic-icon";
import { format } from "date-fns";
import { enGB } from "date-fns/locale";
import BookingConfirmationDialog from "@/components/BookingConfirmationDialog";

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
  const { toast } = useToast();
  const [classes, setClasses] = useState<Class[]>([]);
  const [filteredClasses, setFilteredClasses] = useState<Class[]>([]);
  const [groupedClasses, setGroupedClasses] = useState<Record<string, Class[]>>({});
  const [loading, setLoading] = useState(true);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [filterType, setFilterType] = useState("all");
  const [filterInstructor, setFilterInstructor] = useState("all");
  const [instructors, setInstructors] = useState<string[]>([]);
  const [classTypes, setClassTypes] = useState<string[]>([]);
  const [classToBook, setClassToBook] = useState<Class | null>(null);

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
        .from('schedules')
        .select(`
          id,
          start_time,
          end_time,
          classes (
            id,
            name,
            type,
            instructor,
            duration,
            capacity,
            icon,
            background_color
          ),
          bookings (
            count
          )
        `)
        .gte('start_time', today.toISOString())
        .order('start_time', { ascending: true });

      if (schedulesError) throw schedulesError;

      const { data: userBookings, error: bookingsError } = await supabase
        .from('bookings')
        .select('schedule_id')
        .eq('user_id', user.id);

      if (bookingsError) throw bookingsError;

      const userBookedScheduleIds = new Set(userBookings.map(b => b.schedule_id));

      const formattedClasses = schedules.map((schedule: any) => ({
        id: schedule.id,
        name: schedule.classes.name,
        type: schedule.classes.type,
        instructor: schedule.classes.instructor,
        duration: schedule.classes.duration,
        capacity: schedule.classes.capacity,
        icon: schedule.classes.icon,
        background_color: schedule.classes.background_color,
        start_time: schedule.start_time,
        booked_spots: schedule.bookings[0]?.count || 0,
        isBookedByUser: userBookedScheduleIds.has(schedule.id),
      }));

      setClasses(formattedClasses);
      
      const uniqueInstructors = Array.from(new Set(formattedClasses.map(cls => cls.instructor)));
      setInstructors(uniqueInstructors.sort());

      const uniqueTypes = Array.from(new Set(formattedClasses.map(cls => cls.type)));
      setClassTypes(uniqueTypes.sort());

    } catch (error: any) {
      toast({
        title: "Error",
        description: "Could not load classes",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let result = [...classes];
    if (filterType !== "all") result = result.filter(cls => cls.type === filterType);
    if (filterInstructor !== "all") result = result.filter(cls => cls.instructor === filterInstructor);
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

  }, [filterType, filterInstructor, classes]);

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

      toast({
        title: "Booking confirmed!",
        description: "Your spot has been successfully booked.",
      });
      fetchClasses();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
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
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Class type</label>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger><SelectValue placeholder="All types" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All types</SelectItem>
                {classTypes.map(type => (
                  <SelectItem key={type} value={type}>{type}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Instructor</label>
            <Select value={filterInstructor} onValueChange={setFilterInstructor}>
              <SelectTrigger><SelectValue placeholder="All instructors" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All instructors</SelectItem>
                {instructors.map(instructor => (
                  <SelectItem key={instructor} value={instructor}>{instructor}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
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
                      <CardHeader>
                        <CardTitle className="flex justify-between items-start">
                          <div className="flex items-center gap-3">
                            {cls.icon && <DynamicIcon name={cls.icon} className="h-6 w-6 text-gray-700" />}
                            <span>{cls.name}</span>
                          </div>
                          <span className="text-sm font-normal bg-blue-100 text-blue-800 px-2 py-1 rounded-full">{cls.type}</span>
                        </CardTitle>
                        <CardDescription>{cls.instructor}</CardDescription>
                      </CardHeader>
                      <CardContent className="flex-grow space-y-3">
                        <div className="flex items-center text-sm text-gray-600"><Calendar className="mr-2 h-4 w-4" />{format(new Date(cls.start_time), 'PPP', { locale: enGB })}</div>
                        <div className="flex items-center text-sm text-gray-600"><Clock className="mr-2 h-4 w-4" />{format(new Date(cls.start_time), 'p', { locale: enGB })} ({cls.duration} min)</div>
                        <div className="flex items-center text-sm text-gray-600"><Users className="mr-2 h-4 w-4" />Available: {availableSpots} of {cls.capacity}</div>
                      </CardContent>
                      <div className="px-6 pb-6">
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