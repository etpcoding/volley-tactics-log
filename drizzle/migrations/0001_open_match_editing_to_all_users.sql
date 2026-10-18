CREATE OR REPLACE FUNCTION public.can_edit_document(document_key text)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT
    public.has_role(auth.uid(), 'admin')
    OR (document_key IN ('vb-match','vb-history') AND auth.uid() IS NOT NULL)
    OR (document_key = 'vb-plays' AND public.has_role(auth.uid(), 'trainer'))
$function$;