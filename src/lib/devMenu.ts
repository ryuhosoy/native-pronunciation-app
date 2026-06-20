import { requireOptionalNativeModule } from 'expo-modules-core';

type DevMenuPreferencesModule = {
  setPreferencesAsync: (settings: {
    showFloatingActionButton?: boolean;
    showsAtLaunch?: boolean;
  }) => Promise<void>;
};

export async function hideDevMenuSettings(): Promise<void> {
  if (!__DEV__) return;

  const DevMenuPreferences =
    requireOptionalNativeModule<DevMenuPreferencesModule>('DevMenuPreferences');

  await DevMenuPreferences?.setPreferencesAsync({
    showFloatingActionButton: false,
    showsAtLaunch: false,
  });
}
