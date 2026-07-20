import BookingsView from "../../shared/components/BookingsView";

export default function AdminBookingsPage() {
  return (
    <BookingsView
      endpoint="/admin/bookings"
      title="Bookings"
      description="View customer booking requests across all vendors and properties."
      showVendor
    />
  );
}
