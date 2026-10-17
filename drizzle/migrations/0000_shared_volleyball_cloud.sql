CREATE TYPE public.app_role AS ENUM ('admin','trainer');
CREATE TABLE public.user_roles (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL, role public.app_role NOT NULL, UNIQUE(user_id,role));
GRANT SELECT ON public.user_roles TO authenticated; GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE FUNCTION public.has_role(_user_id uuid, _role public.app_role) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$ SELECT EXISTS(SELECT 1 FROM public.user_roles r JOIN auth.users u ON u.id=r.user_id WHERE r.user_id=_user_id AND r.role=_role AND u.email_confirmed_at IS NOT NULL AND (r.role <> 'admin' OR lower(u.email)='toni.mickenautsch@gmail.com')) $$;
REVOKE ALL ON FUNCTION public.has_role(uuid,public.app_role) FROM PUBLIC; GRANT EXECUTE ON FUNCTION public.has_role(uuid,public.app_role) TO authenticated;
CREATE POLICY own_roles ON public.user_roles FOR SELECT TO authenticated USING(user_id=auth.uid());
CREATE TABLE public.trainer_access (email text PRIMARY KEY CHECK(email=lower(email)), created_at timestamptz NOT NULL DEFAULT now());
GRANT SELECT,INSERT,DELETE ON public.trainer_access TO authenticated; GRANT ALL ON public.trainer_access TO service_role;
ALTER TABLE public.trainer_access ENABLE ROW LEVEL SECURITY;
CREATE POLICY owner_access ON public.trainer_access FOR ALL TO authenticated USING(public.has_role(auth.uid(),'admin')) WITH CHECK(public.has_role(auth.uid(),'admin'));
CREATE TABLE public.profiles (id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE, display_name text NOT NULL DEFAULT '', avatar_path text NOT NULL DEFAULT '');
GRANT SELECT,INSERT,UPDATE ON public.profiles TO authenticated; GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY own_profile ON public.profiles FOR ALL TO authenticated USING(id=auth.uid()) WITH CHECK(id=auth.uid());
CREATE FUNCTION public.sync_account() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ BEGIN
 INSERT INTO public.profiles(id,display_name) VALUES(new.id,coalesce(new.raw_user_meta_data->>'full_name','')) ON CONFLICT(id) DO NOTHING;
 DELETE FROM public.user_roles WHERE user_id=new.id;
 IF new.email_confirmed_at IS NOT NULL THEN
 IF lower(new.email)='toni.mickenautsch@gmail.com' THEN INSERT INTO public.user_roles(user_id,role) VALUES(new.id,'admin');
 ELSIF EXISTS(SELECT 1 FROM public.trainer_access WHERE email=lower(new.email)) THEN INSERT INTO public.user_roles(user_id,role) VALUES(new.id,'trainer'); END IF; END IF; RETURN new; END $$;
CREATE TRIGGER app_sync_account AFTER INSERT OR UPDATE OF email,email_confirmed_at ON auth.users FOR EACH ROW EXECUTE FUNCTION public.sync_account();
CREATE FUNCTION public.sync_trainer_access() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ BEGIN
 IF TG_OP='INSERT' THEN INSERT INTO public.user_roles(user_id,role) SELECT id,'trainer'::public.app_role FROM auth.users WHERE lower(email)=new.email AND email_confirmed_at IS NOT NULL AND lower(email)<>'toni.mickenautsch@gmail.com' ON CONFLICT DO NOTHING; RETURN new;
 ELSE DELETE FROM public.user_roles WHERE role='trainer' AND user_id IN(SELECT id FROM auth.users WHERE lower(email)=old.email); RETURN old; END IF; END $$;
CREATE TRIGGER app_trainer_access AFTER INSERT OR DELETE ON public.trainer_access FOR EACH ROW EXECUTE FUNCTION public.sync_trainer_access();
CREATE TABLE public.shared_documents (key text PRIMARY KEY CHECK(key IN('vb-club','vb-players','vb-match','vb-history','vb-plays')), value jsonb NOT NULL, version integer NOT NULL DEFAULT 1, updated_at timestamptz NOT NULL DEFAULT now());
GRANT SELECT ON public.shared_documents TO anon,authenticated; GRANT INSERT,UPDATE ON public.shared_documents TO authenticated; GRANT ALL ON public.shared_documents TO service_role;
ALTER TABLE public.shared_documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY public_read ON public.shared_documents FOR SELECT TO anon,authenticated USING(true);
CREATE FUNCTION public.can_edit_document(document_key text) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$ SELECT public.has_role(auth.uid(),'admin') OR (document_key IN('vb-match','vb-history','vb-plays') AND public.has_role(auth.uid(),'trainer')) $$;
REVOKE ALL ON FUNCTION public.can_edit_document(text) FROM PUBLIC; GRANT EXECUTE ON FUNCTION public.can_edit_document(text) TO authenticated;
CREATE POLICY authorized_insert ON public.shared_documents FOR INSERT TO authenticated WITH CHECK(public.can_edit_document(key));
CREATE POLICY authorized_update ON public.shared_documents FOR UPDATE TO authenticated USING(public.can_edit_document(key)) WITH CHECK(public.can_edit_document(key));
CREATE FUNCTION public.save_document(document_key text, document_value jsonb, expected_version integer) RETURNS integer LANGUAGE plpgsql SECURITY INVOKER SET search_path=public AS $$ DECLARE next_version integer; BEGIN
 IF NOT public.can_edit_document(document_key) THEN RAISE EXCEPTION 'Keine Schreibberechtigung'; END IF;
 IF expected_version=0 THEN INSERT INTO public.shared_documents(key,value) VALUES(document_key,document_value) RETURNING version INTO next_version;
 ELSE UPDATE public.shared_documents SET value=document_value,version=version+1,updated_at=now() WHERE key=document_key AND version=expected_version RETURNING version INTO next_version; IF next_version IS NULL THEN RAISE EXCEPTION 'Daten wurden auf einem anderen Gerät geändert. Bitte erneut versuchen.'; END IF; END IF; RETURN next_version; END $$;
REVOKE ALL ON FUNCTION public.save_document(text,jsonb,integer) FROM PUBLIC; GRANT EXECUTE ON FUNCTION public.save_document(text,jsonb,integer) TO authenticated;
ALTER PUBLICATION supabase_realtime ADD TABLE public.shared_documents;
CREATE POLICY own_avatar_read ON storage.objects FOR SELECT TO authenticated USING(bucket_id='avatars' AND (storage.foldername(name))[1]=auth.uid()::text);
CREATE POLICY own_avatar_insert ON storage.objects FOR INSERT TO authenticated WITH CHECK(bucket_id='avatars' AND (storage.foldername(name))[1]=auth.uid()::text);
CREATE POLICY own_avatar_update ON storage.objects FOR UPDATE TO authenticated USING(bucket_id='avatars' AND (storage.foldername(name))[1]=auth.uid()::text) WITH CHECK(bucket_id='avatars' AND (storage.foldername(name))[1]=auth.uid()::text);
REVOKE ALL ON FUNCTION public.sync_account() FROM PUBLIC; REVOKE ALL ON FUNCTION public.sync_trainer_access() FROM PUBLIC;