import {createSlice} from "@reduxjs/toolkit"

export const userSlice=createSlice({
    name:"user",
    initialState:{
        user:{},
        source:[],
        serial:"none"
    },
    reducers:{
        getUserInfo:(state,action)=>{
            state.user=action.payload;
        },
        setSourceData:(state,action)=>{
            state.source=action.payload
        },
        setSerial:(state,action)=>{
            state.serial=action.payload
        }
    }
});
export const {getUserInfo,setSourceData,setSerial}=userSlice.actions;
export default userSlice.reducer;