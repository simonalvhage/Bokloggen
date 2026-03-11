import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { BooksProvider } from './src/context/BooksContext';
import { colors } from './src/utils/theme';

import LibraryScreen from './src/screens/LibraryScreen';
import ScannerScreen from './src/screens/ScannerScreen';
import CollectionsScreen from './src/screens/CollectionsScreen';
import CollectionBooksScreen from './src/screens/CollectionBooksScreen';
import BookDetailScreen from './src/screens/BookDetailScreen';
import SettingsScreen from './src/screens/SettingsScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function LibraryStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="LibraryMain" component={LibraryScreen} />
      <Stack.Screen name="BookDetail" component={BookDetailScreen} />
    </Stack.Navigator>
  );
}

function CollectionsStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="CollectionsMain" component={CollectionsScreen} />
      <Stack.Screen name="CollectionBooks" component={CollectionBooksScreen} />
      <Stack.Screen name="BookDetail" component={BookDetailScreen} />
    </Stack.Navigator>
  );
}

function ScannerStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="ScannerMain" component={ScannerScreen} />
    </Stack.Navigator>
  );
}

const TAB_ICONS = {
  Library: { focused: 'library', unfocused: 'library-outline' },
  Scanner: { focused: 'scan-circle', unfocused: 'scan-circle-outline' },
  Collections: { focused: 'folder', unfocused: 'folder-outline' },
  Settings: { focused: 'settings', unfocused: 'settings-outline' },
};

export default function App() {
  return (
    <BooksProvider>
      <NavigationContainer>
        <StatusBar style="dark" />
        <Tab.Navigator
          screenOptions={({ route }) => ({
            headerShown: false,
            tabBarIcon: ({ focused, color }) => {
              const icons = TAB_ICONS[route.name];
              return (
                <Ionicons
                  name={focused ? icons.focused : icons.unfocused}
                  size={24}
                  color={color}
                />
              );
            },
            tabBarActiveTintColor: colors.primary,
            tabBarInactiveTintColor: colors.textTertiary,
            tabBarStyle: {
              backgroundColor: colors.tabBar,
              borderTopColor: colors.tabBarBorder,
              borderTopWidth: 1,
              paddingTop: 6,
              height: 88,
            },
            tabBarLabelStyle: {
              fontSize: 11,
              fontWeight: '600',
            },
          })}
        >
          <Tab.Screen
            name="Library"
            component={LibraryStack}
            options={{ tabBarLabel: 'Bibliotek' }}
          />
          <Tab.Screen
            name="Scanner"
            component={ScannerStack}
            options={{ tabBarLabel: 'Skanna' }}
          />
          <Tab.Screen
            name="Collections"
            component={CollectionsStack}
            options={{ tabBarLabel: 'Samlingar' }}
          />
          <Tab.Screen
            name="Settings"
            component={SettingsScreen}
            options={{ tabBarLabel: 'Inställningar' }}
          />
        </Tab.Navigator>
      </NavigationContainer>
    </BooksProvider>
  );
}
