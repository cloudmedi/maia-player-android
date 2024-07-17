import { persistReducer } from "redux-persist";
import AsyncStorage from '@react-native-async-storage/async-storage';; // Oturum depolama mekanizmasını içe aktarın
import { combineReducers } from "redux";
import userSlice from "./userSlice";

const persistConfig = {
  key: "root",
  storage: AsyncStorage // Oturum depolama mekanizmasını kullanarak depolama seçeneğini belirtin
};

const rootReducer = combineReducers({
  user: userSlice,
});

const persistedReducer = persistReducer(persistConfig, rootReducer);

export default persistedReducer;
