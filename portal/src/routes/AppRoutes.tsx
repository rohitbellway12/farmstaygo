import {
  Navigate,
  Route,
  Routes,
} from "react-router-dom";

import ProtectedRoute from "../shared/components/ProtectedRoute";
import NotFoundPage from "../shared/components/NotFoundPage";

import AdminLoginPage from "../admin/pages/LoginPage";
import AdminDashboardPage from "../admin/pages/DashboardPage";
import AdminLayout from "../admin/layouts/AdminLayout";
import PropertyCategoriesPage from "../admin/pages/PropertyCategoriesPage";
import AmenitiesPage from "../admin/pages/AmenitiesPage";
import PropertyApprovalsPage from "../admin/pages/PropertyApprovalsPage";
import PropertyApprovalReviewPage from "../admin/pages/PropertyApprovalReviewPage";
import AdminPropertiesPage from "../admin/pages/PropertiesPage";
import VendorsPage from "../admin/pages/VendorsPage";
import UsersPage from "../admin/pages/UsersPage";

import VendorLoginPage from "../vendor/pages/LoginPage";
import VendorRegisterPage from "../vendor/pages/RegisterPage";
import VendorDashboardPage from "../vendor/pages/DashboardPage";
import VendorLayout from "../vendor/layouts/VendorLayout";

import VendorPropertiesPage from "../vendor/pages/PropertiesPage";
import AddPropertyPage from "../vendor/pages/AddPropertyPage";
import RoomInventoryPage from "../vendor/pages/RoomInventoryPage";
import RoomFormPage from "../vendor/pages/RoomFormPage";
import AvailabilityCalendarPage from "../vendor/pages/AvailabilityCalendarPage";


function ModulePlaceholder({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <section className="rounded-dashboard-card border border-border bg-surface p-5 shadow-dashboard-card">
      <h1 className="text-ui-xl font-extrabold text-text-main">
        {title}
      </h1>

      {description && (
        <p className="mt-1 text-ui-sm text-text-muted">
          {description}
        </p>
      )}
    </section>
  );
}

