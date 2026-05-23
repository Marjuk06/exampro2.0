import { getAdminDb } from "@/lib/firebase/admin";
import { paths } from "@/lib/firebase/paths";
import type { AppSettings } from "@/types";

export class SettingsRepository {
  private db = getAdminDb();

  async get(): Promise<AppSettings> {
    const snap = await this.db.doc(paths.settings()).get();
    return (snap.data() as AppSettings) ?? {};
  }

  async update(data: Partial<AppSettings>): Promise<void> {
    await this.db.doc(paths.settings()).set(data, { merge: true });
  }
}

export const settingsRepository = new SettingsRepository();
