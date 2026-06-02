@IsTest
private class Electra_Workshop_Data_Test {

    @IsTest
    static void seederHappyPath() {
        Test.startTest();
        List<Electra_Workshop_Data_Seeder.SeedResult> results =
            Electra_Workshop_Data_Seeder.execute(new List<String>{ 'init' });
        Test.stopTest();

        System.assertEquals(1, results.size(), 'Expected one SeedResult');
        System.assertNotEquals(null, results[0].summary, 'Summary should not be null');

        List<Vehicle_Model__c> models = [SELECT Id, Code__c FROM Vehicle_Model__c];
        System.assertEquals(5, models.size(), 'Expected 5 vehicle models seeded');

        List<Account> dealers = [SELECT Id, Dealer_Code__c FROM Account WHERE Dealer_Code__c != null];
        System.assertEquals(3, dealers.size(), 'Expected 3 dealer accounts seeded');

        System.assertEquals(15, [SELECT count() FROM Vehicle_Inventory__c], 'Expected 15 inventory rows seeded');
    }

    @IsTest
    static void seederIdempotent() {
        Electra_Workshop_Data_Seeder.execute(new List<String>{ 'init' });

        Test.startTest();
        List<Electra_Workshop_Data_Seeder.SeedResult> results =
            Electra_Workshop_Data_Seeder.execute(new List<String>{ 'init' });
        Test.stopTest();

        System.assert(results[0].summary.contains('idempotente') || results[0].summary.contains('ya'), 'Second run should report idempotent skip');
        List<Vehicle_Model__c> models = [SELECT Id FROM Vehicle_Model__c];
        System.assertEquals(5, models.size(), 'Should still have only 5 models after second seed run');
    }

    @IsTest
    static void resetHappyPath() {
        Electra_Workshop_Data_Seeder.execute(new List<String>{ 'init' });

        Test.startTest();
        List<Electra_Workshop_Data_Reset.ResetResult> results =
            Electra_Workshop_Data_Reset.execute(new List<String>{ 'init' });
        Test.stopTest();

        System.assertEquals(1, results.size(), 'Expected one ResetResult');
        List<Vehicle_Model__c> models = [SELECT Id FROM Vehicle_Model__c WHERE Code__c IN ('ECRU','ESPT','EWGN','ETRK','ECTY')];
        System.assertEquals(0, models.size(), 'All seeded models should be removed after reset');
    }

    @IsTest
    static void resetWhenNothingSeeded() {
        Test.startTest();
        List<Electra_Workshop_Data_Reset.ResetResult> results =
            Electra_Workshop_Data_Reset.execute(new List<String>{ 'init' });
        Test.stopTest();

        System.assertEquals(1, results.size(), 'Expected one ResetResult');
        System.assertNotEquals(null, results[0].summary, 'Summary should not be null');
    }
}
