import RecruitmentSaasWorkspace from "@/components/RecruitmentSaasWorkspace";

export default function RecruitmentLayout({children}:{children:React.ReactNode}){
  if(process.env.NEXT_PUBLIC_DATA_MODE==="saas")return <RecruitmentSaasWorkspace/>;
  return children;
}
