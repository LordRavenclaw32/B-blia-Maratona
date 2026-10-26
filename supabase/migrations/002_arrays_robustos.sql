-- Aceita listas (versículos, temporadas) enviadas em qualquer formato sem erro.
create or replace function _text_array(j jsonb) returns text[] language sql immutable set search_path = public as $$
  select case when jsonb_typeof(j) = 'array' then coalesce((select array_agg(left(v, 40)) from jsonb_array_elements_text(j) v), '{}') else '{}'::text[] end
$$;
-- save_content e save_series passaram a usar _text_array / jsonb_typeof (ver histórico do projeto no Supabase).
