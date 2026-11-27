import { ref, onMounted, watch } from 'vue';
import { userRecognition, initUserRecognition, handleNewMessage, promptSaveAsNewUser, clearLocalData, getCurrentState, getStateDescription, registerStateChangeCallback, STATES } from '../stores/userRecognition';
export function useUserRecognition() {
 const state = ref(userRecognition.state);
 const anonymousId = ref(userRecognition.anonymousId);
 const preferences = ref(userRecognition.preferences);
 const matchConfidence = ref(userRecognition.matchConfidence);
 const conversationRounds = ref(userRecognition.conversationRounds);
 const contextSummary = ref(userRecognition.contextSummary);
 const stateDescription = ref(getStateDescription(state.value));
 const unsubscribe = registerStateChangeCallback((change) => {
 state.value = change.newState;
 stateDescription.value = getStateDescription(change.newState);
 matchConfidence.value = change.matchConfidence;
 conversationRounds.value = change.conversationRounds;
 });
 onMounted(() => {
 initUserRecognition();
 state.value = userRecognition.state;
 anonymousId.value = userRecognition.anonymousId;
 preferences.value = { ...userRecognition.preferences };
 matchConfidence.value = userRecognition.matchConfidence;
 conversationRounds.value = userRecognition.conversationRounds;
 contextSummary.value = userRecognition.contextSummary;
 stateDescription.value = getStateDescription(state.value);
 });
 watch(state, (newState) => {
 stateDescription.value = getStateDescription(newState);
 });
 async function onMessage(userMessage, systemResponse) {
 handleNewMessage(userMessage, systemResponse);
 conversationRounds.value = userRecognition.conversationRounds;
 if (state.value === STATES.NEW_USER_PERSISTENT) {
 await promptSaveAsNewUser();
 }
 }
 function updatePreferences(newPreferences) {
 Object.assign(userRecognition.preferences, newPreferences);
 preferences.value = { ...userRecognition.preferences };
 }
 function clearData() {
 clearLocalData();
 state.value = userRecognition.state;
 anonymousId.value = userRecognition.anonymousId;
 preferences.value = { ...userRecognition.preferences };
 matchConfidence.value = userRecognition.matchConfidence;
 conversationRounds.value = userRecognition.conversationRounds;
 contextSummary.value = userRecognition.contextSummary;
 }
 return {
 state,
 anonymousId,
 preferences,
 matchConfidence,
 conversationRounds,
 contextSummary,
 stateDescription,
 onMessage,
 updatePreferences,
 clearData,
 getStateDescription,
 STATES
 };
}
export function useUserPreferences() {
 const preferences = ref(userRecognition.preferences);
 function setEmpathyStyle(style) {
 preferences.value.empathyStyle = style;
 userRecognition.preferences.empathyStyle = style;
 }
 function setLanguage(lang) {
 preferences.value.language = lang;
 userRecognition.preferences.language = lang;
 }
 function addTopic(topic) {
 if (!preferences.value.topics.includes(topic)) {
 preferences.value.topics.push(topic);
 userRecognition.preferences.topics = [...preferences.value.topics];
 }
 }
 function removeTopic(topic) {
 const index = preferences.value.topics.indexOf(topic);
 if (index > -1) {
 preferences.value.topics.splice(index, 1);
 userRecognition.preferences.topics = [...preferences.value.topics];
 }
 }
 function setTone(tone) {
 preferences.value.tone = tone;
 userRecognition.preferences.tone = tone;
 }
 return {
 preferences,
 setEmpathyStyle,
 setLanguage,
 addTopic,
 removeTopic,
 setTone
 };
}
