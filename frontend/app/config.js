// Frontend/app/config.js
import { Platform } from "react-native";

const guessLocal = () => {
  if (Platform.OS === "android") return "http://10.0.2.2:8000"; // Android emulator loopback
  return "http://127.0.0.1:8000"; // iOS simulator / web
};

const env = process.env.EXPO_PUBLIC_API_BASE_URL?.trim();

export const API_BASE_URL = env && env.length ? env : guessLocal();