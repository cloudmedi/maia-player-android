import React, { useEffect } from 'react';
import { SafeAreaView, Alert, BackHandler } from 'react-native';
import { Provider } from "react-redux";
import { PersistGate } from "redux-persist/integration/react";
import ExitApp from 'react-native-exit-app';

import PrivateRoute from "./src/priveteRoute";
import { store, persistor } from "./src/redux/store";

function App(): React.JSX.Element {
  useEffect(() => {
    const backAction = () => {
      Alert.alert("Çıkış", "Uygulamadan çıkmak istiyor musunuz?", [
        {
          text: "Hayır",
          onPress: () => null,
          style: "cancel"
        },
        {
          text: "Evet", 
          onPress: () => ExitApp.exitApp()
        }
      ]);
      return true;
    };

    const backHandler = BackHandler.addEventListener(
      "hardwareBackPress",
      backAction
    );

    return () => backHandler.remove();
  }, []);

  return (
    <Provider store={store}>
      <PersistGate loading={null} persistor={persistor}>
        <SafeAreaView style={{flex:1}}>
          <PrivateRoute/>
        </SafeAreaView>
      </PersistGate>
    </Provider>
  );
}

export default App;
