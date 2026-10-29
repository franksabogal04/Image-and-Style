// frontend/app/screens/ClientHomeScreen.js

import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  TextInput,
  ActivityIndicator,
  Alert,
  Modal,
  useWindowDimensions,
  Linking,
} from 'react-native';

import {
  SafeAreaView,
} from 'react-native-safe-area-context';

import {
  StatusBar,
} from 'expo-status-bar';

import {
  Calendar,
} from 'react-native-calendars';

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
   SERVICE CATEGORIES
========================================================= */

const SERVICE_CATEGORIES = [
  {
    slug: 'hair',
    title: 'Hair',
    description:
      'Cuts, styling, color, treatments, and professional hair care.',
    icon: '✦',
  },
  {
    slug: 'nails',
    title: 'Nails',
    description:
      'Manicures, pedicures, acrylics, gel, and custom nail designs.',
    icon: '◇',
  },
  {
    slug: 'eyelashes',
    title: 'Lashes',
    description:
      'Beautiful lash services designed around your preferred look.',
    icon: '✧',
  },
  {
    slug: 'eyebrows',
    title: 'Brows',
    description:
      'Brow shaping and beauty services for a polished finish.',
    icon: '⌁',
  },
  {
    slug: 'skincare',
    title: 'Skincare',
    description:
      'Personalized skincare services focused on healthy, glowing skin.',
    icon: '○',
  },
  {
    slug: 'products',
    title: 'Products',
    description:
      'Shop professional salon products selected for beautiful, healthy hair and skin.',
    icon: '◈',
    isProductCatalog: true,
  },
];


const SERVICE_IMAGES = {
  hair:
    'https://images.unsplash.com/photo-1562322140-8baeececf3df?auto=format&fit=crop&w=1000&q=85',
  nails:
    'https://images.unsplash.com/photo-1604654894610-df63bc536371?auto=format&fit=crop&w=1000&q=85',
  eyelashes:
    'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&w=1000&q=85',
  eyebrows:
    'https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&w=1000&q=85',
  skincare:
    'https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?auto=format&fit=crop&w=1000&q=85',
};


/* =========================================================
   OUR WORK

   These are placeholders for now.
   Later we can replace these with real salon photos.
========================================================= */

const WORK_IMAGES = [
  {
    id: 'hair-1',
    image:
      'https://images.unsplash.com/photo-1562322140-8baeececf3df?auto=format&fit=crop&w=1200&q=85',
  },
  {
    id: 'nails-1',
    image:
      'https://images.unsplash.com/photo-1604654894610-df63bc536371?auto=format&fit=crop&w=1200&q=85',
  },
  {
    id: 'skin-1',
    image:
      'https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?auto=format&fit=crop&w=1200&q=85',
  },
  {
    id: 'hair-2',
    image:
      'https://images.unsplash.com/photo-1522337660859-02fbefca4702?auto=format&fit=crop&w=1200&q=85',
  },
  {
    id: 'beauty-1',
    image:
      'https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&w=1200&q=85',
  },
];




const GALLERY_IMAGES = [
  ...WORK_IMAGES,
  {
    id: 'hair-3',
    image:
      'https://images.unsplash.com/photo-1521590832167-7bcbfaa6381f?auto=format&fit=crop&w=1200&q=85',
  },
  {
    id: 'nails-2',
    image:
      'https://images.unsplash.com/photo-1632345031435-8727f6897d53?auto=format&fit=crop&w=1200&q=85',
  },
  {
    id: 'lashes-2',
    image:
      'https://images.unsplash.com/photo-1515377905703-c4788e51af15?auto=format&fit=crop&w=1200&q=85',
  },
  {
    id: 'skin-2',
    image:
      'https://images.unsplash.com/photo-1616394584738-fc6e612e71b9?auto=format&fit=crop&w=1200&q=85',
  },
  {
    id: 'salon-2',
    image:
      'https://images.unsplash.com/photo-1600948836101-f9ffda59d250?auto=format&fit=crop&w=1200&q=85',
  },
];


/* =========================================================
   PORTFOLIO TESTIMONIALS

   Replace these placeholders with real client reviews.
========================================================= */

const TESTIMONIALS = [
  {
    id: 'review-1',
    quote:
      'Add a real Image & Style client review here.',
    label:
      'CLIENT REVIEW PLACEHOLDER',
  },
  {
    id: 'review-2',
    quote:
      'Add another client experience here when ready.',
    label:
      'CLIENT REVIEW PLACEHOLDER',
  },
  {
    id: 'review-3',
    quote:
      'Use this space for a review about the salon team.',
    label:
      'CLIENT REVIEW PLACEHOLDER',
  },
];


/* =========================================================
   HELPERS
========================================================= */

const pad = (number) =>
  String(number).padStart(2, '0');


function localToday() {
  const date =
    new Date();

  return (
    `${date.getFullYear()}-` +
    `${pad(date.getMonth() + 1)}-` +
    `${pad(date.getDate())}`
  );
}


function formatMoney(value) {
  return `$${Number(value || 0).toFixed(2)}`;
}


function formatTime12(value) {
  if (!value) {
    return '';
  }

  const [
    hourString,
    minuteString,
  ] =
    value.split(':');

  const hour =
    Number(hourString);

  const minute =
    Number(minuteString);

  const suffix =
    hour >= 12
      ? 'PM'
      : 'AM';

  const displayHour =
    hour % 12 || 12;

  return (
    `${displayHour}:` +
    `${pad(minute)} ` +
    suffix
  );
}


function formatDateLong(dateString) {
  if (!dateString) {
    return '';
  }

  const [
    year,
    month,
    day,
  ] =
    dateString
      .split('-')
      .map(Number);

  const date =
    new Date(
      year,
      month - 1,
      day
    );

  return date.toLocaleDateString(
    'en-US',
    {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    }
  );
}


function resolveAvatar(value) {
  if (!value) {
    return null;
  }

  if (
    value.startsWith('http://') ||
    value.startsWith('https://')
  ) {
    return value;
  }

  if (value.startsWith('/')) {
    return `${API_BASE_URL}${value}`;
  }

  return `${API_BASE_URL}/${value}`;
}


async function fetchJson(
  url,
  options
) {
  const response =
    await fetch(
      url,
      options
    );

  if (!response.ok) {
    let message =
      'Something went wrong.';

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

    throw new Error(message);
  }

  return response.json();
}


/* =========================================================
   SMALL COMPONENTS
========================================================= */

function SectionTitle({
  eyebrow,
  title,
  description,
  light = false,
}) {
  return (
    <View
      style={{
        alignItems: 'center',
        marginBottom: 30,
      }}
    >
      {!!eyebrow && (
        <Text
          style={{
            color:
              light
                ? 'rgba(255,255,255,0.65)'
                : COLORS.royalBright,

            fontSize: 12,
            fontWeight: '900',
            letterSpacing: 2,
            textTransform: 'uppercase',
            marginBottom: 9,
          }}
        >
          {eyebrow}
        </Text>
      )}

      <Text
        style={{
          color:
            light
              ? COLORS.white
              : COLORS.royalDark,

          fontSize: 30,
          lineHeight: 36,
          fontWeight: '900',
          textAlign: 'center',
        }}
      >
        {title}
      </Text>

      {!!description && (
        <Text
          style={{
            color:
              light
                ? 'rgba(255,255,255,0.72)'
                : COLORS.textSecondary,

            fontSize: 15,
            lineHeight: 23,
            textAlign: 'center',
            maxWidth: 650,
            marginTop: 10,
          }}
        >
          {description}
        </Text>
      )}
    </View>
  );
}


function FormInput({
  label,
  style,
  ...props
}) {
  return (
    <View
      style={[
        {
          marginBottom: 14,
        },
        style,
      ]}
    >
      <Text
        style={{
          color: COLORS.text,
          fontSize: 12,
          fontWeight: '800',
          marginBottom: 7,
        }}
      >
        {label}
      </Text>

      <TextInput
        placeholderTextColor={
          COLORS.textMuted
        }

        selectionColor={
          COLORS.royal
        }

        style={{
          minHeight: 52,
          borderWidth: 1,
          borderColor: COLORS.border,
          borderRadius: RADIUS.medium,
          backgroundColor: COLORS.white,
          paddingHorizontal: 14,
          color: COLORS.text,
          fontSize: 14,
        }}

        {...props}
      />
    </View>
  );
}


/* =========================================================
   MAIN SCREEN
========================================================= */

