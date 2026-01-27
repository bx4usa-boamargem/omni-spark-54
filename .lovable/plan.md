
# Plano: Correção do Bug de Visibilidade nos Layouts de Template

## Problema Identificado

Os toggles de "Blocos Visíveis" não funcionam porque:

1. **O `LandingPageEditor` não passa `visibility` para os layouts de template**:
   - `ServiceAuthorityLayout` → não recebe visibility
   - `InstitutionalLayout` → não recebe visibility  
   - `SpecialistAuthorityLayout` → não recebe visibility

2. **Os layouts de template não têm `visibility` na interface de props**

3. **Os layouts renderizam blocos baseados apenas em existência de dados**, não em visibilidade:
   ```tsx
   // Código atual (errado):
   {services.length > 0 && <ServiceCardGrid ... />}
   
   // Deveria ser:
   {visibility.services && services.length > 0 && <ServiceCardGrid ... />}
   ```

4. **Apenas o `LandingPagePreview` respeita visibility**, mas ele só é usado como fallback quando nenhum template é selecionado.

## Solução

### 1. Atualizar Props dos Layouts de Template

Adicionar `visibility` como prop obrigatória em todos os layouts:

**ServiceAuthorityLayout.tsx**:
```typescript
interface ServiceAuthorityLayoutProps {
  pageData: any;
  primaryColor: string;
  visibility: BlockVisibility;  // ADICIONAR
  isEditing?: boolean;
  onEditBlock?: (blockType: string, data: any) => void;
}
```

**InstitutionalLayout.tsx**:
```typescript
interface InstitutionalLayoutProps {
  pageData: any;
  primaryColor: string;
  visibility: BlockVisibility;  // ADICIONAR
  isEditing?: boolean;
  onEditBlock?: (blockType: string, data: any) => void;
}
```

**SpecialistAuthorityLayout.tsx**:
```typescript
interface SpecialistAuthorityLayoutProps {
  pageData: any;
  primaryColor: string;
  visibility: BlockVisibility;  // ADICIONAR
  isEditing?: boolean;
  onEditBlock?: (blockType: string, data: any) => void;
}
```

---

### 2. Atualizar Renderização Condicional nos Layouts

Cada bloco deve verificar TANTO visibility QUANTO existência de dados:

**ServiceAuthorityLayout.tsx** - Mapeamento de blocos:
| Bloco no Layout | Key de Visibility |
|-----------------|-------------------|
| AuthorityHero | `hero` |
| CallNowStrip | (sempre visível se phone existe) |
| ServiceCardGrid | `services` |
| EmergencyCTA | `emergency_banner` |
| Authority Content | (sempre visível se content existe) |
| FAQSection | `faq` |
| FooterCTA | `cta_banner` |

```tsx
// Hero
{visibility.hero && hero && Object.keys(hero).length > 0 && (
  <AuthorityHero ... />
)}

// Services
{visibility.services && services.length > 0 && (
  <ServiceCardGrid ... />
)}

// Emergency
{visibility.emergency_banner && emergency && Object.keys(emergency).length > 0 && (
  <EmergencyCTA ... />
)}

// FAQ
{visibility.faq && pageData.faq && pageData.faq.length > 0 && (
  <FAQSection ... />
)}

// CTA Banner/Footer
{visibility.cta_banner && (brand.company_name || brand.phone) && (
  <FooterCTA ... />
)}
```

**InstitutionalLayout.tsx** - Mapeamento:
| Bloco no Layout | Key de Visibility |
|-----------------|-------------------|
| Hero | `hero` |
| About | `service_details` (ou nova key?) |
| Services Areas | `services` |
| Cases | `testimonials` |
| Team | (sem toggle atual) |
| Contact | `contact` |

**SpecialistAuthorityLayout.tsx** - Mapeamento:
| Bloco no Layout | Key de Visibility |
|-----------------|-------------------|
| Hero + Specialist | `hero` |
| About | (sem toggle atual - pode mapear) |
| Methodology | `process_steps` |
| Testimonials | `testimonials` |
| Media | (sem toggle atual) |
| CTA | `cta_banner` |

---

### 3. Atualizar o Editor para Passar Visibility

**LandingPageEditor.tsx** - Linha 614-648:

```tsx
{pageData.template === 'institutional_v1' ? (
  <InstitutionalLayout
    pageData={pageData}
    primaryColor={blog?.primary_color || "#475569"}
    visibility={visibility}  // ADICIONAR
    isEditing={true}
    onEditBlock={handleEditBlock}
  />
) : pageData.template === 'specialist_authority_v1' ? (
  <SpecialistAuthorityLayout
    pageData={pageData}
    primaryColor={blog?.primary_color || "#d97706"}
    visibility={visibility}  // ADICIONAR
    isEditing={true}
    onEditBlock={handleEditBlock}
  />
) : pageData.template === 'service_authority_v1' ? (
  <ServiceAuthorityLayout
    pageData={pageData}
    primaryColor={blog?.primary_color || "#2563eb"}
    visibility={visibility}  // ADICIONAR
    isEditing={true}
    onEditBlock={handleEditBlock}
  />
) : (
  <LandingPagePreview
    pageData={pageData}
    blogId={blog?.id || ""}
    primaryColor={blog?.primary_color}
    visibility={visibility}
    isEditing={false}
    onEditBlock={handleEditBlock}
  />
)}
```

