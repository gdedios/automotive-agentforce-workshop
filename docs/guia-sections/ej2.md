## Ejercicio 2 — Construir el agente Electra Auto Concierge (55 min)

**Objetivo:** crear el agente desde cero usando el **nuevo Agentforce Builder** (Agent Script). UI tipo IDE con un **Explorer** tree a la izquierda, un **Canvas** en el centro (con vistas **Canvas** y **Script** intercambiables) y un panel **Preview** / **Agentforce Assistant** a la derecha.

> **Sobre el Builder:** este es el Builder "nuevo" que viene con Atlas. Si en otra org te aparece la Builder vieja (los topics con forms), el concepto es el mismo pero la UI es diferente. Esta guía cubre exclusivamente el nuevo Builder.

### Paso 1 — Crear el agente vacío desde Agentforce Studio

> ⚠️ **Importante:** vamos a usar el **NUEVO Agentforce Builder** (Agent Script / IDE). NO uses la página `Setup → Einstein Copilot Agents` (esa es la vista vieja basada en Topics).

- [ ] Abrí el **App Launcher** (los 9 puntitos arriba a la izquierda) y buscá **Agentforce Studio**.
- [ ] O navegá directo a `https://<tu-org>.lightning.force.com/lightning/n/standard-AgentforceStudio?c__nav=agents`.
- [ ] Si te aparece el popup *"Try the new Field Service Setup"*, hacé clic en **Dismiss**.
- [ ] En la lista de **Agents**, hacé clic en **+ New Agent** (botón azul arriba a la derecha).
  - Apuntá al texto "New Agent", no al chevron `▾`.
- [ ] Aparece la pantalla **"What do you want your agent to do?"** con un textbox arriba.
- [ ] Debajo, *"Or, start with a template"* con cards (**Agentforce Employee Agent**, **Agentforce Service Agent**, etc.).
- [ ] **NO escribas nada en el textbox** y **NO selecciones ninguna template card**.
  - La template **Agentforce Service Agent** precarga ~10 subagents que después tendrías que borrar uno por uno.
- [ ] En la card **Agentforce Service Agent**, hacé clic en **Select** (NO en *Details*). Esto abre el wizard "Name your agent".

### Paso 2 — Nombrar el agente y asignar usuario

En el modal **Name your agent**:

- [ ] **Agent Name:** `Electra Auto Concierge`
- [ ] **Developer Name:** `ElectraAI_Auto_Concierge` (se autocompleta — verificá que sea exacto).
- [ ] En la sección **Agent's User Record**, hacé clic en **Select User** (NO en *New User*).
- [ ] En el dropdown vas a ver **un solo usuario disponible**.
  - `EinsteinServiceAgent User (agentforce_service_agent.<hash>@example.com)`. Seleccionalo.

  > **Nota:** este usuario lo trae la org por default para **Service Agents**. Es el único elegible — el admin de tu org NO sirve porque los **Service Agents** requieren un perfil específico.

- [ ] Hacé clic en **Let's Go**.

### Paso 3 — Skip Ahead: empezar con un agente vacío

El Builder te lleva al canvas con un panel central que dice:

> *"Chat with Agentforce to build your agent. Or, skip ahead if you'd rather start from an empty agent."*

A la derecha hay un asistente de IA que ofrece construir el agente automáticamente. **NO lo uses** — la salida es no determinística (cada estudiante puede recibir un agente distinto) y agrega subagents y acciones que no querés.

- [ ] Hacé clic en el botón **Skip Ahead** (en el centro del canvas).
- [ ] Si el panel del asistente te pregunta o muestra "Working...", podés cerrarlo con la **×** arriba a la derecha — no lo necesitás.

✅ **Checkpoint:** ves la pantalla del Builder con `Electra Auto Concierge — Version 1 (Draft)` en el header. En el **Explorer** (panel izquierdo) ves el árbol con **exactamente 4 subagents pre-cargados** (no son template clutter, son la "plomería" obligatoria del agente):

- **Agent Router** — ruteador raíz, decide a qué subagent mandar cada mensaje.
  - Equivalente al *topic_selector* en la nomenclatura tradicional.
