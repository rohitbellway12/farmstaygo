import type { ReactNode } from "react";
import { Link } from "react-router-dom";

interface StatItem {
  title: string;
  value: string;
  change: string;
  icon: ReactNode;
  iconClass: string;
  linkLabel?: string;
}

const propertyImages = [
  "https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?auto=format&fit=crop&w=500&q=80",
  "https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?auto=format&fit=crop&w=500&q=80",
  "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=500&q=80",
  "https://images.unsplash.com/photo-1600047509807-ba8f99d2cdde?auto=format&fit=crop&w=500&q=80",
];

const avatars = [
  "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=100&q=80",
  "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=100&q=80",
  "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=100&q=80",
  "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=100&q=80",
];

const revenueBars = [
  28, 52, 37, 66, 48, 73, 39, 61, 81, 58, 47, 69, 41, 56,
  72, 63, 46, 76, 54, 67, 85, 44, 59, 74, 64, 51, 70, 42,
];

const revenueLinePoints = [
  "0,118",
  "22,109",
  "44,106",
  "66,85",
  "88,57",
  "110,78",
  "132,91",
  "154,70",
  "176,64",
  "198,89",
  "220,94",
  "242,86",
  "264,68",
  "286,56",
  "308,78",
  "330,97",
  "352,84",
  "374,55",
  "396,31",
  "418,48",
  "440,82",
  "462,62",
  "484,35",
  "506,71",
  "528,80",
  "550,63",
  "572,42",
  "594,54",
].join(" ");

const stats: StatItem[] = [
  {
    title: "Total Properties",
    value: "5",
    change: "↑ 1 this month",
    iconClass: "bg-success-soft text-success",
    icon: (
      <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M3 11 12 4l9 7" />
        <path d="M5 10v10h14V10" />
        <path d="M9 20v-6h6v6" />
      </svg>
    ),
  },
  {
    title: "Active Bookings",
    value: "28",
    change: "↑ 12% vs last month",
    iconClass: "bg-info-soft text-info",
    icon: (
      <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8">
        <rect x="3" y="5" width="18" height="16" rx="2" />
        <path d="M8 3v4" />
        <path d="M16 3v4" />
        <path d="M3 10h18" />
        <circle cx="16" cy="16" r="3" />
      </svg>
    ),
  },
  {
    title: "Monthly Revenue",
    value: "₹6,42,750",
    change: "↑ 18.6% vs last month",
    iconClass: "bg-primary-50 text-primary-700",
    icon: (
      <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M12 3c4.4 0 8 3.6 8 8s-3.6 10-8 10-8-5.6-8-10 3.6-8 8-8Z" />
        <path d="M9 9.2c.8-.7 1.8-1 3-1 1.7 0 3 1 3 2.3 0 1.4-1.1 2-3 2.4s-3 1-3 2.4c0 1.3 1.3 2.3 3 2.3 1.3 0 2.4-.4 3.2-1.1" />
        <path d="M12 6.5v11" />
      </svg>
    ),
  },
  {
    title: "Available Payout",
    value: "₹1,85,320",
    change: "View payouts →",
    iconClass: "bg-chart-orange-soft text-chart-orange",
    linkLabel: "View payouts",
    icon: (
      <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8">
        <rect x="3" y="6" width="18" height="13" rx="2" />
        <path d="M3 10h18" />
        <circle cx="16" cy="15" r="2" />
      </svg>
    ),
  },
  {
    title: "Occupancy Rate",
    value: "62%",
    change: "↑ 8% vs last month",
    iconClass: "bg-purple-soft text-purple",
    icon: (
      <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M12 3a9 9 0 1 0 9 9h-9Z" />
        <path d="M15 3.5A8.5 8.5 0 0 1 20.5 9H15Z" />
      </svg>
    ),
  },
  {
    title: "Average Rating",
    value: "4.7",
    change: "↑ 0.3 vs last month",
    iconClass: "bg-warning-soft text-warning",
    icon: (
      <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="m12 3 2.7 5.5 6.1.9-4.4 4.3 1 6.1-5.4-2.9-5.4 2.9 1-6.1-4.4-4.3 6.1-.9Z" />
      </svg>
    ),
  },
];

