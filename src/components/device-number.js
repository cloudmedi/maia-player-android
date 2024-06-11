import React, { useEffect, useState } from 'react';
import { View, Text, Image, StyleSheet, Platform, PermissionsAndroid, SafeAreaView } from 'react-native';
import axios from 'axios';
import DeviceInfo from 'react-native-device-info';
import { useDispatch, useSelector } from 'react-redux';
import { setSerial } from '../redux/userSlice';
import logo from '../assets/white_black_logo.png';
import { check, request, PERMISSIONS, RESULTS } from 'react-native-permissions';

async function requestPermissions() {
  if (Platform.OS === 'android') {
    try {
      // FINE_LOCATION iznini kontrol et ve talep et
      const fineLocationStatus = await check(PERMISSIONS.ANDROID.ACCESS_FINE_LOCATION);
      if (fineLocationStatus !== RESULTS.GRANTED) {
        const fineLocationRequestStatus = await request(PERMISSIONS.ANDROID.ACCESS_FINE_LOCATION);
        if (fineLocationRequestStatus !== RESULTS.GRANTED) {
          console.warn('ACCESS_FINE_LOCATION permission denied');
          return false;
        }
      }

      // Diğer izinleri manuel olarak kontrol et ve talep et
     /*  const wifiPermissionGranted = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.ACCESS_WIFI_STATE);
      if (!wifiPermissionGranted) {
        const granted = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.ACCESS_WIFI_STATE);
        if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
          console.warn('ACCESS_WIFI_STATE permission denied');
          return false;
        }
      }

      const networkPermissionGranted = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.ACCESS_NETWORK_STATE);
      if (!networkPermissionGranted) {
        const granted = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.ACCESS_NETWORK_STATE);
        if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
          console.warn('ACCESS_NETWORK_STATE permission denied');
          return false;
        }
      } */

      return true;
    } catch (err) {
      console.warn('Permission error:', err);
      return false;
    }
  } else {
    return true;
  }
}

function DeviceNumber() {
  const data = useSelector(state => state.user);
  const dispatch = useDispatch();
  const [ipAddress, setIpAddress] = useState('');

  const getDeviceMeta = async () => {
    const deviceId = await DeviceInfo.getUniqueId();
    const deviceType = await DeviceInfo.getDeviceType();
    const systemName = await DeviceInfo.getSystemName();
    const systemVersion = await DeviceInfo.getSystemVersion();
    const brand = await DeviceInfo.getBrand();
    const model = await DeviceInfo.getModel();
    const apiLevel = await DeviceInfo.getApiLevel();
    const applicationName = await DeviceInfo.getApplicationName();
    const buildNumber = await DeviceInfo.getBuildNumber();
    const bundleId = await DeviceInfo.getBundleId();
    const carrier = await DeviceInfo.getCarrier();
    const deviceName = await DeviceInfo.getDeviceName();
    const freeDiskStorage = await DeviceInfo.getFreeDiskStorage();
    const freeDiskStorageOld = await DeviceInfo.getFreeDiskStorageOld();
    const hardware = await DeviceInfo.getHardware();
    const host = await DeviceInfo.getHost();
    const ipAddress = await DeviceInfo.getIpAddress();
    const macAddress = await DeviceInfo.getMacAddress();
    const manufacturer = await DeviceInfo.getManufacturer();
    const maxMemory = await DeviceInfo.getMaxMemory();

    const powerState = await DeviceInfo.getPowerState();
    const totalDiskCapacity = await DeviceInfo.getTotalDiskCapacity();
    const totalDiskCapacityOld = await DeviceInfo.getTotalDiskCapacityOld();
    const totalMemory = await DeviceInfo.getTotalMemory();
    const userAgent = await DeviceInfo.getUserAgent();
    const version = await DeviceInfo.getVersion();
    const isEmulator = await DeviceInfo.isEmulator();
    const isTablet = await DeviceInfo.isTablet();
    const isLandscape = await DeviceInfo.isLandscape();
    const batteryLevel = await DeviceInfo.getBatteryLevel();
    const isCharging = await DeviceInfo.isBatteryCharging();

    const meta = {
      device_id: deviceId,
      device_type: deviceType,
      system_name: systemName,
      system_version: systemVersion,
      brand: brand,
      model: model,
      api_level: apiLevel,
      application_name: applicationName,
      build_number: buildNumber,
      bundle_id: bundleId,
      carrier: carrier,
      device_name: deviceName,
      free_disk_storage: freeDiskStorage,
      free_disk_storage_old: freeDiskStorageOld,
      hardware: hardware,
      host: host,
      ip_address: ipAddress,
      mac_address: macAddress,
      manufacturer: manufacturer,
      max_memory: maxMemory,
   
      power_state: JSON.stringify(powerState),
      total_disk_capacity: totalDiskCapacity,
      total_disk_capacity_old: totalDiskCapacityOld,
      total_memory: totalMemory,
      user_agent: userAgent,
      version: version,
      is_emulator: isEmulator,
      is_tablet: isTablet,
      is_landscape: isLandscape,
      battery_level: batteryLevel,
      is_charging: isCharging
    };

    console.log("Device Meta:", meta);

    return meta;
  };

  const fetchIpAddress = async () => {
    try {
      const response = await axios.get('https://api.ipify.org?format=json');
      setIpAddress(response.data.ip);
    } catch (error) {
      console.error('Failed to fetch IP address:', error);
    }
  };

   const handleSubmit = async () => {
    try {
      const meta = await getDeviceMeta();
     
      const response = await axios.post(
        'https://api-test.maiasignage.com/api/v1/device/pre_create',
        {
          fingerprint: meta.device_id,
          meta: meta,
        }
      );

      const { serial } = response.data;

      if (serial) {
        console.log('Serial Number:', serial);
        dispatch(setSerial(serial));
      }
    } catch (error) {
      console.error('An error occurred, please try again later.');
    }
  }; 

  useEffect(() => {
    const requestAndFetch = async () => {
      const hasPermissions = await requestPermissions();
      if (hasPermissions) {
        await fetchIpAddress();
        if (data.serial === 'none') {
          await handleSubmit();
        } 
      } else {
        console.error('Required permissions not granted');
      }
    };

    requestAndFetch();
  }, [data.serial]);

  return (
    
        <View style={styles.container}>
      <Text style={styles.serialText}>{data?.serial !== 'none' ? data?.serial : null}</Text>
      <Text style={styles.infoText}>app.maiasignage.com</Text>
      <Text style={styles.infoText}>To pair the device and start using it, please visit</Text>
      <Image style={styles.logo} source={logo} />
    </View>
  
  );
}

const styles = StyleSheet.create({
  container: {
   flex:1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'black',
    width:"100%"
  },
  serialText: {
    fontSize: 170,
    color: 'white',
    marginBottom:50
  },
  infoText: {
    fontSize: 20,
    color: 'white',
  },
  logo: {
    width: 50,
    height: 50,
    marginTop: 50,
  },
});

export default DeviceNumber;
