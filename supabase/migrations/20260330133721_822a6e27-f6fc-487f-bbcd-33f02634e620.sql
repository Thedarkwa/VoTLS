-- Create voice part enum
CREATE TYPE public.voice_part AS ENUM ('Soprano', 'Alto', 'Tenor', 'Bass', 'Director');

-- Create members table
CREATE TABLE public.members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  part voice_part NOT NULL,
  phone TEXT,
  email TEXT,
  join_date DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create attendance table
CREATE TABLE public.attendance (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  member_id UUID NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'Present' CHECK (status IN ('Present', 'Absent')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(member_id, date)
);

-- Enable RLS
ALTER TABLE public.members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to CRUD
CREATE POLICY "Authenticated users can view members" ON public.members FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert members" ON public.members FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update members" ON public.members FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete members" ON public.members FOR DELETE TO authenticated USING (true);

CREATE POLICY "Authenticated users can view attendance" ON public.attendance FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert attendance" ON public.attendance FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update attendance" ON public.attendance FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete attendance" ON public.attendance FOR DELETE TO authenticated USING (true);

-- Timestamp trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_members_updated_at
  BEFORE UPDATE ON public.members
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();