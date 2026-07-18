import type { ReactNode } from "react";
import { Link } from "react-router-dom";

interface StatItem {
  title: string;
  value: string;
  change: string;
  icon: ReactNode;
  iconClass: string;
}

const propertyImages = [
  "https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?auto=format&fit=crop&w=300&q=80",
  "https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?auto=format&fit=crop&w=300&q=80",
  "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=300&q=80",
  "https://images.unsplash.com/photo-1600047509807-ba8f99d2cdde?auto=format&fit=crop&w=300&q=80",
];

const bookingBars = [
  35, 48, 70, 62, 43, 78, 54, 84, 65, 35, 72, 46,
  55, 81, 63, 90, 67, 49, 82, 58, 88, 76, 53, 69,
  91, 62, 78, 54,
];

const bookingLinePoints = [
  "0,118",
  "22,102",
  "44,108",
  "66,65",
  "88,55",
  "110,73",
  "132,94",
  "154,84",
  "176,40",
  "198,58",
  "220,92",
  "242,103",
  "264,79",
  "286,70",
  "308,45",
  "330,62",
  "352,85",
  "374,90",
  "396,71",
  "418,37",
  "440,48",
  "462,88",
  "484,74",
  "506,46",
  "528,68",
  "550,81",
  "572,63",
  "594,44",
].join(" ");

const revenuePoints = [
  "0,135",
  "28,110",
  "56,75",
  "84,95",
  "112,59",
  "140,83",
  "168,48",
  "196,72",
  "224,39",
  "252,88",
  "280,64",
  "308,101",
  "336,67",
  "364,53",
  "392,25",
  "420,41",
  "448,18",
  "476,38",
  "504,29",
].join(" ");

const stats: StatItem[] = [
  {
    title: "Total Users",
    value: "124,568",
    change: "↑ 12.5% vs last month",
    iconClass: "bg-success-soft text-success",
    icon: (
      <svg
        viewBox="0 0 24 24"
        className="h-6 w-6"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
      >
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M19 8v6" />
        <path d="M22 11h-6" />
      </svg>
    ),
  },
  {
    title: "Total Vendors",
    value: "2,845",
    change: "↑ 8.4% vs last month",
    iconClass: "bg-info-soft text-info",
    icon: (
      <svg
        viewBox="0 0 24 24"
        className="h-6 w-6"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
      >
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M17 11a4 4 0 0 0 0-8" />
        <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      </svg>
    ),
  },
  {
    title: "Total Properties",
    value: "6,892",
    change: "↑ 10.2% vs last month",
    iconClass: "bg-warning-soft text-warning",
    icon: (
      <svg
        viewBox="0 0 24 24"
        className="h-6 w-6"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
      >
        <path d="M3 11 12 4l9 7" />
        <path d="M5 10v10h14V10" />
        <path d="M9 20v-6h6v6" />
      </svg>
    ),
  },
  {
    title: "Total Bookings",
    value: "18,734",
    change: "↑ 15.6% vs last month",
    iconClass: "bg-chart-red-soft text-chart-red",
    icon: (
      <svg
        viewBox="0 0 24 24"
        className="h-6 w-6"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
      >
        <rect x="3" y="5" width="18" height="16" rx="2" />
        <path d="M8 3v4" />
        <path d="M16 3v4" />
        <path d="M3 10h18" />
        <circle cx="16" cy="16" r="3" />
      </svg>
    ),
  },
  {
    title: "Platform Revenue",
    value: "₹8.47 Cr",
    change: "↑ 18.7% vs last month",
    iconClass: "bg-purple-soft text-purple",
    icon: (
      <svg
        viewBox="0 0 24 24"
        className="h-6 w-6"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
      >
        <rect x="3" y="5" width="18" height="14" rx="2" />
        <path d="M3 10h18" />
        <path d="M8 15h4" />
      </svg>
    ),
  },
  {
    title: "Commission Earned",
    value: "₹1.27 Cr",
    change: "↑ 16.3% vs last month",
    iconClass: "bg-danger-soft text-danger",
    icon: (
      <svg
        viewBox="0 0 24 24"
        className="h-6 w-6"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
      >
        <circle cx="8" cy="8" r="3" />
        <circle cx="16" cy="16" r="3" />
        <path d="m18 6-12 12" />
      </svg>
    ),
  },
];

