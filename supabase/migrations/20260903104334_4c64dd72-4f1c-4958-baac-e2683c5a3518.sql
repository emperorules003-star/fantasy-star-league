
-- ROLES
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

CREATE POLICY "read own roles" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "admins manage roles" ON public.user_roles FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- PROFILES
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name text,
  phone text,
  email text,
  balance numeric(12,2) NOT NULL DEFAULT 0,
  referral_code text UNIQUE NOT NULL,
  referred_by text,
  total_deposits numeric(12,2) NOT NULL DEFAULT 0,
  total_winnings numeric(12,2) NOT NULL DEFAULT 0,
  contests_played int NOT NULL DEFAULT 0,
  contests_won int NOT NULL DEFAULT 0,
  is_kyc_verified boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read own profile" ON public.profiles FOR SELECT TO authenticated USING (id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "admins update profiles" ON public.profiles FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- users may edit only their own non-money fields
CREATE OR REPLACE FUNCTION public.protect_profile_money()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF public.has_role(auth.uid(),'admin') OR auth.uid() IS NULL THEN RETURN NEW; END IF;
  NEW.balance := OLD.balance;
  NEW.total_deposits := OLD.total_deposits;
  NEW.total_winnings := OLD.total_winnings;
  NEW.contests_played := OLD.contests_played;
  NEW.contests_won := OLD.contests_won;
  NEW.is_kyc_verified := OLD.is_kyc_verified;
  NEW.is_active := OLD.is_active;
  NEW.referral_code := OLD.referral_code;
  NEW.referred_by := OLD.referred_by;
  RETURN NEW;
END; $$;
CREATE TRIGGER protect_profile_money BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.protect_profile_money();
CREATE POLICY "update own profile" ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());

-- new user hook
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE code text; ref text;
BEGIN
  LOOP
    code := upper(substr(md5(random()::text || clock_timestamp()::text), 1, 8));
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.profiles WHERE referral_code = code);
  END LOOP;
  ref := nullif(upper(coalesce(NEW.raw_user_meta_data->>'referred_by','')), '');
  IF ref IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.profiles WHERE referral_code = ref) THEN
    ref := NULL;
  END IF;

  INSERT INTO public.profiles (id, name, phone, email, referral_code, referred_by)
  VALUES (NEW.id,
          coalesce(NEW.raw_user_meta_data->>'name', split_part(NEW.email,'@',1)),
          NEW.raw_user_meta_data->>'phone',
          NEW.email, code, ref);

  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user') ON CONFLICT DO NOTHING;
  RETURN NEW;
END; $$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- MATCHES
CREATE TABLE public.matches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team1 text NOT NULL,
  team2 text NOT NULL,
  team1_short text,
  team2_short text,
  tournament text,
  match_time timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'upcoming',
  lineups_out boolean NOT NULL DEFAULT false,
  score_team1 text,
  score_team2 text,
  commentary jsonb NOT NULL DEFAULT '[]'::jsonb,
  result text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.matches TO anon, authenticated;
GRANT ALL ON public.matches TO service_role;
ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "matches public read" ON public.matches FOR SELECT USING (true);
CREATE POLICY "admins manage matches" ON public.matches FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
GRANT INSERT, UPDATE, DELETE ON public.matches TO authenticated;

-- CONTESTS
CREATE TABLE public.contests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id uuid NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
  contest_name text NOT NULL,
  category text NOT NULL DEFAULT 'Mega',
  prize_pool numeric(12,2) NOT NULL,
  entry_fee numeric(12,2) NOT NULL,
  total_spots int NOT NULL,
  spots_filled int NOT NULL DEFAULT 0,
  max_teams_per_user int NOT NULL DEFAULT 3,
  winners_count int NOT NULL DEFAULT 5,
  is_flexible boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.contests TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.contests TO authenticated;
