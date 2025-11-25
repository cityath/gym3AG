import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Calendar, Clock, User } from "lucide-react";

interface Booking {
  id: string;
  booking_date: string;
  schedules: {
    start_time: string;
    end_time: string;
    classes: {
      name: string;
      instructor: string;
    }
  }
}

const MyBookings = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [bookingToCancel, setBookingToCancel] = useState<Booking | null>(null);
  const [cancelLoading, setCancelLoading] = useState(false);

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
              instructor
            )
          )
        `)
        .eq("user_id", user.id)
        .order("booking_date", { ascending: true });

      if (error) throw error;
      setBookings(data as Booking[] || []);
    } catch (error: any) {
      toast({ title: "Error", description: "No se pudieron cargar tus reservas.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings();
  }, [user]);

  const handleCancelBooking = async () => {
    if (!bookingToCancel) return;
    setCancelLoading(true);
    try {
      const { error } = await supabase.functions.invoke('cancel-booking', {
        body: { booking_id: bookingToCancel.id },
      });
      if (error) throw new Error("No se pudo cancelar la reserva.");
      
      toast({ title: "Éxito", description: "Reserva cancelada correctamente." });
      fetchBookings(); // Refresh the list
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setCancelLoading(false);
      setBookingToCancel(null);
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Mis Reservas</CardTitle>
          <CardDescription>Aquí puedes ver y gestionar tus próximas clases.</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p>Cargando tus reservas...</p>
          ) : bookings.length === 0 ? (
            <p className="text-gray-500">No tienes ninguna clase reservada.</p>
          ) : (
            <div className="space-y-4">
              {bookings.map((booking) => (
                <div key={booking.id} className="p-4 border rounded-lg flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div className="space-y-2">
                    <h3 className="font-semibold text-lg">{booking.schedules.classes.name}</h3>
                    <div className="flex items-center text-sm text-gray-600"><User className="mr-2 h-4 w-4" />{booking.schedules.classes.instructor}</div>
                    <div className="flex items-center text-sm text-gray-600"><Calendar className="mr-2 h-4 w-4" />{format(new Date(booking.schedules.start_time), 'PPP', { locale: es })}</div>
                    <div className="flex items-center text-sm text-gray-600"><Clock className="mr-2 h-4 w-4" />{format(new Date(booking.schedules.start_time), 'p', { locale: es })}</div>
                  </div>
                  <Button variant="outline" onClick={() => setBookingToCancel(booking)}>
                    Cancelar Reserva
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={!!bookingToCancel} onOpenChange={(open) => !open && setBookingToCancel(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Confirmas la cancelación?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Liberarás tu lugar en la clase de <strong>{bookingToCancel?.schedules.classes.name}</strong>.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>No, mantener</AlertDialogCancel>
            <AlertDialogAction onClick={handleCancelBooking} disabled={cancelLoading}>
              {cancelLoading ? "Cancelando..." : "Sí, cancelar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default MyBookings;