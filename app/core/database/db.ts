/**
 * Platform-specific Database Export
 * Web: IndexedDB / Native: SQLite
 */
import { Platform } from 'react-native';

if (Platform.OS === 'web') {
  module.exports = require('./db.web');
} else {
  module.exports = require('./db.native');
}

