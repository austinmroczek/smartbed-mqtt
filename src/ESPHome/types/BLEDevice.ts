import { Connection } from '@2colors/esphome-native-api';
import { IBLEDevice } from './IBLEDevice';

export class BLEDevice implements IBLEDevice {
  constructor(public name: string, public address: number, private connection: Connection) {}

  connect = async () => {
    await this.connection.connectBluetoothDeviceService(this.address);
  };

  disconnect = async () => {
    await this.connection.disconnectBluetoothDeviceService(this.address);
  };

  writeCharacteristic = async (handle: number, bytes: Uint8Array) => {
    await this.connection.writeBluetoothGATTCharacteristicService(this.address, handle, bytes, true);
  };

  getServices = async () => {
    const response = await this.connection.listBluetoothGATTServicesService(this.address);
    return response.servicesList;
  };

  subscribeToCharacteristic = async (handle: number, notify: (data: Uint8Array) => void) => {
    this.connection.on('message.BluetoothGATTNotifyDataResponse', (message) => {
      if (message.address != this.address || message.handle != handle) return;
      notify(new Uint8Array([...Buffer.from(message.data)]));
    });
    await this.connection.notifyBluetoothGATTCharacteristicService(this.address, handle);
  };
}
