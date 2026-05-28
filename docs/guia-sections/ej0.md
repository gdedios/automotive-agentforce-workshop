# Agentforce para Automotive — Electra Auto Concierge Workshop

Construyendo un agente de IA conversacional que ayuda a clientes potenciales de Electra a descubrir modelos eléctricos, agendar pruebas de manejo y resolver dudas frecuentes.

**Guía de Participante — v1.0 — Mayo 2026**

---

## Tabla de Contenidos

1. [Acerca de Electra](#acerca-de-electra)
2. [Qué vas a construir](#qué-vas-a-construir)
3. [Ejercicio 0 — Preparación del entorno (10 min)](#ejercicio-0--preparación-del-entorno-10-min)
4. [Ejercicio 1 — Habilitar Einstein, Agentforce y Data Library (10 min)](#ejercicio-1--habilitar-einstein-agentforce-y-data-library-10-min)
5. [Ejercicio 2 — Construir el agente Electra Auto Concierge (55 min)](#ejercicio-2--construir-el-agente-electra-auto-concierge-55-min)
6. [Ejercicio 3 — Probar el agente en Conversation Preview (20 min)](#ejercicio-3--probar-el-agente-en-conversation-preview-20-min)
7. [Ejercicio 4 — Desplegar el agente en Experience Cloud + MIAW (40 min)](#ejercicio-4--desplegar-el-agente-en-experience-cloud--miaw-40-min)
8. [Anexo A — Prompts canónicos y adversariales](#anexo-a--prompts-canónicos-y-adversariales)
9. [Anexo B — Troubleshooting](#anexo-b--troubleshooting)
10. [Anexo C — Glosario ES ↔ EN](#anexo-c--glosario-es--en)
11. [Anexo D — Créditos y referencias](#anexo-d--créditos-y-referencias)

---

## Acerca de Electra

**Electra** es una empresa ficticia automotriz creada por Salesforce para escenarios de la industria Automotive. Es una marca de **vehículos eléctricos premium** con un modelo híbrido directo-al-consumidor + red de concesionarias, posicionada en el segmento medio-alto del mercado argentino.

A diferencia de un workshop B2B de soporte al cliente, en este workshop construís un agente **B2C de Sales** — el primer punto de contacto con un **prospecto** que está navegando el sitio público de Electra y considerando comprar su primer auto eléctrico.

**El persona principal es Sofía Vega**, diseñadora de producto de 34 años en Buenos Aires, que está pensando en pasarse a un eléctrico desde hace 18 meses. Sofía entra al sitio público de Electra, abre el chat, y quiere:

1. Comparar el catálogo de modelos Electra (autonomía, precio, segmento).
2. Pedir la ficha técnica de un modelo puntual (ej. el E-Cruiser, sedán familiar).
3. Agendar una prueba de manejo en su concesionaria más cercana (Palermo).
4. Consultar el estado de una prueba ya agendada cuando vuelva otro día.
5. Hacer preguntas frecuentes sobre garantía, carga e infraestructura.

Tu rol en este workshop es el de un **Administrador Salesforce / Pre-sales** que está construyendo un agente de IA para automatizar este primer contacto, capturar **leads** calificados, y reducir la carga del call center y de los asesores comerciales humanos.

---

## Qué vas a construir

Un agente de servicio llamado **Electra Auto Concierge**, que vive en el portal público de **Experience Cloud** de Electra y se comunica vía **Messaging for In-App and Web (MIAW)**. El agente responde en **español rioplatense (voseo informal)** sobre tres temas:

| # | **Subagent** | Acción | Tipo | Descripción |
|---|------------------|--------|------|-------------|
| 1 | **Descubrimiento_de_Vehiculos** | `Get_Vehicle_Catalog` | **Flow** | Lista los modelos activos de Electra con autonomía, precio, segmento. |
| 1 | **Descubrimiento_de_Vehiculos** | `Get_Vehicle_Detail` | **Flow** | Ficha técnica completa de un modelo por código (ECRU, ESPT, EWGN, ETRK, ECTY). |
| 2 | **Prueba_de_Manejo** | `Schedule_Test_Drive` | **Flow** | Agenda un turno de prueba de manejo, patrón confirm-before-create. |
| 3 | **Estado_y_FAQ** | `Get_Test_Drive_Status` | **Flow** | Consulta el estado de una prueba ya agendada por email. |
| 3 | **Estado_y_FAQ** | `Answer Questions with Knowledge` | Knowledge / RAG | Búsqueda RAG sobre los PDFs de Electra (catálogo, garantía, carga). |

Los **Flows** + **Apex** + objetos **Custom** + portal **Experience Cloud** + chat widget **MIAW** **ya vienen instalados** en tu org via el paquete del workshop. Tu trabajo es:

- **Armar el agente** en el nuevo **Agentforce Builder** (Agent Script): 3 **subagents** propios + 4 acciones de **Flow** + 1 acción de Knowledge (RAG).
- **Probarlo** en **Conversation Preview** con prompts canónicos y adversariales.
- **Verificarlo end-to-end** en el portal público (vía el chat widget **MIAW** como invitado).

> **Sobre la arquitectura:** este es un **Service Agent** (no Employee Agent). Vive de cara al cliente externo (no a empleados internos), corre con un usuario `EinsteinServiceAgent` específico, y se entrega vía MIAW (no via el sidebar de Salesforce). Los agentes que vas a crear se guardan como metadata tipo `AiAuthoringBundle` y corren sobre **Atlas**, el runtime de razonamiento más nuevo de Agentforce.

---

## Ejercicio 0 — Preparación del entorno (10 min)

**Objetivo:** instalar el paquete del workshop, abrir la app Electra Sales Studio, sembrar los datos de demo.

### Paso 1 — Ingresar a tu org Agentforce

1. Los facilitadores te van a compartir credenciales (usuario + contraseña) para una org **Agentforce NOW** (Atlas-capable) sobre el template *Auto*.
2. Abrí `https://login.salesforce.com` en una ventana nueva del navegador e ingresá con el usuario asignado.
3. **Guardá las credenciales** en tu gestor de contraseñas — las vas a necesitar durante las próximas 2 horas.
4. Si aparece un popup de "Code Builder no está habilitado" o "Try the new **Field Service Setup**", cerralo — no los vamos a usar.

### Paso 2 — Instalar el paquete del workshop

El paquete trae 3 objetos custom (`Vehicle_Model__c`, `Test_Drive_Slot__c`, `Vehicle_Inventory__c`), 6 Flows (4 backing del agente + 2 screen flows de Sembrar/Resetear), 2 Apex classes, una app Lightning con Home flexipage, un permission set, el sitio Experience Cloud `Electra Customer Portal` y el MIAW pre-armados.

- [ ] Abrí esta URL en una nueva pestaña (ya autenticado en tu org):
  ```
  https://login.salesforce.com/packaging/installPackage.apexp?p0=<PACKAGE_ID>
  ```
- [ ] Vas a ver la pantalla de consentimiento de instalación.
- [ ] Seleccioná **Install for All Users** (instalar para todos los usuarios). Hacé clic en **Install**.
- [ ] La instalación tarda entre 2 y 4 minutos. Vas a ver una pantalla "Installing and granting access to all users".
- [ ] Cuando termine, te lleva automáticamente a **Setup** → **Installed Packages**. Confirmá que ves **Electra Auto Workshop Bootstrap** en la lista.

### Paso 3 — Abrir la app Electra Sales Studio

- [ ] En la esquina superior izquierda, hacé click en el **App Launcher** (ícono de 9 puntitos).
- [ ] Escribí `Electra` en el buscador y seleccioná **Electra Sales Studio**.
- [ ] La app se abre en la pestaña **Home** con un layout personalizado: dos botones grandes ("Sembrar Datos" y "Resetear Datos") y las **tabs** **Vehicle Models**, **Test Drive Slots**, **Vehicle Inventory**, **Accounts**, **Contacts** y **Leads**.

> ✅ **Checkpoint:** ves las **tabs** en la barra superior y los dos botones en **Home**.

### Paso 4 — Sembrar los datos del workshop

Sin esto, el agente no tiene registros sobre los que actuar. El botón **Sembrar Datos** ejecuta un **Screen Flow** que pobla tu org con datos realistas:

- 5 modelos Electra (E-Cruiser, E-Sport, E-Wagon, E-Truck, E-City) con sus fichas técnicas
- 3 cuentas de concesionaria (Concesionaria Electra Palermo, Córdoba, Rosario)
- ~20 turnos de prueba de manejo (`Test_Drive_Slot__c`) repartidos los próximos 14 días
- 3 **leads** de muestra (Sofía Vega con prueba confirmada, Tomás Iriarte con prueba completada, Camila Ruiz sin prueba)

- [ ] En **Home**, hacé clic en **Sembrar Datos**.
- [ ] Hacé clic en el botón **Sembrar** dentro del **flow**. El **flow** corre la clase **Apex** `Electra_Workshop_Data_Seeder` y crea ~35 registros en una sola transacción (15–30 segundos).
- [ ] Cuando aparece la pantalla de confirmación con los conteos, hacé clic en **Listo**.

> **Nota:** el seeder es **idempotente**. Si volvés a hacer clic en **Sembrar**, detecta el centinela y termina con un mensaje explicando que ya estaba sembrada. Si necesitás empezar de cero, usá **Resetear Datos** primero.

> ✅ **Checkpoint:** abrí la **tab** **Vehicle Models**. Tenés que ver 5 modelos activos: E-Cruiser, E-Sport, E-Wagon, E-Truck, E-City.

### Paso 5 — Asignar permission sets

Los **permission sets** no se asignan automáticamente con el paquete. Hacé estos pasos manualmente:

- [ ] Hacé clic en el **engranaje** (arriba derecha) → **Setup**.
- [ ] En el **Quick Find** (arriba izquierda), escribí `Users` → hacé clic en **Users**.
- [ ] Hacé clic en tu nombre de usuario (columna "**Full Name**").
- [ ] En la parte superior del **User Detail**, hacé clic en **Permission Set Assignments**.
- [ ] Hacé clic en **Edit Assignments**.
- [ ] Buscá y agregá los 3 **permission sets** (movelos de "**Available**" a "**Enabled**"):
  - **Electra Auto Workshop Participant** (los permisos del paquete)
  - **Agent Platform Builder** (estándar — habilita **Agentforce Studio**)
  - **Agentforce Service Agent Builder** (estándar — permite crear agentes de servicio)
- [ ] Hacé clic en **Save**.

> ✅ **Checkpoint del Ejercicio 0:** la app está abierta, los datos están sembrados, los **permission sets** están asignados. Estás listo/a para configurar el agente.

---

