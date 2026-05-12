CREATE TABLE public.dues_collections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  member_id UUID NOT NULL,
  amount NUMERIC(10,2) NOT NULL,
  payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  period TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.dues_collections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view dues" ON public.dues_collections FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert dues" ON public.dues_collections FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update dues" ON public.dues_collections FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete dues" ON public.dues_collections FOR DELETE TO authenticated USING (true);

CREATE INDEX idx_dues_member ON public.dues_collections(member_id);
CREATE INDEX idx_dues_date ON public.dues_collections(payment_date);

CREATE TRIGGER update_dues_updated_at
BEFORE UPDATE ON public.dues_collections
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();