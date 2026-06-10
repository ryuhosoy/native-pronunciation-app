import { Platform } from 'react-native';
import Purchases, { LOG_LEVEL } from 'react-native-purchases';
import RevenueCatUI, { PAYWALL_RESULT } from 'react-native-purchases-ui';

import { PREMIUM_ENTITLEMENT } from '../constants/subscription';

const IOS_API_KEY = process.env.EXPO_PUBLIC_REVENUECAT_IOS_API_KEY;
const ANDROID_API_KEY = process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY;

export function configurePurchases(): void {
  Purchases.setLogLevel(__DEV__ ? LOG_LEVEL.VERBOSE : LOG_LEVEL.INFO);

  if (Platform.OS === 'ios' && IOS_API_KEY) {
    Purchases.configure({ apiKey: IOS_API_KEY });
    return;
  }

  if (Platform.OS === 'android' && ANDROID_API_KEY) {
    Purchases.configure({ apiKey: ANDROID_API_KEY });
  }
}

export async function isPremiumUser(): Promise<boolean> {
  try {
    const customerInfo = await Purchases.getCustomerInfo();
    return typeof customerInfo.entitlements.active[PREMIUM_ENTITLEMENT] !== 'undefined';
  } catch {
    return false;
  }
}

export async function presentPaywall(): Promise<boolean> {
  const paywallResult = await RevenueCatUI.presentPaywall();

  switch (paywallResult) {
    case PAYWALL_RESULT.PURCHASED:
    case PAYWALL_RESULT.RESTORED:
      return true;
    case PAYWALL_RESULT.NOT_PRESENTED:
    case PAYWALL_RESULT.ERROR:
    case PAYWALL_RESULT.CANCELLED:
    default:
      return false;
  }
}
