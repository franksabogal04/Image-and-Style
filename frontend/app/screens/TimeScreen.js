// frontend/app/screens/TimeScreen.js

import React, {
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  Platform,
  FlatList,
  useWindowDimensions,
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
   HELPERS
========================================================= */

async function fetchOk(
  url,
  options
) {
  const response =
    await fetch(
      url,
      options
    );

  if (!response.ok) {
    const text =
      await response.text();

    throw new Error(
      `${response.status} ${text}`
    );
  }

  return response;
}


function parseApiDate(
  value
) {
  const needsUtcMarker =
    typeof value === 'string' &&
    !/[zZ]|[+-]\d{2}:\d{2}$/.test(
      value
    );

  return new Date(
    needsUtcMarker
      ? `${value}Z`
      : value
  );
}


function formatTime(
  value
) {
  if (!value) {
    return '—';
  }

  const date =
    parseApiDate(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return String(value);
  }

  return date
    .toLocaleTimeString(
      'en-US',
      {
        hour: 'numeric',
        minute: '2-digit',
      }
    )
    .replace(
      'am',
      'AM'
    )
    .replace(
      'pm',
      'PM'
    );
}


function formatDate(
  value
) {
  if (!value) {
    return '';
  }

  const date =
    parseApiDate(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return '';
  }

  return date.toLocaleDateString(
    'en-US',
    {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }
  );
}


function minutesToHours(
  minutes
) {
  const total =
    Number(
      minutes ||
      0
    );

  const hours =
    Math.floor(
      total / 60
    );

  const mins =
    total % 60;

  if (
    hours === 0
  ) {
    return `${mins}m`;
  }

  if (
    mins === 0
  ) {
    return `${hours}h`;
  }

  return `${hours}h ${mins}m`;
}


/* =========================================================
   SMALL COMPONENTS
========================================================= */

function MetricCard({
  label,
  value,
  highlight = false,
}) {
  return (
    <View
      style={{
        flex: 1,

        minWidth: 95,

        backgroundColor:
          highlight
            ? COLORS.royal
            : COLORS.white,

        borderRadius:
          RADIUS.large,

        borderWidth: 1,

        borderColor:
          highlight
            ? COLORS.royal
            : COLORS.border,

        padding: 15,

        ...SHADOWS.card,
      }}
    >
      <Text
        style={{
          color:
            highlight
              ? 'rgba(255,255,255,0.7)'
              : COLORS.textMuted,

          fontSize: 11,

          fontWeight: '700',

          textTransform:
            'uppercase',

          letterSpacing: 0.5,
        }}
      >
        {label}
      </Text>

      <Text
        numberOfLines={1}
        adjustsFontSizeToFit

        style={{
          color:
            highlight
              ? COLORS.white
              : COLORS.text,

          fontSize: 22,

          fontWeight: '900',

          marginTop: 6,
        }}
      >
        {value}
      </Text>
    </View>
  );
}


function ActionButton({
  title,
  onPress,
  type = 'primary',
  disabled = false,
}) {
  const variants = {
    primary: {
      background:
        COLORS.royal,

      border:
        COLORS.royal,

      text:
        COLORS.white,
    },

    success: {
      background:
        COLORS.successSoft,

      border:
        COLORS.success,

      text:
        COLORS.success,
    },

    secondary: {
      background:
        COLORS.white,

      border:
        COLORS.border,

      text:
        COLORS.royal,
    },

    danger: {
      background:
        COLORS.dangerSoft,

      border:
        COLORS.danger,

      text:
        COLORS.danger,
    },
  };


  const current =
    variants[type] ||
    variants.primary;


  return (
    <TouchableOpacity
      activeOpacity={0.85}

      disabled={disabled}

      onPress={onPress}

      style={{
        flex: 1,

        minHeight: 50,

        borderRadius:
          RADIUS.medium,

        borderWidth: 1,

        borderColor:
          current.border,

        backgroundColor:
          current.background,

        alignItems: 'center',

        justifyContent:
          'center',

        paddingHorizontal: 12,

        opacity:
          disabled
            ? 0.45
            : 1,
      }}
    >
      <Text
        style={{
          color:
            current.text,

          fontSize: 14,

          fontWeight: '800',
        }}
      >
        {title}
      </Text>
    </TouchableOpacity>
  );
}


/* =========================================================
   MAIN SCREEN
========================================================= */

export default function TimeScreen({
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


  const [
    current,
    setCurrent,
  ] =
    useState(null);


  const [
    summary,
    setSummary,
  ] =
    useState({
      worked_minutes: 0,
      break_minutes: 0,
      payable_minutes: 0,
      entries: [],
    });


  const [
    loading,
    setLoading,
  ] =
    useState(true);


  const [
    actionLoading,
    setActionLoading,
  ] =
    useState(false);


  /* =====================================================
     LOAD
  ===================================================== */

  const load =
    async () => {
      const [
        currentResponse,
        summaryResponse,
      ] =
        await Promise.all([
          fetchOk(
            `${API_BASE_URL}/time/me/current`,
            {
              headers:
                authHeaders,
            }
          ),

          fetchOk(
            `${API_BASE_URL}/time/me`,
            {
              headers:
                authHeaders,
            }
          ),
        ]);


      const currentData =
        await currentResponse.json();


      const summaryData =
        await summaryResponse.json();


      setCurrent(
        currentData
      );


      setSummary({
        worked_minutes:
          summaryData?.worked_minutes ??
          0,

        break_minutes:
          summaryData?.break_minutes ??
          0,

        payable_minutes:
          summaryData?.payable_minutes ??
          0,

        entries:
          Array.isArray(
            summaryData?.entries
          )
            ? summaryData.entries
            : [],
      });
    };


  useEffect(
    () => {
      (
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


  /* =====================================================
     SHIFT ACTIONS
  ===================================================== */

  const runAction =
    async (
      endpoint,
      errorTitle
    ) => {
      try {
        setActionLoading(
          true
        );


        await fetchOk(
          `${API_BASE_URL}${endpoint}`,
          {
            method: 'POST',

            headers:
              authHeaders,
          }
        );


        await load();
      } catch (
        error
      ) {
        Alert.alert(
          errorTitle,
          String(
            error.message ||
            error
          )
        );
      } finally {
        setActionLoading(
          false
        );
      }
    };


  const clockIn =
    () =>
      runAction(
        '/time/clock-in',
        'Clock-in failed'
      );


  const startBreak =
    () =>
      runAction(
        '/time/break/start',
        'Start break failed'
      );


  const endBreak =
    () =>
      runAction(
        '/time/break/end',
        'End break failed'
      );


  const clockOut =
    () =>
      runAction(
        '/time/clock-out',
        'Clock-out failed'
      );


  const activeBreak =
    !!current
      ?.breaks
      ?.find(
        (breakItem) =>
          !breakItem.end
      );


  /* =====================================================
     CURRENT STATUS
  ===================================================== */

  const statusText =
    !current
      ? 'Off Shift'
      : activeBreak
        ? 'On Break'
        : 'Clocked In';


  const statusDescription =
    !current
      ? 'You are currently not clocked in.'
      : activeBreak
        ? `Shift started at ${formatTime(
            current.clock_in
          )}`
        : `Working since ${formatTime(
            current.clock_in
          )}`;


  const statusColor =
    !current
      ? COLORS.textMuted
      : activeBreak
        ? COLORS.warning
        : COLORS.success;


  const statusBackground =
    !current
      ? COLORS.surfaceSoft
      : activeBreak
        ? COLORS.warningSoft
        : COLORS.successSoft;


  /* =====================================================
     ENTRY CARD
  ===================================================== */

  const renderEntry =
    ({
      item,
    }) => {
      const breaks =
        Array.isArray(
          item.breaks
        )
          ? item.breaks
          : [];


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

            padding: 16,

            marginBottom: 12,

            ...SHADOWS.card,
          }}
        >
          <View
            style={{
              flexDirection:
                'row',

              justifyContent:
                'space-between',

              alignItems:
                'flex-start',
            }}
          >
            <View
              style={{
                flex: 1,

                paddingRight: 12,
              }}
            >
              <Text
                style={{
                  color:
                    COLORS.text,

                  fontSize: 15,

                  fontWeight:
                    '800',
                }}
              >
                {formatDate(
                  item.clock_in
                )}
              </Text>


              <Text
                style={{
                  color:
                    COLORS.textSecondary,

                  fontSize: 13,

                  marginTop: 5,
                }}
              >
                {formatTime(
                  item.clock_in
                )}
                {' → '}
                {item.clock_out
                  ? formatTime(
                      item.clock_out
                    )
                  : 'Still working'
                }
              </Text>
            </View>


            <View
              style={{
                backgroundColor:
                  item.clock_out
                    ? COLORS.surfaceSoft
                    : COLORS.successSoft,

                borderRadius:
                  RADIUS.round,

                paddingHorizontal: 10,

                paddingVertical: 5,
              }}
            >
              <Text
                style={{
                  color:
                    item.clock_out
                      ? COLORS.textMuted
                      : COLORS.success,

                  fontSize: 10,

                  fontWeight:
                    '800',
                }}
              >
                {item.clock_out
                  ? 'COMPLETED'
                  : 'ACTIVE'
                }
              </Text>
            </View>
          </View>


          {breaks.length > 0 && (
            <View
              style={{
                marginTop: 14,

                paddingTop: 12,

                borderTopWidth: 1,

                borderTopColor:
                  COLORS.border,
              }}
            >
              <Text
                style={{
                  color:
                    COLORS.textMuted,

                  fontSize: 10,

                  fontWeight:
                    '800',

                  textTransform:
                    'uppercase',

                  letterSpacing: 0.5,

                  marginBottom: 7,
                }}
              >
                Breaks
              </Text>


              {breaks.map(
                (
                  breakItem
                ) => (
                  <View
                    key={
                      breakItem.id
                    }

                    style={{
                      flexDirection:
                        'row',

                      alignItems:
                        'center',

                      marginBottom: 5,
                    }}
                  >
                    <View
                      style={{
                        width: 6,

                        height: 6,

                        borderRadius: 3,

                        backgroundColor:
                          breakItem.end
                            ? COLORS.textMuted
                            : COLORS.warning,

                        marginRight: 8,
                      }}
                    />

                    <Text
                      style={{
                        color:
                          COLORS.textSecondary,

                        fontSize: 12,
                      }}
                    >
                      {formatTime(
                        breakItem.start
                      )}
                      {' → '}
                      {breakItem.end
                        ? formatTime(
                            breakItem.end
                          )
                        : 'In progress'
                      }
                    </Text>
                  </View>
                )
              )}
            </View>
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
        <View
          style={{
            marginBottom: 18,
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
            Time Clock
          </Text>


          <Text
            style={{
              color:
                COLORS.textMuted,

              fontSize: 13,

              marginTop: 4,
            }}
          >
            Track shifts, breaks and payable time.
          </Text>
        </View>


        <View
          style={{
            flexDirection:
              isDesktop
                ? 'row'
                : 'column',

            gap:
              isDesktop
                ? 18
                : 14,

            alignItems:
              'stretch',
          }}
        >

          {/* STATUS CARD */}

          <View
            style={{
              flex:
                isDesktop
                  ? 1
                  : undefined,

              backgroundColor:
                COLORS.white,

              borderRadius:
                RADIUS.large,

              borderWidth: 1,

              borderColor:
                COLORS.border,

              padding: 18,

              ...SHADOWS.card,
            }}
          >
            <Text
              style={{
                color:
                  COLORS.textMuted,

                fontSize: 11,

                fontWeight:
                  '800',

                textTransform:
                  'uppercase',

                letterSpacing: 0.6,
              }}
            >
              Current Status
            </Text>


            <View
              style={{
                flexDirection:
                  'row',

                alignItems:
                  'center',

                marginTop: 14,
              }}
            >
              <View
                style={{
                  width: 48,

                  height: 48,

                  borderRadius: 24,

                  backgroundColor:
                    statusBackground,

                  alignItems:
                    'center',

                  justifyContent:
                    'center',

                  marginRight: 13,
                }}
              >
                <View
                  style={{
                    width: 13,

                    height: 13,

                    borderRadius: 7,

                    backgroundColor:
                      statusColor,
                  }}
                />
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

                    fontSize: 21,

                    fontWeight:
                      '900',
                  }}
                >
                  {statusText}
                </Text>


                <Text
                  style={{
                    color:
                      COLORS.textMuted,

                    fontSize: 12,

                    marginTop: 3,
                  }}
                >
                  {statusDescription}
                </Text>
              </View>
            </View>


            <View
              style={{
                flexDirection:
                  isPhone
                    ? 'column'
                    : 'row',

                gap: 9,

                marginTop: 18,
              }}
            >
              {!current && (
                <ActionButton
                  title={
                    actionLoading
                      ? 'Working...'
                      : 'Clock In'
                  }

                  type="success"

                  disabled={
                    actionLoading
                  }

                  onPress={
                    clockIn
                  }
                />
              )}


              {current &&
                !activeBreak && (
                  <ActionButton
                    title={
                      actionLoading
                        ? 'Working...'
                        : 'Start Break'
                    }

                    type="secondary"

                    disabled={
                      actionLoading
                    }

                    onPress={
                      startBreak
                    }
                  />
                )}


              {current &&
                activeBreak && (
                  <ActionButton
                    title={
                      actionLoading
                        ? 'Working...'
                        : 'End Break'
                    }

                    type="primary"

                    disabled={
                      actionLoading
                    }

                    onPress={
                      endBreak
                    }
                  />
                )}


              {current && (
                <ActionButton
                  title="Clock Out"

                  type="danger"

                  disabled={
                    actionLoading
                  }

                  onPress={
                    clockOut
                  }
                />
              )}
            </View>
          </View>


          {/* TODAY TOTALS */}

          <View
            style={{
              flex:
                isDesktop
                  ? 1.2
                  : undefined,
            }}
          >
            <Text
              style={{
                color:
                  COLORS.text,

                fontSize: 16,

                fontWeight:
                  '800',

                marginBottom: 10,
              }}
            >
              Time Summary
            </Text>


            <View
              style={{
                flexDirection:
                  'row',

                flexWrap: 'wrap',

                gap: 10,
              }}
            >
              <MetricCard
                label="Worked"

                value={
                  minutesToHours(
                    summary.worked_minutes
                  )
                }
              />


              <MetricCard
                label="Break"

                value={
                  minutesToHours(
                    summary.break_minutes
                  )
                }
              />


              <MetricCard
                label="Payable"

                highlight

                value={
                  minutesToHours(
                    summary.payable_minutes
                  )
                }
              />
            </View>
          </View>
        </View>


        <View
          style={{
            flexDirection:
              'row',

            alignItems:
              'center',

            justifyContent:
              'space-between',

            marginTop: 24,

            marginBottom: 12,
          }}
        >
          <View>
            <Text
              style={{
                color:
                  COLORS.text,

                fontSize: 19,

                fontWeight:
                  '800',
              }}
            >
              Recent Shifts
            </Text>


            <Text
              style={{
                color:
                  COLORS.textMuted,

                fontSize: 12,

                marginTop: 3,
              }}
            >
              Your latest time-clock history.
            </Text>
          </View>


          <TouchableOpacity
            onPress={async () => {
              try {
                setLoading(
                  true
                );

                await load();
              } catch (
                error
              ) {
                Alert.alert(
                  'Refresh failed',
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
              Refresh
            </Text>
          </TouchableOpacity>
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
        data={
          summary.entries
        }

        keyExtractor={(
          item
        ) =>
          String(
            item.id
          )
        }

        renderItem={
          renderEntry
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

                ...SHADOWS.card,
              }}
            >
              <View
                style={{
                  width: 56,

                  height: 56,

                  borderRadius: 28,

                  backgroundColor:
                    COLORS.blueSoft,

                  alignItems:
                    'center',

                  justifyContent:
                    'center',

                  marginBottom: 12,
                }}
              >
                <Text
                  style={{
                    color:
                      COLORS.royal,

                    fontSize: 22,

                    fontWeight:
                      '900',
                  }}
                >
                  ◷
                </Text>
              </View>


              <Text
                style={{
                  color:
                    COLORS.text,

                  fontSize: 16,

                  fontWeight:
                    '800',
                }}
              >
                No shifts yet
              </Text>


              <Text
                style={{
                  color:
                    COLORS.textMuted,

                  fontSize: 12,

                  textAlign:
                    'center',

                  marginTop: 5,
                }}
              >
                Your completed shifts will appear here.
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

          paddingBottom: 40,
        }}

        refreshing={
          loading
        }

        onRefresh={async () => {
          try {
            setLoading(
              true
            );

            await load();
          } catch (
            error
          ) {
            Alert.alert(
              'Refresh failed',
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
        }}

        showsVerticalScrollIndicator={
          false
        }
      />
    </View>
  );
}