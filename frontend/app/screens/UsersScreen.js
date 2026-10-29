// frontend/app/screens/UsersScreen.js

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
  Image,
  Keyboard,
  useWindowDimensions,
} from 'react-native';

import * as ImagePicker
  from 'expo-image-picker';

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


const ROLE_CHOICES = [
  {
    label: 'Receptionist',
    value: 'receptionist',
  },

  {
    label: 'Staff',
    value: 'staff',
  },
];


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

          color:
            COLORS.text,

          backgroundColor:
            COLORS.white,

          borderWidth: 1,

          borderColor:
            COLORS.border,

          borderRadius:
            RADIUS.medium,

          paddingHorizontal: 13,

          fontSize: 14,
        },

        style,
      ]}

      {...props}
    />
  );
}


function RoleButton({
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


function PrimaryButton({
  title,
  onPress,
  disabled = false,
}) {
  return (
    <TouchableOpacity
      activeOpacity={0.85}

      disabled={disabled}

      onPress={onPress}

      style={{
        minHeight: 50,

        borderRadius:
          RADIUS.medium,

        backgroundColor:
          COLORS.royal,

        alignItems:
          'center',

        justifyContent:
          'center',

        opacity:
          disabled
            ? 0.5
            : 1,
      }}
    >
      <Text
        style={{
          color:
            COLORS.white,

          fontSize: 14,

          fontWeight:
            '800',
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

        borderRadius:
          RADIUS.medium,

        borderWidth: 1,

        borderColor:
          danger
            ? COLORS.danger
            : COLORS.border,

        backgroundColor:
          danger
            ? COLORS.dangerSoft
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
            danger
              ? COLORS.danger
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


function Avatar({
  uri,
  name,
  size = 58,
}) {
  const initial =
    name
      ?.trim()
      ?.charAt(0)
      ?.toUpperCase() ||
    '?';


  if (uri) {
    return (
      <Image
        source={{
          uri,
        }}

        style={{
          width: size,

          height: size,

          borderRadius:
            size / 2,

          borderWidth: 1,

          borderColor:
            COLORS.border,

          backgroundColor:
            COLORS.surfaceSoft,
        }}
      />
    );
  }


  return (
    <View
      style={{
        width: size,

        height: size,

        borderRadius:
          size / 2,

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

          fontSize:
            size * 0.3,

          fontWeight:
            '900',
        }}
      >
        {initial}
      </Text>
    </View>
  );
}


/* =========================================================
   MAIN SCREEN
========================================================= */

export default function UsersScreen({
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
    list,
    setList,
  ] =
    useState([]);


  const [
    filterRole,
    setFilterRole,
  ] =
    useState('all');


  const [
    loading,
    setLoading,
  ] =
    useState(true);


  const [
    uploadingAvatar,
    setUploadingAvatar,
  ] =
    useState(false);


  /* =====================================================
     CREATE STATE
  ===================================================== */

  const [
    email,
    setEmail,
  ] =
    useState('');


  const [
    name,
    setName,
  ] =
    useState('');


  const [
    role,
    setRole,
  ] =
    useState('staff');


  const [
    password,
    setPassword,
  ] =
    useState('');


  const [
    profession,
    setProfession,
  ] =
    useState('');


  const [
    avatarUrl,
    setAvatarUrl,
  ] =
    useState('');


  const [
    avatarLocal,
    setAvatarLocal,
  ] =
    useState(null);


  /* =====================================================
     EDIT STATE
  ===================================================== */

  const [
    editingId,
    setEditingId,
  ] =
    useState(null);


  const [
    editEmail,
    setEditEmail,
  ] =
    useState('');


  const [
    editName,
    setEditName,
  ] =
    useState('');


  const [
    editRole,
    setEditRole,
  ] =
    useState('staff');


  const [
    editProfession,
    setEditProfession,
  ] =
    useState('');


  const [
    editAvatarUrl,
    setEditAvatarUrl,
  ] =
    useState('');


  const [
    editPassword,
    setEditPassword,
  ] =
    useState('');


  const [
    editAvatarLocal,
    setEditAvatarLocal,
  ] =
    useState(null);


  /* =====================================================
     LOAD TEAM
  ===================================================== */

  const load =
    async (
      selectedRole =
        filterRole
    ) => {
      try {
        const url =
          new URL(
            `${API_BASE_URL}/users/`
          );


        if (
          selectedRole !==
          'all'
        ) {
          url.searchParams.set(
            'role',
            selectedRole
          );
        }


        const response =
          await fetchOk(
            url.toString(),
            {
              headers:
                authHeaders,
            }
          );


        const data =
          await response.json();


        setList(
          Array.isArray(
            data
          )
            ? data
            : []
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
      }
    };


  useEffect(
    () => {
      (
        async () => {
          setLoading(
            true
          );

          await load(
            filterRole
          );

          setLoading(
            false
          );
        }
      )();
    },
    [
      filterRole,
    ]
  );


  /* =====================================================
     IMAGE PICKING
  ===================================================== */

  const pickFromLibrary =
    async () => {
      const permission =
        await ImagePicker
          .requestMediaLibraryPermissionsAsync();


      if (
        permission.status !==
        'granted'
      ) {
        Alert.alert(
          'Permission required',
          'Please allow photo library access.'
        );

        return null;
      }


      const result =
        await ImagePicker
          .launchImageLibraryAsync({
            mediaTypes:
              ImagePicker
                .MediaTypeOptions
                .Images,

            allowsEditing:
              true,

            aspect:
              [1, 1],

            quality:
              0.9,
          });


      if (
        result.canceled
      ) {
        return null;
      }


      return (
        result.assets?.[0] ||
        null
      );
    };


  const uploadAvatarFile =
    async (
      asset
    ) => {
      const form =
        new FormData();


      form.append(
        'file',
        {
          uri:
            asset.uri,

          name:
            asset.fileName ||
            'avatar.jpg',

          type:
            asset.mimeType ||
            'image/jpeg',
        }
      );


      const response =
        await fetch(
          `${API_BASE_URL}/upload/avatar`,
          {
            method:
              'POST',

            headers: {
              Authorization:
                `Bearer ${token}`,
            },

            body:
              form,
          }
        );


      if (
        !response.ok
      ) {
        throw new Error(
          `${response.status} ${await response.text()}`
        );
      }


      const data =
        await response.json();


      if (
        !data?.url
      ) {
        throw new Error(
          'Upload did not return a URL'
        );
      }


      return data.url;
    };


  const pickAndUploadAvatar =
    async () => {
      try {
        const asset =
          await pickFromLibrary();


        if (!asset) {
          return;
        }


        setAvatarLocal(
          asset.uri
        );


        setUploadingAvatar(
          true
        );


        const url =
          await uploadAvatarFile(
            asset
          );


        setAvatarUrl(
          url
        );
      } catch (
        error
      ) {
        Alert.alert(
          'Upload failed',
          String(
            error.message ||
            error
          )
        );
      } finally {
        setUploadingAvatar(
          false
        );
      }
    };


  const pickAndUploadAvatarEdit =
    async () => {
      try {
        const asset =
          await pickFromLibrary();


        if (!asset) {
          return;
        }


        setEditAvatarLocal(
          asset.uri
        );


        setUploadingAvatar(
          true
        );


        const url =
          await uploadAvatarFile(
            asset
          );


        setEditAvatarUrl(
          url
        );
      } catch (
        error
      ) {
        Alert.alert(
          'Upload failed',
          String(
            error.message ||
            error
          )
        );
      } finally {
        setUploadingAvatar(
          false
        );
      }
    };


  /* =====================================================
     CREATE USER
  ===================================================== */

  const createUser =
    async () => {
      try {
        const body = {
          email:
            email.trim(),

          name:
            name.trim(),

          role,

          password,

          profession:
            profession.trim() ||
            null,

          avatar_url:
            avatarUrl.trim() ||
            null,
        };


        if (
          !body.email ||
          !body.name ||
          !body.password
        ) {
          return Alert.alert(
            'Missing fields',
            'Email, name, and password are required.'
          );
        }


        await fetchOk(
          `${API_BASE_URL}/users/`,
          {
            method:
              'POST',

            headers:
              authHeaders,

            body:
              JSON.stringify(
                body
              ),
          }
        );


        setEmail('');
        setName('');
        setRole('staff');
        setPassword('');
        setProfession('');
        setAvatarUrl('');
        setAvatarLocal(
          null
        );


        Keyboard.dismiss();


        await load();


        Alert.alert(
          'Team member created',
          `${body.name} was added successfully.`
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
     EDIT USER
  ===================================================== */

  const startEdit =
    (
      user
    ) => {
      setEditingId(
        user.id
      );

      setEditEmail(
        user.email ||
        ''
      );

      setEditName(
        user.name ||
        ''
      );

      setEditRole(
        user.role ||
        'staff'
      );

      setEditProfession(
        user.profession ||
        ''
      );

      setEditAvatarUrl(
        user.avatar_url ||
        ''
      );

      setEditPassword('');

      setEditAvatarLocal(
        null
      );
    };


  const cancelEdit =
    () => {
      setEditingId(
        null
      );

      setEditPassword('');

      setEditAvatarLocal(
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
          !editEmail.trim() ||
          !editName.trim()
        ) {
          return Alert.alert(
            'Missing fields',
            'Email and name are required.'
          );
        }


        const body = {
          email:
            editEmail.trim(),

          name:
            editName.trim(),

          role:
            editRole,

          profession:
            editProfession.trim() ||
            null,

          avatar_url:
            editAvatarUrl.trim() ||
            null,
        };


        if (
          editPassword.trim()
        ) {
          body.password =
            editPassword.trim();
        }


        await fetchOk(
          `${API_BASE_URL}/users/${editingId}`,
          {
            method:
              'PUT',

            headers:
              authHeaders,

            body:
              JSON.stringify(
                body
              ),
          }
        );


        cancelEdit();

        await load();


        Alert.alert(
          'Saved',
          'Team member updated.'
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

  const deleteUser =
    (
      id,
      displayName
    ) => {
      Alert.alert(
        'Delete team member?',
        `Remove ${displayName}? This cannot be undone.`,
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
                    `${API_BASE_URL}/users/${id}`,
                    {
                      method:
                        'DELETE',

                      headers: {
                        Authorization:
                          `Bearer ${token}`,
                      },
                    }
                  );


                  await load();
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
     TEAM MEMBER CARD
  ===================================================== */

  const renderItem =
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
            <View
              style={{
                flexDirection:
                  'row',

                alignItems:
                  'center',

                marginBottom: 16,
              }}
            >
              <Avatar
                uri={
                  editAvatarLocal ||
                  editAvatarUrl
                }

                name={
                  editName
                }

                size={54}
              />

              <View
                style={{
                  marginLeft: 12,

                  flex: 1,
                }}
              >
                <Text
                  style={{
                    color:
                      COLORS.text,

                    fontSize: 17,

                    fontWeight:
                      '800',
                  }}
                >
                  Edit Team Member
                </Text>

                <Text
                  style={{
                    color:
                      COLORS.textMuted,

                    fontSize: 12,

                    marginTop: 3,
                  }}
                >
                  Update profile and account access.
                </Text>
              </View>
            </View>


            <FieldLabel>
              Full name
            </FieldLabel>

            <AppInput
              value={
                editName
              }

              onChangeText={
                setEditName
              }

              placeholder="Full name"

              style={{
                marginBottom: 11,
              }}
            />


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

              keyboardType="email-address"

              autoCapitalize="none"

              placeholder="user@email.com"

              style={{
                marginBottom: 11,
              }}
            />


            <FieldLabel>
              Role
            </FieldLabel>

            <View
              style={{
                flexDirection:
                  'row',

                gap: 8,

                marginBottom: 11,
              }}
            >
              {ROLE_CHOICES.map(
                (
                  option
                ) => (
                  <RoleButton
                    key={
                      option.value
                    }

                    title={
                      option.label
                    }

                    active={
                      editRole ===
                      option.value
                    }

                    onPress={() =>
                      setEditRole(
                        option.value
                      )
                    }
                  />
                )
              )}
            </View>


            <FieldLabel>
              Profession / Specialty
            </FieldLabel>

            <AppInput
              value={
                editProfession
              }

              onChangeText={
                setEditProfession
              }

              placeholder="hair, nails, skincare..."

              style={{
                marginBottom: 11,
              }}
            />


            <FieldLabel>
              Profile Photo URL
            </FieldLabel>

            <AppInput
              value={
                editAvatarUrl
              }

              onChangeText={
                setEditAvatarUrl
              }

              placeholder="https://..."

              autoCapitalize="none"

              style={{
                marginBottom: 9,
              }}
            />


            <View
              style={{
                flexDirection:
                  'row',

                gap: 8,

                marginBottom: 12,
              }}
            >
              <OutlineButton
                title={
                  uploadingAvatar
                    ? 'Uploading...'
                    : editAvatarUrl
                      ? 'Change Photo'
                      : 'Upload Photo'
                }

                onPress={
                  pickAndUploadAvatarEdit
                }
              />

              {!!editAvatarUrl && (
                <OutlineButton
                  title="Remove Photo"

                  onPress={() => {
                    setEditAvatarUrl(
                      ''
                    );

                    setEditAvatarLocal(
                      null
                    );
                  }}
                />
              )}
            </View>


            <FieldLabel>
              New password
            </FieldLabel>

            <AppInput
              value={
                editPassword
              }

              onChangeText={
                setEditPassword
              }

              secureTextEntry

              placeholder="Leave blank to keep current password"

              style={{
                marginBottom: 14,
              }}
            />


            <View
              style={{
                flexDirection:
                  'row',

                gap: 9,
              }}
            >
              <OutlineButton
                title="Cancel"

                onPress={
                  cancelEdit
                }
              />

              <PrimaryButton
                title="Save Changes"

                onPress={
                  saveEdit
                }
              />
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
            <Avatar
              uri={
                item.avatar_url
              }

              name={
                item.name
              }
            />


            <View
              style={{
                flex: 1,

                marginLeft: 13,
              }}
            >
              <Text
                style={{
                  color:
                    COLORS.text,

                  fontSize: 16,

                  fontWeight:
                    '800',
                }}
              >
                {item.name}
              </Text>


              <Text
                numberOfLines={1}

                style={{
                  color:
                    COLORS.textMuted,

                  fontSize: 12,

                  marginTop: 3,
                }}
              >
                {item.email}
              </Text>


              {!!item.profession && (
                <Text
                  style={{
                    color:
                      COLORS.textSecondary,

                    fontSize: 12,

                    marginTop: 3,

                    textTransform:
                      'capitalize',
                  }}
                >
                  {item.profession}
                </Text>
              )}
            </View>


            <View
              style={{
                backgroundColor:
                  item.role ===
                  'receptionist'
                    ? COLORS.surfaceSoft
                    : COLORS.blueSoft,

                borderRadius:
                  RADIUS.round,

                paddingHorizontal:
                  10,

                paddingVertical:
                  5,
              }}
            >
              <Text
                style={{
                  color:
                    item.role ===
                    'receptionist'
                      ? COLORS.textSecondary
                      : COLORS.royal,

                  fontSize: 10,

                  fontWeight:
                    '800',

                  textTransform:
                    'uppercase',
                }}
              >
                {item.role}
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
                deleteUser(
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

              fontWeight:
                '800',
            }}
          >
            Team
          </Text>


          <Text
            style={{
              color:
                COLORS.textMuted,

              fontSize: 13,

              marginTop: 4,
            }}
          >
            Manage staff profiles, access and specialties.
          </Text>
        </View>


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

            marginBottom: 16,

            ...SHADOWS.card,
          }}
        >
          <Text
            style={{
              color:
                COLORS.text,

              fontSize: 13,

              fontWeight:
                '800',

              marginBottom: 9,
            }}
          >
            Filter Team
          </Text>


          <View
            style={{
              flexDirection:
                'row',

              gap: 8,
            }}
          >
            {[
              {
                label: 'All',
                value: 'all',
              },

              {
                label:
                  'Reception',
                value:
                  'receptionist',
              },

              {
                label: 'Staff',
                value: 'staff',
              },
            ].map(
              (
                option
              ) => (
                <RoleButton
                  key={
                    option.value
                  }

                  title={
                    option.label
                  }

                  active={
                    filterRole ===
                    option.value
                  }

                  onPress={() =>
                    setFilterRole(
                      option.value
                    )
                  }
                />
              )
            )}
          </View>
        </View>


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
          <Text
            style={{
              color:
                COLORS.text,

              fontSize: 17,

              fontWeight:
                '800',
            }}
          >
            Add Team Member
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
            Create a staff or receptionist login.
          </Text>


          <View
            style={{
              alignItems:
                'center',

              marginBottom: 16,
            }}
          >
            <Avatar
              uri={
                avatarLocal ||
                avatarUrl
              }

              name={
                name
              }

              size={88}
            />


            <TouchableOpacity
              activeOpacity={0.8}

              onPress={
                pickAndUploadAvatar
              }

              style={{
                minHeight: 38,

                marginTop: 10,

                paddingHorizontal:
                  14,

                borderRadius:
                  RADIUS.round,

                borderWidth: 1,

                borderColor:
                  COLORS.royal,

                backgroundColor:
                  COLORS.blueSoft,

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

                  fontSize: 12,

                  fontWeight:
                    '800',
                }}
              >
                {uploadingAvatar
                  ? 'Uploading...'
                  : avatarUrl
                    ? 'Change Photo'
                    : 'Add Profile Photo'
                }
              </Text>
            </TouchableOpacity>


            {!!avatarUrl && (
              <TouchableOpacity
                onPress={() => {
                  setAvatarUrl(
                    ''
                  );

                  setAvatarLocal(
                    null
                  );
                }}

                style={{
                  marginTop: 8,
                }}
              >
                <Text
                  style={{
                    color:
                      COLORS.danger,

                    fontSize: 11,

                    fontWeight:
                      '700',
                  }}
                >
                  Remove photo
                </Text>
              </TouchableOpacity>
            )}
          </View>


          <View
            style={{
              flexDirection:
                isDesktop
                  ? 'row'
                  : 'column',

              gap:
                isDesktop
                  ? 10
                  : 0,
            }}
          >
            <View
              style={{
                flex: 1,
              }}
            >
              <FieldLabel>
                Full name
              </FieldLabel>

              <AppInput
                value={
                  name
                }

                onChangeText={
                  setName
                }

                placeholder="Full name"

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
                Email
              </FieldLabel>

              <AppInput
                value={
                  email
                }

                onChangeText={
                  setEmail
                }

                keyboardType="email-address"

                autoCapitalize="none"

                placeholder="user@email.com"

                style={{
                  marginBottom: 11,
                }}
              />
            </View>
          </View>


          <FieldLabel>
            Role
          </FieldLabel>

          <View
            style={{
              flexDirection:
                'row',

              gap: 8,

              marginBottom: 11,
            }}
          >
            {ROLE_CHOICES.map(
              (
                option
              ) => (
                <RoleButton
                  key={
                    option.value
                  }

                  title={
                    option.label
                  }

                  active={
                    role ===
                    option.value
                  }

                  onPress={() =>
                    setRole(
                      option.value
                    )
                  }
                />
              )
            )}
          </View>


          <FieldLabel>
            Profession / Specialty
          </FieldLabel>

          <AppInput
            value={
              profession
            }

            onChangeText={
              setProfession
            }

            placeholder="hair, nails, skincare..."

            style={{
              marginBottom: 11,
            }}
          />


          <FieldLabel>
            Profile Photo URL
          </FieldLabel>

          <AppInput
            value={
              avatarUrl
            }

            onChangeText={
              setAvatarUrl
            }

            autoCapitalize="none"

            placeholder="Optional photo URL"

            style={{
              marginBottom: 11,
            }}
          />


          <FieldLabel>
            Temporary Password
          </FieldLabel>

          <AppInput
            value={
              password
            }

            onChangeText={
              setPassword
            }

            secureTextEntry

            placeholder="Temporary password"

            returnKeyType="done"

            onSubmitEditing={
              Keyboard.dismiss
            }

            style={{
              marginBottom: 14,
            }}
          />


          <PrimaryButton
            title="+ Add Team Member"

            onPress={
              createUser
            }
          />
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
              Team Members
            </Text>

            <Text
              style={{
                color:
                  COLORS.textMuted,

                fontSize: 12,

                marginTop: 3,
              }}
            >
              {list.length}{' '}
              {list.length ===
              1
                ? 'person'
                : 'people'}
            </Text>
          </View>


          <TouchableOpacity
            onPress={async () => {
              setLoading(
                true
              );

              await load();

              setLoading(
                false
              );
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
          list
        }

        keyExtractor={(
          user
        ) =>
          String(
            user.id
          )
        }

        renderItem={
          renderItem
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

                    fontSize: 21,

                    fontWeight:
                      '900',
                  }}
                >
                  T
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
                No team members found
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
                Try another filter or add a team member.
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

        refreshing={
          loading
        }

        onRefresh={async () => {
          try {
            setLoading(
              true
            );

            await load();
          } finally {
            setLoading(
              false
            );
          }
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