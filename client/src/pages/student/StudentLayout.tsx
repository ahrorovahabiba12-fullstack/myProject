import { Outlet } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { studentApi } from "../../lib/api";
import { MobileMenu, StudentSidebar } from "../../components/layout/StudentSidebar";
import { MobileBottomNav } from "../../components/layout/MobileBottomNav";
import { Topbar } from "../../components/layout/Topbar";
import { Skeleton } from "../../components/ui/primitives";
import { AppBackground } from "../../components/three/AppBackground";

export default function StudentLayout() {
  const { data, isLoading } = useQuery({ queryKey: ["dashboard-summary"], queryFn: studentApi.getDashboard });

  return (
    <div className="relative isolate flex min-h-screen bg-[var(--bg-page)]">
      <AppBackground />
      <StudentSidebar careerVisible={data?.careerModuleVisible ?? false} grade={data?.grade} />
      <div className="relative z-10 flex-1 px-4 sm:px-8 py-6 pb-24 lg:pb-6 max-w-6xl mx-auto w-full">
        {isLoading ? (
          <Skeleton className="h-9 w-64 mb-6" />
        ) : (
          <Topbar
            streakDays={data?.streakDays ?? 0}
            points={data?.points ?? 0}
            menu={<MobileMenu careerVisible={data?.careerModuleVisible ?? false} grade={data?.grade} />}
          />
        )}
        <Outlet context={{ dashboard: data }} />
      </div>
      <MobileBottomNav careerVisible={data?.careerModuleVisible ?? false} />
    </div>
  );
}
