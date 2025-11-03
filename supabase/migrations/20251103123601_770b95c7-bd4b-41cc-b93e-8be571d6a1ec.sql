-- Fix function search_path security issue
DROP TRIGGER IF EXISTS update_reading_history_timestamp_trigger ON public.reading_history;
DROP FUNCTION IF EXISTS update_reading_history_timestamp();

CREATE OR REPLACE FUNCTION update_reading_history_timestamp()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_reading_history_timestamp_trigger
BEFORE UPDATE ON public.reading_history
FOR EACH ROW
EXECUTE FUNCTION update_reading_history_timestamp();