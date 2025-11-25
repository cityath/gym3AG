export const translateSupabaseError = (message: string): string => {
  if (!message) {
    return "An unexpected error occurred. Please try again.";
  }

  const lowerCaseMessage = message.toLowerCase();

  if (lowerCaseMessage.includes("invalid login credentials")) {
    return "Invalid login credentials. Please check your email and password.";
  }
  if (lowerCaseMessage.includes("user already registered")) {
    return "This email is already registered. Please try to sign in.";
  }
  if (lowerCaseMessage.includes("password should be at least 6 characters")) {
    return "Password must be at least 6 characters long.";
  }
  if (lowerCaseMessage.includes("unable to validate email address: invalid format") || lowerCaseMessage.includes("invalid email") || lowerCaseMessage.includes("invalid_email")) {
    return "The email address format is not valid.";
  }
  if (lowerCaseMessage.includes("email rate limit exceeded")) {
    return "You have tried too many times. Please wait a moment before trying again.";
  }

  // If the error is not a known one, show the original message.
  return message;
};