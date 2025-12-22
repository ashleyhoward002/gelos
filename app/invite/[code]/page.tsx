import { InvitePageClient } from "./invite-client";

interface InvitePageProps {
  params: Promise<{ code: string }>;
}

export default async function InvitePage({ params }: InvitePageProps) {
  const { code } = await params;

  return <InvitePageClient code={code} />;
}
