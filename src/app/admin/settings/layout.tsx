import { SettingsPane } from './pane';

export const dynamic = 'force-dynamic';

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return <SettingsPane>{children}</SettingsPane>;
}