- **Escalation** — handoff a humano cuando el usuario lo pide.
- **Off Topic** — desvía conversaciones fuera de alcance.
- **Ambiguous Question** — maneja prompts demasiado vagos.

A los 4 los vas a dejar como están (después en el Paso 12 personalizás **Off Topic** en español). Lo que vas a agregar son **3 subagents nuevos** propios: Descubrimiento de Vehículos, Prueba de Manejo, Estado y FAQ.

### Paso 3.5 — Setear la Description del agente

- [ ] En el canvas central (vista **Agent Definition**), encontrá el campo **Description**. Por default dice "New agent description".
- [ ] Reemplazalo por:
  - `Agente concierge de Electra Auto: descubrimiento de modelos eléctricos, agendamiento de prueba de manejo, FAQ sobre carga / garantía / mantenimiento.`
- [ ] Hacé clic en **Save** (arriba a la derecha del header del Builder).

### Paso 4 — System instructions + welcome message

Las instrucciones del sistema le dicen al modelo el tono, los límites, y la regla anti-fabricación.

- [ ] En el **Explorer**, expandí **Settings** y hacé clic en **System**.
- [ ] El panel muestra tres secciones: **Agent-Level Instructions** (arriba), **Welcome Message** (al medio), **Error Message** (abajo).
  - Completá las dos primeras.
- [ ] **Welcome Message** — pegá:

  ```
  ¡Hola! Soy el Concierge de Electra Auto. Te puedo ayudar a descubrir nuestros modelos eléctricos, agendar una prueba de manejo o resolver dudas sobre garantía y carga. ¿En qué te ayudo?
  ```

- [ ] **Agent-Level Instructions** — pegá:

  ```
  Sos el Electra Auto Concierge, el asistente de IA para clientes potenciales de Electra Argentina, una marca de vehículos eléctricos premium (ficticia, fines de demo).
  Tus usuarios son prospectos navegando el sitio público electra.com.ar — gente que está pensando en pasarse a un eléctrico y todavía no es cliente.
  Podés ayudarlos con tres cosas:
    1. Descubrimiento de Vehículos — listar el catálogo Electra y dar la ficha técnica completa de un modelo.
    2. Prueba de Manejo — agendar un turno de prueba de manejo en una concesionaria.
    3. Estado y FAQ — consultar el estado de una prueba ya agendada, y responder preguntas frecuentes sobre garantía, carga y mantenimiento (basado en la Data Library).
  Sos un asistente de IA, no un humano. Sé claro al respecto si te preguntan.
  Siempre fundamentá tus respuestas en los datos devueltos por las acciones o la búsqueda de conocimiento.
  NUNCA inventes precios, autonomías, fechas, números de turno, códigos VIN, ni detalles de garantía.
  Si la consulta sale del alcance (mantenimiento de vehículos a combustión, comparaciones con marcas competidoras, asesoramiento legal, créditos bancarios), redirigí amablemente.
  Hablá en español rioplatense, tuteo informal ("vos / tenés / querés"). Las labels de UI (catálogo, modelo, concesionaria) van en español; los códigos de modelo (ECRU, ESPT, EWGN, ETRK, ECTY) y los códigos de concesionaria (PALERMO, CORDOBA, ROSARIO) son en mayúsculas.
  ```

- [ ] Hacé clic en **Save**.

### Paso 5 — Subagent #1: Descubrimiento de Vehículos

Este subagent maneja el flujo "mostrame el catálogo" + "dame la ficha del E-Cruiser".

- [ ] En el **Explorer**, hacé clic derecho en el nodo **Subagents** → **+ New Subagent**.
- [ ] **Subagent Name:** `Descubrimiento de Vehículos`
- [ ] **Developer Name:** `Descubrimiento_de_Vehiculos`
- [ ] **Description (qué hace este subagent):** pegá:

  ```
  Ayuda al cliente potencial a descubrir el catálogo Electra y obtener la ficha técnica detallada de un modelo. Maneja preguntas tipo "qué modelos tienen", "comparame el E-Cruiser y el E-Wagon", "cuánto cuesta el E-City".
  ```

