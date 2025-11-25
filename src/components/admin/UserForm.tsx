import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { UserDetails } from "@/pages/admin/Users";
import { useEffect } from "react";
import { AvatarUpload } from "../AvatarUpload";

interface UserFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (values: any, id?: string) => void;
  user: UserDetails | null;
}

const baseSchema = z.object({
  first_name: z.string().min(2, { message: "El nombre debe tener al menos 2 caracteres." }),
  last_name: z.string().min(2, { message: "El apellido debe tener al menos 2 caracteres." }),
  role: z.enum(["user", "admin", "instructor"], { required_error: "Debes seleccionar un rol." }),
  phone: z.string().optional(),
  avatar_url: z.string().url({ message: "Por favor, introduce una URL válida." }).optional().or(z.literal('')),
});

const createUserSchema = baseSchema.extend({
  email: z.string().email({ message: "Por favor, introduce un email válido." }),
  password: z.string().min(6, { message: "La contraseña debe tener al menos 6 caracteres." }),
});

const updateUserSchema = baseSchema.extend({
  password: z.string().min(6, { message: "La contraseña debe tener al menos 6 caracteres." }).optional().or(z.literal('')),
});

const UserForm = ({ isOpen, onClose, onSave, user }: UserFormProps) => {
  const isEditing = !!user;
  const formSchema = isEditing ? updateUserSchema : createUserSchema;

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
  });

  useEffect(() => {
    if (user) {
      form.reset({
        first_name: user.first_name,
        last_name: user.last_name,
        role: user.role,
        phone: user.phone || "",
        avatar_url: user.avatar_url || "",
      });
    } else {
      form.reset({
        first_name: "",
        last_name: "",
        email: "",
        password: "",
        role: "user",
        phone: "",
        avatar_url: "",
      });
    }
  }, [user, form, isEditing]);

  const onSubmit = (values: z.infer<typeof formSchema>) => {
    onSave(values, user?.id);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEditing ? "Editar Usuario" : "Crear Usuario"}</DialogTitle>
          <DialogDescription>
            {isEditing ? "Modifica los detalles del usuario." : "Completa el formulario para añadir un nuevo usuario."}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {isEditing && user && (
              <FormField
                control={form.control}
                name="avatar_url"
                render={({ field }) => (
                  <FormItem className="flex justify-center">
                    <FormControl>
                      <AvatarUpload
                        url={field.value}
                        onUpload={(url) => field.onChange(url)}
                        userId={user.id}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
            {isEditing ? (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input readOnly disabled value={user?.email || ''} />
                </FormControl>
              </FormItem>
            ) : (
              <FormField control={form.control} name="email" render={({ field }) => (
                <FormItem><FormLabel>Email</FormLabel><FormControl><Input type="email" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
            )}
            
            {isEditing ? (
              <FormField control={form.control} name="password" render={({ field }) => (
                <FormItem>
                  <FormLabel>Nueva Contraseña</FormLabel>
                  <FormControl><Input type="password" {...field} placeholder="Dejar en blanco para no cambiar" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            ) : (
              <FormField control={form.control} name="password" render={({ field }) => (
                <FormItem><FormLabel>Contraseña</FormLabel><FormControl><Input type="password" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
            )}

            <FormField control={form.control} name="first_name" render={({ field }) => (
              <FormItem><FormLabel>Nombre</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="last_name" render={({ field }) => (
              <FormItem><FormLabel>Apellido</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="phone" render={({ field }) => (
              <FormItem><FormLabel>Teléfono</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="role" render={({ field }) => (
              <FormItem><FormLabel>Rol</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={user?.role || "user"}>
                  <FormControl><SelectTrigger><SelectValue placeholder="Selecciona un rol" /></SelectTrigger></FormControl>
                  <SelectContent>
                    <SelectItem value="user">Usuario</SelectItem>
                    <SelectItem value="admin">Administrador</SelectItem>
                    <SelectItem value="instructor">Instructor</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={onClose}>Cancelar</Button>
              <Button type="submit">Guardar</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default UserForm;