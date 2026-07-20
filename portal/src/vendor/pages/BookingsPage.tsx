import BookingsView from "../../shared/components/BookingsView";

export default function VendorBookingsPage() {
  return (
    <BookingsView
      endpoint="/vendor/bookings"
      title="Bookings"
      description="Manage booking requests received for your properties."
      showVendor={false}
    />
  );
}
