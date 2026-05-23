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
    await this.db.doc(paths.userProfile(uid)).set(profile);
  }

  async updateProfile(uid: string, data: Partial<UserProfile>): Promise<void> {
    await this.db.doc(paths.userProfile(uid)).update({
      ...data,
      updatedAt: Date.now(),
    });
  }
}

export const userRepository = new UserRepository();
