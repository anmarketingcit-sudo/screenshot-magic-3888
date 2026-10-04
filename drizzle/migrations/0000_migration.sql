CREATE TABLE public.categories (
  id text NOT NULL, user_id uuid NOT NULL DEFAULT auth.uid(),
  name text NOT NULL, limits jsonb NOT NULL DEFAULT '{}'::jsonb, position int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY (user_id, id));
CREATE TABLE public.transactions (
  id text NOT NULL, user_id uuid NOT NULL DEFAULT auth.uid(),
  date date NOT NULL, amount numeric NOT NULL, description text NOT NULL DEFAULT '',
  category_id text, kind text NOT NULL, bank text NOT NULL DEFAULT '', card text NOT NULL DEFAULT '',
  source text NOT NULL DEFAULT 'manual', hash text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY (user_id, id));
CREATE TABLE public.rules (
  id text NOT NULL, user_id uuid NOT NULL DEFAULT auth.uid(),
  match text NOT NULL, category_id text, kind text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY (user_id, id));
CREATE TABLE public.incomes (
  id text NOT NULL, user_id uuid NOT NULL DEFAULT auth.uid(),
  name text NOT NULL, amount numeric NOT NULL DEFAULT 0, regular boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY (user_id, id));
CREATE TABLE public.credits (
  id text NOT NULL, user_id uuid NOT NULL DEFAULT auth.uid(),
  name text NOT NULL, category_id text NOT NULL, principal_known boolean NOT NULL DEFAULT false,
  principal numeric, schedule jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY (user_id, id));
CREATE TABLE public.goals (
  id text NOT NULL, user_id uuid NOT NULL DEFAULT auth.uid(),
  name text NOT NULL, category_id text, target numeric NOT NULL DEFAULT 0,
  monthly_plan jsonb NOT NULL DEFAULT '{}'::jsonb, saved numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY (user_id, id));
CREATE TABLE public.scenarios (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY, user_id uuid NOT NULL DEFAULT auth.uid(),
  name text NOT NULL, params jsonb NOT NULL DEFAULT '{}'::jsonb, result jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now());

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['categories','transactions','rules','incomes','credits','goals','scenarios'] LOOP
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO authenticated', t);
    EXECUTE format('GRANT ALL ON public.%I TO service_role', t);
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('CREATE POLICY "own select" ON public.%I FOR SELECT TO authenticated USING (auth.uid() = user_id)', t);
    EXECUTE format('CREATE POLICY "own insert" ON public.%I FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id)', t);
    EXECUTE format('CREATE POLICY "own update" ON public.%I FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id)', t);
    EXECUTE format('CREATE POLICY "own delete" ON public.%I FOR DELETE TO authenticated USING (auth.uid() = user_id)', t);
  END LOOP;
END $$;