function Card({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`rounded-dashboard-card border border-border bg-surface shadow-dashboard-card ${className}`}
    >
      {children}
    </section>
  );
}

function CardHeader({
  title,
  badge,
  action,
}: {
  title: string;
  badge?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3 px-5 pt-5">
      <div className="flex items-center gap-2">
        <h2 className="text-sm font-extrabold text-text-main">
          {title}
        </h2>
        {badge}
      </div>
      {action}
    </div>
  );
}

function ViewAllLink({ to = "#" }: { to?: string }) {
  return (
    <Link
      to={to}
      className="text-xs font-extrabold text-primary-700 hover:text-primary-900"
    >
      View all
    </Link>
  );
}

function StatCard({ item }: { item: StatItem }) {
  return (
    <Card className="relative overflow-hidden p-5">
      <div className="flex items-center gap-4">
        <span
          className={`grid h-12 w-12 shrink-0 place-items-center rounded-full ${item.iconClass}`}
        >
          {item.icon}
        </span>
        <div className="min-w-0">
          <span className="block truncate text-sm font-semibold text-text-muted">
            {item.title}
          </span>
          <strong className="mt-1 block truncate text-2xl font-extrabold leading-none text-text-main">
            {item.value}
          </strong>
          <span className="mt-1.5 block truncate text-xs font-bold text-success">
            {item.change}
          </span>
        </div>
      </div>
    </Card>
  );
}

function BookingOverview() {
  return (
    <Card className="min-h-[260px]">
      <CardHeader
        title="Bookings Overview"
        action={
          <div className="flex items-center rounded-lg border border-border bg-surface-muted p-1">
            {["7D", "30D", "90D", "1Y"].map((item) => (
              <button
                type="button"
                key={item}
                className={`rounded-md px-3 py-1 text-xs font-bold ${
                  item === "30D"
                    ? "bg-primary-50 text-primary-700"
                    : "text-text-muted"
                }`}
              >
                {item}
              </button>
            ))}
          </div>
        }
      />
      <div className="mt-3 flex items-center gap-4 px-5 text-xs font-semibold text-text-muted">
        <span className="flex items-center gap-1.5">
          <i className="h-2.5 w-2.5 rounded-full bg-chart-green" />
          Bookings
        </span>
        <span className="flex items-center gap-1.5">
          <i className="h-2.5 w-2.5 rounded-full bg-chart-blue" />
          Revenue (₹)
        </span>
      </div>
      <div className="relative mt-2 h-[170px] px-5 pb-3">
        <div className="absolute inset-x-5 inset-y-0 flex flex-col justify-between">
          {[1, 2, 3, 4].map((line) => (
            <div key={line} className="border-t border-dashed border-border" />
          ))}
        </div>
        <div className="absolute inset-x-5 bottom-6 top-2 flex items-end gap-[5px]">
          {bookingBars.map((value, index) => (
            <div
              key={index}
              className="flex-1 rounded-t-sm bg-gradient-to-t from-chart-green to-chart-green-light"
              style={{
                height: `${value}%`,
                opacity: index % 4 === 0 ? 1 : 0.8,
              }}
            />
          ))}
        </div>
        <svg
          viewBox="0 0 600 150"
          preserveAspectRatio="none"
          className="absolute inset-x-5 top-2 h-[125px] w-[calc(100%-40px)]"
        >
          <polyline
            points={bookingLinePoints}
            fill="none"
            stroke="var(--color-chart-blue)"
            strokeWidth="3"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        </svg>
        <div className="absolute inset-x-5 bottom-0 flex justify-between text-xs text-text-soft">
          <span>Apr 20</span>
          <span>Apr 25</span>
          <span>Apr 30</span>
          <span>May 5</span>
          <span>May 10</span>
          <span>May 15</span>
          <span>May 20</span>
        </div>
      </div>
    </Card>
  );
}

