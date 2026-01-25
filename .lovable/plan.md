

# Migração: Correção das Funções de Criptografia CMS

## Objetivo

Corrigir o erro `function digest(text, unknown) does not exist` que impede o salvamento de integrações WordPress/Wix.

## Causa Raiz

As funções `encrypt_credential` e `decrypt_credential` chamam `digest()` sem qualificar o schema, mas a extensão `pgcrypto` está instalada no schema `extensions`, não em `public`.

## SQL a Executar

```sql
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
```

## Alterações

| Função | Antes | Depois |
|--------|-------|--------|
| `encrypt_credential` | `digest(...)` | `extensions.digest(...)` |
| `encrypt_credential` | `pgp_sym_encrypt(...)` | `extensions.pgp_sym_encrypt(...)` |
| `decrypt_credential` | `digest(...)` | `extensions.digest(...)` |
| `decrypt_credential` | `pgp_sym_decrypt(...)` | `extensions.pgp_sym_decrypt(...)` |

## Resultado Esperado

Após executar a migração:

1. Clicar em **"Adicionar integração"** no editor de artigo
2. Preencher credenciais WordPress/Wix
3. Clicar em **"Salvar"**
4. Credenciais salvas sem erro
5. Botão muda de **"Conectar CMS"** para **"Publicar no WordPress"**

