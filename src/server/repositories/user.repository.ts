import { getAdminDb } from "@/lib/firebase/admin";
import { paths } from "@/lib/firebase/paths";
import type { UserProfile } from "@/types";

export class UserRepository {
  private db = getAdminDb();

  async getProfile(uid: string): Promise<UserProfile | null> {
    const snap = await this.db.doc(paths.userProfile(uid)).get();
    if (!snap.exists) return null;
    return snap.data() as UserProfile;
  }

  async setProfile(uid: string, profile: UserProfile): Promise<void> {
    const cleaned = Object.fromEntries(
      Object.entries(profile).filter(([, v]) => v !== undefined)
    ) as unknown as UserProfile;
    await this.db.doc(paths.userProfile(uid)).set(cleaned);
  }

  async updateProfile(uid: string, data: Partial<UserProfile>): Promise<void> {
    const cleaned = Object.fromEntries(
      Object.entries(data).filter(([, v]) => v !== undefined)
    );
    await this.db.doc(paths.userProfile(uid)).update({
      ...cleaned,
      updatedAt: Date.now(),
    });
  }
}

export const userRepository = new UserRepository();
