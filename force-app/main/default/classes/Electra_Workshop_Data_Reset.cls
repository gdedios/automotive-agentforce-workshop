/**
 * Electra Automotive Workshop — data reset.
 * Invoked from Reset_Workshop_Data screen flow. Irreversible.
 *
 * Per workspace CLAUDE.md: ONE @InvocableMethod per class. Seeder lives in
 * Electra_Workshop_Data_Seeder.
 */
public with sharing class Electra_Workshop_Data_Reset {

    public class ResetResult {
        @InvocableVariable(label='Resumen' description='Resumen del resultado del reset')
        public String summary;

        @InvocableVariable(label='Mensaje de Error' description='Mensaje de error si el reset falló')
        public String errorMessage;
    }

    @InvocableMethod(label='Resetear Datos Electra' description='Borra todos los datos sembrados del taller. Solo facilitador.' category='Electra Workshop')
    public static List<ResetResult> execute(List<String> inputs) {
        ResetResult result = new ResetResult();
        result.summary = '';
        result.errorMessage = '';

        // Track deleted counts
        Integer leadsDeleted = 0;
        Integer slotsDeleted = 0;
        Integer inventoryDeleted = 0;
        Integer accountsDeleted = 0;
        Integer modelsDeleted = 0;

        // Seeded email addresses and dealer codes
        Set<String> seededLeadEmails = new Set<String>{
            'sofia.vega@example.com.ar',
            'tomas.iriarte@example.com.ar',
            'camila.ruiz@example.com.ar'
        };
        Set<String> seededDealerCodes = new Set<String>{
            'PALERMO', 'CORDOBA', 'ROSARIO'
        };
        Set<String> seededVehicleCodes = new Set<String>{
            'ECRU', 'ESPT', 'EWGN', 'ETRK', 'ECTY'
        };

        Savepoint sp = Database.setSavepoint();
        try {
            // Step 1: Delete seeded Leads
            List<Lead> leadsToDelete = [
                SELECT Id FROM Lead WHERE Email IN :seededLeadEmails
            ];
            if (!leadsToDelete.isEmpty()) {
                Database.delete(leadsToDelete, AccessLevel.SYSTEM_MODE);
                leadsDeleted = leadsToDelete.size();
            }

            // Step 2: Delete Test_Drive_Slots (all slots reference Electra models)
            List<Test_Drive_Slot__c> slotsToDelete = [
                SELECT Id FROM Test_Drive_Slot__c
                WHERE Vehicle_Model__r.Code__c IN :seededVehicleCodes
            ];
            if (!slotsToDelete.isEmpty()) {
                Database.delete(slotsToDelete, AccessLevel.SYSTEM_MODE);
                slotsDeleted = slotsToDelete.size();
            }

            // Step 3: Delete Vehicle_Inventory__c
            List<Vehicle_Inventory__c> inventoryToDelete = [
                SELECT Id FROM Vehicle_Inventory__c
                WHERE Vehicle_Model__r.Code__c IN :seededVehicleCodes
            ];
            if (!inventoryToDelete.isEmpty()) {
                Database.delete(inventoryToDelete, AccessLevel.SYSTEM_MODE);
                inventoryDeleted = inventoryToDelete.size();
            }

            // Step 4: Delete dealer Accounts
            List<Account> accountsToDelete = [
                SELECT Id FROM Account
                WHERE Dealer_Code__c IN :seededDealerCodes
            ];
            if (!accountsToDelete.isEmpty()) {
                Database.delete(accountsToDelete, AccessLevel.SYSTEM_MODE);
                accountsDeleted = accountsToDelete.size();
            }

            // Step 5: Delete Vehicle_Models
            List<Vehicle_Model__c> modelsToDelete = [
                SELECT Id FROM Vehicle_Model__c
                WHERE Code__c IN :seededVehicleCodes
            ];
            if (!modelsToDelete.isEmpty()) {
                Database.delete(modelsToDelete, AccessLevel.SYSTEM_MODE);
                modelsDeleted = modelsToDelete.size();
            }

            // Build success summary
            if (leadsDeleted + slotsDeleted + inventoryDeleted + accountsDeleted + modelsDeleted == 0) {
                result.summary = 'ℹ️ No había datos sembrados para borrar. El org ya estaba limpio.';
            } else {
                result.summary = '♻ Reset completado. Eliminados:\n'
                    + '• ' + leadsDeleted + ' leads de muestra\n'
                    + '• ' + slotsDeleted + ' turnos de prueba de manejo\n'
                    + '• ' + inventoryDeleted + ' registros de inventario\n'
                    + '• ' + accountsDeleted + ' concesionarias (Accounts)\n'
                    + '• ' + modelsDeleted + ' modelos de vehículo\n\n'
                    + 'El org está limpio — listo para sembrar de nuevo si querés.';
            }

        } catch (Exception e) {
            Database.rollback(sp);
            result.errorMessage = 'Reset falló durante las eliminaciones: ' + e.getMessage();
            result.summary = '❌ El reset no pudo completarse. Ver mensaje de error para detalles.';
        }

        return new List<ResetResult>{ result };
    }
}
