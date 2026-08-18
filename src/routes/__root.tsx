import { Outlet, createRootRouteWithContext } from "@tanstack/react-router";
import type { QueryClient } from "@tanstack/react-query";
import { MedicationProvider } from "../features/medications/context";
import { AppLayout } from "../layouts/AppLayout";
import { DirectionProvider } from "@base-ui/react/direction-provider";
import { NotificationInitializer } from "@/features/notifications/components/NotificationInitializer";

import "../index.css";

interface RouterContext {
  queryClient: QueryClient;
}

export const Route = createRootRouteWithContext<RouterContext>()({
  component: RootComponent,
});

function RootComponent() {
  return (
    <DirectionProvider direction="rtl">
      <MedicationProvider>
        <NotificationInitializer />
        <AppLayout>
          <Outlet />
        </AppLayout>
      </MedicationProvider>
    </DirectionProvider>
  );
}
