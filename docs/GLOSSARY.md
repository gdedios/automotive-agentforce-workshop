# GLOSSARY.md — Términos canónicos (Electra Automotive Workshop)

Vocabulario fijo. Si la guía dice algo distinto, alineá a esto.

## Términos de producto Salesforce — NO traducir

| UI label (EN, en negrita) | Notas |
|---|---|
| **Setup** | Nunca "Configuración". |
| **App Launcher** | Nunca "Lanzador de Aplicaciones". |
| **Home** | Página principal del app. |
| **Agentforce Studio** | El NEW Builder. Direct URL canónica. |
| **Agents** | Nodo del sidebar. |
| **+ New Agent** | El split-button. Texto exacto. |
| **Skip Ahead** | Atajo del wizard inicial. |
| **Reasoning Instructions** | Campo de texto del subagent. |
| **Subagent** | Nunca "Tema" / "Topic" en NEW Builder. |
| **Add Action** | Botón. |
| **Actions** | Tab del subagent. |
| **Data Library** | Feature de RAG. |
| **Answer Questions with Knowledge** | Acción AQWK literal. |
| **Conversation Preview** | Panel de prueba interactiva. |
| **Activate** | Toggle del agente. |
| **Commit Version** | Botón post-edición. |
| **Deactivate** | Para abrir nueva versión. |
| **New Version** | Tras Deactivate. |
| **Files** | Object de Salesforce. |
| **Permission Set** | Nunca "Conjunto de Permisos". |
| **Lightning App** | Nunca "Aplicación Lightning". |
| **Tab** | Pestaña dentro de un app — pero en negrita inglesa. |
| **Flexipage** | Layout de página. |
| **Flow** | El feature; en inglés. |
| **Custom Object** | Objeto personalizado — pero en negrita inglesa. |
| **Experience Cloud** | Producto. |
| **Site Builder** | UI de edición de sitio. |
| **Embedded Service Deployment / ESD** | Snippet de chat. |
| **MIAW** | Messaging for In-App and Web. Sigla intacta. |
| **MessagingChannel** | Tipo de metadata. |

## Términos de dominio Electra — sí traducir

| ES | EN | Cuándo usar |
|---|---|---|
| Modelo / vehículo | Model / vehicle | Genérico. |
| Prueba de manejo | Test drive | "Agendar una prueba de manejo". |
| Concesionaria | Dealer / dealership | Argentina usa "concesionaria" femenino. |
| Catálogo | Catalog | "Catálogo de vehículos". |
| Garantía | Warranty | |
| Carga | Charging | "Estación de carga", "tiempo de carga". |
| Mantenimiento | Maintenance | |
| Lead / prospecto | Lead | "Lead" se usa en español argentino sin traducir; "prospecto" como sinónimo aceptado. |
| Agendar | Schedule | "Agendar una prueba". |
| Estado | Status | "Consultar el estado de mi prueba". |

## Nombres propios del proyecto — fijos

| Asset | Valor canónico |
|---|---|
| Marca | **Electra** |
| Agente (display name) | **Electra Auto Concierge** |
| Agente (API name) | `ElectraAI_Auto_Concierge` |
| Org alias | `Electra_Auto` |
| Sitio público | **Electra Customer Portal** |
| Url path del sitio | `/electra` |
| Lightning App | **Electra Sales Studio** |
| Permission Set | `Electra_Auto_Workshop_Participant` |
| Data Library | `Electra_FAQ_Library` |
| Color primario | `#4723EB` (Primary Purple) |
| Charcoal | `#393942` |
| Light | `#F0EBFD` |
| Subagent 1 | **Descubrimiento_de_Vehiculos** |
| Subagent 2 | **Prueba_de_Manejo** |
| Subagent 3 | **Estado_y_FAQ** |
| Action 1 | `Get_Vehicle_Catalog` (Flow) |
| Action 2 | `Get_Vehicle_Detail` (Flow) |
| Action 3 | `Schedule_Test_Drive` (Flow) |
| Action 4 | `Get_Test_Drive_Status` (Flow) |
| Action 5 | `AnswerQuestionsWithKnowledge` (AQWK) |
| Persona principal | **Sofía Vega** (Buenos Aires, prospecta E-Cruiser) |
| Vehículos | E-Cruiser, E-Sport, E-Wagon, E-Truck, E-City |
| Concesionarias | Concesionaria Buenos Aires, Concesionaria Córdoba, Concesionaria Rosario |

## Welcome message del agente — texto exacto (no editar fonéticamente)

> ¡Hola! Soy el Concierge de Electra Auto. Te puedo ayudar a descubrir nuestros modelos eléctricos, agendar una prueba de manejo o resolver dudas sobre garantía y carga. ¿En qué te ayudo?

## Off-topic message del agente — texto exacto

> Eso está fuera del alcance de lo que puedo ayudarte hoy. Soy el Concierge de Electra Auto y puedo ayudarte con catálogo de modelos, pruebas de manejo y consultas sobre garantía y carga. ¿Te ayudo con alguno de esos temas?
