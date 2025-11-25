import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { format, parse } from 'date-fns';
import { enGB } from 'date-fns/locale';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trash2 } from "lucide-react";

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
  };
}

interface ScheduleFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (values: z.infer<typeof formSchema>, id?: string) => void;
  onDelete: (id: string) => void;
  event: ScheduleEvent | null;
  slot: { start: Date, end: Date } | null;
  classes: Class[];
}

const formSchema = z.object({
  class_id: z.string().uuid({ message: "You must select a class." }),
  start_time: z.string().min(1, { message: "Start time is required." }),
  end_time: z.string().min(1, { message: "End time is required." }),
});

const ScheduleForm = ({ isOpen, onClose, onSave, onDelete, event, slot, classes }: ScheduleFormProps) => {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
  });

  const selectedDate = event?.start || slot?.start;
  const dateString = selectedDate ? format(selectedDate, 'yyyy-MM-dd') : '';

  useEffect(() => {
    if (event) {
      form.reset({
        class_id: event.resource.class_id,
        start_time: format(event.start, 'HH:mm'),
        end_time: format(event.end, 'HH:mm'),
      });
    } else if (slot) {
      const selectedClass = classes.find(c => c.id === form.getValues('class_id'));
      const duration = selectedClass?.duration || 60;
      const endTime = new Date(slot.start.getTime() + duration * 60000);
      form.reset({
        class_id: '',
        start_time: format(slot.start, 'HH:mm'),
        end_time: format(endTime, 'HH:mm'),
      });
    }
  }, [event, slot, form, classes]);

  const classId = form.watch('class_id');
  useEffect(() => {
    if (!event && slot) { // Only auto-update end time for new events
        const selectedClass = classes.find(c => c.id === classId);
        if (selectedClass) {
            const startTime = parse(form.getValues('start_time'), 'HH:mm', new Date());
            const endTime = new Date(startTime.getTime() + selectedClass.duration * 60000);
            form.setValue('end_time', format(endTime, 'HH:mm'));
        }
    }
  }, [classId, event, slot, form, classes]);


  const onSubmit = (values: z.infer<typeof formSchema>) => {
    const startDateTime = `${dateString}T${values.start_time}:00`;
    const endDateTime = `${dateString}T${values.end_time}:00`;
    
    onSave({
      class_id: values.class_id,
      start_time: new Date(startDateTime).toISOString(),
      end_time: new Date(endDateTime).toISOString(),
    }, event?.id);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{event ? "Edit Scheduled Class" : "Add Class to Schedule"}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="text-sm font-medium">
              Date: {selectedDate ? format(selectedDate, 'PPP', { locale: enGB }) : ''}
            </div>
            <FormField
              control={form.control}
              name="class_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Class</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a class" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {classes.map((c) => (
                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="start_time"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Start time</FormLabel>
                    <FormControl>
                      <Input type="time" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="end_time"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>End time</FormLabel>
                    <FormControl>
                      <Input type="time" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <DialogFooter className="sm:justify-between pt-4">
              {event ? (
                <Button type="button" variant="destructive" onClick={() => onDelete(event.id)}>
                  <Trash2 className="mr-2 h-4 w-4" /> Delete
                </Button>
              ) : <div />}
              <div className="flex gap-2">
                <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
                <Button type="submit">Save</Button>
              </div>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default ScheduleForm;