# STYLE_GUIDE.md — Guía de Participante (Electra Automotive Workshop)

Aplicable a `docs/guia-participante-draft.md`. Todos los reviewers Sonnet leen este archivo antes de editar.

## Registro lingüístico

- **Español rioplatense, tuteo informal.** Usá **vos** (no "tú", no "usted").
  - ✅ "Vas a construir", "Hacé clic", "Tenés que…"
  - ❌ "Tú vas a construir", "Haz clic", "Usted tiene que…"
- **Conjugaciones voseo:** Hacé / Andá / Tené / Mirá / Verificá / Confirmá / Dejá / Escribí / Seleccioná / Escogé / Decile / Probá / Sembrá / Reseteá.
- Tratamiento al lector siempre **vos**, no "el participante" en tercera persona dentro del cuerpo.
- Tono: **didáctico, cálido, con humor seco**. Sin jerga corporativa de Salesforce traducida al pie de la letra.

## Etiquetas de UI

- **Las etiquetas de la UI de Salesforce permanecen en inglés** y siempre van en `**negrita**`.
  - ✅ "Hacé clic en **Setup**"
  - ✅ "Andá a **Agentforce Studio** → **Agents** → **+ New Agent**"
  - ❌ "Andá a **Configuración** → **Agentes**"
- **Excepción:** términos genuinamente traducidos en la consola en español de Argentina (raros) — si dudás, dejalo en inglés.
- Botones, tabs, headers, campos, toggles → todos en inglés en negrita.
- **Mensajes de toast / confirmación** que aparecen en español en la UI sí se citan en español.

## Comandos, código, paths

- Inline code con backticks simples para: nombres de API (`ElectraAI_Auto_Concierge`), comandos shell (`sf org open`), URLs (`/lightning/n/standard-AgentforceStudio`).
- Bloques de código con triple backtick + lenguaje cuando aplica.
- Paths absolutos solo cuando son críticos; relativos cuando son obvios desde el contexto.

## Reasoning Instructions (subagent bullets)

- **REGLA DURA: cada bullet ≤ 140 caracteres.** Builder trunca silenciosamente líneas más largas.
- Verificación: cada línea de bullet bajo "Reasoning Instructions:" o equivalente en Ej 2 debe pasar `awk 'length > 140'` con cero matches.
- Si un bullet supera 140, partilo en dos bullets coordinados, no lo dejes pasar.

## Estructura de cada paso

```
### Paso N — Título corto (acción imperativa)

1-2 oraciones de contexto si hace falta.

1. Acción concreta.
2. Acción concreta.
3. Verificación / checkpoint.

> ✅ **Checkpoint:** lo que tiene que estar visible / verdadero al terminar.
```

- Numeración: `1. 2. 3.` para acciones secuenciales en un paso.
- Sub-acciones: indentar con dos espacios + `-`.
- **Cada Ejercicio termina con una sección "Checkpoint final"** que el participante valida antes de avanzar.

## Drift y vocabulario crítico

- "Agente" (ES) ↔ "Agent" (UI) — NUNCA traducir el nombre propio del agente.
- "Tema" / "Topic" — no se usa en NEW Builder; se usa "Subagent". Si encontrás "topic" o "tema" referido a la jerarquía del agente, reemplazalo por "subagent".
- "Action" en el contexto de agentes = "acción" cuando hablás genéricamente, pero el botón se llama **Add Action** o **Actions** en la UI (negrita inglesa).
- "Flow" siempre en inglés cuando se refiere al concepto de Salesforce; "flujo" solo en lenguaje cotidiano sin connotación técnica.
- "Data Library" no se traduce. Es el nombre del feature.
- "Conversation Preview" no se traduce.
- "Permission Set", "Lightning App", "Custom Object" — todos en inglés.

## Anti-patrones a corregir on-sight

- Cualquier "tú" / "Usted" / "Ud." → "vos".
- "Has clic" / "Haz click" / "Da click" → "Hacé clic en".
- "Vas a poder" → "podés" (más natural).
- Traducciones literales de inglés Salesforce: "página de inicio" → **Home Page**; "lanzador de aplicaciones" → **App Launcher**.
- Verbo "loguear" → "ingresar" o "iniciar sesión".
- "Dar de alta" → "crear" (más simple).
- Voseo defectuoso: "podes" sin tilde → "podés"; "tenes" → "tenés"; "haces" → "hacés"; "dale" está OK.

## Validaciones automáticas que cada reviewer corre

```bash
# 1. Cero ocurrencias de tú/usted en el cuerpo (excepto citas literales de UI o quotes del agente)
grep -nE '\b(tú|usted|Ud\.)\b' <ejercicio-section>

# 2. Cero bullets > 140 caracteres bajo Reasoning Instructions
awk 'length > 140' <ejercicio-section>

# 3. Etiquetas en inglés llevan negrita
grep -nE '(Setup|Agents?|Tools|Topics?|Subagents?|Builder|Studio|Files|Library|Preview|Activate|Deploy|App Launcher)' <ejercicio-section> | grep -v '\*\*'
```