GRANT ALL ON public.contests TO service_role;
ALTER TABLE public.contests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "contests public read" ON public.contests FOR SELECT USING (true);
CREATE POLICY "admins manage contests" ON public.contests FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- PLAYERS
CREATE TABLE public.players (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  role text NOT NULL,
  team text NOT NULL,
  credits numeric(4,1) NOT NULL DEFAULT 8,
  runs int NOT NULL DEFAULT 0,
  wickets int NOT NULL DEFAULT 0,
  points numeric(6,1) NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.players TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.players TO authenticated;
GRANT ALL ON public.players TO service_role;
ALTER TABLE public.players ENABLE ROW LEVEL SECURITY;
CREATE POLICY "players public read" ON public.players FOR SELECT USING (true);
CREATE POLICY "admins manage players" ON public.players FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- FANTASY TEAMS
CREATE TABLE public.fantasy_teams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  match_id uuid NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
  contest_id uuid REFERENCES public.contests(id) ON DELETE SET NULL,
  team_name text NOT NULL DEFAULT 'My Team',
  players jsonb NOT NULL DEFAULT '[]'::jsonb,
  captain_id uuid,
  vice_captain_id uuid,
  total_credits_used numeric(5,1) NOT NULL DEFAULT 0,
  points numeric(8,1) NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.fantasy_teams TO authenticated;
GRANT ALL ON public.fantasy_teams TO service_role;
ALTER TABLE public.fantasy_teams ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own teams" ON public.fantasy_teams FOR ALL TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin')) WITH CHECK (user_id = auth.uid());

-- WALLET TRANSACTIONS
CREATE TABLE public.wallet_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount numeric(12,2) NOT NULL,
  type text NOT NULL,
  method text,
  transaction_id text,
  status text NOT NULL DEFAULT 'pending',
  description text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.wallet_transactions TO authenticated;
GRANT ALL ON public.wallet_transactions TO service_role;
ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own transactions" ON public.wallet_transactions FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));

-- WITHDRAWALS
CREATE TABLE public.withdrawal_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount numeric(12,2) NOT NULL,
  bank_account text NOT NULL,
  ifsc_code text NOT NULL,
  account_holder text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  admin_note text,
  processed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.withdrawal_requests TO authenticated;
GRANT ALL ON public.withdrawal_requests TO service_role;
ALTER TABLE public.withdrawal_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own withdrawals" ON public.withdrawal_requests FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));

-- KYC
CREATE TABLE public.kyc_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  document_type text NOT NULL,
  document_number text,
  document_url text,
  status text NOT NULL DEFAULT 'pending',
  verified_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.kyc_documents TO authenticated;
GRANT UPDATE, DELETE ON public.kyc_documents TO authenticated;
GRANT ALL ON public.kyc_documents TO service_role;
ALTER TABLE public.kyc_documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own kyc read" ON public.kyc_documents FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "own kyc insert" ON public.kyc_documents FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "admin kyc update" ON public.kyc_documents FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- REFERRALS
CREATE TABLE public.referrals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  referred_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  referred_name text,
  bonus_amount numeric(10,2) NOT NULL DEFAULT 100,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (referred_user_id)
);
GRANT SELECT ON public.referrals TO authenticated;
GRANT ALL ON public.referrals TO service_role;
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own referrals" ON public.referrals FOR SELECT TO authenticated USING (referrer_id = auth.uid() OR public.has_role(auth.uid(),'admin'));

-- NOTIFICATIONS
CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  body text,
  kind text NOT NULL DEFAULT 'info',
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, UPDATE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own notifications" ON public.notifications FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "own notifications update" ON public.notifications FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- CONTEST ENTRIES
CREATE TABLE public.contest_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contest_id uuid NOT NULL REFERENCES public.contests(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  team_id uuid NOT NULL REFERENCES public.fantasy_teams(id) ON DELETE CASCADE,
  entry_fee numeric(12,2) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (contest_id, team_id)
);
GRANT SELECT ON public.contest_entries TO authenticated;
GRANT ALL ON public.contest_entries TO service_role;
ALTER TABLE public.contest_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own entries" ON public.contest_entries FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));

-- LEADERBOARD VIEW (public, display names + totals only)
CREATE VIEW public.leaderboard_public
WITH (security_invoker = off) AS
SELECT p.id AS user_id,
       coalesce(p.name, 'Player') AS display_name,
       p.total_deposits AS total_investment,
       p.total_winnings,
       p.contests_played,
       p.contests_won,
       rank() OVER (ORDER BY p.total_deposits DESC, p.total_winnings DESC) AS rank
