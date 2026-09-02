import Skeleton, { SkeletonChart, SkeletonKpiGrid, SkeletonList } from "../../components/ui/Skeleton";

export default function DashboardLoading() {
  return (
    <div className="premium-page-skeleton mx-auto max-w-[1600px] space-y-4 pb-6" aria-label="FutureHR yükleniyor" aria-busy="true">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-2">
          <Skeleton variant="text" width={150} />
          <Skeleton height={34} width={260} className="rounded-lg" />
          <Skeleton variant="text" width={380} />
        </div>
        <div className="flex gap-2"><Skeleton height={36} width={98} /><Skeleton height={36} width={98} /><Skeleton height={36} width={98} /></div>
      </div>
      <SkeletonKpiGrid count={4} />
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.55fr)_360px]">
        <SkeletonChart height={238} />
        <SkeletonList count={4} />
      </div>
      <div className="grid gap-4 xl:grid-cols-2"><SkeletonChart height={190} /><SkeletonList count={5} /></div>
    </div>
  );
}
