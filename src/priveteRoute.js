import React, { useEffect, useState, useRef } from 'react';
import { View, StyleSheet } from 'react-native';
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
  const intervalRef = useRef(null);

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

  const sendStatus = (status, socket) => {
    try {
      socket.emit("call", "v1.device.status", {
        token: data.serial, serial: data.serial,
        state: status
      }, function (err, res) {
        if (err) {
          console.log("error", err);
        } else {
          console.log("status-sent", res);
          //document.getElementById("res").textContent += "Join room success" + "\n";
        }
      });
    } catch (e) {
      console.log(e);
    }
  }

  useEffect(() => {
    if (message !== 'Used Serial Number') {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }

      intervalRef.current = setInterval(() => {
        checkSerial();
      }, 10000); // 10000 ms = 10 seconds
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    }

    // Cleanup function to clear interval when component unmounts
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [data.serial, message]);

  useEffect(() => {
    let socket;
    let socketStatus;
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
          socketStatus = setInterval(() => {
            sendStatus("online", socket)
            clearInterval(socketStatus);
          }, 60 * 5 * 1000)

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
         
        if(eventName==="device"){
          if (JSON.stringify(args) !== JSON.stringify(data.source)) {
            dispatch(setSourceData(args));
          }
        }  // Check if args are different from current source in Redux
        
        });
      }
    }

    return () => {
      if (socket) {
        socket.disconnect();
        console.log('Socket disconnected');
      }
    };
  }, [message, data.serial, dispatch, data.source]);

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