- [ ] Hacé clic en **Save**.
- [ ] Una vez creado el subagent, expandilo en el **Explorer** y hacé clic en **Reasoning Instructions**.
- [ ] Pegá las siguientes bullets (cada línea ≤140 chars — el Builder trunca silenciosamente líneas más largas):

  ```
  Listá el catálogo con {!@actions.Get_Vehicle_Catalog} cuando el usuario pida ver modelos disponibles.
  Si el usuario filtra por segmento (sedan / wagon / pickup / hatchback / coupé), pasá el filtro al action.
  Para una ficha técnica puntual, llamá a {!@actions.Get_Vehicle_Detail} con el código del modelo.
  Códigos válidos: ECRU=E-Cruiser, ESPT=E-Sport, EWGN=E-Wagon, ETRK=E-Truck, ECTY=E-City.
  Convertí nombre comercial a código antes de invocar (ej. usuario dice "E-Cruiser" → pasá ECRU).
  Si el usuario menciona un modelo NO listado, decí honestamente que ese modelo no existe en el catálogo Electra.
  Mostrá precios en pesos argentinos (ARS) con formato "$48M ARS"; nunca conviertas a USD si no te lo piden.
  No inventes specs (autonomía, 0-100, tiempo de carga).
  Si el action no devuelve datos, pedí disculpas y ofrecé otro modelo.
  Hablá en español rioplatense, tuteo informal.
  ```

### Paso 6 — Agregar acciones Get_Vehicle_Catalog y Get_Vehicle_Detail

- [ ] En el subagent **Descubrimiento de Vehículos**, hacé clic en **+ Add Action** → **From Flow**.
- [ ] Buscá `Get_Vehicle_Catalog` y seleccionalo.
- [ ] **Action Name:** `Get_Vehicle_Catalog`.
- [ ] **Description:**
  - `Listar el catálogo de modelos Electra activos, opcionalmente filtrado por segmento (Sedan, Pickup, Hatchback, etc.)`.
- [ ] El input `vehicleType` se deja "Bind to a value the agent identifies during runtime".
  - El agente extrae el segmento del prompt.
- [ ] El output `catalogText` se deja **Show in conversation** → True (queremos que el catálogo se muestre al usuario).
- [ ] Hacé clic en **Save**.

Repetí para `Get_Vehicle_Detail`:

- [ ] **+ Add Action** → **From Flow** → seleccioná `Get_Vehicle_Detail`.
- [ ] **Action Name:** `Get_Vehicle_Detail`.
- [ ] **Description:** `Devolver la ficha técnica completa de un modelo Electra específico por código.`
- [ ] Input `modelCode`: bind to runtime value, descripción `Código de 4 letras (ECRU/ESPT/EWGN/ETRK/ECTY).`
- [ ] Output `detailText`: **Show in conversation** → True.
- [ ] Hacé clic en **Save**.

### Paso 7 — Subagent #2: Prueba de Manejo

Este subagent maneja el flujo "quiero agendar una prueba de manejo".

- [ ] **+ New Subagent** → **Subagent Name:** `Prueba de Manejo`, **Developer Name:** `Prueba_de_Manejo`.
- [ ] **Description:**
  - `Ayuda al cliente potencial a agendar un turno de prueba de manejo en una concesionaria Electra. Recoge nombre, email, modelo de interés, concesionaria y fecha/hora deseada, y confirma con el usuario antes de crear el registro.`
- [ ] **Reasoning Instructions** — pegá (cada línea ≤140 chars):

  ```
  Cuando el usuario quiera agendar una prueba de manejo, recolectá los 5 datos antes de invocar.
  Datos: nombre, email, modelo, concesionaria, fecha+hora.
  Si falta alguno, preguntá UNO POR VEZ. No avances sin tenerlos los 5.
  Modelos válidos: E-Cruiser, E-Sport, E-Wagon, E-Truck, E-City. Convertí a código (ECRU/ESPT/EWGN/ETRK/ECTY).
  Concesionarias válidas: Palermo, Córdoba, Rosario. Convertí a código mayúsculas (PALERMO/CORDOBA/ROSARIO).
  Convertí expresiones tipo "mañana 10am" o "sábado a la tarde" a datetime ISO 8601.
  Patrón confirm-before-create: PRIMERO llamá a {!@actions.Schedule_Test_Drive} con confirmCreate=False (preview).
  Mostrá el preview al usuario y pedí confirmación explícita ("¿Confirmás este turno?").
  SOLO después de un "sí" claro, llamá de nuevo con confirmCreate=True (commit) y mostrá el ID de turno.
  Si el usuario dice "no" o pide cambiar algo, NO commitees; volvé a pedir el dato a corregir.
  Anti-alucinación: NUNCA inventes un email del cliente.
  Si el usuario lo escribe mal, pedí confirmación antes de usarlo.
  Hablá en español rioplatense, tuteo informal.
  ```

