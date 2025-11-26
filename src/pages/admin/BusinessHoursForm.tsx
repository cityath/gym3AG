import { useEffect, useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { supabase } from "@/integrations/supabase/client";
import { showSuccess, showError } from "@/utils/toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";

const optionalTimeFormat = z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, { message: "HH:mm format" }).optional().or(z.literal(''));

const daySchema = z.object({
  id: z.number(),
  day_of_week: z.string(),
  morning_open_time: optionalTimeFormat,
  morning_close_time: optionalTimeFormat,
  afternoon_open_time: optionalTimeFormat,
  afternoon_close_time: optionalTimeFormat,
});

const formSchema = z.object({
  schedule: z.array(daySchema),
});

const BusinessHoursForm = () => {
  const [loading, setLoading] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      schedule: [],
    },
  });

  const { fields } = useFieldArray({
    control: form.control,
    name: "schedule",
  });

  useEffect(() => {
    const fetchBusinessHours = async () => {
      const { data, error } = await supabase
        .from("business_hours")
        .select("*")
        .order("id", { ascending: true });

      if (error) {
        showError("Could not load business hours.");
      } else if (data) {
        const formattedData = data.map(day => ({
          id: day.id,
          day_of_week: day.day_of_week,
          morning_open_time: day.morning_open_time ? day.morning_open_time.substring(0, 5) : '',
          morning_close_time: day.morning_close_time ? day.morning_close_time.substring(0, 5) : '',
          afternoon_open_time: day.afternoon_open_time ? day.afternoon_open_time.substring(0, 5) : '',
          afternoon_close_time: day.afternoon_close_time ? day.afternoon_close_time.substring(0, 5) : '',
        }));
        form.reset({ schedule: formattedData });
      }
    };
    fetchBusinessHours();
  }, [form]);

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setLoading(true);
    const scheduleToSave = values.schedule.map(day => ({
      id: day.id,
      day_of_week: day.day_of_week,
      morning_open_time: day.morning_open_time ? `${day.morning_open_time}:00` : null,
      morning_close_time: day.morning_close_time ? `${day.morning_close_time}:00` : null,
      afternoon_open_time: day.afternoon_open_time ? `${day.afternoon_open_time}:00` : null,
      afternoon_close_time: day.afternoon_close_time ? `${day.afternoon_close_time}:00` : null,
    }));

    const { error } = await supabase
      .from("business_hours")
      .upsert(scheduleToSave);

    if (error) {
      showError("Could not save business hours.");
    } else {
      showSuccess("Business hours updated.");
    }
    setLoading(false);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Business Hours</CardTitle>
        <CardDescription>Define the opening and closing hours for each day, for morning and afternoon shifts.</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="hidden md:grid md:grid-cols-5 gap-4 items-center mb-2">
              <div className="md:col-span-1"></div>
              <div className="md:col-span-2 text-center font-medium text-sm text-gray-600">Morning Shift (Open / Close)</div>
              <div className="md:col-span-2 text-center font-medium text-sm text-gray-600">Afternoon Shift (Open / Close)</div>
            </div>
            <div className="space-y-4">
              {fields.map((field, index) => (
                <div key={field.id} className="grid grid-cols-1 md:grid-cols-5 gap-4 items-start">
                  <FormLabel className="font-semibold pt-2">{field.day_of_week}</FormLabel>
                  <div className="md:col-span-2 grid grid-cols-2 gap-2">
                    <FormField
                      control={form.control}
                      name={`schedule.${index}.morning_open_time`}
                      render={({ field }) => (
                        <FormItem>
                          <FormControl><Input type="time" {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name={`schedule.${index}.morning_close_time`}
                      render={({ field }) => (
                        <FormItem>
                          <FormControl><Input type="time" {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <div className="md:col-span-2 grid grid-cols-2 gap-2">
                    <FormField
                      control={form.control}
                      name={`schedule.${index}.afternoon_open_time`}
                      render={({ field }) => (
                        <FormItem>
                          <FormControl><Input type="time" {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name={`schedule.${index}.afternoon_close_time`}
                      render={({ field }) => (
                        <FormItem>
                          <FormControl><Input type="time" {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              ))}
            </div>
            <div className="flex justify-end">
              <Button type="submit" disabled={loading}>
                {loading ? "Saving..." : "Save Hours"}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
};

export default BusinessHoursForm;