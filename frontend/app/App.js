// frontend/app/App.js

import React, {
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  Image,
  Platform,
  useWindowDimensions,
} from 'react-native';

import {
  SafeAreaView,
  SafeAreaProvider,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';

import {
  StatusBar,
} from 'expo-status-bar';

import * as SecureStore
  from 'expo-secure-store';

import {
  API_BASE_URL,
} from './config';

import {
  COLORS,
  RADIUS,
  SHADOWS,
} from './theme';

import LoginScreen
  from './screens/LoginScreen';

import AppointmentsScreen
  from './screens/AppointmentsScreen';

import EarningsScreen
  from './screens/EarningsScreen';

import ClientsScreen
  from './screens/ClientsScreen';

import TimeScreen
  from './screens/TimeScreen';

import ProductsScreen
  from './screens/ProductsScreen';

import UsersScreen
  from './screens/UsersScreen';

import ServicesScreen
  from './screens/ServicesScreen';

import ClientHomeScreen
  from './screens/ClientHomeScreen';


const BRAND_LOGO =
  require('../assets/image-style-logo.png');


const TAB_LABELS = {
  appointments: 'Appointments',
  clients: 'Clients',
  products: 'Products',
  services: 'Services',
  users: 'Team',
  time: 'Time Clock',
  earnings: 'Earnings',
};


const TAB_ICONS = {
  appointments: '▣',
  clients: '♙',
  products: '▤',
  services: '✂',
  users: '♟',
  time: '◷',
  earnings: '▥',
};


function AppContent() {
  const { width } =
    useWindowDimensions();

  const insets =
    useSafeAreaInsets();


  /*
   * Responsive breakpoints
   */

  const isPhone =
    width < 700;

  const isTablet =
    width >= 700 &&
    width < 1100;

  const isDesktop =
    width >= 1100;

  const useSidebar =
    !isPhone;


  const sidebarWidth =
    isDesktop
      ? 260
      : 210;


  const [token, setToken] =
    useState(null);

  const [me, setMe] =
    useState(null);

  const [tab, setTab] =
    useState('appointments');

  const [booting, setBooting] =
    useState(true);

  const [moreOpen, setMoreOpen] =
    useState(false);

  const [
    logoutConfirmOpen,
    setLogoutConfirmOpen,
  ] =
    useState(false);


  /*
   * NEW:
   *
   * client = public salon website
   * staff  = private staff portal
   */

  const [
    portalMode,
    setPortalMode,
  ] =
    useState('client');

    /*
   * Stripe checkout return
   *
   * If Stripe sends us back after a staff payment,
   * automatically reopen the staff portal and the
   * Appointments tab.
   */

  useEffect(() => {
    if (
      Platform.OS !== 'web' ||
      typeof window === 'undefined'
    ) {
      return;
    }

    const params =
      new URLSearchParams(
        window.location.search
      );

    const stripePayment =
      params.get(
        'stripe_payment'
      );

    if (
      stripePayment === 'success' ||
      stripePayment === 'cancelled'
    ) {
      setPortalMode(
        'staff'
      );

      setTab(
        'appointments'
      );
    }
  }, []);  

  /*
 * Restore remembered session
 */

useEffect(() => {
  let cancelled = false;

  const restoreSession =
    async () => {
      try {
        let savedToken =
          null;

        if (
          Platform.OS === 'web' &&
          typeof window !==
            'undefined'
        ) {
          savedToken =
            window.localStorage
              .getItem(
                'image_style_token'
              );
        } else {
          savedToken =
            await SecureStore
              .getItemAsync(
                'token'
              );
        }

        if (
          savedToken &&
          !cancelled
        ) {
          setToken(
            savedToken
          );
        }
      } catch (error) {
        console.log(
          'Session restore error:',
          error
        );
      } finally {
        if (!cancelled) {
          setBooting(
            false
          );
        }
      }
    };

  restoreSession();

  return () => {
    cancelled = true;
  };
}, []);


  /*
   * Load logged-in user
   */

  useEffect(() => {
    let cancelled = false;

    const loadMe =
      async () => {
        if (!token) {
          setMe(null);
          return;
        }

        try {
          const response =
            await fetch(
              `${API_BASE_URL}/auth/me`,
              {
                headers: {
                  Authorization:
                    `Bearer ${token}`,
                },
              }
            );

          if (
            !response.ok
          ) {
            throw new Error(
              `${response.status} ${await response.text()}`
            );
          }

          const user =
            await response.json();

          if (!cancelled) {
            setMe(
              user
            );
          }
        } catch (error) {
          console.log(
            'Session validation failed:',
            error
          );

          if (!cancelled) {
            await logout(
              false
            );
          }
        }
      };

    loadMe();

    return () => {
      cancelled = true;
    };
  }, [
    token,
  ]);


  /*
   * Login
   */

  const handleLogin =
  async (
    newToken,
    remember = true
  ) => {
    setToken(
      newToken
    );

    try {
      if (
        Platform.OS === 'web' &&
        typeof window !==
          'undefined'
      ) {
        /*
         * On web we must preserve the staff session
         * because Stripe temporarily leaves the site
         * and then redirects back.
         */
        window.localStorage
          .setItem(
            'image_style_token',
            newToken
          );
      } else {
        if (remember) {
          await SecureStore
            .setItemAsync(
              'token',
              newToken
            );
        } else {
          await SecureStore
            .deleteItemAsync(
              'token'
            );
        }
      }
    } catch (error) {
      console.log(
        'Could not save session:',
        error
      );
    }
  };
  /*
   * Logout
   */

  const logout =
    async (
      showAlert = false
    ) => {
      setLogoutConfirmOpen(
        false
      );

      setMoreOpen(
        false
      );

      setToken(
        null
      );

      setMe(
        null
      );

      setTab(
        'appointments'
      );

      try {
        if (
          Platform.OS === 'web' &&
          typeof window !==
            'undefined'
        ) {
          window.localStorage
            .removeItem(
              'image_style_token'
            );
        } else {
          await SecureStore
            .deleteItemAsync(
              'token'
            );
        }
      } catch (error) {
        console.log(
          'Could not clear saved session:',
          error
        );
      
      }

      if (showAlert) {
        Alert.alert(
          'Logged out'
        );
      }
    };


  /*
   * Open logout confirmation
   */

  const confirmLogout = () => {
    setLogoutConfirmOpen(
      true
    );
  };


  /*
   * Styled logout confirmation
   */

  const LogoutConfirmModal = () => (
    <Modal
      visible={
        logoutConfirmOpen
      }

      transparent

      animationType="fade"

      onRequestClose={() =>
        setLogoutConfirmOpen(
          false
        )
      }
    >
      <Pressable
        onPress={() =>
          setLogoutConfirmOpen(
            false
          )
        }

        style={{
          flex: 1,

          backgroundColor:
            'rgba(16,24,40,0.55)',

          alignItems:
            'center',

          justifyContent:
            'center',

          paddingHorizontal:
            20,
        }}
      >
        <Pressable
          onPress={() => {}}

          style={{
            width:
              '100%',

            maxWidth:
              420,

            backgroundColor:
              COLORS.white,

            borderRadius:
              RADIUS.xlarge,

            padding:
              24,

            ...SHADOWS.floating,
          }}
        >
          <View
            style={{
              width:
                58,

              height:
                58,

              borderRadius:
                29,

              backgroundColor:
                COLORS.dangerSoft,

              alignItems:
                'center',

              justifyContent:
                'center',

              alignSelf:
                'center',

              marginBottom:
                18,
            }}
          >
            <Text
              style={{
                color:
                  COLORS.danger,

                fontSize:
                  26,

                fontWeight:
                  '900',
              }}
            >
              !
            </Text>
          </View>


          <Text
            style={{
              color:
                COLORS.text,

              fontSize:
                22,

              fontWeight:
                '900',

              textAlign:
                'center',
            }}
          >
            Log out?
          </Text>


          <Text
            style={{
              color:
                COLORS.textSecondary,

              fontSize:
                14,

              lineHeight:
                21,

              textAlign:
                'center',

              marginTop:
                8,
            }}
          >
            Are you sure you want to log out of your Image & Style account?
          </Text>


          <View
            style={{
              flexDirection:
                'row',

              gap:
                10,

              marginTop:
                24,
            }}
          >
            <TouchableOpacity
              activeOpacity={
                0.8
              }

              onPress={() =>
                setLogoutConfirmOpen(
                  false
                )
              }

              style={{
                flex:
                  1,

                minHeight:
                  50,

                borderRadius:
                  RADIUS.medium,

                borderWidth:
                  1,

                borderColor:
                  COLORS.borderStrong,

                backgroundColor:
                  COLORS.white,

                alignItems:
                  'center',

                justifyContent:
                  'center',
              }}
            >
              <Text
                style={{
                  color:
                    COLORS.text,

                  fontSize:
                    14,

                  fontWeight:
                    '800',
                }}
              >
                Cancel
              </Text>
            </TouchableOpacity>


            <TouchableOpacity
              activeOpacity={
                0.85
              }

              onPress={
                logout
              }

              style={{
                flex:
                  1,

                minHeight:
                  50,

                borderRadius:
                  RADIUS.medium,

                backgroundColor:
                  COLORS.danger,

                alignItems:
                  'center',

                justifyContent:
                  'center',
              }}
            >
              <Text
                style={{
                  color:
                    COLORS.white,

                  fontSize:
                    14,

                  fontWeight:
                    '900',
                }}
              >
                Log Out
              </Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );


  const role =
    me?.role ||
    'staff';

  const isOwner =
    role ===
    'owner';


  const availableTabs =
    useMemo(() => {
      if (isOwner) {
        return [
          'appointments',
          'earnings',
          'clients',
          'products',
          'time',
          'users',
          'services',
        ];
      }

      return [
        'appointments',
        'earnings',
        'time',
      ];
    }, [
      isOwner,
    ]);


  useEffect(() => {
    if (
      !availableTabs
        .includes(tab)
    ) {
      setTab(
        availableTabs[0]
      );
    }
  }, [
    availableTabs,
    tab,
  ]);


  /*
   * Render selected staff screen
   */

  const renderScreen =
    () => {
      switch (tab) {
        case 'appointments':
          return (
            <AppointmentsScreen
              token={token}
              me={me}
              onLogout={logout}
            />
          );

        case 'earnings':
          return (
            <EarningsScreen
              token={token}
              me={me}
              onLogout={logout}
            />
          );

        case 'clients':
          return (
            <ClientsScreen
              token={token}
              me={me}
              onLogout={logout}
            />
          );

        case 'products':
          return (
            <ProductsScreen
              token={token}
              me={me}
              onLogout={logout}
            />
          );

        case 'time':
          return (
            <TimeScreen
              token={token}
              me={me}
              onLogout={logout}
            />
          );

        case 'users':
          return (
            <UsersScreen
              token={token}
              me={me}
              onLogout={logout}
            />
          );

        case 'services':
          return (
            <ServicesScreen
              token={token}
              me={me}
              onLogout={logout}
            />
          );

        default:
          return null;
      }
    };


  /*
   * Shared logo
   */

  const BrandLogo = ({
    size = 48,
    inverted = false,
  }) => (
    <View
      style={{
        width:
          size,

        height:
          size,

        borderRadius:
          size / 2,

        overflow:
          'hidden',

        backgroundColor:
          COLORS.white,

        alignItems:
          'center',

        justifyContent:
          'center',

        borderWidth:
          inverted
            ? 1
            : 0,

        borderColor:
          inverted
            ? 'rgba(255,255,255,0.3)'
            : 'transparent',
      }}
    >
      <Image
        source={
          BRAND_LOGO
        }

        resizeMode="cover"

        style={{
          width:
            size,

          height:
            size,
        }}
      />
    </View>
  );


  /*
   * Sidebar navigation item
   */

  const SidebarItem = ({
    tabName,
  }) => {
    const active =
      tab ===
      tabName;

    return (
      <TouchableOpacity
        activeOpacity={
          0.8
        }

        onPress={() => {
          setTab(
            tabName
          );

          setMoreOpen(
            false
          );
        }}

        style={{
          minHeight:
            52,

          borderRadius:
            RADIUS.medium,

          marginBottom:
            7,

          paddingHorizontal:
            14,

          flexDirection:
            'row',

          alignItems:
            'center',

          backgroundColor:
            active
              ? COLORS.blueSoft
              : 'transparent',
        }}
      >
        <View
          style={{
            width:
              34,

            height:
              34,

            borderRadius:
              10,

            backgroundColor:
              active
                ? COLORS.royal
                : COLORS.surfaceSoft,

            alignItems:
              'center',

            justifyContent:
              'center',

            marginRight:
              12,
          }}
        >
          <Text
            style={{
              color:
                active
                  ? COLORS.white
                  : COLORS.royal,

              fontSize:
                17,

              fontWeight:
                '700',
            }}
          >
            {
              TAB_ICONS[
                tabName
              ]
            }
          </Text>
        </View>

        <Text
          numberOfLines={
            1
          }

          style={{
            color:
              active
                ? COLORS.royal
                : COLORS.textSecondary,

            fontSize:
              isDesktop
                ? 15
                : 14,

            fontWeight:
              active
                ? '800'
                : '600',

            flex:
              1,
          }}
        >
          {
            TAB_LABELS[
              tabName
            ]
          }
        </Text>
      </TouchableOpacity>
    );
  };


  /*
   * Phone bottom navigation
   */

  const BottomNavItem = ({
    tabName,
  }) => {
    const active =
      tab ===
      tabName;

    return (
      <TouchableOpacity
        activeOpacity={0.78}

        onPress={() => {
          setTab(
            tabName
          );
        }}

        style={{
          flex: 1,

          minHeight: 50,

          borderRadius:
            RADIUS.medium,

          alignItems:
            'center',

          justifyContent:
            'center',

          backgroundColor:
            active
              ? COLORS.blueSoft
              : 'transparent',
        }}
      >
        <Text
          style={{
            color:
              active
                ? COLORS.royal
                : COLORS.textMuted,

            fontSize: 17,

            fontWeight: '800',

            lineHeight: 20,
          }}
        >
          {
            TAB_ICONS[
              tabName
            ]
          }
        </Text>

        <Text
          numberOfLines={1}

          style={{
            color:
              active
                ? COLORS.royal
                : COLORS.textMuted,

            fontSize: 10,

            fontWeight:
              active
                ? '800'
                : '600',

            marginTop: 2,
          }}
        >
          {
            TAB_LABELS[
              tabName
            ]
          }
        </Text>
      </TouchableOpacity>
    );
  };


  /*
   * Loading screen
   */

  if (booting) {
    return (
      <SafeAreaView
        style={{
          flex: 1,

          backgroundColor:
            COLORS.background,

          alignItems:
            'center',

          justifyContent:
            'center',
        }}
      >
        <StatusBar
          style="dark"
        />

        <BrandLogo
          size={120}
        />

        <ActivityIndicator
          size="large"

          color={
            COLORS.royal
          }

          style={{
            marginTop: 24,
          }}
        />
      </SafeAreaView>
    );
  }


  /*
   * PUBLIC CLIENT WEBSITE
   */

  if (
    portalMode ===
    'client'
  ) {
    return (
      <ClientHomeScreen
        onStaffLogin={() =>
          setPortalMode(
            'staff'
          )
        }

        onBook={() =>
          Alert.alert(
            'Online booking',
            'The booking flow is the next client-side screen we will connect.'
          )
        }
      />
    );
  }


  /*
   * STAFF LOGIN
   */

  if (!token) {
    return (
      <View
        style={{
          flex: 1,
        }}
      >
        <StatusBar
          style="dark"
        />

        <LoginScreen
          onLogin={
            handleLogin
          }
        />


        {/* Back to public website */}

        <TouchableOpacity
          activeOpacity={
            0.8
          }

          onPress={() =>
            setPortalMode(
              'client'
            )
          }

          style={{
            position:
              'absolute',

            top:
              insets.top +
              12,

            left:
              14,

            minHeight:
              40,

            paddingHorizontal:
              14,

            borderRadius:
              RADIUS.round,

            backgroundColor:
              'rgba(255,255,255,0.94)',

            borderWidth:
              1,

            borderColor:
              'rgba(255,255,255,0.35)',

            alignItems:
              'center',

            justifyContent:
              'center',

            ...SHADOWS.card,
          }}
        >
          <Text
            style={{
              color:
                COLORS.royal,

              fontSize:
                12,

              fontWeight:
                '800',
            }}
          >
            ← Website
          </Text>
        </TouchableOpacity>
      </View>
    );
  }


  /*
   * Loading /auth/me
   */

  if (!me) {
    return (
      <SafeAreaView
        style={{
          flex: 1,

          backgroundColor:
            COLORS.background,

          alignItems:
            'center',

          justifyContent:
            'center',
        }}
      >
        <StatusBar
          style="dark"
        />

        <BrandLogo
          size={100}
        />

        <ActivityIndicator
          size="large"

          color={
            COLORS.royal
          }

          style={{
            marginTop: 22,
          }}
        />
      </SafeAreaView>
    );
  }


  /*
   * PART 2 CONTINUES WITH
   * TABLET / DESKTOP + PHONE STAFF PORTAL
   */
    /*
   * TABLET / DESKTOP
   */

    if (useSidebar) {
      return (
        <SafeAreaView
          style={{
            flex: 1,
  
            backgroundColor:
              COLORS.background,
          }}
        >
          <StatusBar
            style="dark"
          />
  
          <View
            style={{
              flex: 1,
  
              flexDirection:
                'row',
            }}
          >
  
            {/* SIDEBAR */}
  
            <View
              style={{
                width:
                  sidebarWidth,
  
                backgroundColor:
                  COLORS.white,
  
                borderRightWidth:
                  1,
  
                borderRightColor:
                  COLORS.border,
  
                paddingHorizontal:
                  isDesktop
                    ? 18
                    : 12,
  
                paddingTop:
                  20,
  
                paddingBottom:
                  20,
              }}
            >
  
              {/* Logo */}
  
              <View
                style={{
                  flexDirection:
                    'row',
  
                  alignItems:
                    'center',
  
                  paddingHorizontal:
                    8,
  
                  marginBottom:
                    28,
                }}
              >
                <BrandLogo
                  size={
                    isDesktop
                      ? 58
                      : 48
                  }
                />
  
                {isDesktop && (
                  <View
                    style={{
                      marginLeft:
                        12,
                    }}
                  >
                    <Text
                      style={{
                        color:
                          COLORS.royal,
  
                        fontSize:
                          18,
  
                        fontWeight:
                          '800',
                      }}
                    >
                      Image & Style
                    </Text>
  
                    <Text
                      style={{
                        color:
                          COLORS.textMuted,
  
                        fontSize:
                          10,
  
                        marginTop:
                          2,
  
                        letterSpacing:
                          1,
                      }}
                    >
                      SALON
                    </Text>
                  </View>
                )}
              </View>
  
  
              {/* Menu */}
  
              <View
                style={{
                  flex: 1,
                }}
              >
                {availableTabs.map(
                  (
                    tabName
                  ) => (
                    <SidebarItem
                      key={
                        tabName
                      }
  
                      tabName={
                        tabName
                      }
                    />
                  )
                )}
              </View>
  
  
              {/* User */}
  
              <View
                style={{
                  borderTopWidth:
                    1,
  
                  borderTopColor:
                    COLORS.border,
  
                  paddingTop:
                    16,
                }}
              >
                <View
                  style={{
                    paddingHorizontal:
                      8,
  
                    marginBottom:
                      12,
                  }}
                >
                  <Text
                    numberOfLines={1}
  
                    style={{
                      color:
                        COLORS.text,
  
                      fontWeight:
                        '800',
  
                      fontSize:
                        14,
                    }}
                  >
                    {me?.name}
                  </Text>
  
                  {isDesktop && (
                    <Text
                      numberOfLines={1}
  
                      style={{
                        color:
                          COLORS.textMuted,
  
                        fontSize:
                          11,
  
                        marginTop:
                          3,
                      }}
                    >
                      {me?.email}
                    </Text>
                  )}
  
                  <Text
                    style={{
                      color:
                        COLORS.royal,
  
                      fontSize:
                        11,
  
                      fontWeight:
                        '700',
  
                      marginTop:
                        3,
  
                      textTransform:
                        'capitalize',
                    }}
                  >
                    {me?.role}
                  </Text>
                </View>
  
  
                {/* DESKTOP LOGOUT */}
  
                <TouchableOpacity
                  onPress={
                    confirmLogout
                  }
  
                  style={{
                    minHeight:
                      44,
  
                    borderRadius:
                      RADIUS.medium,
  
                    backgroundColor:
                      COLORS.dangerSoft,
  
                    alignItems:
                      'center',
  
                    justifyContent:
                      'center',
                  }}
                >
                  <Text
                    style={{
                      color:
                        COLORS.danger,
  
                      fontSize:
                        13,
  
                      fontWeight:
                        '800',
                    }}
                  >
                    Log Out
                  </Text>
                </TouchableOpacity>
  
  
                {/* WEBSITE BUTTON */}
  
                <TouchableOpacity
                  activeOpacity={0.8}
  
                  onPress={() =>
                    setPortalMode(
                      'client'
                    )
                  }
  
                  style={{
                    minHeight:
                      44,
  
                    borderRadius:
                      RADIUS.medium,
  
                    backgroundColor:
                      COLORS.blueSoft,
  
                    alignItems:
                      'center',
  
                    justifyContent:
                      'center',
  
                    marginTop:
                      8,
                  }}
                >
                  <Text
                    style={{
                      color:
                        COLORS.royal,
  
                      fontSize:
                        13,
  
                      fontWeight:
                        '800',
                    }}
                  >
                    View Website
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
  
  
            {/* MAIN AREA */}
  
            <View
              style={{
                flex: 1,
  
                minWidth: 0,
              }}
            >
  
              {/* Desktop/tablet top header */}
  
              <View
                style={{
                  minHeight:
                    isDesktop
                      ? 78
                      : 68,
  
                  backgroundColor:
                    COLORS.white,
  
                  borderBottomWidth:
                    1,
  
                  borderBottomColor:
                    COLORS.border,
  
                  paddingHorizontal:
                    isDesktop
                      ? 32
                      : 22,
  
                  flexDirection:
                    'row',
  
                  alignItems:
                    'center',
  
                  justifyContent:
                    'space-between',
                }}
              >
                <View>
                  <Text
                    style={{
                      color:
                        COLORS.text,
  
                      fontSize:
                        isDesktop
                          ? 25
                          : 21,
  
                      fontWeight:
                        '800',
                    }}
                  >
                    {
                      TAB_LABELS[
                        tab
                      ]
                    }
                  </Text>
  
                  <Text
                    style={{
                      color:
                        COLORS.textMuted,
  
                      fontSize:
                        12,
  
                      marginTop:
                        3,
                    }}
                  >
                    Welcome back,{' '}
                    {
                      me?.name
                        ?.split(
                          ' '
                        )[0]
                    }
                  </Text>
                </View>
  
                <View
                  style={{
                    backgroundColor:
                      COLORS.blueSoft,
  
                    paddingHorizontal:
                      14,
  
                    paddingVertical:
                      8,
  
                    borderRadius:
                      RADIUS.round,
                  }}
                >
                  <Text
                    style={{
                      color:
                        COLORS.royal,
  
                      fontWeight:
                        '700',
  
                      fontSize:
                        12,
  
                      textTransform:
                        'capitalize',
                    }}
                  >
                    {me?.role}
                  </Text>
                </View>
              </View>
  
  
              {/* Page */}
  
              <View
                style={{
                  flex: 1,
  
                  backgroundColor:
                    COLORS.background,
  
                  width:
                    '100%',
  
                  alignSelf:
                    'center',
                }}
              >
                <View
                  style={{
                    flex: 1,
  
                    width:
                      '100%',
  
                    maxWidth:
                      isDesktop
                        ? 1500
                        : 1100,
  
                    alignSelf:
                      'center',
                  }}
                >
                  {renderScreen()}
                </View>
              </View>
            </View>
          </View>
  
          <LogoutConfirmModal />
  
        </SafeAreaView>
      );
    }
  
  
    /*
     * PHONE
     */
  
    const phoneMainTabs =
      isOwner
        ? [
            'appointments',
            'clients',
            'earnings',
          ]
        : [
            'appointments',
            'time',
            'earnings',
          ];
  
  
    return (
      <View
        style={{
          flex: 1,
  
          backgroundColor:
            COLORS.background,
        }}
      >
        <StatusBar
          style="dark"
  
          backgroundColor={
            COLORS.white
          }
        />
  
  
        {/* MOBILE WEBSITE HEADER */}
  
        <View
          style={{
            minHeight:
              62 +
              insets.top,
  
            paddingTop:
              insets.top,
  
            paddingHorizontal:
              16,
  
            backgroundColor:
              COLORS.white,
  
            borderBottomWidth: 1,
  
            borderBottomColor:
              COLORS.border,
  
            flexDirection:
              'row',
  
            alignItems:
              'center',
  
            justifyContent:
              'space-between',
          }}
        >
          <View
            style={{
              flexDirection:
                'row',
  
              alignItems:
                'center',
  
              flex: 1,
            }}
          >
            <BrandLogo
              size={38}
            />
  
            <View
              style={{
                marginLeft: 10,
  
                flex: 1,
              }}
            >
              <Text
                numberOfLines={1}
  
                style={{
                  color:
                    COLORS.royal,
  
                  fontSize: 16,
  
                  fontWeight: '900',
                }}
              >
                Image & Style
              </Text>
  
              <Text
                numberOfLines={1}
  
                style={{
                  color:
                    COLORS.textMuted,
  
                  fontSize: 10,
  
                  fontWeight: '700',
  
                  letterSpacing: 0.8,
  
                  marginTop: 1,
                }}
              >
                STAFF PORTAL
              </Text>
            </View>
          </View>
  
  
          <TouchableOpacity
            activeOpacity={0.8}
  
            onPress={() =>
              setMoreOpen(
                true
              )
            }
  
            style={{
              width: 42,
  
              height: 42,
  
              borderRadius:
                RADIUS.medium,
  
              backgroundColor:
                COLORS.blueVerySoft,
  
              borderWidth: 1,
  
              borderColor:
                COLORS.border,
  
              alignItems:
                'center',
  
              justifyContent:
                'center',
            }}
          >
            <Text
              style={{
                color:
                  COLORS.royal,
  
                fontSize: 22,
  
                fontWeight: '800',
  
                lineHeight: 24,
              }}
            >
              ☰
            </Text>
          </TouchableOpacity>
        </View>
  
  
        {/* MOBILE PAGE HEADING */}
  
        <View
          style={{
            backgroundColor:
              COLORS.royal,
  
            paddingHorizontal: 18,
  
            paddingTop: 14,
  
            paddingBottom: 15,
          }}
        >
          <View
            style={{
              flexDirection:
                'row',
  
              alignItems:
                'flex-end',
  
              justifyContent:
                'space-between',
            }}
          >
            <View
              style={{
                flex: 1,
  
                paddingRight: 12,
              }}
            >
              <Text
                numberOfLines={1}
  
                style={{
                  color:
                    COLORS.white,
  
                  fontSize: 23,
  
                  fontWeight: '900',
                }}
              >
                {
                  TAB_LABELS[
                    tab
                  ]
                }
              </Text>
  
              <Text
                numberOfLines={1}
  
                style={{
                  color:
                    'rgba(255,255,255,0.72)',
  
                  fontSize: 12,
  
                  marginTop: 3,
                }}
              >
                Welcome back,{' '}
                {
                  me?.name
                    ?.split(
                      ' '
                    )[0]
                }
              </Text>
            </View>
  
            <View
              style={{
                paddingHorizontal: 10,
  
                paddingVertical: 6,
  
                borderRadius:
                  RADIUS.round,
  
                backgroundColor:
                  'rgba(255,255,255,0.14)',
  
                borderWidth: 1,
  
                borderColor:
                  'rgba(255,255,255,0.18)',
              }}
            >
              <Text
                style={{
                  color:
                    COLORS.white,
  
                  fontSize: 10,
  
                  fontWeight: '800',
  
                  textTransform:
                    'capitalize',
                }}
              >
                {me?.role}
              </Text>
            </View>
          </View>
        </View>
  
  
        {/* PHONE PAGE */}
  
        <View
          style={{
            flex: 1,
  
            backgroundColor:
              COLORS.background,
          }}
        >
          {renderScreen()}
        </View>
  
  
        {/* MOBILE WEBSITE QUICK NAV */}
  
        <View
          style={{
            backgroundColor:
              COLORS.white,
  
            borderTopWidth: 1,
  
            borderTopColor:
              COLORS.border,
  
            paddingHorizontal: 8,
  
            paddingTop: 7,
  
            paddingBottom:
              Math.max(
                insets.bottom,
                7
              ),
  
            ...SHADOWS.card,
          }}
        >
          <View
            style={{
              flexDirection:
                'row',
  
              alignItems:
                'center',
  
              gap: 4,
            }}
          >
            {phoneMainTabs.map(
              (tabName) => (
                <BottomNavItem
                  key={tabName}
                  tabName={
                    tabName
                  }
                />
              )
            )}
  
            <TouchableOpacity
              activeOpacity={0.78}
  
              onPress={() =>
                setMoreOpen(
                  true
                )
              }
  
              style={{
                flex: 1,
  
                minHeight: 50,
  
                borderRadius:
                  RADIUS.medium,
  
                alignItems:
                  'center',
  
                justifyContent:
                  'center',
              }}
            >
              <Text
                style={{
                  color:
                    COLORS.textMuted,
  
                  fontSize: 18,
  
                  fontWeight: '900',
  
                  lineHeight: 20,
                }}
              >
                ☰
              </Text>
  
              <Text
                style={{
                  color:
                    COLORS.textMuted,
  
                  fontSize: 10,
  
                  fontWeight: '600',
  
                  marginTop: 2,
                }}
              >
                Menu
              </Text>
            </TouchableOpacity>
          </View>
        </View>
  
  
        {/* PHONE MORE MENU */}
  
        <Modal
          visible={
            moreOpen
          }
  
          transparent
  
          animationType="fade"
  
          onRequestClose={() =>
            setMoreOpen(
              false
            )
          }
        >
          <Pressable
            onPress={() =>
              setMoreOpen(
                false
              )
            }
  
            style={{
              flex: 1,
  
              backgroundColor:
                'rgba(6,27,69,0.38)',
  
              justifyContent:
                'flex-end',
            }}
          >
            <Pressable
              onPress={() => {}}
  
              style={{
                backgroundColor:
                  COLORS.white,
  
                borderTopLeftRadius: 28,
  
                borderTopRightRadius: 28,
  
                maxHeight: '82%',
  
                paddingHorizontal: 18,
  
                paddingTop: 10,
  
                paddingBottom:
                  Math.max(
                    insets.bottom + 18,
                    28
                  ),
              }}
            >
              <View
                style={{
                  width: 40,
  
                  height: 4,
  
                  borderRadius: 4,
  
                  backgroundColor:
                    COLORS.borderStrong,
  
                  alignSelf:
                    'center',
  
                  marginBottom: 18,
                }}
              />
  
  
              {/* Account */}
  
              <View
                style={{
                  flexDirection:
                    'row',
  
                  alignItems:
                    'center',
  
                  paddingBottom: 18,
  
                  marginBottom: 14,
  
                  borderBottomWidth: 1,
  
                  borderBottomColor:
                    COLORS.border,
                }}
              >
                <BrandLogo
                  size={54}
                />
  
                <View
                  style={{
                    marginLeft: 13,
  
                    flex: 1,
                  }}
                >
                  <Text
                    numberOfLines={1}
  
                    style={{
                      color:
                        COLORS.text,
  
                      fontSize: 17,
  
                      fontWeight: '900',
                    }}
                  >
                    {me?.name}
                  </Text>
  
                  <Text
                    numberOfLines={1}
  
                    style={{
                      color:
                        COLORS.textSecondary,
  
                      marginTop: 2,
  
                      fontSize: 12,
                    }}
                  >
                    {me?.email}
                  </Text>
  
                  <Text
                    style={{
                      color:
                        COLORS.royal,
  
                      marginTop: 3,
  
                      fontSize: 11,
  
                      fontWeight: '800',
  
                      textTransform:
                        'capitalize',
                    }}
                  >
                    {me?.role}
                  </Text>
                </View>
  
                <TouchableOpacity
                  onPress={() =>
                    setMoreOpen(
                      false
                    )
                  }
  
                  style={{
                    width: 38,
  
                    height: 38,
  
                    borderRadius: 19,
  
                    backgroundColor:
                      COLORS.surfaceSoft,
  
                    alignItems:
                      'center',
  
                    justifyContent:
                      'center',
                  }}
                >
                  <Text
                    style={{
                      color:
                        COLORS.text,
  
                      fontSize: 20,
                    }}
                  >
                    ×
                  </Text>
                </TouchableOpacity>
              </View>
  
  
              <Text
                style={{
                  color:
                    COLORS.textMuted,
  
                  fontSize: 10,
  
                  fontWeight: '800',
  
                  letterSpacing: 1,
  
                  marginBottom: 9,
                }}
              >
                NAVIGATION
              </Text>
  
  
              <ScrollView
                showsVerticalScrollIndicator={
                  false
                }
              >
                {availableTabs.map(
                  (tabName) => {
                    const active =
                      tab ===
                      tabName;
  
                    return (
                      <TouchableOpacity
                        key={tabName}
  
                        activeOpacity={0.8}
  
                        onPress={() => {
                          setTab(
                            tabName
                          );
  
                          setMoreOpen(
                            false
                          );
                        }}
  
                        style={{
                          minHeight: 52,
  
                          borderRadius:
                            RADIUS.medium,
  
                          paddingHorizontal: 12,
  
                          marginBottom: 6,
  
                          flexDirection:
                            'row',
  
                          alignItems:
                            'center',
  
                          borderWidth: 1,
  
                          borderColor:
                            active
                              ? COLORS.royal
                              : 'transparent',
  
                          backgroundColor:
                            active
                              ? COLORS.blueSoft
                              : COLORS.white,
                        }}
                      >
                        <View
                          style={{
                            width: 34,
  
                            height: 34,
  
                            borderRadius: 10,
  
                            backgroundColor:
                              active
                                ? COLORS.royal
                                : COLORS.surfaceSoft,
  
                            alignItems:
                              'center',
  
                            justifyContent:
                              'center',
  
                            marginRight: 11,
                          }}
                        >
                          <Text
                            style={{
                              color:
                                active
                                  ? COLORS.white
                                  : COLORS.royal,
  
                              fontWeight: '800',
                            }}
                          >
                            {
                              TAB_ICONS[
                                tabName
                              ]
                            }
                          </Text>
                        </View>
  
                        <Text
                          style={{
                            flex: 1,
  
                            color:
                              active
                                ? COLORS.royal
                                : COLORS.text,
  
                            fontSize: 15,
  
                            fontWeight:
                              active
                                ? '800'
                                : '600',
                          }}
                        >
                          {
                            TAB_LABELS[
                              tabName
                            ]
                          }
                        </Text>
  
                        <Text
                          style={{
                            color:
                              COLORS.textMuted,
  
                            fontSize: 18,
                          }}
                        >
                          ›
                        </Text>
                      </TouchableOpacity>
                    );
                  }
                )}
  
  
                {/* BACK TO CLIENT WEBSITE */}
  
                <TouchableOpacity
                  activeOpacity={0.8}
  
                  onPress={() => {
                    setMoreOpen(
                      false
                    );
  
                    setPortalMode(
                      'client'
                    );
                  }}
  
                  style={{
                    minHeight: 50,
  
                    marginTop: 10,
  
                    borderRadius:
                      RADIUS.medium,
  
                    backgroundColor:
                      COLORS.blueSoft,
  
                    borderWidth: 1,
  
                    borderColor:
                      COLORS.border,
  
                    alignItems:
                      'center',
  
                    justifyContent:
                      'center',
                  }}
                >
                  <Text
                    style={{
                      color:
                        COLORS.royal,
  
                      fontSize: 14,
  
                      fontWeight: '800',
                    }}
                  >
                    View Client Website
                  </Text>
                </TouchableOpacity>
  
  
                {/* PHONE LOGOUT */}
  
                <TouchableOpacity
                  activeOpacity={0.8}
  
                  onPress={
                    confirmLogout
                  }
  
                  style={{
                    minHeight: 50,
  
                    marginTop: 10,
  
                    borderRadius:
                      RADIUS.medium,
  
                    backgroundColor:
                      COLORS.dangerSoft,
  
                    borderWidth: 1,
  
                    borderColor:
                      'rgba(240,68,56,0.16)',
  
                    alignItems:
                      'center',
  
                    justifyContent:
                      'center',
                  }}
                >
                  <Text
                    style={{
                      color:
                        COLORS.danger,
  
                      fontSize: 14,
  
                      fontWeight: '800',
                    }}
                  >
                    Log Out
                  </Text>
                </TouchableOpacity>
              </ScrollView>
            </Pressable>
          </Pressable>
        </Modal>
  
  
        {/* STYLED LOGOUT CONFIRMATION */}
  
        <LogoutConfirmModal />
  
      </View>
    );
  }
  
  
  export default function App() {
    return (
      <SafeAreaProvider>
        <AppContent />
      </SafeAreaProvider>
    );
  }