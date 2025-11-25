"use client";

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { translateSupabaseError } from "@/utils/errors";

interface AuthFormProps {
  isSignUp?: boolean;
}

const emailValidation = z.string().refine(val => /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(val), {
    message: "Por favor, introduce un email con un formato válido (ej: tu@email.com)."
});

const signUpSchema = z.object({
  firstName: z.string().min(2, { message: "El nombre debe tener al menos 2 caracteres." }),
  lastName: z.string().min(2, { message: "El apellido debe tener al menos 2 caracteres." }),
  email: emailValidation,
  password: z.string().min(6, { message: "La contraseña debe tener al menos 6 caracteres." }),
});

const signInSchema = z.object({
  email: emailValidation,
  password: z.string().min(1, { message: "La contraseña es obligatoria." }),
});

const AuthForm = ({ isSignUp = false }: AuthFormProps) => {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const formSchema = isSignUp ? signUpSchema : signInSchema;

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: isSignUp
      ? { firstName: "", lastName: "", email: "", password: "" }
      : { email: "", password: "" },
  });

  const handleAuth = async (values: z.infer<typeof formSchema>) => {
    setLoading(true);

    try {
      if (isSignUp && "firstName" in values) {
        const { error } = await supabase.auth.signUp({
          email: values.email,
          password: values.password,
          options: {
            data: {
              first_name: values.firstName,
              last_name: values.lastName,
            },
          },
        });

        if (error) throw error;

        toast({
          title: "¡Registro exitoso!",
          description: "Te hemos enviado un correo de confirmación. Por favor verifica tu email.",
        });
        
        navigate("/login");

      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: values.email,
          password: values.password,
        });

        if (error) throw error;

        toast({
          title: "¡Inicio de sesión exitoso!",
          description: "Bienvenido de nuevo.",
        });

        navigate("/dashboard");
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: translateSupabaseError(error.message),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>{isSignUp ? "Crear cuenta" : "Iniciar sesión"}</CardTitle>
        <CardDescription>
          {isSignUp
            ? "Regístrate para acceder a las clases del gimnasio"
            : "Ingresa tus credenciales para acceder"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleAuth)} className="space-y-4">
            {isSignUp && (
              <>
                <FormField
                  control={form.control}
                  name="firstName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nombre</FormLabel>
                      <FormControl>
                        <Input placeholder="Tu nombre" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="lastName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Apellido</FormLabel>
                      <FormControl>
                        <Input placeholder="Tu apellido" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </>
            )}

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="tu@email.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Contraseña</FormLabel>
                  <FormControl>
                    <Input type="password" placeholder="••••••••" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Procesando..." : isSignUp ? "Registrarse" : "Iniciar sesión"}
            </Button>
          </form>
        </Form>

        <div className="mt-4 text-center text-sm">
          {isSignUp ? "¿Ya tienes cuenta?" : "¿No tienes cuenta?"}{" "}
          <button
            type="button"
            onClick={() => navigate(isSignUp ? "/login" : "/register")}
            className="text-blue-600 hover:underline"
          >
            {isSignUp ? "Inicia sesión" : "Regístrate"}
          </button>
        </div>
      </CardContent>
    </Card>
  );
};

export default AuthForm;