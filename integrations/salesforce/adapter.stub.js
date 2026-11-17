'use strict';
/**
 * Salesforce adapter STUB (not used yet). Complete after `npm install jsforce`.
 * Used by src/services/customers/salesforce.adapter.js and src/services/reviews/salesforce.adapter.js.
 */
// const jsforce = require('jsforce');

class SalesforceAdapter {
  constructor(env = process.env) {
    this.env = env;
    this.conn = null;
  }

  async connect() {
    // TODO: this.conn = new jsforce.Connection({ loginUrl: this.env.SF_LOGIN_URL });
    // await this.conn.login(this.env.SF_USERNAME, this.env.SF_PASSWORD);
    throw new Error('Salesforce adapter not configured — see integrations/salesforce/README.md');
  }

  // ----- Customers (Person Accounts) -----
  async listCustomers({ q } = {}) {
    // TODO: SOQL: SELECT Id, Name, PersonEmail, PersonMobilePhone, ShippingCity, ShippingState FROM Account
    //       WHERE IsPersonAccount = true AND (Name LIKE :q OR PersonEmail LIKE :q) LIMIT 200
    await this.connect(); return { items: [], total: 0, q };
  }
  async upsertCustomer(user) {
    // TODO: this.conn.sobject('Account').upsert({ HH_Customer_Id__c: user.id, LastName: user.name, PersonEmail: user.email }, 'HH_Customer_Id__c')
    await this.connect(); return user;
  }

  // ----- Reviews (HH_Product_Review__c) -----
  async listReviews({ productSku, status = 'Approved' } = {}) {
    // TODO: SELECT Id, Rating__c, Title__c, Body__c, Status__c, CreatedDate, Account__r.Name
    //       FROM HH_Product_Review__c WHERE Product__r.ProductCode = :productSku AND Status__c = :status
    await this.connect(); return { items: [], productSku, status };
  }
  async createReview(review) { await this.connect(); return review; }
  async moderateReview(id, status) { await this.connect(); return { id, status }; }

  // ----- Orders -----
  async upsertOrder(order) {
    // TODO: upsert Order by OrderReferenceNumber = order.orderNo, then OrderItems
    await this.connect(); return order;
  }
}

module.exports = SalesforceAdapter;
