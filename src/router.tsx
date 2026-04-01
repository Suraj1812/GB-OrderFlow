import { Suspense, lazy, type ReactNode } from "react";
import { Navigate, Outlet, RouterProvider, createBrowserRouter } from "react-router-dom";

import type { UserRole } from "../shared/contracts";
import { useAuth } from "./auth/AuthContext";
import { AppLoader } from "./ui/AppLoader";
import { DealerShell } from "./ui/DealerShell";
import { HeadOfficeShell } from "./ui/HeadOfficeShell";

const LandingPage = lazy(async () => ({
  default: (await import("./views/LandingPage")).LandingPage,
}));
const DealerLoginPage = lazy(async () => ({
  default: (await import("./views/DealerLoginPage")).DealerLoginPage,
}));
const HeadOfficeLoginPage = lazy(async () => ({
  default: (await import("./views/HeadOfficeLoginPage")).HeadOfficeLoginPage,
}));
const DealerCatalogPage = lazy(async () => ({
  default: (await import("./views/DealerCatalogPage")).DealerCatalogPage,
}));
const DealerOrdersPage = lazy(async () => ({
  default: (await import("./views/DealerOrdersPage")).DealerOrdersPage,
}));
const HeadOfficeDashboardPage = lazy(async () => ({
  default: (await import("./views/HeadOfficeDashboardPage")).HeadOfficeDashboardPage,
}));
const HeadOfficeOrdersPage = lazy(async () => ({
  default: (await import("./views/HeadOfficeOrdersPage")).HeadOfficeOrdersPage,
}));
const HeadOfficeDealersPage = lazy(async () => ({
  default: (await import("./views/HeadOfficeDealersPage")).HeadOfficeDealersPage,
}));
const HeadOfficeSkusPage = lazy(async () => ({
  default: (await import("./views/HeadOfficeSkusPage")).HeadOfficeSkusPage,
}));

function withSuspense(element: ReactNode) {
  return <Suspense fallback={<AppLoader label="Loading page" />}>{element}</Suspense>;
}

function ProtectedRoute({ role }: { role: UserRole }) {
  const { bootstrapping, session, getDefaultRoute } = useAuth();

  if (bootstrapping) {
    return <AppLoader label="Loading workspace" />;
  }

  if (!session) {
    return (
      <Navigate
        to={role === "dealer" ? "/login/dealer" : "/login/head-office"}
        replace
      />
    );
  }

  if (session.role !== role) {
    return <Navigate to={getDefaultRoute(session.role)} replace />;
  }

  return <Outlet />;
}

const router = createBrowserRouter([
  {
    path: "/",
    element: withSuspense(<LandingPage />),
  },
  {
    path: "/login/dealer",
    element: withSuspense(<DealerLoginPage />),
  },
  {
    path: "/login/head-office",
    element: withSuspense(<HeadOfficeLoginPage />),
  },
  {
    element: <ProtectedRoute role="dealer" />,
    children: [
      {
        element: <DealerShell />,
        children: [
          {
            path: "/dealer/catalog",
            element: withSuspense(<DealerCatalogPage />),
          },
          {
            path: "/dealer/orders",
            element: withSuspense(<DealerOrdersPage />),
          },
        ],
      },
    ],
  },
  {
    element: <ProtectedRoute role="head_office" />,
    children: [
      {
        element: <HeadOfficeShell />,
        children: [
          {
            path: "/head-office/dashboard",
            element: withSuspense(<HeadOfficeDashboardPage />),
          },
          {
            path: "/head-office/orders",
            element: withSuspense(<HeadOfficeOrdersPage />),
          },
          {
            path: "/head-office/masters/dealers",
            element: withSuspense(<HeadOfficeDealersPage />),
          },
          {
            path: "/head-office/masters/skus",
            element: withSuspense(<HeadOfficeSkusPage />),
          },
        ],
      },
    ],
  },
  {
    path: "*",
    element: <Navigate to="/" replace />,
  },
]);

export function AppRouter() {
  return <RouterProvider router={router} />;
}
