import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { setSourceData } from './redux/userSlice';
import Player from './components/player';
import Device from './components/device-number';
import axios from 'axios';
import config from './config/config.json';
import { io } from 'socket.io-client';

function PriveteRoute() {
  const dispatch = useDispatch();
  const data = useSelector((state) => state.user);
  const [message, setMessage] = useState('');

  const checkSerial = async () => {
    try {
      const response = await axios.post(config.api_base + '/v1/device/check_serial', {
        serial: data.serial,
      });
      setMessage(response?.data?.message);
    } catch (error) {
      console.error('Serial check failed', error);
    }
  };

  useEffect(() => {
    const interval = setInterval(() => {
      checkSerial();
    }, 10000);

    return () => clearInterval(interval);
  }, [data.serial]); 

  useEffect(() => {
    let socket;
    if (message !== '' && message === 'Used Serial Number') {
      if (data?.serial !== 'none') {
        socket = io('https://ws-test.maiasignage.com', {
          reconnectionDelayMax: 10000,
          transports: ['websocket'],
          auth: {
            token: data?.serial,
          },
          query: {
            token: data?.serial,
          },
        });

        socket.on('connect', () => {
          console.log('Connected with:', socket.id);
          socket.emit('ping');
        });

        socket.on('pong', () => {
          console.log('Pong received from server');
        });

        socket.on('connect_error', (err) => {
          console.error('Connection error:', err.message);
        });

        socket.on('disconnect', () => {
          console.log('Disconnected', socket.id);
        });

        socket.onAny((eventName, ...args) => {
          console.log(eventName, args);
          dispatch(setSourceData(args));
        });
      }
    }

    return () => {
      if (socket) {
        socket.disconnect();
        console.log('Socket disconnected');
      }
    };
  }, [message, data.serial]);

  return (
    <View style={styles.container}>
      {data?.source[0]?.source ? <Player /> : <Device />}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default PriveteRoute;
