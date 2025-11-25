export const translateSupabaseError = (message: string): string => {
  if (!message) {
    return "Ocurrió un error inesperado. Por favor, inténtalo de nuevo.";
  }

  const lowerCaseMessage = message.toLowerCase();

  if (lowerCaseMessage.includes("invalid login credentials")) {
    return "Credenciales de inicio de sesión inválidas. Revisa tu email y contraseña.";
  }
  if (lowerCaseMessage.includes("user already registered")) {
    return "Este correo electrónico ya está registrado. Intenta iniciar sesión.";
  }
  if (lowerCaseMessage.includes("password should be at least 6 characters")) {
    return "La contraseña debe tener al menos 6 caracteres.";
  }
  if (lowerCaseMessage.includes("unable to validate email address: invalid format") || lowerCaseMessage.includes("invalid email") || lowerCaseMessage.includes("invalid_email")) {
    return "La dirección de correo electrónico no tiene un formato válido.";
  }
  if (lowerCaseMessage.includes("email rate limit exceeded")) {
    return "Has intentado demasiadas veces. Por favor, espera un momento antes de volver a intentarlo.";
  }

  // Si el error no es uno de los conocidos, muestra el mensaje original.
  return message;
};