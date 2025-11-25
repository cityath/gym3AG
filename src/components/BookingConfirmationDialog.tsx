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
import { enGB } from "date-fns/locale";

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
          <AlertDialogTitle>Confirm Booking</AlertDialogTitle>
          <AlertDialogDescription>
            You are about to book your spot in the following class. Please review the details.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="space-y-2 text-sm text-gray-700">
          <p><strong>Class:</strong> {classData.name}</p>
          <p><strong>Instructor:</strong> {classData.instructor}</p>
          <p><strong>Date:</strong> {format(new Date(classData.start_time), 'PPP', { locale: enGB })}</p>
          <p><strong>Time:</strong> {format(new Date(classData.start_time), 'p', { locale: enGB })} ({classData.duration} min)</p>
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleConfirm} disabled={loading}>
            {loading ? "Confirming..." : "Confirm Booking"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default BookingConfirmationDialog;