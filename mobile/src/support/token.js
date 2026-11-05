import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
const KEY = 'imam_conversation_token';
let pending;
async function read() { return Platform.OS === 'web' ? globalThis.localStorage.getItem(KEY) : SecureStore.getItemAsync(KEY); }
async function write(value) { if (Platform.OS === 'web') globalThis.localStorage.setItem(KEY, value); else await SecureStore.setItemAsync(KEY, value); }
export function conversationToken() {
    pending ||= (async () => {
        let token = await read();
        if (!token || !/^[a-f0-9]{64}$/.test(token)) {
            const bytes = await Crypto.getRandomBytesAsync(32);
            token = Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');
            await write(token);
        }
        return token;
    })().catch(error => { pending = undefined; throw error; });
    return pending;
}
