export interface Payment {
  id: string;
  amount: string | number;
  paymentMethod: string;
  paymentType: string;
  status: string;
  transactionId: string | null;
  notes: string | null;
  createdAt: string;
}

export interface BookingForBankTransfer {
  id: string;
  payments: Payment[];
}

export function getPendingBankTransfers(
  bookings: BookingForBankTransfer[]
): Array<Payment & { bookingId: string }> {
  const result: Array<Payment & { bookingId: string }> = [];

  for (const booking of bookings) {
    const payments = booking.payments || [];
    for (const p of payments) {
      if (
        p.paymentMethod === "BANK_TRANSFER" &&
        p.status === "PENDING_APPROVAL"
      ) {
        result.push(Object.assign({}, p, { bookingId: booking.id }));
      }
    }
  }

  return result;
}