function RevenueTrend() {
  return (
    <Card className="min-h-[260px]">
      <CardHeader title="Revenue Trend" />
      <p className="px-5 pt-1 text-xs text-text-muted">By day</p>
      <div className="relative mt-4 h-[175px] px-5 pb-4">
        <div className="absolute inset-x-5 inset-y-0 flex flex-col justify-between">
          {[1, 2, 3, 4].map((line) => (
            <div key={line} className="border-t border-dashed border-border" />
          ))}
        </div>
        <svg
          viewBox="0 0 510 150"
          preserveAspectRatio="none"
          className="absolute inset-x-5 top-1 h-[135px] w-[calc(100%-40px)]"
        >
          <defs>
            <linearGradient id="revenueArea" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="var(--color-chart-green)" stopOpacity="0.22" />
              <stop offset="100%" stopColor="var(--color-chart-green)" stopOpacity="0" />
            </linearGradient>
          </defs>
          <polygon points={`0,150 ${revenuePoints} 504,150`} fill="url(#revenueArea)" />
          <polyline
            points={revenuePoints}
            fill="none"
            stroke="var(--color-chart-green)"
            strokeWidth="3"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        </svg>
        <div className="absolute inset-x-5 bottom-0 flex justify-between text-xs text-text-soft">
          <span>Apr 20</span>
          <span>Apr 27</span>
          <span>May 4</span>
          <span>May 11</span>
          <span>May 18</span>
        </div>
      </div>
    </Card>
  );
}

