// frontend/app/screens/ClientsScreen.js

import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  Keyboard,
  Linking,
  FlatList,
  ActivityIndicator,
  useWindowDimensions,
  Platform,
} from 'react-native';

import {
  API_BASE_URL,
} from '../config';

import {
  COLORS,
  RADIUS,
  SHADOWS,
} from '../theme';


/* =========================================================
   SMALL COMPONENTS
========================================================= */

function SearchInput({
  value,
  onChangeText,
}) {
  return (
    <View
      style={{
        position: 'relative',
      }}
    >
      <TextInput
        value={value}
        onChangeText={onChangeText}

        placeholder="Search by name, phone, or email"

        placeholderTextColor={
          COLORS.textMuted
        }

        selectionColor={
          COLORS.royal
        }

        autoCapitalize="none"

        returnKeyType="search"

        style={{
          minHeight: 52,

          color:
            COLORS.text,

          backgroundColor:
            COLORS.white,

          borderWidth: 1,

          borderColor:
            COLORS.border,

          borderRadius:
            RADIUS.medium,

          paddingHorizontal: 16,

          paddingRight: 48,

          fontSize: 15,
        }}
      />

      {!!value && (
        <TouchableOpacity
          onPress={() =>
            onChangeText('')
          }

          style={{
            position: 'absolute',

            right: 8,

            top: 6,

            width: 40,

            height: 40,

            borderRadius: 20,

            alignItems: 'center',

            justifyContent:
              'center',
          }}
        >
          <Text
            style={{
              color:
                COLORS.textMuted,

              fontSize: 18,

              fontWeight:
                '600',
            }}
          >
            ×
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}


function SegmentedButton({
  title,
  active,
  onPress,
}) {
  return (
    <TouchableOpacity
      activeOpacity={0.8}

      onPress={onPress}

      style={{
        flex: 1,

        minHeight: 44,

        borderRadius:
          RADIUS.medium,

        borderWidth: 1,

        borderColor:
          active
            ? COLORS.royal
            : COLORS.border,

        backgroundColor:
          active
            ? COLORS.blueSoft
            : COLORS.white,

        alignItems:
          'center',

        justifyContent:
          'center',

        paddingHorizontal:
          10,
      }}
    >
      <Text
        style={{
          color:
            active
              ? COLORS.royal
              : COLORS.textSecondary,

          fontSize: 13,

          fontWeight:
            active
              ? '800'
              : '600',
        }}
      >
        {title}
      </Text>
    </TouchableOpacity>
  );
}


function ActionButton({
  title,
  onPress,
  danger = false,
  filled = false,
}) {
  return (
    <TouchableOpacity
      activeOpacity={0.8}

      onPress={onPress}

      style={{
        flex: 1,

        minHeight: 44,

        borderRadius:
          RADIUS.medium,

        alignItems:
          'center',

        justifyContent:
          'center',

        borderWidth: 1,

        borderColor:
          danger
            ? COLORS.danger
            : filled
              ? COLORS.royal
              : COLORS.border,

        backgroundColor:
          danger
            ? COLORS.dangerSoft
            : filled
              ? COLORS.royal
              : COLORS.white,

        paddingHorizontal:
          10,
      }}
    >
      <Text
        style={{
          color:
            danger
              ? COLORS.danger
              : filled
                ? COLORS.white
                : COLORS.royal,

          fontSize: 13,

          fontWeight:
            '800',
        }}
      >
        {title}
      </Text>
    </TouchableOpacity>
  );
}


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

        marginBottom: 6,
      }}
    >
      {children}
    </Text>
  );
}


