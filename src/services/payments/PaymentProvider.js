'use strict';
/**
 * PaymentProvider interface — method names and payloads deliberately mirror Razorpay so that
 * switching from the dummy gateway to Razorpay is a config change (PAYMENT_PROVIDER=razorpay).
 *
 *   createOrder({ amount, currency, receipt, notes })      -> { id, amount, currency, receipt, status }
 *   verifyPaymentSignature({ orderId, paymentId, signature }) -> boolean
 *   capture(paymentId, amount)                              -> payment
 *   refund(paymentId, { amount, notes })                    -> refund
 *   handleWebhook(rawBody, signatureHeader)                 -> { event, payload }
 *
 * Amounts are in RUPEES at this interface (providers convert to paise if needed).
 */
class PaymentProvider {
  get name() { return 'abstract'; }
  async createOrder() { throw new Error('createOrder not implemented'); }
  verifyPaymentSignature() { throw new Error('verifyPaymentSignature not implemented'); }
  async capture() { throw new Error('capture not implemented'); }
  async refund() { throw new Error('refund not implemented'); }
  async handleWebhook() { throw new Error('handleWebhook not implemented'); }
}
module.exports = PaymentProvider;
