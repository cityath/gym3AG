import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { User, Pencil } from 'lucide-react';

interface AvatarUploadProps {
  url: string | null | undefined;
  onUpload: (url: string) => void;
  userId?: string; // For admins editing other users
}

export const AvatarUpload = ({ url, onUpload, userId }: AvatarUploadProps) => {
  const { user: authUser } = useAuth();
  const { toast } = useToast();
  const [avatarUrl, setAvatarUrl] = useState<string | null | undefined>(url);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    setAvatarUrl(url);
  }, [url]);

  const uploadAvatar = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setUploading(true);
      const targetUserId = userId || authUser?.id;
      if (!targetUserId) throw new Error('No user logged in');
      if (!event.target.files || event.target.files.length === 0) {
        throw new Error('You must select an image to upload.');
      }

      const file = event.target.files[0];
      const fileExt = file.name.split('.').pop();
      const filePath = `${targetUserId}/${new Date().getTime()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);
      
      onUpload(publicUrl);
      setAvatarUrl(publicUrl);
      toast({ title: 'Success', description: 'Avatar updated.' });

    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="flex flex-col items-center space-y-4">
      <div className="relative">
        <Avatar className="h-24 w-24">
          <AvatarImage src={avatarUrl || undefined} alt="Avatar" />
          <AvatarFallback>
            <User className="h-12 w-12 text-gray-400" />
          </AvatarFallback>
        </Avatar>
        <label htmlFor="avatar-upload" className="absolute -bottom-2 -right-2 bg-primary text-primary-foreground rounded-full p-2 cursor-pointer hover:bg-primary/90">
          <Pencil className="h-4 w-4" />
          <input
            id="avatar-upload"
            type="file"
            className="hidden"
            onChange={uploadAvatar}
            disabled={uploading}
            accept="image/*"
          />
        </label>
      </div>
      {uploading && <p className="text-sm text-gray-500">Uploading...</p>}
    </div>
  );
};