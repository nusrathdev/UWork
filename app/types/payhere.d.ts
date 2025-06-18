// PayHere JavaScript SDK Type Definitions
declare global {
  interface Window {
    payhere: PayHere;
  }
}

interface PayHere {
  onCompleted: (orderId: string) => void;
  onDismissed: () => void;
  onError: (error: string) => void;
  startPayment: (payment: PayHerePayment) => void;
}

interface PayHerePayment {
  sandbox: boolean;
  merchant_id: string;
  return_url: string;
  cancel_url: string;
  notify_url: string;
  order_id: string;
  items: string;
  amount: string;
  currency: string;
  hash: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  country: string;
  delivery_address?: string;
  delivery_city?: string;
  delivery_country?: string;
  custom_1?: string;
  custom_2?: string;
}

// Make this a module
export {};
