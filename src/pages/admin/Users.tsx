import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Profile } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { showSuccess, showError } from "@/utils/toast";
import { PlusCircle, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import UserForm from "@/components/admin/UserForm";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export interface UserDetails extends Profile {
  email: string;
}

const UserManagement = () => {
  const [users, setUsers] = useState<UserDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserDetails | null>(null);

  const fetchUsers = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("user_details")
      .select("*")
      .order("last_name", { ascending: true });

    if (error) {
      showError("Could not load users.");
    } else {
      setUsers(data as UserDetails[] || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleOpenDialog = (user: UserDetails | null = null) => {
    setSelectedUser(user);
    setIsDialogOpen(true);
  };

  const handleOpenAlert = (user: UserDetails) => {
    setSelectedUser(user);
    setIsAlertOpen(true);
  };

  const handleSaveUser = async (values: any, id?: string) => {
    try {
      let error;
      if (id) { // Update
        const { error: updateError } = await supabase.functions.invoke('update-user', {
          body: { user_id: id, ...values },
        });
        error = updateError;
      } else { // Create
        const { error: createError } = await supabase.functions.invoke('create-user', {
          body: values,
        });
        error = createError;
      }

      if (error) throw new Error(error.message);

      showSuccess(`User ${id ? 'updated' : 'created'} successfully.`);
      fetchUsers();
      setIsDialogOpen(false);
    } catch (error: any) {
      showError(error.message);
    }
  };

  const handleDeleteUser = async () => {
    if (!selectedUser) return;
    try {
      const { error } = await supabase.functions.invoke('delete-user', {
        body: { user_id: selectedUser.id },
      });
      if (error) throw new Error(error.message);

      showSuccess("User deleted successfully.");
      fetchUsers();
    } catch (error: any) {
      showError(error.message);
    } finally {
      setIsAlertOpen(false);
      setSelectedUser(null);
    }
  };

  const getRoleName = (role: string) => {
    switch (role) {
      case 'admin': return 'Administrator';
      case 'instructor': return 'Instructor';
      default: return 'User';
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Users</CardTitle>
              <CardDescription>Manage users and their roles in the system.</CardDescription>
            </div>
            <Button onClick={() => handleOpenDialog()}>
              <PlusCircle className="mr-2 h-4 w-4" />
              Create User
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p>Loading users...</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Avatar>
                          <AvatarImage src={user.avatar_url} alt={`${user.first_name} ${user.last_name}`} />
                          <AvatarFallback>{user.first_name?.[0]}{user.last_name?.[0]}</AvatarFallback>
                        </Avatar>
                        {user.first_name} {user.last_name}
                      </div>
                    </TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>{user.phone || '-'}</TableCell>
                    <TableCell>{getRoleName(user.role)}</TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0"><MoreHorizontal className="h-4 w-4" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleOpenDialog(user)}><Pencil className="mr-2 h-4 w-4" /> Edit</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleOpenAlert(user)} className="text-red-600"><Trash2 className="mr-2 h-4 w-4" /> Delete</DropdownMenuItem>
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

      <UserForm
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        onSave={handleSaveUser}
        user={selectedUser}
      />

      <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the user and all their associated data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteUser}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default UserManagement;