FROM public.profiles p
WHERE p.is_active;
GRANT SELECT ON public.leaderboard_public TO anon, authenticated;

-- MONEY OPERATIONS ------------------------------------------------------
CREATE OR REPLACE FUNCTION public.confirm_deposit(_amount numeric, _method text, _gateway_ref text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE uid uuid := auth.uid(); tx uuid; ref_code text; referrer uuid;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF _amount IS NULL OR _amount <= 0 OR _amount > 100000 THEN RAISE EXCEPTION 'Invalid amount'; END IF;

  INSERT INTO public.wallet_transactions (user_id, amount, type, method, transaction_id, status, description)
  VALUES (uid, _amount, 'deposit', _method, _gateway_ref, 'completed', 'Wallet top-up')
  RETURNING id INTO tx;

  UPDATE public.profiles
     SET balance = balance + _amount, total_deposits = total_deposits + _amount
   WHERE id = uid;

  INSERT INTO public.notifications (user_id, title, body, kind)
  VALUES (uid, 'Deposit successful', '₹' || _amount || ' added to your wallet.', 'success');

  -- credit referrer once, on first deposit
  SELECT referred_by INTO ref_code FROM public.profiles WHERE id = uid;
  IF ref_code IS NOT NULL THEN
    SELECT id INTO referrer FROM public.profiles WHERE referral_code = ref_code;
    IF referrer IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.referrals WHERE referred_user_id = uid AND status = 'completed') THEN
      INSERT INTO public.referrals (referrer_id, referred_user_id, referred_name, bonus_amount, status)
      VALUES (referrer, uid, (SELECT name FROM public.profiles WHERE id = uid), 100, 'completed')
      ON CONFLICT (referred_user_id) DO UPDATE SET status = 'completed';
      UPDATE public.profiles SET balance = balance + 100 WHERE id = referrer;
      INSERT INTO public.wallet_transactions (user_id, amount, type, status, description)
      VALUES (referrer, 100, 'bonus', 'completed', 'Referral bonus');
      INSERT INTO public.notifications (user_id, title, body, kind)
      VALUES (referrer, 'Referral bonus credited', '₹100 added for a successful referral.', 'success');
    END IF;
  END IF;
  RETURN tx;
END; $$;

CREATE OR REPLACE FUNCTION public.join_contest(_contest_id uuid, _team_id uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE uid uuid := auth.uid(); c record; bal numeric; used int; entry uuid;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT * INTO c FROM public.contests WHERE id = _contest_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Contest not found'; END IF;
  IF c.status <> 'active' THEN RAISE EXCEPTION 'Contest is closed'; END IF;
  IF c.spots_filled >= c.total_spots THEN RAISE EXCEPTION 'Contest is full'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.fantasy_teams WHERE id = _team_id AND user_id = uid) THEN
    RAISE EXCEPTION 'Team not found';
  END IF;
  IF EXISTS (SELECT 1 FROM public.contest_entries WHERE contest_id = _contest_id AND team_id = _team_id) THEN
    RAISE EXCEPTION 'This team already joined the contest';
  END IF;
  SELECT count(*) INTO used FROM public.contest_entries WHERE contest_id = _contest_id AND user_id = uid;
  IF used >= c.max_teams_per_user THEN RAISE EXCEPTION 'Max teams per user reached'; END IF;

  SELECT balance INTO bal FROM public.profiles WHERE id = uid FOR UPDATE;
  IF bal < c.entry_fee THEN RAISE EXCEPTION 'Insufficient balance'; END IF;

  UPDATE public.profiles SET balance = balance - c.entry_fee, contests_played = contests_played + 1 WHERE id = uid;
  UPDATE public.contests SET spots_filled = spots_filled + 1 WHERE id = _contest_id;
  UPDATE public.fantasy_teams SET contest_id = _contest_id WHERE id = _team_id;

  INSERT INTO public.contest_entries (contest_id, user_id, team_id, entry_fee)
  VALUES (_contest_id, uid, _team_id, c.entry_fee) RETURNING id INTO entry;

  INSERT INTO public.wallet_transactions (user_id, amount, type, status, description)
  VALUES (uid, -c.entry_fee, 'contest_fee', 'completed', 'Joined ' || c.contest_name);

  INSERT INTO public.notifications (user_id, title, body, kind)
  VALUES (uid, 'Contest joined', 'You joined ' || c.contest_name || '.', 'success');
  RETURN entry;
