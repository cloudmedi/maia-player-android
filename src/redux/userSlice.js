import { createSlice } from "@reduxjs/toolkit";

export const userSlice = createSlice({
    name: "user",
    initialState: {
        user: {},
        source: [],
        serial: "none",
        synchronize: [],
        rotate: 0,
    },
    reducers: {
        getUserInfo: (state, action) => {
            state.user = action.payload;
        },
        setSourceData: (state, action) => {
            state.source = action.payload;
        },
        setSerial: (state, action) => {
            state.serial = action.payload;
        },
        setSynchronize: (state, action) => {
            state.synchronize = action.payload;
        },
        setRotate: (state, action) => {
            console.log(action)
            state.rotate += action.payload; // Yeni değeri mevcut rotate değerine ekler
        }
    }
});

export const { getUserInfo, setSourceData, setSerial, setSynchronize, setRotate } = userSlice.actions;
export default userSlice.reducer;
