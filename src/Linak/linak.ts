import { Button } from '@ha/Button';
import { IMQTTConnection } from '@mqtt/IMQTTConnection';
import { buildDictionary } from '@utils/buildDictionary';
import { getString } from '@utils/getString';
import { logInfo } from '@utils/logger';
import { IESPConnection } from 'ESPHome/IESPConnection';
import { buildMQTTDeviceData } from './buildMQTTDeviceData';
import { BedPositionSensor } from './entities/BedPositionSensor';
import { getDevices } from './options';
import { Commands } from './types/Commands';

export const linak = async (mqtt: IMQTTConnection, esphome: IESPConnection) => {
  const devices = getDevices();
  if (!devices.length) return logInfo('[Linak] No devices configured');

  const devicesMap = buildDictionary(devices, (device) => ({ key: device.name, value: device }));
  const bleDevices = await esphome.getBLEDevices(Object.keys(devicesMap));
  for (const bleDevice of bleDevices) {
    const { name, address, connect, getServices } = bleDevice;
    const device = devicesMap[name];
    const deviceData = buildMQTTDeviceData({ ...device, address });
    await connect();
    const services = await getServices();

    const controlService = services.find((s) => s.uuid === '99FA0001-338A-1024-8A49-009C0215F78A');
    if (!controlService) {
      logInfo('[Linak] Could not find expected services for device:', name);
      continue;
    }

    const commandCharacteristic = controlService.characteristicsList.find(
      (c) => c.uuid === '99FA0002-338A-1024-8A49-009C0215F78A'
    );
    if (!commandCharacteristic) continue;

    logInfo('[Linak] Setting up entities for device:', name);
    // under bed light toggle
    new Button(mqtt, deviceData, getString('UnderBedLightsToggle'), () =>
      bleDevice.writeCharacteristic(commandCharacteristic.handle, new Uint8Array([Commands.UnderBedLightsToggle, 0x00]))
    );

    if (device.type !== 'advanced') continue;

    const outputService = services.find((s) => s.uuid === '99FA0020-338A-1024-8A49-009C0215F78A');
    if (!outputService) continue;

    const legsPositionCharacteristic = outputService.characteristicsList.find(
      (c) => c.uuid === '99FA0027-338A-1024-8A49-009C0215F78A'
    );
    if (legsPositionCharacteristic) {
      const legPositionSensor = new BedPositionSensor(mqtt, deviceData, getString('AngleLeg'), 548, 45);
      bleDevice.subscribeToCharacteristic(legsPositionCharacteristic.handle, (data) => {
        legPositionSensor.setPosition((data[1] << 8) | data[0]);
      });
    }

    const backPositionCharacteristic = outputService.characteristicsList.find(
      (c) => c.uuid === '99FA0028-338A-1024-8A49-009C0215F78A'
    );
    if (backPositionCharacteristic) {
      const legPositionSensor = new BedPositionSensor(mqtt, deviceData, getString('AngleBack'), 820, 68);
      bleDevice.subscribeToCharacteristic(backPositionCharacteristic.handle, (data) => {
        legPositionSensor.setPosition((data[1] << 8) | data[0]);
      });
    }
  }
};
