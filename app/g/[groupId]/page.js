import PorraApp from '@/components/PorraApp';

export default async function GroupPage({ params }) {
  const { groupId } = await params;
  return <PorraApp groupId={groupId} />;
}
