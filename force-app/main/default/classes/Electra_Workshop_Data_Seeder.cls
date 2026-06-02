/**
 * Electra Auto Concierge — workshop seeder.
 * Invoked from Seed_Workshop_Data screen flow.
 * Idempotent: returns early if sentinel dealer PALERMO already exists.
 *
 * Per v2 lesson: ONE @InvocableMethod per class. Reset lives in
 * Electra_Workshop_Data_Reset.
 */
public with sharing class Electra_Workshop_Data_Seeder {

    public class SeedResult {
        @InvocableVariable(label='Resumen' description='Mensaje de éxito o idempotencia')
        public String summary;
        @InvocableVariable(label='Error' description='Mensaje de error si falla')
        public String errorMessage;
    }

    @InvocableMethod(label='Sembrar Datos Electra' description='Carga vehículos, concesionarias, turnos y leads de muestra. Idempotente.' category='Electra Workshop')
    public static List<SeedResult> execute(List<String> inputs) {
        SeedResult res = new SeedResult();
        res.summary = '';
        res.errorMessage = '';

        // Idempotency check on sentinel dealer code PALERMO.
        List<Account> existing = [
            SELECT Id FROM Account WHERE Dealer_Code__c = 'PALERMO' LIMIT 1
        ];
        if (!existing.isEmpty()) {
            res.summary = 'Datos ya sembrados — operación idempotente, no se duplicaron registros.';
            return new List<SeedResult>{ res };
        }

        Savepoint sp = Database.setSavepoint();
        try {
            // ===== Vehicle Models (5) =====
            List<Vehicle_Model__c> models = new List<Vehicle_Model__c>{
                new Vehicle_Model__c(
                    Code__c='ECRU',
                    Name='E-Cruiser',
                    Type__c='Sedan family',
                    Range_Km__c=520,
                    Acceleration_0_100_Sec__c=6.8,
                    Charging_Time_Min__c=28,
                    Charging_Power_Kw__c=150,
                    Price_ARS__c=48000000,
                    Position__c='Flagship premium familiar — para Sofía Vega y compradores de auto principal',
                    Active__c=true
                ),
                new Vehicle_Model__c(
                    Code__c='ESPT',
                    Name='E-Sport',
                    Type__c='Coupé',
                    Range_Km__c=480,
                    Acceleration_0_100_Sec__c=4.2,
                    Charging_Time_Min__c=30,
                    Charging_Power_Kw__c=150,
                    Price_ARS__c=58000000,
                    Position__c='Performance halo — para entusiastas de la velocidad y diseño deportivo',
                    Active__c=true
                ),
                new Vehicle_Model__c(
                    Code__c='EWGN',
                    Name='E-Wagon',
                    Type__c='Wagon / station',
                    Range_Km__c=510,
                    Acceleration_0_100_Sec__c=7.4,
                    Charging_Time_Min__c=28,
                    Charging_Power_Kw__c=150,
                    Price_ARS__c=46000000,
                    Position__c='Familia, dog-friendly, road-trips — alternativa al E-Cruiser para familias activas',
                    Active__c=true
                ),
                new Vehicle_Model__c(
                    Code__c='ETRK',
                    Name='E-Truck',
                    Type__c='Pickup',
                    Range_Km__c=460,
                    Acceleration_0_100_Sec__c=7.0,
                    Charging_Time_Min__c=35,
                    Charging_Power_Kw__c=150,
                    Price_ARS__c=62000000,
                    Position__c='Trabajo y lifestyle — payload 700kg, para emprendedores y aventureros',
                    Active__c=true
                ),
                new Vehicle_Model__c(
                    Code__c='ECTY',
                    Name='E-City',
                    Type__c='Hatchback compact',
                    Range_Km__c=360,
                    Acceleration_0_100_Sec__c=9.1,
                    Charging_Time_Min__c=25,
                    Charging_Power_Kw__c=100,
                    Price_ARS__c=32000000,
                    Position__c='Entry-level urbano — primera EV para uso diario en ciudad',
                    Active__c=true
                )
            };
            Database.insert(models, AccessLevel.SYSTEM_MODE);

            // ===== Dealerships (3 Accounts, Type='Dealer') =====
            List<Account> dealers = new List<Account>{
                new Account(
                    Name='Concesionaria Electra Palermo',
                    Dealer_Code__c='PALERMO',
                    Type='Dealer',
                    City_AR__c='Buenos Aires',
                    BillingStreet='Av. Córdoba 4500',
                    BillingCity='CABA'
                ),
                new Account(
                    Name='Concesionaria Electra Córdoba',
                    Dealer_Code__c='CORDOBA',
                    Type='Dealer',
                    City_AR__c='Córdoba',
                    BillingStreet='Bv. Chacabuco 850',
                    BillingCity='Córdoba'
                ),
                new Account(
                    Name='Concesionaria Electra Rosario',
                    Dealer_Code__c='ROSARIO',
                    Type='Dealer',
                    City_AR__c='Rosario',
                    BillingStreet='Córdoba 1200',
                    BillingCity='Rosario'
                )
            };
            Database.insert(dealers, AccessLevel.SYSTEM_MODE);

            // ===== Test Drive Slots (~30, next 14 days, 5 time-slots/day) =====
            Integer[] hours = new Integer[]{ 10, 11, 14, 15, 17 };
            Integer[] minutes = new Integer[]{ 0, 30, 0, 30, 0 };
            List<Test_Drive_Slot__c> slots = new List<Test_Drive_Slot__c>();

            // Generate ~10 slots per dealer, distributed across 14 days
            for (Integer dealerIdx = 0; dealerIdx < dealers.size(); dealerIdx++) {
                Account dealer = dealers[dealerIdx];
                for (Integer slotIdx = 0; slotIdx < 10; slotIdx++) {
                    Integer dayOffset = 1 + Math.mod(slotIdx, 14);
                    Integer timeIdx = Math.mod(slotIdx, 5);
                    Integer modelIdx = Math.mod(dealerIdx * 10 + slotIdx, models.size());

                    Date slotDate = Date.today().addDays(dayOffset);
                    Datetime slotDatetime = Datetime.newInstance(
                        slotDate.year(),
                        slotDate.month(),
                        slotDate.day(),
                        hours[timeIdx],
                        minutes[timeIdx],
                        0
                    );

                    slots.add(new Test_Drive_Slot__c(
                        Dealer__c=dealer.Id,
                        Vehicle_Model__c=models[modelIdx].Id,
                        Slot_DateTime__c=slotDatetime,
                        Duration_Min__c=60,
                        Status__c='Disponible'
                    ));
                }
            }
            Database.insert(slots, AccessLevel.SYSTEM_MODE);

            // ===== Vehicle Inventory (15 = 3 dealers × 5 models) =====
            List<Vehicle_Inventory__c> inventory = new List<Vehicle_Inventory__c>();
            for (Integer d = 0; d < dealers.size(); d++) {
                for (Integer m = 0; m < models.size(); m++) {
                    Integer quantity = 2 + Math.mod(d * 5 + m, 7);
                    inventory.add(new Vehicle_Inventory__c(
                        Dealer__c=dealers[d].Id,
                        Vehicle_Model__c=models[m].Id,
                        Quantity_Available__c=quantity,
                        Last_Updated__c=Datetime.now()
                    ));
                }
            }
            Database.insert(inventory, AccessLevel.SYSTEM_MODE);

            // ===== Leads (3) =====
            Id eCruiserId = models[0].Id;  // E-Cruiser
            Id eSportId = models[1].Id;    // E-Sport
            Id palermoId = dealers[0].Id;
            Id cordobaId = dealers[1].Id;

            List<Lead> leads = new List<Lead>{
                new Lead(
                    FirstName='Sofía',
                    LastName='Vega',
                    Email='sofia.vega@example.com.ar',
                    Company='Particular - Sofía Vega',
                    LeadSource='Web - Electra Concierge',
                    Vehicle_of_Interest__c=eCruiserId,
                    Preferred_Dealer__c=palermoId,
                    Test_Drive_Status__c='Confirmado',
                    Status='Open - Not Contacted'
                ),
                new Lead(
                    FirstName='Tomás',
                    LastName='Iriarte',
                    Email='tomas.iriarte@example.com.ar',
                    Company='Particular - Tomás Iriarte',
                    LeadSource='Web - Electra Concierge',
                    Vehicle_of_Interest__c=eSportId,
                    Preferred_Dealer__c=cordobaId,
                    Test_Drive_Status__c='Completado',
                    Status='Working - Contacted'
                ),
                new Lead(
                    FirstName='Camila',
                    LastName='Ruiz',
                    Email='camila.ruiz@example.com.ar',
                    Company='Particular - Camila Ruiz',
                    LeadSource='Web - Electra Concierge',
                    Test_Drive_Status__c='Sin Cita',
                    Status='Open - Not Contacted'
                )
            };
            Database.insert(leads, AccessLevel.SYSTEM_MODE);

            // ===== Book one slot for Sofía (happy path for Get_Test_Drive_Status) =====
            List<Test_Drive_Slot__c> palermoECruiserSlots = [
                SELECT Id
                FROM Test_Drive_Slot__c
                WHERE Dealer__c = :palermoId
                  AND Vehicle_Model__c = :eCruiserId
                  AND Status__c = 'Disponible'
                ORDER BY Slot_DateTime__c ASC
                LIMIT 1
            ];
            if (!palermoECruiserSlots.isEmpty()) {
                Test_Drive_Slot__c sofiaSlot = palermoECruiserSlots[0];
                sofiaSlot.Status__c = 'Reservado';
                sofiaSlot.Booked_By__c = leads[0].Id;
                Database.update(new List<Test_Drive_Slot__c>{ sofiaSlot }, AccessLevel.SYSTEM_MODE);
            }

            // Success summary
            res.summary = '✅ Datos Electra sembrados correctamente:\n'
                + '• 5 modelos de vehículos\n'
                + '• 3 concesionarias (Palermo, Córdoba, Rosario)\n'
                + '• ' + inventory.size() + ' registros de inventario\n'
                + '• ' + slots.size() + ' turnos de prueba de manejo\n'
                + '• 3 leads de muestra (Sofía Vega — Confirmado, Tomás Iriarte — Completado, Camila Ruiz — Sin Cita)\n\n'
                + 'Probá la conversación con: "Hola, soy Sofía Vega — quiero probar el E-Cruiser este sábado en Palermo."';

        } catch (Exception e) {
            Database.rollback(sp);
            res.errorMessage = 'Error durante la carga: ' + e.getMessage() + ' (línea ' + e.getLineNumber() + ')';
        }

        return new List<SeedResult>{ res };
    }
}
