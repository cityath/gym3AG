import { useEffect, useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trash2 } from "lucide-react";
import { showSuccess, showError } from "@/utils/toast";
import { Package } from "@/pages/admin/Packages";

interface PackageFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveSuccess: () => void;
  pkg: Package | null;
}

const packageItemSchema = z.object({
  class_type: z.string().min(1, "Class type is required."),
  credits: z.coerce.number().int().positive("Credits must be a positive number."),
});

const formSchema = z.object({
  name: z.string().min(3, "Name must be at least 3 characters."),
  description: z.string().optional(),
  price: z.coerce.number().min(0, "Price cannot be negative."),
  is_active: z.boolean(),
  package_items: z.array(packageItemSchema).nonempty("You must add at least one class type."),
});

const PackageForm = ({ isOpen, onClose, onSaveSuccess, pkg }: PackageFormProps) => {
  const [classTypes, setClassTypes] = useState<string[]>([]);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { is_active: true, package_items: [], price: 0 },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "package_items",
  });

  useEffect(() => {
    const fetchClassTypes = async () => {
      const { data, error } = await supabase.from("classes").select("type");
      if (data) {
        const uniqueTypes = Array.from(new Set(data.map(item => item.type)));
        setClassTypes(uniqueTypes);
      }
    };
    fetchClassTypes();
  }, []);

  useEffect(() => {
    if (pkg) {
      form.reset({
        name: pkg.name,
        description: pkg.description,
        is_active: pkg.is_active,
        price: pkg.price,
        package_items: pkg.package_items.map(({ class_type, credits }) => ({ class_type, credits })),
      });
    } else {
      form.reset({ name: "", description: "", is_active: true, price: 0, package_items: [] });
    }
  }, [pkg, form]);

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      const packageData = {
        name: values.name,
        description: values.description,
        is_active: values.is_active,
        price: values.price,
      };

      if (pkg) { // Update
        const { error: pkgError } = await supabase
          .from("packages")
          .update(packageData)
          .eq("id", pkg.id);
        if (pkgError) throw pkgError;

        const { error: deleteError } = await supabase.from("package_items").delete().eq("package_id", pkg.id);
        if (deleteError) throw deleteError;

        const itemsToInsert = values.package_items.map(item => ({ ...item, package_id: pkg.id }));
        const { error: insertError } = await supabase.from("package_items").insert(itemsToInsert);
        if (insertError) throw insertError;

        showSuccess("Package updated successfully.");
      } else { // Create
        const { data, error: pkgError } = await supabase
          .from("packages")
          .insert(packageData)
          .select()
          .single();
        if (pkgError) throw pkgError;

        const itemsToInsert = values.package_items.map(item => ({ ...item, package_id: data.id }));
        const { error: insertError } = await supabase.from("package_items").insert(itemsToInsert);
        if (insertError) throw insertError;

        showSuccess("Package created successfully.");
      }
      
      // Llamar a la función de refresco en el componente padre
      onSaveSuccess();
    } catch (error: any) {
      showError(error.message);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{pkg ? "Edit Package" : "Create Package"}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField control={form.control} name="name" render={({ field }) => (<FormItem><FormLabel>Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
            <FormField control={form.control} name="description" render={({ field }) => (<FormItem><FormLabel>Description</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem>)} />
            <FormField control={form.control} name="price" render={({ field }) => (<FormItem><FormLabel>Price (€)</FormLabel><FormControl><Input type="number" step="0.01" {...field} /></FormControl><FormMessage /></FormItem>)} />
            <FormField control={form.control} name="is_active" render={({ field }) => (<FormItem className="flex items-center justify-between rounded-lg border p-3"><FormLabel>Active</FormLabel><FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl></FormItem>)} />
            
            <div>
              <h3 className="text-sm font-medium mb-2">Package Content</h3>
              <div className="space-y-2">
                {fields.map((field, index) => (
                  <div key={field.id} className="flex items-end gap-2">
                    <FormField control={form.control} name={`package_items.${index}.class_type`} render={({ field }) => (
                      <FormItem className="flex-1"><FormLabel>Class Type</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger></FormControl><SelectContent>{classTypes.map(type => <SelectItem key={type} value={type}>{type}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>
                    )} />
                    <FormField control={form.control} name={`package_items.${index}.credits`} render={({ field }) => (
                      <FormItem><FormLabel>Credits</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <Button type="button" variant="destructive" size="icon" onClick={() => remove(index)}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                ))}
              </div>
              <Button type="button" variant="outline" size="sm" className="mt-2" onClick={() => append({ class_type: "", credits: 10 })}>Add Class Type</Button>
              <FormMessage>{form.formState.errors.package_items?.message}</FormMessage>
            </div>

            <DialogFooter>
              <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
              <Button type="submit">Save</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default PackageForm;