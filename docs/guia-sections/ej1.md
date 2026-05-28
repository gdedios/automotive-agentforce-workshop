## Ejercicio 1 — Habilitar Einstein, Agentforce y Data Library (10 min)

**Objetivo:** confirmar que Einstein y Agentforce están encendidos y crear una Data Library para que el agente pueda hacer búsquedas RAG sobre los 3 PDFs de Electra (catálogo de vehículos, garantía, carga + mantenimiento).

> **Nota crítica:** los toggles de Einstein y Agentforce **persisten** una vez encendidos. Hacelos en orden y refrescá el navegador entre cada uno — algunas orgs muestran cache vieja si saltás directo de un toggle al siguiente.

### Paso 1 — Confirmar Einstein activo

1. Abrí **Setup → Quick Find →** `Einstein Setup`.
2. Si el toggle **Turn on Einstein** está en **Off**, prendelo. Si ya está en **On**, no lo toques.
3. **Refrescá la pestaña del navegador (Cmd+R / Ctrl+R)** antes del Paso 2.

> ✅ **Checkpoint:** el toggle **Turn on Einstein** está en **On**.

### Paso 2 — Confirmar Agentforce y entrar a Agentforce Studio

1. Abrí **Setup → Quick Find →** `Agentforce`.
2. Hacé clic en **Agentforce** (debajo del árbol Einstein). Si te aparece el master toggle **Agentforce** en **Off** en el header de la página, encendelo.
3. Navegá directo a **Agentforce Studio**:
   ```
   https://<tu-org>.lightning.force.com/lightning/n/standard-AgentforceStudio?c__nav=agents
   ```
4. Si te aparece el popup *"Try the new Field Service Setup"*, hacé clic en **Dismiss** (sino intercepta los próximos clics).

> ✅ **Checkpoint:** estás en **Agentforce Studio**, ves el sidebar con **Build** y **Observe**.

> **Nota técnica:** la org viene con **Atlas**, el runtime de razonamiento más nuevo de Agentforce. Los **Service Agents** (como el que vas a construir hoy) requieren un **default agent user** que el wizard te pregunta al crear el agente — la org viene con un usuario `EinsteinServiceAgent` pre-creado.

### Paso 3 — Subir los 3 PDFs de Electra a Files

Antes de crear la **Data Library** tenés que tener los PDFs disponibles como archivos en la org. Los PDFs están alojados en GitHub:

- `Electra-Catalogo-Vehiculos-Argentina.pdf` — https://raw.githubusercontent.com/gdedios/automotive-workshop/main/Electra-Catalogo-Vehiculos-Argentina.pdf
- `Electra-Politicas-de-Garantia.pdf` — https://raw.githubusercontent.com/gdedios/automotive-workshop/main/Electra-Politicas-de-Garantia.pdf
- `Electra-Guia-Carga-y-Mantenimiento.pdf` — https://raw.githubusercontent.com/gdedios/automotive-workshop/main/Electra-Guia-Carga-y-Mantenimiento.pdf

> **Tip de Chrome:** GitHub raw sirve los PDFs con un Content-Disposition que dispara el diálogo **Save As** en lugar de abrir el PDF inline. Esto es esperado — descargá los 3 archivos a tu carpeta **Downloads**.

1. Descargá los 3 PDFs siguiendo cada link (clic derecho → **Guardar como** o aceptar el diálogo).
2. En Salesforce, abrí el **App Launcher** y buscá **Files**.
3. Hacé clic en el botón **Upload Files** (arriba a la derecha) y subí los 3 PDFs.

> ✅ **Checkpoint:** los 3 archivos aparecen en **Files → Owned by Me** con sus nombres exactos.

### Paso 4 — Crear la Data Library

1. Abrí **Setup → Quick Find →** `Agentforce Data Library`.
2. Hacé clic en **+ New Library**.
3. Completá el formulario:
   - **Name:** `Electra_FAQ_Library` (sin espacios — el ID interno no acepta espacios y un nombre con espacios genera errores en el binding del agente).
   - **Description:** `PDFs de catálogo de vehículos, políticas de garantía y guía de carga + mantenimiento de Electra.`
   - **Source:** seleccioná **Salesforce Files**.
4. Agregá los 3 PDFs que subiste:
   - `Electra-Catalogo-Vehiculos-Argentina`
   - `Electra-Politicas-de-Garantia`
   - `Electra-Guia-Carga-y-Mantenimiento`
5. **Activá** la library. La columna **Status** va a pasar de `Indexing` a `Ready` en un par de minutos.

> ✅ **Checkpoint:** la library `Electra_FAQ_Library` aparece en la lista de **Data Libraries** con **Status** = `Indexing` (en proceso).

### Paso 5 — Verificar la Data Library

1. Esperá 1–2 minutos y refrescá la página de **Agentforce Data Library**.
2. Confirmá que la library `Electra_FAQ_Library` está en estado **Ready**.
3. Hacé clic en el nombre de la library para ver el detalle. Verificá que los 3 **Sources** aparecen individualmente con sus nombres:
   - `Electra-Catalogo-Vehiculos-Argentina`
   - `Electra-Politicas-de-Garantia`
   - `Electra-Guia-Carga-y-Mantenimiento`

> **Nota técnica:** el ID interno (`ARFPC_...`) **no aparece** en la página de detalle de la library — lo vas a encontrar directamente en **Agentforce Builder** cuando configures la acción **Answer Questions with Knowledge** en el Ejercicio 2 (el campo **RAG Feature Config ID** muestra un dropdown con las libraries disponibles).

---

> ✅ **Checkpoint final del Ejercicio 1:**
> 
> - Einstein está **On** en **Setup → Einstein Setup**.
> - Agentforce está **On** en **Setup → Agentforce**.
> - La **Data Library** `Electra_FAQ_Library` está en estado **Ready**.
> - Los 3 **Sources** están indexados individualmente en la library.

---

