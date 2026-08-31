import TeamSaasWorkspace from "@/components/TeamSaasWorkspace";

export default function TeamLayout({children}:{children:React.ReactNode}){
  if(process.env.NEXT_PUBLIC_DATA_MODE==="saas")return <TeamSaasWorkspace/>;
  return children;
}
