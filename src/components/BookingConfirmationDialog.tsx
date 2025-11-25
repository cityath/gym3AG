import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface Class {
  id: string;
  name: string;
  instructor: string;
  start_time: string;
  duration: number;
}

interface BookingConfirmationDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  classData: Class | null;
  onConfirm: (scheduleId: string) => void;
  loading: boolean;
}

const BookingConfirmationDialog = ({ isOpen, onOpenChange, classData, onConfirm, loading }: BookingConfirmationDialogProps) => {
  if (!classData) return null;

  const handleConfirm = () => {
    onConfirm(classData.id);
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Confirmar Reserva</AlertDialogTitle>
          <AlertDialogDescription>
            Estás a punto de reservar tu lugar en la siguiente clase. Por favor, revisa los detalles.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="space-y-2 text-sm text-gray-700">
          <p><strong>Clase:</strong> {classData.name}</p>
          <p><strong>Instructor:</strong> {classData.instructor}</p>
          <p><strong>Fecha:</strong> {format(new Date(classData.start_time), 'PPP', { locale: es })}</p>
          <p><strong>Hora:</strong> {format(new Date(classData.start_time), 'p', { locale: es })} ({classData.duration} min)</p>
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={handleConfirm} disabled={loading}>
            {loading ? "Confirmando..." : "Confirmar Reserva"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default BookingConfirmationDialog;