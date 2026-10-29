// frontend/app/screens/ProductsScreen.js

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
  Image,
  ActivityIndicator,
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
   SMALL UI COMPONENTS
========================================================= */

function AppInput({
  style,
  multiline = false,
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

      multiline={
        multiline
      }

      textAlignVertical={
        multiline
          ? 'top'
          : 'center'
      }

      style={[
        {
          minHeight:
            multiline
              ? 100
              : 50,

          borderWidth: 1,

          borderColor:
            COLORS.border,

          backgroundColor:
            COLORS.white,

          borderRadius:
            RADIUS.medium,

          paddingHorizontal: 14,

          paddingVertical:
            multiline
              ? 13
              : 0,

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


function PrimaryButton({
  title,
  onPress,
  disabled = false,
}) {
  return (
    <TouchableOpacity
      activeOpacity={
        0.85
      }

      disabled={
        disabled
      }

      onPress={
        onPress
      }

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


function SecondaryButton({
  title,
  onPress,
  disabled = false,
}) {
  return (
    <TouchableOpacity
      activeOpacity={
        0.8
      }

      disabled={
        disabled
      }

      onPress={
        onPress
      }

      style={{
        minHeight: 46,

        borderRadius:
          RADIUS.medium,

        borderWidth: 1,

        borderColor:
          COLORS.border,

        backgroundColor:
          COLORS.white,

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
            COLORS.royal,

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


function SortButton({
  title,
  active,
  onPress,
}) {
  return (
    <TouchableOpacity
      activeOpacity={
        0.8
      }

      onPress={
        onPress
      }

      style={{
        flex: 1,

        minHeight: 42,

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
          8,
      }}
    >
      <Text
        style={{
          color:
            active
              ? COLORS.royal
              : COLORS.textSecondary,

          fontSize: 12,

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


function SmallActionButton({
  title,
  onPress,
  danger = false,
  active = false,
  disabled = false,
}) {
  return (
    <TouchableOpacity
      activeOpacity={
        0.8
      }

      disabled={
        disabled
      }

      onPress={
        onPress
      }

      style={{
        flex: 1,

        minHeight: 42,

        borderRadius:
          RADIUS.medium,

        borderWidth: 1,

        borderColor:
          danger
            ? COLORS.danger
            : active
            ? COLORS.royal
            : COLORS.border,

        backgroundColor:
          danger
            ? COLORS.dangerSoft
            : active
            ? COLORS.blueSoft
            : COLORS.white,

        alignItems:
          'center',

        justifyContent:
          'center',

        opacity:
          disabled
            ? 0.5
            : 1,

        paddingHorizontal:
          8,
      }}
    >
      <Text
        style={{
          color:
            danger
              ? COLORS.danger
              : COLORS.royal,

          fontSize: 12,

          fontWeight:
            '800',

          textAlign:
            'center',
        }}
      >
        {title}
      </Text>
    </TouchableOpacity>
  );
}


function StatusToggle({
  active,
  onPress,
}) {
  return (
    <TouchableOpacity
      activeOpacity={
        0.8
      }

      onPress={
        onPress
      }

      style={{
        flexDirection:
          'row',

        alignItems:
          'center',

        alignSelf:
          'flex-start',

        borderRadius:
          RADIUS.round,

        paddingHorizontal:
          12,

        paddingVertical:
          8,

        backgroundColor:
          active
            ? COLORS.blueSoft
            : COLORS.surfaceSoft,

        borderWidth: 1,

        borderColor:
          active
            ? COLORS.royal
            : COLORS.border,
      }}
    >
      <View
        style={{
          width: 9,

          height: 9,

          borderRadius:
            10,

          marginRight: 7,

          backgroundColor:
            active
              ? COLORS.royal
              : COLORS.textMuted,
        }}
      />

      <Text
        style={{
          color:
            active
              ? COLORS.royal
              : COLORS.textSecondary,

          fontSize: 12,

          fontWeight:
            '800',
        }}
      >
        {
          active
            ? 'Visible to clients'
            : 'Hidden from clients'
        }
      </Text>
    </TouchableOpacity>
  );
}


/* =========================================================
   HELPERS
========================================================= */

function cleanOptionalText(
  value
) {
  const cleaned =
    String(
      value || ''
    ).trim();

  return cleaned ||
    null;
}


function resolveImageUrl(
  value
) {
  if (!value) {
    return null;
  }

  if (
    value.startsWith(
      'http://'
    ) ||
    value.startsWith(
      'https://'
    )
  ) {
    return value;
  }

  if (
    value.startsWith('/')
  ) {
    return (
      `${API_BASE_URL}${value}`
    );
  }

  return (
    `${API_BASE_URL}/${value}`
  );
}


/* =========================================================
   MAIN SCREEN
========================================================= */

export default function ProductsScreen({
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


  /* =====================================================
     PRODUCT DATA
  ===================================================== */

  const [
    products,
    setProducts,
  ] =
    useState([]);


  const [
    loading,
    setLoading,
  ] =
    useState(true);


  const [
    saving,
    setSaving,
  ] =
    useState(false);


  /* =====================================================
     CREATE PRODUCT FORM
  ===================================================== */

  const [
    name,
    setName,
  ] =
    useState('');


  const [
    price,
    setPrice,
  ] =
    useState('');


  const [
    description,
    setDescription,
  ] =
    useState('');


  const [
    imageUrl,
    setImageUrl,
  ] =
    useState('');


  const [
    active,
    setActive,
  ] =
    useState(true);


  const [
    stockQuantity,
    setStockQuantity,
  ] =
    useState('0');


  const [
    lowStockThreshold,
    setLowStockThreshold,
  ] =
    useState('5');


  const [
    trackInventory,
    setTrackInventory,
  ] =
    useState(true);


  /* =====================================================
     SEARCH / SORT
  ===================================================== */

  const [
    search,
    setSearch,
  ] =
    useState('');


  const [
    sort,
    setSort,
  ] =
    useState('name');


  /* =====================================================
     EDIT PRODUCT STATE
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
    editPrice,
    setEditPrice,
  ] =
    useState('');


  const [
    editDescription,
    setEditDescription,
  ] =
    useState('');


  const [
    editImageUrl,
    setEditImageUrl,
  ] =
    useState('');


  const [
    editActive,
    setEditActive,
  ] =
    useState(true);


  const [
    editStockQuantity,
    setEditStockQuantity,
  ] =
    useState('0');


  const [
    editLowStockThreshold,
    setEditLowStockThreshold,
  ] =
    useState('5');


  const [
    editTrackInventory,
    setEditTrackInventory,
  ] =
    useState(true);


  /* =====================================================
     AUTH HEADERS
  ===================================================== */

  const authHeaders =
    useMemo(
      () => ({
        Authorization:
          `Bearer ${token}`,

        'Content-Type':
          'application/json',
      }),
      [
        token,
      ]
    );


  /* =====================================================
     LOAD PRODUCTS
  ===================================================== */

  const load =
    async () => {
      const response =
        await fetch(
          `${API_BASE_URL}/products/`,
          {
            headers:
              authHeaders,
          }
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


      const list =
        await response.json();


      setProducts(
        Array.isArray(
          list
        )
          ? list
          : []
      );
    };


  useEffect(
    () => {
      let mounted =
        true;

      (
        async () => {
          try {
            await load();
          } catch (
            error
          ) {
            if (
              mounted
            ) {
              Alert.alert(
                'Load failed',
                String(
                  error.message ||
                  error
                )
              );
            }
          } finally {
            if (
              mounted
            ) {
              setLoading(
                false
              );
            }
          }
        }
      )();

      return () => {
        mounted =
          false;
      };
    },
    []
  );


  /* =====================================================
     FILTERING + SORTING
  ===================================================== */

  const filtered =
    useMemo(
      () => {
        let list =
          [
            ...products,
          ];


        const query =
          search
            .trim()
            .toLowerCase();


        if (
          query
        ) {
          list =
            list.filter(
              (
                product
              ) => {
                const haystack =
                  [
                    product.name,
                    product.description,
                  ]
                    .filter(
                      Boolean
                    )
                    .join(' ')
                    .toLowerCase();

                return (
                  haystack.includes(
                    query
                  )
                );
              }
            );
        }


        if (
          sort ===
          'name'
        ) {
          list.sort(
            (
              a,
              b
            ) =>
              (
                a.name ||
                ''
              ).localeCompare(
                b.name ||
                ''
              )
          );
        }


        if (
          sort ===
          'price_asc'
        ) {
          list.sort(
            (
              a,
              b
            ) =>
              Number(
                a.price ||
                0
              ) -
              Number(
                b.price ||
                0
              )
          );
        }


        if (
          sort ===
          'price_desc'
        ) {
          list.sort(
            (
              a,
              b
            ) =>
              Number(
                b.price ||
                0
              ) -
              Number(
                a.price ||
                0
              )
          );
        }


        if (
          sort ===
          'visibility'
        ) {
          list.sort(
            (
              a,
              b
            ) =>
              Number(
                Boolean(
                  b.active
                )
              ) -
              Number(
                Boolean(
                  a.active
                )
              )
          );
        }


        return list;
      },
      [
        products,
        search,
        sort,
      ]
    );


  /* =====================================================
     RESET CREATE FORM
  ===================================================== */

  const clearCreateForm =
    () => {
      setName('');
      setPrice('');
      setDescription('');
      setImageUrl('');
      setActive(true);
      setStockQuantity('0');
      setLowStockThreshold('5');
      setTrackInventory(true);

      Keyboard.dismiss();
    };


  /* =====================================================
     CREATE PRODUCT
  ===================================================== */

  const createProduct =
    async () => {
      if (
        saving
      ) {
        return;
      }


      if (
        !name.trim()
      ) {
        return Alert.alert(
          'Missing name',
          'Please enter a product name.'
        );
      }


      const priceNumber =
        Number(
          price
        );


      if (
        !Number.isFinite(
          priceNumber
        ) ||
        priceNumber < 0
      ) {
        return Alert.alert(
          'Invalid price',
          'Please enter a valid non-negative price.'
        );
      }


      const stockNumber =
        Number(
          stockQuantity
        );


      if (
        !Number.isInteger(
          stockNumber
        ) ||
        stockNumber < 0
      ) {
        return Alert.alert(
          'Invalid stock',
          'Stock quantity must be a whole number of 0 or more.'
        );
      }


      const thresholdNumber =
        Number(
          lowStockThreshold
        );


      if (
        !Number.isInteger(
          thresholdNumber
        ) ||
        thresholdNumber < 0
      ) {
        return Alert.alert(
          'Invalid low-stock level',
          'Low-stock threshold must be a whole number of 0 or more.'
        );
      }


      setSaving(
        true
      );


      try {
        const response =
          await fetch(
            `${API_BASE_URL}/products/`,
            {
              method:
                'POST',

              headers:
                authHeaders,

              body:
                JSON.stringify(
                  {
                    name:
                      name.trim(),

                    price:
                      priceNumber,

                    description:
                      cleanOptionalText(
                        description
                      ),

                    image_url:
                      cleanOptionalText(
                        imageUrl
                      ),

                    active:
                      active,

                    stock_quantity:
                      stockNumber,

                    low_stock_threshold:
                      thresholdNumber,

                    track_inventory:
                      trackInventory,
                  }
                ),
            }
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


        clearCreateForm();

        await load();


        Alert.alert(
          'Product created',
          'The product has been saved.'
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
      } finally {
        setSaving(
          false
        );
      }
    };


  /* =====================================================
     START / CANCEL EDIT
  ===================================================== */

  const startEdit =
    (
      product
    ) => {
      setEditingId(
        product.id
      );

      setEditName(
        product.name ||
        ''
      );

      setEditPrice(
        String(
          product.price ??
          ''
        )
      );

      setEditDescription(
        product.description ||
        ''
      );

      setEditImageUrl(
        product.image_url ||
        ''
      );

      setEditActive(
        product.active !==
        false
      );

      setEditStockQuantity(
        String(
          product.stock_quantity ??
          0
        )
      );

      setEditLowStockThreshold(
        String(
          product.low_stock_threshold ??
          5
        )
      );

      setEditTrackInventory(
        product.track_inventory !==
        false
      );
    };


  const cancelEdit =
    () => {
      setEditingId(
        null
      );

      setEditName('');
      setEditPrice('');
      setEditDescription('');
      setEditImageUrl('');
      setEditActive(true);
      setEditStockQuantity('0');
      setEditLowStockThreshold('5');
      setEditTrackInventory(true);

      Keyboard.dismiss();
    };


  /* =====================================================
     UPDATE PRODUCT
  ===================================================== */

  const updateProduct =
    async (
      id,
      patch,
      {
        reload = true,
      } = {}
    ) => {
      const response =
        await fetch(
          `${API_BASE_URL}/products/${id}`,
          {
            method:
              'PUT',

            headers:
              authHeaders,

            body:
              JSON.stringify(
                patch
              ),
          }
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


      const updated =
        await response.json();


      if (
        reload
      ) {
        await load();
      }


      return updated;
    };


  /* =====================================================
     SAVE FULL EDIT
  ===================================================== */

  const saveEdit =
    async (
      id
    ) => {
      if (
        saving
      ) {
        return;
      }


      if (
        !editName.trim()
      ) {
        return Alert.alert(
          'Missing name',
          'Please enter a product name.'
        );
      }


      const priceNumber =
        Number(
          editPrice
        );


      if (
        !Number.isFinite(
          priceNumber
        ) ||
        priceNumber < 0
      ) {
        return Alert.alert(
          'Invalid price',
          'Please enter a valid non-negative price.'
        );
      }


      const stockNumber =
        Number(
          editStockQuantity
        );


      if (
        !Number.isInteger(
          stockNumber
        ) ||
        stockNumber < 0
      ) {
        return Alert.alert(
          'Invalid stock',
          'Stock quantity must be a whole number of 0 or more.'
        );
      }


      const thresholdNumber =
        Number(
          editLowStockThreshold
        );


      if (
        !Number.isInteger(
          thresholdNumber
        ) ||
        thresholdNumber < 0
      ) {
        return Alert.alert(
          'Invalid low-stock level',
          'Low-stock threshold must be a whole number of 0 or more.'
        );
      }


      setSaving(
        true
      );


      try {
        await updateProduct(
          id,
          {
            name:
              editName.trim(),

            price:
              priceNumber,

            description:
              cleanOptionalText(
                editDescription
              ),

            image_url:
              cleanOptionalText(
                editImageUrl
              ),

            active:
              editActive,

            stock_quantity:
              stockNumber,

            low_stock_threshold:
              thresholdNumber,

            track_inventory:
              editTrackInventory,
          }
        );


        cancelEdit();


        Alert.alert(
          'Product updated',
          'Your changes were saved.'
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
      } finally {
        setSaving(
          false
        );
      }
    };


  /* =====================================================
     QUICK VISIBILITY TOGGLE
  ===================================================== */

  const toggleProductVisibility =
    async (
      product
    ) => {
      if (
        saving
      ) {
        return;
      }


      const nextActive =
        product.active ===
        false;


      setSaving(
        true
      );


      try {
        await updateProduct(
          product.id,
          {
            active:
              nextActive,
          }
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
      } finally {
        setSaving(
          false
        );
      }
    };


  /* =====================================================
     DELETE PRODUCT
  ===================================================== */

  const deleteProduct =
    async (
      id
    ) => {
      if (
        saving
      ) {
        return;
      }


      setSaving(
        true
      );


      try {
        const response =
          await fetch(
            `${API_BASE_URL}/products/${id}`,
            {
              method:
                'DELETE',

              headers: {
                Authorization:
                  `Bearer ${token}`,
              },
            }
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


        if (
          editingId ===
          id
        ) {
          cancelEdit();
        }


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
      } finally {
        setSaving(
          false
        );
      }
    };


  /* =====================================================
     PRODUCT CARD
  ===================================================== */

  const renderProduct =
    ({
      item,
    }) => {
      const displayPrice =
        Number(
          item.price ||
          0
        );


      const initial =
        (
          item.name?.[0] ||
          'P'
        ).toUpperCase();


      const image =
        resolveImageUrl(
          item.image_url
        );


      const isEditing =
        editingId ===
        item.id;


      const inventoryTracked =
        item.track_inventory !==
        false;


      const currentStock =
        Number(
          item.stock_quantity ??
          0
        );


      const lowThreshold =
        Number(
          item.low_stock_threshold ??
          5
        );


      const isOutOfStock =
        inventoryTracked &&
        currentStock <= 0;


      const isLowStock =
        inventoryTracked &&
        currentStock > 0 &&
        currentStock <=
        lowThreshold;


      const inventoryStatus =
        !inventoryTracked
          ? 'Not tracked'
          : isOutOfStock
          ? 'Out of Stock'
          : isLowStock
          ? 'Low Stock'
          : 'In Stock';


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
            {/* =================================================
                DISPLAY MODE
            ================================================= */}
  
            {!isEditing ? (
              <>
                <View
                  style={{
                    flexDirection:
                      isPhone
                        ? 'column'
                        : 'row',
  
                    gap:
                      isPhone
                        ? 14
                        : 16,
  
                    alignItems:
                      isPhone
                        ? 'stretch'
                        : 'center',
                  }}
                >
                  {/* IMAGE */}
  
                  {image ? (
                    <Image
                      source={{
                        uri:
                          image,
                      }}
  
                      resizeMode="cover"
  
                      style={{
                        width:
                          isPhone
                            ? '100%'
                            : 110,
  
                        height:
                          isPhone
                            ? 190
                            : 110,
  
                        borderRadius:
                          RADIUS.medium,
  
                        backgroundColor:
                          COLORS.blueSoft,
                      }}
                    />
                  ) : (
                    <View
                      style={{
                        width:
                          isPhone
                            ? '100%'
                            : 110,
  
                        height:
                          isPhone
                            ? 150
                            : 110,
  
                        borderRadius:
                          RADIUS.medium,
  
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
  
                          fontSize:
                            28,
  
                          fontWeight:
                            '900',
                        }}
                      >
                        {initial}
                      </Text>
  
                      <Text
                        style={{
                          color:
                            COLORS.textMuted,
  
                          fontSize:
                            10,
  
                          marginTop:
                            5,
                        }}
                      >
                        No image
                      </Text>
                    </View>
                  )}
  
  
                  {/* PRODUCT INFO */}
  
                  <View
                    style={{
                      flex: 1,
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
  
                        gap: 10,
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
  
                            fontSize:
                              18,
  
                            fontWeight:
                              '900',
                          }}
                        >
                          {item.name}
                        </Text>
  
                        <Text
                          style={{
                            color:
                              COLORS.royal,
  
                            fontSize:
                              20,
  
                            fontWeight:
                              '900',
  
                            marginTop:
                              4,
                          }}
                        >
                          ${displayPrice.toFixed(
                            2
                          )}
                        </Text>
                      </View>
  
  
                      <StatusToggle
                        active={
                          item.active !==
                          false
                        }
  
                        onPress={() =>
                          toggleProductVisibility(
                            item
                          )
                        }
                      />
                    </View>
  
  
                    <Text
                      style={{
                        color:
                          COLORS.textSecondary,
  
                        fontSize:
                          13,
  
                        lineHeight:
                          20,
  
                        marginTop:
                          12,
                      }}
                    >
                      {
                        item.description ||
                        'No product description yet.'
                      }
                    </Text>
  
  
                    <View
                      style={{
                        marginTop: 14,

                        padding: 12,

                        borderRadius:
                          RADIUS.medium,

                        borderWidth: 1,

                        borderColor:
                          isOutOfStock
                            ? COLORS.danger
                            : isLowStock
                            ? '#D99A00'
                            : COLORS.border,

                        backgroundColor:
                          isOutOfStock
                            ? COLORS.dangerSoft
                            : isLowStock
                            ? '#FFF8E6'
                            : COLORS.surfaceSoft,
                      }}
                    >
                      <View
                        style={{
                          flexDirection:
                            'row',

                          alignItems:
                            'center',

                          justifyContent:
                            'space-between',

                          gap: 10,
                        }}
                      >
                        <Text
                          style={{
                            color:
                              COLORS.text,

                            fontSize: 13,

                            fontWeight:
                              '800',
                          }}
                        >
                          Inventory
                        </Text>

                        <Text
                          style={{
                            color:
                              isOutOfStock
                                ? COLORS.danger
                                : isLowStock
                                ? '#A66A00'
                                : COLORS.royal,

                            fontSize: 12,

                            fontWeight:
                              '900',
                          }}
                        >
                          {inventoryStatus}
                        </Text>
                      </View>

                      <Text
                        style={{
                          color:
                            COLORS.textSecondary,

                          fontSize: 12,

                          marginTop: 6,
                        }}
                      >
                        {
                          inventoryTracked
                            ? `${currentStock} unit${
                                currentStock === 1
                                  ? ''
                                  : 's'
                              } available`
                            : 'Inventory tracking is disabled'
                        }
                      </Text>

                      {inventoryTracked && (
                        <Text
                          style={{
                            color:
                              COLORS.textMuted,

                            fontSize: 11,

                            marginTop: 4,
                          }}
                        >
                          Low-stock warning at {
                            lowThreshold
                          } unit{
                            lowThreshold === 1
                              ? ''
                              : 's'
                          }.
                        </Text>
                      )}
                    </View>


                    {!!item.image_url && (
                      <Text
                        numberOfLines={
                          1
                        }
  
                        style={{
                          color:
                            COLORS.textMuted,
  
                          fontSize:
                            10,
  
                          marginTop:
                            10,
                        }}
                      >
                        Image: {
                          item.image_url
                        }
                      </Text>
                    )}
                  </View>
                </View>
  
  
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
                  <SmallActionButton
                    title="Edit"
  
                    disabled={
                      saving
                    }
  
                    onPress={() =>
                      startEdit(
                        item
                      )
                    }
                  />
  
  
                  <SmallActionButton
                    title={
                      item.active !==
                      false
                        ? 'Hide'
                        : 'Show'
                    }
  
                    disabled={
                      saving
                    }
  
                    active={
                      item.active !==
                      false
                    }
  
                    onPress={() =>
                      toggleProductVisibility(
                        item
                      )
                    }
                  />
  
  
                  <SmallActionButton
                    title="Delete"
  
                    danger
  
                    disabled={
                      saving
                    }
  
                    onPress={() =>
                      Alert.alert(
                        'Delete product?',
                        `Remove ${item.name}?`,
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
                                deleteProduct(
                                  item.id
                                ),
                          },
                        ]
                      )
                    }
                  />
                </View>
              </>
            ) : (
              <>
                {/* =================================================
                    EDIT MODE
                ================================================= */}
  
                <Text
                  style={{
                    color:
                      COLORS.royalDark,
  
                    fontSize:
                      18,
  
                    fontWeight:
                      '900',
  
                    marginBottom:
                      16,
                  }}
                >
                  Edit Product
                </Text>
  
  
                <FieldLabel>
                  Product name
                </FieldLabel>
  
                <AppInput
                  value={
                    editName
                  }
  
                  onChangeText={
                    setEditName
                  }
  
                  placeholder="Product name"
  
                  style={{
                    marginBottom:
                      12,
                  }}
                />
  
  
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
                    marginBottom:
                      12,
                  }}
                />
  
  
                <FieldLabel>
                  Description
                </FieldLabel>
  
                <AppInput
                  value={
                    editDescription
                  }
  
                  onChangeText={
                    setEditDescription
                  }
  
                  placeholder="Describe the product..."
  
                  multiline
  
                  style={{
                    marginBottom:
                      12,
                  }}
                />
  
  
                <FieldLabel>
                  Image URL
                </FieldLabel>
  
                <AppInput
                  value={
                    editImageUrl
                  }
  
                  onChangeText={
                    setEditImageUrl
                  }
  
                  placeholder="https://..."
  
                  autoCapitalize="none"
  
                  autoCorrect={
                    false
                  }
  
                  style={{
                    marginBottom:
                      12,
                  }}
                />
  
  
                {!!editImageUrl.trim() && (
                  <View
                    style={{
                      marginBottom:
                        14,
                    }}
                  >
                    <Text
                      style={{
                        color:
                          COLORS.textMuted,
  
                        fontSize:
                          11,
  
                        marginBottom:
                          7,
                      }}
                    >
                      Image preview
                    </Text>
  
                    <Image
                      source={{
                        uri:
                          resolveImageUrl(
                            editImageUrl.trim()
                          ),
                      }}
  
                      resizeMode="cover"
  
                      style={{
                        width:
                          '100%',
  
                        height:
                          isPhone
                            ? 190
                            : 220,
  
                        borderRadius:
                          RADIUS.medium,
  
                        backgroundColor:
                          COLORS.blueSoft,
                      }}
                    />
                  </View>
                )}
  
  
                <FieldLabel>
                  Stock quantity
                </FieldLabel>

                <AppInput
                  value={
                    editStockQuantity
                  }

                  onChangeText={
                    setEditStockQuantity
                  }

                  keyboardType="number-pad"

                  placeholder="0"

                  style={{
                    marginBottom:
                      12,
                  }}
                />


                <FieldLabel>
                  Low-stock warning
                </FieldLabel>

                <AppInput
                  value={
                    editLowStockThreshold
                  }

                  onChangeText={
                    setEditLowStockThreshold
                  }

                  keyboardType="number-pad"

                  placeholder="5"

                  style={{
                    marginBottom:
                      12,
                  }}
                />


                <FieldLabel>
                  Inventory tracking
                </FieldLabel>

                <TouchableOpacity
                  activeOpacity={
                    0.8
                  }

                  onPress={() =>
                    setEditTrackInventory(
                      (
                        value
                      ) =>
                        !value
                    )
                  }

                  style={{
                    minHeight: 46,

                    borderWidth: 1,

                    borderColor:
                      editTrackInventory
                        ? COLORS.royal
                        : COLORS.border,

                    backgroundColor:
                      editTrackInventory
                        ? COLORS.blueSoft
                        : COLORS.surfaceSoft,

                    borderRadius:
                      RADIUS.medium,

                    alignItems:
                      'center',

                    justifyContent:
                      'center',

                    marginBottom:
                      16,
                  }}
                >
                  <Text
                    style={{
                      color:
                        editTrackInventory
                          ? COLORS.royal
                          : COLORS.textSecondary,

                      fontSize: 13,

                      fontWeight:
                        '800',
                    }}
                  >
                    {
                      editTrackInventory
                        ? '✓ Track Inventory'
                        : 'Inventory Tracking Off'
                    }
                  </Text>
                </TouchableOpacity>


                <FieldLabel>
                  Client visibility
                </FieldLabel>
  
                <View
                  style={{
                    marginBottom:
                      16,
                  }}
                >
                  <StatusToggle
                    active={
                      editActive
                    }
  
                    onPress={() =>
                      setEditActive(
                        (
                          value
                        ) =>
                          !value
                      )
                    }
                  />
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
                  <View
                    style={{
                      flex: 1,
                    }}
                  >
                    <PrimaryButton
                      title={
                        saving
                          ? 'Saving...'
                          : 'Save Changes'
                      }
  
                      disabled={
                        saving
                      }
  
                      onPress={() =>
                        saveEdit(
                          item.id
                        )
                      }
                    />
                  </View>
  
  
                  <View
                    style={{
                      flex: 1,
                    }}
                  >
                    <SecondaryButton
                      title="Cancel"
  
                      disabled={
                        saving
                      }
  
                      onPress={
                        cancelEdit
                      }
                    />
                  </View>
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
              Products
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
              Manage the salon product catalog, stock levels, low-stock alerts, and product availability.
            </Text>
          </View>
  
  
          {/* =================================================
              CREATE + SEARCH
          ================================================= */}
  
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
                'flex-start',
            }}
          >
  
            {/* CREATE PRODUCT */}
  
            <View
              style={{
                width:
                  isDesktop
                    ? 430
                    : '100%',
  
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
  
                  fontSize:
                    17,
  
                  fontWeight:
                    '800',
  
                  marginBottom:
                    14,
                }}
              >
                Add Product
              </Text>
  
  
              <FieldLabel>
                Product name
              </FieldLabel>
  
              <AppInput
                value={
                  name
                }
  
                onChangeText={
                  setName
                }
  
                placeholder="Shampoo"
  
                returnKeyType="next"
  
                style={{
                  marginBottom:
                    12,
                }}
              />
  
  
              <FieldLabel>
                Price ($)
              </FieldLabel>
  
              <AppInput
                value={
                  price
                }
  
                onChangeText={
                  setPrice
                }
  
                keyboardType="decimal-pad"
  
                placeholder="12.00"
  
                style={{
                  marginBottom:
                    12,
                }}
              />
  
  
              <FieldLabel>
                Description
              </FieldLabel>
  
              <AppInput
                value={
                  description
                }
  
                onChangeText={
                  setDescription
                }
  
                placeholder="Describe what the product is and what it is used for..."
  
                multiline
  
                style={{
                  marginBottom:
                    12,
                }}
              />
  
  
              <FieldLabel>
                Image URL
              </FieldLabel>
  
              <AppInput
                value={
                  imageUrl
                }
  
                onChangeText={
                  setImageUrl
                }
  
                placeholder="https://..."
  
                autoCapitalize="none"
  
                autoCorrect={
                  false
                }
  
                style={{
                  marginBottom:
                    12,
                }}
              />
  
  
              {!!imageUrl.trim() && (
                <View
                  style={{
                    marginBottom:
                      14,
                  }}
                >
                  <Text
                    style={{
                      color:
                        COLORS.textMuted,
  
                      fontSize:
                        11,
  
                      marginBottom:
                        7,
                    }}
                  >
                    Image preview
                  </Text>
  
                  <Image
                    source={{
                      uri:
                        resolveImageUrl(
                          imageUrl.trim()
                        ),
                    }}
  
                    resizeMode="cover"
  
                    style={{
                      width:
                        '100%',
  
                      height:
                        200,
  
                      borderRadius:
                        RADIUS.medium,
  
                      backgroundColor:
                        COLORS.blueSoft,
                    }}
                  />
                </View>
              )}
  
  
              <FieldLabel>
                Starting stock
              </FieldLabel>

              <AppInput
                value={
                  stockQuantity
                }

                onChangeText={
                  setStockQuantity
                }

                keyboardType="number-pad"

                placeholder="0"

                style={{
                  marginBottom:
                    12,
                }}
              />


              <FieldLabel>
                Low-stock warning
              </FieldLabel>

              <AppInput
                value={
                  lowStockThreshold
                }

                onChangeText={
                  setLowStockThreshold
                }

                keyboardType="number-pad"

                placeholder="5"

                style={{
                  marginBottom:
                    12,
                }}
              />


              <FieldLabel>
                Inventory tracking
              </FieldLabel>

              <TouchableOpacity
                activeOpacity={
                  0.8
                }

                onPress={() =>
                  setTrackInventory(
                    (
                      value
                    ) =>
                      !value
                  )
                }

                style={{
                  minHeight: 46,

                  borderWidth: 1,

                  borderColor:
                    trackInventory
                      ? COLORS.royal
                      : COLORS.border,

                  backgroundColor:
                    trackInventory
                      ? COLORS.blueSoft
                      : COLORS.surfaceSoft,

                  borderRadius:
                    RADIUS.medium,

                  alignItems:
                    'center',

                  justifyContent:
                    'center',

                  marginBottom:
                    16,
                }}
              >
                <Text
                  style={{
                    color:
                      trackInventory
                        ? COLORS.royal
                        : COLORS.textSecondary,

                    fontSize: 13,

                    fontWeight:
                      '800',
                  }}
                >
                  {
                    trackInventory
                      ? '✓ Track Inventory'
                      : 'Inventory Tracking Off'
                  }
                </Text>
              </TouchableOpacity>


              <FieldLabel>
                Client visibility
              </FieldLabel>
  
              <View
                style={{
                  marginBottom:
                    16,
                }}
              >
                <StatusToggle
                  active={
                    active
                  }
  
                  onPress={() =>
                    setActive(
                      (
                        value
                      ) =>
                        !value
                    )
                  }
                />
              </View>
  
  
              <PrimaryButton
                title={
                  saving
                    ? 'Saving...'
                    : '+ Create Product'
                }
  
                disabled={
                  saving
                }
  
                onPress={
                  createProduct
                }
              />
            </View>
  
  
            {/* SEARCH / SORT */}
  
            <View
              style={{
                flex:
                  isDesktop
                    ? 1
                    : undefined,
  
                width:
                  isDesktop
                    ? undefined
                    : '100%',
  
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
  
                  fontSize:
                    17,
  
                  fontWeight:
                    '800',
  
                  marginBottom:
                    14,
                }}
              >
                Find Products
              </Text>
  
  
              <FieldLabel>
                Search
              </FieldLabel>
  
              <AppInput
                value={
                  search
                }
  
                onChangeText={
                  setSearch
                }
  
                placeholder="Search by product or description..."
  
                returnKeyType="search"
  
                onSubmitEditing={
                  Keyboard.dismiss
                }
              />
  
  
              <Text
                style={{
                  color:
                    COLORS.textMuted,
  
                  fontSize:
                    11,
  
                  marginTop:
                    14,
  
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
                <SortButton
                  title="Name"
  
                  active={
                    sort ===
                    'name'
                  }
  
                  onPress={() =>
                    setSort(
                      'name'
                    )
                  }
                />
  
  
                <SortButton
                  title="Price ↑"
  
                  active={
                    sort ===
                    'price_asc'
                  }
  
                  onPress={() =>
                    setSort(
                      'price_asc'
                    )
                  }
                />
  
  
                <SortButton
                  title="Price ↓"
  
                  active={
                    sort ===
                    'price_desc'
                  }
  
                  onPress={() =>
                    setSort(
                      'price_desc'
                    )
                  }
                />
  
  
                <SortButton
                  title="Visible"
  
                  active={
                    sort ===
                    'visibility'
                  }
  
                  onPress={() =>
                    setSort(
                      'visibility'
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
                    16,
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
                  {filtered.length}{' '}
                  {
                    filtered.length ===
                    1
                      ? 'product'
                      : 'products'
                  }
                </Text>
  
  
                <TouchableOpacity
                  activeOpacity={
                    0.8
                  }
  
                  onPress={
                    async () => {
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
                    }
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
                22,
  
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
              Product List
            </Text>
  
  
            {loading && (
              <ActivityIndicator
                size="small"
  
                color={
                  COLORS.royal
                }
              />
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
            filtered
          }
  
          keyExtractor={(
            item
          ) =>
            String(
              item.id
            )
          }
  
          renderItem={
            renderProduct
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
  
                  borderWidth:
                    1,
  
                  borderColor:
                    COLORS.border,
  
                  padding:
                    30,
  
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
  
                    alignItems:
                      'center',
  
                    justifyContent:
                      'center',
  
                    backgroundColor:
                      COLORS.blueSoft,
  
                    marginBottom:
                      12,
                  }}
                >
                  <Text
                    style={{
                      color:
                        COLORS.royal,
  
                      fontSize:
                        21,
  
                      fontWeight:
                        '900',
                    }}
                  >
                    P
                  </Text>
                </View>
  
  
                <Text
                  style={{
                    color:
                      COLORS.text,
  
                    fontSize:
                      16,
  
                    fontWeight:
                      '800',
                  }}
                >
                  No products found
                </Text>
  
  
                <Text
                  style={{
                    color:
                      COLORS.textMuted,
  
                    textAlign:
                      'center',
  
                    fontSize:
                      12,
  
                    marginTop:
                      5,
                  }}
                >
                  Create a product or try another search.
                </Text>
              </View>
            ) : null
          }
  
          contentContainerStyle={{
            width:
              '100%',
  
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
  
          refreshing={
            loading
          }
  
          onRefresh={
            async () => {
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
            }
          }
  
          keyboardDismissMode="on-drag"
  
          keyboardShouldPersistTaps="handled"
  
          showsVerticalScrollIndicator={
            false
          }
        />
      </View>
    );
  }