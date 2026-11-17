'use strict';
/**
 * TODO(Salesforce): implement ReviewsService against a custom object Product_Review__c
 * (see integrations/salesforce/README.md for the field mapping).
 *   npm install jsforce
 *   listByProduct: SELECT Id, Rating__c, Title__c, Body__c FROM Product_Review__c WHERE Product__r.SKU__c = :sku AND Status__c = 'Approved'
 */
const ReviewsService = require('./ReviewsService');
class SalesforceReviewsAdapter extends ReviewsService {}
module.exports = SalesforceReviewsAdapter;
