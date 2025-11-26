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
  first_name: z.string().min(2, { message: "First name must be at least 2 characters." }),
  last_name: z.string().min(2, { message: "Last name must be at least 2 characters." }),
  role: z.enum(["user", "admin", "instructor"], { required_error: "You must select a role." }),
  phone: z.string().optional(),
  avatar_url: z.string().url({ message: "Please enter a valid URL." }).optional().or(z.literal('')),
});

const createUserSchema = baseSchema.extend({
  email: z.string().email({ message: "Please enter a valid email." }),
  password: z.string().min(6, { message: "Password must be at least 6 characters." }),
});

const updateUserSchema = baseSchema.extend({
  password: z.string().min(6, { message: "Password must be at least 6 characters." }).optional().or(z.literal('')),
});

const UserForm = ({ isOpen, onClose, onSave, user }: UserFormProps) => {
  const isEditing = !!user;
  const formSchema = isEditing ? updateUserSchema : createUserSchema;

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
  });

  useEffect(() => {
    // Reset the form every time the dialog opens
    if (isOpen) {
      if (user) {
        // Editing mode: set values from user prop
        form.reset({
          first_name: user.first_name,
          last_name: user.last_name,
          role: user.role,
          phone: user.phone || "",
          avatar_url: user.avatar_url || "",
          password: "", // Clear password field for editing
        });
      } else {
        // Create mode: reset to default empty values
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
    }
  }, [user, isOpen, form]);

  const onSubmit = (values: z.infer<typeof formSchema>) => {
    onSave(values, user?.id);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit User" : "Create User"}</DialogTitle>
          <DialogDescription>
            {isEditing ? "Modify the user's details." : "Complete the form to add a new user."}
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
                  <FormLabel>New Password</FormLabel>
                  <FormControl><Input type="password" {...field} placeholder="Leave blank to keep current" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            ) : (
              <FormField control={form.control} name="password" render={({ field }) => (
                <FormItem><FormLabel>Password</FormLabel><FormControl><Input type="password" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
            )}

            <FormField control={form.control} name="first_name" render={({ field }) => (
              <FormItem><FormLabel>First Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="last_name" render={({ field }) => (
              <FormItem><FormLabel>Last Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="phone" render={({ field }) => (
              <FormItem><FormLabel>Phone</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="role" render={({ field }) => (
              <FormItem><FormLabel>Role</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={user?.role || "user"}>
                  <FormControl><SelectTrigger><SelectValue placeholder="Select a role" /></SelectTrigger></FormControl>
                  <SelectContent>
                    <SelectItem value="user">User</SelectItem>
                    <SelectItem value="admin">Administrator</SelectItem>
                    <SelectItem value="instructor">Instructor</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />
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

export default UserForm;