export default function AppRoutes() {
  return (
    <Routes>
      {/* Default Route */}
      <Route
        path="/"
        element={
          <Navigate
            to="/admin/login"
            replace
          />
        }
      />

      {/* Public Authentication Routes */}
      <Route
        path="/admin/login"
        element={<AdminLoginPage />}
      />

      <Route
        path="/vendor/login"
        element={<VendorLoginPage />}
      />

      <Route
        path="/vendor/register"
        element={<VendorRegisterPage />}
      />

      {/* Admin Protected Routes */}
      <Route
        element={
          <ProtectedRoute
            allowedRoles={[
              "ADMIN",
              "STAFF_ADMIN",
              "SUPPORT",
            ]}
            redirectTo="/admin/login"
          />
        }
      >
        <Route
          path="/admin"
          element={<AdminLayout />}
        >
          <Route
            index
            element={
              <Navigate
                to="dashboard"
                replace
              />
            }
          />

          <Route
            path="dashboard"
            element={<AdminDashboardPage />}
          />

          <Route
            path="users"
            element={<UsersPage />}
          />

          <Route
            path="vendors"
            element={<VendorsPage />}
          />

          <Route
            path="property-approvals"
            element={<PropertyApprovalsPage />}
          />

<Route
  path="property-approvals/:id"
  element={<PropertyApprovalReviewPage />}
/>

          <Route
  path="property-categories"
  element={<PropertyCategoriesPage />}
/>

<Route
  path="amenities"
  element={<AmenitiesPage />}
/>


         <Route
  path="properties"
  element={<AdminPropertiesPage />}
/>

          <Route
            path="bookings"
            element={
              <ModulePlaceholder
                title="Bookings"
                description="View and manage platform bookings."
              />
            }
          />

          <Route
            path="payments"
            element={
              <ModulePlaceholder
                title="Payments"
                description="Manage payments and settlements."
              />
            }
          />

          <Route
            path="commissions"
            element={
              <ModulePlaceholder
                title="Commissions"
                description="Manage platform commission records."
              />
            }
          />

          <Route
            path="coupons"
            element={
              <ModulePlaceholder
                title="Coupons"
                description="Manage promotional coupons and offers."
              />
            }
          />

          <Route
            path="cms"
            element={
              <ModulePlaceholder
                title="CMS"
                description="Manage website pages and content."
              />
            }
          />

          <Route
            path="reports"
            element={
              <ModulePlaceholder
                title="Reports"
                description="View platform reports and exports."
              />
            }
          />

          <Route
            path="analytics"
            element={
              <ModulePlaceholder
                title="Analytics"
                description="View business and platform analytics."
              />
            }
          />

          <Route
            path="notifications"
            element={
              <ModulePlaceholder
                title="Notifications"
                description="Manage platform notifications."
              />
            }
          />

          <Route
            path="support"
            element={
              <ModulePlaceholder
                title="Support Tickets"
                description="Manage customer and vendor support requests."
              />
            }
          />

          <Route
            path="settings"
            element={
              <ModulePlaceholder
                title="Settings"
                description="Manage platform configuration."
              />
            }
          />
        </Route>
      </Route>

      {/* Vendor Protected Routes */}
      <Route
        element={
          <ProtectedRoute
            allowedRoles={["VENDOR"]}
            redirectTo="/vendor/login"
          />
        }
      >
        <Route
          path="/vendor"
          element={<VendorLayout />}
        >
          <Route
            index
            element={
              <Navigate
                to="dashboard"
                replace
              />
            }
          />
          
         

          <Route
            path="dashboard"
            element={<VendorDashboardPage />}
          />

        <Route
  path="properties"
  element={<VendorPropertiesPage />}
/>

          <Route
  path="properties/new"
  element={<AddPropertyPage />}
/>

<Route
  path="properties/:id/edit"
  element={<AddPropertyPage />}
/>

<Route
  path="properties/:propertyId/rooms"
  element={<RoomInventoryPage />}
/>

<Route
  path="properties/:propertyId/rooms/new"
  element={<RoomFormPage />}
/>

<Route
  path="properties/:propertyId/rooms/:roomTypeId/edit"
  element={<RoomFormPage />}
/>

          <Route
            path="bookings"
            element={
              <ModulePlaceholder
                title="Bookings"
                description="Manage bookings for your properties."
              />
            }
          />

         <Route
  path="calendar"
  element={
    <AvailabilityCalendarPage />
  }
/>

          <Route
            path="pricing"
            element={
              <ModulePlaceholder
                title="Pricing"
                description="Manage property pricing and seasonal rates."
              />
            }
          />

          <Route
            path="earnings"
            element={
              <ModulePlaceholder
                title="Earnings"
                description="View your revenue and earning reports."
              />
            }
          />

          <Route
            path="payouts"
            element={
              <ModulePlaceholder
                title="Payouts"
                description="View payout status and settlement history."
              />
            }
          />

          <Route
            path="messages"
            element={
              <ModulePlaceholder
                title="Messages"
                description="Manage conversations with guests and support."
              />
            }
          />

          <Route
            path="reviews"
            element={
              <ModulePlaceholder
                title="Reviews"
                description="View and respond to guest reviews."
              />
            }
          />

          <Route
            path="coupons"
            element={
              <ModulePlaceholder
                title="Coupons & Offers"
                description="Create offers for your properties."
              />
            }
          />

          <Route
            path="kyc-bank"
            element={
              <ModulePlaceholder
                title="KYC & Bank Details"
                description="Manage verification and payout information."
              />
            }
          />

          <Route
            path="settings"
            element={
              <ModulePlaceholder
                title="Settings"
                description="Manage your vendor account settings."
              />
            }
          />
        </Route>
      </Route>

      {/* Global Not Found Route */}
      <Route
        path="*"
        element={<NotFoundPage />}
      />
    </Routes>
  );
}