function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <section className={`rounded-dashboard-card border border-border bg-surface shadow-dashboard-card ${className}`}>
      {children}
    </section>
  );
}

function CardHeader({
  title,
  action,
  className = "",
}: {
  title: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={`flex items-center justify-between gap-3 px-5 pt-5 ${className}`}>
      <h2 className="text-sm font-extrabold text-text-main">{title}</h2>
      {action}
    </div>
  );
}

function ViewAllLink({ to = "#", label = "View all" }: { to?: string; label?: string }) {
  return (
    <Link to={to} className="inline-flex items-center gap-1 text-xs font-extrabold text-primary-700 hover:text-primary-900">
      {label}
      <span>→</span>
    </Link>
  );
}

// function StatusBadge({ status }: { status: string }) {
//   const classes =
//     status === "Confirmed" || status === "Completed" || status === "Active"
//       ? "bg-success-soft text-success"
//       : status === "Upcoming"
//       ? "bg-info-soft text-info"
//       : status === "Checked-in"
//       ? "bg-purple-soft text-purple"
//       : "bg-danger-soft text-danger";

//   return <span className={`rounded-md px-3 py-1 text-xs font-bold ${classes}`}>{status}</span>;
// }

function StatCard({ item }: { item: StatItem }) {
  return (
    <Card className="min-h-[90px] p-4">
      <div className="flex items-center gap-4">
        <span className={`grid h-12 w-12 shrink-0 place-items-center rounded-full ${item.iconClass}`}>{item.icon}</span>
        <div className="min-w-0">
          <span className="block truncate text-xs font-semibold text-text-muted">{item.title}</span>
          <strong className="mt-1 block truncate text-2xl font-extrabold leading-none text-text-main">{item.value}</strong>
          <span className={`mt-1.5 block truncate text-xs font-bold ${item.linkLabel ? "text-primary-700" : "text-success"}`}>
            {item.change}
          </span>
        </div>
      </div>
    </Card>
  );
}

function RevenueBookingsOverview() {
  return (
    <Card className="min-h-[260px]">
      <CardHeader
        title="Revenue & Bookings Overview"
        action={
          <div className="flex items-center gap-2">
            <select className="h-8 rounded-md border border-border bg-surface px-3 text-xs font-semibold text-text-secondary outline-none">
              <option>Daily</option>
              <option>Weekly</option>
            </select>
            <select className="h-8 rounded-md border border-border bg-surface px-3 text-xs font-semibold text-text-secondary outline-none">
              <option>This Month</option>
              <option>Last Month</option>
            </select>
          </div>
        }
      />

      <div className="mt-3 flex items-center gap-5 px-5 text-xs font-semibold text-text-muted">
        <span className="flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-full bg-chart-green" />Revenue (₹)</span>
        <span className="flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-full bg-chart-green-light" />Bookings</span>
      </div>

      <div className="relative mt-2 h-[180px] px-5 pb-5">
        <div className="absolute inset-x-5 inset-y-1 flex flex-col justify-between pb-5">
          {[1, 2, 3, 4].map((line) => <div key={line} className="border-t border-border" />)}
        </div>

        <div className="absolute bottom-7 left-0 top-1 flex w-14 flex-col justify-between px-1 text-right text-xs text-text-soft">
          <span>₹1.2L</span><span>₹90K</span><span>₹60K</span><span>₹30K</span><span>₹0</span>
        </div>

        <div className="absolute bottom-7 left-14 right-8 top-2 flex items-end gap-[6px]">
          {revenueBars.map((value, index) => (
            <div
              key={index}
              className="flex-1 rounded-t-sm bg-chart-green-light"
              style={{ height: `${value}%`, opacity: index % 3 === 0 ? 1 : 0.82 }}
            />
          ))}
        </div>

        <svg viewBox="0 0 600 150" preserveAspectRatio="none" className="absolute bottom-7 left-14 right-8 top-2 h-[132px] w-[calc(100%-88px)]">
          <polyline
            points={revenueLinePoints}
            fill="none"
            stroke="var(--color-chart-green)"
            strokeWidth="3"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
          {["88,57", "176,64", "286,56", "396,31", "484,35", "572,42"].map((point) => {
            const [cx, cy] = point.split(",");
            return <circle key={point} cx={cx} cy={cy} r="4" fill="var(--color-chart-green)" />;
          })}
        </svg>

        <div className="absolute bottom-1 left-14 right-8 flex justify-between text-xs text-text-soft">
          <span>May 1</span><span>May 5</span><span>May 9</span><span>May 13</span><span>May 17</span><span>May 21</span><span>May 25</span><span>May 29</span>
        </div>
      </div>
    </Card>
  );
}

