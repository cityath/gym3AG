import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { PlusCircle, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getTypeColor, getContrastingTextColor } from "@/utils/styleUtils";
import { IconPicker } from "@/components/admin/IconPicker";
import DynamicIcon from "@/components/ui/dynamic-icon";
import { ColorPicker } from "@/components/admin/ColorPicker";

interface Class {
  id: string;
  name: string;
  type: string;
  instructor: string;
  duration: number;
  capacity: number;
  icon?: string;
  background_color?: string;
}

interface Instructor {
  id: string;
  name: string;
}

const classSchema = z.object({
  name: z.string().min(3, { message: "Name must be at least 3 characters." }),
  type: z.string().min(3, { message: "Type must be at least 3 characters." }),
  instructor: z.string().min(1, { message: "You must select an instructor." }),
  duration: z.coerce.number().int().positive({ message: "Duration must be a positive number." }),
  capacity: z.coerce.number().int().positive({ message: "Capacity must be a positive number." }),
  icon: z.string().optional(),
  background_color: z.string().optional(),
});

const ClassManagement = () => {
  const [classes, setClasses] = useState<Class[]>([]);
  const [instructors, setInstructors] = useState<Instructor[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const [selectedClass, setSelectedClass] = useState<Class | null>(null);
  const { toast } = useToast();

  const form = useForm<z.infer<typeof classSchema>>({
    resolver: zodResolver(classSchema),
    defaultValues: { name: "", type: "", instructor: "", duration: 60, capacity: 15, icon: "", background_color: "" },
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [
        { data: classesData, error: classesError },
        { data: instructorData, error: instructorError }
      ] = await Promise.all([
        supabase
          .from("classes")
          .select("id, name, type, instructor, duration, capacity, icon, background_color")
          .order("name", { ascending: true }),
        supabase
          .from("profiles")
          .select("id, first_name, last_name")
          .eq("role", "instructor")
      ]);

      if (classesError) throw classesError;
      if (instructorError) throw instructorError;

      setClasses(classesData || []);
      
      if (instructorData) {
        const formattedInstructors = instructorData
          .map(i => ({
            id: i.id,
            name: `${i.first_name || ''} ${i.last_name || ''}`.trim()
          }))
          .filter(i => i.name);
        setInstructors(formattedInstructors);
      }
    } catch (error: any) {
      toast({ title: "Error", description: "Could not load data. " + error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleOpenDialog = (cls: Class | null = null) => {
    setSelectedClass(cls);
    if (cls) {
      form.reset(cls);
    } else {
      form.reset({ name: "", type: "", instructor: "", duration: 60, capacity: 15, icon: "", background_color: "" });
    }
    setIsDialogOpen(true);
  };

  const handleOpenAlert = (cls: Class) => {
    setSelectedClass(cls);
    setIsAlertOpen(true);
  };

  const handleDelete = async () => {
    if (!selectedClass) return;
    const { error } = await supabase.from("classes").delete().eq("id", selectedClass.id);
    if (error) {
      toast({ title: "Error", description: "Could not delete class.", variant: "destructive" });
    } else {
      toast({ title: "Success", description: "Class deleted successfully." });
      fetchData();
    }
    setIsAlertOpen(false);
    setSelectedClass(null);
  };

  const onSubmit = async (values: z.infer<typeof classSchema>) => {
    if (selectedClass) { // Update
      const { error } = await supabase.from("classes").update(values).eq("id", selectedClass.id);
      if (error) {
        toast({ title: "Error", description: "Could not update class.", variant: "destructive" });
      } else {
        toast({ title: "Success", description: "Class updated successfully." });
      }
    } else { // Create
      const { error } = await supabase.from("classes").insert([values]);
      if (error) {
        toast({ title: "Error", description: "Could not create class.", variant: "destructive" });
      } else {
        toast({ title: "Success", description: "Class created successfully." });
      }
    }
    fetchData();
    setIsDialogOpen(false);
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Classes</CardTitle>
              <CardDescription>Manage class types, instructors, duration, and capacity.</CardDescription>
            </div>
            <Button onClick={() => handleOpenDialog()}>
              <PlusCircle className="mr-2 h-4 w-4" />
              Create Class
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? <p>Loading classes...</p> : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Icon</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Sport</TableHead>
                  <TableHead>Instructor</TableHead>
                  <TableHead>Duration (min)</TableHead>
                  <TableHead>Max. Capacity</TableHead>
                  <TableHead>Colour</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {classes.map((cls) => (
                  <TableRow key={cls.id} onClick={() => handleOpenDialog(cls)} className="cursor-pointer hover:bg-gray-50">
                    <TableCell>
                      {cls.icon && <DynamicIcon name={cls.icon} className="h-5 w-5" />}
                    </TableCell>
                    <TableCell className="font-medium">
                      <Badge
                        style={cls.background_color ? { 
                          backgroundColor: cls.background_color,
                          color: getContrastingTextColor(cls.background_color)
                        } : {}}
                        className={!cls.background_color ? getTypeColor(cls.type) : 'border-transparent'}
                      >
                        {cls.name}
                      </Badge>
                    </TableCell>
                    <TableCell>{cls.type}</TableCell>
                    <TableCell>{cls.instructor}</TableCell>
                    <TableCell>{cls.duration}</TableCell>
                    <TableCell>{cls.capacity}</TableCell>
                    <TableCell>
                      {cls.background_color && (
                        <div className="h-5 w-5 rounded-full border" style={{ backgroundColor: cls.background_color }} />
                      )}
                    </TableCell>
                    <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0"><MoreHorizontal className="h-4 w-4" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleOpenDialog(cls)}><Pencil className="mr-2 h-4 w-4" /> Edit</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleOpenAlert(cls)} className="text-red-600"><Trash2 className="mr-2 h-4 w-4" /> Delete</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selectedClass ? "Edit Class" : "Create Class"}</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField control={form.control} name="name" render={({ field }) => (<FormItem><FormLabel>Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
              <FormField control={form.control} name="type" render={({ field }) => (<FormItem><FormLabel>Sport</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
              <FormField
                control={form.control}
                name="instructor"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Instructor</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select an instructor" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {instructors.map((instructor) => (
                          <SelectItem key={instructor.id} value={instructor.name}>
                            {instructor.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField control={form.control} name="duration" render={({ field }) => (<FormItem><FormLabel>Duration (min)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>)} />
              <FormField control={form.control} name="capacity" render={({ field }) => (<FormItem><FormLabel>Max. Capacity</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>)} />
              <FormField control={form.control} name="icon" render={({ field }) => (<FormItem><FormLabel>Icon</FormLabel><FormControl><IconPicker value={field.value} onChange={field.onChange} /></FormControl><FormMessage /></FormItem>)} />
              <FormField control={form.control} name="background_color" render={({ field }) => (<FormItem><FormLabel>Background Colour</FormLabel><FormControl><ColorPicker value={field.value} onChange={field.onChange} /></FormControl><FormMessage /></FormItem>)} />
              <Button type="submit" className="w-full">{selectedClass ? "Save Changes" : "Create Class"}</Button>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>This action cannot be undone. This will permanently delete the class.</AlertDialogDescription>
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

export default ClassManagement;