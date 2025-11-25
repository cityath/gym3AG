import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format, addDays, startOfWeek, endOfWeek } from "date-fns";
import { enGB } from "date-fns/locale";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Users, Clock, ChevronLeft, ChevronRight } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";

// Define interfaces for the data
interface Profile {
  id: string;
  first_name: string;
  last_name: string;
}

interface Booking {
  user_id: string;
}

interface ScheduleData {
  id: string;
  start_time: string;
  classes: {
    name: string;
    capacity: number;
    background_color: string | null;
  } | null;
  bookings: Booking[];
}

interface ProcessedSchedule {
  id: string;
  startTime: string;
  className: string;
  capacity: number;
  backgroundColor: string | null;
  bookedUsers: {
    firstName: string;
    lastName: string;
  }[];
}

const BookingDashboard = () => {
  const [groupedSchedules, setGroupedSchedules] = useState<Record<string, ProcessedSchedule[]>>({});
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const [currentDate, setCurrentDate] = useState(new Date());

  const weekStart = useMemo(() => startOfWeek(currentDate, { weekStartsOn: 1 }), [currentDate]);
  const weekEnd = useMemo(() => endOfWeek(currentDate, { weekStartsOn: 1 }), [currentDate]);

  useEffect(() => {
    const fetchBookingData = async () => {
      setLoading(true);
      try {
        // 1. Fetch schedules with bookings for the current week
        const { data: schedulesData, error: schedulesError } = await supabase
          .from('schedules')
          .select(`
            id,
            start_time,
            classes (
              name,
              capacity,
              background_color
            ),
            bookings (
              user_id
            )
          `)
          .gte('start_time', weekStart.toISOString())
          .lte('start_time', weekEnd.toISOString())
          .order('start_time', { ascending: true });

        if (schedulesError) throw schedulesError;

        // 2. Collect all unique user IDs from the bookings
        const userIds = schedulesData.flatMap(s => s.bookings.map(b => b.user_id));
        const uniqueUserIds = [...new Set(userIds)];

        let profilesById: Record<string, Profile> = {};

        if (uniqueUserIds.length > 0) {
          // 3. Fetch profiles for all collected user IDs in a single query
          const { data: profilesData, error: profilesError } = await supabase
            .from('profiles')
            .select('id, first_name, last_name')
            .in('id', uniqueUserIds);

          if (profilesError) throw profilesError;

          profilesById = profilesData.reduce((acc, p) => {
            acc[p.id] = p;
            return acc;
          }, {} as Record<string, Profile>);
        }

        // 4. Process and combine the data
        const processedData: ProcessedSchedule[] = (schedulesData as ScheduleData[]).map(schedule => ({
          id: schedule.id,
          startTime: schedule.start_time,
          className: schedule.classes?.name || 'Unknown Class',
          capacity: schedule.classes?.capacity || 0,
          backgroundColor: schedule.classes?.background_color || null,
          bookedUsers: schedule.bookings
            .map(b => profilesById[b.user_id])
            .filter(p => p?.first_name && p?.last_name)
            .map(p => ({
              firstName: p!.first_name,
              lastName: p!.last_name,
            })),
        }));

        // 5. Group data by date for rendering
        const grouped = processedData.reduce((acc, schedule) => {
          const dateKey = format(new Date(schedule.startTime), 'yyyy-MM-dd');
          if (!acc[dateKey]) {
            acc[dateKey] = [];
          }
          acc[dateKey].push(schedule);
          return acc;
        }, {} as Record<string, ProcessedSchedule[]>);

        setGroupedSchedules(grouped);

      } catch (error: any) {
        console.error("Error fetching booking data:", error);
        toast({
          title: "Error",
          description: "Could not load booking data.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchBookingData();
  }, [toast, weekStart, weekEnd]);

  const goToPreviousWeek = () => setCurrentDate(addDays(currentDate, -7));
  const goToNextWeek = () => setCurrentDate(addDays(currentDate, 7));
  const goToToday = () => setCurrentDate(new Date());

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <CardTitle>Booking Dashboard</CardTitle>
            <CardDescription>
              {`Viewing bookings from ${format(weekStart, "d MMM")} to ${format(weekEnd, "d MMM, yyyy")}`}
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={goToPreviousWeek}>
              <ChevronLeft className="h-4 w-4 mr-1" />
              Previous
            </Button>
            <Button variant="outline" size="sm" onClick={goToToday}>
              Today
            </Button>
            <Button variant="outline" size="sm" onClick={goToNextWeek}>
              Next
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p>Loading data...</p>
        ) : Object.keys(groupedSchedules).length === 0 ? (
          <p>No classes scheduled for this week.</p>
        ) : (
          <div className="space-y-6">
            {Object.keys(groupedSchedules).sort().map(dateKey => (
              <div key={dateKey}>
                <h3 className="text-lg font-semibold text-gray-800 mb-3 capitalize border-b pb-2">
                  {format(new Date(dateKey + 'T00:00:00'), "EEEE, d MMMM", { locale: enGB })}
                </h3>
                <Accordion type="multiple" className="w-full space-y-2">
                  {groupedSchedules[dateKey].map(schedule => {
                    const percentage = schedule.capacity > 0 ? (schedule.bookedUsers.length / schedule.capacity) * 100 : 0;
                    return (
                      <AccordionItem value={schedule.id} key={schedule.id} className="border rounded-md overflow-hidden">
                        <AccordionTrigger 
                          style={{ backgroundColor: schedule.backgroundColor || 'inherit' }}
                          className="px-4 hover:no-underline"
                        >
                          <div className="w-full text-left">
                            <div className="flex justify-between items-center w-full mb-2">
                              <div className="flex items-center gap-4">
                                <span className="font-semibold">{schedule.className}</span>
                                <div className="flex items-center text-sm text-gray-600">
                                  <Clock className="mr-1.5 h-4 w-4" />
                                  {format(new Date(schedule.startTime), 'p', { locale: enGB })}
                                </div>
                              </div>
                              <div className="flex items-center gap-2 text-sm text-gray-600">
                                <Users className="h-4 w-4 flex-shrink-0" />
                                <span className="font-mono text-xs">
                                  ({schedule.bookedUsers.length}/{schedule.capacity})
                                </span>
                              </div>
                            </div>
                            <Progress value={percentage} className="h-2 [&>div]:bg-gradient-to-r [&>div]:from-[#ff97d9] [&>div]:to-[#650099]" />
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="px-4 pt-4">
                          {schedule.bookedUsers.length > 0 ? (
                            <ul className="list-disc pl-6 space-y-1 text-gray-700">
                              {schedule.bookedUsers.map((user, index) => (
                                <li key={index}>{user.firstName} {user.lastName}</li>
                              ))}
                            </ul>
                          ) : (
                            <p className="text-gray-500 pl-2">No one has booked this class yet.</p>
                          )}
                        </AccordionContent>
                      </AccordionItem>
                    );
                  })}
                </Accordion>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default BookingDashboard;