function PropertyPerformance() {
  const properties = [
    { name: "Rustic Greens Farmhouse", city: "Nashik, Maharashtra", bookings: "14", revenue: "₹2,18,760", rating: "4.8", reviews: "126", image: propertyImages[0] },
    { name: "The Lakeview Villa", city: "Udaipur, Rajasthan", bookings: "9", revenue: "₹1,72,400", rating: "4.6", reviews: "98", image: propertyImages[1] },
    { name: "Hilltop Resort & Spa", city: "Coorg, Karnataka", bookings: "5", revenue: "₹1,05,590", rating: "4.5", reviews: "74", image: propertyImages[2] },
  ];

  return (
    <Card className="min-h-[260px] overflow-hidden">
      <CardHeader title="Property Performance" action={<ViewAllLink to="/vendor/properties" />} />
      <div className="mt-3 divide-y divide-border border-t border-border px-4">
        {properties.map((item) => (
          <div key={item.name} className="grid grid-cols-[minmax(200px,1.5fr)_70px_105px_88px_64px] items-center gap-3 py-3.5">
            <div className="flex min-w-0 items-center gap-3">
              <img src={item.image} alt={item.name} className="h-14 w-[80px] shrink-0 rounded-lg object-cover" />
              <div className="min-w-0">
                <strong className="block truncate text-sm font-extrabold text-text-main">{item.name}</strong>
                <span className="mt-1 flex items-center gap-1 truncate text-xs text-text-muted">
                  <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.8">
                    <path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z" /><circle cx="12" cy="10" r="2.5" />
                  </svg>
                  {item.city}
                </span>
              </div>
            </div>
            <div><span className="block text-xs text-text-muted">Bookings</span><strong className="mt-1 block text-sm text-text-main">{item.bookings}</strong></div>
            <div><span className="block text-xs text-text-muted">Revenue</span><strong className="mt-1 block text-sm text-text-main">{item.revenue}</strong></div>
            <div><span className="block text-xs text-text-muted">Rating</span><strong className="mt-1 flex items-center gap-1 text-sm text-text-main"><span className="text-warning">★</span>{item.rating}<small className="font-normal text-text-muted">({item.reviews})</small></strong></div>
            <div><span className="block text-xs text-text-muted">Status</span><span className="mt-1 inline-flex rounded-md bg-success-soft px-3 py-1 text-xs font-bold text-success">Active</span></div>
          </div>
        ))}
      </div>
    </Card>
  );
}

