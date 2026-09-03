
DROP VIEW IF EXISTS public.leaderboard_public;

CREATE OR REPLACE FUNCTION public.get_leaderboard(_limit int DEFAULT 50)
RETURNS TABLE (user_id uuid, display_name text, total_investment numeric, total_winnings numeric, contests_played int, contests_won int, rank bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT p.id,
         coalesce(nullif(p.name,''), 'Player'),
         p.total_deposits,
         p.total_winnings,
         p.contests_played,
         p.contests_won,
         rank() OVER (ORDER BY p.total_deposits DESC, p.total_winnings DESC)
  FROM public.profiles p
  WHERE p.is_active
  ORDER BY 3 DESC, 4 DESC
  LIMIT coalesce(_limit, 50);
$$;

-- Lock down execution
REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.protect_profile_money() FROM PUBLIC, anon, authenticated;

REVOKE ALL ON FUNCTION public.confirm_deposit(numeric, text, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.join_contest(uuid, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.request_withdrawal(numeric, text, text, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.process_withdrawal(uuid, boolean, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_set_kyc(uuid, boolean) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_set_active(uuid, boolean) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_analytics() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_users() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_leaderboard(int) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.confirm_deposit(numeric, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.join_contest(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.request_withdrawal(numeric, text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.process_withdrawal(uuid, boolean, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_set_kyc(uuid, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_set_active(uuid, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_analytics() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_users() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_leaderboard(int) TO anon, authenticated;