### Paso 8 — Agregar la acción Schedule_Test_Drive

- [ ] En el subagent **Prueba de Manejo**, **+ Add Action** → **From Flow** → seleccioná `Schedule_Test_Drive`.
- [ ] **Action Name:** `Schedule_Test_Drive`.
- [ ] **Description:**
  - `Encontrar y reservar un turno de prueba de manejo. Patrón de dos pasos: confirmCreate=False (preview) → usuario confirma → confirmCreate=True (commit).`
- [ ] Inputs (todos bind to runtime value):
  - `customerName` — `Nombre completo del cliente, ej. 'Sofía Vega'.`
  - `customerEmail` — `Email del cliente, ej. 'sofia.vega@example.com.ar'. No inventar.`
  - `modelCode` — `Código de modelo (ECRU/ESPT/EWGN/ETRK/ECTY).`
  - `dealerCode` — `Código de concesionaria (PALERMO/CORDOBA/ROSARIO).`
  - `requestedDateTime` — `Fecha y hora deseada en formato ISO 8601 (yyyy-MM-ddTHH:mm:ss).`
  - `confirmCreate` — `False en preview; True solo después de confirmación explícita del usuario.`
- [ ] Outputs:
  - `confirmationText` → **Show in conversation** = True.
  - `slotId` → **Show in conversation** = False (uso interno).
- [ ] Hacé clic en **Save**.

### Paso 9 — Subagent #3: Estado y FAQ + AQWK

Este subagent maneja DOS rutas: estado de prueba previa, y FAQ con RAG.

- [ ] **+ New Subagent** → **Subagent Name:** `Estado y FAQ`, **Developer Name:** `Estado_y_FAQ`.
- [ ] **Description:**
  - `Maneja dos tipos de consulta: (1) estado de una prueba de manejo previamente agendada (lookup por email), y (2) preguntas frecuentes sobre garantía, carga, infraestructura y mantenimiento (búsqueda RAG sobre la Data Library Electra_FAQ_Library).`
- [ ] **Reasoning Instructions** — pegá.
  - **CRÍTICO:** explícitamente nombrá la acción `{!@actions.AnswerQuestionsWithKnowledge}` 3 veces — el planner necesita saber que la herramienta existe para llamarla en el camino FAQ.

  ```
  Este subagent maneja DOS tipos de consulta — distinguilas por intención antes de actuar:
  RUTA 1 — ESTADO de prueba de manejo: SOLO cuando el usuario menciona explícitamente un turno o cita previa.
  Ejemplos: "mi prueba", "mi turno". Pedí su email y llamá a {!@actions.Get_Test_Drive_Status}.
  RUTA 2 — FAQ informativa: garantía, tiempos y costos de carga, mantenimiento programado, infraestructura pública.
  Especificaciones de modelos no cubiertas por catálogo. Usá {!@actions.AnswerQuestionsWithKnowledge} con la consulta como query.
  Reglas FAQ:
  - SIEMPRE llamá a {!@actions.AnswerQuestionsWithKnowledge} antes de responder.
  - Citá el documento fuente por nombre cuando esté disponible.
  - Ejemplo: "Según la Guía de Carga y Mantenimiento de Electra...".
  - Respondé en español rioplatense, tuteo informal.
  ANTI-ALUCINACIÓN:
  - Si {!@actions.AnswerQuestionsWithKnowledge} no devuelve contenido relevante, decirlo honestamente.
  - Sugerí contactar a una concesionaria (sin teléfono inventado).
  - NO fabriques detalles de garantía, tiempos de carga ni costos.
  - NUNCA llames a {!@actions.Get_Test_Drive_Status} con un email inventado o con la palabra "FAQ".
  ```

