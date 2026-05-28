## Ejercicio 4 — Desplegar el agente en Experience Cloud + MIAW (40 min)

**Objetivo:** publicar el agente en el portal público de Electra (Experience Cloud LWR) via MIAW (Messaging for In-App and Web), y probarlo end-to-end como visitante anónimo.

### Paso 1 — Verificar el sitio público

El paquete del workshop ya creó el sitio **Experience Cloud** `Electra Customer Portal` con su branding purple, hero "Tu próximo auto eléctrico te espera", tres feature tiles y footer. Vamos a verificarlo:

- [ ] **Setup → Quick Find →** `All Sites` (o **Digital Experiences → All Sites**).
- [ ] Buscá **Electra Customer Portal** en la lista. Hacé clic en la URL pública (columna derecha).
- [ ] Una nueva pestaña abre `https://<tu-org>.my.site.com/electra` con la home de Electra.

> **Nota:** el dominio `.my.site.com` cambia según tu org. Usá la URL que aparece en tu consola.

✅ **Checkpoint:** ves el hero purple "Tu próximo auto eléctrico te espera" con el botón "Hablar con ElectraAI".

### Paso 2 — Activar el Embedded Service Deployment

El **Embedded Service Deployment** (ESD) es el "container" que sirve el chat widget al sitio. Está authored como metadata pero no activado.

- [ ] **Setup → Quick Find →** `Embedded Service Deployments`.
- [ ] Hacé clic en **Embedded Service Deployments** (debajo de **Service**).
- [ ] Buscá **Electra_Customer_MIAW** en la lista. Hacé clic en el nombre.
- [ ] En la página de detalle, hacé clic en **Edit** (botón arriba).
- [ ] Activá el toggle **Embedded Service Deployment is enabled** (o equivalente — la UI puede usar el label **Active**).
- [ ] **Save**.
- [ ] De vuelta en la página de detalle, hacé clic en **Code Snippets** (botón en la barra de acciones).
- [ ] Aparece el snippet HTML con el `<script src="https://<tu-org>.my.salesforce-scrt.com/embeddedservice/v1/esw.min.js" ...>` — copialo.

### Paso 3 — Embeber el snippet en el sitio

- [ ] Volvé a **All Sites** → hacé clic en **Builder** al lado de **Electra Customer Portal**.
- [ ] El **Site Builder** abre. En la columna izquierda, buscá la sección **Settings** (icono de engranaje al fondo del menú).
- [ ] Hacé clic en **Settings** → **Advanced** → **Edit Head Markup**.
- [ ] Pegá el snippet HTML del Paso 2 al final del head.
- [ ] **Save**.
- [ ] Hacé clic en **Publish** (esquina superior derecha del **Site Builder**). Confirmá la publicación.

> **Nota técnica:** la publicación del sitio promueve los cambios del `<head>` al CDN. Tarda 1–3 minutos en propagar globalmente.

### Paso 4 — Confirmar el Network está Live

- [ ] **Setup → Quick Find →** `All Sites`.
- [ ] La columna **Status** de **Electra Customer Portal** debería estar en **Live**. Si dice **Under Construction**, hacé clic en **Workspaces** → **Administration** → **Settings** → **Activate**.

### Paso 5 — Smoke test como visitante anónimo

- [ ] Abrí el sitio en una **ventana de incógnito** (Cmd+Shift+N en Chrome). Esto te aísla del login admin.
- [ ] Pegá `https://<tu-org>.my.site.com/electra` en la URL (usá tu dominio real).
- [ ] El sitio carga con la home Electra. **Mirá la esquina inferior derecha**: debería aparecer la burbuja del chat **MIAW**.
- [ ] Hacé clic en la burbuja. Se expande el widget con el welcome message del agente: *"¡Hola! Soy el Concierge de Electra Auto..."*.
- [ ] Probá los 4 prompts canónicos del Ejercicio 3 directamente en el widget público:
  - "Quiero ver el catálogo de modelos eléctricos."
  - "Decime más sobre el E-Cruiser."
  - "Quiero agendar una prueba de manejo del E-Cruiser para el próximo sábado a las 10 AM en Buenos Aires."
  - "¿Cuál es el estado de mi prueba de manejo?" (si ya agendaste una).

### Paso 6 — Validación cruzada

Los 4 canónicos deberían funcionar **idénticos** al **Conversation Preview**, con la salvedad:

- El usuario es **guest** (anónimo), por lo cual el agente no tiene un email pre-resuelto. Si el flujo de `Schedule_Test_Drive` necesita el email, el agente lo va a pedir explícitamente.
- Los registros que se crean (Lead + Event en `Schedule_Test_Drive`) quedan owneados por el guest user del sitio. Verificá esto: en otra pestaña con tu admin, abrí la tab **Leads** de la app → el último Lead creado tiene **Owner = Site Guest User**.

✅ **Checkpoint del Ejercicio 4 (y final del workshop):** el agente **Electra Auto Concierge** está vivo en producción. Un visitante anónimo en el sitio público puede:
- Listar el catálogo Electra.
- Pedir la ficha técnica del E-Cruiser.
- Agendar una prueba de manejo (Lead + Event creados con Owner = Guest).
- Consultar el estado de una prueba previa.
- Hacer FAQ sobre garantía / carga / mantenimiento (RAG sobre los 3 PDFs).

🎉 **Workshop completo.** Acabás de poner online un agente conversacional en español, end-to-end, con RAG, flujos personalizados, y despliegue público en **Experience Cloud** + **MIAW**. Felicitaciones.

---