export default function ClientHomeScreen({
  onStaffLogin,
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

  const pageScrollRef =
    useRef(null);

  const [
    servicesSectionY,
    setServicesSectionY,
  ] =
    useState(0);


  const servicesSectionYRef =
    useRef(0);

  const [
    showFullGallery,
    setShowFullGallery,
  ] =
    useState(false);

  const [
    workSectionY,
    setWorkSectionY,
  ] =
    useState(0);

  const [
    aboutSectionY,
    setAboutSectionY,
  ] =
    useState(0);

  const [
    testimonialsSectionY,
    setTestimonialsSectionY,
  ] =
    useState(0);

  const [
    testimonialIndex,
    setTestimonialIndex,
  ] =
    useState(0);

  const today =
    localToday();


  /* =====================================================
     BOOKING STATE
  ===================================================== */

  const [
    selectedCategory,
    setSelectedCategory,
  ] =
    useState(null);

  const [
    staff,
    setStaff,
  ] =
    useState([]);

  const [
    services,
    setServices,
  ] =
    useState([]);

  const [
    products,
    setProducts,
  ] =
    useState([]);

  const [
    selectedStaff,
    setSelectedStaff,
  ] =
    useState(null);

  const [
    selectedService,
    setSelectedService,
  ] =
    useState(null);

  const [
    selectedDate,
    setSelectedDate,
  ] =
    useState(today);

  const [
    selectedTime,
    setSelectedTime,
  ] =
    useState(null);

  const [
    availableTimes,
    setAvailableTimes,
  ] =
    useState([]);

  const [
    loadingCategory,
    setLoadingCategory,
  ] =
    useState(false);

  const [
    loadingProducts,
    setLoadingProducts,
  ] =
    useState(false);

  const [
    loadingAvailability,
    setLoadingAvailability,
  ] =
    useState(false);

  const [
    booking,
    setBooking,
  ] =
    useState(false);


  const [
    bookingSelections,
    setBookingSelections,
  ] = useState([]);

  const [
    pendingSelection,
    setPendingSelection,
  ] = useState(null);

  const [
    showAddServicePrompt,
    setShowAddServicePrompt,
  ] = useState(false);


  /* =====================================================
     CONFIRMATION
  ===================================================== */

  const [
    bookingConfirmed,
    setBookingConfirmed,
  ] =
    useState(false);

  const [
    confirmationDetails,
    setConfirmationDetails,
  ] =
    useState(null);


  const [
    processingDepositReturn,
    setProcessingDepositReturn,
  ] =
    useState(() => {
      if (
        typeof window === 'undefined' ||
        !window.location?.href
      ) {
        return false;
      }

      try {
        const url =
          new URL(
            window.location.href
          );

        return (
          url.searchParams.get(
            'deposit_payment'
          ) === 'success'
        );
      } catch {
        return false;
      }
    });


  /* =====================================================
     CUSTOMER INFORMATION
  ===================================================== */

  const [
    firstName,
    setFirstName,
  ] =
    useState('');

  const [
    lastName,
    setLastName,
  ] =
    useState('');

  const [
    phone,
    setPhone,
  ] =
    useState('');

  const [
    email,
    setEmail,
  ] =
    useState('');

  const [
    notes,
    setNotes,
  ] =
    useState('');


  /* =====================================================
     CATEGORY INFO
  ===================================================== */

  const categoryInfo =
    useMemo(
      () =>
        SERVICE_CATEGORIES.find(
          (item) =>
            item.slug ===
            selectedCategory
        ) || null,
      [
        selectedCategory,
      ]
    );


  /* =====================================================
     SCROLL
  ===================================================== */

  const scrollToServices =
    () => {
      pageScrollRef.current?.scrollTo({
        y:
          Math.max(
            servicesSectionY - 10,
            0
          ),

        animated: true,
      });
    };


  /* =====================================================
     RESET BOOKING
  ===================================================== */

  const resetBooking =
    ({
      keepCategory = false,
    } = {}) => {
      setBookingConfirmed(false);
      setConfirmationDetails(null);

      setBookingSelections([]);
      setPendingSelection(null);
      setShowAddServicePrompt(false);

      setSelectedStaff(null);
      setSelectedService(null);
      setSelectedDate(today);
      setSelectedTime(null);
      setAvailableTimes([]);

      setFirstName('');
      setLastName('');
      setPhone('');
      setEmail('');
      setNotes('');

      if (!keepCategory) {
        setSelectedCategory(null);
        setStaff([]);
        setServices([]);
      }
    };


  const bookAnotherAppointment =
    () => {
      resetBooking({
        keepCategory: false,
      });

      setTimeout(
        () => {
          scrollToServices();
        },
        100
      );
    };


  /* =====================================================
     OPEN CATEGORY
  ===================================================== */

  const openCategory =
    async (
      category
    ) => {
      setBookingConfirmed(false);
      setConfirmationDetails(null);

      setSelectedCategory(
        category.slug
      );

      setSelectedStaff(null);
      setSelectedService(null);
      setSelectedDate(today);
      setSelectedTime(null);
      setAvailableTimes([]);

      setProducts([]);

      if (
        category.slug ===
        'products'
      ) {
        setLoadingProducts(
          true
        );

        try {
          const productData =
            await fetchJson(
              `${API_BASE_URL}/public/products`
            );

          setProducts(
            Array.isArray(
              productData
            )
              ? productData
              : []
          );
        } catch (error) {
          setProducts([]);

          Alert.alert(
            'Unable to load products',
            String(
              error.message ||
              error
            )
          );
        } finally {
          setLoadingProducts(
            false
          );
        }

        return;
      }


      setLoadingCategory(
        true
      );

      try {
        const encoded =
          encodeURIComponent(
            category.slug
          );

        const [
          staffData,
          serviceData,
        ] =
          await Promise.all([
            fetchJson(
              `${API_BASE_URL}/public/staff?category=${encoded}`
            ),

            fetchJson(
              `${API_BASE_URL}/public/services?category=${encoded}`
            ),
          ]);

        setStaff(
          Array.isArray(
            staffData
          )
            ? staffData
            : []
        );

        setServices(
          Array.isArray(
            serviceData
          )
            ? serviceData
            : []
        );
      } catch (error) {
        setStaff([]);
        setServices([]);

        Alert.alert(
          'Unable to load',
          String(
            error.message ||
            error
          )
        );
      } finally {
        setLoadingCategory(
          false
        );
      }
    };


  /* =====================================================
     BACK TO ALL SERVICES
  ===================================================== */

  const closeCategory =
    () => {
      resetBooking({
        keepCategory: false,
      });
    };


  /* =====================================================
     SELECT PROFESSIONAL
  ===================================================== */

  const chooseStaff =
    (
      member
    ) => {
      setBookingConfirmed(false);
      setConfirmationDetails(null);

      setSelectedStaff(
        member
      );

      setSelectedService(null);
      setSelectedDate(today);
      setSelectedTime(null);
      setAvailableTimes([]);
    };


  /* =====================================================
     SELECT SERVICE
  ===================================================== */

  const chooseService =
    (
      service
    ) => {
      setBookingConfirmed(false);
      setConfirmationDetails(null);

      setSelectedService(
        service
      );

      setSelectedDate(today);
      setSelectedTime(null);
      setAvailableTimes([]);
    };


  /* =====================================================
     STRIPE DEPOSIT RETURN
  ===================================================== */

  useEffect(() => {
    let cancelled = false;


    const sleep =
      (ms) =>
        new Promise(
          (resolve) =>
            setTimeout(
              resolve,
              ms
            )
        );


    const handleDepositReturn =
      async () => {
        try {
          let returnUrl = null;


          /*
           * Website return from Stripe.
           */
          if (
            typeof window !== 'undefined' &&
            window.location?.href
          ) {
            returnUrl =
              window.location.href;
          }


          /*
           * Native/deep-link fallback.
           */
          if (!returnUrl) {
            returnUrl =
              await Linking.getInitialURL();
          }


          if (!returnUrl) {
            return;
          }


          const url =
            new URL(
              returnUrl
            );


          const depositResult =
            url.searchParams.get(
              'deposit_payment'
            );


          if (!depositResult) {
            return;
          }


          const appointmentId =
            url.searchParams.get(
              'appointment_id'
            );

          const bookingGroupId =
            url.searchParams.get(
              'booking_group_id'
            );

          const bookingToken =
            url.searchParams.get(
              'booking_token'
            );


          if (
            depositResult ===
            'cancelled'
          ) {
            if (!cancelled) {
              Alert.alert(
                'Deposit not completed',
                'Your appointment has not been confirmed. Please choose your appointment again.'
              );
            }

            return;
          }


          if (
            depositResult !==
            'success'
          ) {
            return;
          }


          if (
            (
              !appointmentId &&
              !bookingGroupId
            ) ||
            !bookingToken
          ) {
            throw new Error(
              'Missing booking confirmation information.'
            );
          }


          if (!cancelled) {
            setBooking(true);
          }


          let bookingData = null;


          /*
           * Stripe may redirect the customer a fraction
           * of a second before our webhook finishes.
           *
           * Check a few times before deciding the booking
           * is still pending.
           */
          for (
            let attempt = 0;
            attempt < 8;
            attempt += 1
          ) {
            const params =
              new URLSearchParams();

            params.set(
              'booking_token',
              bookingToken
            );


            if (bookingGroupId) {
              params.set(
                'booking_group_id',
                bookingGroupId
              );

              bookingData =
                await fetchJson(
                  `${API_BASE_URL}/public/booking-group-status?${params.toString()}`
                );

            } else {
              params.set(
                'appointment_id',
                appointmentId
              );

              bookingData =
                await fetchJson(
                  `${API_BASE_URL}/public/booking-status?${params.toString()}`
                );
            }


            if (
              bookingData
                ?.booking_status ===
              'confirmed'
            ) {
              break;
            }


            await sleep(500);
          }


          if (cancelled) {
            return;
          }


          if (
            bookingData
              ?.booking_status !==
            'confirmed'
          ) {
            throw new Error(
              'Your payment was received, but the booking confirmation is still processing. Please refresh in a moment.'
            );
          }


          if (bookingGroupId) {
            const groupedAppointments =
              Array.isArray(
                bookingData
                  ?.appointments
              )
                ? bookingData.appointments
                : [];


            if (
              groupedAppointments.length
              === 0
            ) {
              throw new Error(
                'Grouped appointment details were not returned.'
              );
            }


            const firstGrouped =
              groupedAppointments[0];

            const latestEnd =
              groupedAppointments
                .map(
                  (item) =>
                    item.end_time
                )
                .filter(Boolean)
                .sort()
                .slice(-1)[0];


            bookingData = {
              appointment_id:
                bookingGroupId,

              client_name:
                bookingData
                  ?.client_name,

              staff_name:
                groupedAppointments
                  .map(
                    (item) =>
                      item.staff_name
                  )
                  .filter(Boolean)
                  .join(', '),

              service_name:
                groupedAppointments
                  .map(
                    (item) =>
                      item.service_name
                  )
                  .filter(Boolean)
                  .join(' + '),

              start_time:
                firstGrouped
                  .start_time,

              end_time:
                latestEnd,

              service_price:
                bookingData
                  ?.total_service_amount,

              deposit_amount:
                bookingData
                  ?.deposit_amount,

              paid_total:
                bookingData
                  ?.deposit_amount,

              remaining_balance:
                Math.max(
                  0,
                  Number(
                    bookingData
                      ?.total_service_amount
                    || 0
                  ) -
                  Number(
                    bookingData
                      ?.deposit_amount
                    || 0
                  )
                ),
            };
          }


          const start =
            bookingData?.start_time
              ? new Date(
                  bookingData.start_time
                )
              : null;

          const end =
            bookingData?.end_time
              ? new Date(
                  bookingData.end_time
                )
              : null;


          const date =
            bookingData?.start_time
              ? bookingData
                  .start_time
                  .slice(
                    0,
                    10
                  )
              : '';


          const time =
            bookingData?.start_time
              ? bookingData
                  .start_time
                  .slice(
                    11,
                    16
                  )
              : '';


          let duration = 0;


          if (
            start &&
            end &&
            !Number.isNaN(
              start.getTime()
            ) &&
            !Number.isNaN(
              end.getTime()
            )
          ) {
            duration =
              Math.max(
                0,
                Math.round(
                  (
                    end.getTime() -
                    start.getTime()
                  ) /
                  60000
                )
              );
          }


          setConfirmationDetails({
            appointmentId:
              bookingData
                ?.appointment_id,

            customerName:
              bookingData
                ?.client_name,

            staffName:
              bookingData
                ?.staff_name,

            serviceName:
              bookingData
                ?.service_name,

            date,

            time,

            duration,

            price:
              bookingData
                ?.service_price,

            depositAmount:
              bookingData
                ?.deposit_amount,

            paidTotal:
              bookingData
                ?.paid_total,

            remainingBalance:
              bookingData
                ?.remaining_balance,

            bookingToken,
          });


          setBookingConfirmed(
            true
          );


          /*
           * Remove Stripe query parameters so refreshing
           * the page does not process the payment again.
           */
          if (
            typeof window !==
              'undefined' &&
            window.history
              ?.replaceState
          ) {
            window.history.replaceState(
              {},
              '',
              window.location.pathname
            );
          }


          const scrollToConfirmation =
            () => {
              const targetY =
                servicesSectionYRef.current;

              if (
                !targetY ||
                targetY <= 0
              ) {
                setTimeout(
                  scrollToConfirmation,
                  100
                );

                return;
              }


              pageScrollRef
                .current
                ?.scrollTo({
                  y: Math.max(
                    targetY - 10,
                    0
                  ),
                  animated: false,
                });


              setTimeout(() => {
                if (!cancelled) {
                  setProcessingDepositReturn(
                    false
                  );
                }
              }, 150);
            };


          setTimeout(
            scrollToConfirmation,
            100
          );


        } catch (error) {
          if (!cancelled) {
            setProcessingDepositReturn(
              false
            );

            Alert.alert(
              'Booking confirmation',
              String(
                error?.message ||
                error
              )
            );
          }

        } finally {
          if (!cancelled) {
            setBooking(false);
          }
        }
      };


    handleDepositReturn();


    return () => {
      cancelled = true;
    };
  }, []);


  const isFuturePublicSlot =
    (
      dateValue,
      timeValue
    ) => {
      if (
        !dateValue ||
        !timeValue
      ) {
        return false;
      }

      const dateParts =
        String(
          dateValue
        )
          .split('-')
          .map(Number);

      const timeParts =
        String(
          timeValue
        )
          .split(':')
          .map(Number);

      if (
        dateParts.length !== 3 ||
        timeParts.length !== 2 ||
        dateParts.some(
          (value) =>
            !Number.isFinite(
              value
            )
        ) ||
        timeParts.some(
          (value) =>
            !Number.isFinite(
              value
            )
        )
      ) {
        return false;
      }

      const [
        year,
        month,
        day,
      ] =
        dateParts;

      const [
        hour,
        minute,
      ] =
        timeParts;

      const slot =
        new Date(
          year,
          month - 1,
          day,
          hour,
          minute,
          0,
          0
        );

      return (
        slot.getTime() >
        Date.now()
      );
    };


  /* =====================================================
     LOAD REAL AVAILABILITY
  ===================================================== */

  useEffect(
    () => {
      let cancelled =
        false;

      const load =
        async () => {
          if (
            bookingConfirmed ||
            !selectedStaff?.id ||
            !selectedService?.id ||
            !selectedDate
          ) {
            return;
          }

          setLoadingAvailability(true);
          setSelectedTime(null);

          try {
            const url =
              `${API_BASE_URL}` +
              `/public/availability` +
              `?staff_id=${encodeURIComponent(
                selectedStaff.id
              )}` +
              `&date=${encodeURIComponent(
                selectedDate
              )}` +
              `&service_id=${encodeURIComponent(
                selectedService.id
              )}`;

            const data =
              await fetchJson(url);

            if (!cancelled) {
              setAvailableTimes(
                Array.isArray(
                  data?.available
                )
                  ? data.available.filter(
                      (
                        time
                      ) =>
                        isFuturePublicSlot(
                          selectedDate,
                          time
                        )
                    )
                  : []
              );
            }
          } catch (error) {
            if (!cancelled) {
              setAvailableTimes([]);

              Alert.alert(
                'Availability error',
                String(
                  error.message ||
                  error
                )
              );
            }
          } finally {
            if (!cancelled) {
              setLoadingAvailability(
                false
              );
            }
          }
        };

      load();

      return () => {
        cancelled =
          true;
      };
    },
    [
      selectedStaff?.id,
      selectedService?.id,
      selectedDate,
      bookingConfirmed,
    ]
  );


  /*
   * Keep the time picker current if the page remains
   * open while a displayed appointment time passes.
   */

  useEffect(
    () => {
      if (
        !selectedDate
      ) {
        return undefined;
      }

      const removeExpiredTimes =
        () => {
          setAvailableTimes(
            (
              current
            ) =>
              current.filter(
                (
                  time
                ) =>
                  isFuturePublicSlot(
                    selectedDate,
                    time
                  )
              )
          );

          setSelectedTime(
            (
              current
            ) =>
              current &&
              isFuturePublicSlot(
                selectedDate,
                current
              )
                ? current
                : null
          );
        };

      removeExpiredTimes();

      const timer =
        setInterval(
          removeExpiredTimes,
          30000
        );

      return () =>
        clearInterval(
          timer
        );
    },
    [
      selectedDate,
    ]
  );


  /* =====================================================
     MULTI-SERVICE BOOKING
  ===================================================== */

  const verifyAvailability =
    async (
      selection
    ) => {
      if (
        !isFuturePublicSlot(
          selection.date,
          selection.time
        )
      ) {
        return false;
      }

      const url =
        `${API_BASE_URL}/public/availability` +
        `?staff_id=${encodeURIComponent(selection.staff.id)}` +
        `&date=${encodeURIComponent(selection.date)}` +
        `&service_id=${encodeURIComponent(selection.service.id)}` +
        `&_=${Date.now()}`;

      const result =
        await fetchJson(
          url
        );

      return (
        Array.isArray(
          result?.available
        ) &&
        result.available.includes(
          selection.time
        )
      );
    };


  const submitBooking =
    async () => {
      if (
        !selectedStaff ||
        !selectedService ||
        !selectedDate ||
        !selectedTime
      ) {
        return Alert.alert(
          'Choose your appointment',
          'Select your professional, service, date and time.'
        );
      }

      if (
        !firstName.trim() ||
        !lastName.trim()
      ) {
        return Alert.alert(
          'Your information',
          'Enter your first and last name.'
        );
      }

      if (
        !phone.trim() &&
        !email.trim()
      ) {
        return Alert.alert(
          'Contact information',
          'Enter a phone number or email address.'
        );
      }

      if (
        bookingSelections.some(
          (item) =>
            item.staff.id ===
            selectedStaff.id
        )
      ) {
        return Alert.alert(
          'Choose another professional',
          'The same professional cannot perform two services at the same time.'
        );
      }

      if (
        bookingSelections.length > 0 &&
        (
          selectedDate !==
            bookingSelections[0].date ||
          selectedTime !==
            bookingSelections[0].time
        )
      ) {
        return Alert.alert(
          'Same time required',
          'Every added service must start at the same date and time.'
        );
      }

      const selection = {
        staff:
          selectedStaff,

        service:
          selectedService,

        date:
          selectedDate,

        time:
          selectedTime,
      };

      try {
        setBooking(true);

        if (
          !await verifyAvailability(
            selection
          )
        ) {
          setSelectedTime(null);

          return Alert.alert(
            'Time unavailable',
            'That professional is no longer available at this time.'
          );
        }

        setPendingSelection(
          selection
        );

        setShowAddServicePrompt(
          true
        );

      } catch (error) {
        Alert.alert(
          'Availability error',
          String(
            error.message ||
            error
          )
        );

      } finally {
        setBooking(false);
      }
    };


  const addAnotherService =
    () => {
      if (!pendingSelection) {
        return;
      }

      const next = [
        ...bookingSelections,
        pendingSelection,
      ];

      setBookingSelections(
        next
      );

      setPendingSelection(null);
      setShowAddServicePrompt(false);

      setSelectedCategory(null);
      setStaff([]);
      setServices([]);
      setSelectedStaff(null);
      setSelectedService(null);

      setSelectedDate(
        next[0].date
      );

      setSelectedTime(null);
      setAvailableTimes([]);

      setTimeout(
        scrollToServices,
        100
      );
    };


  const finalizeBooking =
    async (
      selections
    ) => {
      if (
        booking ||
        selections.length === 0
      ) {
        return;
      }

      try {
        setBooking(true);

        let result;
        let checkout;

        if (selections.length === 1) {
          const item =
            selections[0];

          const params =
            new URLSearchParams({
              staff_id:
                String(item.staff.id),

              date:
                item.date,

              time:
                item.time,

              service_id:
                String(item.service.id),

              client_first_name:
                firstName.trim(),

              client_last_name:
                lastName.trim(),
            });

          if (phone.trim()) {
            params.set(
              'client_phone',
              phone.trim()
            );
          }

          if (email.trim()) {
            params.set(
              'client_email',
              email.trim().toLowerCase()
            );
          }

          if (notes.trim()) {
            params.set(
              'notes',
              notes.trim()
            );
          }

          result =
            await fetchJson(
              `${API_BASE_URL}/public/appointments?${params}`,
              {
                method:
                  'POST',
              }
            );

          const deposit =
            new URLSearchParams({
              appointment_id:
                String(
                  result.appointment_id
                ),

              booking_token:
                String(
                  result.booking_token
                ),
            });

          checkout =
            await fetchJson(
              `${API_BASE_URL}/payments/public-deposit-checkout?${deposit}`,
              {
                method:
                  'POST',
              }
            );

        } else {
          const payload = {
            client_first_name:
              firstName.trim(),

            client_last_name:
              lastName.trim(),

            client_phone:
              phone.trim() ||
              null,

            client_email:
              email.trim().toLowerCase() ||
              null,

            notes:
              notes.trim() ||
              null,

            appointments:
              selections.map(
                (item) => ({
                  staff_id:
                    item.staff.id,

                  service_id:
                    item.service.id,

                  date:
                    item.date,

                  time:
                    item.time,

                  notes:
                    notes.trim() ||
                    null,
                })
              ),
          };

          result =
            await fetchJson(
              `${API_BASE_URL}/public/appointments/group`,
              {
                method:
                  'POST',

                headers: {
                  'Content-Type':
                    'application/json',
                },

                body:
                  JSON.stringify(
                    payload
                  ),
              }
            );

          const deposit =
            new URLSearchParams({
              booking_group_id:
                String(
                  result.booking_group_id
                ),

              booking_token:
                String(
                  result.booking_token
                ),
            });

          checkout =
            await fetchJson(
              `${API_BASE_URL}/payments/public-group-deposit-checkout?${deposit}`,
              {
                method:
                  'POST',
              }
            );
        }

        if (!checkout?.url) {
          throw new Error(
            'Stripe checkout URL was not returned.'
          );
        }

        if (
          typeof window !==
          'undefined'
        ) {
          window.location.assign(
            checkout.url
          );

          return;
        }

        await Linking.openURL(
          checkout.url
        );

      } catch (error) {
        Alert.alert(
          'Booking failed',
          String(
            error.message ||
            error
          )
        );

      } finally {
        setBooking(false);
      }
    };


  const continueToDeposit =
    async () => {
      if (!pendingSelection) {
        return;
      }

      const selections = [
        ...bookingSelections,
        pendingSelection,
      ];

      setShowAddServicePrompt(
        false
      );

      await finalizeBooking(
        selections
      );
    };


  /* =====================================================
     FOOTER ACTIONS
  ===================================================== */

  const openPhone =
    () => {
      Linking.openURL(
        'tel:+13050000000'
      );
    };


  const openInstagram =
    () => {
      Linking.openURL(
        'https://www.instagram.com/'
      );
    };


  /* =====================================================
     RENDER
  ===================================================== */

  return (
    <SafeAreaView
      edges={[
        'top',
      ]}

      style={{
        flex: 1,
        backgroundColor:
          COLORS.white,
      }}
    >
      <StatusBar
        style="dark"
      />


      <Modal
        visible={
          showAddServicePrompt
        }

        transparent

        animationType="fade"

        onRequestClose={() =>
          setShowAddServicePrompt(
            false
          )
        }
      >
        <View
          style={{
            flex: 1,
            backgroundColor:
              'rgba(6,14,35,0.65)',
            alignItems:
              'center',
            justifyContent:
              'center',
            padding:
              22,
          }}
        >
          <View
            style={{
              width:
                '100%',
              maxWidth:
                520,
              backgroundColor:
                COLORS.white,
              borderRadius:
                26,
              padding:
                isPhone
                  ? 22
                  : 30,
              ...SHADOWS.card,
            }}
          >
            <Text
              style={{
                color:
                  COLORS.royalBright,
                fontSize:
                  11,
                fontWeight:
                  '900',
                letterSpacing:
                  1.5,
              }}
            >
              SERVICE SELECTED
            </Text>

            <Text
              style={{
                color:
                  COLORS.royalDark,
                fontSize:
                  isPhone
                    ? 25
                    : 30,
                lineHeight:
                  isPhone
                    ? 31
                    : 37,
                fontWeight:
                  '900',
                marginTop:
                  8,
              }}
            >
              Would you like to add another service?
            </Text>

            {!!pendingSelection && (
              <View
                style={{
                  backgroundColor:
                    COLORS.blueVerySoft,
                  borderRadius:
                    RADIUS.large,
                  padding:
                    16,
                  marginTop:
                    18,
                }}
              >
                <Text
                  style={{
                    color:
                      COLORS.royalDark,
                    fontSize:
                      17,
                    fontWeight:
                      '900',
                  }}
                >
                  {
                    pendingSelection
                      .service.name
                  }
                </Text>

                <Text
                  style={{
                    color:
                      COLORS.textSecondary,
                    fontSize:
                      13,
                    lineHeight:
                      20,
                    marginTop:
                      5,
                  }}
                >
                  With {
                    pendingSelection
                      .staff.name
                  }
                  {'\n'}

                  {
                    formatDateLong(
                      pendingSelection
                        .date
                    )
                  }

                  {' at '}

                  {
                    formatTime12(
                      pendingSelection
                        .time
                    )
                  }
                  {'\n'}

                  {
                    formatMoney(
                      pendingSelection
                        .service.price
                    )
                  }

                  {' • 25% deposit '}

                  {
                    formatMoney(
                      Number(
                        pendingSelection
                          .service.price
                        || 0
                      ) * 0.25
                    )
                  }
                </Text>
              </View>
            )}

            {bookingSelections.length > 0 && (
              <Text
                style={{
                  color:
                    COLORS.textMuted,
                  fontSize:
                    12,
                  marginTop:
                    12,
                }}
              >
                {
                  bookingSelections.length
                } additional service{
                  bookingSelections.length
                  === 1
                    ? ''
                    : 's'
                } already selected.
              </Text>
            )}

            <View
              style={{
                flexDirection:
                  isPhone
                    ? 'column'
                    : 'row',
                gap:
                  10,
                marginTop:
                  22,
              }}
            >
              <TouchableOpacity
                activeOpacity={
                  0.85
                }

                onPress={
                  addAnotherService
                }

                style={{
                  flex: 1,
                  minHeight:
                    52,
                  borderRadius:
                    RADIUS.medium,
                  borderWidth:
                    1,
                  borderColor:
                    COLORS.royal,
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
                      COLORS.royal,
                    fontSize:
                      13,
                    fontWeight:
                      '900',
                  }}
                >
                  Yes, Add Another Service
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={
                  0.85
                }

                disabled={
                  booking
                }

                onPress={
                  continueToDeposit
                }

                style={{
                  flex: 1,
                  minHeight:
                    52,
                  borderRadius:
                    RADIUS.medium,
                  backgroundColor:
                    COLORS.royal,
                  alignItems:
                    'center',
                  justifyContent:
                    'center',
                  opacity:
                    booking
                      ? 0.65
                      : 1,
                }}
              >
                {booking ? (
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
                      fontSize:
                        13,
                      fontWeight:
                        '900',
                    }}
                  >
                    No, Continue to Deposit
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>


      {processingDepositReturn && (
        <View
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,

            zIndex: 9999,

            backgroundColor:
              COLORS.white,

            alignItems:
              'center',

            justifyContent:
              'center',

            paddingHorizontal:
              24,
          }}
        >
          <ActivityIndicator
            size="large"
            color={
              COLORS.royal
            }
          />

          <Text
            style={{
              color:
                COLORS.royalDark,

              fontSize: 24,

              fontWeight:
                '900',

              textAlign:
                'center',

              marginTop: 24,
            }}
          >
            Confirming your appointment...
          </Text>

          <Text
            style={{
              color:
                COLORS.textSecondary,

              fontSize: 14,

              lineHeight: 22,

              textAlign:
                'center',

              marginTop: 10,

              maxWidth: 420,
            }}
          >
            Your deposit was received. We're finishing your booking now.
          </Text>
        </View>
      )}


      <ScrollView
        ref={
          pageScrollRef
        }

        showsVerticalScrollIndicator={
          false
        }

        keyboardShouldPersistTaps="handled"

        contentContainerStyle={{
          backgroundColor:
            COLORS.white,
        }}
      >

        {/* =================================================
            NAVBAR
        ================================================= */}

        {/* REFERENCE LAYOUT V3 / WHITE V4 / CLIENT NAVIGATION V5 */}

        <View style={{
          backgroundColor: COLORS.white,
          borderBottomWidth: 1,
          borderBottomColor: '#e6dfd6',
          paddingHorizontal: isPhone ? 18 : 34,
          paddingVertical: 15,
        }}>
          <View style={{
            width: '100%',
            maxWidth: 1240,
            alignSelf: 'center',
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => pageScrollRef.current?.scrollTo({ y: 0, animated: true })}
              style={{ flexDirection: 'row', alignItems: 'center' }}
            >
              <Image
                source={BRAND_LOGO}
                resizeMode="cover"
                style={{ width: 43, height: 43, borderRadius: 22, marginRight: 10 }}
              />
              <Text style={{
                color: '#111111',
                fontFamily: 'Georgia',
                fontSize: isPhone ? 18 : 24,
                fontWeight: '700',
              }}>
                Image & Style
              </Text>
            </TouchableOpacity>

            <View style={{ flexDirection: 'row', alignItems: 'center', gap: isPhone ? 14 : 28 }}>
              {!isPhone && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 28 }}>
                  {[
                    ['Services', scrollToServices],
                    ['Our Work', () => pageScrollRef.current?.scrollTo({
                      y: Math.max(workSectionY - 24, 0), animated: true,
                    })],
                    ['Testimonials', () => pageScrollRef.current?.scrollTo({
                      y: Math.max(testimonialsSectionY - 24, 0), animated: true,
                    })],
                    ['About', () => pageScrollRef.current?.scrollTo({
                      y: Math.max(aboutSectionY - 24, 0), animated: true,
                    })],
                    ['Contact', () => pageScrollRef.current?.scrollToEnd({ animated: true })],
                  ].map(([label, action]) => (
                    <TouchableOpacity key={label} onPress={action} activeOpacity={0.7}>
                      <Text style={{ color: '#24211e', fontSize: 12, fontWeight: '800' }}>
                        {label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              <TouchableOpacity
                activeOpacity={0.8}
                onPress={onStaffLogin}
                style={{
                  borderWidth: 1,
                  borderColor: '#d9d3cc',
                  borderRadius: 7,
                  minHeight: 40,
                  paddingHorizontal: isPhone ? 12 : 16,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text style={{ color: '#24211e', fontSize: 11, fontWeight: '900' }}>
                  Staff Login
                </Text>
              </TouchableOpacity>
            </View>

          </View>
        </View>


        {/* =================================================
            HERO
        ================================================= */}

        {/* FULL PHOTO HERO V4 */}

        <View style={{
          minHeight: isPhone ? 620 : 650,
          position: 'relative',
          overflow: 'hidden',
          justifyContent: 'center',
          paddingHorizontal: isPhone ? 20 : 48,
          paddingVertical: isPhone ? 54 : 72,
        }}>
          <Image
            source={{ uri: WORK_IMAGES[4].image }}
            resizeMode="cover"
            style={{
              position: 'absolute',
              top: 0,
              right: 0,
              bottom: 0,
              left: 0,
              width: '100%',
              height: '100%',
            }}
          />

          <View style={{
            position: 'absolute',
            top: 0,
            right: 0,
            bottom: 0,
            left: 0,
            backgroundColor: 'rgba(8, 12, 19, 0.58)',
          }} />

          <View style={{
            width: '100%',
            maxWidth: 1120,
            alignSelf: 'center',
            alignItems: isPhone ? 'center' : 'flex-start',
          }}>
            <Text style={{
              color: COLORS.white,
              fontFamily: 'Georgia',
              fontSize: isPhone ? 49 : isTablet ? 68 : 82,
              lineHeight: isPhone ? 53 : isTablet ? 73 : 87,
              fontWeight: '700',
              letterSpacing: -1.8,
              maxWidth: 690,
              textAlign: isPhone ? 'center' : 'left',
            }}>
              Beauty made{`\n`}personal.
            </Text>

            <Text style={{
              color: 'rgba(255,255,255,0.86)',
              fontSize: isPhone ? 14 : 17,
              lineHeight: 26,
              maxWidth: 560,
              marginTop: 18,
              textAlign: isPhone ? 'center' : 'left',
            }}>
              Expert artistry. Premium products. A personalized salon experience that’s all about you.
            </Text>

            <View style={{
              width: '100%',
              maxWidth: 850,
              flexDirection: isPhone ? 'column' : 'row',
              marginTop: 38,
              borderWidth: 1,
              borderColor: 'rgba(255,255,255,0.36)',
              borderRadius: 12,
              overflow: 'hidden',
              backgroundColor: 'rgba(8,12,19,0.40)',
            }}>
              {[
                ['1', 'Choose', 'Select the service that fits your beauty goals.'],
                ['2', 'Book', 'Choose your professional, date, and time.'],
                ['3', 'Enjoy', 'Complete your deposit and enjoy your visit.'],
              ].map(([number, title, detail], index) => (
                <View key={number} style={{
                  flex: 1,
                  paddingHorizontal: 22,
                  paddingVertical: 22,
                  borderRightWidth: !isPhone && index < 2 ? 1 : 0,
                  borderBottomWidth: isPhone && index < 2 ? 1 : 0,
                  borderColor: 'rgba(255,255,255,0.25)',
                }}>
                  <Text style={{
                    color: '#8bb5ff',
                    fontSize: 10,
                    fontWeight: '900',
                    letterSpacing: 1.2,
                  }}>
                    0{number}
                  </Text>
                  <Text style={{
                    color: COLORS.white,
                    fontFamily: 'Georgia',
                    fontSize: 21,
                    fontWeight: '700',
                    marginTop: 7,
                  }}>
                    {title}
                  </Text>
                  <Text style={{
                    color: 'rgba(255,255,255,0.72)',
                    fontSize: 10,
                    lineHeight: 16,
                    marginTop: 6,
                  }}>
                    {detail}
                  </Text>
                </View>
              ))}
            </View>

            <TouchableOpacity
              activeOpacity={0.85}
              onPress={scrollToServices}
              style={{
                minHeight: 52,
                backgroundColor: COLORS.royal,
                borderRadius: 7,
                paddingHorizontal: 30,
                alignItems: 'center',
                justifyContent: 'center',
                marginTop: 24,
                alignSelf: isPhone ? 'stretch' : 'flex-start',
              }}
            >
              <Text style={{
                color: COLORS.white,
                fontSize: 13,
                fontWeight: '900',
              }}>
                Book Appointment
              </Text>
            </TouchableOpacity>
          </View>
        </View>


        {/* =================================================
            SERVICES / BOOKING
        ================================================= */}

        <View
          onLayout={
            (
              event
            ) => {
              const nextY =
                event
                  .nativeEvent
                  .layout
                  .y;

              setServicesSectionY(
                nextY
              );

              servicesSectionYRef.current =
                nextY;
            }
          }

          style={{
            paddingHorizontal:
              isPhone
                ? 20
                : 40,

            paddingVertical:
              isPhone
                ? 60
                : 90,

            backgroundColor:
              COLORS.white,
          }}
        >
          <View
            style={{
              width: '100%',
              maxWidth: 1200,
              alignSelf: 'center',
            }}
          >

            {/* =============================================
                CONFIRMATION SCREEN
            ============================================= */}

            {bookingConfirmed &&
            confirmationDetails ? (
              <View
                style={{
                  maxWidth: 720,
                  width: '100%',
                  alignSelf: 'center',
                }}
              >
                <View
                  style={{
                    backgroundColor:
                      COLORS.white,

                    borderWidth: 1,

                    borderColor:
                      COLORS.border,

                    borderRadius:
                      isPhone
                        ? 26
                        : 34,

                    padding:
                      isPhone
                        ? 24
                        : 42,

                    alignItems:
                      'center',

                    ...SHADOWS.card,
                  }}
                >
                  {/* CHECK */}

                  <View
                    style={{
                      width: 78,
                      height: 78,

                      borderRadius:
                        39,

                      backgroundColor:
                        COLORS.successSoft,

                      alignItems:
                        'center',

                      justifyContent:
                        'center',
                    }}
                  >
                    <Text
                      style={{
                        color:
                          COLORS.success,

                        fontSize: 38,

                        fontWeight:
                          '900',
                      }}
                    >
                      ✓
                    </Text>
                  </View>


                  <Text
                    style={{
                      color:
                        COLORS.royalBright,

                      fontSize: 11,

                      fontWeight:
                        '900',

                      letterSpacing:
                        1.8,

                      marginTop: 24,
                    }}
                  >
                    THANK YOU
                  </Text>


                  <Text
                    style={{
                      color:
                        COLORS.royalDark,

                      fontSize:
                        isPhone
                          ? 28
                          : 34,

                      lineHeight:
                        isPhone
                          ? 34
                          : 41,

                      fontWeight:
                        '900',

                      textAlign:
                        'center',

                      marginTop: 8,
                    }}
                  >
                    Your appointment has been confirmed.
                  </Text>


                  <Text
                    style={{
                      color:
                        COLORS.textSecondary,

                      fontSize: 14,

                      lineHeight: 22,

                      textAlign:
                        'center',

                      marginTop: 12,

                      maxWidth: 500,
                    }}
                  >
                    We look forward to seeing you at Image & Style.
                  </Text>


                  {/* APPOINTMENT SUMMARY */}

                  <View
                    style={{
                      width: '100%',

                      backgroundColor:
                        COLORS.blueVerySoft,

                      borderRadius:
                        RADIUS.large,

                      padding:
                        isPhone
                          ? 18
                          : 24,

                      marginTop: 28,
                    }}
                  >
                    <Text
                      style={{
                        color:
                          COLORS.textMuted,

                        fontSize: 10,

                        fontWeight:
                          '900',

                        letterSpacing:
                          1.3,
                      }}
                    >
                      APPOINTMENT DETAILS
                    </Text>
                    <Text
                      style={{
                        color:
                          COLORS.royalDark,

                        fontSize: 22,

                        fontWeight:
                          '900',

                        marginTop: 10,
                      }}
                    >
                      {
                        confirmationDetails
                          .serviceName
                      }
                    </Text>


                    <View
                      style={{
                        marginTop: 18,
                        gap: 12,
                      }}
                    >
                      <View>
                        <Text
                          style={{
                            color:
                              COLORS.textMuted,

                            fontSize: 10,

                            fontWeight:
                              '800',
                          }}
                        >
                          PROFESSIONAL
                        </Text>

                        <Text
                          style={{
                            color:
                              COLORS.text,

                            fontSize: 14,

                            fontWeight:
                              '800',

                            marginTop: 3,
                          }}
                        >
                          {
                            confirmationDetails
                              .staffName
                          }
                        </Text>
                      </View>


                      <View>
                        <Text
                          style={{
                            color:
                              COLORS.textMuted,

                            fontSize: 10,

                            fontWeight:
                              '800',
                          }}
                        >
                          DATE
                        </Text>

                        <Text
                          style={{
                            color:
                              COLORS.text,

                            fontSize: 14,

                            fontWeight:
                              '800',

                            marginTop: 3,
                          }}
                        >
                          {
                            formatDateLong(
                              confirmationDetails
                                .date
                            )
                          }
                        </Text>
                      </View>


                      <View>
                        <Text
                          style={{
                            color:
                              COLORS.textMuted,

                            fontSize: 10,

                            fontWeight:
                              '800',
                          }}
                        >
                          TIME
                        </Text>

                        <Text
                          style={{
                            color:
                              COLORS.text,

                            fontSize: 14,

                            fontWeight:
                              '800',

                            marginTop: 3,
                          }}
                        >
                          {
                            formatTime12(
                              confirmationDetails
                                .time
                            )
                          }
                        </Text>
                      </View>


                      <View
                        style={{
                          flexDirection:
                            'row',

                          justifyContent:
                            'space-between',

                          gap: 20,
                        }}
                      >
                        <View>
                          <Text
                            style={{
                              color:
                                COLORS.textMuted,

                              fontSize: 10,

                              fontWeight:
                                '800',
                            }}
                          >
                            DURATION
                          </Text>

                          <Text
                            style={{
                              color:
                                COLORS.text,

                              fontSize: 14,

                              fontWeight:
                                '800',

                              marginTop: 3,
                            }}
                          >
                            {
                              confirmationDetails
                                .duration
                            } minutes
                          </Text>
                        </View>


                        <View
                          style={{
                            alignItems:
                              'flex-end',
                          }}
                        >
                          <Text
                            style={{
                              color:
                                COLORS.textMuted,

                              fontSize: 10,

                              fontWeight:
                                '800',
                            }}
                          >
                            PRICE
                          </Text>

                          <Text
                            style={{
                              color:
                                COLORS.royal,

                              fontSize: 17,

                              fontWeight:
                                '900',

                              marginTop: 3,
                            }}
                          >
                            {
                              formatMoney(
                                confirmationDetails
                                  .price
                              )
                            }
                          </Text>
                        </View>
                      </View>
                    </View>
                  </View>


                  {/* CONFIRMATION BUTTONS */}

                  <View
                    style={{
                      width: '100%',

                      flexDirection:
                        isPhone
                          ? 'column'
                          : 'row',

                      gap: 10,

                      marginTop: 22,
                    }}
                  >
                    <TouchableOpacity
                      activeOpacity={
                        0.85
                      }

                      onPress={
                        bookAnotherAppointment
                      }

                      style={{
                        flex: 1,

                        minHeight: 54,

                        backgroundColor:
                          COLORS.royal,

                        borderRadius:
                          RADIUS.round,

                        alignItems:
                          'center',

                        justifyContent:
                          'center',

                        paddingHorizontal:
                          18,
                      }}
                    >
                      <Text
                        style={{
                          color:
                            COLORS.white,

                          fontSize: 13,

                          fontWeight:
                            '900',
                        }}
                      >
                        Book Another Appointment
                      </Text>
                    </TouchableOpacity>


                    <TouchableOpacity
                      activeOpacity={
                        0.8
                      }

                      onPress={() => {
                        resetBooking({
                          keepCategory:
                            false,
                        });

                        setTimeout(
                          scrollToServices,
                          100
                        );
                      }}

                      style={{
                        flex: 1,

                        minHeight: 54,

                        backgroundColor:
                          COLORS.white,

                        borderWidth: 1,

                        borderColor:
                          COLORS.borderStrong,

                        borderRadius:
                          RADIUS.round,

                        alignItems:
                          'center',

                        justifyContent:
                          'center',

                        paddingHorizontal:
                          18,
                      }}
                    >
                      <Text
                        style={{
                          color:
                            COLORS.royal,

                          fontSize: 13,

                          fontWeight:
                            '900',
                        }}
                      >
                        Back to Services
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            ) : (
              <>

                {/* =========================================
                    NORMAL SERVICE SELECTION
                ========================================= */}

                <SectionTitle
                  eyebrow={
                    categoryInfo
                      ? 'Book Your Visit'
                      : 'Our Services'
                  }

                  title={
                    categoryInfo
                      ? categoryInfo.title
                      : 'Explore our services'
                  }

                  description={
                    categoryInfo
                      ? categoryInfo.description
                      : 'Choose the service category that fits your beauty goals.'
                  }
                />


                {/* ALL CATEGORIES */}

                {!selectedCategory && (
                  <>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 13 }}>
                      {SERVICE_CATEGORIES
                        .filter((service) => !service.isProductCatalog)
                        .map((service) => (
                          <TouchableOpacity
                            key={service.slug}
                            activeOpacity={0.85}
                            onPress={() => openCategory(service)}
                            style={{
                              width: isPhone ? '100%' : isTablet ? '48%' : '18.8%',
                              backgroundColor: COLORS.white,
                              borderWidth: 1,
                              borderColor: '#e2ddd7',
                              borderRadius: 10,
                              overflow: 'hidden',
                              ...SHADOWS.card,
                            }}
                          >
                            <Image
                              source={{ uri: SERVICE_IMAGES[service.slug] }}
                              resizeMode="cover"
                              style={{ width: '100%', height: isPhone ? 225 : 165 }}
                            />
                            <View style={{ padding: 15, minHeight: 145 }}>
                              <View style={{ width: 35, height: 35, borderRadius: 18,
                                backgroundColor: COLORS.white, borderWidth: 1, borderColor: '#ddd6ce',
                                alignItems: 'center', justifyContent: 'center', marginTop: -33,
                                marginBottom: 12, ...SHADOWS.card }}>
                                <Text style={{ color: '#151515', fontSize: 17, fontWeight: '900' }}>
                                  {service.icon}
                                </Text>
                              </View>
                              <Text style={{ color: '#171411', fontFamily: 'Georgia',
                                fontSize: 18, fontWeight: '700' }}>{service.title}</Text>
                              <Text numberOfLines={3} style={{ color: '#645e58', fontSize: 10,
                                lineHeight: 16, marginTop: 7 }}>{service.description}</Text>
                              <Text style={{ color: COLORS.royal, fontSize: 10,
                                fontWeight: '900', marginTop: 13 }}>View Services  →</Text>
                            </View>
                          </TouchableOpacity>
                        ))}
                    </View>

                    <TouchableOpacity
                      activeOpacity={0.8}
                      onPress={() => openCategory(
                        SERVICE_CATEGORIES.find((service) => service.isProductCatalog)
                      )}
                      style={{ alignSelf: 'center', paddingHorizontal: 20, paddingVertical: 13,
                        marginTop: 24, borderRadius: RADIUS.round, borderWidth: 1,
                        borderColor: '#d9d2ca', backgroundColor: COLORS.white }}
                    >
                      <Text style={{ color: COLORS.royal, fontSize: 11, fontWeight: '900' }}>
                        Shop Professional Products  →
                      </Text>
                    </TouchableOpacity>
                  </>
                )}


                {/* =========================================
                    EXPANDED CATEGORY
                ========================================= */}

                {!!selectedCategory && (
                  <View>

                    <TouchableOpacity
                      activeOpacity={
                        0.8
                      }

                      onPress={
                        closeCategory
                      }

                      style={{
                        alignSelf:
                          'flex-start',

                        backgroundColor:
                          COLORS.blueSoft,

                        paddingHorizontal:
                          14,

                        paddingVertical:
                          10,

                        borderRadius:
                          RADIUS.round,

                        marginBottom:
                          25,
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
                        ← All Services
                      </Text>
                    </TouchableOpacity>


                    {/* =====================================
                        PRODUCT CATALOG
                    ===================================== */}

                    {selectedCategory ===
                    'products' ? (
                      <>
                        {loadingProducts ? (
                          <View
                            style={{
                              paddingVertical:
                                50,

                              alignItems:
                                'center',
                            }}
                          >
                            <ActivityIndicator
                              size="large"

                              color={
                                COLORS.royal
                              }
                            />

                            <Text
                              style={{
                                color:
                                  COLORS.textMuted,

                                marginTop:
                                  12,
                              }}
                            >
                              Loading products...
                            </Text>
                          </View>
                        ) : products.length ===
                          0 ? (
                          <View
                            style={{
                              backgroundColor:
                                COLORS.blueVerySoft,

                              borderRadius:
                                RADIUS.large,

                              padding:
                                28,

                              alignItems:
                                'center',
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
                              No products available
                            </Text>

                            <Text
                              style={{
                                color:
                                  COLORS.textSecondary,

                                fontSize:
                                  13,

                                textAlign:
                                  'center',

                                marginTop:
                                  8,
                              }}
                            >
                              Check back soon for salon products.
                            </Text>
                          </View>
                        ) : (
                          <View
                            style={{
                              flexDirection:
                                'row',

                              flexWrap:
                                'wrap',

                              gap:
                                15,
                            }}
                          >
                            {products.map(
                              (
                                product
                              ) => (
                                <View
                                  key={
                                    product.id
                                  }

                                  style={{
                                    width:
                                      isPhone
                                        ? '100%'
                                        : isTablet
                                        ? '48%'
                                        : '31.8%',

                                    backgroundColor:
                                      COLORS.white,

                                    borderWidth:
                                      1,

                                    borderColor:
                                      COLORS.border,

                                    borderRadius:
                                      RADIUS.large,

                                    overflow:
                                      'hidden',

                                    ...SHADOWS.card,
                                  }}
                                >
                                  {product.image_url ? (
                                    <Image
                                      source={{
                                        uri:
                                          resolveAvatar(
                                            product.image_url
                                          ),
                                      }}

                                      resizeMode="cover"

                                      style={{
                                        width:
                                          '100%',

                                        height:
                                          isPhone
                                            ? 250
                                            : 220,
                                      }}
                                    />
                                  ) : (
                                    <View
                                      style={{
                                        width:
                                          '100%',

                                        height:
                                          isPhone
                                            ? 220
                                            : 190,

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
                                            42,

                                          fontWeight:
                                            '900',
                                        }}
                                      >
                                        ◈
                                      </Text>

                                      <Text
                                        style={{
                                          color:
                                            COLORS.textMuted,

                                          fontSize:
                                            11,

                                          fontWeight:
                                            '700',

                                          marginTop:
                                            8,
                                        }}
                                      >
                                        Product Image
                                      </Text>
                                    </View>
                                  )}


                                  <View
                                    style={{
                                      padding:
                                        20,
                                    }}
                                  >
                                    <Text
                                      style={{
                                        color:
                                          COLORS.royalDark,

                                        fontSize:
                                          20,

                                        fontWeight:
                                          '900',
                                      }}
                                    >
                                      {
                                        product.name
                                      }
                                    </Text>


                                    <Text
                                      style={{
                                        color:
                                          COLORS.textSecondary,

                                        fontSize:
                                          13,

                                        lineHeight:
                                          20,

                                        marginTop:
                                          8,
                                      }}
                                    >
                                      {
                                        product.description ||
                                        'Professional salon product available at Image & Style.'
                                      }
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
                                          18,
                                      }}
                                    >
                                      {
                                        formatMoney(
                                          product.price
                                        )
                                      }
                                    </Text>
                                  </View>
                                </View>
                              )
                            )}
                          </View>
                        )}
                      </>
                    ) : (
                      <>

                        {/* =================================
                            NORMAL APPOINTMENT BOOKING
                        ================================= */}

                        {loadingCategory ? (
                          <View
                            style={{
                              paddingVertical:
                                50,

                              alignItems:
                                'center',
                            }}
                          >
                            <ActivityIndicator
                              size="large"

                              color={
                                COLORS.royal
                              }
                            />

                            <Text
                              style={{
                                color:
                                  COLORS.textMuted,

                                marginTop:
                                  12,
                              }}
                            >
                              Loading professionals...
                            </Text>
                          </View>
                        ) : (
                          <>

                            {/* =================================
                                PROFESSIONALS
                            ================================= */}

                            <Text
                              style={{
                                color:
                                  COLORS.royalDark,

                                fontSize:
                                  22,

                                fontWeight:
                                  '900',

                                marginBottom:
                                  6,
                              }}
                            >
                              Choose your professional
                            </Text>

                            <Text
                              style={{
                                color:
                                  COLORS.textSecondary,

                                fontSize:
                                  13,

                                marginBottom:
                                  20,
                              }}
                            >
                              Select who you would like to book with.
                            </Text>


                            {staff.length ===
                            0 ? (
                              <View
                                style={{
                                  backgroundColor:
                                    COLORS.blueVerySoft,

                                  borderRadius:
                                    RADIUS.large,

                                  padding:
                                    25,

                                  alignItems:
                                    'center',
                                }}
                              >
                                <Text
                                  style={{
                                    color:
                                      COLORS.textSecondary,

                                    textAlign:
                                      'center',
                                  }}
                                >
                                  No professionals are currently assigned to this specialty.
                                </Text>
                              </View>
                            ) : (
                              <View
                                style={{
                                  flexDirection:
                                    'row',

                                  flexWrap:
                                    'wrap',

                                  gap: 15,
                                }}
                              >
                                {staff.map(
                                  (
                                    member
                                  ) => {
                                    const active =
                                      selectedStaff
                                        ?.id ===
                                      member.id;

                                    const avatar =
                                      resolveAvatar(
                                        member.avatar_url
                                      );

                                    const initials =
                                      member.name
                                        ?.split(
                                          ' '
                                        )
                                        .map(
                                          (
                                            part
                                          ) =>
                                            part[0]
                                        )
                                        .join('')
                                        .slice(
                                          0,
                                          2
                                        )
                                        .toUpperCase();

                                    return (
                                      <TouchableOpacity
                                        key={
                                          member.id
                                        }

                                        activeOpacity={
                                          0.85
                                        }

                                        onPress={() =>
                                          chooseStaff(
                                            member
                                          )
                                        }

                                        style={{
                                          width:
                                            isPhone
                                              ? '100%'
                                              : isTablet
                                              ? '48%'
                                              : '31.8%',

                                          backgroundColor:
                                            active
                                              ? COLORS.blueSoft
                                              : COLORS.white,

                                          borderWidth:
                                            active
                                              ? 2
                                              : 1,

                                          borderColor:
                                            active
                                              ? COLORS.royal
                                              : COLORS.border,

                                          borderRadius:
                                            RADIUS.large,

                                          overflow:
                                            'hidden',

                                          ...SHADOWS.card,
                                        }}
                                      >
                                        {avatar ? (
                                          <Image
                                            source={{
                                              uri:
                                                avatar,
                                            }}

                                            resizeMode="cover"

                                            style={{
                                              width:
                                                '100%',

                                              height:
                                                isPhone
                                                  ? 260
                                                  : 230,
                                            }}
                                          />
                                        ) : (
                                          <View
                                            style={{
                                              width:
                                                '100%',

                                              height:
                                                isPhone
                                                  ? 220
                                                  : 200,

                                              backgroundColor:
                                                COLORS.blueSoft,

                                              alignItems:
                                                'center',

                                              justifyContent:
                                                'center',
                                            }}
                                          >
                                            <View
                                              style={{
                                                width: 90,
                                                height: 90,

                                                borderRadius:
                                                  45,

                                                backgroundColor:
                                                  COLORS.royal,

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
                                                    28,

                                                  fontWeight:
                                                    '900',
                                                }}
                                              >
                                                {
                                                  initials ||
                                                  'IS'
                                                }
                                              </Text>
                                            </View>
                                          </View>
                                        )}


                                        <View
                                          style={{
                                            padding:
                                              18,
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
                                            {
                                              member.name
                                            }
                                          </Text>

                                          <Text
                                            style={{
                                              color:
                                                COLORS.royal,

                                              fontSize:
                                                12,

                                              fontWeight:
                                                '800',

                                              marginTop:
                                                5,

                                              textTransform:
                                                'capitalize',
                                            }}
                                          >
                                            {
                                              member.profession ||
                                              categoryInfo
                                                ?.title
                                            }
                                          </Text>

                                          <Text
                                            style={{
                                              color:
                                                active
                                                  ? COLORS.royal
                                                  : COLORS.textMuted,

                                              fontSize:
                                                12,

                                              fontWeight:
                                                '800',

                                              marginTop:
                                                14,
                                            }}
                                          >
                                            {
                                              active
                                                ? 'Selected ✓'
                                                : `Book with ${
                                                    member.name
                                                      .split(
                                                        ' '
                                                      )[0]
                                                  } →`
                                            }
                                          </Text>
                                        </View>
                                      </TouchableOpacity>
                                    );
                                  }
                                )}
                              </View>
                            )}


                            {/* =================================
                                BOOKING DETAILS
                            ================================= */}

                            {!!selectedStaff && (
                              <View
                                style={{
                                  marginTop:
                                    40,

                                  borderTopWidth:
                                    1,

                                  borderTopColor:
                                    COLORS.border,

                                  paddingTop:
                                    35,
                                }}
                              >

                                <Text
                                  style={{
                                    color:
                                      COLORS.royalBright,

                                    fontSize:
                                      11,

                                    fontWeight:
                                      '900',

                                    letterSpacing:
                                      1.4,
                                  }}
                                >
                                  BOOK WITH
                                </Text>

                                <Text
                                  style={{
                                    color:
                                      COLORS.royalDark,

                                    fontSize:
                                      27,

                                    fontWeight:
                                      '900',

                                    marginTop:
                                      5,
                                  }}
                                >
                                  {
                                    selectedStaff.name
                                  }
                                </Text>
                                                                {/* =============================
                                    STEP 1 - SERVICE
                                ============================= */}

<Text
                                  style={{
                                    color:
                                      COLORS.royalDark,

                                    fontSize:
                                      19,

                                    fontWeight:
                                      '900',

                                    marginTop:
                                      30,

                                    marginBottom:
                                      6,
                                  }}
                                >
                                  1. Select your service
                                </Text>


                                <View
                                  style={{
                                    flexDirection:
                                      'row',

                                    flexWrap:
                                      'wrap',

                                    gap: 10,

                                    marginTop:
                                      10,
                                  }}
                                >
                                  {services.map(
                                    (
                                      service
                                    ) => {
                                      const active =
                                        selectedService
                                          ?.id ===
                                        service.id;

                                      return (
                                        <TouchableOpacity
                                          key={
                                            service.id
                                          }

                                          activeOpacity={
                                            0.85
                                          }

                                          onPress={() =>
                                            chooseService(
                                              service
                                            )
                                          }

                                          style={{
                                            width:
                                              isPhone
                                                ? '100%'
                                                : isTablet
                                                ? '48%'
                                                : '31.8%',

                                            minHeight:
                                              95,

                                            backgroundColor:
                                              active
                                                ? COLORS.royal
                                                : COLORS.white,

                                            borderWidth:
                                              1,

                                            borderColor:
                                              active
                                                ? COLORS.royal
                                                : COLORS.border,

                                            borderRadius:
                                              RADIUS.medium,

                                            padding:
                                              15,

                                            justifyContent:
                                              'center',
                                          }}
                                        >
                                          <Text
                                            style={{
                                              color:
                                                active
                                                  ? COLORS.white
                                                  : COLORS.royalDark,

                                              fontSize:
                                                15,

                                              fontWeight:
                                                '900',
                                            }}
                                          >
                                            {
                                              service.name
                                            }
                                          </Text>

                                          <Text
                                            style={{
                                              color:
                                                active
                                                  ? 'rgba(255,255,255,0.72)'
                                                  : COLORS.textSecondary,

                                              fontSize:
                                                11,

                                              marginTop:
                                                6,
                                            }}
                                          >
                                            {
                                              service.duration_minutes
                                            }
                                            {' min • '}
                                            {
                                              formatMoney(
                                                service.price
                                              )
                                            }
                                          </Text>
                                        </TouchableOpacity>
                                      );
                                    }
                                  )}
                                </View>


                                {/* =============================
                                    STEP 2 - DATE
                                ============================= */}

                                {!!selectedService && (
                                  <View
                                    style={{
                                      marginTop:
                                        35,
                                    }}
                                  >
                                    <Text
                                      style={{
                                        color:
                                          COLORS.royalDark,

                                        fontSize:
                                          19,

                                        fontWeight:
                                          '900',

                                        marginBottom:
                                          6,
                                      }}
                                    >
                                      2. Choose a date
                                    </Text>


                                    <View
                                      style={{
                                        backgroundColor:
                                          COLORS.white,

                                        borderWidth:
                                          1,

                                        borderColor:
                                          COLORS.border,

                                        borderRadius:
                                          RADIUS.large,

                                        overflow:
                                          'hidden',

                                        maxWidth:
                                          650,

                                        marginTop:
                                          15,

                                        ...SHADOWS.card,
                                      }}
                                    >
                                      <Calendar
                                        current={
                                          selectedDate
                                        }

                                        minDate={
                                          today
                                        }

                                        onDayPress={
                                          (
                                            day
                                          ) => {
                                            setSelectedDate(
                                              day.dateString
                                            );

                                            setSelectedTime(
                                              null
                                            );
                                          }
                                        }

                                        markedDates={{
                                          [
                                            selectedDate
                                          ]: {
                                            selected:
                                              true,

                                            selectedColor:
                                              COLORS.royal,

                                            selectedTextColor:
                                              COLORS.white,
                                          },
                                        }}

                                        theme={{
                                          backgroundColor:
                                            COLORS.white,

                                          calendarBackground:
                                            COLORS.white,

                                          textSectionTitleColor:
                                            COLORS.textMuted,

                                          selectedDayBackgroundColor:
                                            COLORS.royal,

                                          selectedDayTextColor:
                                            COLORS.white,

                                          todayTextColor:
                                            COLORS.royal,

                                          dayTextColor:
                                            COLORS.text,

                                          textDisabledColor:
                                            COLORS.borderStrong,

                                          arrowColor:
                                            COLORS.royal,

                                          monthTextColor:
                                            COLORS.royalDark,

                                          textMonthFontWeight:
                                            '900',

                                          textDayFontWeight:
                                            '600',

                                          textDayHeaderFontWeight:
                                            '700',
                                        }}
                                      />
                                    </View>
                                  </View>
                                )}


                                {/* =============================
                                    STEP 3 - TIME
                                ============================= */}

                                {!!selectedService && (
                                  <View
                                    style={{
                                      marginTop:
                                        35,
                                    }}
                                  >
                                    <Text
                                      style={{
                                        color:
                                          COLORS.royalDark,

                                        fontSize:
                                          19,

                                        fontWeight:
                                          '900',
                                      }}
                                    >
                                      3. Choose a time
                                    </Text>

                                    <Text
                                      style={{
                                        color:
                                          COLORS.textSecondary,

                                        fontSize:
                                          13,

                                        marginTop:
                                          6,

                                        marginBottom:
                                          15,
                                      }}
                                    >
                                      Only available times with {
                                        selectedStaff.name
                                      } are shown.
                                    </Text>


                                    {loadingAvailability ? (
                                      <View
                                        style={{
                                          paddingVertical:
                                            30,

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

                                            marginTop:
                                              10,

                                            fontSize:
                                              12,
                                          }}
                                        >
                                          Checking availability...
                                        </Text>
                                      </View>
                                    ) : availableTimes.length ===
                                      0 ? (
                                      <View
                                        style={{
                                          backgroundColor:
                                            COLORS.blueVerySoft,

                                          borderRadius:
                                            RADIUS.medium,

                                          padding:
                                            20,
                                        }}
                                      >
                                        <Text
                                          style={{
                                            color:
                                              COLORS.textSecondary,

                                            textAlign:
                                              'center',
                                          }}
                                        >
                                          No available times for this date. Try another day.
                                        </Text>
                                      </View>
                                    ) : (
                                      <View
                                        style={{
                                          flexDirection:
                                            'row',

                                          flexWrap:
                                            'wrap',

                                          gap: 9,
                                        }}
                                      >
                                        {availableTimes.map(
                                          (
                                            time
                                          ) => {
                                            const active =
                                              selectedTime ===
                                              time;

                                            return (
                                              <TouchableOpacity
                                                key={
                                                  time
                                                }

                                                activeOpacity={
                                                  0.8
                                                }

                                                onPress={() =>
                                                  setSelectedTime(
                                                    time
                                                  )
                                                }

                                                style={{
                                                  minWidth:
                                                    isPhone
                                                      ? '30%'
                                                      : 105,

                                                  paddingHorizontal:
                                                    14,

                                                  paddingVertical:
                                                    13,

                                                  borderRadius:
                                                    RADIUS.round,

                                                  backgroundColor:
                                                    active
                                                      ? COLORS.royal
                                                      : COLORS.white,

                                                  borderWidth:
                                                    1,

                                                  borderColor:
                                                    active
                                                      ? COLORS.royal
                                                      : COLORS.border,

                                                  alignItems:
                                                    'center',
                                                }}
                                              >
                                                <Text
                                                  style={{
                                                    color:
                                                      active
                                                        ? COLORS.white
                                                        : COLORS.royal,

                                                    fontSize:
                                                      12,

                                                    fontWeight:
                                                      '900',
                                                  }}
                                                >
                                                  {
                                                    formatTime12(
                                                      time
                                                    )
                                                  }
                                                </Text>
                                              </TouchableOpacity>
                                            );
                                          }
                                        )}
                                      </View>
                                    )}
                                  </View>
                                )}


                                {/* =============================
                                    STEP 4 - INFORMATION
                                ============================= */}

                                {!!selectedTime && (
                                  <View
                                    style={{
                                      marginTop:
                                        40,

                                      backgroundColor:
                                        COLORS.blueVerySoft,

                                      borderRadius:
                                        RADIUS.xlarge,

                                      padding:
                                        isPhone
                                          ? 20
                                          : 28,
                                    }}
                                  >
                                    <Text
                                      style={{
                                        color:
                                          COLORS.royalDark,

                                        fontSize:
                                          22,

                                        fontWeight:
                                          '900',
                                      }}
                                    >
                                      4. Your information
                                    </Text>

                                    <Text
                                      style={{
                                        color:
                                          COLORS.textSecondary,

                                        fontSize:
                                          13,

                                        lineHeight:
                                          20,

                                        marginTop:
                                          6,

                                        marginBottom:
                                          22,
                                      }}
                                    >
                                      Enter your information to confirm your appointment.
                                    </Text>


                                    <View
                                      style={{
                                        flexDirection:
                                          isPhone
                                            ? 'column'
                                            : 'row',

                                        gap:
                                          isPhone
                                            ? 0
                                            : 12,
                                      }}
                                    >
                                      <FormInput
                                        label="First name"

                                        value={
                                          firstName
                                        }

                                        onChangeText={
                                          setFirstName
                                        }

                                        placeholder="First name"

                                        style={{
                                          flex: 1,
                                        }}
                                      />

                                      <FormInput
                                        label="Last name"

                                        value={
                                          lastName
                                        }

                                        onChangeText={
                                          setLastName
                                        }

                                        placeholder="Last name"

                                        style={{
                                          flex: 1,
                                        }}
                                      />
                                    </View>


                                    <View
                                      style={{
                                        flexDirection:
                                          isPhone
                                            ? 'column'
                                            : 'row',

                                        gap:
                                          isPhone
                                            ? 0
                                            : 12,
                                      }}
                                    >
                                      <FormInput
                                        label="Phone"

                                        value={
                                          phone
                                        }

                                        onChangeText={
                                          setPhone
                                        }

                                        placeholder="(305) 000-0000"

                                        keyboardType="phone-pad"

                                        style={{
                                          flex: 1,
                                        }}
                                      />

                                      <FormInput
                                        label="Email"

                                        value={
                                          email
                                        }

                                        onChangeText={
                                          setEmail
                                        }

                                        placeholder="you@email.com"

                                        keyboardType="email-address"

                                        autoCapitalize="none"

                                        style={{
                                          flex: 1,
                                        }}
                                      />
                                    </View>


                                    <FormInput
                                      label="Notes"

                                      value={
                                        notes
                                      }

                                      onChangeText={
                                        setNotes
                                      }

                                      placeholder="Anything you'd like us to know?"
                                    />


                                    {/* SUMMARY */}
                                    <View
                                      style={{
                                        marginTop:
                                          8,

                                        backgroundColor:
                                          COLORS.white,

                                        borderWidth:
                                          1,

                                        borderColor:
                                          COLORS.border,

                                        borderRadius:
                                          RADIUS.large,

                                        padding:
                                          18,
                                      }}
                                    >
                                      <Text
                                        style={{
                                          color:
                                            COLORS.textMuted,

                                          fontSize:
                                            10,

                                          fontWeight:
                                            '900',

                                          letterSpacing:
                                            1.2,
                                        }}
                                      >
                                        APPOINTMENT SUMMARY
                                      </Text>

                                      <Text
                                        style={{
                                          color:
                                            COLORS.royalDark,

                                          fontSize:
                                            18,

                                          fontWeight:
                                            '900',

                                          marginTop:
                                            10,
                                        }}
                                      >
                                        {
                                          selectedService.name
                                        }
                                      </Text>

                                      <Text
                                        style={{
                                          color:
                                            COLORS.textSecondary,

                                          fontSize:
                                            12,

                                          lineHeight:
                                            20,

                                          marginTop:
                                            6,
                                        }}
                                      >
                                        With {
                                          selectedStaff.name
                                        }
                                        {'\n'}

                                        {
                                          formatDateLong(
                                            selectedDate
                                          )
                                        }

                                        {' at '}

                                        {
                                          formatTime12(
                                            selectedTime
                                          )
                                        }

                                        {'\n'}

                                        {
                                          selectedService.duration_minutes
                                        }

                                        {' minutes • '}

                                        {
                                          formatMoney(
                                            selectedService.price
                                          )
                                        }
                                      </Text>
                                    </View>


                                    <TouchableOpacity
                                      activeOpacity={
                                        0.85
                                      }

                                      disabled={
                                        booking
                                      }

                                      onPress={
                                        submitBooking
                                      }

                                      style={{
                                        minHeight:
                                          56,

                                        backgroundColor:
                                          COLORS.royal,

                                        borderRadius:
                                          RADIUS.medium,

                                        alignItems:
                                          'center',

                                        justifyContent:
                                          'center',

                                        marginTop:
                                          18,

                                        opacity:
                                          booking
                                            ? 0.65
                                            : 1,
                                      }}
                                    >
                                      {booking ? (
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

                                            fontSize:
                                              14,

                                            fontWeight:
                                              '900',
                                          }}
                                        >
                                          Confirm Appointment
                                        </Text>
                                      )}
                                    </TouchableOpacity>
                                  </View>
                                )}
                              </View>
                            )}
                          </>
                        )}
                      </>
                    )}
                  </View>
                )}
              </>
            )}
          </View>
        </View>


        {/* =================================================
            OUR WORK
            PHOTO-ONLY CAROUSEL
        ================================================= */}

        <View
          onLayout={(event) => setWorkSectionY(event.nativeEvent.layout.y)}
          style={{
            backgroundColor: COLORS.white,
            paddingHorizontal: isPhone ? 18 : 40,
            paddingVertical: isPhone ? 60 : 82,
          }}
        >
          <View style={{ width: '100%', maxWidth: 1240, alignSelf: 'center' }}>
            <View style={{
              flexDirection: 'row',
              alignItems: 'flex-end',
              justifyContent: 'space-between',
              marginBottom: 24,
            }}>
              <View>
                <Text style={{
                  color: COLORS.royal,
                  fontSize: 10,
                  fontWeight: '900',
                  letterSpacing: 1.6,
                }}>
                  OUR WORK
                </Text>
                <Text style={{
                  color: '#15120f',
                  fontFamily: 'Georgia',
                  fontSize: isPhone ? 31 : 39,
                  fontWeight: '700',
                  marginTop: 7,
                }}>
                  Looks we love
                </Text>
              </View>

              <TouchableOpacity
                activeOpacity={0.75}
                onPress={() => setShowFullGallery((current) => !current)}
                style={{ paddingVertical: 10, paddingLeft: 16 }}
              >
                <Text style={{
                  color: COLORS.royal,
                  fontSize: 10,
                  fontWeight: '900',
                }}>
                  {showFullGallery ? 'Close gallery  ↑' : 'View all work  →'}
                </Text>
              </TouchableOpacity>
            </View>

            {showFullGallery ? (
              <View style={{
                flexDirection: 'row',
                flexWrap: 'wrap',
                gap: 12,
              }}>
                {GALLERY_IMAGES.map((item) => (
                  <View key={item.id} style={{
                    width: isPhone ? '100%' : isTablet ? '48.8%' : '32.5%',
                    height: isPhone ? 330 : 310,
                    borderRadius: 10,
                    overflow: 'hidden',
                    backgroundColor: '#eeeeee',
                  }}>
                    <Image
                      source={{ uri: item.image }}
                      resizeMode="cover"
                      style={{ width: '100%', height: '100%' }}
                    />
                  </View>
                ))}
              </View>
            ) : (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: 12 }}
              >
                {GALLERY_IMAGES.slice(0, 5).map((item) => (
                  <View key={item.id} style={{
                    width: isPhone ? 245 : 226,
                    height: isPhone ? 315 : 285,
                    borderRadius: 9,
                    overflow: 'hidden',
                    backgroundColor: '#eeeeee',
                  }}>
                    <Image
                      source={{ uri: item.image }}
                      resizeMode="cover"
                      style={{ width: '100%', height: '100%' }}
                    />
                  </View>
                ))}
              </ScrollView>
            )}
          </View>
        </View>


        <View
          onLayout={(event) => setAboutSectionY(event.nativeEvent.layout.y)}
          style={{
            backgroundColor: COLORS.white,
            flexDirection: isPhone ? 'column' : 'row',
            borderTopWidth: 1,
            borderTopColor: '#eeeeee',
          }}
        >
          <Image source={{ uri: WORK_IMAGES[4].image }} resizeMode="cover"
            style={{ width: isPhone ? '100%' : '50%', height: isPhone ? 290 : 420 }} />
          <View style={{ flex: 1, paddingHorizontal: isPhone ? 24 : 62,
            paddingVertical: isPhone ? 44 : 58, justifyContent: 'center' }}>
            <Text style={{ color: COLORS.royal, fontSize: 10, fontWeight: '900',
              letterSpacing: 1.6 }}>ABOUT US</Text>
            <Text style={{ color: '#15120f', fontFamily: 'Georgia', fontSize: isPhone ? 34 : 44,
              lineHeight: isPhone ? 40 : 50, fontWeight: '700', marginTop: 9,
              maxWidth: 490 }}>A salon experience{`\n`}that’s all about you.</Text>
            <Text style={{ color: '#5e5852', fontSize: 12, lineHeight: 20,
              marginTop: 17, maxWidth: 520 }}>
              At Image & Style, beauty is personal. Our talented team is here to listen,
              create, and help you look and feel your best in a welcoming salon environment.
            </Text>
          </View>
        </View>

        <View
          onLayout={(event) => setTestimonialsSectionY(event.nativeEvent.layout.y)}
          style={{
            backgroundColor: COLORS.white,
            paddingHorizontal: isPhone ? 20 : 40,
            paddingVertical: isPhone ? 70 : 82,
            borderTopWidth: 1,
            borderTopColor: '#eeeeee',
          }}
        >
          <View style={{ width: '100%', maxWidth: 1060, alignSelf: 'center',
            flexDirection: isPhone ? 'column' : 'row', alignItems: 'center', gap: 28 }}>
            <Image source={{ uri: WORK_IMAGES[0].image }} resizeMode="cover"
              style={{ width: 125, height: 125, borderRadius: 63 }} />
            <View style={{ flex: 1, alignItems: isPhone ? 'center' : 'flex-start' }}>
              <Text style={{ color: COLORS.royal, fontSize: 16, letterSpacing: 3 }}>★★★★★</Text>
              <Text style={{ color: '#24201c', fontFamily: 'Georgia', fontSize: isPhone ? 21 : 27,
                lineHeight: isPhone ? 29 : 36, marginTop: 11,
                textAlign: isPhone ? 'center' : 'left' }}>
                “{TESTIMONIALS[testimonialIndex].quote}”
              </Text>
              <Text style={{ color: '#4f4943', fontSize: 10, fontWeight: '900', marginTop: 13 }}>
                — {TESTIMONIALS[testimonialIndex].label}
              </Text>
            </View>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              {['previous', 'next'].map((direction) => (
                <TouchableOpacity
                  key={direction}
                  activeOpacity={0.75}
                  accessibilityLabel={`${direction} testimonial`}
                  onPress={() => setTestimonialIndex((current) => (
                    direction === 'previous'
                      ? (current - 1 + TESTIMONIALS.length) % TESTIMONIALS.length
                      : (current + 1) % TESTIMONIALS.length
                  ))}
                  style={{ width: 42, height: 42, borderRadius: 21,
                    borderWidth: 1, borderColor: '#cfc7be', alignItems: 'center',
                    justifyContent: 'center', backgroundColor: COLORS.white }}
                >
                  <Text style={{ color: '#29241f', fontSize: 20 }}>
                    {direction === 'previous' ? '‹' : '›'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>


        {/* =================================================
            FOOTER
        ================================================= */}

        <View style={{ backgroundColor: '#101010', paddingHorizontal: isPhone ? 22 : 40,
          paddingTop: 54, paddingBottom: 26 }}>
          <View style={{ width: '100%', maxWidth: 1240, alignSelf: 'center' }}>
            <View style={{ flexDirection: isPhone ? 'column' : 'row', flexWrap: 'wrap',
              justifyContent: 'space-between', gap: isPhone ? 34 : 45 }}>
              <View style={{ width: isPhone ? '100%' : 225 }}>
                <Text style={{ color: COLORS.white, fontFamily: 'Georgia',
                  fontSize: 25, fontWeight: '700' }}>Image & Style</Text>
                <Text style={{ color: 'rgba(255,255,255,0.56)', fontSize: 10,
                  lineHeight: 17, marginTop: 14 }}>
                  Beauty made personal.{`\n`}We can’t wait to welcome you.
                </Text>
                <View style={{ flexDirection: 'row', gap: 15, marginTop: 20 }}>
                  <TouchableOpacity onPress={openInstagram}>
                    <Text style={{ color: COLORS.white, fontSize: 15 }}>◎</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={openPhone}>
                    <Text style={{ color: COLORS.white, fontSize: 15 }}>☎</Text>
                  </TouchableOpacity>

                </View>
              </View>

              {[
                ['QUICK LINKS', ['Services', 'Our Work', 'Testimonials', 'About', 'Contact']],
                ['SERVICES', ['Hair', 'Nails', 'Lashes', 'Brows', 'Skincare']],
                ['CONTACT', ['Salon address coming soon', 'Salon phone coming soon',
                  'Salon email coming soon', 'Hours coming soon']],
              ].map(([heading, items]) => (
                <View key={heading} style={{ minWidth: isPhone ? '45%' : 145 }}>
                  <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 9,
                    fontWeight: '900', letterSpacing: 1.3 }}>{heading}</Text>
                  {items.map((item) => (
                    <TouchableOpacity key={item} activeOpacity={0.7}
                      onPress={
                        heading === 'SERVICES' || item === 'Services'
                          ? scrollToServices
                          : item === 'Our Work'
                            ? () => pageScrollRef.current?.scrollTo({
                                y: Math.max(workSectionY - 24, 0),
                                animated: true,
                              })
                            : item === 'Testimonials'
                              ? () => pageScrollRef.current?.scrollTo({
                                  y: Math.max(testimonialsSectionY - 24, 0),
                                  animated: true,
                                })
                              : item === 'About'
                                ? () => pageScrollRef.current?.scrollTo({
                                    y: Math.max(aboutSectionY - 24, 0),
                                    animated: true,
                                  })
                                : item === 'Contact'
                                  ? () => pageScrollRef.current?.scrollToEnd({ animated: true })
                                  : undefined
                      }>
                      <Text style={{ color: 'rgba(255,255,255,0.78)', fontSize: 10,
                        marginTop: 12 }}>{item}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              ))}

              <View style={{ width: isPhone ? '100%' : 225 }}>
                <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 9,
                  fontWeight: '900', letterSpacing: 1.3 }}>JOIN OUR LIST</Text>
                <Text style={{ color: 'rgba(255,255,255,0.72)', fontSize: 10,
                  lineHeight: 16, marginTop: 12 }}>
                  Be the first to know about special offers and new services.
                </Text>
                <View style={{ flexDirection: 'row', marginTop: 15 }}>
                  <View style={{ flex: 1, minHeight: 40, borderWidth: 1,
                    borderColor: '#373737', borderRadius: 4, justifyContent: 'center',
                    paddingHorizontal: 12 }}>
                    <Text style={{ color: 'rgba(255,255,255,0.35)', fontSize: 10 }}>Your email</Text>
                  </View>
                  <View style={{ width: 42, minHeight: 40, backgroundColor: COLORS.royal,
                    alignItems: 'center', justifyContent: 'center', marginLeft: -3 }}>
                    <Text style={{ color: COLORS.white, fontSize: 17 }}>→</Text>
                  </View>
                </View>
              </View>
            </View>

            <View style={{ borderTopWidth: 1, borderTopColor: '#292929', marginTop: 44,
              paddingTop: 20, flexDirection: isPhone ? 'column' : 'row',
              justifyContent: 'space-between', gap: 13 }}>
              <Text style={{ color: 'rgba(255,255,255,0.38)', fontSize: 9 }}>
                © {new Date().getFullYear()} Image & Style. All rights reserved.
              </Text>
              <Text style={{ color: 'rgba(255,255,255,0.38)', fontSize: 9 }}>
                Privacy Policy     Terms of Service     Accessibility
              </Text>
            </View>
          </View>
        </View>


      </ScrollView>
    </SafeAreaView>
  );
}