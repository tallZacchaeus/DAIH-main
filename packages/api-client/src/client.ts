import {
  BookingHoldDTO,
  BookingSummary,
  CreateBookingDTO,
  AvailabilityQueryDTO,
  AvailabilityResultDTO,
  CalendarAvailabilityQueryDTO,
  CalendarAvailabilityResultDTO,
  AdminOverrideBookingDTO,
  AdminNoShowRescheduleDTO,
  BookingFilterDTO,
  CancelBookingDTO,
  FacilityResource,
  ResourcePricingPlan,
  ResourceSchedule,
  ResourceBlackout,
  CreateResourceDTO,
  UpdateResourceDTO,
  CreatePricingPlanDTO,
  UpdatePricingPlanDTO,
  CreateBlackoutDTO,
  UpsertScheduleDTO,
  UploadResourceImageDTO,
  UploadImageResponse,
  PaystackInitializeResponse,
  UserProfile,
  UserRole,
  CustomerRecord,
  CustomerListResponse,
  CustomerFilterDTO,
  CreateCustomerDTO,
  CustomerMetrics,
  PaymentTransaction,
  InvoiceDTO,
  ReconciliationSummary,
  DailyPaymentSummary,
  VerifyAccessPassResponse,
  CheckInResultDTO,
  CheckOutResultDTO,
  AccessPassDetails,
  TerminalActivityRecord,
  LiveOccupancyDTO,
  AdminDashboardSummaryDTO,
  AdminAnalyticsSummaryDTO,
  ReceptionTerminalSummaryDTO,
  LoginApiResponse,
  MfaSetupInitResponse,
  MfaMethod,
  SetupAccountResponse,
  CustomerReferralsResponse,
  AdminCustomerReferralsResponse,
  PolicyDocument,
  PolicyType,
  UpdatePolicyDTO,
  VisitLogItemDTO,
  VisitActivityResponse,
  DiscountDTO,
  CreateDiscountDTO,
  UpdateDiscountDTO,
  DiscountPreviewRequestDTO,
  DiscountPreviewResponseDTO,
  ApplyCourtesyDiscountDTO,
  DiscountRedemptionDTO,
  DiscountFilterDTO,
  DiscountListResponse,
  SupportSettingsRecord,
  UpdateSupportSettingsDTO,
  NotificationDTO,
  NotificationListResponse,
  NotificationUnreadCountResponse,
} from "@daih/types";
import { apiCacheManager } from "./cache";

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public details?: any,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export interface ApiClientConfig {
  baseUrl?: string;
  getToken?: () => string | null | Promise<string | null>;
  setToken?: (token: string | null) => void;
  onSessionExpired?: () => void;
}

export class DaihApiClient {
  private baseUrl: string;
  private inMemoryToken: string | null = null;
  private getTokenFn?: () => string | null | Promise<string | null>;
  private setTokenFn?: (token: string | null) => void;
  private onSessionExpiredFn?: () => void;
  private isRefreshing: boolean = false;
  private refreshSubscribers: ((token: string | null) => void)[] = [];
  private inFlightRefreshPromise: Promise<{
    accessToken: string;
    token: string;
    user: UserProfile;
  }> | null = null;

  constructor(config: ApiClientConfig = {}) {
    const rawUrl =
      config.baseUrl ||
      (typeof window !== "undefined"
        ? process.env.NEXT_PUBLIC_API_URL || "/api/v1"
        : process.env.INTERNAL_API_URL ||
          process.env.NEXT_PUBLIC_API_URL ||
          "http://localhost:4000");
    const cleanUrl = rawUrl.replace(/\/$/, "");
    this.baseUrl = cleanUrl.endsWith("/api/v1")
      ? cleanUrl
      : cleanUrl
        ? `${cleanUrl}/api/v1`
        : "/api/v1";
    this.getTokenFn = config.getToken;
    this.setTokenFn = config.setToken;
    this.onSessionExpiredFn = config.onSessionExpired;

    // Ensure no legacy tokens remain in localStorage or sessionStorage
    if (typeof window !== "undefined") {
      try {
        localStorage.removeItem("daih_access_token");
        sessionStorage.removeItem("daih_access_token");
        localStorage.removeItem("daih_refresh_token");
        sessionStorage.removeItem("daih_refresh_token");
      } catch {}
    }
  }

  setOnSessionExpired(fn: () => void): void {
    this.onSessionExpiredFn = fn;
  }

  setAccessToken(token: string | null): void {
    this.inMemoryToken = token;
    // Strictly memory-only: purge any storage copies to prevent XSS exfiltration
    if (typeof window !== "undefined") {
      try {
        localStorage.removeItem("daih_access_token");
        sessionStorage.removeItem("daih_access_token");
        localStorage.removeItem("daih_refresh_token");
        sessionStorage.removeItem("daih_refresh_token");
      } catch {}
    }
    if (this.setTokenFn) {
      this.setTokenFn(token);
    }
  }

  async getAccessToken(): Promise<string | null> {
    if (this.getTokenFn) {
      const customToken = await this.getTokenFn();
      if (customToken !== undefined && customToken !== null) return customToken;
    }
    return this.inMemoryToken;
  }

  private onTokenRefreshed(token: string | null) {
    this.refreshSubscribers.forEach((callback) => callback(token));
    this.refreshSubscribers = [];
  }