function AppInput({
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
          minHeight: 50,

          color:
            COLORS.text,

          backgroundColor:
            COLORS.white,

          borderWidth: 1,

          borderColor:
            COLORS.border,

          borderRadius:
            RADIUS.medium,

          paddingHorizontal: 14,

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

export default function ClientsScreen({
  token,
}) {
  const {
    width,
  } =
    useWindowDimensions();


  const isPhone =
    width < 700;

  const isTablet =
    width >= 700 &&
    width < 1100;

  const isDesktop =
    width >= 1100;


  const contentPadding =
    isDesktop
      ? 28
      : isTablet
        ? 22
        : 16;


  const [
    clients,
    setClients,
  ] =
    useState([]);


  const [
    loading,
    setLoading,
  ] =
    useState(true);


  const [
    query,
    setQuery,
  ] =
    useState('');


  const [
    sortMode,
    setSortMode,
  ] =
    useState(
      'lastName'
    );


  /* =====================================================
     CURRENT USER / BROADCAST STATE
  ===================================================== */

  const [
    currentUser,
    setCurrentUser,
  ] =
    useState(null);


  const [
    emailComposerOpen,
    setEmailComposerOpen,
  ] =
    useState(false);


  const [
    broadcastSubject,
    setBroadcastSubject,
  ] =
    useState('');


  const [
    broadcastMessage,
    setBroadcastMessage,
  ] =
    useState('');


  const [
    sendingBroadcast,
    setSendingBroadcast,
  ] =
    useState(false);

    /* =====================================================
     ADD CLIENT STATE
  ===================================================== */

  const [
    addClientOpen,
    setAddClientOpen,
  ] =
    useState(false);


  const [
    newFirst,
    setNewFirst,
  ] =
    useState('');


  const [
    newLast,
    setNewLast,
  ] =
    useState('');


  const [
    newPhone,
    setNewPhone,
  ] =
    useState('');


  const [
    newEmail,
    setNewEmail,
  ] =
    useState('');


  const [
    savingClient,
    setSavingClient,
  ] =
    useState(false);


  /* =====================================================
     CLIENT HISTORY STATE
  ===================================================== */

  const [
    historyClientId,
    setHistoryClientId,
  ] =
    useState(null);


  const [
    historyLoadingId,
    setHistoryLoadingId,
  ] =
    useState(null);


  const [
    historyByClient,
    setHistoryByClient,
  ] =
    useState({});


  const [
    historyErrors,
    setHistoryErrors,
  ] =
    useState({});


  const [
    historyStaff,
    setHistoryStaff,
  ] =
    useState({});


  const [
    expandedAppointmentId,
    setExpandedAppointmentId,
  ] =
    useState(null);


  const [
    visitLoadingId,
    setVisitLoadingId,
  ] =
    useState(null);


  const [
    visitDetails,
    setVisitDetails,
  ] =
    useState({});


  const [
    visitErrors,
    setVisitErrors,
  ] =
    useState({});


  /* =====================================================
     EDIT STATE
  ===================================================== */

  const [
    editingId,
    setEditingId,
  ] =
    useState(null);


  const [
    editFirst,
    setEditFirst,
  ] =
    useState('');


  const [
    editLast,
    setEditLast,
  ] =
    useState('');


  const [
    editPhone,
    setEditPhone,
  ] =
    useState('');


  const [
    editEmail,
    setEditEmail,
  ] =
    useState('');


  const authHeaders =
    useMemo(
      () => ({
        Authorization:
          `Bearer ${token}`,

        'Content-Type':
          'application/json',
      }),
      [token]
    );


  /* =====================================================
     HELPERS
  ===================================================== */

  const sortByLastName =
    (
      list
    ) =>
      (
        Array.isArray(list)
          ? list
          : []
      )
        .slice()
        .sort(
          (
            a,
            b
          ) => {
            const lastA =
              (
                a.last_name ||
                ''
              ).toLowerCase();

            const lastB =
              (
                b.last_name ||
                ''
              ).toLowerCase();

            if (
              lastA !==
              lastB
            ) {
              return lastA.localeCompare(
                lastB
              );
            }

            const firstA =
              (
                a.first_name ||
                ''
              ).toLowerCase();

            const firstB =
              (
                b.first_name ||
                ''
              ).toLowerCase();

            return firstA.localeCompare(
              firstB
            );
          }
        );


  const sortByRecent =
    (
      list
    ) =>
      (
        Array.isArray(list)
          ? list
          : []
      )
        .slice()
        .sort(
          (
            a,
            b
          ) =>
            (
              b.id ||
              0
            ) -
            (
              a.id ||
              0
            )
        );


  async function fetchOk(
    url,
    options
  ) {
    const response =
      await fetch(
        url,
        options
      );

    if (
      !response.ok
    ) {
      const text =
        await response.text();

      throw new Error(
        `${response.status} ${text}`
      );
    }

    return response;
  }


  const load =
    async () => {
      const response =
        await fetchOk(
          `${API_BASE_URL}/clients/`,
          {
            headers:
              authHeaders,
          }
        );

      const data =
        await response.json();

      setClients(
        sortMode ===
        'lastName'
          ? sortByLastName(
              data
            )
          : sortByRecent(
              data
            )
      );
    };


  useEffect(
    () => {
      (
        async () => {
          try {
            const [
              clientsResult,
              meResponse,
            ] =
              await Promise.all([
                load(),

                fetchOk(
                  `${API_BASE_URL}/auth/me`,
                  {
                    headers:
                      authHeaders,
                  }
                ),
              ]);

            void clientsResult;

            const me =
              await meResponse.json();

            setCurrentUser(
              me
            );
          } catch (
            error
          ) {
            Alert.alert(
              'Error',
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
        }
      )();
    },
    []
  );


  useEffect(
    () => {
      setClients(
        (
          previous
        ) =>
          sortMode ===
          'lastName'
            ? sortByLastName(
                previous
              )
            : sortByRecent(
                previous
              )
      );
    },
    [
      sortMode,
    ]
  );


  const refresh =
    useCallback(
      async () => {
        try {
          await load();
        } catch (
          error
        ) {
          Alert.alert(
            'Error',
            String(
              error.message ||
              error
            )
          );
        }
      },
      [
        sortMode,
        token,
      ]
    );


  const filtered =
    useMemo(
      () => {
        const search =
          query
            .trim()
            .toLowerCase();

        if (!search) {
          return clients;
        }

        return clients.filter(
          (
            client
          ) => {
            const searchable =
              [
                client.first_name ||
                  '',

                client.last_name ||
                  '',

                client.phone ||
                  '',

                client.email ||
                  '',
              ]
                .join(' ')
                .toLowerCase();

            return searchable.includes(
              search
            );
          }
        );
      },
      [
        clients,
        query,
      ]
    );


  const resultsCount =
    filtered.length;


  const emailRecipientCount =
    useMemo(
      () =>
        new Set(
          clients
            .map(
              (client) =>
                (
                  client.email ||
                  ''
                )
                  .trim()
                  .toLowerCase()
            )
            .filter(Boolean)
        ).size,
      [clients]
    );


  const phoneRecipientCount =
    useMemo(
      () =>
        new Set(
          clients
            .map(
              (client) =>
                (
                  client.phone ||
                  ''
                ).trim()
            )
            .filter(Boolean)
        ).size,
      [clients]
    );

      /* =====================================================
     ADD CLIENT
  ===================================================== */

  const resetAddClient =
  () => {
    setNewFirst('');
    setNewLast('');
    setNewPhone('');
    setNewEmail('');

    setAddClientOpen(
      false
    );

    Keyboard.dismiss();
  };


const createClient =
  async () => {
    if (
      savingClient
    ) {
      return;
    }


    if (
      !newFirst.trim()
    ) {
      Alert.alert(
        'First name required',
        'Enter the client’s first name.'
      );

      return;
    }


    if (
      !newLast.trim()
    ) {
      Alert.alert(
        'Last name required',
        'Enter the client’s last name.'
      );

      return;
    }


    try {
      setSavingClient(
        true
      );


      const response =
        await fetchOk(
          `${API_BASE_URL}/clients/`,
          {
            method:
              'POST',

            headers:
              authHeaders,

            body:
              JSON.stringify(
                {
                  first_name:
                    newFirst.trim(),

                  last_name:
                    newLast.trim(),

                  phone:
                    newPhone.trim() ||
                    null,

                  email:
                    newEmail.trim() ||
                    null,
                }
              ),
          }
        );


      const created =
        await response.json();


      setClients(
        (
          previous
        ) => {
          const next =
            [
              created,
              ...previous,
            ];

          return sortMode ===
          'lastName'
            ? sortByLastName(
                next
              )
            : sortByRecent(
                next
              );
        }
      );


      resetAddClient();


      Alert.alert(
        'Client added',
        `${created.first_name || ''} ${created.last_name || ''}`.trim() +
          ' has been added to your client list.'
      );
    } catch (
      error
    ) {
      Alert.alert(
        'Unable to add client',
        String(
          error.message ||
          error
        )
      );
    } finally {
      setSavingClient(
        false
      );
    }
  };


  /* =====================================================
     MASS EMAIL
  ===================================================== */

  const sendBroadcastEmail =
  async () => {
    if (
      sendingBroadcast
    ) {
      return;
    }


    if (
      !broadcastSubject.trim()
    ) {
      return Alert.alert(
        'Subject required',
        'Enter a subject for the email.'
      );
    }


    if (
      !broadcastMessage.trim()
    ) {
      return Alert.alert(
        'Message required',
        'Enter a message to send.'
      );
    }


    if (
      emailRecipientCount ===
      0
    ) {
      return Alert.alert(
        'No email recipients',
        'None of your clients have an email address on file.'
      );
    }


    let confirmed =
      true;


    if (
      Platform.OS ===
      'web'
    ) {
      confirmed =
        window.confirm(
          `Send this email to ${emailRecipientCount} client${
            emailRecipientCount === 1
              ? ''
              : 's'
          }?`
        );
    }


    if (
      !confirmed
    ) {
      return;
    }


    setSendingBroadcast(
      true
    );


    try {
      const response =
        await fetchOk(
          `${API_BASE_URL}/clients/broadcast/email`,
          {
            method:
              'POST',

            headers:
              authHeaders,

            body:
              JSON.stringify(
                {
                  subject:
                    broadcastSubject.trim(),

                  message:
                    broadcastMessage.trim(),
                }
              ),
          }
        );


      const result =
        await response.json();


      Alert.alert(
        'Email campaign finished',
        `${result.sent || 0} accepted by Resend${
          result.failed
            ? ` • ${result.failed} failed`
            : ''
        }.`
      );


      if (
        !result.failed
      ) {
        setBroadcastSubject(
          ''
        );

        setBroadcastMessage(
          ''
        );

        setEmailComposerOpen(
          false
        );
      }
    } catch (
      error
    ) {
      Alert.alert(
        'Email send failed',
        String(
          error.message ||
          error
        )
      );
    } finally {
      setSendingBroadcast(
        false
      );
    }
  };

  const showTextSetupMessage =
    () => {
      Alert.alert(
        'Text All',
        `You have ${phoneRecipientCount} client${
          phoneRecipientCount === 1
            ? ''
            : 's'
        } with a phone number. Mass SMS will be connected next with Twilio.`
      );
    };


  /* =====================================================
     COMMUNICATION
  ===================================================== */

  const callNumber =
    async (
      phone
    ) => {
      if (!phone) {
        return Alert.alert(
          'No phone number',
          'This client does not have a phone number.'
        );
      }

      try {
        await Linking.openURL(
          `tel:${phone}`
        );
      } catch {
        Alert.alert(
          'Unable to call',
          'This device could not open the phone app.'
        );
      }
    };


  const textNumber =
    async (
      phone
    ) => {
      if (!phone) {
        return Alert.alert(
          'No phone number',
          'This client does not have a phone number.'
        );
      }

      try {
        await Linking.openURL(
          `sms:${phone}`
        );
      } catch {
        Alert.alert(
          'Unable to text',
          'This device could not open Messages.'
        );
      }
    };


  const emailTo =
    async (
      email
    ) => {
      if (!email) {
        return Alert.alert(
          'No email address',
          'This client does not have an email address.'
        );
      }

      try {
        await Linking.openURL(
          `mailto:${email}`
        );
      } catch {
        Alert.alert(
          'Unable to email',
          'This device could not open an email app.'
        );
      }
    };
      /* =====================================================
     EDIT CLIENT
  ===================================================== */

  const startEdit =
  (
    client
  ) => {
    setEditingId(
      client.id
    );

    setEditFirst(
      client.first_name ||
        ''
    );

    setEditLast(
      client.last_name ||
        ''
    );

    setEditPhone(
      client.phone ||
        ''
    );

    setEditEmail(
      client.email ||
        ''
    );
  };


const cancelEdit =
  () => {
    setEditingId(
      null
    );

    setEditFirst(
      ''
    );

    setEditLast(
      ''
    );

    setEditPhone(
      ''
    );

    setEditEmail(
      ''
    );

    Keyboard.dismiss();
  };


const saveEdit =
  async (
    clientId
  ) => {
    if (
      !editFirst.trim()
    ) {
      return Alert.alert(
        'First name required',
        'Enter the client’s first name.'
      );
    }


    if (
      !editLast.trim()
    ) {
      return Alert.alert(
        'Last name required',
        'Enter the client’s last name.'
      );
    }


    try {
      const response =
        await fetchOk(
          `${API_BASE_URL}/clients/${clientId}`,
          {
            method:
              'PUT',

            headers:
              authHeaders,

            body:
              JSON.stringify(
                {
                  first_name:
                    editFirst.trim(),

                  last_name:
                    editLast.trim(),

                  phone:
                    editPhone.trim() ||
                    null,

                  email:
                    editEmail.trim() ||
                    null,
                }
              ),
          }
        );


      const updated =
        await response.json();


      setClients(
        (
          previous
        ) => {
          const next =
            previous.map(
              (
                client
              ) =>
                client.id ===
                clientId
                  ? updated
                  : client
            );

          return sortMode ===
          'lastName'
            ? sortByLastName(
                next
              )
            : sortByRecent(
                next
              );
        }
      );


      cancelEdit();


      Alert.alert(
        'Saved',
        'Client information has been updated.'
      );
    } catch (
      error
    ) {
      Alert.alert(
        'Unable to save',
        String(
          error.message ||
          error
        )
      );
    }
  };


/* =====================================================
   DELETE CLIENT
===================================================== */

const deleteClient =
  async (
    client
  ) => {
    try {
      await fetchOk(
        `${API_BASE_URL}/clients/${client.id}`,
        {
          method:
            'DELETE',

          headers:
            authHeaders,
        }
      );


      setClients(
        (
          previous
        ) =>
          previous.filter(
            (
              item
            ) =>
              item.id !==
              client.id
          )
      );


      if (
        editingId ===
        client.id
      ) {
        cancelEdit();
      }
    } catch (
      error
    ) {
      Alert.alert(
        'Unable to delete',
        String(
          error.message ||
          error
        )
      );
    }
  };


const confirmDelete =
  (
    client
  ) => {
    const name =
      [
        client.first_name,
        client.last_name,
      ]
        .filter(Boolean)
        .join(' ');


    Alert.alert(
      'Delete client?',
      `Are you sure you want to delete ${name || 'this client'}?`,
      [
        {
          text:
            'Cancel',

          style:
            'cancel',
        },

        {
          text:
            'Delete',

          style:
            'destructive',

          onPress:
            () =>
              deleteClient(
                client
              ),
        },
      ]
    );
  };


/* =====================================================
   CLIENT HISTORY HELPERS
===================================================== */

const formatMoney =
  (
    value
  ) => {
    const number =
      Number(
        value ||
        0
      );

    return `$${number.toFixed(2)}`;
  };


const formatHistoryDate =
  (
    value
  ) => {
    if (!value) {
      return 'Unknown date';
    }

    const date =
      new Date(
        value
      );

    if (
      Number.isNaN(
        date.getTime()
      )
    ) {
      return String(
        value
      );
    }

    return date.toLocaleDateString(
      undefined,
      {
        month:
          'short',

        day:
          'numeric',

        year:
          'numeric',
      }
    );
  };


const formatHistoryTime =
  (
    value
  ) => {
    if (!value) {
      return '';
    }

    const date =
      new Date(
        value
      );

    if (
      Number.isNaN(
        date.getTime()
      )
    ) {
      return '';
    }

    return date.toLocaleTimeString(
      undefined,
      {
        hour:
          'numeric',

        minute:
          '2-digit',
      }
    );
  };


const paymentStatusLabel =
  (
    status
  ) => {
    const labels = {
      unpaid:
        'Unpaid',

      partially_paid:
        'Partially Paid',

      paid:
        'Paid',

      partially_refunded:
        'Partially Refunded',

      refunded:
        'Refunded',
    };

    return (
      labels[status] ||
      status ||
      'Unknown'
    );
  };


const paymentStatusStyle =
  (
    status
  ) => {
    if (
      status ===
      'paid'
    ) {
      return {
        backgroundColor:
          '#EAF8F0',

        color:
          '#18794E',
      };
    }

    if (
      status ===
        'partially_paid' ||
      status ===
        'partially_refunded'
    ) {
      return {
        backgroundColor:
          '#FFF5D9',

        color:
          '#8A5A00',
      };
    }

    if (
      status ===
      'refunded'
    ) {
      return {
        backgroundColor:
          COLORS.blueSoft,

        color:
          COLORS.royal,
      };
    }

    return {
      backgroundColor:
        COLORS.dangerSoft,

      color:
        COLORS.danger,
    };
  };


const historyStatusLabel =
  (
    appointment
  ) => {
    const cancelled =
      [
        'cancelled',
        'late_cancelled',
      ].includes(
        appointment
          ?.booking_status
      );


    if (!cancelled) {
      return paymentStatusLabel(
        appointment
          ?.payment_status
      );
    }


    if (
      [
        'refunded',
        'partially_refunded',
      ].includes(
        appointment
          ?.payment_status
      )
    ) {
      return (
        'Cancelled • Deposit Refunded'
      );
    }


    if (
      Number(
        appointment
          ?.deposit_amount ||
        0
      ) > 0 &&
      [
        'paid',
        'partially_paid',
      ].includes(
        appointment
          ?.payment_status
      )
    ) {
      return (
        'Cancelled • Deposit Retained'
      );
    }


    return (
      'Cancelled • No Deposit'
    );
  };


const historyStatusStyle =
  (
    appointment
  ) => {
    const cancelled =
      [
        'cancelled',
        'late_cancelled',
      ].includes(
        appointment
          ?.booking_status
      );


    if (!cancelled) {
      return paymentStatusStyle(
        appointment
          ?.payment_status
      );
    }


    if (
      [
        'refunded',
        'partially_refunded',
      ].includes(
        appointment
          ?.payment_status
      )
    ) {
      return {
        backgroundColor:
          COLORS.blueSoft,

        color:
          COLORS.royal,
      };
    }


    if (
      Number(
        appointment
          ?.deposit_amount ||
        0
      ) > 0 &&
      [
        'paid',
        'partially_paid',
      ].includes(
        appointment
          ?.payment_status
      )
    ) {
      return {
        backgroundColor:
          '#FFF5D9',

        color:
          '#8A5A00',
      };
    }


    return {
      backgroundColor:
        COLORS.surfaceSoft,

      color:
        COLORS.textSecondary,
    };
  };


const openClientHistory =
  async (
    clientId,
    force = false
  ) => {
    if (
      !force &&
      historyClientId ===
      clientId
    ) {
      setHistoryClientId(
        null
      );

      setExpandedAppointmentId(
        null
      );

      return;
    }


    setHistoryClientId(
      clientId
    );

    setExpandedAppointmentId(
      null
    );


    if (
      !force &&
      Object.prototype.hasOwnProperty.call(
        historyByClient,
        clientId
      )
    ) {
      return;
    }


    try {
      setHistoryLoadingId(
        clientId
      );

      setHistoryErrors(
        (
          previous
        ) => ({
          ...previous,

          [clientId]:
            '',
        })
      );


      const [
        appointmentsResponse,
        staffResponse,
      ] =
        await Promise.all([
          fetch(
            `${API_BASE_URL}/appointments/?client_id=${clientId}`,
            {
              headers:
                authHeaders,
            }
          ),

          fetch(
            `${API_BASE_URL}/appointments/schedule-staff`,
            {
              headers:
                authHeaders,
            }
          ),
        ]);


      if (
        !appointmentsResponse.ok
      ) {
        const detail =
          await appointmentsResponse.text();

        throw new Error(
          `${appointmentsResponse.status} ${detail}`
        );
      }


      if (
        !staffResponse.ok
      ) {
        const detail =
          await staffResponse.text();

        throw new Error(
          `${staffResponse.status} ${detail}`
        );
      }


      const appointmentData =
        await appointmentsResponse.json();

      const staffData =
        await staffResponse.json();


      const sortedAppointments =
        (
          Array.isArray(
            appointmentData
          )
            ? appointmentData
            : []
        )
          .slice()
          .sort(
            (
              first,
              second
            ) =>
              new Date(
                second.start_time
              ).getTime() -
              new Date(
                first.start_time
              ).getTime()
          );


      const staffMap = {};

      (
        Array.isArray(
          staffData
        )
          ? staffData
          : []
      ).forEach(
        (
          person
        ) => {
          staffMap[
            person.id
          ] =
            person.name;
        }
      );


      setHistoryByClient(
        (
          previous
        ) => ({
          ...previous,

          [clientId]:
            sortedAppointments,
        })
      );


      setHistoryStaff(
        (
          previous
        ) => ({
          ...previous,
          ...staffMap,
        })
      );
    } catch (
      error
    ) {
      setHistoryErrors(
        (
          previous
        ) => ({
          ...previous,

          [clientId]:
            String(
              error.message ||
              error
            ),
        })
      );
    } finally {
      setHistoryLoadingId(
        null
      );
    }
  };


const refreshClientHistory =
  async (
    clientId
  ) => {
    setVisitDetails(
      {}
    );

    setVisitErrors(
      {}
    );

    setExpandedAppointmentId(
      null
    );

    await openClientHistory(
      clientId,
      true
    );
  };


const openVisitDetails =
  async (
    appointmentId
  ) => {
    if (
      expandedAppointmentId ===
      appointmentId
    ) {
      setExpandedAppointmentId(
        null
      );

      return;
    }


    setExpandedAppointmentId(
      appointmentId
    );


    if (
      Object.prototype.hasOwnProperty.call(
        visitDetails,
        appointmentId
      )
    ) {
      return;
    }


    try {
      setVisitLoadingId(
        appointmentId
      );

      setVisitErrors(
        (
          previous
        ) => ({
          ...previous,

          [appointmentId]:
            '',
        })
      );


      const [
        summaryResponse,
        salesResponse,
      ] =
        await Promise.all([
          fetch(
            `${API_BASE_URL}/payments/appointment/${appointmentId}/summary`,
            {
              headers:
                authHeaders,
            }
          ),

          fetch(
            `${API_BASE_URL}/appointments/${appointmentId}/sales`,
            {
              headers:
                authHeaders,
            }
          ),
        ]);


      if (
        !summaryResponse.ok
      ) {
        const detail =
          await summaryResponse.text();

        throw new Error(
          `${summaryResponse.status} ${detail}`
        );
      }


      if (
        !salesResponse.ok
      ) {
        const detail =
          await salesResponse.text();

        throw new Error(
          `${salesResponse.status} ${detail}`
        );
      }


      const summary =
        await summaryResponse.json();

      const sales =
        await salesResponse.json();


      setVisitDetails(
        (
          previous
        ) => ({
          ...previous,

          [appointmentId]: {
            ...summary,

            products:
              Array.isArray(
                sales
              )
                ? sales
                : [],
          },
        })
      );
    } catch (
      error
    ) {
      setVisitErrors(
        (
          previous
        ) => ({
          ...previous,

          [appointmentId]:
            String(
              error.message ||
              error
            ),
        })
      );
    } finally {
      setVisitLoadingId(
        null
      );
    }
  };


const renderHistoryDetailRow =
  (
    label,
    value,
    options = {}
  ) => (
    <View
      style={{
        flexDirection:
          'row',

        justifyContent:
          'space-between',

        alignItems:
          'flex-start',

        gap:
          12,

        paddingVertical:
          5,
      }}
    >
      <Text
        style={{
          flex:
            1,

          color:
            COLORS.textMuted,

          fontSize:
            12,
        }}
      >
        {label}
      </Text>

      <Text
        style={{
          flex:
            1,

          color:
            options.danger
              ? COLORS.danger
              : COLORS.text,

          fontSize:
            options.strong
              ? 13
              : 12,

          fontWeight:
            options.strong
              ? '900'
              : '700',

          textAlign:
            'right',
        }}
      >
        {value}
      </Text>
    </View>
  );


const renderVisitDetails =
  (
    appointment
  ) => {
    const appointmentId =
      appointment.id;

    const detail =
      visitDetails[
        appointmentId
      ];

    const visitError =
      visitErrors[
        appointmentId
      ];


    if (
      visitLoadingId ===
      appointmentId
    ) {
      return (
        <View
          style={{
            paddingVertical:
              24,

            alignItems:
              'center',
          }}
        >
          <ActivityIndicator
            color={
              COLORS.royal
            }
          />

          <Text
            style={{
              color:
                COLORS.textMuted,

              fontSize:
                12,

              marginTop:
                9,
            }}
          >
            Loading payment details...
          </Text>
        </View>
      );
    }


    if (visitError) {
      return (
        <View
          style={{
            backgroundColor:
              COLORS.dangerSoft,

            borderRadius:
              RADIUS.medium,

            padding:
              13,
          }}
        >
          <Text
            style={{
              color:
                COLORS.danger,

              fontSize:
                12,

              lineHeight:
                18,

              fontWeight:
                '700',
            }}
          >
            Unable to load visit details: {visitError}
          </Text>

          <TouchableOpacity
            onPress={() => {
              setVisitErrors(
                (
                  previous
                ) => ({
                  ...previous,

                  [appointmentId]:
                    '',
                })
              );

              openVisitDetails(
                appointmentId
              );
            }}

            style={{
              marginTop:
                10,
            }}
          >
            <Text
              style={{
                color:
                  COLORS.royal,

                fontSize:
                  12,

                fontWeight:
                  '900',
              }}
            >
              Try Again
            </Text>
          </TouchableOpacity>
        </View>
      );
    }


    if (!detail) {
      return null;
    }


    return (
      <View>
        <Text
          style={{
            color:
              COLORS.text,

            fontSize:
              14,

            fontWeight:
              '900',

            marginBottom:
              8,
          }}
        >
          Visit Details
        </Text>


        {renderHistoryDetailRow(
          'Service',
          formatMoney(
            detail.service_subtotal
          )
        )}


        {!!detail.products?.length && (
          <View
            style={{
              marginTop:
                12,
            }}
          >
            <Text
              style={{
                color:
                  COLORS.text,

                fontSize:
                  13,

                fontWeight:
                  '900',

                marginBottom:
                  8,
              }}
            >
              Products Purchased During This Visit
            </Text>

            {detail.products.map(
              (
                product
              ) => (
                <View
                  key={
                    product.sale_id
                  }

                  style={{
                    backgroundColor:
                      COLORS.white,

                    borderWidth:
                      1,

                    borderColor:
                      COLORS.border,

                    borderRadius:
                      RADIUS.medium,

                    padding:
                      12,

                    marginBottom:
                      8,
                  }}
                >
                  <View
                    style={{
                      flexDirection:
                        'row',

                      justifyContent:
                        'space-between',

                      gap:
                        12,
                    }}
                  >
                    <Text
                      style={{
                        flex:
                          1,

                        color:
                          COLORS.text,

                        fontSize:
                          13,

                        fontWeight:
                          '900',
                      }}
                    >
                      {product.name}
                      {' × '}
                      {product.quantity}
                    </Text>

                    <Text
                      style={{
                        color:
                          COLORS.text,

                        fontSize:
                          13,

                        fontWeight:
                          '900',
                      }}
                    >
                      {formatMoney(
                        product.total
                      )}
                    </Text>
                  </View>

                  <Text
                    style={{
                      color:
                        COLORS.textMuted,

                      fontSize:
                        11,

                      marginTop:
                        5,
                    }}
                  >
                    Sold By: {product.staff_name || `Staff #${product.staff_id}`}
                  </Text>
                </View>
              )
            )}
          </View>
        )}


        <View
          style={{
            marginTop:
              8,

            paddingTop:
              8,

            borderTopWidth:
              1,

            borderTopColor:
              COLORS.border,
          }}
        >
          {renderHistoryDetailRow(
            'Tip',
            formatMoney(
              detail.tip
            )
          )}

          {renderHistoryDetailRow(
            'Taxes',
            formatMoney(
              detail.tax_total
            )
          )}

          {renderHistoryDetailRow(
            'Visit total',
            formatMoney(
              detail.grand_total
            ),
            {
              strong:
                true,
            }
          )}

          {renderHistoryDetailRow(
            'Total paid',
            formatMoney(
              detail.paid_total
            ),
            {
              strong:
                true,
            }
          )}

          {Number(
            detail.refunded_total ||
              0
          ) > 0 &&
            renderHistoryDetailRow(
              'Refunded',
              `-${formatMoney(
                detail.refunded_total
              )}`,
              {
                danger:
                  true,
              }
            )}

          {Number(
            detail.refunded_total ||
              0
          ) > 0 &&
            renderHistoryDetailRow(
              'Net paid after refunds',
              formatMoney(
                detail.net_paid
              ),
              {
                strong:
                  true,
              }
            )}

          {Number(
            detail.balance_due ||
              0
          ) > 0 &&
            renderHistoryDetailRow(
              'Balance due',
              formatMoney(
                detail.balance_due
              ),
              {
                strong:
                  true,

                danger:
                  true,
              }
            )}
        </View>


        {!!detail.payments?.length && (
          <View
            style={{
              marginTop:
                14,

              paddingTop:
                12,

              borderTopWidth:
                1,

              borderTopColor:
                COLORS.border,
            }}
          >
            <Text
              style={{
                color:
                  COLORS.text,

                fontSize:
                  13,

                fontWeight:
                  '900',

                marginBottom:
                  7,
              }}
            >
              Payment History
            </Text>

            {detail.payments.map(
              (
                payment,
                index
              ) => (
                <View
                  key={
                    payment.id
                  }

                  style={{
                    backgroundColor:
                      COLORS.white,

                    borderWidth:
                      1,

                    borderColor:
                      COLORS.border,

                    borderRadius:
                      RADIUS.medium,

                    padding:
                      11,

                    marginBottom:
                      7,
                  }}
                >
                  <View
                    style={{
                      flexDirection:
                        'row',

                      justifyContent:
                        'space-between',

                      gap:
                        12,
                    }}
                  >
                    <Text
                      style={{
                        flex:
                          1,

                        color:
                          COLORS.text,

                        fontSize:
                          12,

                        fontWeight:
                          '800',

                        textTransform:
                          'capitalize',
                      }}
                    >
                      {index === 0 &&
                      detail.payments.length > 1
                        ? 'Deposit / partial payment'
                        : index ===
                            detail.payments.length - 1 &&
                          detail.payments.length > 1
                          ? 'Final payment'
                          : 'Payment'}
                      {' • '}
                      {payment.method || 'Unknown method'}
                    </Text>

                    <Text
                      style={{
                        color:
                          COLORS.text,

                        fontSize:
                          12,

                        fontWeight:
                          '900',
                      }}
                    >
                      {formatMoney(
                        payment.amount
                      )}
                    </Text>
                  </View>

                  <Text
                    style={{
                      color:
                        COLORS.textMuted,

                      fontSize:
                        11,

                      marginTop:
                        4,
                    }}
                  >
                    {formatHistoryDate(
                      payment.created_at
                    )}
                    {' at '}
                    {formatHistoryTime(
                      payment.created_at
                    )}
                  </Text>
                </View>
              )
            )}
          </View>
        )}


        {!!detail.refunds?.length && (
          <View
            style={{
              marginTop:
                14,

              paddingTop:
                12,

              borderTopWidth:
                1,

              borderTopColor:
                COLORS.border,
            }}
          >
            <Text
              style={{
                color:
                  COLORS.danger,

                fontSize:
                  13,

                fontWeight:
                  '900',

                marginBottom:
                  7,
              }}
            >
              Refund History
            </Text>

            {detail.refunds.map(
              (
                refund
              ) => (
                <View
                  key={
                    refund.id
                  }

                  style={{
                    backgroundColor:
                      COLORS.dangerSoft,

                    borderRadius:
                      RADIUS.medium,

                    padding:
                      11,

                    marginBottom:
                      7,
                  }}
                >
                  {renderHistoryDetailRow(
                    `${refund.method || 'Unknown'} refund`,
                    `-${formatMoney(
                      refund.amount
                    )}`,
                    {
                      strong:
                        true,

                      danger:
                        true,
                    }
                  )}

                  <Text
                    style={{
                      color:
                        COLORS.textMuted,

                      fontSize:
                        11,

                      marginTop:
                        3,
                    }}
                  >
                    {formatHistoryDate(
                      refund.created_at
                    )}
                    {' at '}
                    {formatHistoryTime(
                      refund.created_at
                    )}
                  </Text>

                  {refund.lines?.map(
                    (
                      line
                    ) => (
                      <Text
                        key={
                          line.id
                        }

                        style={{
                          color:
                            COLORS.textSecondary,

                          fontSize:
                            11,

                          marginTop:
                            5,
                        }}
                      >
                        • {line.description || line.kind} — {formatMoney(line.total)}
                      </Text>
                    )
                  )}
                </View>
              )
            )}
          </View>
        )}
      </View>
    );
  };


const renderClientHistory =
  (
    client
  ) => {
    if (
      historyClientId !==
      client.id
    ) {
      return null;
    }


    const appointments =
      historyByClient[
        client.id
      ] ||
      [];

    const historyError =
      historyErrors[
        client.id
      ];

    const previousAppointments =
      appointments;


    return (
      <View
        style={{
          marginTop:
            16,

          paddingTop:
            16,

          borderTopWidth:
            1,

          borderTopColor:
            COLORS.border,
        }}
      >
        <View
          style={{
            flexDirection:
              'row',

            justifyContent:
              'space-between',

            alignItems:
              'center',

            gap:
              12,

            marginBottom:
              12,
          }}
        >
          <View
            style={{
              flex:
                1,
            }}
          >
            <Text
              style={{
                color:
                  COLORS.text,

                fontSize:
                  17,

                fontWeight:
                  '900',
              }}
            >
              Client History
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
              Appointments and payment activity
            </Text>
          </View>

          <TouchableOpacity
            onPress={() =>
              refreshClientHistory(
                client.id
              )
            }
          >
            <Text
              style={{
                color:
                  COLORS.royal,

                fontSize:
                  12,

                fontWeight:
                  '900',
              }}
            >
              Refresh
            </Text>
          </TouchableOpacity>
        </View>


        {historyLoadingId ===
        client.id ? (
          <View
            style={{
              paddingVertical:
                26,

              alignItems:
                'center',
            }}
          >
            <ActivityIndicator
              color={
                COLORS.royal
              }
            />

            <Text
              style={{
                color:
                  COLORS.textMuted,

                fontSize:
                  12,

                marginTop:
                  9,
              }}
            >
              Loading client history...
            </Text>
          </View>
        ) : historyError ? (
          <View
            style={{
              backgroundColor:
                COLORS.dangerSoft,

              borderRadius:
                RADIUS.medium,

              padding:
                13,
            }}
          >
            <Text
              style={{
                color:
                  COLORS.danger,

                fontSize:
                  12,

                lineHeight:
                  18,

                fontWeight:
                  '700',
              }}
            >
              Unable to load history: {historyError}
            </Text>
          </View>
        ) : previousAppointments.length ===
          0 ? (
          <View
            style={{
              backgroundColor:
                COLORS.blueVerySoft,

              borderRadius:
                RADIUS.medium,

              padding:
                18,

              alignItems:
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
              No appointments
            </Text>

            <Text
              style={{
                color:
                  COLORS.textMuted,

                fontSize:
                  12,

                textAlign:
                  'center',

                marginTop:
                  5,
              }}
            >
              Appointments will appear here.
            </Text>
          </View>
        ) : (
          previousAppointments.map(
            (
              appointment
            ) => {
              const expanded =
                expandedAppointmentId ===
                appointment.id;

              const badge =
                historyStatusStyle(
                  appointment
                );

              const staffName =
                historyStaff[
                  appointment.staff_id
                ] ||
                `Staff #${appointment.staff_id}`;

              return (
                <View
                  key={
                    appointment.id
                  }

                  style={{
                    borderWidth:
                      1,

                    borderColor:
                      expanded
                        ? COLORS.royal
                        : COLORS.border,

                    borderRadius:
                      RADIUS.medium,

                    backgroundColor:
                      COLORS.white,

                    marginBottom:
                      9,

                    overflow:
                      'hidden',
                  }}
                >
                  <TouchableOpacity
                    activeOpacity={
                      0.82
                    }

                    onPress={() =>
                      openVisitDetails(
                        appointment.id
                      )
                    }

                    style={{
                      padding:
                        13,
                    }}
                  >
                    <View
                      style={{
                        flexDirection:
                          isPhone
                            ? 'column'
                            : 'row',

                        justifyContent:
                          'space-between',

                        alignItems:
                          isPhone
                            ? 'flex-start'
                            : 'center',

                        gap:
                          10,
                      }}
                    >
                      <View
                        style={{
                          flex:
                            1,
                        }}
                      >
                        <Text
                          style={{
                            color:
                              COLORS.text,

                            fontSize:
                              14,

                            fontWeight:
                              '900',
                          }}
                        >
                          {appointment.service_name || 'Salon Service'}
                        </Text>

                        <Text
                          style={{
                            color:
                              COLORS.textSecondary,

                            fontSize:
                              12,

                            marginTop:
                              5,
                          }}
                        >
                          {formatHistoryDate(
                            appointment.start_time
                          )}
                          {' • '}
                          {formatHistoryTime(
                            appointment.start_time
                          )}
                        </Text>

                        <Text
                          style={{
                            color:
                              COLORS.textMuted,

                            fontSize:
                              11,

                            marginTop:
                              4,
                          }}
                        >
                          Staff: {staffName}
                        </Text>
                      </View>

                      <View
                        style={{
                          alignItems:
                            isPhone
                              ? 'flex-start'
                              : 'flex-end',

                          gap:
                            6,
                        }}
                      >
                        <Text
                          style={{
                            color:
                              COLORS.text,

                            fontSize:
                              14,

                            fontWeight:
                              '900',
                          }}
                        >
                          {appointment.total_with_tax != null
                            ? formatMoney(
                                appointment.total_with_tax
                              )
                            : appointment.price != null
                              ? formatMoney(
                                  appointment.price
                                )
                              : '—'}
                        </Text>

                        <View
                          style={{
                            backgroundColor:
                              badge.backgroundColor,

                            borderRadius:
                              RADIUS.round,

                            paddingHorizontal:
                              9,

                            paddingVertical:
                              5,
                          }}
                        >
                          <Text
                            style={{
                              color:
                                badge.color,

                              fontSize:
                                10,

                              fontWeight:
                                '900',
                            }}
                          >
                            {historyStatusLabel(
                              appointment
                            )}
                          </Text>
                        </View>
                      </View>
                    </View>

                    <Text
                      style={{
                        color:
                          COLORS.royal,

                        fontSize:
                          11,

                        fontWeight:
                          '900',

                        marginTop:
                          10,
                      }}
                    >
                      {expanded
                        ? '▲ Hide visit details'
                        : '▼ View visit details'}
                    </Text>
                  </TouchableOpacity>


                  {expanded && (
                    <View
                      style={{
                        borderTopWidth:
                          1,

                        borderTopColor:
                          COLORS.border,

                        backgroundColor:
                          COLORS.blueVerySoft,

                        padding:
                          13,
                      }}
                    >
                      {renderVisitDetails(
                        appointment
                      )}
                    </View>
                  )}
                </View>
              );
            }
          )
        )}
      </View>
    );
  };


/* =====================================================
   CLIENT CARD
===================================================== */

const renderClient =
  ({
    item,
  }) => {
    const isEditing =
      editingId ===
      item.id;


    const fullName =
      [
        item.first_name,
        item.last_name,
      ]
        .filter(Boolean)
        .join(' ');


    const initial =
      (
        item.first_name?.[0] ||
        item.last_name?.[0] ||
        '?'
      ).toUpperCase();


    return (
      <View
        style={{
          backgroundColor:
            COLORS.white,

          borderRadius:
            RADIUS.large,

          borderWidth: 1,

          borderColor:
            COLORS.border,

          padding:
            isPhone
              ? 15
              : 18,

          marginBottom:
            12,

          ...SHADOWS.card,
        }}
      >
        {!isEditing ? (
          <>
            {/* ===========================================
                CLIENT INFO
            =========================================== */}

            <View
              style={{
                flexDirection:
                  'row',

                alignItems:
                  'center',
              }}
            >
              <View
                style={{
                  width:
                    isPhone
                      ? 48
                      : 54,

                  height:
                    isPhone
                      ? 48
                      : 54,

                  borderRadius:
                    isPhone
                      ? 24
                      : 27,

                  backgroundColor:
                    COLORS.blueSoft,

                  alignItems:
                    'center',

                  justifyContent:
                    'center',

                  marginRight:
                    13,
                }}
              >
                <Text
                  style={{
                    color:
                      COLORS.royal,

                    fontSize:
                      isPhone
                        ? 18
                        : 20,

                    fontWeight:
                      '900',
                  }}
                >
                  {initial}
                </Text>
              </View>


              <View
                style={{
                  flex: 1,
                }}
              >
                <Text
                  style={{
                    color:
                      COLORS.text,

                    fontSize:
                      isPhone
                        ? 16
                        : 18,

                    fontWeight:
                      '800',
                  }}
                >
                  {fullName ||
                    'Unnamed Client'}
                </Text>


                {!!item.phone && (
                  <Text
                    style={{
                      color:
                        COLORS.textSecondary,

                      fontSize:
                        13,

                      marginTop:
                        4,
                    }}
                  >
                    {item.phone}
                  </Text>
                )}


                {!!item.email && (
                  <Text
                    numberOfLines={
                      1
                    }

                    style={{
                      color:
                        COLORS.textMuted,

                      fontSize:
                        12,

                      marginTop:
                        3,
                    }}
                  >
                    {item.email}
                  </Text>
                )}


                {!item.phone &&
                  !item.email && (
                    <Text
                      style={{
                        color:
                          COLORS.textMuted,

                        fontSize:
                          12,

                        marginTop:
                          4,
                      }}
                    >
                      No contact information
                    </Text>
                  )}
              </View>
            </View>


            {/* ===========================================
                CONTACT BUTTONS
            =========================================== */}

            <View
              style={{
                height: 1,

                backgroundColor:
                  COLORS.border,

                marginVertical:
                  15,
              }}
            />


            <View
              style={{
                flexDirection:
                  isPhone
                    ? 'column'
                    : 'row',

                gap: 8,
              }}
            >
              <ActionButton
                title="Call"

                onPress={() =>
                  callNumber(
                    item.phone
                  )
                }
              />


              <ActionButton
                title="Text"

                onPress={() =>
                  textNumber(
                    item.phone
                  )
                }
              />


              <ActionButton
                title="Email"

                onPress={() =>
                  emailTo(
                    item.email
                  )
                }
              />
            </View>


            {/* ===========================================
                MANAGEMENT BUTTONS
            =========================================== */}

            <View
              style={{
                flexDirection:
                  isPhone
                    ? 'column'
                    : 'row',

                gap: 8,

                marginTop: 8,
              }}
            >
              <ActionButton
                title="Edit"

                filled

                onPress={() =>
                  startEdit(
                    item
                  )
                }
              />


              <ActionButton
                title={
                  historyClientId ===
                  item.id
                    ? 'Close History'
                    : 'History'
                }

                onPress={() =>
                  openClientHistory(
                    item.id
                  )
                }
              />


              {(
                currentUser?.role ===
                  'owner' ||
                currentUser?.role ===
                  'receptionist'
              ) && (
                <ActionButton
                  title="Delete"

                  danger

                  onPress={() =>
                    confirmDelete(
                      item
                    )
                  }
                />
              )}
            </View>


            {renderClientHistory(
              item
            )}
          </>
        ) : (
          <>
            {/* ===========================================
                EDIT FORM
            =========================================== */}

            <Text
              style={{
                color:
                  COLORS.text,

                fontSize: 18,

                fontWeight:
                  '800',

                marginBottom:
                  16,
              }}
            >
              Edit Client
            </Text>


            <View
              style={{
                flexDirection:
                  isPhone
                    ? 'column'
                    : 'row',

                gap: 12,
              }}
            >
              <View
                style={{
                  flex: 1,
                }}
              >
                <FieldLabel>
                  First name
                </FieldLabel>

                <AppInput
                  value={
                    editFirst
                  }

                  onChangeText={
                    setEditFirst
                  }

                  placeholder="First name"

                  autoCapitalize="words"

                  style={{
                    marginBottom:
                      12,
                  }}
                />
              </View>


              <View
                style={{
                  flex: 1,
                }}
              >
                <FieldLabel>
                  Last name
                </FieldLabel>

                <AppInput
                  value={
                    editLast
                  }

                  onChangeText={
                    setEditLast
                  }

                  placeholder="Last name"

                  autoCapitalize="words"

                  style={{
                    marginBottom:
                      12,
                  }}
                />
              </View>
            </View>


            <View
              style={{
                flexDirection:
                  isPhone
                    ? 'column'
                    : 'row',

                gap: 12,
              }}
            >
              <View
                style={{
                  flex: 1,
                }}
              >
                <FieldLabel>
                  Phone
                </FieldLabel>

                <AppInput
                  value={
                    editPhone
                  }

                  onChangeText={
                    setEditPhone
                  }

                  placeholder="Phone number"

                  keyboardType="phone-pad"

                  style={{
                    marginBottom:
                      12,
                  }}
                />
              </View>


              <View
                style={{
                  flex: 1,
                }}
              >
                <FieldLabel>
                  Email
                </FieldLabel>

                <AppInput
                  value={
                    editEmail
                  }

                  onChangeText={
                    setEditEmail
                  }

                  placeholder="Email address"

                  keyboardType="email-address"

                  autoCapitalize="none"

                  autoCorrect={
                    false
                  }

                  style={{
                    marginBottom:
                      12,
                  }}
                />
              </View>
            </View>


            <View
              style={{
                flexDirection:
                  isPhone
                    ? 'column'
                    : 'row',

                gap: 8,

                marginTop: 4,
              }}
            >
              <ActionButton
                title="Save Changes"

                filled

                onPress={() =>
                  saveEdit(
                    item.id
                  )
                }
              />


              <ActionButton
                title="Cancel"

                onPress={
                  cancelEdit
                }
              />
            </View>
          </>
        )}
      </View>
    );
  };


/* =====================================================
   HEADER
===================================================== */

const Header =
  (
    <View>

      {/* ===============================================
          PAGE TITLE
      =============================================== */}

      <View
        style={{
          marginBottom:
            18,
        }}
      >
        <Text
          style={{
            color:
              COLORS.text,

            fontSize:
              isPhone
                ? 24
                : 28,

            fontWeight:
              '800',
          }}
        >
          Clients
        </Text>


        <Text
          style={{
            color:
              COLORS.textMuted,

            fontSize:
              13,

            lineHeight:
              19,

            marginTop:
              4,
          }}
        >
          Search clients, update contact information, and stay connected with your salon guests.
        </Text>
      </View>

            {/* ===============================================
          ADD CLIENT
      =============================================== */}

<View
        style={{
          backgroundColor:
            COLORS.white,

          borderRadius:
            RADIUS.large,

          borderWidth:
            1,

          borderColor:
            COLORS.border,

          padding:
            isPhone
              ? 16
              : 20,

          marginBottom:
            18,

          ...SHADOWS.card,
        }}
      >
        <View
          style={{
            flexDirection:
              isPhone
                ? 'column'
                : 'row',

            alignItems:
              isPhone
                ? 'stretch'
                : 'center',

            justifyContent:
              'space-between',

            gap:
              12,
          }}
        >
          <View
            style={{
              flex:
                1,
            }}
          >
            <Text
              style={{
                color:
                  COLORS.text,

                fontSize:
                  18,

                fontWeight:
                  '900',
              }}
            >
              Add Client
            </Text>

            <Text
              style={{
                color:
                  COLORS.textMuted,

                fontSize:
                  12,

                lineHeight:
                  18,

                marginTop:
                  4,
              }}
            >
              Add a client manually to your salon database.
            </Text>
          </View>


          <TouchableOpacity
            activeOpacity={
              0.85
            }

            onPress={() =>
              setAddClientOpen(
                (
                  value
                ) =>
                  !value
              )
            }

            style={{
              minHeight:
                46,

              paddingHorizontal:
                18,

              borderRadius:
                RADIUS.medium,

              backgroundColor:
                addClientOpen
                  ? COLORS.surfaceSoft
                  : COLORS.royal,

              borderWidth:
                1,

              borderColor:
                addClientOpen
                  ? COLORS.border
                  : COLORS.royal,

              alignItems:
                'center',

              justifyContent:
                'center',
            }}
          >
            <Text
              style={{
                color:
                  addClientOpen
                    ? COLORS.textSecondary
                    : COLORS.white,

                fontSize:
                  13,

                fontWeight:
                  '900',
              }}
            >
              {addClientOpen
                ? 'Close'
                : '+ Add Client'}
            </Text>
          </TouchableOpacity>
        </View>


        {addClientOpen && (
          <View
            style={{
              marginTop:
                20,

              paddingTop:
                20,

              borderTopWidth:
                1,

              borderTopColor:
                COLORS.border,
            }}
          >
            <View
              style={{
                flexDirection:
                  isPhone
                    ? 'column'
                    : 'row',

                gap:
                  12,
              }}
            >
              <View
                style={{
                  flex:
                    1,
                }}
              >
                <FieldLabel>
                  First name
                </FieldLabel>

                <AppInput
                  value={
                    newFirst
                  }

                  onChangeText={
                    setNewFirst
                  }

                  placeholder="First name"

                  autoCapitalize="words"

                  style={{
                    marginBottom:
                      14,
                  }}
                />
              </View>


              <View
                style={{
                  flex:
                    1,
                }}
              >
                <FieldLabel>
                  Last name
                </FieldLabel>

                <AppInput
                  value={
                    newLast
                  }

                  onChangeText={
                    setNewLast
                  }

                  placeholder="Last name"

                  autoCapitalize="words"

                  style={{
                    marginBottom:
                      14,
                  }}
                />
              </View>
            </View>


            <View
              style={{
                flexDirection:
                  isPhone
                    ? 'column'
                    : 'row',

                gap:
                  12,
              }}
            >
              <View
                style={{
                  flex:
                    1,
                }}
              >
                <FieldLabel>
                  Phone
                </FieldLabel>

                <AppInput
                  value={
                    newPhone
                  }

                  onChangeText={
                    setNewPhone
                  }

                  placeholder="Phone number"

                  keyboardType="phone-pad"

                  style={{
                    marginBottom:
                      14,
                  }}
                />
              </View>


              <View
                style={{
                  flex:
                    1,
                }}
              >
                <FieldLabel>
                  Email
                </FieldLabel>

                <AppInput
                  value={
                    newEmail
                  }

                  onChangeText={
                    setNewEmail
                  }

                  placeholder="Email address"

                  keyboardType="email-address"

                  autoCapitalize="none"

                  autoCorrect={
                    false
                  }

                  style={{
                    marginBottom:
                      14,
                  }}
                />
              </View>
            </View>


            <View
              style={{
                flexDirection:
                  isPhone
                    ? 'column'
                    : 'row',

                gap:
                  10,
              }}
            >
              <TouchableOpacity
                activeOpacity={
                  0.85
                }

                disabled={
                  savingClient
                }

                onPress={
                  createClient
                }

                style={{
                  flex:
                    1,

                  minHeight:
                    50,

                  borderRadius:
                    RADIUS.medium,

                  backgroundColor:
                    savingClient
                      ? COLORS.textMuted
                      : COLORS.royal,

                  alignItems:
                    'center',

                  justifyContent:
                    'center',

                  opacity:
                    savingClient
                      ? 0.7
                      : 1,
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
                  {savingClient
                    ? 'Saving...'
                    : 'Save Client'}
                </Text>
              </TouchableOpacity>


              <TouchableOpacity
                activeOpacity={
                  0.85
                }

                disabled={
                  savingClient
                }

                onPress={
                  resetAddClient
                }

                style={{
                  flex:
                    1,

                  minHeight:
                    50,

                  borderRadius:
                    RADIUS.medium,

                  backgroundColor:
                    COLORS.white,

                  borderWidth:
                    1,

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
                      COLORS.textSecondary,

                    fontSize:
                      14,

                    fontWeight:
                      '800',
                  }}
                >
                  Cancel
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>


      {/* ===============================================
          OWNER PROMOTIONS
      =============================================== */}

      {currentUser?.role ===
        'owner' && (
        <View
          style={{
            backgroundColor:
              COLORS.white,

            borderRadius:
              RADIUS.large,

            borderWidth: 1,

            borderColor:
              COLORS.border,

            padding:
              isPhone
                ? 16
                : 20,

            marginBottom:
              18,

            ...SHADOWS.card,
          }}
        >
          <View
            style={{
              flexDirection:
                isPhone
                  ? 'column'
                  : 'row',

              alignItems:
                isPhone
                  ? 'flex-start'
                  : 'center',

              justifyContent:
                'space-between',

              gap: 12,
            }}
          >
            <View
              style={{
                flex: 1,
              }}
            >
              <Text
                style={{
                  color:
                    COLORS.royalDark,

                  fontSize:
                    18,

                  fontWeight:
                    '900',
                }}
              >
                Promotions
              </Text>


              <Text
                style={{
                  color:
                    COLORS.textSecondary,

                  fontSize:
                    13,

                  lineHeight:
                    19,

                  marginTop:
                    5,
                }}
              >
                Send promotions and salon announcements to your client list.
              </Text>
            </View>


            <View
              style={{
                backgroundColor:
                  COLORS.blueSoft,

                borderRadius:
                  RADIUS.round,

                paddingHorizontal:
                  12,

                paddingVertical:
                  7,
              }}
            >
              <Text
                style={{
                  color:
                    COLORS.royal,

                  fontSize:
                    11,

                  fontWeight:
                    '800',
                }}
              >
                OWNER ONLY
              </Text>
            </View>
          </View>


          {/* RECIPIENT COUNTS */}

          <View
            style={{
              flexDirection:
                isPhone
                  ? 'column'
                  : 'row',

              gap: 10,

              marginTop:
                18,
            }}
          >
            <View
              style={{
                flex: 1,

                backgroundColor:
                  COLORS.blueVerySoft,

                borderRadius:
                  RADIUS.medium,

                padding: 14,
              }}
            >
              <Text
                style={{
                  color:
                    COLORS.textMuted,

                  fontSize:
                    11,

                  fontWeight:
                    '700',
                }}
              >
                EMAIL RECIPIENTS
              </Text>


              <Text
                style={{
                  color:
                    COLORS.royalDark,

                  fontSize:
                    24,

                  fontWeight:
                    '900',

                  marginTop:
                    4,
                }}
              >
                {emailRecipientCount}
              </Text>
            </View>


            <View
              style={{
                flex: 1,

                backgroundColor:
                  COLORS.blueVerySoft,

                borderRadius:
                  RADIUS.medium,

                padding: 14,
              }}
            >
              <Text
                style={{
                  color:
                    COLORS.textMuted,

                  fontSize:
                    11,

                  fontWeight:
                    '700',
                }}
              >
                TEXT RECIPIENTS
              </Text>


              <Text
                style={{
                  color:
                    COLORS.royalDark,

                  fontSize:
                    24,

                  fontWeight:
                    '900',

                  marginTop:
                    4,
                }}
              >
                {phoneRecipientCount}
              </Text>
            </View>
          </View>


          {/* MASS ACTION BUTTONS */}

          <View
            style={{
              flexDirection:
                isPhone
                  ? 'column'
                  : 'row',

              gap: 10,

              marginTop:
                14,
            }}
          >
            <TouchableOpacity
              activeOpacity={
                0.85
              }

              onPress={() =>
                setEmailComposerOpen(
                  (
                    value
                  ) =>
                    !value
                )
              }

              style={{
                flex: 1,

                minHeight: 50,

                borderRadius:
                  RADIUS.medium,

                backgroundColor:
                  COLORS.royal,

                alignItems:
                  'center',

                justifyContent:
                  'center',

                paddingHorizontal:
                  14,
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
                {emailComposerOpen
                  ? 'Close Email Composer'
                  : 'Email All'}
              </Text>
            </TouchableOpacity>


            <TouchableOpacity
              activeOpacity={
                0.85
              }

              onPress={
                showTextSetupMessage
              }

              style={{
                flex: 1,

                minHeight: 50,

                borderRadius:
                  RADIUS.medium,

                backgroundColor:
                  COLORS.white,

                borderWidth: 1,

                borderColor:
                  COLORS.royal,

                alignItems:
                  'center',

                justifyContent:
                  'center',

                paddingHorizontal:
                  14,
              }}
            >
              <Text
                style={{
                  color:
                    COLORS.royal,

                  fontSize:
                    14,

                  fontWeight:
                    '900',
                }}
              >
                Text All
              </Text>
            </TouchableOpacity>
          </View>


          {/* ===========================================
              EMAIL COMPOSER
          =========================================== */}

          {emailComposerOpen && (
            <View
              style={{
                marginTop:
                  18,

                paddingTop:
                  18,

                borderTopWidth:
                  1,

                borderTopColor:
                  COLORS.border,
              }}
            >
              <Text
                style={{
                  color:
                    COLORS.text,

                  fontSize:
                    17,

                  fontWeight:
                    '800',

                  marginBottom:
                    4,
                }}
              >
                New Email Campaign
              </Text>


              <Text
                style={{
                  color:
                    COLORS.textMuted,

                  fontSize:
                    12,

                  lineHeight:
                    18,

                  marginBottom:
                    16,
                }}
              >
                This will be sent individually to {emailRecipientCount} client{emailRecipientCount === 1 ? '' : 's'} with an email address.
              </Text>


              <FieldLabel>
                Subject
              </FieldLabel>


              <AppInput
                value={
                  broadcastSubject
                }

                onChangeText={
                  setBroadcastSubject
                }

                placeholder="Example: Summer Special at Image & Style"

                maxLength={
                  150
                }

                style={{
                  marginBottom:
                    14,
                }}
              />


              <FieldLabel>
                Message
              </FieldLabel>


              <AppInput
                value={
                  broadcastMessage
                }

                onChangeText={
                  setBroadcastMessage
                }

                placeholder="Write your promotion or announcement..."

                multiline

                textAlignVertical="top"

                maxLength={
                  5000
                }

                style={{
                  minHeight:
                    150,

                  paddingTop:
                    14,

                  paddingBottom:
                    14,

                  marginBottom:
                    8,
                }}
              />


              <Text
                style={{
                  color:
                    COLORS.textMuted,

                  fontSize:
                    11,

                  textAlign:
                    'right',

                  marginBottom:
                    14,
                }}
              >
                {broadcastMessage.length}/5000
              </Text>


              <View
                style={{
                  backgroundColor:
                    COLORS.blueVerySoft,

                  borderRadius:
                    RADIUS.medium,

                  padding: 13,

                  marginBottom:
                    14,
                }}
              >
                <Text
                  style={{
                    color:
                      COLORS.textSecondary,

                    fontSize:
                      12,

                    lineHeight:
                      18,
                  }}
                >
                  Recipients without an email address will automatically be skipped.
                </Text>
              </View>


              <View
                style={{
                  flexDirection:
                    isPhone
                      ? 'column'
                      : 'row',

                  gap: 8,
                }}
              >
                <TouchableOpacity
                  activeOpacity={
                    0.85
                  }

                  disabled={
                    sendingBroadcast
                  }

                  onPress={
                    sendBroadcastEmail
                  }

                  style={{
                    flex: 1,

                    minHeight:
                      50,

                    borderRadius:
                      RADIUS.medium,

                    backgroundColor:
                      sendingBroadcast
                        ? COLORS.textMuted
                        : COLORS.royal,

                    alignItems:
                      'center',

                    justifyContent:
                      'center',

                    paddingHorizontal:
                      14,

                    opacity:
                      sendingBroadcast
                        ? 0.7
                        : 1,
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
                    {sendingBroadcast
                      ? 'Sending...'
                      : `Send to ${emailRecipientCount}`}
                  </Text>
                </TouchableOpacity>


                <TouchableOpacity
                  activeOpacity={
                    0.85
                  }

                  disabled={
                    sendingBroadcast
                  }

                  onPress={() => {
                    Keyboard.dismiss();

                    setEmailComposerOpen(
                      false
                    );
                  }}

                  style={{
                    flex: 1,

                    minHeight:
                      50,

                    borderRadius:
                      RADIUS.medium,

                    backgroundColor:
                      COLORS.white,

                    borderWidth:
                      1,

                    borderColor:
                      COLORS.border,

                    alignItems:
                      'center',

                    justifyContent:
                      'center',

                    paddingHorizontal:
                      14,
                  }}
                >
                  <Text
                    style={{
                      color:
                        COLORS.textSecondary,

                      fontSize:
                        14,

                      fontWeight:
                        '800',
                    }}
                  >
                    Cancel
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      )}


      {/* ===============================================
          SEARCH
      =============================================== */}

      <View
        style={{
          backgroundColor:
            COLORS.white,

          borderRadius:
            RADIUS.large,

          borderWidth: 1,

          borderColor:
            COLORS.border,

          padding:
            isPhone
              ? 15
              : 18,

          marginBottom:
            18,

          ...SHADOWS.card,
        }}
      >
        <Text
          style={{
            color:
              COLORS.text,

            fontSize:
              16,

            fontWeight:
              '800',

            marginBottom:
              12,
          }}
        >
          Find a Client
        </Text>


        <SearchInput
          value={
            query
          }

          onChangeText={
            setQuery
          }
        />


        <Text
          style={{
            color:
              COLORS.textMuted,

            fontSize:
              11,

            fontWeight:
              '700',

            marginTop:
              15,

            marginBottom:
              7,
          }}
        >
          SORT BY
        </Text>


        <View
          style={{
            flexDirection:
              isPhone
                ? 'column'
                : 'row',

            gap: 8,
          }}
        >
          <SegmentedButton
            title="Last Name"

            active={
              sortMode ===
              'lastName'
            }

            onPress={() =>
              setSortMode(
                'lastName'
              )
            }
          />


          <SegmentedButton
            title="Recently Added"

            active={
              sortMode ===
              'recent'
            }

            onPress={() =>
              setSortMode(
                'recent'
              )
            }
          />
        </View>


        <View
          style={{
            flexDirection:
              'row',

            justifyContent:
              'space-between',

            alignItems:
              'center',

            marginTop:
              14,
          }}
        >
          <Text
            style={{
              color:
                COLORS.textMuted,

              fontSize:
                12,

              fontWeight:
                '600',
            }}
          >
            {resultsCount}{' '}
            {resultsCount ===
            1
              ? 'client'
              : 'clients'}
          </Text>


          <TouchableOpacity
            activeOpacity={
              0.8
            }

            onPress={
              refresh
            }
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
              Refresh
            </Text>
          </TouchableOpacity>
        </View>
      </View>


      {/* ===============================================
          CLIENT LIST TITLE
      =============================================== */}

      <View
        style={{
          flexDirection:
            'row',

          justifyContent:
            'space-between',

          alignItems:
            'center',

          marginBottom:
            12,
        }}
      >
        <Text
          style={{
            color:
              COLORS.text,

            fontSize:
              19,

            fontWeight:
              '800',
          }}
        >
          Client List
        </Text>


        <Text
          style={{
            color:
              COLORS.textMuted,

            fontSize:
              12,

            fontWeight:
              '600',
          }}
        >
          {clients.length} total
        </Text>
      </View>
    </View>
  );
    /* =====================================================
     RENDER
  ===================================================== */

  return (
    <View
      style={{
        flex: 1,

        backgroundColor:
          COLORS.background,
      }}
    >
        <FlatList
          style={{
            flex: 1,
          }}

          data={
            filtered
          }

          keyExtractor={(
            client
          ) =>
            String(
              client.id
            )
          }

          renderItem={
            renderClient
          }

          ListHeaderComponent={
            Header
          }

          ListEmptyComponent={
            !loading ? (
              <View
                style={{
                  backgroundColor:
                    COLORS.white,

                  borderRadius:
                    RADIUS.large,

                  borderWidth: 1,

                  borderColor:
                    COLORS.border,

                  padding: 30,

                  alignItems:
                    'center',

                  justifyContent:
                    'center',

                  ...SHADOWS.card,
                }}
              >
                <View
                  style={{
                    width: 56,

                    height: 56,

                    borderRadius:
                      28,

                    backgroundColor:
                      COLORS.blueSoft,

                    alignItems:
                      'center',

                    justifyContent:
                      'center',

                    marginBottom:
                      12,
                  }}
                >
                  <Text
                    style={{
                      color:
                        COLORS.royal,

                      fontSize: 22,

                      fontWeight:
                        '800',
                    }}
                  >
                    ♙
                  </Text>
                </View>


                <Text
                  style={{
                    color:
                      COLORS.text,

                    fontSize: 17,

                    fontWeight:
                      '800',
                  }}
                >
                  No clients found
                </Text>


                <Text
                  style={{
                    color:
                      COLORS.textMuted,

                    textAlign:
                      'center',

                    fontSize: 13,

                    marginTop:
                      5,
                  }}
                >
                  Try a different search term.
                </Text>
              </View>
            ) : null
          }

          contentContainerStyle={{
            width: '100%',

            maxWidth:
              isDesktop
                ? 1200
                : 900,

            alignSelf:
              'center',

            padding:
              contentPadding,

            paddingBottom:
              40,
          }}

          onRefresh={
            refresh
          }

          refreshing={
            loading
          }

          keyboardShouldPersistTaps="handled"

          keyboardDismissMode="on-drag"

          showsVerticalScrollIndicator={
            false
          }
        />
    </View>
  );
}