# クラウド自動バックアップ実装ガイド

## 概要

ユーザーのスマホ紛失・故障時のデータ消失を防ぐため、自動クラウドバックアップ機能を実装します。
Pro Plan限定機能として提供することで、課金インセンティブとしても機能します。

## プラットフォーム別実装

### iOS版: iCloud Document Storage

#### 1. 必要なパッケージ

```bash
npx expo install expo-document-picker expo-file-system
```

#### 2. app.json設定

```json
{
  "expo": {
    "ios": {
      "usesIcloudStorage": true,
      "bundleIdentifier": "com.chiritsumo.app"
    }
  }
}
```

#### 3. 実装例

```typescript
// app/core/services/iCloudBackup.ts
import * as FileSystem from 'expo-file-system';
import { Platform } from 'react-native';

const ICLOUD_BACKUP_FILENAME = 'chiritsumo_backup.json';

export async function enableAutoBackup(): Promise<boolean> {
  if (Platform.OS !== 'ios') return false;

  try {
    // iCloud Container URLを取得
    const containerUrl = await FileSystem.getInfoAsync(
      FileSystem.documentDirectory + 'iCloud/'
    );

    if (!containerUrl.exists) {
      await FileSystem.makeDirectoryAsync(
        FileSystem.documentDirectory + 'iCloud/',
        { intermediates: true }
      );
    }

    return true;
  } catch (error) {
    console.error('Failed to enable iCloud backup:', error);
    return false;
  }
}

export async function performAutoBackup(data: any): Promise<void> {
  if (Platform.OS !== 'ios') return;

  try {
    const backupPath = `${FileSystem.documentDirectory}iCloud/${ICLOUD_BACKUP_FILENAME}`;
    await FileSystem.writeAsStringAsync(backupPath, JSON.stringify(data));
    console.log('iCloud backup completed');
  } catch (error) {
    console.error('Failed to backup to iCloud:', error);
  }
}

export async function restoreFromICloud(): Promise<any | null> {
  if (Platform.OS !== 'ios') return null;

  try {
    const backupPath = `${FileSystem.documentDirectory}iCloud/${ICLOUD_BACKUP_FILENAME}`;
    const fileInfo = await FileSystem.getInfoAsync(backupPath);

    if (!fileInfo.exists) {
      return null;
    }

    const content = await FileSystem.readAsStringAsync(backupPath);
    return JSON.parse(content);
  } catch (error) {
    console.error('Failed to restore from iCloud:', error);
    return null;
  }
}
```

### Android版: Google Drive API

#### 1. 必要なパッケージ

```bash
npm install @react-native-google-signin/google-signin
npm install react-native-google-drive-api-wrapper
```

#### 2. Google Cloud Console設定

1. https://console.cloud.google.com にアクセス
2. 新規プロジェクト作成
3. Google Drive API を有効化
4. OAuth 2.0 クライアントID を作成（Android用）
5. SHA-1フィンガープリントを登録

#### 3. 実装例

```typescript
// app/core/services/googleDriveBackup.ts
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { GDrive } from 'react-native-google-drive-api-wrapper';
import { Platform } from 'react-native';

const BACKUP_FILENAME = 'chiritsumo_backup.json';
const BACKUP_FOLDER = 'ChiritsumoBackups';

export async function initializeGoogleDrive(): Promise<void> {
  if (Platform.OS !== 'android') return;

  GoogleSignin.configure({
    scopes: ['https://www.googleapis.com/auth/drive.appdata'],
    webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
  });
}

export async function signInAndEnableBackup(): Promise<boolean> {
  try {
    await GoogleSignin.hasPlayServices();
    const userInfo = await GoogleSignin.signIn();
    
    // トークンを取得
    const tokens = await GoogleSignin.getTokens();
    GDrive.setAccessToken(tokens.accessToken);

    return true;
  } catch (error) {
    console.error('Google Sign-In failed:', error);
    return false;
  }
}

export async function performAutoBackup(data: any): Promise<void> {
  if (Platform.OS !== 'android') return;

  try {
    // フォルダを作成または取得
    const folder = await GDrive.files.createFolder(BACKUP_FOLDER);

    // バックアップファイルを作成
    const fileContent = JSON.stringify(data);
    await GDrive.files.createFileMultipart(
      fileContent,
      'application/json',
      {
        parents: [folder.id],
        name: BACKUP_FILENAME,
      }
    );

    console.log('Google Drive backup completed');
  } catch (error) {
    console.error('Failed to backup to Google Drive:', error);
  }
}

export async function restoreFromGoogleDrive(): Promise<any | null> {
  if (Platform.OS !== 'android') return null;

  try {
    // バックアップファイルを検索
    const files = await GDrive.files.list({
      q: `name='${BACKUP_FILENAME}'`,
    });

    if (files.files.length === 0) {
      return null;
    }

    // 最新のバックアップを取得
    const latestFile = files.files[0];
    const content = await GDrive.files.download(latestFile.id);

    return JSON.parse(content);
  } catch (error) {
    console.error('Failed to restore from Google Drive:', error);
    return null;
  }
}
```