  private addRefreshSubscriber(callback: (token: string | null) => void) {
    this.refreshSubscribers.push(callback);
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
    retryOnAuthFailure: boolean = true,
  ): Promise<T> {
    const cleanEndpoint = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
    const url = `${this.baseUrl}${cleanEndpoint}`;
    const headers = new Headers(options.headers || {});

    if (!headers.has("Content-Type") && !(options.body instanceof FormData)) {
      headers.set("Content-Type", "application/json");
    }

    const token = await this.getAccessToken();
    if (token && !headers.has("Authorization")) {
      headers.set("Authorization", `Bearer ${token}`);
    }

    // Always include credentials to ensure HttpOnly refresh cookies are sent
    const fetchOptions: RequestInit = {
      ...options,
      headers,
      credentials: "include",
    };

    let response: Response;
    try {
      response = await fetch(url, fetchOptions);
    } catch (networkError: any) {
      throw new ApiError(
        0,
        "NETWORK_ERROR",
        networkError?.message || "Unable to connect to the server",
      );
    }

    // Transparent token refresh on 401
    if (
      response.status === 401 &&
      retryOnAuthFailure &&
      !cleanEndpoint.includes("/identity/login") &&
      !cleanEndpoint.includes("/identity/register") &&
      !cleanEndpoint.includes("/identity/refresh")
    ) {
      if (this.isRefreshing) {
        // Wait for active in-flight refresh to finish
        const retryToken = await new Promise<string | null>((resolve) => {
          this.addRefreshSubscriber((newToken) => resolve(newToken));
        });

        if (retryToken) {
          headers.set("Authorization", `Bearer ${retryToken}`);
          return this.request<T>(endpoint, { ...options, headers }, false);
        }
      } else {
        this.isRefreshing = true;
        try {
          const refreshRes = await this.auth.refresh();
          const newToken = refreshRes.accessToken || refreshRes.token || null;
          this.isRefreshing = false;
          this.onTokenRefreshed(newToken);

          if (newToken) {
            headers.set("Authorization", `Bearer ${newToken}`);
            return this.request<T>(endpoint, { ...options, headers }, false);
          }
        } catch (refreshErr) {
          this.isRefreshing = false;
          this.setAccessToken(null);
          this.onTokenRefreshed(null);
          if (this.onSessionExpiredFn) {
            this.onSessionExpiredFn();
          }
        }
      }
    }

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      const detailMsg =
        data.details && Array.isArray(data.details) && data.details.length > 0
          ? `: ${data.details.map((d: any) => `${d.field ? d.field + ": " : ""}${d.message}`).join(", ")}`
          : "";
      throw new ApiError(
        response.status,
        data.code || "API_ERROR",
        (data.message || "An unexpected API error occurred") + detailMsg,
        data.details,
      );
    }

