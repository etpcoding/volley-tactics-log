CREATE OR REPLACE FUNCTION public.can_edit_document(document_key text)
 RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT document_key IN ('vb-match','vb-history')
    OR public.has_role(auth.uid(), 'admin')
    OR (document_key = 'vb-plays' AND public.has_role(auth.uid(), 'trainer'))
$$;
GRANT INSERT, UPDATE ON public.shared_documents TO anon;
GRANT EXECUTE ON FUNCTION public.save_document(text, jsonb, integer) TO anon;
GRANT EXECUTE ON FUNCTION public.can_edit_document(text) TO anon;
CREATE POLICY visitor_insert ON public.shared_documents FOR INSERT TO anon WITH CHECK (public.can_edit_document(key));
CREATE POLICY visitor_update ON public.shared_documents FOR UPDATE TO anon USING (public.can_edit_document(key)) WITH CHECK (public.can_edit_document(key));