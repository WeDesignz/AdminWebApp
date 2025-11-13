/**
 * API Response Types
 * Types matching backend serializer responses
 */

export interface ApiError {
  error?: string;
  message?: string;
  detail?: string;
  errors?: Record<string, string[]>;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface BackendResponse<T> {
  message?: string;
  data?: T;
  error?: string;
  detail?: string;
}

export interface BackendPaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

/**
 * Transform backend response to frontend format
 */
export function transformResponse<T>(backendResponse: BackendResponse<T>): ApiResponse<T> {
  if (backendResponse.error || backendResponse.detail) {
    return {
      success: false,
      error: backendResponse.error || backendResponse.detail || 'An error occurred',
    };
  }

  const payload = backendResponse.data !== undefined ? backendResponse.data : (backendResponse as unknown as T);

  return {
    success: true,
    data: payload,
    message: backendResponse.message,
  };
}

/**
 * Transform backend paginated response to frontend format
 */
export function transformPaginatedResponse<T>(
  backendResponse: BackendPaginatedResponse<T>,
  page: number,
  limit: number
): ApiResponse<PaginatedResponse<T>> {
  return {
    success: true,
    data: {
      data: backendResponse.results,
      pagination: {
        page,
        limit,
        total: backendResponse.count,
        totalPages: Math.ceil(backendResponse.count / limit),
      },
    },
  };
}

export interface ListApiResponse<T> extends ApiResponse<T[]> {
  pagination?: PaginatedResponse<T>['pagination'];
}

