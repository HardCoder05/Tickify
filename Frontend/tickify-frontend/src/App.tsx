import { Routes, Route, Navigate } from "react-router-dom";
import "@fontsource-variable/manrope";

import LoginPage from "./users/pages/LoginPage";
import RegisterPage from "./users/pages/RegisterPage";
import HomePage from "@/users/pages/HomePage";
import EventDetailPage from "./events/pages/EventDetailPage";
import EventsPage from "./users/pages/EventsPage";
import OrganizerEventPage from "./events/pages/OrganizerEventPage";
import OrganizerCreateEventPage from "./events/pages/OrganizerCreateEventPage";
import OrganizerEditEventPage from "./events/pages/OrganizerEditEventPage";
import OrganizerCreateTariffPage from "./events/pages/OrganizerCreateTariff";
import AdminLayout from "@/Layouts/AdminLayout";
import PublicationsPage from "@/admin/pages/PublicationsPage";
import UsersPage from "@/admin/pages/UsersPage";
import OrganizerLayout from "./Layouts/LayoutOrganizer";
import MainLayout from "./Layouts/MainLayout";
import EventPurchasePage from "./users/pages/EventPurcharsePage";
import PurchaseSummaryPage from "./users/pages/PurcharseSummaryPage";
import PurchaseSuccessPage from "./users/pages/PurcharseSuccessPage";
import MyTicketsPage from "./users/pages/MyTicketsPage";
import UserProfilePage from "./users/pages/UserProfilePage";
import { DynamicTitle } from "./lib/utils";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import OrganizerEventDetailPage from "./events/pages/OrganizerEventDetailPage";
import OrganizerRequestPage from "./users/pages/OrganizerRequestPage";
import OrganizerReportsPage from "./admin/pages/OrganizerReportsPage";
import ReportsPage from "./admin/pages/ReportsPage";
import RequestsPage from "./admin/pages/RequestsPage";
import AdminProfilePage from "./admin/pages/AdminProfilePage";
import TicketDetailPage from "./users/pages/TicketDetailPage";
import GlobalIncomeReport from "./users/components/reports/GlobalIncomeReport";
import { NotificationProvider } from "@/contexts/NotificationContext";
import NotificationContainer from "@/contexts/NotificationContainer";
import { useNotificationContext } from "@/contexts/NotificationContext";
import TicketBatchPrintPage from "./users/pages/TicketBatchPrintPage";
import SeatCreator from "./events/pages/RegistrarAsientos";
import SeatSelectorUser from "./events/pages/ComprarAsientos";
import CategoriesPage from "./admin/pages/CategoriesPage";

export default function App() {
  return (
    <NotificationProvider>
      <AppContent />
    </NotificationProvider>
  );
}

function AppContent() {
  const { notifications, removeNotification } = useNotificationContext();

  return (
    <>
      <DynamicTitle />
      <NotificationContainer
        notifications={notifications}
        onClose={removeNotification}
      />

      <Routes>
        {/* Layout principal */}
        <Route element={<MainLayout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/eventos" element={<EventsPage />} />
          <Route path="/eventos/:id" element={<EventDetailPage />} />

          {/* Rutas protegidas para usuarios logueados */}
          <Route
            path="/perfil"
            element={
              <ProtectedRoute>
                <UserProfilePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/eventos/:id/comprar"
            element={
              <ProtectedRoute roles={["CLIENTE", "ORGANIZADOR"]}>
                <EventPurchasePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/eventos/:id/seleccionar-asientos"
            element={
              <ProtectedRoute roles={["CLIENTE", "ORGANIZADOR"]}>
                <SeatSelectorUser />
              </ProtectedRoute>
            }
          />
          <Route
            path="/eventos/:id/compra/resumen"
            element={
              <ProtectedRoute roles={["CLIENTE", "ORGANIZADOR"]}>
                <PurchaseSummaryPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/compra-exitosa/:compraId"
            element={
              <ProtectedRoute roles={["CLIENTE", "ORGANIZADOR"]}>
                <PurchaseSuccessPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/mis-tickets"
            element={
              <ProtectedRoute roles={["CLIENTE", "ORGANIZADOR"]}>
                <MyTicketsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/mis-tickets/imprimir/:compraCodigo"
            element={
              <ProtectedRoute roles={["CLIENTE", "ORGANIZADOR"]}>
                <TicketBatchPrintPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/mis-tickets/:ticketId"
            element={
              <ProtectedRoute roles={["CLIENTE", "ORGANIZADOR"]}>
                <TicketDetailPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/organizer-request"
            element={
              <ProtectedRoute roles={["CLIENTE"]}>
                <OrganizerRequestPage />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="/" replace />} />
          </Route>
        </Route>

        {/* Layout del organizador */}
        <Route
          path="/organizerEvent"
          element={
            <ProtectedRoute roles={["ORGANIZADOR"]}>
              <OrganizerLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<OrganizerEventPage />} />
          <Route path="createEvent" element={<OrganizerCreateEventPage />} />
          <Route path=":id" element={<OrganizerEventDetailPage />} />
          <Route path=":id/edit" element={<OrganizerEditEventPage />} />
          <Route path=":id/tarifas" element={<OrganizerCreateTariffPage />} />
          <Route path="reportes" element={<GlobalIncomeReport />} />
          <Route path="perfil" element={<UserProfilePage />} />
        </Route>

        {/* Layout del administrador */}
        <Route
          path="/admin"
          element={
            <ProtectedRoute roles={["ADMIN"]}>
              <AdminLayout />
            </ProtectedRoute>
          }
        >
          <Route path="eventos" element={<PublicationsPage />} />
          <Route path="usuarios" element={<UsersPage />} />
          <Route path="solicitudes" element={<RequestsPage />} />
          <Route path="reportes" element={<ReportsPage />} />
          <Route path="reportes/organizadores" element={<OrganizerReportsPage />} />
          <Route path="categorias" element={<CategoriesPage />} />
          <Route path="perfil" element={<AdminProfilePage />} />
        </Route>
        <Route path="/test-asientos" element={<SeatCreator />} />
        {/* Redirección por defecto */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

    </>
  );
}