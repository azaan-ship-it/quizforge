// Lets the QuizForge page ask the desktop app to run "Sign in with ByteForge"
// in the system browser. Nothing else is exposed.
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('byteforgeDesktop', {
  signIn: () => ipcRenderer.invoke('bf-sign-in'),
});