function PropertyApprovals() {
  const items = [
    {
      name: "Rustic Greens Farmhouse",
      details: "Farmhouse • 4 BHK • Nashik, MH",
      vendor: "GreenStays Pvt. Ltd.",
      time: "2h ago",
      image: propertyImages[0],
    },
    {
      name: "The Lakeview Villa",
      details: "Villa • 5 BHK • Udaipur, RJ",
      vendor: "Lakeview Hospitality",
      time: "5h ago",
      image: propertyImages[1],
    },
    {
      name: "Hilltop Resort & Spa",
      details: "Resort • 24 Rooms • Coorg, KA",
      vendor: "Hilltop Retreats",
      time: "8h ago",
      image: propertyImages[2],
    },
  ];

  return (
    <Card className="min-h-[260px]">
      <CardHeader
        title="Property Approvals"
        badge={
          <span className="rounded-md bg-danger-soft px-2.5 py-1 text-xs font-bold text-danger">
            23 Pending
          </span>
        }
        action={<ViewAllLink to="/admin/property-approvals" />}
      />
      <div className="mt-3 divide-y divide-border px-4">
        {items.map((item) => (
          <div key={item.name} className="flex items-center gap-3 py-3">
            <img
              src={item.image}
              alt={item.name}
              className="h-[56px] w-[72px] shrink-0 rounded-lg object-cover"
            />
            <div className="min-w-0 flex-1">
              <strong className="block truncate text-sm font-extrabold text-text-main">
                {item.name}
              </strong>
              <span className="mt-0.5 block truncate text-xs text-text-secondary">
                {item.details}
              </span>
              <span className="mt-0.5 block truncate text-xs text-text-muted">
                Submitted by {item.vendor}
              </span>
              <span className="block text-xs text-text-soft">Submitted: {item.time}</span>
            </div>
            <div className="grid shrink-0 gap-1.5">
              <button
                type="button"
                className="h-7 rounded-md border border-primary-300 px-3.5 text-xs font-bold text-primary-700 hover:bg-primary-50"
              >
                Review
              </button>
              <button
                type="button"
                className="h-7 rounded-md border border-danger/40 px-3.5 text-xs font-bold text-danger hover:bg-danger-soft"
              >
                Reject
              </button>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

function VendorVerification() {
  const vendors = [
    ["GreenStays Pvt. Ltd.", "Mumbai, MH"],
    ["Serene Escapes", "Bengaluru, KA"],
    ["Wanderer Holidays", "Pune, MH"],
    ["Nature's Nook Stays", "Dehradun, UK"],
  ];

  return (
    <Card className="min-h-[225px]">
      <CardHeader
        title="Vendor Verification (KYC)"
        badge={
          <span className="rounded-md bg-warning-soft px-2.5 py-1 text-xs font-bold text-warning">
            14 Pending
          </span>
        }
        action={<ViewAllLink to="/admin/vendors" />}
      />
      <div className="mt-3 divide-y divide-border px-4">
        {vendors.map(([name, city], index) => (
          <div key={name} className="flex items-center gap-3 py-2.5">
            <img
              src={propertyImages[index]}
              alt={name}
              className="h-9 w-9 rounded-lg object-cover"
            />
            <div className="min-w-0 flex-1">
              <strong className="block truncate text-sm font-bold text-text-main">
                {name}
              </strong>
              <span className="block text-xs text-text-muted">{city}</span>
            </div>
            <span className="rounded-md bg-warning-soft px-2.5 py-1 text-xs font-bold text-warning">
              Pending
            </span>
          </div>
        ))}
      </div>
    </Card>
  );
}

function PaymentsSettlements() {
  return (
    <Card className="min-h-[225px]">
      <CardHeader
        title="Payments & Settlements"
        action={<ViewAllLink to="/admin/payments" />}
      />
      <div className="mt-3 grid grid-cols-2 gap-3 px-4">
        <div className="rounded-lg bg-primary-50 p-4">
          <span className="text-xs text-text-muted">Pending Settlements</span>
          <strong className="mt-1 block text-lg font-extrabold text-text-main">
            ₹2.84 Cr
          </strong>
          <span className="text-xs text-text-muted">24 payouts</span>
        </div>
        <div className="rounded-lg bg-success-soft p-4">
          <span className="text-xs text-text-muted">Paid This Month</span>
          <strong className="mt-1 block text-lg font-extrabold text-text-main">
            ₹5.62 Cr
          </strong>
          <span className="text-xs text-text-muted">128 payouts</span>
        </div>
      </div>
      <div className="px-4 pb-4 pt-3">
        <span className="block text-xs font-bold text-text-secondary">
          Recent Payouts
        </span>
        <div className="mt-2 space-y-2">
          {[
            ["GreenStays Pvt. Ltd.", "₹28.45 L"],
            ["Serene Escapes", "₹18.75 L"],
            ["Hilltop Retreats", "₹32.10 L"],
          ].map(([name, amount]) => (
            <div key={name} className="flex items-center gap-2 text-xs">
              <span className="h-5 w-5 rounded-full bg-primary-100" />
              <span className="min-w-0 flex-1 truncate text-text-secondary">
                {name}
              </span>
              <strong className="text-text-main">{amount}</strong>
              <span className="rounded bg-success-soft px-2 py-0.5 text-xs font-bold text-success">
                Paid
              </span>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}

function SupportTickets() {
  const items = [
    ["Refund & Cancellation", "12", "bg-danger-soft text-danger"],
    ["Property / Stay Related", "9", "bg-warning-soft text-warning"],
    ["Payment Issues", "7", "bg-info-soft text-info"],
    ["Account & KYC", "4", "bg-success-soft text-success"],
    ["Other Queries", "3", "bg-surface-muted text-text-muted"],
  ];

  return (
    <Card className="min-h-[225px]">
      <CardHeader
        title="Support Tickets"
        badge={
          <span className="rounded-md bg-danger-soft px-2.5 py-1 text-xs font-bold text-danger">
            35 Open
          </span>
        }
        action={<ViewAllLink to="/admin/support" />}
      />
      <div className="mt-3 divide-y divide-border px-4">
        {items.map(([label, count, classes]) => (
          <div key={label} className="flex items-center gap-3 py-2.5">
            <span
              className={`grid h-7 w-7 place-items-center rounded-md text-xs font-extrabold ${classes}`}
            >
              {count}
            </span>
            <span className="flex-1 text-xs font-semibold text-text-secondary">
              {label}
            </span>
            <strong className="text-xs text-text-main">{count}</strong>
          </div>
        ))}
      </div>
    </Card>
  );
}

function FraudAlerts() {
  const alerts = [
    ["Multiple bookings same card", "Booking ID: #BK98321", "High"],
    ["Suspicious vendor activity", "Vendor ID: #VND7721", "High"],
    ["Unusual refund requests", "Booking ID: #BK98112", "Medium"],
    ["Repeated failed payments", "User ID: #USR55621", "Low"],
  ];

  return (
    <Card className="min-h-[225px]">
      <CardHeader
        title="Fraud Detection & Alerts"
        badge={
          <span className="rounded-md bg-warning-soft px-2.5 py-1 text-xs font-bold text-warning">
            6 Alerts
          </span>
        }
        action={<ViewAllLink />}
      />
      <div className="mt-3 divide-y divide-border px-4">
        {alerts.map(([title, subtitle, level]) => (
          <div key={title} className="flex items-center gap-3 py-2.5">
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-md bg-danger-soft text-danger">
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 3 2 21h20Z" />
                <path d="M12 9v5" />
                <path d="M12 18h.01" />
              </svg>
            </span>
            <div className="min-w-0 flex-1">
              <strong className="block truncate text-sm font-bold text-text-main">
                {title}
              </strong>
              <span className="block truncate text-xs text-text-muted">{subtitle}</span>
            </div>
            <span
              className={`rounded px-2.5 py-1 text-xs font-bold ${
                level === "High"
                  ? "bg-danger-soft text-danger"
                  : level === "Medium"
                  ? "bg-warning-soft text-warning"
                  : "bg-info-soft text-info"
              }`}
            >
              {level}
            </span>
          </div>
        ))}
      </div>
    </Card>
  );
}

function RecentBookings() {
  const bookings = [
    {
      id: "#BK98321",
      guest: "Rohit Sharma",
      property: "Rustic Greens Farmhouse",
      type: "Entire Property",
      city: "Nashik, MH",
      checkin: "24 May 2024",
      amount: "₹38,500",
      status: "Confirmed",
      image: propertyImages[0],
    },
    {
      id: "#BK98320",
      guest: "Priya Mehta",
      property: "The Lakeview Villa",
      type: "Entire Property",
      city: "Udaipur, RJ",
      checkin: "25 May 2024",
      amount: "₹52,000",
      status: "Upcoming",
      image: propertyImages[1],
    },
    {
      id: "#BK98319",
      guest: "Amit Verma",
      property: "Hilltop Resort & Spa",
      type: "Room Booking",
      city: "Coorg, KA",
      checkin: "24 May 2024",
      amount: "₹15,600",
      status: "Checked-in",
      image: propertyImages[2],
    },
    {
      id: "#BK98318",
      guest: "Neha Kapoor",
      property: "Green Valley Homestay",
      type: "Room Booking",
      city: "Manali, HP",
      checkin: "23 May 2024",
      amount: "₹9,800",
      status: "Completed",
      image: propertyImages[3],
    },
  ];

  return (
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
                "Type",
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
                    <span className="grid h-7 w-7 place-items-center rounded-full bg-primary-100 text-xs font-bold text-primary-700">
                      {booking.guest
                        .split(" ")
                        .map((name) => name[0])
                        .join("")}
                    </span>
                    <span className="text-xs font-semibold text-text-main">
                      {booking.guest}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <img
                      src={booking.image}
                      alt={booking.property}
                      className="h-8 w-10 rounded object-cover"
                    />
                    <span className="max-w-32 truncate text-xs text-text-secondary">
                      {booking.property}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3 text-xs text-text-secondary">
                  {booking.type}
                </td>
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

function PropertyTypeDonut() {
  const items = [
    ["Farmhouse", "35% (6,557)", "bg-chart-green"],
    ["Villas", "28% (5,248)", "bg-chart-blue"],
    ["Resorts", "18% (3,374)", "bg-chart-cyan"],
    ["Homestays", "11% (2,061)", "bg-chart-purple"],
    ["Other Stays", "8% (1,494)", "bg-chart-gray"],
  ];

  return (
    <Card className="min-h-[240px]">
      <CardHeader
        title="Bookings by Property Type"
        action={
          <select className="h-8 rounded-md border border-border bg-surface px-3 text-xs text-text-muted outline-none">
            <option>This Month</option>
          </select>
        }
      />
      <div className="flex items-center justify-center gap-6 p-5">
        <div className="relative grid h-36 w-36 shrink-0 place-items-center rounded-full bg-[conic-gradient(var(--color-chart-green)_0_35%,var(--color-chart-blue)_35%_63%,var(--color-chart-cyan)_63%_81%,var(--color-chart-purple)_81%_92%,var(--color-chart-gray)_92%_100%)]">
          <div className="grid h-[92px] w-[92px] place-items-center rounded-full bg-surface text-center">
            <div>
              <strong className="block text-xl font-extrabold text-text-main">
                18,734
              </strong>
              <span className="text-xs font-semibold text-text-muted">Total</span>
            </div>
          </div>
        </div>
        <div className="min-w-0 flex-1 space-y-3">
          {items.map(([label, value, color]) => (
            <div key={label} className="flex items-center gap-2.5 text-xs">
              <span className={`h-2.5 w-2.5 rounded-full ${color}`} />
              <span className="min-w-0 flex-1 truncate text-text-secondary">
                {label}
              </span>
              <strong className="text-text-muted">{value}</strong>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}

function TopCities() {
  const cities = [
    ["Lonavala", "2,845"],
    ["Udaipur", "2,231"],
    ["Coorg", "1,987"],
    ["Mahabaleshwar", "1,642"],
    ["Jaipur", "1,420"],
  ];

  return (
    <Card className="min-h-[240px]">
      <CardHeader
        title="Top Cities by Bookings"
        action={
          <select className="h-8 rounded-md border border-border bg-surface px-3 text-xs text-text-muted outline-none">
            <option>This Month</option>
          </select>
        }
      />
      <div className="grid grid-cols-[1fr_0.9fr] gap-4 p-5">
        <div className="relative flex items-center justify-center">
          <svg viewBox="0 0 210 170" className="h-36 w-full">
            <path
              d="M88 8 112 23 123 43 147 52 139 71 154 89 144 105 130 110 126 135 108 161 92 151 78 128 58 121 45 97 56 76 44 58 61 39 69 18Z"
              fill="var(--color-primary-100)"
              stroke="var(--color-primary-200)"
              strokeWidth="2"
            />
            {[
              [88, 44],
              [62, 75],
              [107, 81],
              [95, 111],
            ].map(([cx, cy], index) => (
              <g key={index}>
                <circle cx={cx} cy={cy} r="8" fill="var(--color-primary-700)" />
                <circle cx={cx} cy={cy} r="3" fill="white" />
              </g>
            ))}
          </svg>
        </div>
        <div className="space-y-2.5">
          {cities.map(([city, count], index) => (
            <div key={city} className="flex items-center gap-2.5 text-xs">
              <span className="grid h-6 w-6 place-items-center rounded-md bg-primary-50 font-extrabold text-primary-700">
                {index + 1}
              </span>
              <span className="flex-1 font-semibold text-text-secondary">
                {city}
              </span>
              <strong className="text-text-main">{count}</strong>
            </div>
          ))}
        </div>
      </div>
      <div className="px-5 pb-3.5 text-right">
        <Link to="/admin/reports" className="text-xs font-extrabold text-primary-700">
          View full report →
        </Link>
      </div>
    </Card>
  );
}

function BottomSummary() {
  const items = [
    {
      title: "Active Offers",
      value: "24",
      subtitle: "Live coupons & deals",
      classes: "bg-primary-50 text-primary-700",
    },
    {
      title: "Total Coupons Used",
      value: "12,458",
      subtitle: "This month",
      classes: "bg-success-soft text-success",
    },
    {
      title: "Active CMS Pages",
      value: "48",
      subtitle: "Published pages",
      classes: "bg-purple-soft text-purple",
    },
    {
      title: "Scheduled Notifications",
      value: "7",
      subtitle: "Upcoming campaigns",
      classes: "bg-info-soft text-info",
    },
  ];

  return (
    <Card className="overflow-hidden">
      <div className="grid sm:grid-cols-2 xl:grid-cols-4">
        {items.map((item, index) => (
          <div
            key={item.title}
            className={`flex items-center gap-4 px-5 py-4 ${
              index > 0 ? "border-l border-border" : ""
            }`}
          >
            <span
              className={`grid h-11 w-11 place-items-center rounded-xl ${item.classes}`}
            >
              <svg
                viewBox="0 0 24 24"
                className="h-5 w-5"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
              >
                <path d="M4 9a2 2 0 0 0 0 4v6h16v-6a2 2 0 0 0 0-4V5H4Z" />
                <path d="M9 5v14" />
              </svg>
            </span>
            <div>
              <span className="block text-sm font-semibold text-text-muted">
                {item.title}
              </span>
              <strong className="mt-0.5 block text-xl font-extrabold text-text-main">
                {item.value}
              </strong>
              <span className="block text-xs text-text-muted">{item.subtitle}</span>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

export default function AdminDashboardPage() {
  return (
    <div className="space-y-4">
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {stats.map((item) => (
          <StatCard key={item.title} item={item} />
        ))}
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.65fr_1.05fr_1.28fr]">
        <BookingOverview />
        <RevenueTrend />
        <PropertyApprovals />
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <VendorVerification />
        <PaymentsSettlements />
        <SupportTickets />
        <FraudAlerts />
      </section>

      <section className="grid gap-4 xl:grid-cols-[2fr_0.88fr_1.08fr]">
        <RecentBookings />
        <PropertyTypeDonut />
        <TopCities />
      </section>

      <BottomSummary />

      <div className="rounded-control border border-warning/30 bg-warning-soft px-4 py-2.5 text-xs font-semibold text-warning">
        Dashboard data is currently static for UI development.
        It will be replaced with live API data later.
      </div>
    </div>
  );
}