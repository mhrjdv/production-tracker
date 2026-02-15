import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import {
  mergeExtensionPreferences,
  sanitizeExtensionPreferencesUpdate,
  type ExtensionPreferences,
} from "@/lib/extension-profile";

type UserPreferencesRecord = { extensionPreferences: unknown } | null;
type UserIdentityRecord = { id: string } | null;

export interface ExtensionPreferencesStore {
  getUserPreferences: (userId: string) => Promise<UserPreferencesRecord>;
  getUserById: (userId: string) => Promise<UserIdentityRecord>;
  setUserPreferences: (
    userId: string,
    preferences: ExtensionPreferences,
  ) => Promise<void>;
}

const prismaExtensionPreferencesStore: ExtensionPreferencesStore = {
  getUserPreferences: (userId) =>
    prisma.user.findUnique({
      where: { id: userId },
      select: { extensionPreferences: true },
    }) as Promise<UserPreferencesRecord>,
  getUserById: (userId) =>
    prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    }) as Promise<UserIdentityRecord>,
  setUserPreferences: async (userId, preferences) => {
    await prisma.user.update({
      where: { id: userId },
      data: {
        extensionPreferences: preferences as Prisma.InputJsonValue,
      },
    });
  },
};

export interface SaveExtensionPreferencesResult {
  foundUser: boolean;
  preferences: ExtensionPreferences;
  persisted: boolean;
}

export async function getUserExtensionPreferences(
  userId: string,
  store: ExtensionPreferencesStore = prismaExtensionPreferencesStore,
): Promise<ExtensionPreferences> {
  const user = await store.getUserPreferences(userId);
  return sanitizeExtensionPreferencesUpdate(user?.extensionPreferences ?? {});
}

export async function saveUserExtensionPreferences(
  userId: string,
  updateInput: unknown,
  store: ExtensionPreferencesStore = prismaExtensionPreferencesStore,
): Promise<SaveExtensionPreferencesResult> {
  const update = sanitizeExtensionPreferencesUpdate(updateInput);

  const existingUser = await store.getUserPreferences(userId);
  if (!existingUser) {
    return {
      foundUser: false,
      preferences: {},
      persisted: false,
    };
  }

  const merged = mergeExtensionPreferences(
    existingUser.extensionPreferences,
    update,
  );

  await store.setUserPreferences(userId, merged);

  return {
    foundUser: true,
    preferences: merged,
    persisted: true,
  };
}