    return data.data !== undefined ? data.data : data;
  }

  // Identity / Auth API
  public auth = {
    login: async (credentials: {
      email: string;
      password: string;
      portal?: "customer" | "admin" | string;
      audience?: "CUSTOMER" | "ADMIN" | string;
    }): Promise<LoginApiResponse> => {
      const res = await this.request<any>("/identity/login", {
        method: "POST",
        body: JSON.stringify(credentials),
      });
      if (res.requiresMfaSetup || res.requiresMfa) {
        return res as LoginApiResponse;
      }
      const jwt = res.accessToken || res.token || null;
      if (jwt) {
        this.setAccessToken(jwt);
      }
      return { ...res, token: jwt || "" };
    },

    setupMfa: (payload: { setupToken: string; method: MfaMethod }) =>
      this.request<MfaSetupInitResponse>("/identity/mfa/setup", {
        method: "POST",
        body: JSON.stringify(payload),
      }),

    confirmMfaSetup: async (payload: {
      setupToken: string;
      method: MfaMethod;
      code: string;
      ephemeralSecret?: string;
    }) => {
      const res = await this.request<{ token: string; user: UserProfile }>(
        "/identity/mfa/verify-setup",
        {
          method: "POST",
          body: JSON.stringify(payload),
        },
      );
      if (res.token) {
        this.setAccessToken(res.token);
      }
      return res;
    },

    verifyMfaChallenge: async (payload: {
      mfaChallengeToken: string;
      code: string;
    }) => {
      const res = await this.request<{ token: string; user: UserProfile }>(
        "/identity/mfa/verify",
        {
          method: "POST",
          body: JSON.stringify(payload),
        },
      );
      if (res.token) {
        this.setAccessToken(res.token);
      }
      return res;
    },

    sendMfaOtp: (payload: { mfaChallengeToken: string }) =>
      this.request<{ success: boolean; message: string }>(
        "/identity/mfa/send-otp",
        {
          method: "POST",
          body: JSON.stringify(payload),
        },
      ),

    disableUserMfa: (userId: string) =>
      this.request<{ success: boolean; message: string }>(
        `/identity/admin/users/${userId}/mfa`,
        {
          method: "DELETE",
        },
      ),

    register: (payload: {
      email: string;
      password: string;
      firstName: string;
      lastName: string;
      phoneNumber?: string;
      policyVersion?: string;
      consented: boolean;
      referralCode?: string;
    }) =>
      this.request<{ user: UserProfile; verificationSent: boolean }>(
        "/identity/register",
        {
          method: "POST",
          body: JSON.stringify(payload),
        },
      ),

    refresh: async () => {
      if (this.inFlightRefreshPromise) {
        return this.inFlightRefreshPromise;
      }

      this.inFlightRefreshPromise = (async () => {
        try {
          const res = await this.request<{
            accessToken?: string;
            user: UserProfile;
            token?: string;
          }>("/identity/refresh", {
            method: "POST",
          });
          const token = res.accessToken || res.token;
          if (token) {
            this.setAccessToken(token);
          }
          return {
            ...res,
            accessToken: token || "",
            token: token || "",
          };
        } finally {
          this.inFlightRefreshPromise = null;
        }
      })();

      return this.inFlightRefreshPromise;
    },

    logout: async () => {
      try {
        await this.request("/identity/logout", { method: "POST" });
      } finally {
        this.setAccessToken(null);
      }
    },

    getProfile: () => this.request<UserProfile>("/identity/me"),

    updateProfile: (data: {
      firstName?: string;
      lastName?: string;
      phoneNumber?: string;
      birthday?: string | null;
    }) =>
      this.request<UserProfile>("/identity/me", {
        method: "PUT",
        body: JSON.stringify(data),
      }),

    changePassword: (data: { currentPassword: string; newPassword: string }) =>
      this.request<{ success: boolean; message: string }>(
        "/identity/me/change-password",
        {
          method: "POST",
          body: JSON.stringify(data),
        },
      ),

    uploadAvatar: (data: {
      data: string;
      fileName?: string;
      contentType?: string;
    }) =>
      this.request<{ avatarUrl: string; user: UserProfile }>(
        "/identity/me/avatar",
        {
          method: "POST",
          body: JSON.stringify(data),
        },
      ),

    deleteAvatar: () =>
      this.request<{ success: boolean; user: UserProfile }>(
        "/identity/me/avatar",
        {
          method: "DELETE",
        },
      ),

    verifyEmail: (token: string) =>
      this.request<{ success: boolean; message: string }>(
        "/identity/verify-email",
        {
          method: "POST",
          body: JSON.stringify({ token }),
        },
      ),

    resendVerification: (email: string) =>
      this.request<{ success: boolean; message: string }>(
        "/identity/resend-verification",
        {
          method: "POST",
          body: JSON.stringify({ email }),
        },
      ),

    requestPasswordReset: (email: string) =>
      this.request<{ success: boolean; message: string }>(
        "/identity/password-reset/request",
        {
          method: "POST",
          body: JSON.stringify({ email }),
        },
      ),

    resetPassword: (payload: { token: string; newPassword: string }) =>
      this.request<{ success: boolean; message: string }>(
        "/identity/password-reset/confirm",
        {
          method: "POST",
          body: JSON.stringify(payload),
        },
      ),

    confirmPasswordReset: (payload: { token: string; newPassword: string }) =>
      this.auth.resetPassword(payload),

    setupAccount: (payload: { token: string; password: string }) =>
      this.request<SetupAccountResponse>("/identity/setup-account", {
        method: "POST",
        body: JSON.stringify(payload),
      }),

    getStaffUsers: () => this.adminUsers.getStaffUsers(),

    createStaffUser: (payload: {
      email: string;
      firstName: string;
      lastName: string;
      phoneNumber?: string;
      role: UserRole;
    }) => this.adminUsers.createStaffUser(payload),

    updateStaffUser: (
      userId: string,
      payload: {
        role?: UserRole;
        firstName?: string;
        lastName?: string;
        phoneNumber?: string;
        isVerified?: boolean;
      },
    ) => this.adminUsers.updateStaffUser(userId, payload),
  };

  // Catalogue & Resources API
  public catalogue = {
    getResources: (options?: { forceRefresh?: boolean }) =>
      apiCacheManager.fetchWithCache<FacilityResource[]>(
        "catalogue_resources",
        () => this.request<FacilityResource[]>("/catalogue/resources"),
        60000,
        options,
      ),

    getResourceBySlug: (slug: string, options?: { forceRefresh?: boolean }) =>
      apiCacheManager.fetchWithCache<FacilityResource>(
        `catalogue_resource_${slug}`,
        () => this.request<FacilityResource>(`/catalogue/resources/${slug}`),
        60000,
        options,
      ),

    getResourceById: (id: string, options?: { forceRefresh?: boolean }) =>
      this.catalogue.getResourceBySlug(id, options),

    getAdminResources: () =>
      this.request<FacilityResource[]>("/catalogue/admin/resources"),

    createResource: async (dto: CreateResourceDTO) => {
      const res = await this.request<FacilityResource>(
        "/catalogue/admin/resources",
        {
          method: "POST",
          body: JSON.stringify(dto),
        },
      );
      apiCacheManager.invalidate("catalogue");
      return res;
    },

    updateResource: async (id: string, dto: UpdateResourceDTO) => {
      const res = await this.request<FacilityResource>(
        `/catalogue/admin/resources/${id}`,
        {
          method: "PUT",
          body: JSON.stringify(dto),
        },
      );
      apiCacheManager.invalidate("catalogue");
      return res;
    },

    deleteResource: async (id: string) => {
      const res = await this.request<{ success: boolean }>(
        `/catalogue/admin/resources/${id}`,
        {
          method: "DELETE",
        },
      );
      apiCacheManager.invalidate("catalogue");
      return res;
    },

    addPricingPlan: async (resourceId: string, dto: CreatePricingPlanDTO) => {
      const res = await this.request<ResourcePricingPlan>(
        `/catalogue/admin/resources/${resourceId}/pricing`,
        {
          method: "POST",
          body: JSON.stringify(dto),
        },
      );
      apiCacheManager.invalidate("catalogue");
      return res;
    },

    createPricingPlan: (resourceId: string, dto: CreatePricingPlanDTO) =>
      this.catalogue.addPricingPlan(resourceId, dto),

    updatePricingPlan: async (pricingId: string, dto: UpdatePricingPlanDTO) => {
      const res = await this.request<ResourcePricingPlan>(
        `/catalogue/admin/pricing/${pricingId}`,
        {
          method: "PUT",
          body: JSON.stringify(dto),
        },
      );
      apiCacheManager.invalidate("catalogue");
      return res;
    },

    deletePricingPlan: async (pricingId: string) => {
      const res = await this.request<{ success: boolean }>(
        `/catalogue/admin/pricing/${pricingId}`,
        { method: "DELETE" },
      );
      apiCacheManager.invalidate("catalogue");
      return res;
    },

    upsertSchedules: async (
      resourceId: string,
      schedules: UpsertScheduleDTO[],
    ) => {
      const res = await this.request<ResourceSchedule[]>(
        `/catalogue/admin/resources/${resourceId}/schedules`,
        {
          method: "POST",
          body: JSON.stringify({ schedules }),
        },
      );
      apiCacheManager.invalidate("catalogue");
      return res;
    },

    updateSchedules: (resourceId: string, schedules: UpsertScheduleDTO[]) =>
      this.catalogue.upsertSchedules(resourceId, schedules),

    addBlackout: async (resourceId: string, dto: CreateBlackoutDTO) => {
      const res = await this.request<ResourceBlackout>(
        `/catalogue/admin/resources/${resourceId}/blackouts`,
        {
          method: "POST",
          body: JSON.stringify(dto),
        },
      );
      apiCacheManager.invalidate("catalogue");
      return res;
    },

    createBlackout: (resourceId: string, dto: CreateBlackoutDTO) =>
      this.catalogue.addBlackout(resourceId, dto),

    deleteBlackout: async (blackoutId: string) => {
      const res = await this.request<{ success: boolean }>(
        `/catalogue/admin/blackouts/${blackoutId}`,
        { method: "DELETE" },
      );
      apiCacheManager.invalidate("catalogue");
      return res;
    },

    uploadImage: async (dto: UploadResourceImageDTO) => {
      const res = await this.request<UploadImageResponse>(
        "/catalogue/admin/upload-image",
        {
          method: "POST",
          body: JSON.stringify(dto),
        },
      );
      apiCacheManager.invalidate("catalogue");
      return res;
    },

    updateResourceImage: async (
      resourceId: string,
      imagePayload: { data: string; fileName?: string } | string,
    ) => {
      let imageUrl: string;
      if (typeof imagePayload === "string") {
        imageUrl = imagePayload;
        const res = await this.catalogue.updateResource(resourceId, {
          imageUrl,
        });
        return res;
      } else {
        const uploadRes = await this.catalogue.uploadImage({
          ...imagePayload,
          resourceId,
        });
        imageUrl = uploadRes.url;
        const res = await this.catalogue.getResourceById(resourceId, {
          forceRefresh: true,
        });
        return res;
      }
    },
  };

  // Bookings API
  public bookings = {
    checkAvailability: (
      query: AvailabilityQueryDTO,
      options?: { forceRefresh?: boolean },
    ) => {
      const params = new URLSearchParams({
        resourceId: query.resourceId,
        startTime: query.startTime,
        endTime: query.endTime,
      });
      const cacheKey = `avail_${query.resourceId}_${query.startTime}_${query.endTime}`;
      return apiCacheManager.fetchWithCache<AvailabilityResultDTO>(
        cacheKey,
        () =>
          this.request<AvailabilityResultDTO>(
            `/bookings/availability?${params.toString()}`,
          ),
        15000,
        options,
      );
    },

    getCalendarAvailability: (
      query: CalendarAvailabilityQueryDTO,
      options?: { forceRefresh?: boolean },
    ) => {
      const params = new URLSearchParams({
        resourceId: query.resourceId,
        ...(query.month ? { month: query.month } : {}),
      });
      const cacheKey = `cal_avail_${query.resourceId}_${query.month || ""}`;
      return apiCacheManager.fetchWithCache<CalendarAvailabilityResultDTO>(
        cacheKey,
        () =>
          this.request<CalendarAvailabilityResultDTO>(
            `/bookings/calendar-availability?${params.toString()}`,
          ),
        30000,
        options,
      );
    },

    createHold: async (dto: CreateBookingDTO) => {
      const res = await this.request<BookingHoldDTO>("/bookings/hold", {
        method: "POST",
        body: JSON.stringify(dto),
      });
      apiCacheManager.invalidate("my_bookings");
      apiCacheManager.invalidate("cal_avail");
      return res;
    },

    extendHold: (bookingId: string) =>
      this.request<{ success: boolean; holdExpiresAt: string }>(
        `/bookings/${bookingId}/extend-hold`,
        { method: "POST" },
      ),

    getMyBookings: (options?: { forceRefresh?: boolean }) =>
      apiCacheManager.fetchWithCache<BookingSummary[]>(
        "my_bookings",
        () => this.request<BookingSummary[]>("/bookings/my"),
        30000,
        options,
      ),

    getBookingById: (id: string) =>
      this.request<BookingSummary>(`/bookings/${id}`),

    cancelBooking: async (id: string, reason?: string) => {
      const res = await this.request<{
        success: boolean;
        message: string;
        booking: BookingSummary;
      }>(`/bookings/${id}/cancel`, {
        method: "POST",
        body: JSON.stringify({ reason }),
      });
      apiCacheManager.invalidate("my_bookings");
      apiCacheManager.invalidate("cal_avail");
      return res;
    },

    confirmBooking: async (bookingId: string) => {
      const res = await this.request<BookingSummary>(
        `/bookings/${bookingId}/confirm`,
        {
          method: "POST",
        },
      );
      apiCacheManager.invalidate("my_bookings");
      apiCacheManager.invalidate("cal_avail");
      return res;
    },

    adminReleaseHold: async (bookingId: string, reason?: string) => {
      const res = await this.request<{ success: boolean; message: string }>(
        `/bookings/admin/${bookingId}/release`,
        {
          method: "POST",
          body: JSON.stringify({ reason }),
        },
      );
      apiCacheManager.invalidate("my_bookings");
      apiCacheManager.invalidate("cal_avail");
      return res;
    },

    getAdminBookings: async (filter?: BookingFilterDTO) => {
      const params = new URLSearchParams();
      if (filter?.status || filter?.state)
        params.set("state", (filter.status || filter.state) as string);
      if (filter?.search) params.set("search", filter.search);
      if (filter?.dateFrom || filter?.startDate)
        params.set(
          "startDate",
          (filter.dateFrom || filter.startDate) as string,
        );
      if (filter?.dateTo || filter?.endDate)
        params.set("endDate", (filter.dateTo || filter.endDate) as string);
      if (filter?.page) params.set("page", String(filter.page));
      if (filter?.limit) params.set("limit", String(filter.limit));
      const queryStr = params.toString() ? `?${params.toString()}` : "";
      const res = await this.request<any>(`/bookings/admin${queryStr}`);
      if (Array.isArray(res)) {
        return { bookings: res, total: res.length };
      }
      return {
        bookings: res.bookings || res.items || [],
        total: res.total ?? (res.bookings?.length || 0),
      };
    },

    getDashboardSummary: async (options?: { forceRefresh?: boolean }) => {
      return apiCacheManager.fetchWithCache<AdminDashboardSummaryDTO>(
        "admin_dashboard_summary",
        () =>
          this.request<AdminDashboardSummaryDTO>(
            "/bookings/admin/dashboard-summary",
          ),
        30000,
        options,
      );
    },

    getAnalyticsSummary: async (filter?: {
      startDate?: string;
      endDate?: string;
      preset?: string;
      forceRefresh?: boolean;
    }) => {
      const params = new URLSearchParams();
      if (filter?.startDate) params.set("startDate", filter.startDate);
      if (filter?.endDate) params.set("endDate", filter.endDate);
      if (filter?.preset) params.set("preset", filter.preset);
      const queryStr = params.toString() ? `?${params.toString()}` : "";
      const cacheKey = `admin_analytics_summary_${filter?.preset || "custom"}_${filter?.startDate || ""}_${filter?.endDate || ""}`;

      return apiCacheManager.fetchWithCache<AdminAnalyticsSummaryDTO>(
        cacheKey,
        () =>
          this.request<AdminAnalyticsSummaryDTO>(
            `/bookings/admin/analytics-summary${queryStr}`,
          ),
        30000,
        { forceRefresh: filter?.forceRefresh },
      );
    },

    adminOverrideBooking: async (
      bookingId: string,
      dto: AdminOverrideBookingDTO,
    ) => {
      const res = await this.request<BookingSummary>(
        `/bookings/admin/${bookingId}/override`,
        {
          method: "POST",
          body: JSON.stringify(dto),
        },
      );
      apiCacheManager.invalidate("my_bookings");
      apiCacheManager.invalidate("cal_avail");
      return res;
    },

    adminOverride: (dto: AdminOverrideBookingDTO) =>
      this.bookings.adminOverrideBooking(dto.resourceId, dto),

    rescheduleNoShow: async (
      bookingId: string,
      dto: AdminNoShowRescheduleDTO,
    ) => {
      const res = await this.request<{
        success: boolean;
        message: string;
        data: BookingSummary;
      }>(`/bookings/admin/${bookingId}/reschedule-noshow`, {
        method: "POST",
        body: JSON.stringify(dto),
      });
      apiCacheManager.invalidate("my_bookings");
      apiCacheManager.invalidate("cal_avail");
      return res.data || res;
    },

    initializePayment: (bookingId: string, callbackUrl?: string) =>
      this.payments.initializePayment(bookingId, callbackUrl),
  };

  // Payments & Ledger API
  public payments = {
    initializePayment: async (bookingId: string, callbackUrl?: string) => {
      const res = await this.request<PaystackInitializeResponse>(
        `/payments/initialize/${bookingId}`,
        {
          method: "POST",
          body: JSON.stringify({ callbackUrl }),
        },
      );
      apiCacheManager.invalidate("my_bookings");
      apiCacheManager.invalidate("payment_history");
      return res;
    },

    getHistory: (options?: {
      page?: number;
      limit?: number;
      forceRefresh?: boolean;
    }) => {
      const params = new URLSearchParams();
      if (options?.page) params.set("page", String(options.page));
      if (options?.limit) params.set("limit", String(options.limit));
      const queryStr = params.toString() ? `?${params.toString()}` : "";

      return apiCacheManager.fetchWithCache<PaymentTransaction[]>(
        `payment_history_${options?.page || 1}`,
        () =>
          this.request<PaymentTransaction[]>(`/payments/history${queryStr}`),
        15000,
        options,
      );
    },

    getTransaction: (transactionId: string) =>
      this.request<PaymentTransaction>(`/payments/${transactionId}`),

    verifyPayment: async (transactionId: string) => {
      const res = await this.request<PaymentTransaction>(
        `/payments/${transactionId}/verify`,
        {
          method: "POST",
        },
      );
      apiCacheManager.invalidate("my_bookings");
      apiCacheManager.invalidate("payment_history");
      apiCacheManager.invalidate("cal_avail");
      apiCacheManager.invalidate("avail_");
      return res;
    },

    getInvoice: (transactionId: string) =>
      this.request<InvoiceDTO>(`/payments/${transactionId}/invoice`),

    getAdminTransactions: async (filters?: {
      status?: string;
      method?: string;
      search?: string;
      startDate?: string;
      endDate?: string;
      page?: number;
      limit?: number;
    }) => {
      const params = new URLSearchParams();
      if (filters?.status) params.set("status", filters.status);
      if (filters?.method) params.set("method", filters.method);
      if (filters?.search) params.set("search", filters.search);
      if (filters?.startDate) params.set("startDate", filters.startDate);
      if (filters?.endDate) params.set("endDate", filters.endDate);
      if (filters?.page) params.set("page", String(filters.page));
      if (filters?.limit) params.set("limit", String(filters.limit));
      const queryStr = params.toString() ? `?${params.toString()}` : "";

      const res = await this.request<any>(
        `/payments/admin/transactions${queryStr}`,
      );
      if (Array.isArray(res)) {
        return { transactions: res, total: res.length };
      }
      return {
        transactions: res.transactions || res.data || [],
        total: res.total ?? (res.transactions?.length || 0),
        page: res.page || 1,
        limit: res.limit || 20,
      };
    },

    getReconciliation: (query?: { startDate?: string; endDate?: string }) => {
      const params = new URLSearchParams();
      if (query?.startDate) params.set("startDate", query.startDate);
      if (query?.endDate) params.set("endDate", query.endDate);
      const queryStr = params.toString() ? `?${params.toString()}` : "";

      return this.request<ReconciliationSummary>(
        `/payments/admin/reconciliation${queryStr}`,
      );
    },

    getDailySummary: (date?: string) => {
      const params = new URLSearchParams();
      if (date) params.set("date", date);
      const queryStr = params.toString() ? `?${params.toString()}` : "";

      return this.request<DailyPaymentSummary>(
        `/payments/admin/daily-summary${queryStr}`,
      );
    },
  };

  // Staff / User Management API
  public adminUsers = {
    getStaffUsers: () => {
      return this.request<UserProfile[]>("/identity/admin/users");
    },

    createStaffUser: async (payload: {
      email: string;
      firstName: string;
      lastName: string;
      phoneNumber?: string;
      role: UserRole;
    }) => {
      const res = await this.request<any>("/identity/admin/users", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      return (res?.user || res?.data || res) as UserProfile;
    },

    resendSetupLink: (userId: string) => {
      return this.request<{ success: boolean; message: string }>(
        `/identity/admin/users/${userId}/resend-setup`,
        {
          method: "POST",
        },
      );
    },

    updateStaffUser: async (
      userId: string,
      payload: {
        role?: UserRole;
        firstName?: string;
        lastName?: string;
        phoneNumber?: string;
        isVerified?: boolean;
      },
    ) => {
      const res = await this.request<any>(`/identity/admin/users/${userId}`, {
        method: "PATCH",
        body: JSON.stringify(payload),
      });
      return (res?.user || res?.data?.user || res?.data || res) as UserProfile;
    },
  };

  // Email Template Management API (Super Admin)
  public emailTemplates = {
    listTemplates: () => {
      return this.request<
        Array<{
          type: string;
          subject: string;
          htmlBody: string;
          textBody?: string;
          description: string;
          variables: string[];
          isCustomized: boolean;
          isActive: boolean;
          updatedAt?: string;
        }>
      >("/email-templates");
    },

    getTemplate: (type: string) => {
      return this.request<{
        type: string;
        subject: string;
        htmlBody: string;
        textBody?: string;
        isActive: boolean;
      }>(`/email-templates/${type}`);
    },

    updateTemplate: (
      type: string,
      data: {
        subject: string;
        htmlBody: string;
        textBody?: string;
        isActive?: boolean;
      },
    ) => {
      return this.request<{ success: boolean; type: string }>(
        `/email-templates/${type}`,
        {
          method: "PUT",
          body: JSON.stringify(data),
        },
      );
    },
  };

  // Customer Directory API
  public customers = {
    getCustomers: async (
      filter?: CustomerFilterDTO,
    ): Promise<CustomerListResponse> => {
      const params = new URLSearchParams();
      if (filter?.search) params.set("search", filter.search);
      if (filter?.status) params.set("status", filter.status);
      if (filter?.tier) params.set("tier", filter.tier);
      if (filter?.page) params.set("page", String(filter.page));
      if (filter?.limit) params.set("limit", String(filter.limit));
      const queryStr = params.toString() ? `?${params.toString()}` : "";
      const res = await this.request<any>(
        `/identity/admin/customers${queryStr}`,
      );
      return (res?.data || res) as CustomerListResponse;
    },

    createCustomer: async (dto: CreateCustomerDTO): Promise<CustomerRecord> => {
      const res = await this.request<any>("/identity/admin/customers", {
        method: "POST",
        body: JSON.stringify(dto),
      });
      return (res?.data || res) as CustomerRecord;
    },
  };

  // Customer & Admin Referrals API
  public referrals = {
    getMyReferrals: () =>
      this.request<CustomerReferralsResponse>("/identity/me/referrals"),

    getCustomerReferrals: (customerId: string) =>
      this.request<AdminCustomerReferralsResponse>(
        `/identity/admin/customers/${customerId}/referrals`,
      ),
  };

  // Access & Reception Scanner API
  public access = {
    getAccessPass: (bookingId: string) =>
      this.request<{
        token: string;
        bookingId: string;
        reference: string;
        resourceName: string;
        customerName: string;
        startTime: string;
        expiresAt: string;
        state: string;
        checkedInAt?: string | null;
      }>(`/access/qr/${bookingId}`),

    verifyQr: (token: string) =>
      this.request<VerifyAccessPassResponse>("/access/verify-qr", {
        method: "POST",
        body: JSON.stringify({ token }),
      }),

    verifyPass: (tokenOrRef: string) => this.access.verifyQr(tokenOrRef),

    checkIn: (
      bookingId: string,
      payload?: { terminalId?: string; notes?: string },
    ) =>
      this.request<CheckInResultDTO>(`/access/checkin/${bookingId}`, {
        method: "POST",
        body: JSON.stringify(payload || {}),
      }),

    checkOut: (
      bookingId: string,
      payload?: { terminalId?: string; notes?: string },
    ) =>
      this.request<CheckOutResultDTO>(`/access/checkout/${bookingId}`, {
        method: "POST",
        body: JSON.stringify(payload || {}),
      }),

    searchBookings: (query: string) =>
      this.request<AccessPassDetails[]>(
        `/access/search?q=${encodeURIComponent(query)}`,
      ),

    getTerminalActivity: (params?: {
      terminalId?: string;
      limit?: number;
      offset?: number;
      startDate?: string;
      endDate?: string;
      status?: "ALL" | "ON_SITE" | "CHECKED_OUT";
      search?: string;
    }) => {
      const searchParams = new URLSearchParams();
      if (params?.terminalId) searchParams.set("terminalId", params.terminalId);
      if (params?.limit) searchParams.set("limit", String(params.limit));
      if (params?.offset) searchParams.set("offset", String(params.offset));
      if (params?.startDate) searchParams.set("startDate", params.startDate);
      if (params?.endDate) searchParams.set("endDate", params.endDate);
      if (params?.status) searchParams.set("status", params.status);
      if (params?.search) searchParams.set("search", params.search);
      const queryStr = searchParams.toString()
        ? `?${searchParams.toString()}`
        : "";
      return this.request<TerminalActivityRecord[]>(
        `/access/activity${queryStr}`,
      );
    },

    getVisitsActivity: (params?: {
      terminalId?: string;
      limit?: number;
      offset?: number;
      startDate?: string;
      endDate?: string;
      status?: "ALL" | "ON_SITE" | "CHECKED_OUT";
      search?: string;
    }) => {
      const searchParams = new URLSearchParams();
      if (params?.terminalId) searchParams.set("terminalId", params.terminalId);
      if (params?.limit) searchParams.set("limit", String(params.limit));
      if (params?.offset) searchParams.set("offset", String(params.offset));
      if (params?.startDate) searchParams.set("startDate", params.startDate);
      if (params?.endDate) searchParams.set("endDate", params.endDate);
      if (params?.status) searchParams.set("status", params.status);
      if (params?.search) searchParams.set("search", params.search);
      const queryStr = searchParams.toString()
        ? `?${searchParams.toString()}`
        : "";
      return this.request<VisitActivityResponse>(`/access/visits${queryStr}`);
    },

    getLiveOccupancy: () => this.request<LiveOccupancyDTO>("/access/occupancy"),

    getTerminalSummary: async (options?: {
      terminalId?: string;
      forceRefresh?: boolean;
    }) => {
      const queryStr = options?.terminalId
        ? `?terminalId=${options.terminalId}`
        : "";
      const cacheKey = `reception_terminal_summary_${options?.terminalId || "all"}`;
      return apiCacheManager.fetchWithCache<ReceptionTerminalSummaryDTO>(
        cacheKey,
        () =>
          this.request<ReceptionTerminalSummaryDTO>(
            `/access/terminal-summary${queryStr}`,
          ),
        15000,
        { forceRefresh: options?.forceRefresh },
      );
    },
  };

  // Reports & Analytics Export API
  public reports = {
    downloadExport: async (query: {
      type:
        "revenue" | "bookings" | "occupancy" | "financial_audit" | "customers";
      format: "csv" | "xlsx" | "pdf";
      startDate?: string;
      endDate?: string;
      preset?: string;
    }): Promise<void> => {
      const searchParams = new URLSearchParams();
      searchParams.set("type", query.type);
      searchParams.set("format", query.format);
      if (query.startDate) searchParams.set("startDate", query.startDate);
      if (query.endDate) searchParams.set("endDate", query.endDate);
      if (query.preset) searchParams.set("preset", query.preset);

      const url = `${this.baseUrl}/reports/export?${searchParams.toString()}`;
      const token = await this.getAccessToken();

      const headers: HeadersInit = {};
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const response = await fetch(url, {
        headers,
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error(`Failed to download report (HTTP ${response.status})`);
      }

      const blob = await response.blob();
      const contentDisposition =
        response.headers.get("Content-Disposition") || "";
      const filenameMatch = contentDisposition.match(/filename="?([^"]+)"?/);
      const filename =
        filenameMatch?.[1] ||
        `DAIH_${query.type.toUpperCase()}_REPORT.${query.format}`;

      if (typeof window !== "undefined") {
        const downloadUrl = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = downloadUrl;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(downloadUrl);
      }
    },
  };

  // Discounts & Promotions API
  public discounts = {
    preview: (payload: DiscountPreviewRequestDTO) =>
      this.request<DiscountPreviewResponseDTO>("/discounts/preview", {
        method: "POST",
        body: JSON.stringify(payload),
      }),

    list: (filters: DiscountFilterDTO = {}) => {
      const params = new URLSearchParams();
      if (filters.search) params.append("search", filters.search);
      if (filters.isActive !== undefined)
        params.append("isActive", String(filters.isActive));
      if (filters.type) params.append("type", filters.type);
      if (filters.page) params.append("page", String(filters.page));
      if (filters.limit) params.append("limit", String(filters.limit));
      const qs = params.toString();
      return this.request<DiscountListResponse>(
        `/discounts${qs ? `?${qs}` : ""}`,
      );
    },

    getById: (id: string) => this.request<DiscountDTO>(`/discounts/${id}`),

    create: async (data: CreateDiscountDTO) => {
      const res = await this.request<DiscountDTO>("/discounts", {
        method: "POST",
        body: JSON.stringify(data),
      });
      apiCacheManager.invalidate("discounts");
      return res;
    },

    update: async (id: string, data: UpdateDiscountDTO) => {
      const res = await this.request<DiscountDTO>(`/discounts/${id}`, {
        method: "PUT",
        body: JSON.stringify(data),
      });
      apiCacheManager.invalidate("discounts");
      return res;
    },

    toggleStatus: async (id: string, isActive: boolean) => {
      const res = await this.request<DiscountDTO>(`/discounts/${id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ isActive }),
      });
      apiCacheManager.invalidate("discounts");
      return res;
    },

    delete: async (id: string) => {
      const res = await this.request<{ success: boolean; message: string }>(
        `/discounts/${id}`,
        { method: "DELETE" },
      );
      apiCacheManager.invalidate("discounts");
      return res;
    },

    getRedemptions: (
      discountId?: string,
      query: { page?: number; limit?: number } = {},
    ) => {
      const params = new URLSearchParams();
      if (query.page) params.append("page", String(query.page));
      if (query.limit) params.append("limit", String(query.limit));
      const qs = params.toString();
      const endpoint = discountId
        ? `/discounts/${discountId}/redemptions${qs ? `?${qs}` : ""}`
        : `/discounts/redemptions/all${qs ? `?${qs}` : ""}`;
      return this.request<{
        redemptions: DiscountRedemptionDTO[];
        total: number;
        page: number;
        limit: number;
      }>(endpoint);
    },

    applyCourtesyDiscount: (
      bookingId: string,
      payload: ApplyCourtesyDiscountDTO,
    ) =>
      this.request<{
        success: boolean;
        message: string;
        booking: any;
        redemption: DiscountRedemptionDTO;
      }>(`/bookings/${bookingId}/courtesy-discount`, {
        method: "POST",
        body: JSON.stringify(payload),
      }),
  };

  // Legal & Compliance Policies API
  public policies = {
    list: () => this.request<PolicyDocument[]>("/policies"),
    getAll: () => this.request<PolicyDocument[]>("/policies"),
    get: (type: PolicyType | string) =>
      this.request<PolicyDocument>(`/policies/${type}`),
    getByType: (type: PolicyType | string) =>
      this.request<PolicyDocument>(`/policies/${type}`),
    update: async (type: PolicyType | string, data: UpdatePolicyDTO) => {
      const res = await this.request<PolicyDocument>(`/policies/${type}`, {
        method: "PUT",
        body: JSON.stringify(data),
      });
      apiCacheManager.invalidate("policies");
      return res;
    },
  };

  // Customer Support & FAQs API
  public support = {
    get: () => this.request<SupportSettingsRecord>("/support"),
    update: async (data: UpdateSupportSettingsDTO) => {
      const res = await this.request<SupportSettingsRecord>("/support", {
        method: "PUT",
        body: JSON.stringify(data),
      });
      apiCacheManager.invalidate("support");
      return res;
    },
  };

  // In-App Notifications API
  public notifications = {
    list: (options?: { limit?: number; cursor?: string }) => {
      const params = new URLSearchParams();
      if (options?.limit) params.set("limit", String(options.limit));
      if (options?.cursor) params.set("cursor", options.cursor);
      const queryStr = params.toString() ? `?${params.toString()}` : "";

      return this.request<NotificationListResponse>(
        `/notifications${queryStr}`,
      );
    },

    getUnreadCount: () =>
      this.request<NotificationUnreadCountResponse>(
        "/notifications/unread-count",
      ),

    markRead: (id: string) =>
      this.request<NotificationDTO>(`/notifications/${id}/read`, {
        method: "PATCH",
      }),

    markAllRead: () =>
      this.request<{ success: boolean; unreadCount: number }>(
        "/notifications/read-all",
        {
          method: "PATCH",
        },
      ),

    archive: (id: string) =>
      this.request<NotificationDTO>(`/notifications/${id}/archive`, {
        method: "PATCH",
      }),
  };

  /**
   * Manually clear client-side API cache
   */
  clearCache(pattern?: string): void {
    apiCacheManager.invalidate(pattern);
  }
}

export const api = new DaihApiClient();