## 自動バックアップのスケジューリング

### 1. バックグラウンドタスク設定

```bash
npx expo install expo-background-fetch expo-task-manager
```

### 2. 実装

```typescript
// app/core/services/autoBackupScheduler.ts
import * as BackgroundFetch from 'expo-background-fetch';
import * as TaskManager from 'expo-task-manager';
import { Platform } from 'react-native';
import { performAutoBackup as performICloudBackup } from './iCloudBackup';
import { performAutoBackup as performGoogleDriveBackup } from './googleDriveBackup';
import { exportAllData } from './backupService';

const BACKUP_TASK_NAME = 'auto-backup-task';

// バックグラウンドタスクの定義
TaskManager.defineTask(BACKUP_TASK_NAME, async () => {
  try {
    // データをエクスポート
    const data = await exportAllData();

    // プラットフォームに応じてバックアップ
    if (Platform.OS === 'ios') {
      await performICloudBackup(data);
    } else if (Platform.OS === 'android') {
      await performGoogleDriveBackup(data);
    }

    return BackgroundFetch.BackgroundFetchResult.NewData;
  } catch (error) {
    console.error('Auto backup failed:', error);
    return BackgroundFetch.BackgroundFetchResult.Failed;
  }
});

// 自動バックアップを有効化（日次）
export async function enableAutoBackup(): Promise<void> {
  await BackgroundFetch.registerTaskAsync(BACKUP_TASK_NAME, {
    minimumInterval: 60 * 60 * 24, // 24時間
    stopOnTerminate: false,
    startOnBoot: true,
  });
}

// 自動バックアップを無効化
export async function disableAutoBackup(): Promise<void> {
  await BackgroundFetch.unregisterTaskAsync(BACKUP_TASK_NAME);
}
```

## Settings画面への統合

```typescript
// app/(tabs)/settings.tsx に追加
import { enableAutoBackup, disableAutoBackup } from '@/app/core/services/autoBackupScheduler';
import { useSubscriptionStore } from '@/app/core/store/subscriptionStore';

const [autoBackupEnabled, setAutoBackupEnabled] = useState(false);
const { isProUser } = useSubscriptionStore();

const handleToggleAutoBackup = async (enabled: boolean) => {
  if (!isProUser) {
    Alert.alert(
      'Pro Plan限定機能',
      '自動バックアップはPro Planでのみ利用可能です。',
      [
        { text: 'キャンセル', style: 'cancel' },
        { text: 'Pro Planを見る', onPress: () => router.push('/paywall') },
      ]
    );
    return;
  }

  try {
    if (enabled) {
      await enableAutoBackup();
    } else {
      await disableAutoBackup();
    }
    setAutoBackupEnabled(enabled);
  } catch (error) {
    Alert.alert('エラー', '設定の変更に失敗しました');
  }
};
```

## Pro Plan機能としての位置づけ

### 料金プラン比較

| 機能 | Free Plan | Pro Plan |
|------|-----------|----------|
| 手動バックアップ | ✅ | ✅ |
| **自動クラウドバックアップ** | ❌ | ✅ |
| 参考書登録数 | 3冊まで | 無制限 |
| AI推薦機能 | ❌ | ✅ |

### メリット

- データ消失リスクの完全回避
- デバイス変更時の簡単な移行
- 安心感によるアプリ利用促進
- Pro Plan加入の強力なインセンティブ

## 実装優先度

**HIGH - リリース前に実装推奨**

理由：
- Local Firstアプリの最大の弱点を補完
- ユーザーの学習履歴（資産）を保護
- Pro Planの価値を大幅に向上
