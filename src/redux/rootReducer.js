import { persistReducer } from "redux-persist";
import storageSession from 'redux-persist/lib/storage/session'; // Oturum depolama mekanizmasını içe aktarın
import { combineReducers } from "redux";
import userSlice from "./userSlice";

const persistConfig = {
  key: "root",
  storage: storageSession // Oturum depolama mekanizmasını kullanarak depolama seçeneğini belirtin
};

const rootReducer = combineReducers({
  user: userSlice,
});

const persistedReducer = persistReducer(persistConfig, rootReducer);

export default persistedReducer;
