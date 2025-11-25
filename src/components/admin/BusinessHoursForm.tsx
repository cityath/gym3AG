import { useEffect, useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";

const optionalTimeFormat = z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, { message: "Formato HH:mm" }).optional().or(z.literal(''));

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
  const { toast } = useToast();
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
        toast({ title: "Error", description: "No se pudo cargar el horario.", variant: "destructive" });
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
  }, [form, toast]);

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
      toast({ title: "Error", description: "No se pudo guardar el horario.", variant: "destructive" });
    } else {
      toast({ title: "Éxito", description: "Horario de trabajo actualizado." });
    }
    setLoading(false);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Horario de Trabajo</CardTitle>
        <CardDescription>Define las horas de apertura y cierre para cada día, en turno de mañana y tarde.</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="hidden md:grid md:grid-cols-5 gap-4 items-center mb-2">
              <div className="md:col-span-1"></div>
              <div className="md:col-span-2 text-center font-medium text-sm text-gray-600">Turno Mañana (Apertura / Cierre)</div>
              <div className="md:col-span-2 text-center font-medium text-sm text-gray-600">Turno Tarde (Apertura / Cierre)</div>
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
                {loading ? "Guardando..." : "Guardar Horario"}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
};

export default BusinessHoursForm;