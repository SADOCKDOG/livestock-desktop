import { CapacitorConfig } from '@capacitor/cli';

const FREE_MODE = process.env.FREE_MODE === 'true' || process.env.FREE_MODE === '1';

const config: CapacitorConfig = {
  appId: FREE_MODE ? 'com.livestockmanager.app.free' : 'com.livestockmanager.app.manual',
  appName: FREE_MODE ? 'Livestock Manager Free' : 'Livestock Manager',
  webDir: 'www',
  server: {
    androidScheme: 'https'
  },
  android: {
    webContentsDebuggingEnabled: true,
    backgroundColor: '#000000'
  },
  plugins: {
    EdgeToEdge: {
      backgroundColor: '#000000'
    }
  }
};

export default config;
