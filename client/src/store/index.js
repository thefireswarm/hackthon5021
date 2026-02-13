import { configureStore } from '@reduxjs/toolkit';
import userReducer from './userSlice';
import classroomReducer from './classroomSlice';

const store = configureStore({
    reducer: {
        user: userReducer,
        classroom: classroomReducer,
    },
});

export default store;