function RecentBookings() {
  const bookings = [
    { id: "#FSB-78921", guest: "Rohit Sharma", phone: "+91 98765 43210", property: "Rustic Greens Farmhouse", city: "Nashik", checkin: "24 May 2024", checkout: "26 May 2024", guests: "6", amount: "₹24,500", status: "Confirmed", avatar: avatars[0] },
    { id: "#FSB-78920", guest: "Priya Mehta", phone: "+91 87654 32109", property: "The Lakeview Villa", city: "Udaipur", checkin: "25 May 2024", checkout: "27 May 2024", guests: "4", amount: "₹31,800", status: "Upcoming", avatar: avatars[1] },
    { id: "#FSB-78919", guest: "Amit Verma", phone: "+91 76543 21098", property: "Hilltop Resort & Spa", city: "Coorg", checkin: "23 May 2024", checkout: "25 May 2024", guests: "2", amount: "₹18,900", status: "Checked-in", avatar: avatars[2] },
    { id: "#FSB-78918", guest: "Neha Kapoor", phone: "+91 65432 10987", property: "Green Valley Homestay", city: "Manali", checkin: "20 May 2024", checkout: "22 May 2024", guests: "5", amount: "₹22,000", status: "Completed", avatar: avatars[3] },
    { id: "#FSB-78917", guest: "Vikram Joshi", phone: "+91 54321 09876", property: "Rustic Greens Farmhouse", city: "Nashik", checkin: "18 May 2024", checkout: "19 May 2024", guests: "3", amount: "₹12,750", status: "Cancelled", avatar: avatars[0] },
  ];

  return (
    // <Card className="overflow-hidden">
    //   <CardHeader title="Recent Bookings" action={<ViewAllLink to="/vendor/bookings" label="View all bookings" />} />
    //   <div className="mt-3 overflow-x-auto">
    //     <table className="w-full min-w-[760px] border-collapse">
    //       <thead>
    //         <tr className="border-y border-border bg-surface-soft">
    //           {["Booking ID", "Guest", "Property", "Check-in", "Check-out", "Guests", "Amount", "Status"].map((heading) => (
    //             <th key={heading} className="px-4 py-2.5 text-left text-xs font-extrabold text-text-muted">{heading}</th>
    //           ))}
    //         </tr>
    //       </thead>
    //       <tbody className="divide-y divide-border">
    //         {bookings.map((booking) => (
    //           <tr key={booking.id} className="hover:bg-surface-soft">
    //             <td className="px-4 py-3 text-xs font-extrabold text-primary-700">{booking.id}</td>
    //             <td className="px-4 py-3">
    //               <div className="flex items-center gap-2.5">
    //                 <img src={booking.avatar} alt={booking.guest} className="h-8 w-8 rounded-full object-cover" />
    //                 <div><strong className="block text-xs text-text-main">{booking.guest}</strong><span className="text-xs text-text-muted">{booking.phone}</span></div>
    //               </div>
    //             </td>
    //             <td className="px-4 py-3"><strong className="block max-w-[140px] truncate text-xs text-text-secondary">{booking.property}</strong><span className="text-xs text-text-muted">{booking.city}</span></td>
    //             <td className="px-4 py-3 text-xs text-text-secondary">{booking.checkin}</td>
    //             <td className="px-4 py-3 text-xs text-text-secondary">{booking.checkout}</td>
    //             <td className="px-4 py-3 text-center text-xs text-text-secondary">{booking.guests}</td>
    //             <td className="px-4 py-3 text-xs font-bold text-text-main">{booking.amount}</td>
    //             <td className="px-4 py-3"><StatusBadge status={booking.status} /></td>
    //           </tr>
    //         ))}
    //       </tbody>
    //     </table>
    //   </div>
    // </Card>
     <Card className="overflow-hidden">
      <CardHeader
        title="Recent Bookings"
        action={<ViewAllLink to="/admin/bookings" />}
      />
      <div className="mt-3 overflow-x-auto">
        <table className="w-full min-w-[720px] border-collapse">
          <thead>
            <tr className="border-y border-border bg-surface-soft">
              {[
                "Booking ID",
                "Guest",
                "Property",
                // "Type",
                "City",
                "Check-in",
                "Amount",
                "Status",
              ].map((heading) => (
                <th
                  key={heading}
                  className="px-4 py-2.5 text-left text-xs font-extrabold text-text-muted"
                >
                  {heading}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {bookings.map((booking) => (
              <tr key={booking.id} className="hover:bg-surface-soft">
                <td className="px-4 py-3 text-xs font-extrabold text-primary-700">
                  {booking.id}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                 <img
                      src={booking.avatar}
                      alt={booking.property}
                      className="h-8 w-10 rounded object-cover"
                    />
                    <span className="text-xs font-semibold text-text-main">
                      {booking.guest}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    {/* <img
                      src={booking.avatar}
                      alt={booking.property}
                      className="h-8 w-10 rounded object-cover"
                    /> */}
                    <span className="max-w-32 truncate text-xs text-text-secondary">
                      {booking.property}
                    </span>
                  </div>
                </td>
                {/* <td className="px-4 py-3 text-xs text-text-secondary">
                  {booking.type}
                </td> */}
                <td className="px-4 py-3 text-xs text-text-secondary">
                  {booking.city}
                </td>
                <td className="px-4 py-3 text-xs text-text-secondary">
                  {booking.checkin}
                </td>
                <td className="px-4 py-3 text-xs font-bold text-text-main">
                  {booking.amount}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`rounded-md px-2.5 py-1 text-xs font-bold ${
                      booking.status === "Confirmed" ||
                      booking.status === "Completed"
                        ? "bg-success-soft text-success"
                        : booking.status === "Upcoming"
                        ? "bg-info-soft text-info"
                        : "bg-purple-soft text-purple"
                    }`}
                  >
                    {booking.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function CalendarSnapshot() {
  const days = [
    ["29", "muted"], ["30", "muted"], ["1", ""], ["2", ""], ["3", ""], ["4", ""], ["5", ""],
    ["6", ""], ["7", ""], ["8", ""], ["9", ""], ["10", ""], ["11", ""], ["12", ""],
    ["13", "available"], ["14", "available"], ["15", ""], ["16", "booked"], ["17", "booked"], ["18", "booked"], ["19", "booked"],
    ["20", ""], ["21", ""], ["22", ""], ["23", ""], ["24", ""], ["25", "available"], ["26", "available"],
    ["27", ""], ["28", ""], ["29", ""], ["30", ""], ["31", ""], ["1", "muted"], ["2", "muted"],
  ];

  return (
    <Card>
      <CardHeader title="Calendar Snapshot" action={<select className="h-8 rounded-md border border-border bg-surface px-3 text-xs text-text-secondary outline-none"><option>This Month</option></select>} />
      <div className="p-5 pt-3">
        <div className="grid grid-cols-7 text-center text-xs font-bold text-text-muted">
          {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => <span key={day}>{day}</span>)}
        </div>
        <div className="mt-3 grid grid-cols-7 gap-y-1.5 text-center text-sm">
          {days.map(([day, state], index) => (
            <span
              key={`${day}-${index}`}
              className={`mx-auto grid h-7 w-full max-w-[38px] place-items-center rounded-md text-sm ${
                state === "available" ? "bg-success-soft font-bold text-success" :
                state === "booked" ? "bg-danger-soft font-bold text-danger" :
                state === "muted" ? "text-text-soft" : "text-text-secondary"
              }`}
            >{day}</span>
          ))}
        </div>
        <div className="mt-4 flex items-center justify-center gap-5 border-t border-border pt-3.5 text-xs text-text-muted">
          <span className="flex items-center gap-1.5"><i className="h-3 w-3 rounded-sm bg-chart-green" />Available</span>
          <span className="flex items-center gap-1.5"><i className="h-3 w-3 rounded-sm bg-chart-red-soft" />Booked</span>
          <span className="flex items-center gap-1.5"><i className="h-3 w-3 rounded-sm bg-chart-gray" />Blocked</span>
        </div>
      </div>
    </Card>
  );
}

function UpcomingCheckins() {
  const items = [
    { name: "Rohit Sharma", time: "24 May 2024 • 2:00 PM", property: "Rustic Greens Farmhouse", guests: "6 Guests", image: propertyImages[0] },
    { name: "Amit Verma", time: "23 May 2024 • 1:00 PM", property: "Hilltop Resort & Spa", guests: "2 Guests", image: propertyImages[2] },
    { name: "Sneha Iyer", time: "25 May 2024 • 3:00 PM", property: "The Lakeview Villa", guests: "4 Guests", image: propertyImages[1] },
  ];

  return (
    <Card>
      <CardHeader title="Upcoming Check-ins" action={<ViewAllLink to="/vendor/bookings" />} />
      <div className="mt-3 divide-y divide-border px-4">
        {items.map((item) => (
          <div key={item.name} className="flex items-center gap-3 py-3">
            <img src={item.image} alt={item.property} className="h-12 w-16 shrink-0 rounded-lg object-cover" />
            <div className="min-w-0 flex-1"><strong className="block truncate text-sm text-text-main">{item.name}</strong><span className="mt-0.5 block truncate text-xs text-text-muted">{item.time}</span><span className="block truncate text-xs text-text-secondary">{item.property}</span></div>
            <span className="rounded-full bg-success-soft px-3 py-1 text-xs font-bold text-success">{item.guests}</span>
          </div>
        ))}
      </div>
    </Card>
  );
}

function EarningsPayouts() {
  return (
    <Card>
      <CardHeader title="Earnings & Payouts" action={<ViewAllLink to="/vendor/payouts" />} />
      <div className="mt-3 grid grid-cols-3 divide-x divide-border border-y border-border px-2 py-4">
        <div className="px-3"><span className="block text-xs text-text-muted">Pending Payout</span><strong className="mt-1 block text-lg text-text-main">₹1,85,320</strong><span className="mt-2 grid h-7 w-7 place-items-center rounded-md bg-warning-soft text-sm text-warning">₹</span></div>
        <div className="px-3"><span className="block text-xs text-text-muted">Paid This Month</span><strong className="mt-1 block text-lg text-text-main">₹6,42,750</strong><span className="mt-2 grid h-7 w-7 place-items-center rounded-md bg-success-soft text-sm text-success">₹</span></div>
        <div className="px-3"><span className="block text-xs text-text-muted">Next Settlement</span><strong className="mt-1 block text-sm text-text-main">03 Jun 2024</strong><span className="mt-2 grid h-7 w-7 place-items-center rounded-md bg-danger-soft text-sm text-danger">▣</span></div>
      </div>
      <div className="px-4 py-3">
        <strong className="text-xs text-text-main">Recent Payouts</strong>
        <div className="mt-2.5 space-y-2.5">
          {[["02 May 2024", "₹1,72,430"], ["18 Apr 2024", "₹1,58,230"], ["04 Apr 2024", "₹1,36,880"]].map(([date, amount]) => (
            <div key={date} className="flex items-center gap-2 text-xs"><span className="flex-1 text-text-secondary">{date}</span><strong className="text-text-main">{amount}</strong><span className="rounded bg-success-soft px-2.5 py-0.5 text-xs font-bold text-success">Paid</span></div>
          ))}
        </div>
      </div>
      <div className="border-t border-border px-4 py-2.5 text-center"><ViewAllLink to="/vendor/payouts" label="View all payouts" /></div>
    </Card>
  );
}

function GuestReviews() {
  const reviews = [
    { name: "Rohit Sharma", date: "May 2024", rating: "5.0", review: "Amazing stay! The property was beautiful and the host was very hospitable.", avatar: avatars[0], image: propertyImages[0] },
    { name: "Priya Mehta", date: "May 2024", rating: "4.5", review: "Lovely place with great amenities. Perfect for a family getaway.", avatar: avatars[1], image: propertyImages[1] },
    { name: "Amit Verma", date: "Apr 2024", rating: "5.0", review: "Excellent experience. Will definitely visit again!", avatar: avatars[2], image: propertyImages[2] },
  ];

  return (
    <Card>
      <CardHeader title="Guest Reviews" action={<ViewAllLink to="/vendor/reviews" />} />
      <div className="mt-3 divide-y divide-border px-4">
        {reviews.map((item) => (
          <div key={item.name} className="flex gap-3 py-3">
            <img src={item.avatar} alt={item.name} className="h-8 w-8 rounded-full object-cover" />
            <div className="min-w-0 flex-1"><div className="flex items-center justify-between gap-2"><div><strong className="block text-sm text-text-main">{item.name}</strong><span className="text-xs text-text-muted">{item.date}</span></div><span className="text-sm font-bold text-text-main"><i className="mr-1 text-warning">★</i>{item.rating}</span></div><p className="mt-1 line-clamp-2 text-xs leading-4 text-text-secondary">{item.review}</p></div>
            <img src={item.image} alt="Property" className="h-10 w-12 rounded-md object-cover" />
          </div>
        ))}
      </div>
    </Card>
  );
}

function Messages() {
  const messages = [
    { name: "Rohit Sharma", text: "New booking inquiry", time: "2m ago", count: "2", avatar: avatars[0] },
    { name: "Priya Mehta", text: "Special request for booking", time: "15m ago", count: "1", avatar: avatars[1] },
    { name: "Amit Verma", text: "Change in check-in time", time: "1h ago", count: "1", avatar: avatars[2] },
    { name: "FarmStayGo Support", text: "Verification documents", time: "3h ago", count: "4", avatar: "" },
  ];

  return (
    <Card>
      <CardHeader title="Messages (8 Unread)" action={<ViewAllLink to="/vendor/messages" />} />
      <div className="mt-3 divide-y divide-border px-4">
        {messages.map((item) => (
          <div key={item.name} className="flex items-center gap-3 py-3">
            {item.avatar ? <img src={item.avatar} alt={item.name} className="h-9 w-9 rounded-full object-cover" /> : <span className="grid h-9 w-9 place-items-center rounded-full bg-primary-700 text-white"><svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M3 11 12 4l9 7" /><path d="M5 10v10h14V10" /></svg></span>}
            <div className="min-w-0 flex-1"><strong className="block truncate text-sm text-text-main">{item.name}</strong><span className="mt-0.5 block truncate text-xs text-text-muted">{item.text}</span></div>
            <span className="text-xs text-text-soft">{item.time}</span>
            <span className="grid h-5 min-w-5 place-items-center rounded-full bg-primary-700 px-1.5 text-xs font-bold text-white">{item.count}</span>
          </div>
        ))}
      </div>
    </Card>
  );
}

function ListingProgress() {
  const steps = [
    { label: "Basic Info", done: true, number: "✓" },
    { label: "Location", done: true, number: "✓" },
    { label: "Images", done: true, number: "✓" },
    { label: "Pricing & Availability", active: true, number: "4" },
    { label: "Amenities", number: "5" },
    { label: "Review & Submit", number: "6" },
  ];

  return (
    <Card className="px-6 py-5">
      <div className="flex flex-wrap items-center gap-1.5 text-sm font-extrabold text-text-main">
        <span>Complete Your Listing</span><span className="text-primary-700">– Rustic Greens Farmhouse</span>
      </div>
      <div className="mt-5 overflow-x-auto pb-1">
        <div className="relative flex min-w-[720px] items-start justify-between">
          <div className="absolute left-[6%] right-[6%] top-[16px] h-[2.5px] bg-border" />
          <div className="absolute left-[6%] top-[16px] h-[2.5px] w-[49%] bg-primary-700" />
          {steps.map((step) => (
            <div key={step.label} className="relative z-10 flex w-1/6 flex-col items-center text-center">
              <span className={`grid h-8 w-8 place-items-center rounded-full border-2 text-sm font-extrabold ${step.done ? "border-primary-700 bg-primary-700 text-white" : step.active ? "border-primary-700 bg-surface text-primary-700" : "border-border-strong bg-surface text-text-muted"}`}>{step.number}</span>
              <span className={`mt-2 text-xs font-semibold ${step.active ? "text-primary-700" : "text-text-secondary"}`}>{step.label}</span>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}

export default function VendorDashboardPage() {
  return (
    <div className="space-y-4">
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {stats.map((item) => <StatCard key={item.title} item={item} />)}
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.15fr_1.25fr]">
        <RevenueBookingsOverview />
        <PropertyPerformance />
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.38fr_0.72fr_0.78fr]">
        <RecentBookings />
        <CalendarSnapshot />
        <UpcomingCheckins />
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <EarningsPayouts />
        <GuestReviews />
        <Messages />
      </section>

      <ListingProgress />

      <div className="rounded-control border border-warning/30 bg-warning-soft px-4 py-2.5 text-xs font-semibold text-warning">
        Vendor dashboard data is currently static for UI development. Replace these values with live API data later.
      </div>
    </div>
  );
}