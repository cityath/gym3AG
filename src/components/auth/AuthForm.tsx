"use client";

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import { showSuccess, showError } from "@/utils/toast";

interface AuthFormProps {
  isSignUp?: boolean;
}

const emailValidation = z.string().refine(val => /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(val), {
    message: "Please enter a valid email address (e.g., you@email.com)."
});

const signUpSchema = z.object({
  firstName: z.string().min(2, { message: "First name must be at least 2 characters long." }),
  lastName: z.string().min(2, { message: "Last name must be at least 2 characters long." }),
  email: emailValidation,
  password: z.string().min(6, { message: "Password must be at least 6 characters long." }),
});

const signInSchema = z.object({
  email: emailValidation,
  password: z.string().min(1, { message: "Password is required." }),
});

const AuthForm = ({ isSignUp = false }: AuthFormProps) => {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

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

        showSuccess("Registration successful! Please check your inbox for a confirmation email.");
        
        navigate("/login");

      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: values.email,
          password: values.password,
        });

        if (error) throw error;

        showSuccess("Sign-in successful! Welcome back.");

        navigate("/dashboard");
      }
    } catch (error: any) {
      showError(translateSupabaseError(error.message));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>{isSignUp ? "Create Account" : "Sign In"}</CardTitle>
        <CardDescription>
          {isSignUp
            ? "Sign up to access gym classes"
            : "Enter your credentials to sign in"}
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
                      <FormLabel>First Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Your first name" {...field} />
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
                      <FormLabel>Last Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Your last name" {...field} />
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
                    <Input type="email" placeholder="you@email.com" {...field} />
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
                  <FormLabel>Password</FormLabel>
                  <FormControl>
                    <Input type="password" placeholder="••••••••" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Processing..." : isSignUp ? "Sign Up" : "Sign In"}
            </Button>
          </form>
        </Form>

        <div className="mt-4 text-center text-sm">
          {isSignUp ? "Already have an account?" : "Don't have an account?"}{" "}
          <button
            type="button"
            onClick={() => navigate(isSignUp ? "/login" : "/register")}
            className="text-blue-600 hover:underline"
          >
            {isSignUp ? "Sign in" : "Sign up"}
          </button>
        </div>
      </CardContent>
    </Card>
  );
};

export default AuthForm;