### Paso 10 — Agregar la acción Get_Test_Drive_Status

- [ ] En el subagent **Estado y FAQ**, **+ Add Action** → **From Flow** → seleccioná `Get_Test_Drive_Status`.
- [ ] **Action Name:** `Get_Test_Drive_Status`.
- [ ] **Description:** `Consultar el estado de una prueba de manejo previamente agendada por email del cliente.`
- [ ] Input `customerEmail`: bind to runtime value, descripción `Email del cliente con el que se agendó la prueba de manejo.`
- [ ] Output `statusText`: **Show in conversation** = True.
- [ ] Hacé clic en **Save**.

### Paso 11 — Agregar la acción AnswerQuestionsWithKnowledge

- [ ] En el subagent **Estado y FAQ**, **+ Add Action** → **Add From Library** → buscá **Answer Questions with Knowledge**.
- [ ] Seleccionalo.
- [ ] **Action Name:** `AnswerQuestionsWithKnowledge` (default).
- [ ] El input **RAG Feature Config ID** muestra un dropdown — seleccioná **`Electra_FAQ_Library`**.
- [ ] Los demás inputs (`query`, `citationsUrl`, `citationsEnabled`) los dejás bind to runtime value (default).
- [ ] Hacé clic en **Save**.

> **Nota crítica (token `@knowledge.rag_feature_config_id`):** si más adelante **Commit Version** falla con un error tipo `Invalid ragFeatureConfigIds: [@knowledge.rag_feature_config_id]`, andá a la acción **Answer Questions with Knowledge** en **Estado y FAQ**, eliminala, guardá, y volvé a agregarla seleccionando la library del dropdown. Re-Commit.

> Si más adelante intentás retrievar el `.agent` desde la org via SFDX, vas a ver que el campo `ragFeatureConfigId` aparece como un literal `ARFPC_<id>` (no como un placeholder). Esto es esperado — el Builder resuelve el token al hacer **Commit Version**. Si en cambio aparece el string literal `@knowledge.rag_feature_config_id`, el **Commit** del Builder no se completó: editá la acción, removela, guardá, y volvé a agregarla.

### Paso 12 — Personalizar el subagent Off Topic en español

Por default, **Off Topic** responde en inglés. Lo traducimos:

- [ ] En el **Explorer**, expandí **Subagents** → **Off Topic** → **Reasoning Instructions**.
- [ ] Reemplazá el contenido con:

  ```
  Tu trabajo es redirigir la conversación de manera amable y concisa.
  La consulta del usuario está fuera del alcance del Electra Auto Concierge.
  NUNCA respondas preguntas de conocimiento general (clima, política, deportes, otras marcas, mecánica de combustión).
  Solo respondé saludos generales y preguntas sobre tus capacidades.
  Capacidades: descubrimiento de vehículos, prueba de manejo, FAQ Electra.
  No reconozcas la pregunta off-topic; redirigí preguntando cómo podés ayudar con los temas que sí cubrís.
  Hablá en español rioplatense, tuteo informal.
  ```

- [ ] Hacé clic en **Save**.

### Paso 13 — Save y Commit Version

- [ ] **Save** todo (botón arriba a la derecha del header).
- [ ] Hacé clic en el botón **Commit Version** (arriba a la derecha, al lado del status `Draft`).
- [ ] Esperá ~30 segundos. El status cambia de `Draft` a `Active — Version 1`.

> **Si el Commit falla** con un error tipo `Invalid ragFeatureConfigIds: [@knowledge.rag_feature_config_id]`, andá a la acción `AnswerQuestionsWithKnowledge` en **Estado y FAQ**, eliminala, guardá, y volvé a agregarla seleccionando la library del dropdown. Re-Commit.

✅ **Checkpoint del Ejercicio 2:** el agente está activo en Version 1. En el header ves `Electra Auto Concierge — Version 1 (Active)` con un punto verde.

---

