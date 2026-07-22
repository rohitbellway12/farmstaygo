import axios from "axios";

import BookingsView from "../../shared/components/BookingsView";

export default function VendorBookingsPage() {
  const handleAccept = async (
    bookingId: string
  ): Promise<void> => {
    await axios.post(
      `/vendor/bookings/${bookingId}/accept`
    );

    window.location.reload();
  };

  const handleReject = async (
    bookingId: string
  ): Promise<void> => {
    const reason = prompt(
      "Reason for rejection (optional):"
    );

    await axios.post(
      `/vendor/bookings/${bookingId}/reject`,
      { reason: reason || null }
    );

    window.location.reload();
  };

  const handlePay = async (
    bookingId: string
  ): Promise<void> => {
    window.location.href = `/vendor/bookings/${bookingId}/pay`;
  };

  return (
    <BookingsView
      endpoint="/vendor/bookings"
      title="Bookings"
      description="Manage booking requests received for your properties."
      showVendor={false}
      allowActions
      allowCashPayment
      onAccept={handleAccept}
      onReject={handleReject}
      onPay={handlePay}
    />
  );
}
