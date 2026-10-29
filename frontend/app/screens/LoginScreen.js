// frontend/app/screens/LoginScreen.js

import React, {
  useState,
} from 'react';

import {
  
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Keyboard,
  Platform,
  ScrollView,
  useWindowDimensions,
} from 'react-native';

import {
  SafeAreaView,
} from 'react-native-safe-area-context';

import {
  StatusBar,
} from 'expo-status-bar';

import {
  API_BASE_URL,
} from '../config';

import {
  COLORS,
  RADIUS,
  SHADOWS,
} from '../theme';


const BRAND_LOGO =
  require('../../assets/image-style-logo.png');


/* =========================================================
   SMALL COMPONENTS
========================================================= */

function FieldLabel({
  children,
}) {
  return (
    <Text
      style={{
        color:
          COLORS.text,

        fontSize: 13,

        fontWeight:
          '700',

        marginBottom: 7,
      }}
    >
      {children}
    </Text>
  );
}


function LoginInput({
  style,
  ...props
}) {
  return (
    <TextInput
      placeholderTextColor={
        COLORS.textMuted
      }

      selectionColor={
        COLORS.royal
      }

      style={[
        {
          minHeight: 54,

          borderWidth: 1,

          borderColor:
            COLORS.border,

          borderRadius:
            RADIUS.medium,

          backgroundColor:
            COLORS.white,

          paddingHorizontal:
            15,

          color:
            COLORS.text,

          fontSize: 15,
        },

        style,
      ]}

      {...props}
    />
  );
}


/* =========================================================
   MAIN SCREEN
========================================================= */

