import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { DateRange } from "react-day-picker";
import { addDays, format, getDay } from "date-fns";
import { es } from "date-fns/locale";

const dayMapping = [
  "Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"
];

const GenerateSchedule = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: new Date(),
    to: addDays(new Date(), 7),
  });

  const handleGenerate = async () => {
    if (!dateRange || !dateRange.from || !dateRange.to) {
      toast({ title: "Error", description: "Por favor, selecciona un rango de fechas.", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      // 1. Fetch rules with class duration
      const { data: rules, error: rulesError } = await supabase
        .from("scheduling_rules")
        .select("*, classes(duration)");
      if (rulesError) throw rulesError;

      // 2. Fetch existing schedules for the period to avoid duplicates
      const { data: existingSchedules, error: existingSchedulesError } = await supabase
        .from("schedules")
        .select("start_time")
        .gte("start_time", dateRange.from.toISOString())
        .lte("start_time", dateRange.to.toISOString());
      if (existingSchedulesError) throw existingSchedulesError;
      
      const existingStarts = new Set(existingSchedules.map(s => new Date(s.start_time).getTime()));

      // 3. Generate new schedule entries
      const newSchedules = [];
      let currentDate = new Date(dateRange.from);
      // Loop through each day in the selected range
      while (currentDate <= dateRange.to) {
        const dayOfWeek = dayMapping[getDay(currentDate)];
        const rulesForDay = rules.filter(rule => rule.day_of_week === dayOfWeek);

        for (const rule of rulesForDay) {
          const [hour, minute] = rule.start_time.split(':').map(Number);
          const startTime = new Date(currentDate);
          startTime.setHours(hour, minute, 0, 0);

          // Check for duplicates
          if (existingStarts.has(startTime.getTime())) {
            continue;
          }

          const duration = (rule.classes as any)?.duration || 60;
          const endTime = new Date(startTime.getTime() + duration * 60000);

          newSchedules.push({
            class_id: rule.class_id,
            start_time: startTime.toISOString(),
            end_time: endTime.toISOString(),
          });
        }
        currentDate = addDays(currentDate, 1);
      }

      if (newSchedules.length === 0) {
        toast({ title: "Información", description: "No se generaron nuevas clases. Puede que ya existan en el calendario para este período." });
        setLoading(false);
        return;
      }

      // 4. Insert new schedules
      const { error: insertError } = await supabase.from("schedules").insert(newSchedules);
      if (insertError) throw insertError;

      toast({ title: "Éxito", description: `Se han generado ${newSchedules.length} nuevas clases en el calendario.` });

    } catch (error: any) {
      toast({ title: "Error", description: "No se pudo generar la programación. " + error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Generar Programación</CardTitle>
        <CardDescription>
          Selecciona un rango de fechas para generar automáticamente la programación de clases basada en tus preferencias guardadas.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex flex-col items-center">
          <Calendar
            mode="range"
            selected={dateRange}
            onSelect={setDateRange}
            numberOfMonths={2}
            locale={es}
          />
          <div className="mt-4 text-center text-sm text-gray-600">
            {dateRange?.from ? (
              dateRange.to ? (
                <>
                  Seleccionado del {format(dateRange.from, "PPP", { locale: es })} al {format(dateRange.to, "PPP", { locale: es })}
                </>
              ) : (
                format(dateRange.from, "PPP", { locale: es })
              )
            ) : (
              <span>Por favor, selecciona un rango de fechas</span>
            )}
          </div>
        </div>
        <div className="flex justify-center">
          <Button onClick={handleGenerate} disabled={loading || !dateRange?.from || !dateRange?.to}>
            {loading ? "Generando..." : "Generar Programación"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default GenerateSchedule;