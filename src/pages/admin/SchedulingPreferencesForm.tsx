import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { supabase } from "@/integrations/supabase/client";
import { showSuccess, showError } from "@/utils/toast";
import { addMinutes, format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Trash2, Pencil } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

interface Class {
  id: string;
  name: string;
}

interface SchedulingRule {
  id: string;
  day_of_week: string;
  start_time: string;
  class_id: string;
  classes: {
    name: string;
  };
}

interface GroupedRule {
  ids: string[];
  days: string[];
  start_time: string;
  class_id: string;
  classes: { name: string };
}

const ruleSchema = z.object({
  day_of_week: z.array(z.string()).nonempty({ message: "You must select at least one day." }),
  start_time: z.string().min(1, { message: "You must select a time." }),
  class_id: z.string().uuid({ message: "You must select a class." }),
});

const daysOfWeek = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const dayOrder = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const daySortFunction = (a: string, b: string) => dayOrder.indexOf(a) - dayOrder.indexOf(b);

const dayInitials: { [key: string]: string } = {
  "Monday": "M",
  "Tuesday": "T",
  "Wednesday": "W",
  "Thursday": "T",
  "Friday": "F",
  "Saturday": "S",
};

const SchedulingPreferencesForm = () => {
  const [loading, setLoading] = useState(false);
  const [classes, setClasses] = useState<Class[]>([]);
  const [groupedRules, setGroupedRules] = useState<GroupedRule[]>([]);
  const [timeSlots, setTimeSlots] = useState<string[]>([]);
  const [editingRule, setEditingRule] = useState<GroupedRule | null>(null);
  const [ruleToDelete, setRuleToDelete] = useState<GroupedRule | null>(null);

  const form = useForm<z.infer<typeof ruleSchema>>({
    resolver: zodResolver(ruleSchema),
    defaultValues: { day_of_week: [], start_time: "", class_id: "" },
  });

  const fetchFormData = async () => {
    setLoading(true);
    try {
      const [
        { data: classesData, error: classesError },
        { data: rulesData, error: rulesError },
        { data: hoursData, error: hoursError }
      ] = await Promise.all([
        supabase.from("classes").select("id, name"),
        supabase.from("scheduling_rules").select(`id, day_of_week, start_time, class_id, classes (name)`),
        supabase.from("business_hours").select("morning_open_time, morning_close_time, afternoon_open_time, afternoon_close_time")
      ]);

      if (classesError || rulesError || hoursError) throw classesError || rulesError || hoursError;

      setClasses(classesData || []);
      
      const grouped = (rulesData as SchedulingRule[] || []).reduce((acc, rule) => {
        const key = `${rule.class_id}-${rule.start_time}`;
        if (!acc[key]) {
          acc[key] = {
            ...rule,
            days: [rule.day_of_week],
            ids: [rule.id]
          };
        } else {
          acc[key].days.push(rule.day_of_week);
          acc[key].ids.push(rule.id);
        }
        return acc;
      }, {} as Record<string, any>);
      setGroupedRules(Object.values(grouped));

      if (hoursData) {
        const slots = new Set<string>();
        
        hoursData.forEach(h => {
          // Morning slots
          if (h.morning_open_time && h.morning_close_time) {
            const [startHour, startMinute] = h.morning_open_time.split(':').map(Number);
            const [endHour, endMinute] = h.morning_close_time.split(':').map(Number);
            let currentTime = new Date();
            currentTime.setHours(startHour, startMinute, 0, 0);
            let endTime = new Date();
            endTime.setHours(endHour, endMinute, 0, 0);
            while (currentTime < endTime) {
              slots.add(format(currentTime, 'HH:mm'));
              currentTime = addMinutes(currentTime, 30);
            }
          }
          // Afternoon slots
          if (h.afternoon_open_time && h.afternoon_close_time) {
            const [startHour, startMinute] = h.afternoon_open_time.split(':').map(Number);
            const [endHour, endMinute] = h.afternoon_close_time.split(':').map(Number);
            let currentTime = new Date();
            currentTime.setHours(startHour, startMinute, 0, 0);
            let endTime = new Date();
            endTime.setHours(endHour, endMinute, 0, 0);
            while (currentTime < endTime) {
              slots.add(format(currentTime, 'HH:mm'));
              currentTime = addMinutes(currentTime, 30);
            }
          }
        });

        const sortedSlots = Array.from(slots).sort();
        setTimeSlots(sortedSlots);
      }
    } catch (error) {
      showError("Could not load data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFormData();
  }, []);

  const onSubmit = async (values: z.infer<typeof ruleSchema>) => {
    if (editingRule) {
      const { error: deleteError } = await supabase.from("scheduling_rules").delete().in("id", editingRule.ids);
      if (deleteError) {
        showError("Could not update preference.");
        return;
      }
    }

    const newRules = values.day_of_week.map(day => ({
      day_of_week: day,
      start_time: values.start_time,
      class_id: values.class_id,
    }));

    const { error: insertError } = await supabase.from("scheduling_rules").insert(newRules);
    if (insertError) {
      showError("Could not save preference.");
    } else {
      showSuccess(`Preference ${editingRule ? 'updated' : 'saved'}.`);
      handleCancelEdit();
      fetchFormData();
    }
  };

  const handleDelete = async () => {
    if (!ruleToDelete) return;
    const { error } = await supabase.from("scheduling_rules").delete().in("id", ruleToDelete.ids);
    if (error) {
      showError("Could not delete preference.");
    } else {
      showSuccess("Preference deleted.");
      fetchFormData();
    }
    setRuleToDelete(null);
  };

  const handleEdit = (rule: GroupedRule) => {
    setEditingRule(rule);
    form.reset({
      day_of_week: rule.days,
      start_time: rule.start_time.substring(0, 5),
      class_id: rule.class_id,
    });
  };

  const handleCancelEdit = () => {
    setEditingRule(null);
    form.reset({ day_of_week: [], start_time: '', class_id: '' });
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>{editingRule ? "Edit Preference" : "Scheduling Preferences"}</CardTitle>
          <CardDescription>
            {editingRule ? "Modify the rule and click 'Update Rule'." : "Create rules to automatically schedule recurring classes."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col md:flex-row items-end gap-4 mb-8">
              <FormField control={form.control} name="day_of_week" render={({ field }) => (
                <FormItem className="flex-1 w-full"><FormLabel>Every</FormLabel>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <FormControl>
                        <Button variant="outline" className="w-full justify-start text-left font-normal">
                          {field.value?.length > 0 
                            ? field.value
                                .sort(daySortFunction)
                                .map(day => dayInitials[day] || day.charAt(0))
                                .join(', ') 
                            : "Select days"}
                        </Button>
                      </FormControl>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="w-56">
                      {daysOfWeek.map((day) => (
                        <DropdownMenuCheckboxItem 
                          key={day} 
                          checked={field.value?.includes(day)}
                          onCheckedChange={(checked) => {
                            return checked
                              ? field.onChange([...field.value, day])
                              : field.onChange(field.value?.filter((value) => value !== day));
                          }}
                          onSelect={(e) => e.preventDefault()}
                        >
                          {day}
                        </DropdownMenuCheckboxItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="start_time" render={({ field }) => (
                <FormItem className="flex-1 w-full"><FormLabel>at</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Time" /></SelectTrigger></FormControl><SelectContent>{timeSlots.map(time => <SelectItem key={time} value={time}>{time}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="class_id" render={({ field }) => (
                <FormItem className="flex-1 w-full"><FormLabel>class of</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Class" /></SelectTrigger></FormControl><SelectContent>{classes.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>
              )} />
              <div className="flex items-center gap-2 w-full md:w-auto">
                {editingRule && (<Button type="button" variant="outline" onClick={handleCancelEdit}>Cancel</Button>)}
                <Button type="submit">{editingRule ? "Update Rule" : "Add Rule"}</Button>
              </div>
            </form>
          </Form>

          <Separator />

          <div className="mt-8">
            <h3 className="text-lg font-medium mb-4">Current Rules</h3>
            {loading ? <p>Loading rules...</p> : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Days</TableHead>
                    <TableHead>Time</TableHead>
                    <TableHead>Class</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {groupedRules.map((rule) => (
                    <TableRow key={rule.ids.join('-')}>
                      <TableCell>{rule.days.sort(daySortFunction).join(', ')}</TableCell>
                      <TableCell>{rule.start_time.substring(0, 5)}</TableCell>
                      <TableCell>{rule.classes.name}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" onClick={() => handleEdit(rule)}><Pencil className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => setRuleToDelete(rule)}><Trash2 className="h-4 w-4 text-red-500" /></Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </CardContent>
      </Card>
      <AlertDialog open={!!ruleToDelete} onOpenChange={(open) => !open && setRuleToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>This action cannot be undone. This will delete the rule for the selected days.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default SchedulingPreferencesForm;