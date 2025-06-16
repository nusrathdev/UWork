import crypto from 'crypto';

export interface PayHereConfig {
  merchantId: string;
  merchantSecret: string;
  mode: 'sandbox' | 'live';
  currency: string;
  returnUrl: string;
  cancelUrl: string;
  notifyUrl: string;
}

export interface PaymentData {
  orderId: string;
  amount: number;
  currency: string;
  items: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  address?: string;
  city?: string;
  country?: string;
}

export class PayHereService {
  private config: PayHereConfig;

  constructor(config: PayHereConfig) {
    this.config = config;
  }

  /**
   * Generate PayHere payment hash
   */
  generateHash(paymentData: PaymentData): string {
    const { merchantId, merchantSecret } = this.config;
    const { orderId, amount, currency } = paymentData;
    
    // PayHere hash format: merchant_id + order_id + amount + currency + md5(merchant_secret)
    const merchantSecretHash = crypto
      .createHash('md5')
      .update(merchantSecret)
      .digest('hex')
      .toUpperCase();
    
    const hashString = `${merchantId}${orderId}${amount.toFixed(2)}${currency}${merchantSecretHash}`;
    
    return crypto
      .createHash('md5')
      .update(hashString)
      .digest('hex')
      .toUpperCase();
  }

  /**
   * Verify PayHere notification hash
   */
  verifyNotificationHash(
    merchantId: string,
    orderId: string,
    paymentId: string,
    amount: string,
    currency: string,
    statusCode: string,
    hash: string
  ): boolean {
    const merchantSecretHash = crypto
      .createHash('md5')
      .update(this.config.merchantSecret)
      .digest('hex')
      .toUpperCase();
    
    const hashString = `${merchantId}${orderId}${amount}${currency}${statusCode}${merchantSecretHash}`;
    
    const calculatedHash = crypto
      .createHash('md5')
      .update(hashString)
      .digest('hex')
      .toUpperCase();
    
    return calculatedHash === hash.toUpperCase();
  }

  /**
   * Get PayHere checkout URL
   */
  getCheckoutUrl(): string {
    return this.config.mode === 'sandbox' 
      ? 'https://sandbox.payhere.lk/pay/checkout'
      : 'https://www.payhere.lk/pay/checkout';
  }

  /**
   * Prepare payment form data
   */
  preparePaymentForm(paymentData: PaymentData) {
    const hash = this.generateHash(paymentData);
    
    return {
      merchant_id: this.config.merchantId,
      return_url: this.config.returnUrl,
      cancel_url: this.config.cancelUrl,
      notify_url: this.config.notifyUrl,
      order_id: paymentData.orderId,
      items: paymentData.items,
      currency: paymentData.currency,
      amount: paymentData.amount.toFixed(2),
      first_name: paymentData.firstName,
      last_name: paymentData.lastName,
      email: paymentData.email,
      phone: paymentData.phone || '',
      address: paymentData.address || '',
      city: paymentData.city || '',
      country: paymentData.country || 'Sri Lanka',
      hash: hash,
    };
  }
}

// Initialize PayHere service with environment variables
export const payHereService = new PayHereService({
  merchantId: process.env.PAYHERE_MERCHANT_ID || '',
  merchantSecret: process.env.PAYHERE_MERCHANT_SECRET || '',
  mode: (process.env.PAYHERE_MODE as 'sandbox' | 'live') || 'sandbox',
  currency: process.env.PAYHERE_CURRENCY || 'LKR',
  returnUrl: process.env.PAYHERE_RETURN_URL || 'http://localhost:3000/payment/success',
  cancelUrl: process.env.PAYHERE_CANCEL_URL || 'http://localhost:3000/payment/cancel',
  notifyUrl: process.env.PAYHERE_NOTIFY_URL || 'http://localhost:3000/api/payment/notify',
});