export default function LoginScreen({
  onLogin,
}) {
  const {
    width,
  } =
    useWindowDimensions();


  const isPhone =
    width < 700;


  /*
   * IMPORTANT:
   *
   * Do not hardcode credentials here.
   * These must start empty.
   */

  const [
    email,
    setEmail,
  ] =
    useState('');


  const [
    password,
    setPassword,
  ] =
    useState('');


  const [
    rememberMe,
    setRememberMe,
  ] =
    useState(true);


  const [
    showPassword,
    setShowPassword,
  ] =
    useState(false);


  const [
    loading,
    setLoading,
  ] =
    useState(false);


  /* =====================================================
     LOGIN
  ===================================================== */

  const submitLogin =
    async () => {
      const cleanEmail =
        email
          .trim()
          .toLowerCase();


      if (
        !cleanEmail ||
        !password
      ) {
        return Alert.alert(
          'Missing information',
          'Enter your email and password.'
        );
      }


      try {
        setLoading(
          true
        );

        Keyboard.dismiss();


        /*
         * FastAPI OAuth2 login expects:
         *
         * username=email
         * password=password
         *
         * as application/x-www-form-urlencoded
         */

        const body =
          `username=${encodeURIComponent(
            cleanEmail
          )}` +
          `&password=${encodeURIComponent(
            password
          )}`;


        const response =
          await fetch(
            `${API_BASE_URL}/auth/login`,
            {
              method:
                'POST',

              headers: {
                'Content-Type':
                  'application/x-www-form-urlencoded',
              },

              body,
            }
          );


        if (
          !response.ok
        ) {
          let message =
            'Unable to sign in.';


          try {
            const data =
              await response.json();

            message =
              data?.detail ||
              message;
          } catch {
            const text =
              await response.text();

            if (text) {
              message =
                text;
            }
          }


          throw new Error(
            message
          );
        }


        const data =
          await response.json();


        const token =
          data?.access_token;


        if (!token) {
          throw new Error(
            'The server did not return an access token.'
          );
        }


        /*
         * App.js now owns SecureStore.
         *
         * Pass the Remember Me choice
         * along with the token.
         */

        await onLogin(
          token,
          rememberMe
        );
      } catch (
        error
      ) {
        Alert.alert(
          'Sign in failed',
          String(
            error.message ||
            error
          )
        );
      } finally {
        setLoading(
          false
        );
      }
    };


  /* =====================================================
     RENDER
  ===================================================== */

  return (
    <SafeAreaView
      style={{
        flex: 1,

        backgroundColor:
          COLORS.royal,
      }}

      edges={[
        'top',
        'bottom',
      ]}
    >
      <StatusBar
        style="light"
      />


      <KeyboardAvoidingView
        style={{
          flex: 1,
        }}

        behavior={
          Platform.OS ===
          'ios'
            ? 'padding'
            : undefined
        }
      >
        <ScrollView
          contentContainerStyle={{
            flexGrow: 1,

            justifyContent:
              'center',

            paddingHorizontal:
              isPhone
                ? 20
                : 32,

            paddingVertical:
              30,
          }}

          keyboardShouldPersistTaps="handled"

          showsVerticalScrollIndicator={
            false
          }
        >
          <View
            style={{
              width: '100%',

              maxWidth:
                470,

              alignSelf:
                'center',
            }}
          >

            {/* ============================================
                BRAND
            ============================================ */}

            <View
              style={{
                alignItems:
                  'center',

                marginBottom:
                  28,
              }}
            >
              <View
                style={{
                  width:
                    isPhone
                      ? 104
                      : 120,

                  height:
                    isPhone
                      ? 104
                      : 120,

                  borderRadius:
                    isPhone
                      ? 52
                      : 60,

                  backgroundColor:
                    COLORS.white,

                  alignItems:
                    'center',

                  justifyContent:
                    'center',

                  overflow:
                    'hidden',

                  borderWidth: 2,

                  borderColor:
                    'rgba(255,255,255,0.45)',

                  ...SHADOWS.floating,
                }}
              >
                <Image
                  source={
                    BRAND_LOGO
                  }

                  resizeMode="cover"

                  style={{
                    width:
                      isPhone
                        ? 104
                        : 120,

                    height:
                      isPhone
                        ? 104
                        : 120,
                  }}
                />
              </View>


              <Text
                style={{
                  color:
                    COLORS.white,

                  fontSize:
                    isPhone
                      ? 27
                      : 31,

                  fontWeight:
                    '900',

                  marginTop:
                    18,

                  textAlign:
                    'center',
                }}
              >
                Image & Style
              </Text>


              <Text
                style={{
                  color:
                    'rgba(255,255,255,0.72)',

                  fontSize: 13,

                  marginTop: 6,

                  textAlign:
                    'center',
                }}
              >
                Salon Management
              </Text>
            </View>


            {/* ============================================
                LOGIN CARD
            ============================================ */}

            <View
              style={{
                backgroundColor:
                  COLORS.white,

                borderRadius:
                  RADIUS.xlarge,

                padding:
                  isPhone
                    ? 20
                    : 26,

                ...SHADOWS.floating,
              }}
            >
              <Text
                style={{
                  color:
                    COLORS.text,

                  fontSize: 23,

                  fontWeight:
                    '900',
                }}
              >
                Welcome back
              </Text>


              <Text
                style={{
                  color:
                    COLORS.textMuted,

                  fontSize: 13,

                  lineHeight: 18,

                  marginTop: 5,

                  marginBottom:
                    22,
                }}
              >
                Sign in to access your salon workspace.
              </Text>


              {/* EMAIL */}

              <FieldLabel>
                Email
              </FieldLabel>

              <LoginInput
                value={
                  email
                }

                onChangeText={
                  setEmail
                }

                placeholder="you@email.com"

                keyboardType="email-address"

                autoCapitalize="none"

                autoCorrect={
                  false
                }

                textContentType="username"

                autoComplete="email"

                returnKeyType="next"

                style={{
                  marginBottom:
                    16,
                }}
              />


              {/* PASSWORD */}

              <FieldLabel>
                Password
              </FieldLabel>


              <View
                style={{
                  position:
                    'relative',

                  marginBottom:
                    16,
                }}
              >
                <LoginInput
                  value={
                    password
                  }

                  onChangeText={
                    setPassword
                  }

                  placeholder="Enter your password"

                  secureTextEntry={
                    !showPassword
                  }

                  textContentType="password"

                  autoComplete="password"

                  returnKeyType="done"

                  onSubmitEditing={
                    submitLogin
                  }

                  style={{
                    paddingRight:
                      70,
                  }}
                />


                <TouchableOpacity
                  activeOpacity={0.7}

                  onPress={() =>
                    setShowPassword(
                      (
                        previous
                      ) =>
                        !previous
                    )
                  }

                  style={{
                    position:
                      'absolute',

                    right: 12,

                    top: 0,

                    bottom: 0,

                    justifyContent:
                      'center',

                    paddingHorizontal:
                      5,
                  }}
                >
                  <Text
                    style={{
                      color:
                        COLORS.royal,

                      fontSize: 12,

                      fontWeight:
                        '800',
                    }}
                  >
                    {showPassword
                      ? 'Hide'
                      : 'Show'
                    }
                  </Text>
                </TouchableOpacity>
              </View>


              {/* REMEMBER ME */}

              <TouchableOpacity
                activeOpacity={0.8}

                onPress={() =>
                  setRememberMe(
                    (
                      previous
                    ) =>
                      !previous
                  )
                }

                style={{
                  flexDirection:
                    'row',

                  alignItems:
                    'center',

                  alignSelf:
                    'flex-start',

                  marginBottom:
                    20,
                }}
              >
                <View
                  style={{
                    width: 22,

                    height: 22,

                    borderRadius:
                      6,

                    borderWidth:
                      1.5,

                    borderColor:
                      rememberMe
                        ? COLORS.royal
                        : COLORS.borderStrong,

                    backgroundColor:
                      rememberMe
                        ? COLORS.royal
                        : COLORS.white,

                    alignItems:
                      'center',

                    justifyContent:
                      'center',

                    marginRight:
                      9,
                  }}
                >
                  {rememberMe && (
                    <Text
                      style={{
                        color:
                          COLORS.white,

                        fontSize: 14,

                        lineHeight: 15,

                        fontWeight:
                          '900',
                      }}
                    >
                      ✓
                    </Text>
                  )}
                </View>


                <View>
                  <Text
                    style={{
                      color:
                        COLORS.text,

                      fontSize: 13,

                      fontWeight:
                        '700',
                    }}
                  >
                    Remember me
                  </Text>

                  <Text
                    style={{
                      color:
                        COLORS.textMuted,

                      fontSize: 10,

                      marginTop: 1,
                    }}
                  >
                    Keep me signed in on this device
                  </Text>
                </View>
              </TouchableOpacity>


              {/* LOGIN BUTTON */}

              <TouchableOpacity
                activeOpacity={0.85}

                disabled={
                  loading
                }

                onPress={
                  submitLogin
                }

                style={{
                  minHeight: 54,

                  borderRadius:
                    RADIUS.medium,

                  backgroundColor:
                    COLORS.royal,

                  alignItems:
                    'center',

                  justifyContent:
                    'center',

                  opacity:
                    loading
                      ? 0.7
                      : 1,
                }}
              >
                {loading ? (
                  <ActivityIndicator
                    color={
                      COLORS.white
                    }
                  />
                ) : (
                  <Text
                    style={{
                      color:
                        COLORS.white,

                      fontSize: 15,

                      fontWeight:
                        '900',
                    }}
                  >
                    Sign In
                  </Text>
                )}
              </TouchableOpacity>


              <View
                style={{
                  flexDirection:
                    'row',

                  alignItems:
                    'center',

                  justifyContent:
                    'center',

                  marginTop: 18,
                }}
              >
                <View
                  style={{
                    width: 7,

                    height: 7,

                    borderRadius:
                      4,

                    backgroundColor:
                      COLORS.success,

                    marginRight: 6,
                  }}
                />


                <Text
                  style={{
                    color:
                      COLORS.textMuted,

                    fontSize: 10,

                    fontWeight:
                      '600',
                  }}
                >
                  Secure staff access
                </Text>
              </View>
            </View>


            <Text
              style={{
                color:
                  'rgba(255,255,255,0.55)',

                textAlign:
                  'center',

                fontSize: 10,

                marginTop: 20,
              }}
            >
              Image & Style • Staff Portal
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}