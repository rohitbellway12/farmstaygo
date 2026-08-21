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
import PropertyRulesPage from "../admin/pages/PropertyRulesPage";
import AmenitiesPage from "../admin/pages/AmenitiesPage";
import PropertyApprovalsPage from "../admin/pages/PropertyApprovalsPage";
import PropertyApprovalReviewPage from "../admin/pages/PropertyApprovalReviewPage";
import AdminPropertiesPage from "../admin/pages/PropertiesPage";
import AdminBookingsPage from "../admin/pages/BookingsPage";
import VendorsPage from "../admin/pages/VendorsPage";
import UsersPage from "../admin/pages/UsersPage";
import AdminPaymentsPage from "../admin/pages/PaymentsPage";
import AdminCommissionsPage from "../admin/pages/CommissionsPage";
import ContactMessagesPage from "../admin/pages/ContactMessagesPage";
import FaqsPage from "../admin/pages/FaqsPage";
import SupportTicketsPage from "../admin/pages/SupportTicketsPage";
import SettingsPage from "../admin/pages/SettingsPage";
import ServiceCitiesPage from "../admin/pages/ServiceCitiesPage";
import CmsPagesPage, {
  CmsPageFormPage,
} from "../admin/pages/CmsPagesPage";
import BlogPage from "../admin/pages/BlogPage";
import BlogEditPage from "../admin/pages/BlogEditPage";
import NotificationListPage from "../shared/pages/NotificationListPage";
import ReportsPage from "../admin/pages/ReportsPage";
import AnalyticsPage from "../admin/pages/AnalyticsPage";

import VendorLoginPage from "../vendor/pages/LoginPage";
import VendorRegisterPage from "../vendor/pages/RegisterPage";
import VendorDashboardPage from "../vendor/pages/DashboardPage";
import VendorLayout from "../vendor/layouts/VendorLayout";

import VendorPropertiesPage from "../vendor/pages/PropertiesPage";
import VendorBookingsPage from "../vendor/pages/BookingsPage";
import VendorEarningsPage from "../vendor/pages/EarningsPage";
import VendorPayoutsPage from "../vendor/pages/PayoutsPage";
import AddPropertyPage from "../vendor/pages/AddPropertyPage";
import ManageRoomsPage from "../vendor/pages/ManageRoomsPage";
import RoomInventoryPage from "../vendor/pages/RoomInventoryPage";
import RoomFormPage from "../vendor/pages/RoomFormPage";
import AvailabilityCalendarPage from "../vendor/pages/AvailabilityCalendarPage";
import KycBankPage from "../vendor/pages/KycBankPage";
import VendorSettingsPage from "../vendor/pages/VendorSettingsPage";
import VendorSupportPage from "../vendor/pages/VendorSupportPage";


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
            to="/vendor/login"
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
  path="property-rules"
  element={<PropertyRulesPage />}
/>

          <Route
  path="amenities"
  element={<AmenitiesPage />}
/>

          <Route
            path="service-cities"
            element={<ServiceCitiesPage />}
          />


         <Route
  path="properties"
  element={<AdminPropertiesPage />}
/>

          <Route
            path="bookings"
            element={<AdminBookingsPage />}
          />

          <Route
            path="payments"
            element={<AdminPaymentsPage />}
          />

          <Route
            path="commissions"
            element={<AdminCommissionsPage />}
          />

          <Route
            path="contact-messages"
            element={<ContactMessagesPage />}
          />

          <Route
            path="faqs"
            element={<FaqsPage />}
          />

          <Route
            path="cms"
            element={<CmsPagesPage />}
          />

          <Route
            path="cms/new"
            element={<CmsPageFormPage />}
          />

          <Route
            path="cms/:id/edit"
            element={<CmsPageFormPage />}
          />

          <Route
            path="blog"
            element={<BlogPage />}
          />

          <Route
            path="blog/new"
            element={<BlogEditPage />}
          />

          <Route
            path="blog/:id/edit"
            element={<BlogEditPage />}
          />

<Route
            path="reports"
            element={<ReportsPage />}
          />

          <Route
            path="analytics"
            element={<AnalyticsPage />}
          />

          <Route
            path="notifications"
            element={<NotificationListPage />}
          />

          <Route
            path="support"
            element={<SupportTicketsPage />}
          />

          <Route
            path="settings"
            element={<SettingsPage />}
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
  path="rooms"
  element={<ManageRoomsPage />}
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
            element={<VendorBookingsPage />}
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
            element={<VendorEarningsPage />}
          />

          <Route
            path="payouts"
            element={<VendorPayoutsPage />}
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
            path="notifications"
            element={<NotificationListPage />}
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
            element={<KycBankPage />}
          />

          <Route
            path="support"
            element={<VendorSupportPage />}
          />

          <Route
            path="settings"
            element={<VendorSettingsPage />}
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
