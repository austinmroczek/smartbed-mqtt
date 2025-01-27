import { BluetoothGATTService } from '@2colors/esphome-native-api';

export interface IBLEDevice {
  name: string;
  address: number;
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  writeCharacteristic(handle: number, bytes: Uint8Array): Promise<void>;
  getServices(): Promise<BluetoothGATTService[]>;
  subscribeToCharacteristic(handle: number, notify: (data: Uint8Array) => void): Promise<void>;
}
