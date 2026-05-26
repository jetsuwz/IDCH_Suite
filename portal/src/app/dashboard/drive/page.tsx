import { getNextcloudData } from "@/actions/nextcloud";
import DriveClient from "@/components/DriveClient";

export default async function DrivePage({ searchParams }: { searchParams: Promise<{ path?: string }> }) {
  const params = await searchParams;
  const currentPath = params.path || '/remote.php/webdav/';
  const nextcloudData = await getNextcloudData(currentPath);

  return <DriveClient nextcloudData={nextcloudData} currentPath={currentPath} />;
}
