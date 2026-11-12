import { CustomObjectPage } from '@/components/platform/CustomObjectPage';
import { MODULE_THEMES } from '@/components/platform/themes';

export default async function Page({ params }: { params: Promise<{ object: string }> }) {
  const { object } = await params;
  return <CustomObjectPage key={object} object={object} theme={MODULE_THEMES['marketing']} />;
}