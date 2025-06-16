import type { ActionFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { PayHereService } from "~/utils/payhere.server";
import { updatePaymentStatus, createEscrowRelease, getPaymentByOrderId } from "~/utils/payment.server";
import { addToWallet } from "~/utils/wallet.server";
import { PaymentStatus } from "@prisma/client";

export async function action({ request }: ActionFunctionArgs) {
  if (request.method !== "POST") {
    return json({ error: "Method not allowed" }, { status: 405 });
  }
  try {
    const formData = await request.formData();
    const data = Object.fromEntries(formData);

    console.log("PayHere notification received:", data);

    // Extract PayHere notification data
    const {
      merchant_id,
      order_id,
      payment_id,
      amount,
      currency,
      status_code,
      md5sig,
      custom_1, // User ID for wallet deposits
      custom_2, // Transaction type
    } = data as {
      merchant_id: string;
      order_id: string;
      payment_id: string;
      amount: string;
      currency: string;
      status_code: string;
      md5sig: string;
      custom_1?: string;
      custom_2?: string;
    };

    // Create PayHere service instance
    const payHereConfig = {
      merchantId: process.env.PAYHERE_MERCHANT_ID!,
      merchantSecret: process.env.PAYHERE_MERCHANT_SECRET!,
      mode: process.env.PAYHERE_MODE as 'sandbox' | 'live',
      currency: process.env.PAYHERE_CURRENCY || 'LKR',
      returnUrl: process.env.PAYHERE_RETURN_URL!,
      cancelUrl: process.env.PAYHERE_CANCEL_URL!,
      notifyUrl: process.env.PAYHERE_NOTIFY_URL!,
    };

    const payHereService = new PayHereService(payHereConfig);

    // Verify the hash to ensure request authenticity
    const notificationData = {
      merchant_id,
      order_id,
      payhere_amount: amount,
      payhere_currency: currency,
      status_code,
      md5sig
    };

    const isValidHash = payHereService.verifyNotificationHash(
      merchant_id,
      order_id,
      payment_id,
      amount,
      currency,
      status_code,
      md5sig
    );

    if (!isValidHash) {
      console.error("Invalid PayHere notification hash");
      return json({ error: "Invalid hash" }, { status: 400 });
    }    // PayHere status codes:
    // 2 = Success
    // 0 = Pending
    // -1 = Canceled
    // -2 = Failed
    // -3 = Chargedback

    let paymentStatus: PaymentStatus = PaymentStatus.PENDING;
    switch (status_code) {
      case '2':
        paymentStatus = PaymentStatus.COMPLETED;
        break;
      case '0':
        paymentStatus = PaymentStatus.PROCESSING;
        break;
      case '-1':
        paymentStatus = PaymentStatus.CANCELLED;
        break;
      case '-2':
      case '-3':
        paymentStatus = PaymentStatus.FAILED;
        break;
    }    // Check if this is a wallet deposit
    if (custom_2 === 'WALLET_DEPOSIT' && custom_1 && status_code === '2') {
      try {
        await addToWallet({
          userId: custom_1,
          amount: parseFloat(amount),
          currency,
          payhereOrderId: order_id,
          paymentData: data
        });
        console.log(`Wallet deposit successful: ${amount} ${currency} for user ${custom_1}`);
        return json({ success: true, message: "Wallet deposit processed successfully" });
      } catch (walletError) {
        console.error("Wallet deposit error:", walletError);
        return json({ error: "Wallet deposit failed" }, { status: 500 });
      }
    }

    // Handle regular project payments
    await updatePaymentStatus(order_id, paymentStatus, data);

    // If payment is successful, create escrow release record
    if (status_code === '2') {
      try {
        const payment = await getPaymentByOrderId(order_id);
        if (payment && !payment.escrowRelease) {
          await createEscrowRelease(payment.id);
          console.log("Payment successful - created escrow release");
        }
      } catch (escrowError) {
        console.error("Error creating escrow release:", escrowError);
        // Don't fail the whole notification if escrow creation fails
      }
    }

    return json({ success: true });

  } catch (error) {
    console.error("PayHere notification processing error:", error);
    return json({ error: "Processing failed" }, { status: 500 });
  }
}