---

## Arquivos a Modificar

| Arquivo | Ação | Mudanças |
|---------|------|----------|
| `src/components/client/landingpage/LandingPageEditor.tsx` | Modificar | Passar `visibility` para todos os layouts |
| `src/components/client/landingpage/layouts/ServiceAuthorityLayout.tsx` | Modificar | Adicionar prop `visibility` + renderização condicional |
| `src/components/client/landingpage/layouts/InstitutionalLayout.tsx` | Modificar | Adicionar prop `visibility` + renderização condicional |
| `src/components/client/landingpage/layouts/SpecialistAuthorityLayout.tsx` | Modificar | Adicionar prop `visibility` + renderização condicional |

---

## Detalhes Técnicos por Layout

### ServiceAuthorityLayout

```typescript
import { BlockVisibility } from "../types/landingPageTypes";

interface ServiceAuthorityLayoutProps {
  pageData: any;
  primaryColor: string;
  visibility: BlockVisibility;
  isEditing?: boolean;
  onEditBlock?: (blockType: string, data: any) => void;
}

export function ServiceAuthorityLayout({
  pageData,
  primaryColor,
  visibility,
  isEditing = false,
  onEditBlock,
}: ServiceAuthorityLayoutProps) {
  // ...

  return (
    <div ...>
      {/* Hero */}
      {visibility.hero && hero && Object.keys(hero).length > 0 && (
        <AuthorityHero ... />
      )}

      {/* Call Now Strip - sempre visível se phone */}
      {brand.phone && <CallNowStrip ... />}

      {/* Services */}
      {visibility.services && services.length > 0 && (
        <ServiceCardGrid ... />
      )}

      {/* Emergency */}
      {visibility.emergency_banner && emergency && Object.keys(emergency).length > 0 && (
        <EmergencyCTA ... />
      )}

      {/* FAQ */}
      {visibility.faq && pageData.faq && pageData.faq.length > 0 && (
        <FAQSection ... />
      )}

      {/* CTA/Footer */}
      {visibility.cta_banner && (brand.company_name || brand.phone) && (
        <FooterCTA ... />
      )}
    </div>
  );
}
```

### InstitutionalLayout

```typescript
import { BlockVisibility } from "../types/landingPageTypes";

interface InstitutionalLayoutProps {
  pageData: any;
  primaryColor: string;
  visibility: BlockVisibility;
  isEditing?: boolean;
  onEditBlock?: (blockType: string, data: any) => void;
}

export function InstitutionalLayout({
  pageData,
  primaryColor,
  visibility,
  isEditing = false,
  onEditBlock,
}: InstitutionalLayoutProps) {
  // ...

  return (
    <div ...>
      {/* Hero */}
      {visibility.hero && (
        <section className="...">...</section>
      )}

      {/* About (mapped to service_details visibility or always visible) */}
      {(about.mission || about.vision || about.values) && (
        <section ...>...</section>
      )}

      {/* Services Areas */}
      {visibility.services && servicesAreas.length > 0 && (
        <section ...>...</section>
      )}

      {/* Cases (mapped to testimonials) */}
      {visibility.testimonials && cases.length > 0 && (
        <section ...>...</section>
      )}

      {/* Contact */}
      {visibility.contact && (
        <section ...>...</section>
      )}
    </div>
  );
}
```

### SpecialistAuthorityLayout

```typescript
import { BlockVisibility } from "../types/landingPageTypes";

interface SpecialistAuthorityLayoutProps {
  pageData: any;
  primaryColor: string;
  visibility: BlockVisibility;
  isEditing?: boolean;
  onEditBlock?: (blockType: string, data: any) => void;
}

export function SpecialistAuthorityLayout({
  pageData,
  primaryColor,
  visibility,
  isEditing = false,
  onEditBlock,
}: SpecialistAuthorityLayoutProps) {
  // ...

  return (
    <div ...>
      {/* Hero + Specialist */}
      {visibility.hero && (
        <section ...>...</section>
      )}

      {/* About/Bio - sempre visível se dados existem */}
      {(about.bio || about.specializations) && (
        <section ...>...</section>
      )}

      {/* Methodology (mapped to process_steps) */}
      {visibility.process_steps && methodology.name && (
        <section ...>...</section>
      )}

      {/* Testimonials */}
      {visibility.testimonials && testimonials.length > 0 && (
        <section ...>...</section>
      )}

      {/* CTA */}
      {visibility.cta_banner && (
        <section ...>...</section>
      )}
    </div>
  );
}
```

---

## Comportamento Esperado Após Correção

| Ação do Usuário | Resultado |
|-----------------|-----------|
| Toggle Hero = OFF | Bloco Hero desaparece imediatamente do preview |
| Toggle Services = OFF | Grid de serviços desaparece imediatamente |
| Toggle FAQ = OFF | Seção FAQ desaparece imediatamente |
| Toggle qualquer bloco = ON | Bloco reaparece se tiver dados |

O editor será WYSIWYG verdadeiro:
- **O que está desligado não existe na visualização**
- **Mudanças de toggle refletem instantaneamente**
- **Consistência entre todos os templates**