END; $$;

CREATE OR REPLACE FUNCTION public.request_withdrawal(_amount numeric, _bank_account text, _ifsc text, _holder text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE uid uuid := auth.uid(); p record; wid uuid;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT * INTO p FROM public.profiles WHERE id = uid FOR UPDATE;
  IF NOT p.is_kyc_verified THEN RAISE EXCEPTION 'Complete KYC verification before withdrawing'; END IF;
  IF _amount IS NULL OR _amount < 200 THEN RAISE EXCEPTION 'Minimum withdrawal is ₹200'; END IF;
  IF p.balance < _amount THEN RAISE EXCEPTION 'Insufficient balance'; END IF;

  UPDATE public.profiles SET balance = balance - _amount WHERE id = uid;
  INSERT INTO public.withdrawal_requests (user_id, amount, bank_account, ifsc_code, account_holder)
  VALUES (uid, _amount, _bank_account, _ifsc, _holder) RETURNING id INTO wid;
  INSERT INTO public.wallet_transactions (user_id, amount, type, method, status, description)
  VALUES (uid, -_amount, 'withdrawal', 'Bank', 'pending', 'Withdrawal request');
  INSERT INTO public.notifications (user_id, title, body, kind)
  VALUES (uid, 'Withdrawal requested', '₹' || _amount || ' withdrawal is pending approval.', 'info');
  RETURN wid;
END; $$;

CREATE OR REPLACE FUNCTION public.process_withdrawal(_id uuid, _approve boolean, _note text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE w record;
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'Forbidden'; END IF;
  SELECT * INTO w FROM public.withdrawal_requests WHERE id = _id FOR UPDATE;
  IF w.status <> 'pending' THEN RAISE EXCEPTION 'Already processed'; END IF;
  UPDATE public.withdrawal_requests SET status = CASE WHEN _approve THEN 'approved' ELSE 'rejected' END,
         admin_note = _note, processed_at = now() WHERE id = _id;
  UPDATE public.wallet_transactions SET status = CASE WHEN _approve THEN 'completed' ELSE 'failed' END
   WHERE user_id = w.user_id AND type = 'withdrawal' AND status = 'pending' AND amount = -w.amount;
  IF NOT _approve THEN
    UPDATE public.profiles SET balance = balance + w.amount WHERE id = w.user_id;
  END IF;
  INSERT INTO public.notifications (user_id, title, body, kind)
  VALUES (w.user_id, CASE WHEN _approve THEN 'Withdrawal approved' ELSE 'Withdrawal rejected' END,
          coalesce(_note, '₹' || w.amount), CASE WHEN _approve THEN 'success' ELSE 'error' END);
END; $$;

CREATE OR REPLACE FUNCTION public.admin_set_kyc(_user_id uuid, _approved boolean)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'Forbidden'; END IF;
  UPDATE public.profiles SET is_kyc_verified = _approved WHERE id = _user_id;
  UPDATE public.kyc_documents SET status = CASE WHEN _approved THEN 'approved' ELSE 'rejected' END,
         verified_at = now() WHERE user_id = _user_id AND status = 'pending';
  INSERT INTO public.notifications (user_id, title, body, kind)
  VALUES (_user_id, CASE WHEN _approved THEN 'KYC approved' ELSE 'KYC rejected' END,
          CASE WHEN _approved THEN 'You can now withdraw winnings.' ELSE 'Please re-submit your documents.' END,
          CASE WHEN _approved THEN 'success' ELSE 'error' END);
END; $$;

CREATE OR REPLACE FUNCTION public.admin_set_active(_user_id uuid, _active boolean)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'Forbidden'; END IF;
  UPDATE public.profiles SET is_active = _active WHERE id = _user_id;
END; $$;

CREATE OR REPLACE FUNCTION public.admin_analytics()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r jsonb;
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'Forbidden'; END IF;
  SELECT jsonb_build_object(
    'total_users', (SELECT count(*) FROM public.profiles),
    'total_deposits', (SELECT coalesce(sum(total_deposits),0) FROM public.profiles),
    'total_balance', (SELECT coalesce(sum(balance),0) FROM public.profiles),
    'total_contests', (SELECT count(*) FROM public.contests),
    'total_entries', (SELECT count(*) FROM public.contest_entries),
    'entry_revenue', (SELECT coalesce(sum(entry_fee),0) FROM public.contest_entries),
    'pending_withdrawals', (SELECT count(*) FROM public.withdrawal_requests WHERE status='pending'),
    'pending_kyc', (SELECT count(*) FROM public.kyc_documents WHERE status='pending')
  ) INTO r;
  RETURN r;
END; $$;

-- admin listing helpers (bypass per-row policies safely, admin-gated)
CREATE OR REPLACE FUNCTION public.admin_users()
RETURNS SETOF public.profiles LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'Forbidden'; END IF;
  RETURN QUERY SELECT * FROM public.profiles ORDER BY created_at DESC;
END; $$;

-- SEED DATA
INSERT INTO public.matches (team1, team2, team1_short, team2_short, tournament, match_time, status, lineups_out, score_team1, score_team2) VALUES
('Mumbai Titans','Delhi Capitals','MT','DC','Indian Premier League', now() + interval '2 days', 'upcoming', false, null, null),
('Santarem Stallions','Cartaxo Tuskers','STS','CRT','ECS Portugal', now() + interval '5 hours', 'upcoming', false, null, null),
('Amadora Royals','Lisbon Warriors','AMR','LBW','ECS Portugal', now() + interval '8 hours', 'upcoming', true, null, null),
('Belfast Wolves','Edinburgh Castle Rockers','BW','ECR','European T20', now() + interval '1 day', 'upcoming', false, null, null),
('Calicut Globstars','Aries Kollam Sailors','CG','AKS','Kerala Cricket League', now() - interval '1 hour', 'live', true, '128/4 (14.2)', '—');

INSERT INTO public.contests (match_id, contest_name, category, prize_pool, entry_fee, total_spots, spots_filled, winners_count, max_teams_per_user)
SELECT m.id, x.name, x.cat, x.pool, x.fee, x.spots, x.filled, x.winners, x.maxt
FROM public.matches m
CROSS JOIN (VALUES
  ('Mega Contest','Mega',50000,2500,100,63,10,3),
  ('Special Contest','Special',30000,1690,50,29,7,2),
  ('Mini GI','Mini',400,100,20,11,3,1),
  ('Head to Head','Mini',180,100,2,1,1,1)
) AS x(name,cat,pool,fee,spots,filled,winners,maxt);

INSERT INTO public.players (name, role, team, credits, runs, wickets, points) VALUES
('Virat Kohli','BAT','India',10.0,1500,0,742),
('Rohit Sharma','BAT','India',9.5,1400,3,690),
('Shubman Gill','BAT','India',9.0,1180,0,612),
('Suryakumar Yadav','BAT','India',9.0,1120,0,598),
('Yashasvi Jaiswal','BAT','India',8.5,960,0,540),
('MS Dhoni','WK','India',8.0,1000,0,455),
('Rishabh Pant','WK','India',9.0,890,0,520),
('KL Rahul','WK','India',8.5,1010,0,505),
('Ishan Kishan','WK','India',8.0,760,0,430),
('Hardik Pandya','AR','India',8.5,800,30,610),
('Ravindra Jadeja','AR','India',9.0,740,42,655),
('Axar Patel','AR','India',8.0,520,33,505),
('Washington Sundar','AR','India',7.5,360,25,410),
('Jasprit Bumrah','BOWL','India',9.0,100,45,680),
('Mohammed Siraj','BOWL','India',8.5,60,38,585),
('Kuldeep Yadav','BOWL','India',8.5,40,41,600),
('Arshdeep Singh','BOWL','India',8.0,30,36,540),
('Yuzvendra Chahal','BOWL','India',8.0,25,39,560),
('Shreyas Iyer','BAT','India',8.5,880,0,470),
('Sanju Samson','WK','India',8.0,690,0,415),
('Shardul Thakur','AR','India',7.0,240,28,380),
('Bhuvneshwar Kumar','BOWL','India',7.5,45,31,470);
