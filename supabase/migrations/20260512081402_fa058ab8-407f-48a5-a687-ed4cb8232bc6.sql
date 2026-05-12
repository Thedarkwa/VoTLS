CREATE TABLE public.welfare_contributions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  member_id UUID NOT NULL,
  amount NUMERIC(10,2) NOT NULL,
  contribution_date DATE NOT NULL DEFAULT CURRENT_DATE,
  purpose TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.welfare_contributions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view welfare" ON public.welfare_contributions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert welfare" ON public.welfare_contributions FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update welfare" ON public.welfare_contributions FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete welfare" ON public.welfare_contributions FOR DELETE TO authenticated USING (true);

CREATE INDEX idx_welfare_member ON public.welfare_contributions(member_id);
CREATE INDEX idx_welfare_date ON public.welfare_contributions(contribution_date);

CREATE TRIGGER update_welfare_updated_at
BEFORE UPDATE ON public.welfare_contributions
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();