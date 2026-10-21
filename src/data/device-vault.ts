import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { createVault } from './vault-core';
export const deviceStorageAvailable = Platform.OS !== 'web';
const options = { keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY };
export const deviceVault = createVault({
  get: key => SecureStore.getItemAsync(key, options),
  set: (key, value) => SecureStore.setItemAsync(key, value, options),
  remove: key => SecureStore.deleteItemAsync(key, options),
});
