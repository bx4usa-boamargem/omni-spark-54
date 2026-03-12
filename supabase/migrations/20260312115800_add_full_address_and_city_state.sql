-- Adicionar coluna full_address ao business_profile (campo de endereço completo)
ALTER TABLE business_profile
ADD COLUMN IF NOT EXISTS full_address TEXT;

COMMENT ON COLUMN business_profile.full_address IS 'Endereço completo do negócio (rua, número, bairro). Usado pela IA para contextualização local.';

-- Adicionar coluna city_state ao business_profile para substituir uso indevido de "country"
ALTER TABLE business_profile
ADD COLUMN IF NOT EXISTS city_state TEXT;

COMMENT ON COLUMN business_profile.city_state IS 'Cidade e estado do negócio (ex: São Paulo, SP). Usado para contextualização regional pela IA.';

-- Migrar dados existentes de country para city_state (quando country contém cidade/estado e não um país)
-- Estratégia conservadora: copia o valor de country para city_state apenas se não parecer um nome de país
UPDATE business_profile
SET city_state = country
WHERE country IS NOT NULL
  AND country != ''
  -- Se contiver vírgula ou tiver formato "Cidade, UF" ou "Cidade, Estado" provavelmente é city_state
  AND (country LIKE '%, %' OR length(country) < 30);
