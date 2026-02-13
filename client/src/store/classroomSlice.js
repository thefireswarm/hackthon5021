import { createSlice } from '@reduxjs/toolkit';

const initialState = {
    currentClass: null,
    classes: [],
    participants: [],
    chatMessages: [],
    popup: null,
    activeQuestion: null,
    questionResults: null,
    handRaised: [],
};

const classroomSlice = createSlice({
    name: 'classroom',
    initialState,
    reducers: {
        setClasses(state, action) {
            state.classes = action.payload;
        },
        setCurrentClass(state, action) {
            state.currentClass = action.payload;
        },
        setParticipants(state, action) {
            state.participants = action.payload;
        },
        addChatMessage(state, action) {
            state.chatMessages.push(action.payload);
        },
        clearChat(state) {
            state.chatMessages = [];
        },
        setPopup(state, action) {
            state.popup = action.payload;
        },
        clearPopup(state) {
            state.popup = null;
        },
        setActiveQuestion(state, action) {
            state.activeQuestion = action.payload;
        },
        clearActiveQuestion(state) {
            state.activeQuestion = null;
        },
        setQuestionResults(state, action) {
            state.questionResults = action.payload;
        },
        clearQuestionResults(state) {
            state.questionResults = null;
        },
        addHandRaised(state, action) {
            if (!state.handRaised.find(h => h.userId === action.payload.userId)) {
                state.handRaised.push(action.payload);
            }
        },
        clearHandRaised(state) {
            state.handRaised = [];
        },
        resetClassroom(state) {
            Object.assign(state, initialState);
        },
    },
});

export const {
    setClasses, setCurrentClass, setParticipants,
    addChatMessage, clearChat,
    setPopup, clearPopup,
    setActiveQuestion, clearActiveQuestion,
    setQuestionResults, clearQuestionResults,
    addHandRaised, clearHandRaised,
    resetClassroom
} = classroomSlice.actions;
export default classroomSlice.reducer;
