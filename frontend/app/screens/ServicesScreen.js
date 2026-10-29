// frontend/app/screens/ServicesScreen.js

import React, {
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
  FlatList,
  Keyboard,
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


function titleCase(
  value
) {
  return String(
    value || ''
  )
    .replace(
      /[-_]/g,
      ' '
    )
    .replace(
      /\b\w/g,
      (letter) =>
        letter.toUpperCase()
    );
}


/* =========================================================
   SMALL UI
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

        fontWeight: '700',

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
          minHeight: 49,

          backgroundColor:
            COLORS.white,

          borderWidth: 1,

          borderColor:
            COLORS.border,

          borderRadius:
            RADIUS.medium,

          color:
            COLORS.text,

          fontSize: 14,

          paddingHorizontal: 13,
        },

        style,
      ]}

      {...props}
    />
  );
}


function PrimaryButton({
  title,
  onPress,
}) {
  return (
    <TouchableOpacity
      activeOpacity={0.85}

      onPress={onPress}

      style={{
        minHeight: 50,

        backgroundColor:
          COLORS.royal,

        borderRadius:
          RADIUS.medium,

        alignItems: 'center',

        justifyContent:
          'center',
      }}
    >
      <Text
        style={{
          color:
            COLORS.white,

          fontSize: 14,

          fontWeight: '800',
        }}
      >
        {title}
      </Text>
    </TouchableOpacity>
  );
}


function OutlineButton({
  title,
  onPress,
  danger = false,
}) {
  return (
    <TouchableOpacity
      activeOpacity={0.8}

      onPress={onPress}

      style={{
        flex: 1,

        minHeight: 43,

        borderWidth: 1,

        borderColor:
          danger
            ? COLORS.danger
            : COLORS.border,

        borderRadius:
          RADIUS.medium,

        backgroundColor:
          danger
            ? COLORS.dangerSoft
            : COLORS.white,

        alignItems: 'center',

        justifyContent:
          'center',
      }}
    >
      <Text
        style={{
          color:
            danger
              ? COLORS.danger
              : COLORS.royal,

          fontSize: 13,

          fontWeight: '800',
        }}
      >
        {title}
      </Text>
    </TouchableOpacity>
  );
}


function SpecialtyChip({
  label,
  active,
  onPress,
  isNew = false,
}) {
  return (
    <TouchableOpacity
      activeOpacity={0.8}

      onPress={onPress}

      style={{
        paddingHorizontal: 13,

        minHeight: 40,

        borderRadius:
          RADIUS.round,

        borderWidth: 1,

        borderColor:
          active
            ? COLORS.royal
            : COLORS.border,

        backgroundColor:
          active
            ? COLORS.royal
            : isNew
              ? COLORS.blueSoft
              : COLORS.white,

        alignItems: 'center',

        justifyContent:
          'center',
      }}
    >
      <Text
        style={{
          color:
            active
              ? COLORS.white
              : COLORS.royal,

          fontSize: 12,

          fontWeight: '800',
        }}
      >
        {isNew
          ? '+ New Specialty'
          : label
        }
      </Text>
    </TouchableOpacity>
  );
}


/* =========================================================
   MAIN SCREEN
========================================================= */

export default function ServicesScreen({
  token,
  me,
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
    specialties,
    setSpecialties,
  ] =
    useState([]);


  const [
    selectedCat,
    setSelectedCat,
  ] =
    useState('');


  const [
    newCat,
    setNewCat,
  ] =
    useState('');


  const [
    services,
    setServices,
  ] =
    useState([]);


  const [
    loading,
    setLoading,
  ] =
    useState(false);


  /* =====================================================
     CREATE FORM
  ===================================================== */

  const [
    svcName,
    setSvcName,
  ] =
    useState('');


  const [
    svcDuration,
    setSvcDuration,
  ] =
    useState('30');


  const [
    svcPrice,
    setSvcPrice,
  ] =
    useState('0');


  /* =====================================================
     EDIT FORM
  ===================================================== */

  const [
    editingId,
    setEditingId,
  ] =
    useState(null);


  const [
    editName,
    setEditName,
  ] =
    useState('');


  const [
    editDuration,
    setEditDuration,
  ] =
    useState('30');


  const [
    editPrice,
    setEditPrice,
  ] =
    useState('0');


  const selectedLabel =
    useMemo(
      () =>
        specialties.find(
          (specialty) =>
            specialty.slug ===
            selectedCat
        )?.label ||
        selectedCat ||
        '',
      [
        specialties,
        selectedCat,
      ]
    );


  /* =====================================================
     OWNER GATE
  ===================================================== */

  if (
    me?.role !==
    'owner'
  ) {
    return (
      <View
        style={{
          flex: 1,

          backgroundColor:
            COLORS.background,

          padding:
            contentPadding,
        }}
      >
        <View
          style={{
            backgroundColor:
              COLORS.white,

            borderRadius:
              RADIUS.large,

            borderWidth: 1,

            borderColor:
              COLORS.border,

            padding: 22,

            ...SHADOWS.card,
          }}
        >
          <View
            style={{
              width: 52,

              height: 52,

              borderRadius: 26,

              backgroundColor:
                COLORS.blueSoft,

              alignItems:
                'center',

              justifyContent:
                'center',

              marginBottom: 14,
            }}
          >
            <Text
              style={{
                color:
                  COLORS.royal,

                fontSize: 21,

                fontWeight: '900',
              }}
            >
              ✂
            </Text>
          </View>


          <Text
            style={{
              color:
                COLORS.text,

              fontSize: 20,

              fontWeight: '800',
            }}
          >
            Services
          </Text>


          <Text
            style={{
              color:
                COLORS.textMuted,

              fontSize: 13,

              lineHeight: 19,

              marginTop: 6,
            }}
          >
            Only the owner can manage salon services and specialties.
          </Text>
        </View>
      </View>
    );
  }


  /* =====================================================
     LOAD SPECIALTIES
  ===================================================== */

  const loadSpecialties =
    async () => {
      try {
        const response =
          await fetchOk(
            `${API_BASE_URL}/public/specialties`
          );


        const data =
          await response.json();


        setSpecialties(
          Array.isArray(
            data
          )
            ? data
            : []
        );
      } catch (
        error
      ) {
        setSpecialties(
          []
        );


        Alert.alert(
          'Load error',
          `Failed to load specialties: ${error.message}`
        );
      }
    };


  /* =====================================================
     LOAD SERVICES
  ===================================================== */

  const loadServicesFor =
    async (
      category
    ) => {
      setLoading(
        true
      );


      setServices(
        []
      );


      try {
        if (!category) {
          return;
        }


        const response =
          await fetchOk(
            `${API_BASE_URL}/public/services?category=${encodeURIComponent(
              category
            )}`
          );


        const data =
          await response.json();


        setServices(
          Array.isArray(
            data
          )
            ? data
            : []
        );
      } catch (
        error
      ) {
        setServices(
          []
        );


        Alert.alert(
          'Load error',
          `Failed to load services: ${error.message}`
        );
      } finally {
        setLoading(
          false
        );
      }
    };


  useEffect(
    () => {
      (
        async () => {
          await loadSpecialties();
        }
      )();
    },
    []
  );


  useEffect(
    () => {
      (
        async () => {
          await loadServicesFor(
            selectedCat
          );
        }
      )();
    },
    [
      selectedCat,
    ]
  );


  /* =====================================================
     CREATE
  ===================================================== */

  const resetCreateForm =
    () => {
      setSvcName('');
      setSvcDuration('30');
      setSvcPrice('0');
    };


  const createService =
    async () => {
      try {
        const category =
          selectedCat ||
          newCat
            .trim()
            .toLowerCase();


        if (
          !category
        ) {
          return Alert.alert(
            'Missing specialty',
            'Choose a specialty or enter a new one.'
          );
        }


        if (
          !svcName.trim()
        ) {
          return Alert.alert(
            'Missing service',
            'Enter a service name.'
          );
        }


        const duration =
          Math.max(
            1,
            parseInt(
              svcDuration ||
              '0',
              10
            )
          );


        const parsedPrice =
          parseFloat(
            svcPrice
          );


        const price =
          Number.isFinite(
            parsedPrice
          )
            ? parsedPrice
            : 0;


        await fetchOk(
          `${API_BASE_URL}/services/`,
          {
            method:
              'POST',

            headers:
              authHeaders,

            body:
              JSON.stringify({
                name:
                  svcName.trim(),

                duration_minutes:
                  duration,

                price,

                category,
              }),
          }
        );


        if (
          !selectedCat
        ) {
          setSelectedCat(
            category
          );
        }


        await Promise.all([
          loadServicesFor(
            category
          ),

          loadSpecialties(),
        ]);


        resetCreateForm();

        setNewCat('');

        Keyboard.dismiss();


        Alert.alert(
          'Created',
          'Service added.'
        );
      } catch (
        error
      ) {
        Alert.alert(
          'Create failed',
          String(
            error.message ||
            error
          )
        );
      }
    };


  /* =====================================================
     EDIT
  ===================================================== */

  const startEdit =
    (
      service
    ) => {
      setEditingId(
        service.id
      );

      setEditName(
        service.name ||
        ''
      );

      setEditDuration(
        String(
          service.duration_minutes ??
          30
        )
      );

      setEditPrice(
        String(
          service.price ??
          0
        )
      );
    };


  const cancelEdit =
    () => {
      setEditingId(
        null
      );
    };


  const saveEdit =
    async () => {
      try {
        if (
          !editingId
        ) {
          return;
        }


        if (
          !editName.trim()
        ) {
          return Alert.alert(
            'Missing name',
            'Enter a service name.'
          );
        }


        const duration =
          Math.max(
            1,
            parseInt(
              editDuration ||
              '0',
              10
            )
          );


        const parsedPrice =
          parseFloat(
            editPrice
          );


        const price =
          Number.isFinite(
            parsedPrice
          )
            ? parsedPrice
            : 0;


        await fetchOk(
          `${API_BASE_URL}/services/${editingId}`,
          {
            method:
              'PUT',

            headers:
              authHeaders,

            body:
              JSON.stringify({
                name:
                  editName.trim(),

                duration_minutes:
                  duration,

                price,

                category:
                  selectedCat ||
                  undefined,
              }),
          }
        );


        setEditingId(
          null
        );


        await loadServicesFor(
          selectedCat
        );


        Alert.alert(
          'Saved',
          'Service updated.'
        );
      } catch (
        error
      ) {
        Alert.alert(
          'Update failed',
          String(
            error.message ||
            error
          )
        );
      }
    };


  /* =====================================================
     DELETE
  ===================================================== */

  const deleteService =
    (
      id,
      name
    ) => {
      Alert.alert(
        'Delete service?',
        `Remove "${name}"? This cannot be undone.`,
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
              async () => {
                try {
                  await fetchOk(
                    `${API_BASE_URL}/services/${id}`,
                    {
                      method:
                        'DELETE',

                      headers: {
                        Authorization:
                          `Bearer ${token}`,
                      },
                    }
                  );


                  await Promise.all([
                    loadServicesFor(
                      selectedCat
                    ),

                    loadSpecialties(),
                  ]);
                } catch (
                  error
                ) {
                  Alert.alert(
                    'Delete failed',
                    String(
                      error.message ||
                      error
                    )
                  );
                }
              },
          },
        ]
      );
    };


  /* =====================================================
     SERVICE CARD
  ===================================================== */

  const renderService =
    ({
      item,
    }) => {
      const isEditing =
        editingId ===
        item.id;


      if (
        isEditing
      ) {
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
            <Text
              style={{
                color:
                  COLORS.text,

                fontSize: 17,

                fontWeight: '800',

                marginBottom: 15,
              }}
            >
              Edit Service
            </Text>


            <FieldLabel>
              Service name
            </FieldLabel>

            <AppInput
              value={
                editName
              }

              onChangeText={
                setEditName
              }

              placeholder="Service name"

              style={{
                marginBottom: 11,
              }}
            />


            <View
              style={{
                flexDirection:
                  isPhone
                    ? 'column'
                    : 'row',

                gap:
                  isPhone
                    ? 0
                    : 10,
              }}
            >
              <View
                style={{
                  flex: 1,
                }}
              >
                <FieldLabel>
                  Duration (minutes)
                </FieldLabel>

                <AppInput
                  value={
                    editDuration
                  }

                  onChangeText={
                    setEditDuration
                  }

                  keyboardType="number-pad"

                  placeholder="30"

                  style={{
                    marginBottom: 11,
                  }}
                />
              </View>


              <View
                style={{
                  flex: 1,
                }}
              >
                <FieldLabel>
                  Price ($)
                </FieldLabel>

                <AppInput
                  value={
                    editPrice
                  }

                  onChangeText={
                    setEditPrice
                  }

                  keyboardType="decimal-pad"

                  placeholder="0.00"

                  style={{
                    marginBottom: 11,
                  }}
                />
              </View>
            </View>


            <View
              style={{
                flexDirection:
                  'row',

                gap: 8,
              }}
            >
              <OutlineButton
                title="Cancel"

                onPress={
                  cancelEdit
                }
              />


              <View
                style={{
                  flex: 1,
                }}
              >
                <PrimaryButton
                  title="Save Changes"

                  onPress={
                    saveEdit
                  }
                />
              </View>
            </View>
          </View>
        );
      }


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

              alignItems:
                'center',
            }}
          >
            <View
              style={{
                width: 48,

                height: 48,

                borderRadius:
                  RADIUS.medium,

                backgroundColor:
                  COLORS.blueSoft,

                alignItems:
                  'center',

                justifyContent:
                  'center',

                marginRight: 13,
              }}
            >
              <Text
                style={{
                  color:
                    COLORS.royal,

                  fontSize: 20,

                  fontWeight: '900',
                }}
              >
                ✂
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

                  fontSize: 16,

                  fontWeight: '800',
                }}
              >
                {item.name}
              </Text>


              <Text
                style={{
                  color:
                    COLORS.textMuted,

                  fontSize: 12,

                  marginTop: 4,
                }}
              >
                {item.duration_minutes}{' '}
                min
              </Text>
            </View>


            <View
              style={{
                backgroundColor:
                  COLORS.blueSoft,

                paddingHorizontal:
                  11,

                paddingVertical:
                  7,

                borderRadius:
                  RADIUS.round,
              }}
            >
              <Text
                style={{
                  color:
                    COLORS.royal,

                  fontSize: 14,

                  fontWeight: '900',
                }}
              >
                ${Number(
                  item.price ||
                  0
                ).toFixed(2)}
              </Text>
            </View>
          </View>


          <View
            style={{
              height: 1,

              backgroundColor:
                COLORS.border,

              marginVertical: 14,
            }}
          />


          <View
            style={{
              flexDirection:
                'row',

              gap: 8,
            }}
          >
            <OutlineButton
              title="Edit"

              onPress={() =>
                startEdit(
                  item
                )
              }
            />


            <OutlineButton
              title="Delete"

              danger

              onPress={() =>
                deleteService(
                  item.id,
                  item.name
                )
              }
            />
          </View>
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

              fontWeight: '800',
            }}
          >
            Services
          </Text>


          <Text
            style={{
              color:
                COLORS.textMuted,

              fontSize: 13,

              marginTop: 4,

              lineHeight: 18,
            }}
          >
            Manage salon specialties, service duration and pricing.
          </Text>
        </View>


        {/* SPECIALTIES */}

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
                'center',

              marginBottom: 13,
            }}
          >
            <View>
              <Text
                style={{
                  color:
                    COLORS.text,

                  fontSize: 17,

                  fontWeight: '800',
                }}
              >
                Specialties
              </Text>


              <Text
                style={{
                  color:
                    COLORS.textMuted,

                  fontSize: 11,

                  marginTop: 3,
                }}
              >
                Select where the service belongs.
              </Text>
            </View>


            <Text
              style={{
                color:
                  COLORS.textMuted,

                fontSize: 11,
              }}
            >
              {specialties.length}{' '}
              {specialties.length ===
              1
                ? 'category'
                : 'categories'}
            </Text>
          </View>


          <View
            style={{
              flexDirection:
                'row',

              flexWrap:
                'wrap',

              gap: 8,
            }}
          >
            <SpecialtyChip
              label="New"

              isNew

              active={
                !selectedCat
              }

              onPress={() => {
                setSelectedCat(
                  ''
                );

                setEditingId(
                  null
                );
              }}
            />


            {specialties.map(
              (
                specialty
              ) => (
                <SpecialtyChip
                  key={
                    specialty.slug
                  }

                  label={
                    specialty.label ||
                    titleCase(
                      specialty.slug
                    )
                  }

                  active={
                    selectedCat ===
                    specialty.slug
                  }

                  onPress={() => {
                    setSelectedCat(
                      specialty.slug
                    );

                    setNewCat(
                      ''
                    );

                    setEditingId(
                      null
                    );
                  }}
                />
              )
            )}
          </View>
        </View>


        {/* CREATE */}

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

            marginTop: 14,

            ...SHADOWS.card,
          }}
        >
          <Text
            style={{
              color:
                COLORS.text,

              fontSize: 17,

              fontWeight: '800',
            }}
          >
            Add Service
          </Text>


          <Text
            style={{
              color:
                COLORS.textMuted,

              fontSize: 12,

              marginTop: 3,

              marginBottom: 16,
            }}
          >
            {selectedCat
              ? `Adding to ${selectedLabel || titleCase(selectedCat)}`
              : 'Create a new specialty with its first service.'
            }
          </Text>


          {!selectedCat && (
            <>
              <FieldLabel>
                New Specialty
              </FieldLabel>

              <AppInput
                value={
                  newCat
                }

                onChangeText={
                  setNewCat
                }

                autoCapitalize="none"

                placeholder="hair, nails, makeup..."

                style={{
                  marginBottom: 11,
                }}
              />


              <View
                style={{
                  backgroundColor:
                    COLORS.blueSoft,

                  borderRadius:
                    RADIUS.medium,

                  padding: 11,

                  marginBottom: 13,
                }}
              >
                <Text
                  style={{
                    color:
                      COLORS.royal,

                    fontSize: 11,

                    lineHeight: 16,

                    fontWeight: '600',
                  }}
                >
                  The specialty will be created automatically when you save its first service.
                </Text>
              </View>
            </>
          )}


          {selectedCat && (
            <View
              style={{
                backgroundColor:
                  COLORS.blueSoft,

                borderRadius:
                  RADIUS.medium,

                padding: 13,

                marginBottom: 13,
              }}
            >
              <Text
                style={{
                  color:
                    COLORS.textMuted,

                  fontSize: 10,

                  fontWeight: '700',

                  textTransform:
                    'uppercase',
                }}
              >
                Specialty
              </Text>


              <Text
                style={{
                  color:
                    COLORS.royal,

                  fontSize: 15,

                  fontWeight: '800',

                  marginTop: 3,
                }}
              >
                {selectedLabel ||
                  titleCase(
                    selectedCat
                  )}
              </Text>
            </View>
          )}


          <FieldLabel>
            Service name
          </FieldLabel>

          <AppInput
            value={
              svcName
            }

            onChangeText={
              setSvcName
            }

            placeholder="Haircut, Full Color, Gel Manicure..."

            style={{
              marginBottom: 11,
            }}
          />


          <View
            style={{
              flexDirection:
                isPhone
                  ? 'column'
                  : 'row',

              gap:
                isPhone
                  ? 0
                  : 10,
            }}
          >
            <View
              style={{
                flex: 1,
              }}
            >
              <FieldLabel>
                Duration (minutes)
              </FieldLabel>

              <AppInput
                value={
                  svcDuration
                }

                onChangeText={
                  setSvcDuration
                }

                keyboardType="number-pad"

                placeholder="30"

                style={{
                  marginBottom: 11,
                }}
              />
            </View>


            <View
              style={{
                flex: 1,
              }}
            >
              <FieldLabel>
                Price ($)
              </FieldLabel>

              <AppInput
                value={
                  svcPrice
                }

                onChangeText={
                  setSvcPrice
                }

                keyboardType="decimal-pad"

                placeholder="0.00"

                style={{
                  marginBottom: 13,
                }}
              />
            </View>
          </View>


          <PrimaryButton
            title="+ Create Service"

            onPress={
              createService
            }
          />
        </View>


        {/* LIST TITLE */}

        <View
          style={{
            flexDirection:
              'row',

            alignItems:
              'flex-end',

            justifyContent:
              'space-between',

            marginTop: 24,

            marginBottom: 12,
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
                  COLORS.text,

                fontSize: 19,

                fontWeight: '800',
              }}
            >
              {selectedCat
                ? `${selectedLabel || titleCase(selectedCat)} Services`
                : 'Service List'
              }
            </Text>


            <Text
              style={{
                color:
                  COLORS.textMuted,

                fontSize: 12,

                marginTop: 3,
              }}
            >
              {selectedCat
                ? loading
                  ? 'Loading services...'
                  : `${services.length} ${
                      services.length ===
                      1
                        ? 'service'
                        : 'services'
                    }`
                : 'Choose a specialty above to view its services.'
              }
            </Text>
          </View>


          {!!selectedCat && (
            <TouchableOpacity
              onPress={() =>
                loadServicesFor(
                  selectedCat
                )
              }
            >
              <Text
                style={{
                  color:
                    COLORS.royal,

                  fontSize: 12,

                  fontWeight: '800',
                }}
              >
                Refresh
              </Text>
            </TouchableOpacity>
          )}
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
          services
        }

        keyExtractor={(
          service
        ) =>
          String(
            service.id
          )
        }

        renderItem={
          renderService
        }

        ListHeaderComponent={
          Header
        }

        ListEmptyComponent={
          selectedCat &&
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

                padding: 28,

                alignItems:
                  'center',

                ...SHADOWS.card,
              }}
            >
              <View
                style={{
                  width: 55,

                  height: 55,

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

                    fontSize: 21,

                    fontWeight: '900',
                  }}
                >
                  ✂
                </Text>
              </View>


              <Text
                style={{
                  color:
                    COLORS.text,

                  fontSize: 16,

                  fontWeight: '800',
                }}
              >
                No services yet
              </Text>


              <Text
                style={{
                  color:
                    COLORS.textMuted,

                  textAlign:
                    'center',

                  fontSize: 12,

                  marginTop: 5,
                }}
              >
                Add the first service for this specialty above.
              </Text>
            </View>
          ) : null
        }

        contentContainerStyle={{
          width: '100%',

          maxWidth:
            isDesktop
              ? 1050
              : 900,

          alignSelf:
            'center',

          padding:
            contentPadding,

          paddingBottom:
            40,
        }}

        keyboardDismissMode="on-drag"

        keyboardShouldPersistTaps="handled"

        showsVerticalScrollIndicator={
          false
        }
      />
    </View>
  );
}