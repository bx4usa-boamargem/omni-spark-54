-- Corrigir função encrypt_credential
CREATE OR REPLACE FUNCTION public.encrypt_credential(plaintext TEXT, key_id UUID)
RETURNS BYTEA AS $$
DECLARE
  encryption_key TEXT;
BEGIN
  IF plaintext IS NULL OR plaintext = '' THEN
    RETURN NULL;
  END IF;
  encryption_key := encode(
    extensions.digest(key_id::text || 'omniseen_cms_key_v1', 'sha256'),
    'hex'
  );
  RETURN extensions.pgp_sym_encrypt(plaintext, encryption_key);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Corrigir função decrypt_credential
CREATE OR REPLACE FUNCTION public.decrypt_credential(ciphertext BYTEA, key_id UUID)
RETURNS TEXT AS $$
DECLARE
  encryption_key TEXT;
BEGIN
  IF ciphertext IS NULL THEN
    RETURN NULL;
  END IF;
  encryption_key := encode(
    extensions.digest(key_id::text || 'omniseen_cms_key_v1', 'sha256'),
    'hex'
  );
  RETURN extensions.pgp_sym_decrypt(ciphertext, encryption_key);
EXCEPTION WHEN OTHERS THEN
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;