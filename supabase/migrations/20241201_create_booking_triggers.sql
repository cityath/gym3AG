-- Function to create notification record
CREATE OR REPLACE FUNCTION create_booking_notification()
RETURNS TRIGGER AS $$
DECLARE
  class_name TEXT;
  class_date TEXT;
  class_time TEXT;
  notification_title TEXT;
  notification_message TEXT;
  user_preferences RECORD;
  schedule_record RECORD;
BEGIN
  -- Get user's notification preferences
  SELECT * INTO user_preferences
  FROM notification_preferences
  WHERE user_id = COALESCE(NEW.user_id, OLD.user_id);

  -- Only proceed if user has booking confirmations enabled
  IF user_preferences IS NULL OR user_preferences.booking_confirmations = false THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  -- Get schedule and class details
  SELECT 
    c.name,
    TO_CHAR(s.start_time, 'DD/MM/YYYY') as date,
    TO_CHAR(s.start_time, 'HH24:MI') as time
  INTO class_name, class_date, class_time
  FROM schedules s
  JOIN classes c ON c.id = s.class_id
  WHERE s.id = COALESCE(NEW.schedule_id, OLD.schedule_id);

  -- If we couldn't find the class details, skip notification
  IF class_name IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  -- Determine notification type based on operation
  IF TG_OP = 'INSERT' THEN
    notification_title := '✅ Reserva Confirmada';
    notification_message := 'Tu reserva para ' || class_name || ' el ' || class_date || ' a las ' || class_time || ' ha sido confirmada.';
  ELSIF TG_OP = 'DELETE' THEN
    notification_title := '❌ Reserva Cancelada';
    notification_message := 'Tu reserva para ' || class_name || ' el ' || class_date || ' a las ' || class_time || ' ha sido cancelada.';
  ELSE
    RETURN COALESCE(NEW, OLD);
  END IF;

  -- Insert notification record
  INSERT INTO notifications (user_id, type, title, message)
  VALUES (
    COALESCE(NEW.user_id, OLD.user_id),
    CASE WHEN TG_OP = 'INSERT' THEN 'booking_confirmation' ELSE 'booking_cancellation' END,
    notification_title,
    notification_message
  );

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for booking insertions (confirmations)
DROP TRIGGER IF EXISTS trigger_booking_confirmation ON bookings;
CREATE TRIGGER trigger_booking_confirmation
  AFTER INSERT ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION create_booking_notification();

-- Create trigger for booking deletions (cancellations)
DROP TRIGGER IF EXISTS trigger_booking_cancellation ON bookings;
CREATE TRIGGER trigger_booking_cancellation
  AFTER DELETE ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION create_booking_notification();
